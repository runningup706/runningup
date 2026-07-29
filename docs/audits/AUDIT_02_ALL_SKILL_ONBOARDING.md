# AUDIT_02 — Every ability level starts on day one

| Field | Value |
|---|---|
| Auditor context | Independent re-review pass, trying to trap a runner in the wrong lane |
| Audited commit | `6130339` + working tree |
| Content version | 1.0.0 |
| Backend schema | migrations 0001-0008 |
| Date | 2026-07-29 |


## Attack

Eight independent fixtures were built and run through the real engine, then every one was
asked to select all 21 distance goals and all 11 duration goals on its first session.

## Findings

**F-02-1 (high, fixed).** A genuine half-marathon runner was classified **R6 (marathon)**
instead of R5. Cause: band boundaries used exact race distances, and a GPS-measured half
marathon records 21 100 m against a nominal 21 097.5 m. The 2.5 m overshoot promoted the
runner a whole band, which would have recommended 25-35 km sessions to somebody whose
longest run is a half.

This is precisely the DL-2 failure mode in reverse — not blocking an advanced runner, but
mis-projecting one — and it would have been invisible without a fixture using realistic
GPS distances rather than textbook ones.

*Fix:* R5 and R6 upper edges carry an explicit tolerance above the nominal race distance,
with the reasoning recorded in the code.
*Retest:* `node --test tools/tests/runner-passport.test.mjs` → 17/17.

**F-02-2 (medium, fixed).** Two fixtures asserted a shortlist that contradicted the master's
own acceptance table (# 22.3 states a *recent 5 km user* should see 5/8/10 km). My original
fixture conflated "3-5 km starter" with "5 km runner". Split into two fixtures so both rows
of the master's table are covered explicitly.

## Verified properties

- 8/8 fixtures: `restrictions`, `prerequisites`, `locked_goal_ids`, `locked_continent_ids`,
  `locked_character_ids` all empty
- 8/8 fixtures: all 32 library goals accepted on day one (256 acceptance checks, all pass)
- A zero-history account may select the marathon; a marathon runner may select 400 m and is
  not demoted
- Recalculation moves the band and revokes nothing
- A single 42 km outlier does not promote a 5 km runner (trimmed-median capability)

## Residual risk

Band thresholds are tuned against synthetic fixtures, not real user history. The
`manual_override_rate` metric is specified for exactly this reason but cannot be collected
until there are users.

## Verdict: **PASS**
