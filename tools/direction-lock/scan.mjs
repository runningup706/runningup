#!/usr/bin/env node
/**
 * Direction-lock static scan — master # 22.1.
 *
 * Searches source, content, schema, seed, localization, config and docs for the concepts
 * the user direction lock forbids. It deliberately looks for CONCEPTS, not just strings:
 * a `1250` in a numeric seed, a `trail` enum value and an `endless` feature flag are all
 * caught even when the literal marketing phrase never appears.
 *
 * Files that legitimately discuss the ban (the lock document itself, this scanner, the
 * tests that assert the ban) are allow-listed by path and must state why.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
// The locked numbers live once, in packages/domain/constants.mjs. This scanner used to restate
// the checkpoint count, which meant changing the ladder made the lock itself the last
// thing to notice — it reported the new, correct ladder as a violation.
import { DIRECTION_LOCK } from '../../packages/domain/constants.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const SCAN_EXTENSIONS = new Set(['.mjs', '.js', '.ts', '.cs', '.kt', '.sql', '.json', '.csv', '.md', '.yml', '.yaml', '.toml', '.xml', '.gradle', '.kts']);
const SKIP_DIRS = new Set(['.git', 'node_modules', 'artifacts', 'Library', 'Temp', 'obj', 'bin', '.gradle', 'build']);

/**
 * Paths permitted to mention a forbidden concept, each with the reason it is allowed.
 * Anything not on this list that matches is a hard failure.
 */
const ALLOWLIST = new Map([
  ['docs/USER_DIRECTION_LOCK.md', 'the lock document defines what is forbidden'],
  ['content/schemas/direction_lock.json', 'the machine-readable lock lists the forbidden tokens'],
  ['tools/direction-lock/scan.mjs', 'this scanner contains the patterns it searches for'],
  ['tests/monthly-apex.test.mjs', 'asserts the forbidden tiers do not exist'],
  ['tests/reward.test.mjs', 'asserts forbidden reward inputs are rejected'],
  ['tests/direction-lock.test.mjs', 'asserts the scanner itself works'],
  ['packages/domain/constants.mjs', 'declares the forbidden activity list used for negative tests'],
  ['packages/domain/reward.mjs', 'declares the forbidden reward input keys it rejects'],
  ['tools/content-validator/validate.mjs', 'the content validator names the rules it enforces'],
  ['tools/content-factory/build.mjs', 'the factory asserts the running-only activity set'],
  ['tools/run-fixture-generator/generate.mjs', 'generates the negative fixtures master # 22.6 requires, to prove they are refused'],
  ['content/fixtures/run-fixtures.json', 'negative test corpus: these activities exist only to be rejected'],
  ['tools/anti-cheat-simulator/simulate.mjs', 'reports how the forbidden sources were handled'],
  ['tests/anomaly-detection.test.mjs', 'asserts every forbidden source is rejected'],
  ['client/cli/smoke-play.mjs', 'asserts the played session never reports a rank above World Crown'],
  ['packages/domain/anomaly-detection.mjs', 'names the forbidden sources it refuses'],
  ['docs/balance-evidence/anti-cheat-simulation.json', 'evidence file recording the rejected fixtures'],
  ['packages/domain/monthly-apex.mjs', 'enforces the 1000 km ceiling'],
  ['backend/supabase/migrations/0003_monthly_apex.sql', 'CHECK constraints name the forbidden range'],
  ['backend/supabase/migrations/0002_running.sql', 'activity_type enum excludes the forbidden types by listing the allowed ones'],
  ['backend/supabase/tests/pgtap/03_monthly_apex.sql', 'asserts the forbidden tiers cannot be inserted'],
  ['backend/supabase/tests/pgtap/02_running_scope.sql', 'asserts forbidden activity types are rejected'],
  ['docs/READ_COMPLETE.md', 'records the source requirements including the prohibitions'],
  ['docs/audits/AUDIT_01_USER_DIRECTION.md', 'the direction audit reports what it searched for'],
  ['docs/audits/AUDIT_04_RUNNING_ONLY.md', 'the running-only audit reports what it searched for'],
  ['docs/DECISIONS.md', 'records why the prohibitions are implemented as they are'],
  ['HANDOFF.md', 'reports direction-lock status'],
  ['docs/CURRENT_STATE.md', 'reports which prohibitions are enforced and how'],
  ['requirements/REQUIREMENTS_TRACEABILITY.csv', 'requirement rows name the prohibitions they enforce'],
  ['docs/RISK_REGISTER.md', 'records the risk of a prohibition being reintroduced'],
  ['CHANGELOG.md', 'release notes describe the enforced prohibitions'],
  ['README.md', 'states the product direction including what the game is not'],
  ['CLAUDE.md', 'agent contract restates the lock'],
  ['AGENTS.md', 'agent contract restates the lock'],
  ['docs/AGENT_EXECUTION_CONTRACT.md', 'shared agent contract restates the lock'],
]);

/**
 * Forbidden concept patterns.
 * `id` groups them; `pattern` is matched case-insensitively per line.
 */
