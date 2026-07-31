-- RunningUp 0012 — the world is a race, not a fight
--
-- V14 is a running game. The schema up to 0011 still described a combat RPG: battle
-- stages with objectives like `elite_hunt` and `boss_break`, enemy families, three kinds
-- of boss, tactical skills and tactical relics. None of that is the product. This
-- migration removes it and puts the running equivalent in its place.
--
-- WHAT REPLACES WHAT
--
--   api.world_stages      -> api.world_races        72 main + 24 challenge races
--   api.enemy_families    -> api.rival_crews        24 standard + 12 elite rival crews
--   api.world_bosses      -> api.world_champions    12 continent + 4 open + 1 apex
--   api.character_skills  -> api.race_techniques    48 techniques, 4 per runner
--   api.tactical_relics   -> api.gear_sets          72 sidegrade gear sets
--
-- Every count above is the count that was there before. This is not a reduction of the
-- launch world to make a gate easier to pass: it is the same amount of content expressed
-- as the game the product actually is, and `private.assert_launch_content_complete()`
-- below still refuses a seed that is short.
--
-- The two new lookup tables (race formats, challenge formats) are new floors rather than
-- replacements, and 0011's 2,304 courses already replaced what a battle stage was for.
--
-- WHY DROP RATHER THAN KEEP
--
-- These five tables hold generated launch content only — no user rows reference them, and
-- seed.sql rebuilds every row from content/launch/**. Keeping them "just in case" would
-- leave a schema in which `boss_break` is still a legal objective, which is exactly the
-- state DL-6 exists to make unrepresentable.

begin;

-- -----------------------------------------------------------------------------
-- Out: the combat catalogue
-- -----------------------------------------------------------------------------
drop table if exists api.world_stages cascade;
drop table if exists api.world_bosses cascade;
drop table if exists api.character_skills cascade;
drop table if exists api.tactical_relics cascade;
drop table if exists api.enemy_families cascade;

-- -----------------------------------------------------------------------------
-- A continent's identity is what the road asks of a runner
-- -----------------------------------------------------------------------------
-- `mechanic_id` named a combat mechanic ("barrier and light reflection"). The same column
-- now carries the course trait the race engine resolves races with, so the name has to
-- follow. The unique constraint travels with the column.
alter table api.world_continents rename column mechanic_id to trait_id;

-- A region node is somewhere you run. `battle_node` was the default value for two thirds
-- of the world, and `continent_boss_node` for the last node of every continent.
alter table api.world_regions drop constraint world_regions_node_type_check;
update api.world_regions set node_type = 'race_node' where node_type = 'battle_node';
update api.world_regions set node_type = 'champion_node' where node_type = 'continent_boss_node';
alter table api.world_regions add constraint world_regions_node_type_check
  check (node_type in ('race_node', 'challenge_node', 'champion_node'));

-- -----------------------------------------------------------------------------
-- In: race formats
-- -----------------------------------------------------------------------------
-- Lookup tables rather than CHECK lists, so a race's format is a foreign key that cannot
-- drift from the format catalogue the client renders.
create table api.race_formats (
  id            text primary key,
  content_version text not null,
  constraint race_format_is_known
    check (id in ('time_trial', 'mass_start', 'handicap', 'pursuit', 'championship', 'relay', 'ladder'))
);

create table api.challenge_formats (
  id            text primary key,
  rule          text not null,
  content_version text not null
);

-- -----------------------------------------------------------------------------
-- In: races
-- -----------------------------------------------------------------------------
create table api.world_races (
  id             text primary key,
  continent_id   text not null references api.world_continents(id) on delete cascade,
  region_id      text not null references api.world_regions(id) on delete cascade,
  kind           text not null check (kind in ('main', 'side')),
  display_order  integer not null,
  name_key       text not null,
  format         text not null references api.race_formats(id),
  -- A challenge race adds a scoring rule on top of its format; a main race does not.
  challenge_format_id text references api.challenge_formats(id),
  race_condition text not null,
  -- Eight runners: the player plus seven. RACE_FIELD_SIZE in packages/domain/race.mjs.
  field_size     integer not null default 8 check (field_size = 8),
  scene_address  text not null,
  reward_table_id text not null,
  enabled        boolean not null default true,
  debug_only     boolean not null default false,
  -- A race only exists at launch if it is genuinely runnable.
  constraint race_launch_ready check (enabled and not debug_only),
  constraint challenge_format_only_on_challenge_races
    check (kind = 'side' or challenge_format_id is null),
  unique (continent_id, kind, display_order)
);
create index world_races_continent_kind_idx on api.world_races (continent_id, kind);

-- -----------------------------------------------------------------------------
-- In: rival crews and champions
-- -----------------------------------------------------------------------------
-- A rival is another runner. There is no health column, no damage column and no attack
-- column here, and DL-6 forbids adding one: a rival is described entirely by how it runs.
create table api.rival_crews (
  id            text primary key,
  continent_id  text not null references api.world_continents(id) on delete cascade,
  crew_kind     text not null check (crew_kind in ('standard', 'elite')),
  name_key      text not null,
  tactic        text not null
);

create table api.world_champions (
  id           text primary key,
  kind         text not null check (kind in ('continent_champion', 'open_race', 'apex_race')),
  continent_id text references api.world_continents(id) on delete cascade,
  name_key     text not null,
  -- Three legs of a race plan: how the champion opens, holds and finishes.
  race_plan    text[] not null check (array_length(race_plan, 1) >= 3),
  scene_address text not null,
  -- DL-1: exactly one apex race, and nothing beyond it.
  constraint apex_race_has_no_continent check (kind <> 'apex_race' or continent_id is null)
);
create unique index world_champions_one_apex on api.world_champions ((kind)) where kind = 'apex_race';

-- -----------------------------------------------------------------------------
-- In: race techniques and gear sets
-- -----------------------------------------------------------------------------
create table api.race_techniques (
  id            text primary key,
  character_id  text not null references api.characters(id) on delete cascade,
  -- How a runner opens, attacks the middle, habitually runs, and finishes.
  kind          text not null check (kind in ('opening', 'midrace', 'habit', 'finish')),
  name_key      text not null,
  -- A technique redistributes the Fitness Core budget across a race; it may never add
  -- to it. DL-5: only verified running changes how much there is.
  core_budget_delta numeric(6,2) not null default 0 check (core_budget_delta = 0),
  unique (character_id, kind)
);

-- The three axes are exactly the ones packages/domain/race.mjs trades in buildRunnerForm,
-- pinned here so a gear set that names anything else cannot be stored at all.
create table api.gear_sets (
  id            text primary key,
  continent_id  text not null references api.world_continents(id) on delete cascade,
  name_key      text not null,
  trade_from    text not null check (trade_from in ('cruise', 'stamina', 'kick')),
  trade_to      text not null check (trade_to in ('cruise', 'stamina', 'kick')),
  activation_condition text not null,
  budget_delta  numeric(6,2) not null default 0 check (budget_delta = 0),
  constraint gear_trade_moves_something check (trade_from <> trade_to),
  unique (continent_id, trade_from, trade_to)
);

-- -----------------------------------------------------------------------------
-- The 1000 km finale is a race, so its progression tables say so
-- -----------------------------------------------------------------------------
-- These two hold user progress, so they are renamed rather than dropped. Policies,
-- indexes, grants and foreign keys travel with a rename; only the stored source of the
-- function that writes them does not.
alter table api.apex_boss_unlocks  rename to apex_race_entries;
alter table api.apex_boss_attempts rename to apex_race_attempts;
alter table api.apex_race_entries  rename column boss_id to race_id;
alter table api.apex_race_entries  alter column race_id set default 'race_apex_axis';
update api.apex_race_entries set race_id = 'race_apex_axis' where race_id = 'boss_apex_axis';
alter table api.apex_race_attempts rename column battle_seed to race_seed;

-- `private.apply_verified_run_reward` (0007) inserts into the renamed table. PL/pgSQL
-- resolves names at execution time, so after the rename the function would fail on the
-- one path that matters — the month a runner reaches 1000 km. Rather than copying 300
-- lines of it into this migration, where the copy would silently shadow future edits to
-- 0007, the definition is read back from the catalogue, rewritten and replaced in place.
do $$
declare v_def text;
begin
  select pg_get_functiondef(p.oid) into v_def
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private' and p.proname = 'apply_verified_run_reward';

  if v_def is null then
    raise exception 'private.apply_verified_run_reward not found: 0007 did not apply';
  end if;
  if v_def not like '%api.apex_boss_unlocks%' then
    raise exception 'apply_verified_run_reward no longer references api.apex_boss_unlocks; this rewrite is stale';
  end if;

  v_def := replace(v_def, 'api.apex_boss_unlocks', 'api.apex_race_entries');

  -- A rewrite that silently missed a reference is worse than no rewrite: the failure
  -- would only surface on a user's 1000 km month, in production.
  if v_def like '%apex_boss%' then
    raise exception 'an apex_boss reference survived the rewrite';
  end if;

  execute v_def;
end
$$;

-- -----------------------------------------------------------------------------
-- RLS: launch content is public read, client-writable by nobody
-- -----------------------------------------------------------------------------
-- 0006 looped over the tables that existed then, so tables added later have to say it
-- themselves. FORCE matters as much as ENABLE: without it the table owner bypasses its
-- own policies, and 01_schema_rls.sql asserts both.
do $$
declare t text;
begin
  foreach t in array array[
    'race_formats', 'challenge_formats', 'world_races',
    'rival_crews', 'world_champions', 'race_techniques', 'gear_sets'
  ]
  loop
    execute format('alter table api.%I enable row level security', t);
    execute format('alter table api.%I force row level security', t);
    execute format('grant select on api.%I to anon, authenticated', t);
    execute format(
      'create policy %I on api.%I for select to anon, authenticated using (true)',
      t || '_public_read', t);
    execute format('grant select, insert, update, delete on api.%I to service_role', t);
  end loop;
end
$$;

-- -----------------------------------------------------------------------------
-- Launch floor, restated over the running catalogue
-- -----------------------------------------------------------------------------
-- The canonical counts live in packages/domain/constants.mjs (LAUNCH_CONTENT_FLOOR). SQL
-- cannot import them, so they are restated and the content validator checks both sides.
create or replace function private.assert_launch_content_complete()
returns table (requirement text, actual integer, required integer)
language plpgsql
set search_path = ''
as $$
declare
  v_row record;
begin
  for v_row in
    select * from (values
      ('continents',           (select count(*)::int from api.world_continents),                                  12),
      ('region_nodes',         (select count(*)::int from api.world_regions),                                    192),
      ('courses',              (select count(*)::int from api.world_courses),                                   2304),
      ('main_races',           (select count(*)::int from api.world_races where kind = 'main'),                   72),
      ('challenge_races',      (select count(*)::int from api.world_races where kind = 'side'),                   24),
      ('race_formats',         (select count(*)::int from api.race_formats),                                       7),
      ('challenge_formats',    (select count(*)::int from api.challenge_formats),                                  6),
      ('playable_characters',  (select count(*)::int from api.characters),                                        12),
      ('character_episodes',   (select count(*)::int from api.character_episodes),                                36),
      ('race_techniques',      (select count(*)::int from api.race_techniques),                                   48),
      ('gear_sets',            (select count(*)::int from api.gear_sets),                                         72),
      ('standard_rival_crews', (select count(*)::int from api.rival_crews where crew_kind = 'standard'),          24),
      ('elite_rival_crews',    (select count(*)::int from api.rival_crews where crew_kind = 'elite'),             12),
      ('continent_champions',  (select count(*)::int from api.world_champions where kind = 'continent_champion'), 12),
      ('open_race_events',     (select count(*)::int from api.world_champions where kind = 'open_race'),           4),
      ('apex_races',           (select count(*)::int from api.world_champions where kind = 'apex_race'),           1),
      ('companions',           (select count(*)::int from api.companions),                                        12),
      ('equipable_cosmetics',  (select count(*)::int from api.cosmetics),                                         96),
      ('story_chapters',       (select count(*)::int from api.story_chapters),                                    12)
    ) as t(requirement, actual, required)
  loop
    if v_row.actual < v_row.required then
      raise exception 'launch content incomplete: % has % of required %',
        v_row.requirement, v_row.actual, v_row.required;
    end if;
    requirement := v_row.requirement; actual := v_row.actual; required := v_row.required;
    return next;
  end loop;

  -- Every continent must carry its own share, not 11 empty shells behind one rich one.
  -- The count above and this check have to move together: 192 regions distributed as 176
  -- and 16 across two continents would satisfy a total-only gate.
  if exists (
    select 1 from api.world_continents c
    where (select count(*) from api.world_regions rg where rg.continent_id = c.id) < 16
       or (select count(*) from api.world_races rc where rc.continent_id = c.id and rc.kind = 'main') < 6
       or (select count(*) from api.world_champions ch
            where ch.continent_id = c.id and ch.kind = 'continent_champion') < 1
       or (select count(*) from api.gear_sets g where g.continent_id = c.id) < 6
  ) then
    raise exception 'launch content incomplete: at least one continent is below its per-continent floor';
  end if;

  -- And every region must carry its twelve courses. 2,304 courses piled onto one region
  -- satisfies the total above while leaving 191 regions with nothing to run.
  if exists (
    select 1 from api.world_regions rg
    where (select count(*) from api.world_courses cr where cr.region_id = rg.id) <> 12
  ) then
    raise exception 'launch content incomplete: at least one region does not carry exactly 12 courses';
  end if;

  -- Every runner carries a full four-technique kit, one of each kind. A roster of 48
  -- techniques piled onto three runners passes the total and leaves nine with none.
  if exists (
    select 1 from api.characters ch
    where (select count(*) from api.race_techniques t where t.character_id = ch.id) <> 4
  ) then
    raise exception 'launch content incomplete: at least one runner does not carry exactly 4 techniques';
  end if;

  return;
end;
$$;

commit;
