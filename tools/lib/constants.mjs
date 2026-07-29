/**
 * RunningUp canonical domain constants.
 *
 * This is the single source of truth for every number the direction lock pins down.
 * The content factory, the content validator, the simulators, the SQL seed generator
 * and the tests all import from here. Do not duplicate these values anywhere else —
 * `tools/content-validator/validate.mjs` fails the build on a parallel source of truth.
 *
 * DISTANCE UNIT CONTRACT
 * ----------------------
 * All credited/accumulated distances are INTEGER METERS. GPS and Health Connect give
 * sub-meter noise that carries no meaning, and integer meters make the two boundaries the
 * direction lock cares about — 999.999 km and exactly 1000.000 km — exactly representable
 * with no floating point drift. Goal *targets* (e.g. one mile) may be fractional meters
 * because they are compared with a tolerance, never used for ledger threshold crossing.
 */

export const DIRECTION_LOCK = Object.freeze({
  FINAL_APEX_METERS: 1_000_000,
  CHECKPOINT_COUNT: 52,
  MAJOR_RANK_COUNT: 11,
  FINAL_RANK_ID: 'world_crown',
});

/**
 * Monthly Apex Ladder — the 52 canonical checkpoints of the 0..1000 km journey.
 * Values are integer meters. Dense early (achievement every few km), 25 km cadence
 * after 100 km, with 42.195 km kept as the marathon-symbolic checkpoint.
 * Master prompt sections # 6.3.1 and # 11.8.
 */
export const APEX_CHECKPOINT_METERS = Object.freeze([
  0, 1_000, 3_000, 5_000, 10_000, 15_000, 20_000, 25_000, 30_000, 40_000,
  42_195, 50_000, 60_000, 75_000, 90_000, 100_000, 125_000, 150_000, 175_000, 200_000,
  225_000, 250_000, 275_000, 300_000, 325_000, 350_000, 375_000, 400_000, 425_000, 450_000,
  475_000, 500_000, 525_000, 550_000, 575_000, 600_000, 625_000, 650_000, 675_000, 700_000,
  725_000, 750_000, 775_000, 800_000, 825_000, 850_000, 875_000, 900_000, 925_000, 950_000,
  975_000, 1_000_000,
]);

/**
 * Major ranks. `order` is the ONLY ordering authority: `world_crown` has the highest
 * order and nothing may be defined above it. The DB mirrors this as an enum plus a
 * CHECK constraint; see backend/supabase/migrations/0003_monthly_apex.sql.
 */
export const MAJOR_RANKS = Object.freeze([
  { id: 'awakening',   order:  1, min_meters:         0, max_meters:  49_999 },
  { id: 'strider',     order:  2, min_meters:    50_000, max_meters:  99_999 },
  { id: 'runner',      order:  3, min_meters:   100_000, max_meters: 199_999 },
  { id: 'challenger',  order:  4, min_meters:   200_000, max_meters: 299_999 },
  { id: 'vanguard',    order:  5, min_meters:   300_000, max_meters: 399_999 },
  { id: 'champion',    order:  6, min_meters:   400_000, max_meters: 499_999 },
  { id: 'master',      order:  7, min_meters:   500_000, max_meters: 599_999 },
  { id: 'grandmaster', order:  8, min_meters:   600_000, max_meters: 699_999 },
  { id: 'legend',      order:  9, min_meters:   700_000, max_meters: 799_999 },
  { id: 'mythic',      order: 10, min_meters:   800_000, max_meters: 899_999 },
  { id: 'apex',        order: 11, min_meters:   900_000, max_meters: 999_999 },
  { id: 'world_crown', order: 12, min_meters: 1_000_000, max_meters: null },
]);

