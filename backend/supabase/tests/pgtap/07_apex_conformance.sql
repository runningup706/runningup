-- GENERATED FILE — do not edit by hand.
-- Source: content/conformance/monthly-apex-cases.json
-- Generator: tools/conformance/emit-sql-conformance.mjs
--
-- Replays the cross-implementation conformance fixture against the authoritative SQL
-- transaction. The JS engine produced these expectations and the C# client asserts the
-- same ones, so a disagreement between any two implementations fails a build.
begin;
select plan(992);

-- The seed the fixture was generated against must still be the seed in the database.
select is((select count(*)::int from api.monthly_apex_checkpoints where ladder_version = 'apex.v1.0.0'), 121, 'checkpoint count matches the conformance fixture');
select is((select max(threshold_meters) from api.monthly_apex_checkpoints where ladder_version = 'apex.v1.0.0'), 1000000, 'final checkpoint matches the conformance fixture');

create or replace function pg_temp.conformance_session(
  p_user uuid, p_meters integer, p_started timestamptz
) returns uuid language plpgsql as $fn$
declare v_id uuid;
begin
  insert into api.run_sessions (user_id, activity_type, started_at, ended_at,
                                distance_meters, moving_seconds, elapsed_seconds, server_nonce)
  values (p_user, 'road', p_started, p_started + interval '1 hour',
          p_meters, greatest(p_meters / 3, 1), greatest(p_meters / 3, 1), gen_random_uuid()::text)
  returning id into v_id;
  insert into private.run_verifications (session_id, grade, status) values (v_id, 'A', 'verified');
  return v_id;
end;
$fn$;

-- ------------------------------------------------------------------------
-- case: first_run_5200m
-- ------------------------------------------------------------------------
insert into api.profiles (user_id, display_name, user_code, reward_timezone)
values ('f0000000-0000-4000-8000-000000000001', 'Conf 1', 'CONF0001', 'UTC');

-- step 1: 5200 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000001', 5200, '2026-09-01T09:00:00+00'::timestamptz),
    'conf-0-0')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_01_1km","apex_cp_02_2km","apex_cp_03_3km","apex_cp_04_4km","apex_cp_05_5km"]'::jsonb,
  'first_run_5200m step 1: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'awakening',
  'first_run_5200m step 1: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  5200,
  'first_run_5200m step 1: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'first_run_5200m step 1: over-crown metres match');

