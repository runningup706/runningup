# RunningUp V14 — 기능 수정 마스터 프롬프트 (뒤로가기 · 탭 무반응 · 최적화)

> 작성: 2026-07-30 · 분석 대상: `RunningUp_V14_ClaudeCode_Handoff_20260731_0810.zip`의
> `05_SELECTED_SOURCE`, `06_TEST_EVIDENCE`, 그리고 `runningup706/runningup` 원격 저장소.
> 이 문서는 **기능 수정 지시문**이다. 아래 작업 프롬프트는 그대로 복사해 다음 세션에 넣을 수 있다.

---

## 0. 절대 불변 조항 — 디자인은 건드리지 않는다

이 문서의 어떤 작업도 아래를 바꾸지 않는다. 위반하면 그 작업은 실패로 처리한다.

- 세로형 2.5D Live Journey Home, premium chibi My Runner, pacer, 도시 차선, 카메라 구도.
- 얇은 한 줄 상단 HUD · 중앙 Journey 패널 · 운동 스탯 HUD · 하단 스탯 카드 · 하단 내비의 중앙 RUN CTA.
- 색상 상수(`Ink`/`Panel`/`PanelSoft`/`Blue`/`Cyan`/`Green`/`Gold`), 폰트 크기, 문구, 화면 구성.
- `approvedJourneyBackdrop` / `approvedHomeRoot` 이하의 승인된 홈 계층.

**허용되는 시각적 변화는 단 두 가지뿐이다.**
1. Safe area(노치·제스처바) 만큼의 **오프셋 이동** — 배치 비율과 크기는 유지.
2. 화면 밖으로 넘친 컨텐츠를 **스크롤 가능하게** 만드는 것 — 요소의 좌표·크기는 유지.

전투·몬스터·무기·피해량·공격 스킬·V5 RPG 데이터는 되살리지 않는다.

---

## 1. 최우선 — 저장소 상태 불일치 (다른 모든 작업보다 먼저)

**확인된 사실:** 원격 저장소 `runningup706/runningup`에는 **V14 클라이언트 코드가 존재하지 않는다.**

```
$ git ls-remote --heads origin
  refs/heads/main                              745656e
  refs/heads/claude/runningup-3d-android-dev-3c8gnp
  refs/heads/agent/runningup-v5-full-apk

$ git ls-tree -r --name-only origin/main | grep -c "V14\|ScreenFlow\|RunVerification"
0
```

- 세 브랜치 어디에도 `client/unity/Assets/RunningUp/V14/`, `RunVerification/`, `tests/v14-*`가 없다.
- `origin/main`의 최신 커밋은 `ab69f06 feat(game): battle engine ...` — **삭제 대상인 V5 전투 런타임**이다.
- `client/unity/Assets/RunningUp/` 아래에 실제로 존재하는 파일은 2개뿐이다
  (`Progression/MonthlyApex/MonthlyApexLadder.cs`, `RunningUp.Progression.asmdef`).
- 인계 ZIP의 `05_SELECTED_SOURCE`에도 V14 파일 중 **4개만** 들어 있다
  (`V11RunRuntime.cs`, `V11VerifiedRunUploader.cs`, `V11RunVerificationTests.cs`, `V14ScreenFlowController.cs`).
  `V14JourneyRuntime.cs`, `V11AndroidRunBridge.cs`, `ChibiRunnerView.cs`, 씬/프리팹, 부트스트랩,
  `AndroidManifest.xml`, Gradle 템플릿은 **어디에도 없다.**

### FIX-00 · 소스 단일 진실 확보 (블로커)

```
작업: 사용자 로컬 작업 환경의 V14 전체 Unity 프로젝트를 원격 저장소에 올린다.
  1) 로컬에서 `git status`와 `git log --oneline -20`을 먼저 찍어 미커밋 변경을 확인한다.
     reset/checkout/clean/광범위 삭제는 금지. 사용자 변경을 지우지 않는다.
  2) 최소한 아래를 커밋한다:
     client/unity/Assets/RunningUp/V14/**
     client/unity/Assets/RunningUp/RunVerification/**
     client/unity/Assets/RunningUp/MyRunner/**
     client/unity/Assets/RunningUp/Core/**
     client/unity/ProjectSettings/**  (targetSdk, CanvasScaler 기준 해상도 확인용)
     client/unity/Assets/Plugins/Android/**  (AndroidManifest.xml 포함)
     tests/**, scripts/**, tools/build/android-v14.sh
     requirements/V14_SCREEN_IMPLEMENTATION_CONTRACT.json
  3) 대용량 APK는 커밋하지 않는다. SHA-256만 기록한다.
증거: 푸시 후 `git ls-tree -r --name-only origin/<branch> | grep V14 | wc -l` 출력.
근거: 이 코드가 없으면 아래 FIX-01~FIX-16을 실제로 적용·검증할 수 없다.
```

---

## 2. 근본 원인 — 증거 기반 정리

각 항목은 실제 파일과 줄 번호, 또는 사용자의 logcat에서 확인한 값이다.

### A. 뒤로가기가 안 되는 이유 — 3계층 전부 고장

#### A-1. (치명) Android 16 / targetSdk 36에서 뒤로가기 키가 Unity에 전달되지 않는다

사용자 인계 패키지의 `06_TEST_EVIDENCE/fresh-logcat.txt`에서:

```
D nativeloader: ... base.apk. target_sdk_version=36 ...
V Unity   : Context Type: GameActivity
I ActivityTaskManager: START ... kr.robom.runningup/com.unity3d.player.UnityPlayerGameActivity
```

Android 16(API 36)을 타깃하는 앱은 predictive back이 기본 강제다.
**`onBackPressed`는 호출되지 않고 `KeyEvent.KEYCODE_BACK`은 더 이상 디스패치되지 않는다.**
Unity는 `KEYCODE_BACK`을 `KeyCode.Escape`로 매핑하므로, 이 APK에서는 뒤로가기 입력이
**애초에 게임 코드에 도달하지 못하고** 시스템이 액티비티를 종료(back-to-home)한다.
사용자가 겪는 "뒤로가기가 잘 안 된다"의 1차 원인이다.

#### A-2. 앱에 뒤로가기 처리 코드가 아예 없다

`V14ScreenFlowController.cs` 전체 2,999줄에서:

```
grep -c "Escape|BackButton|OnBackInvoked"  → 0
grep -n "private void Update"              → (없음)
```

`Update()`도, `Escape` 처리도, **백스택 자료구조도 없다.**
`Show(Screen)`은 `currentScreen`만 덮어쓴다(2694행). 이전 화면 기록이 없으므로
A-1을 고쳐도 "어디로 돌아갈지"를 계산할 수 없다.

#### A-3. 뒤로가기를 눌러도 런타임이 즉시 되돌려 놓는다

`V14ScreenFlowController.cs:2222-2231`

```csharp
private void OnBridgeStatus(string status)
{
    if (status == "capturing")
    {
        Show(journey != null && journey.RaceState == V14RaceState.ACTIVE
            ? Screen.LiveRace : Screen.ActiveTraining);
    }
```

