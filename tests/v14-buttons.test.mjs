import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * "눌러도 반응도 없는 것도 있고" — one of the two complaints this whole branch started
 * from. A button that is drawn like a button and does nothing is worse than no button:
 * the user assumes the app is broken rather than that the feature is absent.
 *
 * The audit that produced this suite found 59 button call sites, 58 of them wired. The
 * one exception was `ChoiceRow`, a Settings helper that built four buttons with a null
 * handler and `interactable = false` — and which nothing ever called. Dead code producing
 * dead buttons. It is gone; this is what stops it coming back.
 *
 * The check parses `Button(...)` calls by matching parentheses rather than by line,
 * because every call in this file spans eight lines and a line-based regex sees none of
 * them.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONTROLLER = join(ROOT, 'client/unity/Assets/RunningUp/V14/UI/V14ScreenFlowController.cs');

const src = existsSync(CONTROLLER) ? readFileSync(CONTROLLER, 'utf8') : null;

/** Every `Button(...)` call site, as {line, args[]}. Excludes the factory's own signature. */
function buttonCalls() {
  const calls = [];
  for (const m of src.matchAll(/(?<![A-Za-z_])Button\(/g)) {
    let i = m.index + m[0].length;
    let depth = 1;
    while (i < src.length && depth > 0) {
      if (src[i] === '(') depth += 1;
      else if (src[i] === ')') depth -= 1;
      i += 1;
    }
    const body = src.slice(m.index + m[0].length, i - 1);
    if (body.includes('string name,') || body.includes('AddComponent')) continue;

    const args = [];
    let cur = '';
    let d = 0;
    for (const ch of body) {
      if ('([{'.includes(ch)) d += 1;
      else if (')]}'.includes(ch)) d -= 1;
      if (ch === ',' && d === 0) { args.push(cur); cur = ''; } else cur += ch;
    }
    args.push(cur);
    calls.push({ line: src.slice(0, m.index).split('\n').length, args: args.map((a) => a.trim()) });
  }
  return calls;
}

test('the controller is present, so this suite is not vacuous', () => {
  assert.ok(src !== null, `missing ${CONTROLLER}`);
  assert.ok(buttonCalls().length > 40,
    'almost no button call sites were parsed — the parser or the file shape changed');
});

test('every button has a click handler', () => {
  const dead = buttonCalls()
    .filter((c) => c.args.at(-1) === 'null' || c.args.at(-1) === '')
    .map((c) => `line ${c.line}: ${c.args[0]}`);
  assert.deepEqual(dead, [],
    `these buttons are drawn but do nothing when pressed:\n  ${dead.join('\n  ')}`);
});

test('no button is shipped permanently disabled', () => {
  // `interactable = false` set at construction is a control the user can never use. Set at
  // runtime it is legitimate state, so only the construction-time form is rejected.
  const constructed = src.match(/\)\s*\.interactable\s*=\s*false/g) ?? [];
  assert.deepEqual(constructed, [],
    'a button is created already disabled — either wire it up or do not draw it');
});

test('the dead ChoiceRow helper has not come back', () => {
  assert.doesNotMatch(src, /private void ChoiceRow\(/,
    'ChoiceRow built four handler-less, non-interactive buttons and was never called');
});

test('navigation buttons record history so the system back button works', () => {
  // The other founding complaint. Show() renders without pushing onto the back stack, so
  // a navigation button calling it directly is skipped when the user presses back.
  assert.doesNotMatch(src, /\(\)\s*=>\s*Show\(Screen\./,
    'a navigation button calls Show directly; it must call GoTo');
  const viaGoTo = (src.match(/\(\)\s*=>\s*GoTo\(Screen\./g) ?? []).length;
  assert.ok(viaGoTo >= 10, `only ${viaGoTo} navigation buttons route through GoTo`);
});

test('no user-facing control is a placeholder', () => {
  // The master prompt forbids "coming soon" and success-toast-only features outright.
  // Checked against the string literals a user can read, not against comments.
  const literals = [...src.matchAll(/"([^"\\\n]{3,})"/g)].map((m) => m[1]);
  const placeholders = literals.filter((s) =>
    /coming soon|준비\s*중|추후|TBD|TODO|not implemented|미구현/i.test(s));
  assert.deepEqual(placeholders, [],
    `placeholder text is visible to users: ${placeholders.join(', ')}`);
});

// ---------------------------------------------------------------------------
// The words on screen
// ---------------------------------------------------------------------------

test('no screen text hardcodes the checkpoint count', () => {
  // Three labels said "120" — "MONTHLY APEX · 120 CHECKPOINTS", "120 server-verified
  // checkpoints", and "CLAIMED 5 / 120" — while the ladder had grown to 121 by gaining the
  // 42.195 km marathon point. The array is checked by emit-client-ladder; the sentences
  // about it were checked by nobody, so a user saw a wrong number on every visit.
  const ladder = src.match(/MonthlyCheckpointsMeters\s*=\s*\{([\s\S]*?)\};/);
  assert.ok(ladder, 'the client must still store the ladder');
  const count = ladder[1].split(',').filter((v) => v.trim()).length;

  for (const [, text] of src.matchAll(/"([^"\\\n]*\bCHECKPOINTS?\b[^"\\\n]*)"/gi)) {
    const digits = text.match(/\b\d{2,4}\b/g) ?? [];
    for (const d of digits) {
      assert.notEqual(Number(d), count - 1,
        `"${text}" looks like a stale checkpoint count; derive it from the array`);
      assert.ok(Number(d) !== 120 && Number(d) !== 52,
        `"${text}" hardcodes a checkpoint count that has already changed twice`);
    }
  }
});

test('screen text avoids the internal vocabulary users cannot parse', () => {
  // The audience reads English as a second language. "Server-authoritative participant
  // list", "verified server snapshots" and "provider-authorized records" are accurate and
  // unreadable. The rule is about user-facing sentences, so object names and log lines are
  // excluded by requiring a space — every label here is a phrase, every id is one token.
  // The literal pattern excludes newlines: allowing them makes the gap *between* two
  // string literals look like one long string, and the check then reports `FontStyle.Bold`
  // as user-facing copy.
  const jargon = /(server-authoritative|snapshots?\b|provider-authorized|finalization|capability)/i;
  const offenders = [...src.matchAll(/"([^"\\\n]{8,})"/g)]
    .map((m) => m[1])
    .filter((t) => t.includes(' ') && jargon.test(t));
  assert.deepEqual(offenders, [],
    `these read as engineering notes rather than app text:\n  ${offenders.join('\n  ')}`);
});