select is((select laddered_meters from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000001' and month_key = '2026-09'), 5200, 'first_run_5200m final: laddered metres');
select is((select over_crown_meters from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000001' and month_key = '2026-09'), 0, 'first_run_5200m final: over-crown metres');
select is((select major_rank::text from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000001' and month_key = '2026-09'), 'awakening', 'first_run_5200m final: rank');
select is((select world_crown_awarded from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000001' and month_key = '2026-09'), false, 'first_run_5200m final: World Crown state');
select is((select count(*)::int from api.monthly_apex_checkpoint_claims where user_id = 'f0000000-0000-4000-8000-000000000001' and month_key = '2026-09'), 5, 'first_run_5200m final: total checkpoints claimed');

-- ------------------------------------------------------------------------
-- case: one_metre_short_of_10km
-- ------------------------------------------------------------------------
insert into api.profiles (user_id, display_name, user_code, reward_timezone)
values ('f0000000-0000-4000-8000-000000000002', 'Conf 2', 'CONF0002', 'UTC');

-- step 1: 9999 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000002', 9999, '2026-09-01T09:00:00+00'::timestamptz),
    'conf-1-0')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_01_1km","apex_cp_02_2km","apex_cp_03_3km","apex_cp_04_4km","apex_cp_05_5km","apex_cp_06_6km","apex_cp_07_8km"]'::jsonb,
  'one_metre_short_of_10km step 1: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'awakening',
  'one_metre_short_of_10km step 1: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  9999,
  'one_metre_short_of_10km step 1: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'one_metre_short_of_10km step 1: over-crown metres match');

select is((select laddered_meters from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000002' and month_key = '2026-09'), 9999, 'one_metre_short_of_10km final: laddered metres');
select is((select over_crown_meters from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000002' and month_key = '2026-09'), 0, 'one_metre_short_of_10km final: over-crown metres');
select is((select major_rank::text from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000002' and month_key = '2026-09'), 'awakening', 'one_metre_short_of_10km final: rank');
select is((select world_crown_awarded from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000002' and month_key = '2026-09'), false, 'one_metre_short_of_10km final: World Crown state');
select is((select count(*)::int from api.monthly_apex_checkpoint_claims where user_id = 'f0000000-0000-4000-8000-000000000002' and month_key = '2026-09'), 7, 'one_metre_short_of_10km final: total checkpoints claimed');

-- ------------------------------------------------------------------------
-- case: exactly_10km
-- ------------------------------------------------------------------------
insert into api.profiles (user_id, display_name, user_code, reward_timezone)
values ('f0000000-0000-4000-8000-000000000003', 'Conf 3', 'CONF0003', 'UTC');

-- step 1: 10000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000003', 10000, '2026-09-01T09:00:00+00'::timestamptz),
    'conf-2-0')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_01_1km","apex_cp_02_2km","apex_cp_03_3km","apex_cp_04_4km","apex_cp_05_5km","apex_cp_06_6km","apex_cp_07_8km","apex_cp_08_10km"]'::jsonb,
  'exactly_10km step 1: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'awakening',
  'exactly_10km step 1: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  10000,
  'exactly_10km step 1: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'exactly_10km step 1: over-crown metres match');

select is((select laddered_meters from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000003' and month_key = '2026-09'), 10000, 'exactly_10km final: laddered metres');
select is((select over_crown_meters from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000003' and month_key = '2026-09'), 0, 'exactly_10km final: over-crown metres');
select is((select major_rank::text from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000003' and month_key = '2026-09'), 'awakening', 'exactly_10km final: rank');
select is((select world_crown_awarded from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000003' and month_key = '2026-09'), false, 'exactly_10km final: World Crown state');
select is((select count(*)::int from api.monthly_apex_checkpoint_claims where user_id = 'f0000000-0000-4000-8000-000000000003' and month_key = '2026-09'), 8, 'exactly_10km final: total checkpoints claimed');

-- ------------------------------------------------------------------------
-- case: marathon_symbolic_exact
-- ------------------------------------------------------------------------
insert into api.profiles (user_id, display_name, user_code, reward_timezone)
values ('f0000000-0000-4000-8000-000000000004', 'Conf 4', 'CONF0004', 'UTC');

-- step 1: 42195 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000004', 42195, '2026-09-01T09:00:00+00'::timestamptz),
    'conf-3-0')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_01_1km","apex_cp_02_2km","apex_cp_03_3km","apex_cp_04_4km","apex_cp_05_5km","apex_cp_06_6km","apex_cp_07_8km","apex_cp_08_10km","apex_cp_09_13km","apex_cp_10_15km","apex_cp_11_18km","apex_cp_12_21km","apex_cp_13_24km","apex_cp_14_27km","apex_cp_15_30km","apex_cp_16_34km","apex_cp_17_37km","apex_cp_18_41km","apex_cp_19_42p195km"]'::jsonb,
  'marathon_symbolic_exact step 1: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'awakening',
  'marathon_symbolic_exact step 1: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  42195,
  'marathon_symbolic_exact step 1: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'marathon_symbolic_exact step 1: over-crown metres match');

select is((select laddered_meters from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000004' and month_key = '2026-09'), 42195, 'marathon_symbolic_exact final: laddered metres');
select is((select over_crown_meters from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000004' and month_key = '2026-09'), 0, 'marathon_symbolic_exact final: over-crown metres');
select is((select major_rank::text from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000004' and month_key = '2026-09'), 'awakening', 'marathon_symbolic_exact final: rank');
select is((select world_crown_awarded from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000004' and month_key = '2026-09'), false, 'marathon_symbolic_exact final: World Crown state');
select is((select count(*)::int from api.monthly_apex_checkpoint_claims where user_id = 'f0000000-0000-4000-8000-000000000004' and month_key = '2026-09'), 19, 'marathon_symbolic_exact final: total checkpoints claimed');

-- ------------------------------------------------------------------------
-- case: one_metre_short_of_marathon_checkpoint
-- ------------------------------------------------------------------------
insert into api.profiles (user_id, display_name, user_code, reward_timezone)
values ('f0000000-0000-4000-8000-000000000005', 'Conf 5', 'CONF0005', 'UTC');

-- step 1: 42194 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000005', 42194, '2026-09-01T09:00:00+00'::timestamptz),
    'conf-4-0')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_01_1km","apex_cp_02_2km","apex_cp_03_3km","apex_cp_04_4km","apex_cp_05_5km","apex_cp_06_6km","apex_cp_07_8km","apex_cp_08_10km","apex_cp_09_13km","apex_cp_10_15km","apex_cp_11_18km","apex_cp_12_21km","apex_cp_13_24km","apex_cp_14_27km","apex_cp_15_30km","apex_cp_16_34km","apex_cp_17_37km","apex_cp_18_41km"]'::jsonb,
  'one_metre_short_of_marathon_checkpoint step 1: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'awakening',
  'one_metre_short_of_marathon_checkpoint step 1: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  42194,
  'one_metre_short_of_marathon_checkpoint step 1: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'one_metre_short_of_marathon_checkpoint step 1: over-crown metres match');

select is((select laddered_meters from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000005' and month_key = '2026-09'), 42194, 'one_metre_short_of_marathon_checkpoint final: laddered metres');
select is((select over_crown_meters from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000005' and month_key = '2026-09'), 0, 'one_metre_short_of_marathon_checkpoint final: over-crown metres');
select is((select major_rank::text from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000005' and month_key = '2026-09'), 'awakening', 'one_metre_short_of_marathon_checkpoint final: rank');
select is((select world_crown_awarded from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000005' and month_key = '2026-09'), false, 'one_metre_short_of_marathon_checkpoint final: World Crown state');
select is((select count(*)::int from api.monthly_apex_checkpoint_claims where user_id = 'f0000000-0000-4000-8000-000000000005' and month_key = '2026-09'), 18, 'one_metre_short_of_marathon_checkpoint final: total checkpoints claimed');

-- ------------------------------------------------------------------------
-- case: multi_crossing_100km
-- ------------------------------------------------------------------------
insert into api.profiles (user_id, display_name, user_code, reward_timezone)
values ('f0000000-0000-4000-8000-000000000006', 'Conf 6', 'CONF0006', 'UTC');

-- step 1: 100000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000006', 100000, '2026-09-01T09:00:00+00'::timestamptz),
    'conf-5-0')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_01_1km","apex_cp_02_2km","apex_cp_03_3km","apex_cp_04_4km","apex_cp_05_5km","apex_cp_06_6km","apex_cp_07_8km","apex_cp_08_10km","apex_cp_09_13km","apex_cp_10_15km","apex_cp_11_18km","apex_cp_12_21km","apex_cp_13_24km","apex_cp_14_27km","apex_cp_15_30km","apex_cp_16_34km","apex_cp_17_37km","apex_cp_18_41km","apex_cp_19_42p195km","apex_cp_20_45km","apex_cp_21_49km","apex_cp_22_54km","apex_cp_23_58km","apex_cp_24_63km","apex_cp_25_67km","apex_cp_26_72km","apex_cp_27_77km","apex_cp_28_82km","apex_cp_29_87km","apex_cp_30_93km","apex_cp_31_98km"]'::jsonb,
  'multi_crossing_100km step 1: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'runner',
  'multi_crossing_100km step 1: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  100000,
  'multi_crossing_100km step 1: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'multi_crossing_100km step 1: over-crown metres match');

select is((select laddered_meters from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000006' and month_key = '2026-09'), 100000, 'multi_crossing_100km final: laddered metres');
select is((select over_crown_meters from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000006' and month_key = '2026-09'), 0, 'multi_crossing_100km final: over-crown metres');
select is((select major_rank::text from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000006' and month_key = '2026-09'), 'runner', 'multi_crossing_100km final: rank');
select is((select world_crown_awarded from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000006' and month_key = '2026-09'), false, 'multi_crossing_100km final: World Crown state');
select is((select count(*)::int from api.monthly_apex_checkpoint_claims where user_id = 'f0000000-0000-4000-8000-000000000006' and month_key = '2026-09'), 31, 'multi_crossing_100km final: total checkpoints claimed');

-- ------------------------------------------------------------------------
-- case: incremental_to_100km
-- ------------------------------------------------------------------------
insert into api.profiles (user_id, display_name, user_code, reward_timezone)
values ('f0000000-0000-4000-8000-000000000007', 'Conf 7', 'CONF0007', 'UTC');

-- step 1: 5200 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000007', 5200, '2026-09-01T09:00:00+00'::timestamptz),
    'conf-6-0')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_01_1km","apex_cp_02_2km","apex_cp_03_3km","apex_cp_04_4km","apex_cp_05_5km"]'::jsonb,
  'incremental_to_100km step 1: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'awakening',
  'incremental_to_100km step 1: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  5200,
  'incremental_to_100km step 1: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'incremental_to_100km step 1: over-crown metres match');

-- step 2: 4800 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000007', 4800, '2026-09-02T09:00:00+00'::timestamptz),
    'conf-6-1')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_06_6km","apex_cp_07_8km","apex_cp_08_10km"]'::jsonb,
  'incremental_to_100km step 2: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'awakening',
  'incremental_to_100km step 2: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  10000,
  'incremental_to_100km step 2: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'incremental_to_100km step 2: over-crown metres match');

-- step 3: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000007', 5000, '2026-09-03T09:00:00+00'::timestamptz),
    'conf-6-2')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_09_13km","apex_cp_10_15km"]'::jsonb,
  'incremental_to_100km step 3: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'awakening',
  'incremental_to_100km step 3: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  15000,
  'incremental_to_100km step 3: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'incremental_to_100km step 3: over-crown metres match');

-- step 4: 85000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000007', 85000, '2026-09-04T09:00:00+00'::timestamptz),
    'conf-6-3')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_11_18km","apex_cp_12_21km","apex_cp_13_24km","apex_cp_14_27km","apex_cp_15_30km","apex_cp_16_34km","apex_cp_17_37km","apex_cp_18_41km","apex_cp_19_42p195km","apex_cp_20_45km","apex_cp_21_49km","apex_cp_22_54km","apex_cp_23_58km","apex_cp_24_63km","apex_cp_25_67km","apex_cp_26_72km","apex_cp_27_77km","apex_cp_28_82km","apex_cp_29_87km","apex_cp_30_93km","apex_cp_31_98km"]'::jsonb,
  'incremental_to_100km step 4: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'runner',
  'incremental_to_100km step 4: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  100000,
  'incremental_to_100km step 4: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'incremental_to_100km step 4: over-crown metres match');

select is((select laddered_meters from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000007' and month_key = '2026-09'), 100000, 'incremental_to_100km final: laddered metres');
select is((select over_crown_meters from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000007' and month_key = '2026-09'), 0, 'incremental_to_100km final: over-crown metres');
select is((select major_rank::text from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000007' and month_key = '2026-09'), 'runner', 'incremental_to_100km final: rank');
select is((select world_crown_awarded from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000007' and month_key = '2026-09'), false, 'incremental_to_100km final: World Crown state');
select is((select count(*)::int from api.monthly_apex_checkpoint_claims where user_id = 'f0000000-0000-4000-8000-000000000007' and month_key = '2026-09'), 31, 'incremental_to_100km final: total checkpoints claimed');

-- ------------------------------------------------------------------------
-- case: nine_hundred_ninety_nine_km
-- ------------------------------------------------------------------------
insert into api.profiles (user_id, display_name, user_code, reward_timezone)
values ('f0000000-0000-4000-8000-000000000008', 'Conf 8', 'CONF0008', 'UTC');

-- step 1: 999999 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000008', 999999, '2026-09-01T09:00:00+00'::timestamptz),
    'conf-7-0')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_01_1km","apex_cp_02_2km","apex_cp_03_3km","apex_cp_04_4km","apex_cp_05_5km","apex_cp_06_6km","apex_cp_07_8km","apex_cp_08_10km","apex_cp_09_13km","apex_cp_10_15km","apex_cp_11_18km","apex_cp_12_21km","apex_cp_13_24km","apex_cp_14_27km","apex_cp_15_30km","apex_cp_16_34km","apex_cp_17_37km","apex_cp_18_41km","apex_cp_19_42p195km","apex_cp_20_45km","apex_cp_21_49km","apex_cp_22_54km","apex_cp_23_58km","apex_cp_24_63km","apex_cp_25_67km","apex_cp_26_72km","apex_cp_27_77km","apex_cp_28_82km","apex_cp_29_87km","apex_cp_30_93km","apex_cp_31_98km","apex_cp_32_104km","apex_cp_33_110km","apex_cp_34_115km","apex_cp_35_121km","apex_cp_36_127km","apex_cp_37_134km","apex_cp_38_140km","apex_cp_39_146km","apex_cp_40_153km","apex_cp_41_160km","apex_cp_42_166km","apex_cp_43_173km","apex_cp_44_180km","apex_cp_45_187km","apex_cp_46_194km","apex_cp_47_202km","apex_cp_48_209km","apex_cp_49_217km","apex_cp_50_224km","apex_cp_51_232km","apex_cp_52_240km","apex_cp_53_248km","apex_cp_54_256km","apex_cp_55_264km","apex_cp_56_272km","apex_cp_57_281km","apex_cp_58_289km","apex_cp_59_298km","apex_cp_60_306km","apex_cp_61_315km","apex_cp_62_324km","apex_cp_63_333km","apex_cp_64_342km","apex_cp_65_351km","apex_cp_66_360km","apex_cp_67_369km","apex_cp_68_379km","apex_cp_69_388km","apex_cp_70_398km","apex_cp_71_407km","apex_cp_72_417km","apex_cp_73_427km","apex_cp_74_437km","apex_cp_75_447km","apex_cp_76_457km","apex_cp_77_467km","apex_cp_78_478km","apex_cp_79_488km","apex_cp_80_499km","apex_cp_81_509km","apex_cp_82_520km","apex_cp_83_531km","apex_cp_84_541km","apex_cp_85_552km","apex_cp_86_563km","apex_cp_87_574km","apex_cp_88_586km","apex_cp_89_597km","apex_cp_90_608km","apex_cp_91_620km","apex_cp_92_631km","apex_cp_93_643km","apex_cp_94_654km","apex_cp_95_666km","apex_cp_96_678km","apex_cp_97_690km","apex_cp_98_702km","apex_cp_99_714km","apex_cp_100_726km","apex_cp_101_738km","apex_cp_102_751km","apex_cp_103_763km","apex_cp_104_776km","apex_cp_105_788km","apex_cp_106_801km","apex_cp_107_814km","apex_cp_108_826km","apex_cp_109_839km","apex_cp_110_852km","apex_cp_111_865km","apex_cp_112_878km","apex_cp_113_892km","apex_cp_114_905km","apex_cp_115_918km","apex_cp_116_932km","apex_cp_117_945km","apex_cp_118_959km","apex_cp_119_972km","apex_cp_120_986km"]'::jsonb,
  'nine_hundred_ninety_nine_km step 1: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'apex',
  'nine_hundred_ninety_nine_km step 1: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  999999,
  'nine_hundred_ninety_nine_km step 1: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'nine_hundred_ninety_nine_km step 1: over-crown metres match');

select is((select laddered_meters from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000008' and month_key = '2026-09'), 999999, 'nine_hundred_ninety_nine_km final: laddered metres');
select is((select over_crown_meters from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000008' and month_key = '2026-09'), 0, 'nine_hundred_ninety_nine_km final: over-crown metres');
select is((select major_rank::text from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000008' and month_key = '2026-09'), 'apex', 'nine_hundred_ninety_nine_km final: rank');
select is((select world_crown_awarded from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000008' and month_key = '2026-09'), false, 'nine_hundred_ninety_nine_km final: World Crown state');
select is((select count(*)::int from api.monthly_apex_checkpoint_claims where user_id = 'f0000000-0000-4000-8000-000000000008' and month_key = '2026-09'), 120, 'nine_hundred_ninety_nine_km final: total checkpoints claimed');

-- ------------------------------------------------------------------------
-- case: exactly_1000km_in_two_steps
-- ------------------------------------------------------------------------
insert into api.profiles (user_id, display_name, user_code, reward_timezone)
values ('f0000000-0000-4000-8000-000000000009', 'Conf 9', 'CONF0009', 'UTC');

-- step 1: 999999 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000009', 999999, '2026-09-01T09:00:00+00'::timestamptz),
    'conf-8-0')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_01_1km","apex_cp_02_2km","apex_cp_03_3km","apex_cp_04_4km","apex_cp_05_5km","apex_cp_06_6km","apex_cp_07_8km","apex_cp_08_10km","apex_cp_09_13km","apex_cp_10_15km","apex_cp_11_18km","apex_cp_12_21km","apex_cp_13_24km","apex_cp_14_27km","apex_cp_15_30km","apex_cp_16_34km","apex_cp_17_37km","apex_cp_18_41km","apex_cp_19_42p195km","apex_cp_20_45km","apex_cp_21_49km","apex_cp_22_54km","apex_cp_23_58km","apex_cp_24_63km","apex_cp_25_67km","apex_cp_26_72km","apex_cp_27_77km","apex_cp_28_82km","apex_cp_29_87km","apex_cp_30_93km","apex_cp_31_98km","apex_cp_32_104km","apex_cp_33_110km","apex_cp_34_115km","apex_cp_35_121km","apex_cp_36_127km","apex_cp_37_134km","apex_cp_38_140km","apex_cp_39_146km","apex_cp_40_153km","apex_cp_41_160km","apex_cp_42_166km","apex_cp_43_173km","apex_cp_44_180km","apex_cp_45_187km","apex_cp_46_194km","apex_cp_47_202km","apex_cp_48_209km","apex_cp_49_217km","apex_cp_50_224km","apex_cp_51_232km","apex_cp_52_240km","apex_cp_53_248km","apex_cp_54_256km","apex_cp_55_264km","apex_cp_56_272km","apex_cp_57_281km","apex_cp_58_289km","apex_cp_59_298km","apex_cp_60_306km","apex_cp_61_315km","apex_cp_62_324km","apex_cp_63_333km","apex_cp_64_342km","apex_cp_65_351km","apex_cp_66_360km","apex_cp_67_369km","apex_cp_68_379km","apex_cp_69_388km","apex_cp_70_398km","apex_cp_71_407km","apex_cp_72_417km","apex_cp_73_427km","apex_cp_74_437km","apex_cp_75_447km","apex_cp_76_457km","apex_cp_77_467km","apex_cp_78_478km","apex_cp_79_488km","apex_cp_80_499km","apex_cp_81_509km","apex_cp_82_520km","apex_cp_83_531km","apex_cp_84_541km","apex_cp_85_552km","apex_cp_86_563km","apex_cp_87_574km","apex_cp_88_586km","apex_cp_89_597km","apex_cp_90_608km","apex_cp_91_620km","apex_cp_92_631km","apex_cp_93_643km","apex_cp_94_654km","apex_cp_95_666km","apex_cp_96_678km","apex_cp_97_690km","apex_cp_98_702km","apex_cp_99_714km","apex_cp_100_726km","apex_cp_101_738km","apex_cp_102_751km","apex_cp_103_763km","apex_cp_104_776km","apex_cp_105_788km","apex_cp_106_801km","apex_cp_107_814km","apex_cp_108_826km","apex_cp_109_839km","apex_cp_110_852km","apex_cp_111_865km","apex_cp_112_878km","apex_cp_113_892km","apex_cp_114_905km","apex_cp_115_918km","apex_cp_116_932km","apex_cp_117_945km","apex_cp_118_959km","apex_cp_119_972km","apex_cp_120_986km"]'::jsonb,
  'exactly_1000km_in_two_steps step 1: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'apex',
  'exactly_1000km_in_two_steps step 1: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  999999,
  'exactly_1000km_in_two_steps step 1: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'exactly_1000km_in_two_steps step 1: over-crown metres match');

-- step 2: 1 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000009', 1, '2026-09-02T09:00:00+00'::timestamptz),
    'conf-8-1')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_121_1000km"]'::jsonb,
  'exactly_1000km_in_two_steps step 2: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'world_crown',
  'exactly_1000km_in_two_steps step 2: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  1000000,
  'exactly_1000km_in_two_steps step 2: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'exactly_1000km_in_two_steps step 2: over-crown metres match');

select is((select laddered_meters from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000009' and month_key = '2026-09'), 1000000, 'exactly_1000km_in_two_steps final: laddered metres');
select is((select over_crown_meters from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000009' and month_key = '2026-09'), 0, 'exactly_1000km_in_two_steps final: over-crown metres');
select is((select major_rank::text from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000009' and month_key = '2026-09'), 'world_crown', 'exactly_1000km_in_two_steps final: rank');
select is((select world_crown_awarded from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000009' and month_key = '2026-09'), true, 'exactly_1000km_in_two_steps final: World Crown state');
select is((select count(*)::int from api.monthly_apex_checkpoint_claims where user_id = 'f0000000-0000-4000-8000-000000000009' and month_key = '2026-09'), 121, 'exactly_1000km_in_two_steps final: total checkpoints claimed');

-- ------------------------------------------------------------------------
-- case: exactly_1000km_in_one_step
-- ------------------------------------------------------------------------
insert into api.profiles (user_id, display_name, user_code, reward_timezone)
values ('f0000000-0000-4000-8000-000000000010', 'Conf 10', 'CONF0010', 'UTC');

-- step 1: 1000000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000010', 1000000, '2026-09-01T09:00:00+00'::timestamptz),
    'conf-9-0')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_01_1km","apex_cp_02_2km","apex_cp_03_3km","apex_cp_04_4km","apex_cp_05_5km","apex_cp_06_6km","apex_cp_07_8km","apex_cp_08_10km","apex_cp_09_13km","apex_cp_10_15km","apex_cp_11_18km","apex_cp_12_21km","apex_cp_13_24km","apex_cp_14_27km","apex_cp_15_30km","apex_cp_16_34km","apex_cp_17_37km","apex_cp_18_41km","apex_cp_19_42p195km","apex_cp_20_45km","apex_cp_21_49km","apex_cp_22_54km","apex_cp_23_58km","apex_cp_24_63km","apex_cp_25_67km","apex_cp_26_72km","apex_cp_27_77km","apex_cp_28_82km","apex_cp_29_87km","apex_cp_30_93km","apex_cp_31_98km","apex_cp_32_104km","apex_cp_33_110km","apex_cp_34_115km","apex_cp_35_121km","apex_cp_36_127km","apex_cp_37_134km","apex_cp_38_140km","apex_cp_39_146km","apex_cp_40_153km","apex_cp_41_160km","apex_cp_42_166km","apex_cp_43_173km","apex_cp_44_180km","apex_cp_45_187km","apex_cp_46_194km","apex_cp_47_202km","apex_cp_48_209km","apex_cp_49_217km","apex_cp_50_224km","apex_cp_51_232km","apex_cp_52_240km","apex_cp_53_248km","apex_cp_54_256km","apex_cp_55_264km","apex_cp_56_272km","apex_cp_57_281km","apex_cp_58_289km","apex_cp_59_298km","apex_cp_60_306km","apex_cp_61_315km","apex_cp_62_324km","apex_cp_63_333km","apex_cp_64_342km","apex_cp_65_351km","apex_cp_66_360km","apex_cp_67_369km","apex_cp_68_379km","apex_cp_69_388km","apex_cp_70_398km","apex_cp_71_407km","apex_cp_72_417km","apex_cp_73_427km","apex_cp_74_437km","apex_cp_75_447km","apex_cp_76_457km","apex_cp_77_467km","apex_cp_78_478km","apex_cp_79_488km","apex_cp_80_499km","apex_cp_81_509km","apex_cp_82_520km","apex_cp_83_531km","apex_cp_84_541km","apex_cp_85_552km","apex_cp_86_563km","apex_cp_87_574km","apex_cp_88_586km","apex_cp_89_597km","apex_cp_90_608km","apex_cp_91_620km","apex_cp_92_631km","apex_cp_93_643km","apex_cp_94_654km","apex_cp_95_666km","apex_cp_96_678km","apex_cp_97_690km","apex_cp_98_702km","apex_cp_99_714km","apex_cp_100_726km","apex_cp_101_738km","apex_cp_102_751km","apex_cp_103_763km","apex_cp_104_776km","apex_cp_105_788km","apex_cp_106_801km","apex_cp_107_814km","apex_cp_108_826km","apex_cp_109_839km","apex_cp_110_852km","apex_cp_111_865km","apex_cp_112_878km","apex_cp_113_892km","apex_cp_114_905km","apex_cp_115_918km","apex_cp_116_932km","apex_cp_117_945km","apex_cp_118_959km","apex_cp_119_972km","apex_cp_120_986km","apex_cp_121_1000km"]'::jsonb,
  'exactly_1000km_in_one_step step 1: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'world_crown',
  'exactly_1000km_in_one_step step 1: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  1000000,
  'exactly_1000km_in_one_step step 1: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'exactly_1000km_in_one_step step 1: over-crown metres match');

select is((select laddered_meters from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000010' and month_key = '2026-09'), 1000000, 'exactly_1000km_in_one_step final: laddered metres');
select is((select over_crown_meters from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000010' and month_key = '2026-09'), 0, 'exactly_1000km_in_one_step final: over-crown metres');
select is((select major_rank::text from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000010' and month_key = '2026-09'), 'world_crown', 'exactly_1000km_in_one_step final: rank');
select is((select world_crown_awarded from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000010' and month_key = '2026-09'), true, 'exactly_1000km_in_one_step final: World Crown state');
select is((select count(*)::int from api.monthly_apex_checkpoint_claims where user_id = 'f0000000-0000-4000-8000-000000000010' and month_key = '2026-09'), 121, 'exactly_1000km_in_one_step final: total checkpoints claimed');

-- ------------------------------------------------------------------------
-- case: overshoot_1200km
-- ------------------------------------------------------------------------
insert into api.profiles (user_id, display_name, user_code, reward_timezone)
values ('f0000000-0000-4000-8000-000000000011', 'Conf 11', 'CONF0011', 'UTC');

-- step 1: 1200000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000011', 1200000, '2026-09-01T09:00:00+00'::timestamptz),
    'conf-10-0')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_01_1km","apex_cp_02_2km","apex_cp_03_3km","apex_cp_04_4km","apex_cp_05_5km","apex_cp_06_6km","apex_cp_07_8km","apex_cp_08_10km","apex_cp_09_13km","apex_cp_10_15km","apex_cp_11_18km","apex_cp_12_21km","apex_cp_13_24km","apex_cp_14_27km","apex_cp_15_30km","apex_cp_16_34km","apex_cp_17_37km","apex_cp_18_41km","apex_cp_19_42p195km","apex_cp_20_45km","apex_cp_21_49km","apex_cp_22_54km","apex_cp_23_58km","apex_cp_24_63km","apex_cp_25_67km","apex_cp_26_72km","apex_cp_27_77km","apex_cp_28_82km","apex_cp_29_87km","apex_cp_30_93km","apex_cp_31_98km","apex_cp_32_104km","apex_cp_33_110km","apex_cp_34_115km","apex_cp_35_121km","apex_cp_36_127km","apex_cp_37_134km","apex_cp_38_140km","apex_cp_39_146km","apex_cp_40_153km","apex_cp_41_160km","apex_cp_42_166km","apex_cp_43_173km","apex_cp_44_180km","apex_cp_45_187km","apex_cp_46_194km","apex_cp_47_202km","apex_cp_48_209km","apex_cp_49_217km","apex_cp_50_224km","apex_cp_51_232km","apex_cp_52_240km","apex_cp_53_248km","apex_cp_54_256km","apex_cp_55_264km","apex_cp_56_272km","apex_cp_57_281km","apex_cp_58_289km","apex_cp_59_298km","apex_cp_60_306km","apex_cp_61_315km","apex_cp_62_324km","apex_cp_63_333km","apex_cp_64_342km","apex_cp_65_351km","apex_cp_66_360km","apex_cp_67_369km","apex_cp_68_379km","apex_cp_69_388km","apex_cp_70_398km","apex_cp_71_407km","apex_cp_72_417km","apex_cp_73_427km","apex_cp_74_437km","apex_cp_75_447km","apex_cp_76_457km","apex_cp_77_467km","apex_cp_78_478km","apex_cp_79_488km","apex_cp_80_499km","apex_cp_81_509km","apex_cp_82_520km","apex_cp_83_531km","apex_cp_84_541km","apex_cp_85_552km","apex_cp_86_563km","apex_cp_87_574km","apex_cp_88_586km","apex_cp_89_597km","apex_cp_90_608km","apex_cp_91_620km","apex_cp_92_631km","apex_cp_93_643km","apex_cp_94_654km","apex_cp_95_666km","apex_cp_96_678km","apex_cp_97_690km","apex_cp_98_702km","apex_cp_99_714km","apex_cp_100_726km","apex_cp_101_738km","apex_cp_102_751km","apex_cp_103_763km","apex_cp_104_776km","apex_cp_105_788km","apex_cp_106_801km","apex_cp_107_814km","apex_cp_108_826km","apex_cp_109_839km","apex_cp_110_852km","apex_cp_111_865km","apex_cp_112_878km","apex_cp_113_892km","apex_cp_114_905km","apex_cp_115_918km","apex_cp_116_932km","apex_cp_117_945km","apex_cp_118_959km","apex_cp_119_972km","apex_cp_120_986km","apex_cp_121_1000km"]'::jsonb,
  'overshoot_1200km step 1: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'world_crown',
  'overshoot_1200km step 1: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  1000000,
  'overshoot_1200km step 1: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  200000,
  'overshoot_1200km step 1: over-crown metres match');

select is((select laddered_meters from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000011' and month_key = '2026-09'), 1000000, 'overshoot_1200km final: laddered metres');
select is((select over_crown_meters from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000011' and month_key = '2026-09'), 200000, 'overshoot_1200km final: over-crown metres');
select is((select major_rank::text from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000011' and month_key = '2026-09'), 'world_crown', 'overshoot_1200km final: rank');
select is((select world_crown_awarded from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000011' and month_key = '2026-09'), true, 'overshoot_1200km final: World Crown state');
select is((select count(*)::int from api.monthly_apex_checkpoint_claims where user_id = 'f0000000-0000-4000-8000-000000000011' and month_key = '2026-09'), 121, 'overshoot_1200km final: total checkpoints claimed');

-- ------------------------------------------------------------------------
-- case: crowned_then_further_25km
-- ------------------------------------------------------------------------
insert into api.profiles (user_id, display_name, user_code, reward_timezone)
values ('f0000000-0000-4000-8000-000000000012', 'Conf 12', 'CONF0012', 'UTC');

-- step 1: 1000000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000012', 1000000, '2026-09-01T09:00:00+00'::timestamptz),
    'conf-11-0')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_01_1km","apex_cp_02_2km","apex_cp_03_3km","apex_cp_04_4km","apex_cp_05_5km","apex_cp_06_6km","apex_cp_07_8km","apex_cp_08_10km","apex_cp_09_13km","apex_cp_10_15km","apex_cp_11_18km","apex_cp_12_21km","apex_cp_13_24km","apex_cp_14_27km","apex_cp_15_30km","apex_cp_16_34km","apex_cp_17_37km","apex_cp_18_41km","apex_cp_19_42p195km","apex_cp_20_45km","apex_cp_21_49km","apex_cp_22_54km","apex_cp_23_58km","apex_cp_24_63km","apex_cp_25_67km","apex_cp_26_72km","apex_cp_27_77km","apex_cp_28_82km","apex_cp_29_87km","apex_cp_30_93km","apex_cp_31_98km","apex_cp_32_104km","apex_cp_33_110km","apex_cp_34_115km","apex_cp_35_121km","apex_cp_36_127km","apex_cp_37_134km","apex_cp_38_140km","apex_cp_39_146km","apex_cp_40_153km","apex_cp_41_160km","apex_cp_42_166km","apex_cp_43_173km","apex_cp_44_180km","apex_cp_45_187km","apex_cp_46_194km","apex_cp_47_202km","apex_cp_48_209km","apex_cp_49_217km","apex_cp_50_224km","apex_cp_51_232km","apex_cp_52_240km","apex_cp_53_248km","apex_cp_54_256km","apex_cp_55_264km","apex_cp_56_272km","apex_cp_57_281km","apex_cp_58_289km","apex_cp_59_298km","apex_cp_60_306km","apex_cp_61_315km","apex_cp_62_324km","apex_cp_63_333km","apex_cp_64_342km","apex_cp_65_351km","apex_cp_66_360km","apex_cp_67_369km","apex_cp_68_379km","apex_cp_69_388km","apex_cp_70_398km","apex_cp_71_407km","apex_cp_72_417km","apex_cp_73_427km","apex_cp_74_437km","apex_cp_75_447km","apex_cp_76_457km","apex_cp_77_467km","apex_cp_78_478km","apex_cp_79_488km","apex_cp_80_499km","apex_cp_81_509km","apex_cp_82_520km","apex_cp_83_531km","apex_cp_84_541km","apex_cp_85_552km","apex_cp_86_563km","apex_cp_87_574km","apex_cp_88_586km","apex_cp_89_597km","apex_cp_90_608km","apex_cp_91_620km","apex_cp_92_631km","apex_cp_93_643km","apex_cp_94_654km","apex_cp_95_666km","apex_cp_96_678km","apex_cp_97_690km","apex_cp_98_702km","apex_cp_99_714km","apex_cp_100_726km","apex_cp_101_738km","apex_cp_102_751km","apex_cp_103_763km","apex_cp_104_776km","apex_cp_105_788km","apex_cp_106_801km","apex_cp_107_814km","apex_cp_108_826km","apex_cp_109_839km","apex_cp_110_852km","apex_cp_111_865km","apex_cp_112_878km","apex_cp_113_892km","apex_cp_114_905km","apex_cp_115_918km","apex_cp_116_932km","apex_cp_117_945km","apex_cp_118_959km","apex_cp_119_972km","apex_cp_120_986km","apex_cp_121_1000km"]'::jsonb,
  'crowned_then_further_25km step 1: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'world_crown',
  'crowned_then_further_25km step 1: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  1000000,
  'crowned_then_further_25km step 1: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'crowned_then_further_25km step 1: over-crown metres match');

-- step 2: 25000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000012', 25000, '2026-09-02T09:00:00+00'::timestamptz),
    'conf-11-1')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'crowned_then_further_25km step 2: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'world_crown',
  'crowned_then_further_25km step 2: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  1000000,
  'crowned_then_further_25km step 2: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  25000,
  'crowned_then_further_25km step 2: over-crown metres match');

select is((select laddered_meters from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000012' and month_key = '2026-09'), 1000000, 'crowned_then_further_25km final: laddered metres');
select is((select over_crown_meters from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000012' and month_key = '2026-09'), 25000, 'crowned_then_further_25km final: over-crown metres');
select is((select major_rank::text from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000012' and month_key = '2026-09'), 'world_crown', 'crowned_then_further_25km final: rank');
select is((select world_crown_awarded from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000012' and month_key = '2026-09'), true, 'crowned_then_further_25km final: World Crown state');
select is((select count(*)::int from api.monthly_apex_checkpoint_claims where user_id = 'f0000000-0000-4000-8000-000000000012' and month_key = '2026-09'), 121, 'crowned_then_further_25km final: total checkpoints claimed');

-- ------------------------------------------------------------------------
-- case: crowned_then_further_twice
-- ------------------------------------------------------------------------
insert into api.profiles (user_id, display_name, user_code, reward_timezone)
values ('f0000000-0000-4000-8000-000000000013', 'Conf 13', 'CONF0013', 'UTC');

-- step 1: 1000000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000013', 1000000, '2026-09-01T09:00:00+00'::timestamptz),
    'conf-12-0')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_01_1km","apex_cp_02_2km","apex_cp_03_3km","apex_cp_04_4km","apex_cp_05_5km","apex_cp_06_6km","apex_cp_07_8km","apex_cp_08_10km","apex_cp_09_13km","apex_cp_10_15km","apex_cp_11_18km","apex_cp_12_21km","apex_cp_13_24km","apex_cp_14_27km","apex_cp_15_30km","apex_cp_16_34km","apex_cp_17_37km","apex_cp_18_41km","apex_cp_19_42p195km","apex_cp_20_45km","apex_cp_21_49km","apex_cp_22_54km","apex_cp_23_58km","apex_cp_24_63km","apex_cp_25_67km","apex_cp_26_72km","apex_cp_27_77km","apex_cp_28_82km","apex_cp_29_87km","apex_cp_30_93km","apex_cp_31_98km","apex_cp_32_104km","apex_cp_33_110km","apex_cp_34_115km","apex_cp_35_121km","apex_cp_36_127km","apex_cp_37_134km","apex_cp_38_140km","apex_cp_39_146km","apex_cp_40_153km","apex_cp_41_160km","apex_cp_42_166km","apex_cp_43_173km","apex_cp_44_180km","apex_cp_45_187km","apex_cp_46_194km","apex_cp_47_202km","apex_cp_48_209km","apex_cp_49_217km","apex_cp_50_224km","apex_cp_51_232km","apex_cp_52_240km","apex_cp_53_248km","apex_cp_54_256km","apex_cp_55_264km","apex_cp_56_272km","apex_cp_57_281km","apex_cp_58_289km","apex_cp_59_298km","apex_cp_60_306km","apex_cp_61_315km","apex_cp_62_324km","apex_cp_63_333km","apex_cp_64_342km","apex_cp_65_351km","apex_cp_66_360km","apex_cp_67_369km","apex_cp_68_379km","apex_cp_69_388km","apex_cp_70_398km","apex_cp_71_407km","apex_cp_72_417km","apex_cp_73_427km","apex_cp_74_437km","apex_cp_75_447km","apex_cp_76_457km","apex_cp_77_467km","apex_cp_78_478km","apex_cp_79_488km","apex_cp_80_499km","apex_cp_81_509km","apex_cp_82_520km","apex_cp_83_531km","apex_cp_84_541km","apex_cp_85_552km","apex_cp_86_563km","apex_cp_87_574km","apex_cp_88_586km","apex_cp_89_597km","apex_cp_90_608km","apex_cp_91_620km","apex_cp_92_631km","apex_cp_93_643km","apex_cp_94_654km","apex_cp_95_666km","apex_cp_96_678km","apex_cp_97_690km","apex_cp_98_702km","apex_cp_99_714km","apex_cp_100_726km","apex_cp_101_738km","apex_cp_102_751km","apex_cp_103_763km","apex_cp_104_776km","apex_cp_105_788km","apex_cp_106_801km","apex_cp_107_814km","apex_cp_108_826km","apex_cp_109_839km","apex_cp_110_852km","apex_cp_111_865km","apex_cp_112_878km","apex_cp_113_892km","apex_cp_114_905km","apex_cp_115_918km","apex_cp_116_932km","apex_cp_117_945km","apex_cp_118_959km","apex_cp_119_972km","apex_cp_120_986km","apex_cp_121_1000km"]'::jsonb,
  'crowned_then_further_twice step 1: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'world_crown',
  'crowned_then_further_twice step 1: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  1000000,
  'crowned_then_further_twice step 1: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'crowned_then_further_twice step 1: over-crown metres match');

-- step 2: 25000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000013', 25000, '2026-09-02T09:00:00+00'::timestamptz),
    'conf-12-1')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'crowned_then_further_twice step 2: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'world_crown',
  'crowned_then_further_twice step 2: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  1000000,
  'crowned_then_further_twice step 2: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  25000,
  'crowned_then_further_twice step 2: over-crown metres match');

-- step 3: 30000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000013', 30000, '2026-09-03T09:00:00+00'::timestamptz),
    'conf-12-2')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'crowned_then_further_twice step 3: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'world_crown',
  'crowned_then_further_twice step 3: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  1000000,
  'crowned_then_further_twice step 3: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  55000,
  'crowned_then_further_twice step 3: over-crown metres match');

select is((select laddered_meters from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000013' and month_key = '2026-09'), 1000000, 'crowned_then_further_twice final: laddered metres');
select is((select over_crown_meters from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000013' and month_key = '2026-09'), 55000, 'crowned_then_further_twice final: over-crown metres');
select is((select major_rank::text from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000013' and month_key = '2026-09'), 'world_crown', 'crowned_then_further_twice final: rank');
select is((select world_crown_awarded from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000013' and month_key = '2026-09'), true, 'crowned_then_further_twice final: World Crown state');
select is((select count(*)::int from api.monthly_apex_checkpoint_claims where user_id = 'f0000000-0000-4000-8000-000000000013' and month_key = '2026-09'), 121, 'crowned_then_further_twice final: total checkpoints claimed');

-- ------------------------------------------------------------------------
-- case: zero_distance_session
-- ------------------------------------------------------------------------
insert into api.profiles (user_id, display_name, user_code, reward_timezone)
values ('f0000000-0000-4000-8000-000000000014', 'Conf 14', 'CONF0014', 'UTC');

-- step 1: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000014', 5000, '2026-09-01T09:00:00+00'::timestamptz),
    'conf-13-0')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_01_1km","apex_cp_02_2km","apex_cp_03_3km","apex_cp_04_4km","apex_cp_05_5km"]'::jsonb,
  'zero_distance_session step 1: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'awakening',
  'zero_distance_session step 1: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  5000,
  'zero_distance_session step 1: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'zero_distance_session step 1: over-crown metres match');

-- step 2: 0 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000014', 0, '2026-09-02T09:00:00+00'::timestamptz),
    'conf-13-1')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'zero_distance_session step 2: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'awakening',
  'zero_distance_session step 2: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  5000,
  'zero_distance_session step 2: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'zero_distance_session step 2: over-crown metres match');

select is((select laddered_meters from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000014' and month_key = '2026-09'), 5000, 'zero_distance_session final: laddered metres');
select is((select over_crown_meters from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000014' and month_key = '2026-09'), 0, 'zero_distance_session final: over-crown metres');
select is((select major_rank::text from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000014' and month_key = '2026-09'), 'awakening', 'zero_distance_session final: rank');
select is((select world_crown_awarded from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000014' and month_key = '2026-09'), false, 'zero_distance_session final: World Crown state');
select is((select count(*)::int from api.monthly_apex_checkpoint_claims where user_id = 'f0000000-0000-4000-8000-000000000014' and month_key = '2026-09'), 5, 'zero_distance_session final: total checkpoints claimed');

-- ------------------------------------------------------------------------
-- case: two_hundred_five_km_sessions
-- ------------------------------------------------------------------------
insert into api.profiles (user_id, display_name, user_code, reward_timezone)
values ('f0000000-0000-4000-8000-000000000015', 'Conf 15', 'CONF0015', 'UTC');

-- step 1: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-01T09:00:00+00'::timestamptz),
    'conf-14-0')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_01_1km","apex_cp_02_2km","apex_cp_03_3km","apex_cp_04_4km","apex_cp_05_5km"]'::jsonb,
  'two_hundred_five_km_sessions step 1: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'awakening',
  'two_hundred_five_km_sessions step 1: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  5000,
  'two_hundred_five_km_sessions step 1: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 1: over-crown metres match');

-- step 2: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-02T09:00:00+00'::timestamptz),
    'conf-14-1')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_06_6km","apex_cp_07_8km","apex_cp_08_10km"]'::jsonb,
  'two_hundred_five_km_sessions step 2: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'awakening',
  'two_hundred_five_km_sessions step 2: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  10000,
  'two_hundred_five_km_sessions step 2: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 2: over-crown metres match');

-- step 3: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-03T09:00:00+00'::timestamptz),
    'conf-14-2')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_09_13km","apex_cp_10_15km"]'::jsonb,
  'two_hundred_five_km_sessions step 3: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'awakening',
  'two_hundred_five_km_sessions step 3: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  15000,
  'two_hundred_five_km_sessions step 3: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 3: over-crown metres match');

-- step 4: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-04T09:00:00+00'::timestamptz),
    'conf-14-3')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_11_18km"]'::jsonb,
  'two_hundred_five_km_sessions step 4: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'awakening',
  'two_hundred_five_km_sessions step 4: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  20000,
  'two_hundred_five_km_sessions step 4: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 4: over-crown metres match');

-- step 5: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-05T09:00:00+00'::timestamptz),
    'conf-14-4')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_12_21km","apex_cp_13_24km"]'::jsonb,
  'two_hundred_five_km_sessions step 5: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'awakening',
  'two_hundred_five_km_sessions step 5: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  25000,
  'two_hundred_five_km_sessions step 5: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 5: over-crown metres match');

-- step 6: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-06T09:00:00+00'::timestamptz),
    'conf-14-5')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_14_27km","apex_cp_15_30km"]'::jsonb,
  'two_hundred_five_km_sessions step 6: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'awakening',
  'two_hundred_five_km_sessions step 6: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  30000,
  'two_hundred_five_km_sessions step 6: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 6: over-crown metres match');

-- step 7: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-07T09:00:00+00'::timestamptz),
    'conf-14-6')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_16_34km"]'::jsonb,
  'two_hundred_five_km_sessions step 7: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'awakening',
  'two_hundred_five_km_sessions step 7: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  35000,
  'two_hundred_five_km_sessions step 7: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 7: over-crown metres match');

-- step 8: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-08T09:00:00+00'::timestamptz),
    'conf-14-7')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_17_37km"]'::jsonb,
  'two_hundred_five_km_sessions step 8: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'awakening',
  'two_hundred_five_km_sessions step 8: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  40000,
  'two_hundred_five_km_sessions step 8: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 8: over-crown metres match');

-- step 9: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-09T09:00:00+00'::timestamptz),
    'conf-14-8')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_18_41km","apex_cp_19_42p195km","apex_cp_20_45km"]'::jsonb,
  'two_hundred_five_km_sessions step 9: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'awakening',
  'two_hundred_five_km_sessions step 9: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  45000,
  'two_hundred_five_km_sessions step 9: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 9: over-crown metres match');

-- step 10: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-10T09:00:00+00'::timestamptz),
    'conf-14-9')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_21_49km"]'::jsonb,
  'two_hundred_five_km_sessions step 10: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'strider',
  'two_hundred_five_km_sessions step 10: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  50000,
  'two_hundred_five_km_sessions step 10: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 10: over-crown metres match');

-- step 11: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-11T09:00:00+00'::timestamptz),
    'conf-14-10')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_22_54km"]'::jsonb,
  'two_hundred_five_km_sessions step 11: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'strider',
  'two_hundred_five_km_sessions step 11: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  55000,
  'two_hundred_five_km_sessions step 11: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 11: over-crown metres match');

-- step 12: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-12T09:00:00+00'::timestamptz),
    'conf-14-11')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_23_58km"]'::jsonb,
  'two_hundred_five_km_sessions step 12: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'strider',
  'two_hundred_five_km_sessions step 12: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  60000,
  'two_hundred_five_km_sessions step 12: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 12: over-crown metres match');

-- step 13: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-13T09:00:00+00'::timestamptz),
    'conf-14-12')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_24_63km"]'::jsonb,
  'two_hundred_five_km_sessions step 13: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'strider',
  'two_hundred_five_km_sessions step 13: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  65000,
  'two_hundred_five_km_sessions step 13: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 13: over-crown metres match');

-- step 14: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-14T09:00:00+00'::timestamptz),
    'conf-14-13')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_25_67km"]'::jsonb,
  'two_hundred_five_km_sessions step 14: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'strider',
  'two_hundred_five_km_sessions step 14: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  70000,
  'two_hundred_five_km_sessions step 14: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 14: over-crown metres match');

-- step 15: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-15T09:00:00+00'::timestamptz),
    'conf-14-14')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_26_72km"]'::jsonb,
  'two_hundred_five_km_sessions step 15: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'strider',
  'two_hundred_five_km_sessions step 15: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  75000,
  'two_hundred_five_km_sessions step 15: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 15: over-crown metres match');

-- step 16: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-16T09:00:00+00'::timestamptz),
    'conf-14-15')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_27_77km"]'::jsonb,
  'two_hundred_five_km_sessions step 16: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'strider',
  'two_hundred_five_km_sessions step 16: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  80000,
  'two_hundred_five_km_sessions step 16: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 16: over-crown metres match');

-- step 17: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-17T09:00:00+00'::timestamptz),
    'conf-14-16')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_28_82km"]'::jsonb,
  'two_hundred_five_km_sessions step 17: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'strider',
  'two_hundred_five_km_sessions step 17: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  85000,
  'two_hundred_five_km_sessions step 17: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 17: over-crown metres match');

-- step 18: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-18T09:00:00+00'::timestamptz),
    'conf-14-17')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_29_87km"]'::jsonb,
  'two_hundred_five_km_sessions step 18: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'strider',
  'two_hundred_five_km_sessions step 18: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  90000,
  'two_hundred_five_km_sessions step 18: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 18: over-crown metres match');

-- step 19: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-19T09:00:00+00'::timestamptz),
    'conf-14-18')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_30_93km"]'::jsonb,
  'two_hundred_five_km_sessions step 19: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'strider',
  'two_hundred_five_km_sessions step 19: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  95000,
  'two_hundred_five_km_sessions step 19: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 19: over-crown metres match');

-- step 20: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-20T09:00:00+00'::timestamptz),
    'conf-14-19')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_31_98km"]'::jsonb,
  'two_hundred_five_km_sessions step 20: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'runner',
  'two_hundred_five_km_sessions step 20: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  100000,
  'two_hundred_five_km_sessions step 20: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 20: over-crown metres match');

-- step 21: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-21T09:00:00+00'::timestamptz),
    'conf-14-20')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_32_104km"]'::jsonb,
  'two_hundred_five_km_sessions step 21: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'runner',
  'two_hundred_five_km_sessions step 21: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  105000,
  'two_hundred_five_km_sessions step 21: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 21: over-crown metres match');

-- step 22: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-22T09:00:00+00'::timestamptz),
    'conf-14-21')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_33_110km"]'::jsonb,
  'two_hundred_five_km_sessions step 22: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'runner',
  'two_hundred_five_km_sessions step 22: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  110000,
  'two_hundred_five_km_sessions step 22: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 22: over-crown metres match');

-- step 23: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-23T09:00:00+00'::timestamptz),
    'conf-14-22')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_34_115km"]'::jsonb,
  'two_hundred_five_km_sessions step 23: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'runner',
  'two_hundred_five_km_sessions step 23: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  115000,
  'two_hundred_five_km_sessions step 23: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 23: over-crown metres match');

-- step 24: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-24T09:00:00+00'::timestamptz),
    'conf-14-23')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 24: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'runner',
  'two_hundred_five_km_sessions step 24: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  120000,
  'two_hundred_five_km_sessions step 24: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 24: over-crown metres match');

-- step 25: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-25T09:00:00+00'::timestamptz),
    'conf-14-24')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_35_121km"]'::jsonb,
  'two_hundred_five_km_sessions step 25: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'runner',
  'two_hundred_five_km_sessions step 25: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  125000,
  'two_hundred_five_km_sessions step 25: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 25: over-crown metres match');

-- step 26: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-26T09:00:00+00'::timestamptz),
    'conf-14-25')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_36_127km"]'::jsonb,
  'two_hundred_five_km_sessions step 26: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'runner',
  'two_hundred_five_km_sessions step 26: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  130000,
  'two_hundred_five_km_sessions step 26: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 26: over-crown metres match');

-- step 27: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-27T09:00:00+00'::timestamptz),
    'conf-14-26')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_37_134km"]'::jsonb,
  'two_hundred_five_km_sessions step 27: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'runner',
  'two_hundred_five_km_sessions step 27: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  135000,
  'two_hundred_five_km_sessions step 27: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 27: over-crown metres match');

-- step 28: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-01T09:00:00+00'::timestamptz),
    'conf-14-27')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_38_140km"]'::jsonb,
  'two_hundred_five_km_sessions step 28: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'runner',
  'two_hundred_five_km_sessions step 28: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  140000,
  'two_hundred_five_km_sessions step 28: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 28: over-crown metres match');

-- step 29: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-02T09:00:00+00'::timestamptz),
    'conf-14-28')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 29: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'runner',
  'two_hundred_five_km_sessions step 29: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  145000,
  'two_hundred_five_km_sessions step 29: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 29: over-crown metres match');

-- step 30: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-03T09:00:00+00'::timestamptz),
    'conf-14-29')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_39_146km"]'::jsonb,
  'two_hundred_five_km_sessions step 30: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'runner',
  'two_hundred_five_km_sessions step 30: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  150000,
  'two_hundred_five_km_sessions step 30: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 30: over-crown metres match');

-- step 31: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-04T09:00:00+00'::timestamptz),
    'conf-14-30')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_40_153km"]'::jsonb,
  'two_hundred_five_km_sessions step 31: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'runner',
  'two_hundred_five_km_sessions step 31: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  155000,
  'two_hundred_five_km_sessions step 31: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 31: over-crown metres match');

-- step 32: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-05T09:00:00+00'::timestamptz),
    'conf-14-31')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_41_160km"]'::jsonb,
  'two_hundred_five_km_sessions step 32: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'runner',
  'two_hundred_five_km_sessions step 32: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  160000,
  'two_hundred_five_km_sessions step 32: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 32: over-crown metres match');

-- step 33: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-06T09:00:00+00'::timestamptz),
    'conf-14-32')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 33: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'runner',
  'two_hundred_five_km_sessions step 33: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  165000,
  'two_hundred_five_km_sessions step 33: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 33: over-crown metres match');

-- step 34: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-07T09:00:00+00'::timestamptz),
    'conf-14-33')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_42_166km"]'::jsonb,
  'two_hundred_five_km_sessions step 34: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'runner',
  'two_hundred_five_km_sessions step 34: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  170000,
  'two_hundred_five_km_sessions step 34: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 34: over-crown metres match');

-- step 35: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-08T09:00:00+00'::timestamptz),
    'conf-14-34')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_43_173km"]'::jsonb,
  'two_hundred_five_km_sessions step 35: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'runner',
  'two_hundred_five_km_sessions step 35: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  175000,
  'two_hundred_five_km_sessions step 35: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 35: over-crown metres match');

-- step 36: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-09T09:00:00+00'::timestamptz),
    'conf-14-35')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_44_180km"]'::jsonb,
  'two_hundred_five_km_sessions step 36: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'runner',
  'two_hundred_five_km_sessions step 36: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  180000,
  'two_hundred_five_km_sessions step 36: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 36: over-crown metres match');

-- step 37: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-10T09:00:00+00'::timestamptz),
    'conf-14-36')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 37: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'runner',
  'two_hundred_five_km_sessions step 37: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  185000,
  'two_hundred_five_km_sessions step 37: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 37: over-crown metres match');

-- step 38: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-11T09:00:00+00'::timestamptz),
    'conf-14-37')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_45_187km"]'::jsonb,
  'two_hundred_five_km_sessions step 38: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'runner',
  'two_hundred_five_km_sessions step 38: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  190000,
  'two_hundred_five_km_sessions step 38: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 38: over-crown metres match');

-- step 39: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-12T09:00:00+00'::timestamptz),
    'conf-14-38')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_46_194km"]'::jsonb,
  'two_hundred_five_km_sessions step 39: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'runner',
  'two_hundred_five_km_sessions step 39: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  195000,
  'two_hundred_five_km_sessions step 39: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 39: over-crown metres match');

-- step 40: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-13T09:00:00+00'::timestamptz),
    'conf-14-39')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 40: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'challenger',
  'two_hundred_five_km_sessions step 40: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  200000,
  'two_hundred_five_km_sessions step 40: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 40: over-crown metres match');

-- step 41: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-14T09:00:00+00'::timestamptz),
    'conf-14-40')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_47_202km"]'::jsonb,
  'two_hundred_five_km_sessions step 41: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'challenger',
  'two_hundred_five_km_sessions step 41: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  205000,
  'two_hundred_five_km_sessions step 41: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 41: over-crown metres match');

-- step 42: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-15T09:00:00+00'::timestamptz),
    'conf-14-41')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_48_209km"]'::jsonb,
  'two_hundred_five_km_sessions step 42: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'challenger',
  'two_hundred_five_km_sessions step 42: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  210000,
  'two_hundred_five_km_sessions step 42: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 42: over-crown metres match');

-- step 43: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-16T09:00:00+00'::timestamptz),
    'conf-14-42')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 43: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'challenger',
  'two_hundred_five_km_sessions step 43: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  215000,
  'two_hundred_five_km_sessions step 43: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 43: over-crown metres match');

-- step 44: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-17T09:00:00+00'::timestamptz),
    'conf-14-43')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_49_217km"]'::jsonb,
  'two_hundred_five_km_sessions step 44: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'challenger',
  'two_hundred_five_km_sessions step 44: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  220000,
  'two_hundred_five_km_sessions step 44: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 44: over-crown metres match');