GPS 기록 중에는 Android bridge가 `capturing` 상태를 **반복 발행**한다.
사용자가 뒤로 나가도 다음 브릿지 이벤트 한 번이면 `ActiveTraining`으로 강제 복귀한다.
`OnJourneyStatus`(2174-2219행)도 `training_active`, `race_active`, `race_rewarded` 등에서
같은 방식으로 무조건 `Show()`를 호출한다. 사용자 의도가 항상 진다.

#### A-4. 화면 13개 중 대부분에 BACK 버튼 자체가 없다

전체 버튼을 열거한 결과, 뒤로 나가는 컨트롤이 있는 화면은 3개뿐이다.

| 화면 | 탈출 수단 | 상태 |
|---|---|---|
| Sync | `"Back"` → Home (593행) | OK |
| TrainingResult | `RETURN TO LIVE JOURNEY` (1123행) | OK |
| RaceResult | `RETURN HOME` (1285행) | OK |
| Training / Matchmaking / Lobby / Character / World / Crew / Settings | 하단 내비뿐 | BACK 없음 |
| **ActiveTraining** | **없음** | **갇힘** |
| **LiveRace** | **없음** | **갇힘** |

`Header()` 헬퍼(1676행)는 제목·부제만 만들고 BACK 버튼을 만들지 않는다.
`"WorldBack"`(1384/1395행)은 화면 이동이 아니라 `worldSelectionStage`만 되돌린다.

### B. 눌러도 반응이 없는 이유

#### B-1. (치명) 상단 HUD 전체가 노치 아래에 깔린다

같은 logcat:

```
I Unity : applyWindowUIChanges fullScreen = true, renderOutsideSafeArea = true
displayCutoutSafeInsets=Rect(0, 109 - 0, 0)
topActivityAppBounds=Rect(0, 0 - 1080, 1920)
```

- 앱은 **safe area 밖까지 렌더**하도록 켜져 있고, 상단 컷아웃 inset은 **109px**이다.
- `BuildTopHud()`(351-390행)는 상단에 **높이 92px** 바를 붙인다. `92 < 109`.
- 즉 `RUNNER`(Character 이동)·`SETTINGS` 단축 버튼과 재화 표시가 **통째로 컷아웃/상태바
  영역 안에 들어간다.** 눌러도 시스템이 먼저 먹거나 물리적으로 가려진다.
- 소스 전체에서 `Screen.safeArea` 사용은 **0회**다.

하단도 같다. `BuildBottomNavigation()`은 높이 154px, `BuildStatusRail()`은 그 위 56px에
붙는다. 제스처 내비게이션 바와 좌우 back-gesture edge zone이 이 영역을 침범해
가장자리 버튼(`HOME`, `WORLD`)의 탭이 시스템 제스처로 소비된다.

#### B-2. (치명) 승인된 홈에서는 생성된 HUD와 하단 내비가 전부 꺼진다

`Show()` 2718-2726행:

```csharp
foreach (var chrome in generatedChrome)
    chrome?.SetActive(!approvedHomeVisible && !immersive);
foreach (var button in bottomButtons)
    button.transform.parent.gameObject.SetActive(!immersive && !approvedHomeVisible);
```

`approvedHomeRoot`가 있으면 홈에서 TopHud·BottomNavigation·StatusRail이 **모두 비활성**이다.
따라서 홈의 모든 조작은 `approvedHomeNavigation` 배선에만 의존한다.

#### B-3. (치명) 승인된 홈 배선이 초기화 순서에 따라 통째로 누락된다

```csharp
private void Awake()
{
    ...
    Build();
    WireApprovedHome();      // ← approvedHomeRoot == null 이면 즉시 return (559-563행)
```

`ConfigureApprovedHome(...)`(198행)은 **Awake 이후에 호출되는 설정 API**다.
부트스트랩이 `AddComponent<V14ScreenFlowController>()` → `ConfigureApprovedHome(...)` 순서로
동작하면 `Awake`는 `AddComponent` 시점에 이미 끝나 있다. 결과:

- `WireApprovedHome()`이 `approvedHomeRoot == null`로 조기 반환 → **홈 버튼 onClick이 하나도 붙지 않는다.**
- 동시에 `BuildHome()`(442-448행)도 `approvedHomeRoot == null`이라 판단해 **대체 홈을 추가로 생성**한다.
- 이후 `Show()`는 `approvedHomeRoot.SetActive(true)`를 하므로 두 홈이 겹치고, 배선은 없다.

**B-1 + B-2 + B-3의 조합이 "홈에서 눌러도 반응 없음"의 가장 유력한 경로다.**

또한 `WireApprovedHome()`은 `RemoveAllListeners()` 없이 `AddListener`만 한다(579-587행).
두 번 호출되면 한 번의 탭이 두 번 네비게이션한다.

#### B-4. 승인된 홈 내비 순서가 코드에 하드코딩돼 있다

```csharp
var destinations = new[] { Screen.Home, Screen.Character, Screen.Training, Screen.World, Screen.Crew };
```

실제 승인 HUD의 버튼 순서와 다르면 **엉뚱한 화면으로 이동**한다. 중앙 RUN CTA(index 2)는
`Screen.Training` 목록으로 갈 뿐 **러닝을 시작하지 않는다.**

#### B-5. RESUME 후 PAUSE 버튼이 비활성으로 굳는다

`RefreshRuntimeState()` 2290-2300행:

```csharp
pauseButton.interactable = !controlsLocked &&
    journey.TrainingState is SENSOR_CHECK or ACTIVE or PAUSED;        // RESUMED 없음
finishButton.interactable = !controlsLocked &&
    journey.TrainingState is ACTIVE or PAUSED or RESUMED;             // RESUMED 있음
```

`RESUMED` 상태가 유지되는 동안 **PAUSE는 회색으로 죽고 FINISH만 산다.**
일시정지 → 재개 → 다시 일시정지가 불가능하다. 비대칭이 명백한 버그다.

#### B-6. 실패 메시지가 보이지 않는 화면이 있다

`Publish()`는 `StatusRail`의 `globalStatus` 한 곳에만 쓴다(2766행).
그런데 `StatusRail`은 `generatedChrome`에 포함돼 있어 **immersive 화면
(ActiveTraining / TrainingResult / LiveRace)에서는 꺼진다.**

결과: `TogglePause()`의 `Publish("Training runtime unavailable")`(2032행),
`journey?.FinishTraining()` 실패, GPS 권한 거부 등이 **화면상 완전히 무반응**으로 보인다.
사용자가 말한 "눌러도 반응 없는 것"의 정확한 정의다.

#### B-7. 스크롤이 없어 컨텐츠가 화면 밖 / 크롬 아래에 깔린다

```
grep -c "ScrollRect|LayoutGroup|Mask"  → 0
```

모든 화면이 고정 좌표다. 최하단 컨텐츠 좌표:

| 화면 | 최하단 y | 비고 |
|---|---:|---|
| Settings | `-1610f` + 높이 180 = **-1790** | `SettingsTruth` |
| Training | `-1374f` + 90 = -1464 | `TrainingTruth` |
| World | `-1180f` + 80 = -1260 | `WorldBack` |

