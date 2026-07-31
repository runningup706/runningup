#!/usr/bin/env node
/**
 * Content factory — expands the authored design tables into the canonical launch content.
 *
 * The factory generates BOILERPLATE (stable IDs, schema envelopes, localization skeletons,
 * route wiring, test fixtures). It never invents gameplay: every mechanic, objective twist,
 * boss phase, character kit and story beat comes from the authored tables in
 * `world-design.mjs` and `character-design.mjs`. That separation is what keeps the launch
 * counts honest instead of turning into a reskin mill — see master # 17.3.
 *
 * Usage: node tools/content-factory/build.mjs [--out content/launch]
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CONTINENTS, WORLD_BOSSES, APEX_BOSS, DUNGEON_TYPES, STORY_CHAPTERS, OBJECTIVE_TYPES,
  COURSE_SHAPES, REGION_COURSE_DISTANCES, courseSurface,
} from './world/world-design.mjs';
// The surface a continent runs on is a property of its courses, and the race engine is
// where that already lives. Importing it keeps one continent from having two characters.
import { CONTINENT_COURSES } from '../../packages/domain/race.mjs';
import { CHARACTERS, COMPANIONS, COSMETIC_SLOTS, RELIC_THEMES, ROLES } from './characters/character-design.mjs';
import {
  APEX_CHECKPOINT_METERS, MAJOR_RANKS, GOAL_DISTANCES, GOAL_DURATIONS, SESSION_STYLES,
  PASSPORT_BANDS, BEST_EFFORT_DISTANCES, DIFFICULTY_LANES, ALLOWED_ACTIVITY_TYPES,
  LAUNCH_CONTENT_FLOOR, checkpointId, rankForMeters, APEX_LADDER_VERSION,
} from '../../packages/domain/constants.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'content', 'launch');
const LOC = join(ROOT, 'content', 'localization');
const CONTENT_VERSION = '1.0.0';
const SCHEMA_VERSION = '1.0.0';

const locale = { ko: {}, en: {} };
/** Register a localized string pair and return its key. */
function loc(key, pair) {
  if (locale.ko[key] !== undefined && locale.ko[key] !== pair.ko) {
    throw new Error(`localization key collision: ${key}`);
  }
  locale.ko[key] = pair.ko;
  locale.en[key] = pair.en;
  return key;
}

function envelope(kind, items) {
  return {
    schema_version: SCHEMA_VERSION,
    content_version: CONTENT_VERSION,
    kind,
    count: items.length,
    items,
  };
}

