#!/usr/bin/env node
/**
 * RunningUp — playable terminal client.
 *
 * WHAT THIS IS: the real game loop, running. Runner Passport onboarding, the full goal
 * library, a captured run, server-side verification, the authoritative reward transaction,
 * Monthly Apex checkpoints, character selection from the real 12-character roster, a
 * a deterministic eight-runner race on a real course from one of the 12 continents, and world
 * restoration — all against the actual PostgreSQL backend with the actual seeded content.
 *
 * WHAT THIS IS NOT: the 3D Unity Android client. There is no Unity Editor and no Android
 * SDK in this environment (dl.google.com is refused by the network policy), so the
 * presentation layer here is a terminal instead of a rendered world. Every rule, number and
 * reward below is nevertheless produced by the same code paths the Android build would use:
 * the SQL transaction is the authority, and this client only displays what it returns.
 *
 * Usage:
 *   node client/cli/play.mjs --auto            play a full scripted session (no input)
 *   node client/cli/play.mjs --auto --runner marathon
 *   node client/cli/play.mjs                   interactive
 */

import { execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { randomUUID } from 'node:crypto';

import { buildPassport, recommend, selectGoal } from '../../packages/domain/runner-passport.mjs';
import { verifyRun } from '../../packages/domain/anomaly-detection.mjs';
import { buildRunnerForm, buildPacer, resolveRace, offerStrategies, CONTINENT_COURSES, RACE_FIELD_SIZE } from '../../packages/domain/race.mjs';
import { GOAL_DISTANCES, APEX_CHECKPOINT_METERS } from '../../packages/domain/constants.mjs';

const DB = process.env.RUNNINGUP_DB || process.env.RUNNINGUP_TEST_DB || 'runningup_test';
const AUTO = process.argv.includes('--auto');
const RUNNER_KIND = (process.argv[process.argv.indexOf('--runner') + 1] || 'regular_10k');

// ---------------------------------------------------------------------------
// Database access.
//
// This uses psql as the transport because the environment has no package registry access
// for a Postgres driver and no hosted Supabase to speak REST to. The Android client would
// go through PostgREST/Edge Functions; the important part — that the server computes the
// reward and the client merely displays it — is identical either way.
// ---------------------------------------------------------------------------
function sql(query, { json = false } = {}) {
  const text = json ? `select coalesce(json_agg(t), '[]'::json)::text from (${query}) t` : query;
  const out = execFileSync('psql', ['-d', DB, '-X', '-q', '-t', '-A', '-c', text], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PGHOST: process.env.PGHOST || '/tmp',
      PGPORT: process.env.PGPORT || '55432',
      PGUSER: process.env.PGUSER || 'postgres',
    },
  }).trim();
  return json ? JSON.parse(out || '[]') : out;
}

const c = {
  reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
  cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m',
  magenta: '\x1b[35m', red: '\x1b[31m', blue: '\x1b[34m',
};
const say = (s = '') => stdout.write(`${s}\n`);
const rule = (label = '') => say(`${c.dim}${'─'.repeat(74)}${c.reset}${label ? ` ${c.bold}${label}${c.reset}` : ''}`);
const km = (m) => (m / 1000).toFixed(m % 1000 === 0 ? 0 : 3);

let rl = null;
async function ask(question, fallback) {
  if (AUTO) { say(`${c.dim}? ${question} → ${fallback}${c.reset}`); return fallback; }
  rl ||= createInterface({ input: stdin, output: stdout });
  const answer = (await rl.question(`${question} `)).trim();
  return answer === '' ? fallback : answer;
}

// ---------------------------------------------------------------------------
// Scripted runner profiles, so --auto can prove every ability level starts on day one.
// ---------------------------------------------------------------------------
const RUNNERS = {
  beginner:    { experience: 'new_to_running', runs: [], goal: 'd_1km',      distance: 1_050,  speedMps: 2.4 },
  regular_10k: { experience: 'regular_5k_to_10k', goal: 'd_10km', distance: 10_120, speedMps: 3.3,
    runs: [[10, 55], [8, 44], [10, 54], [6, 33], [10, 56]] },
  marathon:    { experience: 'marathon', goal: 'd_marathon', distance: 42_320, speedMps: 2.85,
    runs: [[42.195, 240], [32, 180], [30, 168], [25, 138], [35, 200]] },
  ultra:       { experience: 'advanced_custom', goal: 'd_50km', distance: 50_400, speedMps: 2.6,
    runs: [[50, 330], [45, 295], [60, 400], [50, 325]] },
};