1080×1920 기준 캔버스에서 하단 크롬(내비 154 + 레일 56 = **210px**)은 -1710~-1920을 덮는다.
따라서 Settings 하단 블록은 **불투명 크롬 아래에 깔린다.** 기준 해상도가 1920보다 작으면
`HEALTH CONNECT`(-1240), `AccountAction`, `CREW & RANKINGS` 행까지 화면 밖으로 나간다.

#### B-8. 설정 토글 후 한 프레임 동안 죽은 UI가 겹친다

`RebuildSettings()` 2129-2140행:

```csharp
Destroy(old);                                        // Unity에서 프레임 끝에 실행
screens.Remove(Screen.Settings);
BuildSettings();
screens[Screen.Settings].transform.SetSiblingIndex(11);   // ← 잘못된 인덱스
Show(Screen.Settings, false);
```

- `Destroy`는 지연 실행이므로 **옛 Settings 오브젝트가 그 프레임 내내 활성 상태로 남는다.**
  `Show()`는 이미 딕셔너리에서 지워진 옛 오브젝트를 끄지 못한다. 그 프레임의 탭은 죽은 UI가 먹는다.
- `Build()` 호출 순서(333-345행)상 Settings의 형제 인덱스는 **12**다(Home 0 … Crew 11, Settings 12).
  `SetSiblingIndex(11)`은 Settings를 Crew 앞으로 밀어 넣는 **오프바이원**이다.

#### B-9. 상시 비활성 버튼 헬퍼가 남아 있다

`ChoiceRow()`(1753-1777행)는 `action = null`, `interactable = false` 버튼만 만든다.
현재 호출처가 없어 화면에는 나오지 않지만, **"눌러도 작동하지 않는 버튼 금지" 규칙과 정면 충돌**하는
헬퍼이므로 제거 대상이다. `SettingsRow(root, "DIRECT GPS", gps, -330f, null)`(1574행)은
실제로 `interactable = false`인 행을 화면에 렌더한다 — 표시 전용이라면 버튼이 아니라
읽기 전용 값으로 그려야 한다.

### C. Supabase 서버 결함 (보상이 조용히 사라진다)

`20260730220805_v14_cross_source_canonical_run_merge.sql`

#### C-1. (치명) `FOUND` 오염 — source_record_id 없는 러닝이 전부 "중복" 처리된다

```sql
perform pg_advisory_xact_lock(hashtextextended( ... ));       -- ① FOUND = true 로 세팅됨

if nullif(btrim(p_source_record_id), '') is not null then     -- ② Direct GPS면 이 블록을 건너뜀
  select canonical.* into v_existing ...
end if;

if not found then                                             -- ③ FOUND는 아직 ①의 true
  select canonical.* into v_existing ... (cross-source merge)  --    → 이 병합 쿼리가 통째로 스킵됨
end if;

if found then                                                 -- ④ true
  ... return query select v_existing.id, true, ...             --    v_existing는 전부 NULL
```

PL/pgSQL에서 `PERFORM`은 **행을 1개 이상 생성하면 `FOUND`를 true로 만든다.**
`pg_advisory_xact_lock(...)`은 정확히 한 행을 반환하므로 ①에서 `FOUND = true`가 된다.

결과: `p_source_record_id`가 비어 있는 경로(=**Direct GPS 러닝**)에서
- ③의 cross-source 병합이 **실행되지 않고**,
- ④가 참이 되어 `run_id = NULL`, `duplicate = true`, 모든 보상 0으로 응답한다.

그리고 최근에 넣은 Unity 중복 억제 수정(`V11RunRuntime.ConfirmServerAcceptedRun`, 88-99행)이
`canonicalDuplicate == true`를 보고 **큐만 ACK하고 성장 적용을 건너뛴다.**
→ **실제로 뛴 러닝이 아무 흔적 없이 사라진다.** 오류 표시도 없다.

로컬 E2E(`v14-server-e2e.sh`)가 이걸 못 잡은 이유는 direct 케이스에도
`source_record_id`를 넣어 호출했기 때문일 가능성이 높다. 회귀 테스트를 반드시 추가한다.

#### C-2. Advisory lock 키의 버킷 경계 때문에 직렬화가 실제로 안 된다

```sql
floor(extract(epoch from p_started_at) / 120)::text  ||  round(p_distance_m / 100.0)::text
```

- 1초 차이인 두 업로드가 버킷 경계(예: epoch 239 / 241)를 사이에 두면 **다른 락**을 잡는다.
- 거리도 `round(d/100)`이라 5,049m와 5,051m는 다른 버킷이다.
- 그런데 병합 판정은 `±120초` 슬라이딩 윈도우다. 락 범위와 판정 범위가 **불일치**한다.
- 두 출처(Direct GPS + Health Connect)가 동시에 올라오면 서로를 못 보고
  **canonical run 2개 + 이중 보상**이 만들어질 수 있다.

#### C-3. 병합 조회가 인덱스를 못 탄다

```sql
where abs(extract(epoch from canonical.started_at) - extract(epoch from p_started_at)) <= 120
```

좌변이 함수식이라 sargable하지 않다. 사용자의 `canonical_runs` 전체를 스캔한다.
러닝이 수백 건 쌓이면 업로드마다 선형 비용이 붙는다.

#### C-4. 스칼라 서브쿼리가 다중 행에서 터진다

duplicate 분기의 `reward_ledger` 조회 3개는 `(select ledger.x from private.reward_ledger
where source_type='verified_run' and source_id = v_existing.id)` 형태다.
같은 run에 대한 ledger 행이 2개 이상이면 `more than one row returned by a subquery` 예외가 난다.
`user_id` 필터도 빠져 있다.

### D. 최적화 결함

#### D-1. (치명) GPS 표본마다 전체 경로를 다시 계산 — O(n²)

`OnGpsSample` → `RefreshMetrics()`:

```csharp
private void OnGpsSample(GpsSample sample, int count)
{
    liveSamples.Add(sample);
    RefreshMetrics();          // ← 매 표본
}

private void RefreshMetrics()
{
    for (var index = 1; index < liveSamples.Count; index++)   // ← 항상 처음부터 전부
    {
        ... Haversine(previous, current) ...                  // sin/cos/atan2/sqrt
    }
```

1Hz · 60분 러닝 = 3,600 표본 → 누적 **약 650만 회**의 Haversine(삼각함수 4회 이상) 호출.
러닝 후반에는 **한 프레임에 3,600회**가 몰린다. 메인 스레드에서 프레임 드랍과 발열·배터리
소모로 직결된다. 게다가 `RefreshMetrics()` 안에서 `PlayerPrefs.GetInt(UnitsKey, 1)`를
매번 읽고(디스크 백업 저장소), 문자열 보간을 8회 새로 할당한다.

`liveSamples`는 한 번도 비워지지 않아 메모리도 단조 증가한다.

#### D-2. 상태 이벤트마다 안 보이는 화면까지 전부 갱신

