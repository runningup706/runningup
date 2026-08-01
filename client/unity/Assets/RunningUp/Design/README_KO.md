# Design — 디자인을 바꾸는 곳

이 폴더가 **UI 디자인의 단일 출발점**입니다. 색을 바꾸려면 여기부터 보십시오.

| 파일 | 무엇 |
|---|---|
| `V14Design.cs` | **색 토큰 18개.** 배경 8 · 글자 3 · 버튼 상태 3 · 아트 스와치 4 |

---

## 색 바꾸기

`V14Design.cs` 에서 **한 줄만** 고치면 그 색을 쓰는 모든 화면에 반영됩니다.

```csharp
public static readonly Color SurfaceDeep = new(0.005f, 0.03f, 0.065f);
//                                              R      G      B      ← 0.0 ~ 1.0
```

포토샵의 `#RRGGBB` 를 쓰려면 255 로 나눕니다.

```csharp
// #1A3D5C
public static readonly Color SurfaceDeep = new(26f / 255f, 61f / 255f, 92f / 255f);
```

투명도는 값에 포함하지 않습니다. 쓰는 쪽에서 `.Alpha(0.86f)` 로 지정합니다.
같은 색을 여러 투명도로 겹쳐 층을 만드는 것이 이 앱의 배경 구조입니다.

### 어떤 토큰이 어디에 보이나

| 토큰 | 화면에서 |
|---|---|
| `SurfaceDeep` | 러닝 중 · 레이스 등 몰입 화면의 바닥 |
| `SurfaceDeepCool` | 라이브 레이스 계열 패널 (아주 살짝 푸른 쪽) |
| `SurfaceMid` | 결과 · 캐릭터 · 좌측 상태 레일 |
| `SurfacePanel` | 동기화 · 크루 화면의 떠 있는 카드 |
| `SurfacePanelWarm` | 트레이닝 화면 카드 |
| `SurfaceSlate` | 캐릭터 화면의 비활성 슬롯 |
| `SurfaceTeal` | 캐릭터 화면의 선택된 슬롯 |
| `Scrim` | 모달 뒤를 덮는 막 |
| `TextMuted` / `TextSecondary` / `TextPlaceholder` | 본문 / 보조 설명 / 입력창 안내 |
| `ButtonHighlighted` / `ButtonPressed` / `ButtonDisabled` | 버튼 상태 |
| `Swatch*` | 설정 화면의 승인된 아트 기준색 — 임의 변경 시 아트 게이트에 걸림 |

---

## 배치·글자 크기 바꾸기

색과 달리 **레이아웃은 아직 코드 안에** 있습니다.

`../V14/UI/V14ScreenFlowController.cs` — 화면마다 `BuildHome()`, `BuildTraining()` 같은
함수가 하나씩 있습니다. 전체 지도는 [`docs/DESIGN_MAP_KO.md`](../../../../docs/DESIGN_MAP_KO.md).

> 크기·여백까지 이 폴더로 모으는 작업은 아직 하지 않았습니다. 필요하면 요청하십시오.
> 색만 먼저 모은 이유는, 색이 33군데로 가장 많이 흩어져 있었고 가장 자주 바뀌기 때문입니다.

---

## 그림 · 폰트

이 폴더에 있지 않습니다. 원본 파일 그대로 교체하는 방식입니다.

| | 위치 |
|---|---|
| 그림 (PNG 15개) | `../ProductionArt/VisualSliceAssets/` |
| 폰트 | `../Fonts/NotoSansKR-V14.ttf` |
| 3D 재질 · 애니메이션 | `../Generated/` — **자동 생성물.** 직접 고치면 다음 빌드에 사라집니다 |

---

## ⚠️ 씬 파일은 고치지 마십시오

`../Scenes/LiveJourneyHome.unity` 는 빌드할 때 `../Editor/V14ProjectBuilder.cs` 가
**다시 만듭니다.** Unity 에디터에서 손으로 옮긴 것은 다음 빌드에 사라집니다.

---

## 바꾼 뒤

```bash
npm run test:fast
```

`tests/design-tokens.test.mjs` 가 이런 것들을 잡습니다.

- 화면 코드에 `new Color(...)` 를 직접 쓴 경우 → **실패.** 이 파일에 넣으십시오
- 정의만 하고 안 쓰는 토큰 → **실패.** 아무도 못 보는 색입니다
- 없는 토큰을 참조 → **실패**

의도적으로 색을 바꿨다면 그 테스트의 `BEFORE` 배열도 함께 갱신해야 합니다.
그 배열은 "실수로 바뀐 것"과 "일부러 바꾼 것"을 구분하는 장치입니다.
