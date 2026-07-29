# READ_COMPLETE — full source ingestion record

**Gate 0 evidence.** Every file in the uploaded requirement bundle was read end to end
before any implementation began, and every checksum was verified locally rather than
trusted from the manifest.

- Bundle: `20690485-RUNNINGUP_3D_REAL_RUN_RPG_DUAL_AGENT_MASTER_PROMPT_v4.0.0_APEX1000_GRAND_WORLD_SPLIT_BUNDLE.zip`
- Extracted to: `<session scratch>/bundle` (outside the repository, so no requirement text
  is committed into the product tree)
- Read date: 2026-07-29
- Agent/runtime: Claude Code (`claude-opus-5`), Linux container

## Verification commands actually run

```bash
sha256sum -c SHA256SUMS.txt          # 17/17 OK
cat 01_*.txt 02_*.txt 03_*.txt 04_*.txt 05_*.txt \
    06_*.txt 07_*.txt 08_*.txt | sha256sum
# -> b80ecb1077daf3967d9b4a8c918b4eebe942d93d5aa8805fdf10de8c7dca1978
```

Both the canonical master's own SHA-256 and the byte-concatenation of the eight split
files reproduce the canonical hash:

```
b80ecb1077daf3967d9b4a8c918b4eebe942d93d5aa8805fdf10de8c7dca1978
```

## Files read, in the order the bundle mandates

| # | File | Bytes | Lines | SHA-256 (first 16) | Read |
|---|---|---:|---:|---|---|
| 1 | `00_READ_FIRST.txt` | 2,515 | 52 | `7b0d3f014493ade5` | full |
| 2 | `01_FOUNDATION_DIRECTION_RESEARCH.txt` | 40,120 | 716 | `edfa4a7961711753` | full |
| 3 | `02_PRODUCT_SCOPE_EXPERIENCE_WORLD.txt` | 34,319 | 831 | `a34050cd0d5fbea7` | full |
| 4 | `03_RUNNING_PASSPORT_APEX_ANTICHEAT.txt` | 22,872 | 750 | `2d799364423f303e` | full |
| 5 | `04_RPG_SOCIAL_LIVEOPS.txt` | 15,362 | 423 | `b2f56c5dd4675e25` | full |
| 6 | `05_SUPABASE_ARCHITECTURE_CONTENT_PIPELINE.txt` | 29,145 | 792 | `52f4d1c153ec03cf` | full |
| 7 | `06_UI_PERFORMANCE_SECURITY_ANALYTICS.txt` | 34,694 | 687 | `8438dca074455948` | full |
| 8 | `07_TEST_GATES_RELEASE_OPERATIONS.txt` | 31,716 | 846 | `7fb416707cf4841c` | full |
| 9 | `08_HANDOFF_AUDITS_DOD_EXECUTE.txt` | 29,055 | 759 | `34aa7ddd650a8278` | full |
| 10 | `MANIFEST.txt` | 3,621 | — | `—` | full |
| 11 | `SHA256SUMS.txt` | 1,636 | — | `—` | full |
| 12 | `SOURCES.txt` | 5,481 | 119 | `5521567fcabd5838` | full |
| 13 | `VALIDATION_10PASS.txt` | 5,374 | 81 | `e3e72d59d1f139f2` | full |
| 14 | `BUNDLE_VERSION.txt` | 154 | 3 | `aa820de73135b927` | full |
| 15 | `CLAUDE_CODE_START.txt` | 12,985 | 196 | `5fc7f5a765776ae4` | full |
| 16 | `CODEX_START.txt` | 12,985 | 196 | `5fc7f5a765776ae4` | full (identical to 15) |
| 17 | `DUAL_AGENT_CHAT_START.txt` | 12,985 | 196 | `5fc7f5a765776ae4` | full (identical to 15) |
| — | `RUNNINGUP_..._v4.0.0_FINAL.txt` | 237,283 | 5,804 | `b80ecb1077daf396` | full, via the 8 verified splits |

**Files not read: none.** No file was skipped, sampled or summarised before implementation.

## Existing repository state at Gate 0

