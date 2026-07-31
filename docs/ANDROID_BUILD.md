# APK 자동 빌드 — 설정 안내

지금까지 APK는 **한 사람의 PC에서만** 만들 수 있었습니다. Unity 프로젝트가 그 PC에만
있었기 때문입니다. 그래서 빌드가 재현되지 않았고, CI가 만들 수 없었고, 디스크가 죽으면
프로젝트가 사라지는 상태였습니다.

이 문서대로 두 가지만 하면 **푸시할 때마다 APK가 자동으로 나오고, 태그를 붙이면
GitHub Release가 자동으로 만들어집니다.**

빌드 워크플로: [`.github/workflows/android-apk.yml`](../../.github/workflows/android-apk.yml)

---

## 1단계 — Unity 프로젝트를 저장소에 올린다 (제일 먼저)

### ⚠️ 기존 작업 폴더에서 `git pull` 하지 마십시오

기존 폴더는 **다른 브랜치**(`agent/runningup-v11-complete`)에 있고, **삭제 281개가 스테이지**된
상태입니다. 그중 148개만 폐기 대상 V5이고, **나머지 133개는 V14가 필요로 하는 CI 워크플로 ·
Supabase 마이그레이션 · 테스트 · 문서**입니다. 여기서 `git pull` 하면 V14가 엉뚱한 브랜치로
병합되고, 그대로 커밋하면 빌드 기반이 사라집니다.

그 폴더는 **손대지 않습니다.** 대신 **새 폴더에 새로 클론**해서 작업합니다.

```bash
# 1. 새 폴더에 깨끗하게 클론
git clone -b claude/runningup-v14-handoff-hr19xk \
    https://github.com/runningup706/runningup.git runningup-v14
cd runningup-v14

# 2. 기존 폴더의 Unity 프로젝트 위치를 알려준다 (계획만 출력, 아무것도 안 바꿈)
bash tools/release/push-unity-project.sh --from ~/기존폴더/client/unity

# 3. 계획이 맞으면 실행
bash tools/release/push-unity-project.sh --from ~/기존폴더/client/unity --commit
```

이 방식이면 **삭제를 분류할 필요가 아예 없습니다.** V14 브랜치에는 V5 트리가 존재하지
않으므로 지울 것이 없고, 추가만 하면 됩니다.

스크립트의 안전장치:

- **원본 폴더를 읽기만 합니다.** 거기서 파일을 옮기거나 지우거나 스테이지하지 않습니다.
- **다른 브랜치에서 실행하면 즉시 중단**하고 클론 명령을 알려줍니다.
- **커밋 안 된 변경이 있는 클론에서도 중단**합니다. 깨끗한 클론에서만 동작합니다.
- `Library/`, `Temp/`, `Logs/`, `Build/`, `*.apk` 는 복사하지 않습니다 (수 GB이고 Unity가
  열 때 다시 만듭니다).
- **키스토어(`.keystore`, `.jks`)나 `service_role` 키가 섞여 있으면 복사를 되돌리고 멈춥니다.**
  git 히스토리에 한번 올라간 키는 히스토리를 다시 써도 회수되지 않습니다.
- `git reset --hard`, `git checkout -- .`, `git clean` 을 **원본 폴더에 대해 절대 실행하지
  않습니다.**

Windows는 **Git Bash**에서 실행하십시오. `rsync` 대신 `tar` 를 쓰므로 별도 설치가 필요 없습니다.

---

## 2단계 — 저장소 시크릿 4종

`Settings → Secrets and variables → Actions → New repository secret`

### Unity 라이선스 (필수 · 무료)

| 시크릿 | 값 |
|---|---|
| `UNITY_EMAIL` | Unity 계정 이메일 |
| `UNITY_PASSWORD` | Unity 계정 비밀번호 |
| `UNITY_LICENSE` | `.ulf` 라이선스 파일의 **내용 전체** |

