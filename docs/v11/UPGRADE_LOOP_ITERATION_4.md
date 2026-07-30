# V11 검증형 업그레이드 반복 4

반복 4는 반복 3이 추가한 verified-run uploader를 실제 실패 상황에서 다시 읽고,
러닝이 영구히 막히거나 조용히 사라지는 경로를 수정했다. 함께 이 저장소를
V11 clean rebuild로 전환하고, Unity Editor 없이도 업로드 판정을 회귀 검증하는
경로를 만들었다.

## 저장소 전환

이 저장소는 이전까지 v4.0.0 APEX1000 방향의 트리를 담고 있었다. 그 트리에는
`tools/lib/battle.mjs`, enemy/boss 카탈로그 등 V11이 활성 런타임에서 금지한
전투 계열 구현이 있었다. V11은 패치 대상이 아니라 clean rebuild이므로
`00_START_HERE_CLAUDE_CODE.md` 3단계에 따라 V11 현재 소스를 기준 저장소로
채택했다.

- 122개 파일을 제거했고 그중 33개가 금지 런타임 용어를 포함하고 있었다.
- 제거 내역은 `DEPRECATED_PURGE_MANIFEST.json`에 schema 2.0.0의 두 번째 purge
  기록으로 남겼다. 별도 legacy backup 폴더는 만들지 않았고 Git 이력은 보존했다.
- `npm run validate:legacy`는 hits 0건, forbidden archive 0건이다.

## 발견하고 수정한 업로더 결함

### 1. 실패한 러닝 하나가 이후 모든 러닝을 영구히 막았다

`SyncReadyRuns`는 첫 실패 항목에서 배치를 중단했다. `Ready()`는 항목을
`startedAtUnixMilliseconds` 순으로 돌려주므로, 서버가 영구히 거절한 러닝은
언제나 가장 오래된 항목으로 남는다. 그 결과 거절된 러닝 하나가 이후에 달린
모든 러닝의 업로드를 영구히 막았다. 이제는 계정 전체에 영향을 주는 인증
실패에서만 배치를 멈춘다.

### 2. RPC의 `AUTH_REQUIRED`가 세션 갱신을 유발하지 않았다

`ingest_verified_run`은 인증이 없으면 errcode `42501`로 예외를 던지고
PostgREST는 이를 **403**으로 매핑한다. 이전 규칙은 401만 refresh 대상으로 봤기
때문에, 이 경로에서는 세션이 절대 갱신되지 않고 영구 거절로 분류됐다.
이제 401, 403, 그리고 본문의 `42501`이 모두 한 번의 refresh를 유발한다.

### 3. 409/duplicate가 영구 거절로 분류됐다

앱이 서버 커밋 직후·응답 처리 직전에 죽거나 두 기기가 같은 러닝을 올리면
`private.canonical_runs(user_id, fingerprint)` unique 제약이 걸려 PostgREST가
409 또는 SQLSTATE `23505`를 돌려준다. 서버는 이미 러닝을 보유한 상태이므로
이는 성공이다. 이전에는 `InterventionRequired`로 분류되어 큐에 영원히 남았다.
이제 큐에서 내리고 사용자에게 동기화 완료로 표시한다.

### 4. 재시도에 상한이 없었다

`MarkFailed`는 실패할 때마다 무조건 다시 예약했다. 상한을 12회로 두고,
초과하면 항목을 큐에서 내려 `abandoned` 기록으로 남긴다. 조용히 사라지지
않도록 홈에 `업로드 실패 기록됨`을 표시한다.

### 5. backoff에 지터가 없었다

지연이 `2^attempt`로 결정론적이어서, 오프라인 구간에 쌓인 러닝이 모두 같은
초에 재시도했다. fingerprint 기반 full-jitter로 바꿨다. 40개 항목이 40개의
서로 다른 초로 흩어지는 것을 테스트로 확인했다.

### 6. coroutine 예외가 동기화를 영구히 멈췄다

`syncing` 플래그가 `try/finally` 밖에 있었다. 손상된 백업에서 복구된 항목이
`BuildJson`에서 예외를 던지면 `syncing`이 true로 남아 앱 재시작 전까지 모든
업로드가 멈췄다. `finally`로 해제하고, 큐 로딩 시 fingerprint가 빈 항목을
미리 걷어낸다.

### 7. 재로그인 뒤에도 최대 30분을 기다렸다

인증 실패로 backoff가 걸린 항목은 세션이 복구돼도 예약 시각까지 기다렸다.
세션이 `authenticated`가 되면 backoff를 즉시 해제하고 다시 시도한다.

