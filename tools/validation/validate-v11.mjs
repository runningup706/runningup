// V11 Gate의 정본 수량과 활성 런타임 금지 회귀를 한 번에 검증한다.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseSimpleCsv,
  repositoryRoot,
  scanActiveLegacy,
  validateCatalogs,
} from "../lib/v11-catalog.mjs";

const repository = repositoryRoot();
const { checks } = validateCatalogs(repository);
const legacy = scanActiveLegacy(repository);
checks.push({
  id: "ACTIVE_LEGACY_RUNTIME_ZERO",
  status: legacy.hits.length === 0 ? "PASS" : "FAIL",
  actual: legacy.hits,
  expected: [],
});
checks.push({
  id: "FORBIDDEN_ARCHIVE_ZERO",
  status: legacy.forbiddenArchives.length === 0 ? "PASS" : "FAIL",
  actual: legacy.forbiddenArchives,
  expected: [],
});

const progressPolicy = readFileSync(
  join(repository, "requirements/v11/REAL_RUN_PROGRESS_POLICY_V11.yaml"),
  "utf8",
);
const verifiedMinimum = Number(
  progressPolicy.match(/verified_running_min_percent:\s*(\d+)/)?.[1],
);
const idleMaximum = Number(
  progressPolicy.match(/idle_drift_max_percent:\s*(\d+)/)?.[1],
);
const manualMaximum = Number(
  progressPolicy.match(/manual_menu_play_max_percent:\s*(\d+)/)?.[1],
);
checks.push({
  id: "VERIFIED_RUNNING_MIN_85",
  status: verifiedMinimum >= 85 ? "PASS" : "FAIL",
  actual: verifiedMinimum,
  expected: ">=85",
});
checks.push({
  id: "IDLE_MAX_10",
  status: idleMaximum <= 10 ? "PASS" : "FAIL",
  actual: idleMaximum,
  expected: "<=10",
});
checks.push({
  id: "MANUAL_MAX_5",
  status: manualMaximum <= 5 ? "PASS" : "FAIL",
  actual: manualMaximum,
  expected: "<=5",
});
checks.push({
  id: "DAILY_CONTRACT_ONE",
  status: /bonus_contracts_per_local_day:\s*1\b/.test(progressPolicy) ? "PASS" : "FAIL",
  actual: progressPolicy.match(/bonus_contracts_per_local_day:\s*(\d+)/)?.[1],
  expected: "1",
});
checks.push({
  id: "ADDITIONAL_RUN_BASE_REWARD",
  status: /additional_runs_keep_base_rewards:\s*true\b/.test(progressPolicy) ? "PASS" : "FAIL",
  actual: /additional_runs_keep_base_rewards:\s*true\b/.test(progressPolicy),
  expected: true,
});

const integrationRows = parseSimpleCsv(
  readFileSync(
    join(repository, "requirements/v11/ACTIVITY_INTEGRATION_MATRIX_V11.csv"),
    "utf8",
  ),
);
const integrationStatus = Object.fromEntries(
  integrationRows.map((row) => [row.source, row.launch_status]),
);
checks.push({
  id: "ANDROID_P0_ACTIVITY_SOURCES",
  status:
    integrationStatus["RunningUp Direct GPS"] === "P0_ACTIVE" &&
    integrationStatus["Health Connect"] === "P0_ACTIVE" &&
    integrationStatus["FIT/GPX/TCX Import"] === "P0_ACTIVE"
      ? "PASS"
      : "FAIL",
  actual: integrationStatus,
  expected: "GPS, Health Connect and file import P0_ACTIVE",
});
checks.push({
  id: "APPROVAL_CAPABILITY_BOUNDARIES",
  status:
    integrationStatus["Samsung Health Data SDK"]?.startsWith("FEATURE_FLAG_AFTER_") &&
    integrationStatus["Garmin Activity API"]?.startsWith("FEATURE_FLAG_AFTER_") &&
    integrationStatus["Strava API"]?.startsWith("FEATURE_FLAG_AFTER_")
      ? "PASS"
      : "FAIL",
  actual: integrationStatus,
  expected: "Samsung, Garmin and Strava disabled until approved capability",
});

const failures = checks.filter((item) => item.status !== "PASS");
const report = {
  schema_version: "1.0.0",
  product_version: "11.0.0",
  status: failures.length === 0 ? "PASS" : "FAIL",
  check_count: checks.length,
  pass_count: checks.length - failures.length,
  fail_count: failures.length,
  checks,
};
const artifactDirectory = join(repository, "artifacts/local");
mkdirSync(artifactDirectory, { recursive: true });
writeFileSync(
  join(artifactDirectory, "v11-validation.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exitCode = 1;
