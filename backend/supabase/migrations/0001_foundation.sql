-- =============================================================================
-- RunningUp 0001 — schema boundary, roles, identity foundation
--
-- Schema boundary (master # 16.2):
--   api                : the only surface a client role may touch, always RLS protected
--   private            : raw route, samples, verification, reward calculation, anti-cheat
--   audit              : append-only admin / reward / config / moderation / security log
--   analytics_private  : privacy-minimised events and aggregates
--
-- The client roles are granted USAGE on `api` only. `private`, `audit` and
-- `analytics_private` are never reachable from a client JWT — 0006_rls.sql asserts this.
-- =============================================================================

create extension if not exists pgcrypto;

create schema if not exists api;
create schema if not exists private;
create schema if not exists audit;
create schema if not exists analytics_private;

-- -----------------------------------------------------------------------------
-- Supabase compatibility shim.
--
-- Hosted Supabase provides `auth.uid()`, `auth.role()` and the anon/authenticated/
-- service_role roles. This block creates them only when absent so that the identical
-- migration runs on a bare Postgres (local CI, pgTAP) and on hosted Supabase, where the
-- real GoTrue-backed definitions already exist and are left untouched.
-- -----------------------------------------------------------------------------
create schema if not exists auth;

do $$
begin
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'auth' and p.proname = 'uid') then
    execute $fn$
      create function auth.uid() returns uuid
      language sql stable
      as $body$
        select nullif(
          coalesce(
            current_setting('request.jwt.claim.sub', true),
            (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
          ), '')::uuid
      $body$;
    $fn$;
  end if;

  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'auth' and p.proname = 'role') then
    execute $fn$
      create function auth.role() returns text
      language sql stable
      as $body$
        select coalesce(
          current_setting('request.jwt.claim.role', true),
          (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
          'anon')
      $body$;
    $fn$;
  end if;

  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'auth' and p.proname = 'is_anonymous') then
    execute $fn$
      create function auth.is_anonymous() returns boolean
      language sql stable
      as $body$
        select coalesce(
          (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'is_anonymous')::boolean,
          false)
      $body$;
    $fn$;
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

-- Client roles see `api` and nothing else.
grant usage on schema api to anon, authenticated;
grant usage on schema private, audit, analytics_private to service_role;
grant usage on schema api to service_role;

-- Deny-by-default: no blanket table grants. Every table grants explicitly in 0006_rls.sql.
alter default privileges in schema api revoke all on tables from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Shared helpers
-- -----------------------------------------------------------------------------
create or replace function private.touch_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

/**
 * The reward day for a server timestamp in a user's IANA timezone.
 * Server time is authoritative: device wall clock is never trusted (master # 6.3).
 */
create or replace function private.reward_day(p_at timestamptz, p_timezone text)
returns date
language sql immutable
set search_path = ''
as $$
  select (p_at at time zone p_timezone)::date
$$;

/** The Monthly Apex partition key, `YYYY-MM`, in the user's reward timezone. */
create or replace function private.month_key(p_at timestamptz, p_timezone text)
returns text
language sql immutable
set search_path = ''
as $$
  select to_char((p_at at time zone p_timezone)::date, 'YYYY-MM')
$$;

-- -----------------------------------------------------------------------------
-- Identity
-- -----------------------------------------------------------------------------
create table api.profiles (
  user_id           uuid primary key,
  display_name      text not null check (length(display_name) between 1 and 32),
  user_code         text not null unique,
  reward_timezone   text not null default 'Asia/Seoul',
  locale            text not null default 'ko' check (locale in ('ko', 'en')),
  is_anonymous      boolean not null default true,
  -- Public visibility is opt-in and coarse: exact age, route and home location are never
  -- exposed on a profile (master # 20.3).
  profile_visibility text not null default 'private'
                     check (profile_visibility in ('private', 'friends', 'public')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger profiles_touch before update on api.profiles
  for each row execute function private.touch_updated_at();

create table api.user_settings (
  user_id                uuid primary key references api.profiles(user_id) on delete cascade,
  graphics_tier          text not null default 'auto'
                         check (graphics_tier in ('auto', 'battery_saver', 'low', 'medium', 'high')),
  reduced_motion         boolean not null default false,
  large_text             boolean not null default false,
  haptics_enabled        boolean not null default true,
  voice_cues_enabled     boolean not null default true,
  audio_cue_frequency    text not null default 'normal'
                         check (audio_cue_frequency in ('off', 'sparse', 'normal', 'frequent')),
  notification_opt_in    boolean not null default false,
  quiet_hours_start      smallint check (quiet_hours_start between 0 and 23),
  quiet_hours_end        smallint check (quiet_hours_end between 0 and 23),
  updated_at             timestamptz not null default now()
);
create trigger user_settings_touch before update on api.user_settings
  for each row execute function private.touch_updated_at();

-- Consent is versioned and timestamped so a policy change re-asks only for what changed.
create table api.consents (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references api.profiles(user_id) on delete cascade,
  consent_kind   text not null check (consent_kind in
                   ('location', 'health_connect', 'notification', 'analytics', 'route_share', 'terms', 'privacy')),
  consent_version text not null,
  granted        boolean not null,
  granted_at     timestamptz not null default now(),
  unique (user_id, consent_kind, consent_version)
);

create table private.devices (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references api.profiles(user_id) on delete cascade,
  install_id     text not null,
  platform       text not null default 'android',
  app_version    text,
  os_version     text,
  first_seen_at  timestamptz not null default now(),
  last_seen_at   timestamptz not null default now(),
  unique (user_id, install_id)
);

-- Account lifecycle jobs (export / delete) are tracked so completion is provable.
create table api.account_jobs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references api.profiles(user_id) on delete cascade,
  job_kind     text not null check (job_kind in ('export', 'delete')),
  status       text not null default 'pending'
               check (status in ('pending', 'running', 'completed', 'failed', 'cancelled')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  -- A deletion has a grace window during which the user can still cancel.
  grace_until  timestamptz,
  failure_reason text
);
create index account_jobs_user_idx on api.account_jobs (user_id, requested_at desc);

-- -----------------------------------------------------------------------------
-- Append-only audit log. No UPDATE or DELETE is ever granted, to anyone.
-- -----------------------------------------------------------------------------
create table audit.admin_audit_log (
  id           bigserial primary key,
  actor        text not null,
  action       text not null,
  subject_kind text,
  subject_id   text,
  reason       text,
  payload      jsonb,
  created_at   timestamptz not null default now()
);

create rule admin_audit_log_no_update as on update to audit.admin_audit_log do instead nothing;
create rule admin_audit_log_no_delete as on delete to audit.admin_audit_log do instead nothing;

create table audit.security_events (
  id          bigserial primary key,
  user_id     uuid,
  event_kind  text not null,
  severity    text not null default 'info' check (severity in ('info', 'warn', 'critical')),
  detail      jsonb,
  created_at  timestamptz not null default now()
);