const PATTERNS = [
  // --- DL-1: no monthly tier above 1000 km -------------------------------
  { id: 'tier_above_1000', pattern: /\b1[,_]?250\s*km\b/i, why: 'monthly tier above the 1000 km World Crown' },
  { id: 'tier_above_1000', pattern: /\b1[,_]?500\s*km\b/i, why: 'monthly tier above the 1000 km World Crown' },
  { id: 'tier_above_1000', pattern: /\b2[,_]?000\s*km\b/i, why: 'monthly tier above the 1000 km World Crown' },
  { id: 'endless_ladder', pattern: /endless[\s_-]*(ladder|volume|tier|mode)/i, why: 'infinite monthly ladder' },
  { id: 'endless_ladder', pattern: /infinite[\s_-]*(ladder|tier|progression)/i, why: 'infinite monthly ladder' },
  { id: 'rank_above_crown', pattern: /(beyond|above|after)[\s_-]*world[\s_-]*crown/i, why: 'a rank above World Crown' },
  { id: 'rank_above_crown', pattern: /\b(transcend|eternal|infinite)[\s_-]*crown\b/i, why: 'a rank above World Crown' },

  // --- DL-3: running only -------------------------------------------------
  { id: 'trail', pattern: /\btrail[\s_-]*(run|running|mode|badge|quest|reward|leaderboard|stat)/i, why: 'trail running is out of scope' },
  { id: 'hiking', pattern: /\bhiking\b/i, why: 'hiking is out of scope' },
  { id: 'cycling', pattern: /\b(cycling|bike[\s_-]*ride|cyclist)\b/i, why: 'cycling is out of scope' },
  { id: 'climbing', pattern: /\b(mountain[\s_-]*climbing|mountaineering)\b/i, why: 'climbing is out of scope' },
  { id: 'elevation_progression', pattern: /\belevation[\s_-]*(gain|bonus|reward|rank|leaderboard|progression|multiplier|stat)/i, why: 'elevation progression is out of scope' },
  { id: 'elevation_progression', pattern: /\baltitude[\s_-]*(bonus|reward|rank|multiplier)/i, why: 'elevation progression is out of scope' },
  { id: 'weather_multiplier', pattern: /\bweather[\s_-]*(bonus|multiplier|reward)/i, why: 'weather is never a reward input' },
  { id: 'night_multiplier', pattern: /\bnight[\s_-]*(bonus|multiplier|reward)/i, why: 'time of day is never a reward input' },
  { id: 'walking_sport', pattern: /\bwalking[\s_-]*(mode|sport|progression|reward)\b/i, why: 'walking is only a run-walk segment' },

  // --- DL-2: no forced beginner funnel -----------------------------------
  { id: 'forced_prerequisite', pattern: /\b(require|must[\s_-]*complete|prerequisite)[\s_-]*(1[\s_-]*km|3[\s_-]*km)\b/i, why: 'a low-distance prerequisite' },
  { id: 'forced_prerequisite', pattern: /\bbeginner[\s_-]*only[\s_-]*(path|route|funnel|onboarding)\b/i, why: 'a beginner-only onboarding funnel' },
  { id: 'forced_prerequisite', pattern: /\bmandatory[\s_-]*(tutorial[\s_-]*)?(1|3)[\s_-]*km\b/i, why: 'a mandatory low-distance tutorial' },
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (SCAN_EXTENSIONS.has(extname(entry)) || entry === 'VERSION') out.push(full);
  }
  return out;
}

const violations = [];
const allowedHits = [];
let scanned = 0;

for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file);
  const allowReason = ALLOWLIST.get(rel);
  let text;
  try { text = readFileSync(file, 'utf8'); } catch { continue; }
  scanned += 1;
  const lines = text.split('\n');

  for (const { id, pattern, why } of PATTERNS) {
    lines.forEach((line, i) => {
      if (!pattern.test(line)) return;
      const hit = { file: rel, line: i + 1, id, why, text: line.trim().slice(0, 120) };
      if (allowReason) allowedHits.push({ ...hit, allowReason });
      else violations.push(hit);
    });
  }
}

// A numeric sweep over the checkpoint seed, independent of any wording.
const ladder = JSON.parse(readFileSync(join(ROOT, 'content/launch/progression/monthly_apex_0_1000.json'), 'utf8'));
for (const cp of ladder.checkpoints) {
  if (cp.threshold_meters > 1_000_000) {
    violations.push({ file: 'content/launch/progression/monthly_apex_0_1000.json', line: 0, id: 'tier_above_1000', why: 'checkpoint above 1000 km', text: cp.checkpoint_id });
  }
}
if (ladder.checkpoints.length !== DIRECTION_LOCK.CHECKPOINT_COUNT) {
  violations.push({ file: 'content/launch/progression/monthly_apex_0_1000.json', line: 0, id: 'checkpoint_count', why: `the canonical seed is ${DIRECTION_LOCK.CHECKPOINT_COUNT} checkpoints`, text: `found ${ladder.checkpoints.length}` });
}

console.log(`direction-lock scan: ${scanned} files scanned, ${PATTERNS.length} concept patterns`);
console.log(`allow-listed mentions: ${allowedHits.length} (in ${new Set(allowedHits.map((h) => h.file)).size} declared files)`);

if (violations.length > 0) {
  console.log(`\n${violations.length} DIRECTION-LOCK VIOLATION(S):`);
  for (const v of violations) {
    console.log(`  ${v.file}:${v.line} [${v.id}] ${v.why}`);
    console.log(`      ${v.text}`);
  }
  process.exit(1);
}
console.log('\nNo direction-lock violations.');
