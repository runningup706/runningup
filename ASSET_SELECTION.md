# RunningUp V11 Production Art Asset Selection

확인일은 2026-07-30이며, 가격은 세금과 지역 할인에 따라 달라질 수 있다. 아래 에셋은 저장소에 포함되어 있지 않다. 구매 영수증 또는 Unity 계정의 합법적인 다운로드 증거가 확인되기 전에는 정식 빌드에 넣지 않는다.

## 현재 판정

`BLOCKED_ART_ASSET`

현재 저장소에는 목표 화면을 충족하는 라이선스 확인 완료 캐릭터, 도시 환경, 달리기 모션이 없다. `Assets/RunningUp/Generated`와 `ChibiMeshFactory`가 만든 결과는 기능 검증용 프로토타입일 뿐이며 Production Art로 인정하지 않는다. 기본 도형이나 가짜 에셋으로 빈 자리를 채우지 않는다.

## 고정 기술 스택

| 항목 | 고정 버전 | 선택 근거 |
|---|---:|---|
| Unity Editor | 6000.3.20f1 | 현재 프로젝트와 Android 툴체인에서 실제 실행한 버전 |
| Universal Render Pipeline | 17.3.0 | Unity 6000.3.20f1이 실제 해석한 built-in 패키지 |
| Shader Graph | 17.3.0 | 캐릭터 툰 재질과 환경 스타일 통일에 사용하는 정식 패키지 |
| Cinemachine | 3.1.7 | 주자 추적, 세로 화면 점유율, 속도별 FOV를 담당 |
| Animation Rigging | 1.4.1 | 손·발 접지, 워치 시선, 머리와 상체 보정에 사용 |
| Toon solution | Shader Graph 17.3.0 | preview 상태인 Unity Toon Shader 대신 프로젝트와 같은 SRP 버전으로 고정 |

## 구매·선택이 필요한 추천 조합

### 캐릭터

**1순위는 `BoZo: Modular Anime Characters - Base Pack`, 버전 1.8.6이다.**

- 게시자는 BoZo이며 가격은 확인 시점 기준 USD 20이다.
- 라이선스는 Standard Unity Asset Store EULA, Single Entity이다.
- 원본 Unity 버전은 2022.3.61f1 이상이며 URP 호환으로 명시되어 있다.
- 100개 모듈, 앞·뒤 헤어 조합, 조절 가능한 신체·얼굴 비율, 얼굴 및 표정 BlendShape, Humanoid 리그, 눈·턱 뼈, 신발 12종, 커스텀 툰 아웃라인 셰이더가 있다.
- 13k~25k tris와 2K diffuse/normal 텍스처 범위라 모바일 LOD 제작의 원본으로 적합하다.
- 목표 화면의 큰 머리, 애니메이션 얼굴, 모듈형 헤어·의상·신발 시스템에 가장 가깝다.
- 애니메이션과 LOD는 포함되지 않으므로 별도 달리기 모션과 LOD 제작이 필수다.
- 공식 페이지는 <https://assetstore.unity.com/packages/3d/characters/humanoids/humans/bozo-modular-anime-characters-base-pack-323550>이다.

보류 후보는 `Cute Characters – Modular Animated Pack`이다. Unity Asset Store에서 판매 중인 모듈형 캐릭터 팩이지만, 현재 확인 가능한 공식 페이지 정보만으로는 목표의 애니메이션풍 얼굴과 3등신 비율을 1순위보다 더 정확히 충족한다고 입증되지 않았다. 1순위 캐릭터가 실제 Unity 캡처에서 85점을 넘지 못할 때만 재평가한다.

### 도시 코스

**1순위는 `Suburban Stylized Pack`, 버전 1.0.0이다.**

- 게시자는 Nosense Studio이며 가격은 확인 시점 기준 USD 39.99이다.
- 라이선스는 Standard Unity Asset Store EULA, Single Entity이다.
- 원본 Unity 버전은 2022.3.62f3이며 URP 호환으로 명시되어 있다.
- 200개 이상 모듈, 281 meshes, 425 PBR textures, 2K trim-sheet workflow, 단순 collision과 demo scene을 제공한다.
- 목표 화면처럼 전경 도로, 중경 상점·주택, 가로 시설물을 촘촘히 구성하면서 모바일 최적화하기 좋다.
- 고층 스카이라인과 상징적 다리는 포함 여부가 확인되지 않았으므로, primitive가 아니라 이 팩의 모듈 또는 별도 라이선스 모델로만 보강한다.
- 공식 페이지는 <https://assetstore.unity.com/packages/3d/environments/urban/suburban-stylized-pack-329973>이다.

**보완 후보는 `Japan Countryside (Anime Environment)`, 버전 1.0이다.**

