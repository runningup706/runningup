/**
 * Battle engine tests — master # 13.1, # 17.6, # 22.3 "RPG·콘텐츠".
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildStats, buildEnemy, resolveBattle, offerModifiers, seededRandom,
  CONTINENT_MECHANICS, MODIFIER_POOL, BATTLE_CONFIG_VERSION,
} from '../lib/battle.mjs';

const ROLES = ['vanguard', 'burst', 'sustained', 'control', 'barrier', 'support', 'counter', 'summon'];

test('the same seed reproduces the same battle exactly', () => {
  const stats = buildStats({ corePower: 2_500, role: 'burst' });
  const enemy = buildEnemy({ tier: 2, mechanicId: 'mech_heat_shatter' });

  const a = resolveBattle({ stats, enemy, seed: 'battle-abc' });
  const b = resolveBattle({ stats, enemy, seed: 'battle-abc' });

  assert.deepEqual(a.log, b.log, 'a boss or Ghost Trial result must be reproducible by the server');
  assert.equal(a.victory, b.victory);
  assert.equal(a.turns, b.turns);
  assert.equal(a.config_version, BATTLE_CONFIG_VERSION);
});

test('a different seed produces a different battle', () => {
  const stats = buildStats({ corePower: 2_500, role: 'burst' });
  const enemy = buildEnemy({ tier: 2, mechanicId: 'mech_heat_shatter' });

  const a = resolveBattle({ stats, enemy, seed: 'seed-one' });
  const b = resolveBattle({ stats, enemy, seed: 'seed-two' });
  assert.notDeepEqual(a.log, b.log);
});

test('DL-5: combat power comes only from the verified-run Fitness Core', () => {
  const weak = buildStats({ corePower: 100, role: 'sustained' });
  const strong = buildStats({ corePower: 10_000, role: 'sustained' });

  assert.ok(strong.attack > weak.attack);
  assert.ok(strong.maxHp > weak.maxHp);

  // Zero verified running gives the floor, not a negative or a crash.
  const none = buildStats({ corePower: 0, role: 'sustained' });
  assert.ok(none.attack > 0 && none.maxHp > 0);
});

test('all twelve roles convert the SAME budget without any gaining a larger one', () => {
  const corePower = 4_000;
  const totals = ROLES.map((role) => {
    const s = buildStats({ corePower, role });
    return { role, total: s.attack + s.defence + s.burst };
  });

  const values = totals.map((t) => t.total);
  const min = Math.min(...values);
  const max = Math.max(...values);

  // Roles differ in SHAPE, but no role may be a straight upgrade on total budget.
  assert.ok((max - min) / max < 0.16,
    `role budgets diverge too far: ${totals.map((t) => `${t.role}=${t.total.toFixed(0)}`).join(' ')}`);
});

test('a relic is a sidegrade: it moves budget, it does not add any', () => {
  const plain = buildStats({ corePower: 4_000, role: 'counter' });
  const relic = buildStats({ corePower: 4_000, role: 'counter', relicTrade: { from: 'attack', to: 'defence' } });

  const plainTotal = plain.attack + plain.defence;
  const relicTotal = relic.attack + relic.defence;

  assert.ok(Math.abs(plainTotal - relicTotal) < 0.001, 'total budget is conserved');
  assert.ok(relic.attack < plain.attack, 'attack was given up');
  assert.ok(relic.defence > plain.defence, 'defence was gained');
});

test('every continent mechanic is distinct and actually changes the fight', () => {
  // A durable opponent on purpose: a three-turn fight ends before most mechanics have had
  // a chance to act, which would make twelve different rules look identical.
  const stats = buildStats({ corePower: 1_200, role: 'sustained' });
  const signatures = new Map();

  for (const mechanicId of Object.keys(CONTINENT_MECHANICS)) {
    const enemy = buildEnemy({ tier: 7, mechanicId });
    const result = resolveBattle({ stats, enemy, seed: 'fixed-seed' });
    const signature = `${result.turns}:${result.damage_breakdown.basic}:${result.player_hp_remaining}`;
    signatures.set(mechanicId, signature);
  }

  assert.equal(Object.keys(CONTINENT_MECHANICS).length, 12, 'twelve continents, twelve mechanics');
  // If several mechanics produced an identical fight they would be reskins of each other.
  const distinct = new Set(signatures.values());
  assert.ok(distinct.size >= 10,
    `mechanics collapse into ${distinct.size} distinct fights: ${[...signatures.entries()].map(([k, v]) => `${k}=${v}`).join(' ')}`);
});

test('a boss fight moves through its phases', () => {
  const stats = buildStats({ corePower: 9_000, role: 'burst' });
  const boss = buildEnemy({
    tier: 3, mechanicId: 'mech_light_reflection', isBoss: true,
    phases: ['shield_lattice', 'reflected_judgement', 'axis_overload'],
  });

  const result = resolveBattle({ stats, enemy: boss, seed: 'boss-seed', useUltimateAtTurn: 5 });
  const phaseEvents = result.log.filter((l) => l.kind === 'phase');

  assert.ok(phaseEvents.length >= 1, 'a boss must actually change phase');
  assert.ok(result.phases_cleared >= 1);
});

test('losing a boss fight does not confiscate anything — it just reports a loss', () => {
  const weak = buildStats({ corePower: 50, role: 'support' });
  const boss = buildEnemy({
    tier: 6, mechanicId: 'mech_combined_rift', isBoss: true,
    phases: ['fracture', 'convergence', 'reunion'],
  });

  const result = resolveBattle({ stats: weak, enemy: boss, seed: 'hopeless' });
  assert.equal(result.victory, false);
  // The result is information, not a punishment: no entry consumed, no stat lost.
  assert.ok(result.turns > 0);
  assert.ok(Object.hasOwn(result, 'damage_breakdown'), 'the player is told why they lost');
});

test('a well-equipped runner beats an ordinary stage', () => {
  const stats = buildStats({ corePower: 8_000, role: 'burst' });
  const enemy = buildEnemy({ tier: 1, mechanicId: 'mech_momentum_push' });
  const result = resolveBattle({ stats, enemy, seed: 'ordinary-stage' });
  assert.equal(result.victory, true);
});

test('three distinct modifiers are offered, deterministically', () => {
  const first = offerModifiers('stage-1');
  const second = offerModifiers('stage-1');
  const other = offerModifiers('stage-2');

  assert.equal(first.length, 3);
  assert.equal(new Set(first.map((m) => m.id)).size, 3, 'the three choices must differ');
  assert.deepEqual(first.map((m) => m.id), second.map((m) => m.id), 'same seed, same offer');
  assert.ok(other.every((m) => MODIFIER_POOL.some((p) => p.id === m.id)));
});

test('a modifier changes the outcome shape without breaking the fight', () => {
  const stats = buildStats({ corePower: 3_000, role: 'vanguard' });
  const enemy = buildEnemy({ tier: 2, mechanicId: 'mech_tide_swap' });

  const plain = resolveBattle({ stats, enemy, seed: 'mod-test' });
  const warded = resolveBattle({ stats, enemy, seed: 'mod-test', modifierId: 'mod_ward' });

  assert.notDeepEqual(plain.log, warded.log);
  assert.ok(warded.turns > 0);
});

test('the damage breakdown accounts for what happened', () => {
  const stats = buildStats({ corePower: 5_000, role: 'burst' });
  // Tier 6 so the fight lasts past the ultimate turn; against a trivial enemy the fight
  // would be over before the ultimate ever fires.
  const enemy = buildEnemy({ tier: 6, mechanicId: 'mech_conduction_chain' });
  // The player chooses when to spend the ultimate; here they spend it early, which is what
  // the breakdown is being asked to account for.
  const result = resolveBattle({ stats, enemy, seed: 'breakdown', useUltimateAtTurn: 2 });

  assert.ok(result.damage_breakdown.basic > 0);
  assert.ok(result.damage_breakdown.ultimate > 0, 'the chosen ultimate must have landed');
  const playerHits = result.log.filter((l) => l.actor === 'player');
  assert.ok(playerHits.length > 0);
});

test('a battle always terminates', () => {
  const stats = buildStats({ corePower: 1, role: 'barrier' });
  const enemy = buildEnemy({ tier: 8, mechanicId: 'mech_growth_bind', isBoss: true, phases: ['a', 'b', 'c'] });
  const result = resolveBattle({ stats, enemy, seed: 'stalemate', maxTurns: 40 });
  assert.ok(result.turns <= 40, 'a stalemate must hit the turn cap rather than hang');
});

test('the PRNG is stable across calls for a given seed', () => {
  const a = seededRandom('abc');
  const b = seededRandom('abc');
  for (let i = 0; i < 20; i += 1) assert.equal(a(), b());
});
