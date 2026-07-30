# Codex에게 그대로 붙여넣을 프롬프트 — V11 Production Art Vertical Slice

<!--
  사용자가 Unity가 설치된 맥에서 Codex에게 넘기기 위한 지시서다.
  아래 "여기부터 복사" 아래 전체를 그대로 붙여넣는다.
-->

아래 구분선 아래 전체를 복사해 Codex에게 붙여넣으세요.

---

## 여기부터 복사

```text
/goal

너는 지금 macOS에서 실행 중이고 Unity Hub가 설치돼 있다. RunningUp V11의
Production Art Vertical Slice를 만든다. 문서나 계획으로 끝내지 말고 실제 파일을
만들고 Unity를 실행하고 캡처까지 남긴다.

### 저장소

- GitHub: runningup706/runningup
- 작업 브랜치: claude/runningup-3d-android-dev-3c8gnp
- 이 브랜치를 clone 또는 pull 한 뒤 그 위에서 작업한다.
- Unity 프로젝트 경로: client/unity
- 프로젝트가 고정한 Unity 버전: client/unity/ProjectSettings/ProjectVersion.txt

### 이미 되어 있는 것 — 다시 만들지 마라

- V11 전체 카탈로그(12대륙·192지역·2304코스·카드 360·Pacer 60·장비 192·
  체크포인트 120)와 검증기.
- Supabase migration, RLS, 원자적 ingest RPC, pgTAP 60개.
- 검증 러닝 업로더의 401/403 refresh, 409/duplicate, 재시도·포기·지터 규칙과
  그 회귀 테스트 90개(`npm run test:domain`).
- Live Journey Home 레이아웃 계약: content/v11/ui/live-home-layout.json
  (1080x1920 좌표, tools/tests/ui-layout.test.mjs가 검증)
- 자산 판정기: client/unity/Assets/RunningUp/ProductionArt/V11ArtSpec.cs
  11개 요구를 측정값·기대치와 함께 항목별로 보고한다.
- 라이선스 검사기: tools/art-pipeline/validate-license-evidence.mjs
- Unity 경로 자동 탐색: tools/lib/find-unity.sh

### 0단계 · 툴체인 확인

```
node --version                 # 22 이상
npm ci || npm install
npm run validate               # 53/53 PASS 여야 한다
npm test                       # 39/39 PASS 여야 한다
npm run test:domain            # 90/90 PASS 여야 한다
npm run test:unity             # 여기서 Unity 버전 문제를 알려 준다
```

`npm run test:unity`가 BLOCKED_TOOLCHAIN을 내면 메시지가 시키는 대로 Unity Hub의
Installs 탭에서 정확히 그 버전을 추가한다. Android Build Support,
OpenJDK, Android SDK & NDK Tools 모듈을 함께 체크한다.

버전이 붙으면 test:unity가 EditMode/PlayMode를 실행하고 통과 수를 출력한다.
여기까지 초록이 되기 전에는 아트 작업을 시작하지 마라.

### 1단계 · 자산 확보

무료로 확실히 되는 것부터 받는다.

1. Mixamo(https://www.mixamo.com/, Adobe 계정 무료)에서 아래 9개 상태에
   대응하는 클립을 FBX로 받는다. In-place와 root motion을 각각 받는다.
   idle_stretch, easy_jog, steady_run, tempo_run, interval_sprint,
   final_kick, finish, cheer, tired_but_proud
2. Poly Haven(https://polyhaven.com/hdris, CC0)에서 낮·노을·야간 HDRI 3장.

캐릭터는 사용자에게 확인받은 것을 쓴다. 확인이 없으면 여기서 멈추고 물어라.
- 유료 1순위: BoZo Modular Anime Characters - Base Pack 1.8.6 (USD 20)
- 무료 대안: Quaternius Ultimate Modular Characters (CC0)
  단, 이 자산은 3등신 비율과 표정 blend shape를 충족하지 못한다.
  V11ArtSpec이 그 사실을 항목별로 보고할 것이다. 억지로 통과시키지 마라.

도시 코스는 Kenney City Kit 또는 Quaternius 도시 팩(둘 다 CC0) 중 하나만
고른다. 두 개를 섞으면 스타일 통일감이 깨진다.

### 2단계 · 인입과 라이선스 기록

자산은 반드시 아래 경로 아래에만 넣는다. 다른 곳에 두면 임포터 규칙이
적용되지 않는다.

```
client/unity/Assets/RunningUp/ProductionArt/Vendor/<Publisher>/<AssetName>/
```

그리고 client/unity/Assets/RunningUp/ProductionArt/LICENSE_EVIDENCE.md 에
자산마다 아래 형식으로 기록한다. 제목은 Vendor 아래 폴더 이름과 정확히 같아야
한다.

```
## Quaternius/UltimateModularCity
- asset: UltimateModularCity
- version: 1.0.0
- publisher: Quaternius
- license: CC0-1.0
- source: https://quaternius.com/
- obtained: 2026-07-30
```

라이선스 식별자는 content/v11/art/free-asset-sources.json 의 allowed_licenses에
있는 값만 쓴다. CC-BY-4.0 이나 MIT를 쓸 경우 attribution 항목에 앱 내 크레딧
문구를 함께 적는다. 영수증 번호, 주문 번호, 계정 이메일은 절대 적지 마라.
검사기가 거부한다.

확인:
```
node tools/art-pipeline/validate-license-evidence.mjs
```
status가 LICENSE_EVIDENCE_COMPLETE 여야 한다.

### 3단계 · 자산이 요구를 만족하는지 먼저 본다

```
npm run art:validate
```

V11ArtSpec이 11개 요구를 항목별로 보고한다. 여기서 실패한 항목은 Unity 작업으로
덮지 말고 그대로 보고한다. 특히 아래 항목은 자산 자체를 바꾸지 않으면 해결되지
않는다.

- head_ratio: 3.0~3.25 heads
- expression_blend_shapes: 12개 이상
- separate_garment_meshes: top/bottom/socks/shoes/watch/headwear

LOD와 모션은 Unity에서 만들 수 있으므로 실패해도 다음 단계에서 해결한다.

### 4단계 · Vertical Slice를 만든다 — 딱 1명 + 1코스

12형태 2304코스를 대량 생성하지 마라. 첫 슬라이스가 합격하기 전에 대량 제작을
시작하면 안 되는 것이 정본 규칙이다.

만들어야 하는 산출물은 아래 5개다. 경로는
client/unity/Assets/RunningUp/ProductionArt/Manifest/production-art-manifest.json
이 고정하고 있으니 그 경로 그대로 만든다.

1. Prefabs/MyRunnerProduction.prefab
   - Humanoid Avatar 유효
   - LOD0 25k~40k, LOD1 12k~22k, LOD2 5k~10k tris
   - bone 45~65, 표정 blend shape 12개 이상
   - material slot 4개 이하, 아틀라스 사용
   - 상의/하의/양말/신발/워치/헤드웨어가 각각 별도 mesh 또는 modular part
2. Prefabs/CityCourseProduction.prefab
   - 전경 도로, 중경 상점·주택, 가로등·표지·벤치·차량
   - 저사양 30fps 예산 안에서 draw call을 유지한다
3. Animation/MyRunnerProduction.controller
   - 9개 상태 전부, 속도에 따른 blend, loop seam 없음
   - 발이 지면을 뚫거나 미끄러지지 않아야 한다(Animation Rigging 1.4.1 사용)
4. Shaders/MyRunnerToon.shadergraph
   - Shader Graph 17.3.0 기반. 피부/헤어/의상 ramp, rim, outline
5. Scenes/LiveJourneyProduction.unity
   - 카메라는 Cinemachine 3.1.7
   - 러너가 화면 높이의 28~44%를 차지해야 한다. 목표값 36%.
     필요한 수직 FOV는 V11ArtSpec.VerticalFieldOfViewDegrees 로 계산한다.
   - 3D 뷰포트가 화면의 58% 이상이어야 한다. 레이아웃 계약값은 60.9%.
   - Poly Haven HDRI로 key/fill/rim 조명과 contact shadow를 구성한다
   - Pacer 군집을 LOD2로 배치해 목표 화면의 무리감을 만든다

UI는 content/v11/ui/live-home-layout.json 의 좌표를 그대로 따른다. 밴드는
상단 자원바 0~120, 3D 뷰포트 120~1290, 라이브 지표 1290~1410,
Technique 덱 1410~1620, 하단 nav 1620~1920 이다. 하단 5탭은
홈·러너·RUN·월드·크루이며 RUN이 중앙 x=540이고 가장 크다.
docs/v11/LIVE_HOME_UI_SPEC.html 을 브라우저로 열면 구조를 눈으로 볼 수 있다.

### 5단계 · 캡처와 비교 이미지

- LiveJourneyProduction.unity 를 정확히 1080x1920으로 캡처한다.
- 사용자 목표 이미지도 왜곡 없이 1080x1920으로 정규화한다. 비율이 다르면
  잘라내지 말고 짙은 남색 여백을 쓴다.
- 좌측 목표, 우측 Unity로 2160x1920 한 장을 만든다.
- artifacts/visual/vertical-slice/ 아래에 저장한다.

### 6단계 · 사람의 평가표

자동으로 PASS를 만들지 마라. 아래 7개 항목을 사람이 채점하고
Manifest가 지정한 humanQaScorecard 경로에 저장한다.

캐릭터 조형 / 화면 점유율 / 재질 / 조명 / 애니메이션 / 환경 밀도 / UI 완성도

합격 조건은 평균 90점 이상이고 모든 항목이 85점 이상이다. 평가자 이름과 날짜를
남긴다. 미달이면 미달로 적고 어느 항목이 왜 부족한지 쓴다.

### 7단계 · APK 재빌드

현재 저장소의 최신 소스에는 업로더 수정이 들어 있는데 기존 smoke APK
(e27a4a77427e62332486ebc408a0eefaad4bca7f8ce80386e00f9d117ad7d94b)에는
없다. 반드시 다시 빌드한다.

```
npm run build:android:smoke
```

빌드 후 파일명, bytes, SHA-256, package, versionName, versionCode,
minSdk, targetSdk, ABI, 서명, zip alignment를 보고한다.

### 절대 하지 말 것

- Unity primitive, ChibiMeshFactory, Assets/RunningUp/Generated,
  KayKit 자산을 확장해 Production Art로 보고하지 마라. 게이트가 거부한다.
- art:gate가 실패한다고 게이트를 약화하거나 우회하지 마라. 자산이 없을 때
  exit 2가 정상이다.
- BLOCKED_ART_ASSET, BLOCKED_SUPABASE_PROJECT, BLOCKED_REAL_DEVICE_QA 를
  실제 증거 없이 PASS로 바꾸지 마라.
- 전투, 몬스터, 무기, 피해량, HP bar를 어떤 형태로도 되살리지 마라.
  npm run validate:legacy 가 즉시 잡는다.
- 12대륙·192지역·2304코스·12형태·60 Pacer·360 카드·192 장비·120 체크포인트·
  1000km World Crown 수량을 줄이지 마라.
- 1000km 위에 어떤 tier나 checkpoint도 만들지 마라.
- Supabase URL, publishable key, JWT, service role key, keystore,
  private key를 소스·문서·로그·답변에 넣지 마라.
- git reset --hard, 무분별한 git clean, force push를 하지 마라.
- legacy_backup, v8_old, v9_old, v10_old, deprecated_copy 폴더를 만들지 마라.

### 변경할 때마다 실행할 검증

```
npm run validate
npm run validate:legacy
npm test
npm run test:db
npm run test:domain
npm run test:unity
npm run art:validate
node tools/art-pipeline/validate-license-evidence.mjs
```

### 보고 형식

- 실제로 수정한 파일과 이유
- 실행한 명령과 통과·실패 수치
- V11ArtSpec 11개 요구의 항목별 결과
- 1080x1920 Unity 캡처와 2160x1920 비교 이미지
- 사람 평가표 7개 항목 점수와 평가자·날짜
- APK 파일명·bytes·SHA-256·서명·SDK·ABI
- 남은 차단 항목과 그 이유

실행하지 않은 검증을 PASS라고 쓰지 마라. 자산 부족으로 합격하지 못하면
현재 점수와 정확히 어느 요구가 왜 미달인지 기록하고 멈춰라.
```

## 여기까지 복사

---

## 붙여넣기 전에 확인할 것 하나

캐릭터 자산을 유료로 살지 무료로 갈지 정해서 Codex에게 알려 주세요.
정하지 않으면 Codex가 2단계에서 멈추고 물어보게 되어 있습니다.

- 유료 USD 20 → 캐릭터 항목 85점 도달 가능성이 높습니다.
- 무료 CC0 → 3등신 비율과 표정 blend shape에서 걸립니다.
  `V11ArtSpec`이 그 사실을 항목별로 보고하므로, 무엇이 부족한지는 정확히
  숫자로 남습니다.
