# RunningUp V11 Production Art Pipeline Status

확인 시각은 2026-07-30 Asia/Seoul이다.

## 실행 결과

| 범주 | 상태 | 증거 |
|---|---|---|
| Unity Editor | PASS | 6000.3.20f1 batchmode와 Metal 캡처 실행 |
| URP | PASS | 17.3.0 설치, pipeline/renderer asset 생성, GraphicsSettings 연결 |
| Shader Graph | PASS | 17.3.0 설치와 package lock 확인 |
| Cinemachine | PASS | 3.1.7 설치와 package lock 확인 |
| Animation Rigging | PASS | 1.4.1 설치와 package lock 확인 |
| Blender | INSTALL_REQUIRED | command와 `/Applications/Blender.app` 모두 없음 |
| Android 기능 smoke | PASS | 101,809,763 bytes ARM64 APK, SDK 36, V11 권한·v2 서명·zip 정렬 검증 |
| Android 에뮬레이터 실행 | PASS | Android 16 API 36에 V11 업데이트 설치, cold start 1,854ms, fatal exception 0건 |
| 캐릭터 원본 | BLOCKED_ART_ASSET | 추천 에셋이 저장소에 없고 라이선스 증거도 없음 |
| 도시 원본 | BLOCKED_ART_ASSET | 추천 에셋이 저장소에 없음 |
| 달리기 mocap | BLOCKED_ART_ASSET | 추천 에셋이 저장소에 없음 |
| Production Scene | BLOCKED_ART_ASSET | 가짜 장면을 생성하지 않음 |
| 사람의 미적 평가 | BLOCKED_ART_ASSET | Production Art 캡처가 없으므로 미작성 |
| 대량 생성 | BLOCKED | `massGenerationAllowed=false` |

## 적용한 경계

- `LiveJourneyHome.unity`와 `Assets/RunningUp/Generated`는 기능 프로토타입 전용이다.
- 기능 장면에는 `FunctionalPrototypeOnlyMarker`가 붙는다.
- FULL_SIDELOAD는 `V11ProductionArtGate.ValidateOrThrow()`를 먼저 통과해야 한다.
- 정식 장면은 `Assets/RunningUp/ProductionArt/Scenes/LiveJourneyProduction.unity`만 허용한다.
- 정식 장면의 Generated, KayKit, ChibiMeshFactory, primitive, placeholder, temp 참조는 금지한다.
- 자동화가 미적 PASS를 만들 수 없다. 사람의 평가자 이름과 동일 해상도 이미지가 필요하다.

## 현재 검증 수치

- 콘텐츠 검증 53/53 PASS.
- Node 테스트 15/15 PASS. Production Art 경계, 패키지 잠금, AGP 9 내장 Kotlin, GPS 프로세스 복구를 검증한다.
- Supabase pgTAP 60/60 PASS.
- Unity EditMode 12/12 PASS.
- Unity PlayMode 1/1 PASS.
- 기능 프로토타입 기준 캐릭터는 3.08 heads, 28,640 triangles, 48 bones, 12 expressions다. 이 수치는 정식 아트 품질 PASS가 아니다.
- 기능 프로토타입 시각 기준선은 평균 22.29점으로 REJECTED다.
- 기능 smoke APK는 `RunningUp-V11-SMOKE.apk`, 101,809,763 bytes, SHA-256 `812fe4aab14d4f00d18c73d306dded7ede0df5620269a5275fef556cba64fe25`다.
- smoke APK의 `kr.robom.runningup`, versionName 11.0.0, versionCode 110000, min SDK 28, target SDK 36, ARM64, portrait, GPS·foreground service·Health Connect 권한을 독립 확인했다.
- 최신 에뮬레이터 실제 화면은 `artifacts/upgrade-loop/iteration2/flow/03-home-footprint-fixed.png`다. 이는 기능 실행 증거이며 Production Art 합격 증거가 아니다.

## 다음 외부 입력

`ASSET_SELECTION.md`의 세 정확한 에셋에 대한 구매 또는 기존 합법 라이선스 확인이 필요하다. 자산을 Unity 프로젝트로 인입한 뒤에는 코드·임포터·빌드 게이트가 자동으로 다음 누락 항목을 보고한다.