function write(relPath, data) {
  const full = join(OUT, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  return full;
}

const pad = (n, w = 2) => String(n).padStart(w, '0');

// ---------------------------------------------------------------------------
// World: continents, regions, stages, enemies, bosses
// ---------------------------------------------------------------------------

const continents = [];
const regions = [];
const courses = [];
const mainStages = [];
const sideStages = [];
const standardEnemies = [];
const eliteEnemies = [];
const continentBosses = [];
const restorationStates = [];
const relics = [];

for (const c of CONTINENTS) {
  const cShort = c.id.replace('con_', '');

  continents.push({
    id: c.id,
    order: c.order,
    name_key: loc(`continent.${cShort}.name`, c.name),
    identity_key: loc(`continent.${cShort}.identity`, c.identity),
    mechanic_id: c.mechanic.id,
    mechanic_name_key: loc(`mechanic.${c.mechanic.id}`, c.mechanic),
    mechanic_rule: c.mechanic_rule,
    palette: c.palette,
    skyline: c.skyline,
    music_motif: c.music_motif,
    story_beat_key: loc(`continent.${cShort}.story_beat`, c.story_beat),
    // Every continent is visible and enterable from first login. DL-4.
    visible_at_first_login: true,
    playable_at_launch: true,
    coming_soon: false,
    hub_scene_address: `world/${cShort}/hub`,
    vista_scene_address: `world/${cShort}/vista`,
    content_pack_id: `pack_${cShort}`,
    lore_sets: c.lore_sets,
    // Non-linear: the entry node of every continent is reachable straight after the tutorial.
    entry_region_id: `rgn_${cShort}_01`,
    requires_continent_ids: [],
    recommended_lane_ids: DIFFICULTY_LANES.map((l) => l.id),
  });

  c.regions.forEach((rName, i) => {
    const id = `rgn_${cShort}_${pad(i + 1)}`;
    regions.push({
      id,
      continent_id: c.id,
      order: i + 1,
      name_key: loc(`region.${cShort}.${pad(i + 1)}`, rName),
      node_type: i === c.regions.length - 1 ? 'continent_boss_node'
        : i % 3 === 1 ? 'challenge_node' : 'battle_node',
      scene_address: `world/${cShort}/region_${pad(i + 1)}`,
      // Route wiring: node 1 is the entry, each later node is opened by the previous one.
      // This is a recommended route, not a hard gate: `bypass_allowed` keeps it non-linear.
      reachable_from: i === 0 ? ['continent_entry'] : [`rgn_${cShort}_${pad(i)}`],
      bypass_allowed: true,
      restoration_state_ids: c.restoration.map((s) => `rst_${cShort}_${s}`),
    });
  });

  // Twelve courses per region: four distances crossed with three shapes. See
  // REGION_COURSE_DISTANCES for why the distances grow with the region's position.
  const continentSurface = CONTINENT_COURSES[c.id]?.surface ?? 'road';
  c.regions.forEach((rName, i) => {
    const regionId = `rgn_${cShort}_${pad(i + 1)}`;
    const distances = REGION_COURSE_DISTANCES[i];
    distances.forEach((distanceMeters, d) => {
      COURSE_SHAPES.forEach((shape, sIndex) => {
        const n = d * COURSE_SHAPES.length + sIndex + 1;
        const label = distanceMeters % 1000 === 0
          ? `${distanceMeters / 1000}K`
          : `${(distanceMeters / 1000).toFixed(3)}K`;
        courses.push({
          id: `crs_${cShort}_${pad(i + 1)}_${pad(n)}`,
          continent_id: c.id,
          region_id: regionId,
          order: n,
          name_key: loc(`course.${cShort}.${pad(i + 1)}.${pad(n)}`, {
            ko: `${rName.ko} ${label} ${shape.ko}`,
            en: `${rName.en} ${label} ${shape.en}`,
          }),
          distance_meters: distanceMeters,
          surface: courseSurface(shape.id, continentSurface),
          shape: shape.id,
          scene_address: `world/${cShort}/course_${pad(i + 1)}_${pad(n)}`,
          lane_ids: DIFFICULTY_LANES.map((l) => l.id),
          reward_table_id: `rwd_${cShort}_course_${pad(i + 1)}_${pad(n)}`,
          enabled: true,
          debug_only: false,
        });
      });
    });
  });

  c.restoration.forEach((state, i) => {
    restorationStates.push({
      id: `rst_${cShort}_${state}`,
      continent_id: c.id,
      order: i + 1,
      state,
      name_key: loc(`restoration.${cShort}.${state}`, {
        ko: `${c.name.ko} 복구 ${i + 1}단계`,
        en: `${c.name.en} restoration stage ${i + 1}`,
      }),
      visual_change: `stage ${i + 1} of 3: palette, architecture and light shift toward the restored state`,
    });
  });

  c.stages.forEach((s, i) => {
    const id = `stg_${cShort}_main_${pad(i + 1)}`;
    mainStages.push({
      id,
      continent_id: c.id,
      region_id: `rgn_${cShort}_${pad(Math.min(i + 1, c.regions.length))}`,
      kind: 'main',
      order: i + 1,
      name_key: loc(`stage.${cShort}.main.${pad(i + 1)}`, {
        ko: `${c.name.ko} ${i + 1}구역`, en: `${c.name.en} — Sector ${i + 1}`,
      }),
      objective: s.objective,
      objective_twist: s.twist,
      mechanic_id: c.mechanic.id,
      enemy_family_ids: [`enm_${cShort}_01`, `enm_${cShort}_02`],
      elite_family_id: i >= 3 ? `eli_${cShort}_01` : null,
      scene_address: `world/${cShort}/stage_main_${pad(i + 1)}`,
      lane_ids: DIFFICULTY_LANES.map((l) => l.id),
      reward_table_id: `rwd_${cShort}_main_${pad(i + 1)}`,
      enabled: true,
      debug_only: false,
    });
  });

  c.side_stages.forEach((s, i) => {
    const id = `stg_${cShort}_side_${pad(i + 1)}`;
    sideStages.push({
      id,
      continent_id: c.id,
      region_id: `rgn_${cShort}_${pad(2 + i * 3)}`,
      kind: 'side',
      order: i + 1,
      name_key: loc(`stage.${cShort}.side.${pad(i + 1)}`, {
        ko: `${c.name.ko} 도전 ${i + 1}`, en: `${c.name.en} — Challenge ${i + 1}`,
      }),
      objective: s.objective,
      objective_twist: s.twist,
      mechanic_id: c.mechanic.id,
      dungeon_type_id: DUNGEON_TYPES[(c.order + i) % DUNGEON_TYPES.length].id,
      scene_address: `world/${cShort}/stage_side_${pad(i + 1)}`,
      lane_ids: DIFFICULTY_LANES.map((l) => l.id),
      reward_table_id: `rwd_${cShort}_side_${pad(i + 1)}`,
      enabled: true,
      debug_only: false,
    });
  });

  c.enemies.forEach((e, i) => {
    standardEnemies.push({
      id: `enm_${cShort}_${pad(i + 1)}`,
      continent_id: c.id,
      family_kind: 'standard',
      name_key: loc(`enemy.${cShort}.${pad(i + 1)}`, e),
      behaviour: e.behaviour,
      mechanic_id: c.mechanic.id,
      // Three visual/behavioural variants per family = 72 standard variants at launch.
      variants: [1, 2, 3].map((v) => ({
        id: `enm_${cShort}_${pad(i + 1)}_v${v}`,
        variant_rule: `${e.behaviour} (tier ${v})`,
      })),
      prefab_address: `enemy/${cShort}/standard_${pad(i + 1)}`,
    });
  });

  eliteEnemies.push({
    id: `eli_${cShort}_01`,
    continent_id: c.id,
    family_kind: 'elite',
    name_key: loc(`enemy.${cShort}.elite`, c.elite),
    behaviour: c.elite.behaviour,
    mechanic_id: c.mechanic.id,
    prefab_address: `enemy/${cShort}/elite_01`,
  });

  continentBosses.push({
    id: `boss_${cShort}`,
    continent_id: c.id,
    kind: 'continent_boss',
    name_key: loc(`boss.${cShort}`, c.boss),
    phases: c.boss.phases,
    phase_rule: c.boss.phase_rule,
    mechanic_id: c.mechanic.id,
    scene_address: `world/${cShort}/boss`,
    retry_policy: { consumes_entry: false, instant_retry: true, shows_recommended_counter: true },
  });

  RELIC_THEMES.forEach((theme, i) => {
    relics.push({
      id: `rlc_${cShort}_${theme.suffix}`,
      continent_id: c.id,
      name_key: loc(`relic.${cShort}.${theme.suffix}`, {
        ko: `${c.name.ko}의 ${theme.suffix}`, en: `${theme.suffix} of ${c.name.en}`,
      }),
      // Sidegrade: relics redistribute the same Fitness Core budget, never add to it.
      budget_delta: 0,
      // The trade says WHAT moves; the continent condition says WHEN it applies. Without
      // the second half these would be six themes wearing twelve coats of paint, which is
      // exactly what the content validator rejects as a reskin.
      trade_from: theme.from,
      trade_to: theme.to,
      activation_condition: c.relic_condition,
      sidegrade_axis: `moves ${theme.from.replace(/_/g, ' ')} into ${theme.to.replace(/_/g, ' ')} ${c.relic_condition}`,
      mechanic_affinity: c.mechanic.id,
      slot: ['core', 'edge', 'support'][i % 3],
      icon_address: `relic/${cShort}/${theme.suffix}`,
    });
  });
}

const worldBosses = WORLD_BOSSES.map((b) => ({
  id: b.id,
  kind: 'world_boss',
  name_key: loc(`boss.world.${b.id}`, b.name),
  phases: b.phases,
  rotation_weeks: b.rotation_weeks,
  mechanic_focus: b.mechanic_focus,
  scene_address: `world/worldboss/${b.id}`,
}));

const apexBoss = {
  id: APEX_BOSS.id,
  kind: 'apex_boss',
  name_key: loc('boss.apex_axis', APEX_BOSS.name),
  phases: APEX_BOSS.phases,
  phase_rule: APEX_BOSS.phase_rule,
  unlock_monthly_meters: APEX_BOSS.unlock.monthly_meters,
  unlocks_per_user_month: APEX_BOSS.unlock.unlocks_per_user_month,
  rewards: APEX_BOSS.rewards,
  scene_address: 'world/apex/axis',
  // DL-1: this is the terminal content of the monthly journey.
  has_content_above: false,
};

// ---------------------------------------------------------------------------
// Characters: roster, skills, episodes, cosmetics, companions
// ---------------------------------------------------------------------------

const characters = [];
const skills = [];
const episodes = [];
const cosmetics = [];

for (const ch of CHARACTERS) {
  const short = ch.id.replace('chr_', '');
  characters.push({
    id: ch.id,
    order: ch.order,
    name_key: loc(`character.${short}.name`, ch.name),
    role: ch.role,
    secondary_role: ch.secondary_role,
    continent_affinity: ch.continent_affinity,
    presentation: ch.presentation,
    silhouette: ch.silhouette,
    weapon: ch.weapon,
    core_conversion: ch.core_conversion,
    basic_attack: ch.basic_attack,
    skill_ids: [ch.skill_1.id, ch.skill_2.id, ch.passive.id, ch.ultimate.id],
    specializations: ch.specializations,
    episode_ids: ch.episodes.map((e, i) => `epi_${short}_${pad(i + 1)}`),
    unlock_path: ch.unlock_path,
    // DL-4: everyone is visible and trial-playable on day one; nothing is behind a paywall.
    visible_at_launch: true,
    trial_available: true,
    trial_stage_address: `character/${short}/trial`,
    paid_gacha: false,
    prefab_address: `character/${short}/prefab`,
    portrait_address: `character/${short}/portrait`,
    cosmetic_slot_ids: COSMETIC_SLOTS,
  });

  for (const [kind, s] of [['active', ch.skill_1], ['active', ch.skill_2], ['passive', ch.passive], ['ultimate', ch.ultimate]]) {
    skills.push({
      id: s.id,
      character_id: ch.id,
      kind,
      name_key: loc(`skill.${s.id}`, s.name),
      effect: s.effect,
      equipable: true,
      // Tactical skills change how the shared Fitness Core is expressed, never its size.
      core_budget_delta: 0,
      icon_address: `skill/${short}/${s.id}`,
    });
  }

  ch.episodes.forEach((slug, i) => {
    episodes.push({
      id: `epi_${short}_${pad(i + 1)}`,
      character_id: ch.id,
      chapter_index: i + 1,
      slug,
      name_key: loc(`episode.${short}.${pad(i + 1)}`, {
        ko: `${ch.name.ko} 에피소드 ${i + 1}`, en: `${ch.name.en} — Episode ${i + 1}` }),
      unlock: i === 0 ? 'character_owned' : `episode_${pad(i)}_complete`,
      scene_address: `episode/${short}/${pad(i + 1)}`,
      playable_at_launch: true,
    });
  });

  COSMETIC_SLOTS.forEach((slot, i) => {
    cosmetics.push({
      id: `csm_${short}_${slot}`,
      character_id: ch.id,
      slot,
      name_key: loc(`cosmetic.${short}.${slot}`, {
        ko: `${ch.name.ko} ${slot} 외형`, en: `${ch.name.en} ${slot.replace('_', ' ')}` }),
      // Fair cosmetic economy: every power-bearing field is fixed at exactly zero, and the
      // validator asserts that no other stat field exists on the record at all.
      core_power: 0,
      xp_multiplier: 0,
      ranking_multiplier: 0,
      verification_bonus: 0,
      hidden_stat: 0,
      extra_core_reward_multiplier: 0,
      source: i < 4 ? 'world_progress' : 'achievement',
      purchasable_with_real_money: false,
      asset_address: `cosmetic/${short}/${slot}`,
    });
  });
}

const companions = COMPANIONS.map((c, i) => ({
  id: c.id,
  order: i + 1,
  name_key: loc(`companion.${c.id}`, c.name),
  continent_id: c.continent_id,
  expedition_type: c.expedition,
  expedition_duration_minutes: [30, 60, 120, 240][i % 4],
  // Expeditions yield materials and story fragments only — never Fitness XP or core stats.
  reward_kinds: ['craft_material', 'story_fragment', 'restoration_support'],
  grants_core_power: false,
  prefab_address: `companion/${c.id}`,
}));

// ---------------------------------------------------------------------------
// Progression: the 52-checkpoint Monthly Apex ladder
// ---------------------------------------------------------------------------

const REWARD_BUNDLE_KINDS = [
  'cosmetic', 'story', 'character_episode', 'relic_choice',
  'boss_key', 'restoration_scene', 'profile_frame', 'season_point', 'crown_shard',
];

const checkpoints = APEX_CHECKPOINT_METERS.map((meters, i) => {
  const km = meters / 1000;
  const id = checkpointId(i);
  // Every checkpoint is tied to at least one meaningful reward, never a bare number popup.
  const bundle = [
    REWARD_BUNDLE_KINDS[i % REWARD_BUNDLE_KINDS.length],
    REWARD_BUNDLE_KINDS[(i * 3 + 2) % REWARD_BUNDLE_KINDS.length],
  ].filter((v, idx, arr) => arr.indexOf(v) === idx);

  return {
    checkpoint_id: id,
    index: i + 1,
    threshold_meters: meters,
    threshold_km: km,
    major_rank: rankForMeters(meters).id,
    name_key: loc(`apex.checkpoint.${id}`, {
      ko: km === 42.195 ? '마라톤 상징 지점' : `${km}km 지점`,
      en: km === 42.195 ? 'Marathon-symbolic milestone' : `${km} km checkpoint`,
    }),
    reward_bundle_id: `bundle_${id}`,
    reward_bundle_kinds: bundle,
    story_or_world_effect: i === 51
      ? 'world_crown_ceremony_and_apex_axis_unlock'
      : `restoration_pulse_${(i % 12) + 1}`,
    is_final: meters === 1_000_000,
    content_version: CONTENT_VERSION,
  };
});

const apexLadder = {
  schema_version: SCHEMA_VERSION,
  content_version: CONTENT_VERSION,
  ladder_version: APEX_LADDER_VERSION,
  final_checkpoint_meters: 1_000_000,
  checkpoint_count: checkpoints.length,
  // DL-1, asserted here and again by the validator, the SQL CHECK constraints and pgTAP.
  tiers_above_final: [],
  major_ranks: MAJOR_RANKS.map((r) => ({
    id: r.id,
    order: r.order,
    min_meters: r.min_meters,
    max_meters: r.max_meters,
    is_final: r.id === 'world_crown',
    name_key: loc(`apex.rank.${r.id}`, {
      ko: {
        awakening: '각성', strider: '스트라이더', runner: '러너', challenger: '챌린저',
        vanguard: '뱅가드', champion: '챔피언', master: '마스터', grandmaster: '그랜드마스터',
        legend: '레전드', mythic: '미식', apex: '에이펙스', world_crown: '월드 크라운',
      }[r.id],
      en: r.id.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' '),
    }),
  })),
  checkpoints,
};

