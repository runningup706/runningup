/**
 * Verification and anti-cheat tests — master # 12, audit 4 and audit 7.
 *
 * The bias of this suite is deliberate: it spends more assertions on protecting honest
 * runners than on catching cheats, because a false positive withholds a reward somebody
 * genuinely earned, and the master treats that as the more serious harm.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { verifyRun, THRESHOLDS, DETECTION_VERSION } from '../packages/domain/anomaly-detection.mjs';
import { FORBIDDEN_ACTIVITY_TYPES } from '../packages/domain/constants.mjs';

/** A believable trace: steady effort with the small variations every real run has. */
function honestTrace(meters = 5_000, speed = 3.3) {
  const samples = [{ cumulative_meters: 0, moving_seconds: 0, accuracy_meters: 6 }];
  let distance = 0;
  let seconds = 0;
  let n = 0;
  while (distance < meters) {
    const step = Math.min(50, meters - distance);
    // A deterministic wobble, so the trace is neither synthetic nor flaky.
    const jitter = 1 + Math.sin(n++) * 0.05;
    distance += step;
    seconds += step / (speed * jitter);
    samples.push({
      cumulative_meters: Number(distance.toFixed(2)),
      moving_seconds: Number(seconds.toFixed(2)),
      accuracy_meters: 6,
    });
  }
  return samples;
}

const honestSession = (over = {}) => {
  const samples = over.samples ?? honestTrace();
  return {
    activity_type: 'road',
    source: 'direct_gps',
    declared_distance_meters: Math.round(samples.at(-1).cumulative_meters),
    declared_moving_seconds: Math.round(samples.at(-1).moving_seconds),
    samples,
    ...over,
  };
};

test('an ordinary GPS run verifies at grade A with no reasons', () => {
  const result = verifyRun(honestSession());
  assert.equal(result.status, 'verified');
  assert.equal(result.grade, 'A');
  assert.deepEqual(result.reasons, []);
  assert.equal(result.version, DETECTION_VERSION);
});

test('a treadmill run is a first-class verified session', () => {
  const result = verifyRun(honestSession({ activity_type: 'treadmill', source: 'indoor_sensor' }));
  assert.ok(['verified', 'verified_limited'].includes(result.status));
  assert.notEqual(result.grade, 'X');
});

test('DL-3: every non-running source is rejected outright', () => {
  for (const activity of FORBIDDEN_ACTIVITY_TYPES) {
    const result = verifyRun(honestSession({ activity_type: activity, source: 'health_connect' }));
    assert.equal(result.status, 'rejected', `${activity} must be rejected`);
    assert.equal(result.grade, 'X');
    assert.ok(result.reasons.some((r) => r.code === 'non_running_source'));
  }
});

test('a replayed nonce and a duplicate fingerprint are both refused', () => {
  const replay = verifyRun(honestSession({ nonce_already_used: true }));
  assert.equal(replay.status, 'rejected');
  assert.ok(replay.reasons.some((r) => r.code === 'nonce_replay'));

  const duplicate = verifyRun(honestSession({ source: 'health_connect', fingerprint_already_seen: true }));
  assert.equal(duplicate.status, 'rejected');
  assert.ok(duplicate.reasons.some((r) => r.code === 'duplicate_fingerprint'));
});

test('a teleport is detected and never verified', () => {
  const samples = honestTrace();
  const cut = Math.floor(samples.length / 2);
  for (let i = cut; i < samples.length; i += 1) {
    samples[i] = { ...samples[i], cumulative_meters: samples[i].cumulative_meters + 3_000 };
  }
  const result = verifyRun(honestSession({ samples }));
  assert.ok(result.reasons.some((r) => r.code === 'teleport'));
  assert.notEqual(result.status, 'verified');
});

test('a vehicle-speed trace is never verified', () => {
  const result = verifyRun(honestSession({ samples: honestTrace(20_000, 14) }));
  assert.notEqual(result.status, 'verified');
  assert.ok(result.reasons.some((r) => ['impossible_speed', 'vehicle_like_speed'].includes(r.code)));
});

test('a perfectly regular trace is treated as synthetic', () => {
  const samples = [{ cumulative_meters: 0, moving_seconds: 0, accuracy_meters: 3 }];
  for (let i = 1; i <= 100; i += 1) {
    samples.push({ cumulative_meters: i * 50, moving_seconds: i * 50 / 3.5, accuracy_meters: 3 });
  }
  const result = verifyRun(honestSession({ samples }));
  assert.ok(result.reasons.some((r) => r.code === 'synthetic_route'));
  assert.notEqual(result.status, 'verified');
});

