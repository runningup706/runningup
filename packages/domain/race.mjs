/**
 * RunningUp race resolution.
 *
 * RunningUp is not a combat game: the contest is a race against pacers, decided by pace,
 * endurance and a finishing kick.
 * There is no HP, no damage, no attack and no enemy here, and none may be reintroduced —
 * `tools/direction-lock/scan.mjs` fails the build on those concepts.
 *
 * DL-5 — verified real running is the only source of core power. `corePower` is the sole
 * input that makes a runner faster, and it comes from the verified run ledger. Nothing in
 * this file lets tapping, spending or waiting move a runner up the finishing order.
 *
 * DL-3 — running only. Courses differ by surface (road, track, treadmill, indoor), by
 * shape and by how much they punish an uneven effort. Elevation is deliberately absent:
 * it is inert sensor metadata elsewhere in the product and must never become a stat.
 *
 * Determinism: identical inputs and seed always produce an identical finishing order, so
 * a result can be replayed and audited. The server remains the authority for a real race;
 * this engine exists so the client can preview and so the loop can be tested offline.
 */

/** Deterministic PRNG. Same text in, same stream out, on every platform. */
export function seededRandom(seedText) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedText.length; i += 1) {
    h ^= seedText.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return function next() {
    h ^= h << 13; h >>>= 0;
    h ^= h >>> 17;
    h ^= h << 5;  h >>>= 0;
    return h / 4294967296;
  };
}

export const RACE_CONFIG_VERSION = 'race.v1.0.0';

/** DL-3: the only surfaces the product recognises. */
export const COURSE_SURFACES = Object.freeze(['road', 'track', 'treadmill', 'indoor']);

/** A race is eight runners: the player plus seven pacers. */
export const RACE_FIELD_SIZE = 8;

/**
 * How a character's discipline converts verified fitness into running shape.
 *
 * The three axes spend one budget, so no role is strictly better than another — a role
 * that holds pace better gives up finishing speed for it. `TARGET_BUDGET` is asserted by
 * the tests, which is what keeps a future "just make this one stronger" edit honest.
 */
const TARGET_BUDGET = 3;
const RAW_ROLE_SHAPE = Object.freeze({
  // cruise: how fast the runner's sustainable pace is
  // stamina: how little that pace decays over the second half
  // kick: how much is left for the closing stretch
  vanguard:  { cruise: 1.20, stamina: 0.95, kick: 0.85 },  // front-runner
  burst:     { cruise: 0.95, stamina: 0.80, kick: 1.35 },  // kicker
  sustained: { cruise: 1.00, stamina: 1.30, kick: 0.80 },  // metronome
  control:   { cruise: 1.05, stamina: 1.05, kick: 1.00 },  // tactician
  counter:   { cruise: 0.90, stamina: 1.05, kick: 1.15 },  // sit-and-kick
  support:   { cruise: 1.00, stamina: 1.15, kick: 0.95 },  // pack worker
  surger:    { cruise: 1.15, stamina: 0.80, kick: 1.10 },  // mid-race attacker
  grinder:   { cruise: 0.85, stamina: 1.45, kick: 0.75 },  // long-distance grinder
});

const ROLE_CONVERSION = Object.freeze(Object.fromEntries(
  Object.entries(RAW_ROLE_SHAPE).map(([role, shape]) => {
    const sum = shape.cruise + shape.stamina + shape.kick;
    const factor = TARGET_BUDGET / sum;
    return [role, Object.freeze({
      cruise: shape.cruise * factor,
      stamina: shape.stamina * factor,
      kick: shape.kick * factor,
    })];
  }),
));

export const ROLE_IDS = Object.freeze(Object.keys(RAW_ROLE_SHAPE));

/**
 * Course character per continent.
 *
 * These change how a race is run, not how it is scored. `onSplit` may adjust the effort a
 * split demands and how much an uneven effort costs — that is what stops twelve
 * continents from being one continent twelve times. None of them touch elevation.
 */
