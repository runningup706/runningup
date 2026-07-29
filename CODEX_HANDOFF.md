# RunningUp — Codex 인수인계서 (이 파일 하나면 됩니다)

작성 2026-07-29 · 브랜치 `claude/runningup-3d-android-dev-3c8gnp` · 커밋 `ce24a08`
저장소 `runningup706/runningup`

---

## 0. 한 줄 요약

**백엔드·도메인 로직·콘텐츠 데이터·플레이 루프는 실제로 돌아가고 테스트로 증명됩니다.
3D Unity Android APK는 이 환경에 Unity도 Android SDK도 없어서 만들지 못했습니다.**

가장 큰 실질 결함 하나: **서버가 보상 15개 중 7개만 계산합니다.** (§3-1)

---

## 1. 지금 실행해보는 법

```bash
# 1) 이 머신이 뭘 할 수 있는지
bash tools/bootstrap/doctor.sh

# 2) 전체 게이트 7개 (약 1분)
bash tools/test/all.sh

# 3) 게임 실제 플레이
npm run play              # 직접 조작
npm run play:auto         # 자동 1회
npm run play:smoke        # 4개 실력대 전부 자동 검증
```

`play:smoke` 실행 결과 (실제 출력):

```
  profile          band-run   XP        monthly     checkpoints  battle
  beginner       A            372 XP     1.01 km           2  victory
  regular_10k    A           1792 XP    10.10 km           5  victory
  marathon       A           6424 XP    42.62 km          11  victory
  ultra          A           7723 XP    50.50 km          12  victory
```

> DB가 안 떠 있으면 먼저:
> `su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/postgresql/runningup-local -o '-p 55432 -k /tmp' start"`
> 그다음 `export PGHOST=/tmp PGPORT=55432 PGUSER=postgres RUNNINGUP_TEST_DB=runningup_test && bash tools/test/db.sh`

---

## 2. 현재 상태 — 되는 것 / 안 되는 것

### 되는 것 (전부 실행해서 확인한 수치)

