# DATABASE_SCHEMA

**GENERATED FILE.** Produced by `tools/release/generate-evidence.mjs` from a live
database with all migrations applied. Regenerate after any migration.

Relations: 53 · Columns: 434 · Constraints: 245 · Enums: 9 · Functions: 11

## Enumerated types

The direction lock lives partly in these types: a value that does not appear here
cannot be stored, so a forbidden concept is unrepresentable rather than merely absent.

| type | values (in order) |
|---|---|
| `private.activity_type` | `road`, `track`, `treadmill`, `indoor` |
| `private.apex_rank` | `awakening`, `strider`, `runner`, `challenger`, `vanguard`, `champion`, `master`, `grandmaster`, `legend`, `mythic`, `apex`, `world_crown` |
| `private.core_power_source` | `verified_run`, `current_month_import`, `monthly_apex_checkpoint`, `reversal`, `adjustment` |
| `private.difficulty_lane` | `journey`, `standard`, `veteran`, `master`, `legend`, `apex` |
| `private.passport_band` | `R0`, `R1`, `R2`, `R3`, `R4`, `R5`, `R6`, `R7` |
| `private.session_style` | `s_free`, `s_run_walk`, `s_easy`, `s_steady`, `s_progression`, `s_tempo`, `s_intervals`, `s_fartlek`, `s_long_run`, `s_time_trial`, `s_race_simulation`, `s_track`, `s_treadmill`, `s_indoor`, `s_custom` |
| `private.soft_source` | `quest`, `boss`, `idle`, `expedition`, `crafting`, `season`, `event`, `admin_compensation`, `referral_cosmetic`, `reversal` |
| `private.verification_grade` | `A`, `B`, `C`, `D`, `X` |
| `private.verification_status` | `verified`, `verified_limited`, `pending_review`, `rejected` |

## `api.account_jobs`

| column | type | null | default |
|---|---|:--:|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `user_id` | uuid | no | — |
| `job_kind` | text | no | — |
| `status` | text | no | `'pending'::text` |
| `requested_at` | timestamp with time zone | no | `now()` |
| `completed_at` | timestamp with time zone | yes | — |
| `grace_until` | timestamp with time zone | yes | — |
| `failure_reason` | text | yes | — |

Constraints:

- `account_jobs_job_kind_check`: `CHECK ((job_kind = ANY (ARRAY['export'::text, 'delete'::text])))`
- `account_jobs_pkey`: `PRIMARY KEY (id)`
- `account_jobs_status_check`: `CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'completed'::text, 'failed'::text, 'cancelled'::text])))`
- `account_jobs_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES api.profiles(user_id) ON DELETE CASCADE`

## `api.apex_boss_attempts`

| column | type | null | default |
|---|---|:--:|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `user_id` | uuid | no | — |
| `month_key` | text | no | — |
| `attempt_index` | integer | no | — |
| `cleared` | boolean | no | `false` |
| `clear_seconds` | integer | yes | — |
| `battle_seed` | text | no | — |
| `attempted_at` | timestamp with time zone | no | `now()` |

Constraints:

- `apex_boss_attempts_clear_seconds_check`: `CHECK ((clear_seconds > 0))`
- `apex_boss_attempts_pkey`: `PRIMARY KEY (id)`
- `apex_boss_attempts_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES api.profiles(user_id) ON DELETE CASCADE`
- `apex_boss_attempts_user_id_month_key_attempt_index_key`: `UNIQUE (user_id, month_key, attempt_index)`

## `api.apex_boss_unlocks`

| column | type | null | default |
|---|---|:--:|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `user_id` | uuid | no | — |
| `month_key` | text | no | — |
| `boss_id` | text | no | `'boss_apex_axis'::text` |
| `unlocked_at` | timestamp with time zone | no | `now()` |

Constraints:

- `apex_boss_unlocks_pkey`: `PRIMARY KEY (id)`
- `apex_boss_unlocks_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES api.profiles(user_id) ON DELETE CASCADE`
- `apex_boss_unlocks_user_id_month_key_key`: `UNIQUE (user_id, month_key)`

## `api.character_episodes`

| column | type | null | default |
|---|---|:--:|---|
| `id` | text | no | — |
| `character_id` | text | no | — |
| `chapter_index` | integer | no | — |
| `name_key` | text | no | — |
| `scene_address` | text | no | — |
| `playable_at_launch` | boolean | no | `true` |

Constraints:

- `character_episodes_chapter_index_check`: `CHECK (((chapter_index >= 1) AND (chapter_index <= 3)))`
- `character_episodes_character_id_chapter_index_key`: `UNIQUE (character_id, chapter_index)`
- `character_episodes_character_id_fkey`: `FOREIGN KEY (character_id) REFERENCES api.characters(id) ON DELETE CASCADE`
- `character_episodes_pkey`: `PRIMARY KEY (id)`
- `episode_launch_ready`: `CHECK (playable_at_launch)`

## `api.character_skills`

| column | type | null | default |
|---|---|:--:|---|
| `id` | text | no | — |
| `character_id` | text | no | — |
| `kind` | text | no | — |
| `name_key` | text | no | — |
| `core_budget_delta` | numeric | no | `0` |

Constraints:

- `character_skills_character_id_fkey`: `FOREIGN KEY (character_id) REFERENCES api.characters(id) ON DELETE CASCADE`
- `character_skills_core_budget_delta_check`: `CHECK ((core_budget_delta = (0)::numeric))`
- `character_skills_kind_check`: `CHECK ((kind = ANY (ARRAY['active'::text, 'passive'::text, 'ultimate'::text])))`
- `character_skills_pkey`: `PRIMARY KEY (id)`

## `api.characters`

| column | type | null | default |
|---|---|:--:|---|
| `id` | text | no | — |
| `display_order` | integer | no | — |
| `name_key` | text | no | — |
| `role` | text | no | — |
| `secondary_role` | text | no | — |
| `continent_affinity` | text | yes | — |
| `visible_at_launch` | boolean | no | `true` |
| `trial_available` | boolean | no | `true` |
| `unlock_path` | text | no | — |
| `prefab_address` | text | no | — |
| `portrait_address` | text | no | — |
| `paid_gacha` | boolean | no | `false` |

Constraints:

- `character_launch_ready`: `CHECK ((visible_at_launch AND trial_available AND (NOT paid_gacha)))`
- `characters_continent_affinity_fkey`: `FOREIGN KEY (continent_affinity) REFERENCES api.world_continents(id)`
- `characters_display_order_key`: `UNIQUE (display_order)`
- `characters_pkey`: `PRIMARY KEY (id)`

## `api.companions`

| column | type | null | default |
|---|---|:--:|---|
| `id` | text | no | — |
| `display_order` | integer | no | — |
| `name_key` | text | no | — |
| `continent_id` | text | no | — |
| `expedition_type` | text | no | — |
| `grants_core_power` | boolean | no | `false` |

