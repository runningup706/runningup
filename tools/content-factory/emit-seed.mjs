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
const mainStages = items('world/stages/main_stages.json');
const sideStages = items('world/stages/side_stages.json');
const continentBosses = items('world/bosses/continent_bosses.json');
const worldBosses = items('world/bosses/world_bosses.json');
const apexBoss = items('world/bosses/apex_boss.json')[0];
const chapters = items('world/story_chapters.json');
const standardEnemies = items('world/enemies/standard_enemy_families.json');
const eliteEnemies = items('world/enemies/elite_enemy_families.json');
const characters = items('characters/roster/characters.json');
const skills = items('characters/skills/tactical_skills.json');
const relics = items('characters/skills/tactical_relics.json');
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

w('-- World: continents, regions, stages -------------------------------------------');
for (const c of continents) {
  w(`insert into api.world_continents (id, display_order, name_key, mechanic_id, visible_at_first_login, playable_at_launch, content_pack_id, entry_region_id, content_version) values (${q(c.id)}, ${c.order}, ${q(c.name_key)}, ${q(c.mechanic_id)}, ${b(c.visible_at_first_login)}, ${b(c.playable_at_launch)}, ${q(c.content_pack_id)}, ${q(c.entry_region_id)}, ${q(manifest.content_version)}) on conflict (id) do nothing;`);
}
w('');
for (const r of regions) {
  w(`insert into api.world_regions (id, continent_id, display_order, name_key, node_type, scene_address, bypass_allowed) values (${q(r.id)}, ${q(r.continent_id)}, ${r.order}, ${q(r.name_key)}, ${q(r.node_type)}, ${q(r.scene_address)}, ${b(r.bypass_allowed)}) on conflict (id) do nothing;`);
}
w('');
for (const s of [...mainStages, ...sideStages]) {
  w(`insert into api.world_stages (id, continent_id, region_id, kind, display_order, name_key, objective, objective_twist, scene_address, reward_table_id, enabled, debug_only) values (${q(s.id)}, ${q(s.continent_id)}, ${q(s.region_id)}, ${q(s.kind)}, ${s.order}, ${q(s.name_key)}, ${q(s.objective)}, ${q(s.objective_twist)}, ${q(s.scene_address)}, ${q(s.reward_table_id)}, ${b(s.enabled)}, ${b(s.debug_only)}) on conflict (id) do nothing;`);
}
w('');

w('-- Bosses ------------------------------------------------------------------------');
for (const boss of continentBosses) {
  w(`insert into api.world_bosses (id, kind, continent_id, name_key, phases, scene_address) values (${q(boss.id)}, 'continent_boss', ${q(boss.continent_id)}, ${q(boss.name_key)}, ${arr(boss.phases)}, ${q(boss.scene_address)}) on conflict (id) do nothing;`);
}
for (const boss of worldBosses) {
  w(`insert into api.world_bosses (id, kind, continent_id, name_key, phases, scene_address) values (${q(boss.id)}, 'world_boss', null, ${q(boss.name_key)}, ${arr(boss.phases)}, ${q(boss.scene_address)}) on conflict (id) do nothing;`);
}
w(`insert into api.world_bosses (id, kind, continent_id, name_key, phases, scene_address) values (${q(apexBoss.id)}, 'apex_boss', null, ${q(apexBoss.name_key)}, ${arr(apexBoss.phases)}, ${q(apexBoss.scene_address)}) on conflict (id) do nothing;`);
w('');

w('-- Story chapters ----------------------------------------------------------------');
for (const ch of chapters) {
  w(`insert into api.story_chapters (id, display_order, continent_id, title_key, shard_id, requires_previous_chapter) values (${q(ch.id)}, ${ch.order}, ${q(ch.continent_id)}, ${q(ch.title_key)}, ${q(ch.shard_id)}, ${b(ch.requires_previous_chapter)}) on conflict (id) do nothing;`);
}
w('');

w('-- Enemy families ----------------------------------------------------------------');
for (const e of [...standardEnemies, ...eliteEnemies]) {
  w(`insert into api.enemy_families (id, continent_id, family_kind, name_key, behaviour) values (${q(e.id)}, ${q(e.continent_id)}, ${q(e.family_kind)}, ${q(e.name_key)}, ${q(e.behaviour)}) on conflict (id) do nothing;`);
}
w('');

w('-- Characters --------------------------------------------------------------------');
for (const c of characters) {
  w(`insert into api.characters (id, display_order, name_key, role, secondary_role, continent_affinity, visible_at_launch, trial_available, unlock_path, prefab_address, portrait_address, paid_gacha) values (${q(c.id)}, ${c.order}, ${q(c.name_key)}, ${q(c.role)}, ${q(c.secondary_role)}, ${q(c.continent_affinity)}, ${b(c.visible_at_launch)}, ${b(c.trial_available)}, ${q(c.unlock_path)}, ${q(c.prefab_address)}, ${q(c.portrait_address)}, ${b(c.paid_gacha)}) on conflict (id) do nothing;`);
}
w('');
for (const s of skills) {
  w(`insert into api.character_skills (id, character_id, kind, name_key, core_budget_delta) values (${q(s.id)}, ${q(s.character_id)}, ${q(s.kind)}, ${q(s.name_key)}, 0) on conflict (id) do nothing;`);
}
w('');
for (const r of relics) {
  w(`insert into api.tactical_relics (id, continent_id, name_key, trade_from, trade_to, activation_condition, budget_delta) values (${q(r.id)}, ${q(r.continent_id)}, ${q(r.name_key)}, ${q(r.trade_from)}, ${q(r.trade_to)}, ${q(r.activation_condition)}, 0) on conflict (id) do nothing;`);
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
