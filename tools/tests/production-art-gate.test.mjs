// 정식 아트가 기능 프로토타입과 섞이지 않고 사람의 90/85 평가 전에 차단되는지 검증한다.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repository = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const unityProject = path.join(repository, "client/unity");

async function text(relativePath) {
  return readFile(path.join(repository, relativePath), "utf8");
}

test("production art manifest keeps the 90 average and 85 category floor", async () => {
  const manifest = JSON.parse(
    await text(
      "client/unity/Assets/RunningUp/ProductionArt/Manifest/production-art-manifest.json",
    ),
  );
  assert.equal(manifest.minimumAverageScore, 90);
  assert.equal(manifest.minimumCategoryScore, 85);
  assert.equal(manifest.productionScene.includes("ProductionArt/Scenes/"), true);
  assert.equal(manifest.productionScene.includes("LiveJourneyHome.unity"), false);
  assert.equal(
    manifest.comparisonCapture,
    "artifacts/visual/production-art/target-vs-unity-2160x1920.png",
  );
  assert.deepEqual(manifest.prohibitedAssetRoots, [
    "Assets/RunningUp/Generated",
    "Assets/RunningUp/ThirdParty/KayKitAdventurers",
  ]);
  assert.equal(manifest.requiredRunningStates.length, 9);
});

test("full sideload invokes the production gate while smoke remains prototype-only", async () => {
  const builder = await text(
    "client/unity/Assets/RunningUp/Editor/V11AndroidBuilder.cs",
  );
  assert.match(
    builder,
    /BuildFullSideload\(\)[\s\S]*V11ProductionArtGate\.ValidateOrThrow\(\)/,
  );
  assert.match(
    builder,
    /BuildSmoke\(\)[\s\S]*FunctionalPrototypeScenePath[\s\S]*true\)/,
  );
  assert.doesNotMatch(
    builder,
    /BuildFullSideload\(\)[\s\S]*FunctionalPrototypeScenePath/,
  );
});

test("all Android builds clean stale cache and verify compact APK layout", async () => {
  const builder = await text(
    "client/unity/Assets/RunningUp/Editor/V11AndroidBuilder.cs",
  );
  const verifier = await text("tools/build/verify-android-smoke.sh");
  const layoutVerifier = await text(
    "tools/build/verify-apk-zip-layout.mjs",
  );

  assert.match(builder, /options = options \| BuildOptions\.CleanBuildCache/);
  assert.match(verifier, /verify-apk-zip-layout\.mjs/);
  assert.match(layoutVerifier, /maximumAllowedGap = 100 \* 1024/);
});

test("functional scene receives an explicit prototype-only marker", async () => {
  const builder = await text(
    "client/unity/Assets/RunningUp/Editor/V11ProjectBuilder.cs",
  );
  const marker = await text(
    "client/unity/Assets/RunningUp/ProductionArt/FunctionalPrototypeOnlyMarker.cs",
  );
  assert.match(builder, /AddComponent<FunctionalPrototypeOnlyMarker>/);
  assert.match(marker, /FUNCTIONAL_PROTOTYPE_ONLY/);
});

test("Unity packages are locked to the versions validated by the editor", async () => {
  const manifest = JSON.parse(
    await readFile(path.join(unityProject, "Packages/manifest.json"), "utf8"),
  );
  const lock = JSON.parse(
    await readFile(path.join(unityProject, "Packages/packages-lock.json"), "utf8"),
  );
  const expected = {
    "com.unity.render-pipelines.universal": "17.3.0",
    "com.unity.shadergraph": "17.3.0",
    "com.unity.cinemachine": "3.1.7",
    "com.unity.animation.rigging": "1.4.1",
  };
  for (const [name, version] of Object.entries(expected)) {
    assert.equal(manifest.dependencies[name], version);
    assert.equal(lock.dependencies[name].version, version);
    assert.equal(lock.dependencies[name].depth, 0);
  }
});

test("Android plugin uses AGP 9 built-in Kotlin and merges the capability manifest", async () => {
  const gradle = await text(
    "client/unity/Assets/Plugins/Android/RunningUpV11.androidlib/build.gradle",
  );
  const properties = await text(
    "client/unity/Assets/Plugins/Android/gradleTemplate.properties",
  );
  assert.doesNotMatch(gradle, /kotlin-android|kotlin-gradle-plugin/);
  assert.match(gradle, /compileOnly files\('\.\.\/libs\/unity-classes\.jar'\)/);
  assert.match(gradle, /main\.manifest\.srcFile 'AndroidManifest\.xml'/);
  assert.match(properties, /android\.builtInKotlin=true/);
});

test("direct GPS service survives process recreation without losing the active track", async () => {
  const service = await text(
    "client/unity/Assets/Plugins/Android/RunningUpV11.androidlib/src/main/kotlin/kr/robom/runningup/v11/DirectRunService.kt",
  );
  assert.match(service, /return START_STICKY/);
  assert.match(service, /getBoolean\(activeKey, false\)/);
  assert.match(service, /FileWriter\(outputFile, true\)/);
  assert.match(service, /if \(outputFile == null\)[\s\S]*getString\(pathKey, null\)/);
  assert.match(service, /putBoolean\(activeKey, false\)[\s\S]*remove\(pathKey\)/);
});