// ---------------------------------------------------------------------------
// Running: goal library, bands, best efforts
// ---------------------------------------------------------------------------

const goalLibrary = {
  schema_version: SCHEMA_VERSION,
  content_version: CONTENT_VERSION,
  // DL-2: this whole library is selectable by every user on their first session.
  available_to_all_users_on_first_session: true,
  prerequisites: [],
  distances: GOAL_DISTANCES.map((d) => ({
    ...d,
    name_key: loc(`goal.distance.${d.id}`, distanceLabel(d)),
  })),
  durations: GOAL_DURATIONS.map((d) => ({
    ...d,
    name_key: loc(`goal.duration.${d.id}`, durationLabel(d)),
  })),
  styles: SESSION_STYLES.map((s) => ({
    ...s,
    name_key: loc(`goal.style.${s.id}`, styleLabel(s)),
  })),
  allowed_activity_types: ALLOWED_ACTIVITY_TYPES,
};

function distanceLabel(d) {
  if (d.id === 'd_custom') return { ko: '직접 설정 거리', en: 'Custom distance' };
  if (d.id === 'd_half') return { ko: '하프 마라톤', en: 'Half marathon' };
  if (d.id === 'd_marathon') return { ko: '마라톤', en: 'Marathon' };
  if (d.id === 'd_1mile') return { ko: '1마일', en: '1 mile' };
  if (d.id === 'd_10mile') return { ko: '10마일', en: '10 miles' };
  const m = d.meters;
  return m < 1000 ? { ko: `${m}m`, en: `${m} m` } : { ko: `${m / 1000}km`, en: `${m / 1000} km` };
}
function durationLabel(d) {
  if (d.id === 't_custom') return { ko: '직접 설정 시간', en: 'Custom duration' };
  const min = d.seconds / 60;
  return { ko: `${min}분`, en: `${min} min` };
}
function styleLabel(s) {
  const table = {
    s_free: ['자유 러닝', 'Free run'], s_run_walk: ['런-워크(초보)', 'Run-walk (beginner)'],
    s_easy: ['이지', 'Easy'], s_steady: ['스테디', 'Steady'], s_progression: ['프로그레션', 'Progression'],
    s_tempo: ['템포', 'Tempo'], s_intervals: ['인터벌', 'Intervals'], s_fartlek: ['파틀렉', 'Fartlek'],
    s_long_run: ['롱런', 'Long run'], s_time_trial: ['타임 트라이얼', 'Time trial'],
    s_race_simulation: ['레이스 시뮬레이션', 'Race simulation'], s_track: ['트랙', 'Track'],
    s_treadmill: ['트레드밀', 'Treadmill'], s_indoor: ['실내', 'Indoor'], s_custom: ['직접 설정', 'Custom'],
  };
  const [ko, en] = table[s.id];
  return { ko, en };
}

