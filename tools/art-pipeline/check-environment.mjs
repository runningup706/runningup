// Production Art 인입에 필요한 Unity 패키지와 DCC 설치 상태를 재현 가능하게 점검한다.
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(scriptDirectory, "../..");
const workspace = path.resolve(repository, "..");
const unityProject = path.join(repository, "client/unity");
const expectedPackages = new Map([
  ["com.unity.render-pipelines.universal", "17.3.0"],
  ["com.unity.shadergraph", "17.3.0"],
  ["com.unity.cinemachine", "3.1.7"],
  ["com.unity.animation.rigging", "1.4.1"],
]);

async function exists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function commandPath(command) {
  try {
    return execFileSync("/usr/bin/which", [command], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

const projectVersionText = await readFile(
  path.join(unityProject, "ProjectSettings/ProjectVersion.txt"),
  "utf8",
);
const unityVersion = projectVersionText.match(/^m_EditorVersion:\s*(.+)$/m)?.[1] ?? "";
const lock = JSON.parse(
  await readFile(path.join(unityProject, "Packages/packages-lock.json"), "utf8"),
);
const packageChecks = [...expectedPackages].map(([name, expectedVersion]) => {
  const resolved = lock.dependencies?.[name];
  return {
    name,
    expectedVersion,
    resolvedVersion: resolved?.version ?? null,
    source: resolved?.source ?? null,
    exact: resolved?.version === expectedVersion,
  };
});

const unityCandidates = [
  path.join(
    workspace,
    "work/toolchains/unity-editors",
    unityVersion,
    "Unity.app/Contents/MacOS/Unity",
  ),
  `/Applications/Unity/Hub/Editor/${unityVersion}/Unity.app/Contents/MacOS/Unity`,
];
const unityBinary = (
  await Promise.all(
    unityCandidates.map(async (candidate) => ((await exists(candidate)) ? candidate : "")),
  )
).find(Boolean) ?? "";

const blenderCandidates = [
  commandPath("blender"),
  "/Applications/Blender.app/Contents/MacOS/Blender",
  path.join(process.env.USERPROFILE ?? "", "Blender Foundation/Blender/blender.exe"),
].filter(Boolean);
const blenderBinary = (
  await Promise.all(
    blenderCandidates.map(async (candidate) => ((await exists(candidate)) ? candidate : "")),
  )
).find(Boolean) ?? "";

const packageExact = packageChecks.every((item) => item.exact);
const report = {
  schemaVersion: "1.0.0",
  checkedAt: new Date().toISOString(),
  repository,
  unity: {
    version: unityVersion,
    binary: unityBinary || null,
    status: unityBinary ? "PASS" : "INSTALL_REQUIRED",
  },
  packages: packageChecks,
  blender: {
    binary: blenderBinary || null,
    status: blenderBinary ? "PASS" : "INSTALL_REQUIRED",
    automationEnabled: Boolean(blenderBinary),
    note: blenderBinary
      ? "Blender Python automation may run."
      : "Blender is not installed. No Blender-authored production mesh is claimed.",
  },
  pipelineStatus:
    unityBinary && packageExact ? "PASS_WITH_BLENDER_OPTIONAL_BLOCKER" : "FAIL",
};

const outputDirectory = path.join(repository, "artifacts/validation");
await mkdir(outputDirectory, { recursive: true });
const outputPath = path.join(outputDirectory, "art-pipeline-environment.json");
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

if (!unityBinary || !packageExact) {
  process.exitCode = 1;
}
