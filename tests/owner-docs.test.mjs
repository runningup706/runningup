import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { LAUNCH_CONTENT_FLOOR, SCALE_FLOOR, DIRECTION_LOCK } from '../packages/domain/constants.mjs';

/**
 * The four owner-facing Korean files are the only ones the project owner reads. That makes
 * them the highest-consequence place in the repository for a number to be wrong: a stale
 * "684 items" in `CURRENT_STATE_KO.md` is not a documentation nit, it is the owner being
 * told something untrue about their own product.
 *
 * Every count in those files is checked against the generated manifest here, so the docs
 * cannot drift the way `SCREEN_CATALOG_V14.json` did. This is the same rule the rest of
 * the repository follows — two copies of one fact need something comparing them.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OWNER_FILES = ['README_KO.md', 'CURRENT_STATE_KO.md', 'CHANGELOG_KO.md', 'FILE_MAP_KO.md'];
const manifest = JSON.parse(readFileSync(join(ROOT, 'content/launch/launch_content_manifest.json'), 'utf8'));
const state = () => readFileSync(join(ROOT, 'CURRENT_STATE_KO.md'), 'utf8');

test('all four owner files exist', () => {
  for (const f of OWNER_FILES) {
    assert.ok(existsSync(join(ROOT, f)), `missing ${f}`);
  }
});

test('the status file reports the counts the content factory actually produced', () => {
  const text = state();
  const expected = [
    ['continents', manifest.counts.continents],
    ['regions', manifest.counts.region_nodes],
    ['courses', manifest.counts.courses],
    ['base styles', manifest.counts.my_runner_base_styles],
    ['world runners', manifest.counts.world_runners],
    ['wearable items', manifest.counts.wearable_items],
    ['outfit sets', manifest.counts.outfit_sets],
    ['equipment slots', manifest.counts.equipment_slots],
  ];
  for (const [label, value] of expected) {
    // Korean thousands separators are written with commas, so accept either form.
    const plain = String(value);
    const grouped = value.toLocaleString('en-US');
    assert.ok(text.includes(plain) || text.includes(grouped),
      `CURRENT_STATE_KO.md does not mention the real ${label} count (${grouped})`);
  }
  assert.ok(text.includes(String(DIRECTION_LOCK.CHECKPOINT_COUNT)),
    'the status file does not mention the real checkpoint count');
});

test('the status file states every owner scale floor', () => {
  const text = state();
  for (const [name, value] of Object.entries(SCALE_FLOOR)) {
    assert.ok(text.includes(String(value)), `the status file never mentions ${name} (${value})`);
  }
});

test('the status file does not describe backend-only work as finished', () => {
  // The specific failure: the wardrobe and the base styles have data, a schema, a seed and
  // gates, and no screen. Reporting that as done is the exact thing the direction lock
  // calls a DATA_PASS dressed up as a pass.
  const text = state();
  assert.match(text, /데이터만/, 'the status file no longer distinguishes data-only from shipped');
  assert.match(text, /BLOCKED_ART_ASSET/, 'the missing art is not recorded as a blocker');
  assert.match(text, /NOT_RUN|미실시/, 'the unmeasured Global Event capacity is not recorded');
});

test('the status file separates a green build from a built APK', () => {
  const text = state();
  for (const marker of [
    'WORKFLOW_SUCCESS', 'GATES_EXECUTED', 'UNITY_BUILD_EXECUTED',
    'ARTIFACT_PRODUCED', 'DEVICE_TEST_EXECUTED',
  ]) {
    assert.ok(text.includes(marker), `the status file omits ${marker}`);
  }
});

test('the status file ends with a USER ACTION line, question-free', () => {
  const text = state();
  assert.match(text, /USER ACTION/, 'no USER ACTION section');
  // The contract is explicit: no owner-facing file ends by asking the owner to decide.
  const tail = text.slice(text.indexOf('USER ACTION'));
  assert.ok(!/할까요\?|해 주세요\?|골라 ?주(십시오|세요)/.test(tail),
    'the USER ACTION section asks the owner a question instead of naming a button');
});

test('the file map points at files that exist', () => {
  const text = readFileSync(join(ROOT, 'FILE_MAP_KO.md'), 'utf8');
  // Backticked paths that look like real repo paths, not prose and not code identifiers.
  const paths = [...text.matchAll(/`([a-z][\w./-]*\/[\w./-]+)`/g)]
    .map((m) => m[1])
    .filter((p) => /\.(mjs|cs|json|md|sql|ttf|yml|yaml)$/.test(p) || p.endsWith('/'));
  assert.ok(paths.length >= 15, `only ${paths.length} paths found — the extractor is broken`);
  const missing = [...new Set(paths)].filter((p) => !existsSync(join(ROOT, p)));
  assert.deepEqual(missing, [], `FILE_MAP_KO.md points at files that do not exist: ${missing.join(', ')}`);
});

test('the readme points the owner at the other three files', () => {
  const text = readFileSync(join(ROOT, 'README_KO.md'), 'utf8');
  for (const f of ['CURRENT_STATE_KO.md', 'CHANGELOG_KO.md', 'FILE_MAP_KO.md']) {
    assert.ok(text.includes(f), `README_KO.md never mentions ${f}`);
  }
});

test('the seven issue forms exist and all ask the same six questions', () => {
  const dir = join(ROOT, '.github/ISSUE_TEMPLATE');
  const forms = readdirSync(dir).filter((f) => f.endsWith('.yml') && f !== 'config.yml');
  assert.equal(forms.length, 7, `expected 7 issue forms, found ${forms.length}`);
  // One shape to learn, not seven. The owner should never have to work out which form
  // wants which information.
  const REQUIRED = ['target', 'problem', 'want', 'dont_touch', 'done_when', 'reference'];
  for (const form of forms) {
    const text = readFileSync(join(dir, form), 'utf8');
    const ids = [...text.matchAll(/^\s*id:\s*(\w+)/gm)].map((m) => m[1]);
    assert.deepEqual(ids, REQUIRED, `${form} asks a different set of questions`);
  }
});

test('every issue form makes "do not touch this" available', () => {
  // The one field that protects the product from a well-meant fix. It is optional to fill
  // in and must never be absent.
  const dir = join(ROOT, '.github/ISSUE_TEMPLATE');
  for (const form of readdirSync(dir).filter((f) => f.endsWith('.yml') && f !== 'config.yml')) {
    const text = readFileSync(join(dir, form), 'utf8');
    assert.match(text, /id:\s*dont_touch/, `${form} has no "do not touch" field`);
  }
});

test('the launch floor and the status file agree on what cannot shrink', () => {
  // A category that gained a floor but never reached the owner's status file is a category
  // the owner does not know exists.
  const text = state();
  const named = ['my_runner_base_styles', 'world_runners', 'wearable_items', 'outfit_sets', 'equipment_slots'];
  for (const key of named) {
    assert.ok(key in LAUNCH_CONTENT_FLOOR, `${key} lost its launch floor`);
    assert.ok(text.includes(String(LAUNCH_CONTENT_FLOOR[key])),
      `the status file never states the ${key} floor (${LAUNCH_CONTENT_FLOOR[key]})`);
  }
});