-- step 45: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-18T09:00:00+00'::timestamptz),
    'conf-14-44')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_50_224km"]'::jsonb,
  'two_hundred_five_km_sessions step 45: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'challenger',
  'two_hundred_five_km_sessions step 45: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  225000,
  'two_hundred_five_km_sessions step 45: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 45: over-crown metres match');

-- step 46: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-19T09:00:00+00'::timestamptz),
    'conf-14-45')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 46: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'challenger',
  'two_hundred_five_km_sessions step 46: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  230000,
  'two_hundred_five_km_sessions step 46: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 46: over-crown metres match');

-- step 47: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-20T09:00:00+00'::timestamptz),
    'conf-14-46')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_51_232km"]'::jsonb,
  'two_hundred_five_km_sessions step 47: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'challenger',
  'two_hundred_five_km_sessions step 47: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  235000,
  'two_hundred_five_km_sessions step 47: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 47: over-crown metres match');

-- step 48: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-21T09:00:00+00'::timestamptz),
    'conf-14-47')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_52_240km"]'::jsonb,
  'two_hundred_five_km_sessions step 48: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'challenger',
  'two_hundred_five_km_sessions step 48: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  240000,
  'two_hundred_five_km_sessions step 48: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 48: over-crown metres match');

-- step 49: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-22T09:00:00+00'::timestamptz),
    'conf-14-48')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 49: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'challenger',
  'two_hundred_five_km_sessions step 49: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  245000,
  'two_hundred_five_km_sessions step 49: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 49: over-crown metres match');

