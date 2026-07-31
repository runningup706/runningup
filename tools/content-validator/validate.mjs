#!/usr/bin/env node
/**
 * Launch content validator — a release BLOCKER, not a warning.
 *
 * Master # 22.2 / # 17.3: a content item only counts toward the launch floor when it has a
 * stable ID, localization in every shipped locale, a valid asset address, a reachable route,
 * backend/reward wiring, and is neither disabled nor debug-only. On top of that, this
 * validator hunts for the failure mode the direction lock names explicitly: reaching the
 * numbers by cloning something and changing its name or colour.
 *
 * Exit code 0 = every gate passed. Non-zero = do not ship.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { LAUNCH_CONTENT_FLOOR, DIRECTION_LOCK } from '../../packages/domain/constants.mjs';
// The race engine's course table is the other half of the continent identity contract.
import { CONTINENT_COURSES } from '../../packages/domain/race.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const LAUNCH = join(ROOT, 'content', 'launch');
const LOCALES = ['ko', 'en'];

const failures = [];
const notes = [];
const fail = (gate, message) => failures.push({ gate, message });
const note = (message) => notes.push(message);

const read = (rel) => JSON.parse(readFileSync(join(LAUNCH, rel), 'utf8'));
const items = (rel) => read(rel).items;

// ---------------------------------------------------------------------------
const localization = Object.fromEntries(LOCALES.map((l) => [
  l, JSON.parse(readFileSync(join(ROOT, 'content', 'localization', l, 'content.json'), 'utf8')),
]));

const continents = items('world/continents/continents.json');
const regions = items('world/regions/regions.json');
const courses = items('world/courses/courses.json');
const mainRaces = items('world/races/main_races.json');
const challengeRaces = items('world/races/challenge_races.json');
const continentChampions = items('world/champions/continent_champions.json');
const openRaceEvents = items('world/champions/open_race_events.json');
const apexRaces = items('world/champions/apex_race.json');
const standardRivals = items('world/rivals/standard_rival_crews.json');
const eliteRivals = items('world/rivals/elite_rival_crews.json');
const raceFormats = items('world/race_formats.json');
const challengeFormats = items('world/challenge_formats.json');
const storyChapters = items('world/story_chapters.json');
const restoration = items('world/restoration/restoration_states.json');
const characters = items('characters/roster/characters.json');
const techniques = items('characters/techniques/race_techniques.json');
const gearSets = items('characters/gear/gear_sets.json');
const episodes = items('characters/episodes/character_episodes.json');
const cosmetics = items('characters/cosmetics/cosmetics.json');
const companions = items('characters/companions.json');
const quests = items('quests/quests.json');
const eventArcs = items('events/event_arcs.json');
const apexLadder = read('progression/monthly_apex_0_1000.json');
const goalLibrary = read('running/goal_library.json');
const season = read('seasons/season_01.json');

// ===========================================================================
// GATE 1 — launch floor counts
// ===========================================================================
const counts = {
  continents: continents.length,
  region_nodes: regions.length,
  courses: courses.length,
  main_races: mainRaces.length,
  challenge_races: challengeRaces.length,
  playable_characters: characters.length,
  character_episodes: episodes.length,
  race_techniques: techniques.length,
  gear_sets: gearSets.length,
  standard_rival_crews: standardRivals.length,
  elite_rival_crews: eliteRivals.length,
  continent_champions: continentChampions.length,
  open_race_events: openRaceEvents.length,
  apex_races: apexRaces.length,
  race_formats: raceFormats.length,
  challenge_formats: challengeFormats.length,
  companions: companions.length,
  equipable_cosmetics: cosmetics.length,
  story_chapters: storyChapters.length,
  launch_seasons: season ? 1 : 0,
  event_arcs: eventArcs.length,
};

for (const [key, floor] of Object.entries(LAUNCH_CONTENT_FLOOR)) {
  if ((counts[key] ?? 0) < floor) {
    fail('counts', `${key}: ${counts[key] ?? 0} < required ${floor}`);
  }
}

// GATE 1b — the counted categories and the floor must be the same set.
//
// A floor without a counter already fails loudly above (`counts[key] ?? 0` is 0). The
// silent direction is a counted category with no floor: content that ships ungated,
// which is indistinguishable from content that does not exist as far as the build is
// concerned. Compare the sets in both directions rather than trusting one.
for (const key of Object.keys(counts)) {
  if (!(key in LAUNCH_CONTENT_FLOOR)) {
    fail('counts', `${key} is counted but has no launch floor — it ships ungated`);
  }
}

// ===========================================================================
// GATE 2 — nothing disabled, debug-only or "coming soon" is counted
// ===========================================================================
for (const [label, list] of [['main_race', mainRaces], ['challenge_race', challengeRaces]]) {
  for (const s of list) {
    if (s.enabled !== true) fail('availability', `${label} ${s.id} is not enabled`);
    if (s.debug_only === true) fail('availability', `${label} ${s.id} is debug-only`);
  }
}
for (const c of continents) {
  if (c.coming_soon === true) fail('availability', `continent ${c.id} is marked coming_soon`);
  if (c.playable_at_launch !== true) fail('availability', `continent ${c.id} is not playable at launch`);
  if (c.visible_at_first_login !== true) fail('availability', `continent ${c.id} is not visible at first login`);
}
for (const ch of characters) {
  if (ch.visible_at_launch !== true) fail('availability', `character ${ch.id} is not visible at launch`);
  if (ch.trial_available !== true) fail('availability', `character ${ch.id} has no trial`);
  if (ch.paid_gacha === true) fail('availability', `character ${ch.id} is behind paid gacha`);
}
for (const e of episodes) {
  if (e.playable_at_launch !== true) fail('availability', `episode ${e.id} is not playable at launch`);
}

// ===========================================================================
// GATE 3 — stable IDs: unique, well formed, never reused across kinds
// ===========================================================================
const allIds = new Map();
const idGroups = [
  // Courses belong here even though GATE 5c checks them in detail: this is what makes
  // their ids unique against everything else and their name keys localized in every
  // locale. Leaving them out reported all 2,304 course keys as orphans.
  ['continent', continents], ['region', regions], ['course', courses], ['main_race', mainRaces],
  ['challenge_race', challengeRaces], ['continent_champion', continentChampions],
  ['open_race_event', openRaceEvents], ['apex_race', apexRaces],
  ['standard_rival_crew', standardRivals], ['elite_rival_crew', eliteRivals],
  ['story_chapter', storyChapters], ['restoration', restoration], ['character', characters],
  ['race_technique', techniques], ['gear_set', gearSets], ['episode', episodes],
  ['cosmetic', cosmetics], ['companion', companions], ['quest', quests],
  ['event_arc', eventArcs],
];
for (const [kind, list] of idGroups) {
  for (const item of list) {
    if (!item.id || !/^[a-z][a-z0-9_]*$/.test(item.id)) {
      fail('stable_id', `${kind}: malformed id "${item.id}"`);
      continue;
    }
    if (allIds.has(item.id)) {
      fail('stable_id', `duplicate id "${item.id}" used by ${allIds.get(item.id)} and ${kind}`);
    }
    allIds.set(item.id, kind);
  }
}
for (const cp of apexLadder.checkpoints) {
  if (allIds.has(cp.checkpoint_id)) fail('stable_id', `duplicate checkpoint id ${cp.checkpoint_id}`);
  allIds.set(cp.checkpoint_id, 'apex_checkpoint');
}

// ===========================================================================
// GATE 4 — localization coverage in every shipped locale
// ===========================================================================
function checkLocKeys(kind, list) {
  for (const item of list) {
    for (const [field, value] of Object.entries(item)) {
      if (!field.endsWith('_key') || typeof value !== 'string') continue;
      for (const locale of LOCALES) {
        const text = localization[locale][value];
        if (text === undefined) {
          fail('localization', `${kind} ${item.id ?? item.checkpoint_id}: key "${value}" missing in ${locale}`);
        } else if (typeof text !== 'string' || text.trim() === '') {
          fail('localization', `${kind} ${item.id}: key "${value}" is empty in ${locale}`);
        }
      }
    }
  }
}
for (const [kind, list] of idGroups) checkLocKeys(kind, list);
checkLocKeys('apex_checkpoint', apexLadder.checkpoints);
checkLocKeys('apex_rank', apexLadder.major_ranks);
checkLocKeys('goal_distance', goalLibrary.distances);
checkLocKeys('goal_duration', goalLibrary.durations);
checkLocKeys('goal_style', goalLibrary.styles);

// Every localization key must actually be used: an orphan key is a content-drift signal.
const usedKeys = new Set();
for (const [, list] of idGroups) {
  for (const item of list) {
    for (const [field, value] of Object.entries(item)) {
      if (field.endsWith('_key') && typeof value === 'string') usedKeys.add(value);
    }
  }
}
for (const list of [apexLadder.checkpoints, apexLadder.major_ranks, goalLibrary.distances, goalLibrary.durations, goalLibrary.styles, [season]]) {
  for (const item of list) {
    for (const [field, value] of Object.entries(item)) {
      if (field.endsWith('_key') && typeof value === 'string') usedKeys.add(value);
    }
  }
}
const orphans = Object.keys(localization.ko).filter((k) => !usedKeys.has(k));
if (orphans.length > 0) {
  note(`${orphans.length} localization keys are not referenced by any content record (e.g. ${orphans.slice(0, 3).join(', ')})`);
}

// ===========================================================================
// GATE 5 — asset addresses and referential integrity
// ===========================================================================
const continentIds = new Set(continents.map((c) => c.id));
const regionIds = new Set(regions.map((r) => r.id));
const characterIds = new Set(characters.map((c) => c.id));

function requireAddress(kind, item, field) {
  const value = item[field];
  if (typeof value !== 'string' || value.trim() === '') {
    fail('asset_reference', `${kind} ${item.id}: missing ${field}`);
  }
}
continents.forEach((c) => { requireAddress('continent', c, 'hub_scene_address'); requireAddress('continent', c, 'vista_scene_address'); });
regions.forEach((r) => {
  requireAddress('region', r, 'scene_address');
  if (!continentIds.has(r.continent_id)) fail('reference', `region ${r.id}: unknown continent ${r.continent_id}`);
});
const RACE_FORMAT_IDS = new Set(raceFormats.map((f) => f.id));
const CHALLENGE_FORMAT_IDS = new Set(challengeFormats.map((f) => f.id));
[...mainRaces, ...challengeRaces].forEach((s) => {
  requireAddress('race', s, 'scene_address');
  if (!continentIds.has(s.continent_id)) fail('reference', `race ${s.id}: unknown continent ${s.continent_id}`);
  if (!regionIds.has(s.region_id)) fail('reference', `race ${s.id}: unknown region ${s.region_id}`);
  if (!s.reward_table_id) fail('reward_wiring', `race ${s.id}: no reward table`);
  if (!RACE_FORMAT_IDS.has(s.format)) fail('race_format', `race ${s.id}: unknown format ${s.format}`);
  if (s.challenge_format_id !== undefined && !CHALLENGE_FORMAT_IDS.has(s.challenge_format_id)) {
    fail('race_format', `race ${s.id}: unknown challenge format ${s.challenge_format_id}`);
  }
  // A race is a race: eight runners on a start line, and nothing on the record that
  // implies anyone can be removed from it.
  if (s.field_size !== 8) fail('race_field', `race ${s.id}: field size ${s.field_size}, expected 8`);
});
characters.forEach((c) => {
  requireAddress('character', c, 'prefab_address');
  requireAddress('character', c, 'portrait_address');
  requireAddress('character', c, 'trial_stage_address');
  if (c.technique_ids.length !== 4) fail('character_kit', `character ${c.id}: expected 4 techniques, got ${c.technique_ids.length}`);
  if (c.episode_ids.length !== 3) fail('character_kit', `character ${c.id}: expected 3 episodes`);
});
techniques.forEach((s) => { if (!characterIds.has(s.character_id)) fail('reference', `technique ${s.id}: unknown character`); });
episodes.forEach((e) => { if (!characterIds.has(e.character_id)) fail('reference', `episode ${e.id}: unknown character`); });
cosmetics.forEach((c) => { if (!characterIds.has(c.character_id)) fail('reference', `cosmetic ${c.id}: unknown character`); });
continentChampions.forEach((b) => { if (!continentIds.has(b.continent_id)) fail('reference', `champion ${b.id}: unknown continent`); });

/**
 * GATE 5b — coverage: every parent must actually own its children.
 *
 * GATE 5 checks child -> parent (a region's continent exists). That direction alone is
 * blind to the failure that matters: twelve continent bosses could all belong to Lumena
 * and eleven continents have none. The count gate passes, every reference resolves, and
 * eleven twelfths of the world is empty.
 *
 * This is the same one-way blindness that let the race engine key its course table on
 * five continent ids that do not exist while five real continents silently shared
 * Lumena's course. Counting a set is not the same as checking which set it is.
 */