Constraints:

- `companions_continent_id_fkey`: `FOREIGN KEY (continent_id) REFERENCES api.world_continents(id) ON DELETE CASCADE`
- `companions_display_order_key`: `UNIQUE (display_order)`
- `companions_grants_core_power_check`: `CHECK ((grants_core_power = false))`
- `companions_pkey`: `PRIMARY KEY (id)`

## `api.consents`

| column | type | null | default |
|---|---|:--:|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `user_id` | uuid | no | — |
| `consent_kind` | text | no | — |
| `consent_version` | text | no | — |
| `granted` | boolean | no | — |
| `granted_at` | timestamp with time zone | no | `now()` |

Constraints:

- `consents_consent_kind_check`: `CHECK ((consent_kind = ANY (ARRAY['location'::text, 'health_connect'::text, 'notification'::text, 'analytics'::text, 'route_share'::text, 'terms'::text, 'privacy'::text])))`
- `consents_pkey`: `PRIMARY KEY (id)`
- `consents_user_id_consent_kind_consent_version_key`: `UNIQUE (user_id, consent_kind, consent_version)`
- `consents_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES api.profiles(user_id) ON DELETE CASCADE`

## `api.content_versions`

| column | type | null | default |
|---|---|:--:|---|
| `content_version` | text | no | — |
| `schema_version` | text | no | — |
| `content_sha256` | text | no | — |
| `effective_at` | timestamp with time zone | no | `now()` |
| `minimum_app_version` | text | no | `'1.0.0'::text` |
| `is_active` | boolean | no | `true` |

Constraints:

- `content_versions_pkey`: `PRIMARY KEY (content_version)`

## `api.cosmetics`

| column | type | null | default |
|---|---|:--:|---|
| `id` | text | no | — |
| `character_id` | text | no | — |
| `slot` | text | no | — |
| `name_key` | text | no | — |
| `core_power` | numeric | no | `0` |
| `xp_multiplier` | numeric | no | `0` |
| `ranking_multiplier` | numeric | no | `0` |
| `verification_bonus` | numeric | no | `0` |
| `hidden_stat` | numeric | no | `0` |
| `extra_core_reward_multiplier` | numeric | no | `0` |
| `purchasable_with_real_money` | boolean | no | `false` |

Constraints:

- `cosmetics_character_id_fkey`: `FOREIGN KEY (character_id) REFERENCES api.characters(id) ON DELETE CASCADE`
- `cosmetics_character_id_slot_key`: `UNIQUE (character_id, slot)`
- `cosmetics_core_power_check`: `CHECK ((core_power = (0)::numeric))`
- `cosmetics_extra_core_reward_multiplier_check`: `CHECK ((extra_core_reward_multiplier = (0)::numeric))`
- `cosmetics_hidden_stat_check`: `CHECK ((hidden_stat = (0)::numeric))`
- `cosmetics_pkey`: `PRIMARY KEY (id)`
- `cosmetics_purchasable_with_real_money_check`: `CHECK ((purchasable_with_real_money = false))`
- `cosmetics_ranking_multiplier_check`: `CHECK ((ranking_multiplier = (0)::numeric))`
- `cosmetics_verification_bonus_check`: `CHECK ((verification_bonus = (0)::numeric))`
- `cosmetics_xp_multiplier_check`: `CHECK ((xp_multiplier = (0)::numeric))`

## `api.currency_ledger`

| column | type | null | default |
|---|---|:--:|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `user_id` | uuid | no | — |
| `currency_kind` | text | no | — |
| `source_type` | USER-DEFINED | no | — |
| `source_id` | uuid | yes | — |
| `amount` | numeric | no | — |
| `idempotency_key` | text | no | — |
| `created_at` | timestamp with time zone | no | `now()` |

Constraints:

- `currency_ledger_currency_kind_check`: `CHECK ((currency_kind = ANY (ARRAY['pulse_energy'::text, 'craft_material'::text, 'exploration_charge'::text, 'boss_contribution'::text, 'season_score'::text, 'character_bond'::text, 'crown_shard'::text, 'gold'::text])))`
- `currency_ledger_pkey`: `PRIMARY KEY (id)`
- `currency_ledger_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES api.profiles(user_id) ON DELETE CASCADE`
- `currency_ledger_user_id_idempotency_key_key`: `UNIQUE (user_id, idempotency_key)`

## `api.enemy_families`

| column | type | null | default |
|---|---|:--:|---|
| `id` | text | no | — |
| `continent_id` | text | no | — |
| `family_kind` | text | no | — |
| `name_key` | text | no | — |
| `behaviour` | text | no | — |

Constraints:

- `enemy_families_continent_id_fkey`: `FOREIGN KEY (continent_id) REFERENCES api.world_continents(id) ON DELETE CASCADE`
- `enemy_families_family_kind_check`: `CHECK ((family_kind = ANY (ARRAY['standard'::text, 'elite'::text])))`
- `enemy_families_pkey`: `PRIMARY KEY (id)`

## `api.monthly_apex_checkpoint_claims`

| column | type | null | default |
|---|---|:--:|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `user_id` | uuid | no | — |
| `month_key` | text | no | — |
| `checkpoint_id` | text | no | — |
| `ledger_entry_id` | uuid | yes | — |
| `claimed_at` | timestamp with time zone | no | `now()` |

Constraints:

- `monthly_apex_checkpoint_claim_user_id_month_key_checkpoint__key`: `UNIQUE (user_id, month_key, checkpoint_id)`
- `monthly_apex_checkpoint_claims_checkpoint_id_fkey`: `FOREIGN KEY (checkpoint_id) REFERENCES api.monthly_apex_checkpoints(checkpoint_id)`
- `monthly_apex_checkpoint_claims_pkey`: `PRIMARY KEY (id)`
- `monthly_apex_checkpoint_claims_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES api.profiles(user_id) ON DELETE CASCADE`

## `api.monthly_apex_checkpoints`

| column | type | null | default |
|---|---|:--:|---|
| `checkpoint_id` | text | no | — |
| `ladder_version` | text | no | — |
| `index` | integer | no | — |
| `threshold_meters` | integer | no | — |
| `major_rank` | USER-DEFINED | no | — |
| `reward_bundle_id` | text | no | — |
| `story_or_world_effect` | text | no | — |
| `name_key` | text | no | — |
| `is_final` | boolean | no | `false` |
| `content_version` | text | no | — |

Constraints:

