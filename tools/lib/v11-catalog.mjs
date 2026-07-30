// V11 출시 카탈로그의 수량·고유성·제품 잠금을 공통 검증한다.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const catalogNames = {
  world: "WORLD_ROUTE_CATALOG_V11.json",
  pacers: "PACER_ROSTER_60_V11.json",
  cards: "CARD_CATALOG_360_V11.json",
  gear: "RUNNING_GEAR_192_V11.json",
  monthly: "MONTHLY_APEX_120_CHECKPOINTS_V11.json",
  forms: "MY_RUNNER_EVOLUTION_V11.json",
  screens: "SCREEN_CATALOG_V11.json",
};

export const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");

export const readCatalogs = (repository) => {
  const directory = join(repository, "content/v11/catalogs");
  return Object.fromEntries(
    Object.entries(catalogNames).map(([key, name]) => [
      key,
      JSON.parse(readFileSync(join(directory, name), "utf8")),
    ]),
  );
};

export const uniqueCount = (values) => new Set(values).size;

export const countBy = (items, key) =>
  Object.fromEntries(
    [...items.reduce((map, item) => {
      const value = item[key];
      map.set(value, (map.get(value) ?? 0) + 1);
      return map;
    }, new Map())].sort(([left], [right]) =>
      String(left).localeCompare(String(right)),
    ),
  );

const check = (checks, id, condition, actual, expected) => {
  checks.push({
    id,
    status: condition ? "PASS" : "FAIL",
    actual,
    expected,
  });
};

