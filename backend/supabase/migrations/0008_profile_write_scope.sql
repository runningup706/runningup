-- =============================================================================
-- RunningUp 0008 — narrow the client write scope on api.profiles
--
-- Found by AUDIT_07 (backend security and reward integrity), confirmed by exploit.
--
-- The problem: `grant update on api.profiles to authenticated` in 0006 was table-wide.
-- RLS restricts WHICH ROW a user may update, but it says nothing about WHICH COLUMNS.
-- A user could therefore rewrite `user_code`, `is_anonymous`, `created_at` and — most
-- seriously — `reward_timezone`.
--
-- `reward_timezone` is not a cosmetic preference. `private.reward_day()` and
-- `private.month_key()` derive the Daily Momentum day and the Monthly Apex partition from
-- it. The exploit: a run at 2026-03-31T20:00Z is attributed to 2026-03 under UTC and to
-- 2026-04 under Pacific/Kiritimati (UTC+14). A user sitting near a month boundary could
-- pick whichever month suited them — topping up a nearly-crowned month, or dumping the
-- same distance into a fresh ladder — and could do the same trick nightly against the
-- daily streak.
--
-- The fix has three parts:
--   1. column-level GRANTs, so the client can only touch presentation fields
--   2. a trigger that rejects a change to an identity or attribution column no matter
--      which role attempts it, so a server-side bug cannot do it either
--   3. an audited, rate-limited path for a genuine timezone change
-- =============================================================================

-- 1. Replace the table-wide UPDATE grant with column-level grants.
revoke update on api.profiles from authenticated;
grant update (display_name, locale, profile_visibility) on api.profiles to authenticated;

-- 2. Defence in depth: identity and attribution columns are immutable through the normal
--    UPDATE path for every role, including service_role.
create or replace function private.guard_profile_immutable_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'user_id is immutable' using errcode = 'check_violation';
  end if;
  if new.user_code is distinct from old.user_code then
    raise exception 'user_code is immutable' using errcode = 'check_violation';
  end if;
  if new.created_at is distinct from old.created_at then
    raise exception 'created_at is immutable' using errcode = 'check_violation';
  end if;
  -- The reward timezone may only move through private.apply_timezone_change(), which
  -- sets this flag for the duration of its own statement.
  if new.reward_timezone is distinct from old.reward_timezone
     and coalesce(current_setting('runningup.timezone_change_authorised', true), 'off') <> 'on' then
    raise exception 'reward_timezone may only be changed through private.apply_timezone_change()'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_immutable
  before update on api.profiles
  for each row execute function private.guard_profile_immutable_columns();

-- 3. The audited path for a real timezone change (a user genuinely moves country).
create table audit.timezone_changes (
  id             bigserial primary key,
  user_id        uuid not null references api.profiles(user_id) on delete cascade,
  previous_timezone text not null,
  new_timezone   text not null,
  requested_at   timestamptz not null default now(),
  effective_at   timestamptz not null,
  actor          text not null
);

create rule timezone_changes_no_update as on update to audit.timezone_changes do instead nothing;
create rule timezone_changes_no_delete as on delete to audit.timezone_changes do instead nothing;

-- 0006 enables RLS by looping over the tables that existed at that time, so any table
-- added by a later migration must enable it explicitly. pgTAP 01 asserts this and caught
-- this very table when it was first added.
alter table audit.timezone_changes enable row level security;

/**
 * Change a user's reward timezone.
 *
 * Deliberate properties:
 *   - the change is recorded in an append-only audit table with the previous value
 *   - it takes effect from `now()` forward and NEVER rewrites an already-finalised
 *     reward day or Monthly Apex row; the ledger is immutable, so history is safe by
 *     construction and this function does not attempt any retroactive recalculation
 *   - at most one change per 24 hours, which removes the nightly boundary-shopping
 *     exploit while leaving a genuine relocation perfectly possible
 */
create or replace function private.apply_timezone_change(
  p_user_id      uuid,
  p_new_timezone text,
  p_actor        text default 'user'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous text;
  v_last_change timestamptz;
begin
  -- Reject a timezone Postgres does not recognise, rather than storing a value that
  -- would make every later reward-day computation throw.
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = p_new_timezone) then
    raise exception 'unknown IANA timezone: %', p_new_timezone using errcode = 'invalid_parameter_value';
  end if;

  select reward_timezone into v_previous from api.profiles where user_id = p_user_id for update;
  if not found then
    raise exception 'no such profile: %', p_user_id using errcode = 'no_data_found';
  end if;

  if v_previous = p_new_timezone then
    return jsonb_build_object('status', 'unchanged', 'timezone', v_previous);
  end if;

  select max(requested_at) into v_last_change
  from audit.timezone_changes where user_id = p_user_id;

  if v_last_change is not null and v_last_change > now() - interval '24 hours' then
    raise exception 'reward timezone may be changed at most once per 24 hours'
      using errcode = 'check_violation';
  end if;

  perform set_config('runningup.timezone_change_authorised', 'on', true);
  update api.profiles set reward_timezone = p_new_timezone where user_id = p_user_id;
  perform set_config('runningup.timezone_change_authorised', 'off', true);

  insert into audit.timezone_changes (user_id, previous_timezone, new_timezone, effective_at, actor)
  values (p_user_id, v_previous, p_new_timezone, now(), p_actor);

  return jsonb_build_object(
    'status', 'changed',
    'previous_timezone', v_previous,
    'new_timezone', p_new_timezone,
    -- Explicit: already-finalised days and months keep the attribution they were given.
    'retroactive_recalculation', false
  );
end;
$$;

revoke all on function private.apply_timezone_change(uuid, text, text) from public, anon, authenticated;
grant execute on function private.apply_timezone_change(uuid, text, text) to service_role;
