#!/usr/bin/env bash
# V11 Unity EditMode와 PlayMode 회귀 테스트를 배치 실행한다.
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
unity_bin="${RUNNINGUP_UNITY_BIN:-/Users/runner706/Documents/Codex/2026-07-29/goal-runningup-3d-real-run-rpg/work/toolchains/unity-editors/6000.3.20f1/Unity.app/Contents/MacOS/Unity}"
result_dir="$repo_dir/artifacts/test-results"
log_dir="$repo_dir/artifacts/logs"

mkdir -p "$result_dir" "$log_dir"
for platform in EditMode PlayMode; do
  lower="$(printf '%s' "$platform" | tr '[:upper:]' '[:lower:]')"
  "$unity_bin" \
    -batchmode \
    -nographics \
    -projectPath "$repo_dir/client/unity" \
    -runTests \
    -testPlatform "$platform" \
    -testResults "$result_dir/unity-$lower.xml" \
    -logFile "$log_dir/unity-$lower.log"
  rg '<test-run .*result="Passed".*failed="0"' "$result_dir/unity-$lower.xml"
done