- `apex_cp_final_flag_matches`: `CHECK (((is_final = true) = (threshold_meters = 1000000)))`
- `apex_cp_index_within_ladder`: `CHECK (((index >= 1) AND (index <= 121)))`
- `apex_cp_within_ladder`: `CHECK (((threshold_meters >= 1000) AND (threshold_meters <= 1000000)))`
- `monthly_apex_checkpoints_ladder_version_fkey`: `FOREIGN KEY (ladder_version) REFERENCES api.monthly_apex_definitions(ladder_version)`
- `monthly_apex_checkpoints_ladder_version_index_key`: `UNIQUE (ladder_version, index)`
- `monthly_apex_checkpoints_ladder_version_threshold_meters_key`: `UNIQUE (ladder_version, threshold_meters)`
- `monthly_apex_checkpoints_pkey`: `PRIMARY KEY (checkpoint_id)`

## `api.monthly_apex_definitions`

| column | type | null | default |
|---|---|:--:|---|
| `ladder_version` | text | no | — |
| `final_checkpoint_meters` | integer | no | — |
| `checkpoint_count` | integer | no | — |
| `content_version` | text | no | — |
| `effective_at` | timestamp with time zone | no | `now()` |
| `is_active` | boolean | no | `true` |

Constraints:

- `apex_checkpoint_count_is_121`: `CHECK ((checkpoint_count = 121))`
- `apex_final_is_exactly_1000km`: `CHECK ((final_checkpoint_meters = 1000000))`
- `monthly_apex_definitions_pkey`: `PRIMARY KEY (ladder_version)`

## `api.monthly_apex_progress`

| column | type | null | default |
|---|---|:--:|---|
| `user_id` | uuid | no | — |
| `month_key` | text | no | — |
| `ladder_version` | text | no | — |
| `laddered_meters` | integer | no | `0` |
| `over_crown_meters` | integer | no | `0` |
| `major_rank` | USER-DEFINED | no | `'awakening'::private.apex_rank` |
| `world_crown_awarded` | boolean | no | `false` |
| `apex_axis_unlocked` | boolean | no | `false` |
| `first_run_at` | timestamp with time zone | yes | — |
| `updated_at` | timestamp with time zone | no | `now()` |

Constraints:

- `apex_progress_crown_consistent`: `CHECK ((world_crown_awarded = (laddered_meters >= 1000000)))`
- `apex_progress_laddered_capped`: `CHECK (((laddered_meters >= 0) AND (laddered_meters <= 1000000)))`
- `apex_progress_rank_consistent`: `CHECK (((major_rank = 'world_crown'::private.apex_rank) = (laddered_meters >= 1000000)))`
- `monthly_apex_progress_ladder_version_fkey`: `FOREIGN KEY (ladder_version) REFERENCES api.monthly_apex_definitions(ladder_version)`
- `monthly_apex_progress_month_key_check`: `CHECK ((month_key ~ '^[0-9]{4}-[0-9]{2}$'::text))`
- `monthly_apex_progress_over_crown_meters_check`: `CHECK ((over_crown_meters >= 0))`
- `monthly_apex_progress_pkey`: `PRIMARY KEY (user_id, month_key)`
- `monthly_apex_progress_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES api.profiles(user_id) ON DELETE CASCADE`

## `api.personal_baselines`

| column | type | null | default |
|---|---|:--:|---|
| `user_id` | uuid | no | — |
| `distance_meters` | numeric | no | — |
| `baseline_speed_mps` | numeric | no | — |
| `sample_count` | integer | no | `0` |
| `window_days` | integer | no | `90` |
| `calculated_at` | timestamp with time zone | no | `now()` |

Constraints:

- `personal_baselines_baseline_speed_mps_check`: `CHECK ((baseline_speed_mps > (0)::numeric))`
- `personal_baselines_pkey`: `PRIMARY KEY (user_id, distance_meters)`
- `personal_baselines_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES api.profiles(user_id) ON DELETE CASCADE`

## `api.profiles`

| column | type | null | default |
|---|---|:--:|---|
| `user_id` | uuid | no | — |
| `display_name` | text | no | — |
| `user_code` | text | no | — |
| `reward_timezone` | text | no | `'Asia/Seoul'::text` |
| `locale` | text | no | `'ko'::text` |
| `is_anonymous` | boolean | no | `true` |
| `profile_visibility` | text | no | `'private'::text` |
| `created_at` | timestamp with time zone | no | `now()` |
| `updated_at` | timestamp with time zone | no | `now()` |

Constraints:

- `profiles_display_name_check`: `CHECK (((length(display_name) >= 1) AND (length(display_name) <= 32)))`
- `profiles_locale_check`: `CHECK ((locale = ANY (ARRAY['ko'::text, 'en'::text])))`
- `profiles_pkey`: `PRIMARY KEY (user_id)`
- `profiles_profile_visibility_check`: `CHECK ((profile_visibility = ANY (ARRAY['private'::text, 'friends'::text, 'public'::text])))`
- `profiles_user_code_key`: `UNIQUE (user_code)`

## `api.run_appeals`

| column | type | null | default |
|---|---|:--:|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `session_id` | uuid | no | — |
| `user_id` | uuid | no | — |
| `message` | text | no | — |
| `status` | text | no | `'open'::text` |
| `created_at` | timestamp with time zone | no | `now()` |
| `resolved_at` | timestamp with time zone | yes | — |

Constraints:

- `run_appeals_message_check`: `CHECK (((length(message) >= 1) AND (length(message) <= 2000)))`
- `run_appeals_pkey`: `PRIMARY KEY (id)`
- `run_appeals_session_id_fkey`: `FOREIGN KEY (session_id) REFERENCES api.run_sessions(id) ON DELETE CASCADE`
- `run_appeals_status_check`: `CHECK ((status = ANY (ARRAY['open'::text, 'reviewing'::text, 'upheld'::text, 'overturned'::text])))`
- `run_appeals_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES api.profiles(user_id) ON DELETE CASCADE`

## `api.run_best_efforts`

| column | type | null | default |
|---|---|:--:|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `user_id` | uuid | no | — |
| `session_id` | uuid | no | — |
| `distance_meters` | numeric | no | — |
| `duration_seconds` | numeric | no | — |
| `speed_mps` | numeric | no | — |
| `source_category` | text | no | — |
| `low_confidence` | boolean | no | `false` |
| `achieved_at` | timestamp with time zone | no | — |

Constraints:

- `run_best_efforts_distance_meters_check`: `CHECK ((distance_meters > (0)::numeric))`
- `run_best_efforts_duration_seconds_check`: `CHECK ((duration_seconds > (0)::numeric))`
- `run_best_efforts_pkey`: `PRIMARY KEY (id)`
- `run_best_efforts_session_id_distance_meters_key`: `UNIQUE (session_id, distance_meters)`
- `run_best_efforts_session_id_fkey`: `FOREIGN KEY (session_id) REFERENCES api.run_sessions(id) ON DELETE CASCADE`
- `run_best_efforts_source_category_check`: `CHECK ((source_category = ANY (ARRAY['outdoor'::text, 'indoor'::text])))`
- `run_best_efforts_speed_mps_check`: `CHECK (((speed_mps > (0)::numeric) AND (speed_mps <= 12.5)))`
- `run_best_efforts_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES api.profiles(user_id) ON DELETE CASCADE`

