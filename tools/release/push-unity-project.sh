#!/usr/bin/env bash
# Copies the V14 Unity project into a clean clone and pushes it.
#
# WHY IT WORKS THIS WAY
# ---------------------
# The machine that holds the Unity project has it in a working tree that cannot be safely
# committed from: 281 staged deletions, of which only 148 are the retired V5 client — the
# other 133 are CI workflows, Supabase migrations, tests and docs that V14 needs. It also
# sits on a different branch (`agent/runningup-v14-complete`), so a `git pull` there merges
# into the wrong lineage. An earlier version of this script tried to sort that tree out in
# place; unstaging 133 files one at a time is not a procedure anyone should follow.
#
# None of that work is necessary, because the V14 branch has no V5 tree to delete. It
# carries eight client files and nothing else. So there is nothing to remove — only
# something to add.
#
# This script therefore never touches the messy tree. It runs inside a FRESH CLONE of the
# V14 branch, reads the Unity project out of the old folder, and commits it here. The
# source directory is opened read-only: nothing is moved, renamed, deleted or staged there.
#
# USAGE
#   # 1. fresh clone, somewhere new
#   git clone -b claude/runningup-v14-handoff-hr19xk <repo-url> runningup-v14
#   cd runningup-v14
#
#   # 2. point at the Unity project in the old folder
#   bash tools/release/push-unity-project.sh --from ~/old/runningup/client/unity
#   bash tools/release/push-unity-project.sh --from ~/old/runningup/client/unity --commit

set -euo pipefail

BRANCH="claude/runningup-v14-handoff-hr19xk"
DEST="client/unity"
SRC=""
APPLY=false

while [ $# -gt 0 ]; do
  case "$1" in
    --from)   SRC="${2:-}"; shift 2 ;;
    --commit) APPLY=true; shift ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
warn() { printf '\033[33m%s\033[0m\n' "$*"; }
die()  { printf '\033[31m\nSTOP: %s\033[0m\n' "$*" >&2; exit 1; }

cd "$(git rev-parse --show-toplevel)"

# ---------------------------------------------------------------------------
# 0. This must be a clean clone of the V14 branch, not the working folder
# ---------------------------------------------------------------------------
bold "== where am I =="
current=$(git rev-parse --abbrev-ref HEAD)
dirty=$(git status --porcelain | wc -l | tr -d ' ')
printf '  branch        %s\n' "$current"
printf '  uncommitted   %s file(s)\n' "$dirty"
echo

if [ "$current" != "$BRANCH" ]; then
  die "this clone is on '$current', not '$BRANCH'.

     Do NOT git pull here — that merges V14 into whatever branch you are on.
     Make a fresh clone instead and run this from inside it:

         git clone -b $BRANCH <repo-url> runningup-v14
         cd runningup-v14

     Nothing was changed."
fi

if [ "$dirty" -ne 0 ]; then
  git status --short | head -20 | sed 's/^/  /'
  die "this clone has uncommitted changes, so it is not the clean workspace this script
     needs. Use a fresh clone. Nothing was changed."
fi

# ---------------------------------------------------------------------------
# 1. The source has to actually be a Unity project
# ---------------------------------------------------------------------------
# `--from` needs a real path, and the documented example uses a placeholder. Pasting the
# example verbatim is the single most likely way to get this wrong, so rather than just
# reporting that the path is missing, go and find the project.
suggest_paths() {
  local found
  # Depth 10, not 6. The real project turned out to live at
  #   ~/Documents/Codex/<date>/<goal>/runningup/client/unity
  # which is eight levels down, so a 6-level search reported "no Unity project on this
  # machine" about a machine that had one. A search that is too shallow does not fail —
  # it lies.
  #
  # Excluded: Library/ (Unity keeps one inside every project, and macOS has ~/Library),
  # and unity-editors/ — an installed Editor ships hundreds of sample scenes, and
  # offering one of those as "your project" would be worse than offering nothing.
  found=$(find "$HOME" -maxdepth 10 -type d -name ProjectSettings 2>/dev/null \
          | grep -v "/Library/" \
          | grep -v "/unity-editors/" \
          | grep -v "/Unity.app/" \
          | head -10 || true)
  if [ -z "$found" ]; then
    printf '     No Unity project found under %s (searched 10 levels deep).\n' "$HOME"
    printf '     Point --from at the folder that contains Assets/ and ProjectSettings/.\n'
    return
  fi
  printf '     Unity projects found on this machine — one of these is probably it:\n\n'
  printf '%s\n' "$found" | while IFS= read -r ps; do
    printf '         %s\n' "$(dirname "$ps")"
  done
  printf '\n     Re-run with one of those, e.g.\n\n'
  printf '         bash tools/release/push-unity-project.sh --from '"'"'%s'"'"'\n' \
    "$(dirname "$(printf '%s\n' "$found" | head -1)")"
}

