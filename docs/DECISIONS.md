# DECISIONS

Architecture decision records for choices that are hard to reverse or that cross several
modules. Small reversible choices are made without a record, per the master's guidance.

---

## ADR-001 — Credited distance is stored as integer metres

**Status:** accepted · **Date:** 2026-07-29

**Context.** The direction lock turns on two exact boundaries: 999.999 km must not award
the World Crown, and exactly 1000.000 km must. Storing kilometres as a floating-point
number makes those boundaries unrepresentable — `999.999 + 0.001` is not reliably `1000.0`
in IEEE 754, and a rounding error at the boundary would either steal a crown or hand one
out early.

**Decision.** Every credited or accumulated distance is an **integer number of metres**, in
the domain engine, the database and the content seed alike. Goal *targets* (one mile,
half marathon) may be fractional because they are compared with a tolerance and never used
for ledger threshold crossing.

**Consequences.** Sub-metre GPS precision is discarded at the ledger boundary, which is
correct: it carries no meaning. `999999` and `1000000` are exact, and the pgTAP suite tests
that exact transition.

---

## ADR-002 — The backend is verified against PostgreSQL 16 + pgTAP, not the Supabase CLI

**Status:** accepted under constraint · **Date:** 2026-07-29

**Context.** Master # 16.1 makes the Supabase CLI local stack the canonical workflow. That
stack requires Docker, and this build environment has no Docker daemon
(`/var/run/docker.sock` does not exist). The alternative to verifying *something* was
shipping unverified SQL.

**Decision.** Migrations are written as plain, Supabase-compatible SQL and applied to a real
PostgreSQL 16 instance with the real pgTAP 1.3.2 extension. `0001_foundation.sql` creates
the `auth.uid()` / `auth.role()` / `is_anonymous()` functions and the anon / authenticated /
service_role roles **only when they are absent**, so the identical migration runs unmodified
on hosted Supabase where GoTrue already provides them.

**Consequences.** The schema, the RLS matrix, the constraints and the reward transaction are
genuinely executed and tested here. What is *not* covered: PostgREST request shaping,
GoTrue token issuance, Storage policies and Edge Functions. Those remain
`BLOCKED_TOOLCHAIN` and are listed as such in `docs/CURRENT_STATE.md`.

---

## ADR-003 — `DATA_PASS` is reported separately from `PASS`

**Status:** accepted · **Date:** 2026-07-29

**Context.** The master's status vocabulary is deliberately strict, and # 29.2 forbids
counting a data row as playable content. All 18 launch content categories are complete,
validated, localized and referentially sound — but no Unity Editor exists here, so none of
it has been built into a scene. Reporting "12/12 continents PASS" would be true of the data
and false of the game.

**Decision.** Content items whose data layer is complete and validated but which have no
built, reachable scene are reported as **`DATA_PASS`**, never as `PASS`, and never as
`PLAYABLE_PASS` (the master's own term for the release-candidate gate in # 19.4).

**Consequences.** This is an addition to the master's vocabulary. It is made deliberately,
because the alternatives — reporting `PASS` or reporting `FAIL` — are both inaccurate. Every
report in this repository carries the distinction, and the promotion criterion is explicit:
`DATA_PASS` becomes `PLAYABLE_PASS` when the item is reachable and playable in a build.

---

## ADR-004 — Forbidden concepts are unrepresentable, not merely absent

**Status:** accepted · **Date:** 2026-07-29

**Context.** DL-1 and DL-3 have been violated before in this project's history: the v3.1
bundle carried a 1000 km+ endless ladder. A convention like "don't add trail running" is
only as strong as the next person's memory.

**Decision.** Prohibitions are enforced by the type system and by constraints wherever
possible, and by a static scanner everywhere else:

| Prohibition | Mechanism |
|---|---|
| Non-running activity | `private.activity_type` enum has exactly four values; `'trail'::activity_type` is a cast error |
| Rank above World Crown | `private.apex_rank` enum ends at `world_crown`; enum order is rank order |
| Checkpoint above 1000 km | `CHECK (threshold_meters between 0 and 1000000)` |
| Ladder above 1000 km | `CHECK (final_checkpoint_meters = 1000000)` |
| Core power from a purchase | `private.core_power_source` enum cannot express it |
| Cosmetic with power | six `CHECK (... = 0)` constraints |
| Everything else | `tools/direction-lock/scan.mjs`, 19 concept patterns, allow-list with stated reasons |

**Consequences.** A future contributor cannot reintroduce a forbidden concept by editing
application code alone; they would have to write a migration that visibly alters an enum or
drops a constraint, which is reviewable.

---

## ADR-005 — Content is generated from authored design tables

**Status:** accepted · **Date:** 2026-07-29

**Context.** The launch floor is large (96 regions, 96 cosmetics, 72 relics). Authoring
every record by hand invites copy-paste, which is exactly the reskin failure the master
forbids. Generating everything from a template invites the same failure at machine speed.

**Decision.** Split the two. `world-design.mjs` and `character-design.mjs` are **authored**:
each continent's mechanic, palette, skyline, enemy behaviour, boss phase graph, restoration
arc and story beat is written by hand, as is each character's kit and conversion rule. The
factory generates only boilerplate: stable IDs, schema envelopes, localization skeletons and
route wiring. `content/launch/**` and `seed.sql` are generated artefacts, and CI fails if
the committed tree drifts from a fresh regeneration.

**Consequences.** This decision was validated in practice: the validator caught 72 relics
that were six themes reused across twelve continents with no real per-continent difference.
The fix was to give each continent a distinct activation condition — a content fix, not a
threshold adjustment.
