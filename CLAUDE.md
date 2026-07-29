# CLAUDE.md — RunningUp

Short index for Claude Code. The full contract is
[`docs/AGENT_EXECUTION_CONTRACT.md`](docs/AGENT_EXECUTION_CONTRACT.md); read it first.
This file deliberately mirrors `AGENTS.md` and must never contradict it.

## Read these, in order

1. `docs/USER_DIRECTION_LOCK.md`
2. `HANDOFF.md`
3. `docs/CURRENT_STATE.md`
4. `requirements/REQUIREMENTS_TRACEABILITY.csv`

## Commands

```bash
bash tools/bootstrap/doctor.sh   # toolchain reality check
npm run test:fast                # direction lock + content + unit tests
bash tools/test/db.sh            # migrations + seed + pgTAP
npm run test:all                 # full local gate, mirrors CI
```

## Rules that will fail the build if broken

- **DL-1** 1000 km is the final monthly checkpoint; nothing exists above the World Crown.
- **DL-2** No low-distance prerequisite may gate anything.
- **DL-3** Running only: road, track, treadmill, indoor.
- **DL-4** The launch content floor is a build gate.
- **DL-5** Only verified running grants core power.

## Working notes

- `content/launch/**` and `backend/supabase/seed.sql` are generated — edit the design
  tables in `tools/content-factory/` and regenerate.
- Locked numbers live once, in `tools/lib/constants.mjs`.
- Report status with the master's vocabulary. Blocked stays blocked.
- Content data is `DATA_PASS` until it is genuinely playable in a build.
