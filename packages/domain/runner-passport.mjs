/**
 * Runner Passport — the multi-dimensional runner profile and the day-one start route.
 *
 * Direction lock DL-2: the passport RECOMMENDS, it never RESTRICTS. Nothing in this module
 * may return a lock, a prerequisite, or a filtered-down goal library. `recommend()` always
 * reports the full library as selectable, and `selectGoal()` accepts any goal from any band
 * for any user on their first session.
 *
 * Everything is explainable: each recommendation carries the feature snapshot and the rule
 * id that produced it, so the result screen can answer "why am I seeing this?" and so a
 * recomputation with the same snapshot + version reproduces the same output exactly.
 */

import {
  GOAL_DISTANCES, GOAL_DURATIONS, SESSION_STYLES, PASSPORT_BANDS,
  DIFFICULTY_LANES, PASSPORT_RULES_VERSION,
} from './constants.mjs';

const M = Object.fromEntries(GOAL_DISTANCES.map((d) => [d.id, d.meters]));

/**
 * Self-selected experience answers offered in the first 60 seconds.
 * These give an immediate provisional profile so the user can start without any history.
 */
export const EXPERIENCE_OPTIONS = Object.freeze([
  'new_to_running', 'restarting', 'regular_3k_to_5k', 'regular_5k_to_10k',
  'distance_10k_to_20k', 'half_marathon', 'marathon', 'advanced_custom',
]);

const EXPERIENCE_TO_BAND = Object.freeze({
  new_to_running: 'R0',
  restarting: 'R1',
  regular_3k_to_5k: 'R1',
  regular_5k_to_10k: 'R2',
  distance_10k_to_20k: 'R3',
  half_marathon: 'R5',
  marathon: 'R6',
  advanced_custom: 'R7',
});

/**
 * Band -> recommended first goals. These mirror the acceptance table in master # 22.3.
 * The list is a shortlist for the "Today's recommendation" row only; the full library is
 * always one tap away and always fully selectable.
 */
const BAND_RECOMMENDATIONS = Object.freeze({
  R0: { distances: ['d_400m', 'd_800m', 'd_1km'], durations: ['t_10min', 't_20min'], styles: ['s_run_walk', 's_easy'], lane: 'journey' },
  R1: { distances: ['d_2km', 'd_3km', 'd_5km'],   durations: ['t_20min', 't_30min'], styles: ['s_easy', 's_steady'],  lane: 'standard' },
  R2: { distances: ['d_5km', 'd_8km', 'd_10km'],  durations: ['t_30min', 't_45min'], styles: ['s_steady', 's_tempo'], lane: 'veteran' },
  R3: { distances: ['d_10km', 'd_12km', 'd_15km', 'd_20km'], durations: ['t_45min', 't_60min'], styles: ['s_tempo', 's_intervals', 's_progression'], lane: 'veteran' },
  R4: { distances: ['d_12km', 'd_15km', 'd_20km'], durations: ['t_60min', 't_90min'], styles: ['s_long_run', 's_progression'], lane: 'master' },
  R5: { distances: ['d_15km', 'd_20km', 'd_half', 'd_25km'], durations: ['t_90min', 't_120min'], styles: ['s_long_run', 's_race_simulation'], lane: 'master' },
  R6: { distances: ['d_half', 'd_25km', 'd_30km', 'd_32km', 'd_35km', 'd_marathon'], durations: ['t_120min', 't_180min'], styles: ['s_long_run', 's_race_simulation', 's_progression'], lane: 'legend' },
  R7: { distances: ['d_50km', 'd_custom'], durations: ['t_180min', 't_custom'], styles: ['s_long_run', 's_time_trial', 's_custom'], lane: 'legend' },
});

/** Median that ignores a single wild outlier; used so one freak run cannot move a baseline. */
function robustCentre(values) {
  const clean = values.filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
  if (clean.length === 0) return null;
  if (clean.length < 4) return clean[Math.floor((clean.length - 1) / 2)];
  // Trim the top and bottom sample before taking the median: a single 42 km outlier in a
  // 5 km runner's history must not drag the whole profile upward.
  const trimmed = clean.slice(1, -1);
  const mid = Math.floor(trimmed.length / 2);
  return trimmed.length % 2 ? trimmed[mid] : Math.round((trimmed[mid - 1] + trimmed[mid]) / 2);
}

/**
 * Capability metres -> band.
 *
 * The upper edges of R5 and R6 carry a deliberate tolerance above the exact race distance.
 * A GPS-measured half marathon routinely records 21.1-21.4 km and a marathon 42.2-42.6 km;
 * without the tolerance a genuine half-marathon runner would be classified as a marathoner
 * purely because their watch measured 21 100 m instead of 21 097.5 m.
 */
