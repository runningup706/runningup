# RunningUp V14 — 최종 통합 수정 프롬프트

> 작성 2026-07-31 · 저장소 `runningup706/runningup` · 브랜치 `claude/runningup-v14-handoff-hr19xk`
>
> 이 문서는 세 가지를 하나로 합친 **최종 실행 지시문**이다.
> 1. 내가 1차로 직접 소스를 읽어 찾은 결함 (`docs/V14_FUNCTION_FIX_PROMPT_KO.md`, FIX-00~16)
> 2. ChatGPT가 만든 11-Pass 슈퍼 프롬프트의 지적 — **한 건씩 실제 코드·로그로 교차 검증한 결과**
> 3. 사용자가 의심한 **"깃허브에 버전 안 맞는 옛날 자료가 남아 있다"** 를 실제로 감사한 결과
>
> 모든 주장에는 파일 경로·줄 번호·명령 출력·GitHub Actions 기록이 붙어 있다. 증거 없는 항목은
> `미검증`으로 표시했다.

---

## 0. 절대 불변 — 디자인은 건드리지 않는다

- 세로형 2.5D Live Journey Home, premium chibi My Runner, pacer, 도시 차선, 카메라 구도.
- 얇은 한 줄 상단 HUD · 중앙 Journey 패널 · 운동 스탯 HUD · 하단 스탯 카드 · 중앙 RUN CTA.
- 색상 상수, 폰트 크기, 문구, 배치 비율, `approvedJourneyBackdrop` / `approvedHomeRoot` 계층.
- 전투·몬스터·무기·피해량·공격 스킬·V5 RPG 전투 데이터는 **활성 런타임에 되살리지 않는다.**

**허용되는 시각 변화는 세 가지뿐이다.**
1. Safe area(노치·제스처바) 만큼의 **오프셋 이동** — 크기·비율 유지.
2. 화면 밖으로 넘친 컨텐츠를 **스크롤 가능**하게 — 좌표·크기 유지.
3. 로딩 / 오류 / 빈 상태 / 재시도 / disabled reason / 확인 dialog를 **현재 디자인 시스템 안에서만** 추가.

---

## 1. 저장소 버전 감사 — 사용자의 의심이 맞다

명령을 실제로 실행해 확인한 결과다.

### 1.1 저장소에 담긴 것은 V14가 아니라 V11 이전 세대다

```
$ git ls-files | wc -l
134

$ git ls-files | awk -F/ '{print $1}' | sort | uniq -c | sort -rn
  31 tools    31 content    25 docs    16 backend    7 .github    6 native    6 client

$ git ls-tree -r --name-only origin/main | grep -c "V14\|ScreenFlow\|RunVerification"
0
```

- 추적 파일이 **134개**다. V14 Unity 프로젝트 하나만 해도 수천 개다.
- `client/unity/Assets/RunningUp/` 아래 실제 파일은 **2개** (`MonthlyApexLadder.cs`, `RunningUp.Progression.asmdef`).
- 원격 세 브랜치(`main`, `claude/runningup-3d-android-dev-3c8gnp`, `agent/runningup-v5-full-apk`)
  어디에도 `V14/`, `RunVerification/`, `tests/v14-*`가 없다.
- `origin/main` 최신 커밋은 `ab69f06 feat(game): the game now runs — battle engine ...`
  즉 **삭제 대상인 V5 전투 런타임**이 기본 브랜치의 최신 상태다.

### 1.2 숫자가 서로 충돌한다 — 문서가 아니라 DB 제약 수준에서

| 항목 | 저장소(현재) | V14 인계 스펙 | 저장소 쪽 강제 수단 |
|---|---:|---:|---|
| 월간 체크포인트 | **52** | **120** | `check (checkpoint_count = 52)`, `index between 1 and 52` |
| Region 노드 | **96** | **192** | 시드 게이트 `('region_nodes', count(*), 96)` |
| 코스 | 개념 없음 | **2,304** | — |
| 장착 코스메틱 | **96** | 600 아이템 + 120 세트 | 시드 게이트 `('equipable_cosmetics', count(*), 96)` |
| 플레이어블 캐릭터 | 12 (전투 캐릭터) | 24 My Runner + 200 pacer | 콘텐츠 검증기 하드 카운트 |
| 전투 스테이지 / 적 / 보스 | **필수 floor** (72/24/12/4/1) | **금지** | `tools/content-validator` 빌드 게이트 |

확인 명령:

```
$ node -e "import('./packages/domain/constants.mjs').then(m=>console.log(
    m.DIRECTION_LOCK.CHECKPOINT_COUNT, m.APEX_CHECKPOINT_METERS.length))"
52 52

$ grep -n "apex_checkpoint_count_is_52" backend/supabase/migrations/0003_monthly_apex.sql
36:  constraint apex_checkpoint_count_is_52   check (checkpoint_count = 52)
42:  index integer not null check (index between 1 and 52),
```

V14 클라이언트 쪽:

```
$ node -e '...MonthlyCheckpointsKm 배열 길이...'
V14 client checkpoint count: 120 | first: [1,2,3,4,5] | last: [972,986,1000]
```

**결론: V14 클라이언트를 이 백엔드에 붙이면 체크포인트가 DB CHECK 제약에 걸려 거부된다.**
문서 불일치가 아니라 **구조적 비호환**이다. 어느 쪽 숫자가 정본인지 사용자가 확정해야 한다.

### 1.3 방향 잠금 문서 자체가 서로 모순이다

`docs/USER_DIRECTION_LOCK.md`는 **v4.0.0** 이고, DL-4가 **전투 콘텐츠를 필수 출시 floor로 요구**한다.

> | Main battle stages | 72 | · | Standard enemy families | 24 | · | Continent bosses | 12 |
> 모든 12대륙이 첫 로그인부터 "**battle-able**, restorable, **boss-clearable**" 이어야 한다.

반면 V14 인계 잠금(`USER_DIRECTION_LOCK_V11.yaml`, 마스터 프롬프트)은
**전투·몬스터·무기·피해량·공격 스킬을 활성 런타임에 되살리는 것을 금지**한다.