export const CONTINENT_COURSES = Object.freeze({
  con_lumena: {
    surface: 'road', label: 'wide processional avenues; long straights reward an even effort',
    onSplit: (ctx) => { ctx.evenPaceBonus = 0.04; },
  },
  con_verdia: {
    surface: 'road', label: 'soft canopy boardwalk; the footing saps a little from every split',
    onSplit: (ctx) => { ctx.effortCost += 0.03; },
  },
  con_rubra: {
    surface: 'road', label: 'canyon furnace road; radiant heat builds and bites late',
    onSplit: (ctx) => { ctx.effortCost += ctx.split >= ctx.splitCount / 2 ? 0.05 : 0.01; },
  },
  con_anel: {
    surface: 'road', label: 'open grass-sea highroad; a headwind alternates with a tailwind',
    onSplit: (ctx) => { ctx.effortCost += ctx.split % 2 === 0 ? -0.04 : 0.06; },
  },
  con_serene: {
    surface: 'road', label: 'lantern piers on stilts; a narrow span forces a mid-race surge',
    onSplit: (ctx) => { if (ctx.split === Math.floor(ctx.splitCount / 2)) ctx.requiredSurge += 0.08; },
  },
  con_voltis: {
    surface: 'indoor', label: 'tight substation circuit; frequent corners cost the tall stride',
    onSplit: (ctx) => { ctx.cornerCost += 0.04; },
  },
  con_hora: {
    surface: 'road', label: 'glass desert flats; false horizons make pace judgement unreliable',
    onSplit: (ctx) => { ctx.driftPenalty += 0.05; ctx.jitter *= 1.4; },
  },
  con_nival: {
    surface: 'indoor', label: 'frozen ridge hall; the first two splits run slower than they feel',
    onSplit: (ctx) => { if (ctx.split < 2) ctx.effortCost += 0.05; },
  },
  con_kael: {
    surface: 'track', label: 'sky-island oval; a well-judged negative split pays double',
    onSplit: (ctx) => { ctx.negativeSplitBonus += 0.05; },
  },
  con_neris: {
    surface: 'indoor', label: 'pressure galleries; dense air rewards the pack that works together',
    onSplit: (ctx) => { ctx.packDraft += 0.05; },
  },
  con_tempora: {
    surface: 'treadmill', label: 'calibrated escapement hall; pace is exact and nothing is gifted',
    onSplit: (ctx) => { ctx.jitter *= 0.4; },
  },
  con_origin: {
    surface: 'track', label: 'worldline championship track; every earlier course trait appears once',
    onSplit: (ctx) => {
      ctx.effortCost += ctx.split % 3 === 0 ? 0.04 : 0;
      ctx.negativeSplitBonus += 0.03;
      ctx.kickWindow += ctx.split === ctx.splitCount - 1 ? 0.06 : 0;
    },
  },
});

/**
 * Race strategies. A strategy redistributes one effort budget across the race; it never
 * adds effort. Choosing well is worth roughly as much as a small fitness difference,
 * which is the point — tactics matter, but they do not out-run training.
 */
export const STRATEGY_POOL = Object.freeze([
  { id: 'even_split',     label: 'hold one pace end to end',              front: 1.00, back: 1.00, kick: 1.00 },
  { id: 'negative_split', label: 'start controlled, finish faster',       front: 0.96, back: 1.04, kick: 1.05 },
  { id: 'front_run',      label: 'take it out hard and hang on',          front: 1.07, back: 0.94, kick: 0.92 },
  { id: 'sit_and_kick',   label: 'sit in the pack, then close',           front: 0.97, back: 0.99, kick: 1.18 },
]);

/** Offer three of the four strategies, deterministically, so a choice is a real choice. */
export function offerStrategies(seed) {
  const rand = seededRandom(`${seed}:strategy`);
  const pool = [...STRATEGY_POOL];
  const offered = [];
  while (offered.length < 3 && pool.length > 0) {
    offered.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  }
  return offered;
}

/**
 * Convert an account's verified fitness into running shape.
 *
 * DL-5: `corePower` is the only scaling input, and the verified run ledger is its only
 * source. `gearTrade` redistributes the same budget rather than adding to it, which the
 * tests assert directly.
 */
export function buildRunnerForm({ corePower, role, gearTrade = null }) {
  const conversion = ROLE_CONVERSION[role] ?? ROLE_CONVERSION.sustained;
  // Square root, not linear: a runner with four times the verified volume is meaningfully
  // but not hopelessly faster, so a newer runner still races rather than spectates.
  const base = Math.max(10, Math.sqrt(Math.max(0, corePower)) * 2);

  let form = {
    cruise: base * conversion.cruise,
    stamina: base * conversion.stamina,
    kick: base * conversion.kick,
  };

  if (gearTrade) {
    const moved = form[gearTrade.from] * 0.25;
    form = {
      ...form,
      [gearTrade.from]: form[gearTrade.from] - moved,
      [gearTrade.to]: form[gearTrade.to] + moved,
    };
  }

  return form;
}

/**
 * Build one pacer. `tier` is the field strength the server matched the runner into;
 * `index` spreads the seven pacers around that strength so a race has a front and a back.
 */
export function buildPacer({ tier, index, courseId, isChampion = false }) {
  const scale = 1 + tier * 0.35;
  // Champions sit at the top of the field rather than being a different kind of thing.
  const spread = [1.10, 1.05, 1.00, 0.97, 0.94, 0.90, 0.86][index % 7];
  const strength = 26 * scale * spread * (isChampion ? 1.12 : 1);
  return {
    id: `pacer_${courseId}_${index + 1}`,
    tier,
    isChampion,
    courseId,
    form: {
      cruise: strength,
      stamina: strength * (0.95 + (index % 3) * 0.05),
      kick: strength * (1.05 - (index % 4) * 0.04),
    },
  };
}

