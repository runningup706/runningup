# AUDIT_10 — Clean release and reporting truthfulness

| Field | Value |
|---|---|
| Auditor context | Independent re-review pass, checking every claim against evidence |
| Audited commit | `6130339` + working tree |
| Content version | 1.0.0 |
| Backend schema | migrations 0001-0008 |
| Date | 2026-07-29 |


## Method

Every quantitative claim in `HANDOFF.md`, `docs/CURRENT_STATE.md`, the PR description and
the traceability CSV was re-derived from a command run in a clean state, and every `PASS`
was checked for a corresponding artifact.

## Claim-by-claim verification

| Claim | Re-derived | Match |
|---|---|---|
| 17/17 bundle checksums verified | `sha256sum -c` | yes |
| Split concat reproduces the canonical hash | `cat 01..08 \| sha256sum` | yes |
| 68 domain unit tests pass | `node --test` | yes |
| 136 database tests pass across 6 suites | `pg_prove` | yes |
| 0 direction-lock violations | scanner | yes |
| 18/18 content categories at floor | validator + DB gate | yes |
| 7 → 8 migrations apply clean from empty | full rebuild | yes |
| Content regenerates byte-identically | rebuild + `git diff --quiet` | yes |

## Findings

**F-10-1 (HIGH, fixed before publication).** The natural way to report this work is
"12/12 continents, 12/12 characters — PASS". That would be false. The data is complete; the
game is not built. Master # 29.2 names this exact deception.

*Fix:* the `DATA_PASS` / `PLAYABLE_PASS` split (ADR-003), applied consistently, with
**continents playable 0/12** and **characters playable 0/12** stated plainly in the handoff,
the current-state document and the PR.

**F-10-2 (medium).** No APK, AAB, GitHub Release, release manifest, SBOM or re-download SHA
exists. Nothing in this repository claims otherwise; `REL-001` and `REL-002` are recorded as
`BLOCKED_TOOLCHAIN` and `BLOCKED_ACCOUNT` in the traceability CSV, and the version is
`0.1.0-alpha.1` rather than any release candidate.

**F-10-3 (medium, disclosed).** A draft pull request could not be created: the repository was
completely empty, so pushing made `claude/runningup-3d-android-dev-3c8gnp` its default
branch, and GitHub rejects a PR whose base does not exist (`422 base invalid`). Creating a
`main` branch would mean pushing to a branch nobody authorised. Left for the owner to
resolve, and reported rather than quietly skipped.

## Version honesty

`VERSION` = `0.1.0-alpha.1`. `1.0.0-rc.1` is reserved for a build where every P0 gate passes
with evidence. With Unity, Android and device gates all blocked, this is an alpha and is
labelled as one.

## Verdict: **PASS** — reporting matches evidence, including where the evidence is absence