`RefreshRuntimeState()`(2255행)는 `journey.StateChanged`마다, 그리고 **모든 `Show()` 끝에서**
호출되며 현재 화면과 무관하게 `RefreshApprovedResources()` + `RefreshRaceUi()`를 매번 돌린다.
`RefreshRaceUi()`는 로비 슬롯 8개, 순위표, 진행 스트립 텍스트를 전부 다시 만든다.

#### D-3. 업로더가 매 프레임 폴링하고 10초마다 상태를 재방송

`V11VerifiedRunUploader.Update()`는 매 프레임 `Time.unscaledTime >= nextSyncAt`를 검사하고,
큐가 비어 있어도 10초마다 `Publish("synchronized")`를 쏜다.
이 상태 이벤트는 `V14ScreenFlowController.OnJourneyStatus`/`OnBridgeStatus`를 거쳐
`Publish` + `RefreshSyncView()` + 경우에 따라 `Show()`까지 유발한다. 유휴 상태에서의 순수 낭비다.

#### D-4. 설정 토글마다 화면 전체를 파괴·재생성

`ToggleAudio` / `ToggleUnits` / `ToggleGraphics` / `ToggleBattery` / `ToggleAutoPause` /
권한 요청 6개가 전부 `RebuildSettings()`를 호출한다.
탭 한 번에 GameObject 수십 개(Image + Text)를 새로 만들고 버린다. GC 스파이크와 프레임 히치.

#### D-5. 상호작용하지 않는 그래픽이 전부 레이캐스트 대상

`Label()`과 `ImagePanel()`은 `raycastTarget`을 한 번도 끄지 않는다(전체 파일에서 0회).
uGUI는 매 포인터 이벤트마다 모든 활성 raycast 대상을 정렬·검사한다.
화면당 수십 개의 장식용 Text/Image가 전부 후보로 들어간다. 성능 낭비이자,
겹치는 배치에서는 실제 클릭 차단 위험이다.

---

## 3. 원자 작업 프롬프트 — 이 순서대로 실행

각 작업은 **하나의 커밋**이다. 각 작업마다 (1) 수정 경로 (2) 테스트 명령과 실제 출력
(3) Unity Editor 또는 Android 캡처 (4) 성공/오류/빈 상태/재시도/재실행 증거를 남기고
`V14_EXPANSION_LEDGER.json`을 갱신한다. 증거 없는 PASS는 쓰지 않는다.

---

### FIX-01 · Android 16 뒤로가기 입력을 앱까지 도달시킨다 · P0

```
문제: targetSdk 36 + GameActivity에서 KEYCODE_BACK이 디스패치되지 않아
      Unity가 뒤로가기를 아예 받지 못하고 시스템이 액티비티를 종료한다.
      (증거: 06_TEST_EVIDENCE/fresh-logcat.txt의 target_sdk_version=36,
       Context Type: GameActivity)

작업:
  1) client/unity/Assets/Plugins/Android/AndroidManifest.xml 을 확인한다.
     파일이 없으면 Unity의 Custom Main Manifest를 켜서 생성한다.
  2) 즉시 복구용 단기 조치 — <application> 또는 <activity>에
       android:enableOnBackInvokedCallback="false"
     를 넣어 legacy back 디스패치를 되살린다.
     ※ 이건 SDK 37에서 제거된다. 반드시 3)과 함께 진행한다.
  3) 정식 조치 — GameActivity 서브클래스(또는 Android 라이브러리 플러그인)에서
     OnBackInvokedDispatcher에 OnBackInvokedCallback을 등록하고,
     UnitySendMessage 로 "RunningUp.V14.Back" 메시지를 C# 쪽 단일 진입점에 전달한다.
     Android 13 미만 대비로 KeyCode.Escape 경로도 같이 유지한다.
  4) C# 단일 진입점은 FIX-02의 NavigationStack.HandleBack() 하나만 호출한다.

검증:
  - adb shell input keyevent KEYCODE_BACK
  - 제스처 back(화면 좌/우 가장자리 스와이프)
  - Android 13 / 14 / 16 각각에서 앱이 종료되지 않고 이전 화면으로 돌아가는지
  - Home에서 back → "한 번 더 누르면 종료" 안내 → 두 번째 back에서만 종료

참고:
  - https://developer.android.com/about/versions/16/behavior-changes-16
  - https://developer.android.com/guide/navigation/custom-back/predictive-back-gesture
  - https://docs.unity3d.com/ScriptReference/Input-backButtonLeavesApp.html
```

---

### FIX-02 · 진짜 백스택을 도입한다 · P0

```
문제: Show()가 currentScreen만 덮어써서 되돌아갈 곳이 없다.
      V14ScreenFlowController.cs:2694

작업: V14ScreenFlowController에 아래를 추가한다. 화면 좌표·색상·문구는 건드리지 않는다.

  private readonly List<Screen> backStack = new();
  private const int MaxBackDepth = 12;

  private void Show(Screen screen, bool persist = true, bool pushHistory = true)
  {
      if (pushHistory && screen != currentScreen)
      {
          backStack.Add(currentScreen);
          if (backStack.Count > MaxBackDepth) backStack.RemoveAt(0);
      }
      ... 기존 본문 ...
  }

  public bool HandleBack()
  {
      // 1) 러닝/레이스 진행 중에는 확인 다이얼로그를 먼저 띄운다 (FIX-05)
      if (currentScreen is Screen.ActiveTraining or Screen.LiveRace)
      { ShowExitConfirm(); return true; }

      // 2) World는 화면 이동 전에 내부 단계를 먼저 되감는다
      if (currentScreen == Screen.World && worldSelectionStage > 0)
      { worldSelectionStage--; RebuildWorld(); return true; }

      // 3) 일반 백스택
      if (backStack.Count > 0)
      {
          var previous = backStack[^1];
          backStack.RemoveAt(backStack.Count - 1);
          Show(previous, true, pushHistory: false);
          return true;
      }

      // 4) Home에서의 back → 두 번 눌러 종료
      return false;
  }

  런타임 강제 이동(OnJourneyStatus / OnBridgeStatus)은 pushHistory: false 로 호출한다.

검증:
  - Home → Training → Matchmaking → Lobby 이동 후 back 3회로 Home 복귀
  - Home → Sync → Character → World 후 back 3회
  - 백스택 깊이 12 초과 시 가장 오래된 항목이 밀려나는지 (EditMode 테스트)
```

---

### FIX-03 · 런타임이 사용자 뒤로가기를 덮어쓰지 못하게 한다 · P0

