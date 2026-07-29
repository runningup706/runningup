-- =============================================================================
-- RunningUp 0003 — Monthly Apex Ladder: 0..1000 km, 52 checkpoints, World Crown
--
-- This migration is where direction lock DL-1 stops being a promise and becomes a
-- constraint. Every rule below is enforced by the database, not by application code:
--
--   * no checkpoint threshold may exceed 1 000 000 m
--   * the final checkpoint must be exactly 1 000 000 m
--   * there must be exactly 52 checkpoints
--   * `world_crown` is the last enum value, so no rank can sort above it
--   * laddered distance is capped at 1 000 000 m by CHECK; surplus goes to over_crown
--   * a checkpoint is claimable once per (user, month)
--   * the World Crown and the Apex Axis unlock are once per (user, month)
-- =============================================================================

-- Enum order IS the rank order. `world_crown` is last: PostgreSQL enum comparison makes
-- "a rank above World Crown" impossible to express without an explicit ALTER TYPE, which
-- pgTAP test 03 asserts against.
create type private.apex_rank as enum (
  'awakening', 'strider', 'runner', 'challenger', 'vanguard', 'champion',
  'master', 'grandmaster', 'legend', 'mythic', 'apex', 'world_crown'
);

-- -----------------------------------------------------------------------------
-- Ladder definition (seeded content, versioned)
-- -----------------------------------------------------------------------------
create table api.monthly_apex_definitions (
  ladder_version           text primary key,
  final_checkpoint_meters  integer not null,
  checkpoint_count         integer not null,
  content_version          text not null,
  effective_at             timestamptz not null default now(),
  is_active                boolean not null default true,
  -- DL-1, asserted at the type level rather than trusted to a code review.
  constraint apex_final_is_exactly_1000km check (final_checkpoint_meters = 1000000),
  constraint apex_checkpoint_count_is_52   check (checkpoint_count = 52)
);

create table api.monthly_apex_checkpoints (
  checkpoint_id     text primary key,
  ladder_version    text not null references api.monthly_apex_definitions(ladder_version),
  index             integer not null check (index between 1 and 52),
  threshold_meters  integer not null,
  major_rank        private.apex_rank not null,
  reward_bundle_id  text not null,
  story_or_world_effect text not null,
  name_key          text not null,
  is_final          boolean not null default false,
  content_version   text not null,
  -- The whole of DL-1 in four constraints.
  constraint apex_cp_within_ladder      check (threshold_meters between 0 and 1000000),
  constraint apex_cp_final_flag_matches check ((is_final = true) = (threshold_meters = 1000000)),
  unique (ladder_version, index),
  unique (ladder_version, threshold_meters)
);
create index monthly_apex_checkpoints_threshold_idx
  on api.monthly_apex_checkpoints (ladder_version, threshold_meters);

/**
 * Structural validation of a seeded ladder. Called by the seed and by CI.
 * Raises rather than returning false so a bad seed aborts the transaction that made it.
 */
