-- =============================================================================
-- RunningUp 0002 — Runner Passport, run plans, sessions, verification, imports
--
-- Direction lock DL-3 is enforced at the type level: `private.activity_type` lists ONLY
-- road, track, treadmill and indoor running. Trail, hiking, cycling and climbing are not
-- absent by convention — they are unrepresentable, so no code path can introduce them.
-- =============================================================================

-- The complete set of activities that can earn a running reward. Nothing else exists.
create type private.activity_type as enum ('road', 'track', 'treadmill', 'indoor');

-- Trust grades, master # 10.8. D is personal-log only; X never yields running reward.
create type private.verification_grade as enum ('A', 'B', 'C', 'D', 'X');

create type private.verification_status as enum
  ('verified', 'verified_limited', 'pending_review', 'rejected');

create type private.session_style as enum (
  's_free', 's_run_walk', 's_easy', 's_steady', 's_progression', 's_tempo', 's_intervals',
  's_fartlek', 's_long_run', 's_time_trial', 's_race_simulation', 's_track', 's_treadmill',
  's_indoor', 's_custom'
);

create type private.passport_band as enum ('R0', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7');

create type private.difficulty_lane as enum
  ('journey', 'standard', 'veteran', 'master', 'legend', 'apex');

-- -----------------------------------------------------------------------------
-- Runner Passport — append-only version history, current row materialised in api.
-- -----------------------------------------------------------------------------
create table api.runner_passports (
  user_id                   uuid primary key references api.profiles(user_id) on delete cascade,
  version                   integer not null default 1,
  rules_version             text not null,
  band                      private.passport_band not null,
  provisional_band          private.passport_band,
  -- The full capability vector is preserved: a user may be R5 on 5 km speed and R3 on
  -- single-run distance simultaneously. The band is a headline, never the whole truth.
  distance_capacity_meters  integer check (distance_capacity_meters >= 0),
  typical_run_meters        integer check (typical_run_meters >= 0),
  longest_recent_meters     integer check (longest_recent_meters >= 0),
  weekly_volume_meters      integer check (weekly_volume_meters >= 0),
  monthly_volume_meters     integer check (monthly_volume_meters >= 0),
  frequency_per_week        numeric(5,2) check (frequency_per_week >= 0),
  preferred_surface         private.activity_type not null default 'road',
  preferred_goal_id         text,
  desired_lane              private.difficulty_lane,
  source_confidence         numeric(3,2) not null default 0 check (source_confidence between 0 and 1),
  profile_confidence        numeric(3,2) not null default 0 check (profile_confidence between 0 and 1),
  calculated_at             timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create trigger runner_passports_touch before update on api.runner_passports
  for each row execute function private.touch_updated_at();

create table private.runner_passport_history (
  id             bigserial primary key,
  user_id        uuid not null references api.profiles(user_id) on delete cascade,
  version        integer not null,
  rules_version  text not null,
  band           private.passport_band not null,
  snapshot       jsonb not null,
  -- Why the band moved, so a recalculation is explainable rather than mysterious.
  reason         text not null,
  effective_at   timestamptz not null default now(),
  unique (user_id, version)
);

-- -----------------------------------------------------------------------------
-- Goal library and immutable run-plan snapshots
-- -----------------------------------------------------------------------------
create table api.run_goal_definitions (
  goal_id      text primary key,
  goal_type    text not null check (goal_type in ('distance', 'duration', 'structured', 'free')),
  target_meters   numeric(10,3) check (target_meters > 0),
  target_seconds  integer check (target_seconds > 0),
  name_key     text not null,
  -- DL-2: the library is flat. There is no `requires_goal_id` column by design, so a
  -- prerequisite chain cannot be expressed even by a future migration author in a hurry.
  sort_order   integer not null default 0,
  is_custom    boolean not null default false
);

create table api.run_plan_snapshots (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references api.profiles(user_id) on delete cascade,
  passport_version        integer,
  goal_type               text not null check (goal_type in ('distance', 'duration', 'structured', 'free')),
  goal_id                 text references api.run_goal_definitions(goal_id),
  goal_distance_meters    numeric(10,3) check (goal_distance_meters > 0),
  goal_duration_seconds   integer check (goal_duration_seconds > 0),
  session_style           private.session_style not null default 's_free',
  activity_type           private.activity_type not null default 'road',
  difficulty_lane         private.difficulty_lane not null default 'standard',
  selected_continent_id   text,
  structured_steps        jsonb,
  -- Snapshotted at start so a goal cannot be edited mid-run to manufacture a bonus.
  created_at              timestamptz not null default now(),
  config_version          text not null default '1.0.0'
);
create index run_plan_snapshots_user_idx on api.run_plan_snapshots (user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Sessions
-- -----------------------------------------------------------------------------
create table api.run_sessions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references api.profiles(user_id) on delete cascade,
  run_plan_snapshot_id  uuid references api.run_plan_snapshots(id),
  activity_type         private.activity_type not null,
  source                text not null default 'direct_gps'
                        check (source in ('direct_gps', 'health_connect', 'indoor_sensor', 'manual', 'file_import')),
  started_at            timestamptz not null,
  ended_at              timestamptz,
  -- Integer meters: the ledger contract. 999.999 km and exactly 1000.000 km must be
  -- exactly representable, which floating point kilometres cannot guarantee.
  distance_meters       integer not null default 0 check (distance_meters >= 0),
  moving_seconds        integer not null default 0 check (moving_seconds >= 0),
  elapsed_seconds       integer not null default 0 check (elapsed_seconds >= 0),
  structured_completed  boolean not null default false,
  -- Anti-replay: the server issues the nonce at start and it may be redeemed once.
  server_nonce          text not null unique,
  journal_checksum      text,
  sync_status           text not null default 'pending'
                        check (sync_status in ('pending', 'uploaded', 'processed', 'failed')),
  created_at            timestamptz not null default now(),
  constraint run_sessions_moving_within_elapsed
    check (moving_seconds <= elapsed_seconds or elapsed_seconds = 0)
);
create index run_sessions_user_started_idx on api.run_sessions (user_id, started_at desc);

-- Raw route and samples live in `private` and are never reachable from a client role.
create table private.run_samples (
  session_id        uuid not null references api.run_sessions(id) on delete cascade,
  sequence          integer not null,
  cumulative_meters numeric(10,2) not null,
  moving_seconds    numeric(10,2) not null,
  latitude          numeric(9,6),
  longitude         numeric(9,6),
  accuracy_meters   numeric(6,2),
  speed_mps         numeric(6,3),
  -- Altitude is stored as inert sensor metadata ONLY. DL-3 forbids it from feeding any
  -- stat, quest, leaderboard or multiplier; no function in this schema reads it.
  altitude_meters   numeric(7,2),
  recorded_at       timestamptz not null,
  primary key (session_id, sequence)
);

create table private.run_verifications (
  session_id       uuid primary key references api.run_sessions(id) on delete cascade,
  grade            private.verification_grade not null,
  status           private.verification_status not null,
  confidence       numeric(3,2) not null default 1 check (confidence between 0 and 1),
  reason_codes     text[] not null default '{}',
  verified_at      timestamptz not null default now(),
  reviewed_by      text
);

create table private.run_anomaly_flags (
  id            bigserial primary key,
  session_id    uuid not null references api.run_sessions(id) on delete cascade,
  anomaly_kind  text not null,
  severity      text not null default 'info' check (severity in ('info', 'warn', 'critical')),
  detail        jsonb,
  created_at    timestamptz not null default now()
);

create table api.run_appeals (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references api.run_sessions(id) on delete cascade,
  user_id      uuid not null references api.profiles(user_id) on delete cascade,
  message      text not null check (length(message) between 1 and 2000),
  status       text not null default 'open' check (status in ('open', 'reviewing', 'upheld', 'overturned')),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);

-- -----------------------------------------------------------------------------
-- Best efforts and baselines
-- -----------------------------------------------------------------------------
create table api.run_best_efforts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references api.profiles(user_id) on delete cascade,
  session_id        uuid not null references api.run_sessions(id) on delete cascade,
  distance_meters   numeric(10,3) not null check (distance_meters > 0),
  duration_seconds  numeric(10,2) not null check (duration_seconds > 0),
  speed_mps         numeric(6,3) not null check (speed_mps > 0 and speed_mps <= 12.5),
  -- Indoor and outdoor efforts are categorised separately: they are not ranked against
  -- one another without the category being visible (master # 14.1).
  source_category   text not null check (source_category in ('outdoor', 'indoor')),
  low_confidence    boolean not null default false,
  achieved_at       timestamptz not null,
  unique (session_id, distance_meters)
);
create index run_best_efforts_user_distance_idx
  on api.run_best_efforts (user_id, distance_meters, speed_mps desc);

create table api.personal_baselines (
  user_id          uuid not null references api.profiles(user_id) on delete cascade,
  distance_meters  numeric(10,3) not null,
  baseline_speed_mps numeric(6,3) not null check (baseline_speed_mps > 0),
  sample_count     integer not null default 0,
  window_days      integer not null default 90,
  calculated_at    timestamptz not null default now(),
  primary key (user_id, distance_meters)
);

-- -----------------------------------------------------------------------------
-- Health Connect / file imports
-- -----------------------------------------------------------------------------
create table private.run_import_batches (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references api.profiles(user_id) on delete cascade,
  source         text not null check (source in ('health_connect', 'file_import')),
  scope          text not null check (scope in ('current_month', 'history_90d')),
  requested_at   timestamptz not null default now(),
  completed_at   timestamptz,
  included_count integer not null default 0,
  duplicate_count integer not null default 0,
  rejected_count integer not null default 0,
  non_running_count integer not null default 0
);

create table private.run_import_records (
  id                 uuid primary key default gen_random_uuid(),
  batch_id           uuid not null references private.run_import_batches(id) on delete cascade,
  user_id            uuid not null references api.profiles(user_id) on delete cascade,
  session_id         uuid references api.run_sessions(id) on delete set null,
  source_app         text,
  source_record_id   text not null,
  -- Duplicate defence in depth: the provider record id AND a metric fingerprint, so a
  -- re-installed app that mints new record ids still cannot double-claim a run.
  metric_fingerprint text not null,
  started_at         timestamptz not null,
  ended_at           timestamptz not null,
  distance_meters    integer not null check (distance_meters >= 0),
  outcome            text not null check (outcome in ('included', 'duplicate', 'non_running', 'rejected', 'limited')),
  created_at         timestamptz not null default now(),
  unique (user_id, source_record_id),
  unique (user_id, metric_fingerprint)
);