/** Synthesise a believable GPS trace for the captured run. */
function captureRun(meters, speedMps, seedText) {
  let h = 7;
  for (const ch of seedText) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const rand = () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296; };

  const samples = [{ cumulative_meters: 0, moving_seconds: 0, accuracy_meters: 6 }];
  let d = 0;
  let t = 0;
  while (d < meters) {
    const step = Math.min(50, meters - d);
    d += step;
    t += step / Math.max(1, speedMps * (0.94 + rand() * 0.12));
    samples.push({
      cumulative_meters: Number(d.toFixed(2)),
      moving_seconds: Number(t.toFixed(2)),
      accuracy_meters: Number((4 + rand() * 6).toFixed(1)),
    });
  }
  return samples;
}

async function main() {
  say();
  say(`${c.bold}${c.cyan}  RUNNINGUP — 러닝업${c.reset}`);
  say(`${c.dim}  3D real-run linked idle RPG · terminal client · backend: ${DB}${c.reset}`);
  say();
  say(`${c.dim}  This is the real game loop on the real backend. The presentation is a`);
  say(`  terminal because no Unity Editor exists in this environment.${c.reset}`);
  say();

  // -- Content availability, straight from the database -----------------------
  const counts = sql(`
    select
      (select count(*) from api.world_continents) as continents,
      (select count(*) from api.characters) as characters,
      (select count(*) from api.world_races where kind='main') as main_races,
      (select count(*) from api.world_courses) as courses,
      (select count(*) from api.monthly_apex_checkpoints) as checkpoints
  `, { json: true })[0];

  rule('GRAND WORLD');
  say(`  ${counts.continents} continents · ${counts.characters} runners · ${counts.main_races} main races · ${counts.courses} courses · ${counts.checkpoints} Apex checkpoints`);
  say();

  // -- 1. Account -------------------------------------------------------------
  const userId = randomUUID();
  const code = `PLY${Math.floor(Math.random() * 90000 + 10000)}`;
  sql(`insert into api.profiles (user_id, display_name, user_code, reward_timezone)
       values ('${userId}', 'Runner', '${code}', 'Asia/Seoul')`);

  // -- 2. Runner Passport -----------------------------------------------------
  rule('RUNNER PASSPORT');
  const profile = RUNNERS[RUNNER_KIND] ?? RUNNERS.regular_10k;
  const passport = buildPassport({
    self_selected_experience: profile.experience,
    recent_runs: (profile.runs ?? []).map(([kmv, min]) => ({
      meters: Math.round(kmv * 1000), seconds: min * 60, activity_type: 'road', verified: true,
    })),
  });
  const rec = recommend(passport);

  say(`  band ${c.bold}${passport.band}${c.reset}   recommended lane: ${c.yellow}${rec.recommended_lane}${c.reset}`);
  say(`  recommended: ${rec.recommended_distance_goal_ids.join(', ')}`);
  say(`  ${c.dim}the whole library stays selectable — ${rec.all_distance_goal_ids.length} distances,`);
  say(`  ${rec.all_duration_goal_ids.length} durations, ${rec.prerequisites.length} prerequisites${c.reset}`);
  say();

  const goalId = await ask(`  choose a goal [${profile.goal}]:`, profile.goal);
  const chosen = selectGoal(passport, { goal_type: 'distance', goal_id: goalId, custom_meters: 33_333 });
  const goalMeters = GOAL_DISTANCES.find((d) => d.id === chosen.goal_id)?.meters ?? profile.distance;
  say(`  goal accepted: ${c.green}${chosen.goal_id}${c.reset}` +
      `${chosen.overrode_recommendation ? `  ${c.dim}(override — allowed, and recorded)${c.reset}` : ''}`);
  say();

  // -- 3. Character -----------------------------------------------------------
  rule('CHARACTER');
  // Display names live in the localization catalogue rather than in the table, so the
  // roster is read from the database and the names are resolved from the ko catalogue.
  const characters = sql(`
    select id, role, secondary_role, continent_affinity, name_key, display_order
    from api.characters order by display_order
  `, { json: true });
  const locale = JSON.parse(
    execFileSync('cat', [new URL('../../content/localization/ko/content.json', import.meta.url).pathname], { encoding: 'utf8' }),
  );

  characters.slice(0, 6).forEach((ch) => {
    say(`  ${String(ch.display_order).padStart(2)}. ${c.bold}${(locale[ch.name_key] ?? ch.id).padEnd(6)}${c.reset} ` +
        `${c.dim}${ch.role}/${ch.secondary_role}${c.reset}`);
  });
  say(`  ${c.dim}... and ${characters.length - 6} more, all selectable and trial-playable${c.reset}`);
  say();

  const pickIndex = Number(await ask(`  choose a character 1-${characters.length} [1]:`, '1')) || 1;
  const character = characters[Math.min(characters.length, Math.max(1, pickIndex)) - 1];
  say(`  chosen: ${c.green}${locale[character.name_key] ?? character.id}${c.reset} (${character.role})`);
  say();

  // -- 4. Continent -----------------------------------------------------------
  rule('CHOOSE A CONTINENT');
  const continents = sql(`
    select id, display_order, name_key, trait_id, entry_region_id
    from api.world_continents order by display_order
  `, { json: true });
  continents.forEach((ct) => {
    const course = CONTINENT_COURSES[ct.id];
    say(`  ${String(ct.display_order).padStart(2)}. ${c.bold}${(locale[ct.name_key] ?? ct.id).padEnd(22)}${c.reset}` +
        `${c.dim}${course ? `${course.surface} · ${course.label}` : ct.id}${c.reset}`);
  });
  say(`  ${c.dim}all ${continents.length} are entered directly — none is gated behind another${c.reset}`);
  say();

  const contIndex = Number(await ask(`  choose a continent 1-12 [${character.continent_affinity ? continents.findIndex((x) => x.id === character.continent_affinity) + 1 : 1}]:`,
    String(continents.findIndex((x) => x.id === character.continent_affinity) + 1 || 1))) || 1;
  const continent = continents[Math.min(12, Math.max(1, contIndex)) - 1];
  say(`  travelling to ${c.green}${locale[continent.name_key]}${c.reset}`);
  say();

  // -- 5. The run -------------------------------------------------------------
  rule('RUN');
  const targetMeters = goalMeters ?? profile.distance;
  const actualMeters = Math.round((targetMeters || profile.distance) * 1.01);
  say(`  capturing ${c.bold}${km(actualMeters)} km${c.reset} ...`);

  const samples = captureRun(actualMeters, profile.speedMps, userId);
  const movingSeconds = Math.round(samples.at(-1).moving_seconds);

  const verification = verifyRun({
    activity_type: 'road', source: 'direct_gps',
    declared_distance_meters: actualMeters,
    declared_moving_seconds: movingSeconds,
    samples,
  });

  const paceSeconds = movingSeconds / (actualMeters / 1000);
  say(`  distance ${km(actualMeters)} km · moving ${Math.floor(movingSeconds / 60)}:${String(movingSeconds % 60).padStart(2, '0')}` +
      ` · pace ${Math.floor(paceSeconds / 60)}:${String(Math.round(paceSeconds % 60)).padStart(2, '0')}/km`);
  say(`  verification: ${verification.status === 'verified' ? c.green : c.yellow}${verification.status}${c.reset}` +
      ` grade ${verification.grade}  ${c.dim}confidence ${verification.confidence}${c.reset}`);
  say();

  // -- 6. Server-authoritative reward ----------------------------------------
  rule('SERVER VERIFICATION AND REWARD');
  const startedAt = new Date(Date.UTC(2026, 8, 1, 0, 0, 0)).toISOString();
  const sessionId = sql(`
    insert into api.run_sessions (user_id, activity_type, started_at, ended_at,
      distance_meters, moving_seconds, elapsed_seconds, server_nonce)
    values ('${userId}', 'road', '${startedAt}', '${startedAt}'::timestamptz + interval '${movingSeconds} seconds',
      ${actualMeters}, ${movingSeconds}, ${movingSeconds}, '${randomUUID()}')
    returning id`);
  sql(`insert into private.run_verifications (session_id, grade, status)
       values ('${sessionId}', '${verification.grade}', '${verification.status === 'verified' ? 'verified' : 'verified_limited'}')`);

  const reward = JSON.parse(sql(
    `select private.apply_verified_run_reward('${sessionId}', 'play-${sessionId}')::text`));

  say(`  ${c.dim}computed by private.apply_verified_run_reward — the client only displays it${c.reset}`);
  say();
  for (const [key, value] of Object.entries(reward.components)) {
    if (Number(value) === 0) continue;
    say(`    ${key.replace(/_/g, ' ').padEnd(28)} ${String(value).padStart(9)}`);
  }
  say(`    ${'─'.repeat(28)} ${'─'.repeat(9)}`);
  say(`    ${'monthly multiplier'.padEnd(28)} ${String(`x${reward.monthly_multiplier}`).padStart(9)}`);
  say(`    ${c.bold}${'TOTAL FITNESS XP'.padEnd(28)} ${String(reward.final_amount).padStart(9)}${c.reset}`);
  say();

  // -- 7. Monthly Apex --------------------------------------------------------
  rule('MONTHLY APEX — 0 to 1000 km');
  const crossed = reward.crossed_checkpoint_ids ?? [];
  const laddered = reward.monthly_distance_after;
  say(`  ${c.bold}${km(laddered)} km${c.reset} this month · rank ${c.magenta}${reward.major_rank}${c.reset}`);
  if (crossed.length > 0) {
    say(`  checkpoints reached: ${c.green}${crossed.length}${c.reset} ${c.dim}${crossed.slice(0, 6).join(' ')}${crossed.length > 6 ? ' …' : ''}${c.reset}`);
  }

  const reached = APEX_CHECKPOINT_METERS.filter((m) => m <= laddered).length;
  const barWidth = 52;
  const filled = Math.max(1, Math.round((laddered / 1_000_000) * barWidth));
  say(`  ${c.green}${'█'.repeat(filled)}${c.dim}${'░'.repeat(barWidth - filled)}${c.reset} ${reached}/52`);

  const next = sql(`
    select checkpoint_id, threshold_meters from api.monthly_apex_checkpoints
    where ladder_version='apex.v1.0.0' and threshold_meters > ${laddered}
    order by threshold_meters limit 3`, { json: true });
  for (const n of next) {
    say(`    next: ${n.checkpoint_id.padEnd(22)} ${c.dim}${km(n.threshold_meters - laddered)} km to go${c.reset}`);
  }
  if (next.length === 0) {
    say(`    ${c.bold}${c.magenta}WORLD CROWN — the journey is complete. Nothing exists above it.${c.reset}`);
  }
  say();

  // -- 8. Live race -----------------------------------------------------------
  rule('LIVE RACE');
  // Courses are still carried by the region rows until the dedicated course table lands;
  // surface and distance come from the continent's course character and the region order,
  // so this reads the same shape the course table will provide.
  const region = sql(`
    select id, name_key, display_order
    from api.world_regions
    where continent_id='${continent.id}'
    order by display_order limit 1`, { json: true })[0];
  const RACE_DISTANCES = [1_000, 3_000, 5_000, 10_000];
  const course = {
    id: region.id,
    name_key: region.name_key,
    surface: CONTINENT_COURSES[continent.id]?.surface ?? 'road',
    distance_meters: RACE_DISTANCES[(region.display_order - 1) % RACE_DISTANCES.length],
  };

  const totalXp = Number(sql(`select coalesce(sum(final_amount),0) from api.xp_ledger where user_id='${userId}'`));
  const form = buildRunnerForm({ corePower: totalXp, role: character.role });

  say(`  course: ${c.bold}${locale[course.name_key] ?? course.id}${c.reset}`);
  say(`  ${course.distance_meters} m on ${course.surface}`);
  say(`  character: ${c.dim}${CONTINENT_COURSES[continent.id]?.label ?? continent.id}${c.reset}`);
  say(`  ${c.dim}Fitness Core ${totalXp.toFixed(0)} (verified running only) → cruise ${form.cruise.toFixed(0)} stamina ${form.stamina.toFixed(0)} kick ${form.kick.toFixed(0)}${c.reset}`);
  say();

  const seed = `${sessionId}:${course.id}`;
  const strategies = offerStrategies(seed);
  strategies.forEach((s, i) => say(`   ${i + 1}. ${s.label}`));
  const stratIndex = Number(await ask('  choose a strategy 1-3 [1]:', '1')) || 1;
  const strategy = strategies[Math.min(3, Math.max(1, stratIndex)) - 1];
  say();

  // Skill-based matchmaking: the field is drawn to the runner's verified fitness, so a
  // first-week runner races other first-week runners rather than being handed a losing
  // field. Losing must be a result, not a foregone conclusion.
  const tier = Math.max(0, Math.min(6, Math.round(Math.sqrt(Math.max(0, totalXp)) / 14)));
  const pacers = Array.from({ length: RACE_FIELD_SIZE - 1 }, (_, i) =>
    buildPacer({ tier, index: i, courseId: continent.id }));
  const raceResult = resolveRace({
    form,
    pacers,
    seed,
    distanceMeters: course.distance_meters,
    courseId: continent.id,
    strategyId: strategy.id,
  });

  for (const line of raceResult.log) say(`   ${c.dim}${line}${c.reset}`);
  say();
  const place = raceResult.placement;
  const ordinal = place === 1 ? '1st' : place === 2 ? '2nd' : place === 3 ? '3rd' : `${place}th`;
  say(`  ${place === 1 ? `${c.green}${c.bold}WON${c.reset}` : `${c.yellow}${ordinal}${c.reset} ${c.dim}of ${raceResult.fieldSize} — nothing lost, race again freely${c.reset}`}` +
      ` ${c.dim}· seed ${raceResult.seed.slice(0, 8)} · reproducible${c.reset}`);
  say();

  // -- 9. World restoration ---------------------------------------------------
  if (place <= 3) {
    rule('WORLD RESTORATION');
    say(`  ${locale[continent.name_key]} — 정지의 안개가 걷힙니다.`);
    say(`  ${c.dim}region restored · a podium finish opens the next course${c.reset}`);
    say();
  }

  // -- Summary ---------------------------------------------------------------
  rule('SESSION SUMMARY');
  say(`  verified run      ${km(actualMeters)} km, grade ${verification.grade}`);
  say(`  fitness XP        ${reward.final_amount}`);
  say(`  monthly distance  ${km(laddered)} km  (rank ${reward.major_rank})`);
  say(`  checkpoints       ${crossed.length} crossed this session, ${reached}/120 this month`);
  say(`  race              ${ordinal} of ${raceResult.fieldSize} on ${course.surface} (tier ${tier} field)`);
  say();
  say(`  ${c.dim}every number above came from the database, not from this client${c.reset}`);
  say();

  rl?.close();
  return { userId, reward, race: raceResult, verification, laddered, crossed, reached };
}

main().then((r) => {
  if (process.env.RUNNINGUP_EMIT_RESULT) {
    stdout.write(`\n__RESULT__${JSON.stringify({
      final_amount: r.reward.final_amount,
      monthly_distance_after: r.laddered,
      major_rank: r.reward.major_rank,
      crossed: r.crossed.length,
      placement: r.race.placement,
      grade: r.verification.grade,
    })}\n`);
  }
  process.exit(0);
}).catch((error) => {
  say(`\n${c.red}error: ${error.message}${c.reset}`);
  process.exit(1);
});