- 게시자는 PHIDEAS이며 정가는 확인 시점 기준 USD 80이다.
- 라이선스는 Standard Unity Asset Store EULA, Single Entity이다.
- 원본 Unity 버전은 2022.3.11f1이며 URP는 Unity Material Converter로 변환하도록 명시되어 있다.
- 건물·상점·식당·편의점, 모듈형 도로·고속도로, 표지판·램프·벤치 등 거리 소품, 나무·식생, 낮·밤·노을 skybox를 포함한다.
- 50~15k poly, 1K~2K 텍스처 범위라 1순위 팩에서 부족한 애니메이션풍 거리 밀도를 보완하기 적합하다.
- 현대 메트로 코스 단독 원본으로는 전원풍 비중이 높으므로 1순위가 아니라 보완용이다.
- 공식 페이지는 <https://assetstore.unity.com/packages/3d/environments/urban/japan-countryside-anime-environment-275488>이다.

### 달리기 애니메이션

**검증용 1차 모션은 `AA_Olympics_Sports`, 버전 1.0이다.**

- 게시자는 activeanimation이며 가격은 확인 시점 기준 USD 19.99이다.
- 라이선스는 Standard Unity Asset Store EULA, Single Entity이다.
- 원본 Unity 버전은 2022.3.7f1이고, 49개 Humanoid Mecanim-compatible mocap FBX를 포함한다.
- Athletics Sprints A/B와 Relay Race A/B를 제공해 `interval_sprint`, `final_kick`, `crew_relay`를 실제 모션으로 검증할 수 있다.
- 쉬운 조깅, steady, tempo, tired-but-proud, finish까지 모두 포함된다는 근거는 없으므로 단독으로 9개 상태를 충족한다고 판정하지 않는다.
- 공식 페이지는 <https://assetstore.unity.com/packages/3d/animations/aa-olympics-sports-286393>이다.

`easy_jog`, `steady_run`, `tempo_run`, `tired_but_proud`, `finish`, `idle_stretch`, `cheer`는 동일 골격과 동일 캡처 품질의 별도 라이선스 모션이 필요하다. 구매 전에 각 clip의 in-place/root-motion 제공 여부, loop seam, 손·발 관통, 3등신 retarget 결과를 실제 샘플 캐릭터로 확인한다. 이 확인 전에는 임시 키프레임을 정식 모션으로 대체했다고 기록하지 않는다.

## 사용자 선택이 필요한 정확한 항목

다음 세 항목만 구매 또는 합법적인 기존 라이선스 보유 여부 확인이 필요하다.

1. `BoZo: Modular Anime Characters - Base Pack` 1.8.6. 목표의 얼굴·헤어·표정·3등신 모듈화를 위한 원본이다.
2. `Suburban Stylized Pack` 1.0.0. 현대 도시 전경과 거리 밀도를 위한 원본이다.
3. `AA_Olympics_Sports` 1.0. 스프린트·파이널 킥·릴레이의 실제 mocap 원본이다.

추가 구매 전에 위 세 에셋으로 1080x1920 Production Art Vertical Slice를 만들고 점수를 낸다. 결과가 평균 90점 또는 개별 85점에 미달하면 점수표에 근거해 부족한 범주만 보완 구매한다.

## 인입 조건

- 각 Unity Asset Store 다운로드는 구매 계정의 라이선스 범위가 이 프로젝트 배포 주체와 맞아야 한다.
- 원본 패키지는 `Assets/RunningUp/ProductionArt/Vendor/<Publisher>/<AssetName>` 아래로만 인입한다.
- `LICENSE_EVIDENCE.md`에는 에셋명, 버전, 게시자, EULA 종류, 구매 주체, 다운로드 날짜를 기록하되 영수증 번호나 계정 정보는 저장하지 않는다.
- 캐릭터와 모션은 Humanoid Avatar가 유효해야 하며 T-pose와 9개 상태 retarget smoke test를 통과해야 한다.
- 환경은 URP material conversion 뒤 magenta material 0건, missing texture 0건, missing mesh 0건이어야 한다.
- 정식 장면에는 Unity primitive, `ChibiMeshFactory`, `Assets/RunningUp/Generated/Meshes`, `Placeholder`, `Prototype`, `Temp` 참조가 0건이어야 한다.

## Production Art Vertical Slice 합격 조건

같은 1080x1920 해상도로 목표 화면과 Unity 캡처를 나란히 비교한다. 얼굴, 헤어, 표정, 의상, 러닝화, 워치, 손, 발, 달리기 모션, 툰 재질, 조명, 그림자, 카메라, UI를 개별 증거로 확인한다.

캐릭터 조형, 화면 점유율, 재질, 조명, 애니메이션, 환경 밀도, UI 완성도의 평균이 90점 이상이고 모든 항목이 85점 이상이어야 한다. Unity primitive와 placeholder는 0건이어야 한다. 미적 평가는 자동 PASS로 처리하지 않고 `design-qa.md`, 동일 해상도 비교 이미지, Unity 캡처, 평가자 이름과 날짜를 남긴다.

