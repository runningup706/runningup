/**
 * Deterministic auto-battle.
 *
 * Master # 13.1: battles resolve automatically, the player chooses the ultimate and the
 * loadout, and any important fight must be reproducible by the server from a seed. Nothing
 * here reads a wall clock or a random source — given the same seed, stat snapshot and
 * config version, the same fight plays out move for move, which is what makes a boss result
 * or a Ghost Trial verifiable rather than merely reported.
 *
 * The Fitness Core rule (DL-5) shows up directly: `corePower` comes from the verified run
 * ledger and nothing else. A character converts that one budget into different combat
 * shapes; it never adds to it.
 */

/** Deterministic PRNG. Seeded from a string so a battle id reproduces its own fight. */
export function seededRandom(seedText) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedText.length; i += 1) {
    h ^= seedText.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  let state = h || 1;
  return () => {
    state ^= state << 13; state >>>= 0;
    state ^= state >> 17;
    state ^= state << 5;  state >>>= 0;
    return state / 4294967296;
  };
}

export const BATTLE_CONFIG_VERSION = 'battle.v1.0.0';

/**
 * How each role converts the shared Fitness Core budget. Same budget, different shape —
 * this is the sidegrade rule, expressed as numbers rather than as a promise.
 */
const RAW_ROLE_SHAPE = Object.freeze({
  vanguard:  { attack: 0.9, defence: 1.4, speed: 0.9, burst: 0.8 },
  burst:     { attack: 1.5, defence: 0.7, speed: 1.1, burst: 1.5 },
  sustained: { attack: 1.1, defence: 1.0, speed: 1.0, burst: 0.9 },
  control:   { attack: 0.9, defence: 1.0, speed: 1.2, burst: 1.1 },
  barrier:   { attack: 0.7, defence: 1.6, speed: 0.8, burst: 0.8 },
  support:   { attack: 0.8, defence: 1.2, speed: 1.1, burst: 1.0 },
  counter:   { attack: 1.2, defence: 1.1, speed: 1.2, burst: 1.2 },
  summon:    { attack: 1.0, defence: 0.9, speed: 1.0, burst: 1.3 },
});

/**
 * The shapes above were authored by feel, and by feel they did NOT balance: burst summed to
 * 3.7 against sustained's 3.0, a 19% larger budget for the same verified running. That is a
 * straight upgrade, not a sidegrade, and it violates the equal-budget rule.
 *
 * Rather than hand-tuning eight rows until they happen to agree, the offensive weights are
 * normalised here so every role spends an identical budget by construction. Editing a shape
 * above changes the character's ratios and can no longer change its total.
 */
const BUDGET_AXES = ['attack', 'defence', 'burst'];
const TARGET_BUDGET = 3.2;

const ROLE_CONVERSION = Object.freeze(Object.fromEntries(
  Object.entries(RAW_ROLE_SHAPE).map(([role, shape]) => {
    const sum = BUDGET_AXES.reduce((total, axis) => total + shape[axis], 0);
    const factor = TARGET_BUDGET / sum;
    return [role, Object.freeze({
      attack: shape.attack * factor,
      defence: shape.defence * factor,
      burst: shape.burst * factor,
      // Speed is a tempo dial rather than part of the offensive budget, so it is not
      // normalised: a fast role is fast, it is not thereby stronger.
      speed: shape.speed,
    })];
  }),
));

/**
 * Continent mechanics that actually change the fight, rather than recolouring it.
 * `onTurn` may modify the turn context; this is what stops twelve continents from being
 * one continent twelve times.
 */
