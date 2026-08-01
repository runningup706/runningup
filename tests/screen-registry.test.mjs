import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * A screen registry is only worth having if it cannot drift from the code.
 *
 * The repository already had `SCREEN_CATALOG_V14.json`, which mixes shipped screens,
 * planned screens and internal tools in one list. Nothing compared it to anything, so it
 * could say fifteen while the app had twelve and no build would notice. That is the same
 * defect as every other one in this codebase's history: two copies of one fact and nothing
 * checking them against each other.
 *
 * So this suite reads the `Screen` enum straight out of the C# and compares it with
 * `docs/registry/SCREEN_REGISTRY.yaml` in BOTH directions — a screen the app has and the
 * registry does not, and a registry entry for a screen that does not exist.
 *
 * The YAML is parsed with a deliberately small reader rather than a dependency: the two
 * shapes this file needs are a list of `- id:` entries and a `planned_screens:` section,
 * and adding a parser to the dependency tree to read them would be the larger risk.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONTROLLER = join(ROOT, 'client/unity/Assets/RunningUp/V14/UI/V14ScreenFlowController.cs');
const REGISTRY = join(ROOT, 'docs/registry/SCREEN_REGISTRY.yaml');
const FEATURES = join(ROOT, 'docs/registry/FEATURE_REGISTRY.yaml');

/** The `Screen` enum members, in declaration order. */
function enumScreens() {
  const source = readFileSync(CONTROLLER, 'utf8');
  const block = source.match(/private enum Screen\s*\{([^}]*)\}/);
  assert.ok(block, 'could not find the Screen enum — this suite would silently pass');
  return block[1]
    .split(',')
    .map((line) => line.replace(/\/\/.*$/gm, '').trim())
    .filter((name) => /^[A-Za-z]\w*$/.test(name));
}

/** Registry entries, split into the implemented list and the planned list. */
function registry() {
  const text = readFileSync(REGISTRY, 'utf8');
  const [implementedPart, plannedPart] = text.split(/^planned_screens:/m);
  const ids = (chunk) => [...(chunk ?? '').matchAll(/^\s*-\s+id:\s*(\w+)/gm)].map((m) => m[1]);
  const statuses = (chunk) => [...(chunk ?? '').matchAll(
    /^\s*-\s+id:\s*(\w+)[\s\S]*?implementation_status:\s*(\w+)/gm,
  )].map((m) => [m[1], m[2]]);
  return {
    screens: ids(implementedPart),
    planned: ids(plannedPart),
    statuses: new Map(statuses(implementedPart)),
    plannedStatuses: new Map(statuses(plannedPart)),
    raw: text,
  };
}

const VALID_STATUS = new Set([
  'IMPLEMENTED', 'PARTIAL', 'APPROVED_DESIGN', 'PLANNED', 'DEPRECATED', 'INTERNAL_TOOL',
]);

test('both registry files exist, so this suite is not vacuous', () => {
  assert.ok(existsSync(REGISTRY), `missing ${REGISTRY}`);
  assert.ok(existsSync(FEATURES), `missing ${FEATURES}`);
  assert.ok(existsSync(CONTROLLER), `missing ${CONTROLLER}`);
  assert.ok(enumScreens().length >= 10, 'the enum parser found almost nothing');
});

test('every screen the app has is in the registry', () => {
  const missing = enumScreens().filter((name) => !registry().screens.includes(name));
  assert.deepEqual(missing, [],
    `the app can open these and the registry does not describe them: ${missing.join(', ')}`);
});

test('the registry does not describe screens the app does not have', () => {
  const actual = new Set(enumScreens());
  const ghosts = registry().screens.filter((id) => !actual.has(id));
  assert.deepEqual(ghosts, [],
    `the registry lists screens that are not in the Screen enum: ${ghosts.join(', ')}`);
});

