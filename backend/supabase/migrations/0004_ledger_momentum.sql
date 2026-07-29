-- =============================================================================
-- RunningUp 0004 — server-authoritative ledgers, momentum and chains
--
-- Direction lock DL-5: Fitness XP and attribute growth have exactly one source, the
-- verified run ledger. `private.core_power_source` enumerates the only source types that
-- may touch core power; cosmetics, payments, ads, idle time and referrals are structurally
-- incapable of appearing there.
--
-- The ledger is immutable. An operator correction is a NEW reversal row referencing the
-- original, never an UPDATE — so the audit trail cannot be rewritten.
-- =============================================================================

-- Sources that may grant core power. Note what is absent and cannot be added without a
-- migration that pgTAP test 04 will fail.
create type private.core_power_source as enum (
  'verified_run', 'current_month_import', 'monthly_apex_checkpoint', 'reversal', 'adjustment'
);

-- Sources for soft currency and cosmetics — explicitly a different type, so a payment can
-- never be typed into the core power ledger by accident.
create type private.soft_source as enum (
  'quest', 'boss', 'idle', 'expedition', 'crafting', 'season', 'event',
  'admin_compensation', 'referral_cosmetic', 'reversal'
);

-- -----------------------------------------------------------------------------
-- Fitness XP ledger — the single source of core power
-- -----------------------------------------------------------------------------
create table api.xp_ledger (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references api.profiles(user_id) on delete cascade,
  source_type             private.core_power_source not null,
  source_id               uuid,
  formula_version         text not null,
  passport_version        integer,
  verification_grade      private.verification_grade not null,
  -- The full component breakdown, so the result screen can explain every point awarded
  -- and a recomputation can be checked against what was actually paid.
  base_components         jsonb not null,
  modifiers               jsonb not null default '{}'::jsonb,
  monthly_distance_before integer not null,
  monthly_distance_after  integer not null,
  crossed_checkpoint_ids  jsonb not null default '[]'::jsonb,
  monthly_multiplier      numeric(4,2) not null,
  final_amount            numeric(12,2) not null,
  -- Network retries, offline queue flushes and duplicate uploads all collapse onto this.
  idempotency_key         text not null,
  reversal_of             uuid references api.xp_ledger(id),
  created_at              timestamptz not null default now(),
  unique (user_id, idempotency_key),
  -- A normal grant is non-negative; only a reversal may be negative, and only when it
  -- names the entry it reverses.
  constraint xp_ledger_amount_sign check (
    (reversal_of is null and final_amount >= 0)
    or (reversal_of is not null and final_amount <= 0)
  ),
  constraint xp_ledger_monthly_never_regresses check (monthly_distance_after >= monthly_distance_before),
  constraint xp_ledger_monthly_capped check (monthly_distance_after <= 1000000),
  constraint xp_ledger_multiplier_capped check (monthly_multiplier <= 1.25)
);
create index xp_ledger_user_created_idx on api.xp_ledger (user_id, created_at desc);
create unique index xp_ledger_one_grant_per_session
  on api.xp_ledger (user_id, source_id)
  where source_id is not null and reversal_of is null;

-- Immutability: no UPDATE, no DELETE, for any role including service_role.
create rule xp_ledger_no_update as on update to api.xp_ledger do instead nothing;
create rule xp_ledger_no_delete as on delete to api.xp_ledger do instead nothing;

create table api.stat_ledger (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references api.profiles(user_id) on delete cascade,
  xp_ledger_id  uuid not null references api.xp_ledger(id),
  stat_kind     text not null check (stat_kind in
                  ('vitality', 'endurance', 'speed', 'tempo', 'pacing', 'momentum', 'resolve')),
  amount        numeric(12,2) not null,
  created_at    timestamptz not null default now()
);
create index stat_ledger_user_idx on api.stat_ledger (user_id, stat_kind);
create rule stat_ledger_no_update as on update to api.stat_ledger do instead nothing;
create rule stat_ledger_no_delete as on delete to api.stat_ledger do instead nothing;

