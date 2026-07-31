import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The user's report, verbatim: "제일 위는 폰 기본 상단에 뜨는 거랑 가끔 부딪쳐. 아래쪽도
 * 뒤로가기 누르려면 폰 자체에서 뜨는 아래쪽 버튼이 같이 눌러져."
 *
 * The top HUD collided with the status bar and the bottom navigation sat under the
 * Android gesture bar, so pressing a tab could trigger the system gesture instead.
 *
 * The cause was visible in two places at once. ProjectSettings has
 * `androidRenderOutsideSafeArea: 1`, so the app draws under the cutout — and no line of
 * client code read `Screen.safeArea`. The top bar was pinned to the screen edge at a fixed
 * 92px and the bottom at 154px.
 *
 * These are static contract tests. They cannot prove the inset is right on a given handset
 * — only a device can — but they pin the mechanism so it cannot quietly disappear.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SAFE = join(ROOT, 'client/unity/Assets/RunningUp/V14/UI/V14SafeArea.cs');
const CONTROLLER = join(ROOT, 'client/unity/Assets/RunningUp/V14/UI/V14ScreenFlowController.cs');
const SETTINGS = join(ROOT, 'client/unity/ProjectSettings/ProjectSettings.asset');

const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : null);
const safe = read(SAFE);
const controller = read(CONTROLLER);
const settings = read(SETTINGS);

test('the sources this suite pins are present', () => {
  assert.ok(safe !== null, `missing ${SAFE}`);
  assert.ok(controller !== null, `missing ${CONTROLLER}`);
  assert.ok(settings !== null, `missing ${SETTINGS}`);
});

test('something actually reads the safe area', () => {
  // This was the whole bug: nothing did.
  assert.match(safe, /Screen\.safeArea/, 'the safe-area component must read Screen.safeArea');
});

test('the UI root is inset, and the component is wired up', () => {
  assert.match(controller, /safeArea\.Bind\(flowRoot\)/,
    'flowRoot carries every screen and both chrome bars; insetting it is what fixes them all');
  assert.match(controller, /AddComponent<V14SafeArea>/);
});

test('the inset is applied by anchors, not by moving each bar', () => {
  // Anchors survive resolution changes and every future screen automatically. Nudging the
  // top bar down by a constant would fix one bar on one phone.
  assert.match(safe, /anchorMin\s*=/);
  assert.match(safe, /anchorMax\s*=/);
  assert.match(safe, /offsetMin\s*=\s*Vector2\.zero/);
  assert.match(safe, /offsetMax\s*=\s*Vector2\.zero/);
});

test('the inset is recomputed when the screen changes, not only at startup', () => {
  // Rotation, multi-window resize and the gesture bar appearing all change the safe area
  // after Awake. A one-shot inset is correct until the first rotation.
  assert.match(safe, /private void Update\(\)/);
  assert.match(safe, /Screen\.orientation/);
  assert.match(safe, /Screen\.width|Screen\.height/);
});

test('the background is not inset, so the 2.5D look is unchanged', () => {
  // approvedJourneyBackdrop is a sibling of flowRoot, never a child, so it keeps filling
  // the display. Letterboxing the whole app would have been the easy fix and would have
  // changed a locked design.
  const build = controller.slice(
    controller.indexOf('private void Build()'),
    controller.indexOf('private void BuildTopHud'),
  );
  assert.doesNotMatch(build, /Bind\(approvedJourneyBackdrop/);
  assert.match(build, /Bind\(flowRoot\)/);
});

test('a failed native inset query degrades instead of crashing', () => {
  // getRootWindowInsets is a View method and must run on the Android UI thread, which is
  // not Unity's main thread. Every call is wrapped, and failure falls back to
  // Screen.safeArea alone rather than taking the app down.
  assert.match(safe, /runOnUiThread/);
  assert.match(safe, /catch \(Exception\)/);
  assert.match(safe, /nativeInsetsUnavailable/);
});

test('an absurd inset cannot erase the interface', () => {
  // The worst outcome of a wrong inset is a blank screen with no way back. A value that
  // would eat half the display is discarded in favour of Screen.safeArea.
  assert.match(safe, /Screen\.width \* 0\.5f|Screen\.height \* 0\.5f/,
    'there must be a sanity bound on the computed inset');
});

test('rendering outside the safe area stays on, which is why the inset is needed', () => {
  // If someone flips this to 0, Unity letterboxes and the inset becomes double-counted
  // padding. The two settings have to be read together, so this records the pairing.
  assert.match(settings, /androidRenderOutsideSafeArea:\s*1/,
    'androidRenderOutsideSafeArea changed — re-check V14SafeArea, the inset may now be doubled');
});