## `api.run_goal_definitions`

| column | type | null | default |
|---|---|:--:|---|
| `goal_id` | text | no | — |
| `goal_type` | text | no | — |
| `target_meters` | numeric | yes | — |
| `target_seconds` | integer | yes | — |
| `name_key` | text | no | — |
| `sort_order` | integer | no | `0` |
| `is_custom` | boolean | no | `false` |

Constraints:

- `run_goal_definitions_goal_type_check`: `CHECK ((goal_type = ANY (ARRAY['distance'::text, 'duration'::text, 'structured'::text, 'free'::text])))`
- `run_goal_definitions_pkey`: `PRIMARY KEY (goal_id)`
- `run_goal_definitions_target_meters_check`: `CHECK ((target_meters > (0)::numeric))`
- `run_goal_definitions_target_seconds_check`: `CHECK ((target_seconds > 0))`

## `api.run_plan_snapshots`

| column | type | null | default |
|---|---|:--:|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `user_id` | uuid | no | — |
| `passport_version` | integer | yes | — |
| `goal_type` | text | no | — |
| `goal_id` | text | yes | — |
| `goal_distance_meters` | numeric | yes | — |
| `goal_duration_seconds` | integer | yes | — |
| `session_style` | USER-DEFINED | no | `'s_free'::private.session_style` |
| `activity_type` | USER-DEFINED | no | `'road'::private.activity_type` |
| `difficulty_lane` | USER-DEFINED | no | `'standard'::private.difficulty_lane` |
| `selected_continent_id` | text | yes | — |
| `structured_steps` | jsonb | yes | — |
| `created_at` | timestamp with time zone | no | `now()` |
| `config_version` | text | no | `'1.0.0'::text` |

Constraints:

- `run_plan_snapshots_goal_distance_meters_check`: `CHECK ((goal_distance_meters > (0)::numeric))`
- `run_plan_snapshots_goal_duration_seconds_check`: `CHECK ((goal_duration_seconds > 0))`
- `run_plan_snapshots_goal_id_fkey`: `FOREIGN KEY (goal_id) REFERENCES api.run_goal_definitions(goal_id)`
- `run_plan_snapshots_goal_type_check`: `CHECK ((goal_type = ANY (ARRAY['distance'::text, 'duration'::text, 'structured'::text, 'free'::text])))`
- `run_plan_snapshots_pkey`: `PRIMARY KEY (id)`
- `run_plan_snapshots_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES api.profiles(user_id) ON DELETE CASCADE`

## `api.run_reward_days`

| column | type | null | default |
|---|---|:--:|---|
| `user_id` | uuid | no | — |
| `reward_day` | date | no | — |
| `month_key` | text | no | — |
| `session_count` | integer | no | `0` |
| `distance_meters` | integer | no | `0` |

Constraints:

- `run_reward_days_distance_meters_check`: `CHECK ((distance_meters >= 0))`
- `run_reward_days_pkey`: `PRIMARY KEY (user_id, reward_day)`
- `run_reward_days_session_count_check`: `CHECK ((session_count >= 0))`
- `run_reward_days_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES api.profiles(user_id) ON DELETE CASCADE`

## `api.run_sessions`

| column | type | null | default |
|---|---|:--:|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `user_id` | uuid | no | — |
| `run_plan_snapshot_id` | uuid | yes | — |
| `activity_type` | USER-DEFINED | no | — |
| `source` | text | no | `'direct_gps'::text` |
| `started_at` | timestamp with time zone | no | — |
| `ended_at` | timestamp with time zone | yes | — |
| `distance_meters` | integer | no | `0` |
| `moving_seconds` | integer | no | `0` |
| `elapsed_seconds` | integer | no | `0` |
| `structured_completed` | boolean | no | `false` |
| `server_nonce` | text | no | — |
| `journal_checksum` | text | yes | — |
| `sync_status` | text | no | `'pending'::text` |
| `created_at` | timestamp with time zone | no | `now()` |

Constraints:

- `run_sessions_distance_meters_check`: `CHECK ((distance_meters >= 0))`
- `run_sessions_elapsed_seconds_check`: `CHECK ((elapsed_seconds >= 0))`
- `run_sessions_moving_seconds_check`: `CHECK ((moving_seconds >= 0))`
- `run_sessions_moving_within_elapsed`: `CHECK (((moving_seconds <= elapsed_seconds) OR (elapsed_seconds = 0)))`
- `run_sessions_pkey`: `PRIMARY KEY (id)`
- `run_sessions_run_plan_snapshot_id_fkey`: `FOREIGN KEY (run_plan_snapshot_id) REFERENCES api.run_plan_snapshots(id)`
- `run_sessions_server_nonce_key`: `UNIQUE (server_nonce)`
- `run_sessions_source_check`: `CHECK ((source = ANY (ARRAY['direct_gps'::text, 'health_connect'::text, 'indoor_sensor'::text, 'manual'::text, 'file_import'::text])))`
- `run_sessions_sync_status_check`: `CHECK ((sync_status = ANY (ARRAY['pending'::text, 'uploaded'::text, 'processed'::text, 'failed'::text])))`
- `run_sessions_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES api.profiles(user_id) ON DELETE CASCADE`

## `api.runner_passports`

| column | type | null | default |
|---|---|:--:|---|
| `user_id` | uuid | no | — |
| `version` | integer | no | `1` |
| `rules_version` | text | no | — |
| `band` | USER-DEFINED | no | — |
| `provisional_band` | USER-DEFINED | yes | — |
| `distance_capacity_meters` | integer | yes | — |
| `typical_run_meters` | integer | yes | — |
| `longest_recent_meters` | integer | yes | — |
| `weekly_volume_meters` | integer | yes | — |
| `monthly_volume_meters` | integer | yes | — |
| `frequency_per_week` | numeric | yes | — |
| `preferred_surface` | USER-DEFINED | no | `'road'::private.activity_type` |
| `preferred_goal_id` | text | yes | — |
| `desired_lane` | USER-DEFINED | yes | — |
| `source_confidence` | numeric | no | `0` |
| `profile_confidence` | numeric | no | `0` |
| `calculated_at` | timestamp with time zone | no | `now()` |
| `updated_at` | timestamp with time zone | no | `now()` |

Constraints:

