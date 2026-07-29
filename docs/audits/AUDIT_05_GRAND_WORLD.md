# AUDIT_05 — Grand World 12 continents

| Field | Value |
|---|---|
| Auditor context | Independent re-review pass, testing reachability and looking for empty shells |
| Audited commit | `6130339` + working tree |
| Content version | 1.0.0 |
| Backend schema | migrations 0001-0008 |
| Date | 2026-07-29 |


## Attack

| Check | Method | Result |
|---|---|---|
| 12/12 continents present | validator + DB gate | 12 |
| 12/12 visible at first login | `visible_at_first_login` asserted, CHECK-enforced | 12 |
| 96/96 regions reachable | BFS from `continent_entry` per continent | 96, none orphaned |
| 72/72 main, 24/24 side stages | count + `CHECK (enabled and not debug_only)` | pass |
| Per-continent floor | 8 regions and 6 main stages each | no continent below floor |
| Non-linear access | `requires_continent_ids` asserted empty; `requires_previous_chapter` CHECK-forced false | pass |
| Stage/region continent agreement | cross-check | no mismatch |
| Mechanic uniqueness | 12 distinct `mechanic_id`, DB `unique` | pass |
| Objective variety | no objective repeats within a continent's main line | pass |
| Continent similarity | Jaccard over mechanic + rule + skyline + motif + palette | worst pair 8.3% against a 45% threshold |
| Boss similarity | phases + phase rule + mechanic | worst pair 12.0% |

## Findings

**F-05-1 (critical for reporting, not a code defect).** All twelve continents are complete,
unique, validated **data** — and none of them is playable, because there is no Unity Editor
in this environment to build a scene with. Master # 29.2 explicitly forbids counting a map
entry as content.

*Resolution:* rather than report 12/12 and let the reader assume playability, the
`DATA_PASS` / `PLAYABLE_PASS` distinction was introduced (ADR-003) and applied to every
document, with the promotion criterion stated. **Continents playable: 0/12.**

**F-05-2 (low).** Region routes are a linear chain per continent with `bypass_allowed: true`.
The flag expresses non-linearity but nothing consumes it yet, because there is no navigation
runtime. Noted as a client-side obligation rather than a data defect.

## Verdict: **DATA_PASS** — `PLAYABLE_PASS` is `BLOCKED_TOOLCHAIN`
