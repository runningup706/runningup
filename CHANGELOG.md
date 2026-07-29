# Changelog

All notable changes to RunningUp. Versions follow the release policy in the master prompt:
`1.0.0-rc.1` is reserved for a build where **every** P0 gate passes with evidence. Until
then the project ships real alpha versions.

## [0.1.0-alpha.1] — 2026-07-29

Gate 0 through Gate 2 (partial), plus the Monthly Apex and content pipelines.

### Added
- `docs/USER_DIRECTION_LOCK.md` and `content/schemas/direction_lock.json` — the five
  immutable user directions, in human and machine readable form.
- Direction-lock static scanner (`tools/direction-lock/scan.mjs`) covering 19 forbidden
  concepts across source, content, schema, seed, localization and docs.
- Domain engine: Monthly Apex ladder, Runner Passport, multi-component reward, momentum
  and chains, best-effort extraction — with 68 unit tests.
- Launch content: authored design tables for 12 continents and 12 characters, expanded by
  the content factory into all 18 launch categories with ko/en localization.
- Content validator with hard count gates, referential integrity, route reachability and
  semantic duplicate detection.
- Supabase-compatible backend: 7 migrations, RLS matrix, immutable ledgers and the atomic
  `private.apply_verified_run_reward` transaction — with 123 pgTAP tests.

### Known blockers
- Unity Editor, Android SDK and any physical device are unavailable in the build
  environment. See `docs/CURRENT_STATE.md`; nothing blocked is reported as complete.
