# USER_DIRECTION_LOCK — RunningUp v4.0.0

**Status: LOCKED.** These are top-level user product decisions, not engineering trade-offs.
No agent, session, schedule pressure, performance concern, or "realism" argument may
reduce, defer, re-scope, or reinterpret any item on this page. Improvements are allowed
only *inside* these boundaries.

Source of truth: `RUNNINGUP_3D_REAL_RUN_RPG_DUAL_AGENT_MASTER_PROMPT_v4.0.0_FINAL.txt`
SHA-256 `b80ecb1077daf3967d9b4a8c918b4eebe942d93d5aa8805fdf10de8c7dca1978`
(sections `# -1`, `# 6.3`, `# 7`, `# 11.8`, `# 17.4`, `# 22.1`, `# 28`, `# 29`).

Machine-readable mirror: [`content/schemas/direction_lock.json`](../content/schemas/direction_lock.json).
Enforced by `tools/direction-lock/scan.mjs` (run in `npm run validate:direction-lock` and CI).

---

## DL-1 — Monthly Apex ends at exactly 1000 km

| Rule | Value |
|---|---|
| Final monthly distance | **1000.000 km**, the single `World Crown` |
| Checkpoints in 0–1000 km | **52** (minimum 40; 52 is the canonical seed) |
| Major ranks | 11 named ranks + `World Crown` as final |
| Tiers above 1000 km | **Forbidden** — no 1250/1500/2000, no Endless Ladder |
| Distance run above 1000 km | Recorded as `over_crown_distance`; ordinary per-run reward continues |
| Monthly rank / multiplier / checkpoint above 1000 km | **Never increases** past World Crown |
| Multi-checkpoint crossing | One server transaction, ascending order, no gap, no duplicate |
| `Apex Axis` final boss | Unlocked exactly once per user-month at 1000 km |

Forbidden tokens anywhere in code, schema, seed, localization, remote config, UI or docs
(outside this lock file and its tests): `1250km`, `1500km`, `2000km`, `Endless Ladder`,
`Endless Volume`, any monthly rank ordered above `World Crown`, any checkpoint threshold
`> 1000 km`.

## DL-2 — Every ability level starts at its own level on day one

- No universal forced `1km → 3km → 5km` funnel. **No low-distance prerequisite may gate any
  higher-distance goal, stage lane, quest, continent, or character.**
- `Runner Passport` combines self-report, recent 4–8 week history, current-month import,
  distance-specific bests, preferred goals and the first calibration run into a
  **recommendation, never a restriction**.
- First-day goal library must include every one of:
  - **Distance**: 400 m, 800 m, 1 km, 1 mile, 2 km, 3 km, 5 km, 8 km, 10 km, 12 km, 15 km,
    10 mile, 20 km, half marathon (21.0975 km), 25 km, 30 km, 32 km, 35 km,
    marathon (42.195 km), 50 km, custom.
  - **Duration**: 10, 15, 20, 30, 45, 60, 75, 90, 120, 180 min, custom.
  - **Style**: free, run-walk (beginner), easy, steady, progression, tempo, intervals,
    fartlek, long run, time trial, race simulation, track, treadmill, indoor, custom.
- Independent test fixtures required for: no-history beginner, 3–5 km starter, 10 km regular,
  20 km/half, marathon, 50 km/custom, current-month import user, recommendation-override user.
- Runner Passport band changes never claw back earned rewards, characters or world progress.

## DL-3 — Running only

- In scope: **road running, track running, treadmill/indoor running**.
- Walking is **only** a segment inside a beginner `run_walk` running session — never a sport.
- Forbidden as product mode, stat, class, rank, quest, leaderboard, badge or reward:
  trail running, hiking, cycling, climbing, elevation/altitude progression.
- Weather and time-of-day (night) are **never** reward multipliers or quest conditions.
- Elevation may exist only as inert raw sensor metadata: never a core stat, leaderboard,
  quest input, character class or monthly multiplier.
- Non-running Health Connect activity types are never converted into running rewards.
- No exercise-advisory, scolding or warning pop-ups in player-facing game screens.

## DL-4 — Launch is a broad world, not a vertical slice

Launch floor — each item counts **only** if it has a stable ID, localization, a valid
asset/prefab reference, a reachable in-game route, save/backend mapping, reward wiring,
analytics wiring, at least one automated test, and QA evidence:

| Content | Floor |
|---|---|
| Playable continents | 12 |
| Region nodes | 96 |
| Main battle stages | 72 |
| Side / challenge stages | 24 |
| Playable characters | 12 |
| Character episode chapters | 36 |
| Tactical skills | 48 |
| Tactical relics | 72 |
| Standard enemy families | 24 |
| Elite enemy families | 12 |
| Continent bosses | 12 |
| World bosses | 4 |
| Apex 1000 final boss | 1 |
| Companions | 12 |
| Equipable cosmetics | 96 |
| Story chapters | 12 |
| Launch season | 1 |
| Event arcs | 3 |

- All 12 continents visible on the Grand World map from **first login**, and downloadable,
  enterable, battle-able, restorable and boss-clearable on launch day.
- All 12 characters visible, trial-playable, selectable, battle-able and episode-playable
  on launch day.
- `Coming Soon`, empty portals, disabled flags, debug-only entries and colour/name reskins
  **do not count**.
- Performance or APK size is solved by tiered scene streaming and optional content packs —
  **never** by deleting continents or postponing them to P1/P2.

## DL-5 — Verified real running is the only source of core power

`Fitness XP` and `Attribute Growth` have exactly one source: the verified run ledger.
Cash, ads, login days, idle time, cosmetics, random boxes, gold farming, referrals and
operator grants contribute **0** to Fitness Core Power. Operator corrections use an
auditable reversal/compensation ledger, never a ledger row edit.

---

## Enforcement

| Lock | Automated enforcement |
|---|---|
| DL-1 | `tools/direction-lock/scan.mjs`, `backend/supabase/migrations/*` CHECK constraints, `backend/supabase/tests/pgtap/*apex*`, `tools/monthly-apex-simulator` |
| DL-2 | `tools/runner-passport-simulator` (8 fixtures), `tools/content-validator` goal-library completeness |
| DL-3 | `tools/direction-lock/scan.mjs` forbidden-mode scan, DB enum/CHECK on `activity_type`, negative fixtures |
| DL-4 | `tools/content-validator` hard count gate + semantic duplicate detection |
| DL-5 | DB: `xp_ledger.source_type` allow-list + pgTAP invariant tests |

A violation of any row above is a **release blocker**, not a warning.
