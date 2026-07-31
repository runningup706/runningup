# Codex 작업 지시문 — Unity 라이선스 · APK 빌드 · 릴리즈

이 문서를 **그대로 복사해 Codex에 붙여 넣으면 된다.**

---

## 0. 너의 임무

세 가지다. 순서대로 하고, 막히면 그 지점을 정확히 보고하라.

1. **Unity 라이선스 `.ulf` 만들기** — CI가 APK를 자동 빌드하려면 이게 필요하다
2. **APK 빌드하고 GitHub Release에 올리기** — 사용자가 지금 당장 받을 수 있게
3. **실기기 검증** — 폰이 연결돼 있을 때만

사용자는 터미널 작업을 더 이상 하고 싶어하지 않는다. **네가 할 수 있는 건 네가 해라.**
사용자에게 넘겨야 하는 것은 딱 하나, 웹 브라우저 로그인이 필요한 단계뿐이다.

---

## 1. 먼저 알아야 할 것 — 저장소가 네 로컬보다 최신이다

| 항목 | 값 |
|---|---|
| 저장소 | `runningup706/runningup` |
| 브랜치 | `claude/runningup-v14-handoff-hr19xk` |
| 최신 커밋 | `e9526c2` 또는 그 이후 |
| Unity 프로젝트 | **이미 저장소에 올라가 있다** (Assets 289 · ProjectSettings 22 · Packages 2) |
| Unity 에디터 | `~/Documents/Codex/2026-07-29/goal-runningup-3d-real-run-rpg/work/toolchains/unity-editors/6000.3.20f1/Unity.app` |

### 🚫 절대 하지 마라 — 로컬 `client/unity` 를 저장소로 다시 복사

네 로컬 폴더의 `V14ScreenFlowController.cs` 는 **저장소 버전보다 오래됐다.** 저장소 쪽에서
버그 2개가 수정됐다:

- 내비게이션 버튼 3개(Matchmaking · MonthlyApex · Crew)가 `Show()` 를 직접 호출해
  백스택에 안 쌓였다 → 시스템 뒤로가기가 그 화면들을 건너뛴다. `GoTo()` 로 바뀌었다.
- `Show()` 가 매 화면 전환마다 `PlayerPrefs.SetString(ScreenKey, ...)` + `Save()` 를 했다.
  Awake 가 그 키를 지우므로 읽는 데도 없는 값이었고, 콜드 스타트 버그가 돌아올 통로였다.
  제거됐고, `persist` 파라미터도 함께 사라져 호출부 13곳이 정리됐다.

또 `.utmp/`(안드로이드 빌드 캐시) 55개 파일이 잘못 커밋됐다가 제거됐다. `.gitignore` 와
복사 스크립트 양쪽에 제외 규칙이 들어갔다.

**따라서: `git pull` 로 받아서 쓰고, 네 로컬을 위에 덮어쓰지 마라.**
`tools/release/push-unity-project.sh` 도 다시 돌릴 필요 없다.

```bash
cd ~/runningup-v14 2>/dev/null || {
  git clone -b claude/runningup-v14-handoff-hr19xk \
      https://github.com/runningup706/runningup.git ~/runningup-v14
  cd ~/runningup-v14
}
git pull
```

---

## 2. 작업 A — Unity 라이선스 `.ulf` 만들기

### 왜 필요한가

이 맥은 **Unity 6(6000.3.20f1)** 이라 라이선스가
`~/Library/Unity/licenses/UnityEntitlementLicense.xml` 형식이다. 예전 `.ulf` 파일은
존재하지 않는다. 그런데 `game-ci/unity-builder` 는 `.ulf` 를 요구한다. 그래서 만들어야 한다.

### A-1. 활성화 파일 생성 (네가 한다)

```bash
cd ~
UNITY="/Users/runner706/Documents/Codex/2026-07-29/goal-runningup-3d-real-run-rpg/work/toolchains/unity-editors/6000.3.20f1/Unity.app/Contents/MacOS/Unity"
"$UNITY" -batchmode -nographics -quit -logFile /dev/stdout -createManualActivationFile
ls -la ~/*.alf
```

`.alf` 파일이 생기면 성공이다. **파일 경로와 크기를 보고하라.**

안 생기면 로그에서 실패 이유를 찾아 그대로 보고하라. 추측해서 넘어가지 마라.

### A-2. 웹 교환 (사용자에게 넘겨라 — 네가 할 수 없다)