/** Goal library — distance goals. `custom` is open-ended and user supplied. */
export const GOAL_DISTANCES = Object.freeze([
  { id: 'd_400m',      meters:     400 },
  { id: 'd_800m',      meters:     800 },
  { id: 'd_1km',       meters:   1_000 },
  { id: 'd_1mile',     meters:  1609.344 },
  { id: 'd_2km',       meters:   2_000 },
  { id: 'd_3km',       meters:   3_000 },
  { id: 'd_5km',       meters:   5_000 },
  { id: 'd_8km',       meters:   8_000 },
  { id: 'd_10km',      meters:  10_000 },
  { id: 'd_12km',      meters:  12_000 },
  { id: 'd_15km',      meters:  15_000 },
  { id: 'd_10mile',    meters: 16093.44 },
  { id: 'd_20km',      meters:  20_000 },
  { id: 'd_half',      meters: 21097.5 },
  { id: 'd_25km',      meters:  25_000 },
  { id: 'd_30km',      meters:  30_000 },
  { id: 'd_32km',      meters:  32_000 },
  { id: 'd_35km',      meters:  35_000 },
  { id: 'd_marathon',  meters:  42_195 },
  { id: 'd_50km',      meters:  50_000 },
  { id: 'd_custom',    meters: null },
]);

/** Goal library — duration goals, in seconds. */
export const GOAL_DURATIONS = Object.freeze([
  { id: 't_10min',  seconds:    600 },
  { id: 't_15min',  seconds:    900 },
  { id: 't_20min',  seconds:  1_200 },
  { id: 't_30min',  seconds:  1_800 },
  { id: 't_45min',  seconds:  2_700 },
  { id: 't_60min',  seconds:  3_600 },
  { id: 't_75min',  seconds:  4_500 },
  { id: 't_90min',  seconds:  5_400 },
  { id: 't_120min', seconds:  7_200 },
  { id: 't_180min', seconds: 10_800 },
  { id: 't_custom', seconds: null },
]);

/**
 * Session styles. `run_walk` is a beginner *running* method — never a walking sport.
 * `structured` marks styles whose completion feeds the Quality Session Chain.
 */
export const SESSION_STYLES = Object.freeze([
  { id: 's_free',            structured: false },
  { id: 's_run_walk',        structured: false, beginner_method: true },
  { id: 's_easy',            structured: false },
  { id: 's_steady',          structured: false },
  { id: 's_progression',     structured: true },
  { id: 's_tempo',           structured: true },
  { id: 's_intervals',       structured: true },
  { id: 's_fartlek',         structured: true },
  { id: 's_long_run',        structured: false, long_run: true },
  { id: 's_time_trial',      structured: true },
  { id: 's_race_simulation', structured: true },
  { id: 's_track',           structured: false },
  { id: 's_treadmill',       structured: false },
  { id: 's_indoor',          structured: false },
  { id: 's_custom',          structured: false },
]);

/** Activity types allowed to produce running rewards. Direction lock DL-3. */
export const ALLOWED_ACTIVITY_TYPES = Object.freeze(['road', 'track', 'treadmill', 'indoor']);

/** Never convertible into a running reward. Used as negative test fixtures only. */
export const FORBIDDEN_ACTIVITY_TYPES = Object.freeze(['trail', 'hiking', 'cycling', 'climbing', 'walking_only']);

/** Distances for which a fastest-valid-segment best effort is extracted. */
export const BEST_EFFORT_DISTANCES = Object.freeze([
  400, 800, 1_000, 1609.344, 2_000, 3_000, 5_000, 8_000, 10_000, 12_000,
  15_000, 16093.44, 20_000, 21097.5, 25_000, 30_000, 32_000, 35_000, 42_195, 50_000,
]);

/**
 * Runner Passport bands. A band is a *recommendation key*, never a content lock and
 * never a social class. A user's passport keeps the full vector; the band is only the
 * headline of that vector.
 */
