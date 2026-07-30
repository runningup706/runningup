# RunningUp V11 Production Art Pipeline

이 파이프라인은 모델을 새로 만들어 내지 않는다. 합법적으로 확보한 전문 캐릭터·환경·모션 자산을 안전하게 Unity 6 URP로 인입하고, 기술 조건과 사람의 미적 평가를 모두 통과한 첫 Vertical Slice만 정식 빌드에 허용한다.

## 현재 상태

- Unity Editor 6000.3.20f1은 설치되어 있다.
- URP 17.3.0, Shader Graph 17.3.0, Cinemachine 3.1.7, Animation Rigging 1.4.1은 설치·해석·컴파일되었다.
- Blender는 설치되어 있지 않다. 따라서 Blender Python 자동화는 활성화하지 않았고 Blender로 제작한 결과도 주장하지 않는다.
- 정식 캐릭터·도시·모션 자산이 없어 `BLOCKED_ART_ASSET`이다.

## 자산 인입 위치

구매 후 Unity Asset Store에서 내려받은 원본은 다음 경로 아래로 정리한다.

```text
client/unity/Assets/RunningUp/ProductionArt/
├── Vendor/
│   ├── BoZo/BMAC/
│   ├── NosenseStudio/SuburbanStylizedPack/
│   └── activeanimation/AA_Olympics_Sports/
├── Prefabs/
├── Animation/
├── Shaders/
├── Scenes/
└── LICENSE_EVIDENCE.md
```

`Vendor` 원본은 임의로 덮어쓰지 않는다. RunningUp용 prefab, material instance, animator, LOD와 scene은 Vendor 밖의 대응 폴더에 만든다.

## 라이선스 증거

`LICENSE_EVIDENCE.md`에는 각 에셋의 정확한 이름, 게시자, 버전, Standard Unity Asset Store EULA 여부, 구매 주체, 인입 날짜만 기록한다. 계정 이메일, 주문번호, 카드 정보 같은 민감정보는 저장하지 않는다.

라이선스 증거가 없으면 `V11ProductionArtGate`가 FULL_SIDELOAD를 차단한다.

## 자동 가져오기

`V11ProductionArtImporter`는 `ProductionArt/Vendor` 아래 자산에만 작동한다.

- 캐릭터와 모션은 Humanoid, blendshape, animation import를 켠다.
- Animation Rigging이 필요한 뼈를 유지하기 위해 optimize game objects를 끈다.
- 환경은 animation을 끄고 lightmap용 secondary UV를 만든다.
- Android 텍스처는 최대 2K, 3D는 ASTC 6x6, UI는 ASTC 4x4로 설정한다.
- Unity primitive나 placeholder는 만들지 않는다.

## 검증 명령

```bash
npm run art:environment
npm run art:validate
npm run art:gate
```

`art:validate`는 도구가 정상이고 자산이 없을 때도 보고서를 남기기 위해 성공 종료할 수 있다. 상태는 `BLOCKED_ART_ASSET`으로 명시된다. `art:gate`는 Vertical Slice가 완전히 합격하지 않으면 종료 코드 2로 실패한다.

Unity 안에서는 다음 메뉴를 실행한다.

```text
RunningUp V11/Production Art/Configure Unity 6 URP
RunningUp V11/Production Art/Validate Vertical Slice
```

## Blender

현재 Mac에는 `blender` 실행 파일과 `/Applications/Blender.app`이 없다. Blender 설치 뒤 다음을 확인하고 나서만 자동화 스크립트를 추가한다.

- 실제 Blender 버전.
- FBX export preset과 Unity 축·단위.
- BoZo 원본 수정 허용 범위.
- LOD 생성 방식과 shape key 보존.
- Humanoid bone naming과 animation retarget 결과.

설치되지 않은 Blender를 가정한 가짜 export나 모델 파일은 생성하지 않는다.

## 합격 순서

1. 구매·라이선스 증거를 확인한다.
2. My Runner 하나를 3.0~3.25 heads로 조정하고 얼굴·헤어·표정·의상·신발·워치를 조립한다.
3. 9개 러닝 상태를 Humanoid로 retarget하고 손·발 관통과 loop seam을 수정한다.
4. 도시 코스 하나를 primitive 없이 조립한다.
5. Shader Graph toon material, 조명, 그림자, Cinemachine, Animation Rigging, UI를 연결한다.
6. 목표와 Unity를 각각 1080x1920으로 캡처하고 2160x1920 좌우 비교를 만든다.
7. 사람이 7개 항목을 평가한다. 평균 90점 이상, 개별 85점 이상, primitive·placeholder 0건이어야 한다.
8. 첫 Vertical Slice가 합격한 뒤에만 공용 골격, LOD, 모듈형 헤어·의상·신발·워치로 확장한다.

