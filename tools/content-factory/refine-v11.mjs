// V11 정본 수량을 보존하면서 2304코스와 60 Pacer의 출시 품질 메타데이터를 강화한다.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const repository = resolve(new URL("../..", import.meta.url).pathname);
const catalogDirectory = join(repository, "content/v11/catalogs");
const readJson = (name) =>
  JSON.parse(readFileSync(join(catalogDirectory, name), "utf8"));
const stableJson = (value) => `${JSON.stringify(value, null, 2)}\n`;
const atomicJson = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, stableJson(value), "utf8");
  renameSync(temporary, path);
};
const sha256 = (value) =>
  createHash("sha256").update(stableJson(value)).digest("hex");

const world = readJson("WORLD_ROUTE_CATALOG_V11.json");
const continentAliases = new Map(
  world.routes.map((route) => [
    route.continent_id,
    route.continent_name_ko.split(" ")[0],
  ]),
);
const surfaces = [
  "spring_track",
  "city_asphalt",
  "park_rubber",
  "bridge_composite",
  "tunnel_lane",
  "indoor_dome",
];
const crowds = [
  "morning_club",
  "family_cheer",
  "school_team",
  "city_festival",
  "pacer_friends",
  "champion_gallery",
];
const music = [
  "bright_stride",
  "garden_bounce",
  "crystal_cadence",
  "sunset_tempo",
  "coastal_breeze",
  "finale_anthem",
];

world.routes = world.routes.map((route) => {
  const alias = continentAliases.get(route.continent_id);
  const routeName = route.route_name_ko.startsWith(`${alias} `)
    ? route.route_name_ko
    : `${alias} ${route.route_name_ko}`;
  return {
    ...route,
    route_name_ko: routeName,
    route_name_en: `${route.continent_name_en}_R${String(route.region_index).padStart(2, "0")}_S${String(route.route_index).padStart(2, "0")}`,
    architecture_signature: `${route.environment_profile}:R${String(route.region_index).padStart(2, "0")}:S${String(route.route_index).padStart(2, "0")}`,
    surface_profile: surfaces[(route.region_index + route.route_index) % surfaces.length],
    crowd_profile: crowds[(route.region_index * 2 + route.route_index) % crowds.length],
    music_profile: `${route.continent_id}_${music[(route.region_index + route.route_index * 2) % music.length]}`,
    finish_profile:
      route.route_type === "REGION_CHAMPION"
        ? `${route.continent_id}_region_champion_finish`
        : `${route.continent_id}_journey_finish_${String(route.route_index).padStart(2, "0")}`,
    restoration_story_id: `${route.route_id}-RESTORE`,
  };
});

const pacerCatalog = readJson("PACER_ROSTER_60_V11.json");
const hairShapes = [
  "에어리 보브",
  "리듬 포니",
  "레이어드 웨이브",
  "소프트 크롭",
  "트윈 번",
  "플로우 언더컷",
  "루프 브레이드",
  "클라우드 컬",
  "픽시 테일",
  "사이드 쉐이브",
  "하프 업",
  "스파크 숏",
];
const hairDetails = [
  "리본 밴드",
  "메시 핀",
  "미니 캡",
  "라이트 클립",
  "러너 바이저",
];
const faceShapes = [
  "둥근 턱",
  "부드러운 역삼각",
  "짧은 타원",
  "넓은 볼",
  "선명한 턱선",
  "작은 하트형",
  "높은 광대",
  "낮은 광대",
  "긴 볼",
  "컴팩트 오벌",
];
const eyeShapes = [
  "초승달 눈매",
  "큰 원형 눈매",
  "집중형 눈매",
  "부드러운 처진 눈매",
  "선명한 아몬드 눈매",
  "웃는 눈매",
];
const dialogueTones = [
  "따뜻한 격려",
  "정확한 페이스 코칭",
  "유쾌한 농담",
  "조용한 동행",
  "대담한 도전",
  "차분한 회복",
];