export const PASSPORT_BANDS = Object.freeze([
  { id: 'R0', label_key: 'passport.band.R0', focus_min_m:      0, focus_max_m:  3_000 },
  { id: 'R1', label_key: 'passport.band.R1', focus_min_m:  1_000, focus_max_m:  5_000 },
  { id: 'R2', label_key: 'passport.band.R2', focus_min_m:  5_000, focus_max_m: 10_000 },
  { id: 'R3', label_key: 'passport.band.R3', focus_min_m: 10_000, focus_max_m: 15_000 },
  { id: 'R4', label_key: 'passport.band.R4', focus_min_m: 15_000, focus_max_m: 20_000 },
  { id: 'R5', label_key: 'passport.band.R5', focus_min_m: 20_000, focus_max_m: 21097.5 },
  { id: 'R6', label_key: 'passport.band.R6', focus_min_m: 25_000, focus_max_m: 42_195 },
  { id: 'R7', label_key: 'passport.band.R7', focus_min_m: 42_195, focus_max_m: null },
]);

/** Battle difficulty lanes. Lanes give zero Fitness Core Power — they only change combat. */
export const DIFFICULTY_LANES = Object.freeze([
  { id: 'journey',  order: 1 },
  { id: 'standard', order: 2 },
  { id: 'veteran',  order: 3 },
  { id: 'master',   order: 4 },
  { id: 'legend',   order: 5 },
  { id: 'apex',     order: 6 },
]);

/** Verification grades. Direction lock: `X` never yields running reward. */
export const VERIFICATION_GRADES = Object.freeze([
  { id: 'A', core_power: true,  competitive: true },
  { id: 'B', core_power: true,  competitive: true },
  { id: 'C', core_power: true,  competitive: false },
  { id: 'D', core_power: false, competitive: false },
  { id: 'X', core_power: false, competitive: false },
]);

/** Launch content floor. Mirrors content/schemas/direction_lock.json. */
export const LAUNCH_CONTENT_FLOOR = Object.freeze({
  continents: 12,
  region_nodes: 96,
  main_stages: 72,
  side_stages: 24,
  playable_characters: 12,
  character_episodes: 36,
  tactical_skills: 48,
  tactical_relics: 72,
  standard_enemy_families: 24,
  elite_enemy_families: 12,
  continent_bosses: 12,
  world_bosses: 4,
  apex_bosses: 1,
  companions: 12,
  equipable_cosmetics: 96,
  story_chapters: 12,
  launch_seasons: 1,
  event_arcs: 3,
});

/** Reward formula version. Every ledger row records the version that produced it. */
export const REWARD_FORMULA_VERSION = 'reward.v1.0.0';
export const PASSPORT_RULES_VERSION = 'passport.v1.0.0';
export const APEX_LADDER_VERSION = 'apex.v1.0.0';

/** Daily Momentum milestone days (data-driven, master # 11.7). */
export const DAILY_MOMENTUM_MILESTONES = Object.freeze([2, 3, 5, 7, 10, 14, 21, 30, 50, 75, 100, 180, 365]);

/** Returns the major rank object for a monthly distance in meters. */
export function rankForMeters(meters) {
  if (!Number.isFinite(meters) || meters < 0) throw new RangeError(`invalid meters: ${meters}`);
  for (const rank of MAJOR_RANKS) {
    if (rank.max_meters === null) { if (meters >= rank.min_meters) return rank; }
    else if (meters >= rank.min_meters && meters <= rank.max_meters) return rank;
  }
  /* istanbul ignore next — MAJOR_RANKS covers [0, inf) by construction */
  throw new RangeError(`no rank for ${meters}`);
}

/** Stable checkpoint id for an index, e.g. index 51 -> "apex_cp_52_1000km". */
export function checkpointId(index) {
  const meters = APEX_CHECKPOINT_METERS[index];
  if (meters === undefined) throw new RangeError(`no checkpoint at index ${index}`);
  const km = meters / 1000;
  const kmLabel = Number.isInteger(km) ? `${km}km` : `${km}km`.replace('.', 'p');
  return `apex_cp_${String(index + 1).padStart(2, '0')}_${kmLabel}`;
}
