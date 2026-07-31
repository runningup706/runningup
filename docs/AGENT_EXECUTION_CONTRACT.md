# AGENT_EXECUTION_CONTRACT

The single shared contract for any agent working in this repository. `AGENTS.md` (Codex)
and `CLAUDE.md` (Claude Code) are short pointers to this file; they must never contradict
it, and detail belongs here rather than duplicated into both.

## 1. Read before writing

In this order, every session:

1. `docs/USER_DIRECTION_LOCK.md` — the five immutable directions
2. `HANDOFF.md` — where the previous session stopped
3. `docs/CURRENT_STATE.md` — what is genuinely done versus blocked
4. `requirements/REQUIREMENTS_TRACEABILITY.csv` — requirement IDs and their status
5. `git status`, `git log --oneline -10`

Do not trust a handoff without re-checking it: run `npm run test:fast` before believing any
claim about state.

## 2. The direction lock is not negotiable

DL-1 … DL-5 in `docs/USER_DIRECTION_LOCK.md` are user decisions. An agent may not reduce,
defer, reinterpret or "make realistic" any of them. If an implementation seems to require
breaking one, the implementation is wrong — record the tension in `docs/DECISIONS.md` and
find another way.

## 3. Never report what you have not verified

- A requirement is `PASS` only with a command that was actually run and an artifact that
  actually exists.
- Use the master's status vocabulary exactly: `PASS`, `FAIL`, `BLOCKED_EXTERNAL`,
  `BLOCKED_AUTH`, `BLOCKED_DEVICE`, `BLOCKED_TOOLCHAIN`, `BLOCKED_ACCOUNT`,
  `BLOCKED_BUDGET`, `BLOCKED_LEGAL_REVIEW`, `BLOCKED_LOCALIZATION_REVIEW`, `DEFERRED_P1`,
  `DEFERRED_P2`, `NOT_APPLICABLE`.
- A blocked P0 stays a blocked P0. Downgrading it to `DEFERRED` to make a report look
  finished is a reporting failure, not a scheduling decision.
- Emulator numbers are never evidence for device performance.
- Content data is `DATA_PASS`; it becomes `PLAYABLE_PASS` only when it is genuinely
  reachable and playable in a build.

## 4. Do not destroy work

Forbidden without explicit human approval: `git reset --hard`, indiscriminate `git clean`,
force push, rewriting another agent's uncommitted changes, and deleting a failing test to
make a gate green.

## 5. Generated files

`content/launch/**` and `backend/supabase/seed.sql` are generated. Edit
`tools/content-factory/**/*-design.mjs` and regenerate. `scripts/all.sh` fails if the
committed tree and the regenerated output differ.

## 6. Single source of truth

Every locked number lives in `packages/domain/constants.mjs` and is mirrored — never re-typed —
into SQL and content. If a value appears in two places by hand, that is a defect.

## 7. Definition of a green commit

```bash
npm run test:fast     # direction lock, content validation, unit tests
bash scripts/db.sh # migrations, seed, pgTAP
```

Both green, `HANDOFF.md` and `docs/CURRENT_STATE.md` updated to match reality, and the
traceability CSV reflecting any requirement whose status changed.
