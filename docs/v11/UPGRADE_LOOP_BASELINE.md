# V11 검증형 업그레이드 기준선

측정 시각은 2026-07-30 Asia/Seoul이다. 이 문서는 이번 업그레이드 루프에서 코드를 수정하기 전에 설치된 APK, Unity 프로젝트, Supabase migration과 실제 실행 결과를 다시 측정한 기준선이다.

## 실행 환경과 증거

- Unity는 `6000.3.20f1`이다.
- Android emulator는 Android 16, API 36, `1080x2400`, `420dpi`, ARM64다.
- 설치 APK는 `artifacts/builds/RunningUp-V11-SMOKE.apk`다.
- APK 크기는 `101,822,273` bytes이며 SHA-256은 `70f427db5a4eaf9a3091ec1b71611bac341fbcefd66ad3266ee6221312a35f3d`다.
- 설치 기기에서 다시 추출한 base APK가 위 APK와 byte-for-byte 동일하다.
- package는 `kr.robom.runningup`, version은 `11.0.0 (110000)`, minSdk는 28, targetSdk는 36, ABI는 ARM64다.
- cold start는 `TotalTime 1104ms`, `WaitTime 1352ms`다.
- 약 36초 실행 및 탭 전환 뒤 `TOTAL PSS 377,317KB`, `TOTAL RSS 466,252KB`다.
- 앱 fatal exception은 0건이다. Android permission controller가 위치 권한 화면을 처리하면서 emulator system ANR을 1건 발생시켰으나 RunningUp process의 crash는 아니다.
- `npm run validate`는 53개 검사를 모두 통과했다.
- `npm run validate:legacy`는 active runtime 금지 잔재 0건, 금지 archive 0건이다.
- Node test는 14개를 모두 통과했다.
- Supabase pgTAP은 migration을 새 테스트 DB에 적용한 뒤 47개 assertion을 모두 통과했다.
- Unity EditMode 9개와 PlayMode 1개가 모두 통과했다.
- Android smoke 독립 검증과 설치·실행이 통과했다.
- Supabase CLI `2.109.1`을 확인했다. Docker daemon이 없어 local Supabase stack과 CLI advisor는 실행하지 못했고, 독립 PostgreSQL 17 테스트 DB와 pgTAP으로 검증했다.
- Production Art gate는 의도대로 exit 2, `BLOCKED_ART_ASSET`이다.

증거 원본은 `artifacts/upgrade-loop/baseline`에 있다.

## 실제 화면과 상호작용 판정

현재 실행에서 `01-home.png`부터 `13-track-file-cancelled.png`까지 직접 캡처했다.

- Home은 항상 달리는 캐릭터와 러닝 중심 문구를 표시한다.
- Runner, Run, World 화면의 제목과 부제가 서로 겹친다.
- `1080x2400`에서 우측 카드와 World 대륙 열이 화면 밖으로 잘린다.
- 하단 `크루` 탭이 화면 밖으로 잘려 실제 터치로 접근할 수 없다.
- Run의 `TEMPO`를 눌러도 `EASY` 선택 상태가 유지된다. 목표 모드는 이미지일 뿐 실제 버튼이 아니다.
- Direct GPS는 Android 위치 권한 요청까지 진입한다. 권한 요청 직후 앱 안에서 진행 상태를 즉시 설명하지 못한다.
- Health Connect 권한 activity와 최근 러닝 읽기 경로가 존재하고 실제 시스템 화면까지 진입한다.
- FIT·GPX·TCX picker activity가 실행되며 취소 결과가 앱으로 돌아온다. 현재 캡처 타이밍에서는 system picker 화면 자체가 증거 이미지에 남지 않았다.
- 기능 프로토타입의 캐릭터와 도시는 primitive 기반이므로 Production Art가 아니며 최종 품질 점수에 사용할 수 없다.

## Supabase 기준선 판정

확인된 강점은 다음과 같다.