function requireCoverage(label, parentIds, children, parentKey, expectedPerParent) {
  const byParent = new Map([...parentIds].map((id) => [id, 0]));
  for (const child of children) {
    const parent = child[parentKey];
    if (!byParent.has(parent)) continue; // GATE 5 already reports unknown parents
    byParent.set(parent, byParent.get(parent) + 1);
  }
  for (const [parent, actual] of byParent) {
    if (actual !== expectedPerParent) {
      fail('coverage', `${label}: ${parent} owns ${actual}, expected ${expectedPerParent}`);
    }
  }
}

const regionsPerContinent = regions.length / continents.length;
const coursesPerRegion = courses.length / regions.length;
const mainRacesPerContinent = mainRaces.length / continents.length;
const challengeRacesPerContinent = challengeRaces.length / continents.length;
const cosmeticsPerCharacter = cosmetics.length / characters.length;

for (const [label, count] of [
  ['regions per continent', regionsPerContinent],
  ['courses per region', coursesPerRegion],
  ['main races per continent', mainRacesPerContinent],
  ['challenge races per continent', challengeRacesPerContinent],
  ['cosmetics per character', cosmeticsPerCharacter],
]) {
  if (!Number.isInteger(count)) {
    fail('coverage', `${label} is ${count}: the content does not divide evenly, so some parent is short`);
  }
}

