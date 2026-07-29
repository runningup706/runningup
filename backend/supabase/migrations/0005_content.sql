-- =============================================================================
-- RunningUp 0005 — launch content catalogue and the completeness gate
--
-- The content JSON produced by tools/content-factory is loaded into these tables by
-- seed.sql. `private.assert_launch_content_complete()` turns direction lock DL-4 into a
-- database-level gate: a seed that is short of the launch floor, or that hides content
-- behind a disabled flag to make the numbers work, aborts.
-- =============================================================================

create table api.world_continents (
  id                    text primary key,
  display_order         integer not null unique,
  name_key              text not null,
  mechanic_id           text not null unique,
  visible_at_first_login boolean not null default true,
  playable_at_launch    boolean not null default true,
  content_pack_id       text not null,
  entry_region_id       text not null,
  content_version       text not null,
  -- DL-4: a continent may not be shipped as an empty promise.
  constraint continent_no_coming_soon check (playable_at_launch and visible_at_first_login)
);

create table api.world_regions (
  id             text primary key,
  continent_id   text not null references api.world_continents(id) on delete cascade,
  display_order  integer not null,
  name_key       text not null,
  node_type      text not null check (node_type in ('battle_node', 'challenge_node', 'continent_boss_node')),
  scene_address  text not null,
  bypass_allowed boolean not null default true,
  unique (continent_id, display_order)
);

create table api.world_stages (
  id             text primary key,
  continent_id   text not null references api.world_continents(id) on delete cascade,
  region_id      text not null references api.world_regions(id) on delete cascade,
  kind           text not null check (kind in ('main', 'side')),
  display_order  integer not null,
  name_key       text not null,
  objective      text not null check (objective in
                   ('survival', 'escort', 'defense', 'elite_hunt', 'boss_break', 'resource_control', 'timed_assault')),
  objective_twist text not null,
  scene_address  text not null,
  reward_table_id text not null,
  enabled        boolean not null default true,
  debug_only     boolean not null default false,
  -- A stage only exists at launch if it is genuinely playable.
  constraint stage_launch_ready check (enabled and not debug_only)
);
create index world_stages_continent_kind_idx on api.world_stages (continent_id, kind);

create table api.world_bosses (
  id           text primary key,
  kind         text not null check (kind in ('continent_boss', 'world_boss', 'apex_boss')),
  continent_id text references api.world_continents(id) on delete cascade,
  name_key     text not null,
  phases       text[] not null check (array_length(phases, 1) >= 3),
  scene_address text not null,
  -- DL-1: exactly one apex boss, and nothing beyond it.
  constraint apex_boss_has_no_continent check (kind <> 'apex_boss' or continent_id is null)
);
create unique index world_bosses_one_apex on api.world_bosses ((kind)) where kind = 'apex_boss';