if [ -z "$SRC" ]; then
  printf '\n'
  die "--from is required: the path to the Unity project in your old folder.

$(suggest_paths)"
fi

if [ ! -d "$SRC" ]; then
  case "$SRC" in
    *기존폴더*|*old/runningup*|*'<'*|*'>'*)
      printf '\n'
      die "--from path does not exist: $SRC

     That looks like the placeholder from the documentation rather than a real path.

$(suggest_paths)" ;;
  esac
  printf '\n'
  die "--from path does not exist: $SRC

$(suggest_paths)"
fi

SRC="$(cd "$SRC" && pwd)"          # absolute, so the copy cannot be confused by cwd
[ "$SRC" = "$(pwd)/$DEST" ] && die "--from points at this clone's own $DEST. Point it at the OLD folder."

bold "== source: $SRC =="
scenes=$(find "$SRC" -name '*.unity' -not -path '*/Library/*' 2>/dev/null | wc -l | tr -d ' ')
prefabs=$(find "$SRC" -name '*.prefab' -not -path '*/Library/*' 2>/dev/null | wc -l | tr -d ' ')
has_settings=$([ -d "$SRC/ProjectSettings" ] && echo yes || echo no)
has_packages=$([ -f "$SRC/Packages/manifest.json" ] && echo yes || echo no)
printf '  scenes (.unity)    %s\n' "$scenes"
printf '  prefabs (.prefab)  %s\n' "$prefabs"
printf '  ProjectSettings/   %s\n' "$has_settings"
printf '  Packages/manifest  %s\n' "$has_packages"
echo

if [ "$scenes" -eq 0 ] || [ "$has_settings" = "no" ] || [ "$has_packages" = "no" ]; then
  die "that is not a complete Unity project. --from must point at the folder that
     contains Assets/, ProjectSettings/ and Packages/. Nothing was changed."
fi

# ---------------------------------------------------------------------------
# 2. What would be copied — and what would be left behind
# ---------------------------------------------------------------------------
# Library/ alone is gigabytes and Unity rebuilds it from Assets+Packages on open.
#
# tar rather than rsync: rsync is absent from this container and from a stock Windows
# Git Bash, which is one of the machines this has to run on. tar ships with macOS, Linux
# and Git Bash alike, and `tar -c | tar -x` copies a tree with exclusions and no temp file.
# .utmp is the Android/IL2CPP scratch tree — CMake caches, ninja logs, .o files. It is
# not in Unity's own documented ignore list, so it is easy to miss, and 55 of its files
# reached a commit before it was added here.
EXCLUDES=(Library Temp Obj Logs Build Builds UserSettings MemoryCaptures .utmp .vs .idea)
tar_excludes=()
for e in "${EXCLUDES[@]}"; do tar_excludes+=(--exclude="./$e"); done
tar_excludes+=(--exclude='*.apk' --exclude='*.aab' --exclude='*.keystore'
               --exclude='*.jks' --exclude='*.csproj' --exclude='*.sln'
               --exclude='mono_crash.*.json')

command -v tar >/dev/null || die "tar is not installed. It ships with macOS, Linux and
     Git Bash on Windows. Nothing was changed."

plan_list=$(tar -C "$SRC" "${tar_excludes[@]}" -cf - . 2>/dev/null | tar -tf - | grep -v '/$' || true)
file_count=$(printf '%s\n' "$plan_list" | grep -c . || true)

