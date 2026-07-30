#!/usr/bin/env bash
# V11 Unity EditMode와 PlayMode 회귀 테스트를 배치 실행한다.
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=../lib/find-unity.sh
source "$repo_dir/tools/lib/find-unity.sh"

pinned_version="$(read_pinned_unity_version "$repo_dir")"
unity_bin="$(find_unity_editor "$pinned_version")"
echo "Unity $pinned_version: $unity_bin"

result_dir="$repo_dir/artifacts/test-results"
log_dir="$repo_dir/artifacts/logs"

mkdir -p "$result_dir" "$log_dir"
for platform in EditMode PlayMode; do
  lower="$(printf '%s' "$platform" | tr '[:upper:]' '[:lower:]')"
  result_file="$result_dir/unity-$lower.xml"
  log_file="$log_dir/unity-$lower.log"
  rm -f "$result_file"

  # Unity는 테스트가 실패해도 0이 아닌 코드로 끝나므로, 결과 파일을 직접 읽는다.
  set +e
  "$unity_bin" \
    -batchmode \
    -nographics \
    -projectPath "$repo_dir/client/unity" \
    -runTests \
    -testPlatform "$platform" \
    -testResults "$result_file" \
    -logFile "$log_file"
  unity_status=$?
  set -e

  if [[ ! -f "$result_file" ]]; then
    echo "Unity produced no $platform results (exit $unity_status)." >&2
    echo "The last 40 log lines follow:" >&2
    tail -n 40 "$log_file" >&2 || true
    exit 1
  fi

  if ! grep --quiet --extended-regexp \
      '<test-run .*result="Passed".*failed="0"' "$result_file"; then
    echo "Unity $platform tests did not pass." >&2
    grep --extended-regexp '<test-case .*result="Failed"' "$result_file" >&2 || true
    exit 1
  fi

  passed="$(grep --only-matching --extended-regexp 'passed="[0-9]+"' "$result_file" \
    | head -n 1 | tr -cd '0-9')"
  echo "Unity $platform PASS: ${passed:-unknown} tests"
done
