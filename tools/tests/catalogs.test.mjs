// V11 전체 출시 카탈로그의 수량과 고유성 계약을 회귀 테스트한다.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import {
  countBy,
  readCatalogs,
  repositoryRoot,
  scanActiveLegacy,
  sha256,
  validateCatalogs,
} from "../lib/v11-catalog.mjs";

const repository = repositoryRoot();

test("all V11 catalog checks pass", () => {
  const { checks } = validateCatalogs(repository);
  assert.deepEqual(
    checks.filter((item) => item.status !== "PASS"),
    [],
  );
});

test("world is exactly 12 by 16 by 12 with 192 champion runs", () => {
  const { world } = readCatalogs(repository);
  assert.equal(world.routes.length, 12 * 16 * 12);
  assert.deepEqual(countBy(world.routes, "continent_id"), {
    C01: 192,
    C02: 192,
    C03: 192,
    C04: 192,
    C05: 192,
    C06: 192,
    C07: 192,
    C08: 192,
    C09: 192,
    C10: 192,
    C11: 192,
    C12: 192,
  });
  assert.equal(
    world.routes.filter((route) => route.route_type === "REGION_CHAMPION").length,
    192,
  );
});

test("120 monthly checkpoints finish once at 1000km", () => {
  const { monthly } = readCatalogs(repository);
  assert.equal(monthly.checkpoints.length, 120);
  assert.equal(monthly.checkpoints.at(-1).km, 1000);
  assert.deepEqual(
    monthly.checkpoints.filter((checkpoint) => checkpoint.is_final).map((x) => x.checkpoint_id),
    ["MA120"],
  );
  assert.equal(monthly.checkpoints.some((checkpoint) => checkpoint.km > 1000), false);
});

test("60 Pacers have distinct model, face, hair, outfit and gait assets", () => {
  const { pacers } = readCatalogs(repository);
  for (const key of [
    "pacer_id",
    "name_ko",
    "hair_id",
    "face_id",
    "outfit_id",
    "model_variant",
    "animation_variant",
  ]) {
    assert.equal(new Set(pacers.pacers.map((pacer) => pacer[key])).size, 60, key);
  }
});

test("content refinement is deterministic", () => {
  const manifestPath = join(repository, "content/v11/launch-manifest.json");
  const before = sha256(readFileSync(manifestPath));
  execFileSync(process.execPath, ["tools/content-factory/refine-v11.mjs"], {
    cwd: repository,
    stdio: "ignore",
  });
  const after = sha256(readFileSync(manifestPath));
  assert.equal(after, before);
});

test("active V11 runtime contains no legacy direction", () => {
  assert.deepEqual(scanActiveLegacy(repository), {
    hits: [],
    forbiddenArchives: [],
  });
});

