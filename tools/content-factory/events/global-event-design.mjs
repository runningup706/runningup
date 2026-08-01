/**
 * Global Events — the 50-to-100 runner mass-participation races.
 *
 * An eight-runner race and a Global Event are different products sharing one engine. The
 * eight-runner race is matchmade and instant; a Global Event is scheduled, entered in
 * advance, checked into, seeded into heats, counted down by the server and settled by the
 * server. `RACE_FIELD_SIZE` stays 8 and is not touched here.
 *
 * THE PART THAT IS EASY TO FAKE
 * -----------------------------
 * A Global Event is trivially "done" as a screen with a countdown and a fake leaderboard.
 * The owner direction lists what completion actually requires — real schema, lifecycle,
 * load test at 50 and at 100, bandwidth, DB write volume, realtime connections, timeout,
 * DNF, reconnection, idempotent reward — and the honest state of each of those is recorded
 * per event in `evidence_required`, not asserted. Nothing in this file claims a measurement
 * that has not been taken.
 *
 * PRIVACY
 * -------
 * Participants never see each other's GPS. The only things that cross between runners are
 * virtual course progress, server-verified distance, server-computed rank, the profile the
 * runner chose to make public, and an abstracted pace state (`holding`, `lifting`,
 * `fading`) — never a coordinate, never a raw speed, never a location. `SHARED_FIELDS`
 * below is the whole list, and the server contract test asserts the snapshot payload has
 * no key outside it.
 *
 * RENDERING AT 100
 * ----------------
 * 100 participants is a data fact, not a draw call count. `render_budget` states how many
 * are drawn at each fidelity; the rest are rows in a rank panel and a progress strip.
 */

import { SCALE_FLOOR } from '../../../packages/domain/constants.mjs';

/** The eleven stages a Global Event passes through. The server owns every transition. */
export const EVENT_LIFECYCLE = Object.freeze([
  { id: 'scheduled',      server_owned: true,  description: 'the event exists with a start time and a capacity' },
  { id: 'entry_open',     server_owned: true,  description: 'runners may claim a place until capacity or cutoff' },
  { id: 'entry_closed',   server_owned: true,  description: 'roster frozen, notifications dispatched' },
  { id: 'check_in',       server_owned: true,  description: 'entrants confirm presence inside a bounded window' },
  { id: 'heats_assigned', server_owned: true,  description: 'checked-in runners are seeded into heats' },
  { id: 'countdown',      server_owned: true,  description: 'server clock counts down; client clock is never authoritative' },
  { id: 'running',        server_owned: true,  description: 'progress snapshots flow; ranks are computed server-side' },
  { id: 'verifying',      server_owned: true,  description: 'finishes are verified before they are ranked' },
  { id: 'settled',        server_owned: true,  description: 'final result is written once and is immutable' },
  { id: 'rewarded',       server_owned: true,  description: 'rewards granted through the idempotent ledger path' },
  { id: 'archived',       server_owned: true,  description: 'result readable forever; live channels released' },
]);

/**
 * The only participant fields that may cross between runners.
 *
 * Adding a key here is a privacy decision, which is why it is a list in the domain rather
 * than whatever the snapshot serializer happens to emit.
 */
export const SHARED_FIELDS = Object.freeze([
  'participant_id',
  'display_name',
  'my_runner_appearance_id',
  'course_progress_ratio',
  'verified_distance_meters',
  'server_rank',
  'pace_state',
  'status',
]);

/** Abstracted pace states. Deliberately coarse: a real pace is a location over time. */
export const PACE_STATES = Object.freeze(['holding', 'lifting', 'fading', 'finished', 'dnf']);

/**
 * Render budget at full field. Sums to well under 100 by design — the remainder are rank
 * rows, which is what the owner direction asks for and what a phone can actually do.
 */
export const RENDER_BUDGET = Object.freeze({
  full_3d_near: 6,
  low_cost_3d_mid: 12,
  animated_billboard_far: 24,
  rank_panel_only: 58,
  max_concurrent_skinned: 18,
});

