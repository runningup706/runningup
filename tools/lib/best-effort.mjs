/**
 * Distance best-effort extraction.
 *
 * Master # 10.9: find the fastest valid segment for each benchmark distance inside one
 * session, honouring pauses and GPS uncertainty, and never producing a best effort that
 * contradicts the session total.
 *
 * The extractor works on the cumulative (distance, elapsed-moving-time) curve with a
 * two-pointer sweep, which is O(n) per distance and safe for a 50 km session on a phone.
 */

import { BEST_EFFORT_DISTANCES } from './constants.mjs';

/**
 * @typedef {object} Sample
 * @property {number} cumulative_meters  monotonically non-decreasing
 * @property {number} moving_seconds     monotonically non-decreasing, pause time excluded
 * @property {number} [accuracy_meters]  horizontal accuracy; poor samples widen uncertainty
 */

/**
 * @param {Sample[]} samples
 * @param {object} [options]
 * @param {number} [options.max_accuracy_meters=50] samples worse than this are treated as
 *   low-confidence: a segment containing one is still reported but flagged.
 * @param {number[]} [options.distances] override the benchmark distance list
 */
export function extractBestEfforts(samples, options = {}) {
  const maxAccuracy = options.max_accuracy_meters ?? 50;
  const distances = options.distances ?? BEST_EFFORT_DISTANCES;

  const clean = validate(samples);
  if (clean.length < 2) return { session_total_meters: 0, session_moving_seconds: 0, best_efforts: [] };

  const totalMeters = clean.at(-1).cumulative_meters;
  const totalSeconds = clean.at(-1).moving_seconds;

  const results = [];
  for (const target of distances) {
    if (totalMeters + 1e-6 < target) continue;   // session shorter than the benchmark
    const found = fastestSegment(clean, target, maxAccuracy);
    if (!found) continue;

    // A best effort can never be faster than physically consistent with the session:
    // guard against a corrupted sample pair producing an absurd split.
    const speed = found.seconds > 0 ? target / found.seconds : Infinity;
    if (!Number.isFinite(speed) || speed > 12.5) continue;   // > 12.5 m/s is not a run

    results.push({
      distance_meters: target,
      duration_seconds: round2(found.seconds),
      speed_mps: round3(speed),
      pace_seconds_per_km: round2(1000 / speed),
      start_index: found.start,
      end_index: found.end,
      low_confidence: found.lowConfidence,
    });
  }

  return {
    session_total_meters: round2(totalMeters),
    session_moving_seconds: round2(totalSeconds),
    best_efforts: results,
  };
}

function validate(samples) {
  const out = [];
  let lastMeters = -Infinity;
  let lastSeconds = -Infinity;
  for (const s of samples) {
    if (!Number.isFinite(s.cumulative_meters) || !Number.isFinite(s.moving_seconds)) continue;
    // Reject non-monotonic samples outright rather than "repairing" them: a journal that
    // goes backwards is an integrity signal for the anti-cheat pipeline, not noise.
    if (s.cumulative_meters < lastMeters || s.moving_seconds < lastSeconds) continue;
    lastMeters = s.cumulative_meters;
    lastSeconds = s.moving_seconds;
    out.push(s);
  }
  return out;
}

function fastestSegment(samples, target, maxAccuracy) {
  let best = null;
  let start = 0;
  for (let end = 0; end < samples.length; end += 1) {
    while (
      start < end
      && samples[end].cumulative_meters - samples[start + 1]?.cumulative_meters >= target - 1e-6
    ) {
      start += 1;
    }
    const span = samples[end].cumulative_meters - samples[start].cumulative_meters;
    if (span + 1e-6 < target) continue;

    // Interpolate the exact target distance inside the [start, start+1] gap so a 1 km
    // best effort is not inflated by whatever sample spacing the device happened to use.
    const seconds = interpolatedSeconds(samples, start, end, target);
    if (seconds === null) continue;

    if (best === null || seconds < best.seconds) {
      let lowConfidence = false;
      for (let i = start; i <= end; i += 1) {
        if ((samples[i].accuracy_meters ?? 0) > maxAccuracy) { lowConfidence = true; break; }
      }
      best = { seconds, start, end, lowConfidence };
    }
  }
  return best;
}

function interpolatedSeconds(samples, start, end, target) {
  const endMeters = samples[end].cumulative_meters;
  const wanted = endMeters - target;              // where the segment must begin
  const a = samples[start];
  const b = samples[start + 1];
  if (!b || a.cumulative_meters > wanted) {
    return samples[end].moving_seconds - a.moving_seconds;
  }
  const segMeters = b.cumulative_meters - a.cumulative_meters;
  if (segMeters <= 0) return samples[end].moving_seconds - a.moving_seconds;
  const t = (wanted - a.cumulative_meters) / segMeters;
  const startSeconds = a.moving_seconds + t * (b.moving_seconds - a.moving_seconds);
  return samples[end].moving_seconds - startSeconds;
}

const round2 = (n) => Math.round(n * 100) / 100;
const round3 = (n) => Math.round(n * 1000) / 1000;
