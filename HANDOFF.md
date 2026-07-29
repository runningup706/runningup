# HANDOFF

**Session:** 2026-07-29 · Claude Code (`claude-opus-5`) · branch `claude/runningup-3d-android-dev-3c8gnp`

## Overall status

```
RUNNINGUP 3D REAL-RUN RPG: BLOCKED_TOOLCHAIN
```

Backend, domain engine, direction-lock enforcement and the full launch content dataset are
implemented and passing. The Unity client, the Android APK/AAB and every physical-device
measurement are impossible in this environment and are reported as blocked, not as done.

## Current gate

| Gate | State | Note |
|---|---|---|
| Gate 0 — read everything, lock the direction | **PASS** | 17/17 checksums verified; split concat reproduces the canonical hash |
| Gate 1 — reproducible foundation + first Android smoke | **PARTIAL** | Tooling, scripts and CI exist. `BLOCKED_TOOLCHAIN` for the APK. |
| Gate 6b — Unity domain layer | **PASS** | Compiled and tested by .NET without an Editor; conformance-locked to the JS engine |
| Gate 2 — Supabase local, security, ledger | **PASS (adapted)** | Verified on real PostgreSQL 16 + pgTAP; see ADR-002 |
| Gate 3 — Runner Passport, all start routes | **PASS (domain)** | 8 fixtures green; no UI exists yet |
| Gate 4 — real run capture, verification, recovery | **PARTIAL** | Journal compiled and tested on the JVM (9/9); verification and anti-cheat engine tested with a 53-fixture corpus. The foreground service and Health Connect need the Android SDK: `BLOCKED_TOOLCHAIN`. |
| Gate 5 — reward, momentum, Monthly Apex 1000 | **PASS** | 44 pgTAP + 18 unit tests over the full ladder |
| Gate 6 — content pipeline + duplicate validator | **PASS** | Caught and fixed a real reskin |
| Gate 7 — full launch content | **DATA_PASS** | All 18 categories at floor as validated data; no playable scenes |
| Gate 8 — RPG, social, season, operations | **NOT STARTED** | Schema groundwork only |
| Gate 9 — quality, performance, 10 audits | **PARTIAL** | 10 audits complete in `docs/audits/`; 4 high-severity defects found and fixed. Performance is `BLOCKED_DEVICE`. |
| Gate 10 — release, APK, GitHub Release | **BLOCKED_TOOLCHAIN** | No APK can be produced here |

## Verified evidence from this session

Every number below came from a command that was actually run.

