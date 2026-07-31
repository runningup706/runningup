# Codex 작업 지시문 — V14 APK 빌드와 릴리즈

이 문서를 **그대로 복사해 Codex에 붙여 넣으면 된다.**

---

## 0. 너의 임무

RunningUp V14 Android APK를 빌드해서 GitHub Release에 올리고, 실제로 설치·실행해 검증하라.
소스 수정은 이미 끝나 있다. 네가 할 일은 **빌드 · 설치 검증 · 배포**다.

작업 환경에는 Unity Editor와 Android SDK가 있어야 한다. 없으면 아무것도 하지 말고 그 사실만
보고하라. 없는데 있는 척하지 마라.

---

## 1. 대상

| 항목 | 값 |
|---|---|
| 저장소 | `runningup706/runningup` |
| 브랜치 | `claude/runningup-v14-handoff-hr19xk` |
| 기준 커밋 | `fc13dc6` (또는 그 이후 최신) |
| 패키지 | `kr.robom.runningup` |
| targetSdk | 36 |
| 액티비티 | `com.unity3d.player.UnityPlayerGameActivity` |

---

## 2. 이미 되어 있는 것 — 다시 하지 마라

이 브랜치에는 커밋 15개가 들어 있다. 되돌리거나 중복 구현하지 마라.

**클라이언트 수정 (네가 빌드할 대상)**
- 시스템 뒤로가기가 동작한다. targetSdk 36에서 `KEYCODE_BACK`이 디스패치되지 않는 문제를
  `AndroidManifest.xml`의 `enableOnBackInvokedCallback="false"`로 풀었고,
  `HandleSystemBack()` 단일 진입점 + 백스택을 넣었다. 내비 버튼 12개가 `GoTo()`를 거친다.
- **게임 안 뒤로가기 버튼은 새로 만들지 않았다.** 사용자가 명시적으로 원치 않았다.
  테스트가 개수를 3개 이하로 제한하고 있으니 추가하지 마라.
- 콜드 스타트가 항상 홈에서 시작한다. 마지막 화면 복원을 제거했다.
- 체크포인트 사다리가 정수 미터 121개(마라톤 42.195km 포함)로 서버와 일치한다.

**백엔드/콘텐츠**
- 월간 체크포인트 52 → 121, DB CHECK 제약까지 이동 (마이그레이션 0009)
- 지역 96 → 192 (0010), 코스 2,304개 신설 (0011, `api.world_courses`)
- 전투 엔진 `battle.mjs` 삭제 → `race.mjs`(8인 러닝 대결)로 교체
- CI 2건 복구 — 저장소 역사상 한 번도 통과한 적 없던 것

**아직 안 된 것 (네 임무가 아니다. 손대지 마라)**
- 전투 *콘텐츠* 9개 파일과 DB 테이블 5개는 아직 남아 있다. 별도 작업으로 진행 중이다.

---

## 3. 첫 단계 — 로컬 V14 프로젝트와 합치기

원격 브랜치에는 **Unity 프로젝트 전체가 없다.** C# 파일 3개와 매니페스트만 있다.
씬·프리팹·ProjectSettings·Packages는 로컬에만 있다.

```bash
cd <로컬 runningup 경로>
git status --short          # 미커밋 변경 먼저 확인. 있으면 커밋하거나 stash 하라.
git fetch origin claude/runningup-v14-handoff-hr19xk
git checkout claude/runningup-v14-handoff-hr19xk 2>/dev/null || \
  git checkout -b claude/runningup-v14-handoff-hr19xk origin/claude/runningup-v14-handoff-hr19xk
git merge origin/claude/runningup-v14-handoff-hr19xk
```

### 충돌이 나면

`client/unity/Assets/RunningUp/V14/UI/V14ScreenFlowController.cs`에서 충돌이 날 가능성이 높다.
원격 쪽에는 인계 ZIP 기반으로 수정한 버전이, 로컬에는 원본이 있다.