- 노출 public table 8개에 RLS가 활성화돼 있다.
- `my_verified_run_summary`는 `security_invoker` view다.
- 검증 러닝 수집은 `security definer`, 빈 `search_path`, 인증 사용자 제한을 사용한다.
- canonical run fingerprint와 source record에 unique constraint가 있다.
- reward ledger는 run당 unique index와 update/delete 거부 trigger가 있다.
- Daily Run Contract는 날짜당 1개이며 추가 러닝도 표준 보상을 받는다.
- 85·10·5 성장 배분, 1000km World Crown과 중복 fingerprint를 pgTAP으로 검증한다.

확인된 결함은 다음과 같다.

- `authenticated`에 `my_runners` 전체 열 INSERT 권한이 있어 bootstrap row가 없는 경우 성장 거리와 포인트를 위조할 수 있다.
- `profiles`의 UPDATE가 전체 열에 열려 있어 `created_at` 등 서버 관리 열까지 수정할 수 있다.
- friendship UPDATE policy가 양쪽 participant의 임의 상태 변경을 허용해 요청자가 자신의 요청을 `accepted`로 바꿀 수 있다.
- Unity offline queue는 서버 업로더와 연결되지 않아 `ingest_verified_run` RPC를 호출하거나 성공 항목을 acknowledge하지 않는다.
- 로컬 진행은 서버 승인 전에 영구 PlayerPrefs에 반영된다. 서버 거부 시 rollback 또는 provisional 표시가 없다.

## 기준선 점수

| 항목 | 점수 | 판정 근거 |
|---|---:|---|
| 러닝 게임 정체성 | 72 | 전투 잔재는 0건이고 러닝 수집 표면은 있으나 목표 선택과 서버 동기화가 끊겨 있다. |
| 3등신 외형·표정·달리기 | 18 | 기능 prototype만 있고 Production Art asset, production scene, human QA가 없다. |
| 현실 러닝과 성장 변화 가시성 | 58 | GPS·Health Connect·파일 수집과 85% 규칙은 있으나 서버 승인 전 로컬 영구 반영이며 화면 변화가 숫자 위주다. |
| 홈 재미·속도감·세계 몰입 | 27 | 지속 달리기는 확인했지만 primitive 도시·캐릭터이고 UI가 잘린다. |
| UI 가독성·세로 완성도 | 24 | 제목 중첩, 우측 잘림, Crew 접근 불가, 목표 모드 가짜 조작이 재현됐다. |
| 콘텐츠 깊이·1~2년 확장성 | 82 | 12대륙·192지역·2304코스·120 checkpoint 데이터 검증은 통과하지만 runtime 표현은 얕다. |
| Supabase 무결성·RLS | 76 | 47 pgTAP 통과와 원자 RPC가 있으나 INSERT 위조와 friendship 상태 전환 취약점이 있다. |
| 기록 연동·백그라운드·복구 | 60 | 세 P0 수집 경로와 foreground service·offline queue가 있으나 실제 서버 uploader와 승인 복구가 없다. |
| 저사양 성능·메모리·배터리 | 42 | cold start는 양호하지만 emulator PSS가 약 368MB이고 Unity frame timing·실기기 발열·배터리 증거가 없다. |
| APK 설치·실행·업데이트 | 74 | smoke APK 설치·실행·byte match는 통과했으나 dev signature이며 update/production FULL_SIDELOAD가 아니다. |

평균은 `53.3점`이다. 모든 항목 90점 조건에 미달한다.

## 1차 반복 우선순위

1. 화면 폭 scaling, 제목 계층과 하단 다섯 탭을 고쳐 모든 세로 화면에서 조작 가능하게 한다.
2. 다섯 Run 목표를 실제 선택 가능한 버튼으로 연결하고 회귀 테스트를 추가한다.
3. Supabase의 growth INSERT 위조, profile 열 범위와 friendship 상태 전환을 최소 권한으로 잠그고 pgTAP을 보강한다.
4. source capability와 비동기 system activity 상태를 앱 화면에 명확히 표시한다.
5. Production Art는 primitive 확장으로 우회하지 않고 `BLOCKED_ART_ASSET`을 유지한다.

이 기준선은 `PASS`가 아니며 업그레이드 반복 1의 입력이다.