bold "== plan =="
cat <<PLAN
  copy    $file_count file(s)
  from    $SRC
          ^ READ ONLY. Nothing there is moved, deleted, staged or committed.
  into    $(pwd)/$DEST
  branch  $BRANCH

  skipped: ${EXCLUDES[*]}, *.apk, *.aab, *.keystore, *.jks

  Nothing is deleted. The V14 branch carries no V5 tree, so there is nothing to remove —
  only something to add. Your 281 staged deletions live on the other branch in the other
  folder and are not touched by this script at all.

  This script NEVER runs: git reset --hard · git checkout -- . · git clean
  against your source folder.
PLAN
echo

if [ "$APPLY" != "true" ]; then
  bold "Dry run. Nothing was changed."
  echo "If the plan looks right, re-run with --commit:"
  echo "    bash tools/release/push-unity-project.sh --from '$SRC' --commit"
  exit 0
fi

# ---------------------------------------------------------------------------
# 3. Copy
# ---------------------------------------------------------------------------
bold "== copying =="
mkdir -p "$DEST"
tar -C "$SRC" "${tar_excludes[@]}" -cf - . | tar -C "$DEST" -xf -
copied=$(find "$DEST" -type f | wc -l | tr -d ' ')
echo "  $copied file(s) now in $DEST"

# The plan promised a count. If the copy produced a different one, say so rather than
# letting a partial copy look like a complete one.
if [ "$copied" -lt "$file_count" ]; then
  warn "copied $copied but planned $file_count — the copy is incomplete. Inspect $DEST
     before continuing. Your source folder is untouched."
fi
echo

# ---------------------------------------------------------------------------
# 4. Refuse to publish a secret. Rewriting history does not un-publish a key.
# ---------------------------------------------------------------------------
bold "== secret scan =="
blocked=""
while IFS= read -r f; do
  [ -f "$f" ] || continue
  case "$f" in *.keystore|*.jks|*.p12|*.pepk) blocked="$blocked
  signing key: $f" ;; esac
  if grep -qE 'service_role|SUPABASE_SERVICE_ROLE|sb_secret_' "$f" 2>/dev/null; then
    blocked="$blocked
  service-role key: $f"
  fi
done < <(find "$DEST" -type f)

if [ -n "$blocked" ]; then
  # Undo the copy so this clone is left exactly as it was found. Safe here and only
  # here: this is a fresh clone whose every file is already in a commit.
  git clean -fdq -- "$DEST" || true
  git checkout -- "$DEST" || true
  die "refusing to continue — these would publish a secret:$blocked

     A signing key or service-role key in git history cannot be taken back.
     The copy was undone in THIS CLONE only; your original folder is untouched.
     Move the key out of the project (or into GitHub Actions secrets) and re-run."
fi
echo "  clean"
echo

# ---------------------------------------------------------------------------
# 5. Commit and push
# ---------------------------------------------------------------------------
bold "== commit =="
git add -- "$DEST"
added=$(git diff --cached --name-only -- "$DEST" | wc -l | tr -d ' ')
[ "$added" -gt 0 ] || die "nothing changed after the copy — the project may already be
     committed. Nothing was changed."

git status --short -- "$DEST" | head -20 | sed 's/^/  /'
[ "$added" -gt 20 ] && echo "  ... and $((added - 20)) more"

# The pathspec follows the message: everything after `--` is a pathspec, so
# `git commit -- dir -m msg` silently treats "-m" and the message as two more paths.
git commit -q -m "feat(client): commit the V14 Unity project

The project existed only in one working folder, on a branch of its own, so the APK could
not be rebuilt anywhere else and CI could not build it at all. With this commit
.github/workflows/android-apk.yml builds the APK on every push and attaches it to a
Release on every tag.

Copied from a complete local project into a clean clone; the source folder was opened
read-only. Library/, Temp/, Logs/ and the other regenerated directories are excluded, as
are APKs and signing keys.

$added files." -- "$DEST"

bold "== push =="
for attempt in 1 2 3 4; do
  if git push -u origin "$BRANCH"; then
    echo
    bold "pushed."
    echo "Next: set the repository secrets listed in docs/ANDROID_BUILD.md, and the"
    echo "android-apk workflow will build the APK by itself."
    exit 0
  fi
  wait=$((2 ** attempt))
  warn "push failed, retrying in ${wait}s"
  sleep "$wait"
done
die "push failed after 4 attempts. The commit is safe in this clone — nothing was lost,
     and your original folder was never modified."