#### `.ulf` 얻는 법

> ⚠️ **Unity 6(6000.x)에는 `.ulf` 파일이 없습니다.** 라이선스 형식이
> `~/Library/Unity/licenses/UnityEntitlementLicense.xml` 로 바뀌었습니다. 아무리 찾아도
> `.ulf`가 안 나오는 게 정상입니다. 아래 수동 활성화로 **하나 만들어야** 합니다.
> (game-ci 빌더는 여전히 `.ulf` 형식을 요구합니다.)

**1) 활성화 파일(`.alf`) 생성** — 설치된 에디터로 실행합니다.

```bash
cd ~
"<Unity 설치경로>/Unity.app/Contents/MacOS/Unity" \
  -batchmode -nographics -quit -logFile /dev/stdout -createManualActivationFile
ls -la ~/*.alf
```

Windows는 `"C:\Program Files\Unity\Hub\Editor\<버전>\Editor\Unity.exe"`,
Linux는 `~/Unity/Hub/Editor/<버전>/Editor/Unity` 로 같은 인자를 씁니다.

**2) 웹에서 `.ulf`로 교환** — <https://license.unity3d.com/manual>

`.alf` 업로드 → **Unity Personal Edition** 선택 → "I don't use Unity in a professional
capacity" 선택 → **Download license file**.

**3) 시크릿에 넣기**

```bash
cat ~/Downloads/Unity_v*.ulf | pbcopy      # macOS
```

`UNITY_LICENSE` 칸에 붙여넣습니다.

**구버전(2022 이하)** 은 파일이 이미 존재합니다:

- **Windows** `C:\ProgramData\Unity\Unity_lic.ulf`
- **macOS** `/Library/Application Support/Unity/Unity_lic.ulf` (물결표 없는 시스템 경로)
- **Linux** `~/.local/share/unity3d/Unity/Unity_lic.ulf`

### Supabase (필수)

| 시크릿 | 값 |
|---|---|
| `SUPABASE_URL` | 프로젝트 URL |
| `SUPABASE_ANON_KEY` | **anon / publishable 키만** |

> **`service_role` 키는 절대 넣지 마십시오.** 클라이언트에 들어가면 APK를 받은 누구나
> 데이터베이스 전체를 쓸 수 있게 됩니다. 워크플로가 넘기는 값도 publishable 키뿐입니다.

이게 코덱스가 만든 APK를 릴리즈하지 않은 이유이기도 합니다 — 그 APK는 **로컬 개발용
Supabase**를 보고 있어서, 배포해도 만든 사람 PC가 켜져 있을 때만 동작합니다.

### 서명 키 (선택 — 4개를 **전부** 넣거나, **전부** 안 넣거나)

