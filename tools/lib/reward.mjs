/**
 * Explainable multi-component run reward.
 *
 * Master # 11.1 / # 11.6: a run is never collapsed into "one distance number times one
 * pace number". Every component is computed independently, carries its own explanation,
 * and the result screen shows the user exactly why each part was awarded.
 *
 * Forbidden inputs (direction lock DL-3 / DL-5) — `assertNoForbiddenInput` rejects them
 * rather than silently ignoring them, so a regression cannot quietly reintroduce one:
 *   trail / hiking / cycling / elevation / weather / night / paid / ad / referral / idle
 */

import {
  REWARD_FORMULA_VERSION, ALLOWED_ACTIVITY_TYPES, VERIFICATION_GRADES,
  SESSION_STYLES, MAJOR_RANKS, rankForMeters,
} from './constants.mjs';

const FORBIDDEN_INPUT_KEYS = Object.freeze([
  'elevation_gain', 'elevation_gain_meters', 'ascent', 'descent', 'altitude_bonus',
  'trail', 'trail_factor', 'hiking', 'cycling', 'climbing',
  'weather', 'weather_multiplier', 'temperature_bonus', 'is_night', 'night_bonus',
  'paid_multiplier', 'purchase_bonus', 'ad_bonus', 'referral_bonus', 'idle_bonus',
  'login_day_bonus', 'vip_level',
]);

/**
 * Reference speeds (m/s) used for the distance-specific absolute performance component.
 * These are internal balance constants for a game economy — they are deliberately NOT
 * presented to the player as fitness advice, and they are not derived from any licensed
 * dataset. Tuned by tools/balance-simulator, versioned with the formula.
 */
const REFERENCE_SPEED = Object.freeze([
  { meters:    400, ref: 4.44 }, { meters:    800, ref: 4.21 }, { meters:  1_000, ref: 4.10 },
  { meters:  2_000, ref: 3.85 }, { meters:  3_000, ref: 3.70 }, { meters:  5_000, ref: 3.57 },
  { meters:  8_000, ref: 3.42 }, { meters: 10_000, ref: 3.33 }, { meters: 15_000, ref: 3.21 },
  { meters: 20_000, ref: 3.13 }, { meters: 21_097.5, ref: 3.10 }, { meters: 30_000, ref: 2.98 },
  { meters: 42_195, ref: 2.86 }, { meters: 50_000, ref: 2.70 },
]);

function referenceSpeedFor(meters) {
  if (meters <= REFERENCE_SPEED[0].meters) return REFERENCE_SPEED[0].ref;
  const last = REFERENCE_SPEED.at(-1);
  if (meters >= last.meters) return last.ref;
  for (let i = 1; i < REFERENCE_SPEED.length; i += 1) {
    const a = REFERENCE_SPEED[i - 1];
    const b = REFERENCE_SPEED[i];
    if (meters <= b.meters) {
      const t = (meters - a.meters) / (b.meters - a.meters);
      return a.ref + t * (b.ref - a.ref);
    }
  }
  /* istanbul ignore next */
  return last.ref;
}

/** Monthly multiplier by rank. Flat after `world_crown` — DL-1: nothing rises above it. */
const RANK_MULTIPLIER = Object.freeze({
  awakening: 1.00, strider: 1.02, runner: 1.04, challenger: 1.06,
  vanguard: 1.08, champion: 1.10, master: 1.12, grandmaster: 1.14,
  legend: 1.16, mythic: 1.18, apex: 1.20, world_crown: 1.25,
});

export function monthlyMultiplier(ladderedMeters) {
  const rank = rankForMeters(ladderedMeters);
  const value = RANK_MULTIPLIER[rank.id];
  const crown = RANK_MULTIPLIER[MAJOR_RANKS.at(-1).id];
  // Hard ceiling: even a corrupted rank row cannot produce a multiplier above the crown.
  return Math.min(value, crown);
}

export function assertNoForbiddenInput(session) {
  for (const key of FORBIDDEN_INPUT_KEYS) {
    if (Object.hasOwn(session, key)) {
      throw new Error(`forbidden reward input "${key}" (direction lock DL-3/DL-5)`);
    }
  }
  if (!ALLOWED_ACTIVITY_TYPES.includes(session.activity_type)) {
    throw new Error(`activity_type "${session.activity_type}" is not a running activity (DL-3)`);
  }
}