`https://license.unity3d.com/manual` 은 사용자의 Unity 계정 로그인이 필요하다.
**계정 정보를 달라고 요구하지 마라.** 대신 아래를 그대로 사용자에게 안내하라:

> 1. `~/파일이름.alf` 를 Finder 에서 확인 (`open ~` 로 홈 폴더가 열린다)
> 2. https://license.unity3d.com/manual 접속 → Unity 계정 로그인
> 3. `Browse` → 그 `.alf` 파일 선택 → `Next`
> 4. **Unity Personal Edition** 선택 → "I don't use Unity in a professional capacity" 선택
> 5. `Next` → `Download license file` → `Unity_v6000.x.ulf` 다운로드됨
> 6. 다운로드했다고 Codex에게 알려주기

### A-3. 시크릿 등록 안내 (사용자에게)

`.ulf` 가 준비되면 클립보드 복사까지 네가 해주고, 붙여넣기만 시켜라.

```bash
cat ~/Downloads/Unity_v6000*.ulf | pbcopy
```

그리고 https://github.com/runningup706/runningup/settings/secrets/actions 에서
`New repository secret` 로 아래 5개를 등록하도록 안내하라.

| Name | Secret |
|---|---|
| `UNITY_LICENSE` | 방금 클립보드에 복사된 `.ulf` 내용 |
| `UNITY_EMAIL` | Unity 계정 이메일 |
| `UNITY_PASSWORD` | Unity 계정 비밀번호 |
| `SUPABASE_URL` | Supabase → Settings → API 의 `Project URL` |
| `SUPABASE_ANON_KEY` | 같은 화면의 **`anon` `public`** 키 |

> ⚠️ `service_role` 키는 절대 넣지 마라. 클라이언트에 들어가면 APK 받은 누구나
> 데이터베이스 전체를 쓸 수 있다. `ANDROID_KEYSTORE_*` 4개는 지금 넣지 않아도 된다
> (없으면 디버그 서명 APK가 나오고, 폰 설치·테스트에는 문제없다).

---

## 3. 작업 B — 지금 당장 받을 수 있는 APK

CI 설정을 기다리지 말고, **로컬에서 빌드해서 Release 에 올려라.** 사용자는 지금 APK가 필요하다.

### B-1. Supabase 설정 확인 — 여기서 판단이 필요하다

이전 빌드가 릴리즈되지 못한 이유는 APK 가 **로컬 개발용 Supabase** 를 가리키고 있었기
때문이다. 배포해도 만든 사람 PC 가 켜져 있을 때만 동작한다.

먼저 현재 클라이언트가 무엇을 보고 있는지 확인하고 보고하라. 그 다음:

- **운영 Supabase URL/키를 사용자에게서 받았다면** → 그것으로 빌드하고 릴리즈하라.
- **못 받았다면** → 빌드는 하되 **릴리즈하지 마라.** 아티팩트로만 남기고,
  "운영 Supabase 설정이 없어 릴리즈 보류" 라고 보고하라.

로컬 DB 를 가리키는 APK 를 공개 Release 에 올리는 것은 금지다.

### B-2. 빌드 전 게이트 4종

하나라도 실패하면 빌드하지 마라.

```bash
node tools/direction-lock/scan.mjs          # No direction-lock violations
node tools/content-validator/validate.mjs   # All content gates passed
node --test "tests/*.test.mjs"              # 191 pass / 0 fail
node tools/release/emit-client-ladder.mjs --check
```

마지막 검사는 실제로 병합 사고를 잡아낸 적이 있다.
`still stores the ladder as MonthlyCheckpointsKm` 가 나오면 클라이언트가 옛날 52개
km 사다리를 들고 있다는 뜻이니 멈추고 보고하라.

### B-3-0. Android SDK 탐지가 멈추면 (실제로 발생한 문제)

Unity 가 `/opt/homebrew/bin/sdkmanager --list` 에서 5분 넘게 멈추는 사례가 보고됐다.
Unity 는 자기 번들 SDK 를 쓰도록 설정해도 **PATH 에 있는 sdkmanager 를 먼저 탐지한다.**
homebrew 쪽 `sdkmanager` 는 stdin 을 기다리며 응답하지 않는다.

빌드 전에 PATH 에서 homebrew 를 빼고 Unity 번들 SDK/JDK 를 명시하라:

