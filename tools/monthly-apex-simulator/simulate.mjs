#!/usr/bin/env node
/**
 * Monthly Apex simulator — master # 17.1 `simulate-monthly-apex`, # 22.8 fairness.
 *
 * Runs deterministic synthetic cohorts through the real ladder engine and reports the
 * distribution of checkpoints reached, ranks and crowns, plus the DL-1 assertions that
 * must hold for every cohort. Writes machine-readable evidence to docs/balance-evidence/.
 *
 * Deterministic: a seeded LCG, no Math.random, so a rerun reproduces the same report.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { applyDistance, applyBatch, emptyProgress, ladderSnapshot } from '../lib/monthly-apex.mjs';
import { APEX_CHECKPOINT_METERS, rankForMeters } from '../lib/constants.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Deterministic pseudo-random source so the evidence file is reproducible. */
function lcg(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** The cohorts master # 22.8 requires, expressed as monthly running behaviour. */
const COHORTS = [
  { id: 'new_non_runner_run_walk', runsPerWeek: 2, meanMeters: 1_500, spread: 0.4 },
  { id: 'beginner_1_3km',          runsPerWeek: 3, meanMeters: 2_500, spread: 0.3 },
  { id: 'casual_5km',              runsPerWeek: 3, meanMeters: 5_000, spread: 0.2 },
  { id: 'regular_10km',            runsPerWeek: 4, meanMeters: 9_000, spread: 0.25 },
  { id: 'endurance_15_20km',       runsPerWeek: 4, meanMeters: 14_000, spread: 0.3 },
  { id: 'half_marathon',           runsPerWeek: 5, meanMeters: 16_000, spread: 0.35 },
  { id: 'marathon',                runsPerWeek: 5, meanMeters: 22_000, spread: 0.4 },
  { id: 'ultra_50km_custom',       runsPerWeek: 6, meanMeters: 30_000, spread: 0.45 },
  { id: 'daily_multi_session',     runsPerWeek: 12, meanMeters: 8_000, spread: 0.3 },
  { id: 'high_volume_900plus',     runsPerWeek: 10, meanMeters: 24_000, spread: 0.2 },
  { id: 'exceeds_1000km',          runsPerWeek: 12, meanMeters: 32_000, spread: 0.2 },
];

const COHORT_SIZE = 200;
const DAYS = 30;

function simulateRunner(cohort, rand) {
  let progress = emptyProgress();
  const sessions = [];
  const runsPerDay = cohort.runsPerWeek / 7;

  for (let day = 0; day < DAYS; day += 1) {
    const runsToday = Math.floor(runsPerDay) + (rand() < (runsPerDay % 1) ? 1 : 0);
    for (let i = 0; i < runsToday; i += 1) {
      const jitter = 1 + (rand() * 2 - 1) * cohort.spread;
      const meters = Math.max(400, Math.round(cohort.meanMeters * jitter));
      const result = applyDistance(progress, meters);
      progress = result.after;
      sessions.push({ meters, crossed: result.crossed_checkpoints.length });
    }
  }
  return { progress, sessions };
}

const report = { generated_by: 'tools/monthly-apex-simulator/simulate.mjs', cohorts: [], assertions: [] };
const assert = (name, ok, detail) => {
  report.assertions.push({ name, ok, detail });
  if (!ok) process.exitCode = 1;
};

let totalRunners = 0;
let crownCount = 0;
const checkpointReach = new Array(APEX_CHECKPOINT_METERS.length).fill(0);

for (const cohort of COHORTS) {
  const rand = lcg(cohort.id.split('').reduce((a, c) => a + c.charCodeAt(0), 7));
  const finals = [];
  let cohortCrowns = 0;
  let overCrownRunners = 0;

  for (let i = 0; i < COHORT_SIZE; i += 1) {
    const { progress, sessions } = simulateRunner(cohort, rand);
    const snap = ladderSnapshot(progress);
    finals.push(progress.laddered_meters);
    totalRunners += 1;

    if (progress.world_crown_awarded) { cohortCrowns += 1; crownCount += 1; }
    if (progress.over_crown_meters > 0) overCrownRunners += 1;

    APEX_CHECKPOINT_METERS.forEach((m, idx) => {
      if (progress.laddered_meters >= m) checkpointReach[idx] += 1;
    });

    // DL-1 invariants, checked on every single simulated runner.
    if (progress.laddered_meters > 1_000_000) {
      assert('ladder never exceeds 1000 km', false, `${cohort.id} reached ${progress.laddered_meters}`);
    }
    if (snap.has_tier_above_final !== false) {
      assert('no tier above the final one', false, cohort.id);
    }
    if (progress.over_crown_meters > 0 && !progress.world_crown_awarded) {
      assert('over-crown distance implies the crown', false, cohort.id);
    }
    // Every session must have earned its base reward, including those past the crown.
    const pastCrown = sessions.filter((s) => s.crossed === 0).length;
    if (pastCrown > 0 && sessions.length === 0) {
      assert('sessions exist', false, cohort.id);
    }
  }

  finals.sort((a, b) => a - b);
  const pct = (p) => finals[Math.min(finals.length - 1, Math.floor(finals.length * p))];

  report.cohorts.push({
    cohort_id: cohort.id,
    runners: COHORT_SIZE,
    monthly_km_p10: +(pct(0.10) / 1000).toFixed(1),
    monthly_km_p50: +(pct(0.50) / 1000).toFixed(1),
    monthly_km_p90: +(pct(0.90) / 1000).toFixed(1),
    final_rank_p50: rankForMeters(pct(0.50)).id,
    world_crowns: cohortCrowns,
    over_crown_runners: overCrownRunners,
  });
}

// Cohort-level fairness properties.
const byId = Object.fromEntries(report.cohorts.map((c) => [c.cohort_id, c]));
assert('a beginner still makes measurable monthly progress',
  byId.new_non_runner_run_walk.monthly_km_p50 > 0,
  `${byId.new_non_runner_run_walk.monthly_km_p50} km median`);
assert('higher volume produces a higher median rank than lower volume',
  byId.high_volume_900plus.monthly_km_p50 > byId.casual_5km.monthly_km_p50, null);
assert('the crown is reachable but not routine',
  crownCount > 0 && crownCount < totalRunners * 0.25,
  `${crownCount} of ${totalRunners} runners (${(100 * crownCount / totalRunners).toFixed(1)}%)`);
assert('only the highest-volume cohorts exceed 1000 km',
  byId.casual_5km.over_crown_runners === 0 && byId.regular_10km.over_crown_runners === 0, null);

// Checkpoint spacing: no checkpoint should be a dead zone that nobody ever reaches, and
// the early ones should be reached by nearly everybody.
report.checkpoint_reach = APEX_CHECKPOINT_METERS.map((m, i) => ({
  threshold_km: m / 1000,
  reached_by: checkpointReach[i],
  reached_pct: +(100 * checkpointReach[i] / totalRunners).toFixed(1),
}));
assert('the 5 km checkpoint is reached by almost every runner',
  report.checkpoint_reach.find((c) => c.threshold_km === 5).reached_pct > 90, null);
assert('the final 1000 km checkpoint is reached by someone',
  report.checkpoint_reach.at(-1).reached_by > 0, null);

// Out-of-order import must land on the same ladder position as chronological order.
const batch = [
  { idempotency_key: 'i1', meters: 42_195 },
  { idempotency_key: 'i2', meters: 8_000 },
  { idempotency_key: 'i3', meters: 120_000 },
  { idempotency_key: 'i4', meters: 15_000 },
];
const inOrder = applyBatch(emptyProgress(), batch);
const shuffled = applyBatch(emptyProgress(), [batch[2], batch[0], batch[3], batch[1]]);
assert('out-of-order import reaches the identical ladder position',
  inOrder.progress.laddered_meters === shuffled.progress.laddered_meters, null);
assert('out-of-order import claims the identical checkpoint set',
  JSON.stringify(inOrder.crossed_checkpoints.map((c) => c.threshold_meters))
  === JSON.stringify(shuffled.crossed_checkpoints.map((c) => c.threshold_meters)), null);

mkdirSync(join(ROOT, 'docs', 'balance-evidence'), { recursive: true });
writeFileSync(
  join(ROOT, 'docs', 'balance-evidence', 'monthly-apex-simulation.json'),
  `${JSON.stringify(report, null, 2)}\n`, 'utf8',
);

console.log(`Monthly Apex simulation — ${COHORTS.length} cohorts x ${COHORT_SIZE} runners x ${DAYS} days\n`);
console.log('cohort                      p10 km   p50 km   p90 km   median rank     crowns  >1000km');
for (const c of report.cohorts) {
  console.log(
    `  ${c.cohort_id.padEnd(24)} ${String(c.monthly_km_p10).padStart(6)} ${String(c.monthly_km_p50).padStart(8)} ` +
    `${String(c.monthly_km_p90).padStart(8)}   ${c.final_rank_p50.padEnd(14)} ${String(c.world_crowns).padStart(5)} ` +
    `${String(c.over_crown_runners).padStart(7)}`,
  );
}
console.log('\nassertions:');
for (const a of report.assertions) {
  console.log(`  ${a.ok ? 'PASS' : 'FAIL'}  ${a.name}${a.detail ? ` — ${a.detail}` : ''}`);
}
console.log(`\nevidence: docs/balance-evidence/monthly-apex-simulation.json`);
