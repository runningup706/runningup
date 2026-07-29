# AUDIT_06 — 12 characters and content depth

| Field | Value |
|---|---|
| Auditor context | Independent re-review pass, hunting for reskins |
| Audited commit | `6130339` + working tree |
| Content version | 1.0.0 |
| Backend schema | migrations 0001-0008 |
| Date | 2026-07-29 |


## Attack

This audit assumed the counts were padded and tried to prove it, comparing every content
kind against every other item of the same kind by structural signature.

## Findings

**F-06-1 (high, fixed).** The 72 tactical relics were **six themes repeated across twelve
continents**. Cross-continent pairs scored 75-83% similarity against a 70% threshold: the
same trade wearing a different continent's name. This is exactly the reskin the direction
lock forbids, and the validator caught it on its first run.

Two fixes were possible: relax the threshold, or make the content genuinely different. The
threshold stayed. Each continent gained a distinct **activation condition** tied to its own
mechanic ("while a reflected beam is active", "while the heat gauge sits above half", "in
the silence between two sonar pulses"), so `ward` on Lumena and `ward` on Hora are now
different sidegrades rather than the same one twice.

**F-06-2 (medium, fixed).** After that fix, within-continent `ward`/`edge` pairs scored 71%
— a false positive. They are *inverse* trades (attack→guard versus guard→break) that share
the incidental word "guard". Prose similarity was the wrong instrument.

*Fix:* relics are now compared **structurally** — an atomic `trade_from->trade_to` token plus
condition plus mechanic. Worst pair dropped to 50.0% against the 70% threshold, a healthy
margin rather than the 69.2% near-miss an earlier partial fix produced.

## Roster verification

| Check | Result |
|---|---|
| 12 characters, all visible and trial-playable | CHECK-enforced |
| Paid gacha | `paid_gacha` CHECK-forced false |
| Role coverage | 8 distinct roles across primary + secondary |
| Presentation diversity | 12 distinct body/gender/skin/age profiles; assertion fails if any two match |
| Kit similarity | worst pair 14.9% (threshold 45%) |
| Skill similarity | worst pair 33.3% (threshold 65%) |
| 36 episodes, 48 skills, 96 cosmetics | exact |
| Cosmetic power | six CHECK constraints pin every field to 0; a non-zero insert is rejected |
| Skill and relic budget delta | CHECK = 0, so they are sidegrades by construction |

## Residual risk

Distinctness is verified structurally and by design review. Whether twelve kits are *fun* in
distinct ways cannot be established without playtesting.

## Verdict: **DATA_PASS** — `PLAYABLE_PASS` is `BLOCKED_TOOLCHAIN`
