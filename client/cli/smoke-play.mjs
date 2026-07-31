#!/usr/bin/env node
/**
 * Playable-loop end-to-end smoke test.
 *
 * Master # 22.4 requires the first-run journey to be exercised from an independent clean
 * profile for each ability level, and # 23 Gate 10 requires a run → reward → Apex checkpoint
 * → world → championship race end-to-end. This plays the actual client, for each runner profile, against
 * the actual database, and asserts on what comes back.
 *
 * It is a smoke test of the GAME, not of a module: if the loop is broken anywhere between
 * onboarding and the race result, this fails.
 *
 * Usage: node client/cli/smoke-play.mjs
 */

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');

/**
 * The independent fixtures the master names. Each is a clean profile: a fresh account, its
 * own passport, its own goal, its own continent and character.
 */
const PROFILES = [
  // Checkpoint expectations follow the V14 120-step ladder, which starts at 1 km. The
  // pre-V14 ladder had a 0 km checkpoint, so every profile used to be credited one extra
  // crossing for having run at all.
  { id: 'beginner',    expect: { band: 'R0', minCheckpoints: 1, maxMonthlyKm: 2 } },
  { id: 'regular_10k', expect: { band: 'R3', minCheckpoints: 8, maxMonthlyKm: 11 } },
  { id: 'marathon',    expect: { band: 'R6', minCheckpoints: 18, maxMonthlyKm: 43 } },
  { id: 'ultra',       expect: { band: 'R7', minCheckpoints: 20, maxMonthlyKm: 51 } },
];

const failures = [];
const results = [];

const check = (name, ok, detail) => {
  if (!ok) failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
  return ok;
};

console.log('RunningUp — playable loop smoke test\n');

for (const profile of PROFILES) {
  process.stdout.write(`  ${profile.id.padEnd(14)}`);

  let raw;
  try {
    raw = execFileSync('node', [join(HERE, 'play.mjs'), '--auto', '--runner', profile.id], {
      encoding: 'utf8',
      cwd: ROOT,
      env: { ...process.env, RUNNINGUP_EMIT_RESULT: '1' },
      timeout: 120_000,
    });
  } catch (error) {
    check(`${profile.id}: the client ran`, false, error.message.split('\n')[0]);
    console.log('CRASHED');
    continue;
  }

  const marker = raw.split('__RESULT__')[1];
  if (!marker) {
    check(`${profile.id}: the client emitted a result`, false, 'no result marker');
    console.log('NO RESULT');
    continue;
  }
  const result = JSON.parse(marker.trim());
  results.push({ profile: profile.id, ...result });

  // The passport band is visible in the transcript; assert on it there.
  const bandMatch = raw.match(/band \x1b\[1m(R\d)/);
  const band = bandMatch ? bandMatch[1] : null;

  const ok = [
    check(`${profile.id}: passport band`, band === profile.expect.band, `expected ${profile.expect.band}, got ${band}`),
    check(`${profile.id}: run verified`, ['A', 'B', 'C'].includes(result.grade), `grade ${result.grade}`),
    check(`${profile.id}: reward is positive`, result.final_amount > 0, `${result.final_amount} XP`),
    check(`${profile.id}: monthly distance recorded`, result.monthly_distance_after > 0, null),
    check(`${profile.id}: checkpoints crossed`, result.crossed >= profile.expect.minCheckpoints,
      `${result.crossed} < ${profile.expect.minCheckpoints}`),
    check(`${profile.id}: ladder within one session's reach`,
      result.monthly_distance_after <= profile.expect.maxMonthlyKm * 1000, `${result.monthly_distance_after} m`),
    check(`${profile.id}: rank never above World Crown`,
      result.major_rank !== null && result.monthly_distance_after < 1_000_000
        ? result.major_rank !== 'world_crown' : true, `rank ${result.major_rank}`),
    check(`${profile.id}: race resolved`, Number.isInteger(result.placement) && result.placement >= 1 && result.placement <= 8, `placement ${result.placement}`),

    // The transcript itself must show the loop actually happened.
    check(`${profile.id}: reached the Grand World`, raw.includes('GRAND WORLD'), null),
    check(`${profile.id}: showed all 12 continents`, raw.includes('12 continents'), null),
    check(`${profile.id}: reached the Monthly Apex screen`, raw.includes('MONTHLY APEX'), null),
    check(`${profile.id}: raced the field`, raw.includes('LIVE RACE'), null),
    check(`${profile.id}: full library remained selectable`, raw.includes('0 prerequisites'), null),
  ].every(Boolean);

  console.log(ok ? 'OK' : 'FAIL');
}

// ---------------------------------------------------------------------------
// Cross-profile properties: this is where DL-2 is actually proven.
// ---------------------------------------------------------------------------
const byId = Object.fromEntries(results.map((r) => [r.profile, r]));

if (results.length === PROFILES.length) {
  check('a beginner and a marathon runner both completed a first session on day one',
    byId.beginner.final_amount > 0 && byId.marathon.final_amount > 0, null);

  check('the marathon runner was not made to run a beginner distance first',
    byId.marathon.monthly_distance_after > byId.beginner.monthly_distance_after * 10, null);

  check('a longer verified run yields more reward',
    byId.ultra.final_amount > byId.regular_10k.final_amount
    && byId.regular_10k.final_amount > byId.beginner.final_amount,
    `${byId.beginner.final_amount} / ${byId.regular_10k.final_amount} / ${byId.ultra.final_amount}`);

  check('every profile crossed the journey-start checkpoint',
    results.every((r) => r.crossed >= 1), null);
}

console.log();
console.log('  profile          band-run   XP        monthly     checkpoints  race');
for (const r of results) {
  console.log(
    `  ${r.profile.padEnd(14)} ${r.grade.padEnd(9)} ${String(r.final_amount).padStart(9)}` +
    ` ${`${(r.monthly_distance_after / 1000).toFixed(2)} km`.padStart(11)}` +
    ` ${String(r.crossed).padStart(11)}  ${r.placement}/8`,
  );
}
console.log();

if (failures.length > 0) {
  console.log(`${failures.length} FAILURE(S):`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}

console.log(`  all ${PROFILES.length} ability levels played the full loop: onboarding → goal → run →`);
console.log('  verification → reward → Apex checkpoints → race → restoration.');
process.exit(0);