export const validateCatalogs = (repository) => {
  const catalogs = readCatalogs(repository);
  const checks = [];
  const { world, pacers, cards, gear, monthly, forms, screens } = catalogs;

  check(checks, "CONTENT_CONTINENTS_12", uniqueCount(world.routes.map((x) => x.continent_id)) === 12, uniqueCount(world.routes.map((x) => x.continent_id)), 12);
  check(checks, "CONTENT_REGIONS_192", uniqueCount(world.routes.map((x) => x.region_id)) === 192, uniqueCount(world.routes.map((x) => x.region_id)), 192);
  check(checks, "CONTENT_ROUTES_2304", world.routes.length === 2304, world.routes.length, 2304);
  check(checks, "CONTENT_ROUTE_IDS_UNIQUE", uniqueCount(world.routes.map((x) => x.route_id)) === 2304, uniqueCount(world.routes.map((x) => x.route_id)), 2304);
  check(checks, "CONTENT_ROUTE_NAMES_UNIQUE", uniqueCount(world.routes.map((x) => x.route_name_ko)) === 2304, uniqueCount(world.routes.map((x) => x.route_name_ko)), 2304);
  check(checks, "CONTENT_ARCHITECTURE_UNIQUE", uniqueCount(world.routes.map((x) => x.architecture_signature)) === 2304, uniqueCount(world.routes.map((x) => x.architecture_signature)), 2304);
  check(checks, "CONTENT_RESTORATION_BEATS_11520", world.routes.reduce((sum, x) => sum + x.restoration_phases, 0) === 11520, world.routes.reduce((sum, x) => sum + x.restoration_phases, 0), 11520);
  check(checks, "CONTENT_MASTERY_STAMPS_6912", world.routes.reduce((sum, x) => sum + x.mastery_stamps, 0) === 6912, world.routes.reduce((sum, x) => sum + x.mastery_stamps, 0), 6912);
  check(checks, "CONTENT_REGION_CHAMPIONS_192", world.routes.filter((x) => x.route_type === "REGION_CHAMPION").length === 192, world.routes.filter((x) => x.route_type === "REGION_CHAMPION").length, 192);

  const forbiddenScope = /\b(trail|hiking|cycling|climbing|elevation|combat|battle|enemy|monster|weapon|damage|boss\s*hp|hp\s*bar)\b/iu;
  const forbiddenWorld = world.routes.filter((route) =>
    forbiddenScope.test(JSON.stringify(route)),
  );
  check(checks, "CONTENT_RUNNING_ONLY", forbiddenWorld.length === 0, forbiddenWorld.map((x) => x.route_id), []);

  check(checks, "MY_RUNNER_FORMS_12", forms.forms.length === 12, forms.forms.length, 12);
  check(checks, "MY_RUNNER_FORM_IDS_UNIQUE", uniqueCount(forms.forms.map((x) => x.form_id)) === 12, uniqueCount(forms.forms.map((x) => x.form_id)), 12);

  check(checks, "PACERS_60", pacers.pacers.length === 60, pacers.pacers.length, 60);
  for (const [id, key] of [
    ["PACER_IDS_UNIQUE", "pacer_id"],
    ["PACER_NAMES_UNIQUE", "name_ko"],
    ["PACER_HAIR_UNIQUE", "hair_id"],
    ["PACER_FACE_UNIQUE", "face_id"],
    ["PACER_OUTFIT_UNIQUE", "outfit_id"],
    ["PACER_MODEL_UNIQUE", "model_variant"],
    ["PACER_ANIMATION_UNIQUE", "animation_variant"],
  ]) {
    check(checks, id, uniqueCount(pacers.pacers.map((x) => x[key])) === 60, uniqueCount(pacers.pacers.map((x) => x[key])), 60);
  }
  check(checks, "PACERS_FULL_3D", pacers.pacers.every((x) => x.full_3d_model_required && x.not_recolor_only), pacers.pacers.filter((x) => !x.full_3d_model_required || !x.not_recolor_only).map((x) => x.pacer_id), []);

  check(checks, "CARDS_360", cards.cards.length === 360, cards.cards.length, 360);
  check(checks, "CARD_IDS_UNIQUE", uniqueCount(cards.cards.map((x) => x.card_id)) === 360, uniqueCount(cards.cards.map((x) => x.card_id)), 360);
  const categoryCounts = countBy(cards.cards, "category");
  const expectedCategories = { AURA: 48, GEAR_BLUEPRINT: 72, MEMORY: 60, PACER: 60, TECHNIQUE: 120 };
  check(checks, "CARD_CATEGORY_COUNTS", JSON.stringify(categoryCounts) === JSON.stringify(expectedCategories), categoryCounts, expectedCategories);
  check(checks, "CARD_DIRECT_DRAW_MAX_SSR", cards.direct_draw_max_rarity === "SSR", cards.direct_draw_max_rarity, "SSR");
  check(checks, "CARD_NO_DIRECT_CROWN", cards.cards.every((x) => x.rarity !== "CROWN" && x.direct_crown_draw !== true), cards.cards.filter((x) => x.rarity === "CROWN" || x.direct_crown_draw === true).map((x) => x.card_id), []);

  check(checks, "GEAR_192", gear.gear.length === 192, gear.gear.length, 192);
  check(checks, "GEAR_IDS_UNIQUE", uniqueCount(gear.gear.map((x) => x.gear_id)) === 192, uniqueCount(gear.gear.map((x) => x.gear_id)), 192);
  check(checks, "GEAR_SLOTS_12", uniqueCount(gear.gear.map((x) => x.slot)) === 12, uniqueCount(gear.gear.map((x) => x.slot)), 12);
  check(checks, "GEAR_SETS_16", uniqueCount(gear.gear.map((x) => x.set_id)) === 16, uniqueCount(gear.gear.map((x) => x.set_id)), 16);
  check(checks, "GEAR_VISIBLE_NONCOMBAT", gear.gear.every((x) => x.visible_on_runner && !x.combat_stat && !x.real_brand && !x.affects_real_record_ranking), gear.gear.filter((x) => !x.visible_on_runner || x.combat_stat || x.real_brand || x.affects_real_record_ranking).map((x) => x.gear_id), []);

  check(checks, "MONTHLY_BASELINE_ZERO", monthly.baseline_km === 0, monthly.baseline_km, 0);
  check(checks, "MONTHLY_CHECKPOINTS_120", monthly.checkpoints.length === 120, monthly.checkpoints.length, 120);
  check(checks, "MONTHLY_IDS_UNIQUE", uniqueCount(monthly.checkpoints.map((x) => x.checkpoint_id)) === 120, uniqueCount(monthly.checkpoints.map((x) => x.checkpoint_id)), 120);
  check(checks, "MONTHLY_KM_UNIQUE", uniqueCount(monthly.checkpoints.map((x) => x.km)) === 120, uniqueCount(monthly.checkpoints.map((x) => x.km)), 120);
  check(checks, "MONTHLY_ASCENDING", monthly.checkpoints.every((x, index, all) => index === 0 || x.km > all[index - 1].km), monthly.checkpoints.map((x) => x.km), "strict ascending");
  check(checks, "MONTHLY_FINAL_1000", monthly.checkpoints.at(-1)?.km === 1000 && monthly.final_km === 1000, { declared: monthly.final_km, last: monthly.checkpoints.at(-1)?.km }, { declared: 1000, last: 1000 });
  check(checks, "MONTHLY_ONE_FINAL", monthly.checkpoints.filter((x) => x.is_final).length === 1 && monthly.checkpoints.at(-1)?.is_final === true, monthly.checkpoints.filter((x) => x.is_final).map((x) => x.checkpoint_id), ["MA120"]);
  check(checks, "MONTHLY_NO_ABOVE_1000", monthly.checkpoints.every((x) => x.km <= 1000), monthly.checkpoints.filter((x) => x.km > 1000).map((x) => x.km), []);

  check(checks, "SCREENS_21", screens.screens.length === 21, screens.screens.length, 21);
  check(checks, "HOME_FIRST_SCREEN", screens.screens[0]?.name === "LIVE_JOURNEY_HOME", screens.screens[0]?.name, "LIVE_JOURNEY_HOME");
  check(checks, "BOTTOM_NAV_RUN_CENTER", JSON.stringify(screens.bottom_nav) === JSON.stringify(["홈", "러너", "RUN", "월드", "크루"]), screens.bottom_nav, ["홈", "러너", "RUN", "월드", "크루"]);

  const manifestPath = join(repository, "content/v11/launch-manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const hashMismatches = Object.entries(manifest.hashes).filter(
    ([name, expected]) =>
      sha256(readFileSync(join(repository, "content/v11/catalogs", name))) !== expected,
  );
  check(checks, "CONTENT_MANIFEST_HASHES", hashMismatches.length === 0, hashMismatches, []);

  const unityContentRoot = join(
    repository,
    "client/unity/Assets/StreamingAssets/RunningUpV11",
  );
  const packagedMismatches = Object.entries(manifest.hashes).filter(
    ([name, expected]) => {
      const packagedPath = join(unityContentRoot, "catalogs", name);
      return !existsSync(packagedPath) ||
        sha256(readFileSync(packagedPath)) !== expected;
    },
  );
  check(
    checks,
    "FULL_SIDELOAD_CONTENT_HASHES",
    packagedMismatches.length === 0,
    packagedMismatches,
    [],
  );

  return { catalogs, checks };
};