```
문제: V14ScreenFlowController.cs:2224-2231
      bridge가 "capturing"을 반복 발행할 때마다 무조건 ActiveTraining/LiveRace로 되돌린다.
      사용자가 뒤로 나가도 다음 이벤트 한 번이면 도로 끌려간다.

작업:
  1) "런타임 강제 이동"과 "사용자 이동"을 구분한다.
     private bool userLeftLiveScreen;   // 사용자가 명시적으로 러닝 화면을 벗어남

  2) OnBridgeStatus의 "capturing" 분기는 상태 전이(edge)에서만 이동시킨다:
       if (status == "capturing" && lastBridgeStatus != "capturing" && !userLeftLiveScreen)
           Show(target, persist: true, pushHistory: false);
       lastBridgeStatus = status;

  3) HandleBack()이나 하단 내비로 ActiveTraining/LiveRace를 벗어나면
     userLeftLiveScreen = true 로 두고, 사용자가 다시 러닝 화면으로 진입하거나
     러닝이 끝나면 false로 되돌린다.

  4) OnJourneyStatus의 training_active / race_active / race_reconnected 분기도 동일하게
     "이미 그 화면이면 Show()를 호출하지 않는다" 가드를 넣는다:
       if (currentScreen != Screen.ActiveTraining) Show(...)

  5) 러닝을 백그라운드로 돌린 상태에서도 진행이 계속됨을 알리는 상시 배너를
     상단 HUD 한 줄에 표시한다(디자인 시스템의 기존 얇은 한 줄 HUD 사용, 새 디자인 금지).

검증:
  - 러닝 시작 → back → Home으로 나가짐 → 30초 대기 → 여전히 Home
  - Home의 진행 중 배너 탭 → ActiveTraining 복귀 → 거리·시간이 끊김 없이 이어짐
  - logcat에 GPS foreground service가 유지되는지 확인
```

---

### FIX-04 · 모든 화면에 일관된 BACK 컨트롤을 넣는다 · P0

```
문제: 13개 화면 중 3개에만 탈출 컨트롤이 있다. Header()는 BACK을 만들지 않는다.
      ActiveTraining과 LiveRace는 완전히 갇힌다.

작업:
  1) Header(Transform parent, string title, string subtitle) 를
     Header(Transform parent, string title, string subtitle, bool withBack = true) 로 넓히고,
     withBack이면 BuildSync의 "Back" 버튼과 동일한 좌표·크기·색으로 BACK을 만든다.
       위치 new Vector2(34f, -116f), 크기 new Vector2(108f, 66f), anchor (0,1), 색 PanelSoft
     ※ 새 디자인을 만들지 말고 Sync 화면의 기존 BACK을 그대로 재사용한다.
     ※ 이때 제목 라벨(현재 x=52)이 BACK과 겹치지 않도록 x를 168로 맞춘다 — Sync와 동일 규격.

  2) 적용 화면: Training, Matchmaking, Lobby, Character, World, Crew, Settings.
     BACK의 동작은 항상 HandleBack() 한 곳으로 보낸다.

  3) Lobby에는 "LEAVE QUEUE"를 추가해 journey.CancelRaceQueue() + HandleBack()을 호출한다.

  4) ActiveTraining / LiveRace(immersive)에는 BACK 대신 "MINIMIZE"를 넣는다.
     러닝은 계속되고 화면만 Home으로 돌아간다(FIX-03의 userLeftLiveScreen = true).

검증: 13개 화면 각각에서 back 입력과 화면 내 BACK 컨트롤이 모두 동작하는 매트릭스를 캡처로 남긴다.
```

---

### FIX-05 · ActiveTraining / LiveRace의 막다른 상태를 없앤다 · P0

```
문제:
  - ActiveTraining이 SENSOR_CHECK에서 멈추면 FINISH가 비활성이고 BACK도 없어 완전히 갇힌다.
    (finishButton.interactable 은 ACTIVE/PAUSED/RESUMED에서만 true — 2295-2300행)
  - LiveRace도 연결 손실이 아니면 RETRY가 비활성이라(2409행) 탈출 수단이 없다.
  - 그 상태에서 Publish()로 낸 오류 메시지는 StatusRail이 immersive에서 꺼지므로 보이지 않는다.

작업:
  1) SENSOR_CHECK에 타임아웃(예: 20초)을 두고 초과하면
     "GPS fix not acquired" 오류 상태 + RETRY + CANCEL을 화면에 실제로 띄운다.
     CANCEL은 journey의 세션을 정리하고 Home으로 돌아간다.
  2) immersive 화면 전용 상태 라인을 화면 안에 하나 만든다.
     StatusRail을 끄는 대신, ActiveTraining/LiveRace 루트 안의 기존 activeState 라벨 옆에
     오류 텍스트를 출력한다(새 패널을 만들지 않는다).
     또는 Show()의 immersive 분기에서 StatusRail만 예외적으로 켠다 — 둘 중 하나를 택한다.
  3) 종료 확인 다이얼로그: 러닝 중 back → "Discard this run?" / "Keep running" 2지선다.
     Discard는 로컬 세션을 폐기하되 이미 기록된 NDJSON은 보존한다.

검증: 6개 상태를 전부 캡처로 남긴다.
  권한 허용 / 권한 거부 / GPS fix 실패 / 오프라인 큐 / 재연결 / 서버 duplicate
```

---

### FIX-06 · Safe area를 실제로 적용한다 · P0

```
문제: renderOutsideSafeArea = true, 컷아웃 inset 109px인데 상단 HUD 높이는 92px다.
      RUNNER / SETTINGS 단축 버튼과 재화 표시가 통째로 노치 아래에 깔린다.
      소스 전체에서 Screen.safeArea 사용 0회.

작업:
  1) V14SafeAreaFitter 컴포넌트를 새로 만들어 flowRoot(및 approvedHomeRoot)에 붙인다.

     var safe = Screen.safeArea;
     rect.anchorMin = new Vector2(safe.xMin / Screen.width,  safe.yMin / Screen.height);
     rect.anchorMax = new Vector2(safe.xMax / Screen.width,  safe.yMax / Screen.height);

     회전·폴더블 접힘·멀티윈도우 대응으로 OnRectTransformDimensionsChange에서 재계산한다.

  2) 하단 내비의 최하단 24dp는 제스처 바 영역이므로, 버튼의 히트 영역이 그 안으로
     들어가지 않도록 내비 패널을 safe area 위로 올린다.
     ※ 버튼의 크기·색·문구·간격 비율은 그대로 둔다. 전체 오프셋만 이동한다.

  3) 좌우 back-gesture edge zone(각 24dp)과 겹치는 가장자리 버튼
     (Nav "HOME" x 0~216, Nav "WORLD" 최우측)의 탭 영역을 안쪽으로 물린다.

검증:
  - 노치 있는 기기 / 없는 기기 / 제스처 내비 / 3버튼 내비 4조합 캡처
  - adb shell wm size 로 해상도를 바꿔가며 상단 HUD가 상태바에 안 가리는지 확인
```

---

### FIX-07 · 승인된 홈 배선의 초기화 순서 문제를 없앤다 · P0