export const CONTINENT_MECHANICS = Object.freeze({
  mech_light_reflection: {
    label: 'reflect a telegraphed beam to strip shields',
    // Stripping a shield is worthless against an enemy that has none, so the reflected beam
    // also carries damage. Otherwise the whole continent mechanic is inert outside boss fights.
    onTurn: (ctx) => {
      const reflecting = ctx.turn % 3 === 0;
      if (reflecting) ctx.enemyShield = 0;
      ctx.playerDamageMultiplier = reflecting ? 1.35 : 1;
    },
  },
  mech_growth_bind: {
    label: 'roots grow each cycle unless cleansed',
    // Scaled to the enemy's own size: a flat 2 HP was invisible next to a 200-damage hit,
    // which made "roots grow unless cleansed" a label rather than a rule.
    onTurn: (ctx) => {
      ctx.enemyRegen = ctx.turn % 4 === 0 ? 0 : ctx.enemyRegen + Math.round(ctx.enemyMaxHp * 0.02);
    },
  },
  mech_heat_shatter: {
    label: 'heat builds; venting at peak shatters armour',
    onTurn: (ctx) => { ctx.heat += 1; if (ctx.heat >= 4) { ctx.playerDamageMultiplier = 1.6; ctx.heat = 0; } else ctx.playerDamageMultiplier = 1; },
  },
  mech_momentum_push: {
    label: 'wind lanes grant speed but shove both sides',
    onTurn: (ctx) => { ctx.playerSpeedBonus = ctx.turn % 2 === 0 ? 8 : -4; },
  },
  mech_tide_swap: {
    label: 'the tide swaps arena halves on a cycle',
    onTurn: (ctx) => { if (ctx.turn % 3 === 0) { ctx.enemyDamageMultiplier = 0.6; } else ctx.enemyDamageMultiplier = 1; },
  },
  mech_conduction_chain: {
    label: 'damage chains along conductive tiles',
    onTurn: (ctx) => { ctx.chain = Math.min(4, ctx.chain + 1); ctx.playerDamageMultiplier = 1 + ctx.chain * 0.12; },
  },
  mech_reflection_clone: {
    label: 'only the shadow-casting clone is real',
    onTurn: (ctx) => { ctx.playerDamageMultiplier = ctx.turn % 2 === 0 ? 1.35 : 0.75; },
  },
  mech_freeze_timing: {
    label: 'frozen targets shatter inside a two-beat window',
    onTurn: (ctx) => { ctx.playerDamageMultiplier = ctx.turn % 4 < 2 ? 1.45 : 0.85; },
  },
  mech_platform_fall: {
    label: 'platforms drop out of the arena on a schedule',
    onTurn: (ctx) => {
      if (ctx.turn % 5 === 0) ctx.playerHp -= Math.round(ctx.playerMaxHp * 0.06);
      ctx.playerSpeedBonus = 6;
    },
  },
  mech_pressure_vision: {
    label: 'pressure limits how long you can act',
    onTurn: (ctx) => {
      ctx.playerHp -= Math.round(ctx.playerMaxHp * 0.03);
      ctx.playerDamageMultiplier = ctx.turn % 3 === 0 ? 1.5 : 1;
    },
  },
  mech_tempo_shift: {
    label: 'zones speed up or slow down every actor',
    onTurn: (ctx) => { ctx.playerSpeedBonus = ctx.turn % 2 === 0 ? 10 : -6; },
  },
  mech_combined_rift: {
    label: 'two prior mechanics interact at once',
    onTurn: (ctx) => {
      ctx.heat += 1;
      ctx.playerDamageMultiplier = (ctx.turn % 2 === 0 ? 1.3 : 0.9) + (ctx.heat >= 3 ? 0.4 : 0);
      if (ctx.heat >= 3) ctx.heat = 0;
    },
  },
});

/** Three-way roguelite choice offered before a fight (master # 13.3). */
export const MODIFIER_POOL = Object.freeze([
  { id: 'mod_edge', label: 'Sharpened edge: +20% attack, -10% defence', apply: (s) => ({ ...s, attack: s.attack * 1.2, defence: s.defence * 0.9 }) },
  { id: 'mod_ward', label: 'Warded stance: +25% defence, -10% attack', apply: (s) => ({ ...s, defence: s.defence * 1.25, attack: s.attack * 0.9 }) },
  { id: 'mod_tempo', label: 'Quickened tempo: +3 speed, -5% burst', apply: (s) => ({ ...s, speed: s.speed + 3, burst: s.burst * 0.95 }) },
  { id: 'mod_surge', label: 'Ultimate surge: +30% burst, ultimate costs one more turn', apply: (s) => ({ ...s, burst: s.burst * 1.3, ultimateDelay: 1 }) },
  { id: 'mod_endure', label: 'Endurance: +15% max HP', apply: (s) => ({ ...s, maxHp: Math.round(s.maxHp * 1.15) }) },
]);

/**
 * Build a combat stat block from the account's Fitness Core and the chosen character.
 * DL-5: `corePower` is the only input that scales power, and it comes from verified runs.
 */
export function buildStats({ corePower, role, relicTrade = null }) {
  const conversion = ROLE_CONVERSION[role] ?? ROLE_CONVERSION.sustained;
  const base = Math.max(10, Math.sqrt(Math.max(0, corePower)) * 2);

  let stats = {
    attack: base * conversion.attack,
    defence: base * conversion.defence,
    speed: 10 + base * conversion.speed * 0.05,
    burst: base * conversion.burst,
    maxHp: Math.round(60 + base * 6),
    ultimateDelay: 0,
  };

  // A relic redistributes the same budget. Total stat weight is preserved, which the
  // battle tests assert directly.
  if (relicTrade) {
    const moved = stats[relicTrade.from] * 0.25;
    stats = { ...stats, [relicTrade.from]: stats[relicTrade.from] - moved, [relicTrade.to]: stats[relicTrade.to] + moved };
  }

  stats.hp = stats.maxHp;
  return stats;
}

export function buildEnemy({ tier, mechanicId, isBoss = false, phases = [] }) {
  const scale = 1 + tier * 0.35;
  return {
    hp: Math.round((isBoss ? 420 : 150) * scale),
    maxHp: Math.round((isBoss ? 420 : 150) * scale),
    attack: 12 * scale,
    defence: 8 * scale,
    // Contested on purpose. At 12 the player out-sped by default and every speed-based
    // mechanic became decorative; at 16 a speed swing genuinely decides whether the enemy
    // acts this turn.
    speed: 16,
    shield: isBoss ? 40 : 0,
    mechanicId,
    isBoss,
    phases: isBoss ? phases : [],
    phaseIndex: 0,
  };
}

