# AUDIT_03 — Monthly Apex 0-1000 and economy

| Field | Value |
|---|---|
| Auditor context | Independent re-review pass, attacking the ladder transaction directly |
| Audited commit | `6130339` + working tree |
| Content version | 1.0.0 |
| Backend schema | migrations 0001-0008 |
| Date | 2026-07-29 |


## Attack

Every boundary the master enumerates was executed against the real
`private.apply_verified_run_reward`, not against a mock: exact 0, one metre short, exact
threshold, 42.195 precision, 999 999 m, exactly 1 000 000 m, a single 1 200 km session,
multi-checkpoint crossing, duplicate submission, out-of-order import, month boundary in a
non-UTC timezone, and repeated runs past the crown.

## Findings

**F-03-1 (high, fixed).** The reward transaction violated its own CHECK constraint. Daily
Momentum was updated in two statements — `current_streak` first, then `best_streak` — which
briefly left `best_streak < current_streak` and tripped `momentum_best_ge_current`. The
transaction aborted for **every first run by any user**, which is as severe as it sounds.

The constraint did its job: it turned a subtle ordering mistake into a loud failure at the
first test rather than a silent data inconsistency in production.

*Fix:* both columns now move in a single `UPDATE` from a value computed beforehand.
*Retest:* pgTAP 03 → 44/44.

**F-03-2 (low, fixed).** A test expected 6 crossings from an 85 km session starting at 15 km;
the correct answer is 10 (20/25/30/40/42.195/50/60/75/90/100). The implementation was right
and my expectation was wrong — corrected, because a test asserting the wrong number is worse
than no test.

## Verified DL-1 properties

| Property | Evidence |
|---|---|
| 999.999 km → rank `apex`, no crown | pgTAP 03 |
| exactly 1000.000 km → crown, once | `world_crown_history` unique `(user_id, month_key)` |
| Apex Axis unlocks once | `apex_boss_unlocks` unique `(user_id, month_key)` |
| >1000 km → 0 new checkpoints, rank stays `world_crown`, multiplier flat at 1.25 | pgTAP 03 |
| >1000 km → ordinary reward still paid | ledger amount > 0 for the `crown-3` case |
| 1200 km in one session → all 52 claimed exactly once, 200 km banked as over-crown | pgTAP 03 |
| Retry pays nothing extra | `already_applied`, ledger count unchanged, distance unchanged |
| Out-of-order import = chronological result | simulator assertion, both position and checkpoint set |

## Economy distribution (11 cohorts x 200 runners x 30 days)

Median monthly distance ranges from 13.2 km (run-walk beginner) to 1000 km (very high
volume). The crown is reached by 15.4% of all simulated runners and by 69% of the
`high_volume_900plus` cohort — reachable, not routine. No cohort below `regular_10km`
produced any over-crown distance.

## Residual risk

Concurrency is enforced by `FOR UPDATE` plus unique keys and is proven correct
*sequentially*. A true parallel-client load test has not been run — there is no load
harness in this environment. Recorded as an open item in the risk register (R-05).

## Verdict: **PASS**, with R-05 open