| 항목 | 결과 |
|---|---|
| 도메인 엔진 (JS) | **99개 테스트 통과** |
| 백엔드 (pgTAP) | **1128개 통과 / 7개 파일** |
| Unity 도메인 레이어 (C#) | **29개 통과** (Unity 에디터 없이 .NET으로 컴파일·테스트) |
| 러닝 캡처 코어 (Kotlin) | **22개 통과** (저널 + 오프라인 업로드 큐) |
| 안티치트 | 정밀도 100% / 재현율 100% / 오탐 0% |
| 방향 잠금 스캔 | 위반 0건 |
| 출시 콘텐츠 데이터 | 18개 항목 **전부 최소 수량 충족**, ko/en 782키 |
| 플레이 루프 | **4개 실력대 전부 완주** |
| 3중 구현 정합성 | JS ↔ C# ↔ SQL, 992개 어서션 |

### 안 되는 것

| 항목 | 상태 |
|---|---|
| Unity 씬·프리팹·UI·3D | 없음 (에디터 없음) |
| APK / AAB | 없음 |
| 12대륙·12캐릭터 **플레이 가능** | **0/12** (데이터만 완성) |
| 실기기 성능·배터리·발열 | 측정 불가 |
| GitHub Release·SHA 재검증 | 첨부할 APK가 없음 |
| Play 내부 테스트 | 자격증명 없음 |

**중요:** 콘텐츠 12/12는 **데이터**가 완성됐다는 뜻이지 플레이 가능하다는 뜻이 아닙니다.
문서 전체에서 `DATA_PASS`(데이터 완성)와 `PLAYABLE_PASS`(플레이 가능)를 구분해 놨습니다.

---

## 3. 고쳐야 할 것 — 우선순위 순

### 3-1. 【최우선】 서버 보상이 설계의 절반만 계산함

`tools/lib/reward.mjs`(설계·참조 구현)는 **15개** 컴포넌트를 계산하는데,
권위인 `private.apply_verified_run_reward`는 **7개만** 계산합니다.

실제 원장(`api.xp_ledger.base_components`)을 쿼리해서 확인한 결과:

```
있음: base_distance_xp, base_moving_time_xp, daily_momentum,
      weekly_volume, quality_session_chain, long_run_chain, monthly_apex_checkpoint

없음: distance_specific_performance   거리별 절대 성능
      personal_improvement            개인 향상  ← 초보자 동기의 핵심
      goal_completion                 목표 달성
      structured_execution            structured 세션 수행
      split_consistency               스플릿 일관성
      long_run_relative               패스포트 기준 롱런
      consecutive_week                주간 연속
      quest_event                     퀘스트·이벤트
```

**결과:** "10km 45분과 50분을 다르게 보상한다"는 정본의 핵심 약속이
클라이언트 미리보기에서는 참이고 **DB에서는 거짓**입니다. 실사용자 보상이 설계보다 적습니다.

- **고칠 파일:** `backend/supabase/migrations/0007_reward_transaction.sql` 의 `v_components` 블록
- **참조 구현:** `tools/lib/reward.mjs`
- **고친 뒤 필수:** `node tools/conformance/export-fixtures.mjs && node tools/conformance/emit-sql-conformance.mjs`
  (안 하면 3중 정합성 테스트가 깨집니다)

### 3-2. 스키마만 있고 아무도 안 쓰는 테이블 13개

한 세션 플레이 후 행 수를 직접 세었습니다.

| 테이블 | 행 | 결과 |
|---|---:|---|
| `api.personal_baselines` | 0 | → **개인 향상 보너스가 영원히 0** |
| `api.user_chains` | 0 | → 퀄리티/롱런 체인이 **항상 0** |
| `api.stat_ledger` | 0 | → **7개 코어 스탯 전부 미구현** |
| `api.run_best_efforts` | 0 | 엔진은 테스트까지 완료, **배선만** 안 됨 |
| `api.currency_ledger` | 0 | 9종 자원 전부 미지급 |
| `api.runner_passports` | 0 | 패스포트가 JS 메모리에만 존재 |
| `api.user_consecutive_weeks` | 0 | 주간 연속 미구현 |
| `api.weekly_goal_snapshots` | 0 | 주간 목표 스냅샷 미구현 |
| `api.consents` / `account_jobs` | 0 | 동의·내보내기·삭제 흐름 미구현 |
| `api.run_appeals` | 0 | 이의제기 흐름 없음 |
| `private.run_samples` | 0 | **raw GPS 저장 경로가 코드에 없음** |
| `private.idempotency_keys` | 0 | 만들었지만 미사용 |
| `private.run_import_batches` | 0 | Health Connect 임포트 미구현 |

**가성비 최고 작업:** `best-effort.mjs`와 `momentum.mjs`는 **이미 구현·테스트 완료**입니다.
`run_best_efforts` / `personal_baselines` / `user_chains` **배선만** 하면 3-1의 개인 향상이 실제로 작동합니다.

### 3-3. 인증이 아예 없음

- guest / email / magic-link 로그인 없음. `auth.uid()`는 셸(shim)만 존재
- CLI가 `psql`로 **service 권한 직접 INSERT** → RLS를 통과하지 않음
- **즉 RLS는 pgTAP으로만 검증됐고, 실제 클라이언트 경로로는 한 번도 통과한 적이 없습니다**
- 계정 연결·병합·세션 갱신·로그아웃·복구 전부 미구현

### 3-4. Health Connect 미구현

정본 #10.6 전체. `private.apply_current_month_import()` 함수는 **작성했지만 한 번도 호출된 적 없습니다.**
호출부만 만들면 됩니다.

### 3-5. Edge Functions 0개

정본 #16.6이 나열한 24개 전부 미작성. Deno 런타임도 미설치.

### 3-6. 소셜·시즌·라이브옵스 런타임 없음

친구, 크루, 협동 보스, 리더보드, Ghost Trial, 시즌, 우편함, 공지, live config — 대부분 스키마조차 없음.

### 3-7. 작지만 실제 버그

`client/cli/play.mjs:35` — `--runner` 인자가 없으면 `indexOf`가 -1을 반환해
`argv[0]`(`/usr/bin/node`)이 값이 됩니다. `?? RUNNERS.regular_10k` 폴백 덕에 **우연히** 동작 중입니다.

기타: 세션 시작 날짜 `2026-09-01` 하드코딩, CLI가 한국어 카탈로그만 읽음(영어 미사용).

---

## 4. 검증했지만 신뢰도가 낮은 것 (솔직히)

| 항목 | 한계 |
|---|---|
| 동시성 | `FOR UPDATE` + unique 제약은 있으나 **순차 증명만** 했습니다. 병렬 부하 테스트 없음 |
| 안티치트 100% | **제가 만든 픽스처**에 대해서만 100%입니다. 실제 GPS 로그로는 미검증 → 실사용 오탐률 미지수 |
| 전투 밸런스 | 합성 시뮬레이션으로만 튜닝. "구별되는가"는 검증, "재미있는가"는 검증 불가 |
| 마이그레이션 | 첫 스키마라 `0001`부터만 검증. **업그레이드·롤백 경로 없음** |
| 콘텐츠 유사도 임계값 | 45~70%는 경험적 값이며 근거 있는 수치가 아님 |
| 프라이버시 정책 | `run_samples`에 좌표를 저장한 적이 없어 **마스킹·보존·삭제가 코드로 존재하지 않음** |

---

## 5. 사람이 해야 하는 것 (Codex도 못 함)

| # | 항목 | 필요한 조치 |
|---|---|---|
| 1 | **Unity 6.3 에디터 + 라이선스** | 씬·프리팹·UI·스트리밍·APK가 전부 여기 묶여 있음 |
| 2 | **Android SDK 접근** | `dl.google.com`이 네트워크 정책에서 403. `maven.google.com`도 그리로 리다이렉트. 방화벽 허용 또는 SDK 사전설치 이미지 필요 |
| 3 | **실기기 1대 (4GB급)** | fps·배터리·발열·ANR은 에뮬레이터 대체 금지 |
| 4 | **Google Play 자격증명** | 소유자 승인. production 공개는 별도 승인 |
| 5 | **`main` 브랜치 생성 승인** | 저장소가 비어 있어 푸시 시 작업 브랜치가 기본 브랜치가 됨 → base 없어 PR이 `422`로 거부됨 |

---

## 6. Codex 착수 권장 순서

Unity 없이 **지금 바로** 가능하고 가치가 큰 순서입니다.

1. **§3-1 보상 8개 컴포넌트를 SQL에 추가** ← 가장 큰 실질 결함
2. **`personal_baselines` + `run_best_efforts` + `stat_ledger` 배선** (엔진 이미 완성, 배선만)
3. **`user_chains` + `user_consecutive_weeks` 배선** (`momentum.mjs` 이미 완성)
4. **인증 도입 + CLI를 RLS 경유 경로로 교체**
5. **`private.run_samples` 저장·보존·삭제 경로** (프라이버시 핵심)
6. **Health Connect 임포트 호출부**
7. 동시성 병렬 부하 테스트
8. 업그레이드 마이그레이션 경로

작업 전후로 반드시:

```bash
bash tools/test/all.sh    # 7개 게이트가 초록인지
```

---

## 7. 절대 완화하면 안 되는 것 (CI가 즉시 실패)

`docs/USER_DIRECTION_LOCK.md`의 5개 잠금은 **협상 대상이 아닙니다.**

| 잠금 | 내용 | 강제 방법 |
|---|---|---|
| **DL-1** | 월간 1000km가 최종. 52체크포인트, World Crown 위 아무것도 없음 | enum 순서 + CHECK 제약 4개 + pgTAP 44개 |
| **DL-2** | 모든 실력대가 첫날 자기 수준에서 시작. **선행조건 금지** | 8개 픽스처 + `requires_goal_id` 컬럼 자체가 없음 |
| **DL-3** | 러닝 전용 (road/track/treadmill/indoor) | enum 4개 값 → `'trail'::activity_type`은 캐스팅 에러 |
| **DL-4** | 출시 콘텐츠 최소 수량 | 검증기 + DB 게이트 |
| **DL-5** | 검증된 러닝만 코어 파워 | `core_power_source` enum이 결제·광고·방치를 표현 불가 |

금지 개념을 되살리려면 **마이그레이션에서 enum을 바꾸거나 제약을 삭제해야** 하고,
그건 리뷰에서 반드시 눈에 띕니다. 편의를 위해 이걸 푸는 방향의 수정은 하지 마세요.

---

## 8. 저장소 지도

| 경로 | 내용 |
|---|---|
| `docs/USER_DIRECTION_LOCK.md` | **제일 먼저 읽을 것.** 5개 불변 잠금 |
| `docs/KNOWN_ISSUES.md` | 이 문서의 상세판 (파일 위치·행 수 포함) |
| `HANDOFF.md` | 되는 것 + 게이트별 상태 |
| `docs/CURRENT_STATE.md` | 환경이 뭘 할 수 있고 없는지 |
| `docs/DECISIONS.md` | ADR 5개 (왜 이렇게 했는지) |
| `docs/audits/` | 10회 감사 보고서 (실제 결함 4개 발견·수정) |
| `tools/lib/` | 도메인 엔진 (apex·passport·reward·momentum·best-effort·battle·anti-cheat) |
| `backend/supabase/migrations/` | 스키마 8개 (RLS·원장·보상 트랜잭션) |
| `backend/supabase/tests/pgtap/` | DB 테스트 1128개 |
| `client/cli/` | 플레이 가능한 클라이언트 |
| `client/unity/` | Unity 도메인 레이어 (C#, 에디터 없이 테스트됨) |
| `native/android-running-plugin/` | Kotlin 저널 + 업로드 큐 |
| `content/launch/` | 생성된 콘텐츠 (직접 수정 금지, 팩토리로 재생성) |
| `requirements/REQUIREMENTS_TRACEABILITY.csv` | 요구사항 44개 추적표 |

---

## 9. 이번 작업에서 발견하고 고친 실제 결함 (참고)

감사와 테스트가 잡아낸 것들입니다. 같은 함정을 다시 밟지 마세요.

1. **타임존 경계 악용** — 사용자가 `reward_timezone`을 바꿔 러닝을 유리한 달로 귀속시킬 수 있었음.
   RLS는 *어느 행*만 통제하고 *어느 컬럼*은 통제하지 않는다는 점이 원인. → 컬럼 단위 권한 + 트리거 + 24시간 1회 감사 경로
2. **보상 트랜잭션이 자기 CHECK 위반** — 스트릭을 두 문장으로 갱신해 모든 사용자의 첫 러닝이 실패했음
3. **유물 72개가 리스킨** — 6테마 × 12대륙, 유사도 83%. 임계값을 낮추지 않고 콘텐츠를 고침
4. **대륙 기믹 3개가 무효** — 라벨은 12개, 실제 규칙은 9개였음
5. **역할 밸런스가 상위호환** — burst가 sustained보다 19% 큰 예산. 이제 정규화로 구조적 보장
6. **실행되지 않던 테스트** — pgTAP plan 불일치 3건이 `grep`으로는 초록으로 보였음. `pg_prove` 사용으로 전환
7. **저널이 찢어진 쓰기를 정상으로 보고** — 8바이트 미만 꼬리를 그냥 지나침
