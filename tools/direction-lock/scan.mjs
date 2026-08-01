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
import { fileURLToPath, pathToFileURL } from 'node:url';
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
export const ALLOWLIST = new Map([
  ['docs/USER_DIRECTION_LOCK.md', 'the lock document defines what is forbidden'],
  ['content/schemas/direction_lock.json', 'the machine-readable lock lists the forbidden tokens'],
  ['tools/direction-lock/scan.mjs', 'this scanner contains the patterns it searches for'],
  ['tests/monthly-apex.test.mjs', 'asserts the forbidden tiers do not exist'],
  ['tests/reward.test.mjs', 'asserts forbidden reward inputs are rejected'],
  ['tests/direction-lock.test.mjs', 'asserts the scanner itself works'],
  ['tests/race.test.mjs', 'asserts the race engine defines no combat identifiers'],
  ['client/unity/Assets/RunningUp/Tests/EditMode/V14RunnerQualityTests.cs', 'the client-side DL-6 test lists the combat terms it forbids at runtime'],
  ['packages/domain/race.mjs', 'states that prohibited combat concepts are absent from race resolution'],
  ['tools/content-factory/world/world-design.mjs', 'states that the world has no enemies or bosses'],
  ['tools/content-factory/characters/character-design.mjs', 'states that a runner carries no weapon'],
  ['tools/content-factory/build.mjs', 'the factory asserts the running-only activity set'],
  ['backend/supabase/migrations/0005_content.sql', 'applied history: declares the combat catalogue that 0012 drops'],
  ['backend/supabase/migrations/0006_rls.sql', 'applied history: grants the combat catalogue that 0012 drops'],
  ['backend/supabase/migrations/0010_v14_world_regions_192.sql', 'applied history: its floor function still counted the combat catalogue 0012 drops'],
  ['backend/supabase/migrations/0011_v14_world_courses.sql', 'applied history: its floor function still counted the combat catalogue 0012 drops'],
  ['backend/supabase/migrations/0012_v14_race_content.sql', 'names the combat tables in order to drop them'],
  ['docs/audits/AUDIT_06_CHARACTER_CONTENT_DEPTH.md', 'audit record of the combat kit that was later removed'],
  ['backend/supabase/tests/pgtap/05_content_completeness.sql', 'asserts the combat catalogue no longer exists in the schema'],
  ['.github/workflows/android-apk.yml', 'greps the built APK for combat identifiers, so it must name them'],
  ['docs/ANDROID_BUILD.md', 'documents the APK combat scan, quoting the identifiers it searches for'],
  ['docs/DATABASE_SCHEMA.md', 'generated from the live schema, including tables 0012 renames'],
  ['docs/V14_FUNCTION_FIX_PROMPT_KO.md', 'defect analysis quoting the combat code it recommends removing'],
  ['docs/CODEX_V14_APK_BUILD_PROMPT_KO.md', 'build handoff listing the combat removal as out of its scope'],
  ['docs/CODEX_V14_LICENSE_AND_RELEASE_KO.md', 'release handoff quoting the combat identifiers its APK scan searches for'],
  ['docs/REPOSITORY_LAYOUT.md', 'describes the directories the combat content used to occupy'],
  ['packages/domain/constants.mjs', 'declares the forbidden activity list used for negative tests'],
  ['packages/domain/reward.mjs', 'declares the forbidden reward input keys it rejects'],
  ['tools/content-validator/validate.mjs', 'the content validator names the rules it enforces'],
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
export const PATTERNS = [
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

  // --- DL-6: this is a running race, not a combat game --------------------
  //
  // Every alternation below carries a trailing `s?` before the word boundary. Without it
  // "combat role" was caught and "combat roles" was not — and the plural is by far the
  // more natural phrasing in a design document, so the scanner would have reported clean
  // while the real wording walked straight through. tests/direction-lock.test.mjs pins it.
  //
  // Written as concept patterns rather than bare words on purpose. "attack" alone is
  // legitimate vocabulary in the anti-cheat corpus (an attack on the verification
  // system), and "boss" alone appears in ordinary prose. What is forbidden is combat as
  // a game system: a thing with health that you damage until it dies.
  { id: 'combat_boss', pattern: /\b(world|continent|apex|final|raid)[\s_-]*boss(es)?\b/i, why: 'a boss is a combat encounter; the running equivalent is a champion' },
  { id: 'combat_boss', pattern: /\bboss[\s_-]*(fight|battle|phase|key|node|stage|room|rush|hp|health|break)s?\b/i, why: 'a boss is a combat encounter; the running equivalent is a champion' },
  { id: 'combat_enemy', pattern: /\b(enemy|enemies)[\s_-]*(famil(y|ies)|type|unit|spawn|wave|encounter|hp|health)s?\b/i, why: 'an opponent in RunningUp is a rival runner, never an enemy' },
  { id: 'combat_enemy', pattern: /\bmonsters?\b/i, why: 'there are no monsters in a running game' },
  { id: 'combat_battle', pattern: /\b(auto[\s_-]*battle|turn[\s_-]*based[\s_-]*battle)\b/i, why: 'the V5 auto-battle engine is gone; races are resolved by packages/domain/race.mjs' },
  { id: 'combat_battle', pattern: /\bbattle[\s_-]*(stage|node|engine|system|mode|seed|log|result|pass|arena)s?\b/i, why: 'a stage in RunningUp is a race' },
  { id: 'combat_system', pattern: /\bcombat[\s_-]*(role|class|mechanic|stat|power|system|engine|lane|rating)s?\b/i, why: 'combat is not a system this product has' },
  { id: 'combat_stat', pattern: /\b(max[\s_-]?hp|hit[\s_-]*points?)\b/i, why: 'a runner has no health bar' },
  { id: 'combat_stat', pattern: /\b(damage|attack)[\s_-]*(power|stat|value|roll|multiplier|formula|output)s?\b/i, why: 'damage is not a quantity this product computes' },
  { id: 'combat_stat', pattern: /\bbasic[\s_-]*attack\b/i, why: 'a runner has a race signature, not a basic attack' },
  { id: 'combat_kit', pattern: /\btactical[\s_-]*(skill|relic)s?\b/i, why: 'replaced by race techniques and gear sets' },
  { id: 'combat_kit', pattern: /\bweapon[\s_-]*(damage|stat|slot|skin|type)s?\b/i, why: 'a runner carries a kit, not a weapon' },
  { id: 'combat_content', pattern: /\bdungeons?\b/i, why: 'a challenge in RunningUp is a race format' },

  // --- DL-2: no forced beginner funnel -----------------------------------
  { id: 'forced_prerequisite', pattern: /\b(require|must[\s_-]*complete|prerequisite)[\s_-]*(1[\s_-]*km|3[\s_-]*km)\b/i, why: 'a low-distance prerequisite' },
  { id: 'forced_prerequisite', pattern: /\bbeginner[\s_-]*only[\s_-]*(path|route|funnel|onboarding)\b/i, why: 'a beginner-only onboarding funnel' },
  { id: 'forced_prerequisite', pattern: /\bmandatory[\s_-]*(tutorial[\s_-]*)?(1|3)[\s_-]*km\b/i, why: 'a mandatory low-distance tutorial' },
];

export const SCAN_ROOT = ROOT;

/**
 * Nothing below this line runs on import, so `tests/direction-lock.test.mjs` can feed
 * synthetic text through PATTERNS and assert each one actually fires. A scanner whose
 * patterns are never exercised reports "no violations" just as loudly when it is broken.
 */
const RUN_AS_SCRIPT = process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(process.argv[1]).href;

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

if (!RUN_AS_SCRIPT) {
  // Imported for its patterns, not to scan. Stop here.
} else {

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

}
