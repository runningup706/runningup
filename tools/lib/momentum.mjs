/**
 * Daily Momentum, Consecutive Week, Quality Session Chain and Long-Run Chain.
 *
 * Master # 11.7. Key rules encoded here:
 *   - the reward day is derived from the user's IANA timezone and the SERVER timestamp,
 *     never from device wall clock
 *   - a cross-midnight run belongs to exactly one reward day
 *   - several verified runs on the same reward day advance the streak by 1, while every
 *     session still earns its own full reward
 *   - a missed day resets the CURRENT streak only: lifetime best, accumulated distance and
 *     everything already granted survive untouched (no negative XP, no debt, no clawback)
 */

import { DAILY_MOMENTUM_MILESTONES, SESSION_STYLES } from './constants.mjs';

/**
 * Reward day for a session, as `YYYY-MM-DD` in the user's reward timezone.
 * A run that starts 23:40 and ends 00:20 is attributed to its START day, so a single
 * session can never be counted on two days.
 */
export function rewardDay(serverStartIso, ianaTimezone) {
  const date = new Date(serverStartIso);
  if (Number.isNaN(date.getTime())) throw new RangeError(`invalid timestamp: ${serverStartIso}`);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ianaTimezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Month key `YYYY-MM` in the user's reward timezone — the Monthly Apex partition key. */
export function monthKey(serverStartIso, ianaTimezone) {
  return rewardDay(serverStartIso, ianaTimezone).slice(0, 7);
}

function dayDifference(isoDayA, isoDayB) {
  const a = Date.UTC(...isoDayA.split('-').map((n, i) => (i === 1 ? Number(n) - 1 : Number(n))));
  const b = Date.UTC(...isoDayB.split('-').map((n, i) => (i === 1 ? Number(n) - 1 : Number(n))));
  return Math.round((b - a) / 86_400_000);
}

export function emptyMomentum() {
  return { current_streak: 0, best_streak: 0, last_reward_day: null, milestones_claimed: [] };
}

/**
 * Advance Daily Momentum for one verified session.
 * Returns `incremented: false` when the day was already counted — the caller still pays
 * the session's own reward, it just does not move the streak.
 */
export function applyDailyMomentum(state, sessionRewardDay) {
  if (state.last_reward_day === sessionRewardDay) {
    return {
      state, incremented: false, reset: false, new_milestones: [],
      reason: 'same_reward_day_already_counted',
    };
  }
  const gap = state.last_reward_day === null ? null : dayDifference(state.last_reward_day, sessionRewardDay);

  if (gap !== null && gap < 0) {
    // A backfilled/out-of-order session older than the current streak head does not
    // rewrite history; it is recorded but the streak head stays where it is.
    return { state, incremented: false, reset: false, new_milestones: [], reason: 'out_of_order_backfill' };
  }

  const continuing = gap === 1 || state.last_reward_day === null;
  const current = continuing ? state.current_streak + 1 : 1;
  const wasReset = !continuing && state.last_reward_day !== null;

  const next = {
    current_streak: current,
    // Lifetime best is never reduced by a missed day.
    best_streak: Math.max(state.best_streak, current),
    last_reward_day: sessionRewardDay,
    milestones_claimed: [...state.milestones_claimed],
  };

  const newMilestones = DAILY_MOMENTUM_MILESTONES
    .filter((m) => current >= m && !next.milestones_claimed.includes(m));
  next.milestones_claimed.push(...newMilestones);

  return { state: next, incremented: true, reset: wasReset, new_milestones: newMilestones, reason: null };
}

/**
 * Consecutive Week: the user's own weekly goal, met week after week. The goal shape is the
 * user's choice (distance / sessions / structured plan / performance) and is snapshotted
 * per week so that changing next week's goal cannot retroactively break last week.
 */
export function applyConsecutiveWeek(state, weekSnapshot) {
  const met = weekGoalMet(weekSnapshot);
  if (!met) {
    return {
      state: { current_weeks: 0, best_weeks: state.best_weeks, last_week_key: weekSnapshot.week_key },
      met: false,
    };
  }
  const current = state.last_week_key === null || isPreviousWeek(state.last_week_key, weekSnapshot.week_key)
    ? state.current_weeks + 1
    : 1;
  return {
    state: {
      current_weeks: current,
      best_weeks: Math.max(state.best_weeks, current),
      last_week_key: weekSnapshot.week_key,
    },
    met: true,
  };
}

function weekGoalMet(s) {
  switch (s.goal_kind) {
    case 'distance': return s.achieved_meters >= s.target_meters;
    case 'sessions': return s.achieved_sessions >= s.target_sessions;
    case 'structured': return s.achieved_structured_sessions >= s.target_structured_sessions;
    case 'performance': return s.achieved_performance_sessions >= s.target_performance_sessions;
    default: throw new Error(`unknown weekly goal kind: ${s.goal_kind}`);
  }
}

function isPreviousWeek(prevKey, key) {
  const [py, pw] = prevKey.split('-W').map(Number);
  const [y, w] = key.split('-W').map(Number);
  if (y === py) return w === pw + 1;
  if (y === py + 1) return pw >= 52 && w === 1;
  return false;
}

/**
 * Quality Session Chain: only sessions the user PLANNED as structured and then actually
 * executed count. A run that merely happened to be fast is not silently reclassified as a
 * quality session — the plan snapshot is the authority.
 */
export function applyQualityChain(state, session) {
  const style = SESSION_STYLES.find((s) => s.id === session.planned_style_id);
  const qualifies = Boolean(style?.structured) && session.structured_completed === true;
  if (!qualifies) {
    return { state: { current: 0, best: state.best }, qualified: false };
  }
  const current = state.current + 1;
  return { state: { current, best: Math.max(state.best, current) }, qualified: true };
}

/**
 * Long-Run Chain: the threshold is relative to the runner's own capacity, so a beginner's
 * 3 km continuous run and a marathoner's 30 km are both legitimate long-run milestones.
 */
export function longRunThresholdMeters(passport) {
  const capacity = passport.vector.distance_capacity_meters;
  if (!capacity) return 3_000;             // no history yet: a modest, reachable first target
  return Math.max(2_000, Math.round(capacity * 0.85));
}

export function applyLongRunChain(state, session, passport) {
  const threshold = longRunThresholdMeters(passport);
  if (session.distance_meters < threshold) {
    return { state: { current: 0, best: state.best }, qualified: false, threshold_meters: threshold };
  }
  const current = state.current + 1;
  return {
    state: { current, best: Math.max(state.best, current) },
    qualified: true,
    threshold_meters: threshold,
  };
}
