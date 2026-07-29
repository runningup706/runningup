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

import { LAUNCH_CONTENT_FLOOR, DIRECTION_LOCK } from '../lib/constants.mjs';

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
const mainStages = items('world/stages/main_stages.json');
const sideStages = items('world/stages/side_stages.json');
const continentBosses = items('world/bosses/continent_bosses.json');
const worldBosses = items('world/bosses/world_bosses.json');
const apexBosses = items('world/bosses/apex_boss.json');
const standardEnemies = items('world/enemies/standard_enemy_families.json');
const eliteEnemies = items('world/enemies/elite_enemy_families.json');
const storyChapters = items('world/story_chapters.json');
const restoration = items('world/restoration/restoration_states.json');
const characters = items('characters/roster/characters.json');
const skills = items('characters/skills/tactical_skills.json');
const relics = items('characters/skills/tactical_relics.json');
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
  main_stages: mainStages.length,
  side_stages: sideStages.length,
  playable_characters: characters.length,
  character_episodes: episodes.length,
  tactical_skills: skills.length,
  tactical_relics: relics.length,
  standard_enemy_families: standardEnemies.length,
  elite_enemy_families: eliteEnemies.length,
  continent_bosses: continentBosses.length,
  world_bosses: worldBosses.length,
  apex_bosses: apexBosses.length,
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

// ===========================================================================
// GATE 2 — nothing disabled, debug-only or "coming soon" is counted
// ===========================================================================
for (const [label, list] of [['main_stage', mainStages], ['side_stage', sideStages]]) {
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
  ['continent', continents], ['region', regions], ['main_stage', mainStages],
  ['side_stage', sideStages], ['continent_boss', continentBosses], ['world_boss', worldBosses],
  ['apex_boss', apexBosses], ['standard_enemy', standardEnemies], ['elite_enemy', eliteEnemies],
  ['story_chapter', storyChapters], ['restoration', restoration], ['character', characters],
  ['skill', skills], ['relic', relics], ['episode', episodes], ['cosmetic', cosmetics],
  ['companion', companions], ['quest', quests], ['event_arc', eventArcs],
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
[...mainStages, ...sideStages].forEach((s) => {
  requireAddress('stage', s, 'scene_address');
  if (!continentIds.has(s.continent_id)) fail('reference', `stage ${s.id}: unknown continent ${s.continent_id}`);
  if (!regionIds.has(s.region_id)) fail('reference', `stage ${s.id}: unknown region ${s.region_id}`);
  if (!s.reward_table_id) fail('reward_wiring', `stage ${s.id}: no reward table`);
});
characters.forEach((c) => {
  requireAddress('character', c, 'prefab_address');
  requireAddress('character', c, 'portrait_address');
  requireAddress('character', c, 'trial_stage_address');
  if (c.skill_ids.length !== 4) fail('character_kit', `character ${c.id}: expected 4 skills, got ${c.skill_ids.length}`);
  if (c.episode_ids.length !== 3) fail('character_kit', `character ${c.id}: expected 3 episodes`);
});
skills.forEach((s) => { if (!characterIds.has(s.character_id)) fail('reference', `skill ${s.id}: unknown character`); });
episodes.forEach((e) => { if (!characterIds.has(e.character_id)) fail('reference', `episode ${e.id}: unknown character`); });
cosmetics.forEach((c) => { if (!characterIds.has(c.character_id)) fail('reference', `cosmetic ${c.id}: unknown character`); });
continentBosses.forEach((b) => { if (!continentIds.has(b.continent_id)) fail('reference', `boss ${b.id}: unknown continent`); });

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
for (const stage of [...mainStages, ...sideStages]) {
  const region = regions.find((r) => r.id === stage.region_id);
  if (region && region.continent_id !== stage.continent_id) {
    fail('reachability', `stage ${stage.id}: region belongs to a different continent`);
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
  (c) => tokens(c.mechanic_id, c.mechanic_rule, c.skyline, c.music_motif, c.palette.join(' ')), 0.45);

duplicateScan('continent_boss', continentBosses,
  (b) => tokens(b.phases.join(' '), b.phase_rule, b.mechanic_id), 0.45);

duplicateScan('main_stage', mainStages,
  (s) => tokens(s.objective, s.objective_twist, s.mechanic_id), 0.55);

duplicateScan('character', characters,
  (c) => tokens(c.role, c.secondary_role, c.core_conversion, c.silhouette, c.weapon, c.basic_attack,
    c.specializations.join(' ')), 0.45);

duplicateScan('skill', skills, (s) => tokens(s.effect, s.kind), 0.65);
duplicateScan('standard_enemy', standardEnemies, (e) => tokens(e.behaviour, e.mechanic_id), 0.6);
duplicateScan('elite_enemy', eliteEnemies, (e) => tokens(e.behaviour, e.mechanic_id), 0.55);
// Relics are compared structurally: which budget moves, in which direction, under which
// condition. The trade is one ATOMIC token rather than a bag of words, because word-level
// similarity would flag `ward` (attack_budget -> guard_uptime) and `edge`
// (guard_budget -> break_damage) as near-duplicates over the incidental shared word
// "guard", when they are in fact inverse sidegrades.
duplicateScan('relic', relics, (r) => new Set([
  `trade:${r.trade_from}->${r.trade_to}`,
  `when:${r.activation_condition}`,
  `mech:${r.mechanic_affinity}`,
]), 0.7);

// A continent must not repeat the same objective archetype twice in its main line.
for (const continent of continents) {
  const own = mainStages.filter((s) => s.continent_id === continent.id);
  const seen = new Set();
  for (const s of own) {
    if (seen.has(s.objective)) {
      fail('objective_variety', `continent ${continent.id}: objective "${s.objective}" repeats in the main line`);
    }
    seen.add(s.objective);
  }
}
// Each continent needs a unique combat mechanic identity.
const mechanicIds = continents.map((c) => c.mechanic_id);
if (new Set(mechanicIds).size !== mechanicIds.length) {
  fail('semantic_duplicate', 'two continents share the same combat mechanic id');
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
for (const r of relics) {
  if (r.budget_delta !== 0) fail('sidegrade', `relic ${r.id}: budget_delta must be 0 (sidegrade only)`);
}
for (const s of skills) {
  if (s.core_budget_delta !== 0) fail('sidegrade', `skill ${s.id}: core_budget_delta must be 0`);
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
if (apexBosses[0].has_content_above !== false) {
  fail('direction_lock', 'the Apex boss claims content above it');
}
if (apexBosses.length !== 1) fail('direction_lock', 'there must be exactly one Apex 1000 boss');

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
