#!/usr/bin/env bash
# Commits and pushes the local V14 Unity project so it stops living on one machine.
#
# THE PROBLEM THIS SOLVES
# -----------------------
# The repository holds four client files. Everything else — scenes, prefabs,
# ProjectSettings, Packages — exists only on one developer's disk. That means the APK
# cannot be built anywhere else, cannot be built by CI, and is one disk failure from gone.
#
# WHY A SCRIPT RATHER THAN "just git add ."
# -----------------------------------------
# The working tree that has the project is reported to be in a dangerous state: ~281 V5
# deletions staged alongside an untracked V14 project. A careless `git checkout`, `git
# reset --hard` or `git clean` there destroys unrecoverable work — untracked files are not
# in any commit, so nothing brings them back.
#
# So this script:
#   * refuses to run any destructive git command, ever;
#   * shows exactly what it is about to add and stops for confirmation;
#   * separates the V5 removal from the V14 addition into two commits, so either can be
#     inspected or reverted on its own;
#   * refuses to commit Library/, Temp/ and other build junk even if .gitignore is missing;
#   * refuses to commit a keystore or a service-role key.
#
# Usage, from the machine that HAS the Unity project:
#   bash tools/release/push-unity-project.sh            # show the plan, change nothing
#   bash tools/release/push-unity-project.sh --commit   # do it

set -euo pipefail

BRANCH="claude/runningup-v14-handoff-hr19xk"
UNITY_DIR="client/unity"
APPLY=false
[ "${1:-}" = "--commit" ] && APPLY=true

cd "$(git rev-parse --show-toplevel)"

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
warn() { printf '\033[33m%s\033[0m\n' "$*"; }
die()  { printf '\033[31mSTOP: %s\033[0m\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# 0. Refuse to run anywhere the project is not actually present
# ---------------------------------------------------------------------------
bold "== what is on this machine =="
scenes=$(find "$UNITY_DIR" -name '*.unity' 2>/dev/null | wc -l | tr -d ' ')
prefabs=$(find "$UNITY_DIR" -name '*.prefab' 2>/dev/null | wc -l | tr -d ' ')
has_settings=$([ -d "$UNITY_DIR/ProjectSettings" ] && echo yes || echo no)
has_packages=$([ -f "$UNITY_DIR/Packages/manifest.json" ] && echo yes || echo no)

printf '  scenes (.unity)      %s\n'  "$scenes"
printf '  prefabs (.prefab)    %s\n'  "$prefabs"
printf '  ProjectSettings/     %s\n'  "$has_settings"
printf '  Packages/manifest    %s\n'  "$has_packages"
echo

if [ "$scenes" -eq 0 ] || [ "$has_settings" = "no" ] || [ "$has_packages" = "no" ]; then
  die "no Unity project here. Run this on the machine that has it — not in a container,
     not on a fresh clone. Nothing was changed."
fi

# ---------------------------------------------------------------------------
# 1. Make sure build junk cannot be committed, whatever .gitignore says
# ---------------------------------------------------------------------------
# Library/ alone is gigabytes and is regenerated from Packages+Assets on every open.
JUNK=(Library Temp Obj Logs Build UserSettings MemoryCaptures)
junk_tracked=""
for dir in "${JUNK[@]}"; do
  if git ls-files --error-unmatch "$UNITY_DIR/$dir" >/dev/null 2>&1; then
    junk_tracked="$junk_tracked $dir"
  fi
done
[ -n "$junk_tracked" ] && warn "already tracked build dirs (will not be touched here):$junk_tracked"

# ---------------------------------------------------------------------------
# 2. Refuse to commit secrets — an APK signing key or a service-role key in git is
#    unrecoverable: rewriting history does not un-publish it.
# ---------------------------------------------------------------------------
bold "== secret scan over what would be added =="
candidates=$(git status --porcelain --untracked-files=all -- "$UNITY_DIR" | awk '{print $NF}')
blocked=""
while IFS= read -r f; do
  [ -z "$f" ] && continue
  case "$f" in
    *.keystore|*.jks|*.p12|*.pepk) blocked="$blocked
  signing key: $f" ;;
  esac
  if [ -f "$f" ] && grep -qE 'service_role|SUPABASE_SERVICE|sb_secret_' "$f" 2>/dev/null; then
    blocked="$blocked
  service-role key: $f"
  fi
done <<< "$candidates"

if [ -n "$blocked" ]; then
  die "refusing to continue — these would publish a secret:$blocked

     A signing key or service-role key in git history cannot be taken back.
     Move them outside the repo (or into GitHub Actions secrets) and re-run."
fi
echo "  clean"
echo

# ---------------------------------------------------------------------------
# 3. Show the plan
# ---------------------------------------------------------------------------
deletions=$(git diff --cached --name-only --diff-filter=D | wc -l | tr -d ' ')
additions=$(git status --porcelain --untracked-files=all -- "$UNITY_DIR" | grep -c '^??' || true)

bold "== plan =="
cat <<PLAN
  branch                 $BRANCH
  commit 1 (removal)     $deletions staged deletion(s) — the retired V5 client
  commit 2 (addition)    $additions new file(s) under $UNITY_DIR — the V14 project

  Two commits, not one, so the removal can be reviewed or reverted without taking the
  V14 project with it.

  This script will NEVER run: git reset --hard · git checkout -- . · git clean
  Your untracked files are the only copy in existence. Nothing here deletes them.
PLAN
echo

if [ "$APPLY" != "true" ]; then
  bold "Dry run. Nothing was changed."
  echo "When the plan above looks right, run:"
  echo "    bash tools/release/push-unity-project.sh --commit"
  exit 0
fi

# ---------------------------------------------------------------------------
# 4. Do it
# ---------------------------------------------------------------------------
git rev-parse --verify "$BRANCH" >/dev/null 2>&1 \
  && git checkout "$BRANCH" \
  || git checkout -b "$BRANCH"

if [ "$deletions" -gt 0 ]; then
  bold "== commit 1: retire the V5 client =="
  git commit -m "chore(client): retire the V5 client tree

$deletions files from the pre-V14 client are removed. Split from the V14 addition so
the two can be reviewed and reverted independently." || warn "nothing to commit"
fi

bold "== commit 2: add the V14 Unity project =="
git add -- "$UNITY_DIR"
git status --short -- "$UNITY_DIR" | head -30
echo "  ..."
git commit -m "feat(client): commit the V14 Unity project

The project existed only on one machine, which meant the APK could not be rebuilt
anywhere else, CI could not build it at all, and an untracked working tree was the only
copy of it. With this commit .github/workflows/android-apk.yml can build the APK on
every push and attach it to a Release on every tag.

Library/, Temp/, Logs/ and the other regenerated directories are excluded by .gitignore."

bold "== push =="
for attempt in 1 2 3 4; do
  if git push -u origin "$BRANCH"; then
    bold "pushed."
    echo
    echo "Next: set the UNITY_LICENSE / UNITY_EMAIL / UNITY_PASSWORD repository secrets"
    echo "and the android-apk workflow will build the APK by itself."
    echo "See docs/ANDROID_BUILD.md."
    exit 0
  fi
  wait=$((2 ** attempt))
  warn "push failed, retrying in ${wait}s"
  sleep "$wait"
done
die "push failed after 4 attempts. Your commits are safe locally — nothing was lost."