그리고 `tools/direction-lock/scan.mjs`는 **옛 v4.0.0 잠금을 강제**한다. 실행 결과:

```
$ node tools/direction-lock/scan.mjs
direction-lock scan: 124 files scanned, 19 concept patterns
No direction-lock violations.
```

**전투 엔진(`packages/domain/battle.mjs`, `tests/battle.test.mjs`, `client/cli/play.mjs`)이
저장소에 살아 있는 채로 방향 잠금 검사가 통과한다.** 잠금 장치가 옛 방향을 지키고 있어서
V14 방향을 위반해도 아무도 막지 못한다.

### 1.4 제품 정체성 문자열이 옛 버전에 멈춰 있다

| 위치 | 현재 내용 |
|---|---|
| `package.json:5` | `"RunningUp — 3D real-run linked idle action RPG..."` |
| `README.md:3` | `A 3D real-run linked idle action RPG for Android.` |
| `README.md` 요약 | `52 checkpoints from 0 to 1000 km` |
| `client/cli/play.mjs:114` | `3D real-run linked idle RPG · terminal client` |
| `VERSION` / `package.json` | `0.1.0-alpha.1` (2026-07-29) — V14 표기 없음 |
| `CHANGELOG.md` | 최신 항목이 `[0.1.0-alpha.1] — 2026-07-29`, V14 기록 없음 |
| `docs/CURRENT_STATE.md:3` | `Last updated: 2026-07-29 · Branch claude/runningup-3d-android-dev-3c8gnp` |
| `docs/READ_COMPLETE.md` | v4.0.0 번들 SHA 기준 |
| `CODEX_HANDOFF.md:3` | `2026-07-29 · 커밋 ce24a08` |
| `HANDOFF.md:3` | `2026-07-29 · 브랜치 claude/runningup-3d-android-dev-3c8gnp` |

`requirements/REQUIREMENTS_TRACEABILITY.csv`는 49개 요구사항 전부가 v4.0.0 마스터 프롬프트
기준이며, `DL1-APEX-002 = Exactly 52 checkpoints` 가 **`PASS`** 로 기록돼 있다.

### 1.5 옛 브랜치가 그대로 남아 있다

```
$ git ls-remote --heads origin
f204b9b  refs/heads/agent/runningup-v5-full-apk          ← V5 세대
6b0f700  refs/heads/claude/runningup-3d-android-dev-3c8gnp ← V11 세대, main보다 뒤처짐
745656e  refs/heads/main
```

---

## 2. CI 감사 — 7개 중 2개는 **한 번도 통과한 적이 없다**

GitHub Actions 실행 기록을 직접 조회한 결과다.

| 워크플로 | 전체 실행 | 통과 | 상태 |
|---|---:|---:|---|
| `direction-lock` | — | ✅ | 통과 (단, 옛 잠금을 검사 — §1.3) |
| `content-validation` | — | ✅ | 통과 |
| `unit-tests` | — | ✅ | 통과 |
| `unity-domain-tests` | — | ✅ | 통과 |
| `kotlin-tests` | — | ✅ | 통과 |
| **`security-scan`** | **15** | **0** | **전 커밋 실패** |
| **`supabase-tests`** | **15** | **0** | **전 커밋 실패** |

```
security-scan  : failure ×15  (b9d16784 … 745656eb … 3bfe9d1b)
supabase-tests : failure ×15  (b9d16784 … 745656eb … 3bfe9d1b)
```

그런데 `docs/CURRENT_STATE.md`는 이렇게 적어 놓았다.

> | PostgreSQL 16 + pgTAP 1.3.2 | **PASS** | `bash scripts/db.sh` — 1128 tests, 7 suites |

로컬에서만 통과한 결과가 CI에서는 **한 번도 재현된 적이 없는데 PASS로 기록**돼 있다.
이것이 "증거 없는 PASS 금지" 규칙의 실제 위반 사례다.

### 2.1 `security-scan` 이 실패한 진짜 이유 (수정 완료)

```bash
patterns='service_role|SUPABASE_SERVICE|BEGIN (RSA|OPENSSH|PRIVATE) KEY|ghp_...'
```

`service_role`은 **Supabase의 정상적인 PostgreSQL 역할 이름**이다. 모든 `grant` 구문에
등장하므로 마이그레이션이 추가된 순간부터 이 검사는 영구히 실패한다.

```
backend/supabase/migrations/0006_rls.sql:189: grant ... to service_role;
.gitignore:14: **/service_role*          ← 진짜 키 파일을 막는 규칙이 검사에 걸린다
docs/RLS_MATRIX.md:15, docs/DECISIONS.md:41, tools/release/generate-evidence.mjs:38 ...
```

동시에 **너무 좁기도 했다.** 직접 확인한 결과:

```
$ echo '<RSA 개인키 헤더 한 줄>' | grep -E 'BEGIN (RSA|OPENSSH|PRIVATE) KEY'
OLD PATTERN MISSES REAL RSA PRIVATE·KEY
```

`BEGIN` 과 `KEY` 사이에 단어가 두 개(`RSA` + `PRIVATE`)라서, **가장 흔한 개인키 헤더를 못 잡는다.**
(이 문서는 헤더 원문을 적지 않는다. 적으면 새 스캐너가 이 문서를 비밀 유출로 잡는다 —
실제로 한 번 잡혔고, 그것이 스캐너가 동작한다는 증거다.)
즉 이 검사는 **항상 실패하면서 동시에 진짜 유출은 놓치는** 상태였다.

또 제외 목록의 `docs/SECURITY.md` 는 **저장소에 존재하지 않는 파일**이다.

### 2.2 `supabase-tests` 가 실패한 진짜 이유 (수정 완료)

```
ERROR:  extension "pgtap" is not available
DETAIL: Could not open extension control file
        "/usr/share/postgresql/16/extension/pgtap.control": No such file or directory.
```

