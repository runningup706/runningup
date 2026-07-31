# APK 자동 빌드 — 설정 안내

지금까지 APK는 **한 사람의 PC에서만** 만들 수 있었습니다. Unity 프로젝트가 그 PC에만
있었기 때문입니다. 그래서 빌드가 재현되지 않았고, CI가 만들 수 없었고, 디스크가 죽으면
프로젝트가 사라지는 상태였습니다.

이 문서대로 두 가지만 하면 **푸시할 때마다 APK가 자동으로 나오고, 태그를 붙이면
GitHub Release가 자동으로 만들어집니다.**

빌드 워크플로: [`.github/workflows/android-apk.yml`](../../.github/workflows/android-apk.yml)

---

## 1단계 — Unity 프로젝트를 저장소에 올린다 (제일 먼저)

**프로젝트가 있는 PC에서** 실행합니다.

```bash
cd <runningup 폴더>
git fetch origin claude/runningup-v14-handoff-hr19xk
git checkout claude/runningup-v14-handoff-hr19xk

bash tools/release/push-unity-project.sh          # 계획만 보여주고 아무것도 안 바꿈
bash tools/release/push-unity-project.sh --commit  # 확인 후 실제 실행
```

이 스크립트는 안전하게 설계돼 있습니다.

- `git reset --hard`, `git checkout -- .`, `git clean` **절대 실행하지 않습니다.**
  추적되지 않은 V14 파일은 어느 커밋에도 없으므로, 지우면 복구가 불가능합니다.
- V5 삭제와 V14 추가를 **커밋 2개로 분리**합니다. 한쪽만 되돌릴 수 있게.
- `Library/`, `Temp/`, `Logs/` 같은 재생성 폴더는 제외합니다 (수 GB이고 열 때마다 다시 생김).
- **키스토어(`.keystore`, `.jks`)나 `service_role` 키가 섞여 있으면 아예 멈춥니다.**
  git 히스토리에 한번 올라간 키는 히스토리를 다시 써도 회수되지 않습니다.

프로젝트가 없는 곳에서 실행하면 아무것도 하지 않고 그 사실만 알려주고 종료합니다.

---

## 2단계 — 저장소 시크릿 4종

`Settings → Secrets and variables → Actions → New repository secret`

### Unity 라이선스 (필수 · 무료)

| 시크릿 | 값 |
|---|---|
| `UNITY_EMAIL` | Unity 계정 이메일 |
| `UNITY_PASSWORD` | Unity 계정 비밀번호 |
| `UNITY_LICENSE` | `.ulf` 라이선스 파일의 **내용 전체** |

`.ulf` 얻는 법 — Unity Hub가 설치된 PC에서 Personal 라이선스로 로그인한 뒤:

- **Windows** `C:\ProgramData\Unity\Unity_lic.ulf`
- **macOS** `/Library/Application Support/Unity/Unity_lic.ulf`
- **Linux** `~/.local/share/unity3d/Unity/Unity_lic.ulf`

파일을 텍스트 편집기로 열어 내용을 통째로 붙여넣습니다.

### Supabase (필수)

| 시크릿 | 값 |
|---|---|
| `SUPABASE_URL` | 프로젝트 URL |
| `SUPABASE_ANON_KEY` | **anon / publishable 키만** |

> **`service_role` 키는 절대 넣지 마십시오.** 클라이언트에 들어가면 APK를 받은 누구나
> 데이터베이스 전체를 쓸 수 있게 됩니다. 워크플로가 넘기는 값도 publishable 키뿐입니다.

이게 코덱스가 만든 APK를 릴리즈하지 않은 이유이기도 합니다 — 그 APK는 **로컬 개발용
Supabase**를 보고 있어서, 배포해도 만든 사람 PC가 켜져 있을 때만 동작합니다.

### 서명 키 (선택 — 없으면 디버그 서명)

| 시크릿 | 값 |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 runningup.keystore` 결과 |
| `ANDROID_KEYSTORE_PASS` | 키스토어 비밀번호 |
| `ANDROID_KEYALIAS_NAME` | 키 별칭 |
| `ANDROID_KEYALIAS_PASS` | 별칭 비밀번호 |

Play 스토어에 올릴 때만 필요합니다. 테스트 배포는 없어도 됩니다.

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
| `UNITY_LICENSE secret is not set` | 2단계를 아직 안 했습니다 |
| Unity 라이선스 활성화 실패 | `.ulf`는 PC마다 다릅니다. Personal 라이선스는 동시 사용 대수 제한이 있으니 Unity 계정에서 기존 활성화를 해제하고 다시 받으십시오 |
| `Unity reported success but produced no APK` | 종료 코드만 보고 성공으로 처리하지 않기 위한 검사입니다. 이전에 SIGTERM(143)을 성공으로 오인한 적이 있습니다 |
