# AGENTS.md — RunningUp

Short index for Codex. The full contract is
[`docs/AGENT_EXECUTION_CONTRACT.md`](docs/AGENT_EXECUTION_CONTRACT.md); read it first.

## Read these, in order

1. `docs/USER_DIRECTION_LOCK.md`
2. `HANDOFF.md`
3. `docs/CURRENT_STATE.md`
4. `requirements/REQUIREMENTS_TRACEABILITY.csv`

## Commands

```bash
bash tools/bootstrap/doctor.sh   # toolchain reality check
npm run test:fast                # direction lock + content + unit tests
bash scripts/db.sh            # migrations + seed + pgTAP
npm run test:all                 # full local gate, mirrors CI
node tools/content-factory/build.mjs && node tools/content-factory/emit-seed.mjs
```

## Rules that will fail the build if broken

- **DL-1** 1000 km is the final monthly checkpoint. No 1250/1500/2000, no endless ladder,
  no rank above `World Crown`. Distance beyond 1000 km still earns its ordinary reward.
- **DL-2** No low-distance prerequisite may gate any goal, race, continent or runner.
- **DL-3** Running only: road, track, treadmill, indoor. No trail/hiking/cycling/elevation,
  no weather or night multipliers.
- **DL-4** The launch content floor is a build gate, not an aspiration.
- **DL-5** Only verified running grants core power.
- **DL-6** It is a running race, not a combat game. No bosses, enemies, HP, damage,
  weapons, tactical skills/relics or dungeons — anywhere.

## Do not

- Hand-edit `content/launch/**` or `backend/supabase/seed.sql` (generated).
- Re-type a locked number instead of importing it from `packages/domain/constants.mjs`.
- `git reset --hard`, blanket `git clean`, or force push.
- Weaken or skip a test to make a gate pass.
- Report a blocked item as complete, or emulator numbers as device evidence.
