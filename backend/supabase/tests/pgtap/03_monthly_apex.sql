-- pgTAP: Monthly Apex 0..1000 km — the direction-lock DL-1 suite.
-- Master # 22.3 / # 22.7, audit 3. Every case the master enumerates is attacked here
-- against the real transaction, not against a mock.
begin;
select plan(45);

-- ---------------------------------------------------------------------------
-- Ladder shape
-- ---------------------------------------------------------------------------
select is(
  (select count(*)::int from api.monthly_apex_checkpoints where ladder_version = 'apex.v1.0.0'),
  121, 'the seeded ladder has exactly 121 checkpoints');

select is(
  (select max(threshold_meters) from api.monthly_apex_checkpoints where ladder_version = 'apex.v1.0.0'),
  1000000, 'the highest checkpoint is exactly 1000 km');

select is(
  (select count(*)::int from api.monthly_apex_checkpoints where threshold_meters > 1000000),
  0, 'no checkpoint exists above 1000 km');

select is(
  (select count(*)::int from api.monthly_apex_checkpoints where is_final),
  1, 'exactly one checkpoint is marked final');

select ok(
  exists(select 1 from api.monthly_apex_checkpoints where threshold_meters = 42195),
  'the 42.195 km marathon checkpoint exists with exact precision');

select ok(
  (select count(*) from api.monthly_apex_checkpoints where threshold_meters in (41000, 45000)) = 2,
  'the marathon sits between the 41 km and 45 km checkpoints');

-- The enum IS the rank order: world_crown must be the last value.
select is(
  (select enumlabel from pg_enum e join pg_type t on t.oid = e.enumtypid
   where t.typname = 'apex_rank' order by e.enumsortorder desc limit 1),
  'world_crown', 'world_crown is the highest value of the apex_rank enum');

select is(
  (select count(*)::int from pg_enum e join pg_type t on t.oid = e.enumtypid
   where t.typname = 'apex_rank'),
  12, '11 major ranks plus World Crown');

-- ---------------------------------------------------------------------------
-- Constraints reject a forbidden tier outright
-- ---------------------------------------------------------------------------
select throws_ok(
  $$ insert into api.monthly_apex_checkpoints
     (checkpoint_id, ladder_version, index, threshold_meters, major_rank, reward_bundle_id,
      story_or_world_effect, name_key, is_final, content_version)
     values ('apex_cp_53_1250km', 'apex.v1.0.0', 53, 1250000, 'world_crown', 'b', 'e', 'k', false, '1.0.0') $$,
  '23514', null, 'a 1250 km checkpoint is rejected by CHECK constraint');

select throws_ok(
  $$ insert into api.monthly_apex_definitions
     (ladder_version, final_checkpoint_meters, checkpoint_count, content_version)
     values ('apex.endless', 2000000, 60, '1.0.0') $$,
  '23514', null, 'a ladder whose final checkpoint is 2000 km is rejected');

select throws_ok(
  $$ insert into api.monthly_apex_definitions
     (ladder_version, final_checkpoint_meters, checkpoint_count, content_version)
     values ('apex.sparse', 1000000, 12, '1.0.0') $$,
  '23514', null, 'a ladder with fewer than 52 checkpoints is rejected');

-- ---------------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------------
insert into api.profiles (user_id, display_name, user_code, reward_timezone) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Apex Tester', 'APEX0001', 'Asia/Seoul');

create or replace function pg_temp.make_session(
  p_user uuid, p_meters integer, p_started timestamptz, p_grade private.verification_grade default 'A'
) returns uuid language plpgsql as $$
declare v_id uuid;
begin
  insert into api.run_sessions (user_id, activity_type, started_at, ended_at,
                                distance_meters, moving_seconds, elapsed_seconds, server_nonce)
  values (p_user, 'road', p_started, p_started + interval '1 hour',
          p_meters, greatest(p_meters / 3, 1), greatest(p_meters / 3, 1), gen_random_uuid()::text)
  returning id into v_id;

  insert into private.run_verifications (session_id, grade, status)
  values (v_id, p_grade, case when p_grade in ('A','B','C') then 'verified' else 'rejected' end::private.verification_status);
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- First run of a month claims the journey-start checkpoint
-- ---------------------------------------------------------------------------
select is(
  jsonb_array_length(
    (private.apply_verified_run_reward(
      pg_temp.make_session('aaaaaaaa-0000-0000-0000-000000000001', 5200, '2026-03-02T09:00:00+09'),
      'run-1') -> 'crossed_checkpoint_ids')),
  5, 'a first 5.2 km run crosses 1, 2, 3, 4 and 5 km');

select is(
  (select laddered_meters from api.monthly_apex_progress
   where user_id = 'aaaaaaaa-0000-0000-0000-000000000001' and month_key = '2026-03'),
  5200, 'the ladder records the exact integer metres');