### 8. 2xx인데 본문을 못 읽으면 러닝을 버렸다

`SERVER_RESPONSE_INVALID`는 서버 상태를 알 수 없다는 뜻이다. 이전에는 실패로
확정했다. 이제 재시도한다. 서버가 이미 저장했다면 다음 시도에서 duplicate로
확인되어 정확히 한 번만 반영된다.

## Unity Editor 없이 검증하는 경로

업로드 판정 규칙을 `V11UploadPolicy.cs`로 분리했다. 이 파일은 UnityEngine을
참조하지 않으므로 평범한 .NET SDK 8이 그대로 컴파일한다.
`client/dotnet/RunningUp.V11.Domain.Tests`는 사본이 아니라 런타임이 쓰는 바로
그 파일을 컴파일해 61개 assertion을 실행한다. Unity Editor가 없는 이 환경과
CI에서도 401/403 refresh, 409/duplicate, 재시도·포기·지터 규칙이 회귀 검증된다.

`npm run test:domain`으로 실행하며 `npm run test:unity`를 대체하지 않는다.

## 이번 실행에서 실제로 통과한 검증

| 명령 | 결과 |
|---|---|
| `npm run validate` | 53/53 PASS |
| `npm run validate:legacy` | hits 0, forbidden archives 0 |
| `npm test` | 16/16 PASS |
| `npm run test:db` | pgTAP 60/60 assertions PASS (PostgreSQL 16.13) |
| `npm run test:domain` | 61/61 assertions PASS (.NET SDK 8.0.129) |
| `npm run art:validate` | `BLOCKED_ART_ASSET`, `massGenerationAllowed=false` |
| `npm run art:gate` | 의도대로 실패 |
| `npm run test:unity` | `BLOCKED_TOOLCHAIN` — 이 환경에 Unity Editor가 없다 |
| `npm run build:android:smoke` | `BLOCKED_TOOLCHAIN` — Unity와 Android SDK가 없다 |

Unity EditMode 테스트 4개를 추가했으나 이 환경에서는 실행하지 못했다.
Editor가 있는 머신에서 반드시 다시 돌려야 한다.

## 재평가

| 항목 | 반복 3 | 반복 4 | 근거 |
|---|---:|---:|---|
| 러닝 게임 정체성 | 82 | 82 | 방향 변화 없음. 전투 잔재 0건 유지. |
| premium 3등신 캐릭터·아트·애니메이션 | 18 | 18 | 라이선스 확인 Production Art가 없다. |
| 현실 러닝과 성장 변화의 가시성 | 76 | 76 | 규칙은 정확해졌지만 원격 서버 증거는 여전히 없다. |
| 홈 재미·속도감·세계 몰입 | 30 | 30 | primitive 기능 프로토타입이다. |
| UI 가독성·모바일 세로화면 | 76 | 76 | 새 업로드 상태 문구만 추가했고 실기기 캡처는 없다. |
| 콘텐츠 깊이·1~2년 확장성 | 82 | 82 | 카탈로그 수량과 검증을 유지했다. |
| Supabase 무결성·멱등성·RLS | 90 | 90 | 서버 스키마는 그대로다. 원격 배포 증거가 없다. |
| 연동·백그라운드·오프라인 복구 | 78 | 84 | 큐 영구 정지, 403 미갱신, 409 오분류, 무한 재시도를 실제 테스트로 막았다. 원격 uploader 실측과 실기기 장시간 검증은 남아 있다. |
| 저사양 성능·메모리·발열·배터리 | 42 | 42 | 실기기 60분 측정이 없다. |
| APK 설치·실행·업데이트 안정성 | 86 | 86 | 이번 소스로 APK를 다시 빌드하지 못했다. |

평균은 66.6점이다. 연동·복구 항목만 올렸고, 그 근거는 이번 실행에서 실제로
통과한 61개 assertion과 4개의 새 EditMode 테스트다. 나머지 항목은 새 증거가
없으므로 올리지 않았다.

## 현재 판정

- `BLOCKED_ART_ASSET`, `BLOCKED_SUPABASE_PROJECT`, `BLOCKED_REAL_DEVICE_QA`는
  그대로다.
- 반복 3의 smoke APK
  (`e27a4a77427e62332486ebc408a0eefaad4bca7f8ce80386e00f9d117ad7d94b`)는 이번
  업로더 수정을 포함하지 않는다. Unity와 Android SDK가 있는 머신에서 반드시
  다시 빌드해야 한다.
- `FULL_SIDELOAD`와 GitHub Release는 여전히 PASS가 아니다.
