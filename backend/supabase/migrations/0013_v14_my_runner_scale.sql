-- =============================================================================
-- RunningUp 0013 — My Runner, the wardrobe, the world field, and Global Events
--
-- The owner set six scale floors that the schema up to 0012 had no place to put:
--
--   My Runner base styles          24+   (no such concept existed)
--   Pacers / world runners        200+   (108 anonymous seats inside rival crews)
--   Wearable items                600+   (96 per-character cosmetics, a different thing)
--   Outfit sets                   120+   (none)
--   Real equip slots               18+   (8 cosmetic slots)
--   Global Event participants   50-100   (none; races are 8 and stay 8)
--
-- WHAT THIS MIGRATION IS FOR
--
-- Not for holding numbers. The failure mode these floors invite is a catalogue that
-- counts correctly and cannot be worn: 600 rows in a table, no way to put any of them on
-- a runner, and a green build. So the constraints here are aimed at that specific lie.
--
--   * `api.my_runners` is keyed on `user_id`. One account, one persistent runner, and a
--     second one is not a bug to find later — it is unrepresentable.
--   * `api.wearable_items.compatible_base_style_ids` may not be empty. An item that fits
--     nobody cannot be stored, so it cannot be counted.
--   * `private.equip_is_valid()` fires on every equip: the item must belong to the slot it
--     is being put in, and must be compatible with the body wearing it. An item that
--     cannot be equipped fails at write time rather than at a code review.
--   * A required slot cannot be emptied — `hair`, `top`, `bottom`, `socks`, `shoes` are
--     deleted only by being replaced.
--   * `api.global_events` CHECKs capacity into [50, 100]. A capacity of 24 in the data
--     while the report says 100 is not possible.
--
-- WHAT IS DELIBERATELY NOT HERE
--
-- No stat, power, multiplier or bonus column on any wardrobe or style table. DL-5: only
-- verified running moves core power, and a column that does not exist cannot later be
-- "temporarily" populated. pgTAP asserts the absence rather than trusting this paragraph.
--
-- Nothing existing is dropped or narrowed. `api.cosmetics` (96) and `api.gear_sets` (72)
-- are untouched: the wardrobe is additional, not a replacement that would let those
-- counts disappear into a larger one.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- Catalogue: the 24 bodies a My Runner can be
-- -----------------------------------------------------------------------------
create table api.my_runner_base_styles (
  id                    text primary key,
  display_order         integer not null,
  name_key              text not null,
  age_band              text not null,
  build                 text not null,
  presentation          text not null,
  skin_tone_id          text not null,
  rig_id                text not null,
  animation_set_id      text not null,
  head_ratio            numeric(4,2) not null,
  adaptive_kit_id       text,
  selectable_at_launch  boolean not null default true,
  paid_gacha            boolean not null default false,
  prefab_address        text not null,
  portrait_address      text not null,
  thumbnail_address     text not null,
  content_version       text not null,

  constraint base_style_age_band_known
    check (age_band in ('child', 'teen', 'young_adult', 'adult', 'midlife', 'senior', 'elder')),
  constraint base_style_presentation_known
    check (presentation in ('masculine', 'feminine', 'neutral')),
  -- DL-4: every style is available on day one. There is no style to unlock and none to buy.
  constraint base_style_available_at_launch check (selectable_at_launch),
  constraint base_style_not_gacha check (not paid_gacha),
  -- One shared rig is what makes a single wardrobe wearable by all 24. A second rig id
  -- would silently split the catalogue in two.
  constraint base_style_shared_rig check (rig_id = 'rig_v14_chibi'),
  constraint base_style_order_unique unique (display_order)
);

comment on table api.my_runner_base_styles is
  'The 24+ bodies a My Runner can have. Carries no stat: a body is not power (DL-5).';

