/**
 * Best-effort extraction tests — master # 10.9.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { extractBestEfforts } from '../packages/domain/best-effort.mjs';

/** Build a session whose speed profile is given per 100 m segment. */
function buildSamples(speedsPer100m, accuracy = 5) {
  const samples = [{ cumulative_meters: 0, moving_seconds: 0, accuracy_meters: accuracy }];
  let meters = 0;
  let seconds = 0;
  for (const speed of speedsPer100m) {
    meters += 100;
    seconds += 100 / speed;
    samples.push({ cumulative_meters: meters, moving_seconds: seconds, accuracy_meters: accuracy });
  }
  return samples;
}

test('a steady 5 km session yields best efforts for every distance up to 5 km only', () => {
  const samples = buildSamples(Array(50).fill(3.33));
  const { best_efforts, session_total_meters } = extractBestEfforts(samples);

  assert.equal(session_total_meters, 5_000);
  const distances = best_efforts.map((b) => b.distance_meters);
  assert.deepEqual(distances, [400, 800, 1_000, 1609.344, 2_000, 3_000, 5_000]);
  assert.ok(!distances.some((d) => d > 5_000), 'never report a best effort longer than the session');
});

test('the fastest segment is found wherever it occurs, not just at the start', () => {
  // 2 km easy, then a hard 1 km, then 2 km easy.
  const samples = buildSamples([
    ...Array(20).fill(2.8),
    ...Array(10).fill(4.5),
    ...Array(20).fill(2.8),
  ]);
  const { best_efforts } = extractBestEfforts(samples);
  const oneK = best_efforts.find((b) => b.distance_meters === 1_000);

  assert.ok(oneK, '1 km best effort must be found');
  assert.ok(Math.abs(oneK.duration_seconds - 1000 / 4.5) < 1.5,
    `expected the hard kilometre (~${(1000 / 4.5).toFixed(1)}s), got ${oneK.duration_seconds}s`);
  assert.ok(oneK.start_index >= 15, 'the segment is located in the fast section');
});

test('a best effort is never faster than the session as a whole allows', () => {
  const samples = buildSamples(Array(100).fill(3.0));
  const { best_efforts, session_moving_seconds, session_total_meters } = extractBestEfforts(samples);
  const sessionSpeed = session_total_meters / session_moving_seconds;

  for (const effort of best_efforts) {
    assert.ok(effort.speed_mps <= sessionSpeed * 1.02,
      `${effort.distance_meters} m best effort faster than physically possible for a constant-pace run`);
  }
});

test('poor GPS accuracy flags the effort as low confidence rather than discarding it', () => {
  const samples = buildSamples(Array(20).fill(3.3), 120);
  const { best_efforts } = extractBestEfforts(samples);
  assert.ok(best_efforts.length > 0, 'low accuracy data still produces a personal record');
  assert.ok(best_efforts.every((b) => b.low_confidence), 'and it is clearly flagged');
});

test('non-monotonic journal samples are rejected as an integrity signal', () => {
  const samples = [
    { cumulative_meters: 0, moving_seconds: 0 },
    { cumulative_meters: 500, moving_seconds: 150 },
    { cumulative_meters: 200, moving_seconds: 200 },   // distance went backwards
    { cumulative_meters: 1_000, moving_seconds: 300 },
  ];
  const { best_efforts, session_total_meters } = extractBestEfforts(samples);
  assert.equal(session_total_meters, 1_000);
  const oneK = best_efforts.find((b) => b.distance_meters === 1_000);
  assert.ok(oneK, 'the surviving samples still yield a 1 km effort');
  assert.ok(oneK.duration_seconds > 0);
});

test('an impossible split is discarded instead of becoming a world record', () => {
  const samples = [
    { cumulative_meters: 0, moving_seconds: 0 },
    { cumulative_meters: 1_000, moving_seconds: 5 },   // 200 m/s: corrupted
  ];
  const { best_efforts } = extractBestEfforts(samples);
  assert.deepEqual(best_efforts, [], 'a physically impossible segment is not a best effort');
});

test('a session shorter than the shortest benchmark yields no best efforts', () => {
  const samples = buildSamples(Array(3).fill(3.0));   // 300 m
  const { best_efforts } = extractBestEfforts(samples);
  assert.deepEqual(best_efforts, []);
});

test('a marathon session produces the full benchmark ladder including the marathon itself', () => {
  const samples = buildSamples(Array(422).fill(3.0));
  const { best_efforts } = extractBestEfforts(samples);
  const distances = best_efforts.map((b) => b.distance_meters);
  for (const expected of [400, 1_000, 5_000, 10_000, 21097.5, 42_195]) {
    assert.ok(distances.includes(expected), `missing ${expected} m best effort`);
  }
});
