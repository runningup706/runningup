# KNOWN_ISSUES — 인수인계용 결함·미구현·부채 목록

작성: 2026-07-29 · 작성자: Claude Code (`claude-opus-5`) · 커밋 `ab69f06` 기준

이 문서는 **다음 에이전트(Codex 등)가 바로 착수할 수 있도록** 문제를 정직하게 나열한 것입니다.
"잘 된 것"은 `HANDOFF.md`에 있고, 여기에는 **안 된 것, 약한 것, 의심스러운 것**만 적습니다.

우선순위: **P0** = 출시 차단 / **P1** = 품질 심각 / **P2** = 부채

---

## A. 사람이 해결해야 하는 환경 차단 (에이전트가 못 고침)

| # | 항목 | 상태 | 필요한 조치 |
|---|---|---|---|
| A-1 | Unity 6.3 에디터·라이선스 없음 | `BLOCKED_TOOLCHAIN` | 에디터 설치된 머신에서 작업. 씬·프리팹·UI·스트리밍 전부 여기에 묶여 있음 |
| A-2 | Android SDK 설치 불가 | `BLOCKED_TOOLCHAIN` | `dl.google.com`이 네트워크 정책에서 403. `maven.google.com`도 그리로 리다이렉트됨. 방화벽 허용 또는 SDK 사전 설치된 이미지 필요 |
| A-3 | 실기기 없음 | `BLOCKED_DEVICE` | 4GB급 기기 USB 연결. fps·배터리·발열·ANR은 에뮬레이터로 대체 금지(정본 #22.9) |
| A-4 | Google Play 자격증명 없음 | `BLOCKED_ACCOUNT` | 소유자 승인 필요. production 공개는 별도 승인 |
| A-5 | Docker 없음 → Supabase CLI 로컬 스택 불가 | `BLOCKED_TOOLCHAIN` (우회함) | 선택. 현재는 실제 PostgreSQL 16 + pgTAP으로 검증 중 (ADR-002) |
| A-6 | PR 생성 불가 | 미해결 | 저장소가 비어 있어 푸시하는 순간 작업 브랜치가 기본 브랜치가 됨 → base 없어서 `422`. `main` 생성 승인 필요 |

---

## B. P0 — 설계에는 있으나 실제로 동작하지 않는 것

### B-1. **서버와 클라이언트의 보상 계산이 불일치** (가장 심각)

`tools/lib/reward.mjs`는 **15개 컴포넌트**를 계산하는데,
권위인 `private.apply_verified_run_reward`는 **7개만** 계산합니다.

실제 원장(`api.xp_ledger.base_components`)에 들어가는 키:
```
base_distance_xp, base_moving_time_xp, daily_momentum,
weekly_volume, quality_session_chain, long_run_chain, monthly_apex_checkpoint
```

**서버에 없는 8개** (정본 #11.6이 요구하는 것들):
```
distance_specific_performance   거리별 절대 성능
personal_improvement            개인 향상   ← 초보자 동기의 핵심
goal_completion                 목표 달성
structured_execution            structured 세션 수행
split_consistency               스플릿 일관성
long_run_relative               패스포트 기준 롱런
consecutive_week                주간 연속
quest_event                     퀘스트·이벤트
```

**영향:** 사용자가 받는 실제 보상이 설계보다 적고, 클라이언트 미리보기와 서버 결과가 다릅니다.
"10km 45분과 50분을 구별한다"는 정본의 핵심 약속이 서버에서는 지켜지지 않습니다.

**고칠 위치:** `backend/supabase/migrations/0007_reward_transaction.sql` 의 `v_components` 블록
(현재 7개 키만 만듦). JS 쪽 `tools/lib/reward.mjs`가 참조 구현입니다.

**주의:** 고친 뒤 `content/conformance/` 픽스처를 재생성해야 3-way 정합성이 유지됩니다.

### B-2. 스키마만 있고 아무도 쓰지 않는 테이블 13개

한 세션 플레이 후 실제 행 수를 센 결과입니다:

| 테이블 | 행 | 문제 |
|---|---:|---|
| `api.runner_passports` | **0** | 패스포트가 JS 메모리에만 존재. DB에 저장/버전관리 안 됨 |
| `api.run_best_efforts` | **0** | `tools/lib/best-effort.mjs`는 구현·테스트됐지만 파이프라인에 연결 안 됨 |
| `api.personal_baselines` | **0** | 비어 있어서 **개인 향상 보너스가 영원히 0** |
| `api.user_chains` | **0** | 비어 있어서 quality/long-run 체인이 항상 0 |
| `api.user_consecutive_weeks` | **0** | 주간 연속 미구현 |
| `api.weekly_goal_snapshots` | **0** | 주간 목표 스냅샷 미구현 |
| `api.stat_ledger` | **0** | **7개 코어 스탯(Vitality/Endurance/Speed/Tempo/Pacing/Momentum/Resolve) 전부 미구현** |
| `api.currency_ledger` | **0** | 9종 자원(Pulse Energy, Crown Shard 등) 전부 미지급 |
| `api.consents` / `account_jobs` | **0** | 동의 기록·계정 내보내기/삭제 흐름 미구현 |
| `api.run_appeals` | **0** | 이의제기 UI/흐름 없음 |
| `private.run_samples` | **0** | **raw GPS 저장 경로 미구현** → 보존·삭제·암호화 정책이 실제로 검증된 적 없음 |
| `private.idempotency_keys` | **0** | 만들었지만 미사용 (원장 unique로만 방어 중) |
| `private.run_import_batches` | **0** | Health Connect 임포트 흐름 미구현 |

### B-3. 인증이 전혀 없음

- guest / email / magic-link 로그인 없음. `auth.uid()`는 셸(shim)만 존재.
- CLI 클라이언트는 `psql`로 **service 권한 직접 INSERT** → RLS를 통과하지 않습니다.
  즉 RLS는 pgTAP으로만 검증됐고, **실제 클라이언트 경로로는 한 번도 통과한 적 없습니다.**
- 계정 연결/병합, 세션 갱신, 로그아웃, 복구 전부 미구현.

### B-4. Health Connect 미구현

정본 #10.6 전체. 이번 달 기록 가져오기, 중복 조정, 권한 흐름 없음.
`private.apply_current_month_import()` 함수는 **작성했지만 한 번도 호출된 적이 없습니다.**

### B-5. Edge Functions 0개

정본 #16.6이 나열한 24개 함수 전부 미작성. Deno 런타임도 미설치.

### B-6. 소셜·시즌·라이브옵스 런타임 없음

친구, 크루, 협동 보스, 리더보드, Ghost Trial, 시즌, 우편함, 공지, live config —
스키마 기초조차 대부분 없습니다. (정본 #14, #15 전체)

---

## C. P1 — 구현했지만 약하거나 임시방편

| # | 문제 | 위치 |
|---|---|---|
| C-1 | **CLI가 `psql` 서브프로세스를 트랜스포트로 사용.** 실제 클라이언트 아키텍처가 아님. PostgREST/Edge Function 어댑터로 교체 필요 | `client/cli/play.mjs:45` |
| C-2 | **`--runner` 인자 파싱 버그.** 인자가 없으면 `indexOf`가 -1을 반환해 `argv[0]`(= `/usr/bin/node`)이 값이 됨. `?? RUNNERS.regular_10k` 폴백 때문에 **우연히** 동작 중 | `client/cli/play.mjs:35` |
| C-3 | 플레이 클라이언트가 세션 시작 날짜를 `2026-09-01`로 하드코딩 | `client/cli/play.mjs` |
| C-4 | CLI가 한국어 카탈로그만 읽음. 영어 로컬라이제이션이 존재하는데 미사용 | `client/cli/play.mjs` |
| C-5 | 동시성이 **순차적으로만** 증명됨. `FOR UPDATE` + unique 제약은 있으나 실제 병렬 부하 테스트 없음 (위험 R-05) | `0007_reward_transaction.sql` |
| C-6 | 마이그레이션 **업그레이드 경로 없음**. 첫 스키마라 `0001`부터만 검증됨. 이전 릴리스에서 올라오는 경로·롤백·forward-fix 미검증 | `backend/supabase/migrations/` |
| C-7 | 전투 밸런스가 **합성 시뮬레이션으로만** 튜닝됨. 실제 플레이테스트 없음. 12개 기믹이 "구별되는지"는 검증했으나 "재미있는지"는 검증 불가 | `tools/lib/battle.mjs` |
| C-8 | 안티치트 임계값이 **자체 생성한 픽스처로만** 튜닝됨. 실제 GPS 로그 없음. 실사용 시 오탐률은 미지수 | `tools/lib/anomaly-detection.mjs` |
| C-9 | 콘텐츠 유사도 임계값(45~70%)이 경험적. 근거 있는 값이 아님 | `tools/content-validator/validate.mjs` |
| C-10 | `run_samples`에 좌표를 저장한 적이 없으므로 **home-zone 마스킹·share 파생물·보존 정책이 코드로 존재하지 않음** | 정본 #16.8 |

---

## D. P2 — 부채·미확인

| # | 항목 |
|---|---|
| D-1 | 콘텐츠는 **데이터일 뿐**. `scene_address`, `prefab_address`는 문자열이며 실제 에셋 0개. 12대륙·12캐릭터 **플레이 가능 0/12** |
| D-2 | 성능 예산(30fps/650MB/8초 콜드스타트) **측정 자체가 불가능**했음 |
| D-3 | 콘텐츠 팩 다운로드·재개·손상복구·롤백 미구현 |
| D-4 | 분석(analytics) 파이프라인 0. 이벤트 스키마도 미작성 |
| D-5 | 어드민 도구, 인시던트 런북, 백업/복구 드릴 미실시 |
| D-6 | 스토어 자료(`growth/play-store/`) 디렉터리만 있고 내용 없음 |
| D-7 | 접근성·시각 검증(스크린샷 diff) 불가 — 렌더링 대상이 없음 |
| D-8 | 상표·IP 조사 미실시 (`BLOCKED_LEGAL_REVIEW`) |
| D-9 | ko 외 언어 `BLOCKED_LOCALIZATION_REVIEW` |

---

## E. Codex에게 권장하는 착수 순서

Unity/Android 없이도 **지금 바로** 할 수 있고 가치가 큰 순서입니다.

1. **B-1 보상 컴포넌트 8개를 SQL에 추가** — 가장 큰 실질 결함.
   완료 후 `node tools/conformance/export-fixtures.mjs && node tools/conformance/emit-sql-conformance.mjs`
2. **B-2 중 `personal_baselines` + `run_best_efforts` + `stat_ledger` 연결** —
   `best-effort.mjs`는 이미 테스트까지 끝나 있어서 배선만 하면 됨. 이걸 해야 B-1의 개인 향상이 실제로 작동
3. **B-2 중 `user_chains` / `user_consecutive_weeks` 배선** — `momentum.mjs`도 이미 구현·테스트 완료
4. **B-3 인증** — Supabase auth 연동, CLI를 RLS 경유 경로로 교체(C-1과 함께)
5. **`private.run_samples` 저장 + 보존/삭제 경로** — 프라이버시 요구의 핵심
6. **B-4 Health Connect 임포트** — `apply_current_month_import()`는 이미 있음, 호출부만 없음
7. C-5 동시성 부하 테스트
8. C-6 업그레이드 마이그레이션 경로

### 착수 전 반드시

```bash
bash tools/bootstrap/doctor.sh   # 이 머신이 뭘 할 수 있는지
bash tools/test/all.sh           # 7개 게이트가 아직 초록인지
```

`docs/USER_DIRECTION_LOCK.md`의 DL-1~DL-5는 **협상 대상이 아닙니다.**
위 작업 중 어느 것도 1000km 상한, 선행조건 금지, 러닝 전용, 출시 수량, 검증 러닝 전용 파워를
완화하는 방향으로 해결하면 안 됩니다. CI가 즉시 실패합니다.