-- -----------------------------------------------------------------------------
-- Catalogue: the 18 equip slots
-- -----------------------------------------------------------------------------
create table api.equipment_slots (
  id              text primary key,
  slot            text not null unique,
  display_order   integer not null unique,
  render_layer    integer not null unique,
  is_required     boolean not null default false,
  name_key        text not null,
  icon_address    text not null,
  content_version text not null
);

comment on column api.equipment_slots.is_required is
  'A runner is never seen without these. Unequipping one is a replace, never a delete.';

-- -----------------------------------------------------------------------------
-- Catalogue: 120 outfit sets and 600+ items
-- -----------------------------------------------------------------------------
create table api.outfit_sets (
  id                 text primary key,
  continent_id       text not null references api.world_continents (id),
  display_order      integer not null,
  name_key           text not null,
  shape_id           text not null,
  acquisition_source text not null,
  thumbnail_address  text not null,
  content_version    text not null,

  -- A set bonus would turn the wardrobe into a power system. There is no column for one.
  constraint outfit_set_acquisition_known check (acquisition_source in (
    'world_progress', 'region_restoration', 'race_placement', 'challenge_clear',
    'monthly_apex_checkpoint', 'season_track', 'crew_campaign', 'open_race_event',
    'character_episode', 'global_event')),
  constraint outfit_set_order_unique unique (continent_id, display_order)
);

create table api.wearable_items (
  id                        text primary key,
  set_id                    text not null references api.outfit_sets (id),
  continent_id              text not null references api.world_continents (id),
  slot_id                   text not null references api.equipment_slots (id),
  display_order             integer not null,
  name_key                  text not null,
  -- The anti-catalogue constraint. An item nobody can wear is not storable.
  compatible_base_style_ids text[] not null,
  thumbnail_address         text not null,
  prefab_address            text not null,
  rig_id                    text not null,
  acquisition_source        text not null,
  content_version           text not null,

  constraint wearable_fits_someone check (cardinality(compatible_base_style_ids) > 0),
  constraint wearable_shared_rig check (rig_id = 'rig_v14_chibi'),
  constraint wearable_acquisition_known check (acquisition_source in (
    'world_progress', 'region_restoration', 'race_placement', 'challenge_clear',
    'monthly_apex_checkpoint', 'season_track', 'crew_campaign', 'open_race_event',
    'character_episode', 'global_event'))
);

create index wearable_items_slot_idx on api.wearable_items (slot_id);
create index wearable_items_set_idx on api.wearable_items (set_id);

comment on table api.wearable_items is
  'My Runner wardrobe. Separate from api.cosmetics (per-playable-character, 96) so that '
  'neither count can absorb the other. No stat column exists here, by design (DL-5).';

-- -----------------------------------------------------------------------------
-- Catalogue: the 204 named world runners
-- -----------------------------------------------------------------------------
create table api.world_runners (
  id                text primary key,
  display_order     integer not null unique,
  continent_id      text not null references api.world_continents (id),
  home_region_id    text not null references api.world_regions (id),
  name_key          text not null,
  intro_key         text not null,
  base_style_id     text not null references api.my_runner_base_styles (id),
  role              text not null,
  tendency_id       text not null,
  race_signature    text not null,
  crew_id           text references api.rival_crews (id),
  crew_slot         integer,
  open_field        boolean not null,
  prefab_address    text not null,
  portrait_address  text not null,
  content_version   text not null,

  constraint world_runner_role_known check (role in (
    'vanguard', 'burst', 'sustained', 'control', 'counter', 'support', 'surger', 'grinder')),
  -- A runner is in a crew or in the open field. The two used to be able to disagree
  -- because nothing compared them.
  constraint world_runner_crew_consistent
    check ((crew_id is null and crew_slot is null and open_field)
        or (crew_id is not null and crew_slot between 0 and 2 and not open_field)),
  -- Two runners cannot occupy the same seat in the same crew.
  constraint world_runner_crew_seat_unique unique (crew_id, crew_slot),
  -- No appearance, role and tendency may repeat: that combination IS the runner's identity
  -- as far as the race engine and the renderer are concerned.
  constraint world_runner_identity_unique unique (base_style_id, role, tendency_id)
);

