import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The V14 screen code had 33 colours written inline as `new Color(r, g, b, a)`, spread
 * through a 3,600-line file, while a palette (`RunningUp.Core.V14Palette`) already existed
 * and went unused. Retoning the app meant finding and editing every one of them, and
 * telling two nearly-identical navies apart meant comparing decimals by eye.
 *
 * They are now named tokens in `Assets/RunningUp/Design/V14Design.cs`.
 *
 * The refactor was supposed to change no pixel. This suite is what makes that checkable
 * rather than asserted: it resolves every token reference back to its numeric value and
 * compares the result against the values recorded before the change.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DESIGN = join(ROOT, 'client/unity/Assets/RunningUp/Design/V14Design.cs');
const SCREENS = join(ROOT, 'client/unity/Assets/RunningUp/V14/UI/V14ScreenFlowController.cs');

const design = existsSync(DESIGN) ? readFileSync(DESIGN, 'utf8') : null;
const screens = existsSync(SCREENS) ? readFileSync(SCREENS, 'utf8') : null;

/** Token name -> [r, g, b], read out of the design file. */
function tokenValues() {
  const out = new Map();
  for (const m of design.matchAll(
    /public static readonly Color (\w+)\s*=\s*new\(([^)]*)\);/g,
  )) {
    const parts = m[2].split(',').map((p) => Number(p.trim().replace(/f$/, '')));
    out.set(m[1], parts);
  }
  return out;
}

/** Every colour the screen file produces, in source order, as [r, g, b, a]. */
function resolvedScreenColours() {
  const tokens = tokenValues();
  const found = [];
  // V14Design.Name  or  V14Design.Name.Alpha(0.86f)
  for (const m of screens.matchAll(/V14Design\.(\w+)(?:\.Alpha\(([\d.]+)f?\))?/g)) {
    const rgb = tokens.get(m[1]);
    if (!rgb) continue;               // Alpha() itself, or a non-colour member
    found.push([...rgb, m[2] === undefined ? 1 : Number(m[2])]);
  }
  return found;
}

/**
 * The 33 colours the screen file produced before the tokens existed, in source order,
 * captured from commit 09e5e60. Any change here is a change a user would see.
 */
const BEFORE = [
  [0.01, 0.06, 0.12, 0.94], [0.025, 0.14, 0.25, 0.98], [0.005, 0.03, 0.065, 0.7],
  [0.025, 0.16, 0.29, 0.98], [0.005, 0.035, 0.075, 0.93], [0.005, 0.03, 0.065, 0.84],
  [0.01, 0.06, 0.12, 0.9], [0.005, 0.03, 0.065, 0.86], [0.005, 0.03, 0.065, 0.18],
  [0.005, 0.035, 0.075, 0.88], [0.005, 0.035, 0.075, 0.88], [0.005, 0.035, 0.075, 0.92],
  [0.005, 0.03, 0.065, 0.86], [0.005, 0.03, 0.065, 0.9], [0, 0.03, 0.07, 0.48],
  [0.01, 0.06, 0.12, 0.92], [0.22, 0.24, 0.31, 0.96], [0.04, 0.28, 0.4, 0.96],
  [0.005, 0.03, 0.065, 0.9], [0.025, 0.14, 0.25, 0.98], [0.64, 0.7, 0.78, 1],
  [0.18, 0.07, 0.03, 1], [0.02, 0.08, 0.2, 1], [0.1, 0.92, 0.66, 1],
  [0.68, 0.4, 1, 1], [0.7, 0.8, 0.88, 0.9], [0.7, 0.8, 0.88, 0.9],
  [0.7, 0.8, 0.88, 0.9], [0.82, 0.94, 1, 1], [0.64, 0.82, 1, 1],
  [0.42, 0.48, 0.56, 0.58], [0.01, 0.06, 0.12, 0.98], [0.62, 0.73, 0.82, 0.82],
];

test('both design sources are present, so this suite is not vacuous', () => {
  assert.ok(design !== null, `missing ${DESIGN}`);
  assert.ok(screens !== null, `missing ${SCREENS}`);
  assert.ok(tokenValues().size >= 15, 'the design file defines almost no tokens');
});

test('the token refactor changed no colour a user can see', () => {
  const after = resolvedScreenColours();
  assert.equal(after.length, BEFORE.length,
    `the screen file produced ${BEFORE.length} colours before and ${after.length} now — `
    + 'a colour was added or removed, which is a visual change, not a refactor');
  for (let i = 0; i < BEFORE.length; i += 1) {
    for (let c = 0; c < 4; c += 1) {
      assert.ok(Math.abs(after[i][c] - BEFORE[i][c]) < 1e-6,
        `colour ${i + 1} channel ${'rgba'[c]}: was ${BEFORE[i][c]}, now ${after[i][c]}`);
    }
  }
});

test('no colour is written inline in the screen file any more', () => {
  // The whole point: one place to change a colour. A stray literal re-scatters it, and
  // the next person copies the literal because it is what they see nearby.
  const literals = screens.match(/new Color\(/g) ?? [];
  assert.equal(literals.length, 0,
    `${literals.length} raw new Color(...) remain — put the value in V14Design.cs instead`);
});

test('every token the screens use is defined', () => {
  const defined = new Set([...tokenValues().keys(), 'Alpha']);
  const used = new Set([...screens.matchAll(/V14Design\.(\w+)/g)].map((m) => m[1]));
  const missing = [...used].filter((n) => !defined.has(n));
  assert.deepEqual(missing, [], `screens reference undefined tokens: ${missing.join(', ')}`);
});

test('every defined token is actually used', () => {
  // An unused token is a colour nobody can see, which will be edited by someone expecting
  // it to do something.
  const used = new Set([...screens.matchAll(/V14Design\.(\w+)/g)].map((m) => m[1]));
  const orphans = [...tokenValues().keys()].filter((n) => !used.has(n));
  assert.deepEqual(orphans, [], `tokens defined but never used: ${orphans.join(', ')}`);
});