// ---------------------------------------------------------------------------
// Quests, season, events
// ---------------------------------------------------------------------------

const QUEST_POOLS = ['discovery_foundation', 'regular', 'performance', 'endurance_half', 'marathon', 'advanced_custom'];
const QUEST_KINDS = ['daily_momentum', 'quality_session', 'long_run', 'weekly_volume', 'monthly_apex_checkpoint', 'character_episode', 'continent_restoration'];

const quests = [];
QUEST_POOLS.forEach((pool, pi) => {
  QUEST_KINDS.forEach((kind, ki) => {
    quests.push({
      id: `qst_${pool}_${kind}`,
      runner_band_pool: pool,
      kind,
      name_key: loc(`quest.${pool}.${kind}`, {
        ko: `${pool} 퀘스트: ${kind}`, en: `${pool} quest: ${kind.replace(/_/g, ' ')}` }),
      // Quests scale to the band that receives them: no marathon quest for a beginner,
      // no 1 km introduction forced on a marathon runner.
      rerollable: true,
      challenge_up_down: true,
      // The allowed activity set is global (constants.ALLOWED_ACTIVITY_TYPES, mirrored by
      // the DB enum and the reward engine). A quest never restates it: one source of truth.
      allowed_activity_types: ALLOWED_ACTIVITY_TYPES,
    });
  });
});

