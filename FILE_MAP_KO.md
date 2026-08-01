# 내가 한 말이 어느 파일인가

오너가 쓰시는 표현을 실제 파일에 연결한 표입니다.
**이 파일을 외우실 필요는 없습니다.** Issue 에 쉬운 말로 쓰시면 제가 찾아갑니다.
"저건 대체 어디 있는 거지" 싶을 때만 보십시오.

---

## 화면 — "이 화면 바꿔주세요"

앱 화면은 **씬 파일이 아니라 C# 코드 한 곳** 에서 만들어집니다.
Unity 에디터에서 손으로 옮긴 것은 다음 빌드에 사라집니다.

**`client/unity/Assets/RunningUp/V14/UI/V14ScreenFlowController.cs`**

| 오너 표현 | 그 안의 함수 |
|---|---|
| 첫 화면 / 메인 | `BuildHome()` |
| 기록 가져오기 | `BuildSync()` |
| 러닝 시작 준비 | `BuildTraining()` |
| 러닝 중 화면 | `BuildActiveTraining()` |
| 러닝 끝난 뒤 결과 | `BuildTrainingResult()` |
| 상대 찾는 중 | `BuildMatchmaking()` |
| 출발 전 대기 | `BuildLobby()` |
| 레이스 중 | `BuildLiveRace()` |
| 레이스 결과 | `BuildRaceResult()` |
| 지난 러닝 기록 | `BuildActivityHistory()` |
| 캐릭터 | `BuildCharacter()` |
| 세계 지도 | `BuildWorld()` |
| 월간 여정 (1,000km) | `BuildMonthlyApex()` |
| 크루 | `BuildCrew()` |
| 설정 | `BuildSettings()` |
| 맨 위 띠 | `BuildTopHud()` |
| 맨 아래 메뉴 | `BuildBottomNavigation()` |

화면 목록과 각 화면의 뒤로가기 규칙: **`docs/registry/SCREEN_REGISTRY.yaml`**

---

## 색 · 글자 · 배치 — "이 색이 마음에 안 들어요"

| 오너 표현 | 파일 |
|---|---|
| **색** (배경 · 글자 · 버튼) | `client/unity/Assets/RunningUp/Design/V14Design.cs` |
| 색 바꾸는 법 설명 | `client/unity/Assets/RunningUp/Design/README_KO.md` |
| 배치 · 글자 크기 | 아직 화면 코드 안에 (위의 `Build...()`) |
| 그림 파일 (PNG) | `client/unity/Assets/RunningUp/ProductionArt/VisualSliceAssets/` |
| 글꼴 | `client/unity/Assets/RunningUp/Fonts/NotoSansKR-V14.ttf` |
| 전체 디자인 지도 | `docs/DESIGN_MAP_KO.md` |

색은 한 줄만 고치면 그 색을 쓰는 화면 전부에 반영됩니다.

---

## 숫자 — "1,000km 를 / 121개를 / 개수를 바꿔주세요"

**중요한 숫자는 전부 한 파일에만 있습니다.** 여기저기 흩어져 있지 않습니다.

**`packages/domain/constants.mjs`**

| 오너 표현 | 그 안의 이름 |
|---|---|
| 한 달 최종 1,000km | `DIRECTION_LOCK.FINAL_APEX_METERS` |
| 체크포인트 121개 | `DIRECTION_LOCK.CHECKPOINT_COUNT` |
| 체크포인트 위치 전부 | `APEX_CHECKPOINT_METERS` |
| 등급 이름 (World Crown 등) | `MAJOR_RANKS` |
| 고를 수 있는 거리·시간·스타일 | `GOAL_DISTANCES` / `GOAL_DURATIONS` / `SESSION_STYLES` |
| **콘텐츠 최소 개수 전부** | `LAUNCH_CONTENT_FLOOR` |
| **규모 기준** (24 · 200 · 600 · 120 · 18 · 50~100) | `SCALE_FLOOR` |

> 이 숫자들은 **줄일 수 없습니다.** 줄이면 빌드가 실패합니다.
> 늘리는 건 됩니다. 규칙은 `현재값과 기준값 중 큰 쪽` 입니다.

---

## 콘텐츠 — "캐릭터를 / 옷을 / 코스를 바꿔주세요"

**생성된 결과물이 아니라 원본 표를 고칩니다.** 결과물은 자동으로 다시 만들어집니다.

| 오너 표현 | 원본 파일 |
|---|---|
| 대륙 · 지역 · 코스 · 레이스 · 챔피언 | `tools/content-factory/world/world-design.mjs` |
| 플레이어블 러너 12명 · 테크닉 · 기어 | `tools/content-factory/characters/character-design.mjs` |
| **내 러너 기본 스타일 24종** | `tools/content-factory/characters/my-runner-design.mjs` |
| **옷 · 세트 · 장착 슬롯** | `tools/content-factory/characters/wardrobe-design.mjs` |
| **세계 러너 204명** | `tools/content-factory/characters/world-runner-design.mjs` |
| **Global Event 6종** | `tools/content-factory/events/global-event-design.mjs` |

> `content/launch/**` 와 `backend/supabase/seed.sql` 은 **자동 생성물** 입니다.
> 직접 고치면 다음 생성 때 사라집니다.

---

## 규칙 — "이건 절대 이렇게 돼야 해요"

| 오너 표현 | 파일 |
|---|---|
| 절대 안 바뀌는 제품 방향 6가지 | `docs/USER_DIRECTION_LOCK.md` |
| 그걸 기계가 읽는 형태 | `content/schemas/direction_lock.json` |
| 어기면 잡아내는 검사 | `tools/direction-lock/scan.mjs` |

여섯 가지: ① 1,000km 가 끝 ② 초보 강제 잠금 없음 ③ 러닝만 ④ 출시 콘텐츠 최소치
⑤ 검증된 러닝만이 힘 ⑥ 전투 없음

---

## 서버 · 데이터 저장

| 오너 표현 | 파일 |
|---|---|
| 데이터 구조 변경 | `backend/supabase/migrations/` (번호 순서대로) |
| 처음 넣는 데이터 | `backend/supabase/seed.sql` — **자동 생성물** |
| 데이터 검사 | `backend/supabase/tests/pgtap/` |
| 누가 뭘 볼 수 있나 | `docs/RLS_MATRIX.md` |
| 전체 데이터 구조 설명 | `docs/DATABASE_SCHEMA.md` |

---

## 빌드 · 배포

| 오너 표현 | 파일 |
|---|---|
| APK 만드는 자동 절차 | `.github/workflows/android-apk.yml` |
| APK 만드는 법 설명 | `docs/ANDROID_BUILD.md` |
| 자동 검사 절차 | `.github/workflows/` |

---

## 자주 나오는 질문

**"화면에서 글자만 바꾸고 싶어요"**
→ `V14ScreenFlowController.cs` 의 해당 `Build...()` 함수. 앱 안 글자는 영어입니다.

**"콘텐츠 개수를 늘리고 싶어요"**
→ `packages/domain/constants.mjs` 의 `LAUNCH_CONTENT_FLOOR` 를 올리고, 위의 원본 표에
실제 내용을 채웁니다. 개수만 올리면 검사에서 실패합니다.

**"씬 파일을 직접 고치면 안 되나요"**
→ 안 됩니다. `.unity` 파일은 빌드할 때마다 다시 만들어집니다.

**"어디 있는지 모르겠어요"**
→ 그냥 Issue 에 쉬운 말로 쓰십시오. 찾는 건 제 일입니다.