create index world_runners_continent_idx on api.world_runners (continent_id);
create index world_runners_open_field_idx on api.world_runners (open_field) where open_field;

-- -----------------------------------------------------------------------------
-- Catalogue: Global Events
-- -----------------------------------------------------------------------------
create table api.global_events (
  id                     text primary key,
  display_order          integer not null unique,
  host_continent_id      text not null references api.world_continents (id),
  name_key               text not null,
  distance_meters        integer not null,
  cadence                text not null,
  entry_rule             text not null,
  min_participants       integer not null,
  max_participants       integer not null,
  heat_size              integer not null,
  check_in_window_minutes integer not null,
  countdown_seconds      integer not null,
  scene_address          text not null,
  enabled                boolean not null default true,
  debug_only             boolean not null default false,
  content_version        text not null,

  -- The owner floor, in the schema. A quiet 24 cannot be stored.
  constraint global_event_capacity_floor check (min_participants >= 50),
  constraint global_event_capacity_ceiling check (max_participants = 100),
  constraint global_event_capacity_ordered check (min_participants <= max_participants),
  constraint global_event_heats_cover_capacity
    check (heat_size > 0 and ceil(max_participants::numeric / heat_size) * heat_size >= max_participants),
  constraint global_event_distance_positive check (distance_meters > 0),
  constraint global_event_cadence_known check (cadence in ('weekly', 'fortnightly', 'monthly')),
  constraint global_event_entry_rule_known check (entry_rule in ('open_to_all', 'qualified', 'crew_entry'))
);