/**
 * @param {object} session
 *   {string} activity_type       road|track|treadmill|indoor
 *   {number} distance_meters     integer meters, verified
 *   {number} moving_seconds
 *   {string} verification_grade  A|B|C|D|X
 *   {string} style_id
 *   {object} [goal]              {goal_type, target_meters?, target_seconds?}
 *   {number[]} [split_speeds]    per-km speeds, for the consistency component
 *   {boolean} [structured_completed]
 * @param {object} context
 *   {number} personal_baseline_speed   recent 90-day baseline for this distance (m/s)
 *   {number} laddered_meters_before    monthly ladder distance before this session
 *   {number} laddered_meters_after
 *   {number} crossed_checkpoint_count
 *   {number} daily_momentum_days
 *   {number} consecutive_weeks
 *   {number} quality_chain_length
 *   {number} long_run_chain_length
 *   {number} weekly_volume_meters_after
 *   {number} [quest_event_bonus]
 *   {number} [long_run_threshold_meters] from the passport
 */
export function calculateRunReward(session, context) {
  assertNoForbiddenInput(session);

  const grade = VERIFICATION_GRADES.find((g) => g.id === session.verification_grade);
  if (!grade) throw new Error(`unknown verification grade ${session.verification_grade}`);

  const components = {};
  const explain = {};

  // Grade X (non-running source) and grade D (manual only) never feed core power.
  const coreEligible = grade.core_power;

  const meters = session.distance_meters;
  const seconds = Math.max(0, session.moving_seconds);

  // --- Base: strictly monotonic in verified distance and verified moving time. ---
  components.base_distance_xp = coreEligible ? round2(meters * 0.10) : 0;
  explain.base_distance_xp = { meters, rate_per_meter: 0.10 };

  components.base_moving_time_xp = coreEligible ? round2(seconds * 0.05) : 0;
  explain.base_moving_time_xp = { moving_seconds: seconds, rate_per_second: 0.05 };

  // --- Distance-specific absolute performance. A 45-minute 10 km and a 50-minute 10 km
  // receive the same base but a different performance bonus. Never a single global pace. ---
  const speed = seconds > 0 ? meters / seconds : 0;
  const ref = referenceSpeedFor(meters);
  const perfRatio = ref > 0 ? speed / ref : 0;
  components.distance_specific_performance = coreEligible && perfRatio > 0.6
    ? round2(Math.max(0, (perfRatio - 0.6)) * meters * 0.05)
    : 0;
  explain.distance_specific_performance = {
    speed_mps: round3(speed), reference_speed_mps: round3(ref), ratio: round3(perfRatio),
  };

  // --- Personal improvement, awarded independently of absolute performance so that a
  // slower runner who is improving is genuinely rewarded. ---
  const baseline = context.personal_baseline_speed ?? null;
  const improvement = baseline && baseline > 0 ? (speed - baseline) / baseline : 0;
  components.personal_improvement = coreEligible && improvement > 0
    ? round2(Math.min(improvement, 0.25) * meters * 0.20)
    : 0;
  explain.personal_improvement = {
    baseline_speed_mps: baseline ? round3(baseline) : null, improvement_ratio: round3(improvement),
  };

  // --- Goal completion. Missing a goal never zeroes the run. ---
  const goalDone = goalCompleted(session);
  components.goal_completion = coreEligible && goalDone ? round2(50 + meters * 0.01) : 0;
  explain.goal_completion = { goal: session.goal ?? null, completed: goalDone };

  // --- Structured execution (interval/tempo/progression/... actually executed). ---
  const style = SESSION_STYLES.find((s) => s.id === session.style_id);
  const structured = Boolean(style?.structured) && session.structured_completed === true;
  components.structured_execution = coreEligible && structured ? round2(40 + meters * 0.008) : 0;
  explain.structured_execution = { style_id: session.style_id, structured, completed: session.structured_completed ?? false };

  // --- Split consistency (pacing quality). ---
  const cv = coefficientOfVariation(session.split_speeds ?? []);
  components.split_consistency = coreEligible && cv !== null && cv < 0.12
    ? round2((0.12 - cv) * meters * 0.05)
    : 0;
  explain.split_consistency = { split_count: (session.split_speeds ?? []).length, coefficient_of_variation: cv === null ? null : round3(cv) };

  // --- Long run relative to THIS runner's passport, not to an absolute distance.
  // A beginner's 3 km can be a long run; a marathoner's 3 km is not. ---
  const longRunThreshold = context.long_run_threshold_meters ?? null;
  const isLongRun = longRunThreshold !== null && meters >= longRunThreshold;
  components.long_run_relative = coreEligible && isLongRun ? round2(meters * 0.03) : 0;
  explain.long_run_relative = { threshold_meters: longRunThreshold, is_long_run: isLongRun };

  // --- Continuity components. ---
  components.daily_momentum = coreEligible ? round2(Math.min(context.daily_momentum_days ?? 0, 30) * 8) : 0;
  explain.daily_momentum = { streak_days: context.daily_momentum_days ?? 0 };

  components.consecutive_week = coreEligible ? round2(Math.min(context.consecutive_weeks ?? 0, 12) * 25) : 0;
  explain.consecutive_week = { consecutive_weeks: context.consecutive_weeks ?? 0 };

  components.quality_session_chain = coreEligible ? round2(Math.min(context.quality_chain_length ?? 0, 10) * 30) : 0;
  explain.quality_session_chain = { chain_length: context.quality_chain_length ?? 0 };

  components.long_run_chain = coreEligible ? round2(Math.min(context.long_run_chain_length ?? 0, 8) * 35) : 0;
  explain.long_run_chain = { chain_length: context.long_run_chain_length ?? 0 };

  components.weekly_volume = coreEligible
    ? round2(Math.min(context.weekly_volume_meters_after ?? 0, 200_000) * 0.002)
    : 0;
  explain.weekly_volume = { weekly_volume_meters: context.weekly_volume_meters_after ?? 0 };

  // --- Monthly Apex checkpoints: paid once per threshold crossing, by the transaction
  // that crossed it. Beyond 1000 km `crossed_checkpoint_count` is always 0. ---
  components.monthly_apex_checkpoint = coreEligible ? round2((context.crossed_checkpoint_count ?? 0) * 120) : 0;
  explain.monthly_apex_checkpoint = {
    crossed_count: context.crossed_checkpoint_count ?? 0,
    laddered_before: context.laddered_meters_before,
    laddered_after: context.laddered_meters_after,
  };

  components.quest_event = coreEligible ? round2(context.quest_event_bonus ?? 0) : 0;
  explain.quest_event = { bonus: context.quest_event_bonus ?? 0 };

  const subtotal = round2(Object.values(components).reduce((a, b) => a + b, 0));
  const multiplier = monthlyMultiplier(context.laddered_meters_after ?? 0);
  const total = round2(subtotal * multiplier);

  return {
    formula_version: REWARD_FORMULA_VERSION,
    verification_grade: session.verification_grade,
    core_power_eligible: coreEligible,
    components,
    explanation: explain,
    subtotal,
    monthly_multiplier: multiplier,
    monthly_rank: rankForMeters(context.laddered_meters_after ?? 0).id,
    total_fitness_xp: total,
    // DL-1: a session past the crown still earns everything above; only the ladder stops.
    over_crown_session: (context.laddered_meters_after ?? 0) >= 1_000_000
      && (context.crossed_checkpoint_count ?? 0) === 0
      && (context.laddered_meters_before ?? 0) >= 1_000_000,
  };
}

function goalCompleted(session) {
  const goal = session.goal;
  if (!goal) return false;
  if (goal.goal_type === 'distance' && goal.target_meters) return session.distance_meters >= goal.target_meters;
  if (goal.goal_type === 'duration' && goal.target_seconds) return session.moving_seconds >= goal.target_seconds;
  return false;
}

function coefficientOfVariation(values) {
  const clean = values.filter((v) => Number.isFinite(v) && v > 0);
  if (clean.length < 2) return null;
  const mean = clean.reduce((a, b) => a + b, 0) / clean.length;
  if (mean === 0) return null;
  const variance = clean.reduce((a, b) => a + (b - mean) ** 2, 0) / clean.length;
  return Math.sqrt(variance) / mean;
}

const round2 = (n) => Math.round(n * 100) / 100;
const round3 = (n) => Math.round(n * 1000) / 1000;
