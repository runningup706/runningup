/**
 * Run verification and anomaly detection.
 *
 * Master # 12: the server decides, the client only previews. A single heuristic never
 * auto-bans anybody — signals accumulate into a confidence score, and the outcome is one of
 * four states. A rejected run still keeps its personal record; only the competitive reward
 * is withheld, and the user can appeal.
 *
 * Deliberate design choices:
 *   - every signal carries a machine-readable reason code, so a support agent and an appeal
 *     reviewer can see exactly what fired without reading the thresholds
 *   - thresholds live in one table and are versioned, because master # 12.3 requires
 *     threshold changes to be auditable rather than scattered through the code
 *   - the exact numbers are NOT surfaced to players (# 12), since publishing them is a
 *     recipe for tuning an attack to sit just underneath
 */

import { ALLOWED_ACTIVITY_TYPES } from './constants.mjs';

export const DETECTION_VERSION = 'anticheat.v1.0.0';

/**
 * Tuned against the fixtures in tools/run-fixture-generator. `weight` is how much a signal
 * contributes to the suspicion score; `hard` means the run cannot be `verified` regardless
 * of the score, because the signal is categorical rather than probabilistic.
 */
export const THRESHOLDS = Object.freeze({
  // 12.5 m/s is roughly a 1:20 min/km pace: beyond any human over a running distance.
  max_instant_speed_mps: 12.5,
  // A world-class sprinter peaks near 10 m/s^2; sustained values above this are a vehicle
  // or a teleport, not a runner.
  max_acceleration_mps2: 6.0,
  // A gap of more than 250 m between consecutive samples at running speed means the trace
  // jumped rather than moved.
  max_sample_gap_meters: 250,
  // Below this the recorded distance is dominated by GPS noise rather than movement.
  poor_accuracy_meters: 50,
  poor_accuracy_share_limit: 0.35,
  // A real run has pace variance. A perfectly constant trace is synthetic.
  min_pace_coefficient_of_variation: 0.012,
  // Device clock versus server clock.
  max_device_clock_skew_seconds: 300,
  // An hour of skew is no longer plausible drift.
  severe_device_clock_skew_seconds: 3_600,
  // Declared distance versus distance implied by the samples.
  max_distance_mismatch_ratio: 0.05,
});

const SIGNALS = Object.freeze({
  NON_RUNNING_SOURCE:      { code: 'non_running_source',      weight: 1.00, hard: true },
  NONCE_REPLAY:            { code: 'nonce_replay',            weight: 1.00, hard: true },
  DUPLICATE_FINGERPRINT:   { code: 'duplicate_fingerprint',   weight: 1.00, hard: true },
  IMPOSSIBLE_SPEED:        { code: 'impossible_speed',        weight: 0.80, hard: false },
  VEHICLE_LIKE_SPEED:      { code: 'vehicle_like_speed',      weight: 0.55, hard: false },
  IMPOSSIBLE_ACCELERATION: { code: 'impossible_acceleration', weight: 0.50, hard: false },
  TELEPORT:                { code: 'teleport',                weight: 0.60, hard: false },
  SYNTHETIC_ROUTE:         { code: 'synthetic_route',         weight: 0.55, hard: false },
  DISTANCE_MISMATCH:       { code: 'distance_mismatch',       weight: 0.45, hard: false },
  // Graded: a phone with a slightly wrong clock is ordinary, but a skew of hours is how a
  // run gets backdated into a previous month or used to manufacture a streak. Neither tier
  // rejects on its own — master # 12 forbids auto-banning on a single heuristic — but both
  // are heavy enough to reach review rather than being quietly accepted.
  DEVICE_CLOCK_SKEW:       { code: 'device_clock_skew',       weight: 0.45, hard: false },
  DEVICE_CLOCK_SKEW_SEVERE:{ code: 'device_clock_skew_severe',weight: 0.60, hard: false },
  SAMPLE_DISCONTINUITY:    { code: 'sample_discontinuity',    weight: 0.40, hard: false },
  POOR_ACCURACY:           { code: 'poor_accuracy',           weight: 0.20, hard: false },
  MANUAL_ENTRY:            { code: 'manual_entry',            weight: 0.00, hard: false },
});

