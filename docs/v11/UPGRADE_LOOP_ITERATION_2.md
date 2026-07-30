# V11 검증형 업그레이드 반복 2

반복 2는 서버가 승인하지 않은 러닝이 로컬 영구 성장으로 먼저 반영되는 문제, 오프라인 큐 파일 손상, Android 프로세스 재생성 뒤 GPS 세션 유실을 우선 수정했다.

## 실제 변경

- `AcceptVerifiedRun`은 검증 후보를 원자적 오프라인 큐에만 보관하고 영구 성장에는 반영하지 않는다.
- `ConfirmServerAcceptedRun`만 로컬 영구 성장을 반영하고 큐에서 항목을 제거한다.
- 서버 승인 fingerprint를 로컬 진행 상태에 보관해 승인 응답 재처리와 앱 재시작 뒤에도 성장 중복을 막는다.
- 홈은 `업로드 대기 N`과 `서버 승인 러닝 N.Nkm`를 실제 런타임 상태로 표시한다.
- 오프라인 큐는 temp write, fsync, atomic replace, backup recovery를 사용한다.
- Android 직접 GPS foreground service는 `START_STICKY`와 앱 전용 SharedPreferences를 사용해 프로세스 재생성 뒤 같은 NDJSON 파일에 이어 쓴다.
- 명시적 종료가 재생성 직후 들어와도 저장된 파일 경로를 복구해 Unity 검증기로 전달한다.
- Android 빌드는 `BuildOptions.CleanBuildCache`를 사용해 증분 APK의 불필요한 ZIP 간격을 제거한다.

## 검증

- 콘텐츠·정책 Node 테스트는 15/15 PASS.
- Supabase migration과 pgTAP은 독립 PostgreSQL 17 DB에서 60/60 PASS.
- Unity EditMode는 12/12 PASS.
- Unity PlayMode는 1/1 PASS.
- Supabase CLI에서 접근 가능한 프로젝트는 확인했으나 RunningUp 전용 프로젝트가 없었다. 기존 다른 서비스 프로젝트에는 migration을 적용하지 않았다.

## 10개 항목 재평가

| 항목 | 반복 1 | 반복 2 | 근거 |
|---|---:|---:|---|
| 러닝 게임 정체성 | 78 | 82 | 검증 후보, 서버 승인, 영구 성장의 경계가 UI와 런타임에서 분명해졌다. |
| premium 3등신 캐릭터·아트·애니메이션 | 18 | 18 | 라이선스 확인 Production Art가 없어 `BLOCKED_ART_ASSET`이다. |
| 현실 러닝→눈에 보이는 성장 | 62 | 72 | 서버 승인 전 선반영을 제거하고 pending/approved 상태를 분리했다. 실제 원격 uploader는 남아 있다. |
| 홈 재미·속도감·세계 몰입 | 30 | 30 | 기능 프로토타입 primitive 환경은 최종 아트가 아니다. |
| UI 가독성·모바일 세로화면 | 68 | 72 | 홈 pending/approved 수치가 실제 상태를 표시한다. |
| 콘텐츠 깊이·1~2년 확장성 | 82 | 82 | 정본 카탈로그 수량과 검증은 유지됐다. |
| Supabase 무결성·멱등성·RLS | 88 | 90 | 영구 성장 선반영을 차단했고 60개 pgTAP assertion을 통과했다. 원격 배포는 미실행이다. |
| 연동·백그라운드·오프라인 복구 | 62 | 74 | atomic backup 복구와 GPS 프로세스 복구를 추가했다. 원격 uploader와 실기기 장시간 검증은 남아 있다. |
| 저사양 성능·메모리·발열·배터리 | 42 | 42 | 장시간 실기기 측정이 없다. |
| APK 설치·실행·업데이트 안정성 | 78 | 82 | 101,809,763 bytes compact APK를 업데이트 설치하고 cold start·fatal log 0건을 확인했다. |

현재 평균은 64.4점이다. 자동화 검증 항목은 개선됐지만 Production Art와 실기기 성능이 전체 출시에 필요한 90점 기준을 충족하지 못한다.

## 현재 판정

- 기능 검증 1차 APK는 배포 후보가 아니라 사용자·후속 개발자 확인용이다.
- `FULL_SIDELOAD`와 GitHub Release는 `BLOCKED_ART_ASSET`, `BLOCKED_SUPABASE_PROJECT`, `BLOCKED_REAL_DEVICE_QA` 때문에 PASS가 아니다.
- 사용자의 그래픽 임시 허용은 기능 APK 전달 권한으로만 해석하며 기존 Production Art gate를 우회하지 않는다.