function bandForMeters(meters) {
  if (meters === null) return null;
  if (meters < 3_000) return 'R0';
  if (meters < 5_000) return 'R1';
  if (meters < 10_000) return 'R2';
  if (meters < 15_000) return 'R3';
  if (meters < 20_000) return 'R4';
  if (meters <= M.d_half + 1_900) return 'R5';
  if (meters <= M.d_marathon + 2_800) return 'R6';
  return 'R7';
}

const BAND_ORDER = Object.fromEntries(PASSPORT_BANDS.map((b, i) => [b.id, i]));

/**
 * Build a passport from whatever the user has given us so far.
 *
 * @param {object} input
 * @param {string}  [input.self_selected_experience]
 * @param {Array<{meters:number, seconds:number, activity_type?:string, verified?:boolean}>} [input.recent_runs]
 *        Last 4-8 weeks. Used for the capability vector.
 * @param {number}  [input.self_reported_weekly_km]
 * @param {number}  [input.self_reported_monthly_km]
 * @param {string}  [input.preferred_goal_id]
 * @param {string}  [input.preferred_surface]
 * @param {string}  [input.desired_lane]
 * @returns {object} passport
 */
export function buildPassport(input = {}) {
  const runs = (input.recent_runs ?? []).filter((r) => r && Number.isFinite(r.meters) && r.meters > 0);
  const distances = runs.map((r) => r.meters);

  const typical = robustCentre(distances);
  const longest = distances.length ? Math.max(...distances) : null;
  const weeklyVolumeM = runs.length
    ? Math.round(distances.reduce((a, b) => a + b, 0) / Math.max(1, weeksSpanned(runs)))
    : (input.self_reported_weekly_km ? Math.round(input.self_reported_weekly_km * 1000) : null);

  const provisionalBand = EXPERIENCE_TO_BAND[input.self_selected_experience] ?? 'R1';

  // Capability comes from the longest *repeatable* recent distance, not from a single
  // heroic outing: use the typical run for the floor and the longest run as an upgrade
  // signal only when the user has actually repeated something near it.
  const repeatedLong = distances.filter((d) => longest !== null && d >= longest * 0.8).length >= 2;
  const capabilityMeters = repeatedLong ? longest : (typical ?? longest);

  const verifiedBand = bandForMeters(capabilityMeters);
  const band = verifiedBand ?? provisionalBand;

  const confidence = computeConfidence(runs);

  return {
    version: PASSPORT_RULES_VERSION,
    band,
    provisional_band: provisionalBand,
    verified_band: verifiedBand,
    // The full vector is preserved: a user can be R5 on 5 km speed and R3 on single-run
    // distance at the same time, and the UI must never collapse that into one label.
    vector: {
      distance_capacity_meters: capabilityMeters,
      typical_run_meters: typical,
      longest_recent_meters: longest,
      weekly_volume_meters: weeklyVolumeM,
      monthly_volume_meters: input.self_reported_monthly_km ? Math.round(input.self_reported_monthly_km * 1000) : null,
      frequency_per_week: runs.length ? Number((runs.length / Math.max(1, weeksSpanned(runs))).toFixed(2)) : null,
      preferred_surface: input.preferred_surface ?? 'road',
      preferred_goal_id: input.preferred_goal_id ?? null,
      source_confidence: confidence.source,
      profile_confidence: confidence.profile,
    },
    verified_run_count: runs.filter((r) => r.verified).length,
    // DL-2: a passport can never carry a restriction. This field is asserted empty by tests.
    restrictions: [],
    computed_from: { recent_run_count: runs.length, rule_version: PASSPORT_RULES_VERSION },
  };
}

function weeksSpanned(runs) {
  const withDates = runs.filter((r) => r.started_at).map((r) => new Date(r.started_at).getTime());
  if (withDates.length < 2) return 4; // assume a 4-week window when dates are absent
  const span = (Math.max(...withDates) - Math.min(...withDates)) / (7 * 24 * 3600 * 1000);
  return Math.max(1, Math.round(span));
}

function computeConfidence(runs) {
  const verified = runs.filter((r) => r.verified).length;
  const source = runs.length === 0 ? 0 : Number((verified / runs.length).toFixed(2));
  // Self-report alone is deliberately low confidence: it is enough to start playing
  // immediately, never enough to settle a competitive reward.
  const profile = Math.min(1, Number((0.2 + 0.2 * Math.min(verified, 4)).toFixed(2)));
  return { source, profile };
}

/**
 * Produce the day-one start route.
 *
 * The returned object always contains `full_library_available: true` and the complete goal
 * library. A caller must never render the shortlist as the only option.
 */
