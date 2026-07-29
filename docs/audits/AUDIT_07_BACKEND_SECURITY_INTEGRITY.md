# AUDIT_07 — Backend, security and reward integrity

| Field | Value |
|---|---|
| Auditor context | Independent re-review pass, acting as a hostile authenticated client |
| Audited commit | `6130339` + working tree |
| Content version | 1.0.0 |
| Backend schema | migrations 0001-0008 |
| Date | 2026-07-29 |


## Attack

Every probe ran as a real `authenticated` role with a real JWT claim, not as the superuser.

## Findings

**F-07-1 (HIGH, fixed) — timezone boundary shopping.**

`grant update on api.profiles to authenticated` was table-wide. RLS decides *which row* a
user may write; it says nothing about *which columns*. Column privileges confirmed the user
could write `user_id`, `user_code`, `is_anonymous`, `created_at` and `reward_timezone`.

`reward_timezone` is not decoration. `private.reward_day()` and `private.month_key()` derive
Daily Momentum and the Monthly Apex partition from it. Exploit, executed and confirmed:

```
run at 2026-03-31T20:00:00Z
  attributed to 2026-03 under UTC
  attributed to 2026-04 under Pacific/Kiritimati (UTC+14)
```

A user near a month boundary could choose the month that suited them — top up a nearly
crowned month, or dump the same distance into a fresh ladder — and could repeat the trick
nightly against the daily streak.

*Fix (migration 0008), three layers:*
1. column-level grants: only `display_name`, `locale`, `profile_visibility` are writable
2. a trigger rejecting changes to identity and attribution columns for **every** role,
   including `service_role`, so a server-side bug cannot do it either
3. `private.apply_timezone_change()` — an audited, append-only-logged, once-per-24-hours
   path, which leaves a genuine relocation possible and kills boundary shopping

*Retest:* new pgTAP suite `06_profile_write_scope.sql`, 13 assertions, all of which failed
before the fix.

**F-07-2 (medium, fixed).** `audit.timezone_changes`, added by migration 0008, had no RLS.
Migration 0006 enables RLS by looping over tables that existed *at that time*, so any later
table must enable it explicitly. Caught by pgTAP 01 on the very next run — the test that
guards the rule found the first violation of it.

## Probes that found nothing

| Probe | Result |
|---|---|
| Read `private.*` as `authenticated` | `permission denied for schema private` |
| Read another user's profile / settings by primary key | 0 rows |
| Insert a row owned by another user | `42501` |
| Any `api` table readable with no SELECT policy | none |
| Any write grant to `anon` | none |
| `SECURITY DEFINER` without a pinned `search_path` | none |
| Any view not `security_invoker` | none |
| Client execute on `apply_verified_run_reward` | denied for both client roles |
| Client insert/update/delete on ledger, apex progress, claims, crown, unlock, passport, momentum | denied on all |
| `UPDATE`/`DELETE` against the XP ledger | discarded by rule; row unchanged |
| Duplicate idempotency key | `23505` |
| Ledger row above 1000 km / multiplier > 1.25 / regressing distance / unexplained negative | all rejected by CHECK |

Remaining client write surface, reviewed and accepted as low-risk and clearly owned:
`user_settings` (insert/update), `profiles` (three presentation columns), `consents`,
`account_jobs`, `run_appeals`, `run_plan_snapshots` (all insert-only, own rows).

## Verdict: **PASS** after fixes