const season = {
  schema_version: SCHEMA_VERSION,
  content_version: CONTENT_VERSION,
  id: 'season_01_stillfog',
  name_key: loc('season.season_01_stillfog', { ko: '시즌 1: 정지의 안개', en: 'Season 1: The Stilling Fog' }),
  continent_ids: CONTINENTS.map((c) => c.id),
  character_ids: CHARACTERS.map((c) => c.id),
  duration_weeks: 12,
  objectives: [
    'twelve_continent_restoration_campaign', 'twelve_character_trial_week',
    'runner_passport_route_missions', 'distance_challenges_400m_to_custom',
    'daily_momentum_ladder', 'quality_session_chain_event',
    'monthly_apex_52_checkpoint_journey', 'four_rotating_world_bosses',
    'crew_cooperative_continent_campaign', 'world_crown_and_apex_axis_finale',
  ],
  catch_up_route: true,
  claim_grace_days: 14,
  permanent_cosmetics_never_revoked: true,
};

const eventArcs = [
  { id: 'evt_arc_lanternfall', name: { ko: '등불의 낙하', en: 'Lanternfall' }, continent_ids: ['con_lumena', 'con_hora', 'con_tempora'], weeks: [1, 2, 3, 4], hook: 'reflected light restores the fallen lanterns across three continents' },
  { id: 'evt_arc_thawtide', name: { ko: '해빙 조류', en: 'Thawtide' }, continent_ids: ['con_nival', 'con_serene', 'con_neris'], weeks: [5, 6, 7, 8], hook: 'a thaw front moves the tide cycle into frozen and drowned regions' },
  { id: 'evt_arc_convergence', name: { ko: '수렴', en: 'Convergence' }, continent_ids: ['con_origin', 'con_voltis', 'con_kael'], weeks: [9, 10, 11, 12], hook: 'worldline fractures leak each continent mechanic into its neighbours' },
].map((e) => ({
  ...e,
  name_key: loc(`event.${e.id}`, e.name),
  schema_version: SCHEMA_VERSION,
}));