pacerCatalog.pacers = pacerCatalog.pacers.map((pacer, index) => {
  const number = index + 1;
  const uniqueSuffix = String(number).padStart(2, "0");
  const baseGait = pacer.gait_signature.split(" · ")[0];
  return {
    ...pacer,
    hair: `${hairShapes[index % hairShapes.length]} · ${hairDetails[Math.floor(index / hairShapes.length)]}`,
    hair_id: `HAIR_${uniqueSuffix}`,
    face_signature: `${faceShapes[index % faceShapes.length]} · ${eyeShapes[Math.floor(index / faceShapes.length)]}`,
    face_id: `FACE_${uniqueSuffix}`,
    outfit_signature: `${pacer.continent_id}_${pacer.role}_${pacer.accent_color}_${uniqueSuffix}`,
    outfit_id: `PACER_OUTFIT_${uniqueSuffix}`,
    gait_signature: `${baseGait} · ${pacer.role}_${uniqueSuffix}`,
    animation_variant: `PACER_GAIT_${uniqueSuffix}`,
    model_variant: `PACER_MODEL_${uniqueSuffix}`,
    dialogue_tone: dialogueTones[index % dialogueTones.length],
    relationship_arc_id: `${pacer.pacer_id}_BOND`,
    bond_episode_ids: [1, 2, 3, 4].map(
      (episode) => `${pacer.pacer_id}-EP${episode}`,
    ),
  };
});

const cards = readJson("CARD_CATALOG_360_V11.json");
cards.cards = cards.cards.map((card, index) => ({
  ...card,
  effect_id: `CARD_EFFECT_${String(index + 1).padStart(3, "0")}`,
  odds_pool:
    card.rarity === "SSR" ? "DIRECT_DRAW_SSR_CAP" : "DIRECT_DRAW_STANDARD",
  duplicate_conversion: {
    material_id: `${card.category}_MEMORY_DUST`,
    amount: Math.max(1, cards.rarity_order.indexOf(card.rarity) + 1),
  },
}));

const gear = readJson("RUNNING_GEAR_192_V11.json");
gear.gear = gear.gear.map((item, index) => {
  const { combat_stat: removedLegacyField, ...runningItem } = item;
  void removedLegacyField;
  return {
    ...runningItem,
    mesh_id: `${item.set_id}_${item.slot}_MESH`,
    material_id: `${item.set_id}_${item.slot}_MAT`,
    effect_id: `GEAR_EFFECT_${String(index + 1).padStart(3, "0")}`,
    affects_real_record_ranking: false,
  };
});

const files = [
  ["WORLD_ROUTE_CATALOG_V11.json", world],
  ["PACER_ROSTER_60_V11.json", pacerCatalog],
  ["CARD_CATALOG_360_V11.json", cards],
  ["RUNNING_GEAR_192_V11.json", gear],
];
for (const [name, value] of files) {
  atomicJson(join(catalogDirectory, name), value);
}

const forms = readJson("MY_RUNNER_EVOLUTION_V11.json");
const checkpoints = readJson("MONTHLY_APEX_120_CHECKPOINTS_V11.json");
const screens = readJson("SCREEN_CATALOG_V11.json");
const launchManifest = {
  schema_version: "1.0.0",
  product_version: "11.0.0",
  generated_by: "tools/content-factory/refine-v11.mjs",
  counts: {
    continents: new Set(world.routes.map((route) => route.continent_id)).size,
    regions: new Set(world.routes.map((route) => route.region_id)).size,
    routes: world.routes.length,
    my_runner_forms: forms.forms.length,
    pacers: pacerCatalog.pacers.length,
    cards: cards.cards.length,
    running_gear: gear.gear.length,
    monthly_checkpoints: checkpoints.checkpoints.length,
    screens: screens.screens.length,
  },
  hashes: Object.fromEntries(
    [
      ["WORLD_ROUTE_CATALOG_V11.json", world],
      ["PACER_ROSTER_60_V11.json", pacerCatalog],
      ["CARD_CATALOG_360_V11.json", cards],
      ["RUNNING_GEAR_192_V11.json", gear],
      ["MY_RUNNER_EVOLUTION_V11.json", forms],
      ["MONTHLY_APEX_120_CHECKPOINTS_V11.json", checkpoints],
      ["SCREEN_CATALOG_V11.json", screens],
    ].map(([name, value]) => [name, sha256(value)]),
  ),
};
atomicJson(join(repository, "content/v11/launch-manifest.json"), launchManifest);

console.log(JSON.stringify(launchManifest, null, 2));
