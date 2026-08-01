import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PATTERNS, ALLOWLIST, SCAN_ROOT } from '../tools/direction-lock/scan.mjs';

/**
 * The direction-lock scanner is a release blocker, which makes it exactly the kind of tool
 * that can rot silently: it reports "No direction-lock violations" identically whether the
 * locks hold or the patterns stopped matching. This suite exercises the patterns against
 * text that must be caught and text that must not be, so a broken lock fails loudly.
 */

// ---------------------------------------------------------------------------
// The allow-list must describe files that exist
// ---------------------------------------------------------------------------

test('every allow-listed path exists', () => {
  // A stale entry is how a rule silently stops applying: the file it excused was renamed,
  // the exemption stays, and the next file to take that path inherits the exemption.
  // `tests/direction-lock.test.mjs` itself sat in this list for a long time without
  // existing, which is what prompted this check.
  const missing = [...ALLOWLIST.keys()].filter((rel) => !existsSync(join(SCAN_ROOT, rel)));
  assert.deepEqual(missing, [], `allow-list names files that do not exist: ${missing.join(', ')}`);
});

test('every allow-list entry states a reason', () => {
  for (const [rel, reason] of ALLOWLIST) {
    assert.ok(typeof reason === 'string' && reason.trim().length > 10,
      `${rel} is exempted without a usable reason`);
  }
});

// ---------------------------------------------------------------------------
// Each lock catches what it exists to catch
// ---------------------------------------------------------------------------

const caughtBy = (text) => PATTERNS.filter(({ pattern }) => pattern.test(text)).map((p) => p.id);

/** Text that must trigger at least one pattern, and which pattern group it belongs to. */
const MUST_CATCH = [
  // DL-1 — nothing above the 1000 km World Crown
  ['tier_above_1000', 'monthly tier at 1250 km'],
  ['tier_above_1000', 'unlock the 1,500 km reward'],
  ['tier_above_1000', 'const ENDLESS_CAP = 2000 km;'],
  ['endless_ladder', 'endless_ladder: true'],
  ['endless_ladder', 'infinite progression above the crown'],
  ['rank_above_crown', 'rank beyond World Crown'],
  ['rank_above_crown', 'eternal crown tier'],

  // DL-3 — running only
  ['trail', 'trail_running leaderboard'],
  ['hiking', 'convert hiking sessions into XP'],
  ['cycling', 'cycling counts toward the monthly total'],
  ['climbing', 'mountaineering achievements'],
  ['elevation_progression', 'elevation_gain multiplier'],
  ['elevation_progression', 'altitude bonus applied'],
  ['weather_multiplier', 'weather bonus for rainy runs'],
  ['night_multiplier', 'night multiplier x1.2'],
  ['walking_sport', 'walking mode unlocked'],
  ['walking_sport', 'promoted as a walking sport'],

  // DL-2 — no low-distance prerequisite
  ['forced_prerequisite', 'must complete 3 km before unlocking'],
  ['forced_prerequisite', 'beginner only onboarding funnel'],
  ['forced_prerequisite', 'mandatory tutorial 1 km'],

  // DL-6 — running race, not a combat game
  ['combat_boss', 'api.world_bosses stores the continent boss'],
  ['combat_boss', 'the apex boss unlocks at 1000 km'],
  ['combat_boss', 'boss_break objective'],
  ['combat_boss', 'boss health bar'],
  ['combat_enemy', 'enemy families per continent'],
  ['combat_enemy', 'enemy spawn table'],
  ['combat_enemy', 'twelve monsters roam the ridge'],
  ['combat_battle', 'auto-battle resolves the encounter'],
  ['combat_battle', 'turn based battle system'],
  ['combat_battle', 'battle_seed text not null'],
  ['combat_battle', 'the battle stage is cleared'],
  ['combat_system', 'eight distinct combat roles'],
  ['combat_system', 'combat mechanic per continent'],
  // Plurals. `combat role` was caught and `combat roles` was not, which is the phrasing a
  // design document actually uses.
  ['combat_boss', 'three boss phases per continent'],
  ['combat_enemy', 'standard enemy types'],
  ['combat_battle', 'battle stages cleared'],
  ['combat_stat', 'damage multipliers by lane'],
  ['combat_kit', 'weapon slots equipped'],
  ['combat_stat', 'maxHp = 1200'],
  ['combat_stat', 'hit points remaining'],
  ['combat_stat', 'damage multiplier scales with heat'],
  ['combat_stat', 'basic attack builds guard stacks'],
  ['combat_kit', 'tactical skills equipped'],
  ['combat_kit', '72 tactical relics'],
  ['combat_kit', 'weapon damage rating'],
  ['combat_content', 'six challenge dungeon types'],
];

for (const [id, text] of MUST_CATCH) {
  test(`[${id}] catches: ${text}`, () => {
    const hits = caughtBy(text);
    assert.ok(hits.includes(id), `expected ${id} to fire on "${text}", got [${hits.join(', ')}]`);
  });
}

// ---------------------------------------------------------------------------
// And does not fire on the product as it actually is
// ---------------------------------------------------------------------------

