#!/usr/bin/env node
/**
 * Runner Passport simulator — master # 17.1 `simulate-runner-passport`, # 22.8.
 *
 * Feeds beginner-through-elite history fixtures into the real passport engine and checks
 * the recommended start point, goal shortlist and difficulty lane. The point is not that
 * the recommendation is "right" in some absolute sense — it is that DL-2 holds for every
 * fixture: the whole library stays selectable, nothing is gated, and no runner is pushed
 * back to a lower distance than they already run.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildPassport, recommend, selectGoal, recalculate } from '../../packages/domain/runner-passport.mjs';
import { GOAL_DISTANCES, GOAL_DURATIONS } from '../../packages/domain/constants.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const run = (km, min) => ({ meters: Math.round(km * 1000), seconds: Math.round(min * 60), activity_type: 'road', verified: true });

const FIXTURES = [
  { id: 'A_beginner_no_history', experience: 'new_to_running', runs: [],
    expect_min_distance_m: 0 },
  { id: 'B_starter_3_4km', experience: 'regular_3k_to_5k',
    runs: [run(3, 21), run(4, 28), run(3.5, 25), run(3, 22)], expect_min_distance_m: 2_000 },
  { id: 'C_regular_5km', experience: 'regular_3k_to_5k',
    runs: [run(5, 30), run(5.2, 31), run(4.8, 29), run(5, 30), run(5.1, 30)], expect_min_distance_m: 5_000 },
  { id: 'D_regular_10km', experience: 'regular_5k_to_10k',
    runs: [run(10, 55), run(8, 44), run(10, 54), run(6, 33), run(10, 56)], expect_min_distance_m: 10_000 },
  { id: 'E_endurance_20km_half', experience: 'half_marathon',
    runs: [run(21.1, 115), run(15, 82), run(20, 110), run(12, 66), run(21.1, 118)], expect_min_distance_m: 15_000 },
  { id: 'F_marathon', experience: 'marathon',
    runs: [run(42.195, 240), run(32, 180), run(30, 168), run(25, 138), run(35, 200)], expect_min_distance_m: 21_097 },
  { id: 'G_ultra_50km_custom', experience: 'advanced_custom',
    runs: [run(50, 330), run(45, 295), run(60, 400), run(50, 325)], expect_min_distance_m: 42_195 },
  { id: 'H_current_month_import', experience: 'regular_5k_to_10k',
    runs: [run(12, 68), run(10, 56), run(14, 80), run(11, 62), run(13, 74), run(10, 55)], expect_min_distance_m: 10_000 },
];

const report = { generated_by: 'tools/runner-passport-simulator/simulate.mjs', fixtures: [], assertions: [] };
const assert = (name, ok, detail) => {
  report.assertions.push({ name, ok, detail });
  if (!ok) process.exitCode = 1;
};

const distanceById = Object.fromEntries(GOAL_DISTANCES.map((d) => [d.id, d.meters]));

for (const fixture of FIXTURES) {
  const passport = buildPassport({ self_selected_experience: fixture.experience, recent_runs: fixture.runs });
  const rec = recommend(passport);

  const recommendedMeters = rec.recommended_distance_goal_ids
    .map((id) => distanceById[id])
    .filter((m) => m !== null && m !== undefined);
  const topRecommended = recommendedMeters.length ? Math.max(...recommendedMeters) : 0;

  report.fixtures.push({
    fixture_id: fixture.id,
    band: passport.band,
    capacity_meters: passport.vector.distance_capacity_meters,
    recommended_distances: rec.recommended_distance_goal_ids,
    recommended_durations: rec.recommended_duration_goal_ids,
    recommended_lane: rec.recommended_lane,
    profile_confidence: passport.vector.profile_confidence,
  });

  // DL-2, checked for every fixture.
  assert(`${fixture.id}: the passport carries no restriction`,
    passport.restrictions.length === 0, null);
  assert(`${fixture.id}: no prerequisite is imposed`,
    rec.prerequisites.length === 0 && rec.locked_goal_ids.length === 0, null);
  assert(`${fixture.id}: the full library stays selectable`,
    rec.full_library_available && rec.all_distance_goal_ids.length === GOAL_DISTANCES.length, null);
  assert(`${fixture.id}: no continent or character is locked by the passport`,
    rec.locked_continent_ids.length === 0 && rec.locked_character_ids.length === 0, null);

  // A runner is never pushed BELOW what they already do.
  assert(`${fixture.id}: the shortlist is not below the runner existing capacity`,
    topRecommended >= fixture.expect_min_distance_m,
    `top recommended ${topRecommended} m vs floor ${fixture.expect_min_distance_m} m`);

  // Every goal in the library is accepted on day one, for every fixture.
  let accepted = 0;
  for (const d of GOAL_DISTANCES) {
    const choice = d.id === 'd_custom'
      ? { goal_type: 'distance', goal_id: d.id, custom_meters: 33_333 }
      : { goal_type: 'distance', goal_id: d.id };
    if (selectGoal(passport, choice).accepted) accepted += 1;
  }
  for (const t of GOAL_DURATIONS) {
    const choice = t.id === 't_custom'
      ? { goal_type: 'duration', goal_id: t.id, custom_seconds: 5_000 }
      : { goal_type: 'duration', goal_id: t.id };
    if (selectGoal(passport, choice).accepted) accepted += 1;
  }
  assert(`${fixture.id}: all ${GOAL_DISTANCES.length + GOAL_DURATIONS.length} goals accepted on day one`,
    accepted === GOAL_DISTANCES.length + GOAL_DURATIONS.length, `${accepted} accepted`);
}

// The headline DL-2 claim: a zero-history account may start at the marathon, and a
// marathon runner may start at 400 m. Neither is corrected, blocked or demoted.
const beginner = buildPassport({ self_selected_experience: 'new_to_running', recent_runs: [] });
const marathoner = buildPassport({ self_selected_experience: 'marathon', recent_runs: FIXTURES[5].runs });

assert('a zero-history account may select the marathon on day one',
  selectGoal(beginner, { goal_type: 'distance', goal_id: 'd_marathon' }).accepted, null);
assert('a marathon runner may select 400 m without demotion',
  selectGoal(marathoner, { goal_type: 'distance', goal_id: 'd_400m' }).passport_band_at_selection === 'R6', null);

// Recalculation after the first verified sessions moves the band and revokes nothing.
const after = recalculate(beginner, [run(6, 40), run(6.5, 43), run(7, 46)]);
assert('recalculation after the first verified runs moves the band up',
  after.direction === 'up', `${after.band_before} -> ${after.band_after}`);
assert('recalculation revokes nothing',
  after.revoked_rewards.length === 0 && after.revoked_characters.length === 0
  && after.revoked_world_progress.length === 0, null);

mkdirSync(join(ROOT, 'docs', 'balance-evidence'), { recursive: true });
writeFileSync(
  join(ROOT, 'docs', 'balance-evidence', 'runner-passport-simulation.json'),
  `${JSON.stringify(report, null, 2)}\n`, 'utf8',
);

console.log('Runner Passport simulation\n');
console.log('fixture                       band  capacity  lane       recommended distances');
for (const f of report.fixtures) {
  console.log(
    `  ${f.fixture_id.padEnd(26)} ${f.band}  ${String(f.capacity_meters ?? '-').padStart(8)}  ` +
    `${f.recommended_lane.padEnd(9)}  ${f.recommended_distances.join(', ')}`,
  );
}
const failed = report.assertions.filter((a) => !a.ok);
console.log(`\nassertions: ${report.assertions.length - failed.length}/${report.assertions.length} passed`);
for (const a of failed) console.log(`  FAIL  ${a.name}${a.detail ? ` — ${a.detail}` : ''}`);
console.log('\nevidence: docs/balance-evidence/runner-passport-simulation.json');
