#!/usr/bin/env bash
# The full local gate. Mirrors .github/workflows exactly so a green run here means a
# green run in CI. Any failure stops the script with a non-zero exit code.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

echo "=============================================================="
echo " 1/6  direction-lock static scan"
echo "=============================================================="
node tools/direction-lock/scan.mjs

echo
echo "=============================================================="
echo " 2/6  content factory is reproducible"
echo "=============================================================="
node tools/content-factory/build.mjs > /dev/null
node tools/content-factory/emit-seed.mjs > /dev/null
if ! git diff --quiet -- content backend/supabase/seed.sql; then
  echo "FAIL: generated content differs from what is committed."
  echo "      Run 'npm run content:build && npm run content:seed' and commit the result."
  git diff --stat -- content backend/supabase/seed.sql
  exit 1
fi
echo "generated content matches the committed tree"

echo
echo "=============================================================="
echo " 3/6  launch content validation"
echo "=============================================================="
node tools/content-validator/validate.mjs

echo
echo "=============================================================="
echo " 4/6  domain engine unit tests"
echo "=============================================================="
node --test "tools/tests/*.test.mjs"

echo
echo "--- run fixtures and anti-cheat simulation ---"
node tools/run-fixture-generator/generate.mjs > /dev/null
if ! git diff --quiet -- content/fixtures; then
  echo "FAIL: generated run fixtures differ from the committed tree."
  exit 1
fi
node tools/anti-cheat-simulator/simulate.mjs

echo
echo "=============================================================="
echo " 5/6  database migrations, seed and pgTAP"
echo "=============================================================="
if command -v pg_prove > /dev/null && pg_isready -q 2>/dev/null; then
  bash tools/test/db.sh
else
  echo "SKIPPED: no reachable PostgreSQL server or pg_prove not installed."
  echo "         Status: BLOCKED_TOOLCHAIN for the database suite on this machine."
  exit 2
fi

echo
echo "=============================================================="
echo " 6/6  cross-implementation conformance (JS engine vs C# client)"
echo "=============================================================="
node tools/conformance/export-fixtures.mjs > /dev/null
node tools/conformance/emit-sql-conformance.mjs > /dev/null
if ! git diff --quiet -- content/conformance backend/supabase/tests/pgtap/07_apex_conformance.sql; then
  echo "FAIL: the conformance fixture or its generated SQL suite is stale."
  echo "      Run tools/conformance/export-fixtures.mjs and emit-sql-conformance.mjs, then commit."
  exit 1
fi
if command -v dotnet > /dev/null; then
  dotnet test client/dotnet/RunningUp.Domain.Tests/RunningUp.Domain.Tests.csproj --nologo -v q
else
  echo "SKIPPED: no .NET SDK on this machine."
  echo "         Status: BLOCKED_TOOLCHAIN for the Unity domain layer suite."
  exit 2
fi

echo
echo "all gates passed"
