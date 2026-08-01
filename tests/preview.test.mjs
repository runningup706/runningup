import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DIRECTION_LOCK, SCALE_FLOOR } from '../packages/domain/constants.mjs';

/**
 * The static preview is the only thing the owner can look at right now — the Unity build is
 * blocked, so this page is standing in for the app.
 *
 * That makes two failure modes serious enough to gate on.
 *
 *   A preview with invented numbers is worse than no preview. It is indistinguishable from
 *   a real one and it teaches the owner things about their product that are not true. So
 *   every count on the page is checked against the generated manifest.
 *
 *   A preview that stops being labelled as a proposal becomes evidence of a working app.
 *   The stamp is checked on every frame, not once on the page.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = join(ROOT, 'preview', 'index.html');
const PNG = join(ROOT, 'preview', 'png');
const CAPTURE = join(ROOT, 'tools', 'preview', 'capture.mjs');

const manifest = JSON.parse(readFileSync(join(ROOT, 'content/launch/launch_content_manifest.json'), 'utf8'));
const html = () => readFileSync(PAGE, 'utf8');

test('the preview page exists and is self-contained', () => {
  assert.ok(existsSync(PAGE), 'run `npm run preview:build`');
  const text = html();
  assert.ok(text.length > 20_000, 'the page is suspiciously small');
  // A page that fetches anything is a page that renders differently, or not at all, for
  // whoever opens it. The owner opens this from a file, offline.
  assert.ok(!/<script\b/i.test(text), 'the preview must not run scripts');
  assert.ok(!/https?:\/\/(?!www\.w3\.org)/.test(text), 'the preview must not reference an external URL');
  assert.ok(!/<link\b/i.test(text), 'the preview must not load an external stylesheet');
  assert.ok(!/<img\b/i.test(text), 'the preview must not reference an external image');
});

test('every frame is stamped as a proposal, not a capture', () => {
  const text = html();
  const frames = text.match(/class="phone /g) ?? [];
  // Count the markup, not the CSS rule and not the banner prose that also says it.
  const stamps = text.match(/<div class="stamp">/g) ?? [];
  assert.ok(frames.length >= 12, `only ${frames.length} frames found`);
  assert.equal(stamps.length, frames.length,
    `${frames.length} frames but ${stamps.length} stamps — an unstamped frame reads as a screenshot`);
  assert.match(text, /NATIVE FEATURES NOT EXECUTED/);
  assert.match(text, /CURRENT UNITY RUNTIME CAPTURE/,
    'the page does not explain what a real capture would be labelled');
});

test('the numbers on the page are the numbers the content factory produced', () => {
  const text = html();
  const expected = [
    manifest.counts.continents,
    manifest.counts.region_nodes,
    manifest.counts.courses,
    manifest.counts.my_runner_base_styles,
    manifest.counts.world_runners,
    manifest.counts.wearable_items,
    manifest.counts.outfit_sets,
    manifest.counts.equipment_slots,
    DIRECTION_LOCK.CHECKPOINT_COUNT,
  ];
  for (const value of expected) {
    const plain = String(value);
    const grouped = value.toLocaleString('en-US');
    assert.ok(text.includes(plain) || text.includes(grouped),
      `the preview never shows ${grouped} — it is describing content that does not exist`);
  }
  assert.ok(text.includes(`${SCALE_FLOOR.GLOBAL_EVENT_MIN_PARTICIPANTS}–${SCALE_FLOOR.GLOBAL_EVENT_MAX_PARTICIPANTS}`),
    'the preview does not state the Global Event capacity range');
});

test('the preview does not present unmeasured capacity as working', () => {
  assert.match(html(), /NOT_RUN/,
    'the Global Event load tests are unmeasured and the page does not say so');
});

test('the safe area is drawn on every frame', () => {
  // This app has collided with the status bar and the gesture bar before. A design that
  // does not show them is a design that will do it again.
  const text = html();
  const frames = (text.match(/class="phone /g) ?? []).length;
  assert.equal((text.match(/class="safe safe-top"/g) ?? []).length, frames);
  assert.equal((text.match(/class="safe safe-bottom"/g) ?? []).length, frames);
});

test('all four forgotten states are drawn', () => {
  const text = html();
  for (const state of ['loading', 'empty', 'error', 'disabled']) {
    assert.ok(text.includes(`id="scr-state-${state}"`), `the ${state} state is not drawn`);
  }
  // A disabled control that does not say why is a dead end.
  assert.match(text, /Grant permission in Settings to enable this/);
  assert.match(text, /class="retry"/, 'the error state offers no retry');
});

test('the palette is the app’s, not a second one invented for the preview', () => {
  const design = readFileSync(join(ROOT, 'client/unity/Assets/RunningUp/Design/V14Design.cs'), 'utf8');
  const tokens = [...design.matchAll(/public static readonly Color (\w+)\s*=\s*new\(([^)]*)\);/g)]
    .map((m) => {
      const [r, g, b] = m[2].split(',').map((p) => Number(p.trim().replace(/f$/, '')));
      return [r, g, b].map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('');
    });
  assert.ok(tokens.length >= 15, 'failed to parse the design tokens');
  const text = html();
  // The `:root` block is generated from those tokens; at least the surfaces must appear.
  const present = tokens.filter((hex) => text.includes(`#${hex}`));
  assert.ok(present.length >= 12,
    `only ${present.length} of ${tokens.length} app colours appear in the preview — it has its own palette`);
});

test('the capture tool and the page agree on which frames exist', () => {
  // These two lists drifting apart is how you get a capture run that silently produces
  // thirteen PNGs when it was asked for fourteen.
  const capture = readFileSync(CAPTURE, 'utf8');
  const listed = [...capture.matchAll(/'(scr-[\w-]+)'/g)].map((m) => m[1]);
  assert.ok(listed.length >= 12, `the capture list has only ${listed.length} entries`);
  const text = html();
  const missing = listed.filter((id) => !text.includes(`id="${id}"`));
  assert.deepEqual(missing, [], `capture.mjs names frames the page does not have: ${missing.join(', ')}`);
});

test('the captured PNGs cover the three required sizes', { skip: !existsSync(PNG) }, () => {
  const files = readdirSync(PNG);
  for (const size of ['360x800', '412x915', '1080x1920']) {
    const file = `page-${size}.png`;
    assert.ok(files.includes(file), `missing ${file}`);
    assert.ok(statSync(join(PNG, file)).size > 10_000, `${file} is too small to be a render`);
  }
  assert.ok(files.length >= 14, `only ${files.length} PNGs — the per-frame captures are missing`);
});