워크플로는 PostgreSQL을 **서비스 컨테이너**(`image: postgres:16`)로 띄우고,
`postgresql-16-pgtap`은 **러너 호스트**에 `apt-get install` 했다.
서버와 확장이 **서로 다른 파일시스템**에 있으니 `create extension pgtap`은 영원히 실패한다.

부수 문제도 두 개 확인했다.
- `pg_prove`를 제공하는 패키지는 `libtap-parser-sourcehandler-pgtap-perl`인데 설치 목록에 없었다.
  (`libtap-harness-archive-perl`만 있었다.)
- 컨테이너 로그의 `FATAL: role "root" does not exist`는 헬스체크 부작용으로 무해하다.

---

## 3. ChatGPT 11-Pass 프롬프트 교차 검증 — 항목별 판정

**전체 판정: 지적 대부분이 정확하다.** 특히 내가 1차에서 놓친 P0를 하나 잡아냈다.

| ChatGPT 항목 | 판정 | 증거 |
|---|---|---|
| P0-1 Back/화면 스택 부재 | **정확** | `grep -c "Escape\|OnBackInvoked"` → 0, `Update()` 없음, 백스택 없음 |
| P0-1 transient 화면 잘못 복구 | **정확** | `Awake` 243행이 `PlayerPrefs` 문자열을 그대로 복원 |
| P0-1 승인 Home nav가 index 의존 | **정확** | 566-573행 `destinations` 배열 하드코딩 |
| P0-1 하단 nav가 잠금 5탭과 불일치 | **정확** | 403-410행 `TRAIN`/`RUN` 둘 다 `Screen.Training` |
| P0-2 `journey?.Method()` silent no-op | **정확** | 전 화면에 걸쳐 nullable 호출, 실패 시 `Publish`만 |
| P0-2 debounce/single-flight 없음 | **정확** | `Button()` 헬퍼에 중복 클릭 방지 없음 |
| P0-2 `HELP`가 문구만 띄우는 가짜 액션 | **정확** | 612-621행 `() => Publish("Only provider-authorized...")` |
| **P0-3 `v14-flow-state.json` SELinux 거부** | **정확 — 내가 놓친 P0** | §3.1 |
| P0-4 서버성공-로컬저장 사이 crash window | **정확** | §3.2 |
| P0-5 SQL `FOUND` 오염 | **정확 — 내 1차 분석과 일치** | `perform pg_advisory_xact_lock` → `FOUND=true` |
| P0-5 bucket 경계 동시성 | **정확 — 일치** | `floor(epoch/120)`, `round(distance/100)` |
| P0-5 alias 테이블 부재 / ambiguous 미처리 | **정확, 내 1차보다 강함** | `limit 1`로 임의 병합 |
| P1-1 GPS O(n²) + unbounded list | **정확 — 일치** | `RefreshMetrics` 전체 재순회 |
| P1-2 전체 Destroy/Rebuild | **정확** | `RebuildSettings()` 2129-2140행 |
| P1-3 `renderer.materials` 인스턴스 누적 | **정확** | §3.3 |
| P1-4 8인 slot stale | **정확** | §3.4 |
| P1-4 서버 미로드 시 next checkpoint 조작 | **정확** | §3.5 |
| P1-4 영구 `--/--` placeholder | **정확** | `approvedEnergyText.text = "--/--"` 무조건 대입 |
| 11회(PASS-00~10) 반복 검증 | **부분 채택** | §7 |

### 3.1 (신규 P0) `v14-flow-state.json` SELinux 거부 — 사용자 로그에 실제로 있다

`06_TEST_EVIDENCE/fresh-logcat.txt`:

```
07-31 07:26:07.544 25345 25345 W UnityMain: type=1400 audit(0.0:565):
  avc:  denied  { link } for  name="v14-flow-state.json" dev="fuse" ino=0
  scontext=u:r:untrusted_app:s0:c215,c256,c512,c768
  tcontext=u:object_r:fuse:s0 tclass=file permissive=0 app=kr.robom.runningup
```

읽는 법:
- `dev="fuse"` — Unity의 `Application.persistentDataPath`는 Android에서
  `/storage/emulated/0/Android/data/<pkg>/files`, 즉 **FUSE 기반 외부 저장소**다.
- `denied { link }` — **hard link(`link()`) 시스템 호출이 거부**됐다.
- `permissive=0` — 경고가 아니라 **실제로 차단**됐다.

즉 hard link 기반 원자적 쓰기(temp → link → replace)가 **디바이스에서 실패한다.**
`V11RunRuntime`의 업로드 큐도 같은 경로를 쓴다:

```csharp
var queuePath = Path.Combine(Application.persistentDataPath, "v11-pending-runs.json");
```

**영향:** 앱 재실행 시 화면 상태·세션·업로드 큐가 조용히 사라질 수 있다.
내 1차 분석의 FIX-16(재실행 복구)과 같은 뿌리이고, ChatGPT가 더 깊은 원인을 짚었다.

### 3.2 crash window — 코드로 확인

```csharp
// V11RunRuntime.ConfirmServerAcceptedRun (101-107행)
var applied = progress.ApplyServerAccepted(candidate, serverTimeUtc, out var dailyCompleted);
SaveProgress();                              // ① PlayerPrefs 저장
queue.Acknowledge(candidate.fingerprint);    // ② 큐 ACK
```

- ①과 ② 사이에서 프로세스가 죽으면 서버는 반영됐는데 큐는 남아 재전송 → `duplicate` → 성장 스킵.
- `duplicate` 분기(88-99행)는 **authoritative totals로 reconcile하지 않고 큐만 지운다.**
- `serverTimeUtc`로 `DateTimeOffset.UtcNow`가 넘어온다(`V11VerifiedRunUploader.cs:293`) —
  **서버 시각이 아니라 단말 시각**이다. 단말 시계를 바꾸면 Daily Contract 판정이 흔들린다.
- `DailyContractCompleted`가 `DateTimeOffset.UtcNow.ToString("yyyy-MM-dd")` 즉 **UTC 날짜**를 쓴다
  (`V11RunRuntime.cs:24`). 한국(UTC+9)에서 **오전 9시에 날짜가 바뀐다.**