requireCoverage('regions per continent', continentIds, regions, 'continent_id', regionsPerContinent);
requireCoverage('courses per region', regionIds, courses, 'region_id', coursesPerRegion);
requireCoverage('main races per continent', continentIds, mainRaces, 'continent_id', mainRacesPerContinent);
requireCoverage('challenge races per continent', continentIds, challengeRaces, 'continent_id', challengeRacesPerContinent);
requireCoverage('continent champions', continentIds, continentChampions, 'continent_id', 1);
requireCoverage('standard rival crews', continentIds, standardRivals, 'continent_id', standardRivals.length / continents.length);
requireCoverage('elite rival crews', continentIds, eliteRivals, 'continent_id', eliteRivals.length / continents.length);
requireCoverage('gear sets per continent', continentIds, gearSets, 'continent_id', gearSets.length / continents.length);
requireCoverage('companions per continent', continentIds, companions, 'continent_id', companions.length / continents.length);
requireCoverage('techniques per character', characterIds, techniques, 'character_id', 4);
requireCoverage('episodes per character', characterIds, episodes, 'character_id', 3);
requireCoverage('cosmetics per character', characterIds, cosmetics, 'character_id', cosmeticsPerCharacter);

/**
 * GATE 5c — DL-3 at the course level.
 *
 * Running only, and elevation is never a course property. A course that carried an
 * elevation or gradient field would make climbing a thing the world rewards, which is the
 * exact line DL-3 draws. Asserted over the data rather than trusted to the generator.
 */
