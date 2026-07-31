/**
 * Monthly Apex Ladder — 0..1000 km, 52 checkpoints, World Crown as the single final state.
 *
 * This module is the client/tooling mirror of the authoritative SQL implementation in
 * `backend/supabase/migrations/0003_monthly_apex.sql` (`private.apply_verified_run_reward`).
 * The server is always the authority; this mirror exists so the simulator, the balance
 * tooling and the Unity client can *preview* an outcome with the identical rule set, and so
 * the pgTAP suite and the JS suite can be cross-checked against one another.
 *
 * Direction lock DL-1 invariants enforced here:
 *   - a checkpoint threshold above 1_000_000 m cannot exist
 *   - crossing a threshold twice is impossible
 *   - rank never rises above `world_crown`
 *   - distance beyond 1000 km is recorded as over-crown distance and still earns the
 *     ordinary per-run reward, but produces no new checkpoint, rank or multiplier
 */

import { APEX_CHECKPOINT_METERS, DIRECTION_LOCK, checkpointId, rankForMeters } from './constants.mjs';

/** Sanity check executed at import time: the seed must match the locked shape. */
if (APEX_CHECKPOINT_METERS.length !== DIRECTION_LOCK.CHECKPOINT_COUNT) {
  throw new Error(`checkpoint seed must contain exactly ${DIRECTION_LOCK.CHECKPOINT_COUNT} entries`);
}
if (APEX_CHECKPOINT_METERS.at(-1) !== DIRECTION_LOCK.FINAL_APEX_METERS) {
  throw new Error('final checkpoint must be exactly 1000 km');
}
for (let i = 1; i < APEX_CHECKPOINT_METERS.length; i += 1) {
  if (APEX_CHECKPOINT_METERS[i] <= APEX_CHECKPOINT_METERS[i - 1]) {
    throw new Error('checkpoint seed must be strictly ascending');
  }
  if (APEX_CHECKPOINT_METERS[i] > DIRECTION_LOCK.FINAL_APEX_METERS) {
    throw new Error('no checkpoint may exceed 1000 km');
  }
}

/**
 * @typedef {object} ApexProgress
 * @property {boolean} exists            whether a progress row already exists this month
 * @property {number}  laddered_meters   credited ladder distance so far, capped at 1000 km
 * @property {number}  over_crown_meters raw distance already banked beyond 1000 km
 * @property {boolean} world_crown_awarded
 * @property {boolean} apex_axis_unlocked
 */

/** A fresh month. `exists:false` means the journey-start checkpoint has not been granted yet. */
export function emptyProgress() {
  return {
    exists: false,
    laddered_meters: 0,
    over_crown_meters: 0,
    world_crown_awarded: false,
    apex_axis_unlocked: false,
  };
}

/**
 * Apply one verified running distance to a month's ladder.
 *
 * @param {ApexProgress} before
 * @param {number} sessionMeters integer meters credited by verification (>= 0)
 * @returns {{
 *   before: ApexProgress,
 *   after: ApexProgress,
 *   crossed_checkpoints: Array<{checkpoint_id: string, index: number, threshold_meters: number}>,
 *   rank_before: string,
 *   rank_after: string,
 *   world_crown_awarded_now: boolean,
 *   apex_axis_unlocked_now: boolean,
 *   over_crown_meters_added: number,
 *   base_run_reward_applies: boolean
 * }}
 */