```
문제: ConfigureApprovedHome()이 Awake 이후에 불리면
      WireApprovedHome()이 조기 반환해 홈의 모든 버튼 onClick이 붙지 않는다.
      동시에 BuildHome()이 대체 홈을 중복 생성한다. (198, 230-244, 442-448, 559-588행)

작업:
  1) ConfigureApprovedHome() / Configure() 끝에서 재배선을 강제한다:
       ConfigureApprovedHome(...) { ... ; RebuildHomeBinding(); }
  2) RebuildHomeBinding()은 항상 RemoveAllListeners() 후 AddListener 한다.
     (중복 배선으로 한 번의 탭이 두 번 이동하는 문제 방지 — 현재 579-587행은 RemoveAllListeners 없음)
  3) approvedHomeRoot가 뒤늦게 들어오면 BuildHome()이 만든 대체 홈을 파괴한다.
     두 홈이 동시에 존재하는 상태를 허용하지 않는다.
  4) 부팅 시 자기 진단을 남긴다:
       Debug.Log($"[V14] approvedHome={approvedHomeRoot != null} nav={approvedHomeNavigation.Count} wired={wiredCount}");
     Android 실기기에서 logcat으로 배선 수를 확인할 수 있어야 한다.
  5) 배선 대상이 0개면 화면에 오류 상태를 띄운다. 조용히 무반응이 되면 안 된다.

검증:
  - EditMode: Configure 호출 순서를 Awake 전/후 두 가지로 바꿔도 배선 수가 같은지
  - Android: logcat에서 wired 수 확인 후 홈의 5개 내비 + SETTINGS + JOURNEY + SYNC 전부 탭
```

---

### FIX-08 · 홈 내비게이션 매핑을 데이터로 뺀다 · P1

```
문제: destinations 배열이 코드에 하드코딩돼 승인 HUD의 실제 버튼 순서와 어긋나면
      엉뚱한 화면으로 이동한다. 중앙 RUN CTA는 Training 목록만 열고 러닝을 시작하지 않는다.
      (566-573행, 그리고 하단 내비 403-410행의 TRAIN/RUN 중복)

작업:
  1) 각 내비 버튼의 목적지를 GameObject 이름 또는 직렬화 필드로 선언한다.
     예: V14NavButton 컴포넌트 [SerializeField] Screen destination;
  2) 중앙 RUN CTA의 동작을 확정한다.
     - Daily Run Contract 미완료 → 곧바로 StartSelectedTraining()으로 오늘의 계약을 시작
     - 완료 → Training 선택 화면
  3) 하단 내비의 "TRAIN"과 "RUN"이 둘 다 Screen.Training으로 가는 중복(405-409행)을 없앤다.
  4) requirements/V14_SCREEN_IMPLEMENTATION_CONTRACT.json 에 매핑을 기록하고
     tests/v14-screen-flow.test.mjs 가 그 계약을 강제하게 한다.

검증: 20개 목표 화면 전부에 대해 "어떤 버튼 → 어떤 화면"의 정적 계약 테스트 통과.
```

---

### FIX-09 · RESUMED 상태에서 PAUSE가 죽는 버그 · P0

```
문제: V14ScreenFlowController.cs:2290-2293
  pauseButton.interactable = ... TrainingState is SENSOR_CHECK or ACTIVE or PAUSED;
  finishButton.interactable = ... TrainingState is ACTIVE or PAUSED or RESUMED;
  → RESUMED에서 PAUSE만 비활성. 일시정지 → 재개 → 재일시정지가 불가능.

작업:
  1) V14TrainingState 정의를 열어 RESUMED가 과도 상태인지 지속 상태인지 확정한다.
  2) 지속 상태라면 pause 조건에 RESUMED를 추가한다:
       is SENSOR_CHECK or ACTIVE or PAUSED or RESUMED
     과도 상태라면 journey가 즉시 ACTIVE로 전이하도록 고치고, UI는 ACTIVE만 본다.
  3) 어느 쪽이든 pause/finish의 활성 조건을 하나의 헬퍼로 합쳐 비대칭을 구조적으로 막는다.
       private bool RunControlsEnabled => !controlsLocked && journey.TrainingState is ...

검증(EditMode): SENSOR_CHECK → ACTIVE → PAUSED → RESUMED → PAUSED 전이에서
               매 단계 pause/finish의 interactable 값을 단언한다.
```

---

### FIX-10 · 스크롤과 레이캐스트 정리 · P1

```
문제:
  - ScrollRect / LayoutGroup / Mask 사용 0회. 고정 좌표만 있어 컨텐츠가 크롬 아래에 깔린다.
    Settings 최하단 -1790, 하단 크롬은 -1710~-1920을 덮는다.
  - raycastTarget을 끄는 코드가 0회. 장식용 Text/Image가 전부 레이캐스트 후보다.

작업:
  1) 세로로 넘치는 화면(Training, Settings, World, Crew, Matchmaking)의 컨텐츠를
     ScrollRect + viewport(RectMask2D) 안으로 옮긴다.
     ※ 각 요소의 anchoredPosition과 sizeDelta는 그대로 유지한다. content 높이만 계산해 넣는다.
     ※ 상단 HUD와 하단 내비는 스크롤 밖에 고정으로 남긴다.
  2) Label()과 ImagePanel()에 raycastTarget 파라미터(기본 false)를 추가한다.
     버튼의 targetGraphic과 InputField 배경만 true로 남긴다.
  3) 전체 화면을 덮는 투명 배경(ScreenRoot의 Color.clear 분기)이 뒤쪽 입력을 막지 않는지
     확인한다. 필요하면 Image 없이 두거나 raycastTarget=false로 둔다.

검증:
  - 1080x1920 / 1080x2400 / 720x1600 세 해상도에서 모든 버튼이 화면 안에 있고 눌리는지 캡처
  - Unity Profiler의 EventSystem.Update 비용 before/after
```

---

### FIX-11 · GPS 지표 계산을 증분식으로 바꾼다 (O(n²) → O(1)) · P0 최적화

```
문제: RefreshMetrics()가 표본마다 liveSamples 전체를 다시 순회한다.
      60분 1Hz 러닝에서 누적 약 650만 회의 Haversine 호출, 후반에는 한 프레임에 3,600회.
      PlayerPrefs.GetInt를 매 표본 읽고 문자열 8개를 매번 새로 할당한다.
      liveSamples는 비워지지 않아 메모리가 단조 증가한다.

작업:
  1) 누적 상태를 필드로 유지한다.
       double accumulatedMeters;  long movingMilliseconds;
       int unstableSegments;      double latestSegmentSpeed;
       GpsSample lastAccepted;    bool hasLastAccepted;
  2) OnGpsSample에서 직전 표본과의 한 구간만 계산해 누적한다. 기존 필터 임계값
     (9.5 m/s 초과 폐기, 0.5 m/s 이상만 이동으로 인정)은 그대로 유지한다.
  3) 단위 설정은 PlayerPrefs에서 매번 읽지 말고 캐시하고, ToggleUnits()에서만 갱신한다.
  4) UI 텍스트 갱신은 표본마다가 아니라 최대 4Hz로 코얼레싱한다.
     (표본 수신과 표시 갱신을 분리 — 정확도는 유지, 렌더 비용만 줄인다)
  5) liveSamples는 UI용 최근 N개(예: 300)만 링버퍼로 들고, 원본은 기존 NDJSON 저널이 담당한다.
  6) StringBuilder 또는 사전 포맷 캐시로 프레임당 문자열 할당을 없앤다.

검증:
  - 3,600개 표본 리플레이 EditMode 테스트: 증분 결과가 기존 전체 순회 결과와
    거리 오차 1m 이내, 이동시간 오차 1s 이내로 일치
  - Android Profiler로 60분 러닝 시뮬레이션의 프레임 타임과 GC Alloc before/after
  - 실기기 배터리 소모 비교
```

