/**
 * Reward engine acceptance tests — master # 11.6 invariants, # 22.3 "Reward·성장", audit 3.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateRunReward, monthlyMultiplier, assertNoForbiddenInput } from '../lib/reward.mjs';
import { FORBIDDEN_ACTIVITY_TYPES, REWARD_FORMULA_VERSION } from '../lib/constants.mjs';

const baseContext = {
  personal_baseline_speed: null,
  laddered_meters_before: 0,
  laddered_meters_after: 10_000,
  crossed_checkpoint_count: 0,
  daily_momentum_days: 0,
  consecutive_weeks: 0,
  quality_chain_length: 0,
  long_run_chain_length: 0,
  weekly_volume_meters_after: 10_000,
};

const session = (over = {}) => ({
  activity_type: 'road',
  distance_meters: 10_000,
  moving_seconds: 3_000,
  verification_grade: 'A',
  style_id: 's_steady',
  ...over,
});

test('every component is reported separately and the parts sum to the subtotal', () => {
  const r = calculateRunReward(session(), baseContext);
  const expectedKeys = [
    'base_distance_xp', 'base_moving_time_xp', 'distance_specific_performance',
    'personal_improvement', 'goal_completion', 'structured_execution', 'split_consistency',
    'long_run_relative', 'daily_momentum', 'consecutive_week', 'quality_session_chain',
    'long_run_chain', 'weekly_volume', 'monthly_apex_checkpoint', 'quest_event',
  ];
  assert.deepEqual(Object.keys(r.components), expectedKeys);
  const sum = Object.values(r.components).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - r.subtotal) < 0.01, 'components must sum to the subtotal');
  assert.ok(Math.abs(r.subtotal * r.monthly_multiplier - r.total_fitness_xp) < 0.05);
  assert.equal(r.formula_version, REWARD_FORMULA_VERSION);
  for (const key of expectedKeys) {
    assert.ok(Object.hasOwn(r.explanation, key), `missing explanation for ${key}`);
  }
});

test('more verified distance never reduces the base reward (monotonicity)', () => {
  let previous = -1;
  for (const meters of [400, 1_000, 5_000, 10_000, 21_097, 42_195, 50_000]) {
    const r = calculateRunReward(
      session({ distance_meters: meters, moving_seconds: Math.round(meters / 3.2) }),
      { ...baseContext, laddered_meters_after: meters },
    );
    assert.ok(r.components.base_distance_xp > previous, `base must grow with distance at ${meters}`);
    previous = r.components.base_distance_xp;
  }
});

test('a very short verified run still earns a positive base reward', () => {
  const r = calculateRunReward(
    session({ distance_meters: 400, moving_seconds: 150 }),
    { ...baseContext, laddered_meters_after: 400 },
  );
  assert.ok(r.components.base_distance_xp > 0);
  assert.ok(r.components.base_moving_time_xp > 0);
  assert.ok(r.total_fitness_xp > 0, 'a short run is never worth zero');
});

test('same 10 km, different finishing times: identical base, different performance bonus', () => {
  const fast = calculateRunReward(session({ moving_seconds: 2_700 }), baseContext); // 45:00
  const slow = calculateRunReward(session({ moving_seconds: 3_000 }), baseContext); // 50:00

  assert.equal(fast.components.base_distance_xp, slow.components.base_distance_xp);
  assert.ok(fast.components.base_moving_time_xp < slow.components.base_moving_time_xp,
    'more moving time earns more time base');
  assert.ok(fast.components.distance_specific_performance > slow.components.distance_specific_performance,
    'the faster 10 km earns the larger distance-specific performance bonus');
});

test('a slower runner who is improving earns a personal improvement bonus the faster one does not', () => {
  const improving = calculateRunReward(
    session({ moving_seconds: 3_000 }),                      // 50:00 now
    { ...baseContext, personal_baseline_speed: 10_000 / 3_480 }, // was 58:00
  );
  const plateaued = calculateRunReward(
    session({ moving_seconds: 2_700 }),                      // 45:00 now
    { ...baseContext, personal_baseline_speed: 10_000 / 2_690 }, // was 44:50
  );
  assert.ok(improving.components.personal_improvement > 0);
  assert.equal(plateaued.components.personal_improvement, 0);
  assert.ok(improving.components.personal_improvement > plateaued.components.personal_improvement,
    'personal improvement is rewarded independently of absolute speed');
});

test('several runs on the same day each earn a full base reward', () => {
  const morning = calculateRunReward(session({ distance_meters: 5_000, moving_seconds: 1_500 }),
    { ...baseContext, laddered_meters_after: 5_000, daily_momentum_days: 3 });
  const evening = calculateRunReward(session({ distance_meters: 5_000, moving_seconds: 1_500 }),
    { ...baseContext, laddered_meters_before: 5_000, laddered_meters_after: 10_000, daily_momentum_days: 3 });

  assert.ok(morning.components.base_distance_xp > 0);
  assert.equal(evening.components.base_distance_xp, morning.components.base_distance_xp,
    'the second session of the day is not discounted');
});

test('DL-1: beyond the crown the base reward continues and the checkpoint component is zero', () => {
  const beyond = calculateRunReward(session({ distance_meters: 15_000, moving_seconds: 4_500 }), {
    ...baseContext,
    laddered_meters_before: 1_000_000,
    laddered_meters_after: 1_000_000,
    crossed_checkpoint_count: 0,
  });
  assert.ok(beyond.components.base_distance_xp > 0, 'base distance reward survives past 1000 km');
  assert.ok(beyond.components.base_moving_time_xp > 0);
  assert.equal(beyond.components.monthly_apex_checkpoint, 0, 'no new checkpoint above 1000 km');
  assert.equal(beyond.monthly_rank, 'world_crown');
  assert.equal(beyond.over_crown_session, true);
});

test('DL-1: the monthly multiplier is flat at and above the World Crown', () => {
  const crown = monthlyMultiplier(1_000_000);
  assert.equal(monthlyMultiplier(1_500_000), crown, 'no extra multiplier above 1000 km');
  assert.equal(monthlyMultiplier(9_999_999), crown);
  assert.ok(monthlyMultiplier(900_000) < crown, 'the crown is genuinely the top of the ladder');
  let previous = 0;
  for (const m of [0, 50_000, 100_000, 200_000, 300_000, 400_000, 500_000, 600_000, 700_000, 800_000, 900_000, 1_000_000]) {
    const v = monthlyMultiplier(m);
    assert.ok(v >= previous, 'the multiplier never regresses');
    previous = v;
  }
});

test('DL-3: every forbidden reward input is rejected, not silently ignored', () => {
  const forbidden = [
    'elevation_gain', 'elevation_gain_meters', 'ascent', 'altitude_bonus', 'trail', 'hiking',
    'cycling', 'climbing', 'weather', 'weather_multiplier', 'is_night', 'night_bonus',
    'paid_multiplier', 'purchase_bonus', 'ad_bonus', 'referral_bonus', 'idle_bonus',
    'login_day_bonus', 'vip_level',
  ];
  for (const key of forbidden) {
    assert.throws(
      () => calculateRunReward(session({ [key]: 123 }), baseContext),
      /forbidden reward input/,
      `${key} must be rejected`,
    );
  }
});

test('DL-3: non-running activity types can never produce a running reward', () => {
  for (const activity of FORBIDDEN_ACTIVITY_TYPES) {
    assert.throws(
      () => calculateRunReward(session({ activity_type: activity }), baseContext),
      /not a running activity/,
      `${activity} must be rejected`,
    );
  }
  for (const allowed of ['road', 'track', 'treadmill', 'indoor']) {
    assert.doesNotThrow(() => assertNoForbiddenInput(session({ activity_type: allowed })));
  }
});

test('DL-5: manual-only and non-running grades contribute zero core power', () => {
  for (const grade of ['D', 'X']) {
    const r = calculateRunReward(session({ verification_grade: grade }), baseContext);
    assert.equal(r.core_power_eligible, false);
    assert.equal(r.total_fitness_xp, 0, `grade ${grade} must not grant Fitness XP`);
    assert.equal(Object.values(r.components).reduce((a, b) => a + b, 0), 0);
  }
  for (const grade of ['A', 'B', 'C']) {
    const r = calculateRunReward(session({ verification_grade: grade }), baseContext);
    assert.ok(r.total_fitness_xp > 0, `grade ${grade} must grant Fitness XP`);
  }
});

test('goal completion is a bonus, and missing the goal never zeroes the run', () => {
  const met = calculateRunReward(
    session({ goal: { goal_type: 'distance', target_meters: 10_000 } }), baseContext);
  const missed = calculateRunReward(
    session({ distance_meters: 8_000, moving_seconds: 2_400, goal: { goal_type: 'distance', target_meters: 10_000 } }),
    { ...baseContext, laddered_meters_after: 8_000 });

  assert.ok(met.components.goal_completion > 0);
  assert.equal(missed.components.goal_completion, 0);
  assert.ok(missed.total_fitness_xp > 0, 'an unfinished goal still pays for the distance actually run');
});

test('a structured session only earns the execution bonus when it was planned AND completed', () => {
  const planned = calculateRunReward(session({ style_id: 's_intervals', structured_completed: true }), baseContext);
  const abandoned = calculateRunReward(session({ style_id: 's_intervals', structured_completed: false }), baseContext);
  const fastButUnplanned = calculateRunReward(session({ style_id: 's_free', moving_seconds: 2_400, structured_completed: true }), baseContext);

  assert.ok(planned.components.structured_execution > 0);
  assert.equal(abandoned.components.structured_execution, 0);
  assert.equal(fastButUnplanned.components.structured_execution, 0,
    'a merely fast free run is never reclassified as a quality session');
});

test('the same input snapshot reproduces the same reward (determinism)', () => {
  const a = calculateRunReward(session(), baseContext);
  const b = calculateRunReward(session(), baseContext);
  assert.deepEqual(a, b);
});