```bash
UNITY_APP="/Users/runner706/Documents/Codex/2026-07-29/goal-runningup-3d-real-run-rpg/work/toolchains/unity-editors/6000.3.20f1/Unity.app"
PLAYBACK="$UNITY_APP/Contents/PlaybackEngines/AndroidPlayer"

# 번들 SDK/NDK/JDK 가 실제로 있는지부터 확인하고 보고하라
ls -d "$PLAYBACK/SDK" "$PLAYBACK/NDK" "$PLAYBACK/OpenJDK" 2>&1

export PATH=$(echo "$PATH" | tr ':' '\n' | grep -v '/opt/homebrew/bin' | paste -sd: -)
export ANDROID_HOME="$PLAYBACK/SDK"
export ANDROID_SDK_ROOT="$PLAYBACK/SDK"
export ANDROID_NDK_HOME="$PLAYBACK/NDK"
export JAVA_HOME="$PLAYBACK/OpenJDK"
```

번들 SDK 가 없으면 그 사실을 보고하고 로컬 빌드는 `BLOCKED_TOOLCHAIN` 으로 남겨라.
**로컬 빌드는 부가 목표다.** CI 러너에는 이 문제가 없으므로, 막히면 무리하지 말고
작업 A(라이선스)에 집중하라 — 그쪽이 APK 를 얻는 확실한 경로다.

타임아웃을 걸어 다시 5분씩 잡아먹지 않게 하라:

```bash
timeout 900 "$UNITY_APP/Contents/MacOS/Unity" -batchmode -nographics -quit ... || \
  echo "BLOCKED_TOOLCHAIN: Unity 빌드가 900초 안에 끝나지 않음"
```

### B-3. 빌드

```bash
"$UNITY" -batchmode -nographics -quit \
  -projectPath ~/runningup-v14/client/unity \
  -buildTarget Android \
  -logFile ~/unity-build.log \
  -executeMethod <프로젝트의 빌드 진입점>
```

빌드 진입점은 프로젝트 안에서 찾아라 (`BuildScript`, `AndroidBuilder` 등). 없으면
Unity 에디터의 기본 빌드 경로를 쓰거나, 프로젝트에 이미 있는 빌드 스크립트를 사용하라.

**종료 코드만 보고 성공이라고 하지 마라.** 로그에서 `Build Finished, Result: Success`
를 확인하라. 이전 세션에서 SIGTERM(143) 을 성공으로 오인한 적이 있다.

APK 가 실제로 나왔는지도 확인하라:

```bash
find ~/runningup-v14 -name "*.apk" -newermt "-1 hour"
sha256sum <APK 경로>
```

### B-4. 전투 흔적 검사 (DL-6)

소스 스캐너는 컴파일된 APK 안을 볼 수 없다. 바이너리를 직접 뒤져라.

```bash
unzip -o -q <APK> -d /tmp/apk-scan
for t in world_bosses enemy_families tactical_relics character_skills battle_node boss_break; do
  grep -rqa "$t" /tmp/apk-scan && echo "DL-6 위반: $t"
done
```

하나라도 나오면 릴리즈하지 말고 보고하라.

### B-5. 릴리즈

**B-1 에서 운영 Supabase 설정을 확인했고, B-2·B-4 가 통과했을 때만** 실행하라.

```bash
TAG="v14.0.1"
gh release create "$TAG" \
  --target claude/runningup-v14-handoff-hr19xk \
  --title "RunningUp V14 — 시스템 뒤로가기 · 콜드 스타트 수정" \
  --prerelease \
  --notes-file release-notes.md \
  "<APK 경로>"
```

`release-notes.md` 에 반드시 넣을 것:

- APK 의 SHA-256, 파일 크기, 빌드한 커밋 해시
- **어떤 Supabase 를 가리키는지** (운영 / 스테이징)
- 서명 방식 (release-signed / debug-signed)
- 4종 게이트 결과
- DL-6 바이너리 검사 결과
- **실기기 검증 항목은 실제로 폰에서 돌린 것만 통과로 적어라.** 안 돌렸으면 `NOT_RUN`.

---

## 4. 작업 C — 실기기 검증 (폰이 연결됐을 때만)

**`adb` 가 없다고 먼저 포기하지 마라.** Unity 번들 Android SDK 안에 들어 있다:

```bash
PLAYBACK="$UNITY_APP/Contents/PlaybackEngines/AndroidPlayer"
export PATH="$PLAYBACK/SDK/platform-tools:$PATH"
adb version
```

이래도 없으면 그때 `BLOCKED_DEVICE` 다. homebrew 로 새로 설치하지 마라 — 이 맥의
homebrew Android 도구가 바로 빌드를 멈추게 한 원인이다.

