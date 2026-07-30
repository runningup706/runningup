#!/usr/bin/env bash
# Unity Editor 없이 업로드 판정 규칙을 실제로 실행해 검증한다.
#
# V11UploadPolicy.cs는 UnityEngine을 참조하지 않으므로 평범한 .NET SDK가
# 그대로 컴파일한다. Editor가 없는 CI에서도 401/403 refresh, 409/duplicate,
# 재시도·포기·jitter 규칙이 회귀 검증된다. test:unity를 대체하지는 않는다.
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
project_dir="$repo_dir/client/dotnet/RunningUp.V11.Domain.Tests"
result_dir="$repo_dir/artifacts/test-results"
result_file="$result_dir/domain-upload-policy.txt"

if ! command -v dotnet >/dev/null 2>&1; then
  echo "BLOCKED_TOOLCHAIN: dotnet SDK 8 is required for npm run test:domain." >&2
  exit 2
fi

mkdir -p "$result_dir"
dotnet run --project "$project_dir" --nologo | tee "$result_file"

if grep --quiet '^not ok ' "$result_file"; then
  echo "Upload policy reported a failed assertion." >&2
  exit 1
fi

assertion_count="$(grep --count '^ok ' "$result_file" || true)"
echo "V11 upload policy PASS: $assertion_count assertions"
