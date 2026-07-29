#!/usr/bin/env bash
# The full local gate. Mirrors .github/workflows exactly so a green run here means a
# green run in CI. Any failure stops the script with a non-zero exit code.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

echo "=============================================================="
echo " 1/5  direction-lock static scan"
echo "=============================================================="
node tools/direction-lock/scan.mjs

echo
echo "=============================================================="
echo " 2/5  content factory is reproducible"
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
echo " 3/5  launch content validation"
echo "=============================================================="
node tools/content-validator/validate.mjs

echo
echo "=============================================================="
echo " 4/5  domain engine unit tests"
echo "=============================================================="
node --test "tools/tests/*.test.mjs"

echo
echo "=============================================================="
echo " 5/5  database migrations, seed and pgTAP"
echo "=============================================================="
if command -v pg_prove > /dev/null && pg_isready -q 2>/dev/null; then
  bash tools/test/db.sh
else
  echo "SKIPPED: no reachable PostgreSQL server or pg_prove not installed."
  echo "         Status: BLOCKED_TOOLCHAIN for the database suite on this machine."
  exit 2
fi

echo
echo "all gates passed"