export function recommend(passport) {
  const rec = BAND_RECOMMENDATIONS[passport.band] ?? BAND_RECOMMENDATIONS.R1;
  return {
    version: PASSPORT_RULES_VERSION,
    band: passport.band,
    rule_id: `band_recommendation.${passport.band}`,
    recommended_distance_goal_ids: [...rec.distances],
    recommended_duration_goal_ids: [...rec.durations],
    recommended_style_ids: [...rec.styles],
    recommended_lane: rec.lane,
    explanation: {
      band: passport.band,
      distance_capacity_meters: passport.vector.distance_capacity_meters,
      typical_run_meters: passport.vector.typical_run_meters,
      profile_confidence: passport.vector.profile_confidence,
      rule_version: PASSPORT_RULES_VERSION,
    },
    // DL-2 guarantees, asserted by tests/runner-passport.test.mjs
    full_library_available: true,
    all_distance_goal_ids: GOAL_DISTANCES.map((d) => d.id),
    all_duration_goal_ids: GOAL_DURATIONS.map((d) => d.id),
    all_style_ids: SESSION_STYLES.map((s) => s.id),
    all_lane_ids: DIFFICULTY_LANES.map((l) => l.id),
    prerequisites: [],
    locked_goal_ids: [],
    locked_continent_ids: [],
    locked_character_ids: [],
  };
}

/**
 * Accept a user's goal choice.
 *
 * There is no branch in this function that can reject a goal because of the user's band.
 * A brand-new account with zero history may select the marathon; a marathon runner may
 * select 400 m. Both are recorded with `overrode_recommendation` for analytics only.
 */
export function selectGoal(passport, choice) {
  const known = new Set(GOAL_DISTANCES.map((d) => d.id));
  const knownDur = new Set(GOAL_DURATIONS.map((d) => d.id));
  const knownStyle = new Set(SESSION_STYLES.map((s) => s.id));

  if (choice.goal_type === 'distance' && !known.has(choice.goal_id)) {
    throw new Error(`unknown distance goal: ${choice.goal_id}`);
  }
  if (choice.goal_type === 'duration' && !knownDur.has(choice.goal_id)) {
    throw new Error(`unknown duration goal: ${choice.goal_id}`);
  }
  if (choice.style_id && !knownStyle.has(choice.style_id)) {
    throw new Error(`unknown session style: ${choice.style_id}`);
  }
  if (choice.goal_id === 'd_custom' && !(choice.custom_meters > 0)) {
    throw new Error('custom distance goal requires custom_meters');
  }

  const rec = recommend(passport);
  const recommended = choice.goal_type === 'distance'
    ? rec.recommended_distance_goal_ids.includes(choice.goal_id)
    : rec.recommended_duration_goal_ids.includes(choice.goal_id);

  return {
    accepted: true,               // DL-2: always true for a well-formed goal
    goal_type: choice.goal_type,
    goal_id: choice.goal_id,
    custom_meters: choice.custom_meters ?? null,
    custom_seconds: choice.custom_seconds ?? null,
    style_id: choice.style_id ?? 's_free',
    lane_id: choice.lane_id ?? rec.recommended_lane,
    overrode_recommendation: !recommended,
    passport_version: passport.version,
    passport_band_at_selection: passport.band,
  };
}

/**
 * Recalculate after new verified activity (first calibration run, or a history import).
 * A band may move up or down, but nothing already earned is ever revoked — the caller
 * keeps its rewards, characters and world progress untouched.
 */
export function recalculate(passport, newRuns) {
  const merged = [
    ...(passport.__source_runs ?? []),
    ...newRuns.map((r) => ({ ...r, verified: r.verified ?? true })),
  ];
  const next = buildPassport({
    self_selected_experience: invertBand(passport.provisional_band),
    recent_runs: merged,
    preferred_goal_id: passport.vector.preferred_goal_id ?? undefined,
    preferred_surface: passport.vector.preferred_surface,
  });
  next.__source_runs = merged;
  return {
    passport: next,
    band_changed: next.band !== passport.band,
    band_before: passport.band,
    band_after: next.band,
    direction: BAND_ORDER[next.band] > BAND_ORDER[passport.band] ? 'up'
      : BAND_ORDER[next.band] < BAND_ORDER[passport.band] ? 'down' : 'same',
    // Explicit, tested guarantee: recalculation never revokes anything.
    revoked_rewards: [],
    revoked_characters: [],
    revoked_world_progress: [],
  };
}

function invertBand(bandId) {
  const found = Object.entries(EXPERIENCE_TO_BAND).find(([, b]) => b === bandId);
  return found ? found[0] : 'restarting';
}
