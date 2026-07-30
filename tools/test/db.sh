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

if rg --quiet '\bnot ok [0-9]+' "$result_file"; then
  echo "pgTAP reported a failed assertion." >&2
  exit 1
fi

test_count="$(rg --only-matching '\bok [0-9]+' "$result_file" | wc -l | tr -d ' ')"
echo "Supabase pgTAP PASS: $test_count assertions"