const walkFiles = (root) => {
  if (!existsSync(root)) return [];
  const files = [];
  const visit = (path) => {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      if ([".git", "Library", "Temp", "Logs", "node_modules", "build"].includes(entry.name)) {
        continue;
      }
      const child = join(path, entry.name);
      if (entry.isDirectory()) visit(child);
      else files.push(child);
    }
  };
  visit(root);
  return files;
};

export const scanActiveLegacy = (repository) => {
  const roots = [
    "client/unity/Assets/RunningUp/Core",
    "client/unity/Assets/RunningUp/LiveJourney",
    "client/unity/Assets/RunningUp/MyRunner",
    "client/unity/Assets/RunningUp/UI",
    "client/unity/Assets/RunningUp/Generated",
    "client/unity/Assets/Plugins/Android",
    "native",
    "backend/supabase/migrations",
    "backend/supabase/functions",
    "content/v11",
  ];
  const extensions = /\.(?:cs|java|kt|kts|xml|gradle|sql|json|csv|yaml|yml|asset|prefab|unity|shader)$/i;
  const pattern = /\b(combat|battle|enemy|monster|weapon|damage|boss(?:hp)?|attackpower|defensepower|livebattlehome|autobattle)\b/giu;
  const hits = [];
  for (const root of roots) {
    for (const path of walkFiles(join(repository, root))) {
      if (!extensions.test(path)) continue;
      const content = readFileSync(path, "utf8");
      const tokens = [...content.matchAll(pattern)].map((match) => match[0].toLowerCase());
      if (tokens.length > 0) {
        hits.push({
          path: relative(repository, path),
          count: tokens.length,
          tokens: [...new Set(tokens)].sort(),
        });
      }
    }
  }
  const forbiddenArchives = walkFiles(repository)
    .map((path) => relative(repository, path).split("/"))
    .flat()
    .filter((segment) =>
      ["legacy_backup", "v8_old", "v9_old", "v10_old", "deprecated_copy", "old_project_copy"].includes(segment.toLowerCase()),
    );
  return { hits, forbiddenArchives };
};

export const parseSimpleCsv = (content) => {
  const lines = content.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) =>
    Object.fromEntries(line.split(",").map((value, index) => [headers[index], value])),
  );
};

export const repositoryRoot = () =>
  resolve(new URL("../..", import.meta.url).pathname);