/**
 * @param {object} session
 *   {string}   activity_type
 *   {string}   source              direct_gps | health_connect | indoor_sensor | manual | file_import
 *   {number}   declared_distance_meters
 *   {number}   declared_moving_seconds
 *   {Array}    samples             [{cumulative_meters, moving_seconds, accuracy_meters, latitude?, longitude?}]
 *   {number}   [device_clock_skew_seconds]
 *   {boolean}  [nonce_already_used]
 *   {boolean}  [fingerprint_already_seen]
 * @returns {{grade: string, status: string, confidence: number, suspicion: number,
 *            reasons: Array<{code: string, detail: string}>, version: string}}
 */
export function verifyRun(session) {
  const reasons = [];
  const fired = new Set();

  const add = (signal, detail) => {
    if (fired.has(signal.code)) return;
    fired.add(signal.code);
    reasons.push({ code: signal.code, detail, weight: signal.weight, hard: signal.hard });
  };

  // --- Categorical checks -------------------------------------------------
  if (!ALLOWED_ACTIVITY_TYPES.includes(session.activity_type)) {
    add(SIGNALS.NON_RUNNING_SOURCE, `activity_type "${session.activity_type}" is not a running activity`);
  }
  if (session.nonce_already_used) {
    add(SIGNALS.NONCE_REPLAY, 'the session nonce has already been redeemed');
  }
  if (session.fingerprint_already_seen) {
    add(SIGNALS.DUPLICATE_FINGERPRINT, 'an identical metric fingerprint was already accepted');
  }
  if (session.source === 'manual') {
    add(SIGNALS.MANUAL_ENTRY, 'manually entered distance, kept as a personal record only');
  }

  // --- Sample-derived checks ---------------------------------------------
  const samples = Array.isArray(session.samples) ? session.samples : [];
  const analysis = analyseSamples(samples);

  if (analysis.usable) {
    if (analysis.maxSpeed > THRESHOLDS.max_instant_speed_mps) {
      add(SIGNALS.IMPOSSIBLE_SPEED,
        `peak segment speed ${analysis.maxSpeed.toFixed(2)} m/s exceeds the human limit`);
    } else if (analysis.medianSpeed > 6.5) {
      // Sustainable by no runner over a full session, but not physically impossible for a
      // short burst — a bicycle profile rather than a teleport.
      add(SIGNALS.VEHICLE_LIKE_SPEED,
        `median speed ${analysis.medianSpeed.toFixed(2)} m/s is vehicle-like for a full session`);
    }

    if (analysis.maxAcceleration > THRESHOLDS.max_acceleration_mps2) {
      add(SIGNALS.IMPOSSIBLE_ACCELERATION,
        `peak acceleration ${analysis.maxAcceleration.toFixed(2)} m/s^2 is not physically achievable`);
    }

    if (analysis.maxGapMeters > THRESHOLDS.max_sample_gap_meters) {
      add(SIGNALS.TELEPORT,
        `a ${analysis.maxGapMeters.toFixed(0)} m jump appears between consecutive samples`);
    }

    if (analysis.paceCv !== null && analysis.paceCv < THRESHOLDS.min_pace_coefficient_of_variation) {
      add(SIGNALS.SYNTHETIC_ROUTE,
        `pace variation ${(analysis.paceCv * 100).toFixed(2)}% is too regular to be a real run`);
    }

    if (analysis.poorAccuracyShare > THRESHOLDS.poor_accuracy_share_limit) {
      add(SIGNALS.POOR_ACCURACY,
        `${(analysis.poorAccuracyShare * 100).toFixed(0)}% of samples exceed the accuracy limit`);
    }

    if (analysis.discontinuities > 0) {
      add(SIGNALS.SAMPLE_DISCONTINUITY,
        `${analysis.discontinuities} out-of-order or backwards samples in the journal`);
    }

    const declared = session.declared_distance_meters;
    if (declared > 0 && analysis.totalMeters > 0) {
      const mismatch = Math.abs(declared - analysis.totalMeters) / declared;
      if (mismatch > THRESHOLDS.max_distance_mismatch_ratio) {
        add(SIGNALS.DISTANCE_MISMATCH,
          `declared distance differs from the sample trace by ${(mismatch * 100).toFixed(1)}%`);
      }
    }
  }

  const skew = Math.abs(session.device_clock_skew_seconds ?? 0);
  if (skew > THRESHOLDS.severe_device_clock_skew_seconds) {
    add(SIGNALS.DEVICE_CLOCK_SKEW_SEVERE,
      `device clock differs from server time by ${skew} s, far beyond ordinary drift`);
  } else if (skew > THRESHOLDS.max_device_clock_skew_seconds) {
    add(SIGNALS.DEVICE_CLOCK_SKEW, `device clock differs from server time by ${skew} s`);
  }

  // --- Aggregate ----------------------------------------------------------
  // Signals combine as independent probabilities rather than a plain sum, so several weak
  // signals raise suspicion without any single one dominating.
  let survival = 1;
  for (const reason of reasons) survival *= (1 - reason.weight);
  const suspicion = Number((1 - survival).toFixed(4));
  const hardFail = reasons.some((r) => r.hard);

  return {
    version: DETECTION_VERSION,
    ...decide({ session, suspicion, hardFail, reasons }),
    suspicion,
    reasons: reasons.map(({ code, detail }) => ({ code, detail })),
  };
}

