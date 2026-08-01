import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The build workflow and the Unity build script agree on a set of environment variable
 * names, and nothing compared them.
 *
 * They had already drifted: the workflow passed the Supabase key as
 * RUNNINGUP_SUPABASE_ANON_KEY while `V14ProjectBuilder` read
 * RUNNINGUP_SUPABASE_PUBLISHABLE_KEY. The URL arrived, the key did not, so
 * `V14SupabaseRuntimeConfig.IsConfigured` stayed false and every server call would have
 * thrown SUPABASE_CONFIG_REQUIRED. Nothing failed at build time. The first sign of it
 * would have been a user installing the release and finding that nothing worked.
 *
 * This is the same failure shape as the direction-lock mirror and the client ladder: two
 * copies of one fact, no check between them. So this suite is the check.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WORKFLOW = join(ROOT, '.github/workflows/android-apk.yml');
const EDITOR_DIR = join(ROOT, 'client/unity/Assets/RunningUp/Editor');

const workflow = existsSync(WORKFLOW) ? readFileSync(WORKFLOW, 'utf8') : null;

/** Every RUNNINGUP_* variable the Unity editor scripts read at build time. */
function namesReadByClient() {
  const names = new Set();
  if (!existsSync(EDITOR_DIR)) return names;
  for (const file of readdirSync(EDITOR_DIR)) {
    if (!file.endsWith('.cs')) continue;
    const text = readFileSync(join(EDITOR_DIR, file), 'utf8');
    // GetEnvironmentVariable( "NAME" ) — the argument often sits on the next line.
    for (const m of text.matchAll(/GetEnvironmentVariable\(\s*"(RUNNINGUP_[A-Z0-9_]+)"/g)) {
      names.add(m[1]);
    }
  }
  return names;
}

/** Every RUNNINGUP_* variable the workflow sets for the build step. */
function namesPassedByWorkflow() {
  return new Set([...workflow.matchAll(/^\s*(RUNNINGUP_[A-Z0-9_]+):/gm)].map((m) => m[1]));
}

test('the build workflow exists', () => {
  assert.ok(workflow !== null, `missing ${WORKFLOW}`);
});

test('the Unity project is present, so this suite is not vacuous', () => {
  // Before the project was committed there were no editor scripts to read, and every
  // assertion below would have passed over an empty set.
  const read = namesReadByClient();
  assert.ok(read.size > 0,
    'no RUNNINGUP_* environment variable is read by any editor script — either the Unity '
    + 'project is missing or the build script stopped taking configuration from the '
    + 'environment, and the workflow would be passing values nothing consumes');
});

test('every value the workflow passes is one the client actually reads', () => {
  const passed = namesPassedByWorkflow();
  const read = namesReadByClient();
  const orphans = [...passed].filter((n) => !read.has(n));
  assert.deepEqual(orphans, [],
    `the workflow passes ${orphans.join(', ')}, which no editor script reads. `
    + `The client reads: ${[...read].sort().join(', ')}`);
});

test('every value the client needs is one the workflow passes', () => {
  const passed = namesPassedByWorkflow();
  const read = namesReadByClient();
  const missing = [...read].filter((n) => !passed.has(n));
  assert.deepEqual(missing, [],
    `the client reads ${missing.join(', ')} at build time, but the workflow never sets it. `
    + 'A build would silently produce an APK missing that configuration.');
});

test('the Supabase key is passed from a secret, never written into the workflow', () => {
  // A publishable key is not a secret in the cryptographic sense, but a literal here
  // would be copied into forks and into every log that echoes the file.
  const line = workflow.match(/RUNNINGUP_SUPABASE_PUBLISHABLE_KEY:.*/)?.[0] ?? '';
  assert.match(line, /\$\{\{\s*secrets\./,
    'the publishable key must come from a repository secret');
});

test('the workflow never passes a service-role key to the client', () => {
  // The client is a public artefact. A service-role key in it grants every installer
  // full write access to the database.
  assert.doesNotMatch(
    workflow.replace(/^\s*#.*$/gm, ''),
    /RUNNINGUP_SUPABASE_SERVICE|SERVICE_ROLE|secrets\.SUPABASE_SERVICE/,
    'a service-role key must never be built into the APK',
  );
});
