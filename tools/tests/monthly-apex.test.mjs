/**
 * Monthly Apex 0..1000 km acceptance tests.
 * Covers every case listed in master # 22.3 "Monthly Apex 0~1000" and audit 3.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { APEX_CHECKPOINT_METERS, DIRECTION_LOCK, MAJOR_RANKS, rankForMeters, checkpointId } from '../lib/constants.mjs';
import { applyDistance, applyBatch, emptyProgress, ladderSnapshot, nextCheckpoints } from '../lib/monthly-apex.mjs';

const KM = 1000;

test('seed shape: exactly 52 checkpoints, ascending, final is exactly 1000 km', () => {
  assert.equal(APEX_CHECKPOINT_METERS.length, 52);
  assert.equal(DIRECTION_LOCK.CHECKPOINT_COUNT, 52);
  assert.equal(APEX_CHECKPOINT_METERS.at(-1), 1_000_000);
  for (let i = 1; i < APEX_CHECKPOINT_METERS.length; i += 1) {
    assert.ok(APEX_CHECKPOINT_METERS[i] > APEX_CHECKPOINT_METERS[i - 1], `not ascending at ${i}`);
  }
  assert.ok(APEX_CHECKPOINT_METERS.every((m) => m <= 1_000_000), 'no checkpoint may exceed 1000 km');
});

test('DL-1: no checkpoint at 1250/1500/2000 km and no rank above World Crown', () => {
  for (const forbidden of [1_250_000, 1_500_000, 2_000_000]) {
    assert.ok(!APEX_CHECKPOINT_METERS.includes(forbidden), `forbidden tier ${forbidden} present`);
  }
  const maxOrder = Math.max(...MAJOR_RANKS.map((r) => r.order));
  const crown = MAJOR_RANKS.find((r) => r.id === 'world_crown');
  assert.equal(crown.order, maxOrder, 'world_crown must be the highest rank order');
  assert.equal(MAJOR_RANKS.filter((r) => r.id !== 'world_crown').length, 11, '11 major ranks + World Crown');
  assert.equal(crown.max_meters, null, 'World Crown is open-ended: nothing exists above it');
});

test('42.195 km marathon-symbolic checkpoint is exact', () => {
  assert.ok(APEX_CHECKPOINT_METERS.includes(42_195));
  const idx = APEX_CHECKPOINT_METERS.indexOf(42_195);
  assert.equal(checkpointId(idx), 'apex_cp_11_42p195km');
});

test('first verified run of a month grants the journey-start checkpoint', () => {
  const r = applyDistance(emptyProgress(), 5_200);
  const ids = r.crossed_checkpoints.map((c) => c.threshold_meters);
  assert.deepEqual(ids, [0, 1_000, 3_000, 5_000]);
  assert.equal(r.after.laddered_meters, 5_200);
});

test('exactly at a checkpoint crosses it; one meter short does not', () => {
  const short = applyDistance(emptyProgress(), 9_999);
  assert.ok(!short.crossed_checkpoints.some((c) => c.threshold_meters === 10_000));

  const exact = applyDistance(emptyProgress(), 10_000);
  assert.ok(exact.crossed_checkpoints.some((c) => c.threshold_meters === 10_000));
});

test('a single run crossing many checkpoints claims them all, ascending, no gap, no duplicate', () => {
  const r = applyDistance(emptyProgress(), 100 * KM);
  const thresholds = r.crossed_checkpoints.map((c) => c.threshold_meters);
  const expected = APEX_CHECKPOINT_METERS.filter((m) => m <= 100_000);
  assert.deepEqual(thresholds, expected);
  assert.equal(new Set(thresholds).size, thresholds.length, 'no duplicate crossing');
  for (let i = 1; i < thresholds.length; i += 1) {
    assert.ok(thresholds[i] > thresholds[i - 1], 'crossings must be ascending');
  }
});

test('999.999 km then one metre reaches exactly 1000 km and awards World Crown once', () => {
  const a = applyDistance(emptyProgress(), 999_999);
  assert.equal(a.after.laddered_meters, 999_999);
  assert.equal(a.rank_after, 'apex');
  assert.equal(a.after.world_crown_awarded, false);
  assert.ok(!a.crossed_checkpoints.some((c) => c.threshold_meters === 1_000_000));

  const b = applyDistance(a.after, 1);
  assert.equal(b.after.laddered_meters, 1_000_000);
  assert.equal(b.rank_after, 'world_crown');
  assert.equal(b.world_crown_awarded_now, true);
  assert.equal(b.apex_axis_unlocked_now, true);
  assert.deepEqual(b.crossed_checkpoints.map((c) => c.threshold_meters), [1_000_000]);

  // Running further in the same month must not award the crown or the boss a second time.
  const c = applyDistance(b.after, 50 * KM);
  assert.equal(c.world_crown_awarded_now, false);
  assert.equal(c.apex_axis_unlocked_now, false);
  assert.deepEqual(c.crossed_checkpoints, []);
});

test('exceeding 1000 km inside one session: ladder stops at the crown, surplus is over-crown', () => {
  const r = applyDistance(emptyProgress(), 1_200_000);
  assert.equal(r.after.laddered_meters, 1_000_000);
  assert.equal(r.after.over_crown_meters, 200_000);
  assert.equal(r.rank_after, 'world_crown');
  assert.equal(r.crossed_checkpoints.length, 52, 'all 52 checkpoints claimed exactly once');
  assert.equal(r.crossed_checkpoints.at(-1).threshold_meters, 1_000_000);
});

test('DL-1: a user already at the crown keeps earning base reward but gains no new tier', () => {
  const crowned = applyDistance(emptyProgress(), 1_000_000).after;
  const extra = applyDistance(crowned, 25 * KM);

  assert.equal(extra.crossed_checkpoints.length, 0, 'no new checkpoint above 1000 km');
  assert.equal(extra.rank_before, 'world_crown');
  assert.equal(extra.rank_after, 'world_crown', 'rank never rises above World Crown');
  assert.equal(extra.after.laddered_meters, 1_000_000, 'ladder is frozen at the crown');
  assert.equal(extra.after.over_crown_meters, 25_000, 'surplus recorded as over-crown distance');
  assert.equal(extra.base_run_reward_applies, true, 'ordinary per-run reward continues');
  assert.equal(extra.over_crown_meters_added, 25_000);
});

test('ladder snapshot never advertises a tier above the final one', () => {
  const crowned = applyDistance(emptyProgress(), 1_050_000).after;
  const snap = ladderSnapshot(crowned);
  assert.equal(snap.has_tier_above_final, false);
  assert.equal(snap.is_final_rank, true);
  assert.equal(snap.rank, 'world_crown');
  assert.deepEqual(snap.next, [], 'nothing is displayed after the crown');
  assert.equal(snap.checkpoints_total, 52);
  assert.equal(snap.checkpoints_reached, 52);
});

test('out-of-order import produces the same result as chronological order', () => {
  const chronological = [
    { idempotency_key: 'a', meters: 12_000 },
    { idempotency_key: 'b', meters: 8_000 },
    { idempotency_key: 'c', meters: 30_000 },
  ];
  const shuffled = [chronological[2], chronological[0], chronological[1]];

  const one = applyBatch(emptyProgress(), chronological);
  const two = applyBatch(emptyProgress(), shuffled);

  assert.equal(one.progress.laddered_meters, two.progress.laddered_meters);
  assert.deepEqual(
    one.crossed_checkpoints.map((c) => c.threshold_meters),
    two.crossed_checkpoints.map((c) => c.threshold_meters),
    'crossed checkpoint set is order independent',
  );
  // And both are emitted in journey order for the claim animation.
  const t = two.crossed_checkpoints.map((c) => c.threshold_meters);
  assert.deepEqual(t, [...t].sort((x, y) => x - y));
});

test('duplicate submissions are ignored by idempotency key', () => {
  const batch = [
    { idempotency_key: 'run-1', meters: 10_000 },
    { idempotency_key: 'run-1', meters: 10_000 },
    { idempotency_key: 'run-2', meters: 5_000 },
  ];
  const r = applyBatch(emptyProgress(), batch);
  assert.equal(r.progress.laddered_meters, 15_000, 'the duplicate must not add distance');
  assert.deepEqual(r.duplicates, ['run-1']);
});

test('a new month restarts the ladder while lifetime history is a separate concern', () => {
  const july = applyDistance(emptyProgress(), 640 * KM).after;
  assert.equal(rankForMeters(july.laddered_meters).id, 'grandmaster');

  const august = emptyProgress();
  assert.equal(august.laddered_meters, 0);
  assert.equal(rankForMeters(august.laddered_meters).id, 'awakening');
  const first = applyDistance(august, 1_500);
  assert.deepEqual(first.crossed_checkpoints.map((c) => c.threshold_meters), [0, 1_000]);
});

test('rank boundaries are exact at every major rank', () => {
  const expectations = [
    [0, 'awakening'], [49_999, 'awakening'], [50_000, 'strider'], [99_999, 'strider'],
    [100_000, 'runner'], [199_999, 'runner'], [200_000, 'challenger'], [299_999, 'challenger'],
    [300_000, 'vanguard'], [400_000, 'champion'], [500_000, 'master'], [600_000, 'grandmaster'],
    [700_000, 'legend'], [800_000, 'mythic'], [900_000, 'apex'], [999_999, 'apex'],
    [1_000_000, 'world_crown'], [5_000_000, 'world_crown'],
  ];
  for (const [meters, expected] of expectations) {
    assert.equal(rankForMeters(meters).id, expected, `rank at ${meters} m`);
  }
});

test('a zero-distance session is accepted and changes nothing on the ladder', () => {
  const start = applyDistance(emptyProgress(), 5_000).after;
  const r = applyDistance(start, 0);
  assert.deepEqual(r.crossed_checkpoints, []);
  assert.equal(r.after.laddered_meters, 5_000);
});

test('fractional or negative distance is rejected at the boundary', () => {
  assert.throws(() => applyDistance(emptyProgress(), -1), RangeError);
  assert.throws(() => applyDistance(emptyProgress(), 1_000.5), RangeError);
});

test('next checkpoints guide the home screen and run out at the crown', () => {
  const p = applyDistance(emptyProgress(), 47 * KM).after;
  const next = nextCheckpoints(p, 3);
  assert.deepEqual(next.map((n) => n.threshold_meters), [50_000, 60_000, 75_000]);
  assert.equal(next[0].remaining_meters, 3_000);

  const crowned = applyDistance(emptyProgress(), 1_000_000).after;
  assert.deepEqual(nextCheckpoints(crowned, 3), []);
});

test('every checkpoint is reachable and claimed exactly once across a full month', () => {
  let progress = emptyProgress();
  const claimed = [];
  // 200 sessions of 5 km reaches exactly 1000 km.
  for (let i = 0; i < 200; i += 1) {
    const r = applyDistance(progress, 5_000);
    progress = r.after;
    claimed.push(...r.crossed_checkpoints.map((c) => c.checkpoint_id));
  }
  assert.equal(progress.laddered_meters, 1_000_000);
  assert.equal(claimed.length, 52, 'exactly 52 claims for a full month');
  assert.equal(new Set(claimed).size, 52, 'no checkpoint claimed twice');
  assert.equal(progress.world_crown_awarded, true);
  assert.equal(progress.apex_axis_unlocked, true);
});
