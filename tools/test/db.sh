#!/usr/bin/env bash
# Applies every migration to a throwaway database, seeds it, and runs the pgTAP suite.
# Requires: postgresql-client, a reachable server, and the pgtap extension available.
set -euo pipefail

PGHOST="${PGHOST:-/tmp}"
PGPORT="${PGPORT:-55432}"
PGUSER="${PGUSER:-postgres}"
DB="${RUNNINGUP_TEST_DB:-runningup_test}"
export PGHOST PGPORT PGUSER

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

echo "==> recreating ${DB}"
psql -q -c "drop database if exists ${DB}" -c "create database ${DB}" postgres

echo "==> applying migrations"
for migration in backend/supabase/migrations/*.sql; do
  echo "    ${migration}"
  psql -q -v ON_ERROR_STOP=1 -d "${DB}" -f "${migration}"
done

echo "==> seeding launch content"
psql -q -v ON_ERROR_STOP=1 -d "${DB}" -f backend/supabase/seed.sql > /dev/null

echo "==> enabling pgtap"
psql -q -d "${DB}" -c "create extension if not exists pgtap"

echo "==> regenerating the SQL conformance suite from the shared fixture"
node tools/conformance/emit-sql-conformance.mjs > /dev/null

echo "==> running pgTAP suite"
pg_prove -d "${DB}" backend/supabase/tests/pgtap/*.sql
