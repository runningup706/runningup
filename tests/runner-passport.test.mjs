/**
 * Runner Passport acceptance tests — master # 22.3 "Runner Passport" and audit 2.
 *
 * The whole point of this suite is to prove DL-2: nothing here may ever force a beginner
 * funnel on an experienced runner, and nothing may ever hide a goal, continent or
 * character behind a lower-distance prerequisite.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPassport, recommend, selectGoal, recalculate } from '../packages/domain/runner-passport.mjs';
import { GOAL_DISTANCES, GOAL_DURATIONS, SESSION_STYLES } from '../packages/domain/constants.mjs';

const run = (km, minutes, extra = {}) => ({
  meters: Math.round(km * 1000),
  seconds: Math.round(minutes * 60),
  activity_type: 'road',
  verified: true,
  ...extra,
});

/** The eight independent first-session fixtures the master requires. */
const FIXTURES = {
  beginner_no_history: { self_selected_experience: 'new_to_running', recent_runs: [] },
  starter_3k_5k: { self_selected_experience: 'regular_3k_to_5k', recent_runs: [run(3, 21), run(4, 28), run(3.5, 25), run(3, 22)] },
  regular_5k: { self_selected_experience: 'regular_3k_to_5k', recent_runs: [run(5, 30), run(5.2, 31), run(4.8, 29), run(5, 30), run(5.1, 30)] },
  regular_10k: { self_selected_experience: 'regular_5k_to_10k', recent_runs: [run(10, 55), run(8, 44), run(10, 54), run(6, 33), run(10, 56)] },
  endurance_20k_half: { self_selected_experience: 'half_marathon', recent_runs: [run(21.1, 115), run(15, 82), run(20, 110), run(12, 66), run(21.1, 118)] },
  marathon: { self_selected_experience: 'marathon', recent_runs: [run(42.195, 240), run(32, 180), run(30, 168), run(25, 138), run(35, 200)] },
  ultra_50k_custom: { self_selected_experience: 'advanced_custom', recent_runs: [run(50, 330), run(45, 295), run(60, 400), run(50, 325)] },
};

test('fixture A — no history, complete beginner: time and run-walk first, world still open', () => {
  const p = buildPassport(FIXTURES.beginner_no_history);
  const r = recommend(p);
  assert.equal(p.band, 'R0');
  assert.ok(r.recommended_style_ids.includes('s_run_walk'));
  assert.ok(r.recommended_duration_goal_ids.includes('t_10min'));
  assert.ok(r.recommended_distance_goal_ids.some((id) => ['d_400m', 'd_800m', 'd_1km'].includes(id)));
  assert.equal(r.recommended_lane, 'journey');
  // The beginner sees exactly the same world and roster as everyone else.
  assert.deepEqual(r.locked_continent_ids, []);
  assert.deepEqual(r.locked_character_ids, []);
});

test('fixture B — 3-4 km starter gets 2/3/5 km candidates', () => {
  const p = buildPassport(FIXTURES.starter_3k_5k);
  assert.equal(p.band, 'R1');
  const r = recommend(p);
  assert.deepEqual(r.recommended_distance_goal_ids, ['d_2km', 'd_3km', 'd_5km']);
});

test('fixture B2 — a recent 5 km runner gets 5/8/10 km candidates (master # 22.3)', () => {
  const p = buildPassport(FIXTURES.regular_5k);
  assert.equal(p.band, 'R2');
  const r = recommend(p);
  assert.deepEqual(r.recommended_distance_goal_ids, ['d_5km', 'd_8km', 'd_10km']);
});

test('fixture C — recent 10 km runner gets 10/12/15/20 km candidates', () => {
  const p = buildPassport(FIXTURES.regular_10k);
  assert.equal(p.band, 'R3');
  const r = recommend(p);
  assert.deepEqual(r.recommended_distance_goal_ids, ['d_10km', 'd_12km', 'd_15km', 'd_20km']);
});

test('fixture D — recent half-marathon runner gets 15/20/half/25 km candidates', () => {
  const p = buildPassport(FIXTURES.endurance_20k_half);
  assert.equal(p.band, 'R5');
  const r = recommend(p);
  assert.deepEqual(r.recommended_distance_goal_ids, ['d_15km', 'd_20km', 'd_half', 'd_25km']);
});

test('fixture E — marathon runner gets half/25/30/32/35/marathon, never a 1 km tutorial', () => {
  const p = buildPassport(FIXTURES.marathon);
  assert.equal(p.band, 'R6');
  const r = recommend(p);
  assert.deepEqual(r.recommended_distance_goal_ids, ['d_half', 'd_25km', 'd_30km', 'd_32km', 'd_35km', 'd_marathon']);
  assert.ok(!r.recommended_distance_goal_ids.includes('d_1km'));
  assert.equal(r.recommended_lane, 'legend');
});

test('fixture F — 50 km / custom runner gets ultra candidates', () => {
  const p = buildPassport(FIXTURES.ultra_50k_custom);
  assert.equal(p.band, 'R7');
  const r = recommend(p);
  assert.ok(r.recommended_distance_goal_ids.includes('d_50km'));
  assert.ok(r.recommended_distance_goal_ids.includes('d_custom'));
});

