# RunningUp V11 handoff

<!-- 다음 작업자가 Production Art 차단 경계를 훼손하지 않고 바로 이어가도록 상태를 기록한다. -->

## 현재 상태

`ITERATION_4_FUNCTIONAL_READY_BLOCKED_RELEASE`

V11 정본은 전부 읽고 무결성을 검증했다. V5~V10 활성 런타임은 clean rebuild
원칙에 따라 제거됐고 별도 legacy backup 폴더는 없다. V11 전체 카탈로그,
Supabase, Unity 기능 프로토타입, Android P0 bridge와 자동 검증 기반은 실행된다.

이 저장소는 반복 4에서 v4.0.0 APEX1000 트리를 V11 clean rebuild로 교체했다.
122개 파일을 제거했고 그중 33개가 금지 런타임 용어를 포함했다. 내역은
`DEPRECATED_PURGE_MANIFEST.json`의 두 번째 purge 기록에 있다.

현재 화면은 기능 프로토타입이며 Production Art가 아니다. 시각 기준선은 평균
22.29점으로 `FUNCTIONAL_PROTOTYPE_REJECTED`다. 기본 도형·임시 캐릭터·단색
도시를 정식 아트로 확장하지 않는다.

## 현재 확인한 PASS

- 콘텐츠 검증 53/53.
- Node 회귀 테스트 16/16.
- Supabase pgTAP 60/60.
- 업로드 판정 도메인 테스트 61/61. `npm run test:domain`은 Unity Editor 없이
  .NET SDK 8로 `V11UploadPolicy.cs` **원본 파일**을 컴파일해 실행한다.
- Unity EditMode 17/17, PlayMode 1/1 (반복 3 기준. 반복 4가 추가한 4개
  EditMode 테스트는 Editor가 있는 머신에서 다시 돌려야 한다).
- Unity 6000.3.20f1, URP·Shader Graph 17.3.0, Cinemachine 3.1.7,
  Animation Rigging 1.4.1.
- Android 16 API 36 에뮬레이터에서 최신 V11 smoke APK 업데이트 설치,
  cold start 1,231ms, 홈·크루 활성 탭 표시와 Supabase 상태 표시,
  fatal exception·Unity 오류 0건을 확인했다.
- smoke APK는 102,232,511 bytes이며 SHA-256은
  `e27a4a77427e62332486ebc408a0eefaad4bca7f8ce80386e00f9d117ad7d94b`다.
- APK의 ARM64, portrait, min SDK 28, target SDK 36, GPS·foreground
  service·Health Connect 권한, v2 서명, zip 정렬을 독립 검증했다.
- APK ZIP의 최대 local-entry 간격은 4,096 bytes이며 100KB 초과 비정상
  간격은 0건이다. 모든 Android 빌드는 clean cache를 강제하고 독립 layout
  verifier가 이 회귀를 차단한다.
- 서버 승인 전에는 영구 성장을 반영하지 않고 atomic offline queue에 보관한다.
- Supabase publishable config, 메모리 전용 인증 세션, 401·403 refresh,
  `ingest_verified_run` 순차 uploader가 소스에 포함됐다.
- 반복 4가 업로더에서 고친 것: 실패한 러닝 하나가 이후 모든 러닝을 영구히
  막던 head-of-line 정지, RPC `AUTH_REQUIRED`(errcode 42501 → HTTP 403)가
  세션을 갱신하지 못하던 문제, 409/duplicate를 영구 거절로 보던 오분류,
  상한 없는 무한 재시도, 지터 없는 backoff, coroutine 예외 뒤 동기화가 영영
  멈추던 문제, 재로그인 뒤에도 backoff를 기다리던 문제. 자세한 내용은
  `docs/v11/UPGRADE_LOOP_ITERATION_4.md`에 있다.
- 직접 GPS foreground service는 프로세스 재생성 뒤 같은 NDJSON 파일에 이어 쓴다.

## 이 저장소의 환경 차단

- Unity Editor가 없다. `npm run test:unity`는 `BLOCKED_TOOLCHAIN`이다.
- Android SDK가 없다(`dl.google.com` 네트워크 정책 차단).
  `npm run build:android:smoke`는 `BLOCKED_TOOLCHAIN`이다.
- 따라서 반복 3의 smoke APK
  `e27a4a77427e62332486ebc408a0eefaad4bca7f8ce80386e00f9d117ad7d94b`는
  반복 4의 업로더 수정을 **포함하지 않는다**. Unity와 Android SDK가 있는
  머신에서 반드시 다시 빌드해야 한다.

## 정식 빌드 차단 상태

`BLOCKED_ART_ASSET`

- Blender가 설치되어 있지 않다.
- 라이선스 확인 완료 My Runner, 도시, 달리기 모션 원본이 없다.
- Production Scene, Production prefab, 9개 모션, Shader Graph 결과,
  라이선스 증거가 없다.
- 동일 1080x1920 Production 캡처와 사람의 미적 평가가 없다.
- 따라서 `massGenerationAllowed=false`이며 FULL_SIDELOAD는 의도대로 빌드
  전에 차단된다.

`BLOCKED_SUPABASE_PROJECT`

- Supabase CLI 인증은 동작하지만 확인된 프로젝트는 RunningUp 전용이 아니다.
- 기존 다른 서비스 DB에는 V11 migration을 적용하지 않았다.
- RunningUp 전용 project ref 또는 새 프로젝트 생성 승인이 필요하다.
- 인증 세션과 `ingest_verified_run` uploader 소스·회귀 테스트는 구현됐지만
  RunningUp 전용 원격 프로젝트에서 실제 JWT·RPC 통합 검증은 아직 없다.

`BLOCKED_REAL_DEVICE_QA`

- 실제 Android 기기의 화면 꺼짐 GPS, Health Connect 기록, 60분 발열·배터리·메모리 검증이 없다.

정확한 추천 자산과 라이선스·버전·URP 조건은 `ASSET_SELECTION.md`에 있다.
구매 또는 기존 합법 라이선스 확인 뒤 자산을
`Assets/RunningUp/ProductionArt/Vendor` 아래로만 인입한다.

## 다음 실행 순서

0. Unity Editor와 Android SDK가 있는 머신에서 `npm run test:unity`와
   `npm run build:android:smoke`를 돌려 반복 4의 업로더 수정이 포함된 APK를
   다시 만든다.
1. RunningUp 전용 Supabase project ref를 확인하고 migration을 원격 적용한다.
2. 현재 Unity 인증 세션·RPC uploader를 전용 프로젝트의 실제 JWT에 연결해
   승인 뒤에만 영구 성장시키는 원격 통합 테스트를 통과한다. 특히 403
   `AUTH_REQUIRED`, 409 duplicate, 앱 강제 종료 뒤 재업로드를 실제 서버에서
   확인한다.
3. Blender를 설치하거나 설치된 바이너리 경로를 제공한다.
4. `ASSET_SELECTION.md`의 캐릭터·도시·모션 자산을 구매 또는 선택한다.
5. My Runner 1명과 도시 코스 1개만 Production Art Vertical Slice로 만든다.
6. 1080x1920 목표·Unity 캡처와 2160x1920 비교 이미지를 생성한다.
7. 사람이 7개 항목을 평가해 평균 90점, 개별 85점, primitive·placeholder
   0건을 확인한다.
8. 첫 Vertical Slice가 합격한 뒤에만 모듈형 시스템과 대량 제작을 시작한다.
9. 이후 FULL_SIDELOAD, 실기기 P0 검증, 배포 서명, GitHub Release와
   재다운로드 SHA 검증을 진행한다.