---

### FIX-12 · 갱신 범위를 보이는 화면으로 좁힌다 · P1 최적화

```
문제:
  - RefreshRuntimeState()가 모든 Show() 끝과 모든 StateChanged에서
    현재 화면과 무관하게 RefreshApprovedResources() + RefreshRaceUi()를 돌린다. (2255-2302행)
  - V11VerifiedRunUploader가 매 프레임 폴링하고 큐가 비어도 10초마다 "synchronized"를 방송한다.
  - Toggle* 6종이 전부 RebuildSettings()로 화면을 통째로 파괴·재생성한다. (2063-2117행)

작업:
  1) RefreshRuntimeState를 화면별로 분기한다. 보이지 않는 화면의 UI는 갱신하지 않고,
     화면 진입 시 dirty 플래그로 한 번만 갱신한다.
  2) 업로더: Update() 폴링 대신 코루틴/InvokeRepeating으로 바꾸고,
     상태가 실제로 바뀔 때만 Publish 한다 (동일 상태 재방송 금지).
  3) RebuildSettings() 제거. 각 Toggle은 해당 행의 Text만 갱신한다.
     불가피하게 재생성이 필요하면 Destroy 대신 DestroyImmediate 또는
     "새로 만들고 → 옛것을 비활성 → 프레임 끝에 Destroy" 순서로 바꿔
     한 프레임 동안 죽은 UI가 입력을 먹는 문제를 없앤다.
  4) SetSiblingIndex(11) 하드코딩 제거. Build() 순서 기준 실제 인덱스는 12다.
     인덱스를 상수로 두지 말고 생성 시점에 기록한 값을 쓴다.

검증: Unity Profiler로 유휴 상태 CPU와 설정 토글 시 GC Alloc before/after.
```

---

### FIX-13 · Supabase: FOUND 오염 수정 · P0 (보상 유실)

```
문제: 20260730220805_v14_cross_source_canonical_run_merge.sql
      perform pg_advisory_xact_lock(...) 이 FOUND를 true로 만들어,
      p_source_record_id가 빈 경로(Direct GPS)에서
      cross-source 병합이 스킵되고 v_existing가 NULL인 채로 duplicate=true를 반환한다.
      Unity의 중복 억제 수정과 맞물려 실제 러닝이 보상 없이 조용히 사라진다.

작업(새 migration 파일로 작성, 기존 파일 수정 금지):
  1) FOUND에 의존하지 말고 명시적 플래그를 쓴다.

     declare v_matched boolean := false;
     ...
     if nullif(btrim(p_source_record_id), '') is not null then
       select canonical.* into v_existing from ... ;
       v_matched := v_existing.id is not null;
     end if;

     if not v_matched then
       select canonical.* into v_existing from ... (cross-source merge) ;
       v_matched := v_existing.id is not null;
     end if;

     if v_matched then ... else ... end if;

  2) 방어적으로 v_existing.id is null 이면 duplicate 분기로 절대 들어가지 않게 한다.

  3) 회귀 테스트를 반드시 추가한다 (tests 또는 pgTAP):
     - source_record_id = NULL 인 Direct GPS 최초 업로드 → duplicate=false, run_id NOT NULL,
       보상 > 0, monthly_verified_m 증가
     - 같은 러닝을 Health Connect가 source_record_id 有로 재업로드 → duplicate=true, 보상 재지급 없음
     - 역순(Health 먼저 → Direct 나중)도 동일
     - source_record_id = '' (빈 문자열)과 '   ' (공백)도 케이스에 포함

검증:
  ./scripts/v14-server-e2e.sh
  node --test tests/canonical-run-merge.test.mjs
  실제 출력 전문을 증거로 남긴다. "통과했다"는 서술만 쓰지 않는다.

참고: PL/pgSQL에서 PERFORM은 한 행 이상을 생성하면 FOUND를 true로 만든다.
  https://www.postgresql.org/message-id/23025.1098734547%40sss.pgh.pa.us
```

---

### FIX-14 · Supabase: 병합 락과 조회 정합성 · P0

```
문제:
  C-2 advisory lock 키가 floor(epoch/120)과 round(distance/100) 버킷이라
      경계에 걸친 동시 업로드가 서로 다른 락을 잡는다.
      판정은 ±120초 슬라이딩 윈도우라 락 범위와 불일치 → canonical run 이중 생성 + 이중 보상 가능.
  C-3 abs(extract(epoch from canonical.started_at) - ...) <= 120 은 sargable하지 않아 전체 스캔.
  C-4 reward_ledger 스칼라 서브쿼리에 user_id 필터가 없고, 행이 2개 이상이면 예외가 난다.

작업(같은 새 migration에 포함):
  1) 락 키를 사용자 단위로 단순화한다.
       perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));
     사용자별 직렬화는 업로드 빈도상 충분하다. 버킷 경계 문제가 사라진다.
     ※ 처리량이 문제되면 사용자 + 날짜(UTC date) 단위까지만 좁힌다. 초 단위 버킷은 쓰지 않는다.

  2) 시간 비교를 sargable하게 바꾼다.
       and canonical.started_at between p_started_at - interval '120 seconds'
                                    and p_started_at + interval '120 seconds'
     그리고 인덱스를 만든다.
       create index if not exists canonical_runs_user_started_idx
         on private.canonical_runs (user_id, started_at desc);

  3) reward_ledger 조회를 한 번의 LEFT JOIN 또는 단일 서브쿼리로 합치고
     user_id 필터와 limit 1(또는 집계)을 넣는다.

  4) 병합 판정에 사용한 허용 오차(distance ±max(75, 3%), duration ±max(90, 10%))는
     현행 값을 유지하되, 어떤 기준으로 병합됐는지 evidence jsonb에 기록한다.

검증:
  - 동시 업로드 부하 테스트: 같은 러닝을 Direct/Health 두 경로로 동시에 N회 밀어 넣고
    canonical_runs 행이 정확히 1개, reward_ledger 지급이 1회인지 확인
  - explain analyze로 병합 조회가 새 인덱스를 타는지 확인
```

---

### FIX-15 · 죽은 컨트롤을 제거하거나 이유를 명시한다 · P1

```
문제: 품질 금지 조항 — "눌러도 작동하지 않는 버튼"을 사용자 화면에 남기지 않는다.
      ChoiceRow()(1753-1777행)는 interactable=false 버튼만 만드는 헬퍼다(현재 미사용).
      SettingsRow(root, "DIRECT GPS", gps, -330f, null)(1574행)은 실제로 비활성 버튼을 렌더한다.

작업:
  1) ChoiceRow() 를 삭제한다.
  2) 표시 전용 값은 버튼이 아니라 읽기 전용 라벨로 그린다. 크기·위치·색은 기존 행과 동일하게 유지한다.
  3) 실제로 비활성이어야 하는 연결(Garmin / Samsung Health / Strava 등)은
     "disabled" 상태와 함께 정확한 이유 문구를 영어로 표시한다.
     예: "Requires official partner approval — not available yet"
     승인 capability가 없으면 작동하는 것처럼 보이는 버튼을 만들지 않는다.
  4) 전체 화면을 훑어 interactable=false로 렌더되는 컨트롤을 목록화하고
     각각 (a) 제거 (b) 라벨로 전환 (c) 이유 명시 중 하나로 처리한다.

검증: tests에 "이유 문구 없는 비활성 버튼 0개" 정적 검사를 추가한다.
```