const ALLOWED_SURFACES = new Set(['road', 'track', 'treadmill', 'indoor']);
const ALLOWED_SHAPES = new Set(['loop', 'out_and_back', 'point_to_point']);
for (const course of courses) {
  if (!ALLOWED_SURFACES.has(course.surface)) {
    fail('direction_lock', `course ${course.id}: surface ${course.surface} is not a running surface`);
  }
  if (!ALLOWED_SHAPES.has(course.shape)) {
    fail('course_shape', `course ${course.id}: unknown shape ${course.shape}`);
  }
  if (!Number.isInteger(course.distance_meters) || course.distance_meters <= 0) {
    fail('course_distance', `course ${course.id}: distance must be a positive integer of metres`);
  }
  for (const forbidden of ['elevation', 'elevation_gain', 'gradient', 'altitude', 'incline']) {
    if (forbidden in course) {
      fail('direction_lock', `course ${course.id}: ${forbidden} may never be a course property (DL-3)`);
    }
  }
  if (!regionIds.has(course.region_id)) fail('reference', `course ${course.id}: unknown region`);
  if (!continentIds.has(course.continent_id)) fail('reference', `course ${course.id}: unknown continent`);
  requireAddress('course', course, 'scene_address');
  if (!course.reward_table_id) fail('reward_wiring', `course ${course.id}: no reward table`);
  if (course.enabled !== true) fail('availability', `course ${course.id} is not enabled`);
  if (course.debug_only === true) fail('availability', `course ${course.id} is debug-only`);
}

