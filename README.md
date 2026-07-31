# RunningUp (러닝업)

A 3D real-run linked idle action RPG for Android. Your verified real-world running is the
only thing that grows your character, and a month of running is a journey across twelve
continents toward a single final goal: **1000 km, the World Crown**.

**Status: pre-alpha (`0.1.0-alpha.1`).** Backend, domain engine and launch content data are
implemented and tested. The Unity client and the Android build are not — see
[`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md) for an exact, unembellished breakdown.

## The product in five fixed decisions

These are user decisions, not engineering preferences. They are enforced by tests, database
constraints and a static scanner — see [`docs/USER_DIRECTION_LOCK.md`](docs/USER_DIRECTION_LOCK.md).

1. **1000 km is the end of the month.** 52 checkpoints from 0 to 1000 km, 11 ranks plus the
   World Crown, and nothing above it. Running past 1000 km still earns its ordinary reward;
   it just does not invent a new tier.
2. **Everyone starts at their own level on day one.** A marathon runner is never made to
   finish a 1 km tutorial, and a first-time runner is never handed a marathon. The Runner
   Passport recommends; it never restricts.
3. **Running only.** Road, track, treadmill and indoor. Run-walk is a beginner running
   method. No trail, hiking, cycling or elevation progression — and no weather or
   time-of-day multipliers.
4. **The world is broad on launch day.** 12 continents, 96 regions, 72 main stages, 24 side
   stages and 12 characters, all real. No "coming soon" counted as content.
5. **Verified running is the only source of power.** Money, ads, idle time, cosmetics and
   referrals contribute exactly zero.

## Repository map

| Path | What lives there |
|---|---|
| `packages/domain/` | The domain engine: Monthly Apex, Runner Passport, reward, momentum, best efforts |
| `tests/` | 99 unit tests over that engine |
| `tools/content-factory/` | Authored design tables + the generator that expands them |
| `tools/content-validator/` | The hard launch-content gate, including duplicate detection |
| `tools/direction-lock/` | The forbidden-concept scanner |
| `content/launch/` | Generated canonical content JSON (do not hand-edit) |
| `content/localization/` | ko + en catalogues |
| `backend/supabase/migrations/` | Schema, RLS, ledgers, the atomic reward transaction |
| `backend/supabase/tests/pgtap/` | 123 database tests |
| `native/android-running-plugin/` | Kotlin run capture, journal and upload queue |
| `client/unity/` | Unity client skeleton |
| `docs/` | Gates, decisions, audits, traceability |

## Getting started

```bash
bash tools/bootstrap/doctor.sh   # what this machine can and cannot build
npm run test:fast                # direction lock + content validation + unit tests
bash scripts/db.sh            # migrations, seed and the pgTAP suite
npm run test:all                 # everything above, in CI order
```

`scripts/db.sh` expects a reachable PostgreSQL 16 with the `pgtap` extension available.

## Regenerating content

`content/launch/**` and `backend/supabase/seed.sql` are **generated**. Edit the authored
design tables instead, then regenerate — CI fails if the committed tree and the generated
output disagree.

```bash
node tools/content-factory/build.mjs      # design tables -> content JSON + localization
node tools/content-factory/emit-seed.mjs  # content JSON -> seed.sql
```
