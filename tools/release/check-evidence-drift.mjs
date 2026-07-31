#!/usr/bin/env node
/**
 * Fails if the generated release evidence no longer describes the committed tree.
 *
 * `tools/release/generate-evidence.mjs` stamps `git_commit: git rev-parse HEAD` into the
 * manifest. That field can never equal the SHA of the commit that *contains* the manifest —
 * you would have to know a commit's hash before creating it. So a plain `git diff` on the
 * manifest reports drift after every single commit, forever, no matter what the evidence
 * says. It is a gate no commit sequence can satisfy, and it is the reason the supabase-tests
 * workflow failed on every run in this repository's history even once pgTAP was available.
 *
 * The provenance field is still worth keeping in the file — it records which tree produced
 * the evidence. It is simply not a drift signal, so this check ignores it and compares
 * everything that actually describes the schema.
 *
 * Usage: node tools/release/check-evidence-drift.mjs [--base <git-ref>]
 * Exits 0 when the only difference is provenance, 1 otherwise.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/** Fields that change on every commit by construction and carry no schema meaning. */
const VOLATILE_FIELDS = ['git_commit'];

const MANIFEST = 'artifacts/test-evidence-manifest.json';
/** Pure functions of the live schema — any difference at all is real drift. */
const SCHEMA_DOCS = ['docs/RLS_MATRIX.md', 'docs/DATABASE_SCHEMA.md'];

const baseIndex = process.argv.indexOf('--base');
const base = baseIndex === -1 ? 'HEAD' : process.argv[baseIndex + 1];

const fail = (message, detail) => {
  console.error(`::error::${message}`);
  if (detail) console.error(detail);
  process.exit(1);
};

/* 1. The schema documents are compared verbatim. */
let docDiff = '';
try {
  docDiff = execFileSync('git', ['diff', '--stat', base, '--', ...SCHEMA_DOCS], {
    encoding: 'utf8',
  }).trim();
} catch (error) {
  fail('Could not diff the generated schema documents.', error.message);
}
if (docDiff) {
  fail(
    'Generated schema documents are stale. Run scripts/db.sh and commit the result.',
    docDiff,
  );
}

/* 2. The manifest is compared with provenance normalised out. */
const strip = (manifest) => {
  const copy = { ...manifest };
  for (const field of VOLATILE_FIELDS) delete copy[field];
  return JSON.stringify(copy, null, 2);
};

let committedRaw;
try {
  committedRaw = execFileSync('git', ['show', `${base}:${MANIFEST}`], { encoding: 'utf8' });
} catch (error) {
  fail(`Could not read ${MANIFEST} from ${base}.`, error.message);
}

const currentRaw = readFileSync(MANIFEST, 'utf8');

let committed;
let current;
try {
  committed = strip(JSON.parse(committedRaw));
  current = strip(JSON.parse(currentRaw));
} catch (error) {
  fail(`${MANIFEST} is not valid JSON.`, error.message);
}

if (committed !== current) {
  const committedLines = committed.split('\n');
  const currentLines = current.split('\n');
  const differences = [];
  for (let i = 0; i < Math.max(committedLines.length, currentLines.length); i++) {
    if (committedLines[i] !== currentLines[i]) {
      differences.push(`  line ${i + 1}:`);
      differences.push(`    committed: ${committedLines[i] ?? '(absent)'}`);
      differences.push(`    generated: ${currentLines[i] ?? '(absent)'}`);
      if (differences.length >= 30) break;
    }
  }
  fail(
    `${MANIFEST} no longer matches the live schema. Run scripts/db.sh and commit the result.`,
    differences.join('\n'),
  );
}

console.log(
  'release evidence matches the committed tree ' +
    `(ignoring provenance: ${VOLATILE_FIELDS.join(', ')})`,
);
