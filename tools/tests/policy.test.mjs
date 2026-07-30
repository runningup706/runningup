// V11 현실 러닝 우선 경제와 연동 승인 경계를 회귀 테스트한다.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  parseSimpleCsv,
  repositoryRoot,
} from "../lib/v11-catalog.mjs";

const repository = repositoryRoot();

test("verified running remains at least 85 percent of permanent progress", () => {
  const policy = readFileSync(
    join(repository, "requirements/v11/REAL_RUN_PROGRESS_POLICY_V11.yaml"),
    "utf8",
  );
  assert.match(policy, /verified_running_min_percent:\s*85\b/);
  assert.match(policy, /idle_drift_max_percent:\s*10\b/);
  assert.match(policy, /manual_menu_play_max_percent:\s*5\b/);
  assert.match(policy, /grants_monthly_km:\s*false\b/);
  assert.match(policy, /grants_fitness_core:\s*false\b/);
});

test("there is one daily bonus contract and extra runs keep base rewards", () => {
  const policy = readFileSync(
    join(repository, "requirements/v11/REAL_RUN_PROGRESS_POLICY_V11.yaml"),
    "utf8",
  );
  assert.match(policy, /bonus_contracts_per_local_day:\s*1\b/);
  assert.match(policy, /additional_runs_keep_base_rewards:\s*true\b/);
});

test("P0 and approval-gated activity sources are truthful", () => {
  const rows = parseSimpleCsv(
    readFileSync(
      join(repository, "requirements/v11/ACTIVITY_INTEGRATION_MATRIX_V11.csv"),
      "utf8",
    ),
  );
  const statuses = Object.fromEntries(
    rows.map((row) => [row.source, row.launch_status]),
  );
  assert.equal(statuses["RunningUp Direct GPS"], "P0_ACTIVE");
  assert.equal(statuses["Health Connect"], "P0_ACTIVE");
  assert.equal(statuses["FIT/GPX/TCX Import"], "P0_ACTIVE");
  assert.match(statuses["Samsung Health Data SDK"], /^FEATURE_FLAG_AFTER_/);
  assert.match(statuses["Garmin Activity API"], /^FEATURE_FLAG_AFTER_/);
  assert.match(statuses["Strava API"], /^FEATURE_FLAG_AFTER_/);
  assert.equal(statuses["Apple Health/Watch"], "P1_IOS");
});