### 3.3 `renderer.materials` — 확인됨. 게다가 가짜 장착이다

```csharp
private void ApplyEquippedTop()
{
    PlayerPrefs.SetString("runningup.v14.equipped-top", "V13-TOP-BASE-02");   // 항상 같은 ID
    foreach (var renderer in runner?.GetComponentsInChildren<Renderer>(true) ...)
    {
        foreach (var material in renderer.materials)   // ← 접근할 때마다 인스턴스 복제
        {
            if (material.HasProperty("_BaseColor")) material.SetColor("_BaseColor", Blue);
            material.color = Blue;                     // ← 실제 장착이 아니라 색만 파랗게
        }
    }
}
```

- `renderer.materials`는 접근할 때마다 **머티리얼 인스턴스를 복제**해 batching을 깨고 메모리를 누적시킨다.
- 무엇을 샀든 **항상 `V13-TOP-BASE-02`** 를 저장한다.
- 실제 mesh/slot 교체가 아니라 **색상 틴트**다. → "성공 toast만 띄우는 가짜 기능" 금지 조항 위반.

### 3.4 8인 slot stale — 확인됨

```csharp
for (var index = 0; index < lobbySlots.Count && index < labels.Length; index++)
    lobbySlots[index].text = labels[index];
```

`labels.Length`에서 멈춘다. 직전 payload가 8명이고 이번이 5명이면
**슬롯 5·6·7은 옛 러너 이름을 계속 표시**한다. 나머지를 비우는 루프가 없다.

### 3.5 서버 미로드 상태에서 체크포인트를 지어낸다 — 확인됨

```csharp
var monthlyMeters = Math.Max(0L, journey?.LastMonthlyVerifiedMeters ?? 0L);
...
approvedMonthlyText.text  = AccountSummaryLoaded ? $"{monthlyMeters/1000f:0.0} KM" : "-- KM";  // 정직
approvedCheckpointText.text = NextCheckpointLabel(monthlyMeters);                              // 지어냄
```

`NextCheckpointLabel(0)`은 배열 첫 값을 그대로 돌려주므로 **"1 KM"** 을 출력한다.
같은 화면에서 월간 거리는 `-- KM`(미확정)인데 다음 체크포인트는 `1 KM`(확정)으로 보인다.
**로딩 상태와 실제 값이 구분되지 않는다.** 게다가 이 계산은 §1.2의 120개 배열을 쓴다.

---

## 4. 통합 결함 목록 — 최종

`docs/V14_FUNCTION_FIX_PROMPT_KO.md`의 FIX-00~16을 유지하고, 교차 검증에서 추가된 항목을
FIX-17~24로 잇는다. 번호는 재사용하지 않는다.

### 이미 정의된 것 (1차 문서 참조)

| ID | 요약 | 우선순위 |
|---|---|---|
| FIX-00 | V14 소스를 원격 저장소에 올려 단일 진실 확보 | **P0 블로커** |
| FIX-01 | targetSdk 36 predictive back → 입력을 앱까지 전달 | P0 |
| FIX-02 | 진짜 백스택 도입 | P0 |
| FIX-03 | 런타임 강제 이동이 사용자 back을 덮어쓰지 못하게 | P0 |
| FIX-04 | 전 화면 일관된 BACK 컨트롤 | P0 |
| FIX-05 | ActiveTraining / LiveRace 막다른 상태 제거 | P0 |
| FIX-06 | Safe area 실제 적용 (컷아웃 109px > HUD 92px) | P0 |
| FIX-07 | 승인 홈 배선 초기화 순서 문제 제거 | P0 |
| FIX-08 | 홈 내비 매핑을 데이터로 분리 | P1 |
| FIX-09 | `RESUMED`에서 PAUSE 죽는 비대칭 | P0 |
| FIX-10 | 스크롤 + raycastTarget 정리 | P1 |
| FIX-11 | GPS 지표 증분 계산 (O(n²) → O(1)) | P0 최적화 |
| FIX-12 | 갱신 범위를 보이는 화면으로 축소 | P1 |
| FIX-13 | Supabase `FOUND` 오염 수정 | **P0 보상 유실** |
| FIX-14 | Supabase 락·인덱스·ledger 조회 정합성 | P0 |
| FIX-15 | 죽은 컨트롤 제거 또는 이유 명시 | P1 |
| FIX-16 | 재실행 복구가 죽은 화면으로 부활 금지 | P1 |

### 신규

---

#### FIX-17 · 저장소 버전 정합 — 정본 숫자 확정 · **P0 · 사용자 결정 필요**

```
문제: 체크포인트 52 vs 120, region 96 vs 192, cosmetics 96 vs 600+120 등이 충돌하고,
      52쪽은 DB CHECK 제약과 시드 게이트로 강제되고 있어 V14 클라이언트를 붙이면 거부된다.

작업:
  1) 사용자에게 정본을 확정받는다. 코드를 먼저 고치지 않는다.
     질문 A: 월간 체크포인트는 52인가 120인가?
     질문 B: Region은 96인가 192인가? 2,304 코스는 region 하위 계층인가?
     질문 C: 장착 아이템은 96인가 600 + 120 outfit set인가?
  2) 확정된 값을 packages/domain/constants.mjs 한 곳에만 둔다. 어디에도 재입력하지 않는다.
  3) 마이그레이션은 기존 파일 수정이 아니라 새 migration으로 제약을 바꾼다.
       alter table ... drop constraint apex_checkpoint_count_is_52;
       alter table ... add  constraint apex_checkpoint_count check (checkpoint_count = <정본>);
     index 범위 CHECK와 0005_content.sql의 시드 게이트 수치도 함께 옮긴다.
  4) requirements/REQUIREMENTS_TRACEABILITY.csv의 DL1-APEX-002 등 영향 행을 갱신한다.
  5) content factory를 재실행해 content/**와 seed.sql을 재생성한다. 손으로 고치지 않는다.

검증:
  bash scripts/db.sh
  node tools/content-factory/build.mjs && node tools/content-factory/emit-seed.mjs
  git diff --exit-code -- content backend/supabase/seed.sql
  → V14 클라이언트의 체크포인트 배열과 서버 사다리가 같은 소스에서 나오는지 정적 테스트 추가
```

