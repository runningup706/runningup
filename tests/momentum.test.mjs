/**
 * Momentum, chain and reward-day acceptance tests — master # 11.7, # 6.3.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  rewardDay, monthKey, emptyMomentum, applyDailyMomentum, applyConsecutiveWeek,
  applyQualityChain, applyLongRunChain, longRunThresholdMeters,
} from '../packages/domain/momentum.mjs';
import { buildPassport } from '../packages/domain/runner-passport.mjs';

test('the reward day is computed in the user timezone from the server timestamp', () => {
  // 2026-07-29T22:30Z is already 2026-07-30 in Seoul (UTC+9) but still the 29th in London.
  assert.equal(rewardDay('2026-07-29T22:30:00Z', 'Asia/Seoul'), '2026-07-30');
  assert.equal(rewardDay('2026-07-29T22:30:00Z', 'Europe/London'), '2026-07-29');
  assert.equal(rewardDay('2026-07-29T22:30:00Z', 'America/Los_Angeles'), '2026-07-29');
});

test('a cross-midnight run belongs to exactly one reward day, its start day', () => {
  const startedAt = '2026-07-29T14:40:00Z';   // 23:40 Seoul
  const day = rewardDay(startedAt, 'Asia/Seoul');
  assert.equal(day, '2026-07-29');
  // The finish time crosses midnight but must not create a second reward day.
  assert.equal(rewardDay(startedAt, 'Asia/Seoul'), day);
});

test('the month key partitions the Monthly Apex ladder in the user timezone', () => {
  assert.equal(monthKey('2026-07-31T16:00:00Z', 'Asia/Seoul'), '2026-08');
  assert.equal(monthKey('2026-07-31T16:00:00Z', 'UTC'), '2026-07');
});

test('several verified runs on one reward day advance the streak exactly once', () => {
  let state = emptyMomentum();
  const first = applyDailyMomentum(state, '2026-07-29');
  assert.equal(first.incremented, true);
  assert.equal(first.state.current_streak, 1);

  const second = applyDailyMomentum(first.state, '2026-07-29');
  assert.equal(second.incremented, false);
  assert.equal(second.reason, 'same_reward_day_already_counted');
  assert.equal(second.state.current_streak, 1, 'the streak stays at one for the same day');
});

test('consecutive days build the streak and reach milestones once', () => {
  let state = emptyMomentum();
  const days = ['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04', '2026-07-05'];
  const milestones = [];
  for (const day of days) {
    const r = applyDailyMomentum(state, day);
    state = r.state;
    milestones.push(...r.new_milestones);
  }
  assert.equal(state.current_streak, 5);
  assert.equal(state.best_streak, 5);
  assert.deepEqual(milestones, [2, 3, 5]);

  // Re-running the same day cannot re-award a milestone.
  const again = applyDailyMomentum(state, '2026-07-05');
  assert.deepEqual(again.new_milestones, []);
});

test('a missed day resets only the current streak; the lifetime best survives', () => {
  let state = emptyMomentum();
  for (const day of ['2026-07-01', '2026-07-02', '2026-07-03']) {
    state = applyDailyMomentum(state, day).state;
  }
  assert.equal(state.current_streak, 3);

  const afterGap = applyDailyMomentum(state, '2026-07-06');
  assert.equal(afterGap.reset, true);
  assert.equal(afterGap.state.current_streak, 1, 'the current streak restarts');
  assert.equal(afterGap.state.best_streak, 3, 'the lifetime best is never clawed back');
});

test('an out-of-order backfill does not rewrite the streak head', () => {
  let state = emptyMomentum();
  state = applyDailyMomentum(state, '2026-07-10').state;
  const backfill = applyDailyMomentum(state, '2026-07-05');
  assert.equal(backfill.incremented, false);
  assert.equal(backfill.reason, 'out_of_order_backfill');
  assert.equal(backfill.state.last_reward_day, '2026-07-10');
});

test('the weekly goal is the user own choice and each shape is honoured', () => {
  const start = { current_weeks: 0, best_weeks: 0, last_week_key: null };
  const distance = applyConsecutiveWeek(start, { week_key: '2026-W30', goal_kind: 'distance', achieved_meters: 30_000, target_meters: 25_000 });
  assert.equal(distance.met, true);
  assert.equal(distance.state.current_weeks, 1);

  const sessions = applyConsecutiveWeek(distance.state, { week_key: '2026-W31', goal_kind: 'sessions', achieved_sessions: 3, target_sessions: 3 });
  assert.equal(sessions.state.current_weeks, 2, 'changing the goal shape does not break the chain');

  const missed = applyConsecutiveWeek(sessions.state, { week_key: '2026-W32', goal_kind: 'distance', achieved_meters: 5_000, target_meters: 25_000 });
  assert.equal(missed.met, false);
  assert.equal(missed.state.current_weeks, 0);
  assert.equal(missed.state.best_weeks, 2, 'the best week count is preserved');
});

test('a beginner and a marathoner both meet their OWN weekly goal', () => {
  const start = { current_weeks: 0, best_weeks: 0, last_week_key: null };
  const beginner = applyConsecutiveWeek(start, { week_key: '2026-W30', goal_kind: 'sessions', achieved_sessions: 2, target_sessions: 2 });
  const marathoner = applyConsecutiveWeek(start, { week_key: '2026-W30', goal_kind: 'distance', achieved_meters: 90_000, target_meters: 80_000 });
  assert.equal(beginner.met, true);
  assert.equal(marathoner.met, true);
});

test('the quality chain requires a PLANNED structured session that was completed', () => {
  let state = { current: 0, best: 0 };
  state = applyQualityChain(state, { planned_style_id: 's_intervals', structured_completed: true }).state;
  state = applyQualityChain(state, { planned_style_id: 's_tempo', structured_completed: true }).state;
  assert.equal(state.current, 2);

  const unplanned = applyQualityChain(state, { planned_style_id: 's_free', structured_completed: true });
  assert.equal(unplanned.qualified, false, 'a fast free run is not a quality session');
  assert.equal(unplanned.state.current, 0);
  assert.equal(unplanned.state.best, 2);
});

test('the long-run threshold is relative to the runner, so a beginner can earn it too', () => {
  const beginner = buildPassport({ self_selected_experience: 'new_to_running', recent_runs: [] });
  const marathoner = buildPassport({
    self_selected_experience: 'marathon',
    recent_runs: [
      { meters: 42_195, seconds: 14_400, verified: true },
      { meters: 35_000, seconds: 12_000, verified: true },
      { meters: 32_000, seconds: 11_000, verified: true },
      { meters: 30_000, seconds: 10_200, verified: true },
    ],
  });

  const beginnerThreshold = longRunThresholdMeters(beginner);
  const marathonThreshold = longRunThresholdMeters(marathoner);
  assert.ok(beginnerThreshold <= 3_000, 'a beginner long run must be reachable');
  assert.ok(marathonThreshold > 25_000, 'a marathoner long run is a real long run');

  const beginnerLong = applyLongRunChain({ current: 0, best: 0 }, { distance_meters: 3_000 }, beginner);
  assert.equal(beginnerLong.qualified, true);

  const marathonerShort = applyLongRunChain({ current: 2, best: 2 }, { distance_meters: 3_000 }, marathoner);
  assert.equal(marathonerShort.qualified, false);
  assert.equal(marathonerShort.state.best, 2, 'the best chain is retained after a break');
});
