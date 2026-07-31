#!/usr/bin/env node
/**
 * Emits backend/supabase/seed.sql from the canonical content JSON.
 *
 * The content pipeline has exactly one source of truth: the authored design tables ->
 * content JSON -> this seed. Hand-editing seed.sql would create the "parallel source of
 * truth" the master forbids, so the file is generated and checked in, and CI regenerates
 * it to confirm it still matches.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { GOAL_DISTANCES, GOAL_DURATIONS, APEX_LADDER_VERSION } from '../../packages/domain/constants.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const LAUNCH = join(ROOT, 'content', 'launch');
const read = (rel) => JSON.parse(readFileSync(join(LAUNCH, rel), 'utf8'));
const items = (rel) => read(rel).items;

const q = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const n = (v) => (v === null || v === undefined ? 'null' : String(v));
const b = (v) => (v ? 'true' : 'false');
const arr = (a) => `array[${a.map((x) => q(x)).join(', ')}]`;

const continents = items('world/continents/continents.json');
const regions = items('world/regions/regions.json');
const courses = items('world/courses/courses.json');
const mainRaces = items('world/races/main_races.json');
const challengeRaces = items('world/races/challenge_races.json');
const raceFormats = items('world/race_formats.json');
const challengeFormats = items('world/challenge_formats.json');
const continentChampions = items('world/champions/continent_champions.json');
const openRaceEvents = items('world/champions/open_race_events.json');
const apexRace = items('world/champions/apex_race.json')[0];
const chapters = items('world/story_chapters.json');
const standardRivals = items('world/rivals/standard_rival_crews.json');
const eliteRivals = items('world/rivals/elite_rival_crews.json');
const characters = items('characters/roster/characters.json');
const techniques = items('characters/techniques/race_techniques.json');
const gearSets = items('characters/gear/gear_sets.json');
const episodes = items('characters/episodes/character_episodes.json');
const cosmetics = items('characters/cosmetics/cosmetics.json');
const companions = items('characters/companions.json');
const ladder = read('progression/monthly_apex_0_1000.json');
const manifest = read('launch_content_manifest.json');

const out = [];
const w = (line = '') => out.push(line);

w('-- =============================================================================');
w('-- RunningUp seed — GENERATED FILE, do not edit by hand.');
w('-- Source: content/launch/**  Generator: tools/content-factory/emit-seed.mjs');
w(`-- Content version: ${manifest.content_version}  Content SHA-256: ${manifest.content_sha256}`);
w('--');
w('-- Idempotent: every insert uses ON CONFLICT DO NOTHING so the seed may be re-applied');
w('-- to an existing database without duplicating launch content.');
w('-- =============================================================================');
w('');
w('begin;');
w('');

w('-- Content version registry -----------------------------------------------------');
w(`insert into api.content_versions (content_version, schema_version, content_sha256) values (${q(manifest.content_version)}, ${q(manifest.schema_version)}, ${q(manifest.content_sha256)}) on conflict (content_version) do nothing;`);
w('');

w('-- Monthly Apex ladder ----------------------------------------------------------');
w(`insert into api.monthly_apex_definitions (ladder_version, final_checkpoint_meters, checkpoint_count, content_version) values (${q(APEX_LADDER_VERSION)}, 1000000, ${ladder.checkpoint_count}, ${q(manifest.content_version)}) on conflict (ladder_version) do nothing;`);
w('');
for (const cp of ladder.checkpoints) {
  w(`insert into api.monthly_apex_checkpoints (checkpoint_id, ladder_version, index, threshold_meters, major_rank, reward_bundle_id, story_or_world_effect, name_key, is_final, content_version) values (${q(cp.checkpoint_id)}, ${q(APEX_LADDER_VERSION)}, ${cp.index}, ${cp.threshold_meters}, ${q(cp.major_rank)}, ${q(cp.reward_bundle_id)}, ${q(cp.story_or_world_effect)}, ${q(cp.name_key)}, ${b(cp.is_final)}, ${q(manifest.content_version)}) on conflict (checkpoint_id) do nothing;`);
}
w('');
w(`select private.assert_apex_ladder_valid(${q(APEX_LADDER_VERSION)});`);
w('');

w('-- Goal library -----------------------------------------------------------------');
for (const d of GOAL_DISTANCES) {
  w(`insert into api.run_goal_definitions (goal_id, goal_type, target_meters, name_key, sort_order, is_custom) values (${q(d.id)}, 'distance', ${n(d.meters)}, ${q(`goal.distance.${d.id}`)}, ${GOAL_DISTANCES.indexOf(d)}, ${b(d.meters === null)}) on conflict (goal_id) do nothing;`);
}
for (const d of GOAL_DURATIONS) {
  w(`insert into api.run_goal_definitions (goal_id, goal_type, target_seconds, name_key, sort_order, is_custom) values (${q(d.id)}, 'duration', ${n(d.seconds)}, ${q(`goal.duration.${d.id}`)}, ${100 + GOAL_DURATIONS.indexOf(d)}, ${b(d.seconds === null)}) on conflict (goal_id) do nothing;`);
}
w('');

w('-- World: continents, regions, courses ------------------------------------------');
for (const c of continents) {
  w(`insert into api.world_continents (id, display_order, name_key, trait_id, visible_at_first_login, playable_at_launch, content_pack_id, entry_region_id, content_version) values (${q(c.id)}, ${c.order}, ${q(c.name_key)}, ${q(c.trait_id)}, ${b(c.visible_at_first_login)}, ${b(c.playable_at_launch)}, ${q(c.content_pack_id)}, ${q(c.entry_region_id)}, ${q(manifest.content_version)}) on conflict (id) do nothing;`);
}
w('');
for (const r of regions) {
  w(`insert into api.world_regions (id, continent_id, display_order, name_key, node_type, scene_address, bypass_allowed) values (${q(r.id)}, ${q(r.continent_id)}, ${r.order}, ${q(r.name_key)}, ${q(r.node_type)}, ${q(r.scene_address)}, ${b(r.bypass_allowed)}) on conflict (id) do nothing;`);
}
w('');
for (const cr of courses) {
  w(`insert into api.world_courses (id, continent_id, region_id, display_order, name_key, distance_meters, surface, shape, scene_address, reward_table_id, enabled, debug_only, content_version) values (${q(cr.id)}, ${q(cr.continent_id)}, ${q(cr.region_id)}, ${cr.order}, ${q(cr.name_key)}, ${cr.distance_meters}, ${q(cr.surface)}, ${q(cr.shape)}, ${q(cr.scene_address)}, ${q(cr.reward_table_id)}, ${b(cr.enabled)}, ${b(cr.debug_only)}, ${q(manifest.content_version)}) on conflict (id) do nothing;`);
}
w('');
w('-- Race formats ------------------------------------------------------------------');
for (const f of raceFormats) {
  w(`insert into api.race_formats (id, content_version) values (${q(f.id)}, ${q(manifest.content_version)}) on conflict (id) do nothing;`);
}
for (const f of challengeFormats) {
  w(`insert into api.challenge_formats (id, rule, content_version) values (${q(f.id)}, ${q(f.rule)}, ${q(manifest.content_version)}) on conflict (id) do nothing;`);
}
w('');

w('-- Races -------------------------------------------------------------------------');
for (const s of [...mainRaces, ...challengeRaces]) {
  w(`insert into api.world_races (id, continent_id, region_id, kind, display_order, name_key, format, challenge_format_id, race_condition, field_size, scene_address, reward_table_id, enabled, debug_only) values (${q(s.id)}, ${q(s.continent_id)}, ${q(s.region_id)}, ${q(s.kind)}, ${s.order}, ${q(s.name_key)}, ${q(s.format)}, ${q(s.challenge_format_id ?? null)}, ${q(s.race_condition)}, ${s.field_size}, ${q(s.scene_address)}, ${q(s.reward_table_id)}, ${b(s.enabled)}, ${b(s.debug_only)}) on conflict (id) do nothing;`);
}
w('');

w('-- Champions and open races -------------------------------------------------------');
for (const ch of continentChampions) {
  w(`insert into api.world_champions (id, kind, continent_id, name_key, race_plan, scene_address) values (${q(ch.id)}, 'continent_champion', ${q(ch.continent_id)}, ${q(ch.name_key)}, ${arr(ch.race_plan)}, ${q(ch.scene_address)}) on conflict (id) do nothing;`);
}
for (const ev of openRaceEvents) {
  w(`insert into api.world_champions (id, kind, continent_id, name_key, race_plan, scene_address) values (${q(ev.id)}, 'open_race', null, ${q(ev.name_key)}, ${arr(ev.race_plan)}, ${q(ev.scene_address)}) on conflict (id) do nothing;`);
}
w(`insert into api.world_champions (id, kind, continent_id, name_key, race_plan, scene_address) values (${q(apexRace.id)}, 'apex_race', null, ${q(apexRace.name_key)}, ${arr(apexRace.race_plan)}, ${q(apexRace.scene_address)}) on conflict (id) do nothing;`);
w('');

w('-- Story chapters ----------------------------------------------------------------');
for (const ch of chapters) {
  w(`insert into api.story_chapters (id, display_order, continent_id, title_key, shard_id, requires_previous_chapter) values (${q(ch.id)}, ${ch.order}, ${q(ch.continent_id)}, ${q(ch.title_key)}, ${q(ch.shard_id)}, ${b(ch.requires_previous_chapter)}) on conflict (id) do nothing;`);
}
w('');

w('-- Rival crews -------------------------------------------------------------------');
for (const e of [...standardRivals, ...eliteRivals]) {
  w(`insert into api.rival_crews (id, continent_id, crew_kind, name_key, tactic) values (${q(e.id)}, ${q(e.continent_id)}, ${q(e.crew_kind)}, ${q(e.name_key)}, ${q(e.tactic)}) on conflict (id) do nothing;`);
}
w('');

w('-- Characters --------------------------------------------------------------------');
for (const c of characters) {
  w(`insert into api.characters (id, display_order, name_key, role, secondary_role, continent_affinity, visible_at_launch, trial_available, unlock_path, prefab_address, portrait_address, paid_gacha) values (${q(c.id)}, ${c.order}, ${q(c.name_key)}, ${q(c.role)}, ${q(c.secondary_role)}, ${q(c.continent_affinity)}, ${b(c.visible_at_launch)}, ${b(c.trial_available)}, ${q(c.unlock_path)}, ${q(c.prefab_address)}, ${q(c.portrait_address)}, ${b(c.paid_gacha)}) on conflict (id) do nothing;`);
}
w('');
for (const s of techniques) {
  w(`insert into api.race_techniques (id, character_id, kind, name_key, core_budget_delta) values (${q(s.id)}, ${q(s.character_id)}, ${q(s.kind)}, ${q(s.name_key)}, 0) on conflict (id) do nothing;`);
}
w('');
for (const r of gearSets) {
  w(`insert into api.gear_sets (id, continent_id, name_key, trade_from, trade_to, activation_condition, budget_delta) values (${q(r.id)}, ${q(r.continent_id)}, ${q(r.name_key)}, ${q(r.trade_from)}, ${q(r.trade_to)}, ${q(r.activation_condition)}, 0) on conflict (id) do nothing;`);
}
w('');
for (const e of episodes) {
  w(`insert into api.character_episodes (id, character_id, chapter_index, name_key, scene_address, playable_at_launch) values (${q(e.id)}, ${q(e.character_id)}, ${e.chapter_index}, ${q(e.name_key)}, ${q(e.scene_address)}, ${b(e.playable_at_launch)}) on conflict (id) do nothing;`);
}
w('');
for (const c of cosmetics) {
  w(`insert into api.cosmetics (id, character_id, slot, name_key) values (${q(c.id)}, ${q(c.character_id)}, ${q(c.slot)}, ${q(c.name_key)}) on conflict (id) do nothing;`);
}
w('');
for (const c of companions) {
  w(`insert into api.companions (id, display_order, name_key, continent_id, expedition_type) values (${q(c.id)}, ${c.order}, ${q(c.name_key)}, ${q(c.continent_id)}, ${q(c.expedition_type)}) on conflict (id) do nothing;`);
}
w('');

w('-- Launch content gate: aborts the seed transaction if anything is short -----------');
w('select * from private.assert_launch_content_complete();');
w('');
w('commit;');
w('');

const target = join(ROOT, 'backend', 'supabase', 'seed.sql');
writeFileSync(target, `${out.join('\n')}\n`, 'utf8');
console.log(`seed written: ${target} (${out.length} lines)`);
