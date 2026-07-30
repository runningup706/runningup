// 자산 라이선스 근거 검사가 실제 위험 사례를 잡는지 검증한다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { evaluate, parseEvidence } from "../art-pipeline/validate-license-evidence.mjs";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const sources = JSON.parse(
  readFileSync(join(repositoryRoot, "content/v11/art/free-asset-sources.json"), "utf8"),
);

const asset = (id) => ({ id, path: `Vendor/${id}`, fileCount: 12 });

const completeRecord = (id, license, extra = "") => `
## ${id}
- asset: ${id.split("/")[1]}
- version: 1.0.0
- publisher: ${id.split("/")[0]}
- license: ${license}
- source: https://example.com/${id}
- obtained: 2026-07-30
${extra}`;

test("a complete CC0 record passes", () => {
  const report = evaluate({
    assets: [asset("Quaternius/UltimateModularCity")],
    entries: parseEvidence(completeRecord("Quaternius/UltimateModularCity", "CC0-1.0")),
    sources,
  });
  assert.deepEqual(report.problems, []);
  assert.equal(report.status, "LICENSE_EVIDENCE_COMPLETE");
});

// 무료 경로에서 가장 현실적인 사고다. 같은 사이트에 CC0와 NC가 섞여 있다.
test("a NonCommercial asset is rejected outright", () => {
  const report = evaluate({
    assets: [asset("SomeArtist/NeonCityPack")],
    entries: parseEvidence(completeRecord("SomeArtist/NeonCityPack", "CC-BY-NC-4.0")),
    sources,
  });
  const kinds = report.problems.map((problem) => problem.kind);
  assert.ok(kinds.includes("FORBIDDEN_LICENSE"));
  assert.equal(report.status, "LICENSE_EVIDENCE_INCOMPLETE");
});

test("NoDerivatives is rejected because retargeting is a derivative", () => {
  const report = evaluate({
    assets: [asset("SomeArtist/RunCycle")],
    entries: parseEvidence(completeRecord("SomeArtist/RunCycle", "CC-BY-ND-4.0")),
    sources,
  });
  assert.ok(report.problems.some((problem) => problem.kind === "FORBIDDEN_LICENSE"));
});

// 이전 게이트는 파일 존재만 봤다. 자산을 넣고 기록을 안 쓰면 통과했다.
test("an imported asset with no record at all is caught", () => {
  const report = evaluate({
    assets: [asset("BoZo/ModularAnimeCharacters")],
    entries: [],
    sources,
  });
  assert.equal(report.problems.length, 1);
  assert.equal(report.problems[0].kind, "MISSING_LICENSE_RECORD");
});

test("a record missing required fields is caught field by field", () => {
  const report = evaluate({
    assets: [asset("Kenney/CityKit")],
    entries: parseEvidence("## Kenney/CityKit\n- asset: CityKit\n- license: CC0-1.0\n"),
    sources,
  });
  const missing = report.problems
    .filter((problem) => problem.kind === "INCOMPLETE_LICENSE_RECORD")
    .map((problem) => problem.detail);
  assert.equal(missing.length, 4, "version, publisher, source, obtained should all be missing");
});

test("CC-BY requires an in-app attribution line", () => {
  const withoutAttribution = evaluate({
    assets: [asset("Artist/StreetProps")],
    entries: parseEvidence(completeRecord("Artist/StreetProps", "CC-BY-4.0")),
    sources,
  });
  assert.ok(
    withoutAttribution.problems.some((problem) => problem.kind === "MISSING_ATTRIBUTION"),
  );

  const withAttribution = evaluate({
    assets: [asset("Artist/StreetProps")],
    entries: parseEvidence(
      completeRecord("Artist/StreetProps", "CC-BY-4.0", "- attribution: Street Props by Artist (CC BY 4.0)"),
    ),
    sources,
  });
  assert.deepEqual(withAttribution.problems, []);
});

test("an unknown licence is not silently accepted", () => {
  const report = evaluate({
    assets: [asset("Somewhere/MysteryPack")],
    entries: parseEvidence(completeRecord("Somewhere/MysteryPack", "CUSTOM-TERMS")),
    sources,
  });
  assert.ok(report.problems.some((problem) => problem.kind === "UNRECOGNISED_LICENSE"));
});

// 정본은 영수증 번호와 계정 정보를 저장소에 남기지 말라고 못박고 있다.
test("receipt numbers and account details are refused", () => {
  const report = evaluate({
    assets: [asset("BoZo/ModularAnimeCharacters")],
    entries: parseEvidence(
      completeRecord("BoZo/ModularAnimeCharacters", "UNITY-ASSET-STORE-STANDARD-EULA",
        "- receipt: 1234-5678\n- purchaser: buyer@example.com"),
    ),
    sources,
  });
  const sensitive = report.problems.filter((problem) => problem.kind === "SENSITIVE_FIELD");
  assert.ok(sensitive.length >= 2, "both the receipt number and the account should be refused");
});

test("a record with no matching asset folder is reported as an orphan", () => {
  const report = evaluate({
    assets: [],
    entries: parseEvidence(completeRecord("Ghost/RemovedPack", "CC0-1.0")),
    sources,
  });
  assert.ok(report.problems.some((problem) => problem.kind === "ORPHAN_LICENSE_RECORD"));
});

// 아직 아무 자산도 없는 지금 상태는 실패가 아니라 대기다.
test("no vendor assets yet is a distinct, non-failing state", () => {
  const report = evaluate({ assets: [], entries: [], sources });
  assert.equal(report.status, "NO_VENDOR_ASSETS_YET");
  assert.deepEqual(report.problems, []);
});

test("the source registry never allows a NonCommercial or NoDerivatives licence", () => {
  for (const entry of sources.allowed_licenses) {
    // `-NC`/`-ND`를 라이선스 식별자 조각으로만 본다. STANDARD 안의 ND 같은
    // 우연한 일치를 잡으면 안 된다.
    assert.ok(
      !/(^|-)(NC|ND)(-|$)/.test(entry.id),
      `${entry.id} must not be on the allow list`,
    );
    assert.equal(
      entry.commercial,
      true,
      `${entry.id} is on the allow list so it must permit commercial use`,
    );
  }
  for (const id of ["CC-BY-NC-4.0", "CC-BY-ND-4.0", "UNKNOWN"]) {
    assert.ok(
      sources.rejected_licenses.some((item) => item.id === id),
      `${id} must be explicitly rejected`,
    );
  }
});

// 무료 경로의 한계를 문서가 아니라 데이터로 남긴다.
test("the registry states the free character gap honestly", () => {
  assert.equal(sources.known_gap.role, "my_runner_character");
  assert.ok(sources.known_gap.statement.length > 0);
  assert.ok(sources.known_gap.paid_alternative.includes("BoZo"));
  const character = sources.vetted_sources.find(
    (item) => item.role === "my_runner_character",
  );
  assert.equal(
    character.confidence,
    "low",
    "no free character source may be advertised as high confidence",
  );
});