- `runner_passports_distance_capacity_meters_check`: `CHECK ((distance_capacity_meters >= 0))`
- `runner_passports_frequency_per_week_check`: `CHECK ((frequency_per_week >= (0)::numeric))`
- `runner_passports_longest_recent_meters_check`: `CHECK ((longest_recent_meters >= 0))`
- `runner_passports_monthly_volume_meters_check`: `CHECK ((monthly_volume_meters >= 0))`
- `runner_passports_pkey`: `PRIMARY KEY (user_id)`
- `runner_passports_profile_confidence_check`: `CHECK (((profile_confidence >= (0)::numeric) AND (profile_confidence <= (1)::numeric)))`
- `runner_passports_source_confidence_check`: `CHECK (((source_confidence >= (0)::numeric) AND (source_confidence <= (1)::numeric)))`
- `runner_passports_typical_run_meters_check`: `CHECK ((typical_run_meters >= 0))`
- `runner_passports_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES api.profiles(user_id) ON DELETE CASCADE`
- `runner_passports_weekly_volume_meters_check`: `CHECK ((weekly_volume_meters >= 0))`

## `api.stat_ledger`

| column | type | null | default |
|---|---|:--:|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `user_id` | uuid | no | — |
| `xp_ledger_id` | uuid | no | — |
| `stat_kind` | text | no | — |
| `amount` | numeric | no | — |
| `created_at` | timestamp with time zone | no | `now()` |

Constraints:

- `stat_ledger_pkey`: `PRIMARY KEY (id)`
- `stat_ledger_stat_kind_check`: `CHECK ((stat_kind = ANY (ARRAY['vitality'::text, 'endurance'::text, 'speed'::text, 'tempo'::text, 'pacing'::text, 'momentum'::text, 'resolve'::text])))`
- `stat_ledger_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES api.profiles(user_id) ON DELETE CASCADE`
- `stat_ledger_xp_ledger_id_fkey`: `FOREIGN KEY (xp_ledger_id) REFERENCES api.xp_ledger(id)`

## `api.story_chapters`

| column | type | null | default |
|---|---|:--:|---|
| `id` | text | no | — |
| `display_order` | integer | no | — |
| `continent_id` | text | no | — |
| `title_key` | text | no | — |
| `shard_id` | text | no | — |
| `requires_previous_chapter` | boolean | no | `false` |

Constraints:

- `chapters_are_non_linear`: `CHECK ((requires_previous_chapter = false))`
- `story_chapters_continent_id_fkey`: `FOREIGN KEY (continent_id) REFERENCES api.world_continents(id) ON DELETE CASCADE`
- `story_chapters_display_order_key`: `UNIQUE (display_order)`
- `story_chapters_pkey`: `PRIMARY KEY (id)`
- `story_chapters_shard_id_key`: `UNIQUE (shard_id)`

## `api.tactical_relics`

| column | type | null | default |
|---|---|:--:|---|
| `id` | text | no | — |
| `continent_id` | text | no | — |
| `name_key` | text | no | — |
| `trade_from` | text | no | — |
| `trade_to` | text | no | — |
| `activation_condition` | text | no | — |
| `budget_delta` | numeric | no | `0` |

Constraints:

- `tactical_relics_budget_delta_check`: `CHECK ((budget_delta = (0)::numeric))`
- `tactical_relics_continent_id_fkey`: `FOREIGN KEY (continent_id) REFERENCES api.world_continents(id) ON DELETE CASCADE`
- `tactical_relics_continent_id_trade_from_trade_to_key`: `UNIQUE (continent_id, trade_from, trade_to)`
- `tactical_relics_pkey`: `PRIMARY KEY (id)`

## `api.user_chains`

| column | type | null | default |
|---|---|:--:|---|
| `user_id` | uuid | no | — |
| `chain_kind` | text | no | — |
| `rule_version` | text | no | — |
| `current_length` | integer | no | `0` |
| `best_length` | integer | no | `0` |
| `updated_at` | timestamp with time zone | no | `now()` |

Constraints:

- `chain_best_ge_current`: `CHECK ((best_length >= current_length))`
- `user_chains_best_length_check`: `CHECK ((best_length >= 0))`
- `user_chains_chain_kind_check`: `CHECK ((chain_kind = ANY (ARRAY['quality_session'::text, 'long_run'::text])))`
- `user_chains_current_length_check`: `CHECK ((current_length >= 0))`
- `user_chains_pkey`: `PRIMARY KEY (user_id, chain_kind, rule_version)`
- `user_chains_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES api.profiles(user_id) ON DELETE CASCADE`

## `api.user_consecutive_weeks`

| column | type | null | default |
|---|---|:--:|---|
| `user_id` | uuid | no | — |
| `current_weeks` | integer | no | `0` |
| `best_weeks` | integer | no | `0` |
| `last_week_key` | text | yes | — |
| `updated_at` | timestamp with time zone | no | `now()` |

Constraints:

- `user_consecutive_weeks_best_weeks_check`: `CHECK ((best_weeks >= 0))`
- `user_consecutive_weeks_current_weeks_check`: `CHECK ((current_weeks >= 0))`
- `user_consecutive_weeks_pkey`: `PRIMARY KEY (user_id)`
- `user_consecutive_weeks_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES api.profiles(user_id) ON DELETE CASCADE`
- `weeks_best_ge_current`: `CHECK ((best_weeks >= current_weeks))`

## `api.user_daily_momentum`

| column | type | null | default |
|---|---|:--:|---|
| `user_id` | uuid | no | — |
| `current_streak` | integer | no | `0` |
| `best_streak` | integer | no | `0` |
| `last_reward_day` | date | yes | — |
| `milestones_claimed` | ARRAY | no | `'{}'::integer[]` |
| `updated_at` | timestamp with time zone | no | `now()` |

Constraints:

- `momentum_best_ge_current`: `CHECK ((best_streak >= current_streak))`
- `user_daily_momentum_best_streak_check`: `CHECK ((best_streak >= 0))`
- `user_daily_momentum_current_streak_check`: `CHECK ((current_streak >= 0))`
- `user_daily_momentum_pkey`: `PRIMARY KEY (user_id)`
- `user_daily_momentum_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES api.profiles(user_id) ON DELETE CASCADE`

## `api.user_settings`

| column | type | null | default |
|---|---|:--:|---|
| `user_id` | uuid | no | — |
| `graphics_tier` | text | no | `'auto'::text` |
| `reduced_motion` | boolean | no | `false` |
| `large_text` | boolean | no | `false` |
| `haptics_enabled` | boolean | no | `true` |
| `voice_cues_enabled` | boolean | no | `true` |
| `audio_cue_frequency` | text | no | `'normal'::text` |
| `notification_opt_in` | boolean | no | `false` |
| `quiet_hours_start` | smallint | yes | — |
| `quiet_hours_end` | smallint | yes | — |
| `updated_at` | timestamp with time zone | no | `now()` |

Constraints:

