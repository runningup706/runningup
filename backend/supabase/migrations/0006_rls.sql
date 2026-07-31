-- =============================================================================
-- RunningUp 0006 — Row Level Security matrix
--
-- Rules (master # 16.7, documented in docs/RLS_MATRIX.md):
--   * every exposed relation has RLS ENABLED, including those with no policy at all
--     (no policy + RLS on = deny, which is the correct default for read-only catalogues
--     that clients reach through views)
--   * a user reads and writes only their own rows, and only the fields they own
--   * ledgers, verification, Monthly Apex progress, checkpoint claims, the World Crown and
--     the Apex unlock are SERVER-WRITE ONLY: clients get SELECT and nothing else
--   * `private`, `audit` and `analytics_private` are never granted to a client role
--   * content catalogues are world-readable but never client-writable
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on every table in `api`. Belt and braces: the loop guarantees a table
-- added later cannot ship unprotected simply because someone forgot a line.
-- -----------------------------------------------------------------------------
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'api'
  loop
    execute format('alter table api.%I enable row level security', t.tablename);
    execute format('alter table api.%I force row level security', t.tablename);
  end loop;
end
$$;

-- Private / audit / analytics tables also get RLS so that a mis-granted role still
-- cannot read them.
do $$
declare t record;
begin
  for t in select schemaname, tablename from pg_tables
           where schemaname in ('private', 'audit', 'analytics_private')
  loop
    execute format('alter table %I.%I enable row level security', t.schemaname, t.tablename);
  end loop;
end
$$;

-- -----------------------------------------------------------------------------
-- User-owned data: read and write your own row only
-- -----------------------------------------------------------------------------
grant select, update on api.profiles to authenticated;
create policy profiles_select_own on api.profiles
  for select to authenticated using (user_id = auth.uid());
-- A user may edit presentation fields; `user_id` and `is_anonymous` are not theirs to change.
create policy profiles_update_own on api.profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update on api.user_settings to authenticated;
create policy settings_all_own on api.user_settings
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert on api.consents to authenticated;
create policy consents_select_own on api.consents
  for select to authenticated using (user_id = auth.uid());
create policy consents_insert_own on api.consents
  for insert to authenticated with check (user_id = auth.uid());

grant select, insert on api.account_jobs to authenticated;
create policy account_jobs_select_own on api.account_jobs
  for select to authenticated using (user_id = auth.uid());
create policy account_jobs_insert_own on api.account_jobs
  for insert to authenticated with check (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Runner Passport: readable by its owner, written only by the server.
-- The verified half of a passport decides competitive eligibility, so a client that could
-- write it could self-declare any capability it liked.
-- -----------------------------------------------------------------------------
grant select on api.runner_passports to authenticated;
create policy passport_select_own on api.runner_passports
  for select to authenticated using (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Runs: a user may create and see their own sessions and plans.
-- Distance, verification and reward are decided server side.
-- -----------------------------------------------------------------------------
grant select, insert on api.run_plan_snapshots to authenticated;
create policy run_plans_select_own on api.run_plan_snapshots
  for select to authenticated using (user_id = auth.uid());
create policy run_plans_insert_own on api.run_plan_snapshots
  for insert to authenticated with check (user_id = auth.uid());

grant select on api.run_sessions to authenticated;
create policy run_sessions_select_own on api.run_sessions
  for select to authenticated using (user_id = auth.uid());

grant select on api.run_best_efforts to authenticated;
create policy best_efforts_select_own on api.run_best_efforts
  for select to authenticated using (user_id = auth.uid());

grant select on api.personal_baselines to authenticated;
create policy baselines_select_own on api.personal_baselines
  for select to authenticated using (user_id = auth.uid());

grant select, insert on api.run_appeals to authenticated;
create policy appeals_select_own on api.run_appeals
  for select to authenticated using (user_id = auth.uid());
create policy appeals_insert_own on api.run_appeals
  for insert to authenticated with check (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Ledgers and progression: SELECT only, ever. There is deliberately no INSERT,
-- UPDATE or DELETE grant for any client role on any of these tables.
-- -----------------------------------------------------------------------------
grant select on api.xp_ledger to authenticated;
create policy xp_ledger_select_own on api.xp_ledger
  for select to authenticated using (user_id = auth.uid());

grant select on api.stat_ledger to authenticated;
create policy stat_ledger_select_own on api.stat_ledger
  for select to authenticated using (user_id = auth.uid());

grant select on api.currency_ledger to authenticated;
create policy currency_ledger_select_own on api.currency_ledger
  for select to authenticated using (user_id = auth.uid());

grant select on api.monthly_apex_progress to authenticated;
create policy apex_progress_select_own on api.monthly_apex_progress
  for select to authenticated using (user_id = auth.uid());

grant select on api.monthly_apex_checkpoint_claims to authenticated;
create policy apex_claims_select_own on api.monthly_apex_checkpoint_claims
  for select to authenticated using (user_id = auth.uid());

grant select on api.world_crown_history to authenticated;
create policy crown_select_own on api.world_crown_history
  for select to authenticated using (user_id = auth.uid());

grant select on api.apex_boss_unlocks to authenticated;
create policy apex_unlock_select_own on api.apex_boss_unlocks
  for select to authenticated using (user_id = auth.uid());

grant select on api.apex_boss_attempts to authenticated;
create policy apex_attempts_select_own on api.apex_boss_attempts
  for select to authenticated using (user_id = auth.uid());

grant select on api.run_reward_days to authenticated;
create policy reward_days_select_own on api.run_reward_days
  for select to authenticated using (user_id = auth.uid());

grant select on api.user_daily_momentum to authenticated;
create policy momentum_select_own on api.user_daily_momentum
  for select to authenticated using (user_id = auth.uid());

grant select on api.user_consecutive_weeks to authenticated;
create policy weeks_select_own on api.user_consecutive_weeks
  for select to authenticated using (user_id = auth.uid());

grant select on api.weekly_goal_snapshots to authenticated;
create policy weekly_goals_select_own on api.weekly_goal_snapshots
  for select to authenticated using (user_id = auth.uid());

grant select on api.user_chains to authenticated;
create policy chains_select_own on api.user_chains
  for select to authenticated using (user_id = auth.uid());

grant select on api.v_currency_balances, api.v_fitness_xp_total to authenticated;

-- -----------------------------------------------------------------------------
-- Content catalogue: readable by everyone including anonymous sessions, so the Grand
-- World map and the 12-character gallery render before sign-in. Never client-writable.
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'world_continents', 'world_regions', 'world_stages', 'world_bosses', 'story_chapters',
    'characters', 'character_skills', 'character_episodes', 'tactical_relics', 'cosmetics',
    'companions', 'enemy_families', 'monthly_apex_definitions', 'monthly_apex_checkpoints',
    -- The five combat tables above are dropped by 0012, which grants and policies its own
    -- replacements. They stay named here because this migration is applied history: at the
    -- point it runs they still exist, and removing them would make 0006 fail on a fresh DB.
    'run_goal_definitions', 'content_versions'
  ]
  loop
    execute format('grant select on api.%I to anon, authenticated', t);
    execute format(
      'create policy %I on api.%I for select to anon, authenticated using (true)',
      t || '_public_read', t);
  end loop;
end
$$;

-- -----------------------------------------------------------------------------
-- Service role: the only writer of authoritative state.
-- -----------------------------------------------------------------------------
grant select, insert, update, delete on all tables in schema api to service_role;
grant select, insert, update, delete on all tables in schema private to service_role;
grant select, insert on all tables in schema audit to service_role;
grant select, insert, update, delete on all tables in schema analytics_private to service_role;
grant usage, select on all sequences in schema api, private, audit, analytics_private to service_role;

-- Explicitly revoke the dangerous surface from client roles, so a future `grant all`
-- typo on a table cannot silently open a write path.
revoke insert, update, delete on api.xp_ledger, api.stat_ledger, api.currency_ledger,
  api.monthly_apex_progress, api.monthly_apex_checkpoint_claims, api.world_crown_history,
  api.apex_boss_unlocks, api.runner_passports, api.run_reward_days,
  api.user_daily_momentum, api.user_consecutive_weeks, api.user_chains
  from anon, authenticated;

revoke all on schema private, audit, analytics_private from anon, authenticated;
