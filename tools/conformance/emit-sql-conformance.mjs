#!/usr/bin/env node
/**
 * Generates a pgTAP suite that replays the conformance fixture against the AUTHORITATIVE
 * SQL implementation.
 *
 * With this file the drift triangle is closed: the JS engine exports the expected results,
 * the C# client replays them (MonthlyApexConformanceTests), and the SQL transaction replays
 * the identical cases here. Any two implementations disagreeing about what a run is worth
 * now fails a build rather than reaching a runner.
 *
 * GENERATED — do not hand-edit the output. Regenerate with:
 *   node tools/conformance/emit-sql-conformance.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const fixture = JSON.parse(
  readFileSync(join(ROOT, 'content', 'conformance', 'monthly-apex-cases.json'), 'utf8'),
);

const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
const lines = [];
const w = (line = '') => lines.push(line);

// Only cases with at least one session can be replayed: the transaction is driven by a
// session, so an empty month has nothing to apply.
const cases = fixture.cases.filter((c) => c.steps.length > 0);
const stepCount = cases.reduce((n, c) => n + c.steps.length, 0);

// 4 assertions per step, plus 5 per case for the final state, plus 2 seed checks.
const planned = stepCount * 4 + cases.length * 5 + 2;

w('-- GENERATED FILE — do not edit by hand.');
w('-- Source: content/conformance/monthly-apex-cases.json');
w('-- Generator: tools/conformance/emit-sql-conformance.mjs');
w('--');
w('-- Replays the cross-implementation conformance fixture against the authoritative SQL');
w('-- transaction. The JS engine produced these expectations and the C# client asserts the');
w('-- same ones, so a disagreement between any two implementations fails a build.');
w('begin;');
w(`select plan(${planned});`);
w('');
w('-- The seed the fixture was generated against must still be the seed in the database.');
w(`select is((select count(*)::int from api.monthly_apex_checkpoints where ladder_version = 'apex.v1.0.0'), ${fixture.checkpoint_meters.length}, 'checkpoint count matches the conformance fixture');`);
w(`select is((select max(threshold_meters) from api.monthly_apex_checkpoints where ladder_version = 'apex.v1.0.0'), ${fixture.checkpoint_meters.at(-1)}, 'final checkpoint matches the conformance fixture');`);
w('');
w('create or replace function pg_temp.conformance_session(');
w('  p_user uuid, p_meters integer, p_started timestamptz');
w(') returns uuid language plpgsql as $fn$');
w('declare v_id uuid;');
w('begin');
w('  insert into api.run_sessions (user_id, activity_type, started_at, ended_at,');
w('                                distance_meters, moving_seconds, elapsed_seconds, server_nonce)');
w("  values (p_user, 'road', p_started, p_started + interval '1 hour',");
w('          p_meters, greatest(p_meters / 3, 1), greatest(p_meters / 3, 1), gen_random_uuid()::text)');
w('  returning id into v_id;');
w("  insert into private.run_verifications (session_id, grade, status) values (v_id, 'A', 'verified');");
w('  return v_id;');
w('end;');
w('$fn$;');
w('');

cases.forEach((testCase, caseIndex) => {
  // A distinct user per case keeps each replay isolated, and a distinct month keeps the
  // ladder fresh without depending on the current date.
  // Hex only: "conf" is not a valid UUID fragment ('n' is not a hex digit).
  const userId = `f0000000-0000-4000-8000-${String(caseIndex + 1).padStart(12, '0')}`;
  const userCode = `CONF${String(caseIndex + 1).padStart(4, '0')}`;

  w(`-- ${'-'.repeat(72)}`);
  w(`-- case: ${testCase.id}`);
  w(`-- ${'-'.repeat(72)}`);
  w(`insert into api.profiles (user_id, display_name, user_code, reward_timezone)`);
  // display_name is capped at 32 characters by CHECK; case ids are longer than that, so
  // the readable id lives in the assertion text rather than in the profile row.
  w(`values (${q(userId)}, ${q(`Conf ${caseIndex + 1}`)}, ${q(userCode)}, 'UTC');`);
  w('');

  testCase.steps.forEach((step, stepIndex) => {
    const key = `conf-${caseIndex}-${stepIndex}`;
    const day = String((stepIndex % 27) + 1).padStart(2, '0');
    const startedAt = `2026-09-${day}T09:00:00+00`;
    const expectedCrossed = step.crossed_checkpoint_ids;

    w(`-- step ${stepIndex + 1}: ${step.session_meters} m`);
    w(`select set_config('runningup.conf_result',`);
    w(`  private.apply_verified_run_reward(`);
    w(`    pg_temp.conformance_session(${q(userId)}, ${step.session_meters}, ${q(startedAt)}::timestamptz),`);
    w(`    ${q(key)})::text, false);`);
    w('');
    w(`select is(`);
    w(`  (current_setting('runningup.conf_result')::jsonb -> 'crossed_checkpoint_ids'),`);
    w(`  ${q(JSON.stringify(expectedCrossed))}::jsonb,`);
    w(`  ${q(`${testCase.id} step ${stepIndex + 1}: crossed checkpoints match the JS engine`)});`);
    w(`select is(`);
    w(`  (current_setting('runningup.conf_result')::jsonb ->> 'major_rank'),`);
    w(`  ${q(step.rank_after)},`);
    w(`  ${q(`${testCase.id} step ${stepIndex + 1}: rank matches`)});`);
    w(`select is(`);
    w(`  (current_setting('runningup.conf_result')::jsonb ->> 'monthly_distance_after')::int,`);
    w(`  ${step.laddered_meters_after},`);
    w(`  ${q(`${testCase.id} step ${stepIndex + 1}: laddered metres match`)});`);
    w(`select is(`);
    w(`  (current_setting('runningup.conf_result')::jsonb ->> 'over_crown_meters')::int,`);
    w(`  ${step.over_crown_meters_after},`);
    w(`  ${q(`${testCase.id} step ${stepIndex + 1}: over-crown metres match`)});`);
    w('');
  });

  const final = testCase.final;
  w(`select is((select laddered_meters from api.monthly_apex_progress where user_id = ${q(userId)} and month_key = '2026-09'), ${final.laddered_meters}, ${q(`${testCase.id} final: laddered metres`)});`);
  w(`select is((select over_crown_meters from api.monthly_apex_progress where user_id = ${q(userId)} and month_key = '2026-09'), ${final.over_crown_meters}, ${q(`${testCase.id} final: over-crown metres`)});`);
  w(`select is((select major_rank::text from api.monthly_apex_progress where user_id = ${q(userId)} and month_key = '2026-09'), ${q(final.rank)}, ${q(`${testCase.id} final: rank`)});`);
  w(`select is((select world_crown_awarded from api.monthly_apex_progress where user_id = ${q(userId)} and month_key = '2026-09'), ${final.world_crown_awarded}, ${q(`${testCase.id} final: World Crown state`)});`);
  w(`select is((select count(*)::int from api.monthly_apex_checkpoint_claims where user_id = ${q(userId)} and month_key = '2026-09'), ${final.total_checkpoints_claimed}, ${q(`${testCase.id} final: total checkpoints claimed`)});`);
  w('');
});

w('select * from finish();');
w('rollback;');

const target = join(ROOT, 'backend', 'supabase', 'tests', 'pgtap', '07_apex_conformance.sql');
writeFileSync(target, `${lines.join('\n')}\n`, 'utf8');

console.log(`generated ${target.replace(`${ROOT}/`, '')}`);
console.log(`  cases replayed : ${cases.length}`);
console.log(`  steps          : ${stepCount}`);
console.log(`  assertions     : ${planned}`);
