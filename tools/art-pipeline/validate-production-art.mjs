// Production Art가 실제 라이선스 자산과 사람의 시각 평가를 갖췄는지 대량 생성 전에 차단 검사한다.
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(scriptDirectory, "../..");
const unityProject = path.join(repository, "client/unity");
const manifestPath = path.join(
  unityProject,
  "Assets/RunningUp/ProductionArt/Manifest/production-art-manifest.json",
);
const requireReady = process.argv.includes("--require-ready");

async function exists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveContractPath(contractPath) {
  if (contractPath.startsWith("Assets/")) {
    return path.join(unityProject, contractPath);
  }
  return path.join(repository, contractPath);
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const packageLock = JSON.parse(
  await readFile(path.join(unityProject, "Packages/packages-lock.json"), "utf8"),
);
const packageChecks = manifest.requiredPackages.map(({ name, version }) => ({
  name,
  expectedVersion: version,
  resolvedVersion: packageLock.dependencies?.[name]?.version ?? null,
  exact: packageLock.dependencies?.[name]?.version === version,
}));
const assetChecks = await Promise.all(
  manifest.requiredAssets.map(async ({ role, path: assetPath }) => ({
    role,
    path: assetPath,
    exists: await exists(resolveContractPath(assetPath)),
  })),
);

const productionScenePath = resolveContractPath(manifest.productionScene);
const productionSceneExists = await exists(productionScenePath);
const textViolations = [];
if (productionSceneExists) {
  const sceneText = await readFile(productionScenePath, "utf8");
  for (const token of manifest.prohibitedNameTokens) {
    if (sceneText.toLowerCase().includes(token.toLowerCase())) {
      textViolations.push(`scene-name-token:${token}`);
    }
  }
  for (const root of manifest.prohibitedAssetRoots) {
    if (sceneText.includes(root)) {
      textViolations.push(`scene-asset-root:${root}`);
    }
  }
}

const scorecardPath = resolveContractPath(manifest.humanQaScorecard);
let scorecard = null;
if (await exists(scorecardPath)) {
  scorecard = JSON.parse(await readFile(scorecardPath, "utf8"));
}
const categories = scorecard?.categories ?? {};
const categoryEntries = Object.entries(categories);
const categoryScores = categoryEntries.map(([, value]) => Number(value));
const categoriesComplete =
  categoryEntries.length === 7 &&
  categoryScores.every((value) => Number.isFinite(value) && value >= 0 && value <= 100);
const categoryMinimum =
  categoriesComplete && Math.min(...categoryScores) >= manifest.minimumCategoryScore;
const computedAverage = categoriesComplete
  ? categoryScores.reduce((sum, value) => sum + value, 0) / categoryScores.length
  : null;
const averagePass =
  computedAverage !== null && computedAverage >= manifest.minimumAverageScore;
const humanQaPass =
  scorecard?.status === "HUMAN_QA_PASS" &&
  scorecard?.aestheticAutoPass === false &&
  typeof scorecard?.evaluator === "string" &&
  scorecard.evaluator.trim().length > 0 &&
  scorecard?.targetWidth === manifest.targetWidth &&
  scorecard?.targetHeight === manifest.targetHeight &&
  scorecard?.primitivePlaceholderCount === 0 &&
  scorecard?.primitivePlaceholderVerified === true &&
  categoryMinimum &&
  averagePass;

async function inspectPng(capturePath, expectedWidth, expectedHeight) {
  const filePath = resolveContractPath(capturePath);
  if (!(await exists(filePath))) {
    return {
      path: capturePath,
      exists: false,
      width: null,
      height: null,
      expectedWidth,
      expectedHeight,
      dimensionsExact: false,
    };
  }

  const header = await readFile(filePath);
  const pngSignature = "89504e470d0a1a0a";
  const validPng =
    header.length >= 24 &&
    header.subarray(0, 8).toString("hex") === pngSignature &&
    header.subarray(12, 16).toString("ascii") === "IHDR";
  const width = validPng ? header.readUInt32BE(16) : null;
  const height = validPng ? header.readUInt32BE(20) : null;
  return {
    path: capturePath,
    exists: true,
    width,
    height,
    expectedWidth,
    expectedHeight,
    dimensionsExact: width === expectedWidth && height === expectedHeight,
  };
}

const captureChecks = await Promise.all([
  inspectPng(manifest.targetCapture, manifest.targetWidth, manifest.targetHeight),
  inspectPng(manifest.productionCapture, manifest.targetWidth, manifest.targetHeight),
  inspectPng(
    manifest.comparisonCapture,
    manifest.targetWidth * 2,
    manifest.targetHeight,
  ),
]);
const toolingPass = packageChecks.every((item) => item.exact);
const assetsPresent = assetChecks.every((item) => item.exists);
const capturesPresent = captureChecks.every(
  (item) => item.exists && item.dimensionsExact,
);
const automatedGatePass =
  toolingPass &&
  productionSceneExists &&
  assetsPresent &&
  textViolations.length === 0;
const massGenerationAllowed =
  automatedGatePass &&
  capturesPresent &&
  humanQaPass &&
  manifest.status === "HUMAN_QA_PASS";

const report = {
  schemaVersion: "1.0.0",
  checkedAt: new Date().toISOString(),
  manifestStatus: manifest.status,
  pipelineStatus: toolingPass ? "PASS" : "FAIL",
  assetStatus: assetsPresent ? "PRESENT" : "BLOCKED_ART_ASSET",
  productionScene: {
    path: manifest.productionScene,
    exists: productionSceneExists,
  },
  packageChecks,
  assetChecks,
  captureChecks,
  textViolations,
  humanQa: {
    scorecardPath: manifest.humanQaScorecard,
    scorecardStatus: scorecard?.status ?? "MISSING",
    evaluator: scorecard?.evaluator || null,
    categoryScores: categories,
    computedAverage,
    minimumCategoryRequired: manifest.minimumCategoryScore,
    averageRequired: manifest.minimumAverageScore,
    pass: humanQaPass,
  },
  automatedGatePass,
  massGenerationAllowed,
  finalStatus: massGenerationAllowed
    ? "PRODUCTION_ART_VERTICAL_SLICE_PASS"
    : assetsPresent
      ? "BLOCKED_HUMAN_ART_QA"
      : "BLOCKED_ART_ASSET",
};

const outputDirectory = path.join(repository, "artifacts/validation");
await mkdir(outputDirectory, { recursive: true });
const outputPath = path.join(outputDirectory, "production-art-gate.json");
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

if (!toolingPass || (requireReady && !massGenerationAllowed)) {
  process.exitCode = requireReady && !massGenerationAllowed ? 2 : 1;
}