| Property | Value |
|---|---|
| Working directory | `/home/user/runningup` |
| Git remote | `runningup706/runningup` (via the session git proxy) |
| Remote refs | **none** — `git ls-remote` returned empty |
| Local commits | none (unborn branch) |
| Working branch | `claude/runningup-3d-android-dev-3c8gnp` |
| Dirty / untracked files | none |
| Submodules / LFS | none |
| Existing Unity, Android, Supabase or CI files | none |

The repository was genuinely empty. **Nothing was overwritten, reset, cleaned or
force-pushed**, and the preservation rules in master # 3 / # 24.1 had no existing work to
protect. This is recorded because "there was nothing to preserve" is a factual finding,
not a licence to skip the check.

## Core requirements extracted

The immutable ones are transcribed into [`USER_DIRECTION_LOCK.md`](USER_DIRECTION_LOCK.md)
and its machine-readable mirror `content/schemas/direction_lock.json`:

1. **DL-1** Monthly Apex ends at exactly 1000 km, 52 checkpoints, 11 ranks + World Crown,
   nothing above it; distance beyond 1000 km still earns the ordinary per-run reward.
2. **DL-2** Every ability level starts at its own level on day one; no low-distance
   prerequisite may gate anything.
3. **DL-3** Running only — road, track, treadmill, indoor. Run-walk is a beginner method.
4. **DL-4** Launch floor of 12 continents / 96 regions / 72 main / 24 side / 12 characters
   and the full content table, all genuinely playable.
5. **DL-5** Verified real running is the only source of core power.

## Conflicts, duplications and gaps found while reading

| Finding | Resolution |
|---|---|
| `CLAUDE_CODE_START.txt`, `CODEX_START.txt` and `DUAL_AGENT_CHAT_START.txt` are byte-identical (same SHA-256) | Treated as one document. The agent-specific split lives in `AGENTS.md` / `CLAUDE.md`, with the shared contract in `docs/AGENT_EXECUTION_CONTRACT.md`. |
| `00_READ_FIRST` says "minimum 40 checkpoints"; `# 6.3.1` and `# 11.8` both give a 52-entry seed | 52 is canonical; 40 is the floor. The seed is 52 and the DB CHECK requires exactly 52. |
| Master # 1 `monthly_progression.checkpoints_minimum: 40` vs # 28.1 "기본 정본은 52개" | Same resolution: floor 40, canonical 52. |
| `# 7.3` asks for 72 standard enemy *variants* and `# 22.2` for 24 standard *families* | Modelled as 24 families × 3 variants = 72 variants. Both counts are satisfied by one dataset. |
| Master requires Unity 6.3 LTS + Android API 36 + IL2CPP, and a physical device | Not satisfiable in this environment. Recorded as `BLOCKED_TOOLCHAIN` / `BLOCKED_DEVICE` in `docs/CURRENT_STATE.md` rather than silently descoped. |
| Master # 16.1 mandates the Supabase CLI local stack (Docker) | No Docker daemon in this container. Migrations are written as plain Supabase-compatible SQL and verified against a real PostgreSQL 16 + pgTAP instead. Documented in `docs/DECISIONS.md` ADR-002. |
| `SOURCES.txt` cites a v3.1.0 bundle with a 1000 km+ endless ladder | That bundle is not present and none of its concepts were carried in. `tools/direction-lock/scan.mjs` fails the build if any reappear. |

## Module ownership for the implementation

| Area | Owner path |
|---|---|
| Direction lock enforcement | `tools/direction-lock/`, `content/schemas/direction_lock.json` |
| Domain engine (passport, apex, reward, momentum, best efforts) | `tools/lib/`, tests in `tools/tests/` |
| Launch content design + pipeline | `tools/content-factory/`, `content/launch/`, `tools/content-validator/` |
| Backend schema, RLS, reward transaction | `backend/supabase/migrations/`, `backend/supabase/tests/pgtap/` |
| Android native running capture | `native/android-running-plugin/` |
| Unity client | `client/unity/` |
| Docs, gates, audits, traceability | `docs/`, `requirements/` |
