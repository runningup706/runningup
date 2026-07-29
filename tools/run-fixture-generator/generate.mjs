#!/usr/bin/env node
/**
 * Deterministic GPS / session fixture generator — master # 22.6.
 *
 * Produces both halves of the test corpus:
 *   - NORMAL fixtures: every benchmark distance, every duration goal, run-walk, structured
 *     sessions, treadmill and indoor, and multiple sessions in one day
 *   - ATTACK fixtures: teleport, vehicle speed, impossible acceleration, replayed nonce,
 *     duplicate import, tampered device clock, truncated and reordered journals, synthetic
 *     routes, and non-running activities masquerading as runs
 *
 * The attack fixtures are NEGATIVE tests. Master # 22.6 is explicit that trail, hiking and
 * cycling traces exist here only to prove they are refused, never to be supported.
 *
 * Fully deterministic (seeded LCG, no Math.random), so a regenerated corpus is byte-stable
 * and a detection regression shows up as a diff rather than as flakiness.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function lcg(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/**
 * Build a realistic sample trace. Real runners vary: `paceJitter` keeps the trace from
 * looking synthetic, which matters because "too regular" is itself a detection signal.
 */
function trace({ meters, speedMps, seed, paceJitter = 0.06, accuracy = 6, stepMeters = 50 }) {
  const rand = lcg(seed);
  const samples = [{ cumulative_meters: 0, moving_seconds: 0, accuracy_meters: accuracy }];
  let distance = 0;
  let seconds = 0;

  while (distance < meters) {
    const step = Math.min(stepMeters, meters - distance);
    const jitter = 1 + (rand() * 2 - 1) * paceJitter;
    const segmentSpeed = Math.max(0.5, speedMps * jitter);
    distance += step;
    seconds += step / segmentSpeed;
    samples.push({
      cumulative_meters: Number(distance.toFixed(2)),
      moving_seconds: Number(seconds.toFixed(2)),
      accuracy_meters: Number((accuracy * (0.6 + rand() * 0.8)).toFixed(1)),
    });
  }
  return samples;
}

const BENCHMARKS = [
  ['400m', 400, 4.2], ['800m', 800, 4.0], ['1km', 1_000, 3.9], ['1mile', 1609, 3.8],
  ['2km', 2_000, 3.7], ['3km', 3_000, 3.6], ['5km', 5_000, 3.5], ['8km', 8_000, 3.4],
  ['10km', 10_000, 3.3], ['12km', 12_000, 3.25], ['15km', 15_000, 3.2], ['10mile', 16_093, 3.15],
  ['20km', 20_000, 3.1], ['half', 21_097, 3.05], ['25km', 25_000, 3.0], ['30km', 30_000, 2.95],
  ['32km', 32_000, 2.9], ['35km', 35_000, 2.85], ['marathon', 42_195, 2.8], ['50km', 50_000, 2.6],
];

const normal = [];
let seed = 1;

for (const [label, meters, speed] of BENCHMARKS) {
  const samples = trace({ meters, speedMps: speed, seed: seed++ });
  normal.push({
    id: `normal_distance_${label}`,
    expectation: 'verified',
    activity_type: 'road',
    source: 'direct_gps',
    declared_distance_meters: Math.round(samples.at(-1).cumulative_meters),
    declared_moving_seconds: Math.round(samples.at(-1).moving_seconds),
    samples,
  });
}

// Duration goals: the session is defined by time, not distance.
for (const minutes of [10, 15, 20, 30, 45, 60, 75, 90, 120, 180]) {
  const speed = 3.1;
  const meters = Math.round(minutes * 60 * speed);
  const samples = trace({ meters, speedMps: speed, seed: seed++ });
  normal.push({
    id: `normal_duration_${minutes}min`,
    expectation: 'verified',
    activity_type: 'road',
    source: 'direct_gps',
    declared_distance_meters: Math.round(samples.at(-1).cumulative_meters),
    declared_moving_seconds: Math.round(samples.at(-1).moving_seconds),
    samples,
  });
}

// Run-walk: a beginner method, so the pace swings hard between segments and must still pass.
{
  const rand = lcg(seed++);
  const samples = [{ cumulative_meters: 0, moving_seconds: 0, accuracy_meters: 8 }];
  let distance = 0;
  let seconds = 0;
  for (let segment = 0; segment < 20; segment += 1) {
    const running = segment % 2 === 0;
    const speed = running ? 3.0 + rand() * 0.4 : 1.4 + rand() * 0.2;
    for (let i = 0; i < 4; i += 1) {
      distance += 50;
      seconds += 50 / speed;
      samples.push({
        cumulative_meters: Number(distance.toFixed(2)),
        moving_seconds: Number(seconds.toFixed(2)),
        accuracy_meters: 8,
      });
    }
  }
  normal.push({
    id: 'normal_run_walk_beginner',
    expectation: 'verified',
    activity_type: 'road',
    source: 'direct_gps',
    declared_distance_meters: Math.round(distance),
    declared_moving_seconds: Math.round(seconds),
    samples,
  });
}

