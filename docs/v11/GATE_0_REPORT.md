# Gate 0 — clean rebuild와 legacy purge

<!-- V11 구현 전에 수행한 이전 코드 삭제와 새 정본 반입 결과를 기록한다. -->

## 판정

`GATE_0_IN_PROGRESS`

정본 정독·무결성·삭제는 완료됐다. V11 validator와 portrait smoke build가 아직
실행되지 않았으므로 Gate 0 전체를 PASS로 표시하지 않는다.

## 삭제 범위

- 기준 branch는 `agent/runningup-v11-complete`다.
- 기준 commit은 `f204b9b377c6332f7c7b167b6712523e0ca16161`이다.
- 추적 파일 281개를 정확한 NUL 경로 목록으로 삭제했다.
- 삭제 목록 SHA-256은 `f4f1491443588836afc02176adf487ebbf3b43530368ed822e68e5cfd891d828`이다.
- 삭제 전 Combat/Battle/Enemy/Monster/Weapon/Damage 계열 문자열이 있던 파일은
  60개였다.
- 이전 Unity Library·Temp, .NET bin/obj, Gradle build 등 비추적 캐시 약 3.0GB도
  정확한 세 경로를 dry-run한 뒤 삭제했다.
- `legacy_backup`, `v8_old`, `v9_old`, `v10_old`, `deprecated_copy`,
  `old_project_copy` 폴더는 만들지 않았다.
- Git commit 이력만 보존했다.

각 추적 파일의 경로·이유·대체 위치·검증법은 저장소 루트의
`DEPRECATED_PURGE_MANIFEST.json`에 있다.

## V11 반입

- 수량 계약을 가진 7개 JSON 카탈로그를 `content/v11/catalogs`로 가져왔다.
- V11 lock·품질 gate·acceptance·DAG·audit·연동 matrix를 `requirements/v11`로
  가져왔다.
- Supabase blueprint와 RLS matrix는 참고 입력으로만 가져왔다.
- reference 이미지, preview, prototype, master prompt는 전체 검토 증거만 남기고
  runtime 또는 저장소 payload로 복사하지 않았다.

## 남은 Gate 0 완료 조건

- V11 validator가 카탈로그 수량, checkpoint final, 금지 runtime, 승인 capability를
  자동 검사한다.
- 새 Unity 6000.3.20f1 프로젝트가 세로 화면으로 batchmode compile된다.
- Live Journey Home smoke scene에서 custom-mesh My Runner run animation이 실제
  Game View에 표시된다.

