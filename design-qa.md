# RunningUp V11 Production Art Design QA

## 판정

`FUNCTIONAL_PROTOTYPE_REJECTED`

이 문서는 기존 기능 프로토타입이 Production Art가 아님을 같은 캔버스 크기의 실제 이미지로 기록한다. 정식 자산이 아직 없으므로 Production Art에는 점수를 부여하지 않았고 PASS도 선언하지 않았다.

## 비교 증거

- 목표 원본은 사용자가 제공한 965x1280 참고 이미지다.
- Unity 원본은 Unity 6000.3.20f1, URP 17.3.0, Metal 렌더로 다시 캡처한 `artifacts/visual/live-home-1080x1920.png`다.
- 목표와 Unity 화면은 각각 왜곡 없이 1080x1920 캔버스로 정규화했다. 목표 원본 비율이 9:16이 아니어서 잘라내지 않고 짙은 남색 여백을 사용했다.
- 좌측 목표와 우측 Unity 화면을 2160x1920 한 장에 배치했다.

증거 파일은 다음과 같다.

- `artifacts/visual/prototype-rejection/target-1080x1920.png`
- `artifacts/visual/prototype-rejection/unity-1080x1920.png`
- `artifacts/visual/prototype-rejection/target-vs-unity-2160x1920.png`

## 기능 프로토타입 격차 점수

이 점수는 정식 Vertical Slice 합격 점수가 아니라 교체 범위를 고정하기 위한 실패 기준선이다.

| 평가 항목 | 점수 | 확인된 격차 |
|---|---:|---|
| 캐릭터 조형 | 18 | 머리와 얼굴이 helmet-like low-detail mesh이며 목표의 헤어 실루엣, 눈·눈썹·볼륨, 손·발 디테일이 없다. |
| 화면 점유율 | 62 | 주자는 충분히 크지만 화면 아래로 치우치고 얼굴보다 머리 윗면이 강조된다. 목표의 정면 질주 구도와 pacer 군집이 없다. |
| 재질 | 16 | 단색 및 단순 atlas 중심이며 피부·헤어·의상·신발의 서로 다른 roughness, normal, rim, outline이 없다. |
| 조명 | 25 | 형태는 보이지만 flat하고 광원 계층, 얼굴 key/fill, 따뜻한 도시 반사, 깊이감이 부족하다. |
| 애니메이션 | 0 | 정지 캡처만 있어 발 접지, loop seam, 상체 리듬, 속도 전환을 시각 검증할 수 없다. |
| 환경 밀도 | 15 | box 건물과 sphere tree뿐이며 다리, 상점, 표지, 가로등, 차량, pacer, 배경 스카이라인이 없다. |
| UI 완성도 | 20 | 기능 레이블은 있으나 목표의 capsule resource bar, route card, live metrics, 아이콘과 고밀도 계층을 충족하지 않는다. |

평균은 `22.29`점이다. 합격 조건인 평균 90점, 개별 85점에 미달한다.

## 세부 자산 검사

| 대상 | 상태 | Production Art에서 필요한 증거 |
|---|---|---|
| 얼굴 | FAIL | 눈·눈썹·입·볼·코 조형과 최소 6개 BlendShape 표정 캡처 |
| 헤어 | FAIL | 앞·뒤 모듈, 러닝 실루엣, 머리띠 간섭 검사 |
| 표정 | UNVERIFIED | 집중·미소·피로·자부심 등 실제 BlendShape 캡처 |
| 의상 | FAIL | 섬유 normal, 색 분할, silhouette, clipping 검사 |
| 러닝화 | FAIL | 좌우 신발 모델, outsole, 착지 변형과 발 관통 검사 |
| 워치 | FAIL | 손목 장착 모델, 피부·소매 간섭과 화면 재질 |
| 손 | FAIL | rigged fingers 또는 주먹 포즈, 팔 스윙 중 관통 검사 |
| 발 | FAIL | heel strike, mid-stance, toe-off 접지 프레임 |
| 달리기 모션 | UNVERIFIED | 9개 상태의 영상, loop seam, root/in-place, 속도 전환 |
| 툰 셰이더 | FAIL | Shader Graph 기반 피부·헤어·의상 ramp, rim, outline 캡처 |
| 조명 | FAIL | key/fill/rim, exposure, 얼굴 가독성, 시간대 캡처 |
| 그림자 | FAIL | 캐릭터·도시 soft shadow, contact shadow, cascade 검사 |
| 카메라 | FAIL | Cinemachine 추적, 9:16 safe frame, 속도별 FOV 영상 |
| UI | FAIL | 목표와 같은 1080x1920 정보 계층과 실제 아이콘 자산 |

## 대량 생성 차단

`Assets/RunningUp/ProductionArt/Manifest/production-art-manifest.json`의 상태는 `BLOCKED_ART_ASSET`이다. 정식 장면과 캐릭터·도시·모션 자산, 라이선스 증거, Production Art 캡처, 사람이 작성한 점수표가 모두 검증되기 전에는 `massGenerationAllowed`가 `false`다.

정식 Vertical Slice는 Unity primitive, `Assets/RunningUp/Generated`, KayKit prototype, `ChibiMeshFactory`, placeholder와 temp 이름을 0건으로 만들어야 한다. 자동 검사는 기술 조건만 판단하며 미적 결과를 스스로 PASS 처리하지 않는다.