-- step 50: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-23T09:00:00+00'::timestamptz),
    'conf-14-49')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_53_248km"]'::jsonb,
  'two_hundred_five_km_sessions step 50: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'challenger',
  'two_hundred_five_km_sessions step 50: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  250000,
  'two_hundred_five_km_sessions step 50: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 50: over-crown metres match');

-- step 51: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-24T09:00:00+00'::timestamptz),
    'conf-14-50')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 51: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'challenger',
  'two_hundred_five_km_sessions step 51: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  255000,
  'two_hundred_five_km_sessions step 51: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 51: over-crown metres match');

-- step 52: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-25T09:00:00+00'::timestamptz),
    'conf-14-51')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_54_256km"]'::jsonb,
  'two_hundred_five_km_sessions step 52: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'challenger',
  'two_hundred_five_km_sessions step 52: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  260000,
  'two_hundred_five_km_sessions step 52: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 52: over-crown metres match');

-- step 53: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-26T09:00:00+00'::timestamptz),
    'conf-14-52')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_55_264km"]'::jsonb,
  'two_hundred_five_km_sessions step 53: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'challenger',
  'two_hundred_five_km_sessions step 53: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  265000,
  'two_hundred_five_km_sessions step 53: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 53: over-crown metres match');

-- step 54: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-27T09:00:00+00'::timestamptz),
    'conf-14-53')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 54: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'challenger',
  'two_hundred_five_km_sessions step 54: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  270000,
  'two_hundred_five_km_sessions step 54: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 54: over-crown metres match');