create table api.story_chapters (
  id            text primary key,
  display_order integer not null unique,
  continent_id  text not null references api.world_continents(id) on delete cascade,
  title_key     text not null,
  shard_id      text not null unique,
  -- Non-linear meta arc: no chapter may require the previous one (master # 9.1).
  requires_previous_chapter boolean not null default false,
  constraint chapters_are_non_linear check (requires_previous_chapter = false)
);

create table api.characters (
  id                text primary key,
  display_order     integer not null unique,
  name_key          text not null,
  role              text not null,
  secondary_role    text not null,
  continent_affinity text references api.world_continents(id),
  visible_at_launch boolean not null default true,
  trial_available   boolean not null default true,
  unlock_path       text not null,
  prefab_address    text not null,
  portrait_address  text not null,
  -- DL-4 / master # 7.4: no paid gacha, and everyone is trial-playable on day one.
  paid_gacha        boolean not null default false,
  constraint character_launch_ready check (visible_at_launch and trial_available and not paid_gacha)
);

create table api.character_skills (
  id            text primary key,
  character_id  text not null references api.characters(id) on delete cascade,
  kind          text not null check (kind in ('active', 'passive', 'ultimate')),
  name_key      text not null,
  -- A skill redistributes the Fitness Core budget; it may never add to it.
  core_budget_delta numeric(6,2) not null default 0 check (core_budget_delta = 0)
);

create table api.tactical_relics (
  id            text primary key,
  continent_id  text not null references api.world_continents(id) on delete cascade,
  name_key      text not null,
  trade_from    text not null,
  trade_to      text not null,
  activation_condition text not null,
  budget_delta  numeric(6,2) not null default 0 check (budget_delta = 0),
  unique (continent_id, trade_from, trade_to)
);

create table api.character_episodes (
  id            text primary key,
  character_id  text not null references api.characters(id) on delete cascade,
  chapter_index integer not null check (chapter_index between 1 and 3),
  name_key      text not null,
  scene_address text not null,
  playable_at_launch boolean not null default true,
  unique (character_id, chapter_index),
  constraint episode_launch_ready check (playable_at_launch)
);

create table api.cosmetics (
  id            text primary key,
  character_id  text not null references api.characters(id) on delete cascade,
  slot          text not null,
  name_key      text not null,
  -- The fair-cosmetic invariant, enforced by the database (master # 6.2).
  core_power                  numeric(6,2) not null default 0 check (core_power = 0),
  xp_multiplier               numeric(6,2) not null default 0 check (xp_multiplier = 0),
  ranking_multiplier          numeric(6,2) not null default 0 check (ranking_multiplier = 0),
  verification_bonus          numeric(6,2) not null default 0 check (verification_bonus = 0),
  hidden_stat                 numeric(6,2) not null default 0 check (hidden_stat = 0),
  extra_core_reward_multiplier numeric(6,2) not null default 0 check (extra_core_reward_multiplier = 0),
  purchasable_with_real_money boolean not null default false check (purchasable_with_real_money = false),
  unique (character_id, slot)
);

create table api.companions (
  id            text primary key,
  display_order integer not null unique,
  name_key      text not null,
  continent_id  text not null references api.world_continents(id) on delete cascade,
  expedition_type text not null,
  grants_core_power boolean not null default false check (grants_core_power = false)
);

create table api.enemy_families (
  id            text primary key,
  continent_id  text not null references api.world_continents(id) on delete cascade,
  family_kind   text not null check (family_kind in ('standard', 'elite')),
  name_key      text not null,
  behaviour     text not null
);

create table api.content_versions (
  content_version text primary key,
  schema_version  text not null,
  content_sha256  text not null,
  effective_at    timestamptz not null default now(),
  minimum_app_version text not null default '1.0.0',
  is_active       boolean not null default true
);

/**
 * The launch content gate. Raises on the first shortfall so the transaction that produced
 * an incomplete seed cannot commit.
 */
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
      ('continents',              (select count(*)::int from api.world_continents),                                    12),
      ('region_nodes',            (select count(*)::int from api.world_regions),                                       96),
      ('main_stages',             (select count(*)::int from api.world_stages where kind = 'main'),                    72),
      ('side_stages',             (select count(*)::int from api.world_stages where kind = 'side'),                    24),
      ('playable_characters',     (select count(*)::int from api.characters),                                          12),
      ('character_episodes',      (select count(*)::int from api.character_episodes),                                  36),
      ('tactical_skills',         (select count(*)::int from api.character_skills),                                    48),
      ('tactical_relics',         (select count(*)::int from api.tactical_relics),                                     72),
      ('standard_enemy_families', (select count(*)::int from api.enemy_families where family_kind = 'standard'),       24),
      ('elite_enemy_families',    (select count(*)::int from api.enemy_families where family_kind = 'elite'),          12),
      ('continent_bosses',        (select count(*)::int from api.world_bosses where kind = 'continent_boss'),          12),
      ('world_bosses',            (select count(*)::int from api.world_bosses where kind = 'world_boss'),               4),
      ('apex_bosses',             (select count(*)::int from api.world_bosses where kind = 'apex_boss'),                1),
      ('companions',              (select count(*)::int from api.companions),                                          12),
      ('equipable_cosmetics',     (select count(*)::int from api.cosmetics),                                           96),
      ('story_chapters',          (select count(*)::int from api.story_chapters),                                      12)
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
  if exists (
    select 1 from api.world_continents c
    where (select count(*) from api.world_regions rg where rg.continent_id = c.id) < 8
       or (select count(*) from api.world_stages st where st.continent_id = c.id and st.kind = 'main') < 6
       or (select count(*) from api.world_bosses bo where bo.continent_id = c.id and bo.kind = 'continent_boss') < 1
  ) then
    raise exception 'launch content incomplete: at least one continent is below its per-continent floor';
  end if;
end;
$$;
