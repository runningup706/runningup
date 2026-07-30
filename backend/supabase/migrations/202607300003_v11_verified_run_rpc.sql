-- V11 검증 러닝 수집과 85·10·5 영구 성장 배분을 하나의 원자 트랜잭션으로 처리한다.
create or replace function public.ingest_verified_run(
  p_source text,
  p_source_record_id text,
  p_route_id text,
  p_started_at timestamptz,
  p_ended_at timestamptz,
  p_distance_m integer,
  p_moving_seconds integer,
  p_fingerprint text,
  p_evidence jsonb default '{}'::jsonb
)
returns table (
  run_id uuid,
  duplicate boolean,
  daily_contract_completed boolean,
  runner_growth_points bigint,
  pacer_bond_points bigint,
  restoration_points bigint,
  monthly_verified_m bigint,
  world_crown boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_run_id uuid;
  v_existing private.canonical_runs%rowtype;
  v_total_points bigint;
  v_runner_points bigint;
  v_pacer_points bigint;
  v_restoration_points bigint;
  v_month_start date := date_trunc('month', p_started_at at time zone 'UTC')::date;
  v_daily_completed boolean := false;
  v_monthly public.monthly_apex%rowtype;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if p_source not in ('direct_gps', 'health_connect', 'fit', 'gpx', 'tcx') then
    raise exception 'UNSUPPORTED_RUN_SOURCE' using errcode = '22023';
  end if;

  if p_route_id is null or char_length(p_route_id) < 3 then
    raise exception 'ROUTE_REQUIRED' using errcode = '22023';
  end if;

  if p_ended_at <= p_started_at
    or p_distance_m not between 100 and 200000
    or p_moving_seconds not between 30 and 86400
    or p_distance_m::numeric / p_moving_seconds > 9.5
    or p_distance_m::numeric / p_moving_seconds < 0.5
    or char_length(p_fingerprint) < 32
  then
    raise exception 'RUN_FAILED_PLAUSIBILITY' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':' || p_fingerprint, 0));

  select *
  into v_existing
  from private.canonical_runs
  where user_id = v_user_id
    and fingerprint = p_fingerprint;

  if found then
    select ledger.runner_growth_points,
      ledger.pacer_bond_points,
      ledger.restoration_points
    into v_runner_points, v_pacer_points, v_restoration_points
    from private.reward_ledger as ledger
    where ledger.source_type = 'verified_run'
      and ledger.source_id = v_existing.id;

    select *
    into v_monthly
    from public.monthly_apex as apex
    where apex.user_id = v_user_id
      and apex.month_start = v_month_start;

    return query select
      v_existing.id,
      true,
      exists (
        select 1 from public.daily_run_contracts as contract
        where contract.user_id = v_user_id
          and contract.contract_date = (p_started_at at time zone 'UTC')::date
          and contract.completed_run_id = v_existing.id
      ),
      coalesce(v_runner_points, 0),
      coalesce(v_pacer_points, 0),
      coalesce(v_restoration_points, 0),
      coalesce(v_monthly.verified_m, 0),
      coalesce(v_monthly.world_crown, false);
    return;
  end if;

  insert into private.canonical_runs (
    user_id, source, source_record_id, route_id, started_at, ended_at,
    distance_m, moving_seconds, fingerprint, verification_status,
    verification_evidence
  )
  values (
    v_user_id, p_source, p_source_record_id, p_route_id, p_started_at,
    p_ended_at, p_distance_m, p_moving_seconds, p_fingerprint, 'verified',
    coalesce(p_evidence, '{}'::jsonb)
  )
  returning id into v_run_id;

  v_total_points := greatest(1, floor(p_distance_m / 10.0)::bigint);
  v_runner_points := floor(v_total_points * 0.85)::bigint;
  v_pacer_points := floor(v_total_points * 0.10)::bigint;
  v_restoration_points := v_total_points - v_runner_points - v_pacer_points;

  insert into private.reward_ledger (
    user_id, source_type, source_id, formula_version,
    runner_growth_points, pacer_bond_points, restoration_points,
    idempotency_key, reward
  )
  values (
    v_user_id, 'verified_run', v_run_id, 'v11.1-85-10-5',
    v_runner_points, v_pacer_points, v_restoration_points,
    'verified-run:' || v_run_id,
    jsonb_build_object(
      'verified_running_basis_percent', 100,
      'runner_growth_percent', 85,
      'pacer_bond_percent', 10,
      'route_restoration_percent', 5,
      'additional_runs_receive_standard_rewards', true
    )
  );

  insert into public.my_runners (
    user_id, lifetime_verified_m, runner_growth_points,
    pacer_bond_points, restoration_points
  )
  values (
    v_user_id, p_distance_m, v_runner_points,
    v_pacer_points, v_restoration_points
  )
  on conflict (user_id) do update
  set lifetime_verified_m =
      public.my_runners.lifetime_verified_m + excluded.lifetime_verified_m,
    runner_growth_points =
      public.my_runners.runner_growth_points + excluded.runner_growth_points,
    pacer_bond_points =
      public.my_runners.pacer_bond_points + excluded.pacer_bond_points,
    restoration_points =
      public.my_runners.restoration_points + excluded.restoration_points,
    evolution_form = least(
      12,
      1 + floor(
        (public.my_runners.lifetime_verified_m + excluded.lifetime_verified_m)
        / 100000.0
      )::smallint
    ),
    updated_at = now();

  insert into public.world_progress (
    user_id, route_id, progress_m, restoration_phase, mastery_stamps
  )
  values (
    v_user_id, p_route_id, p_distance_m,
    least(5, floor(p_distance_m / 2000.0)::smallint),
    least(3, floor(p_distance_m / 5000.0)::smallint)
  )
  on conflict (user_id, route_id) do update
  set progress_m = public.world_progress.progress_m + excluded.progress_m,
    restoration_phase = least(
      5,
      floor(
        (public.world_progress.progress_m + excluded.progress_m) / 2000.0
      )::smallint
    ),
    mastery_stamps = least(
      3,
      floor(
        (public.world_progress.progress_m + excluded.progress_m) / 5000.0
      )::smallint
    ),
    updated_at = now();

  insert into public.daily_run_contracts (
    user_id, contract_date, completed_run_id, completed_at
  )
  values (
    v_user_id, (p_started_at at time zone 'UTC')::date, v_run_id, now()
  )
  on conflict (user_id, contract_date) do nothing;
  v_daily_completed := found;

  insert into public.monthly_apex (
    user_id, month_start, verified_m, world_crown
  )
  values (
    v_user_id, v_month_start, p_distance_m, p_distance_m >= 1000000
  )
  on conflict (user_id, month_start) do update
  set verified_m = public.monthly_apex.verified_m + excluded.verified_m,
    world_crown =
      public.monthly_apex.world_crown
      or public.monthly_apex.verified_m + excluded.verified_m >= 1000000,
    updated_at = now()
  returning * into v_monthly;

  return query select
    v_run_id,
    false,
    v_daily_completed,
    v_runner_points,
    v_pacer_points,
    v_restoration_points,
    v_monthly.verified_m,
    v_monthly.world_crown;
end;
$$;

revoke all on function public.ingest_verified_run(
  text, text, text, timestamptz, timestamptz, integer, integer, text, jsonb
) from public, anon;
grant execute on function public.ingest_verified_run(
  text, text, text, timestamptz, timestamptz, integer, integer, text, jsonb
) to authenticated;

create or replace function private.reject_reward_ledger_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'REWARD_LEDGER_IS_IMMUTABLE' using errcode = '55000';
end;
$$;

create trigger reward_ledger_immutable
before update or delete on private.reward_ledger
for each row execute function private.reject_reward_ledger_mutation();

