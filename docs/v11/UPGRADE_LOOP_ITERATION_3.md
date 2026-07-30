# V11 검증형 업그레이드 반복 3

반복 3은 서버 업로더가 APK에 포함되지 않은 공백, 하단 탭 선택 표시 오류,
Android 증분 빌드의 불필요한 ZIP 공백 재발을 수정했다.

## 실제 변경

- 빌드 환경에서 주입되는 Supabase project URL과 publishable key를 검증하는
  runtime config를 추가했다.
- access token과 refresh token을 메모리에만 유지하는 인증 경계를 추가했다.
- 401이면 세션을 한 번 refresh하고, 연결 오류·408·425·429·5xx는 atomic
  offline queue에 지수형 재시도로 남기는 verified-run uploader를 추가했다.
- RPC 성공 응답의 `run_id`를 확인한 뒤에만 `ConfirmServerAcceptedRun`으로
  영구 성장을 적용한다.
- 홈에 `서버 설정 필요`, `인증 필요`, `업로드 중`, `동기화됨` 상태를 실제
  uploader 상태로 표시한다.
- 하단 탭은 현재 화면의 배경과 글자색만 활성 색으로 표시한다. 기존에는
  투명 버튼에 ColorBlock 곱셈을 적용해 중앙 RUN만 항상 활성처럼 보였다.
- 모든 Android 빌드에 `BuildOptions.CleanBuildCache`를 강제한다.
- APK 중앙 디렉터리와 local header를 독립 파싱해 100KB 초과 dead ZIP gap을
  실패시키는 `verify-apk-zip-layout.mjs`를 빌드 gate에 추가했다.

## 자동 검증

- V11 콘텐츠 검증 53/53 PASS.
- legacy runtime·금지 archive 0건.
- Node 회귀 테스트 16/16 PASS.
- Supabase pgTAP 60/60 PASS.
- Unity EditMode 17/17 PASS.
- Unity PlayMode 1/1 PASS.
- Production Art 파이프라인 검증 PASS.
- Production Art asset gate는 정확히 `BLOCKED_ART_ASSET`, exit 2다.

## APK 검증

- 파일은 `RunningUp-V11-SMOKE.apk`다.
- 크기는 102,232,511 bytes다.
- SHA-256은
  `e27a4a77427e62332486ebc408a0eefaad4bca7f8ce80386e00f9d117ad7d94b`다.
- package는 `kr.robom.runningup`, versionName은 11.0.0,
  versionCode는 110000이다.
- minSdk 28, targetSdk 36, ARM64, portrait, v2 서명, 16KB page alignment를
  독립 검증했다.
- APK ZIP local-entry 최대 공백은 4,096 bytes이며 100KB 초과는 0건이다.
- 수정 전 증분 APK는 156,426,078 bytes, 최대 공백 26,072,382 bytes였다.
- Android 16 API 36, 1080×2400, 420dpi 에뮬레이터에 업데이트 설치했다.
- cold start는 1,231ms다.
- 실행 후 PSS는 383,533KB, RSS는 468,748KB다.
- fatal exception과 Unity 오류는 각각 0건이다.
- 홈과 크루 화면에서 해당 하단 탭만 파란 활성 상태인 것을 실제 캡처로 확인했다.
- 홈에서 Supabase 미설정 상태가 `대기 0 · 서버 설정 필요`로 표시됐다.

## 재평가

| 항목 | 반복 2 | 반복 3 | 근거 |
|---|---:|---:|---|
| 러닝 게임 정체성 | 82 | 82 | 방향은 유지됐고 새 전투 잔재는 0건이다. |
| premium 3등신 캐릭터·아트·애니메이션 | 18 | 18 | 라이선스 확인 Production Art가 없다. |
| 현실 러닝과 성장 변화의 가시성 | 72 | 76 | 서버 업로드 상태와 승인 경계가 APK 화면에 포함됐다. |
| 홈 재미·속도감·세계 몰입 | 30 | 30 | primitive 기능 프로토타입이므로 상승시키지 않는다. |
| UI 가독성·모바일 세로화면 | 72 | 76 | 현재 화면과 하단 선택 상태가 실제로 일치한다. |
| 콘텐츠 깊이·1~2년 확장성 | 82 | 82 | 정본 카탈로그와 수량을 유지했다. |
| Supabase 무결성·멱등성·RLS | 90 | 90 | uploader는 추가됐지만 원격 프로젝트 증거가 없어 올리지 않는다. |
| 연동·백그라운드·오프라인 복구 | 74 | 78 | 401 refresh·재시도·승인 후 적용 uploader가 포함됐다. |
| 저사양 성능·메모리·발열·배터리 | 42 | 42 | 실제 기기 60분 측정이 없다. |
| APK 설치·실행·업데이트 안정성 | 82 | 86 | compact clean build, update install, cold start, fatal 0을 확인했다. |

현재 평균은 66.0점이다. 자동화와 Android 안정성은 개선됐지만 Production Art,
원격 Supabase, 실제 기기 장시간 QA가 없으므로 완료 기준에는 미달한다.

## 현재 판정

- 최신 smoke APK는 Supabase uploader와 UI·ZIP-layout 수정을 포함한 기능
  검증본이다.
- `BLOCKED_ART_ASSET`, `BLOCKED_SUPABASE_PROJECT`,
  `BLOCKED_REAL_DEVICE_QA`는 그대로다.
- 실제 Production Art와 사람 평가표 없이 `FULL_SIDELOAD`를 만들거나
  GitHub Release 출시본으로 표시하지 않는다.
