# 디자인은 어디에 있는가 — 화면별 파일 지도

> 저장소: `runningup706/runningup` · 브랜치 `claude/runningup-v14-handoff-hr19xk`
> 모든 경로는 저장소 루트 기준입니다.

---

## 먼저 알아야 할 것 — 이 앱의 UI는 **씬이 아니라 코드**로 만들어집니다

보통 Unity 앱은 에디터에서 버튼을 끌어다 배치하고 그게 `.unity` 씬 파일에 저장됩니다.
**이 프로젝트는 그렇지 않습니다.**

씬 파일은 2개뿐이고, 그마저도 빌드할 때 `V11ProjectBuilder.cs` 가 **자동으로 다시
생성**합니다. 화면의 모든 요소 — 버튼 위치, 글자 크기, 색, 여백 — 는 C# 코드가 실행 시점에
만들어냅니다.

**따라서 디자이너에게 "씬 파일을 열어서 고쳐 주세요" 라고 하면 안 됩니다.**
고칠 곳은 아래 C# 파일들이고, 씬을 직접 수정하면 다음 빌드 때 덮어써집니다.

| | |
|---|---|
| 화면 UI 코드 | **`client/unity/Assets/RunningUp/V14/UI/V14ScreenFlowController.cs`** (3,661줄) |
| 그림 파일 | `client/unity/Assets/RunningUp/ProductionArt/VisualSliceAssets/` (PNG 15개) |
| 폰트 | `client/unity/Assets/RunningUp/Fonts/NotoSansKR-V11.ttf` |
| 3D 재질·애니메이션 | `client/unity/Assets/RunningUp/Generated/` |
| 씬 (자동 생성 — 직접 고치지 말 것) | `client/unity/Assets/RunningUp/Scenes/LiveJourneyHome.unity` |

---

## 화면 하나하나가 어느 함수에 있는가

전부 `V14/UI/V14ScreenFlowController.cs` 한 파일 안에 있습니다.
**"홈 화면 고쳐 주세요" → "그 파일의 `BuildHome()` 함수요"** 라고 말하면 됩니다.

| 앱에서 보이는 화면 | 함수 | 줄 |
|---|---|---|
| 홈 (2.5D 라이브 저니) | `BuildHome()` | 540 |
| 상단 HUD (거리·페이스·심박) | `BuildTopHud()` | 440 |
| 하단 내비게이션 바 | `BuildBottomNavigation()` | 490 |
| 좌측 상태 레일 | `BuildStatusRail()` | 526 |
| 동기화 | `BuildSync()` | 688 |
| 트레이닝 선택 | `BuildTraining()` | 872 |
| 러닝 중 화면 | `BuildActiveTraining()` | 1002 |
| 매치메이킹 | `BuildMatchmaking()` | 1070 |
| 트레이닝 결과 | `BuildTrainingResult()` | 1177 |
| 대기실 | `BuildLobby()` | 1232 |
| 라이브 레이스 | `BuildLiveRace()` | 1277 |
| 레이스 결과 | `BuildRaceResult()` | 1365 |
| 활동 기록 | `BuildActivityHistory()` | 1394 |
| 캐릭터 | `BuildCharacter()` | 1435 |
| 월드 | `BuildWorld()` | 1538 |
| 먼슬리 에이펙스 | `BuildMonthlyApex()` | 1621 |
| 크루 | `BuildCrew()` | 1674 |
| 설정 | `BuildSettings()` | 1807 |

> 줄 번호는 커밋 `77086a5` 기준입니다. 코드가 바뀌면 달라지므로, 찾을 때는 함수 이름으로
> 검색하는 것이 안전합니다: `grep -n "BuildHome" V14ScreenFlowController.cs`

---

## 색을 바꾸려면 → **`Design/` 폴더 한 곳**

`client/unity/Assets/RunningUp/Design/V14Design.cs`

색은 이제 흩어져 있지 않습니다. 이름 붙은 토큰 18개가 이 파일 하나에 있고, 화면 코드는
그걸 참조만 합니다. **한 줄 고치면 그 색을 쓰는 모든 화면이 바뀝니다.**

```csharp
public static readonly Color SurfaceDeep = new(0.005f, 0.03f, 0.065f);
```

투명도는 값에 넣지 않고 쓰는 쪽에서 `.Alpha(0.86f)` 로 지정합니다. 같은 색을 여러
투명도로 겹쳐 층을 만드는 것이 이 앱 배경의 구조입니다.

| 종류 | 토큰 |
|---|---|
| 배경 8 | `SurfaceDeep` `SurfaceDeepCool` `SurfaceMid` `SurfacePanel` `SurfacePanelWarm` `SurfaceSlate` `SurfaceTeal` `Scrim` |
| 글자 3 | `TextMuted` `TextSecondary` `TextPlaceholder` |
| 버튼 3 | `ButtonHighlighted` `ButtonPressed` `ButtonDisabled` |
| 아트 스와치 4 | `Swatch*` — 승인된 기준색, 임의 변경 시 아트 게이트에 걸림 |