test('DL-2: every fixture may select ANY goal on day one, with no prerequisite', () => {
  const everyDistance = GOAL_DISTANCES.map((d) => d.id);
  for (const [name, input] of Object.entries(FIXTURES)) {
    const p = buildPassport(input);
    const r = recommend(p);

    assert.equal(r.full_library_available, true, `${name}: full library must be available`);
    assert.deepEqual(r.prerequisites, [], `${name}: no prerequisites allowed`);
    assert.deepEqual(r.locked_goal_ids, [], `${name}: no goal may be locked`);
    assert.deepEqual(p.restrictions, [], `${name}: a passport may never carry a restriction`);
    assert.deepEqual(r.all_distance_goal_ids, everyDistance, `${name}: whole distance library offered`);

    for (const goalId of everyDistance) {
      const choice = goalId === 'd_custom'
        ? { goal_type: 'distance', goal_id: goalId, custom_meters: 33_333 }
        : { goal_type: 'distance', goal_id: goalId };
      const sel = selectGoal(p, choice);
      assert.equal(sel.accepted, true, `${name} must be allowed to pick ${goalId} on day one`);
    }
    for (const dur of GOAL_DURATIONS.map((d) => d.id)) {
      const choice = dur === 't_custom'
        ? { goal_type: 'duration', goal_id: dur, custom_seconds: 5_000 }
        : { goal_type: 'duration', goal_id: dur };
      assert.equal(selectGoal(p, choice).accepted, true, `${name} must be allowed to pick ${dur}`);
    }
  }
});

test('fixture H — a zero-history user may choose the marathon immediately and it is saved', () => {
  const p = buildPassport(FIXTURES.beginner_no_history);
  const sel = selectGoal(p, { goal_type: 'distance', goal_id: 'd_marathon', lane_id: 'legend' });
  assert.equal(sel.accepted, true);
  assert.equal(sel.goal_id, 'd_marathon');
  assert.equal(sel.lane_id, 'legend', 'the user picked the lane, not the passport');
  assert.equal(sel.overrode_recommendation, true, 'recorded as an override for analytics only');
});

test('a marathon runner may deliberately choose 400 m without being demoted', () => {
  const p = buildPassport(FIXTURES.marathon);
  const sel = selectGoal(p, { goal_type: 'distance', goal_id: 'd_400m' });
  assert.equal(sel.accepted, true);
  assert.equal(sel.passport_band_at_selection, 'R6', 'the band is unchanged by a short goal');
});

test('every session style, including custom and treadmill, is selectable by anyone', () => {
  const p = buildPassport(FIXTURES.beginner_no_history);
  for (const style of SESSION_STYLES) {
    const sel = selectGoal(p, { goal_type: 'distance', goal_id: 'd_5km', style_id: style.id });
    assert.equal(sel.style_id, style.id);
  }
});

test('one outlier run does not pollute the baseline', () => {
  const consistent5k = [run(5, 30), run(5.2, 31), run(4.8, 29), run(5, 30), run(5.1, 30)];
  const withOutlier = [...consistent5k, run(42.195, 300)];

  const clean = buildPassport({ self_selected_experience: 'regular_3k_to_5k', recent_runs: consistent5k });
  const polluted = buildPassport({ self_selected_experience: 'regular_3k_to_5k', recent_runs: withOutlier });

  assert.equal(clean.band, 'R2');
  assert.equal(polluted.band, 'R2', 'a single marathon must not promote a 5 km runner to R6');
  assert.equal(polluted.vector.longest_recent_meters, 42_195, 'but the outlier is still recorded');
});

test('a repeated long distance DOES move capability upward', () => {
  const p = buildPassport({
    self_selected_experience: 'regular_5k_to_10k',
    recent_runs: [run(5, 30), run(21.1, 120), run(21.1, 122), run(20, 118)],
  });
  assert.ok(['R4', 'R5'].includes(p.band), `repeated 20 km+ should raise the band, got ${p.band}`);
});

test('recalculation after the first verified run is explainable and revokes nothing', () => {
  const p = buildPassport(FIXTURES.beginner_no_history);
  assert.equal(p.band, 'R0');

  const result = recalculate(p, [run(6, 40), run(6.5, 43), run(7, 46)]);
  assert.equal(result.band_before, 'R0');
  assert.equal(result.band_changed, true);
  assert.equal(result.direction, 'up');
  assert.deepEqual(result.revoked_rewards, []);
  assert.deepEqual(result.revoked_characters, []);
  assert.deepEqual(result.revoked_world_progress, []);
  assert.equal(result.passport.version, p.version, 'same rule version reproduces deterministically');
});

test('a band may move down without any punishment attached', () => {
  const strong = buildPassport(FIXTURES.marathon);
  const afterInjury = recalculate({ ...strong, __source_runs: [] }, [run(3, 22), run(3, 23), run(2.5, 19)]);
  assert.equal(afterInjury.direction, 'down');
  assert.deepEqual(afterInjury.revoked_rewards, [], 'nothing is ever taken back');
});

test('the same input snapshot reproduces the same passport (determinism)', () => {
  const a = buildPassport(FIXTURES.regular_10k);
  const b = buildPassport(FIXTURES.regular_10k);
  assert.deepEqual(a, b);
});

test('a malformed goal is rejected, but never because of the user band', () => {
  const p = buildPassport(FIXTURES.beginner_no_history);
  assert.throws(() => selectGoal(p, { goal_type: 'distance', goal_id: 'd_trail_50km' }), /unknown distance goal/);
  assert.throws(() => selectGoal(p, { goal_type: 'distance', goal_id: 'd_custom' }), /custom_meters/);
});
