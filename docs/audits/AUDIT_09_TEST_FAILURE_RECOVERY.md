# AUDIT_09 — Test quality and failure recovery

| Field | Value |
|---|---|
| Auditor context | Independent re-review pass, auditing the tests rather than the code |
| Audited commit | `6130339` + working tree |
| Content version | 1.0.0 |
| Backend schema | migrations 0001-0008 |
| Date | 2026-07-29 |


## Attack

This audit assumes the test suite is lying and tries to prove it: are there skipped tests,
weakened assertions, tests that pass for the wrong reason, or tests that silently do not run?

## Findings

**F-09-1 (HIGH, fixed) — tests that silently did not run.** Three pgTAP files declared a plan
that did not match the number of assertions executed. Grepping for `not ok` showed nothing
and looked green. `pg_prove`, which actually parses TAP, reported `Bad plan. You planned 31
tests but ran 26` — five assertions were never executed, and a naive check would have called
that a pass.

*Fix:* plans corrected; `pg_prove` is now the runner in `tools/test/db.sh` and in CI,
precisely because it fails on a plan mismatch and a hand-rolled grep does not.

**F-09-2 (HIGH, fixed) — a test that asserted the wrong thing.** `01_schema_rls` asserted
that updating another user's row *raises* `42501`. It does not: RLS filters the row via
`USING` before `WITH CHECK` is ever evaluated, so the statement affects zero rows and
succeeds. The original test failed for the right reason, and the temptation was to delete it.

*Fix:* split into what is actually true — the update raises no error, affects no row, and
leaves the target row untouched (verified from the service side where the row is visible) —
plus a separate `throws_ok` for an INSERT naming another user, which genuinely does raise.
The security property is now tested accurately instead of approximately.

**F-09-3 (medium, fixed) — an aborting test hides everything after it.** The altitude probe
called `pg_get_functiondef()` on aggregates, which raises, aborting the transaction and
skipping the remaining assertions in the file. Fixed with `prokind = 'f'`. Same class of
defect as F-09-1: the suite looked healthier than it was.

**F-09-4 (medium, fixed) — a constraint caught a real bug that a mock would have missed.**
The Daily Momentum two-statement update (see AUDIT_03) only surfaced because the tests run
against a real database with real CHECK constraints.

**F-09-5 (medium, fixed) — a durability bug the tests found immediately.** The run journal
reported a torn write as *clean* when the trailing fragment was shorter than an 8-byte
header: the scan loop simply walked past it. A run interrupted at exactly the wrong moment
would have been declared intact. Fixed by treating any trailing bytes as a truncation
point. Two of the nine journal tests failed before the fix and pass after it.

## Anti-pattern sweep

| Anti-pattern | Present? |
|---|---|
| Skipped or quarantined tests | None |
| `.only` / focused tests | None |
| Assertions weakened to pass | None; the relic threshold was explicitly *not* relaxed |
| Features deleted to make a gate green | None |
| Emulator evidence for device claims | None; those items are reported blocked |
| Test count inflated by trivial assertions | Each of the 136 DB assertions targets a distinct property |

## Failure recovery coverage

| Scenario | Covered |
|---|---|
| Duplicate / replayed upload | yes — idempotency key, `already_applied` |
| Out-of-order import | yes — order-independent result asserted |
| Corrupted journal (non-monotonic samples) | yes — rejected as an integrity signal, not repaired |
| Physically impossible split | yes — discarded rather than recorded |
| Concurrent same-day sessions | partial — sequential proof only, R-05 open |
| Process kill mid-write | yes — only the in-flight record is lost, and the damage is reported |
| Reboot (file-only recovery) | yes — 250 records recovered byte-identically |
| Disk corruption (CRC mismatch) | yes — recovery stops at the bad record |
| Offline upload queue, foreground service | **not covered** — needs the Android runtime |
| Migration failure and forward-fix | **not covered** — no upgrade-from-prior-release path exists yet, since this is the first schema |

## Verdict: **PASS** for what exists; two coverage gaps recorded honestly