/** Effort a split demands, before course traits and strategy. */
function splitEffort(form, strategyWeights, split, splitCount) {
  const isBack = split >= splitCount / 2;
  const isFinal = split === splitCount - 1;
  const weight = isFinal ? strategyWeights.kick : isBack ? strategyWeights.back : strategyWeights.front;
  // Stamina resists the natural fade of the back half; kick only pays in the last split.
  const fade = isBack ? 1 - Math.min(0.18, (split - splitCount / 2 + 1) * 0.05) : 1;
  const staminaHold = 1 + (form.stamina / 100) * 0.10;
  const closing = isFinal ? 1 + (form.kick / 100) * 0.14 : 1;
  return form.cruise * weight * (fade * staminaHold) * closing;
}

/**
 * Resolve a race.
 *
 * Every runner covers the same distance; the finishing order is decided by accumulated
 * split speed. No runner is removed, nothing is confiscated, and a poor result costs the
 * player nothing but the placing — losing a race must never feel like losing progress.
 *
 * @returns {{placement:number, fieldSize:number, splits:Array, log:Array, seed:string,
 *            config_version:string, finishingOrder:Array, won:boolean}}
 */
export function resolveRace({
  form,
  pacers,
  seed,
  distanceMeters,
  courseId = 'con_lumena',
  strategyId = 'even_split',
  splitCount = 8,
}) {
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) {
    throw new RangeError(`invalid distanceMeters: ${distanceMeters}`);
  }
  if (!Number.isInteger(splitCount) || splitCount < 2) {
    throw new RangeError(`invalid splitCount: ${splitCount}`);
  }

  const rand = seededRandom(seed);
  const course = CONTINENT_COURSES[courseId] ?? CONTINENT_COURSES.con_lumena;
  const strategy = STRATEGY_POOL.find((s) => s.id === strategyId) ?? STRATEGY_POOL[0];

  const field = [
    { id: 'player', isPlayer: true, form, strategy },
    ...pacers.map((p) => ({
      id: p.id,
      isPlayer: false,
      form: p.form,
      // Pacers run to a fixed plan. They are competitors, not obstacles.
      strategy: STRATEGY_POOL[(p.tier + Number(p.id.slice(-1) || 0)) % STRATEGY_POOL.length],
    })),
  ];

  const progress = new Map(field.map((r) => [r.id, 0]));
  const splits = [];
  const log = [];

  for (let split = 0; split < splitCount; split += 1) {
    const ctx = {
      split,
      splitCount,
      effortCost: 0,
      driftPenalty: 0,
      cornerCost: 0,
      packDraft: 0,
      requiredSurge: 0,
      evenPaceBonus: 0,
      negativeSplitBonus: 0,
      kickWindow: 0,
      jitter: 1,
    };
    course.onSplit(ctx);

    const splitRecord = { split: split + 1, surface: course.surface, runners: [] };

    for (const runner of field) {
      let effort = splitEffort(runner.form, runner.strategy, split, splitCount);

      // Course traits act on effort, never on a runner's health — there is none.
      effort *= 1 - ctx.effortCost - ctx.cornerCost + ctx.packDraft;
      if (ctx.requiredSurge > 0) {
        // A surge rewards stamina and costs whoever has none left.
        effort *= 1 + ctx.requiredSurge * ((runner.form.stamina / 100) - 0.5);
      }
      if (runner.strategy.id === 'even_split') effort *= 1 + ctx.evenPaceBonus;
      if (runner.strategy.id === 'negative_split') effort *= 1 + ctx.negativeSplitBonus;
      if (ctx.driftPenalty > 0 && runner.strategy.id === 'front_run') effort *= 1 - ctx.driftPenalty;
      if (split === splitCount - 1) effort *= 1 + ctx.kickWindow;

      // Bounded jitter: a race is not a coin toss, but it is not a spreadsheet either.
      const jitter = 1 + (rand() - 0.5) * 0.06 * ctx.jitter;
      effort *= jitter;

      const gained = Math.max(0.1, effort);
      progress.set(runner.id, progress.get(runner.id) + gained);
      splitRecord.runners.push({ id: runner.id, gained: Number(gained.toFixed(3)) });
    }

    splitRecord.runners.sort((a, b) => progress.get(b.id) - progress.get(a.id));
    const leader = splitRecord.runners[0].id;
    const playerPosition = splitRecord.runners.findIndex((r) => r.id === 'player') + 1;
    splitRecord.leader = leader;
    splitRecord.playerPosition = playerPosition;
    splits.push(splitRecord);
    log.push(
      `split ${split + 1}/${splitCount} · ${course.surface} · leader ${leader} · you ${playerPosition}/${field.length}`,
    );
  }

  const finishingOrder = [...field]
    .sort((a, b) => progress.get(b.id) - progress.get(a.id))
    .map((r, i) => ({
      place: i + 1,
      id: r.id,
      isPlayer: r.isPlayer,
      // Distance is identical for everyone, so accumulated effort is the finishing metric.
      effort: Number(progress.get(r.id).toFixed(3)),
    }));

  const placement = finishingOrder.findIndex((r) => r.isPlayer) + 1;

  return {
    placement,
    fieldSize: field.length,
    won: placement === 1,
    distanceMeters,
    courseId,
    strategyId: strategy.id,
    splits,
    finishingOrder,
    log,
    seed,
    config_version: RACE_CONFIG_VERSION,
  };
}
