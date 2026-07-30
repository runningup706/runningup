#!/usr/bin/env bash
# 생성된 V11 smoke APK의 패키지·권한·서명·정렬·ARM64 네이티브 파일을 독립 검증한다.
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
unity_bin="${RUNNINGUP_UNITY_BIN:-/Users/runner706/Documents/Codex/2026-07-29/goal-runningup-3d-real-run-rpg/work/toolchains/unity-editors/6000.3.20f1/Unity.app/Contents/MacOS/Unity}"
unity_contents="$(cd "$(dirname "$unity_bin")/.." && pwd)"
sdk_dir="$unity_contents/PlaybackEngines/AndroidPlayer/SDK"
java_home="$unity_contents/PlaybackEngines/AndroidPlayer/OpenJDK"
build_tools="$sdk_dir/build-tools/36.0.0"
apk_path="${1:-$repo_dir/artifacts/builds/RunningUp-V11-SMOKE.apk}"
evidence_path="$repo_dir/artifacts/validation/android-smoke-verification.txt"

mkdir -p "$repo_dir/artifacts/validation"
exec > >(tee "$evidence_path") 2>&1

test -s "$apk_path"
test -x "$build_tools/aapt2"
test -x "$build_tools/apksigner"
test -x "$build_tools/zipalign"
test -x "$java_home/bin/java"

apk_bytes="$(stat -f '%z' "$apk_path")"
apk_sha256="$(shasum -a 256 "$apk_path" | awk '{print $1}')"
badging="$("$build_tools/aapt2" dump badging "$apk_path")"
permissions="$("$build_tools/aapt2" dump permissions "$apk_path")"
archive_list="$(unzip -l "$apk_path")"

grep --quiet --extended-regexp "package: name='kr\\.robom\\.runningup' versionCode='110000' versionName='11\\.0\\.0'" <<<"$badging"
grep --quiet --extended-regexp "targetSdkVersion:'36'" <<<"$badging"
grep --quiet --extended-regexp "launchable-activity: name='com\\.unity3d\\.player\\.UnityPlayerGameActivity'" <<<"$badging"
grep --quiet --extended-regexp "native-code: 'arm64-v8a'" <<<"$badging"
grep --quiet --extended-regexp "uses-feature: name='android\\.hardware\\.screen\\.portrait'" <<<"$badging"

for permission in \
  android.permission.ACCESS_FINE_LOCATION \
  android.permission.ACCESS_COARSE_LOCATION \
  android.permission.FOREGROUND_SERVICE \
  android.permission.FOREGROUND_SERVICE_LOCATION \
  android.permission.POST_NOTIFICATIONS \
  android.permission.health.READ_EXERCISE \
  android.permission.health.READ_DISTANCE
do
  grep --quiet --extended-regexp "uses-permission: name='$permission'" <<<"$permissions"
done

for entry in \
  classes.dex \
  lib/arm64-v8a/libil2cpp.so \
  lib/arm64-v8a/libmain.so \
  lib/arm64-v8a/libunity.so
do
  grep --quiet --extended-regexp "[[:space:]]$entry$" <<<"$archive_list"
done

signing="$(JAVA_HOME="$java_home" PATH="$java_home/bin:$PATH" \
  "$build_tools/apksigner" verify --verbose "$apk_path")"
alignment="$("$build_tools/zipalign" -c -P 16 -v 4 "$apk_path")"
grep --quiet --extended-regexp 'Verified using v2 scheme \(APK Signature Scheme v2\): true' <<<"$signing"
grep --quiet --extended-regexp 'Verification successful' <<<"$alignment"
node "$repo_dir/tools/build/verify-apk-zip-layout.mjs" "$apk_path"

printf 'RUNNINGUP_V11_ANDROID_SMOKE_VERIFY_PASS bytes=%s sha256=%s\n' \
  "$apk_bytes" \
  "$apk_sha256"