// A world where every region offers the same four distances is one region 192 times.
{
  const signatures = new Set(
    regions.map((r) => courses
      .filter((c) => c.region_id === r.id)
      .map((c) => c.distance_meters)
      .sort((a, b) => a - b)
      .join('/')),
  );
  if (signatures.size < 8) {
    fail('course_variety', `only ${signatures.size} distinct distance sets across 192 regions`);
  }
}

// ===========================================================================
// GATE 6 — route reachability: every region node must be reachable at launch
// ===========================================================================
for (const continent of continents) {
  const own = regions.filter((r) => r.continent_id === continent.id);
  const reachable = new Set();
  const queue = own.filter((r) => r.reachable_from.includes('continent_entry')).map((r) => r.id);
  if (queue.length === 0) fail('reachability', `continent ${continent.id}: no entry region`);
  while (queue.length > 0) {
    const current = queue.shift();
    if (reachable.has(current)) continue;
    reachable.add(current);
    for (const r of own) {
      if (r.reachable_from.includes(current) && !reachable.has(r.id)) queue.push(r.id);
    }
  }
  for (const r of own) {
    if (!reachable.has(r.id)) fail('reachability', `region ${r.id} is unreachable`);
  }
  if (!own.some((r) => r.id === continent.entry_region_id)) {
    fail('reachability', `continent ${continent.id}: entry_region_id does not exist`);
  }
  // DL-4: continents must not hard-gate one another.
  if ((continent.requires_continent_ids ?? []).length > 0) {
    fail('non_linear', `continent ${continent.id} requires another continent first`);
  }
}
for (const race of [...mainRaces, ...challengeRaces]) {
  const region = regions.find((r) => r.id === race.region_id);
  if (region && region.continent_id !== race.continent_id) {
    fail('reachability', `race ${race.id}: region belongs to a different continent`);
  }
}

// ===========================================================================
// GATE 7 — semantic duplicate detection (the anti-reskin gate)
// ===========================================================================
function tokens(...parts) {
  return new Set(
    parts.filter(Boolean).join(' ').toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  );
}
const STOPWORDS = new Set(['the', 'and', 'that', 'with', 'for', 'its', 'into', 'only', 'each', 'from', 'must', 'while', 'every', 'one', 'two', 'their', 'them', 'this', 'than', 'but', 'not', 'you', 'your', 'are', 'was', 'has', 'have', 'stage', 'continent']);

function jaccard(a, b) {
  if (a.size === 0 && b.size === 0) return 1;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared += 1;
  return shared / (a.size + b.size - shared);
}

function duplicateScan(kind, records, signatureFn, threshold) {
  const sigs = records.map((r) => ({ id: r.id, tokens: signatureFn(r), raw: signatureFn(r) }));
  const exact = new Map();
  for (const s of sigs) {
    const key = [...s.tokens].sort().join('|');
    if (exact.has(key)) {
      fail('semantic_duplicate', `${kind}: ${s.id} has an identical signature to ${exact.get(key)}`);
    } else {
      exact.set(key, s.id);
    }
  }
  let worst = { score: 0, a: null, b: null };
  for (let i = 0; i < sigs.length; i += 1) {
    for (let j = i + 1; j < sigs.length; j += 1) {
      const score = jaccard(sigs[i].tokens, sigs[j].tokens);
      if (score > worst.score) worst = { score, a: sigs[i].id, b: sigs[j].id };
      if (score >= threshold) {
        fail('semantic_duplicate',
          `${kind}: ${sigs[i].id} and ${sigs[j].id} are ${(score * 100).toFixed(0)}% similar (threshold ${threshold * 100}%)`);
      }
    }
  }
  note(`${kind}: most similar pair ${worst.a} / ${worst.b} at ${(worst.score * 100).toFixed(1)}% (threshold ${(threshold * 100).toFixed(0)}%)`);
}

duplicateScan('continent', continents,
  (c) => tokens(c.trait_id, c.trait_rule, c.skyline, c.music_motif, c.palette.join(' ')), 0.45);

duplicateScan('continent_champion', continentChampions,
  (b) => tokens(b.race_plan.join(' '), b.plan_rule, b.trait_id), 0.45);

duplicateScan('main_race', mainRaces,
  (s) => tokens(s.format, s.race_condition, s.trait_id), 0.55);