// ---------------------------------------------------------------------------
// Emit
// ---------------------------------------------------------------------------

const written = [];
written.push(write('world/continents/continents.json', envelope('continent', continents)));
written.push(write('world/regions/regions.json', envelope('region_node', regions)));
written.push(write('world/courses/courses.json', envelope('course', courses)));
written.push(write('world/stages/main_stages.json', envelope('main_stage', mainStages)));
written.push(write('world/stages/side_stages.json', envelope('side_stage', sideStages)));
written.push(write('world/bosses/continent_bosses.json', envelope('continent_boss', continentBosses)));
written.push(write('world/bosses/world_bosses.json', envelope('world_boss', worldBosses)));
written.push(write('world/bosses/apex_boss.json', envelope('apex_boss', [apexBoss])));
written.push(write('world/restoration/restoration_states.json', envelope('restoration_state', restorationStates)));
written.push(write('world/enemies/standard_enemy_families.json', envelope('standard_enemy_family', standardEnemies)));
written.push(write('world/enemies/elite_enemy_families.json', envelope('elite_enemy_family', eliteEnemies)));
written.push(write('world/story_chapters.json', envelope('story_chapter', STORY_CHAPTERS.map((ch) => ({
  ...ch,
  title_key: loc(`chapter.${ch.id}`, ch.title),
})))));
written.push(write('world/dungeon_types.json', envelope('dungeon_type', DUNGEON_TYPES)));

