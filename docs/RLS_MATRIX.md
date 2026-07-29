# RLS_MATRIX

**GENERATED FILE.** Produced by `tools/release/generate-evidence.mjs` by reading
`pg_catalog` on a database with every migration applied. Do not hand-edit: a security
document that has drifted from the schema is worse than no document, because it tells a
reviewer the wrong thing with confidence.

Verified by `backend/supabase/tests/pgtap/01_schema_rls.sql` and `06_profile_write_scope.sql`.

## Reading this table

- ✅ means the role holds the privilege; — means it does not.
- A privilege still passes through RLS: holding `select` on a table does not mean seeing
  every row, only the rows the policy permits.
- `anon` and `authenticated` are the client roles. `service_role` is the server.
- A table-level — with a column-level grant listed underneath means the role may write
  only those named columns. `api.profiles` is the deliberate example: after AUDIT_07,
  presentation fields are writable and identity/attribution fields are not.

## schema `api`

| table | RLS | forced | anon (s/i/u/d) | authenticated (s/i/u/d) | policies |
|---|:--:|:--:|---|---|---|
| `account_jobs` | ✅ | ✅ | — — — — | ✅ ✅ — — | `account_jobs_insert_own` (INSERT)<br>`account_jobs_select_own` (SELECT) |
| ↳ column grant | | | | `authenticated` INSERT | `completed_at, failure_reason, grace_until, id, job_kind, requested_at, status, user_id` |
| ↳ column grant | | | | `authenticated` SELECT | `completed_at, failure_reason, grace_until, id, job_kind, requested_at, status, user_id` |
| `apex_boss_attempts` | ✅ | ✅ | — — — — | ✅ — — — | `apex_attempts_select_own` (SELECT) |
| ↳ column grant | | | | `authenticated` SELECT | `attempt_index, attempted_at, battle_seed, clear_seconds, cleared, id, month_key, user_id` |
| `apex_boss_unlocks` | ✅ | ✅ | — — — — | ✅ — — — | `apex_unlock_select_own` (SELECT) |
| ↳ column grant | | | | `authenticated` SELECT | `boss_id, id, month_key, unlocked_at, user_id` |
| `character_episodes` | ✅ | ✅ | ✅ — — — | ✅ — — — | `character_episodes_public_read` (SELECT) |
| ↳ column grant | | | | `anon` SELECT | `chapter_index, character_id, id, name_key, playable_at_launch, scene_address` |
| ↳ column grant | | | | `authenticated` SELECT | `chapter_index, character_id, id, name_key, playable_at_launch, scene_address` |
| `character_skills` | ✅ | ✅ | ✅ — — — | ✅ — — — | `character_skills_public_read` (SELECT) |
| ↳ column grant | | | | `anon` SELECT | `character_id, core_budget_delta, id, kind, name_key` |
| ↳ column grant | | | | `authenticated` SELECT | `character_id, core_budget_delta, id, kind, name_key` |
| `characters` | ✅ | ✅ | ✅ — — — | ✅ — — — | `characters_public_read` (SELECT) |
| ↳ column grant | | | | `anon` SELECT | `continent_affinity, display_order, id, name_key, paid_gacha, portrait_address, prefab_address, role, secondary_role, trial_available, unlock_path, visible_at_launch` |
| ↳ column grant | | | | `authenticated` SELECT | `continent_affinity, display_order, id, name_key, paid_gacha, portrait_address, prefab_address, role, secondary_role, trial_available, unlock_path, visible_at_launch` |
| `companions` | ✅ | ✅ | ✅ — — — | ✅ — — — | `companions_public_read` (SELECT) |
| ↳ column grant | | | | `anon` SELECT | `continent_id, display_order, expedition_type, grants_core_power, id, name_key` |
| ↳ column grant | | | | `authenticated` SELECT | `continent_id, display_order, expedition_type, grants_core_power, id, name_key` |
| `consents` | ✅ | ✅ | — — — — | ✅ ✅ — — | `consents_insert_own` (INSERT)<br>`consents_select_own` (SELECT) |
| ↳ column grant | | | | `authenticated` INSERT | `consent_kind, consent_version, granted, granted_at, id, user_id` |
| ↳ column grant | | | | `authenticated` SELECT | `consent_kind, consent_version, granted, granted_at, id, user_id` |
| `content_versions` | ✅ | ✅ | ✅ — — — | ✅ — — — | `content_versions_public_read` (SELECT) |
| ↳ column grant | | | | `anon` SELECT | `content_sha256, content_version, effective_at, is_active, minimum_app_version, schema_version` |
| ↳ column grant | | | | `authenticated` SELECT | `content_sha256, content_version, effective_at, is_active, minimum_app_version, schema_version` |
| `cosmetics` | ✅ | ✅ | ✅ — — — | ✅ — — — | `cosmetics_public_read` (SELECT) |
| ↳ column grant | | | | `anon` SELECT | `character_id, core_power, extra_core_reward_multiplier, hidden_stat, id, name_key, purchasable_with_real_money, ranking_multiplier, slot, verification_bonus, xp_multiplier` |
| ↳ column grant | | | | `authenticated` SELECT | `character_id, core_power, extra_core_reward_multiplier, hidden_stat, id, name_key, purchasable_with_real_money, ranking_multiplier, slot, verification_bonus, xp_multiplier` |
| `currency_ledger` | ✅ | ✅ | — — — — | ✅ — — — | `currency_ledger_select_own` (SELECT) |
| ↳ column grant | | | | `authenticated` SELECT | `amount, created_at, currency_kind, id, idempotency_key, source_id, source_type, user_id` |
| `enemy_families` | ✅ | ✅ | ✅ — — — | ✅ — — — | `enemy_families_public_read` (SELECT) |
| ↳ column grant | | | | `anon` SELECT | `behaviour, continent_id, family_kind, id, name_key` |
| ↳ column grant | | | | `authenticated` SELECT | `behaviour, continent_id, family_kind, id, name_key` |
| `monthly_apex_checkpoint_claims` | ✅ | ✅ | — — — — | ✅ — — — | `apex_claims_select_own` (SELECT) |
| ↳ column grant | | | | `authenticated` SELECT | `checkpoint_id, claimed_at, id, ledger_entry_id, month_key, user_id` |
| `monthly_apex_checkpoints` | ✅ | ✅ | ✅ — — — | ✅ — — — | `monthly_apex_checkpoints_public_read` (SELECT) |
| ↳ column grant | | | | `anon` SELECT | `checkpoint_id, content_version, index, is_final, ladder_version, major_rank, name_key, reward_bundle_id, story_or_world_effect, threshold_meters` |
| ↳ column grant | | | | `authenticated` SELECT | `checkpoint_id, content_version, index, is_final, ladder_version, major_rank, name_key, reward_bundle_id, story_or_world_effect, threshold_meters` |
| `monthly_apex_definitions` | ✅ | ✅ | ✅ — — — | ✅ — — — | `monthly_apex_definitions_public_read` (SELECT) |
| ↳ column grant | | | | `anon` SELECT | `checkpoint_count, content_version, effective_at, final_checkpoint_meters, is_active, ladder_version` |
| ↳ column grant | | | | `authenticated` SELECT | `checkpoint_count, content_version, effective_at, final_checkpoint_meters, is_active, ladder_version` |
| `monthly_apex_progress` | ✅ | ✅ | — — — — | ✅ — — — | `apex_progress_select_own` (SELECT) |
| ↳ column grant | | | | `authenticated` SELECT | `apex_axis_unlocked, first_run_at, ladder_version, laddered_meters, major_rank, month_key, over_crown_meters, updated_at, user_id, world_crown_awarded` |
| `personal_baselines` | ✅ | ✅ | — — — — | ✅ — — — | `baselines_select_own` (SELECT) |
| ↳ column grant | | | | `authenticated` SELECT | `baseline_speed_mps, calculated_at, distance_meters, sample_count, user_id, window_days` |
| `profiles` | ✅ | ✅ | — — — — | ✅ — — — | `profiles_select_own` (SELECT)<br>`profiles_update_own` (UPDATE) |
| ↳ column grant | | | | `authenticated` SELECT | `created_at, display_name, is_anonymous, locale, profile_visibility, reward_timezone, updated_at, user_code, user_id` |
| ↳ column grant | | | | `authenticated` UPDATE | `display_name, locale, profile_visibility` |
| `run_appeals` | ✅ | ✅ | — — — — | ✅ ✅ — — | `appeals_insert_own` (INSERT)<br>`appeals_select_own` (SELECT) |
| ↳ column grant | | | | `authenticated` INSERT | `created_at, id, message, resolved_at, session_id, status, user_id` |
| ↳ column grant | | | | `authenticated` SELECT | `created_at, id, message, resolved_at, session_id, status, user_id` |
| `run_best_efforts` | ✅ | ✅ | — — — — | ✅ — — — | `best_efforts_select_own` (SELECT) |
| ↳ column grant | | | | `authenticated` SELECT | `achieved_at, distance_meters, duration_seconds, id, low_confidence, session_id, source_category, speed_mps, user_id` |
| `run_goal_definitions` | ✅ | ✅ | ✅ — — — | ✅ — — — | `run_goal_definitions_public_read` (SELECT) |
| ↳ column grant | | | | `anon` SELECT | `goal_id, goal_type, is_custom, name_key, sort_order, target_meters, target_seconds` |
| ↳ column grant | | | | `authenticated` SELECT | `goal_id, goal_type, is_custom, name_key, sort_order, target_meters, target_seconds` |
| `run_plan_snapshots` | ✅ | ✅ | — — — — | ✅ ✅ — — | `run_plans_insert_own` (INSERT)<br>`run_plans_select_own` (SELECT) |
| ↳ column grant | | | | `authenticated` INSERT | `activity_type, config_version, created_at, difficulty_lane, goal_distance_meters, goal_duration_seconds, goal_id, goal_type, id, passport_version, selected_continent_id, session_style, structured_steps, user_id` |
| ↳ column grant | | | | `authenticated` SELECT | `activity_type, config_version, created_at, difficulty_lane, goal_distance_meters, goal_duration_seconds, goal_id, goal_type, id, passport_version, selected_continent_id, session_style, structured_steps, user_id` |
| `run_reward_days` | ✅ | ✅ | — — — — | ✅ — — — | `reward_days_select_own` (SELECT) |
| ↳ column grant | | | | `authenticated` SELECT | `distance_meters, month_key, reward_day, session_count, user_id` |
| `run_sessions` | ✅ | ✅ | — — — — | ✅ — — — | `run_sessions_select_own` (SELECT) |
| ↳ column grant | | | | `authenticated` SELECT | `activity_type, created_at, distance_meters, elapsed_seconds, ended_at, id, journal_checksum, moving_seconds, run_plan_snapshot_id, server_nonce, source, started_at, structured_completed, sync_status, user_id` |
| `runner_passports` | ✅ | ✅ | — — — — | ✅ — — — | `passport_select_own` (SELECT) |
| ↳ column grant | | | | `authenticated` SELECT | `band, calculated_at, desired_lane, distance_capacity_meters, frequency_per_week, longest_recent_meters, monthly_volume_meters, preferred_goal_id, preferred_surface, profile_confidence, provisional_band, rules_version, source_confidence, typical_run_meters, updated_at, user_id, version, weekly_volume_meters` |
| `stat_ledger` | ✅ | ✅ | — — — — | ✅ — — — | `stat_ledger_select_own` (SELECT) |
| ↳ column grant | | | | `authenticated` SELECT | `amount, created_at, id, stat_kind, user_id, xp_ledger_id` |
| `story_chapters` | ✅ | ✅ | ✅ — — — | ✅ — — — | `story_chapters_public_read` (SELECT) |
| ↳ column grant | | | | `anon` SELECT | `continent_id, display_order, id, requires_previous_chapter, shard_id, title_key` |
| ↳ column grant | | | | `authenticated` SELECT | `continent_id, display_order, id, requires_previous_chapter, shard_id, title_key` |
| `tactical_relics` | ✅ | ✅ | ✅ — — — | ✅ — — — | `tactical_relics_public_read` (SELECT) |
| ↳ column grant | | | | `anon` SELECT | `activation_condition, budget_delta, continent_id, id, name_key, trade_from, trade_to` |
| ↳ column grant | | | | `authenticated` SELECT | `activation_condition, budget_delta, continent_id, id, name_key, trade_from, trade_to` |
| `user_chains` | ✅ | ✅ | — — — — | ✅ — — — | `chains_select_own` (SELECT) |
| ↳ column grant | | | | `authenticated` SELECT | `best_length, chain_kind, current_length, rule_version, updated_at, user_id` |
| `user_consecutive_weeks` | ✅ | ✅ | — — — — | ✅ — — — | `weeks_select_own` (SELECT) |
| ↳ column grant | | | | `authenticated` SELECT | `best_weeks, current_weeks, last_week_key, updated_at, user_id` |
| `user_daily_momentum` | ✅ | ✅ | — — — — | ✅ — — — | `momentum_select_own` (SELECT) |
| ↳ column grant | | | | `authenticated` SELECT | `best_streak, current_streak, last_reward_day, milestones_claimed, updated_at, user_id` |
| `user_settings` | ✅ | ✅ | — — — — | ✅ ✅ ✅ — | `settings_all_own` (ALL) |
| ↳ column grant | | | | `authenticated` INSERT | `audio_cue_frequency, graphics_tier, haptics_enabled, large_text, notification_opt_in, quiet_hours_end, quiet_hours_start, reduced_motion, updated_at, user_id, voice_cues_enabled` |
| ↳ column grant | | | | `authenticated` SELECT | `audio_cue_frequency, graphics_tier, haptics_enabled, large_text, notification_opt_in, quiet_hours_end, quiet_hours_start, reduced_motion, updated_at, user_id, voice_cues_enabled` |
| ↳ column grant | | | | `authenticated` UPDATE | `audio_cue_frequency, graphics_tier, haptics_enabled, large_text, notification_opt_in, quiet_hours_end, quiet_hours_start, reduced_motion, updated_at, user_id, voice_cues_enabled` |
| `weekly_goal_snapshots` | ✅ | ✅ | — — — — | ✅ — — — | `weekly_goals_select_own` (SELECT) |
| ↳ column grant | | | | `authenticated` SELECT | `achieved_value, goal_kind, met, target_value, user_id, week_key` |
| `world_bosses` | ✅ | ✅ | ✅ — — — | ✅ — — — | `world_bosses_public_read` (SELECT) |
| ↳ column grant | | | | `anon` SELECT | `continent_id, id, kind, name_key, phases, scene_address` |
| ↳ column grant | | | | `authenticated` SELECT | `continent_id, id, kind, name_key, phases, scene_address` |
| `world_continents` | ✅ | ✅ | ✅ — — — | ✅ — — — | `world_continents_public_read` (SELECT) |
| ↳ column grant | | | | `anon` SELECT | `content_pack_id, content_version, display_order, entry_region_id, id, mechanic_id, name_key, playable_at_launch, visible_at_first_login` |
| ↳ column grant | | | | `authenticated` SELECT | `content_pack_id, content_version, display_order, entry_region_id, id, mechanic_id, name_key, playable_at_launch, visible_at_first_login` |
| `world_crown_history` | ✅ | ✅ | — — — — | ✅ — — — | `crown_select_own` (SELECT) |
| ↳ column grant | | | | `authenticated` SELECT | `achieved_at, id, laddered_meters, month_key, over_crown_meters_at_award, user_id` |
| `world_regions` | ✅ | ✅ | ✅ — — — | ✅ — — — | `world_regions_public_read` (SELECT) |
| ↳ column grant | | | | `anon` SELECT | `bypass_allowed, continent_id, display_order, id, name_key, node_type, scene_address` |
| ↳ column grant | | | | `authenticated` SELECT | `bypass_allowed, continent_id, display_order, id, name_key, node_type, scene_address` |
| `world_stages` | ✅ | ✅ | ✅ — — — | ✅ — — — | `world_stages_public_read` (SELECT) |
| ↳ column grant | | | | `anon` SELECT | `continent_id, debug_only, display_order, enabled, id, kind, name_key, objective, objective_twist, region_id, reward_table_id, scene_address` |
| ↳ column grant | | | | `authenticated` SELECT | `continent_id, debug_only, display_order, enabled, id, kind, name_key, objective, objective_twist, region_id, reward_table_id, scene_address` |
| `xp_ledger` | ✅ | ✅ | — — — — | ✅ — — — | `xp_ledger_select_own` (SELECT) |
| ↳ column grant | | | | `authenticated` SELECT | `base_components, created_at, crossed_checkpoint_ids, final_amount, formula_version, id, idempotency_key, modifiers, monthly_distance_after, monthly_distance_before, monthly_multiplier, passport_version, reversal_of, source_id, source_type, user_id, verification_grade` |

