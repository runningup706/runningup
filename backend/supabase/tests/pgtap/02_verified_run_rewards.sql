-- V11 검증 러닝의 중복 방지, Daily Contract, 85·10·5 성장, World Crown을 검증한다.
begin;
select plan(20);

insert into auth.users (id, raw_user_meta_data)
values (
  '11111111-1111-4111-8111-111111111111',
  '{"display_name":"테스트 러너"}'::jsonb
);

select is(
  (select count(*)::integer from public.profiles),
  1,
  'account trigger creates profile'
);
select is(
  (select count(*)::integer from public.my_runners),
  1,
  'account trigger creates My Runner'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111111',
  true
);

create temporary table first_result as
select * from public.ingest_verified_run(
  'direct_gps',
  'gps-2026-07-30-a',
  'CONT01-REG01-ROUTE01',
  '2026-07-30 00:00:00+00',
  '2026-07-30 00:30:00+00',
  5000,
  1800,
  repeat('a', 64),
  '{"accuracy_p95_m":8.2,"sample_count":420}'::jsonb
);

select is((select duplicate from first_result), false, 'first run is new');
select is(
  (select daily_contract_completed from first_result),
  true,
  'first run completes the only daily contract'
);
select is(
  (select runner_growth_points from first_result),
  425::bigint,
  '85 percent goes to runner growth'
);
select is(
  (select pacer_bond_points from first_result),
  50::bigint,
  '10 percent goes to pacer bond'
);
select is(
  (select restoration_points from first_result),
  25::bigint,
  '5 percent goes to restoration'
);

create temporary table second_result as
select * from public.ingest_verified_run(
  'gpx',
  'gpx-2026-07-30-b',
  'CONT01-REG01-ROUTE01',
  '2026-07-30 03:00:00+00',
  '2026-07-30 03:12:00+00',
  2000,
  720,
  repeat('b', 64),
  '{"track_points":180}'::jsonb
);

select is(
  (select daily_contract_completed from second_result),
  false,
  'additional run does not create another daily contract'
);
select is(
  (select runner_growth_points from second_result),
  170::bigint,
  'additional run keeps standard reward'
);

create temporary table duplicate_result as
select * from public.ingest_verified_run(
  'direct_gps',
  'gps-2026-07-30-a',
  'CONT01-REG01-ROUTE01',
  '2026-07-30 00:00:00+00',
  '2026-07-30 00:30:00+00',
  5000,
  1800,
  repeat('a', 64),
  '{}'::jsonb
);

select is(
  (select duplicate from duplicate_result),
  true,
  'same fingerprint is idempotent'
);
select is(
  (select lifetime_verified_m from public.my_runners),
  7000::bigint,
  'duplicate does not increase lifetime distance'
);
select is(
  (select verified_m from public.monthly_apex),
  7000::bigint,
  'monthly distance includes two unique runs'
);
select is(
  (select progress_m from public.world_progress),
  7000::bigint,
  'route progress includes two unique runs'
);
select is(
  (select count(*)::integer from public.daily_run_contracts),
  1,
  'exactly one daily contract exists'
);

reset role;
select is(
  (select count(*)::integer from private.canonical_runs),
  2,
  'exactly two canonical runs exist'
);
select is(
  (select count(*)::integer from private.reward_ledger),
  2,
  'exactly two immutable rewards exist'
);
select throws_ok(
  $$update private.reward_ledger set runner_growth_points = 999$$,
  '55000',
  'REWARD_LEDGER_IS_IMMUTABLE',
  'reward ledger cannot be edited'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111111',
  true
);
select throws_ok(
  $$select * from public.ingest_verified_run(
    'direct_gps', 'too-fast', 'CONT01-REG01-ROUTE01',
    '2026-07-30 04:00:00+00', '2026-07-30 04:01:00+00',
    10000, 60, repeat('c', 64), '{}'::jsonb
  )$$,
  '22023',
  'RUN_FAILED_PLAUSIBILITY',
  'implausible run is rejected'
);
select throws_ok(
  $$select * from public.ingest_verified_run(
    'samsung', 'unapproved', 'CONT01-REG01-ROUTE01',
    '2026-07-30 04:00:00+00', '2026-07-30 04:30:00+00',
    5000, 1800, repeat('d', 64), '{}'::jsonb
  )$$,
  '22023',
  'UNSUPPORTED_RUN_SOURCE',
  'unapproved source is rejected'
);

reset role;
select set_config('request.jwt.claim.sub', '', true);
select throws_ok(
  $$select * from public.ingest_verified_run(
    'direct_gps', 'anonymous', 'CONT01-REG01-ROUTE01',
    '2026-07-30 04:00:00+00', '2026-07-30 04:30:00+00',
    5000, 1800, repeat('e', 64), '{}'::jsonb
  )$$,
  '42501',
  'AUTH_REQUIRED',
  'anonymous ingest is rejected'
);

select * from finish();
rollback;