- `user_settings_audio_cue_frequency_check`: `CHECK ((audio_cue_frequency = ANY (ARRAY['off'::text, 'sparse'::text, 'normal'::text, 'frequent'::text])))`
- `user_settings_graphics_tier_check`: `CHECK ((graphics_tier = ANY (ARRAY['auto'::text, 'battery_saver'::text, 'low'::text, 'medium'::text, 'high'::text])))`
- `user_settings_pkey`: `PRIMARY KEY (user_id)`
- `user_settings_quiet_hours_end_check`: `CHECK (((quiet_hours_end >= 0) AND (quiet_hours_end <= 23)))`
- `user_settings_quiet_hours_start_check`: `CHECK (((quiet_hours_start >= 0) AND (quiet_hours_start <= 23)))`
- `user_settings_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES api.profiles(user_id) ON DELETE CASCADE`

## `api.v_currency_balances`

| column | type | null | default |
|---|---|:--:|---|
| `user_id` | uuid | yes | — |
| `currency_kind` | text | yes | — |
| `balance` | numeric | yes | — |

## `api.v_fitness_xp_total`

| column | type | null | default |
|---|---|:--:|---|
| `user_id` | uuid | yes | — |
| `total_fitness_xp` | numeric | yes | — |

## `api.weekly_goal_snapshots`

| column | type | null | default |
|---|---|:--:|---|
| `user_id` | uuid | no | — |
| `week_key` | text | no | — |
| `goal_kind` | text | no | — |
| `target_value` | numeric | no | — |
| `achieved_value` | numeric | no | `0` |
| `met` | boolean | no | `false` |

Constraints:

- `weekly_goal_snapshots_achieved_value_check`: `CHECK ((achieved_value >= (0)::numeric))`
- `weekly_goal_snapshots_goal_kind_check`: `CHECK ((goal_kind = ANY (ARRAY['distance'::text, 'sessions'::text, 'structured'::text, 'performance'::text])))`
- `weekly_goal_snapshots_pkey`: `PRIMARY KEY (user_id, week_key)`
- `weekly_goal_snapshots_target_value_check`: `CHECK ((target_value > (0)::numeric))`
- `weekly_goal_snapshots_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES api.profiles(user_id) ON DELETE CASCADE`
- `weekly_goal_snapshots_week_key_check`: `CHECK ((week_key ~ '^[0-9]{4}-W[0-9]{2}$'::text))`

## `api.world_bosses`

| column | type | null | default |
|---|---|:--:|---|
| `id` | text | no | — |
| `kind` | text | no | — |
| `continent_id` | text | yes | — |
| `name_key` | text | no | — |
| `phases` | ARRAY | no | — |
| `scene_address` | text | no | — |

Constraints:

- `apex_boss_has_no_continent`: `CHECK (((kind <> 'apex_boss'::text) OR (continent_id IS NULL)))`
- `world_bosses_continent_id_fkey`: `FOREIGN KEY (continent_id) REFERENCES api.world_continents(id) ON DELETE CASCADE`
- `world_bosses_kind_check`: `CHECK ((kind = ANY (ARRAY['continent_boss'::text, 'world_boss'::text, 'apex_boss'::text])))`
- `world_bosses_phases_check`: `CHECK ((array_length(phases, 1) >= 3))`
- `world_bosses_pkey`: `PRIMARY KEY (id)`

## `api.world_continents`

| column | type | null | default |
|---|---|:--:|---|
| `id` | text | no | — |
| `display_order` | integer | no | — |
| `name_key` | text | no | — |
| `mechanic_id` | text | no | — |
| `visible_at_first_login` | boolean | no | `true` |
| `playable_at_launch` | boolean | no | `true` |
| `content_pack_id` | text | no | — |
| `entry_region_id` | text | no | — |
| `content_version` | text | no | — |

Constraints:

- `continent_no_coming_soon`: `CHECK ((playable_at_launch AND visible_at_first_login))`
- `world_continents_display_order_key`: `UNIQUE (display_order)`
- `world_continents_mechanic_id_key`: `UNIQUE (mechanic_id)`
- `world_continents_pkey`: `PRIMARY KEY (id)`

## `api.world_courses`

| column | type | null | default |
|---|---|:--:|---|
| `id` | text | no | — |
| `continent_id` | text | no | — |
| `region_id` | text | no | — |
| `display_order` | integer | no | — |
| `name_key` | text | no | — |
| `distance_meters` | integer | no | — |
| `surface` | text | no | — |
| `shape` | text | no | — |
| `scene_address` | text | no | — |
| `reward_table_id` | text | no | — |
| `enabled` | boolean | no | `true` |
| `debug_only` | boolean | no | `false` |
| `content_version` | text | no | — |

Constraints:

- `course_distance_is_positive_metres`: `CHECK ((distance_meters > 0))`
- `course_distance_within_launch_world`: `CHECK ((distance_meters <= 50000))`
- `course_shape_is_known`: `CHECK ((shape = ANY (ARRAY['loop'::text, 'out_and_back'::text, 'point_to_point'::text])))`
- `course_surface_is_running_only`: `CHECK ((surface = ANY (ARRAY['road'::text, 'track'::text, 'treadmill'::text, 'indoor'::text])))`
- `world_courses_continent_id_fkey`: `FOREIGN KEY (continent_id) REFERENCES api.world_continents(id) ON DELETE CASCADE`
- `world_courses_pkey`: `PRIMARY KEY (id)`
- `world_courses_region_id_display_order_key`: `UNIQUE (region_id, display_order)`
- `world_courses_region_id_fkey`: `FOREIGN KEY (region_id) REFERENCES api.world_regions(id) ON DELETE CASCADE`

## `api.world_crown_history`

| column | type | null | default |
|---|---|:--:|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `user_id` | uuid | no | — |
| `month_key` | text | no | — |
| `achieved_at` | timestamp with time zone | no | `now()` |
| `laddered_meters` | integer | no | — |
| `over_crown_meters_at_award` | integer | no | `0` |

Constraints:

- `world_crown_history_laddered_meters_check`: `CHECK ((laddered_meters = 1000000))`
- `world_crown_history_pkey`: `PRIMARY KEY (id)`
- `world_crown_history_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES api.profiles(user_id) ON DELETE CASCADE`
- `world_crown_history_user_id_month_key_key`: `UNIQUE (user_id, month_key)`

## `api.world_regions`

| column | type | null | default |
|---|---|:--:|---|
| `id` | text | no | — |
| `continent_id` | text | no | — |
| `display_order` | integer | no | — |
| `name_key` | text | no | — |
| `node_type` | text | no | — |
| `scene_address` | text | no | — |
| `bypass_allowed` | boolean | no | `true` |

Constraints:

- `world_regions_continent_id_display_order_key`: `UNIQUE (continent_id, display_order)`
- `world_regions_continent_id_fkey`: `FOREIGN KEY (continent_id) REFERENCES api.world_continents(id) ON DELETE CASCADE`
- `world_regions_node_type_check`: `CHECK ((node_type = ANY (ARRAY['battle_node'::text, 'challenge_node'::text, 'continent_boss_node'::text])))`
- `world_regions_pkey`: `PRIMARY KEY (id)`