function decide({ session, suspicion, hardFail, reasons }) {
  // A non-running source is never a running reward, whatever else the trace looks like.
  if (reasons.some((r) => r.code === SIGNALS.NON_RUNNING_SOURCE.code)) {
    return { grade: 'X', status: 'rejected', confidence: 1 };
  }
  if (hardFail) {
    return { grade: 'X', status: 'rejected', confidence: Number((1 - suspicion).toFixed(3)) };
  }
  // Manual entry is honest but unverifiable: it is kept as history, excluded from core
  // power and competition, and is NOT treated as cheating.
  if (session.source === 'manual') {
    return { grade: 'D', status: 'verified_limited', confidence: 0.5 };
  }

  if (suspicion >= 0.75) return { grade: 'X', status: 'rejected', confidence: Number((1 - suspicion).toFixed(3)) };
  if (suspicion >= 0.40) return { grade: 'C', status: 'pending_review', confidence: Number((1 - suspicion).toFixed(3)) };
  if (suspicion >= 0.15) return { grade: 'B', status: 'verified_limited', confidence: Number((1 - suspicion).toFixed(3)) };

  const grade = session.source === 'direct_gps' ? 'A'
    : session.source === 'health_connect' ? 'B'
      : session.source === 'indoor_sensor' ? 'B'
        : 'C';
  return { grade, status: 'verified', confidence: Number((1 - suspicion).toFixed(3)) };
}

function analyseSamples(samples) {
  if (samples.length < 3) {
    return { usable: false, totalMeters: 0, maxSpeed: 0, medianSpeed: 0, maxAcceleration: 0, maxGapMeters: 0, paceCv: null, poorAccuracyShare: 0, discontinuities: 0 };
  }

  const speeds = [];
  let maxSpeed = 0;
  let maxAcceleration = 0;
  let maxGap = 0;
  let discontinuities = 0;
  let poorAccuracy = 0;
  let previousSpeed = null;

  for (let i = 1; i < samples.length; i += 1) {
    const a = samples[i - 1];
    const b = samples[i];
    const dm = b.cumulative_meters - a.cumulative_meters;
    const dt = b.moving_seconds - a.moving_seconds;

    if (dm < 0 || dt < 0) { discontinuities += 1; continue; }
    if (dm > maxGap) maxGap = dm;
    if (dt <= 0) continue;

    const speed = dm / dt;
    speeds.push(speed);
    if (speed > maxSpeed) maxSpeed = speed;

    if (previousSpeed !== null) {
      const acceleration = Math.abs(speed - previousSpeed) / dt;
      if (acceleration > maxAcceleration) maxAcceleration = acceleration;
    }
    previousSpeed = speed;
  }

  for (const s of samples) {
    if ((s.accuracy_meters ?? 0) > THRESHOLDS.poor_accuracy_meters) poorAccuracy += 1;
  }

  const sorted = [...speeds].sort((x, y) => x - y);
  const medianSpeed = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;

  let paceCv = null;
  if (speeds.length >= 5) {
    const mean = speeds.reduce((x, y) => x + y, 0) / speeds.length;
    if (mean > 0) {
      const variance = speeds.reduce((acc, v) => acc + (v - mean) ** 2, 0) / speeds.length;
      paceCv = Math.sqrt(variance) / mean;
    }
  }

  return {
    usable: true,
    totalMeters: samples.at(-1).cumulative_meters - samples[0].cumulative_meters,
    maxSpeed,
    medianSpeed,
    maxAcceleration,
    maxGapMeters: maxGap,
    paceCv,
    poorAccuracyShare: poorAccuracy / samples.length,
    discontinuities,
  };
}