`adb devices -l` 로 기기가 안 보이면 이 절 전체를 `BLOCKED_DEVICE` 로 보고하고 넘어가라.
**에뮬레이터 수치로 대체하지 마라** (마스터 프롬프트 # 22.9 금지 사항).

```bash
adb install -r <APK>
adb shell pm clear kr.robom.runningup
adb logcat -c
adb shell am start -W -n kr.robom.runningup/com.unity3d.player.UnityPlayerGameActivity
adb exec-out screencap -p > home-cold-launch.png
adb logcat -d -v threadtime > cold-launch-logcat.txt
rg -n "FATAL EXCEPTION|ANR in|AndroidRuntime|OutOfMemory|avc: denied" cold-launch-logcat.txt
```

### C-1. 시스템 뒤로가기 — 사용자가 처음 신고한 버그

| # | 조작 | 기대 결과 |
|---|---|---|
| 1 | 홈 → 다른 화면 이동 후 시스템 뒤로가기 | 이전 화면으로 돌아간다 |
| 2 | 3단계 이동 후 뒤로가기 3번 | 홈까지 순서대로 되짚어 온다 |
| 3 | **매치메이킹 · 먼슬리 에이펙스 · 크루** 화면에서 뒤로가기 | **이 3개를 반드시 확인하라.** 저장소에서 방금 고친 부분이다 |
| 4 | 홈에서 뒤로가기 1번 | `Press back again to exit` 표시, 앱 유지 |
| 5 | 홈에서 뒤로가기 2번 연속 | 앱 종료 |
| 6 | 러닝 중 뒤로가기 | 홈으로 가되 **러닝은 계속 돌아간다** |
| 7 | 제스처 뒤로가기(화면 가장자리 스와이프) | 1~6과 동일 |
| 8 | 3버튼 내비의 뒤로가기 | 1~6과 동일 |

제스처 back 은 `adb shell input keyevent` 로 재현되지 않는다. **실제 손가락 조작이 정본이다.**

### C-2. 콜드 스타트

| # | 조작 | 기대 결과 |
|---|---|---|
| 1 | Active Training 화면에서 `adb shell am force-stop kr.robom.runningup` | — |
| 2 | 다시 실행 | **홈에서 시작** (죽은 화면으로 안 열림) |
| 3 | 여러 화면에서 반복 | 항상 홈 |

### C-3. 마라톤 체크포인트

월간 거리가 42km 를 넘겼을 때 **`42.195 KM`** 체크포인트가 보이는지 확인하라.
`42 KM` 으로 반올림돼 보이면 사다리가 잘못된 것이다.

---

## 5. 하지 말아야 할 것

- **로컬 `client/unity` 를 저장소에 덮어쓰기.** 저장소가 최신이다 (1절 참조).
- 디자인 변경. 2.5D Live Journey Home, chibi My Runner, pacer, HUD 배치, 색상, 문구 전부 잠겨 있다.
- 게임 안 뒤로가기 버튼 추가. 사용자가 명시적으로 원치 않았고 테스트가 막는다.
- 전투·몬스터·무기·피해량·공격 스킬 부활. `tools/direction-lock/scan.mjs` 가 빌드를 막는다.
- `git reset --hard`, `git clean`, 광범위 삭제, 사용자 변경 덮어쓰기.
- 로컬 Supabase 를 가리키는 APK 를 공개 Release 에 올리기.
- Unity 계정 비밀번호를 사용자에게 요구하거나 로그·커밋에 남기기.
- 증거 없는 `PASS`. 안 돌린 건 `NOT_RUN`, 막힌 건 `BLOCKED`.

---

## 6. 보고 형식

```
RUNNINGUP V14: COMPLETE | PARTIAL | BLOCKED
```

1. `.alf` 생성 결과 (경로·크기, 실패 시 로그)
2. 사용자에게 넘긴 웹 단계와 그 상태
3. 현재 클라이언트가 가리키는 Supabase (운영/로컬)
4. 빌드 전 게이트 4종 실제 출력
5. Unity 빌드 결과 · APK 경로 · SHA-256
6. DL-6 바이너리 검사 결과
7. 실기기 검증 — 뒤로가기 8항목 / 콜드 스타트 3항목 / 마라톤 체크포인트
8. logcat 의 fatal / ANR / avc denied 유무
9. 릴리즈 URL (만들었다면) 또는 만들지 않은 이유
10. 막힌 것과 사용자가 해야 할 남은 일

과장하지 말고 실행 증거가 있는 것만 보고하라.