-- step 55: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-01T09:00:00+00'::timestamptz),
    'conf-14-54')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_56_272km"]'::jsonb,
  'two_hundred_five_km_sessions step 55: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'challenger',
  'two_hundred_five_km_sessions step 55: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  275000,
  'two_hundred_five_km_sessions step 55: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 55: over-crown metres match');

-- step 56: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-02T09:00:00+00'::timestamptz),
    'conf-14-55')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 56: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'challenger',
  'two_hundred_five_km_sessions step 56: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  280000,
  'two_hundred_five_km_sessions step 56: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 56: over-crown metres match');

-- step 57: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-03T09:00:00+00'::timestamptz),
    'conf-14-56')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_57_281km"]'::jsonb,
  'two_hundred_five_km_sessions step 57: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'challenger',
  'two_hundred_five_km_sessions step 57: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  285000,
  'two_hundred_five_km_sessions step 57: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 57: over-crown metres match');

-- step 58: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-04T09:00:00+00'::timestamptz),
    'conf-14-57')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_58_289km"]'::jsonb,
  'two_hundred_five_km_sessions step 58: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'challenger',
  'two_hundred_five_km_sessions step 58: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  290000,
  'two_hundred_five_km_sessions step 58: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 58: over-crown metres match');

-- step 59: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-05T09:00:00+00'::timestamptz),
    'conf-14-58')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 59: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'challenger',
  'two_hundred_five_km_sessions step 59: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  295000,
  'two_hundred_five_km_sessions step 59: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 59: over-crown metres match');

-- step 60: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-06T09:00:00+00'::timestamptz),
    'conf-14-59')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_59_298km"]'::jsonb,
  'two_hundred_five_km_sessions step 60: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'vanguard',
  'two_hundred_five_km_sessions step 60: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  300000,
  'two_hundred_five_km_sessions step 60: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 60: over-crown metres match');

-- step 61: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-07T09:00:00+00'::timestamptz),
    'conf-14-60')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 61: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'vanguard',
  'two_hundred_five_km_sessions step 61: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  305000,
  'two_hundred_five_km_sessions step 61: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 61: over-crown metres match');

-- step 62: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-08T09:00:00+00'::timestamptz),
    'conf-14-61')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_60_306km"]'::jsonb,
  'two_hundred_five_km_sessions step 62: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'vanguard',
  'two_hundred_five_km_sessions step 62: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  310000,
  'two_hundred_five_km_sessions step 62: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 62: over-crown metres match');

-- step 63: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-09T09:00:00+00'::timestamptz),
    'conf-14-62')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_61_315km"]'::jsonb,
  'two_hundred_five_km_sessions step 63: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'vanguard',
  'two_hundred_five_km_sessions step 63: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  315000,
  'two_hundred_five_km_sessions step 63: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 63: over-crown metres match');

-- step 64: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-10T09:00:00+00'::timestamptz),
    'conf-14-63')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 64: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'vanguard',
  'two_hundred_five_km_sessions step 64: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  320000,
  'two_hundred_five_km_sessions step 64: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 64: over-crown metres match');

-- step 65: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-11T09:00:00+00'::timestamptz),
    'conf-14-64')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_62_324km"]'::jsonb,
  'two_hundred_five_km_sessions step 65: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'vanguard',
  'two_hundred_five_km_sessions step 65: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  325000,
  'two_hundred_five_km_sessions step 65: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 65: over-crown metres match');

-- step 66: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-12T09:00:00+00'::timestamptz),
    'conf-14-65')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 66: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'vanguard',
  'two_hundred_five_km_sessions step 66: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  330000,
  'two_hundred_five_km_sessions step 66: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 66: over-crown metres match');

-- step 67: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-13T09:00:00+00'::timestamptz),
    'conf-14-66')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_63_333km"]'::jsonb,
  'two_hundred_five_km_sessions step 67: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'vanguard',
  'two_hundred_five_km_sessions step 67: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  335000,
  'two_hundred_five_km_sessions step 67: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 67: over-crown metres match');

-- step 68: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-14T09:00:00+00'::timestamptz),
    'conf-14-67')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 68: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'vanguard',
  'two_hundred_five_km_sessions step 68: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  340000,
  'two_hundred_five_km_sessions step 68: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 68: over-crown metres match');

-- step 69: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-15T09:00:00+00'::timestamptz),
    'conf-14-68')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_64_342km"]'::jsonb,
  'two_hundred_five_km_sessions step 69: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'vanguard',
  'two_hundred_five_km_sessions step 69: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  345000,
  'two_hundred_five_km_sessions step 69: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 69: over-crown metres match');

-- step 70: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-16T09:00:00+00'::timestamptz),
    'conf-14-69')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 70: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'vanguard',
  'two_hundred_five_km_sessions step 70: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  350000,
  'two_hundred_five_km_sessions step 70: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 70: over-crown metres match');

-- step 71: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-17T09:00:00+00'::timestamptz),
    'conf-14-70')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_65_351km"]'::jsonb,
  'two_hundred_five_km_sessions step 71: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'vanguard',
  'two_hundred_five_km_sessions step 71: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  355000,
  'two_hundred_five_km_sessions step 71: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 71: over-crown metres match');

-- step 72: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-18T09:00:00+00'::timestamptz),
    'conf-14-71')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_66_360km"]'::jsonb,
  'two_hundred_five_km_sessions step 72: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'vanguard',
  'two_hundred_five_km_sessions step 72: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  360000,
  'two_hundred_five_km_sessions step 72: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 72: over-crown metres match');

-- step 73: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-19T09:00:00+00'::timestamptz),
    'conf-14-72')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 73: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'vanguard',
  'two_hundred_five_km_sessions step 73: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  365000,
  'two_hundred_five_km_sessions step 73: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 73: over-crown metres match');

-- step 74: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-20T09:00:00+00'::timestamptz),
    'conf-14-73')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_67_369km"]'::jsonb,
  'two_hundred_five_km_sessions step 74: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'vanguard',
  'two_hundred_five_km_sessions step 74: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  370000,
  'two_hundred_five_km_sessions step 74: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 74: over-crown metres match');

-- step 75: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-21T09:00:00+00'::timestamptz),
    'conf-14-74')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 75: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'vanguard',
  'two_hundred_five_km_sessions step 75: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  375000,
  'two_hundred_five_km_sessions step 75: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 75: over-crown metres match');

-- step 76: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-22T09:00:00+00'::timestamptz),
    'conf-14-75')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_68_379km"]'::jsonb,
  'two_hundred_five_km_sessions step 76: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'vanguard',
  'two_hundred_five_km_sessions step 76: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  380000,
  'two_hundred_five_km_sessions step 76: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 76: over-crown metres match');

-- step 77: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-23T09:00:00+00'::timestamptz),
    'conf-14-76')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 77: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'vanguard',
  'two_hundred_five_km_sessions step 77: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  385000,
  'two_hundred_five_km_sessions step 77: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 77: over-crown metres match');

-- step 78: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-24T09:00:00+00'::timestamptz),
    'conf-14-77')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_69_388km"]'::jsonb,
  'two_hundred_five_km_sessions step 78: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'vanguard',
  'two_hundred_five_km_sessions step 78: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  390000,
  'two_hundred_five_km_sessions step 78: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 78: over-crown metres match');

-- step 79: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-25T09:00:00+00'::timestamptz),
    'conf-14-78')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 79: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'vanguard',
  'two_hundred_five_km_sessions step 79: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  395000,
  'two_hundred_five_km_sessions step 79: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 79: over-crown metres match');

-- step 80: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-26T09:00:00+00'::timestamptz),
    'conf-14-79')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_70_398km"]'::jsonb,
  'two_hundred_five_km_sessions step 80: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'champion',
  'two_hundred_five_km_sessions step 80: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  400000,
  'two_hundred_five_km_sessions step 80: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 80: over-crown metres match');

-- step 81: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-27T09:00:00+00'::timestamptz),
    'conf-14-80')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 81: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'champion',
  'two_hundred_five_km_sessions step 81: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  405000,
  'two_hundred_five_km_sessions step 81: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 81: over-crown metres match');