-- -----------------------------------------------------------------------------
-- User-owned: the one persistent My Runner
-- -----------------------------------------------------------------------------
-- Primary key on user_id, not a surrogate id with a unique index bolted on. "One account,
-- one runner" is the product decision; this is what makes a second one impossible rather
-- than merely unexpected.
create table api.my_runners (
  user_id       uuid primary key references api.profiles (user_id) on delete cascade,
  base_style_id text not null references api.my_runner_base_styles (id),
  display_name  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table api.my_runners is
  'One row per account, enforced by the primary key. Changing base style is an UPDATE: a '
  'runner changes how they look and remains the same runner, keeping every record.';

-- Owned wardrobe. `acquired_from` records the route, so a grant can be audited rather
-- than appearing from nowhere.
create table api.my_runner_wardrobe (
  user_id       uuid not null references api.profiles (user_id) on delete cascade,
  item_id       text not null references api.wearable_items (id),
  acquired_at   timestamptz not null default now(),
  acquired_from text not null,
  primary key (user_id, item_id)
);

-- Equipped state. One item per slot per user, which is what `primary key (user_id,
-- slot_id)` says — a second hat is not a race condition to debug, it is a key violation.
create table api.my_runner_equipment (
  user_id     uuid not null references api.profiles (user_id) on delete cascade,
  slot_id     text not null references api.equipment_slots (id),
  item_id     text not null references api.wearable_items (id),
  equipped_at timestamptz not null default now(),
  primary key (user_id, slot_id)
);

-- -----------------------------------------------------------------------------
-- The equip rule, enforced at write time
-- -----------------------------------------------------------------------------
-- Three ways to end up with an item on a runner that cannot be there, all of them
-- invisible until someone looks at a screenshot:
--   1. the item belongs to a different slot
--   2. the item is not compatible with this runner's body
--   3. the user does not own it
-- The trigger refuses all three. A comment would not have.
create or replace function private.assert_equip_is_valid()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item_slot  text;
  v_compatible text[];
  v_style      text;
begin
  select slot_id, compatible_base_style_ids
    into v_item_slot, v_compatible
    from api.wearable_items where id = new.item_id;

  if v_item_slot is null then
    raise exception 'equip rejected: wearable item % does not exist', new.item_id;
  end if;

  if v_item_slot <> new.slot_id then
    raise exception 'equip rejected: item % belongs to slot %, not %',
      new.item_id, v_item_slot, new.slot_id;
  end if;

  select base_style_id into v_style from api.my_runners where user_id = new.user_id;
  if v_style is null then
    raise exception 'equip rejected: user % has no My Runner', new.user_id;
  end if;

  if not (v_style = any (v_compatible)) then
    raise exception 'equip rejected: item % is not compatible with base style %',
      new.item_id, v_style;
  end if;

  if not exists (
    select 1 from api.my_runner_wardrobe w
    where w.user_id = new.user_id and w.item_id = new.item_id
  ) then
    raise exception 'equip rejected: user % does not own item %', new.user_id, new.item_id;
  end if;

  return new;
end
$$;

create trigger my_runner_equipment_valid
  before insert or update on api.my_runner_equipment
  for each row execute function private.assert_equip_is_valid();

-- A required slot is never empty. Unequipping is replacing, and a DELETE that would leave
-- a runner without shoes is refused instead of quietly producing one.
--
-- The one legitimate way a required slot is emptied is the style change below, which
-- immediately refills it in the same statement. That path announces itself with a
-- session-local setting; nothing else can, because nothing else runs inside
-- `private.reconcile_equipment_after_style_change()`. `is_local => true` on set_config
-- means the flag dies with the transaction even if the function raises.
create or replace function private.assert_required_slot_kept()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_setting('runningup.style_reconcile', true) = 'on' then
    return old;
  end if;
  if exists (select 1 from api.equipment_slots s where s.id = old.slot_id and s.is_required) then
    raise exception 'unequip rejected: % is a required slot — equip a replacement instead',
      old.slot_id;
  end if;
  return old;
end
$$;

create trigger my_runner_equipment_required_slot
  before delete on api.my_runner_equipment
  for each row execute function private.assert_required_slot_kept();

-- Changing base style may strand equipment that does not fit the new body. Rather than
-- leaving a runner wearing something impossible, the incompatible pieces are unequipped
-- and the required slots are refilled from what the user owns. Ownership is never touched:
-- nothing is taken away, only taken off.
create or replace function private.reconcile_equipment_after_style_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slot record;
begin
  perform set_config('runningup.style_reconcile', 'on', true);

  delete from api.my_runner_equipment e
   using api.wearable_items i
   where e.user_id = new.user_id
     and e.item_id = i.id
     and not (new.base_style_id = any (i.compatible_base_style_ids));

  for v_slot in
    select s.id from api.equipment_slots s
     where s.is_required
       and not exists (select 1 from api.my_runner_equipment e
                        where e.user_id = new.user_id and e.slot_id = s.id)
  loop
    insert into api.my_runner_equipment (user_id, slot_id, item_id)
    select new.user_id, v_slot.id, i.id
      from api.wearable_items i
      join api.my_runner_wardrobe w on w.item_id = i.id and w.user_id = new.user_id
     where i.slot_id = v_slot.id
       and new.base_style_id = any (i.compatible_base_style_ids)
     order by i.id
     limit 1;

    -- A style the user cannot dress is not a style change to complete halfway. The raise
    -- rolls the whole thing back, including the unequips above.
    if not found then
      raise exception 'style change rejected: user % owns nothing wearable in required slot %',
        new.user_id, v_slot.id;
    end if;
  end loop;

  perform set_config('runningup.style_reconcile', 'off', true);
  return null;
end
$$;

create trigger my_runners_reconcile_equipment
  after update of base_style_id on api.my_runners
  for each row
  when (old.base_style_id is distinct from new.base_style_id)
  execute function private.reconcile_equipment_after_style_change();

create or replace function private.touch_my_runner_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create trigger my_runners_touch_updated_at
  before update on api.my_runners
  for each row execute function private.touch_my_runner_updated_at();

-- -----------------------------------------------------------------------------
-- Global Event lifecycle
-- -----------------------------------------------------------------------------
-- An occurrence is one running of an event. State transitions are server-owned; the client
-- reads them and never writes one.
create table api.global_event_occurrences (
  id              uuid primary key default gen_random_uuid(),
  event_id        text not null references api.global_events (id),
  state           text not null default 'scheduled',
  starts_at       timestamptz not null,
  entry_closes_at timestamptz not null,
  check_in_opens_at timestamptz not null,
  settled_at      timestamptz,
  created_at      timestamptz not null default now(),

  constraint occurrence_state_known check (state in (
    'scheduled', 'entry_open', 'entry_closed', 'check_in', 'heats_assigned',
    'countdown', 'running', 'verifying', 'settled', 'rewarded', 'archived')),
  constraint occurrence_windows_ordered
    check (entry_closes_at <= starts_at and check_in_opens_at <= starts_at),
  constraint occurrence_unique_per_start unique (event_id, starts_at)
);

create table api.global_event_entries (
  occurrence_id uuid not null references api.global_event_occurrences (id) on delete cascade,
  user_id       uuid not null references api.profiles (user_id) on delete cascade,
  state         text not null default 'entered',
  heat_number   integer,
  entered_at    timestamptz not null default now(),
  checked_in_at timestamptz,
  primary key (occurrence_id, user_id),

  constraint entry_state_known check (state in (
    'entered', 'checked_in', 'racing', 'finished', 'dnf', 'withdrawn')),
  constraint entry_heat_positive check (heat_number is null or heat_number >= 1)
);

create index global_event_entries_user_idx on api.global_event_entries (user_id);

-- Progress snapshots. The columns here ARE the privacy contract: there is no latitude,
-- no longitude and no raw speed, so a snapshot cannot leak a location even if a future
-- serializer tries to send one.
create table api.global_event_progress (
  occurrence_id           uuid not null references api.global_event_occurrences (id) on delete cascade,
  user_id                 uuid not null references api.profiles (user_id) on delete cascade,
  sequence                integer not null,
  course_progress_ratio   numeric(5,4) not null,
  verified_distance_meters integer not null,
  server_rank             integer,
  pace_state              text not null,
  recorded_at             timestamptz not null default now(),
  primary key (occurrence_id, user_id, sequence),

  constraint progress_ratio_bounded check (course_progress_ratio between 0 and 1),
  constraint progress_distance_nonneg check (verified_distance_meters >= 0),
  constraint progress_pace_state_known
    check (pace_state in ('holding', 'lifting', 'fading', 'finished', 'dnf'))
);

comment on table api.global_event_progress is
  'What one participant may see of another. No coordinate column exists here: privacy is '
  'a schema property, not a serializer decision.';

create table api.global_event_results (
  occurrence_id    uuid not null references api.global_event_occurrences (id) on delete cascade,
  user_id          uuid not null references api.profiles (user_id) on delete cascade,
  final_rank       integer,
  finish_state     text not null,
  elapsed_seconds  integer,
  verified_distance_meters integer not null,
  reward_grant_key text not null,
  settled_at       timestamptz not null default now(),
  primary key (occurrence_id, user_id),

  constraint result_finish_state_known check (finish_state in ('finished', 'dnf', 'dsq', 'no_show')),
  -- One reward per user per occurrence, whatever the client does on reconnect. This is the
  -- idempotency guarantee, expressed as a unique key rather than as retry logic.
  constraint result_reward_grant_unique unique (reward_grant_key)
);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
-- 0006 enabled RLS across api by loop at the time it ran; tables created afterwards get
-- it explicitly. Catalogues are readable and never client-writable; user rows are the
-- user's own; progress and results are server-write only.
do $$
declare t text;
begin
  foreach t in array array[
    'my_runner_base_styles', 'equipment_slots', 'outfit_sets', 'wearable_items',
    'world_runners', 'global_events', 'my_runners', 'my_runner_wardrobe',
    'my_runner_equipment', 'global_event_occurrences', 'global_event_entries',
    'global_event_progress', 'global_event_results'
  ]
  loop
    execute format('alter table api.%I enable row level security', t);
    execute format('alter table api.%I force row level security', t);
  end loop;
end
$$;

-- Catalogues: world-readable, never writable by a client.
do $$
declare t text;
begin
  foreach t in array array[
    'my_runner_base_styles', 'equipment_slots', 'outfit_sets', 'wearable_items',
    'world_runners', 'global_events'
  ]
  loop
    execute format('grant select on api.%I to authenticated, anon', t);
    execute format(
      'create policy %I on api.%I for select to authenticated, anon using (true)',
      t || '_read_all', t);
  end loop;
end
$$;

-- The runner and the wardrobe are the user's own.
grant select, insert, update on api.my_runners to authenticated;
create policy my_runners_own on api.my_runners
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Ownership is granted by the server (a reward route), never claimed by the client.
grant select on api.my_runner_wardrobe to authenticated;
create policy my_runner_wardrobe_select_own on api.my_runner_wardrobe
  for select to authenticated using (user_id = auth.uid());

-- Equipping is a client action; the trigger above is what makes it safe.
grant select, insert, update, delete on api.my_runner_equipment to authenticated;
create policy my_runner_equipment_own on api.my_runner_equipment
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Global Events: read the schedule, enter and check in, read your own result. Rank,
-- progress and reward are server-written.
grant select on api.global_event_occurrences to authenticated, anon;
create policy global_event_occurrences_read on api.global_event_occurrences
  for select to authenticated, anon using (true);

grant select, insert, update on api.global_event_entries to authenticated;
create policy global_event_entries_select_own on api.global_event_entries
  for select to authenticated using (user_id = auth.uid());
create policy global_event_entries_insert_own on api.global_event_entries
  for insert to authenticated with check (user_id = auth.uid());
create policy global_event_entries_update_own on api.global_event_entries
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select on api.global_event_progress to authenticated;
-- A participant may see the progress of everyone in the same occurrence — that is the
-- event. What they see is bounded by the columns, not by the policy.
create policy global_event_progress_read_same_occurrence on api.global_event_progress
  for select to authenticated using (
    exists (select 1 from api.global_event_entries e
             where e.occurrence_id = global_event_progress.occurrence_id
               and e.user_id = auth.uid())
  );

grant select on api.global_event_results to authenticated;
create policy global_event_results_read_same_occurrence on api.global_event_results
  for select to authenticated using (
    exists (select 1 from api.global_event_entries e
             where e.occurrence_id = global_event_results.occurrence_id
               and e.user_id = auth.uid())
  );

-- -----------------------------------------------------------------------------
-- Launch floor, extended with the six new categories
-- -----------------------------------------------------------------------------
-- Restated from packages/domain/constants.mjs (LAUNCH_CONTENT_FLOOR); the content
-- validator compares the two sets in both directions so neither can gain a category the
-- other lacks.
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
      ('continents',            (select count(*)::int from api.world_continents),                                  12),
      ('region_nodes',          (select count(*)::int from api.world_regions),                                    192),
      ('courses',               (select count(*)::int from api.world_courses),                                   2304),
      ('main_races',            (select count(*)::int from api.world_races where kind = 'main'),                   72),
      ('challenge_races',       (select count(*)::int from api.world_races where kind = 'side'),                   24),
      ('race_formats',          (select count(*)::int from api.race_formats),                                       7),
      ('challenge_formats',     (select count(*)::int from api.challenge_formats),                                  6),
      ('playable_characters',   (select count(*)::int from api.characters),                                        12),
      ('character_episodes',    (select count(*)::int from api.character_episodes),                                36),
      ('race_techniques',       (select count(*)::int from api.race_techniques),                                   48),
      ('gear_sets',             (select count(*)::int from api.gear_sets),                                         72),
      ('standard_rival_crews',  (select count(*)::int from api.rival_crews where crew_kind = 'standard'),          24),
      ('elite_rival_crews',     (select count(*)::int from api.rival_crews where crew_kind = 'elite'),             12),
      ('continent_champions',   (select count(*)::int from api.world_champions where kind = 'continent_champion'), 12),
      ('open_race_events',      (select count(*)::int from api.world_champions where kind = 'open_race'),           4),
      ('apex_races',            (select count(*)::int from api.world_champions where kind = 'apex_race'),           1),
      ('companions',            (select count(*)::int from api.companions),                                        12),
      ('equipable_cosmetics',   (select count(*)::int from api.cosmetics),                                         96),
      ('story_chapters',        (select count(*)::int from api.story_chapters),                                    12),
      ('my_runner_base_styles', (select count(*)::int from api.my_runner_base_styles),                             24),
      ('world_runners',         (select count(*)::int from api.world_runners),                                    200),
      ('equipment_slots',       (select count(*)::int from api.equipment_slots),                                   18),
      ('outfit_sets',           (select count(*)::int from api.outfit_sets),                                      120),
      ('wearable_items',        (select count(*)::int from api.wearable_items),                                   600),
      ('global_events',         (select count(*)::int from api.global_events),                                      6)
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
    where (select count(*) from api.world_regions rg where rg.continent_id = c.id) < 16
       or (select count(*) from api.world_races rc where rc.continent_id = c.id and rc.kind = 'main') < 6
       or (select count(*) from api.world_champions ch
            where ch.continent_id = c.id and ch.kind = 'continent_champion') < 1
       or (select count(*) from api.gear_sets g where g.continent_id = c.id) < 6
  ) then
    raise exception 'launch content incomplete: at least one continent is below its per-continent floor';
  end if;

  -- And every region must carry its twelve courses.
  if exists (
    select 1 from api.world_regions rg
    where (select count(*) from api.world_courses cr where cr.region_id = rg.id) <> 12
  ) then
    raise exception 'launch content incomplete: at least one region does not carry exactly 12 courses';
  end if;

  -- Every runner carries a full four-technique kit, one of each kind.
  if exists (
    select 1 from api.characters ch
    where (select count(*) from api.race_techniques t where t.character_id = ch.id) <> 4
       or (select count(distinct t.kind) from api.race_techniques t where t.character_id = ch.id) <> 4
  ) then
    raise exception 'launch content incomplete: at least one runner does not carry four distinct techniques';
  end if;

  -- The one that a count can never catch: 600 wearable items and a base style with
  -- nothing to put on its feet. Every style must be able to fill every required slot.
  if exists (
    select 1
      from api.my_runner_base_styles st
     cross join api.equipment_slots sl
     where sl.is_required
       and not exists (
         select 1 from api.wearable_items i
          where i.slot_id = sl.id
            and st.id = any (i.compatible_base_style_ids))
  ) then
    raise exception 'launch content incomplete: a base style has nothing to wear in a required slot';
  end if;

  -- And a slot nothing fills is a row in a table, not a slot.
  if exists (
    select 1 from api.equipment_slots sl
     where not exists (select 1 from api.wearable_items i where i.slot_id = sl.id)
  ) then
    raise exception 'launch content incomplete: an equipment slot has no wearable item';
  end if;

  -- Every crew seat is a named world runner, on the crew's own continent.
  if exists (
    select 1 from api.rival_crews c
    where (select count(*) from api.world_runners r where r.crew_id = c.id) <> 3
  ) then
    raise exception 'launch content incomplete: a rival crew does not carry three named runners';
  end if;
  if exists (
    select 1 from api.world_runners r
     join api.rival_crews c on c.id = r.crew_id
    where r.continent_id <> c.continent_id
  ) then
    raise exception 'launch content incomplete: a world runner is in a crew from another continent';
  end if;

  -- Global Events must be able to fill a field from the open roster.
  if (select count(*) from api.world_runners where open_field) < 92 then
    raise exception 'launch content incomplete: the open field cannot fill a 100-runner event';
  end if;
end
$$;

commit;
