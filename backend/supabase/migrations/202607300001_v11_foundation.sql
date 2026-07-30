-- V11 검증 러닝, 성장 원장, 월간 여정의 권위 데이터를 구성한다.
create schema if not exists extensions;
create schema if not exists private;
create schema if not exists audit;

create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 24),
  visibility text not null default 'friends'
    check (visibility in ('private', 'friends', 'crew', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.my_runners (
  user_id uuid primary key references auth.users(id) on delete cascade,
  appearance jsonb not null default '{}'::jsonb,
  evolution_form smallint not null default 1
    check (evolution_form between 1 and 12),
  lifetime_verified_m bigint not null default 0
    check (lifetime_verified_m >= 0),
  runner_growth_points bigint not null default 0
    check (runner_growth_points >= 0),
  pacer_bond_points bigint not null default 0
    check (pacer_bond_points >= 0),
  restoration_points bigint not null default 0
    check (restoration_points >= 0),
  updated_at timestamptz not null default now()
);

create table public.friendships (
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create table public.crews (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 32),
  created_at timestamptz not null default now()
);

create table public.crew_memberships (
  crew_id uuid not null references public.crews(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'captain', 'member')),
  joined_at timestamptz not null default now(),
  primary key (crew_id, user_id)
);

create table public.world_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  route_id text not null,
  progress_m bigint not null default 0 check (progress_m >= 0),
  restoration_phase smallint not null default 0
    check (restoration_phase between 0 and 5),
  mastery_stamps smallint not null default 0
    check (mastery_stamps between 0 and 3),
  updated_at timestamptz not null default now(),
  primary key (user_id, route_id)
);

create table public.monthly_apex (
  user_id uuid not null references auth.users(id) on delete cascade,
  month_start date not null,
  verified_m bigint not null default 0 check (verified_m >= 0),
  highest_claimed_checkpoint smallint not null default 0
    check (highest_claimed_checkpoint between 0 and 120),
  world_crown boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, month_start)
);

create table public.daily_run_contracts (
  user_id uuid not null references auth.users(id) on delete cascade,
  contract_date date not null,
  target_m integer not null default 5000 check (target_m between 1000 and 50000),
  completed_run_id uuid,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, contract_date)
);

create table private.canonical_runs (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null
    check (source in ('direct_gps', 'health_connect', 'fit', 'gpx', 'tcx')),
  source_record_id text,
  route_id text not null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  distance_m integer not null check (distance_m between 100 and 200000),
  moving_seconds integer not null check (moving_seconds between 30 and 86400),
  fingerprint text not null,
  verification_status text not null
    check (verification_status in ('verified', 'rejected', 'review')),
  verification_evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (ended_at > started_at),
  unique (user_id, fingerprint)
);

create unique index canonical_runs_source_record_unique
  on private.canonical_runs (user_id, source, source_record_id)
  where source_record_id is not null;
create index canonical_runs_user_started_idx
  on private.canonical_runs (user_id, started_at desc);

create table private.reward_ledger (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('verified_run', 'reversal')),
  source_id uuid not null,
  formula_version text not null,
  runner_growth_points bigint not null,
  pacer_bond_points bigint not null,
  restoration_points bigint not null,
  idempotency_key text not null unique,
  reversal_of uuid references private.reward_ledger(id),
  reward jsonb not null,
  created_at timestamptz not null default now(),
  check (
    (source_type = 'verified_run'
      and runner_growth_points >= 0
      and pacer_bond_points >= 0
      and restoration_points >= 0
      and reversal_of is null)
    or
    (source_type = 'reversal'
      and runner_growth_points <= 0
      and pacer_bond_points <= 0
      and restoration_points <= 0
      and reversal_of is not null)
  )
);

create unique index reward_ledger_one_reward_per_run
  on private.reward_ledger (source_id)
  where source_type = 'verified_run';
create index reward_ledger_user_created_idx
  on private.reward_ledger (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.my_runners enable row level security;
alter table public.friendships enable row level security;
alter table public.crews enable row level security;
alter table public.crew_memberships enable row level security;
alter table public.world_progress enable row level security;
alter table public.monthly_apex enable row level security;
alter table public.daily_run_contracts enable row level security;

revoke all on schema private, audit from public, anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;
revoke all on all sequences in schema private from public, anon, authenticated;

create view public.my_verified_run_summary
with (security_invoker = true)
as
select
  runner.user_id,
  runner.lifetime_verified_m,
  runner.evolution_form,
  runner.runner_growth_points,
  runner.pacer_bond_points,
  runner.restoration_points,
  runner.updated_at
from public.my_runners as runner;

comment on view public.my_verified_run_summary is
  'RLS가 적용된 내 검증 러닝 성장 요약';