---

#### FIX-18 · 방향 잠금 문서와 스캐너를 V14로 이관 · **P0 · 사용자 결정 필요**

```
문제: docs/USER_DIRECTION_LOCK.md(v4.0.0)의 DL-4가 전투 콘텐츠를 필수 floor로 요구하는데,
      V14 잠금은 전투를 금지한다. 스캐너는 옛 잠금을 지키고 있어 위반을 막지 못한다.
      (전투 엔진이 살아 있는 채로 `No direction-lock violations` 출력)

작업:
  1) V14 잠금을 정본으로 삼는 docs/USER_DIRECTION_LOCK.md v5 를 만든다.
     기존 파일을 지우지 말고 docs/archive/USER_DIRECTION_LOCK_v4.0.0.md 로 보존한다.
  2) DL-4를 V14 콘텐츠 축(대륙/지역/코스/러너/pacer/의상)으로 다시 쓴다.
  3) tools/direction-lock/scan.mjs 에 V14 금지 개념을 추가한다.
       battle | monster | weapon | damage | attack_skill | enemy_family | boss_phase
     단, 아카이브 경로와 스캐너 자신은 allow-list에 넣는다.
  4) 전투 런타임(packages/domain/battle.mjs, tests/battle.test.mjs, client/cli/play.mjs,
     client/cli/smoke-play.mjs)의 처리 방침을 사용자에게 확인한다.
     선택지: (a) 아카이브 디렉터리로 이동 (b) 삭제 (c) 당분간 유지하되 잠금 예외로 명시
     ※ 임의 삭제 금지. supabase-tests가 smoke-play.mjs에 의존하므로 옮기면 CI도 함께 고친다.
  5) content/schemas/direction_lock.json 도 동기화한다.

검증:
  node tools/direction-lock/scan.mjs   → V14 금지 개념에서 실제로 실패하는지 음성 테스트 추가
```

---

#### FIX-19 · Android 내부 저장소 원자적 상태 저장 · **P0 (신규, ChatGPT 발견)**

```
문제: avc: denied { link } for name="v14-flow-state.json" dev="fuse" ... permissive=0
      Unity persistentDataPath는 FUSE 외부 경로라 hard link 기반 원자적 쓰기가 거부된다.
      상태·큐가 조용히 유실된다.

작업:
  1) 전역 검색으로 실제 구현 위치를 찾는다.
       rg -n "CreateHardLink|File.Replace|AtomicFile|flow-state|persistentDataPath"
  2) Android 경로를 Kotlin bridge의 Context.filesDir(내부 저장소)로 옮긴다.
     androidx.core.util.AtomicFile 또는 동등한 write protocol을 쓴다.
       temp write → flush → FileDescriptor.sync() → close → rename(같은 파일시스템 내)
     hard link는 쓰지 않는다.
  3) 저장 포맷에 schema_version, checksum, written_at, session_id 를 넣는다.
  4) primary / temp / backup 3단 복구 정책을 둔다.
  5) fsync 완료 전에 성공으로 처리하지 않는다.
  6) V11RunRuntime의 업로드 큐 경로(v11-pending-runs.json)도 같은 저장소로 옮긴다.
  7) PlayerPrefs는 단순 로컬 설정 전용으로 강등한다.
     진행·세션·보상 권위 상태를 PlayerPrefs에 두지 않는다.
     (현재 runner progress 전체가 PlayerPrefs JSON 문자열이다 — V11RunRuntime.cs:141)

검증(Android 실기기/에뮬레이터):
  - 저장 → adb shell am force-stop → cold launch → 복구
  - 저장 도중 강제 종료 → primary 또는 backup 복구
  - primary 손상(JSON 잘라내기) → backup 복구 + 오류 기록
  - adb logcat -d | grep "avc: denied.*kr.robom.runningup"  → 0건
```

---

#### FIX-20 · 서버 권위 receipt와 reconcile 상태 머신 · **P0 (신규)**

```
문제: duplicate 분기가 큐만 지우고 로컬을 서버 값으로 맞추지 않는다(V11RunRuntime.cs:88-99).
      서버 커밋과 로컬 저장 사이 crash window가 열려 있다(101-107행).
      serverTimeUtc 자리에 DateTimeOffset.UtcNow(단말 시각)가 들어간다(Uploader.cs:293).
      Daily Contract가 UTC 날짜를 쓴다 → 한국은 오전 9시에 날짜가 바뀐다(RunRuntime.cs:24).

작업:
  1) 서버 RPC 응답을 boolean이 아닌 authoritative snapshot으로 확장한다.
       canonical_run_id, source alias id,
       status: accepted | duplicate | ambiguous | rejected,
       server_committed_at, account_revision(단조 증가),
       xp, wallet, monthly_verified_m, route/checkpoint state,
       reward_ledger_receipt_id
  2) 클라이언트 상태 머신:
       Queued → Uploading → ServerCommitted → LocalReconciled → Acked
     각 단계는 프로세스 재시작 후 이어질 수 있어야 한다(FIX-19의 저장소 사용).
  3) 큐 ACK는 authoritative snapshot 저장 성공 뒤에만 한다. 저장 실패 시 큐를 보존한다.
  4) 보상 애니메이션은 receipt_id 기준 1회. duplicate에서는 재생하지 않고 totals만 맞춘다.
  5) 서버 시각은 서버 응답의 server_committed_at을 쓴다. UtcNow를 대용하지 않는다.
  6) Daily Contract 날짜는 사용자 프로필의 검증된 timezone 또는 서버 contract_date를 쓴다.

검증:
  - 서버 커밋 직후 프로세스 강제 종료 → 재실행 reconcile, 보상 애니메이션 1회 이하
  - 단말 시계를 ±12시간 바꿔도 Daily Contract 판정이 흔들리지 않음
  - EditMode: 상태 머신 전이 전체
```

