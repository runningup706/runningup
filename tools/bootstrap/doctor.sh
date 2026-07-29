#!/usr/bin/env bash
# Reports the toolchain this machine can and cannot satisfy, using the master prompt's
# status vocabulary. Never prints secrets; never installs anything.
set -uo pipefail

check() {
  local label="$1"; shift
  if "$@" > /dev/null 2>&1; then
    printf '  %-28s PASS  %s\n' "$label" "$("$@" 2>&1 | head -1 | cut -c1-60)"
  else
    printf '  %-28s BLOCKED_TOOLCHAIN\n' "$label"
  fi
}

echo "RunningUp doctor"
echo
echo "Required for the tooling and backend gates:"
check "node"            node --version
check "postgres client" psql --version
check "pg_prove"        pg_prove --version

echo
echo "Required for the Android client (see docs/CURRENT_STATE.md):"
check "java"            java -version
check "gradle"          gradle --version
if [ -n "${ANDROID_SDK_ROOT:-}${ANDROID_HOME:-}" ]; then
  printf '  %-28s PASS\n' "android sdk"
else
  printf '  %-28s BLOCKED_TOOLCHAIN (ANDROID_SDK_ROOT unset)\n' "android sdk"
fi
if command -v unity-editor > /dev/null 2>&1 || [ -d "${UNITY_PATH:-/nonexistent}" ]; then
  printf '  %-28s PASS\n' "unity editor"
else
  printf '  %-28s BLOCKED_TOOLCHAIN (no Unity Editor)\n' "unity editor"
fi