## `api.world_stages`

| column | type | null | default |
|---|---|:--:|---|
| `id` | text | no | — |
| `continent_id` | text | no | — |
| `region_id` | text | no | — |
| `kind` | text | no | — |
| `display_order` | integer | no | — |
| `name_key` | text | no | — |
| `objective` | text | no | — |
| `objective_twist` | text | no | — |
| `scene_address` | text | no | — |
| `reward_table_id` | text | no | — |
| `enabled` | boolean | no | `true` |
| `debug_only` | boolean | no | `false` |

Constraints:

- `stage_launch_ready`: `CHECK ((enabled AND (NOT debug_only)))`
- `world_stages_continent_id_fkey`: `FOREIGN KEY (continent_id) REFERENCES api.world_continents(id) ON DELETE CASCADE`
- `world_stages_kind_check`: `CHECK ((kind = ANY (ARRAY['main'::text, 'side'::text])))`
- `world_stages_objective_check`: `CHECK ((objective = ANY (ARRAY['survival'::text, 'escort'::text, 'defense'::text, 'elite_hunt'::text, 'boss_break'::text, 'resource_control'::text, 'timed_assault'::text])))`
- `world_stages_pkey`: `PRIMARY KEY (id)`
- `world_stages_region_id_fkey`: `FOREIGN KEY (region_id) REFERENCES api.world_regions(id) ON DELETE CASCADE`

## `api.xp_ledger`

| column | type | null | default |
|---|---|:--:|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `user_id` | uuid | no | — |
| `source_type` | USER-DEFINED | no | — |
| `source_id` | uuid | yes | — |
| `formula_version` | text | no | — |
| `passport_version` | integer | yes | — |
| `verification_grade` | USER-DEFINED | no | — |
| `base_components` | jsonb | no | — |
| `modifiers` | jsonb | no | `'{}'::jsonb` |
| `monthly_distance_before` | integer | no | — |
| `monthly_distance_after` | integer | no | — |
| `crossed_checkpoint_ids` | jsonb | no | `'[]'::jsonb` |
| `monthly_multiplier` | numeric | no | — |
| `final_amount` | numeric | no | — |
| `idempotency_key` | text | no | — |
| `reversal_of` | uuid | yes | — |
| `created_at` | timestamp with time zone | no | `now()` |

Constraints:

- `xp_ledger_amount_sign`: `CHECK ((((reversal_of IS NULL) AND (final_amount >= (0)::numeric)) OR ((reversal_of IS NOT NULL) AND (final_amount <= (0)::numeric))))`
- `xp_ledger_monthly_capped`: `CHECK ((monthly_distance_after <= 1000000))`
- `xp_ledger_monthly_never_regresses`: `CHECK ((monthly_distance_after >= monthly_distance_before))`
- `xp_ledger_multiplier_capped`: `CHECK ((monthly_multiplier <= 1.25))`
- `xp_ledger_pkey`: `PRIMARY KEY (id)`
- `xp_ledger_reversal_of_fkey`: `FOREIGN KEY (reversal_of) REFERENCES api.xp_ledger(id)`
- `xp_ledger_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES api.profiles(user_id) ON DELETE CASCADE`
- `xp_ledger_user_id_idempotency_key_key`: `UNIQUE (user_id, idempotency_key)`

## `audit.admin_audit_log`

| column | type | null | default |
|---|---|:--:|---|
| `id` | bigint | no | `nextval('audit.admin_audit_log_id_seq...` |
| `actor` | text | no | — |
| `action` | text | no | — |
| `subject_kind` | text | yes | — |
| `subject_id` | text | yes | — |
| `reason` | text | yes | — |
| `payload` | jsonb | yes | — |
| `created_at` | timestamp with time zone | no | `now()` |

Constraints:

- `admin_audit_log_pkey`: `PRIMARY KEY (id)`

## `audit.reward_reversals`

| column | type | null | default |
|---|---|:--:|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `original_ledger_id` | uuid | no | — |
| `reversal_ledger_id` | uuid | no | — |
| `actor` | text | no | — |
| `reason` | text | no | — |
| `created_at` | timestamp with time zone | no | `now()` |

Constraints:

- `reward_reversals_original_ledger_id_fkey`: `FOREIGN KEY (original_ledger_id) REFERENCES api.xp_ledger(id)`
- `reward_reversals_pkey`: `PRIMARY KEY (id)`
- `reward_reversals_reversal_ledger_id_fkey`: `FOREIGN KEY (reversal_ledger_id) REFERENCES api.xp_ledger(id)`

## `audit.security_events`

| column | type | null | default |
|---|---|:--:|---|
| `id` | bigint | no | `nextval('audit.security_events_id_seq...` |
| `user_id` | uuid | yes | — |
| `event_kind` | text | no | — |
| `severity` | text | no | `'info'::text` |
| `detail` | jsonb | yes | — |
| `created_at` | timestamp with time zone | no | `now()` |

Constraints:

- `security_events_pkey`: `PRIMARY KEY (id)`
- `security_events_severity_check`: `CHECK ((severity = ANY (ARRAY['info'::text, 'warn'::text, 'critical'::text])))`

## `audit.timezone_changes`

| column | type | null | default |
|---|---|:--:|---|
| `id` | bigint | no | `nextval('audit.timezone_changes_id_se...` |
| `user_id` | uuid | no | — |
| `previous_timezone` | text | no | — |
| `new_timezone` | text | no | — |
| `requested_at` | timestamp with time zone | no | `now()` |
| `effective_at` | timestamp with time zone | no | — |
| `actor` | text | no | — |

Constraints:

- `timezone_changes_pkey`: `PRIMARY KEY (id)`
- `timezone_changes_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES api.profiles(user_id) ON DELETE CASCADE`

## `private.devices`

| column | type | null | default |
|---|---|:--:|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `user_id` | uuid | no | — |
| `install_id` | text | no | — |
| `platform` | text | no | `'android'::text` |
| `app_version` | text | yes | — |
| `os_version` | text | yes | — |
| `first_seen_at` | timestamp with time zone | no | `now()` |
| `last_seen_at` | timestamp with time zone | no | `now()` |

Constraints:

- `devices_pkey`: `PRIMARY KEY (id)`
- `devices_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES api.profiles(user_id) ON DELETE CASCADE`
- `devices_user_id_install_id_key`: `UNIQUE (user_id, install_id)`

## `private.idempotency_keys`

| column | type | null | default |
|---|---|:--:|---|
| `key` | text | no | — |
| `user_id` | uuid | no | — |
| `operation` | text | no | — |
| `result` | jsonb | yes | — |
| `created_at` | timestamp with time zone | no | `now()` |

Constraints:

- `idempotency_keys_pkey`: `PRIMARY KEY (key)`
- `idempotency_keys_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES api.profiles(user_id) ON DELETE CASCADE`

