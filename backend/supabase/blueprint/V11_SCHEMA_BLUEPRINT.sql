
-- RunningUp V11 Supabase blueprint. Production migrations must be split and tested.
create schema if not exists private;
create schema if not exists audit;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  visibility text not null default 'friends' check (visibility in ('private','friends','crew','public')),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create table if not exists public.my_runners (
  user_id uuid primary key references auth.users(id) on delete cascade,
  appearance jsonb not null default '{}'::jsonb,
  evolution_form int not null default 1 check (evolution_form between 1 and 12),
  lifetime_verified_km numeric not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.my_runners enable row level security;

create table if not exists private.canonical_runs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null,
  source_record_id text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  distance_m numeric not null,
  moving_seconds int not null,
  fingerprint text not null,
  verification_status text not null,
  created_at timestamptz not null default now(),
  unique(user_id, fingerprint)
);

create table if not exists private.reward_ledger (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  formula_version text not null,
  reward jsonb not null,
  idempotency_key text not null unique,
  reversal_of uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.world_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  route_id text not null,
  progress numeric not null default 0,
  restoration_phase int not null default 0 check (restoration_phase between 0 and 5),
  mastery_stamps int not null default 0 check (mastery_stamps between 0 and 3),
  primary key (user_id, route_id)
);
alter table public.world_progress enable row level security;

create table if not exists public.monthly_apex (
  user_id uuid not null references auth.users(id) on delete cascade,
  month_start date not null,
  verified_km numeric not null default 0,
  highest_claimed_checkpoint int not null default 0,
  world_crown boolean not null default false,
  primary key(user_id, month_start)
);
alter table public.monthly_apex enable row level security;

create table if not exists public.friendships (
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null check(status in ('pending','accepted','blocked')),
  created_at timestamptz not null default now(),
  primary key(requester_id, addressee_id)
);
alter table public.friendships enable row level security;

-- The production bundle must add policies, indexes, pacer/card/gear/crew tables,
-- server functions and pgTAP tests. Client roles may never insert reward ledger rows.