create table api.currency_ledger (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references api.profiles(user_id) on delete cascade,
  currency_kind   text not null check (currency_kind in
                    ('pulse_energy', 'craft_material', 'exploration_charge',
                     'boss_contribution', 'season_score', 'character_bond', 'crown_shard', 'gold')),
  source_type     private.soft_source not null,
  source_id       uuid,
  amount          numeric(12,2) not null,
  idempotency_key text not null,
  created_at      timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
create index currency_ledger_user_idx on api.currency_ledger (user_id, currency_kind);
create rule currency_ledger_no_update as on update to api.currency_ledger do instead nothing;
create rule currency_ledger_no_delete as on delete to api.currency_ledger do instead nothing;

-- Balances are derived from the ledger, never stored as an authoritative number.
create or replace view api.v_currency_balances
with (security_invoker = true) as
  select user_id, currency_kind, sum(amount)::numeric(14,2) as balance
  from api.currency_ledger
  group by user_id, currency_kind;

create or replace view api.v_fitness_xp_total
with (security_invoker = true) as
  select user_id, coalesce(sum(final_amount), 0)::numeric(14,2) as total_fitness_xp
  from api.xp_ledger
  group by user_id;

-- -----------------------------------------------------------------------------
-- Reward days and Daily Momentum
-- -----------------------------------------------------------------------------
create table api.run_reward_days (
  user_id          uuid not null references api.profiles(user_id) on delete cascade,
  reward_day       date not null,
  month_key        text not null,
  session_count    integer not null default 0 check (session_count >= 0),
  distance_meters  integer not null default 0 check (distance_meters >= 0),
  -- One row per user-day is the mechanism that makes "several runs today advance the
  -- streak once, but each run still pays" true by construction.
  primary key (user_id, reward_day)
);

create table api.user_daily_momentum (
  user_id            uuid primary key references api.profiles(user_id) on delete cascade,
  current_streak     integer not null default 0 check (current_streak >= 0),
  best_streak        integer not null default 0 check (best_streak >= 0),
  last_reward_day    date,
  milestones_claimed integer[] not null default '{}',
  updated_at         timestamptz not null default now(),
  -- A missed day resets `current_streak` only. The lifetime best may never fall.
  constraint momentum_best_ge_current check (best_streak >= current_streak)
);
create trigger user_daily_momentum_touch before update on api.user_daily_momentum
  for each row execute function private.touch_updated_at();

create table api.user_consecutive_weeks (
  user_id        uuid primary key references api.profiles(user_id) on delete cascade,
  current_weeks  integer not null default 0 check (current_weeks >= 0),
  best_weeks     integer not null default 0 check (best_weeks >= 0),
  last_week_key  text,
  updated_at     timestamptz not null default now(),
  constraint weeks_best_ge_current check (best_weeks >= current_weeks)
);

-- The weekly goal is snapshotted per week so changing next week's target cannot
-- retroactively break a week already completed.
create table api.weekly_goal_snapshots (
  user_id      uuid not null references api.profiles(user_id) on delete cascade,
  week_key     text not null check (week_key ~ '^[0-9]{4}-W[0-9]{2}$'),
  goal_kind    text not null check (goal_kind in ('distance', 'sessions', 'structured', 'performance')),
  target_value numeric(10,2) not null check (target_value > 0),
  achieved_value numeric(10,2) not null default 0 check (achieved_value >= 0),
  met          boolean not null default false,
  primary key (user_id, week_key)
);

create table api.user_chains (
  user_id     uuid not null references api.profiles(user_id) on delete cascade,
  chain_kind  text not null check (chain_kind in ('quality_session', 'long_run')),
  rule_version text not null,
  current_length integer not null default 0 check (current_length >= 0),
  best_length    integer not null default 0 check (best_length >= 0),
  updated_at  timestamptz not null default now(),
  -- One active chain state per (user, rule, version) — master # 16.4.
  primary key (user_id, chain_kind, rule_version),
  constraint chain_best_ge_current check (best_length >= current_length)
);

-- -----------------------------------------------------------------------------
-- Idempotency and rate limiting
-- -----------------------------------------------------------------------------
create table private.idempotency_keys (
  key         text primary key,
  user_id     uuid not null references api.profiles(user_id) on delete cascade,
  operation   text not null,
  result      jsonb,
  created_at  timestamptz not null default now()
);

create table private.rate_limit_buckets (
  bucket_key  text primary key,
  user_id     uuid references api.profiles(user_id) on delete cascade,
  window_start timestamptz not null default now(),
  count       integer not null default 0,
  updated_at  timestamptz not null default now()
);

create table audit.reward_reversals (
  id                 uuid primary key default gen_random_uuid(),
  original_ledger_id uuid not null references api.xp_ledger(id),
  reversal_ledger_id uuid not null references api.xp_ledger(id),
  actor              text not null,
  reason             text not null,
  created_at         timestamptz not null default now()
);