export function applyDistance(before, sessionMeters) {
  if (!Number.isInteger(sessionMeters) || sessionMeters < 0) {
    throw new RangeError(`sessionMeters must be a non-negative integer (got ${sessionMeters})`);
  }
  const cap = DIRECTION_LOCK.FINAL_APEX_METERS;

  const rawTotalBefore = before.laddered_meters + before.over_crown_meters;
  const rawTotalAfter = rawTotalBefore + sessionMeters;

  const ladderedAfter = Math.min(rawTotalAfter, cap);
  const overCrownAfter = Math.max(rawTotalAfter - cap, 0);

  // A brand new month has crossed nothing at all, so the journey-start checkpoint (0 km)
  // is granted by the first verified run. `-1` is the "no row yet" sentinel.
  const previous = before.exists ? before.laddered_meters : -1;

  const crossed = [];
  for (let i = 0; i < APEX_CHECKPOINT_METERS.length; i += 1) {
    const threshold = APEX_CHECKPOINT_METERS[i];
    if (threshold > previous && threshold <= ladderedAfter) {
      crossed.push({ checkpoint_id: checkpointId(i), index: i, threshold_meters: threshold });
    }
  }
  // Crossings are emitted in ascending threshold order so a multi-checkpoint run claims
  // its bundles in journey order rather than all at once out of sequence.

  const crownNow = !before.world_crown_awarded && ladderedAfter >= cap;
  const axisNow = !before.apex_axis_unlocked && ladderedAfter >= cap;

  const after = {
    exists: true,
    laddered_meters: ladderedAfter,
    over_crown_meters: overCrownAfter,
    world_crown_awarded: before.world_crown_awarded || crownNow,
    apex_axis_unlocked: before.apex_axis_unlocked || axisNow,
  };

  const rankBefore = rankForMeters(before.laddered_meters).id;
  const rankAfter = rankForMeters(after.laddered_meters).id;

  // DL-1: the ladder may never regress and may never exceed the final rank.
  if (rankForMeters(after.laddered_meters).order < rankForMeters(before.laddered_meters).order) {
    throw new Error('monthly rank regression is impossible');
  }
  if (after.laddered_meters > cap) {
    throw new Error('laddered distance exceeded the 1000 km final checkpoint');
  }

  return {
    before,
    after,
    crossed_checkpoints: crossed,
    rank_before: rankBefore,
    rank_after: rankAfter,
    world_crown_awarded_now: crownNow,
    apex_axis_unlocked_now: axisNow,
    over_crown_meters_added: overCrownAfter - before.over_crown_meters,
    // DL-1: verified running past the crown always keeps its ordinary per-run reward.
    base_run_reward_applies: true,
  };
}

/**
 * Apply a batch of sessions (e.g. a current-month Health Connect import that arrives
 * out of chronological order). Sessions are deduplicated by `idempotency_key` and the
 * ladder result is order-independent: the set of crossed checkpoints for a given total
 * is identical whichever order the sessions arrive in.
 *
 * @param {ApexProgress} start
 * @param {Array<{idempotency_key: string, meters: number}>} sessions
 */
export function applyBatch(start, sessions) {
  const seen = new Set();
  let progress = start;
  const allCrossed = [];
  const applied = [];
  const duplicates = [];

  for (const session of sessions) {
    if (seen.has(session.idempotency_key)) {
      duplicates.push(session.idempotency_key);
      continue;
    }
    seen.add(session.idempotency_key);
    const result = applyDistance(progress, session.meters);
    progress = result.after;
    allCrossed.push(...result.crossed_checkpoints);
    applied.push({ idempotency_key: session.idempotency_key, result });
  }

  allCrossed.sort((a, b) => a.threshold_meters - b.threshold_meters);
  return { progress, crossed_checkpoints: allCrossed, applied, duplicates };
}

/** The next 1..n checkpoints ahead of the user, for the Today/home screen. */
export function nextCheckpoints(progress, count = 3) {
  const out = [];
  for (let i = 0; i < APEX_CHECKPOINT_METERS.length && out.length < count; i += 1) {
    const threshold = APEX_CHECKPOINT_METERS[i];
    if (threshold > progress.laddered_meters) {
      out.push({
        checkpoint_id: checkpointId(i),
        threshold_meters: threshold,
        remaining_meters: threshold - progress.laddered_meters,
      });
    }
  }
  return out;
}

/** Complete ladder snapshot for the Monthly Apex screen. */
export function ladderSnapshot(progress) {
  return {
    version: 'apex.v1.0.0',
    laddered_meters: progress.laddered_meters,
    over_crown_meters: progress.over_crown_meters,
    rank: rankForMeters(progress.laddered_meters).id,
    is_final_rank: progress.laddered_meters >= DIRECTION_LOCK.FINAL_APEX_METERS,
    world_crown_awarded: progress.world_crown_awarded,
    apex_axis_unlocked: progress.apex_axis_unlocked,
    checkpoints_reached: APEX_CHECKPOINT_METERS.filter(
      (m, i) => (progress.exists ? m <= progress.laddered_meters : false) && i >= 0,
    ).length,
    checkpoints_total: DIRECTION_LOCK.CHECKPOINT_COUNT,
    next: nextCheckpoints(progress, 3),
    // There is nothing after the crown. The UI renders this as a completed journey,
    // never as an empty slot, a lock, or a "coming soon" tier.
    has_tier_above_final: false,
  };
}
