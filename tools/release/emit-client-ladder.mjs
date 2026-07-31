#!/usr/bin/env node
/**
 * Emits the canonical Monthly Apex ladder in the exact form the Unity client needs, and
 * verifies the client's copy when that file is present.
 *
 * Why this exists
 * ---------------
 * The ladder lives once, in packages/domain/constants.mjs. Three other places must agree
 * with it: the SQL seed (generated), MonthlyApexLadder.cs (in this repository, compiled
 * and conformance-tested), and V14ScreenFlowController.MonthlyCheckpointsKm in the Unity
 * client — which is NOT in this repository.
 *
 * That last one cannot simply be added here. client/dotnet compiles
 * `client/unity/Assets/RunningUp/**\/*.cs` on purpose, so that a UnityEngine dependency in
 * the domain layer breaks the build. V14ScreenFlowController.cs uses UnityEngine and
 * references runtime types that do not exist in this tree, so dropping it in would break
 * CI to fix a copy-paste problem.
 *
 * So instead: generate the array, and check the client's copy whenever it is reachable.
 * A hand-copied constant that nothing verifies is exactly how the client ended up shipping
 * 120 thresholds against a 121-threshold server.
 *
 * Usage
 *   node tools/release/emit-client-ladder.mjs              # print the C# array
 *   node tools/release/emit-client-ladder.mjs --check PATH # verify a client file
 *   node tools/release/emit-client-ladder.mjs --check      # verify the default path
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { APEX_CHECKPOINT_METERS, DIRECTION_LOCK } from '../../packages/domain/constants.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEFAULT_CLIENT = 'client/unity/Assets/RunningUp/V14/UI/V14ScreenFlowController.cs';
/** The field the client should hold. See the unit note below for why it is not …Km. */
const FIELD = 'MonthlyCheckpointsMeters';
/** The field the client currently holds, which cannot represent the marathon. */
const LEGACY_FIELD = 'MonthlyCheckpointsKm';

/**
 * Thresholds that are not a whole number of kilometres.
 *
 * The client ships `int[] MonthlyCheckpointsKm`. 42_195 m is 42.195 km, which an int[]
 * cannot hold — so the marathon checkpoint cannot be added to the client by inserting a
 * number. The field has to become integer METRES, which is what constants.mjs already
 * specifies: "All credited/accumulated distances are INTEGER METERS ... exactly
 * representable with no floating point drift."
 *
 * Rounding to 42 km is not an option. It would move the checkpoint off the marathon and
 * let a runner who covered the distance miss the checkpoint that names it.
 */
export function fractionalKilometreThresholds() {
  return APEX_CHECKPOINT_METERS.filter((metres) => metres % 1000 !== 0);
}

function formatCSharp(values) {
  const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '_');
  const rows = [];
  for (let i = 0; i < values.length; i += 8) {
    rows.push(`            ${values.slice(i, i + 8).map((v) => fmt(v).padStart(9)).join(', ')},`);
  }
  return [
    `        private static readonly int[] ${FIELD} =`,
    '        {',
    ...rows,
    '        };',
  ].join('\n');
}

/** Returns {values, unit} so a client still on the kilometre field is diagnosed, not just failed. */
function parseClientLadder(source) {
  for (const [field, unit] of [[FIELD, 'meters'], [LEGACY_FIELD, 'kilometers']]) {
    const match = source.match(new RegExp(`${field}\\s*=\\s*\\{([\\s\\S]*?)\\};`));
    if (!match) continue;
    const values = match[1]
      .split(',')
      .map((v) => v.trim().replace(/_/g, ''))
      .filter(Boolean)
      .map(Number);
    return { field, unit, values };
  }
  return null;
}

const args = process.argv.slice(2);
const checkIndex = args.indexOf('--check');

const expected = [...APEX_CHECKPOINT_METERS];
const fractional = fractionalKilometreThresholds();

if (checkIndex === -1) {
  console.log(`        // ${DIRECTION_LOCK.CHECKPOINT_COUNT} checkpoints in integer metres, generated from`);
  console.log('        // packages/domain/constants.mjs by tools/release/emit-client-ladder.mjs.');
  console.log('        // Do not hand-edit: run the generator and paste the whole block.');
  if (fractional.length > 0) {
    console.log('        //');
    console.log(`        // The field is ${FIELD}, not …Km, because ${fractional.join(', ')} m`);
    console.log('        // is not a whole number of kilometres and an int[] of km cannot hold it.');
  }
  console.log(formatCSharp(expected));
  process.exit(0);
}

const requested = args[checkIndex + 1] ?? DEFAULT_CLIENT;
const target = isAbsolute(requested) ? requested : join(ROOT, requested);
if (!existsSync(target)) {
  console.log(`client ladder not checked: ${requested} is not present.`);
  console.log('The Unity client is not vendored here; see docs/REPOSITORY_LAYOUT.md.');
  console.log(`Expected ${DIRECTION_LOCK.CHECKPOINT_COUNT} checkpoints, ending at 1000 km.`);
  // Absence is a known gap, not a failure — but it is reported every run so it stays visible.
  process.exit(0);
}

const client = parseClientLadder(readFileSync(target, 'utf8'));
if (client === null) {
  console.error(`::error::neither ${FIELD} nor ${LEGACY_FIELD} found in ${target}`);
  process.exit(1);
}

if (client.unit === 'kilometers') {
  console.error(`::error::${target} still stores the ladder as ${LEGACY_FIELD} (kilometres).`);
  console.error(`  ${fractional.join(', ')} m is not a whole number of kilometres, so the`);
  console.error(`  marathon checkpoint cannot be represented. Rename the field to ${FIELD}`);
  console.error('  and paste the block from: node tools/release/emit-client-ladder.mjs');
  process.exit(1);
}

if (client.values.length !== expected.length) {
  console.error(
    `::error::client ladder has ${client.values.length} checkpoints, canonical has ${expected.length}`,
  );
  process.exit(1);
}
const mismatches = expected
  .map((m, i) => (client.values[i] === m ? null : { i, expected: m, actual: client.values[i] }))
  .filter(Boolean);
if (mismatches.length > 0) {
  console.error(`::error::client ladder diverges from the canonical ladder in ${mismatches.length} place(s)`);
  for (const m of mismatches.slice(0, 10)) {
    console.error(`  index ${m.i}: client ${m.actual} m, canonical ${m.expected} m`);
  }
  process.exit(1);
}

console.log(`client ladder matches the canonical ladder (${expected.length} checkpoints, integer metres)`);
