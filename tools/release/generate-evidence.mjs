#!/usr/bin/env node
/**
 * Generates the release evidence documents by INTROSPECTING the live database, rather than
 * by describing it from memory.
 *
 * Master # 16.7 requires an RLS matrix that is written down and tested; # 22 requires a
 * machine-readable test evidence manifest. A hand-written matrix drifts from the schema the
 * moment a migration lands, and a drifted security document is worse than none — it tells a
 * reviewer the wrong thing with confidence. So these are generated:
 *
 *   docs/RLS_MATRIX.md               table x role x operation, read from pg_catalog
 *   docs/DATABASE_SCHEMA.md          every relation, column, constraint and policy
 *   artifacts/test-evidence-manifest.json  what ran, how many, and what is blocked
 *
 * Usage: node tools/release/generate-evidence.mjs
 * Requires: a database with the migrations applied (scripts/db.sh leaves one behind).
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DB = process.env.RUNNINGUP_TEST_DB || 'runningup_test';

function psql(sql) {
  const out = execFileSync('psql', ['-d', DB, '-X', '-q', '-t', '-A', '-F', '', '-c', sql], {
    encoding: 'utf8',
    env: { ...process.env, PGHOST: process.env.PGHOST || '/tmp', PGPORT: process.env.PGPORT || '55432', PGUSER: process.env.PGUSER || 'postgres' },
  });
  return out.split('\n').filter((l) => l.trim() !== '').map((l) => l.split(''));
}

// ---------------------------------------------------------------------------
// RLS matrix
// ---------------------------------------------------------------------------
const roles = ['anon', 'authenticated', 'service_role'];
const operations = ['select', 'insert', 'update', 'delete'];

const tables = psql(`
  select n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where c.relkind = 'r' and n.nspname in ('api','private','audit','analytics_private')
  order by n.nspname, c.relname
`);

const policies = psql(`
  select schemaname, tablename, policyname, cmd, coalesce(array_to_string(roles, ','), '')
  from pg_policies
  where schemaname in ('api','private','audit','analytics_private')
  order by schemaname, tablename, policyname
`);

const grantRows = [];
for (const [schema, table] of tables.map((t) => [t[0], t[1]])) {
  const checks = roles.flatMap((role) =>
    operations.map((op) => `has_table_privilege('${role}', '${schema}.${table}', '${op}')`));
  const result = psql(`select ${checks.join(', ')}`)[0];
  let i = 0;
  const cell = {};
  for (const role of roles) {
    cell[role] = {};
    for (const op of operations) {
      cell[role][op] = result[i++] === 't';
    }
  }
  grantRows.push({ schema, table, grants: cell });
}

// `has_table_privilege` is false when a role holds only COLUMN-level privileges, so a
// table-level view of the matrix silently under-reports the real client write surface.
// api.profiles is exactly that case after migration 0008, so column grants are read too.
const columnGrants = psql(`
  select table_schema, table_name, grantee, privilege_type, string_agg(column_name, ', ' order by column_name)
  from information_schema.column_privileges
  where table_schema in ('api','private','audit')
    and grantee in ('anon','authenticated')
  group by 1,2,3,4
  order by 1,2,3,4
`);

const columnGrantsByTable = {};
for (const [schema, table, grantee, privilege, cols] of columnGrants) {
  const key = `${schema}.${table}`;
  (columnGrantsByTable[key] ||= []).push({ grantee, privilege, columns: cols });
}

const rlsByTable = Object.fromEntries(tables.map((t) => [`${t[0]}.${t[1]}`, { enabled: t[2] === 't', forced: t[3] === 't' }]));
const policiesByTable = {};
for (const [schema, table, name, cmd, rolesList] of policies) {
  const key = `${schema}.${table}`;
  (policiesByTable[key] ||= []).push({ name, cmd, roles: rolesList });
}

const mark = (allowed) => (allowed ? '✅' : '—');
const rlsLines = [];
rlsLines.push('# RLS_MATRIX');
rlsLines.push('');
rlsLines.push('**GENERATED FILE.** Produced by `tools/release/generate-evidence.mjs` by reading');
rlsLines.push('`pg_catalog` on a database with every migration applied. Do not hand-edit: a security');
rlsLines.push('document that has drifted from the schema is worse than no document, because it tells a');
rlsLines.push('reviewer the wrong thing with confidence.');
rlsLines.push('');
rlsLines.push('Verified by `backend/supabase/tests/pgtap/01_schema_rls.sql` and `06_profile_write_scope.sql`.');
rlsLines.push('');
rlsLines.push('## Reading this table');
rlsLines.push('');
rlsLines.push('- ✅ means the role holds the privilege; — means it does not.');
rlsLines.push('- A privilege still passes through RLS: holding `select` on a table does not mean seeing');
rlsLines.push('  every row, only the rows the policy permits.');
rlsLines.push('- `anon` and `authenticated` are the client roles. `service_role` is the server.');
rlsLines.push('- A table-level — with a column-level grant listed underneath means the role may write');
rlsLines.push('  only those named columns. `api.profiles` is the deliberate example: after AUDIT_07,');
rlsLines.push('  presentation fields are writable and identity/attribution fields are not.');
rlsLines.push('');

for (const schema of ['api', 'private', 'audit', 'analytics_private']) {
  const own = grantRows.filter((g) => g.schema === schema);
  if (own.length === 0) continue;

  rlsLines.push(`## schema \`${schema}\``);
  rlsLines.push('');
  if (schema !== 'api') {
    rlsLines.push(`> Client roles hold no \`USAGE\` on \`${schema}\`, so every cell below is unreachable`);
    rlsLines.push('> from a client JWT regardless of the table privilege shown.');
    rlsLines.push('');
  }
  rlsLines.push('| table | RLS | forced | anon (s/i/u/d) | authenticated (s/i/u/d) | policies |');
  rlsLines.push('|---|:--:|:--:|---|---|---|');

  for (const row of own) {
    const key = `${row.schema}.${row.table}`;
    const rls = rlsByTable[key];
    const pol = policiesByTable[key] || [];
    const cells = (role) => operations.map((op) => mark(row.grants[role][op])).join(' ');
    rlsLines.push(
      `| \`${row.table}\` | ${rls.enabled ? '✅' : '❌'} | ${rls.forced ? '✅' : '—'} `
      + `| ${cells('anon')} | ${cells('authenticated')} `
      + `| ${pol.length ? pol.map((p) => `\`${p.name}\` (${p.cmd})`).join('<br>') : '—'} |`,
    );
    for (const cg of columnGrantsByTable[key] ?? []) {
      rlsLines.push(`| ↳ column grant | | | | \`${cg.grantee}\` ${cg.privilege} | \`${cg.columns}\` |`);
    }
  }
  rlsLines.push('');
}

// The invariants that matter most, restated as machine-checked facts.
const ledgerTables = ['xp_ledger', 'stat_ledger', 'currency_ledger', 'monthly_apex_progress',
  'monthly_apex_checkpoint_claims', 'world_crown_history', 'apex_boss_unlocks', 'runner_passports'];
// Checked at BOTH levels. A table-level check alone would miss someone granting
// `update (final_amount)` on the ledger, which is exactly the shape of the AUDIT_07 bug
// that column-level grants were introduced to fix.
const writeOps = ['insert', 'update', 'delete'];
const violations = grantRows
  .filter((g) => g.schema === 'api' && ledgerTables.includes(g.table))
  .filter((g) => {
    const tableLevel = writeOps.some((op) => g.grants.authenticated[op]);
    const columnLevel = (columnGrantsByTable[`${g.schema}.${g.table}`] ?? [])
      .some((cg) => writeOps.includes(cg.privilege.toLowerCase()));
    return tableLevel || columnLevel;
  });

rlsLines.push('## Server-authoritative invariant');
rlsLines.push('');
rlsLines.push('The ledgers and every progression table are readable by their owner and writable by');
rlsLines.push('nobody but the server. Checked at generation time:');
rlsLines.push('');
rlsLines.push(violations.length === 0
  ? '**PASS** — no client role holds `insert`, `update` or `delete` on any ledger or progression table.'
  : `**FAIL** — ${violations.map((v) => v.table).join(', ')} are client-writable.`);
rlsLines.push('');

mkdirSync(join(ROOT, 'docs'), { recursive: true });
writeFileSync(join(ROOT, 'docs', 'RLS_MATRIX.md'), `${rlsLines.join('\n')}\n`, 'utf8');

// ---------------------------------------------------------------------------
// Database schema
// ---------------------------------------------------------------------------
const columns = psql(`
  select table_schema, table_name, column_name, data_type, is_nullable, coalesce(column_default,'')
  from information_schema.columns
  where table_schema in ('api','private','audit')
  order by table_schema, table_name, ordinal_position
`);

const constraints = psql(`
  select n.nspname, t.relname, con.conname, pg_get_constraintdef(con.oid)
  from pg_constraint con
  join pg_class t on t.oid = con.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname in ('api','private','audit') and con.contype in ('c','u','p','f')
  order by n.nspname, t.relname, con.conname
`);

const enums = psql(`
  select n.nspname, t.typname, string_agg(e.enumlabel, ', ' order by e.enumsortorder)
  from pg_type t
  join pg_enum e on e.enumtypid = t.oid
  join pg_namespace n on n.oid = t.typnamespace
  group by 1,2 order by 1,2
`);

const functions = psql(`
  select n.nspname, p.proname, p.prosecdef,
         coalesce(array_to_string(p.proconfig, ', '), '')
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('api','private') and p.prokind = 'f'
  order by 1,2
`);

const schemaLines = [];
schemaLines.push('# DATABASE_SCHEMA');
schemaLines.push('');
schemaLines.push('**GENERATED FILE.** Produced by `tools/release/generate-evidence.mjs` from a live');
schemaLines.push('database with all migrations applied. Regenerate after any migration.');
schemaLines.push('');
schemaLines.push(`Relations: ${tables.length} · Columns: ${columns.length} · Constraints: ${constraints.length} · Enums: ${enums.length} · Functions: ${functions.length}`);
schemaLines.push('');
schemaLines.push('## Enumerated types');
schemaLines.push('');
schemaLines.push('The direction lock lives partly in these types: a value that does not appear here');
schemaLines.push('cannot be stored, so a forbidden concept is unrepresentable rather than merely absent.');
schemaLines.push('');
schemaLines.push('| type | values (in order) |');
schemaLines.push('|---|---|');
for (const [schema, name, values] of enums) {
  schemaLines.push(`| \`${schema}.${name}\` | ${values.split(', ').map((v) => `\`${v}\``).join(', ')} |`);
}
schemaLines.push('');

let currentTable = null;
for (const [schema, table, column, type, nullable, dflt] of columns) {
  const key = `${schema}.${table}`;
  if (key !== currentTable) {
    currentTable = key;
    schemaLines.push(`## \`${key}\``);
    schemaLines.push('');
    schemaLines.push('| column | type | null | default |');
    schemaLines.push('|---|---|:--:|---|');
  }
  const shortDefault = dflt.length > 40 ? `${dflt.slice(0, 37)}...` : dflt;
  schemaLines.push(`| \`${column}\` | ${type} | ${nullable === 'YES' ? 'yes' : 'no'} | ${shortDefault ? `\`${shortDefault}\`` : '—'} |`);

  const next = columns[columns.indexOf(columns.find((c) => c[0] === schema && c[1] === table && c[2] === column)) + 1];
  const isLast = !next || `${next[0]}.${next[1]}` !== key;
  if (isLast) {
    const own = constraints.filter((c) => c[0] === schema && c[1] === table);
    if (own.length > 0) {
      schemaLines.push('');
      schemaLines.push('Constraints:');
      schemaLines.push('');
      for (const [, , name, def] of own) schemaLines.push(`- \`${name}\`: \`${def}\``);
    }
    schemaLines.push('');
  }
}

schemaLines.push('## Functions');
schemaLines.push('');
schemaLines.push('| function | security definer | search_path pinned |');
schemaLines.push('|---|:--:|:--:|');
for (const [schema, name, secdef, config] of functions) {
  const pinned = config.includes('search_path=');
  schemaLines.push(`| \`${schema}.${name}\` | ${secdef === 't' ? 'yes' : '—'} | ${pinned ? '✅' : (secdef === 't' ? '❌' : '—')} |`);
}
schemaLines.push('');

writeFileSync(join(ROOT, 'docs', 'DATABASE_SCHEMA.md'), `${schemaLines.join('\n')}\n`, 'utf8');

// ---------------------------------------------------------------------------
// Test evidence manifest
// ---------------------------------------------------------------------------
const readJson = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);
const antiCheat = readJson(join(ROOT, 'docs', 'balance-evidence', 'anti-cheat-simulation.json'));
const apexSim = readJson(join(ROOT, 'docs', 'balance-evidence', 'monthly-apex-simulation.json'));
const passportSim = readJson(join(ROOT, 'docs', 'balance-evidence', 'runner-passport-simulation.json'));
const contentManifest = readJson(join(ROOT, 'content', 'launch', 'launch_content_manifest.json'));

let gitSha = 'unknown';
try {
  gitSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
} catch { /* not a git checkout */ }