duplicateScan('character', characters,
  (c) => tokens(c.role, c.secondary_role, c.core_conversion, c.silhouette, c.race_kit,
    c.race_signature, c.specializations.join(' ')), 0.45);

duplicateScan('race_technique', techniques, (s) => tokens(s.effect, s.kind), 0.65);
duplicateScan('standard_rival_crew', standardRivals, (e) => tokens(e.tactic, e.trait_id), 0.6);
duplicateScan('elite_rival_crew', eliteRivals, (e) => tokens(e.tactic, e.trait_id), 0.55);
// Gear sets are compared structurally: which axis moves, in which direction, under which
// condition. The trade is one ATOMIC token rather than a bag of words, because word-level
// similarity would flag `stride` (kick -> cruise) and `closer` (cruise -> kick) as
// near-duplicates over the shared words "kick" and "cruise", when they are in fact exact
// inverses of one another.
duplicateScan('gear_set', gearSets, (r) => new Set([
  `trade:${r.trade_from}->${r.trade_to}`,
  `when:${r.activation_condition}`,
  `trait:${r.trait_affinity}`,
]), 0.7);

// A continent must not repeat the same race format twice in its main line.
for (const continent of continents) {
  const own = mainRaces.filter((s) => s.continent_id === continent.id);
  const seen = new Set();
  for (const s of own) {
    if (seen.has(s.format)) {
      fail('format_variety', `continent ${continent.id}: format "${s.format}" repeats in the main line`);
    }
    seen.add(s.format);
  }
}
// Each continent needs a unique course-trait identity, and that identity has to be the
// one the race engine actually resolves races with — a continent whose trait exists only
// in content prose races exactly like Lumena.
const traitIds = continents.map((c) => c.trait_id);
if (new Set(traitIds).size !== traitIds.length) {
  fail('semantic_duplicate', 'two continents share the same course trait id');
}
{
  const engineContinents = new Set(Object.keys(CONTINENT_COURSES));
  for (const c of continents) {
    if (!engineContinents.has(c.id)) {
      fail('engine_parity', `continent ${c.id} has no entry in the race engine's course table`);
    }
  }
  for (const id of engineContinents) {
    if (!continentIds.has(id)) {
      fail('engine_parity', `the race engine has a course for ${id}, which is not a continent`);
    }
  }
}
// Gear trades have to name axes the race engine can actually move.
{
  const AXES = new Set(['cruise', 'stamina', 'kick']);
  for (const g of gearSets) {
    if (!AXES.has(g.trade_from) || !AXES.has(g.trade_to)) {
      fail('sidegrade', `gear set ${g.id}: ${g.trade_from} -> ${g.trade_to} is not a race axis`);
    }
    if (g.trade_from === g.trade_to) {
      fail('sidegrade', `gear set ${g.id}: trades an axis into itself, which moves nothing`);
    }
  }
}
// The roster must genuinely span roles.
const roleCount = new Set(characters.flatMap((c) => [c.role, c.secondary_role])).size;
if (roleCount < 8) fail('role_diversity', `roster covers only ${roleCount} roles, minimum 8`);
// And must not be visually or demographically monotone.
const presentations = new Set(characters.map((c) => `${c.presentation.body}|${c.presentation.gender}|${c.presentation.skin}|${c.presentation.age}`));
if (presentations.size < characters.length) fail('presentation_diversity', 'two characters share an identical presentation profile');

// ===========================================================================
// GATE 8 — fair cosmetic economy: power exactly zero, no hidden stat fields
// ===========================================================================
const POWER_FIELDS = ['core_power', 'xp_multiplier', 'ranking_multiplier', 'verification_bonus', 'hidden_stat', 'extra_core_reward_multiplier'];
const STAT_LIKE = /(attack|defen[cs]e|power|stat|multiplier|bonus|damage|health|hp|speed|rating)/i;
for (const c of cosmetics) {
  for (const field of POWER_FIELDS) {
    if (c[field] !== 0) fail('cosmetic_power', `cosmetic ${c.id}: ${field} must be exactly 0, got ${c[field]}`);
  }
  for (const [field, value] of Object.entries(c)) {
    if (POWER_FIELDS.includes(field)) continue;
    if (STAT_LIKE.test(field) && value !== 0 && value !== false) {
      fail('cosmetic_power', `cosmetic ${c.id}: unexpected stat-like field "${field}"`);
    }
  }
  if (c.purchasable_with_real_money !== false) {
    fail('cosmetic_power', `cosmetic ${c.id}: P0 ships with no real-money purchase`);
  }
}
for (const r of gearSets) {
  if (r.budget_delta !== 0) fail('sidegrade', `gear set ${r.id}: budget_delta must be 0 (sidegrade only)`);
}
for (const s of techniques) {
  if (s.core_budget_delta !== 0) fail('sidegrade', `technique ${s.id}: core_budget_delta must be 0`);
}
for (const c of companions) {
  if (c.grants_core_power !== false) fail('sidegrade', `companion ${c.id}: must not grant core power`);
}