---

#### FIX-21 · Canonical merge alias 테이블과 ambiguous 처리 · **P0 (FIX-13/14 확장)**

```
문제: FIX-13(FOUND 오염)·FIX-14(락 경계) 위에 ChatGPT가 세 가지를 더 짚었고 타당하다.
  - fuzzy 병합이 성사돼도 새 source의 (source, source_record_id) alias가 저장되지 않는다.
  - 후보가 여럿일 때 order by ... limit 1 로 임의 병합한다.
  - 같은 source인데 record ID가 바뀐 재수집, 아주 가까운 두 정상 러닝이 구분되지 않는다.

작업(FIX-13/14와 같은 새 migration에 포함):
  1) private.canonical_run_sources 테이블을 만든다.
       (canonical_run_id, user_id, source, source_record_id, fingerprint, ingested_at)
       unique (user_id, source, source_record_id)
  2) 병합 성사 시 새 source alias 행을 반드시 삽입한다(on conflict do nothing).
  3) fuzzy 후보가 2건 이상이면 자동 병합하지 않고 status='ambiguous', 보상 0으로 반환한다.
     클라이언트는 ambiguous를 오류가 아닌 "확인 필요" 상태로 표시한다.
  4) 병합 판정에 distance만 쓰지 말고 started_at·ended_at·moving_seconds·route 요약·
     source 신뢰도를 함께 본다. 판정 근거를 evidence jsonb에 기록한다.
  5) 입력 검증: start<end, duration>0, distance>0, 음수/NaN/비현실 속도, source allowlist,
     fingerprint 형식, 사용자 소유권.
  6) 노출 테이블 RLS 활성화 + TO authenticated + 명시 user ownership.
     정책이 쓰는 user_id/source/started_at/status 열에 인덱스.

검증(pgTAP + node):
  - 동일 payload 20개 병렬 → canonical 1개, reward 1회
  - 서로 다른 source 5개 병렬 → canonical 1개, alias 5개
  - bucket 경계 양쪽 timestamp/거리 → canonical 1개
  - source_record_id null/빈문자/공백 → fuzzy lookup 정상 수행 (FIX-13 회귀)
  - 같은 source, 바뀐 record ID → 정책대로 alias 또는 ambiguous
  - 3분 간격 두 정상 러닝 → 병합되지 않음
  - 후보 2건 이상 → ambiguous, 보상 0
  - 다른 사용자 JWT로 cross-user read/write 실패
```

---

#### FIX-22 · 장착을 실제 장착으로 · **P1 (신규)**

```
문제: ApplyEquippedTop()이 renderer.materials로 인스턴스를 복제하며 색만 파랗게 칠하고,
      무엇을 샀든 "V13-TOP-BASE-02"를 저장한다. 실제 장착이 아니다.

작업:
  1) renderer.materials 순회를 제거한다.
     읽기는 sharedMaterial, 인스턴스별 색 변경이 필요하면 MaterialPropertyBlock을 쓴다.
  2) 승인된 modular mesh/slot과 approved material을 실제로 장착한다.
     ※ 승인된 2.5D 러너 외형을 바꾸지 않는다. 슬롯 교체만 한다.
  3) 장착 상태를 서버 snapshot으로 저장하고 cold launch에서 복원한다(FIX-19 저장소).
  4) 구매/장착/해제/preset/서버 실패 rollback을 모두 닫는다.
  5) 장착 결과가 Home·Training·Race의 동일한 My Runner에 반영되는지 확인한다.

검증:
  - EditMode: 장착 30회 반복 후 Material 인스턴스 수 증가 0
  - 장착 → force-stop → cold launch → 외형 유지 캡처
  - 서버 저장 실패 주입 → UI가 이전 상태로 롤백되고 오류 표시
```

---

#### FIX-23 · stale UI와 지어낸 값 제거 · **P1 (신규)**

```
문제:
  - 로비 슬롯 루프가 labels.Length에서 멈춰 이전 참가자가 남는다.
  - NextCheckpointLabel(0)이 "1 KM"을 확정값처럼 표시한다(월간 거리는 "-- KM"인데).
  - approvedEnergyText.text = "--/--" 가 무조건 대입되는 영구 placeholder다.

작업:
  1) 모든 반복 슬롯 갱신을 "전체 초기화 → payload 적용" 2단계로 바꾼다.
       for (var i = labels.Length; i < lobbySlots.Count; i++) lobbySlots[i].text = "";
     또는 슬롯 수만큼 항상 순회하며 없는 인덱스는 빈 상태로 만든다.
  2) 서버 요약 미로드 상태에서는 체크포인트를 계산하지 않는다.
       AccountSummaryLoaded == false → "-- KM" 로 통일한다.
     체크포인트 사다리는 서버 값(FIX-17의 단일 소스)에서 받아온다.
  3) 영구 placeholder는 Loading / Unavailable / Disabled(사유) 중 하나로 명확히 상태화한다.
     에너지가 서버 원장에 없다면 필드를 감추거나 정확한 사유를 표시한다.
  4) 화면 재진입 시 모든 view가 authoritative state로 refresh되는지 점검한다.
  5) result 화면은 receipt ID 기준으로만 보상 애니메이션을 1회 재생한다(FIX-20 연동).

검증:
  - EditMode: 8명 payload → 5명 payload 적용 후 슬롯 5~7이 비는지 단언
  - AccountSummaryLoaded=false 상태에서 화면 전체에 지어낸 숫자가 없는지 단언
  - 정적 테스트: 하드코딩된 "--/--" 대입 0건
```

---

#### FIX-24 · CI를 실제로 초록으로 · **P1 · (이 커밋에서 착수)**