## `private.rate_limit_buckets`

| column | type | null | default |
|---|---|:--:|---|
| `bucket_key` | text | no | — |
| `user_id` | uuid | yes | — |
| `window_start` | timestamp with time zone | no | `now()` |
| `count` | integer | no | `0` |
| `updated_at` | timestamp with time zone | no | `now()` |

Constraints:

- `rate_limit_buckets_pkey`: `PRIMARY KEY (bucket_key)`
- `rate_limit_buckets_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES api.profiles(user_id) ON DELETE CASCADE`

## `private.run_anomaly_flags`

| column | type | null | default |
|---|---|:--:|---|
| `id` | bigint | no | `nextval('private.run_anomaly_flags_id...` |
| `session_id` | uuid | no | — |
| `anomaly_kind` | text | no | — |
| `severity` | text | no | `'info'::text` |
| `detail` | jsonb | yes | — |
| `created_at` | timestamp with time zone | no | `now()` |

Constraints:

- `run_anomaly_flags_pkey`: `PRIMARY KEY (id)`
- `run_anomaly_flags_session_id_fkey`: `FOREIGN KEY (session_id) REFERENCES api.run_sessions(id) ON DELETE CASCADE`
- `run_anomaly_flags_severity_check`: `CHECK ((severity = ANY (ARRAY['info'::text, 'warn'::text, 'critical'::text])))`

## `private.run_import_batches`

| column | type | null | default |
|---|---|:--:|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `user_id` | uuid | no | — |
| `source` | text | no | — |
| `scope` | text | no | — |
| `requested_at` | timestamp with time zone | no | `now()` |
| `completed_at` | timestamp with time zone | yes | — |
| `included_count` | integer | no | `0` |
| `duplicate_count` | integer | no | `0` |
| `rejected_count` | integer | no | `0` |
| `non_running_count` | integer | no | `0` |

Constraints:

- `run_import_batches_pkey`: `PRIMARY KEY (id)`
- `run_import_batches_scope_check`: `CHECK ((scope = ANY (ARRAY['current_month'::text, 'history_90d'::text])))`
- `run_import_batches_source_check`: `CHECK ((source = ANY (ARRAY['health_connect'::text, 'file_import'::text])))`
- `run_import_batches_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES api.profiles(user_id) ON DELETE CASCADE`

## `private.run_import_records`

| column | type | null | default |
|---|---|:--:|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `batch_id` | uuid | no | — |
| `user_id` | uuid | no | — |
| `session_id` | uuid | yes | — |
| `source_app` | text | yes | — |
| `source_record_id` | text | no | — |
| `metric_fingerprint` | text | no | — |
| `started_at` | timestamp with time zone | no | — |
| `ended_at` | timestamp with time zone | no | — |
| `distance_meters` | integer | no | — |
| `outcome` | text | no | — |
| `created_at` | timestamp with time zone | no | `now()` |

Constraints:

- `run_import_records_batch_id_fkey`: `FOREIGN KEY (batch_id) REFERENCES private.run_import_batches(id) ON DELETE CASCADE`
- `run_import_records_distance_meters_check`: `CHECK ((distance_meters >= 0))`
- `run_import_records_outcome_check`: `CHECK ((outcome = ANY (ARRAY['included'::text, 'duplicate'::text, 'non_running'::text, 'rejected'::text, 'limited'::text])))`
- `run_import_records_pkey`: `PRIMARY KEY (id)`
- `run_import_records_session_id_fkey`: `FOREIGN KEY (session_id) REFERENCES api.run_sessions(id) ON DELETE SET NULL`
- `run_import_records_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES api.profiles(user_id) ON DELETE CASCADE`
- `run_import_records_user_id_metric_fingerprint_key`: `UNIQUE (user_id, metric_fingerprint)`
- `run_import_records_user_id_source_record_id_key`: `UNIQUE (user_id, source_record_id)`

## `private.run_samples`

| column | type | null | default |
|---|---|:--:|---|
| `session_id` | uuid | no | — |
| `sequence` | integer | no | — |
| `cumulative_meters` | numeric | no | — |
| `moving_seconds` | numeric | no | — |
| `latitude` | numeric | yes | — |
| `longitude` | numeric | yes | — |
| `accuracy_meters` | numeric | yes | — |
| `speed_mps` | numeric | yes | — |
| `altitude_meters` | numeric | yes | — |
| `recorded_at` | timestamp with time zone | no | — |

Constraints:

- `run_samples_pkey`: `PRIMARY KEY (session_id, sequence)`
- `run_samples_session_id_fkey`: `FOREIGN KEY (session_id) REFERENCES api.run_sessions(id) ON DELETE CASCADE`

## `private.run_verifications`

| column | type | null | default |
|---|---|:--:|---|
| `session_id` | uuid | no | — |
| `grade` | USER-DEFINED | no | — |
| `status` | USER-DEFINED | no | — |
| `confidence` | numeric | no | `1` |
| `reason_codes` | ARRAY | no | `'{}'::text[]` |
| `verified_at` | timestamp with time zone | no | `now()` |
| `reviewed_by` | text | yes | — |

Constraints:

- `run_verifications_confidence_check`: `CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric)))`
- `run_verifications_pkey`: `PRIMARY KEY (session_id)`
- `run_verifications_session_id_fkey`: `FOREIGN KEY (session_id) REFERENCES api.run_sessions(id) ON DELETE CASCADE`

## `private.runner_passport_history`

| column | type | null | default |
|---|---|:--:|---|
| `id` | bigint | no | `nextval('private.runner_passport_hist...` |
| `user_id` | uuid | no | — |
| `version` | integer | no | — |
| `rules_version` | text | no | — |
| `band` | USER-DEFINED | no | — |
| `snapshot` | jsonb | no | — |
| `reason` | text | no | — |
| `effective_at` | timestamp with time zone | no | `now()` |

Constraints:

- `runner_passport_history_pkey`: `PRIMARY KEY (id)`
- `runner_passport_history_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES api.profiles(user_id) ON DELETE CASCADE`
- `runner_passport_history_user_id_version_key`: `UNIQUE (user_id, version)`

## Functions

| function | security definer | search_path pinned |
|---|:--:|:--:|
| `private.apex_monthly_multiplier` | — | ✅ |
| `private.apex_rank_for_meters` | — | ✅ |
| `private.apply_current_month_import` | yes | ✅ |
| `private.apply_timezone_change` | yes | ✅ |
| `private.apply_verified_run_reward` | yes | ✅ |
| `private.assert_apex_ladder_valid` | — | ✅ |
| `private.assert_launch_content_complete` | — | ✅ |
| `private.guard_profile_immutable_columns` | — | ✅ |
| `private.month_key` | — | ✅ |
| `private.reward_day` | — | ✅ |
| `private.touch_updated_at` | — | ✅ |