-- ---------------------------------------------------------------------------
-- Idempotency: a retried upload never pays twice
-- ---------------------------------------------------------------------------
select is(
  (private.apply_verified_run_reward(
     (select id from api.run_sessions where user_id = 'aaaaaaaa-0000-0000-0000-000000000001' limit 1),
     'run-1') ->> 'status'),
  'already_applied', 'replaying the same idempotency key returns the original result');

select is(
  (select count(*)::int from api.xp_ledger where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  1, 'and creates no second ledger entry');

select is(
  (select laddered_meters from api.monthly_apex_progress
   where user_id = 'aaaaaaaa-0000-0000-0000-000000000001' and month_key = '2026-03'),
  5200, 'and adds no distance');

-- ---------------------------------------------------------------------------
-- Several runs on one reward day: streak once, reward every time
-- ---------------------------------------------------------------------------
select is(
  (private.apply_verified_run_reward(
     pg_temp.make_session('aaaaaaaa-0000-0000-0000-000000000001', 4800, '2026-03-02T19:00:00+09'),
     'run-2') ->> 'daily_streak_after')::int,
  1, 'a second run on the same reward day does not advance the streak');

select is(
  (select count(*)::int from api.xp_ledger where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  2, 'but it still receives its own ledger entry');

select ok(
  (select final_amount from api.xp_ledger
   where user_id = 'aaaaaaaa-0000-0000-0000-000000000001' and idempotency_key = 'run-2') > 0,
  'and its own positive reward');

select is(
  (select session_count from api.run_reward_days
   where user_id = 'aaaaaaaa-0000-0000-0000-000000000001' and reward_day = '2026-03-02'),
  2, 'the reward day counts both sessions');

-- Next calendar day advances the streak to 2.
select is(
  (private.apply_verified_run_reward(
     pg_temp.make_session('aaaaaaaa-0000-0000-0000-000000000001', 5000, '2026-03-03T09:00:00+09'),
     'run-3') ->> 'daily_streak_after')::int,
  2, 'a run on the following day advances the streak');

-- ---------------------------------------------------------------------------
-- Multi-checkpoint crossing in one session, ascending and gapless
-- ---------------------------------------------------------------------------
select is(
  jsonb_array_length(
    (private.apply_verified_run_reward(
      pg_temp.make_session('aaaaaaaa-0000-0000-0000-000000000001', 85000, '2026-03-04T09:00:00+09'),
      'run-4') -> 'crossed_checkpoint_ids')),
  21, 'from 15 km, a single 85 km session crosses the 21 checkpoints in (15 km, 100 km]');

select is(
  (select count(*)::int from api.monthly_apex_checkpoint_claims
   where user_id = 'aaaaaaaa-0000-0000-0000-000000000001' and month_key = '2026-03'),
  (select count(*)::int from api.monthly_apex_checkpoints c
   where c.ladder_version = 'apex.v1.0.0'
     and c.threshold_meters <= (select laddered_meters from api.monthly_apex_progress
                                where user_id = 'aaaaaaaa-0000-0000-0000-000000000001' and month_key = '2026-03')),
  'every checkpoint at or below the current distance is claimed, none skipped');

select is(
  (select count(*)::int from (
     select checkpoint_id from api.monthly_apex_checkpoint_claims
     where user_id = 'aaaaaaaa-0000-0000-0000-000000000001' and month_key = '2026-03'
     group by checkpoint_id having count(*) > 1) d),
  0, 'no checkpoint is claimed twice');

-- ---------------------------------------------------------------------------
-- 999.999 km -> exactly 1000.000 km
-- ---------------------------------------------------------------------------
insert into api.profiles (user_id, display_name, user_code, reward_timezone) values
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Crown Tester', 'APEX0002', 'Asia/Seoul');

select is(
  (private.apply_verified_run_reward(
     pg_temp.make_session('aaaaaaaa-0000-0000-0000-000000000002', 999999, '2026-04-01T09:00:00+09'),
     'crown-1') ->> 'major_rank'),
  'apex', 'at 999.999 km the rank is Apex, not World Crown');

select is(
  (select world_crown_awarded from api.monthly_apex_progress
   where user_id = 'aaaaaaaa-0000-0000-0000-000000000002' and month_key = '2026-04'),
  false, 'and the crown has not been awarded');

select is(
  (private.apply_verified_run_reward(
     pg_temp.make_session('aaaaaaaa-0000-0000-0000-000000000002', 1, '2026-04-02T09:00:00+09'),
     'crown-2') ->> 'world_crown_awarded_now'),
  'true', 'one further metre reaches exactly 1000 km and awards the World Crown');

select is(
  (select count(*)::int from api.world_crown_history
   where user_id = 'aaaaaaaa-0000-0000-0000-000000000002' and month_key = '2026-04'),
  1, 'the World Crown is recorded exactly once');

select is(
  (select count(*)::int from api.apex_boss_unlocks
   where user_id = 'aaaaaaaa-0000-0000-0000-000000000002' and month_key = '2026-04'),
  1, 'the Apex Axis boss unlocks exactly once');

-- ---------------------------------------------------------------------------
-- Beyond the crown: reward continues, ladder does not
-- ---------------------------------------------------------------------------
select is(
  jsonb_array_length(
    (private.apply_verified_run_reward(
      pg_temp.make_session('aaaaaaaa-0000-0000-0000-000000000002', 25000, '2026-04-03T09:00:00+09'),
      'crown-3') -> 'crossed_checkpoint_ids')),
  0, 'a run past 1000 km crosses no new checkpoint');

select is(
  (select over_crown_meters from api.monthly_apex_progress
   where user_id = 'aaaaaaaa-0000-0000-0000-000000000002' and month_key = '2026-04'),
  25000, 'the surplus is recorded as over-crown distance');

select is(
  (select laddered_meters from api.monthly_apex_progress
   where user_id = 'aaaaaaaa-0000-0000-0000-000000000002' and month_key = '2026-04'),
  1000000, 'the ladder stays frozen at exactly 1000 km');

select ok(
  (select final_amount from api.xp_ledger
   where user_id = 'aaaaaaaa-0000-0000-0000-000000000002' and idempotency_key = 'crown-3') > 0,
  'and the ordinary per-run reward is still paid in full');

select is(
  (select major_rank::text from api.monthly_apex_progress
   where user_id = 'aaaaaaaa-0000-0000-0000-000000000002' and month_key = '2026-04'),
  'world_crown', 'the rank never rises above World Crown');

select is(
  (select monthly_multiplier from api.xp_ledger
   where user_id = 'aaaaaaaa-0000-0000-0000-000000000002' and idempotency_key = 'crown-3'),
  1.25::numeric, 'the multiplier is flat at the crown value');

select is(
  (select count(*)::int from api.world_crown_history
   where user_id = 'aaaaaaaa-0000-0000-0000-000000000002'),
  1, 'no second crown is awarded for running further');

-- A single session that blows straight past the crown claims all 52 and no more.
insert into api.profiles (user_id, display_name, user_code, reward_timezone) values
  ('aaaaaaaa-0000-0000-0000-000000000003', 'Overshoot', 'APEX0003', 'Asia/Seoul');

select is(
  jsonb_array_length(
    (private.apply_verified_run_reward(
      pg_temp.make_session('aaaaaaaa-0000-0000-0000-000000000003', 1200000, '2026-05-01T09:00:00+09'),
      'over-1') -> 'crossed_checkpoint_ids')),
  121, 'a single 1200 km session claims all 121 checkpoints exactly once');

select is(
  (select over_crown_meters from api.monthly_apex_progress
   where user_id = 'aaaaaaaa-0000-0000-0000-000000000003' and month_key = '2026-05'),
  200000, 'and banks the 200 km surplus as over-crown distance');

-- ---------------------------------------------------------------------------
-- Month boundary in the user timezone, and a fresh ladder next month
-- ---------------------------------------------------------------------------
select is(
  private.month_key('2026-03-31T16:00:00Z', 'Asia/Seoul'),
  '2026-04', 'a run at 16:00 UTC on 31 March belongs to April in Seoul');

select is(
  private.month_key('2026-03-31T16:00:00Z', 'UTC'),
  '2026-03', 'and to March in UTC');

select is(
  (private.apply_verified_run_reward(
     pg_temp.make_session('aaaaaaaa-0000-0000-0000-000000000002', 3000, '2026-05-01T09:00:00+09'),
     'newmonth-1') ->> 'major_rank'),
  'awakening', 'the next month starts again from Awakening');

select is(
  (select count(*)::int from api.monthly_apex_progress
   where user_id = 'aaaaaaaa-0000-0000-0000-000000000002'),
  2, 'each month keeps its own ladder row');

-- ---------------------------------------------------------------------------
-- Rejected and non-running-grade sessions never move the ladder
-- ---------------------------------------------------------------------------
insert into api.profiles (user_id, display_name, user_code) values
  ('aaaaaaaa-0000-0000-0000-000000000004', 'Grade Tester', 'APEX0004');

select is(
  (private.apply_verified_run_reward(
     pg_temp.make_session('aaaaaaaa-0000-0000-0000-000000000004', 10000, '2026-06-01T09:00:00+09', 'X'),
     'graded-x') ->> 'core_power_eligible'),
  'false', 'a grade X source is not core-power eligible');

select is(
  (select laddered_meters from api.monthly_apex_progress
   where user_id = 'aaaaaaaa-0000-0000-0000-000000000004' and month_key = '2026-06'),
  0, 'and contributes no monthly distance');

select is(
  (select final_amount from api.xp_ledger
   where user_id = 'aaaaaaaa-0000-0000-0000-000000000004' and idempotency_key = 'graded-x'),
  0::numeric, 'and grants zero Fitness XP');

select * from finish();
rollback;