create or replace function private.assert_apex_ladder_valid(p_version text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
  v_max   integer;
  v_final integer;
  v_gaps  integer;
begin
  select count(*), max(threshold_meters) into v_count, v_max
  from api.monthly_apex_checkpoints where ladder_version = p_version;

  if v_count <> 52 then
    raise exception 'apex ladder %: expected 52 checkpoints, found %', p_version, v_count;
  end if;
  if v_max <> 1000000 then
    raise exception 'apex ladder %: highest checkpoint must be exactly 1000 km, found % m', p_version, v_max;
  end if;

  select count(*) into v_final
  from api.monthly_apex_checkpoints
  where ladder_version = p_version and is_final;
  if v_final <> 1 then
    raise exception 'apex ladder %: expected exactly one final checkpoint, found %', p_version, v_final;
  end if;

  -- Index and threshold must rise together: a ladder that is not strictly ascending
  -- would let a crossing be skipped or double-counted.
  select count(*) into v_gaps
  from (
    select threshold_meters,
           lag(threshold_meters) over (order by index) as previous
    from api.monthly_apex_checkpoints where ladder_version = p_version
  ) s
  where previous is not null and threshold_meters <= previous;
  if v_gaps > 0 then
    raise exception 'apex ladder %: thresholds are not strictly ascending', p_version;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Per-user monthly progress
-- -----------------------------------------------------------------------------
create table api.monthly_apex_progress (
  user_id            uuid not null references api.profiles(user_id) on delete cascade,
  month_key          text not null check (month_key ~ '^[0-9]{4}-[0-9]{2}$'),
  ladder_version     text not null references api.monthly_apex_definitions(ladder_version),
  -- The ladder itself. Capped by CHECK: the cap is not an application convention.
  laddered_meters    integer not null default 0,
  -- Distance beyond the crown is recorded in full, and grants no tier (DL-1).
  over_crown_meters  integer not null default 0 check (over_crown_meters >= 0),
  major_rank         private.apex_rank not null default 'awakening',
  world_crown_awarded boolean not null default false,
  apex_axis_unlocked  boolean not null default false,
  first_run_at       timestamptz,
  updated_at         timestamptz not null default now(),
  primary key (user_id, month_key),
  constraint apex_progress_laddered_capped check (laddered_meters between 0 and 1000000),
  -- The crown flag and the ladder value can never disagree.
  constraint apex_progress_crown_consistent
    check (world_crown_awarded = (laddered_meters >= 1000000)),
  constraint apex_progress_rank_consistent
    check ((major_rank = 'world_crown') = (laddered_meters >= 1000000))
);
create trigger monthly_apex_progress_touch before update on api.monthly_apex_progress
  for each row execute function private.touch_updated_at();

-- One claim per checkpoint per user-month. The unique key is the anti-duplicate rule.
create table api.monthly_apex_checkpoint_claims (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references api.profiles(user_id) on delete cascade,
  month_key      text not null,
  checkpoint_id  text not null references api.monthly_apex_checkpoints(checkpoint_id),
  ledger_entry_id uuid,
  claimed_at     timestamptz not null default now(),
  unique (user_id, month_key, checkpoint_id)
);
create index apex_claims_user_month_idx on api.monthly_apex_checkpoint_claims (user_id, month_key);

-- One crown per user-month, forever.
create table api.world_crown_history (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references api.profiles(user_id) on delete cascade,
  month_key     text not null,
  achieved_at   timestamptz not null default now(),
  laddered_meters integer not null check (laddered_meters = 1000000),
  over_crown_meters_at_award integer not null default 0,
  unique (user_id, month_key)
);

-- One Apex Axis unlock per user-month. Repeat clears are recorded as attempts, and they
-- deliberately create no new tier (DL-1).
create table api.apex_boss_unlocks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references api.profiles(user_id) on delete cascade,
  month_key    text not null,
  boss_id      text not null default 'boss_apex_axis',
  unlocked_at  timestamptz not null default now(),
  unique (user_id, month_key)
);

create table api.apex_boss_attempts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references api.profiles(user_id) on delete cascade,
  month_key     text not null,
  attempt_index integer not null,
  cleared       boolean not null default false,
  clear_seconds integer check (clear_seconds > 0),
  battle_seed   text not null,
  attempted_at  timestamptz not null default now(),
  unique (user_id, month_key, attempt_index)
);

/** Returns the rank for a laddered distance. Mirrors tools/lib/constants.mjs exactly. */
create or replace function private.apex_rank_for_meters(p_meters integer)
returns private.apex_rank
language sql immutable
set search_path = ''
as $$
  select case
    when p_meters >= 1000000 then 'world_crown'::private.apex_rank
    when p_meters >=  900000 then 'apex'
    when p_meters >=  800000 then 'mythic'
    when p_meters >=  700000 then 'legend'
    when p_meters >=  600000 then 'grandmaster'
    when p_meters >=  500000 then 'master'
    when p_meters >=  400000 then 'champion'
    when p_meters >=  300000 then 'vanguard'
    when p_meters >=  200000 then 'challenger'
    when p_meters >=  100000 then 'runner'
    when p_meters >=   50000 then 'strider'
    else 'awakening'
  end
$$;

/** The monthly multiplier. Flat at and above the crown — DL-1. */
create or replace function private.apex_monthly_multiplier(p_meters integer)
returns numeric
language sql immutable
set search_path = ''
as $$
  select case private.apex_rank_for_meters(p_meters)
    when 'awakening'   then 1.00
    when 'strider'     then 1.02
    when 'runner'      then 1.04
    when 'challenger'  then 1.06
    when 'vanguard'    then 1.08
    when 'champion'    then 1.10
    when 'master'      then 1.12
    when 'grandmaster' then 1.14
    when 'legend'      then 1.16
    when 'mythic'      then 1.18
    when 'apex'        then 1.20
    when 'world_crown' then 1.25
  end::numeric
$$;
