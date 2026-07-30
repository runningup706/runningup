#!/usr/bin/env bash
# Unity 6.3으로 V11 개발용 smoke APK를 생성한다.
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
unity_bin="${RUNNINGUP_UNITY_BIN:-/Users/runner706/Documents/Codex/2026-07-29/goal-runningup-3d-real-run-rpg/work/toolchains/unity-editors/6000.3.20f1/Unity.app/Contents/MacOS/Unity}"
log_file="$repo_dir/artifacts/logs/android-smoke.log"

mkdir -p "$repo_dir/artifacts/logs" "$repo_dir/artifacts/builds"
"$unity_bin" \
  -batchmode \
  -nographics \
  -quit \
  -projectPath "$repo_dir/client/unity" \
  -executeMethod RunningUp.Editor.V11AndroidBuilder.BuildSmoke \
  -logFile "$log_file"
rg 'RUNNINGUP_V11_ANDROID_BUILD_PASS' "$log_file"
test -s "$repo_dir/artifacts/builds/RunningUp-V11-SMOKE.apk"
"$repo_dir/tools/build/verify-android-smoke.sh"