**원격 쪽(`--theirs`)을 받아라.** 뒤로가기와 콜드 스타트 수정이 거기 들어 있다.

```bash
git checkout --theirs client/unity/Assets/RunningUp/V14/UI/V14ScreenFlowController.cs
git add client/unity/Assets/RunningUp/V14/UI/V14ScreenFlowController.cs
git commit
```

단, 로컬 파일에 **원격에 없는 네 쪽 변경이 따로 있었다면** `--theirs`가 그걸 지운다.
먼저 `git diff HEAD...origin/claude/runningup-v14-handoff-hr19xk -- <파일>`로 확인하고,
양쪽 변경이 다 필요하면 수동 병합하라. **사용자 변경을 조용히 지우지 마라.**

### 합친 뒤 반드시 확인

```bash
node tools/release/emit-client-ladder.mjs --check
```

`client ladder matches the canonical ladder (121 checkpoints, integer metres)`가 나와야 한다.
`still stores the ladder as MonthlyCheckpointsKm`가 나오면 병합에서 원격 쪽이 안 들어온 것이다.

---

## 4. 빌드 전에 통과해야 하는 게이트

하나라도 실패하면 빌드하지 마라. 먼저 고쳐라.

```bash
node --test "tests/*.test.mjs"          # 122 pass / 0 fail
node tools/direction-lock/scan.mjs      # No direction-lock violations
node tools/content-validator/validate.mjs
bash scripts/db.sh                      # Files=7, Tests=1132, Result: PASS
```

`scripts/db.sh`에는 PostgreSQL 16 + pgTAP이 필요하다. 없으면 그 항목만 `BLOCKED_TOOLCHAIN`으로
적고 나머지는 돌려라. **없는 걸 통과했다고 쓰지 마라.**

---

## 5. 빌드

```bash
bash tools/build/android-v14.sh
```

이 스크립트는 **로컬에만 있다** (원격 브랜치에는 없다). 없으면 프로젝트의 실제 빌드 경로를 찾아라.

Unity 로그에서 `Build Finished, Result: Success`를 확인하라.
**exit code만 보고 성공이라고 하지 마라.** 이전 세션에서 SIGTERM(143)을 성공으로 오인한 적이 있다.

---

## 6. 설치 검증 — 여기가 진짜 작업이다

빌드 성공은 배포 성공이 아니다. 아래를 **전부** 실행하고 출력을 증거로 남겨라.

```bash
APK="<빌드된 APK 경로>"
sha256sum "$APK"                                   # 증거 1
adb devices -l                                     # 기기 연결 확인
adb install -r "$APK"                              # 증거 2: Success
adb shell pm clear kr.robom.runningup              # 앱 데이터 완전 삭제
adb logcat -c
adb shell am start -W -n kr.robom.runningup/com.unity3d.player.UnityPlayerGameActivity
sleep 6
adb exec-out screencap -p > home-cold-launch.png   # 증거 3: 홈 화면
adb logcat -d -v threadtime > cold-launch-logcat.txt
```

로그 검사:

```bash
rg -n "FATAL EXCEPTION|ANR in|AndroidRuntime|OutOfMemory|avc: denied" cold-launch-logcat.txt
```

`avc: denied`는 특히 주의하라. 이전 빌드에서 `v14-flow-state.json`에 대한
`avc: denied { link } ... dev="fuse" ... permissive=0`이 나왔다. Unity의 `persistentDataPath`가
FUSE 외부 경로라 하드링크 기반 원자적 쓰기가 SELinux에 차단된다. 이번에도 나오면 보고하라.

---

## 7. 이번 수정을 실제로 검증하라 — 이게 핵심이다

사용자가 직접 겪은 두 가지다. 캡처나 영상으로 증거를 남겨라.

### 7-1. 시스템 뒤로가기

