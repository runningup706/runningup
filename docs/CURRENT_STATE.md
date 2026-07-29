# CURRENT_STATE

Last updated: 2026-07-29 · Branch `claude/runningup-3d-android-dev-3c8gnp`

## Overall status

```
RUNNINGUP 3D REAL-RUN RPG: BLOCKED_TOOLCHAIN
```

The backend, the domain engine, the direction-lock enforcement and the full launch content
dataset are implemented and passing their tests **in this environment**. The Unity client,
the Android APK/AAB and every physical-device measurement are blocked by tooling that does
not exist in this container and cannot be installed from it. Nothing blocked is reported as
done, and nothing done is inflated into more than it is.

## What the environment can and cannot do

| Capability | Status | Evidence / reason |
|---|---|---|
| Node 22 tooling, domain engine, tests | **PASS** | `npm run test:unit` — 85 tests |
| PostgreSQL 16 + pgTAP 1.3.2 | **PASS** | `bash tools/test/db.sh` — 1128 tests, 7 suites |
| Content factory + validator | **PASS** | `npm run validate:content` |
| Direction-lock static scan | **PASS** | `npm run validate:direction-lock` |
| Java 21 + Gradle 8.14 | **PASS** | `bash tools/bootstrap/doctor.sh` |
| Kotlin/JVM run-capture core | **PASS** | `gradle test` in `native/android-running-plugin` — 9 tests |
| .NET 8 SDK (Unity domain layer) | **PASS** | `dotnet test` — 29 tests, no Unity Editor required |
| Supabase CLI local stack | `BLOCKED_TOOLCHAIN` | No Docker daemon (`/var/run/docker.sock` absent). Mitigated: migrations run against real PostgreSQL 16; see ADR-002. |
| Android SDK / NDK | `BLOCKED_TOOLCHAIN` | `dl.google.com` is refused by the environment network policy (`CONNECT` → 403). No SDK can be fetched. |
| Unity 6.3 LTS Editor | `BLOCKED_TOOLCHAIN` | No Editor, no Hub, no licence, and installation requires both network access and licence acceptance. |
| APK / AAB build | `BLOCKED_TOOLCHAIN` | Follows from the two rows above. |
| Physical device install, FPS, battery, thermal | `BLOCKED_DEVICE` | No device, no adb. Emulator numbers are explicitly *not* substituted (master # 22.9). |
| GitHub push + Release | available | Repository is in scope for this session. |
| Google Play internal test | `BLOCKED_ACCOUNT` | No Play credentials, and publishing needs the owner's explicit approval. |

## Implemented and verified

### Direction lock (DL-1 … DL-5)
- `docs/USER_DIRECTION_LOCK.md` + `content/schemas/direction_lock.json`
- `tools/direction-lock/scan.mjs`: 94 files, 19 concept patterns, **0 violations**
- Enforced additionally by DB CHECK constraints, enum ordering and pgTAP

### Domain engine — 85 unit tests, all passing
| Module | Covers |
|---|---|
| `tools/lib/monthly-apex.mjs` | 52 checkpoints, crossings, 999.999/1000/>1000, out-of-order, duplicates, month reset |
| `tools/lib/runner-passport.mjs` | 8 first-session fixtures, full library always selectable, recalculation, outlier resistance |
| `tools/lib/reward.mjs` | 15 independent components, monotonicity, forbidden-input rejection, grade eligibility |
| `tools/lib/momentum.mjs` | reward day in IANA timezone, same-day sessions, streak reset, weekly/quality/long-run chains |
| `tools/lib/best-effort.mjs` | fastest-segment extraction for 20 benchmark distances |
| `tools/lib/anomaly-detection.mjs` | verification grades, replay/duplicate/teleport/vehicle/synthetic detection, honest-runner protection |

### Backend — 1128 pgTAP tests, all passing
| Suite | Tests | Focus |
|---|---:|---|
| `01_schema_rls.sql` | 33 | RLS on every relation, cross-user denial, private schema unreachable, ledger not client-writable |
| `02_running_scope.sql` | 14 | DL-3 at the type level: trail/hiking/cycling/climbing unrepresentable |
| `03_monthly_apex.sql` | 44 | the whole of DL-1 against the real transaction |
| `04_ledger_integrity.sql` | 17 | immutability, idempotency, reversal-not-edit, DL-5 source allow-list |
| `05_content_completeness.sql` | 15 | launch floor enforced in the database |
| `06_profile_write_scope.sql` | 13 | AUDIT_07 regression: client write scope and timezone attribution |
| `07_apex_conformance.sql` | 992 | generated: replays the shared fixture against the authoritative transaction |

### Launch content — validator PASS at every floor
All 18 categories meet the floor exactly: 12 continents, 96 regions, 72 main stages,
24 side stages, 12 characters, 36 episodes, 48 skills, 72 relics, 24 + 12 enemy families,
12 + 4 + 1 bosses, 12 companions, 96 cosmetics, 12 chapters, 1 season, 3 event arcs.
782 localization keys in ko and en.

**What this content is, precisely:** validated, localized, referentially-complete game
*data* with stable IDs, reachable route graphs, backend mappings and per-item uniqueness
signatures — plus the authored design tables (unique mechanic, palette, enemy behaviour,
boss phase graph, restoration arc and story beat per continent; unique kit, silhouette,
conversion rule and episodes per character).

**What it is not:** playable 3D scenes. No Unity Editor exists here, so no prefab, scene or
addressable has been authored or built. Per master # 28.3 these items therefore **do not
yet count as `PLAYABLE_PASS`**; they are `DATA_PASS`. The distinction is deliberate and is
carried through every report in this repository.

## Not implemented

| Area | Status |
|---|---|
| Unity client: scenes, prefabs, UI, combat, streaming | not started — `BLOCKED_TOOLCHAIN` (needs the Editor) |
| Unity **domain layer** (Monthly Apex ladder) | **implemented and tested** — 29 C# tests, conformance-locked to the JS engine |
| Android foreground service, Health Connect, WorkManager queue | not written — `BLOCKED_TOOLCHAIN`, no Android SDK |
| Health Connect integration | design + schema only |
| Edge Functions (Deno) | not started |
| Friends, crew, leaderboards, Ghost Trial, season runtime | schema groundwork only |
| Analytics pipeline, admin tooling, live config | not started |
| Growth / store listing assets | not started |

## Next five exact commands

```bash
npm run test:fast                        # direction lock + content + 68 unit tests
bash tools/test/db.sh                    # migrations + seed + 136 pgTAP tests
node tools/content-factory/build.mjs     # regenerate content from the design tables
node tools/content-factory/emit-seed.mjs # regenerate seed.sql from the content
bash tools/bootstrap/doctor.sh           # re-check toolchain availability
```