/**
 * Resolve a battle.
 *
 * @returns {{victory:boolean, turns:number, log:Array, seed:string, config_version:string,
 *            damage_breakdown:object, phases_cleared:number}}
 */
export function resolveBattle({ stats, enemy, seed, modifierId = null, useUltimateAtTurn = 4, maxTurns = 60 }) {
  const rand = seededRandom(seed);
  const mechanic = CONTINENT_MECHANICS[enemy.mechanicId];

  let player = { ...stats };
  if (modifierId) {
    const modifier = MODIFIER_POOL.find((m) => m.id === modifierId);
    if (!modifier) throw new Error(`unknown modifier ${modifierId}`);
    player = { ...player, ...modifier.apply(player) };
    player.hp = player.maxHp;
  }

  const foe = { ...enemy };
  const log = [];
  const damage = { basic: 0, skill: 0, ultimate: 0, mechanic: 0 };

  const ctx = {
    turn: 0, heat: 0, chain: 0,
    enemyMaxHp: foe.maxHp, playerMaxHp: player.maxHp,
    enemyShield: foe.shield, enemyRegen: 0,
    playerDamageMultiplier: 1, enemyDamageMultiplier: 1,
    playerSpeedBonus: 0, playerHp: player.hp,
  };

  let ultimateUsed = false;
  const ultimateTurn = useUltimateAtTurn + (player.ultimateDelay ?? 0);

  for (ctx.turn = 1; ctx.turn <= maxTurns; ctx.turn += 1) {
    if (mechanic) mechanic.onTurn(ctx);
    player.hp = ctx.playerHp;
    if (player.hp <= 0) break;

    // Player acts.
    let outgoing;
    let kind;
    if (!ultimateUsed && ctx.turn >= ultimateTurn) {
      outgoing = player.burst * 2.4;
      kind = 'ultimate';
      ultimateUsed = true;
    } else if (ctx.turn % 3 === 0) {
      outgoing = player.attack * 1.6;
      kind = 'skill';
    } else {
      outgoing = player.attack;
      kind = 'basic';
    }

    const variance = 0.92 + rand() * 0.16;
    let dealt = Math.max(1, (outgoing * ctx.playerDamageMultiplier * variance) - foe.defence * 0.35);

    if (ctx.enemyShield > 0) {
      const absorbed = Math.min(ctx.enemyShield, dealt);
      ctx.enemyShield -= absorbed;
      dealt -= absorbed;
    }

    foe.hp -= dealt;
    damage[kind] += dealt;
    log.push({ turn: ctx.turn, actor: 'player', kind, damage: Math.round(dealt), enemy_hp: Math.max(0, Math.round(foe.hp)) });

    // Boss phase transition: each phase restores a shield and hits harder.
    if (foe.isBoss && foe.phases.length > 0) {
      const threshold = foe.maxHp * (1 - (foe.phaseIndex + 1) / foe.phases.length);
      if (foe.hp <= threshold && foe.phaseIndex < foe.phases.length - 1) {
        foe.phaseIndex += 1;
        ctx.enemyShield = Math.round(foe.maxHp * 0.08);
        foe.attack *= 1.15;
        log.push({ turn: ctx.turn, actor: 'boss', kind: 'phase', phase: foe.phases[foe.phaseIndex] });
      }
    }

    if (foe.hp <= 0) break;

    // Enemy acts, unless out-sped this turn.
    if (foe.speed <= player.speed + ctx.playerSpeedBonus && ctx.turn % 2 === 0) {
      log.push({ turn: ctx.turn, actor: 'enemy', kind: 'outsped', damage: 0 });
    } else {
      const incoming = Math.max(1, (foe.attack * ctx.enemyDamageMultiplier * (0.9 + rand() * 0.2)) - player.defence * 0.4);
      ctx.playerHp -= incoming;
      player.hp = ctx.playerHp;
      log.push({ turn: ctx.turn, actor: 'enemy', kind: 'attack', damage: Math.round(incoming), player_hp: Math.max(0, Math.round(player.hp)) });
    }

    foe.hp = Math.min(foe.maxHp, foe.hp + ctx.enemyRegen);
    if (ctx.enemyRegen > 0) damage.mechanic -= ctx.enemyRegen;
  }

  const victory = foe.hp <= 0 && player.hp > 0;

  return {
    victory,
    turns: Math.min(ctx.turn, maxTurns),
    player_hp_remaining: Math.max(0, Math.round(player.hp)),
    enemy_hp_remaining: Math.max(0, Math.round(foe.hp)),
    phases_cleared: foe.isBoss ? foe.phaseIndex + (victory ? 1 : 0) : 0,
    damage_breakdown: Object.fromEntries(Object.entries(damage).map(([k, v]) => [k, Math.round(v)])),
    seed,
    config_version: BATTLE_CONFIG_VERSION,
    log,
  };
}

/** Offer three distinct modifiers, chosen deterministically from the seed. */
export function offerModifiers(seed) {
  const rand = seededRandom(`${seed}:modifiers`);
  const pool = [...MODIFIER_POOL];
  const picked = [];
  while (picked.length < 3 && pool.length > 0) {
    picked.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  }
  return picked;
}