| 시크릿 | 값 |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 runningup.keystore` 결과 |
| `ANDROID_KEYSTORE_PASS` | 키스토어 비밀번호 |
| `ANDROID_KEYALIAS_NAME` | 키 별칭 |
| `ANDROID_KEYALIAS_PASS` | 별칭 비밀번호 |

**하나도 안 넣어도 빌드는 됩니다.** 그 경우 디버그 서명 APK가 나오고, 릴리즈 노트에
`Signing: debug-signed` 로 기록됩니다. 폰에 설치해서 테스트하는 데는 문제없고, **Play
스토어 업로드만 불가능**합니다.

> ⚠️ **4개를 부분적으로만 넣으면 빌드가 실패합니다.** 넣으려면 4개 전부, 아니면 4개 전부
> 비워두십시오. (워크플로는 `ANDROID_KEYSTORE_BASE64` 가 비어 있으면 키스토어 이름 자체를
> 넘기지 않도록 되어 있습니다 — 이름만 넘어가고 키가 비어 있는 것이 원인 불명의 서명
> 오류를 만드는 조합이기 때문입니다.)

---

## 그다음부터

| 하는 일 | 결과 |
|---|---|
| 브랜치에 푸시 | APK가 빌드되어 **Actions 아티팩트**로 올라감 (30일 보관) |
| `v14.0.1` 같은 태그 푸시 | 빌드 후 **GitHub Release 자동 생성**, APK 첨부 |

```bash
git tag v14.0.1
git push origin v14.0.1
```

---

## 워크플로가 실제로 검사하는 것

빌드 전에 4개 게이트를 통과해야 합니다. 하나라도 실패하면 빌드하지 않습니다.

1. 방향 잠금 스캔 (DL-1 … DL-6)
2. 런치 콘텐츠 검증기 — 21개 항목 기준선
3. 단위 테스트
4. **클라이언트 사다리 일치 검사** — 병합 사고를 실제로 잡아낸 검사입니다. 클라이언트가
   옛날 52개 km 사다리를 그대로 들고 있으면 여기서 걸립니다.

빌드 후에는 **APK 바이너리 안을 직접 뒤져서** `world_bosses`, `enemy_families`,
`battle_node` 같은 전투 식별자가 없는지 확인합니다. 소스 스캐너는 컴파일된 APK 안을
볼 수 없기 때문에, DL-6가 실제 산출물에서도 지켜지는지는 이 검사만이 증명합니다.

---

## 이 워크플로가 하지 **않는** 것

**"빌드 성공 = 검증 완료"가 아닙니다.** CI에는 폰이 없습니다.

릴리즈 노트에 아래 항목은 **NOT_RUN**으로 기록됩니다. 통과로 적지 않습니다.

- 시스템 뒤로가기 (제스처 · 3버튼) 실기기 동작
- 강제 종료 후 콜드 스타트가 홈에서 시작하는지
- logcat의 fatal exception / ANR / SELinux denial
- FPS · 배터리 · 발열

마스터 프롬프트 # 22.9가 에뮬레이터 수치로 실기기 측정을 대체하는 것을 금지합니다.
**실제 폰에 설치해서 눌러보기 전까지는 배포 가능한 빌드가 아닙니다.**

실기기 검증 절차는 [`CODEX_V14_APK_BUILD_PROMPT_KO.md`](CODEX_V14_APK_BUILD_PROMPT_KO.md)
7번 항목(뒤로가기 7개 · 콜드 스타트 3개)에 표로 정리돼 있습니다.

---

## 문제가 생기면

| 증상 | 원인과 조치 |
|---|---|
| `APK build SKIPPED` | 정상 동작입니다. Actions 요약에 Unity 프로젝트와 라이선스 중 **어느 쪽이 없는지** 표로 나옵니다 |
| `No Unity project in client/unity` | 1단계를 아직 안 했습니다 |
| `this clone is on '...', not '...'` | 기존 작업 폴더에서 돌린 것입니다. 새로 클론한 폴더에서 실행하십시오 |
| `this clone has uncommitted changes` | 같은 이유입니다. 깨끗한 새 클론이 필요합니다 |
| `Signing: debug-signed` | 정상입니다. 서명 키 시크릿을 안 넣은 것뿐이고, 테스트 설치는 가능합니다 |
| `UNITY_LICENSE secret is not set` | 2단계를 아직 안 했습니다 |
| `.ulf` 파일이 어디에도 없음 | Unity 6이면 **정상입니다.** 형식이 `UnityEntitlementLicense.xml` 로 바뀌었습니다. 위 수동 활성화로 `.ulf` 를 만드십시오 |
| Unity 라이선스 활성화 실패 | `.ulf`는 PC마다 다릅니다. Personal 라이선스는 동시 사용 대수 제한이 있으니 Unity 계정에서 기존 활성화를 해제하고 다시 받으십시오 |
| `Unity reported success but produced no APK` | 종료 코드만 보고 성공으로 처리하지 않기 위한 검사입니다. 이전에 SIGTERM(143)을 성공으로 오인한 적이 있습니다 |