| # | 조작 | 기대 결과 |
|---|---|---|
| 1 | 홈 → 다른 화면 이동 후 **시스템 뒤로가기** | 이전 화면으로 돌아간다 |
| 2 | 3단계 이동 후 뒤로가기 3번 | 홈까지 순서대로 되짚어 온다 |
| 3 | **홈에서** 뒤로가기 1번 | `Press back again to exit` 표시, 앱 유지 |
| 4 | 홈에서 뒤로가기 2번 연속 | 앱 종료 |
| 5 | 러닝 중 뒤로가기 | 홈으로 가되 **러닝은 계속 돌아간다** |
| 6 | 제스처 뒤로가기(화면 가장자리 스와이프) | 1~5와 동일하게 동작 |
| 7 | 3버튼 내비의 뒤로가기 버튼 | 1~5와 동일하게 동작 |

`adb shell input keyevent KEYCODE_BACK`으로도 확인하되, **실제 손가락 조작이 정본**이다.
제스처 back은 keyevent로 재현되지 않는다.

### 7-2. 콜드 스타트

| # | 조작 | 기대 결과 |
|---|---|---|
| 1 | 아무 화면에서 `adb shell am force-stop kr.robom.runningup` | — |
| 2 | 다시 실행 | **홈에서 시작** (죽은 화면으로 안 열림) |
| 3 | Active Training 화면에서 강제 종료 후 재실행 | **홈** |

### 7-3. 체크포인트

월간 거리가 42km를 넘겼을 때 `42.195 KM` 체크포인트가 보이는지 확인하라.
`42 KM`으로 반올림돼 보이면 사다리 병합이 잘못된 것이다.

---

## 8. 릴리즈

**위 7번이 전부 통과한 뒤에만** 릴리즈를 만들어라. 실패한 항목이 있으면 릴리즈하지 말고 보고하라.

```bash
TAG="v14.0.0-back-navigation-fix"
gh release create "$TAG" \
  --target claude/runningup-v14-handoff-hr19xk \
  --title "RunningUp V14 — 시스템 뒤로가기 · 콜드 스타트 수정" \
  --prerelease \
  --notes-file release-notes.md \
  "$APK"
```

`release-notes.md`에 반드시 넣을 것:
- APK의 SHA-256
- 7-1, 7-2 표의 항목별 통과/실패
- cold launch `TotalTime`
- fatal crash / ANR / SELinux denial 유무
- 이 빌드에 **들어가지 않은 것**: 전투 콘텐츠와 DB 테이블은 아직 남아 있다

---

## 9. 하지 말아야 할 것

- 디자인 변경. 2.5D Live Journey Home, chibi My Runner, pacer, HUD 배치, 색상, 문구 전부 잠겨 있다.
- 게임 안 뒤로가기 버튼 추가. 사용자가 명시적으로 원치 않았고 테스트가 막는다.
- 전투·몬스터·무기·피해량·공격 스킬 부활.
- `git reset --hard`, `git clean`, 광범위 삭제, 사용자 변경 덮어쓰기.
- 증거 없는 `PASS`. 안 돌린 건 `NOT_RUN`, 막힌 건 `BLOCKED`.
- Unity 클라이언트에 Supabase service-role 키 넣기.

---

## 10. 보고 형식

```
RUNNINGUP V14 APK: COMPLETE | PARTIAL | BLOCKED
```

1. 병합 결과와 충돌 처리 방식
2. 빌드 전 게이트 4종 결과 (실제 출력)
3. Unity 빌드 결과와 APK 경로·SHA-256
4. install / pm clear / cold launch 출력
5. 7-1 뒤로가기 7항목 결과
6. 7-2 콜드 스타트 3항목 결과
7. 7-3 마라톤 체크포인트 결과
8. logcat의 fatal / ANR / avc denied 유무
9. 릴리즈 URL (만들었다면)
10. 막힌 것과 다음 작업

과장하지 말고 실행 증거가 있는 것만 보고하라.
