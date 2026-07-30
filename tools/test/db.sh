#!/usr/bin/env bash
# V11 전용 임시 데이터베이스에 migration과 pgTAP 회귀 테스트를 실행한다.
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
db_name="runningup_v11_test"
db_host="${RUNNINGUP_PGHOST:-/tmp}"
db_port="${RUNNINGUP_PGPORT:-55432}"
db_user="${RUNNINGUP_PGUSER:-postgres}"
result_dir="$repo_dir/artifacts/test-results"
result_file="$result_dir/supabase-pgtap.txt"

if [[ "$db_name" != "runningup_v11_test" ]]; then
  echo "Refusing unexpected database target: $db_name" >&2
  exit 2
fi

mkdir -p "$result_dir"
dropdb --if-exists --host "$db_host" --port "$db_port" --username "$db_user" "$db_name"
createdb --host "$db_host" --port "$db_port" --username "$db_user" "$db_name"

psql_args=(
  --no-psqlrc
  --set ON_ERROR_STOP=1
  --host "$db_host"
  --port "$db_port"
  --username "$db_user"
  --dbname "$db_name"
)

psql "${psql_args[@]}" --file "$repo_dir/backend/supabase/tests/bootstrap_local.sql"
for migration in "$repo_dir"/backend/supabase/migrations/*.sql; do
  psql "${psql_args[@]}" --file "$migration"
done
psql "${psql_args[@]}" --command "create extension if not exists pgtap;"

: > "$result_file"
for test_file in "$repo_dir"/backend/supabase/tests/pgtap/*.sql; do
  psql "${psql_args[@]}" --file "$test_file" | tee -a "$result_file"
done

# grep은 POSIX라 어디에나 있다. 이전에는 ripgrep을 썼는데, ripgrep이 없는
# 머신에서는 `if rg ...`가 exit 127로 거짓이 되어 실패한 assertion이 있어도
# 이 검사를 조용히 통과했다. 검증 스크립트가 통과를 지어내면 안 된다.
if grep --quiet --extended-regexp 'not ok [0-9]+' "$result_file"; then
  echo "pgTAP reported a failed assertion." >&2
  grep --extended-regexp 'not ok [0-9]+' "$result_file" >&2
  exit 1
fi

test_count="$(grep --only-matching --extended-regexp \
  '(^|[^[:alnum:]_])ok [0-9]+' "$result_file" | wc -l | tr -d ' ')"

# 결과 파일이 비었는데 "PASS: 0 assertions"를 출력하면 아무것도 검증하지 않고
# 초록으로 보인다. assertion이 하나도 없으면 실패로 취급한다.
if [[ "$test_count" -eq 0 ]]; then
  echo "pgTAP produced no assertions. The suite did not run." >&2
  exit 1
fi

echo "Supabase pgTAP PASS: $test_count assertions"
