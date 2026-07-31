-- =============================================================================
-- RunningUp 0007 — private.apply_verified_run_reward
--
-- The single atomic transaction that turns one verified running session into everything
-- it earns. Master # 16.6 requires this to handle, in one commit:
--
--   Runner Passport snapshot, reward day, Daily Momentum, Consecutive Week,
--   Quality Session Chain, Long-Run Chain, weekly volume, 0..1000 km Monthly Apex
--   progress and every checkpoint crossed, then the modifier snapshot and the ledger.
--
-- Concurrency contract:
--   * the user's monthly progress row is locked FOR UPDATE first, which serialises two
--     sessions finishing at the same instant
--   * the ledger's (user_id, idempotency_key) unique index makes a retry a no-op that
--     returns the original result rather than paying twice
--   * the reward-day row makes the daily streak advance once no matter how many sessions
--     land on the same day, while every session still receives its own full reward
--
-- Direction lock DL-1 behaviour above 1000 km:
--   laddered distance saturates at the crown, the surplus is banked as over_crown_meters,
--   `crossed_checkpoint_ids` comes back empty, the rank stays `world_crown`, and the
--   ordinary per-run reward is still paid in full.
-- =============================================================================

create or replace function private.apply_verified_run_reward(
  p_session_id      uuid,
  p_idempotency_key text,
  p_ladder_version  text default 'apex.v1.0.0'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session        api.run_sessions%rowtype;
  v_verification   private.run_verifications%rowtype;
  v_profile        api.profiles%rowtype;
  v_existing       api.xp_ledger%rowtype;
  v_progress       api.monthly_apex_progress%rowtype;
  v_passport       api.runner_passports%rowtype;

  v_month_key      text;
  v_reward_day     date;
  v_core_eligible  boolean;

  v_raw_before     integer;
  v_raw_after      integer;
  v_ladder_before  integer;
  v_ladder_after   integer;
  v_over_before    integer;
  v_over_after     integer;
  v_progress_existed boolean;
  v_previous_boundary integer;

  v_crossed        text[] := '{}';
  v_crossed_count  integer := 0;
  v_crown_now      boolean := false;
  v_axis_now       boolean := false;

  v_streak_before  integer := 0;
  v_streak_after   integer := 0;
  v_new_streak     integer;
  v_last_reward_day date;
  v_day_existed    boolean;
  v_weekly_meters  integer := 0;
  v_quality_chain  integer := 0;
  v_long_chain     integer := 0;

  v_components     jsonb;
  v_multiplier     numeric(4,2);
  v_subtotal       numeric(12,2);
  v_total          numeric(12,2);
  v_ledger_id      uuid;
  v_cp             record;
begin
  -- ---------------------------------------------------------------------------
  -- Idempotency: a retried upload returns the original outcome, never a second grant.
  -- ---------------------------------------------------------------------------
  select l.* into v_existing
  from api.xp_ledger l
  join api.run_sessions s on s.id = p_session_id
  where l.user_id = s.user_id and l.idempotency_key = p_idempotency_key;

  if found then
    return jsonb_build_object(
      'status', 'already_applied',
      'ledger_entry_id', v_existing.id,
      'final_amount', v_existing.final_amount,
      'crossed_checkpoint_ids', v_existing.crossed_checkpoint_ids,
      'monthly_distance_after', v_existing.monthly_distance_after
    );
  end if;

  select * into v_session from api.run_sessions where id = p_session_id;
  if not found then
    raise exception 'run session % not found', p_session_id using errcode = 'no_data_found';
  end if;

  select * into v_verification from private.run_verifications where session_id = p_session_id;
  if not found then
    raise exception 'run session % has not been verified', p_session_id using errcode = 'check_violation';
  end if;

  select * into v_profile from api.profiles where user_id = v_session.user_id;
  select * into v_passport from api.runner_passports where user_id = v_session.user_id;

  -- Grades D (manual only) and X (non-running source) never feed core power. DL-3 / DL-5.
  v_core_eligible := v_verification.grade in ('A', 'B', 'C')
                     and v_verification.status in ('verified', 'verified_limited');

  v_month_key  := private.month_key(v_session.started_at, v_profile.reward_timezone);
  v_reward_day := private.reward_day(v_session.started_at, v_profile.reward_timezone);

  -- ---------------------------------------------------------------------------
  -- Lock the monthly ladder row FIRST. Everything below depends on it, and this is the
  -- point that serialises two concurrent session finishes for the same user.
  -- ---------------------------------------------------------------------------
  select * into v_progress
  from api.monthly_apex_progress
  where user_id = v_session.user_id and month_key = v_month_key
  for update;

  v_progress_existed := found;

  if not v_progress_existed then
    insert into api.monthly_apex_progress (user_id, month_key, ladder_version, first_run_at)
    values (v_session.user_id, v_month_key, p_ladder_version, v_session.started_at)
    on conflict (user_id, month_key) do nothing;

    select * into v_progress
    from api.monthly_apex_progress
    where user_id = v_session.user_id and month_key = v_month_key
    for update;
    -- A concurrent inserter may have won the race; treat the row as pre-existing then.
    v_progress_existed := v_progress.laddered_meters > 0 or v_progress.over_crown_meters > 0;
  end if;

  v_ladder_before := v_progress.laddered_meters;
  v_over_before   := v_progress.over_crown_meters;
  v_raw_before    := v_ladder_before + v_over_before;

  -- Only core-eligible sessions move the ladder. A rejected or manual-only run keeps its
  -- personal record but contributes no monthly distance.
  v_raw_after   := v_raw_before + case when v_core_eligible then v_session.distance_meters else 0 end;
  v_ladder_after := least(v_raw_after, 1000000);
  v_over_after   := greatest(v_raw_after - 1000000, 0);

  -- ---------------------------------------------------------------------------
  -- Checkpoint crossings. `-1` is the "no progress row yet" sentinel that lets the first
  -- verified run of a month claim the 0 km journey-start checkpoint.
  -- ---------------------------------------------------------------------------
  v_previous_boundary := case when v_progress_existed then v_ladder_before else -1 end;

  for v_cp in
    select checkpoint_id, threshold_meters
    from api.monthly_apex_checkpoints
    where ladder_version = p_ladder_version
      and threshold_meters > v_previous_boundary
      and threshold_meters <= v_ladder_after
    order by threshold_meters asc          -- ascending: claimed in journey order
  loop
    insert into api.monthly_apex_checkpoint_claims (user_id, month_key, checkpoint_id)
    values (v_session.user_id, v_month_key, v_cp.checkpoint_id)
    on conflict (user_id, month_key, checkpoint_id) do nothing;

    if found then
      v_crossed := v_crossed || v_cp.checkpoint_id;
      v_crossed_count := v_crossed_count + 1;
    end if;
  end loop;

  -- ---------------------------------------------------------------------------
  -- World Crown and Apex Axis: exactly once per user-month.
  -- ---------------------------------------------------------------------------
  if v_ladder_after >= 1000000 and not v_progress.world_crown_awarded then
    insert into api.world_crown_history (user_id, month_key, laddered_meters, over_crown_meters_at_award)
    values (v_session.user_id, v_month_key, 1000000, v_over_after)
    on conflict (user_id, month_key) do nothing;
    v_crown_now := found;

    insert into api.apex_boss_unlocks (user_id, month_key)
    values (v_session.user_id, v_month_key)
    on conflict (user_id, month_key) do nothing;
    v_axis_now := found;
  end if;

  update api.monthly_apex_progress
  set laddered_meters     = v_ladder_after,
      over_crown_meters   = v_over_after,
      major_rank          = private.apex_rank_for_meters(v_ladder_after),
      world_crown_awarded = (v_ladder_after >= 1000000),
      apex_axis_unlocked  = apex_axis_unlocked or (v_ladder_after >= 1000000)
  where user_id = v_session.user_id and month_key = v_month_key;

  -- ---------------------------------------------------------------------------
  -- Reward day and Daily Momentum: one increment per reward day, every session paid.
  -- ---------------------------------------------------------------------------
  select true into v_day_existed
  from api.run_reward_days
  where user_id = v_session.user_id and reward_day = v_reward_day;

  insert into api.run_reward_days (user_id, reward_day, month_key, session_count, distance_meters)
  values (v_session.user_id, v_reward_day, v_month_key, 1, v_session.distance_meters)
  on conflict (user_id, reward_day) do update
    set session_count   = api.run_reward_days.session_count + 1,
        distance_meters = api.run_reward_days.distance_meters + excluded.distance_meters;

  insert into api.user_daily_momentum (user_id, current_streak, best_streak, last_reward_day)
  values (v_session.user_id, 0, 0, null)
  on conflict (user_id) do nothing;

  select current_streak, last_reward_day into v_streak_before, v_last_reward_day
  from api.user_daily_momentum where user_id = v_session.user_id for update;

  if v_core_eligible and coalesce(v_day_existed, false) = false then
    v_new_streak := case
      when v_last_reward_day is null              then 1
      when v_last_reward_day = v_reward_day - 1   then v_streak_before + 1
      when v_last_reward_day > v_reward_day       then v_streak_before  -- out-of-order backfill
      else 1                                                            -- a day was missed
    end;

    -- current_streak and best_streak MUST move in the same statement. Splitting them
    -- across two UPDATEs briefly leaves best_streak < current_streak, which the
    -- `momentum_best_ge_current` CHECK correctly rejects.
    update api.user_daily_momentum m
    set current_streak  = v_new_streak,
        -- The lifetime best is raised, never lowered: a missed day costs the current
        -- streak and nothing else.
        best_streak     = greatest(m.best_streak, v_new_streak),
        last_reward_day = greatest(coalesce(m.last_reward_day, v_reward_day), v_reward_day)
    where m.user_id = v_session.user_id;

    v_streak_after := v_new_streak;
  else
    v_streak_after := v_streak_before;
  end if;

  -- Weekly volume across the reward week that contains this session.
  select coalesce(sum(distance_meters), 0)::integer into v_weekly_meters
  from api.run_reward_days
  where user_id = v_session.user_id
    and reward_day between (v_reward_day - extract(isodow from v_reward_day)::integer + 1)
                       and (v_reward_day - extract(isodow from v_reward_day)::integer + 7);

  select current_length into v_quality_chain
  from api.user_chains
  where user_id = v_session.user_id and chain_kind = 'quality_session' and rule_version = '1.0.0';
  select current_length into v_long_chain
  from api.user_chains
  where user_id = v_session.user_id and chain_kind = 'long_run' and rule_version = '1.0.0';

  -- ---------------------------------------------------------------------------
  -- Components. Mirrors packages/domain/reward.mjs; the JS side is a preview, this is the
  -- authority. Both are versioned with the same REWARD_FORMULA_VERSION string.
  -- ---------------------------------------------------------------------------
  if v_core_eligible then
    v_components := jsonb_build_object(
      'base_distance_xp',            round(v_session.distance_meters * 0.10, 2),
      'base_moving_time_xp',         round(v_session.moving_seconds * 0.05, 2),
      'daily_momentum',              round(least(coalesce(v_streak_after, 0), 30) * 8.0, 2),
      'weekly_volume',               round(least(v_weekly_meters, 200000) * 0.002, 2),
      'quality_session_chain',       round(least(coalesce(v_quality_chain, 0), 10) * 30.0, 2),
      'long_run_chain',              round(least(coalesce(v_long_chain, 0), 8) * 35.0, 2),
      'monthly_apex_checkpoint',     round(v_crossed_count * 120.0, 2)
    );
  else
    v_components := jsonb_build_object(
      'base_distance_xp', 0, 'base_moving_time_xp', 0, 'daily_momentum', 0,
      'weekly_volume', 0, 'quality_session_chain', 0, 'long_run_chain', 0,
      'monthly_apex_checkpoint', 0
    );
  end if;

  select coalesce(sum(value::numeric), 0) into v_subtotal
  from jsonb_each_text(v_components);

  v_multiplier := private.apex_monthly_multiplier(v_ladder_after);
  v_total := round(v_subtotal * v_multiplier, 2);

  insert into api.xp_ledger (
    user_id, source_type, source_id, formula_version, passport_version, verification_grade,
    base_components, modifiers, monthly_distance_before, monthly_distance_after,
    crossed_checkpoint_ids, monthly_multiplier, final_amount, idempotency_key
  ) values (
    v_session.user_id,
    case when v_session.source = 'health_connect' then 'current_month_import'::private.core_power_source
         else 'verified_run'::private.core_power_source end,
    v_session.id,
    'reward.v1.0.0',
    v_passport.version,
    v_verification.grade,
    v_components,
    jsonb_build_object(
      'daily_momentum_days', coalesce(v_streak_after, 0),
      'weekly_volume_meters', v_weekly_meters,
      'over_crown_meters', v_over_after,
      'rank', private.apex_rank_for_meters(v_ladder_after)
    ),
    v_ladder_before,
    v_ladder_after,
    to_jsonb(v_crossed),
    v_multiplier,
    v_total,
    p_idempotency_key
  )
  returning id into v_ledger_id;

  update api.monthly_apex_checkpoint_claims
  set ledger_entry_id = v_ledger_id
  where user_id = v_session.user_id and month_key = v_month_key
    and checkpoint_id = any(v_crossed) and ledger_entry_id is null;

  update api.run_sessions set sync_status = 'processed' where id = p_session_id;

  return jsonb_build_object(
    'status', 'applied',
    'ledger_entry_id', v_ledger_id,
    'core_power_eligible', v_core_eligible,
    'monthly_distance_before', v_ladder_before,
    'monthly_distance_after', v_ladder_after,
    'over_crown_meters', v_over_after,
    'over_crown_meters_added', v_over_after - v_over_before,
    'crossed_checkpoint_ids', to_jsonb(v_crossed),
    'crossed_checkpoint_count', v_crossed_count,
    'major_rank', private.apex_rank_for_meters(v_ladder_after),
    'monthly_multiplier', v_multiplier,
    'world_crown_awarded_now', v_crown_now,
    'apex_axis_unlocked_now', v_axis_now,
    'daily_streak_before', coalesce(v_streak_before, 0),
    'daily_streak_after', coalesce(v_streak_after, 0),
    'components', v_components,
    'final_amount', v_total,
    -- DL-1: always true. Running past the crown never stops earning.
    'base_run_reward_applied', v_core_eligible
  );
end;
$$;

revoke all on function private.apply_verified_run_reward(uuid, text, text) from public, anon, authenticated;
grant execute on function private.apply_verified_run_reward(uuid, text, text) to service_role;

/**
 * Current-month import batch: applies many sessions in ONE transaction, in ascending
 * start order, so a user who arrives with 300 km already run this month claims every
 * checkpoint they have genuinely reached, in journey order, exactly once.
 */
create or replace function private.apply_current_month_import(
  p_batch_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_record record;
  v_applied integer := 0;
  v_skipped integer := 0;
  v_crossed text[] := '{}';
  v_result jsonb;
begin
  for v_record in
    select r.session_id, r.id as import_record_id
    from private.run_import_records r
    where r.batch_id = p_batch_id
      and r.outcome = 'included'
      and r.session_id is not null
    order by r.started_at asc            -- out-of-order input, in-order claiming
  loop
    v_result := private.apply_verified_run_reward(
      v_record.session_id,
      'import:' || v_record.import_record_id::text
    );
    if v_result ->> 'status' = 'applied' then
      v_applied := v_applied + 1;
      v_crossed := v_crossed || array(select jsonb_array_elements_text(v_result -> 'crossed_checkpoint_ids'));
    else
      v_skipped := v_skipped + 1;
    end if;
  end loop;

  update private.run_import_batches
  set completed_at = now(), included_count = v_applied
  where id = p_batch_id;

  return jsonb_build_object(
    'status', 'completed',
    'applied', v_applied,
    'skipped_as_duplicate', v_skipped,
    'crossed_checkpoint_ids', to_jsonb(v_crossed),
    'crossed_checkpoint_count', coalesce(array_length(v_crossed, 1), 0)
  );
end;
$$;

revoke all on function private.apply_current_month_import(uuid) from public, anon, authenticated;
grant execute on function private.apply_current_month_import(uuid) to service_role;