각 토큰이 어느 화면에 보이는지는 [`Design/README_KO.md`](../client/unity/Assets/RunningUp/Design/README_KO.md) 에
표로 있습니다.

> 이 정리를 하면서 **화면에 보이는 색은 한 값도 바꾸지 않았습니다.**
> `tests/design-tokens.test.mjs` 가 정리 전 33개 값과 대조해 증명합니다.
>
> 아직 남은 것: **크기·여백은 여전히 코드 안**에 있습니다. 그것까지 모으는 작업이
> 필요하면 말씀해 주십시오.

---

## 그림을 바꾸려면

`client/unity/Assets/RunningUp/ProductionArt/VisualSliceAssets/`

| 파일 | 무엇 |
|---|---|
| `MyRunnerHero.png` | 내 러너 캐릭터 |
| `PacerGreen/Orange/Gray/Cap/Group.png` | 같이 뛰는 페이서들 |
| `FarCityBackground.png` | 먼 배경 도시 |
| `MidCitySides.png` | 중간 거리 건물 |
| `ForegroundRoad.png` | 앞쪽 도로 |
| `TopHudTarget.png` · `BottomNavTarget.png` · `RouteHudTarget.png` | HUD 배치 기준 이미지 |
| `StatDistanceTarget.png` · `StatPaceTarget.png` · `StatHeartTarget.png` | 통계 표시 기준 이미지 |

**같은 파일 이름으로 덮어쓰면** 코드를 안 고쳐도 반영됩니다. 크기(픽셀)는 되도록 맞추는
편이 안전합니다.

`...Target.png` 로 끝나는 것들은 실제로 화면에 보이는 그림이 아니라 **"이렇게 보여야
한다"는 기준 이미지**입니다. `V11ProductionArtGate.cs` 가 실제 렌더 결과를 이것과 비교해
검사합니다.

---

## 3D 러너와 애니메이션

| | |
|---|---|
| 러너 프리팹 | `Generated/Prefabs/MyRunnerV11.prefab` |
| 재질(색·질감) | `Generated/Materials/` — `MyRunnerV11Mint.mat`, `Road.mat`, `Grass.mat` 등 15개 |
| 동작 | `Generated/Animations/` — `easy_jog`, `tempo_run`, `interval_sprint`, `final_kick`, `finish`, `cheer`, `idle_stretch`, `tired_but_proud`, `steady_run` |

`Generated/` 라는 이름 그대로 **`V11PremiumRunnerBaker.cs` 가 생성**합니다. 직접 고치면
다음 빌드에 사라질 수 있으니, 지속적인 변경은 그 스크립트를 고쳐야 합니다.

---

## 디자이너/외주에게 이렇게 전달하세요

> RunningUp 안드로이드 앱입니다. Unity로 만들었는데 **UI가 씬이 아니라 C# 코드로**
> 생성됩니다. 씬 파일을 고치면 빌드할 때 덮어써집니다.
>
> **저장소:** https://github.com/runningup706/runningup
> **브랜치:** `claude/runningup-v14-handoff-hr19xk`
>
> **화면 레이아웃·색·글자:**
> `client/unity/Assets/RunningUp/V14/UI/V14ScreenFlowController.cs`
> 화면마다 `BuildHome()`, `BuildTraining()` 같은 함수가 하나씩 있습니다.
>
> **그림:** `client/unity/Assets/RunningUp/ProductionArt/VisualSliceAssets/`
> **폰트:** `client/unity/Assets/RunningUp/Fonts/`
> **3D 재질·애니메이션:** `client/unity/Assets/RunningUp/Generated/`

---

## ⚠️ 바꿀 때 주의 — 자동 검사에 걸리는 것들

디자인을 고쳐도 아래는 **테스트가 막습니다.** 무시하고 바꾸면 빌드가 실패합니다.

| 하면 안 되는 것 | 막는 곳 |
|---|---|
| 화면 안에 뒤로가기 버튼 추가 (3개 초과) | `tests/v14-back-navigation.test.mjs` |
| 내비게이션 버튼이 `Show()` 를 직접 호출 | 같은 파일 — `GoTo()` 를 써야 뒤로가기가 동작합니다 |
| 전투·보스·몬스터·무기 관련 문구나 이미지 | `tools/direction-lock/scan.mjs` (DL-6) |
| 월드 크라운 위의 등급 표시 | 같은 스캐너 (DL-1) |
| 트레일·등산·자전거 관련 표현 | 같은 스캐너 (DL-3) |
| 체크포인트를 `42 KM` 로 반올림 표시 | `42.195 KM` 이어야 합니다 (DL-1) |

바꾼 뒤에는 이것만 돌려보면 됩니다:

```bash
npm run test:fast
```