| Check | Command | Result |
|---|---|---|
| Bundle integrity | `sha256sum -c SHA256SUMS.txt` | 17/17 OK |
| Split reconstruction | `cat 01..08 \| sha256sum` | matches `b80ecb10…1978` |
| Direction lock | `node tools/direction-lock/scan.mjs` | 94 files, 19 patterns, **0 violations** |
| Content validation | `node tools/content-validator/validate.mjs` | **all gates passed**, 18/18 categories at floor |
| Domain engine | `node --test "tools/tests/*.test.mjs"` | **85 pass / 0 fail** |
| Migrations from empty DB | `for f in migrations/*.sql; psql -f $f` | 8/8 applied clean |
| Seed + content gate | `psql -f backend/supabase/seed.sql` | 16 categories verified in-database |
| Database suite | `pg_prove backend/supabase/tests/pgtap/*.sql` | **Files=7, Tests=1128, Result: PASS** |
| Run-capture core | `gradle test` (Kotlin/JVM) | **9 run, 0 failed** |
| Unity domain layer | `dotnet test` (C#) | **29 passed, 0 failed** |
| Anti-cheat simulation | 38 normal + 14 attack fixtures | **precision 100%, recall 100%, false positives 0** |
| JS vs C# conformance | 19 cases replayed by the client | **identical** |
| JS vs SQL conformance | 18 cases, 225 steps, 992 assertions | **identical** |

## Launch content actually implemented

| Category | Count | Floor | State |
|---|---:|---:|---|
| Continents | 12 | 12 | DATA_PASS |
| Region nodes | 96 | 96 | DATA_PASS |
| Main stages | 72 | 72 | DATA_PASS |
| Side stages | 24 | 24 | DATA_PASS |
| Playable characters | 12 | 12 | DATA_PASS |
| Character episodes | 36 | 36 | DATA_PASS |
| Tactical skills | 48 | 48 | DATA_PASS |
| Tactical relics | 72 | 72 | DATA_PASS |
| Standard enemy families | 24 | 24 | DATA_PASS |
| Elite enemy families | 12 | 12 | DATA_PASS |
| Continent bosses | 12 | 12 | DATA_PASS |
| World bosses | 4 | 4 | DATA_PASS |
| Apex 1000 boss | 1 | 1 | DATA_PASS |
| Companions | 12 | 12 | DATA_PASS |
| Equipable cosmetics | 96 | 96 | DATA_PASS |
| Story chapters | 12 | 12 | DATA_PASS |
| Launch season | 1 | 1 | DATA_PASS |
| Event arcs | 3 | 3 | DATA_PASS |

**`DATA_PASS` means:** stable IDs, ko + en localization, valid asset addresses, a reachable
route graph, backend mapping, reward wiring, automated validation and per-item uniqueness.
**It does not mean playable** — there is no Unity Editor here, so no scene or prefab has
been built. Continents playable: **0/12**. Characters playable: **0/12**. See ADR-003.

## Direction lock status

| Lock | State | How it is held |
|---|---|---|
| DL-1 · 1000 km final, 52 checkpoints | **PASS** | Enum order, 4 CHECK constraints, 44 pgTAP tests, 18 unit tests, static scan |
| DL-2 · every level starts on day one | **PASS** | 8 fixtures; full library selectable by all; no `requires_goal_id` column exists |
| DL-3 · running only | **PASS** | 4-value enum makes trail/hiking/cycling a cast error; 19 forbidden reward keys throw |
| DL-4 · broad launch world | **DATA_PASS** | All floors met as data; playability blocked on Unity |
| DL-5 · verified running is the only power | **PASS** | `core_power_source` enum; cosmetics pinned to zero by CHECK |

Forbidden `1250` / `1500` / `2000` / `Endless` scan: **0 occurrences** outside the lock
document, the scanner itself and the tests that assert their absence.

## External blockers — what a human would need to do

| Blocker | Status | Minimum action required |
|---|---|---|
| No Android SDK (`dl.google.com` refused by network policy) | `BLOCKED_TOOLCHAIN` | Run the build where `dl.google.com` is reachable, or pre-install the SDK into the image |
| No Unity Editor or licence | `BLOCKED_TOOLCHAIN` | Provide Unity 6.3 LTS + a licence on the build machine |
| No Docker, so no Supabase CLI stack | `BLOCKED_TOOLCHAIN` (mitigated) | Optional — the SQL is verified against real PostgreSQL + pgTAP |
| No physical Android device | `BLOCKED_DEVICE` | Attach a 4 GB-class device with USB debugging for fps/battery/thermal |
| No Google Play credentials | `BLOCKED_ACCOUNT` | Owner authorises Play access; production rollout needs explicit approval regardless |

## Next five exact commands

```bash
npm run test:fast                          # 1. confirm the tree is still green
bash tools/test/db.sh                      # 2. confirm the database suite is still green
node tools/content-factory/build.mjs       # 3. regenerate content after editing design tables
node tools/content-factory/emit-seed.mjs   # 4. regenerate seed.sql to match
bash tools/bootstrap/doctor.sh             # 5. re-check whether Unity/Android became available
```

## Generated evidence

| Document | Source | Regenerated by |
|---|---|---|
| `docs/RLS_MATRIX.md` | `pg_catalog` on a migrated database | `tools/test/db.sh` |
| `docs/DATABASE_SCHEMA.md` | 52 relations, 421 columns, 237 constraints | `tools/test/db.sh` |
| `artifacts/test-evidence-manifest.json` | 7 suites that ran, 7 items blocked | `tools/test/db.sh` |

These are generated rather than written, because a security document that has drifted from
the schema states the wrong thing with confidence. CI fails if the committed copies differ
from a fresh generation.

## Read these first next session

1. `docs/USER_DIRECTION_LOCK.md`
2. `docs/CURRENT_STATE.md`
3. `requirements/REQUIREMENTS_TRACEABILITY.csv`
4. `docs/DECISIONS.md` (ADR-002 and ADR-003 explain the two adaptations made here)
5. `docs/audits/`

## Do not

- Do not re-promise the launch counts each session. Continue from the real `DATA_PASS` /
  `PLAYABLE_PASS` numbers in this file.
- Do not shrink to three continents or add a tier above 1000 km to make progress look
  easier. Both fail CI immediately.
- Do not report a `BLOCKED_*` item as complete.
