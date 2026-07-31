# CURRENT_STATE

Last updated: 2026-07-31 · Branch `claude/runningup-v14-handoff-hr19xk`

> **PASS의 뜻이 바뀌었습니다.** 2026-07-31 이전의 `PASS`는 전부 *로컬 실행 결과*였습니다.
> `security-scan`과 `supabase-tests`는 저장소 전 역사(각 15회 실행)에서 **한 번도 통과한 적이
> 없는데**, 이 문서는 pgTAP 스위트를 `PASS`로 기록하고 있었습니다. 두 워크플로의 원인을
> 찾아 고친 뒤 지금은 CI에서도 통과합니다. 아래 표의 `PASS`는 **어디서 검증됐는지**를
> 함께 적습니다. 로컬만 통과한 것을 `PASS`로 적지 않습니다.

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

| Capability | Status | 검증 위치 | Evidence / reason |
|---|---|---|---|
| Node 22 tooling, domain engine, tests | **PASS** | 로컬 + CI (`unit-tests`) | `npm run test:unit` — **190 tests** |
| PostgreSQL 16 + pgTAP 1.3.2 | **PASS** | 로컬 + CI (`supabase-tests`) | `bash scripts/db.sh` — **1140 tests**, 7 suites. CI 통과는 2026-07-31 `095472b`이 처음입니다. |
| Content factory + validator | **PASS** | 로컬 + CI (`content-validation`) | `npm run validate:content` |
| Direction-lock static scan | **PASS** | 로컬 + CI (`direction-lock`) | `npm run validate:direction-lock` — 141 files, 32 patterns, DL-1…DL-6. v5.0.0 잠금을 강제하며, 패턴 자체를 `tests/direction-lock.test.mjs`가 검증합니다 (catch 41건 + false-positive 16건). |
| Secret scan | **PASS** | CI (`security-scan`) | 2026-07-31 `c4fc040`이 첫 통과. 그 이전 15회는 전부 실패했습니다. |
| Java 21 + Gradle 8.14 | **PASS** | 로컬 + CI (`kotlin-tests`) | `bash tools/bootstrap/doctor.sh` |
| Kotlin/JVM run-capture core | **PASS** | 로컬 + CI (`kotlin-tests`) | `gradle test` in `native/android-running-plugin` — 22 tests (journal + upload queue) |
| .NET 8 SDK (Unity domain layer) | **PASS** | CI (`unity-domain-tests`) | `dotnet test` — 29 tests. **이 컨테이너에는 dotnet이 없어 로컬 재현 불가.** |
| Supabase CLI local stack | `BLOCKED_TOOLCHAIN` | No Docker daemon (`/var/run/docker.sock` absent). Mitigated: migrations run against real PostgreSQL 16; see ADR-002. |
| Android SDK / NDK | `BLOCKED_TOOLCHAIN` | `dl.google.com` is refused by the environment network policy (`CONNECT` → 403). No SDK can be fetched. |
| Unity 6.3 LTS Editor | `BLOCKED_TOOLCHAIN` | No Editor, no Hub, no licence, and installation requires both network access and licence acceptance. |
| APK / AAB build | `BLOCKED_TOOLCHAIN` | Follows from the two rows above. |
| Physical device install, FPS, battery, thermal | `BLOCKED_DEVICE` | No device, no adb. Emulator numbers are explicitly *not* substituted (master # 22.9). |
| GitHub push + Release | available | Repository is in scope for this session. |
| Google Play internal test | `BLOCKED_ACCOUNT` | No Play credentials, and publishing needs the owner's explicit approval. |

## Implemented and verified

### Direction lock (DL-1 … DL-6)
- `docs/USER_DIRECTION_LOCK.md` + `content/schemas/direction_lock.json`
- `tools/direction-lock/scan.mjs`: 141 files, 32 concept patterns, **0 violations**
- `docs/archive/USER_DIRECTION_LOCK_v4.0.0.md`: 이전 잠금(52 체크포인트·96 지역·전투 콘텐츠) 보존본
- Enforced additionally by DB CHECK constraints, enum ordering and pgTAP

### Domain engine — 190 unit tests, all passing
| Module | Covers |
|---|---|
| `packages/domain/monthly-apex.mjs` | 121 checkpoints, crossings, 999.999/1000/>1000, out-of-order, duplicates, month reset |
| `packages/domain/runner-passport.mjs` | 8 first-session fixtures, full library always selectable, recalculation, outlier resistance |
| `packages/domain/reward.mjs` | 15 independent components, monotonicity, forbidden-input rejection, grade eligibility |
| `packages/domain/momentum.mjs` | reward day in IANA timezone, same-day sessions, streak reset, weekly/quality/long-run chains |
| `packages/domain/best-effort.mjs` | fastest-segment extraction for 20 benchmark distances |
| `packages/domain/anomaly-detection.mjs` | verification grades, replay/duplicate/teleport/vehicle/synthetic detection, honest-runner protection |

### Backend — 1140 pgTAP tests, all passing
| Suite | Tests | Focus |
|---|---:|---|
| `01_schema_rls.sql` | 33 | RLS on every relation, cross-user denial, private schema unreachable, ledger not client-writable |
| `02_running_scope.sql` | 14 | DL-3 at the type level: trail/hiking/cycling/climbing unrepresentable |
| `03_monthly_apex.sql` | 44 | the whole of DL-1 against the real transaction |
| `04_ledger_integrity.sql` | 17 | immutability, idempotency, reversal-not-edit, DL-5 source allow-list |
| `05_content_completeness.sql` | 24 | launch floor enforced in the database, plus DL-6 schema-absence |
| `06_profile_write_scope.sql` | 13 | AUDIT_07 regression: client write scope and timezone attribution |
| `07_apex_conformance.sql` | 992 | generated: replays the shared fixture against the authoritative transaction |

### Launch content — validator PASS at every floor
All 21 categories meet the floor exactly: 12 continents, 192 regions, 2,304 courses,
72 main races, 24 challenge races, 7 race formats, 6 challenge formats, 12 runners,
36 episodes, 48 race techniques, 72 gear sets, 24 + 12 rival crews, 12 + 4 + 1 champions
and races, 12 companions, 96 cosmetics, 12 chapters, 1 season, 3 event arcs.
3,251 localization keys in ko and en.

DL-6 이후의 카탈로그입니다. 전투 콘텐츠(전투 스테이지·적 계열·보스·전술 스킬·유물)는
삭제됐고, 같은 개수의 러닝 콘텐츠가 그 자리를 대신합니다. **어느 항목도 숫자를 맞추기
쉽게 하려고 줄이지 않았습니다.**

**What this content is, precisely:** validated, localized, referentially-complete game
*data* with stable IDs, reachable route graphs, backend mappings and per-item uniqueness
signatures — plus the authored design tables (unique course trait, palette, rival tactic,
champion race plan, restoration arc and story beat per continent; unique kit, silhouette,
conversion rule and episodes per runner).

**What it is not:** playable 3D scenes. No Unity Editor exists here, so no prefab, scene or
addressable has been authored or built. Per master # 28.3 these items therefore **do not
yet count as `PLAYABLE_PASS`**; they are `DATA_PASS`. The distinction is deliberate and is
carried through every report in this repository.

## Not implemented

| Area | Status |
|---|---|
| Unity client: scenes, prefabs, UI, race presentation, streaming | not started — `BLOCKED_TOOLCHAIN` (needs the Editor) |
| Unity **domain layer** (Monthly Apex ladder) | **implemented and tested** — 29 C# tests, conformance-locked to the JS engine |
| Android foreground service, Health Connect, WorkManager queue | not written — `BLOCKED_TOOLCHAIN`, no Android SDK |
| Health Connect integration | design + schema only |
| Edge Functions (Deno) | not started |
| Friends, crew, leaderboards, Ghost Trial, season runtime | schema groundwork only |
| Analytics pipeline, admin tooling, live config | not started |
| Growth / store listing assets | not started |

## Next five exact commands

```bash
npm run test:fast                        # direction lock + content + 190 unit tests
bash scripts/db.sh                    # migrations + seed + 1140 pgTAP tests
node tools/content-factory/build.mjs     # regenerate content from the design tables
node tools/content-factory/emit-seed.mjs # regenerate seed.sql from the content
bash tools/bootstrap/doctor.sh           # re-check toolchain availability
```