## schema `private`

> Client roles hold no `USAGE` on `private`, so every cell below is unreachable
> from a client JWT regardless of the table privilege shown.

| table | RLS | forced | anon (s/i/u/d) | authenticated (s/i/u/d) | policies |
|---|:--:|:--:|---|---|---|
| `devices` | ✅ | — | — — — — | — — — — | — |
| `idempotency_keys` | ✅ | — | — — — — | — — — — | — |
| `rate_limit_buckets` | ✅ | — | — — — — | — — — — | — |
| `run_anomaly_flags` | ✅ | — | — — — — | — — — — | — |
| `run_import_batches` | ✅ | — | — — — — | — — — — | — |
| `run_import_records` | ✅ | — | — — — — | — — — — | — |
| `run_samples` | ✅ | — | — — — — | — — — — | — |
| `run_verifications` | ✅ | — | — — — — | — — — — | — |
| `runner_passport_history` | ✅ | — | — — — — | — — — — | — |

## schema `audit`

> Client roles hold no `USAGE` on `audit`, so every cell below is unreachable
> from a client JWT regardless of the table privilege shown.

| table | RLS | forced | anon (s/i/u/d) | authenticated (s/i/u/d) | policies |
|---|:--:|:--:|---|---|---|
| `admin_audit_log` | ✅ | — | — — — — | — — — — | — |
| `reward_reversals` | ✅ | — | — — — — | — — — — | — |
| `security_events` | ✅ | — | — — — — | — — — — | — |
| `timezone_changes` | ✅ | — | — — — — | — — — — | — |

## Server-authoritative invariant

The ledgers and every progression table are readable by their owner and writable by
nobody but the server. Checked at generation time:

**PASS** — no client role holds `insert`, `update` or `delete` on any ledger or progression table.

