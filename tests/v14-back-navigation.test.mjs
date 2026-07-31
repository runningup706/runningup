import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The two things a user actually reported: the system back button did nothing, and a cold
 * launch reopened whatever screen the app died on instead of Home.
 *
 * These are static contract tests over the client source. They cannot prove the app
 * behaves correctly on a device — only an install can — but they pin the mechanisms that
 * were missing, so the fix cannot be quietly undone by an edit somewhere else in a
 * 3,000-line file.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONTROLLER = join(ROOT, 'client/unity/Assets/RunningUp/V14/UI/V14ScreenFlowController.cs');
const MANIFEST = join(ROOT, 'client/unity/Assets/Plugins/Android/AndroidManifest.xml');

const controller = existsSync(CONTROLLER) ? readFileSync(CONTROLLER, 'utf8') : null;
const manifestRaw = existsSync(MANIFEST) ? readFileSync(MANIFEST, 'utf8') : null;
/**
 * XML comments stripped before matching. The manifest's own comment explains the
 * predictive-back migration and names OnBackInvokedDispatcher, so a check over the raw
 * text passes on a manifest whose actual configuration is missing — the prose satisfies
 * the test. Caught by deleting the attribute and watching the test stay green.
 */
const manifest = manifestRaw === null ? null : manifestRaw.replace(/<!--[\s\S]*?-->/g, '');

test('the client sources this suite pins are present', () => {
  // Without this the whole file would pass vacuously the moment either file moved.
  assert.ok(controller !== null, `missing ${CONTROLLER}`);
  assert.ok(manifestRaw !== null, `missing ${MANIFEST}`);
  assert.ok(manifest.includes('<manifest'), 'comment stripping ate the manifest itself');
});

// ---------------------------------------------------------------------------
// The back press has to reach game code before any navigation logic matters
// ---------------------------------------------------------------------------

test('the manifest keeps back dispatch reaching Unity on targetSdk 36', () => {
  // Apps targeting API 36 get predictive back by default; under it KEYCODE_BACK is not
  // dispatched and Unity never sees Escape. Either the legacy opt-out is present, or a
  // native OnBackInvokedDispatcher registration is — but not neither.
  const optedOut = /android:enableOnBackInvokedCallback\s*=\s*"false"/.test(manifest);
  const hasNativeCallback = /OnBackInvokedDispatcher|OnBackInvokedCallback/.test(manifest);
  assert.ok(
    optedOut || hasNativeCallback,
    'back would not reach game code: no legacy opt-out and no predictive-back callback',
  );
});

test('a single entry point handles the system back press', () => {
  assert.match(controller, /public bool HandleSystemBack\(\)/);
  // The native path (UnitySendMessage) and the key path must both land there, so device
  // and Editor cannot diverge.
  assert.match(controller, /public void OnAndroidBackPressed\(/);
  assert.match(controller, /Input\.GetKeyDown\(KeyCode\.Escape\)/);
  assert.match(controller, /private void Update\(\)/);
});

// ---------------------------------------------------------------------------
// Back has to know where "back" is
// ---------------------------------------------------------------------------

test('there is a real back stack, bounded, fed by user navigation', () => {
  assert.match(controller, /backStack/, 'no history to go back through');
  assert.match(controller, /MaxBackDepth/, 'an unbounded history is a leak');
  assert.match(controller, /private void GoTo\(Screen screen/);

  // Buttons must record history. If a navigation button calls Show directly it moves the
  // screen without leaving a trail, and back skips it.
  assert.doesNotMatch(
    controller,
    /\(\)\s*=>\s*Show\(Screen\./,
    'a navigation button still calls Show directly; it must call GoTo so back can return',
  );
  assert.ok(
    (controller.match(/\(\)\s*=>\s*GoTo\(Screen\./g) ?? []).length >= 10,
    'most navigation buttons should route through GoTo',
  );
});

test('a run in progress is left running rather than abandoned by a back press', () => {
  const handler = controller.slice(
    controller.indexOf('public bool HandleSystemBack()'),
    controller.indexOf('public void OnAndroidBackPressed('),
  );
  assert.match(handler, /Screen\.ActiveTraining or Screen\.LiveRace/);
  assert.match(handler, /GoTo\(Screen\.Home, recordHistory: false\)/);
});

test('back at the root asks once before letting the app close', () => {
  assert.match(controller, /homeExitArmedUntil/);
  assert.match(controller, /Press back again to exit/);
});

// ---------------------------------------------------------------------------
// A cold launch starts at Home
// ---------------------------------------------------------------------------

test('a cold launch starts at Home and does not reopen the last screen', () => {
  const awake = controller.slice(
    controller.indexOf('private void Awake()'),
    controller.indexOf('private void SetApprovedHudDynamicVisibility'),
  );
  assert.match(awake, /currentScreen = Screen\.Home/, 'Awake must start at Home');
  assert.doesNotMatch(
    awake,
    /currentScreen = ParseScreen\(PlayerPrefs\.GetString\(ScreenKey/,
    'restoring the last screen reopens Active Training with no session behind it',
  );
  assert.match(awake, /PlayerPrefs\.DeleteKey\(ScreenKey\)/);
  assert.match(awake, /backStack\.Clear\(\)/, 'a restored back stack would point at dead screens');
});

test('the last screen is not written either, so nothing half-restores it later', () => {
  assert.doesNotMatch(
    controller,
    /PlayerPrefs\.SetString\(ScreenKey/,
    'writing a value nothing reads invites someone to start reading it again',
  );
});

// ---------------------------------------------------------------------------
// No new in-app back buttons: the system button is the back button
// ---------------------------------------------------------------------------

test('the fix adds no new in-app back buttons', () => {
  // The user asked for the system button to work, explicitly not for a back control on
  // every screen. Sync's existing BACK and World's stage control stay; nothing new.
  const backButtons = (controller.match(/"BACK"/g) ?? []).length;
  assert.ok(
    backButtons <= 3,
    `expected the original in-app BACK controls only, found ${backButtons}`,
  );
});

// ---------------------------------------------------------------------------
// Client / server ladder parity
// ---------------------------------------------------------------------------

test('the client ladder is integer metres and matches the canonical ladder', async () => {
  const { APEX_CHECKPOINT_METERS } = await import('../packages/domain/constants.mjs');
  const match = controller.match(/MonthlyCheckpointsMeters\s*=\s*\{([\s\S]*?)\};/);
  assert.ok(match, 'the client must store the ladder as MonthlyCheckpointsMeters');
  const values = match[1]
    .split(',')
    .map((v) => v.trim().replace(/_/g, ''))
    .filter(Boolean)
    .map(Number);
  assert.deepEqual(values, [...APEX_CHECKPOINT_METERS]);
  assert.ok(values.includes(42_195), 'the marathon checkpoint must survive in the client');
});