const MUST_NOT_CATCH = [
  // The running vocabulary that replaced combat. If any of these tripped a pattern, the
  // scanner would fail the build on correct content and someone would weaken the pattern.
  'the continent champion takes the inside line at the bell',
  'twelve continent champions, four open race events, one apex race',
  'rival crews race the same course with a different tactic',
  'race techniques redistribute one effort budget across a race',
  'gear sets move cruise into stamina and never add to it',
  'the elite rival crew sits at the back of the pack all race',
  'a challenge race is scored by its challenge format',
  'the apex race unlocks once per user-month at 1000 km',
  'surface is one of road, track, treadmill and indoor',
  'elevation is inert sensor metadata and never a stat',
  // Anti-cheat vocabulary: an attack on the verification system, not a game mechanic.
  'every real attack is caught by the anomaly detector',
  'attack fixtures: teleport, vehicle speed, nonce replay',
  'the attack corpus proves the forbidden sources are rejected',
  // Ordinary running prose containing near-miss words.
  'a negative split pays double on the sky-island oval',
  'the marathon checkpoint is 42.195 km exactly',
  'the final checkpoint is 1000 km and nothing exists above it',
];

for (const text of MUST_NOT_CATCH) {
  test(`no false positive: ${text}`, () => {
    const hits = caughtBy(text);
    assert.deepEqual(hits, [], `"${text}" tripped [${hits.join(', ')}]`);
  });
}

// ---------------------------------------------------------------------------
// Structural sanity
// ---------------------------------------------------------------------------

test('every pattern declares an id and a reason', () => {
  for (const p of PATTERNS) {
    assert.ok(typeof p.id === 'string' && p.id.length > 0, 'pattern without an id');
    assert.ok(typeof p.why === 'string' && p.why.length > 10, `pattern ${p.id} has no usable reason`);
    assert.ok(p.pattern instanceof RegExp, `pattern ${p.id} is not a RegExp`);
  }
});

test('the scanner covers all six direction locks', () => {
  const ids = new Set(PATTERNS.map((p) => p.id));
  for (const required of [
    'tier_above_1000', 'endless_ladder', 'rank_above_crown',   // DL-1
    'forced_prerequisite',                                      // DL-2
    'trail', 'hiking', 'cycling', 'climbing',                   // DL-3
    'elevation_progression', 'weather_multiplier',              // DL-3
    'combat_boss', 'combat_enemy', 'combat_battle',             // DL-6
    'combat_system', 'combat_stat', 'combat_kit', 'combat_content',
  ]) {
    assert.ok(ids.has(required), `no pattern group for ${required}`);
  }
});

// ---------------------------------------------------------------------------
// The machine-readable mirror must not drift from the canonical constants
// ---------------------------------------------------------------------------

test('content/schemas/direction_lock.json mirrors the canonical constants exactly', async () => {
  // This file is the second copy of numbers whose first copy is packages/domain/constants.mjs,
  // and nothing compared them. It sat at 52 checkpoints and a 96-region combat floor for as
  // long as it took someone to read it — which is the definition of a parallel source of
  // truth the project forbids. Compared field by field rather than spot-checked.
  const { LAUNCH_CONTENT_FLOOR, DIRECTION_LOCK, ALLOWED_ACTIVITY_TYPES, FORBIDDEN_ACTIVITY_TYPES } =
    await import('../packages/domain/constants.mjs');
  const { RACE_FIELD_SIZE, COURSE_SURFACES } = await import('../packages/domain/race.mjs');
  const mirror = JSON.parse(readFileSync(join(SCAN_ROOT, 'content/schemas/direction_lock.json'), 'utf8'));

  assert.deepEqual(mirror.launch_content_floor, { ...LAUNCH_CONTENT_FLOOR });
  assert.equal(mirror.monthly_apex.checkpoint_count, DIRECTION_LOCK.CHECKPOINT_COUNT);
  assert.equal(mirror.monthly_apex.final_distance_meters, DIRECTION_LOCK.FINAL_APEX_METERS);
  assert.equal(mirror.monthly_apex.major_rank_count, DIRECTION_LOCK.MAJOR_RANK_COUNT);
  assert.equal(mirror.monthly_apex.final_rank_id, DIRECTION_LOCK.FINAL_RANK_ID);
  assert.deepEqual(mirror.activity_scope.allowed_activity_types, [...ALLOWED_ACTIVITY_TYPES]);
  assert.deepEqual(mirror.activity_scope.forbidden_activity_types, [...FORBIDDEN_ACTIVITY_TYPES]);
  assert.deepEqual(mirror.activity_scope.course_surfaces, [...COURSE_SURFACES]);
  assert.equal(mirror.race_scope.race_field_size, RACE_FIELD_SIZE);
  assert.equal(mirror.race_scope.combat_allowed, false);
});

test('the mirror points at the current human-readable lock', () => {
  const mirror = JSON.parse(readFileSync(join(SCAN_ROOT, 'content/schemas/direction_lock.json'), 'utf8'));
  assert.ok(existsSync(join(SCAN_ROOT, mirror.human_readable)), `${mirror.human_readable} does not exist`);
});
