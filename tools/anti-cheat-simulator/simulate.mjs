#!/usr/bin/env node
/**
 * Anti-cheat simulator — master # 12.3.
 *
 * Runs the whole fixture corpus through the detection engine and measures precision,
 * recall, the pending-review rate and, most importantly, the FALSE POSITIVE rate. The
 * master is explicit that a false positive is a serious harm: it withholds a reward that a
 * real runner genuinely earned. A detector that catches every attack by rejecting honest
 * runs is a failure, not a success.
 *
 * Writes machine-readable evidence to docs/balance-evidence/.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { verifyRun, DETECTION_VERSION, THRESHOLDS } from '../lib/anomaly-detection.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const corpus = JSON.parse(readFileSync(join(ROOT, 'content', 'fixtures', 'run-fixtures.json'), 'utf8'));

const ACCEPTED = new Set(['verified', 'verified_limited']);

const rows = [];
let truePositive = 0;   // an attack that was not accepted
let falseNegative = 0;  // an attack that was accepted
let trueNegative = 0;   // an honest run that was accepted
let falsePositive = 0;  // an honest run that was rejected outright
let honestPending = 0;  // an honest run held for review — a cost, though a recoverable one

for (const fixture of corpus.normal) {
  const result = verifyRun(fixture);
  const accepted = ACCEPTED.has(result.status);

  if (accepted) trueNegative += 1;
  else if (result.status === 'pending_review') honestPending += 1;
  else falsePositive += 1;

  rows.push({
    id: fixture.id, kind: 'normal', expectation: fixture.expectation,
    status: result.status, grade: result.grade, suspicion: result.suspicion,
    reasons: result.reasons.map((r) => r.code),
    correct: accepted || result.status === 'pending_review',
  });
}

for (const fixture of corpus.attacks) {
  const result = verifyRun(fixture);
  const accepted = ACCEPTED.has(result.status);

  // The manual-entry edge case is deliberately NOT an attack: being accepted with limits
  // is the correct outcome.
  const isRealAttack = fixture.attack !== 'none';

  if (isRealAttack) {
    if (accepted) falseNegative += 1; else truePositive += 1;
  }

  rows.push({
    id: fixture.id, kind: isRealAttack ? 'attack' : 'edge', expectation: fixture.expectation,
    status: result.status, grade: result.grade, suspicion: result.suspicion,
    reasons: result.reasons.map((r) => r.code),
    correct: isRealAttack ? !accepted : accepted,
  });
}

const precision = truePositive / Math.max(1, truePositive + falsePositive);
const recall = truePositive / Math.max(1, truePositive + falseNegative);
const falsePositiveRate = falsePositive / Math.max(1, corpus.normal.length);
const pendingRate = honestPending / Math.max(1, corpus.normal.length);

const report = {
  generated_by: 'tools/anti-cheat-simulator/simulate.mjs',
  detection_version: DETECTION_VERSION,
  thresholds: THRESHOLDS,
  totals: {
    normal_fixtures: corpus.normal.length,
    attack_fixtures: corpus.attacks.filter((a) => a.attack !== 'none').length,
    true_positive: truePositive,
    false_negative: falseNegative,
    true_negative: trueNegative,
    false_positive: falsePositive,
    honest_pending_review: honestPending,
  },
  metrics: {
    precision: Number(precision.toFixed(4)),
    recall: Number(recall.toFixed(4)),
    false_positive_rate: Number(falsePositiveRate.toFixed(4)),
    honest_pending_rate: Number(pendingRate.toFixed(4)),
  },
  results: rows,
};

const assertions = [];
const assert = (name, ok, detail) => {
  assertions.push({ name, ok, detail });
  if (!ok) process.exitCode = 1;
};

// A false positive withholds a reward a real runner earned. Zero is the requirement.
assert('no honest run is rejected outright', falsePositive === 0,
  `${falsePositive} false positives`);
assert('every non-running source is refused', rows
  .filter((r) => r.id.startsWith('attack_non_running_'))
  .every((r) => r.status === 'rejected'), null);
assert('every real attack is caught', falseNegative === 0,
  `${falseNegative} attacks slipped through`);
assert('recall is total across the attack corpus', recall === 1, `recall ${recall}`);
assert('manual entry is accepted with limits rather than punished',
  rows.find((r) => r.id === 'edge_manual_entry')?.status === 'verified_limited', null);
assert('a genuine run with poor GPS is not treated as cheating',
  ACCEPTED.has(rows.find((r) => r.id === 'normal_poor_accuracy_urban')?.status), null);
assert('run-walk and interval sessions pass despite large pace swings',
  ACCEPTED.has(rows.find((r) => r.id === 'normal_run_walk_beginner')?.status)
  && ACCEPTED.has(rows.find((r) => r.id === 'normal_structured_intervals')?.status), null);
assert('honest runs held for review stay rare', pendingRate <= 0.05,
  `${(pendingRate * 100).toFixed(1)}% of honest runs pending`);

report.assertions = assertions;

mkdirSync(join(ROOT, 'docs', 'balance-evidence'), { recursive: true });
writeFileSync(
  join(ROOT, 'docs', 'balance-evidence', 'anti-cheat-simulation.json'),
  `${JSON.stringify(report, null, 2)}\n`, 'utf8',
);

console.log(`Anti-cheat simulation — ${DETECTION_VERSION}\n`);
console.log(`  normal fixtures : ${corpus.normal.length}`);
console.log(`  attack fixtures : ${report.totals.attack_fixtures}`);
console.log();
console.log(`  precision            : ${(precision * 100).toFixed(1)}%`);
console.log(`  recall               : ${(recall * 100).toFixed(1)}%`);
console.log(`  false positive rate  : ${(falsePositiveRate * 100).toFixed(1)}%`);
console.log(`  honest pending rate  : ${(pendingRate * 100).toFixed(1)}%`);
console.log();

const misclassified = rows.filter((r) => !r.correct);
if (misclassified.length > 0) {
  console.log('  misclassified:');
  for (const r of misclassified) {
    console.log(`    ${r.id.padEnd(38)} -> ${r.status} (suspicion ${r.suspicion}) [${r.reasons.join(', ')}]`);
  }
  console.log();
}

console.log('  assertions:');
for (const a of assertions) {
  console.log(`    ${a.ok ? 'PASS' : 'FAIL'}  ${a.name}${a.detail ? ` — ${a.detail}` : ''}`);
}
console.log('\n  evidence: docs/balance-evidence/anti-cheat-simulation.json');