written.push(write('characters/roster/characters.json', envelope('character', characters)));
written.push(write('characters/skills/tactical_skills.json', envelope('tactical_skill', skills)));
written.push(write('characters/skills/tactical_relics.json', envelope('tactical_relic', relics)));
written.push(write('characters/episodes/character_episodes.json', envelope('character_episode', episodes)));
written.push(write('characters/cosmetics/cosmetics.json', envelope('cosmetic', cosmetics)));
written.push(write('characters/companions.json', envelope('companion', companions)));

written.push(write('progression/monthly_apex_0_1000.json', apexLadder));
written.push(write('running/goal_library.json', goalLibrary));
written.push(write('running/runner_passport_bands.json', envelope('passport_band', PASSPORT_BANDS.map((b) => ({
  ...b,
  name_key: loc(`passport.band.${b.id}`, bandLabel(b.id)),
  is_content_lock: false,
})))));
written.push(write('running/best_effort_distances.json', envelope('best_effort_distance',
  BEST_EFFORT_DISTANCES.map((m) => ({ meters: m })))));
written.push(write('quests/quests.json', envelope('quest', quests)));
written.push(write('seasons/season_01.json', season));
written.push(write('events/event_arcs.json', envelope('event_arc', eventArcs)));

function bandLabel(id) {
  const table = {
    R0: ['R0 디스커버리', 'R0 Discovery'], R1: ['R1 파운데이션', 'R1 Foundation'],
    R2: ['R2 레귤러', 'R2 Regular'], R3: ['R3 퍼포먼스', 'R3 Performance'],
    R4: ['R4 인듀런스', 'R4 Endurance'], R5: ['R5 하프', 'R5 Half'],
    R6: ['R6 마라톤', 'R6 Marathon'], R7: ['R7 어드밴스드', 'R7 Advanced Custom'],
  };
  const [ko, en] = table[id];
  return { ko, en };
}

