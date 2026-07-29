# AUDIT_04 — Running-only scope

| Field | Value |
|---|---|
| Auditor context | Independent re-review pass, trying to smuggle a non-running activity into a reward |
| Audited commit | `6130339` + working tree |
| Content version | 1.0.0 |
| Backend schema | migrations 0001-0008 |
| Date | 2026-07-29 |


## Attack

I attempted to introduce each forbidden mode by every route available: as an enum value, as
a session row, as a reward input key, as a session style, as a schema column, and as a
quest field.

| Attack | Result |
|---|---|
| `select 'trail'::private.activity_type` | rejected, `22P02` |
| same for hiking, cycling, climbing, walking | all rejected |
| `insert into api.run_sessions (... 'trail' ...)` | rejected before reaching any policy |
| `calculateRunReward({elevation_gain: 500})` | throws; 19 forbidden keys each tested |
| `calculateRunReward({activity_type: 'hiking'})` | throws |
| weather / night multiplier as a reward key | throws |
| any column named `%elevation%`, `%weather%`, `%night%` in `api` or `private` | zero found |
| any session style referencing a forbidden mode | zero found |

## Findings

**F-04-1 (informational, no change).** `private.run_samples.altitude_meters` exists. This is
permitted by master # 10.3 — altitude may be retained as raw sensor metadata — but only if
nothing consumes it. Verified directly: `pg_get_functiondef` across every function in `api`
and `private` contains no reference to altitude. The column is inert.

While writing that check I hit a second issue: the query aborted the whole suite because
`pg_get_functiondef()` raises on aggregate functions. Filtering `prokind = 'f'` fixed it.
An aborting test is a *silently missing* test, which is the more dangerous failure.

**F-04-2 (informational).** `run_walk` survives as a session style, which is correct: walking
is legitimate inside a beginner running session and nowhere else. Confirmed it is a style,
never an `activity_type`.

## Verdict: **PASS**
