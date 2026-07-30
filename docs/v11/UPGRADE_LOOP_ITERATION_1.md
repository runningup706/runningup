# V11 검증형 업그레이드 반복 1

반복 1은 기준선의 접근 불가 UI, 동작하지 않는 Run 목표, 실제 capability 오표시와 Supabase 클라이언트 위조 경로를 우선 수정했다.

## 실제 변경

- CanvasScaler를 세로 화면의 실제 폭에 고정해 `1080x2400`에서 우측 열과 하단 다섯 탭이 잘리지 않게 했다.
- 모든 화면의 제목과 부제 수직 영역을 분리했다.
- FREE, EASY, TEMPO, INTERVAL, LONG을 실제 Button으로 바꾸고 선택 상태를 색과 `선택됨` 문구로 표시하며 재실행 후에도 유지하게 했다.
- Direct GPS와 Health Connect의 실제 기기 capability를 읽어 권한 필요, 사용 가능, 업데이트 필요, 사용 불가를 구분했다.
- `my_runners`와 `profiles`의 클라이언트 전체 열 쓰기를 제거하고 허용 열만 grant했다.
- 요청자가 자신의 친구 요청을 승인하거나 accepted 관계를 pending으로 되돌리는 상태 위조를 RLS와 trigger로 차단했다.
- profile과 My Runner의 `updated_at`은 서버 trigger가 관리하게 했다.

## 검증

- Node 14/14 PASS.
- V11 validator 53/53 PASS.
- legacy runtime 및 archive 잔재 0건.
- Supabase pgTAP 60/60 PASS.
- Unity EditMode 10/10 PASS.
- Unity PlayMode 1/1 PASS.
- Android smoke APK 빌드와 독립 verifier PASS.
- 기존 설치 위에 `adb install -r` update 성공.
- cold start `TotalTime 1665ms`.
- RunningUp fatal exception 0건.
- `1080x2400` 실화면에서 Runner, Run, World, Crew 탭 접근을 확인했다.
- 실화면에서 TEMPO 선택과 선택 상태 변화를 확인했다.
- 실화면에서 Direct GPS `위치 권한 필요`, Health Connect `사용 가능`, 파일 선택 가능 상태를 확인했다.

실화면 원본은 `artifacts/upgrade-loop/iteration1/flow`에 있다.

## 재채점

| 항목 | 기준선 | 반복 1 | 근거 |
|---|---:|---:|---|
| 러닝 게임 정체성 | 72 | 78 | Run 목표와 P0 source 상태가 실제로 동작한다. |
| 3등신 외형·표정·달리기 | 18 | 18 | Production Art asset이 없으므로 상승 없음. |
| 현실 러닝과 성장 변화 가시성 | 58 | 62 | source 상태는 명확해졌지만 서버 승인 전 로컬 영구 반영 문제는 남았다. |
| 홈 재미·속도감·세계 몰입 | 27 | 30 | 화면 잘림은 제거했지만 primitive 아트다. |
| UI 가독성·세로 완성도 | 24 | 68 | 제목 중첩, 우측 잘림, Crew 접근 불가와 목표 가짜 조작을 제거했다. |
| 콘텐츠 깊이·1~2년 확장성 | 82 | 82 | catalog는 유지됐고 runtime 깊이는 추가하지 않았다. |
| Supabase 무결성·RLS | 76 | 88 | 성장 위조와 friendship 전환 위조를 실제 권한 테스트로 차단했다. |
| 기록 연동·백그라운드·복구 | 60 | 62 | capability truth는 개선됐으나 server uploader는 아직 없다. |
| 저사양 성능·메모리·배터리 | 42 | 42 | 물리 기기와 frame timing 증거가 없어 상승 없음. |
| APK 설치·실행·업데이트 | 74 | 78 | update install은 통과했지만 incremental APK에 불필요한 ZIP gap이 생겼다. |

평균은 `60.8점`이다. 완료 조건에 미달하므로 반복 2로 진행한다.

## 반복 2 입력

1. offline queue 원자 저장과 손상 복구를 강화한다.
2. 서버 확인 전 진행을 영구 성장으로 확정하는 경로를 분리한다.
3. 직접 GPS foreground service의 process 재시작 복구를 강화한다.
4. incremental Android APK의 dead ZIP gap을 제거해 재현 가능한 compact build를 만든다.
5. Production Art gate는 계속 `BLOCKED_ART_ASSET`으로 유지한다.