-- step 82: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-01T09:00:00+00'::timestamptz),
    'conf-14-81')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_71_407km"]'::jsonb,
  'two_hundred_five_km_sessions step 82: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'champion',
  'two_hundred_five_km_sessions step 82: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  410000,
  'two_hundred_five_km_sessions step 82: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 82: over-crown metres match');

-- step 83: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-02T09:00:00+00'::timestamptz),
    'conf-14-82')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 83: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'champion',
  'two_hundred_five_km_sessions step 83: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  415000,
  'two_hundred_five_km_sessions step 83: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 83: over-crown metres match');

-- step 84: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-03T09:00:00+00'::timestamptz),
    'conf-14-83')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_72_417km"]'::jsonb,
  'two_hundred_five_km_sessions step 84: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'champion',
  'two_hundred_five_km_sessions step 84: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  420000,
  'two_hundred_five_km_sessions step 84: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 84: over-crown metres match');

-- step 85: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-04T09:00:00+00'::timestamptz),
    'conf-14-84')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 85: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'champion',
  'two_hundred_five_km_sessions step 85: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  425000,
  'two_hundred_five_km_sessions step 85: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 85: over-crown metres match');

-- step 86: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-05T09:00:00+00'::timestamptz),
    'conf-14-85')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_73_427km"]'::jsonb,
  'two_hundred_five_km_sessions step 86: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'champion',
  'two_hundred_five_km_sessions step 86: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  430000,
  'two_hundred_five_km_sessions step 86: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 86: over-crown metres match');

-- step 87: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-06T09:00:00+00'::timestamptz),
    'conf-14-86')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 87: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'champion',
  'two_hundred_five_km_sessions step 87: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  435000,
  'two_hundred_five_km_sessions step 87: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 87: over-crown metres match');

-- step 88: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-07T09:00:00+00'::timestamptz),
    'conf-14-87')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_74_437km"]'::jsonb,
  'two_hundred_five_km_sessions step 88: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'champion',
  'two_hundred_five_km_sessions step 88: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  440000,
  'two_hundred_five_km_sessions step 88: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 88: over-crown metres match');

-- step 89: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-08T09:00:00+00'::timestamptz),
    'conf-14-88')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 89: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'champion',
  'two_hundred_five_km_sessions step 89: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  445000,
  'two_hundred_five_km_sessions step 89: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 89: over-crown metres match');

-- step 90: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-09T09:00:00+00'::timestamptz),
    'conf-14-89')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_75_447km"]'::jsonb,
  'two_hundred_five_km_sessions step 90: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'champion',
  'two_hundred_five_km_sessions step 90: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  450000,
  'two_hundred_five_km_sessions step 90: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 90: over-crown metres match');

-- step 91: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-10T09:00:00+00'::timestamptz),
    'conf-14-90')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 91: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'champion',
  'two_hundred_five_km_sessions step 91: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  455000,
  'two_hundred_five_km_sessions step 91: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 91: over-crown metres match');

-- step 92: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-11T09:00:00+00'::timestamptz),
    'conf-14-91')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_76_457km"]'::jsonb,
  'two_hundred_five_km_sessions step 92: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'champion',
  'two_hundred_five_km_sessions step 92: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  460000,
  'two_hundred_five_km_sessions step 92: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 92: over-crown metres match');

-- step 93: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-12T09:00:00+00'::timestamptz),
    'conf-14-92')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 93: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'champion',
  'two_hundred_five_km_sessions step 93: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  465000,
  'two_hundred_five_km_sessions step 93: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 93: over-crown metres match');

-- step 94: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-13T09:00:00+00'::timestamptz),
    'conf-14-93')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_77_467km"]'::jsonb,
  'two_hundred_five_km_sessions step 94: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'champion',
  'two_hundred_five_km_sessions step 94: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  470000,
  'two_hundred_five_km_sessions step 94: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 94: over-crown metres match');

-- step 95: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-14T09:00:00+00'::timestamptz),
    'conf-14-94')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 95: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'champion',
  'two_hundred_five_km_sessions step 95: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  475000,
  'two_hundred_five_km_sessions step 95: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 95: over-crown metres match');

-- step 96: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-15T09:00:00+00'::timestamptz),
    'conf-14-95')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_78_478km"]'::jsonb,
  'two_hundred_five_km_sessions step 96: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'champion',
  'two_hundred_five_km_sessions step 96: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  480000,
  'two_hundred_five_km_sessions step 96: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 96: over-crown metres match');

-- step 97: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-16T09:00:00+00'::timestamptz),
    'conf-14-96')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 97: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'champion',
  'two_hundred_five_km_sessions step 97: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  485000,
  'two_hundred_five_km_sessions step 97: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 97: over-crown metres match');

-- step 98: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-17T09:00:00+00'::timestamptz),
    'conf-14-97')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_79_488km"]'::jsonb,
  'two_hundred_five_km_sessions step 98: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'champion',
  'two_hundred_five_km_sessions step 98: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  490000,
  'two_hundred_five_km_sessions step 98: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 98: over-crown metres match');

-- step 99: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-18T09:00:00+00'::timestamptz),
    'conf-14-98')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 99: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'champion',
  'two_hundred_five_km_sessions step 99: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  495000,
  'two_hundred_five_km_sessions step 99: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 99: over-crown metres match');

-- step 100: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-19T09:00:00+00'::timestamptz),
    'conf-14-99')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_80_499km"]'::jsonb,
  'two_hundred_five_km_sessions step 100: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'master',
  'two_hundred_five_km_sessions step 100: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  500000,
  'two_hundred_five_km_sessions step 100: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 100: over-crown metres match');

-- step 101: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-20T09:00:00+00'::timestamptz),
    'conf-14-100')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 101: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'master',
  'two_hundred_five_km_sessions step 101: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  505000,
  'two_hundred_five_km_sessions step 101: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 101: over-crown metres match');

-- step 102: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-21T09:00:00+00'::timestamptz),
    'conf-14-101')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_81_509km"]'::jsonb,
  'two_hundred_five_km_sessions step 102: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'master',
  'two_hundred_five_km_sessions step 102: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  510000,
  'two_hundred_five_km_sessions step 102: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 102: over-crown metres match');

-- step 103: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-22T09:00:00+00'::timestamptz),
    'conf-14-102')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 103: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'master',
  'two_hundred_five_km_sessions step 103: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  515000,
  'two_hundred_five_km_sessions step 103: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 103: over-crown metres match');

-- step 104: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-23T09:00:00+00'::timestamptz),
    'conf-14-103')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_82_520km"]'::jsonb,
  'two_hundred_five_km_sessions step 104: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'master',
  'two_hundred_five_km_sessions step 104: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  520000,
  'two_hundred_five_km_sessions step 104: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 104: over-crown metres match');

-- step 105: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-24T09:00:00+00'::timestamptz),
    'conf-14-104')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 105: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'master',
  'two_hundred_five_km_sessions step 105: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  525000,
  'two_hundred_five_km_sessions step 105: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 105: over-crown metres match');

-- step 106: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-25T09:00:00+00'::timestamptz),
    'conf-14-105')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 106: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'master',
  'two_hundred_five_km_sessions step 106: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  530000,
  'two_hundred_five_km_sessions step 106: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 106: over-crown metres match');

-- step 107: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-26T09:00:00+00'::timestamptz),
    'conf-14-106')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_83_531km"]'::jsonb,
  'two_hundred_five_km_sessions step 107: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'master',
  'two_hundred_five_km_sessions step 107: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  535000,
  'two_hundred_five_km_sessions step 107: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 107: over-crown metres match');

-- step 108: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-27T09:00:00+00'::timestamptz),
    'conf-14-107')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 108: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'master',
  'two_hundred_five_km_sessions step 108: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  540000,
  'two_hundred_five_km_sessions step 108: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 108: over-crown metres match');

-- step 109: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-01T09:00:00+00'::timestamptz),
    'conf-14-108')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_84_541km"]'::jsonb,
  'two_hundred_five_km_sessions step 109: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'master',
  'two_hundred_five_km_sessions step 109: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  545000,
  'two_hundred_five_km_sessions step 109: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 109: over-crown metres match');

-- step 110: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-02T09:00:00+00'::timestamptz),
    'conf-14-109')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 110: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'master',
  'two_hundred_five_km_sessions step 110: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  550000,
  'two_hundred_five_km_sessions step 110: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 110: over-crown metres match');

-- step 111: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-03T09:00:00+00'::timestamptz),
    'conf-14-110')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_85_552km"]'::jsonb,
  'two_hundred_five_km_sessions step 111: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'master',
  'two_hundred_five_km_sessions step 111: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  555000,
  'two_hundred_five_km_sessions step 111: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 111: over-crown metres match');

-- step 112: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-04T09:00:00+00'::timestamptz),
    'conf-14-111')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 112: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'master',
  'two_hundred_five_km_sessions step 112: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  560000,
  'two_hundred_five_km_sessions step 112: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 112: over-crown metres match');

-- step 113: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-05T09:00:00+00'::timestamptz),
    'conf-14-112')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_86_563km"]'::jsonb,
  'two_hundred_five_km_sessions step 113: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'master',
  'two_hundred_five_km_sessions step 113: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  565000,
  'two_hundred_five_km_sessions step 113: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 113: over-crown metres match');

-- step 114: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-06T09:00:00+00'::timestamptz),
    'conf-14-113')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 114: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'master',
  'two_hundred_five_km_sessions step 114: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  570000,
  'two_hundred_five_km_sessions step 114: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 114: over-crown metres match');

-- step 115: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-07T09:00:00+00'::timestamptz),
    'conf-14-114')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_87_574km"]'::jsonb,
  'two_hundred_five_km_sessions step 115: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'master',
  'two_hundred_five_km_sessions step 115: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  575000,
  'two_hundred_five_km_sessions step 115: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 115: over-crown metres match');

-- step 116: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-08T09:00:00+00'::timestamptz),
    'conf-14-115')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 116: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'master',
  'two_hundred_five_km_sessions step 116: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  580000,
  'two_hundred_five_km_sessions step 116: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 116: over-crown metres match');

-- step 117: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-09T09:00:00+00'::timestamptz),
    'conf-14-116')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 117: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'master',
  'two_hundred_five_km_sessions step 117: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  585000,
  'two_hundred_five_km_sessions step 117: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 117: over-crown metres match');

-- step 118: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-10T09:00:00+00'::timestamptz),
    'conf-14-117')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_88_586km"]'::jsonb,
  'two_hundred_five_km_sessions step 118: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'master',
  'two_hundred_five_km_sessions step 118: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  590000,
  'two_hundred_five_km_sessions step 118: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 118: over-crown metres match');

-- step 119: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-11T09:00:00+00'::timestamptz),
    'conf-14-118')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 119: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'master',
  'two_hundred_five_km_sessions step 119: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  595000,
  'two_hundred_five_km_sessions step 119: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 119: over-crown metres match');

-- step 120: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-12T09:00:00+00'::timestamptz),
    'conf-14-119')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_89_597km"]'::jsonb,
  'two_hundred_five_km_sessions step 120: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'grandmaster',
  'two_hundred_five_km_sessions step 120: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  600000,
  'two_hundred_five_km_sessions step 120: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 120: over-crown metres match');

-- step 121: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-13T09:00:00+00'::timestamptz),
    'conf-14-120')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 121: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'grandmaster',
  'two_hundred_five_km_sessions step 121: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  605000,
  'two_hundred_five_km_sessions step 121: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 121: over-crown metres match');

-- step 122: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-14T09:00:00+00'::timestamptz),
    'conf-14-121')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_90_608km"]'::jsonb,
  'two_hundred_five_km_sessions step 122: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'grandmaster',
  'two_hundred_five_km_sessions step 122: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  610000,
  'two_hundred_five_km_sessions step 122: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 122: over-crown metres match');

-- step 123: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-15T09:00:00+00'::timestamptz),
    'conf-14-122')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 123: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'grandmaster',
  'two_hundred_five_km_sessions step 123: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  615000,
  'two_hundred_five_km_sessions step 123: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 123: over-crown metres match');

-- step 124: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-16T09:00:00+00'::timestamptz),
    'conf-14-123')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_91_620km"]'::jsonb,
  'two_hundred_five_km_sessions step 124: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'grandmaster',
  'two_hundred_five_km_sessions step 124: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  620000,
  'two_hundred_five_km_sessions step 124: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 124: over-crown metres match');

-- step 125: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-17T09:00:00+00'::timestamptz),
    'conf-14-124')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 125: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'grandmaster',
  'two_hundred_five_km_sessions step 125: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  625000,
  'two_hundred_five_km_sessions step 125: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 125: over-crown metres match');

-- step 126: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-18T09:00:00+00'::timestamptz),
    'conf-14-125')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 126: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'grandmaster',
  'two_hundred_five_km_sessions step 126: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  630000,
  'two_hundred_five_km_sessions step 126: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 126: over-crown metres match');

-- step 127: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-19T09:00:00+00'::timestamptz),
    'conf-14-126')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_92_631km"]'::jsonb,
  'two_hundred_five_km_sessions step 127: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'grandmaster',
  'two_hundred_five_km_sessions step 127: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  635000,
  'two_hundred_five_km_sessions step 127: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 127: over-crown metres match');

-- step 128: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-20T09:00:00+00'::timestamptz),
    'conf-14-127')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 128: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'grandmaster',
  'two_hundred_five_km_sessions step 128: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  640000,
  'two_hundred_five_km_sessions step 128: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 128: over-crown metres match');

-- step 129: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-21T09:00:00+00'::timestamptz),
    'conf-14-128')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_93_643km"]'::jsonb,
  'two_hundred_five_km_sessions step 129: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'grandmaster',
  'two_hundred_five_km_sessions step 129: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  645000,
  'two_hundred_five_km_sessions step 129: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 129: over-crown metres match');

-- step 130: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-22T09:00:00+00'::timestamptz),
    'conf-14-129')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 130: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'grandmaster',
  'two_hundred_five_km_sessions step 130: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  650000,
  'two_hundred_five_km_sessions step 130: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 130: over-crown metres match');

-- step 131: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-23T09:00:00+00'::timestamptz),
    'conf-14-130')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_94_654km"]'::jsonb,
  'two_hundred_five_km_sessions step 131: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'grandmaster',
  'two_hundred_five_km_sessions step 131: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  655000,
  'two_hundred_five_km_sessions step 131: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 131: over-crown metres match');

-- step 132: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-24T09:00:00+00'::timestamptz),
    'conf-14-131')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 132: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'grandmaster',
  'two_hundred_five_km_sessions step 132: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  660000,
  'two_hundred_five_km_sessions step 132: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 132: over-crown metres match');