// Localization catalogues
mkdirSync(join(LOC, 'ko'), { recursive: true });
mkdirSync(join(LOC, 'en'), { recursive: true });
writeFileSync(join(LOC, 'ko', 'content.json'), `${JSON.stringify(sortKeys(locale.ko), null, 2)}\n`, 'utf8');
writeFileSync(join(LOC, 'en', 'content.json'), `${JSON.stringify(sortKeys(locale.en), null, 2)}\n`, 'utf8');

function sortKeys(o) {
  return Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
}

// Launch content manifest — the machine-readable count contract used by CI and the release.
const counts = {
  continents: continents.length,
  region_nodes: regions.length,
  main_stages: mainStages.length,
  side_stages: sideStages.length,
  playable_characters: characters.length,
  courses: courses.length,
  character_episodes: episodes.length,
  tactical_skills: skills.length,
  tactical_relics: relics.length,
  standard_enemy_families: standardEnemies.length,
  elite_enemy_families: eliteEnemies.length,
  continent_bosses: continentBosses.length,
  world_bosses: worldBosses.length,
  apex_bosses: 1,
  companions: companions.length,
  equipable_cosmetics: cosmetics.length,
  story_chapters: STORY_CHAPTERS.length,
  launch_seasons: 1,
  event_arcs: eventArcs.length,
};

const manifest = {
  schema_version: SCHEMA_VERSION,
  content_version: CONTENT_VERSION,
  generated_by: 'tools/content-factory/build.mjs',
  counts,
  floor: LAUNCH_CONTENT_FLOOR,
  meets_floor: Object.entries(LAUNCH_CONTENT_FLOOR).every(([k, v]) => counts[k] >= v),
  localization_locales: ['ko', 'en'],
  localization_key_count: Object.keys(locale.ko).length,
  monthly_apex: {
    checkpoint_count: checkpoints.length,
    final_checkpoint_meters: 1_000_000,
    tiers_above_final: 0,
  },
  files: written.map((f) => f.replace(`${ROOT}/`, '')).sort(),
};
manifest.content_sha256 = createHash('sha256')
  .update(JSON.stringify({ counts, checkpoints: checkpoints.length, locale: Object.keys(locale.ko).length }))
  .digest('hex');

write('launch_content_manifest.json', manifest);

console.log('content factory complete');
for (const [k, v] of Object.entries(counts)) {
  const floor = LAUNCH_CONTENT_FLOOR[k];
  console.log(`  ${k.padEnd(26)} ${String(v).padStart(4)}${floor !== undefined ? ` / floor ${floor}` : ''}`);
}
console.log(`  localization keys          ${String(Object.keys(locale.ko).length).padStart(4)} (ko + en)`);
console.log(`  meets launch floor         ${manifest.meets_floor}`);

// "false" on its own is not a diagnosis. This build reported a bare false while the
// printed table showed every visible category at floor, because the category that was
// short — courses — had no counter and so was never printed at all. Name the gap.
{
  const missingCounter = Object.keys(LAUNCH_CONTENT_FLOOR).filter((k) => !(k in counts));
  const below = Object.entries(LAUNCH_CONTENT_FLOOR)
    .filter(([k, v]) => k in counts && counts[k] < v)
    .map(([k, v]) => `${k}: ${counts[k]} < ${v}`);
  const extra = Object.keys(counts).filter((k) => !(k in LAUNCH_CONTENT_FLOOR));

  for (const k of missingCounter) {
    console.error(`::error::${k} has a launch floor but nothing counts it — it can never be met`);
  }
  for (const line of below) console.error(`::error::below floor — ${line}`);
  for (const k of extra) console.error(`::error::${k} is generated but has no launch floor — it ships ungated`);

  if (missingCounter.length > 0 || below.length > 0 || extra.length > 0) {
    process.exit(1);
  }
}
if (!manifest.meets_floor) process.exitCode = 1;
