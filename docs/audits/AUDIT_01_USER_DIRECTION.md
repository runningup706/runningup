# AUDIT_01 — User direction and scope regression

| Field | Value |
|---|---|
| Auditor context | Independent re-review pass, attempting to disprove each locked claim |
| Audited commit | `6130339` + working tree |
| Content version | 1.0.0 |
| Backend schema | migrations 0001-0008 |
| Date | 2026-07-29 |


## Claims I tried to refute

| Claim under attack | Method | Result |
|---|---|---|
| 1000 km is genuinely the only monthly final point | `grep` for 1250/1500/2000/Endless across 73 files; numeric sweep of the checkpoint seed; enum-order query | Refutation failed. 0 violations outside declared allow-list. |
| The 0-1000 range is dense enough | Counted seed spacing; ran the simulator's checkpoint-reach distribution | 52 checkpoints; the 5 km mark is reached by >90% of simulated runners; no dead zone found |
| Nothing sorts above World Crown | `select enumlabel ... order by enumsortorder desc limit 1` | Returns `world_crown`. A higher rank would need `ALTER TYPE ... ADD VALUE`, which is visible in review. |
| A beginner-only flow does not survive anywhere | 8 passport fixtures; every one asserted to have zero prerequisites | Refutation failed |
| Launch scope was not quietly reduced | Content validator floor gate + DB gate | 18/18 categories at floor |

## Findings

**F-01-1 (medium, fixed).** Every generated quest record carried
`forbidden_activity_types: ['trail','hiking','cycling','climbing']`. Harmless in itself, but
it created 42 copies of a rule whose single source of truth is the `activity_type` enum —
exactly the "parallel source of truth" the master forbids, and it made the direction-lock
scanner noisy enough that a real violation could hide among the false positives.

*Fix:* removed the per-quest list; quests now reference `ALLOWED_ACTIVITY_TYPES` positively.
*Retest:* `node tools/content-factory/build.mjs && node tools/direction-lock/scan.mjs` → 0 violations.

**F-01-2 (low, fixed).** The scanner flagged its own enforcement files. Rather than widen the
patterns' blind spots, each enforcing file was added to an allow-list **with a stated reason**,
so an unexplained mention still fails.

## Residual risk

The scanner is textual plus one numeric sweep. A violation expressed purely as an untested
runtime computation (for example a multiplier derived arithmetically rather than named)
would evade it. This is mitigated by the DB CHECK constraints and the 44 pgTAP ladder tests,
which operate on values rather than words.

## Verdict: **PASS**