-- step 133: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-25T09:00:00+00'::timestamptz),
    'conf-14-132')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 133: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'grandmaster',
  'two_hundred_five_km_sessions step 133: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  665000,
  'two_hundred_five_km_sessions step 133: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 133: over-crown metres match');

-- step 134: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-26T09:00:00+00'::timestamptz),
    'conf-14-133')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_95_666km"]'::jsonb,
  'two_hundred_five_km_sessions step 134: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'grandmaster',
  'two_hundred_five_km_sessions step 134: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  670000,
  'two_hundred_five_km_sessions step 134: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 134: over-crown metres match');

-- step 135: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-27T09:00:00+00'::timestamptz),
    'conf-14-134')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 135: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'grandmaster',
  'two_hundred_five_km_sessions step 135: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  675000,
  'two_hundred_five_km_sessions step 135: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 135: over-crown metres match');

-- step 136: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-01T09:00:00+00'::timestamptz),
    'conf-14-135')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_96_678km"]'::jsonb,
  'two_hundred_five_km_sessions step 136: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'grandmaster',
  'two_hundred_five_km_sessions step 136: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  680000,
  'two_hundred_five_km_sessions step 136: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 136: over-crown metres match');

-- step 137: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-02T09:00:00+00'::timestamptz),
    'conf-14-136')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 137: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'grandmaster',
  'two_hundred_five_km_sessions step 137: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  685000,
  'two_hundred_five_km_sessions step 137: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 137: over-crown metres match');

-- step 138: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-03T09:00:00+00'::timestamptz),
    'conf-14-137')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_97_690km"]'::jsonb,
  'two_hundred_five_km_sessions step 138: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'grandmaster',
  'two_hundred_five_km_sessions step 138: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  690000,
  'two_hundred_five_km_sessions step 138: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 138: over-crown metres match');

-- step 139: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-04T09:00:00+00'::timestamptz),
    'conf-14-138')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 139: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'grandmaster',
  'two_hundred_five_km_sessions step 139: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  695000,
  'two_hundred_five_km_sessions step 139: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 139: over-crown metres match');

-- step 140: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-05T09:00:00+00'::timestamptz),
    'conf-14-139')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 140: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'legend',
  'two_hundred_five_km_sessions step 140: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  700000,
  'two_hundred_five_km_sessions step 140: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 140: over-crown metres match');

-- step 141: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-06T09:00:00+00'::timestamptz),
    'conf-14-140')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_98_702km"]'::jsonb,
  'two_hundred_five_km_sessions step 141: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'legend',
  'two_hundred_five_km_sessions step 141: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  705000,
  'two_hundred_five_km_sessions step 141: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 141: over-crown metres match');

-- step 142: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-07T09:00:00+00'::timestamptz),
    'conf-14-141')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 142: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'legend',
  'two_hundred_five_km_sessions step 142: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  710000,
  'two_hundred_five_km_sessions step 142: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 142: over-crown metres match');

-- step 143: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-08T09:00:00+00'::timestamptz),
    'conf-14-142')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_99_714km"]'::jsonb,
  'two_hundred_five_km_sessions step 143: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'legend',
  'two_hundred_five_km_sessions step 143: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  715000,
  'two_hundred_five_km_sessions step 143: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 143: over-crown metres match');

-- step 144: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-09T09:00:00+00'::timestamptz),
    'conf-14-143')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 144: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'legend',
  'two_hundred_five_km_sessions step 144: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  720000,
  'two_hundred_five_km_sessions step 144: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 144: over-crown metres match');

-- step 145: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-10T09:00:00+00'::timestamptz),
    'conf-14-144')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 145: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'legend',
  'two_hundred_five_km_sessions step 145: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  725000,
  'two_hundred_five_km_sessions step 145: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 145: over-crown metres match');

-- step 146: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-11T09:00:00+00'::timestamptz),
    'conf-14-145')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_100_726km"]'::jsonb,
  'two_hundred_five_km_sessions step 146: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'legend',
  'two_hundred_five_km_sessions step 146: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  730000,
  'two_hundred_five_km_sessions step 146: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 146: over-crown metres match');

-- step 147: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-12T09:00:00+00'::timestamptz),
    'conf-14-146')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 147: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'legend',
  'two_hundred_five_km_sessions step 147: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  735000,
  'two_hundred_five_km_sessions step 147: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 147: over-crown metres match');

-- step 148: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-13T09:00:00+00'::timestamptz),
    'conf-14-147')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_101_738km"]'::jsonb,
  'two_hundred_five_km_sessions step 148: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'legend',
  'two_hundred_five_km_sessions step 148: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  740000,
  'two_hundred_five_km_sessions step 148: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 148: over-crown metres match');

-- step 149: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-14T09:00:00+00'::timestamptz),
    'conf-14-148')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 149: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'legend',
  'two_hundred_five_km_sessions step 149: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  745000,
  'two_hundred_five_km_sessions step 149: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 149: over-crown metres match');

-- step 150: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-15T09:00:00+00'::timestamptz),
    'conf-14-149')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 150: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'legend',
  'two_hundred_five_km_sessions step 150: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  750000,
  'two_hundred_five_km_sessions step 150: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 150: over-crown metres match');

-- step 151: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-16T09:00:00+00'::timestamptz),
    'conf-14-150')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_102_751km"]'::jsonb,
  'two_hundred_five_km_sessions step 151: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'legend',
  'two_hundred_five_km_sessions step 151: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  755000,
  'two_hundred_five_km_sessions step 151: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 151: over-crown metres match');

-- step 152: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-17T09:00:00+00'::timestamptz),
    'conf-14-151')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 152: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'legend',
  'two_hundred_five_km_sessions step 152: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  760000,
  'two_hundred_five_km_sessions step 152: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 152: over-crown metres match');

-- step 153: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-18T09:00:00+00'::timestamptz),
    'conf-14-152')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_103_763km"]'::jsonb,
  'two_hundred_five_km_sessions step 153: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'legend',
  'two_hundred_five_km_sessions step 153: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  765000,
  'two_hundred_five_km_sessions step 153: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 153: over-crown metres match');

-- step 154: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-19T09:00:00+00'::timestamptz),
    'conf-14-153')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 154: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'legend',
  'two_hundred_five_km_sessions step 154: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  770000,
  'two_hundred_five_km_sessions step 154: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 154: over-crown metres match');

-- step 155: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-20T09:00:00+00'::timestamptz),
    'conf-14-154')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 155: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'legend',
  'two_hundred_five_km_sessions step 155: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  775000,
  'two_hundred_five_km_sessions step 155: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 155: over-crown metres match');

-- step 156: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-21T09:00:00+00'::timestamptz),
    'conf-14-155')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_104_776km"]'::jsonb,
  'two_hundred_five_km_sessions step 156: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'legend',
  'two_hundred_five_km_sessions step 156: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  780000,
  'two_hundred_five_km_sessions step 156: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 156: over-crown metres match');

-- step 157: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-22T09:00:00+00'::timestamptz),
    'conf-14-156')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 157: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'legend',
  'two_hundred_five_km_sessions step 157: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  785000,
  'two_hundred_five_km_sessions step 157: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 157: over-crown metres match');

-- step 158: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-23T09:00:00+00'::timestamptz),
    'conf-14-157')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_105_788km"]'::jsonb,
  'two_hundred_five_km_sessions step 158: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'legend',
  'two_hundred_five_km_sessions step 158: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  790000,
  'two_hundred_five_km_sessions step 158: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 158: over-crown metres match');

-- step 159: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-24T09:00:00+00'::timestamptz),
    'conf-14-158')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 159: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'legend',
  'two_hundred_five_km_sessions step 159: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  795000,
  'two_hundred_five_km_sessions step 159: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 159: over-crown metres match');

-- step 160: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-25T09:00:00+00'::timestamptz),
    'conf-14-159')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 160: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'mythic',
  'two_hundred_five_km_sessions step 160: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  800000,
  'two_hundred_five_km_sessions step 160: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 160: over-crown metres match');

-- step 161: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-26T09:00:00+00'::timestamptz),
    'conf-14-160')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_106_801km"]'::jsonb,
  'two_hundred_five_km_sessions step 161: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'mythic',
  'two_hundred_five_km_sessions step 161: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  805000,
  'two_hundred_five_km_sessions step 161: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 161: over-crown metres match');

-- step 162: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-27T09:00:00+00'::timestamptz),
    'conf-14-161')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 162: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'mythic',
  'two_hundred_five_km_sessions step 162: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  810000,
  'two_hundred_five_km_sessions step 162: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 162: over-crown metres match');

-- step 163: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-01T09:00:00+00'::timestamptz),
    'conf-14-162')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_107_814km"]'::jsonb,
  'two_hundred_five_km_sessions step 163: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'mythic',
  'two_hundred_five_km_sessions step 163: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  815000,
  'two_hundred_five_km_sessions step 163: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 163: over-crown metres match');

-- step 164: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-02T09:00:00+00'::timestamptz),
    'conf-14-163')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 164: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'mythic',
  'two_hundred_five_km_sessions step 164: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  820000,
  'two_hundred_five_km_sessions step 164: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 164: over-crown metres match');

-- step 165: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-03T09:00:00+00'::timestamptz),
    'conf-14-164')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 165: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'mythic',
  'two_hundred_five_km_sessions step 165: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  825000,
  'two_hundred_five_km_sessions step 165: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 165: over-crown metres match');

-- step 166: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-04T09:00:00+00'::timestamptz),
    'conf-14-165')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_108_826km"]'::jsonb,
  'two_hundred_five_km_sessions step 166: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'mythic',
  'two_hundred_five_km_sessions step 166: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  830000,
  'two_hundred_five_km_sessions step 166: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 166: over-crown metres match');

-- step 167: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-05T09:00:00+00'::timestamptz),
    'conf-14-166')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 167: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'mythic',
  'two_hundred_five_km_sessions step 167: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  835000,
  'two_hundred_five_km_sessions step 167: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 167: over-crown metres match');

-- step 168: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-06T09:00:00+00'::timestamptz),
    'conf-14-167')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_109_839km"]'::jsonb,
  'two_hundred_five_km_sessions step 168: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'mythic',
  'two_hundred_five_km_sessions step 168: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  840000,
  'two_hundred_five_km_sessions step 168: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 168: over-crown metres match');

-- step 169: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-07T09:00:00+00'::timestamptz),
    'conf-14-168')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 169: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'mythic',
  'two_hundred_five_km_sessions step 169: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  845000,
  'two_hundred_five_km_sessions step 169: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 169: over-crown metres match');

-- step 170: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-08T09:00:00+00'::timestamptz),
    'conf-14-169')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 170: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'mythic',
  'two_hundred_five_km_sessions step 170: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  850000,
  'two_hundred_five_km_sessions step 170: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 170: over-crown metres match');

-- step 171: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-09T09:00:00+00'::timestamptz),
    'conf-14-170')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_110_852km"]'::jsonb,
  'two_hundred_five_km_sessions step 171: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'mythic',
  'two_hundred_five_km_sessions step 171: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  855000,
  'two_hundred_five_km_sessions step 171: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 171: over-crown metres match');

-- step 172: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-10T09:00:00+00'::timestamptz),
    'conf-14-171')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 172: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'mythic',
  'two_hundred_five_km_sessions step 172: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  860000,
  'two_hundred_five_km_sessions step 172: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 172: over-crown metres match');

-- step 173: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-11T09:00:00+00'::timestamptz),
    'conf-14-172')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_111_865km"]'::jsonb,
  'two_hundred_five_km_sessions step 173: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'mythic',
  'two_hundred_five_km_sessions step 173: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  865000,
  'two_hundred_five_km_sessions step 173: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 173: over-crown metres match');

-- step 174: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-12T09:00:00+00'::timestamptz),
    'conf-14-173')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 174: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'mythic',
  'two_hundred_five_km_sessions step 174: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  870000,
  'two_hundred_five_km_sessions step 174: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 174: over-crown metres match');

-- step 175: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-13T09:00:00+00'::timestamptz),
    'conf-14-174')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 175: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'mythic',
  'two_hundred_five_km_sessions step 175: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  875000,
  'two_hundred_five_km_sessions step 175: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 175: over-crown metres match');

-- step 176: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-14T09:00:00+00'::timestamptz),
    'conf-14-175')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_112_878km"]'::jsonb,
  'two_hundred_five_km_sessions step 176: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'mythic',
  'two_hundred_five_km_sessions step 176: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  880000,
  'two_hundred_five_km_sessions step 176: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 176: over-crown metres match');

-- step 177: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-15T09:00:00+00'::timestamptz),
    'conf-14-176')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 177: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'mythic',
  'two_hundred_five_km_sessions step 177: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  885000,
  'two_hundred_five_km_sessions step 177: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 177: over-crown metres match');

-- step 178: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-16T09:00:00+00'::timestamptz),
    'conf-14-177')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 178: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'mythic',
  'two_hundred_five_km_sessions step 178: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  890000,
  'two_hundred_five_km_sessions step 178: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 178: over-crown metres match');

-- step 179: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-17T09:00:00+00'::timestamptz),
    'conf-14-178')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_113_892km"]'::jsonb,
  'two_hundred_five_km_sessions step 179: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'mythic',
  'two_hundred_five_km_sessions step 179: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  895000,
  'two_hundred_five_km_sessions step 179: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 179: over-crown metres match');

-- step 180: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-18T09:00:00+00'::timestamptz),
    'conf-14-179')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 180: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'apex',
  'two_hundred_five_km_sessions step 180: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  900000,
  'two_hundred_five_km_sessions step 180: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 180: over-crown metres match');

-- step 181: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-19T09:00:00+00'::timestamptz),
    'conf-14-180')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_114_905km"]'::jsonb,
  'two_hundred_five_km_sessions step 181: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'apex',
  'two_hundred_five_km_sessions step 181: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  905000,
  'two_hundred_five_km_sessions step 181: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 181: over-crown metres match');

-- step 182: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-20T09:00:00+00'::timestamptz),
    'conf-14-181')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 182: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'apex',
  'two_hundred_five_km_sessions step 182: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  910000,
  'two_hundred_five_km_sessions step 182: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 182: over-crown metres match');

-- step 183: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-21T09:00:00+00'::timestamptz),
    'conf-14-182')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 183: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'apex',
  'two_hundred_five_km_sessions step 183: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  915000,
  'two_hundred_five_km_sessions step 183: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 183: over-crown metres match');

