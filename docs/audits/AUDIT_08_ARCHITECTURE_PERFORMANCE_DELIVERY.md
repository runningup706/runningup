# AUDIT_08 — Architecture, mobile performance and content delivery

| Field | Value |
|---|---|
| Auditor context | Independent re-review pass, looking for structural decay and unmeasurable claims |
| Audited commit | `6130339` + working tree |
| Content version | 1.0.0 |
| Backend schema | migrations 0001-0008 |
| Date | 2026-07-29 |


## Architecture

| Check | Result |
|---|---|
| Single source of truth for locked numbers | All in `tools/lib/constants.mjs`, imported by factory, validator, simulators and tests; SQL mirrors them under CHECK constraints |
| Generated versus authored separation | `content/launch/**` and `seed.sql` generated; design tables authored; CI fails on drift |
| Content regeneration reproducibility | Verified byte-identical on re-run |
| Giant files | Largest source file is the content factory at ~560 lines, which is a generator with one responsibility; domain modules are 130-300 lines |
| Circular dependency | None: `constants` ← everything, no back edges |
| Domain purity | `tools/lib/*` imports nothing but `constants.mjs` and node built-ins — no DB, no UI, no platform API |

## Findings

**F-08-1 (medium, accepted).** The reward formula exists twice: `tools/lib/reward.mjs` (client
preview) and the SQL inside `apply_verified_run_reward` (authority). This is deliberate —
the master requires a client-side preview and a server-authoritative result — but it is a
genuine drift risk. Both carry the same `reward.v1.0.0` version string and both suites
assert the same boundary cases, but no differential test compares them directly.
Recorded as R-06; a differential harness is the correct next step.

**F-08-2 (informational).** The SQL component set is currently narrower than the JS one
(7 components versus 15). The missing components are those needing the passport and baseline
context that the Kotlin/Unity capture layer would supply. This is a real gap, and it is
recorded here rather than papered over: the SQL is authoritative for what it computes, and
the remaining components are not yet computed anywhere authoritative.

## Performance and delivery

**Not measured, and deliberately not estimated.** No Unity build, no APK, no device. The
master is explicit (# 22.9) that emulator numbers may not stand in for device evidence, and
there is not even an emulator here.

| Item | Status |
|---|---|
| 4 GB-class 30 fps target | `BLOCKED_DEVICE` |
| Per-continent hub/stage/boss frame time and memory | `BLOCKED_DEVICE` |
| 60-minute session stability | `BLOCKED_DEVICE` |
| APK/AAB size, 16 KB page size, ABI | `BLOCKED_TOOLCHAIN` |
| Content pack download, pause, resume, corruption, rollback | `BLOCKED_TOOLCHAIN` |

Content pack *identity* exists in the data (`content_pack_id` per continent) so the delivery
layer has something to bind to when it can be built.

## Verdict: **PARTIAL** — architecture PASS, performance and delivery `BLOCKED_DEVICE` / `BLOCKED_TOOLCHAIN`