test('a planned screen is not also claimed as a real one', () => {
  // The specific lie this prevents: MyRunner appearing in both sections so that a reader
  // skimming the top of the file concludes it ships.
  const { screens, planned } = registry();
  const both = planned.filter((id) => screens.includes(id));
  assert.deepEqual(both, [], `listed as both implemented and planned: ${both.join(', ')}`);
  const actual = new Set(enumScreens());
  const alreadyBuilt = planned.filter((id) => actual.has(id));
  assert.deepEqual(alreadyBuilt, [],
    `still listed as planned but already in the enum: ${alreadyBuilt.join(', ')}`);
});

test('every implementation_status is one of the defined values', () => {
  const { statuses, plannedStatuses } = registry();
  for (const [id, status] of [...statuses, ...plannedStatuses]) {
    assert.ok(VALID_STATUS.has(status), `${id}: "${status}" is not a defined status`);
  }
});

test('every screen states a back policy', () => {
  // Android back is the most-reported defect class in this app. A screen with no stated
  // policy is a screen whose behaviour nobody decided.
  const { raw, screens } = registry();
  const withPolicy = [...raw.matchAll(/^\s*-\s+id:\s*(\w+)[\s\S]*?back_policy:/gm)].map((m) => m[1]);
  const silent = screens.filter((id) => !withPolicy.includes(id));
  assert.deepEqual(silent, [], `no back_policy stated for: ${silent.join(', ')}`);
});

test('the two screens that must not lose a run say so', () => {
  // ActiveTraining and LiveRace are the screens where a careless back button throws away
  // real running. The controller protects them; the registry has to record that, because
  // the registry is what a person reads before changing the navigation.
  const { raw } = registry();
  const source = readFileSync(CONTROLLER, 'utf8');
  assert.match(source, /currentScreen is Screen\.ActiveTraining or Screen\.LiveRace/,
    'the controller no longer protects the in-run screens from system back');
  for (const id of ['ActiveTraining', 'LiveRace']) {
    const entry = raw.split(new RegExp(`^\\s*-\\s+id:\\s*${id}$`, 'm'))[1] ?? '';
    const policy = entry.split(/^\s*-\s+id:/m)[0];
    assert.match(policy, /protected/, `${id} does not record a protected back policy`);
  }
});

test('the feature registry records evidence rather than omitting it', () => {
  const text = readFileSync(FEATURES, 'utf8');
  const features = [...text.matchAll(/^\s*-\s+id:\s*(\w+)/gm)].map((m) => m[1]);
  assert.ok(features.length >= 15, `only ${features.length} features listed`);
  const blocks = text.split(/^\s*-\s+id:\s*/m).slice(1);
  for (const block of blocks) {
    const id = block.match(/^(\w+)/)[1];
    assert.match(block, /status:\s*\w+/, `${id} has no status`);
    assert.match(block, /evidence:/, `${id} claims a status with no evidence line`);
  }
});

test('nothing is marked DONE while its evidence says it was never run', () => {
  // The failure this catches is the one the direction lock names: a green summary over a
  // measurement nobody took.
  const text = readFileSync(FEATURES, 'utf8');
  const blocks = text.split(/^\s*-\s+id:\s*/m).slice(1);
  for (const block of blocks) {
    const id = block.match(/^(\w+)/)[1];
    const status = block.match(/status:\s*(\w+)/)[1];
    if (status !== 'DONE') continue;
    const evidence = block.split(/^\s*evidence:/m)[1].split(/^\s*(?:notes|blocker|screens):/m)[0];
    assert.ok(!/NOT_RUN/.test(evidence),
      `${id} is DONE but its evidence is NOT_RUN — one of the two is wrong`);
  }
});

test('the Global Event load tests are recorded as not yet run', () => {
  // This is an assertion about honesty, and it is expected to FAIL once the load tests
  // actually run — at which point the fix is to record the numbers, not to delete the test.
  const text = readFileSync(FEATURES, 'utf8');
  const block = text.split(/^\s*-\s+id:\s*global_event$/m)[1].split(/^\s*-\s+id:/m)[0];
  assert.match(block, /status:\s*BACKEND_ONLY/,
    'global_event claims more than BACKEND_ONLY — has a load test actually run?');
  assert.match(block, /load_test_50:\s*NOT_RUN/);
  assert.match(block, /load_test_100:\s*NOT_RUN/);
});