-- step 184: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-22T09:00:00+00'::timestamptz),
    'conf-14-183')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_115_918km"]'::jsonb,
  'two_hundred_five_km_sessions step 184: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'apex',
  'two_hundred_five_km_sessions step 184: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  920000,
  'two_hundred_five_km_sessions step 184: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 184: over-crown metres match');

-- step 185: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-23T09:00:00+00'::timestamptz),
    'conf-14-184')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 185: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'apex',
  'two_hundred_five_km_sessions step 185: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  925000,
  'two_hundred_five_km_sessions step 185: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 185: over-crown metres match');

-- step 186: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-24T09:00:00+00'::timestamptz),
    'conf-14-185')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 186: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'apex',
  'two_hundred_five_km_sessions step 186: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  930000,
  'two_hundred_five_km_sessions step 186: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 186: over-crown metres match');

-- step 187: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-25T09:00:00+00'::timestamptz),
    'conf-14-186')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_116_932km"]'::jsonb,
  'two_hundred_five_km_sessions step 187: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'apex',
  'two_hundred_five_km_sessions step 187: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  935000,
  'two_hundred_five_km_sessions step 187: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 187: over-crown metres match');

-- step 188: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-26T09:00:00+00'::timestamptz),
    'conf-14-187')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 188: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'apex',
  'two_hundred_five_km_sessions step 188: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  940000,
  'two_hundred_five_km_sessions step 188: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 188: over-crown metres match');

-- step 189: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-27T09:00:00+00'::timestamptz),
    'conf-14-188')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_117_945km"]'::jsonb,
  'two_hundred_five_km_sessions step 189: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'apex',
  'two_hundred_five_km_sessions step 189: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  945000,
  'two_hundred_five_km_sessions step 189: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 189: over-crown metres match');

-- step 190: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-01T09:00:00+00'::timestamptz),
    'conf-14-189')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 190: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'apex',
  'two_hundred_five_km_sessions step 190: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  950000,
  'two_hundred_five_km_sessions step 190: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 190: over-crown metres match');

-- step 191: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-02T09:00:00+00'::timestamptz),
    'conf-14-190')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 191: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'apex',
  'two_hundred_five_km_sessions step 191: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  955000,
  'two_hundred_five_km_sessions step 191: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 191: over-crown metres match');

-- step 192: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-03T09:00:00+00'::timestamptz),
    'conf-14-191')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_118_959km"]'::jsonb,
  'two_hundred_five_km_sessions step 192: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'apex',
  'two_hundred_five_km_sessions step 192: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  960000,
  'two_hundred_five_km_sessions step 192: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 192: over-crown metres match');

-- step 193: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-04T09:00:00+00'::timestamptz),
    'conf-14-192')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 193: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'apex',
  'two_hundred_five_km_sessions step 193: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  965000,
  'two_hundred_five_km_sessions step 193: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 193: over-crown metres match');

-- step 194: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-05T09:00:00+00'::timestamptz),
    'conf-14-193')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 194: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'apex',
  'two_hundred_five_km_sessions step 194: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  970000,
  'two_hundred_five_km_sessions step 194: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 194: over-crown metres match');

-- step 195: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-06T09:00:00+00'::timestamptz),
    'conf-14-194')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_119_972km"]'::jsonb,
  'two_hundred_five_km_sessions step 195: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'apex',
  'two_hundred_five_km_sessions step 195: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  975000,
  'two_hundred_five_km_sessions step 195: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 195: over-crown metres match');

-- step 196: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-07T09:00:00+00'::timestamptz),
    'conf-14-195')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 196: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'apex',
  'two_hundred_five_km_sessions step 196: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  980000,
  'two_hundred_five_km_sessions step 196: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 196: over-crown metres match');

-- step 197: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-08T09:00:00+00'::timestamptz),
    'conf-14-196')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 197: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'apex',
  'two_hundred_five_km_sessions step 197: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  985000,
  'two_hundred_five_km_sessions step 197: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 197: over-crown metres match');

-- step 198: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-09T09:00:00+00'::timestamptz),
    'conf-14-197')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_120_986km"]'::jsonb,
  'two_hundred_five_km_sessions step 198: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'apex',
  'two_hundred_five_km_sessions step 198: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  990000,
  'two_hundred_five_km_sessions step 198: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 198: over-crown metres match');

-- step 199: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-10T09:00:00+00'::timestamptz),
    'conf-14-198')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '[]'::jsonb,
  'two_hundred_five_km_sessions step 199: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'apex',
  'two_hundred_five_km_sessions step 199: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  995000,
  'two_hundred_five_km_sessions step 199: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 199: over-crown metres match');

-- step 200: 5000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000015', 5000, '2026-09-11T09:00:00+00'::timestamptz),
    'conf-14-199')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_121_1000km"]'::jsonb,
  'two_hundred_five_km_sessions step 200: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'world_crown',
  'two_hundred_five_km_sessions step 200: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  1000000,
  'two_hundred_five_km_sessions step 200: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'two_hundred_five_km_sessions step 200: over-crown metres match');

select is((select laddered_meters from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000015' and month_key = '2026-09'), 1000000, 'two_hundred_five_km_sessions final: laddered metres');
select is((select over_crown_meters from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000015' and month_key = '2026-09'), 0, 'two_hundred_five_km_sessions final: over-crown metres');
select is((select major_rank::text from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000015' and month_key = '2026-09'), 'world_crown', 'two_hundred_five_km_sessions final: rank');
select is((select world_crown_awarded from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000015' and month_key = '2026-09'), true, 'two_hundred_five_km_sessions final: World Crown state');
select is((select count(*)::int from api.monthly_apex_checkpoint_claims where user_id = 'f0000000-0000-4000-8000-000000000015' and month_key = '2026-09'), 121, 'two_hundred_five_km_sessions final: total checkpoints claimed');

-- ------------------------------------------------------------------------
-- case: rank_boundary_50km
-- ------------------------------------------------------------------------
insert into api.profiles (user_id, display_name, user_code, reward_timezone)
values ('f0000000-0000-4000-8000-000000000016', 'Conf 16', 'CONF0016', 'UTC');

-- step 1: 50000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000016', 50000, '2026-09-01T09:00:00+00'::timestamptz),
    'conf-15-0')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_01_1km","apex_cp_02_2km","apex_cp_03_3km","apex_cp_04_4km","apex_cp_05_5km","apex_cp_06_6km","apex_cp_07_8km","apex_cp_08_10km","apex_cp_09_13km","apex_cp_10_15km","apex_cp_11_18km","apex_cp_12_21km","apex_cp_13_24km","apex_cp_14_27km","apex_cp_15_30km","apex_cp_16_34km","apex_cp_17_37km","apex_cp_18_41km","apex_cp_19_42p195km","apex_cp_20_45km","apex_cp_21_49km"]'::jsonb,
  'rank_boundary_50km step 1: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'strider',
  'rank_boundary_50km step 1: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  50000,
  'rank_boundary_50km step 1: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'rank_boundary_50km step 1: over-crown metres match');

select is((select laddered_meters from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000016' and month_key = '2026-09'), 50000, 'rank_boundary_50km final: laddered metres');
select is((select over_crown_meters from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000016' and month_key = '2026-09'), 0, 'rank_boundary_50km final: over-crown metres');
select is((select major_rank::text from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000016' and month_key = '2026-09'), 'strider', 'rank_boundary_50km final: rank');
select is((select world_crown_awarded from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000016' and month_key = '2026-09'), false, 'rank_boundary_50km final: World Crown state');
select is((select count(*)::int from api.monthly_apex_checkpoint_claims where user_id = 'f0000000-0000-4000-8000-000000000016' and month_key = '2026-09'), 21, 'rank_boundary_50km final: total checkpoints claimed');

-- ------------------------------------------------------------------------
-- case: rank_boundary_just_below_50km
-- ------------------------------------------------------------------------
insert into api.profiles (user_id, display_name, user_code, reward_timezone)
values ('f0000000-0000-4000-8000-000000000017', 'Conf 17', 'CONF0017', 'UTC');

-- step 1: 49999 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000017', 49999, '2026-09-01T09:00:00+00'::timestamptz),
    'conf-16-0')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_01_1km","apex_cp_02_2km","apex_cp_03_3km","apex_cp_04_4km","apex_cp_05_5km","apex_cp_06_6km","apex_cp_07_8km","apex_cp_08_10km","apex_cp_09_13km","apex_cp_10_15km","apex_cp_11_18km","apex_cp_12_21km","apex_cp_13_24km","apex_cp_14_27km","apex_cp_15_30km","apex_cp_16_34km","apex_cp_17_37km","apex_cp_18_41km","apex_cp_19_42p195km","apex_cp_20_45km","apex_cp_21_49km"]'::jsonb,
  'rank_boundary_just_below_50km step 1: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'awakening',
  'rank_boundary_just_below_50km step 1: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  49999,
  'rank_boundary_just_below_50km step 1: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'rank_boundary_just_below_50km step 1: over-crown metres match');

select is((select laddered_meters from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000017' and month_key = '2026-09'), 49999, 'rank_boundary_just_below_50km final: laddered metres');
select is((select over_crown_meters from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000017' and month_key = '2026-09'), 0, 'rank_boundary_just_below_50km final: over-crown metres');
select is((select major_rank::text from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000017' and month_key = '2026-09'), 'awakening', 'rank_boundary_just_below_50km final: rank');
select is((select world_crown_awarded from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000017' and month_key = '2026-09'), false, 'rank_boundary_just_below_50km final: World Crown state');
select is((select count(*)::int from api.monthly_apex_checkpoint_claims where user_id = 'f0000000-0000-4000-8000-000000000017' and month_key = '2026-09'), 21, 'rank_boundary_just_below_50km final: total checkpoints claimed');

-- ------------------------------------------------------------------------
-- case: rank_boundary_900km
-- ------------------------------------------------------------------------
insert into api.profiles (user_id, display_name, user_code, reward_timezone)
values ('f0000000-0000-4000-8000-000000000018', 'Conf 18', 'CONF0018', 'UTC');

-- step 1: 900000 m
select set_config('runningup.conf_result',
  private.apply_verified_run_reward(
    pg_temp.conformance_session('f0000000-0000-4000-8000-000000000018', 900000, '2026-09-01T09:00:00+00'::timestamptz),
    'conf-17-0')::text, false);

select is(
  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),
  '["apex_cp_01_1km","apex_cp_02_2km","apex_cp_03_3km","apex_cp_04_4km","apex_cp_05_5km","apex_cp_06_6km","apex_cp_07_8km","apex_cp_08_10km","apex_cp_09_13km","apex_cp_10_15km","apex_cp_11_18km","apex_cp_12_21km","apex_cp_13_24km","apex_cp_14_27km","apex_cp_15_30km","apex_cp_16_34km","apex_cp_17_37km","apex_cp_18_41km","apex_cp_19_42p195km","apex_cp_20_45km","apex_cp_21_49km","apex_cp_22_54km","apex_cp_23_58km","apex_cp_24_63km","apex_cp_25_67km","apex_cp_26_72km","apex_cp_27_77km","apex_cp_28_82km","apex_cp_29_87km","apex_cp_30_93km","apex_cp_31_98km","apex_cp_32_104km","apex_cp_33_110km","apex_cp_34_115km","apex_cp_35_121km","apex_cp_36_127km","apex_cp_37_134km","apex_cp_38_140km","apex_cp_39_146km","apex_cp_40_153km","apex_cp_41_160km","apex_cp_42_166km","apex_cp_43_173km","apex_cp_44_180km","apex_cp_45_187km","apex_cp_46_194km","apex_cp_47_202km","apex_cp_48_209km","apex_cp_49_217km","apex_cp_50_224km","apex_cp_51_232km","apex_cp_52_240km","apex_cp_53_248km","apex_cp_54_256km","apex_cp_55_264km","apex_cp_56_272km","apex_cp_57_281km","apex_cp_58_289km","apex_cp_59_298km","apex_cp_60_306km","apex_cp_61_315km","apex_cp_62_324km","apex_cp_63_333km","apex_cp_64_342km","apex_cp_65_351km","apex_cp_66_360km","apex_cp_67_369km","apex_cp_68_379km","apex_cp_69_388km","apex_cp_70_398km","apex_cp_71_407km","apex_cp_72_417km","apex_cp_73_427km","apex_cp_74_437km","apex_cp_75_447km","apex_cp_76_457km","apex_cp_77_467km","apex_cp_78_478km","apex_cp_79_488km","apex_cp_80_499km","apex_cp_81_509km","apex_cp_82_520km","apex_cp_83_531km","apex_cp_84_541km","apex_cp_85_552km","apex_cp_86_563km","apex_cp_87_574km","apex_cp_88_586km","apex_cp_89_597km","apex_cp_90_608km","apex_cp_91_620km","apex_cp_92_631km","apex_cp_93_643km","apex_cp_94_654km","apex_cp_95_666km","apex_cp_96_678km","apex_cp_97_690km","apex_cp_98_702km","apex_cp_99_714km","apex_cp_100_726km","apex_cp_101_738km","apex_cp_102_751km","apex_cp_103_763km","apex_cp_104_776km","apex_cp_105_788km","apex_cp_106_801km","apex_cp_107_814km","apex_cp_108_826km","apex_cp_109_839km","apex_cp_110_852km","apex_cp_111_865km","apex_cp_112_878km","apex_cp_113_892km"]'::jsonb,
  'rank_boundary_900km step 1: crossed checkpoints match the JS engine');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),
  'apex',
  'rank_boundary_900km step 1: rank matches');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,
  900000,
  'rank_boundary_900km step 1: laddered metres match');
select is(
  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,
  0,
  'rank_boundary_900km step 1: over-crown metres match');

select is((select laddered_meters from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000018' and month_key = '2026-09'), 900000, 'rank_boundary_900km final: laddered metres');
select is((select over_crown_meters from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000018' and month_key = '2026-09'), 0, 'rank_boundary_900km final: over-crown metres');
select is((select major_rank::text from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000018' and month_key = '2026-09'), 'apex', 'rank_boundary_900km final: rank');
select is((select world_crown_awarded from api.monthly_apex_progress where user_id = 'f0000000-0000-4000-8000-000000000018' and month_key = '2026-09'), false, 'rank_boundary_900km final: World Crown state');
select is((select count(*)::int from api.monthly_apex_checkpoint_claims where user_id = 'f0000000-0000-4000-8000-000000000018' and month_key = '2026-09'), 113, 'rank_boundary_900km final: total checkpoints claimed');

select * from finish();
rollback;