// Structured sessions: interval and tempo work legitimately produce big pace swings.
for (const [style, pattern] of [
  ['intervals', [4.4, 2.4, 4.4, 2.4, 4.4, 2.4, 4.4, 2.4]],
  ['tempo', [3.2, 3.7, 3.8, 3.8, 3.7, 3.2]],
  ['progression', [2.9, 3.1, 3.3, 3.5, 3.7, 3.9]],
  ['fartlek', [3.0, 4.2, 3.1, 4.4, 2.9, 4.0, 3.2]],
]) {
  const samples = [{ cumulative_meters: 0, moving_seconds: 0, accuracy_meters: 6 }];
  let distance = 0;
  let seconds = 0;
  for (const speed of pattern) {
    for (let i = 0; i < 10; i += 1) {
      distance += 50;
      seconds += 50 / speed;
      samples.push({
        cumulative_meters: Number(distance.toFixed(2)),
        moving_seconds: Number(seconds.toFixed(2)),
        accuracy_meters: 6,
      });
    }
  }
  normal.push({
    id: `normal_structured_${style}`,
    expectation: 'verified',
    activity_type: 'track',
    source: 'direct_gps',
    declared_distance_meters: Math.round(distance),
    declared_moving_seconds: Math.round(seconds),
    samples,
  });
}

// Treadmill and indoor: legitimate running with a sensor source rather than GPS.
for (const activity of ['treadmill', 'indoor']) {
  const samples = trace({ meters: 8_000, speedMps: 3.2, seed: seed++, paceJitter: 0.03, accuracy: 0 });
  normal.push({
    id: `normal_${activity}_8km`,
    expectation: 'verified',
    activity_type: activity,
    source: 'indoor_sensor',
    declared_distance_meters: 8_000,
    declared_moving_seconds: Math.round(samples.at(-1).moving_seconds),
    samples,
  });
}

// Poor GPS but genuine: a tunnel or an urban canyon must NOT be treated as cheating.
{
  const samples = trace({ meters: 5_000, speedMps: 3.2, seed: seed++, accuracy: 45 });
  normal.push({
    id: 'normal_poor_accuracy_urban',
    expectation: 'verified_or_limited',
    activity_type: 'road',
    source: 'direct_gps',
    declared_distance_meters: 5_000,
    declared_moving_seconds: Math.round(samples.at(-1).moving_seconds),
    samples,
  });
}

// ---------------------------------------------------------------------------
// Attack fixtures
// ---------------------------------------------------------------------------
const attacks = [];

{
  // Teleport: a clean run with one enormous jump spliced in.
  const samples = trace({ meters: 5_000, speedMps: 3.3, seed: seed++ });
  const cut = Math.floor(samples.length / 2);
  for (let i = cut; i < samples.length; i += 1) {
    samples[i] = { ...samples[i], cumulative_meters: Number((samples[i].cumulative_meters + 3_000).toFixed(2)) };
  }
  attacks.push({
    id: 'attack_teleport', expectation: 'flagged', attack: 'teleport',
    activity_type: 'road', source: 'direct_gps',
    declared_distance_meters: Math.round(samples.at(-1).cumulative_meters),
    declared_moving_seconds: Math.round(samples.at(-1).moving_seconds), samples,
  });
}

{
  // A car journey submitted as a run.
  const samples = trace({ meters: 20_000, speedMps: 14.0, seed: seed++, paceJitter: 0.15, stepMeters: 200 });
  attacks.push({
    id: 'attack_vehicle_speed', expectation: 'flagged', attack: 'vehicle',
    activity_type: 'road', source: 'direct_gps',
    declared_distance_meters: 20_000,
    declared_moving_seconds: Math.round(samples.at(-1).moving_seconds), samples,
  });
}

{
  // A bicycle: fast, but not impossible per segment — the harder case.
  const samples = trace({ meters: 15_000, speedMps: 7.5, seed: seed++, paceJitter: 0.1, stepMeters: 100 });
  attacks.push({
    id: 'attack_bicycle_speed', expectation: 'flagged', attack: 'bicycle',
    activity_type: 'road', source: 'direct_gps',
    declared_distance_meters: 15_000,
    declared_moving_seconds: Math.round(samples.at(-1).moving_seconds), samples,
  });
}