```
문제: security-scan 15/15 실패, supabase-tests 15/15 실패. 한 번도 통과한 적이 없다.
      그런데 docs/CURRENT_STATE.md는 pgTAP을 PASS로 기록해 두었다.

이번 커밋에서 수행한 것:
  1) .github/workflows/security-scan.yml
     - 역할 이름 service_role 매칭을 제거하고 실제 키 자료만 매칭하도록 좁혔다.
     - BEGIN [A-Z0-9 ]*PRIVATE KEY 로 고쳐 RSA/OPENSSH 개인키 헤더를 실제로 잡게 했다.
       (기존 패턴은 BEGIN 과 KEY 사이에 단어가 둘인 형태를 못 잡았다.)
     - 존재하지 않는 docs/SECURITY.md 제외 항목을 제거했다.
     - 합성 비밀 7종 탐지 + 정상 역할 이름 오탐 0건을 강제하는 self-test 스텝을 추가했다.
  2) .github/workflows/supabase-tests.yml
     - 서비스 컨테이너를 제거하고 러너에 PostgreSQL 16을 직접 설치·기동한다.
       (서버와 확장이 같은 파일시스템에 있어야 create extension pgtap이 성공한다.)
     - pg_prove를 제공하는 libtap-parser-sourcehandler-pgtap-perl 를 설치 목록에 추가했다.
     - 본 테스트 전에 pgtap 로드 가능 여부를 먼저 검증하는 스텝을 넣었다.

남은 일:
  3) CI가 실제로 초록이 된 뒤 docs/CURRENT_STATE.md의 PASS 표기를
     "로컬 PASS / CI PASS"로 분리해 다시 쓴다. 로컬만 통과한 것을 PASS로 적지 않는다.
  4) V14 소스가 올라오면(FIX-00) unity 회귀와 v14-* node 테스트를 CI에 추가한다.

검증: 이 브랜치의 GitHub Actions 실행 결과. exit code가 아니라 실제 로그로 확인한다.
```

---

## 5. 실행 순서

한 단계가 닫히기 전에 다음 대규모 기능으로 넘어가지 않는다.

| 단계 | 작업 | 이 환경에서 가능한가 |
|---|---|---|
| **A** | FIX-24 CI 복구 | **가능 — 착수함** |
| **B** | FIX-17 / FIX-18 정본 숫자·방향 잠금 확정 | **사용자 답변 필요** |
| **C** | FIX-00 V14 소스 업로드 | **사용자 로컬 필요** |
| **D** | FIX-01~07, FIX-09 Back·무반응·safe area | C 이후 가능 |
| **E** | FIX-19 / FIX-20 / FIX-13 / FIX-14 / FIX-21 상태 저장·보상 정확성 | C 이후, 일부 실기기 필요 |
| **F** | FIX-11 / FIX-12 / FIX-22 최적화 | C 이후 |
| **G** | FIX-08 / FIX-10 / FIX-15 / FIX-16 / FIX-23 마감 | C 이후 |
| **H** | 20개 화면 기능 완결 + 반복 검증 | C 이후, 실기기 필요 |

**B는 코드 작업이 아니라 결정이다. 여기서 막히면 D~H의 절반이 헛일이 된다.**

---

## 6. 회귀 게이트

### 지금 저장소에서 실행 가능한 것 (실제 실행 결과)

```
$ node tools/direction-lock/scan.mjs
  124 files scanned, 19 patterns, No direction-lock violations.      ← PASS (단, 옛 잠금)

$ node tools/content-validator/validate.mjs
  All content gates passed.                                          ← PASS

$ node --test "tests/*.test.mjs"
  tests 99 | pass 99 | fail 0                                        ← PASS

$ node --version
  v22.22.2
```

### V14 소스가 올라오면 추가되는 것

```bash
node --test tests/canonical-run-merge.test.mjs \
            tests/direct-run-service.test.mjs \
            tests/v14-screen-flow.test.mjs
./scripts/unity.sh
./scripts/v14-server-e2e.sh
bash tools/build/android-v14.sh
```

※ `tests/v14-screen-flow.test.mjs`는 `requirements/V14_SCREEN_IMPLEMENTATION_CONTRACT.json`
을 읽는다. **이 파일도 현재 저장소에 없다.** FIX-00에 포함시킨다.

### 새로 추가할 테스트

| 테스트 | 대상 | 형태 |
|---|---|---|
| `v14-navigation.test.mjs` | 13화면 BACK/탈출 컨트롤 존재 | 정적 |
| `V14NavigationStackTests` | push/pop/replace/깊이/런타임 강제 이동 제외 | EditMode |
| `V14RunControlStateTests` | SENSOR_CHECK→ACTIVE→PAUSED→RESUMED 전이별 interactable | EditMode |
| `V14MetricsIncrementalTests` | 3,600표본 증분 == 전체 순회 (거리 ±1m, 시간 ±1s) | EditMode |
| `V14StateStoreTests` | schema version/checksum/backup/손상 복구 | EditMode + 계측 |
| `V14ReceiptStateMachineTests` | Queued→…→Acked, crash window | EditMode |
| `V14WardrobeMaterialTests` | 장착 30회 후 Material 인스턴스 증가 0 | EditMode |
| `V14StaleSlotTests` | 8명→5명 payload 후 슬롯 초기화 | EditMode |
| `canonical-run-null-record-id` | source_record_id NULL/빈문자/공백 | pgTAP + node |
| `canonical-run-concurrent` | 동시 이중 출처 → canonical 1, reward 1 | pgTAP |
| `canonical-run-ambiguous` | 후보 2건 → ambiguous, 보상 0 | pgTAP |
| `checkpoint-ladder-parity` | 클라이언트 배열 == 서버 사다리 | 정적 |
| `v14-dead-control.test.mjs` | 사유 없는 비활성 컨트롤 0건 | 정적 |

### APK 배포 증거 (Unity exit code로 성공이라 하지 않는다)

1. `sha256sum` 출력 2. `adb install -r` 성공 3. `pm clear` 후 `am start -W` TotalTime
4. Home 캡처 5. `adb logcat -d | rg "FATAL EXCEPTION|ANR in|AndroidRuntime|OutOfMemory|avc: denied"` 결과
6. **뒤로가기 매트릭스** — 화면 × (하드웨어 back / 제스처 back / 화면 내 BACK)

