#!/usr/bin/env node
/**
 * Content factory — expands the authored design tables into the canonical launch content.
 *
 * The factory generates BOILERPLATE (stable IDs, schema envelopes, localization skeletons,
 * route wiring, test fixtures). It never invents gameplay: every course trait, race
 * condition, champion race plan, runner kit and story beat comes from the authored tables in
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
  CONTINENTS, OPEN_RACE_EVENTS, APEX_RACE, CHALLENGE_FORMATS, STORY_CHAPTERS, RACE_FORMATS,
  COURSE_SHAPES, REGION_COURSE_DISTANCES, courseSurface,
} from './world/world-design.mjs';
// The surface a continent runs on is a property of its courses, and the race engine is
// where that already lives. Importing it keeps one continent from having two characters.
import { CONTINENT_COURSES, RACE_FIELD_SIZE } from '../../packages/domain/race.mjs';
import { CHARACTERS, COMPANIONS, COSMETIC_SLOTS, GEAR_THEMES, ROLES } from './characters/character-design.mjs';
import {
  MY_RUNNER_BASE_STYLES, AGE_BANDS, BUILDS, SKIN_TONES, ADAPTIVE_KITS,
  RIG_ID, ANIMATION_SET_ID, STARTER_SLOT_FILL,
} from './characters/my-runner-design.mjs';
import {
  EQUIPMENT_SLOTS, SET_SHAPES, OUTFIT_SETS, WARDROBE_LANGUAGES, SLOT_GARMENTS,
  ACQUISITION_ROUTES, ADULT_ONLY_SLOTS,
} from './characters/wardrobe-design.mjs';
import { WORLD_RUNNER_ROSTERS, TENDENCIES, assignment } from './characters/world-runner-design.mjs';
import {
  GLOBAL_EVENTS, EVENT_LIFECYCLE, SHARED_FIELDS, RENDER_BUDGET, EVIDENCE_REQUIRED, CAPACITY,
} from './events/global-event-design.mjs';
import {
  APEX_CHECKPOINT_METERS, MAJOR_RANKS, GOAL_DISTANCES, GOAL_DURATIONS, SESSION_STYLES,
  PASSPORT_BANDS, BEST_EFFORT_DISTANCES, DIFFICULTY_LANES, ALLOWED_ACTIVITY_TYPES,
  LAUNCH_CONTENT_FLOOR, checkpointId, rankForMeters, APEX_LADDER_VERSION, DIRECTION_LOCK,
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
// World: continents, regions, courses, races, rivals, champions
// ---------------------------------------------------------------------------

const continents = [];
const regions = [];
const courses = [];
const mainRaces = [];
const challengeRaces = [];
const standardRivals = [];
const eliteRivals = [];
const continentChampions = [];
const restorationStates = [];
const gearSets = [];

// ---------------------------------------------------------------------------
// World runners — built before the continents because the rival crews are made OF them.
//
// A crew used to hold three anonymous seats (`{id, pacer_index}`). Now it holds three of
// these people. Building the roster first is what makes that possible without a second
// pass, and it is why a crew can no longer contain a runner who does not exist.
// ---------------------------------------------------------------------------
const worldRunners = [];
const runnersByContinent = new Map();
{
  const tendencyById = new Map(TENDENCIES.map((t) => [t.id, t]));
  let index = 0;
  for (const c of CONTINENTS) {
    const cShort = c.id.replace('con_', '');
    const roster = WORLD_RUNNER_ROSTERS[c.id];
    if (!roster) throw new Error(`no world runner roster for ${c.id}`);
    const own = [];
    roster.forEach(([en, ko, homeRegion, signature, intro], i) => {
      const a = assignment(index);
      const id = `wrn_${cShort}_${pad(i + 1)}`;
      const record = {
        id,
        order: index + 1,
        continent_id: c.id,
        home_region_id: `rgn_${cShort}_${pad(homeRegion)}`,
        name_key: loc(`world_runner.${cShort}.${pad(i + 1)}`, { ko, en }),
        intro_key: loc(`world_runner.${cShort}.${pad(i + 1)}.intro`, {
          ko: intro, en: intro,
        }),
        // Appearance is a base style, so a world runner and a My Runner are drawn by the
        // same rig and wear the same wardrobe. One character system, not two.
        base_style_id: a.base_style_id,
        role: a.role,
        tendency_id: a.tendency_id,
        tendency: tendencyById.get(a.tendency_id).en,
        race_signature: signature,
        introduction: intro,
        // Which of the two race systems this runner appears in. Assigned below.
        crew_id: null,
        crew_slot: null,
        open_field: true,
        prefab_address: `runner/${cShort}/${pad(i + 1)}`,
        portrait_address: `runner/${cShort}/${pad(i + 1)}/portrait`,
        // DL-5: a world runner is a way of running, never a pool of power.
        grants_core_power: false,
      };
      worldRunners.push(record);
      own.push(record);
      index += 1;
    });
    runnersByContinent.set(c.id, own);
  }
}

for (const c of CONTINENTS) {
  const cShort = c.id.replace('con_', '');

  continents.push({
    id: c.id,
    order: c.order,
    name_key: loc(`continent.${cShort}.name`, c.name),
    identity_key: loc(`continent.${cShort}.identity`, c.identity),
    trait_id: c.race_trait.id,
    trait_name_key: loc(`trait.${c.race_trait.id}`, c.race_trait),
    trait_rule: c.trait_rule,
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
      node_type: i === c.regions.length - 1 ? 'champion_node'
        : i % 3 === 1 ? 'challenge_node' : 'race_node',
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

  c.races.forEach((r, i) => {
    mainRaces.push({
      id: `rce_${cShort}_main_${pad(i + 1)}`,
      continent_id: c.id,
      region_id: `rgn_${cShort}_${pad(Math.min(i + 1, c.regions.length))}`,
      kind: 'main',
      order: i + 1,
      name_key: loc(`race.${cShort}.main.${pad(i + 1)}`, {
        ko: `${c.name.ko} ${i + 1}구간 레이스`, en: `${c.name.en} — Stage ${i + 1}`,
      }),
      format: r.format,
      race_condition: r.twist,
      trait_id: c.race_trait.id,
      rival_crew_ids: [`rvl_${cShort}_01`, `rvl_${cShort}_02`],
      elite_crew_id: i >= 3 ? `rve_${cShort}_01` : null,
      // The champion only lines up in the format that is named for them.
      champion_id: r.format === 'championship' ? `chm_${cShort}` : null,
      field_size: RACE_FIELD_SIZE,
      scene_address: `world/${cShort}/race_main_${pad(i + 1)}`,
      lane_ids: DIFFICULTY_LANES.map((l) => l.id),
      reward_table_id: `rwd_${cShort}_main_${pad(i + 1)}`,
      enabled: true,
      debug_only: false,
    });
  });

  c.challenges.forEach((r, i) => {
    challengeRaces.push({
      id: `rce_${cShort}_side_${pad(i + 1)}`,
      continent_id: c.id,
      region_id: `rgn_${cShort}_${pad(2 + i * 3)}`,
      kind: 'side',
      order: i + 1,
      name_key: loc(`race.${cShort}.side.${pad(i + 1)}`, {
        ko: `${c.name.ko} 도전 레이스 ${i + 1}`, en: `${c.name.en} — Challenge ${i + 1}`,
      }),
      // A challenge race is scored by its challenge format, so the entry format is the
      // plain time trial and the rule that makes it hard lives in challenge_format_id.
      format: 'time_trial',
      race_condition: r.twist,
      trait_id: c.race_trait.id,
      challenge_format_id: r.format,
      rival_crew_ids: [`rvl_${cShort}_${pad(i + 1)}`],
      elite_crew_id: null,
      champion_id: null,
      field_size: RACE_FIELD_SIZE,
      scene_address: `world/${cShort}/race_side_${pad(i + 1)}`,
      lane_ids: DIFFICULTY_LANES.map((l) => l.id),
      reward_table_id: `rwd_${cShort}_side_${pad(i + 1)}`,
      enabled: true,
      debug_only: false,
    });
  });

  // A crew is three named people from this continent, taken in roster order. The seats
  // used to be `{id: 'rvl_lumena_01_r1', pacer_index: 0}` — an id and an index, which is
  // what let 108 of them pass as pacers while none of them was anyone. Assigning the crew
  // id back onto the runner record keeps the two directions in agreement instead of
  // leaving a reference that only points one way.
  const ownRunners = runnersByContinent.get(c.id);
  const takeCrew = (crewId, offset) => ownRunners.slice(offset, offset + 3).map((runner, slot) => {
    runner.crew_id = crewId;
    runner.crew_slot = slot;
    runner.open_field = false;
    return { world_runner_id: runner.id, crew_slot: slot };
  });

  c.rivals.forEach((r, i) => {
    standardRivals.push({
      id: `rvl_${cShort}_${pad(i + 1)}`,
      continent_id: c.id,
      crew_kind: 'standard',
      name_key: loc(`rival.${cShort}.${pad(i + 1)}`, r),
      tactic: r.tactic,
      trait_id: c.race_trait.id,
      runners: takeCrew(`rvl_${cShort}_${pad(i + 1)}`, i * 3),
      prefab_address: `rival/${cShort}/standard_${pad(i + 1)}`,
    });
  });

  eliteRivals.push({
    id: `rve_${cShort}_01`,
    continent_id: c.id,
    crew_kind: 'elite',
    name_key: loc(`rival.${cShort}.elite`, c.elite_rival),
    tactic: c.elite_rival.tactic,
    trait_id: c.race_trait.id,
    runners: takeCrew(`rve_${cShort}_01`, c.rivals.length * 3),
    prefab_address: `rival/${cShort}/elite_01`,
  });

  continentChampions.push({
    id: `chm_${cShort}`,
    continent_id: c.id,
    kind: 'continent_champion',
    name_key: loc(`champion.${cShort}`, c.champion),
    race_plan: c.champion.race_plan,
    plan_rule: c.champion.plan_rule,
    trait_id: c.race_trait.id,
    scene_address: `world/${cShort}/championship`,
    // Losing a race costs nothing: the entry is not consumed and the rematch is immediate.
    retry_policy: { consumes_entry: false, instant_retry: true, shows_recommended_form: true },
  });

  GEAR_THEMES.forEach((theme, i) => {
    gearSets.push({
      id: `ger_${cShort}_${theme.suffix}`,
      continent_id: c.id,
      name_key: loc(`gear.${cShort}.${theme.suffix}`, {
        ko: `${c.name.ko}의 ${theme.suffix}`, en: `${theme.suffix} of ${c.name.en}`,
      }),
      // Sidegrade: gear redistributes the same Fitness Core budget, never adds to it.
      budget_delta: 0,
      // The trade says WHAT moves; the continent condition says WHEN it applies. Without
      // the second half these would be six themes wearing twelve coats of paint, which is
      // exactly what the content validator rejects as a reskin.
      //
      // `from` and `to` are literally the axes packages/domain/race.mjs trades in
      // buildRunnerForm, so a gear set is engine input rather than description.
      trade_from: theme.from,
      trade_to: theme.to,
      activation_condition: c.gear_condition,
      sidegrade_axis: `moves ${theme.from} into ${theme.to} ${c.gear_condition}`,
      trait_affinity: c.race_trait.id,
      slot: ['shoes', 'kit', 'accessory'][i % 3],
      icon_address: `gear/${cShort}/${theme.suffix}`,
    });
  });
}

const openRaceEvents = OPEN_RACE_EVENTS.map((e) => ({
  id: e.id,
  kind: 'open_race',
  name_key: loc(`champion.open.${e.id}`, e.name),
  race_plan: e.race_plan,
  rotation_weeks: e.rotation_weeks,
  trait_focus: e.trait_focus,
  scene_address: `world/openrace/${e.id}`,
}));

const apexRace = {
  id: APEX_RACE.id,
  kind: 'apex_race',
  name_key: loc('champion.apex_axis', APEX_RACE.name),
  race_plan: APEX_RACE.legs,
  plan_rule: APEX_RACE.leg_rule,
  unlock_monthly_meters: APEX_RACE.unlock.monthly_meters,
  unlocks_per_user_month: APEX_RACE.unlock.unlocks_per_user_month,
  rewards: APEX_RACE.rewards,
  scene_address: 'world/apex/axis',
  // DL-1: this is the terminal content of the monthly journey.
  has_content_above: false,
};

// ---------------------------------------------------------------------------
// Runners: roster, techniques, episodes, cosmetics, companions
// ---------------------------------------------------------------------------

const characters = [];
const techniques = [];
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
    race_kit: ch.race_kit,
    core_conversion: ch.core_conversion,
    race_signature: ch.race_signature,
    technique_ids: [
      ch.technique_open.id, ch.technique_mid.id, ch.technique_habit.id, ch.technique_finish.id,
    ],
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

  for (const [kind, t] of [
    ['opening', ch.technique_open], ['midrace', ch.technique_mid],
    ['habit', ch.technique_habit], ['finish', ch.technique_finish],
  ]) {
    techniques.push({
      id: t.id,
      character_id: ch.id,
      kind,
      name_key: loc(`technique.${t.id}`, t.name),
      effect: t.effect,
      equipable: true,
      // A technique changes how the shared Fitness Core is spent across a race, never how
      // much of it there is. DL-5: only verified running moves that number.
      core_budget_delta: 0,
      icon_address: `technique/${short}/${t.id}`,
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
// My Runner: the account's one persistent runner, and the 24 bodies it can be
// ---------------------------------------------------------------------------

const ageBandById = new Map(AGE_BANDS.map((b) => [b.id, b]));
const buildById = new Map(BUILDS.map((b) => [b.id, b]));
const skinById = new Map(SKIN_TONES.map((t) => [t.id, t]));
const adaptiveById = new Map(ADAPTIVE_KITS.map((k) => [k.id, k]));

const myRunnerStyles = MY_RUNNER_BASE_STYLES.map((s) => {
  const short = s.id.replace('mrs_', '');
  const band = ageBandById.get(s.age_band);
  const build = buildById.get(s.build);
  const skin = skinById.get(s.skin);
  const adaptive = s.adaptive === null ? null : adaptiveById.get(s.adaptive);
  if (!band) throw new Error(`${s.id}: unknown age band ${s.age_band}`);
  if (!build) throw new Error(`${s.id}: unknown build ${s.build}`);
  if (!skin) throw new Error(`${s.id}: unknown skin tone ${s.skin}`);
  if (s.adaptive !== null && !adaptive) throw new Error(`${s.id}: unknown adaptive kit ${s.adaptive}`);

  return {
    id: s.id,
    order: s.order,
    name_key: loc(`my_runner.style.${short}`, s.name),
    age_band: s.age_band,
    build: s.build,
    presentation: s.presentation,
    skin_tone_id: s.skin,
    skin_hex: skin.hex,
    // Skeleton scaling on one shared rig, not 24 meshes. This is what makes a wardrobe of
    // 600+ items wearable by every style without a per-style asset explosion.
    rig_id: RIG_ID,
    animation_set_id: ANIMATION_SET_ID,
    head_ratio: band.head_ratio,
    build_scale: build.scale,
    face: s.face,
    hair: s.hair,
    gait: s.gait,
    posture: s.posture,
    expression_neutral: s.neutral,
    expression_effort: s.effort,
    finish_motion: s.finish,
    adaptive_kit_id: s.adaptive,
    adaptive_equipment: adaptive ? adaptive.equipment : null,
    adaptive_gait_note: adaptive ? adaptive.gait_note : null,
    // DL-5, stated rather than implied: a body is not a stat.
    grants_core_power: false,
    // DL-4: every style is selectable on day one. There is no style to unlock.
    selectable_at_launch: true,
    paid_gacha: false,
    starter_slot_fill: STARTER_SLOT_FILL,
    prefab_address: `myrunner/style/${short}`,
    portrait_address: `myrunner/style/${short}/portrait`,
    thumbnail_address: `myrunner/style/${short}/thumb`,
  };
});

// ---------------------------------------------------------------------------
// Wardrobe: 18 slots, 120 outfit sets, 600+ individually equippable items
// ---------------------------------------------------------------------------

const equipmentSlots = EQUIPMENT_SLOTS.map((s) => ({
  id: `slt_${s.id}`,
  slot: s.id,
  order: s.order,
  layer: s.layer,
  required: s.required,
  hides: s.hides,
  name_key: loc(`wardrobe.slot.${s.id}`, { ko: s.ko, en: s.en }),
  icon_address: `wardrobe/slot/${s.id}`,
}));

const childStyleIds = new Set(
  MY_RUNNER_BASE_STYLES.filter((s) => s.age_band === 'child').map((s) => s.id),
);
const allStyleIds = MY_RUNNER_BASE_STYLES.map((s) => s.id);
const adultStyleIds = allStyleIds.filter((id) => !childStyleIds.has(id));

const outfitSets = [];
const wearableItems = [];

CONTINENTS.forEach((c, continentIndex) => {
  const cShort = c.id.replace('con_', '');
  const language = WARDROBE_LANGUAGES[c.id];
  if (!language) throw new Error(`no wardrobe language for ${c.id}`);
  const sets = OUTFIT_SETS[c.id];
  if (!sets || sets.length !== SET_SHAPES.length) {
    throw new Error(`${c.id}: expected ${SET_SHAPES.length} outfit sets, got ${sets?.length ?? 0}`);
  }

  sets.forEach((set, setIndex) => {
    const shape = SET_SHAPES[setIndex];
    const setId = `ost_${cShort}_${set.suffix}`;
    const acquisition = ACQUISITION_ROUTES[(continentIndex + setIndex) % ACQUISITION_ROUTES.length];
    const itemIds = shape.slots.map((slot) => `wrb_${cShort}_${set.suffix}_${slot}`);

    outfitSets.push({
      id: setId,
      continent_id: c.id,
      order: setIndex + 1,
      name_key: loc(`wardrobe.set.${cShort}.${set.suffix}`, {
        ko: `${c.name.ko} · ${set.ko}`, en: `${set.en} — ${c.name.en.split(',')[0]}` }),
      shape_id: shape.id,
      construction: shape.construction,
      material: language.material,
      material_construction: language.construction,
      detail: set.detail,
      // Palette comes from the continent, once. A set does not carry its own copy of a
      // colour that already exists one file away.
      palette: c.palette,
      item_ids: itemIds,
      slot_ids: shape.slots.map((slot) => `slt_${slot}`),
      acquisition_source: acquisition,
      purchasable_with_real_money: false,
      random_box: false,
      complete_set_bonus: null,
      thumbnail_address: `wardrobe/set/${cShort}/${set.suffix}`,
    });

    shape.slots.forEach((slot, slotIndex) => {
      const garment = SLOT_GARMENTS[slot][(setIndex + slotIndex) % SLOT_GARMENTS[slot].length];
      const adultOnly = ADULT_ONLY_SLOTS.includes(slot);
      wearableItems.push({
        id: `wrb_${cShort}_${set.suffix}_${slot}`,
        set_id: setId,
        continent_id: c.id,
        slot,
        slot_id: `slt_${slot}`,
        order: slotIndex + 1,
        name_key: loc(`wardrobe.item.${cShort}.${set.suffix}.${slot}`, {
          ko: `${set.ko} ${garment.ko}`, en: `${set.en} ${garment.en}` }),
        // Compatibility is stated per item, not assumed. Two slots carry adult race
        // equipment and are honestly not fitted to the child styles; the other sixteen
        // fit all 24, and the validator proves that rather than trusting this comment.
        compatible_base_style_ids: adultOnly ? adultStyleIds : allStyleIds,
        equippable: true,
        thumbnail_address: `wardrobe/item/${cShort}/${set.suffix}/${slot}`,
        prefab_address: `wardrobe/mesh/${cShort}/${set.suffix}/${slot}`,
        rig_id: RIG_ID,
        acquisition_source: acquisition,
        default_owned: false,
        default_equipped: false,
        server_persisted: true,
        restores_on_relaunch: true,
        // DL-5. Every power-bearing field is an explicit zero so the fairness test reads a
        // value instead of trusting an absence.
        core_power: 0,
        xp_multiplier: 0,
        ranking_multiplier: 0,
        verification_bonus: 0,
        hidden_stat: 0,
        extra_core_reward_multiplier: 0,
        purchasable_with_real_money: false,
        random_box: false,
      });
    });
  });
});

// ---------------------------------------------------------------------------
// Global Events: the 50-100 runner scheduled races
// ---------------------------------------------------------------------------

const globalEvents = GLOBAL_EVENTS.map((e, i) => ({
  id: e.id,
  order: i + 1,
  host_continent_id: e.host_continent_id,
  name_key: loc(`global_event.${e.id}`, e.name),
  distance_meters: e.distance_meters,
  cadence: e.cadence,
  entry_rule: e.entry_rule,
  // Capacity is the owner floor, not a per-event number somebody could type smaller.
  min_participants: CAPACITY.min_participants,
  max_participants: CAPACITY.max_participants,
  heat_size: e.heat_size,
  heats_at_capacity: Math.ceil(CAPACITY.max_participants / e.heat_size),
  check_in_window_minutes: e.check_in_window_minutes,
  countdown_seconds: e.countdown_seconds,
  summary: e.summary,
  lifecycle: EVENT_LIFECYCLE.map((s) => s.id),
  shared_participant_fields: SHARED_FIELDS,
  shares_raw_gps: false,
  render_budget: RENDER_BUDGET,
  // Honest by construction: nothing here says a measurement was taken. The release report
  // prints NOT_RUN for every entry until a run actually writes one.
  evidence_required: EVIDENCE_REQUIRED,
  evidence: Object.fromEntries(EVIDENCE_REQUIRED.map((k) => [k, 'NOT_RUN'])),
  // Not `..._key`: the localization gate treats every field ending in `_key` as a string
  // to look up, and this is an idempotency template, not user-facing copy.
  reward_idempotency_template: `${e.id}:{user_id}:{occurrence_id}`,
  scene_address: `event/global/${e.id}`,
  enabled: true,
  debug_only: false,
}));

// ---------------------------------------------------------------------------
// Progression: the 52-checkpoint Monthly Apex ladder
// ---------------------------------------------------------------------------

const REWARD_BUNDLE_KINDS = [
  'cosmetic', 'story', 'character_episode', 'gear_choice',
  'race_entry', 'restoration_scene', 'profile_frame', 'season_point', 'crown_shard',
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
    // Keyed on the distance, not on the index. This read `i === 51` — correct while the
    // ladder had 52 checkpoints, silently wrong the moment it grew to 121: the World Crown
    // ceremony moved to the 509 km checkpoint and the real final one got a restoration
    // pulse. `is_final` on the line below already used the distance and stayed right, so
    // the two disagreed and nothing failed.
    story_or_world_effect: meters === 1_000_000
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
    // Derived, not restated: the season objective named 52 checkpoints for as long as the
    // ladder had 52, and kept naming 52 after it grew to 121.
    `monthly_apex_${DIRECTION_LOCK.CHECKPOINT_COUNT}_checkpoint_journey`, 'four_rotating_open_races',
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
written.push(write('world/races/main_races.json', envelope('main_race', mainRaces)));
written.push(write('world/races/challenge_races.json', envelope('challenge_race', challengeRaces)));
written.push(write('world/champions/continent_champions.json', envelope('continent_champion', continentChampions)));
written.push(write('world/champions/open_race_events.json', envelope('open_race_event', openRaceEvents)));
written.push(write('world/champions/apex_race.json', envelope('apex_race', [apexRace])));
written.push(write('world/restoration/restoration_states.json', envelope('restoration_state', restorationStates)));
written.push(write('world/rivals/standard_rival_crews.json', envelope('standard_rival_crew', standardRivals)));
written.push(write('world/rivals/elite_rival_crews.json', envelope('elite_rival_crew', eliteRivals)));
written.push(write('world/story_chapters.json', envelope('story_chapter', STORY_CHAPTERS.map((ch) => ({
  ...ch,
  title_key: loc(`chapter.${ch.id}`, ch.title),
})))));
written.push(write('world/race_formats.json', envelope('race_format', RACE_FORMATS.map((id) => ({ id })))));
written.push(write('world/challenge_formats.json', envelope('challenge_format', CHALLENGE_FORMATS)));

written.push(write('characters/roster/characters.json', envelope('character', characters)));
written.push(write('characters/techniques/race_techniques.json', envelope('race_technique', techniques)));
written.push(write('characters/gear/gear_sets.json', envelope('gear_set', gearSets)));
written.push(write('characters/episodes/character_episodes.json', envelope('character_episode', episodes)));
written.push(write('characters/cosmetics/cosmetics.json', envelope('cosmetic', cosmetics)));
written.push(write('characters/companions.json', envelope('companion', companions)));
written.push(write('characters/my_runner/base_styles.json', envelope('my_runner_base_style', myRunnerStyles)));
written.push(write('characters/world_runners/world_runners.json', envelope('world_runner', worldRunners)));
written.push(write('characters/wardrobe/equipment_slots.json', envelope('equipment_slot', equipmentSlots)));
written.push(write('characters/wardrobe/outfit_sets.json', envelope('outfit_set', outfitSets)));
written.push(write('characters/wardrobe/wearable_items.json', envelope('wearable_item', wearableItems)));
written.push(write('events/global_events.json', envelope('global_event', globalEvents)));

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
  main_races: mainRaces.length,
  challenge_races: challengeRaces.length,
  playable_characters: characters.length,
  courses: courses.length,
  character_episodes: episodes.length,
  race_techniques: techniques.length,
  gear_sets: gearSets.length,
  standard_rival_crews: standardRivals.length,
  elite_rival_crews: eliteRivals.length,
  continent_champions: continentChampions.length,
  open_race_events: openRaceEvents.length,
  apex_races: 1,
  race_formats: RACE_FORMATS.length,
  challenge_formats: CHALLENGE_FORMATS.length,
  companions: companions.length,
  equipable_cosmetics: cosmetics.length,
  story_chapters: STORY_CHAPTERS.length,
  launch_seasons: 1,
  event_arcs: eventArcs.length,
  my_runner_base_styles: myRunnerStyles.length,
  world_runners: worldRunners.length,
  equipment_slots: equipmentSlots.length,
  outfit_sets: outfitSets.length,
  wearable_items: wearableItems.length,
  global_events: globalEvents.length,
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