{
  // Impossible acceleration: standing start to sprint between two samples.
  const samples = trace({ meters: 3_000, speedMps: 3.2, seed: seed++ });
  const spike = 10;
  samples[spike] = { ...samples[spike], moving_seconds: Number((samples[spike - 1].moving_seconds + 0.4).toFixed(2)) };
  for (let i = spike + 1; i < samples.length; i += 1) {
    samples[i] = { ...samples[i], moving_seconds: Number((samples[i].moving_seconds - 14).toFixed(2)) };
  }
  attacks.push({
    id: 'attack_impossible_acceleration', expectation: 'flagged', attack: 'acceleration',
    activity_type: 'road', source: 'direct_gps',
    declared_distance_meters: 3_000,
    declared_moving_seconds: Math.round(samples.at(-1).moving_seconds), samples,
  });
}

{
  // A generated route: perfectly constant pace, which no human produces.
  const samples = [{ cumulative_meters: 0, moving_seconds: 0, accuracy_meters: 3 }];
  for (let i = 1; i <= 200; i += 1) {
    samples.push({ cumulative_meters: i * 50, moving_seconds: Number((i * 50 / 3.5).toFixed(2)), accuracy_meters: 3 });
  }
  attacks.push({
    id: 'attack_synthetic_perfect_route', expectation: 'flagged', attack: 'synthetic',
    activity_type: 'road', source: 'direct_gps',
    declared_distance_meters: 10_000,
    declared_moving_seconds: Math.round(samples.at(-1).moving_seconds), samples,
  });
}

{
  const samples = trace({ meters: 10_000, speedMps: 3.3, seed: seed++ });
  attacks.push({
    id: 'attack_nonce_replay', expectation: 'flagged', attack: 'replay',
    activity_type: 'road', source: 'direct_gps', nonce_already_used: true,
    declared_distance_meters: 10_000,
    declared_moving_seconds: Math.round(samples.at(-1).moving_seconds), samples,
  });
  attacks.push({
    id: 'attack_duplicate_import', expectation: 'flagged', attack: 'duplicate',
    activity_type: 'road', source: 'health_connect', fingerprint_already_seen: true,
    declared_distance_meters: 10_000,
    declared_moving_seconds: Math.round(samples.at(-1).moving_seconds), samples,
  });
  attacks.push({
    id: 'attack_device_clock_tamper', expectation: 'flagged', attack: 'clock',
    activity_type: 'road', source: 'direct_gps', device_clock_skew_seconds: 86_400,
    declared_distance_meters: 10_000,
    declared_moving_seconds: Math.round(samples.at(-1).moving_seconds), samples,
  });
  attacks.push({
    id: 'attack_declared_distance_inflation', expectation: 'flagged', attack: 'distance_mismatch',
    activity_type: 'road', source: 'direct_gps',
    declared_distance_meters: 42_195,   // claims a marathon, trace shows 10 km
    declared_moving_seconds: Math.round(samples.at(-1).moving_seconds), samples,
  });
}

{
  // A journal whose records were reordered after the fact.
  const samples = trace({ meters: 5_000, speedMps: 3.3, seed: seed++ });
  const shuffled = [...samples];
  [shuffled[20], shuffled[40]] = [shuffled[40], shuffled[20]];
  attacks.push({
    id: 'attack_journal_reordered', expectation: 'flagged', attack: 'reorder',
    activity_type: 'road', source: 'direct_gps',
    declared_distance_meters: 5_000,
    declared_moving_seconds: Math.round(samples.at(-1).moving_seconds), samples: shuffled,
  });
}

// Non-running activities. Present ONLY to prove they are refused (master # 22.6).
for (const activity of ['trail', 'hiking', 'cycling', 'climbing']) {
  const samples = trace({ meters: 12_000, speedMps: 2.2, seed: seed++ });
  attacks.push({
    id: `attack_non_running_${activity}`, expectation: 'rejected', attack: 'non_running_source',
    activity_type: activity, source: 'health_connect',
    declared_distance_meters: 12_000,
    declared_moving_seconds: Math.round(samples.at(-1).moving_seconds), samples,
  });
}

{
  // Manual entry: honest but unverifiable. NOT an attack — it must be accepted as a
  // personal record and excluded from core power, never punished.
  attacks.push({
    id: 'edge_manual_entry', expectation: 'limited', attack: 'none',
    activity_type: 'road', source: 'manual',
    declared_distance_meters: 10_000, declared_moving_seconds: 3_000, samples: [],
  });
}

const corpus = {
  fixture_version: '1.0.0',
  generated_by: 'tools/run-fixture-generator/generate.mjs',
  deterministic: true,
  normal_count: normal.length,
  attack_count: attacks.length,
  normal,
  attacks,
};

const out = join(ROOT, 'content', 'fixtures');
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'run-fixtures.json'), `${JSON.stringify(corpus, null, 2)}\n`, 'utf8');

console.log(`run fixtures generated`);
console.log(`  normal : ${normal.length}`);
console.log(`  attack : ${attacks.length}`);
console.log(`  -> content/fixtures/run-fixtures.json`);