---

## 7. 11회 반복 검증에 대한 현실적 조정

ChatGPT의 `PASS-00` ~ `PASS-10` 11회 루프는 방향이 옳다. 다만 각 회차가
**Android APK clean build + install + cold launch + profiler** 를 요구하는데,
이 환경에는 Unity Editor도 Android SDK도 실기기도 없다(`docs/CURRENT_STATE.md` 확인).

**따라서 이렇게 나눈다.**

| 층 | 회차 | 이 환경 | 사용자 로컬 |
|---|---|---|---|
| 정적·도메인·SQL | PASS-00 ~ PASS-04 | **전부 가능** | — |
| Unity EditMode/PlayMode | PASS-01 ~ PASS-08 | 불가 | 필요 |
| Android 실기기·profiler | PASS-05 ~ PASS-10 | 불가 | 필요 |

이 환경에서 11회 중 5회를 완주했다고 **보고하지 않는다.** 각 회차마다
어느 층까지 돌았는지 명시하고, 돌리지 못한 층은 `NOT_RUN`으로 적는다.

회차별 산출물은 `artifacts/v14-audit/pass-XX/` 에 저장한다:
`git-state.txt`, `commands.json`, `test-results/`, `apk.sha256`, `install.txt`,
`screenshots/`, `logcat.txt`, `back-navigation.json`, `button-inventory.json`,
`performance.json`, `supabase-e2e.json`, `new-findings.md`, `fixed.md`,
`regressions.md`, `blockers.md`

---

## 8. 지금 사용자에게 필요한 결정 3가지

**이 셋이 정해지기 전에는 FIX-17/18과 그에 딸린 콘텐츠·DB 작업을 시작할 수 없다.**

1. **정본 숫자** — 월간 체크포인트 52 / 120, Region 96 / 192, 장착 아이템 96 / 600+120.
2. **전투 자산 처리** — `packages/domain/battle.mjs`, `tests/battle.test.mjs`,
   `client/cli/play.mjs`, `client/cli/smoke-play.mjs`, `content/launch/**`의 전투 데이터,
   `backend/.../0005_content.sql`의 전투 테이블을
   (a) 아카이브 이동 (b) 삭제 (c) 유지하되 잠금 예외 — 어느 쪽인가.
   ※ `supabase-tests`가 `smoke-play.mjs`에 의존하므로 옮기면 CI도 함께 고쳐야 한다.
3. **V14 소스 업로드 승인** — 사용자 로컬의 V14 Unity 프로젝트를 이 저장소에 올릴 것인가.
   올리지 않으면 FIX-01~16, 19~23은 이 저장소에서 적용·검증할 수 없다.

---

## 9. 블로커

| # | 항목 | 영향 |
|---|---|---|
| 1 | 원격 저장소에 V14 클라이언트 코드 없음 | FIX-00·01~16·19~23 적용 불가 |
| 2 | `AndroidManifest.xml` / `ProjectSettings` 없음 | FIX-01 매니페스트 수정, FIX-06 기준 해상도 확정 불가 |
| 3 | `V14JourneyRuntime.cs` / `V11AndroidRunBridge.cs` 없음 | `V14TrainingState.RESUMED` 의미(FIX-09), bridge 발행 주기(FIX-03) 확인 불가 |
| 4 | `requirements/V14_SCREEN_IMPLEMENTATION_CONTRACT.json` 없음 | `v14-screen-flow.test.mjs` 실행 불가 |
| 5 | Unity Editor / Android SDK / 실기기 없음 | EditMode·PlayMode·APK·profiler 전부 불가 |
| 6 | 원격 Supabase 프로젝트 정보·승인 없음 | FIX-13/14/21 원격 검증 불가 (local은 가능) |
| 7 | 정본 숫자·전투 자산 처리 미확정 | FIX-17/18 착수 불가 |

원격 배포, GitHub Release, 데이터 삭제는 사용자 승인 없이 실행하지 않는다.
Unity 클라이언트에 service-role/secret key를 넣지 않는다.

---

## 10. 보고 형식

```
RUNNINGUP V14 FUNCTION & OPTIMIZATION: COMPLETE | PARTIAL | BLOCKED
```

1. 디자인 잠금 준수 여부 2. 시작/종료 Git 상태 3. 완료 화면 수 `/20`
4. 작동 버튼 수 `/전체`, 무반응 버튼 수 5. Back 정책 검증 결과
6. Canonical Run/보상 exactly-once 결과 7. GPS / Health Connect / FIT·GPX·TCX 결과
8. Race / Event / Crew / World / Wardrobe / Settings / History / Badges 결과
9. Supabase local / remote / RLS / Realtime 결과 10. 성능 baseline→최종
11. 반복 회차와 각 회차가 도달한 층 12. APK 경로·SHA·install·cold launch·fatal/ANR
13. 수정 파일·migration 목록 14. 남은 blocker 15. 다음 하나의 원자 작업

상태는 `COMPLETE` / `PARTIAL` / `BLOCKED` / `NOT_RUN` 만 쓴다. 증거 없는 `PASS`는 쓰지 않는다.

---

## 참고 출처

- [Behavior changes: Apps targeting Android 16 or higher](https://developer.android.com/about/versions/16/behavior-changes-16)
- [Add support for the predictive back gesture](https://developer.android.com/guide/navigation/custom-back/predictive-back-gesture)
- [Input.backButtonLeavesApp — Unity Scripting API](https://docs.unity3d.com/ScriptReference/Input-backButtonLeavesApp.html)
- [PL/pgSQL: PERFORM and the FOUND variable — Tom Lane](https://www.postgresql.org/message-id/23025.1098734547%40sss.pgh.pa.us)
- [plpgsql_check: PL/pgSQL Linter — Supabase Docs](https://supabase.com/docs/guides/database/extensions/plpgsql_check)
- 1차 분석: [`docs/V14_FUNCTION_FIX_PROMPT_KO.md`](V14_FUNCTION_FIX_PROMPT_KO.md)
