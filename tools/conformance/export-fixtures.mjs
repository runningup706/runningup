#!/usr/bin/env node
/**
 * Cross-implementation conformance fixtures.
 *
 * The Monthly Apex ladder exists in three places by design: the SQL transaction is the
 * authority, the JS engine drives the tooling and simulators, and the C# domain layer gives
 * the Unity client an offline preview. Three implementations of one rule set is exactly the
 * drift risk recorded as R-06 / AUDIT_08 F-08-1.
 *
 * This script exports the boundary cases and their expected outcomes ONCE, from the JS
 * engine, into a language-neutral JSON fixture. The C# test suite reads the same file and
 * asserts identical results, so a divergence fails a build instead of silently shipping a
 * client that disagrees with the server.
 *
 * Regenerate with: node tools/conformance/export-fixtures.mjs
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { applyDistance, emptyProgress } from '../lib/monthly-apex.mjs';
import { APEX_CHECKPOINT_METERS, MAJOR_RANKS, rankForMeters, DIRECTION_LOCK } from '../lib/constants.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Each case is a sequence of session distances applied to a fresh month. Every boundary the
 * direction lock cares about is represented, plus the ordinary cases in between.
 */
const CASES = [
  { id: 'empty_month', sessions: [] },
  { id: 'first_run_5200m', sessions: [5_200] },
  { id: 'one_metre_short_of_10km', sessions: [9_999] },
  { id: 'exactly_10km', sessions: [10_000] },
  { id: 'marathon_symbolic_exact', sessions: [42_195] },
  { id: 'one_metre_short_of_marathon_checkpoint', sessions: [42_194] },
  { id: 'multi_crossing_100km', sessions: [100_000] },
  { id: 'incremental_to_100km', sessions: [5_200, 4_800, 5_000, 85_000] },
  { id: 'nine_hundred_ninety_nine_km', sessions: [999_999] },
  { id: 'exactly_1000km_in_two_steps', sessions: [999_999, 1] },
  { id: 'exactly_1000km_in_one_step', sessions: [1_000_000] },
  { id: 'overshoot_1200km', sessions: [1_200_000] },
  { id: 'crowned_then_further_25km', sessions: [1_000_000, 25_000] },
  { id: 'crowned_then_further_twice', sessions: [1_000_000, 25_000, 30_000] },
  { id: 'zero_distance_session', sessions: [5_000, 0] },
  { id: 'two_hundred_five_km_sessions', sessions: Array(200).fill(5_000) },
  { id: 'rank_boundary_50km', sessions: [50_000] },
  { id: 'rank_boundary_just_below_50km', sessions: [49_999] },
  { id: 'rank_boundary_900km', sessions: [900_000] },
];

const cases = CASES.map((testCase) => {
  let progress = emptyProgress();
  const steps = [];

  for (const meters of testCase.sessions) {
    const result = applyDistance(progress, meters);
    progress = result.after;
    steps.push({
      session_meters: meters,
      crossed_checkpoint_ids: result.crossed_checkpoints.map((c) => c.checkpoint_id),
      crossed_count: result.crossed_checkpoints.length,
      rank_after: result.rank_after,
      world_crown_awarded_now: result.world_crown_awarded_now,
      apex_axis_unlocked_now: result.apex_axis_unlocked_now,
      laddered_meters_after: result.after.laddered_meters,
      over_crown_meters_after: result.after.over_crown_meters,
      base_run_reward_applies: result.base_run_reward_applies,
    });
  }

  return {
    id: testCase.id,
    sessions: testCase.sessions,
    steps,
    final: {
      laddered_meters: progress.laddered_meters,
      over_crown_meters: progress.over_crown_meters,
      rank: rankForMeters(progress.laddered_meters).id,
      world_crown_awarded: progress.world_crown_awarded,
      apex_axis_unlocked: progress.apex_axis_unlocked,
      total_checkpoints_claimed: steps.reduce((sum, s) => sum + s.crossed_count, 0),
    },
  };
});

const fixture = {
  fixture_version: '1.0.0',
  generated_by: 'tools/conformance/export-fixtures.mjs',
  purpose: 'every implementation of the Monthly Apex ladder must reproduce these results exactly',
  direction_lock: {
    final_apex_meters: DIRECTION_LOCK.FINAL_APEX_METERS,
    checkpoint_count: DIRECTION_LOCK.CHECKPOINT_COUNT,
    final_rank_id: DIRECTION_LOCK.FINAL_RANK_ID,
  },
  checkpoint_meters: [...APEX_CHECKPOINT_METERS],
  ranks: MAJOR_RANKS.map((r) => ({
    id: r.id, order: r.order, min_meters: r.min_meters, max_meters: r.max_meters,
  })),
  rank_boundary_probes: [
    0, 49_999, 50_000, 99_999, 100_000, 199_999, 200_000, 299_999, 300_000,
    400_000, 500_000, 600_000, 700_000, 800_000, 900_000, 999_999, 1_000_000,
  ].map((m) => ({ meters: m, rank: rankForMeters(m).id })),
  cases,
};

const out = join(ROOT, 'content', 'conformance');
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'monthly-apex-cases.json'), `${JSON.stringify(fixture, null, 2)}\n`, 'utf8');

console.log(`exported ${cases.length} conformance cases`);
console.log(`  checkpoint probes : ${fixture.checkpoint_meters.length}`);
console.log(`  rank probes       : ${fixture.rank_boundary_probes.length}`);
console.log(`  total steps       : ${cases.reduce((n, c) => n + c.steps.length, 0)}`);
console.log('  -> content/conformance/monthly-apex-cases.json');