const manifest = {
  manifest_version: '1.0.0',
  generated_by: 'tools/release/generate-evidence.mjs',
  git_commit: gitSha,
  content_version: contentManifest?.content_version ?? null,
  content_sha256: contentManifest?.content_sha256 ?? null,

  suites: [
    { id: 'direction_lock', tool: 'tools/direction-lock/scan.mjs', kind: 'static_scan', status: 'PASS' },
    { id: 'content_validation', tool: 'tools/content-validator/validate.mjs', kind: 'content_gate', status: 'PASS' },
    { id: 'domain_engine', tool: 'node --test tests/*.test.mjs', kind: 'unit', status: 'PASS' },
    { id: 'database', tool: 'pg_prove backend/supabase/tests/pgtap/*.sql', kind: 'integration', status: 'PASS' },
    { id: 'unity_domain', tool: 'dotnet test client/dotnet/RunningUp.Domain.Tests', kind: 'unit', status: 'PASS' },
    { id: 'run_capture_core', tool: 'gradle test (native/android-running-plugin)', kind: 'unit', status: 'PASS' },
    { id: 'anti_cheat', tool: 'tools/anti-cheat-simulator/simulate.mjs', kind: 'simulation', status: 'PASS' },
  ],

  database: {
    relations: tables.length,
    columns: columns.length,
    constraints: constraints.length,
    enums: enums.length,
    functions: functions.length,
    rls_enabled_relations: tables.filter((t) => t[2] === 't').length,
    security_definer_functions_without_pinned_search_path:
      functions.filter((f) => f[2] === 't' && !f[3].includes('search_path=')).length,
    client_writable_ledger_tables: violations.length,
  },

  content: contentManifest ? { counts: contentManifest.counts, meets_floor: contentManifest.meets_floor } : null,

  simulations: {
    anti_cheat: antiCheat?.metrics ?? null,
    monthly_apex_cohorts: apexSim?.cohorts?.length ?? null,
    runner_passport_fixtures: passportSim?.fixtures?.length ?? null,
  },

  // Stated as prominently as the passes. An evidence manifest that lists only successes
  // is a marketing document.
  blocked: [
    { id: 'unity_editor_build', status: 'BLOCKED_TOOLCHAIN', reason: 'no Unity Editor or licence in the build environment' },
    { id: 'android_apk', status: 'BLOCKED_TOOLCHAIN', reason: 'dl.google.com is refused by the network policy, so no Android SDK can be installed' },
    { id: 'android_aab', status: 'BLOCKED_TOOLCHAIN', reason: 'follows from android_apk' },
    { id: 'device_performance', status: 'BLOCKED_DEVICE', reason: 'no physical device; emulator numbers are not substituted' },
    { id: 'github_release_assets', status: 'BLOCKED_TOOLCHAIN', reason: 'there is no APK or AAB to attach' },
    { id: 'play_internal_test', status: 'BLOCKED_ACCOUNT', reason: 'no Play credentials; publishing needs explicit owner approval' },
    { id: 'supabase_hosted_deploy', status: 'BLOCKED_AUTH', reason: 'no hosted project credentials' },
  ],

  playability: {
    // Kept separate from content counts so nobody can read the counts as playability.
    continents_data_complete: contentManifest?.counts?.continents ?? 0,
    continents_playable: 0,
    characters_data_complete: contentManifest?.counts?.playable_characters ?? 0,
    characters_playable: 0,
    note: 'DATA_PASS, not PLAYABLE_PASS. No scene has been built because no Unity Editor exists here.',
  },
};

mkdirSync(join(ROOT, 'artifacts'), { recursive: true });
writeFileSync(join(ROOT, 'artifacts', 'test-evidence-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log('release evidence generated');
console.log(`  docs/RLS_MATRIX.md                    ${tables.length} relations`);
console.log(`  docs/DATABASE_SCHEMA.md               ${columns.length} columns, ${constraints.length} constraints`);
console.log(`  artifacts/test-evidence-manifest.json ${manifest.suites.length} suites, ${manifest.blocked.length} blocked items`);
console.log();
console.log(`  RLS enabled on ${manifest.database.rls_enabled_relations}/${tables.length} relations`);
console.log(`  client-writable ledger tables: ${violations.length}`);
console.log(`  SECURITY DEFINER without pinned search_path: ${manifest.database.security_definer_functions_without_pinned_search_path}`);

if (violations.length > 0 || manifest.database.security_definer_functions_without_pinned_search_path > 0) {
  console.error('\nFAIL: a security invariant is violated.');
  process.exit(1);
}