// ===========================================================================
// GATE 9 — direction lock DL-1 in content data
// ===========================================================================
if (apexLadder.checkpoint_count !== DIRECTION_LOCK.CHECKPOINT_COUNT) {
  fail('direction_lock', `apex ladder has ${apexLadder.checkpoint_count} checkpoints, expected ${DIRECTION_LOCK.CHECKPOINT_COUNT}`);
}
if (apexLadder.final_checkpoint_meters !== DIRECTION_LOCK.FINAL_APEX_METERS) {
  fail('direction_lock', 'final checkpoint is not exactly 1000 km');
}
if ((apexLadder.tiers_above_final ?? []).length > 0) {
  fail('direction_lock', 'a tier above the final checkpoint exists');
}
for (const cp of apexLadder.checkpoints) {
  if (cp.threshold_meters > DIRECTION_LOCK.FINAL_APEX_METERS) {
    fail('direction_lock', `checkpoint ${cp.checkpoint_id} exceeds 1000 km`);
  }
  if (!cp.reward_bundle_kinds || cp.reward_bundle_kinds.length === 0) {
    fail('direction_lock', `checkpoint ${cp.checkpoint_id} has no reward bundle: a bare number popup is not a checkpoint`);
  }
}
const crown = apexLadder.major_ranks.find((r) => r.id === 'world_crown');
if (!crown || !crown.is_final) fail('direction_lock', 'world_crown is not marked as the final rank');
if (apexLadder.major_ranks.some((r) => r.order > crown.order)) {
  fail('direction_lock', 'a rank is ordered above World Crown');
}
if (apexRaces[0].has_content_above !== false) {
  fail('direction_lock', 'the Apex race claims content above it');
}
if (apexRaces.length !== 1) fail('direction_lock', 'there must be exactly one Apex 1000 race');
if (apexRaces[0].unlock_monthly_meters !== DIRECTION_LOCK.FINAL_APEX_METERS) {
  fail('direction_lock', 'the Apex race does not unlock at exactly 1000 km');
}

// DL-2 in content: the goal library is open to everyone with no prerequisites.
if (goalLibrary.available_to_all_users_on_first_session !== true) {
  fail('direction_lock', 'the goal library is not open to all users on the first session');
}
if ((goalLibrary.prerequisites ?? []).length > 0) {
  fail('direction_lock', 'the goal library declares prerequisites');
}
for (const required of ['d_400m', 'd_1km', 'd_5km', 'd_10km', 'd_20km', 'd_half', 'd_marathon', 'd_50km', 'd_custom']) {
  if (!goalLibrary.distances.some((d) => d.id === required)) {
    fail('direction_lock', `goal library is missing required distance ${required}`);
  }
}
// DL-3 in content: only running activity types exist.
for (const t of goalLibrary.allowed_activity_types) {
  if (!['road', 'track', 'treadmill', 'indoor'].includes(t)) {
    fail('direction_lock', `goal library allows non-running activity type "${t}"`);
  }
}

// ===========================================================================
// Report
// ===========================================================================
const width = 30;
console.log('RunningUp launch content validation\n');
console.log('counts:');
for (const [key, floor] of Object.entries(LAUNCH_CONTENT_FLOOR)) {
  const actual = counts[key] ?? 0;
  console.log(`  ${key.padEnd(width)} ${String(actual).padStart(4)} / ${String(floor).padEnd(4)} ${actual >= floor ? 'OK' : 'FAIL'}`);
}
console.log('\nnotes:');
for (const n of notes) console.log(`  - ${n}`);

if (failures.length > 0) {
  console.log(`\n${failures.length} FAILURE(S):`);
  for (const f of failures) console.log(`  [${f.gate}] ${f.message}`);
  process.exit(1);
}
console.log('\nAll content gates passed.');