/**
 * Evidence each event must carry before it may be reported as complete.
 *
 * `NOT_RUN` is the honest default and the release report prints it as such. A value here
 * is only ever changed by a run that actually happened.
 */
export const EVIDENCE_REQUIRED = Object.freeze([
  'load_test_50', 'load_test_100', 'realtime_connection_count', 'snapshot_bandwidth_bytes',
  'db_write_rate', 'timeout_path', 'dnf_path', 'reconnect_path', 'reward_idempotency',
]);

/**
 * The six launch Global Events.
 *
 * They differ in distance, cadence, host continent, heat construction and how a place is
 * earned — an event that is open to everyone and an event you qualify into are different
 * products, and both exist here.
 */
export const GLOBAL_EVENTS = Object.freeze([
  {
    id: 'gev_first_light_mile',
    host_continent_id: 'con_lumena',
    name: { ko: '첫빛 마일', en: 'First Light Mile' },
    distance_meters: 1609,
    cadence: 'weekly',
    entry_rule: 'open_to_all',
    heat_size: 25,
    check_in_window_minutes: 20,
    countdown_seconds: 120,
    summary: 'the shortest and busiest event in the world, run before dawn every week',
  },
  {
    id: 'gev_canyon_ten',
    host_continent_id: 'con_rubra',
    name: { ko: '협곡 10K', en: 'Canyon Ten' },
    distance_meters: 10_000,
    cadence: 'weekly',
    entry_rule: 'open_to_all',
    heat_size: 25,
    check_in_window_minutes: 30,
    countdown_seconds: 180,
    summary: 'a flat fast ten kilometres with the whole field released together',
  },
  {
    id: 'gev_ridge_half',
    host_continent_id: 'con_nival',
    name: { ko: '능선 하프', en: 'Ridge Half' },
    distance_meters: 21_097,
    cadence: 'fortnightly',
    entry_rule: 'open_to_all',
    heat_size: 20,
    check_in_window_minutes: 30,
    countdown_seconds: 180,
    summary: 'a half marathon seeded into heats by recent verified pace, not by rank',
  },
  {
    id: 'gev_archipelago_relay',
    host_continent_id: 'con_kael',
    name: { ko: '군도 릴레이', en: 'Archipelago Relay' },
    distance_meters: 12_000,
    cadence: 'monthly',
    entry_rule: 'crew_entry',
    heat_size: 20,
    check_in_window_minutes: 45,
    countdown_seconds: 240,
    summary: 'entered as a crew; every member runs their own distance and the crew total ranks',
  },
  {
    id: 'gev_worldline_marathon',
    host_continent_id: 'con_origin',
    name: { ko: '세계선 마라톤', en: 'Worldline Marathon' },
    distance_meters: 42_195,
    cadence: 'monthly',
    entry_rule: 'qualified',
    heat_size: 20,
    check_in_window_minutes: 60,
    countdown_seconds: 300,
    summary: 'the full distance, entered by a verified qualifying run inside the last 90 days',
  },
  {
    id: 'gev_crown_convergence',
    host_continent_id: 'con_tempora',
    name: { ko: '크라운 수렴', en: 'Crown Convergence' },
    distance_meters: 5_000,
    cadence: 'monthly',
    entry_rule: 'open_to_all',
    heat_size: 25,
    check_in_window_minutes: 20,
    countdown_seconds: 120,
    summary: 'run on the last day of the month, at the moment the monthly journey closes',
  },
]);

/**
 * Capacity is not authored per event: it comes from the owner floor, once. An event that
 * quietly ran at 24 because someone typed a smaller number is exactly the shrink the
 * canonical constants exist to prevent.
 */
export const CAPACITY = Object.freeze({
  min_participants: SCALE_FLOOR.GLOBAL_EVENT_MIN_PARTICIPANTS,
  max_participants: SCALE_FLOOR.GLOBAL_EVENT_MAX_PARTICIPANTS,
});
