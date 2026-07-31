import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  seededRandom,
  resolveRace,
  buildRunnerForm,
  buildPacer,
  offerStrategies,
  STRATEGY_POOL,
  CONTINENT_COURSES,
  COURSE_SURFACES,
  ROLE_IDS,
  RACE_FIELD_SIZE,
  RACE_CONFIG_VERSION,
} from '../lib/race.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const field = (tier = 2, courseId = 'con_lumena') =>
  Array.from({ length: RACE_FIELD_SIZE - 1 }, (_, i) => buildPacer({ tier, index: i, courseId }));

const race = (overrides = {}) => resolveRace({
  form: buildRunnerForm({ corePower: 900, role: 'sustained' }),
  pacers: field(),
  seed: 'seed-1',
  distanceMeters: 5000,
  ...overrides,
});

// ---------------------------------------------------------------------------
// The direction lock, asserted against the module itself
// ---------------------------------------------------------------------------

test('the race engine contains no combat concepts', () => {
  const source = readFileSync(join(ROOT, 'tools/lib/race.mjs'), 'utf8');
  // Prose in this file explains what was removed, so only executable shapes are checked:
  // a combat engine cannot exist without one of these identifiers.
  for (const forbidden of [
    /\bhp\s*[:=]/i,
    /\bmaxHp\b/,
    /\bdamage\w*\s*[:=]/i,
    /\battack\s*[:=]/i,
    /\bdefence\s*[:=]/i,
    /\bshield\s*[:=]/i,
    /\bresolveBattle\b/,
    /\bbuildEnemy\b/,
  ]) {
    assert.ok(!forbidden.test(source), `race engine must not define ${forbidden}`);
  }
});