---

### FIX-16 · 재실행 복구가 죽은 화면으로 부활하지 않게 한다 · P1

```
문제: Awake의
        currentScreen = ParseScreen(PlayerPrefs.GetString(ScreenKey, Screen.Home.ToString()));
      가 마지막 화면을 그대로 복원한다. (243행)
      러닝 중 앱이 죽으면 재실행 시 ActiveTraining으로 복원되는데,
      이 화면은 immersive라 크롬이 전부 꺼지고 BACK도 없으며 세션 상태는 없다.
      → 아무것도 못 하는 화면으로 부팅된다.

작업:
  1) 복원 허용 화면을 화이트리스트로 제한한다.
     Home / Sync / Training / Character / World / Crew / Settings 만 복원한다.
  2) ActiveTraining / LiveRace / Lobby / Matchmaking / TrainingResult / RaceResult 는
     저장된 런타임 세션이 실제로 복구 가능할 때만 복원한다.
     복구 불가면 Home으로 떨어뜨리고, 미완료 러닝이 있으면
     "Unfinished run recovered — review and submit" 상태를 홈에 표시한다.
  3) 복원 직후 백스택은 [Home] 하나로 초기화해 첫 back이 항상 유효하게 만든다.

검증:
  - 러닝 중 adb shell am force-stop → 재실행 → Home + 복구 배너 확인
  - adb shell pm clear 후 cold launch → Home 정상
  - 각 화이트리스트 화면에서 강제 종료 후 재실행 복원 확인
```

---

## 4. 회귀 게이트 — 매 작업 후 전부 실행

```bash
cd runningup
node --test tests/canonical-run-merge.test.mjs \
            tests/direct-run-service.test.mjs \
            tests/v14-screen-flow.test.mjs
./scripts/unity.sh
./scripts/v14-server-e2e.sh
bash tools/build/android-v14.sh
```

### 새로 추가해야 할 테스트

| 테스트 | 대상 | 형태 |
|---|---|---|
| `v14-navigation.test.mjs` | 13개 화면 전부에 BACK/탈출 컨트롤이 소스에 존재 | 정적 계약 |
| `V14NavigationStackTests` | 백스택 push/pop/깊이 제한/런타임 강제 이동 제외 | EditMode |
| `V14RunControlStateTests` | SENSOR_CHECK→ACTIVE→PAUSED→RESUMED 전이별 pause/finish interactable | EditMode |
| `V14MetricsIncrementalTests` | 3,600표본 증분 계산 == 전체 순회 계산 (거리 ±1m, 시간 ±1s) | EditMode |
| `canonical-run-null-record-id` | source_record_id NULL/빈문자/공백에서 duplicate=false, 보상 지급 | pgTAP + node |
| `canonical-run-concurrent` | 동시 이중 출처 업로드 → canonical 1행, 보상 1회 | pgTAP |
| `v14-dead-control.test.mjs` | 이유 문구 없는 interactable=false 컨트롤 0개 | 정적 |

### APK 배포 증거 (Unity exit code만으로 성공이라 하지 않는다)

1. 새 APK의 `sha256sum` 출력
2. `adb install -r` 성공 로그
3. `adb shell pm clear kr.robom.runningup` 후 cold launch (`am start -W` 의 TotalTime)
4. Home 캡처
5. `adb logcat -d | grep -i "FATAL\|AndroidRuntime"` 결과가 비어 있음
6. **뒤로가기 매트릭스 캡처** — 13개 화면 × (하드웨어 back / 제스처 back / 화면 내 BACK)

---

## 5. 우선순위 요약

| 순위 | 작업 | 사용자가 겪는 증상 |
|---|---|---|
| 0 | FIX-00 | V14 코드가 원격에 없어 아무것도 고칠 수 없다 |
| 1 | FIX-01 | 뒤로가기 입력이 앱에 도달조차 못 한다 |
| 1 | FIX-13 | 뛴 러닝이 보상 없이 사라진다 |
| 2 | FIX-02, FIX-03, FIX-04, FIX-05 | 뒤로가기 무동작 · 화면에 갇힘 |
| 2 | FIX-06, FIX-07 | 상단 HUD와 홈 버튼이 눌리지 않는다 |
| 3 | FIX-09, FIX-11, FIX-14 | PAUSE 죽음 · 러닝 후반 프레임 드랍 · 이중 보상 |
| 4 | FIX-08, FIX-10, FIX-12, FIX-15, FIX-16 | 오이동 · 컨텐츠 잘림 · 유휴 낭비 · 죽은 버튼 · 부팅 복원 |

---

## 6. 블로커 — 외부 정보가 있어야만 진행되는 항목

`CURRENT_IMPLEMENTATION_AUDIT_KO.md`의 기존 블로커에 더해, 이 분석에서 새로 확인된 것:

1. **V14 Unity 프로젝트 전체 소스** — 원격 저장소에 없다. FIX-00 없이는 FIX-01~16을 적용·검증할 수 없다.
2. `AndroidManifest.xml`과 `ProjectSettings` — targetSdk 36 확인은 logcat으로 했으나
   매니페스트와 CanvasScaler 기준 해상도를 못 봐서 FIX-06/FIX-10의 수치를 확정하지 못했다.
3. `V14JourneyRuntime.cs` / `V11AndroidRunBridge.cs` — `V14TrainingState`의 `RESUMED` 의미(FIX-09)와
   bridge의 `capturing` 발행 주기(FIX-03)를 소스로 확인해야 한다.
4. 원격 Supabase 프로젝트 URL / publishable key / 사용자 승인 — FIX-13/14의 원격 검증에 필요.
5. 실기기 + 야외 경로 — FIX-06(safe area)과 FIX-11(성능)의 최종 증거에 필요.

원격 배포, GitHub Release, 데이터 삭제는 사용자 승인 없이 실행하지 않는다.

---

## 참고 출처

- [Behavior changes: Apps targeting Android 16 or higher — Android Developers](https://developer.android.com/about/versions/16/behavior-changes-16)
- [Add support for the predictive back gesture — Android Developers](https://developer.android.com/guide/navigation/custom-back/predictive-back-gesture)
- [Input.backButtonLeavesApp — Unity Scripting API](https://docs.unity3d.com/ScriptReference/Input-backButtonLeavesApp.html)
- [PL/pgSQL: PERFORM and the FOUND variable — Tom Lane, pgsql-general](https://www.postgresql.org/message-id/23025.1098734547%40sss.pgh.pa.us)
- [plpgsql_check: PL/pgSQL Linter — Supabase Docs](https://supabase.com/docs/guides/database/extensions/plpgsql_check)
