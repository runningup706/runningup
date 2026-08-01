# USER_DIRECTION_LOCK — RunningUp V14

**Status: LOCKED.** These are top-level user product decisions, not engineering trade-offs.
No agent, session, schedule pressure, performance concern, or "realism" argument may
reduce, defer, re-scope, or reinterpret any item on this page. Improvements are allowed
only *inside* these boundaries.

Source of truth: the current V14 product direction and the user-approved V14 runtime.
The lock is intentionally self-contained so the active product does not depend on an
older version's prompt or archive.

| Decision | Effect |
|---|---|
| Launch scale | **121** checkpoints and **192** regions |
| Product mode | **DL-6**, a running race with no combat systems |
| The V14 Unity client is the client of record | Client ladder and navigation contracts are testable in this repo |

Machine-readable mirror: [`content/schemas/direction_lock.json`](../content/schemas/direction_lock.json).
Enforced by `tools/direction-lock/scan.mjs` (run in `npm run validate:direction-lock` and CI),
whose patterns are themselves tested by `tests/direction-lock.test.mjs`.

---

## DL-1 — Monthly Apex ends at exactly 1000 km

| Rule | Value |
|---|---|
| Final monthly distance | **1000.000 km**, the single `World Crown` |
| Checkpoints in 0–1000 km | **121** (minimum 40; 121 is the canonical seed) |
| Marathon checkpoint | **42.195 km exactly**, never rounded to 42 km |
| Major ranks | 11 named ranks + `World Crown` as final |
| Tiers above 1000 km | **Forbidden** — no 1250/1500/2000, no Endless Ladder |
| Distance run above 1000 km | Recorded as `over_crown_distance`; ordinary per-run reward continues |
| Monthly rank / multiplier / checkpoint above 1000 km | **Never increases** past World Crown |
| Multi-checkpoint crossing | One server transaction, ascending order, no gap, no duplicate |
| `Apex Axis` final race | Entered exactly once per user-month at 1000 km |

The ladder is defined once, in `packages/domain/constants.mjs` (`APEX_CHECKPOINT_METERS`),
and mirrored by `MonthlyApexLadder.cs` and the Unity client's
`V14ScreenFlowController.MonthlyCheckpointsMeters`. All distances are **integer metres**, so
999.999 km and exactly 1000.000 km are distinguishable without floating-point drift.

Forbidden tokens anywhere in code, schema, seed, localization, remote config, UI or docs
(outside this lock file and its tests): `1250km`, `1500km`, `2000km`, `Endless Ladder`,
`Endless Volume`, any monthly rank ordered above `World Crown`, any checkpoint threshold
`> 1000 km`.

## DL-2 — Every ability level starts at its own level on day one

- No universal forced `1km → 3km → 5km` funnel. **No low-distance prerequisite may gate any
  higher-distance goal, race, quest, continent, or runner.**
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
- Runner Passport band changes never claw back earned rewards, runners or world progress.

## DL-3 — Running only

- In scope: **road running, track running, treadmill/indoor running**.
- Walking is **only** a segment inside a beginner `run_walk` running session — never a sport.
- Forbidden as product mode, stat, class, rank, quest, leaderboard, badge or reward:
  trail running, hiking, cycling, climbing, elevation/altitude progression.
- Weather and time-of-day (night) are **never** reward multipliers or quest conditions.
- Elevation may exist only as inert raw sensor metadata: never a core stat, leaderboard,
  quest input, runner class or monthly multiplier. `api.world_courses` has no elevation,
  gradient or incline column, and the content validator fails the build if one appears.
- Non-running Health Connect activity types are never converted into running rewards.
- No exercise-advisory, scolding or warning pop-ups in player-facing game screens.

## DL-4 — Launch is a broad world, not a vertical slice

Launch floor — each item counts **only** if it has a stable ID, localization in every
shipped locale, a valid asset/prefab reference, a reachable in-game route, save/backend
mapping, reward wiring, analytics wiring, at least one automated test, and QA evidence:

| Content | Floor |
|---|---|
| Playable continents | 12 |
| Region nodes | 192 |
| Running courses | 2304 |
| Main races | 72 |
| Challenge races | 24 |
| Race formats | 7 |
| Challenge formats | 6 |
| Playable runners | 12 |
| Character episode chapters | 36 |
| Race techniques | 48 |
| Gear sets | 72 |
| Standard rival crews | 24 |
| Elite rival crews | 12 |
| Continent champions | 12 |
| Open race events | 4 |
| Apex 1000 final race | 1 |
| Companions | 12 |
| Equipable cosmetics | 96 |
| Story chapters | 12 |
| Launch season | 1 |
| Event arcs | 3 |
| My Runner base styles | 24 |
| World runners (pacers) | 200 |
| Equipment slots | 18 |
| Outfit sets | 120 |
| Wearable items | 600 |
| Global Events | 6 |

The last six rows are the owner's scale expansion. They are held separately as
`SCALE_FLOOR` in `packages/domain/constants.mjs` and `LAUNCH_CONTENT_FLOOR` is built from
them, so the number exists once. The rule attached to them is

```
effective minimum = max(current implemented floor, owner floor)
```

— a floor may rise and may never fall. `equipable_cosmetics` (96, per playable runner) and
`wearable_items` (600, the My Runner wardrobe) are deliberately separate categories with
separate floors: folding one into the other would let 96 vanish into a larger number.

A Global Event carries **50–100** participants. The eight-runner race is unchanged and
stays eight: they are different products sharing one engine.

The canonical copy of this table is `LAUNCH_CONTENT_FLOOR` in `packages/domain/constants.mjs`;
`private.assert_launch_content_complete()` restates it in SQL and the content validator
compares the two sets in both directions, so a category cannot ship ungated and a floor
cannot exist with nothing counting it.