test('claiming a marathon on a 5 km trace is caught', () => {
  const result = verifyRun(honestSession({ declared_distance_meters: 42_195 }));
  assert.ok(result.reasons.some((r) => r.code === 'distance_mismatch'));
});

test('a tampered device clock reaches review rather than silent acceptance', () => {
  const result = verifyRun(honestSession({ device_clock_skew_seconds: 86_400 }));
  assert.ok(result.reasons.some((r) => r.code.startsWith('device_clock_skew')));
  assert.ok(!['verified', 'verified_limited'].includes(result.status),
    `a 24 hour skew must not be accepted, got ${result.status}`);
  // But it must not be an automatic rejection either: master # 12 forbids auto-banning on
  // a single heuristic.
  assert.equal(result.status, 'pending_review');
});

test('ordinary clock drift is tolerated', () => {
  const result = verifyRun(honestSession({ device_clock_skew_seconds: 120 }));
  assert.equal(result.status, 'verified');
  assert.deepEqual(result.reasons, []);
});

// --------------------------------------------------------------------------
// Protecting honest runners
// --------------------------------------------------------------------------

test('poor urban GPS is not treated as cheating', () => {
  const samples = honestTrace().map((s) => ({ ...s, accuracy_meters: 80 }));
  const result = verifyRun(honestSession({ samples }));
  assert.ok(['verified', 'verified_limited'].includes(result.status),
    `a genuine run with weak GPS must still count, got ${result.status}`);
  assert.notEqual(result.grade, 'X');
});

test('a run-walk session survives its large pace swings', () => {
  const samples = [{ cumulative_meters: 0, moving_seconds: 0, accuracy_meters: 8 }];
  let distance = 0;
  let seconds = 0;
  for (let segment = 0; segment < 16; segment += 1) {
    const speed = segment % 2 === 0 ? 3.1 : 1.4;   // run, then walk
    for (let i = 0; i < 4; i += 1) {
      distance += 50;
      seconds += 50 / speed;
      samples.push({ cumulative_meters: distance, moving_seconds: seconds, accuracy_meters: 8 });
    }
  }
  const result = verifyRun(honestSession({ samples }));
  assert.ok(['verified', 'verified_limited'].includes(result.status),
    `a beginner run-walk must not be flagged, got ${result.status} (${result.reasons.map((r) => r.code)})`);
});

test('an interval session survives its deliberate speed changes', () => {
  const samples = [{ cumulative_meters: 0, moving_seconds: 0, accuracy_meters: 6 }];
  let distance = 0;
  let seconds = 0;
  for (const speed of [4.4, 2.4, 4.4, 2.4, 4.4, 2.4]) {
    for (let i = 0; i < 8; i += 1) {
      distance += 50;
      seconds += 50 / speed;
      samples.push({ cumulative_meters: distance, moving_seconds: seconds, accuracy_meters: 6 });
    }
  }
  const result = verifyRun(honestSession({ samples, activity_type: 'track' }));
  assert.ok(['verified', 'verified_limited'].includes(result.status),
    `an interval workout must not be flagged, got ${result.status}`);
});

test('a manual entry is limited, not punished', () => {
  const result = verifyRun({
    activity_type: 'road', source: 'manual',
    declared_distance_meters: 10_000, declared_moving_seconds: 3_000, samples: [],
  });
  assert.equal(result.status, 'verified_limited');
  assert.equal(result.grade, 'D', 'grade D is personal-record-only, which is the point');
  assert.notEqual(result.status, 'rejected');
});

test('a very short but genuine run is verified', () => {
  const result = verifyRun(honestSession({ samples: honestTrace(400, 4.2) }));
  assert.ok(['verified', 'verified_limited'].includes(result.status));
});

test('every reason carries a machine-readable code and a human explanation', () => {
  const result = verifyRun(honestSession({
    samples: honestTrace(20_000, 14),
    device_clock_skew_seconds: 90_000,
  }));
  assert.ok(result.reasons.length > 0);
  for (const reason of result.reasons) {
    assert.match(reason.code, /^[a-z_]+$/);
    assert.ok(reason.detail.length > 10, 'a reason must be explainable to a support agent');
  }
});

test('thresholds are exported so a change is reviewable rather than buried', () => {
  assert.ok(THRESHOLDS.max_instant_speed_mps > 0);
  assert.ok(THRESHOLDS.severe_device_clock_skew_seconds > THRESHOLDS.max_device_clock_skew_seconds);
});