test('DL-3: courses only use running surfaces, and elevation is not a stat', () => {
  const source = readFileSync(join(ROOT, 'tools/lib/race.mjs'), 'utf8');
  for (const course of Object.values(CONTINENT_COURSES)) {
    assert.ok(COURSE_SURFACES.includes(course.surface), `unknown surface ${course.surface}`);
  }
  assert.ok(!/elevation\s*[:=]|\bgradient\s*[:=]|\baltitude\s*[:=]/i.test(source),
    'elevation must never become a race stat');
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

test('the same seed reproduces the same race exactly', () => {
  assert.deepEqual(race(), race());
});

test('a different seed produces a different race', () => {
  const a = race({ seed: 'seed-a' });
  const b = race({ seed: 'seed-b' });
  assert.notDeepEqual(a.splits, b.splits);
});

test('seededRandom is stable and bounded', () => {
  const first = Array.from({ length: 50 }, seededRandom('pace'));
  const again = Array.from({ length: 50 }, seededRandom('pace'));
  assert.deepEqual(first, again);
  const stream = seededRandom('pace');
  for (let i = 0; i < 500; i += 1) {
    const v = stream();
    assert.ok(v >= 0 && v < 1, `out of range: ${v}`);
  }
});

// ---------------------------------------------------------------------------
// DL-5 — verified running is the only thing that makes a runner faster
// ---------------------------------------------------------------------------

test('DL-5: more verified core power never finishes worse', () => {
  const pacers = field();
  let previous = Number.POSITIVE_INFINITY;
  for (const corePower of [50, 200, 800, 2_000, 6_000]) {
    const result = resolveRace({
      form: buildRunnerForm({ corePower, role: 'sustained' }),
      pacers,
      seed: 'monotonic',
      distanceMeters: 5000,
    });
    assert.ok(result.placement <= previous,
      `core power ${corePower} finished ${result.placement}, worse than ${previous}`);
    previous = result.placement;
  }
});

test('DL-5: zero and negative core power are floored, not fatal', () => {
  for (const corePower of [0, -1, -10_000]) {
    const form = buildRunnerForm({ corePower, role: 'control' });
    assert.ok(Number.isFinite(form.cruise) && form.cruise > 0);
    const result = resolveRace({ form, pacers: field(), seed: 'floor', distanceMeters: 3000 });
    assert.equal(result.fieldSize, RACE_FIELD_SIZE);
  }
});

// ---------------------------------------------------------------------------
// Role and gear budgets
// ---------------------------------------------------------------------------

test('every role spends one identical budget', () => {
  const totals = ROLE_IDS.map((role) => {
    const f = buildRunnerForm({ corePower: 900, role });
    return f.cruise + f.stamina + f.kick;
  });
  for (const total of totals) {
    assert.ok(Math.abs(total - totals[0]) < 1e-9, `role budgets diverge: ${totals.join(', ')}`);
  }
});

test('an unknown role falls back rather than throwing', () => {
  const fallback = buildRunnerForm({ corePower: 900, role: 'no_such_role' });
  const sustained = buildRunnerForm({ corePower: 900, role: 'sustained' });
  assert.deepEqual(fallback, sustained);
});

test('gear redistributes the budget instead of adding to it', () => {
  const plain = buildRunnerForm({ corePower: 900, role: 'control' });
  const traded = buildRunnerForm({ corePower: 900, role: 'control', gearTrade: { from: 'kick', to: 'cruise' } });
  const sum = (f) => f.cruise + f.stamina + f.kick;
  assert.ok(Math.abs(sum(plain) - sum(traded)) < 1e-9, 'gear must not create shape from nothing');
  assert.ok(traded.cruise > plain.cruise);
  assert.ok(traded.kick < plain.kick);
});

// ---------------------------------------------------------------------------
// Race shape
// ---------------------------------------------------------------------------

test('a race is eight runners with one runner per place', () => {
  const result = race();
  assert.equal(result.fieldSize, RACE_FIELD_SIZE);
  assert.equal(result.finishingOrder.length, RACE_FIELD_SIZE);
  const places = result.finishingOrder.map((r) => r.place);
  assert.deepEqual(places, [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(result.finishingOrder.filter((r) => r.isPlayer).length, 1);
  assert.equal(result.placement, result.finishingOrder.find((r) => r.isPlayer).place);
  assert.equal(result.won, result.placement === 1);
});

test('every split is recorded and the player always has a position', () => {
  const result = race({ splitCount: 12 });
  assert.equal(result.splits.length, 12);
  assert.equal(result.log.length, 12);
  for (const split of result.splits) {
    assert.equal(split.runners.length, RACE_FIELD_SIZE);
    assert.ok(split.playerPosition >= 1 && split.playerPosition <= RACE_FIELD_SIZE);
    assert.ok(COURSE_SURFACES.includes(split.surface));
  }
});

test('losing a race costs nothing: the result carries no penalty field', () => {
  const result = resolveRace({
    form: buildRunnerForm({ corePower: 1, role: 'burst' }),
    pacers: field(6),
    seed: 'last-place',
    distanceMeters: 10_000,
  });
  assert.equal(result.placement, RACE_FIELD_SIZE);
  assert.equal(result.won, false);
  for (const forbidden of ['penalty', 'lost', 'confiscated', 'demotion', 'hp']) {
    assert.ok(!(forbidden in result), `a loss must not carry ${forbidden}`);
  }
});

test('invalid race inputs are rejected rather than silently coerced', () => {
  assert.throws(() => race({ distanceMeters: 0 }), RangeError);
  assert.throws(() => race({ distanceMeters: -5 }), RangeError);
  assert.throws(() => race({ distanceMeters: Number.NaN }), RangeError);
  assert.throws(() => race({ splitCount: 1 }), RangeError);
  assert.throws(() => race({ splitCount: 2.5 }), RangeError);
});

test('the config version is reported so a result can be replayed', () => {
  const result = race();
  assert.equal(result.config_version, RACE_CONFIG_VERSION);
  assert.equal(result.seed, 'seed-1');
  assert.equal(result.distanceMeters, 5000);
});

// ---------------------------------------------------------------------------
// Courses and strategies
// ---------------------------------------------------------------------------

test('all twelve continents have a distinct course character', () => {
  const ids = Object.keys(CONTINENT_COURSES);
  assert.equal(ids.length, 12);
  const labels = ids.map((id) => CONTINENT_COURSES[id].label);
  assert.equal(new Set(labels).size, 12, 'a course trait may not be a reskin of another');
});

test('course choice actually changes the race', () => {
  const base = race({ courseId: 'con_lumena' });
  const other = race({ courseId: 'con_anel' });
  assert.notDeepEqual(base.splits, other.splits, 'course traits must not be decorative');
});

test('an unknown course falls back rather than throwing', () => {
  assert.deepEqual(race({ courseId: 'con_does_not_exist' }).splits, race({ courseId: 'con_lumena' }).splits);
});

test('three distinct strategies are offered from the pool', () => {
  const offered = offerStrategies('offer-seed');
  assert.equal(offered.length, 3);
  assert.equal(new Set(offered.map((s) => s.id)).size, 3);
  for (const strategy of offered) {
    assert.ok(STRATEGY_POOL.some((s) => s.id === strategy.id));
  }
  assert.deepEqual(offerStrategies('offer-seed'), offered, 'the offer must be reproducible');
});

test('a strategy redistributes effort without adding any', () => {
  for (const strategy of STRATEGY_POOL) {
    const total = strategy.front + strategy.back + strategy.kick;
    assert.ok(total <= 3.25, `${strategy.id} adds effort rather than moving it: ${total}`);
  }
});

test('strategy choice changes the outcome without deciding it alone', () => {
  const pacers = field();
  const results = STRATEGY_POOL.map((s) => resolveRace({
    form: buildRunnerForm({ corePower: 900, role: 'control' }),
    pacers,
    seed: 'tactics',
    distanceMeters: 5000,
    strategyId: s.id,
  }));
  assert.ok(new Set(results.map((r) => JSON.stringify(r.splits))).size > 1, 'strategy must matter');

  // ... but a far fitter runner still beats a better-tactics runner.
  const strongFrontRun = resolveRace({
    form: buildRunnerForm({ corePower: 6_000, role: 'control' }),
    pacers, seed: 'tactics', distanceMeters: 5000, strategyId: 'front_run',
  });
  const weakBestTactics = resolveRace({
    form: buildRunnerForm({ corePower: 200, role: 'control' }),
    pacers, seed: 'tactics', distanceMeters: 5000, strategyId: 'negative_split',
  });
  assert.ok(strongFrontRun.placement < weakBestTactics.placement,
    'tactics must not out-run verified training');
});

test('a champion pacer is stronger than an ordinary one at the same tier', () => {
  const ordinary = buildPacer({ tier: 3, index: 0, courseId: 'con_kael' });
  const champion = buildPacer({ tier: 3, index: 0, courseId: 'con_kael', isChampion: true });
  assert.ok(champion.form.cruise > ordinary.form.cruise);
  assert.equal(champion.isChampion, true);
});