- All 12 continents visible on the Grand World map from **first login**, and downloadable,
  enterable, raceable, restorable and champion-clearable on launch day.
- All 12 runners visible, trial-playable, selectable, raceable and episode-playable on
  launch day.
- Per-parent floors are enforced as well as totals: every continent carries ≥ 16 regions,
  ≥ 6 main races and 6 gear sets of its own; every region carries exactly 12 courses; every
  runner carries exactly 4 techniques. A total met by one rich continent is not met.
- `Coming Soon`, empty portals, disabled flags, debug-only entries and colour/name reskins
  **do not count**. This is enforced, not asked for: two base styles that differ only in
  skin tone fail the build, two world runners with the same appearance, role and tendency
  cannot be stored, and an item that fits no body violates a CHECK constraint. The
  equipment case is the one a count can never see — 600 wearable items and a child style
  with no shoes — so `private.assert_launch_content_complete()` and the content validator
  both check that *every* base style can fill *every* required slot.
- Performance or APK size is solved by tiered scene streaming and optional content packs —
  **never** by deleting continents or postponing them to P1/P2.

## DL-5 — Verified real running is the only source of core power

`Fitness XP` and `Attribute Growth` have exactly one source: the verified run ledger.
Cash, ads, login days, idle time, cosmetics, random boxes, gold farming, referrals and
operator grants contribute **0** to Fitness Core Power. Operator corrections use an
auditable reversal/compensation ledger, never a ledger row edit.

In the race engine this is literal: `corePower` is the only input to `buildRunnerForm()`
that changes how fast a runner is. Roles, techniques, gear sets and strategies all
redistribute one fixed budget and are asserted to sum to the same total.

## DL-6 — RunningUp is a running race, not a combat game

The contest is a race against other runners, decided by pace, endurance and a finishing
kick. There is no health, no damage, no attack and no enemy anywhere in the product.

**Forbidden as a product concept, schema object, content record, stat, screen or reward:**
bosses (world, continent, apex, raid), enemies and enemy families, monsters, battle stages
and battle nodes, auto-battle and turn-based battle, combat roles and combat mechanics,
HP / hit points / damage values, basic attacks, weapons and weapon slots, tactical skills,
tactical relics, and dungeons.

**What the product has instead**, one-for-one with what was removed:

| Removed | Replacement | Count |
|---|---|---|
| Main / side battle stages | Main races, challenge races | 72 / 24 |
| Standard and elite enemy families | Standard and elite rival crews | 24 / 12 |
| Continent bosses | Continent champions | 12 |
| Rotating world bosses | Rotating open race events | 4 |
| Apex 1000 final boss | Apex Axis final race | 1 |
| Tactical skills | Race techniques (opening, midrace, habit, finish) | 48 |
| Tactical relics | Gear sets (sidegrades over cruise / stamina / kick) | 72 |
| Challenge dungeon types | Challenge race formats | 6 |

Every count was preserved across the change. Combat content was removed because it is not
the product, **never** to make a launch floor easier to reach.

- The race engine is `packages/domain/race.mjs`: eight runners, one distance, a finishing
  order. No runner is removed from a race, nothing is confiscated, and losing a race costs
  the player nothing but the placing.
- A rival is described entirely by *how it runs*. `api.rival_crews` has a `tactic` column
  and no health, damage or attack column, and one may not be added.
- Gear trades name only `cruise`, `stamina` and `kick` — the three axes the race engine
  resolves races on — enforced by a CHECK constraint, so a stat like `attack_budget` is
  unrepresentable rather than merely unused.
- `api.world_regions.node_type` is one of `race_node`, `challenge_node`, `champion_node`.
  `battle_node` cannot be stored.
- Migration `0012_v14_race_content.sql` **drops** `api.world_stages`, `api.world_bosses`,
  `api.character_skills`, `api.tactical_relics` and `api.enemy_families`. pgTAP asserts
  those tables do not exist, because an empty table still makes a return one insert away.
- "Attack" remains legitimate vocabulary in the anti-cheat corpus — an attack on the
  verification system. The scanner's patterns target combat as a *game system*, and
  `tests/direction-lock.test.mjs` asserts both that they catch it and that they do not fire
  on the running vocabulary or the anti-cheat corpus.

---

## Enforcement

| Lock | Automated enforcement |
|---|---|
| DL-1 | `tools/direction-lock/scan.mjs`, `backend/supabase/migrations/*` CHECK constraints, `backend/supabase/tests/pgtap/*apex*`, `tools/monthly-apex-simulator`, `tools/release/emit-client-ladder.mjs --check` |
| DL-2 | `tools/runner-passport-simulator` (8 fixtures), `tools/content-validator` goal-library completeness |
| DL-3 | `tools/direction-lock/scan.mjs` forbidden-mode scan, DB enum/CHECK on `activity_type` and `world_courses.surface`, negative fixtures, `pgtap/02_running_scope.sql` |
| DL-4 | `tools/content-validator` hard count gate, per-parent coverage gate, semantic duplicate detection and scale gate (GATE 10); `private.assert_launch_content_complete()`; `pgtap/05_content_completeness.sql`, `pgtap/08_my_runner_scale.sql`; `tests/scale-floor.test.mjs`, whose second half feeds the validator deliberately broken content and asserts each gate fires |
| DL-5 | DB: `xp_ledger.source_type` allow-list + pgTAP invariant tests; `tests/race.test.mjs` role/gear budget assertions |
| DL-6 | `tools/direction-lock/scan.mjs` combat-concept patterns (self-tested by `tests/direction-lock.test.mjs`), `pgtap/05_content_completeness.sql` schema-absence and CHECK-constraint tests, `tests/race.test.mjs` source scan |

A violation of any row above is a **release blocker**, not a warning.
