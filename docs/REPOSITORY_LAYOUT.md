# REPOSITORY_LAYOUT — 폴더가 무엇을 뜻하는가

이 저장소는 **경로만 보고 그 파일이 무엇인지 알 수 있게** 배치한다.
파일이 어디 있는지는 규칙이지 취향이 아니다. 새 파일을 어디 둘지 헷갈리면 이 문서가 답이다.

참고한 원칙은 [ComfyUI](https://github.com/comfy-org/comfyui)의 배치다. ComfyUI는
`comfy/`(코어) · `custom_nodes/`(플러그인) · `input/`·`output/`·`models/`(런타임 데이터)를
철저히 분리하고, 규약만으로 확장을 발견한다. 여기서 가져온 것은 폴더 이름이 아니라 네 가지 규칙이다.

1. **코어와 확장을 섞지 않는다.**
2. **코드·데이터·산출물을 같은 폴더에 두지 않는다.**
3. **규약으로 발견한다** — 등록부를 손으로 고쳐야 하는 구조를 만들지 않는다.
4. **큰 데이터는 바깥을 가리킨다** — 저장소가 데이터 창고가 되지 않게 한다.

---

## 최상위

| 경로 | 무엇인가 | 손으로 고쳐도 되는가 |
|---|---|---|
| `packages/` | **제품의 단일 진실 소스.** 도메인 규칙과 잠긴 숫자 | ✅ |
| `apps/` *(예정)* | 사용자에게 배포되는 것 — Unity 클라이언트 | ✅ |
| `services/` *(예정)* | 서버 — Supabase 스키마·함수·정책 | ✅ |
| `native/` | 플랫폼 네이티브 플러그인 (Android Kotlin) | ✅ |
| `content/` | 게임 콘텐츠 | ⚠️ 아래 참조 |
| `tools/` | **개발 도구만.** 제품 코드가 아니다 | ✅ |
| `tests/` | 자동 테스트 **파일** | ✅ |
| `scripts/` | 테스트·빌드 **실행 스크립트** | ✅ |
| `docs/` | 문서 | ⚠️ 일부 생성물 |
| `requirements/` | 요구사항 추적 | ✅ |
| `artifacts/` | 생성된 증거 | ❌ **생성물** |

`AGENTS.md`와 `CLAUDE.md`는 최상위에 남는다. Codex와 Claude Code가 저장소 루트에서 읽는
규약이라 옮기면 도구가 못 찾는다.

---

## `packages/` — 제품의 정본

```
packages/
└─ domain/          도메인 엔진. 잠긴 숫자와 규칙이 사는 유일한 곳
   ├─ constants.mjs      ← 모든 잠긴 숫자의 단일 출처
   ├─ monthly-apex.mjs   ← 121 체크포인트 사다리
   ├─ race.mjs           ← 8인 러닝 대결
   ├─ reward.mjs · momentum.mjs · runner-passport.mjs
   ├─ best-effort.mjs · anomaly-detection.mjs
```

**이건 도구가 아니라 제품이다.** 예전에는 `tools/lib/`에 있었는데, 이름이 거짓말이었다.
콘텐츠 팩토리·검증기·테스트·시뮬레이터가 전부 여기서 import하고,
C#(`MonthlyApexLadder.cs`)과 SQL(마이그레이션)이 이 값을 **미러**한다.

> **규칙:** 잠긴 숫자를 `packages/domain/constants.mjs` 밖에 다시 적지 않는다.
> 다시 적으면 사다리를 바꿀 때 그 사본이 마지막에 발견되고, 실제로 그렇게 됐다 —
> 방향 잠금 스캐너가 숫자를 하드코딩해서 **올바른 새 사다리를 위반으로 신고했다.**

---

## `tests/` 와 `scripts/` — 한 글자 차이가 아니다

예전 구조에는 `tools/test/`(실행 스크립트)와 `tools/tests/`(테스트 파일)가 **나란히** 있었다.
한 글자 차이로 의미가 정반대인 두 폴더다.

| 지금 | 무엇 | 예 |
|---|---|---|
| `tests/` | 테스트 **파일** | `race.test.mjs`, `monthly-apex.test.mjs` |
| `scripts/` | 테스트·빌드 **실행기** | `db.sh`, `all.sh` |

DB·pgTAP 테스트는 `services/`(현 `backend/supabase/tests/pgtap/`)에 스키마와 함께 둔다.
스키마를 고치는 사람이 같은 자리에서 그 테스트를 본다.

---

## `tools/` — 개발 도구만

```
tools/
├─ content-factory/     설계 표 → 콘텐츠 생성
├─ content-validator/   출시 floor·중복·라우트 검증
├─ direction-lock/      금지 개념 정적 스캐너
├─ conformance/         JS ↔ C# ↔ SQL 정합성 픽스처
├─ run-fixture-generator/
├─ *-simulator/         apex · passport · anti-cheat
├─ release/             증거 생성·드리프트 검사
└─ bootstrap/           툴체인 점검
```

여기 있는 것은 **제품에 배포되지 않는다.** 배포되는 코드는 `packages/`·`apps/`·`services/`에 있다.

---

## 생성물과 저작물 — 손으로 고치면 안 되는 것

| 경로 | 상태 | 생성하는 명령 |
|---|---|---|
| `content/launch/**` | ❌ 생성물 | `node tools/content-factory/build.mjs` |
| `content/conformance/**` | ❌ 생성물 | `node tools/conformance/export-fixtures.mjs` |
| `content/fixtures/**` | ❌ 생성물 | `node tools/run-fixture-generator/generate.mjs` |
| `backend/supabase/seed.sql` | ❌ 생성물 | `node tools/content-factory/emit-seed.mjs` |
| `backend/supabase/tests/pgtap/07_apex_conformance.sql` | ❌ 생성물 | `bash scripts/db.sh` |
| `docs/RLS_MATRIX.md` · `docs/DATABASE_SCHEMA.md` | ❌ 생성물 | `bash scripts/db.sh` |
| `artifacts/test-evidence-manifest.json` | ❌ 생성물 | `bash scripts/db.sh` |
| 그 외 `content/`·`docs/` | ✅ 저작물 | — |

생성물을 손으로 고치면 CI가 잡는다. `content-validation`과 `supabase-tests`가 재생성 후
diff를 비교해서, 커밋된 트리와 다르면 실패한다.

> **왜 중요한가:** 생성물을 손으로 고치면 다음 재생성 때 조용히 사라진다.
> CI의 drift 검사는 그 손실을 커밋 시점에 드러낸다.

---

## 마이그레이션

`backend/supabase/migrations/`는 **적용된 역사**다. 이미 적용된 마이그레이션은 고치지 않고
새 파일을 더한다. 고치면 기존 데이터베이스가 자신을 만들었다는 마이그레이션과 어긋난다.

예외는 하나뿐이다: **아직 어디에도 적용되지 않았고 병합되지 않은 브랜치 안에 있을 때.**
0009가 그랬고, 그래서 "120으로 설정 후 121로 재설정"이라는 실제로 없었던 결정을
역사에 남기는 대신 파일을 직접 고쳤다.

---

## 새 파일을 어디 두는가

| 만들려는 것 | 위치 |
|---|---|
| 도메인 규칙 · 잠긴 숫자 | `packages/domain/` |
| 그 규칙의 테스트 | `tests/` |
| 스키마 · RLS · RPC | `backend/supabase/migrations/` (새 번호) |
| 그 스키마의 테스트 | `backend/supabase/tests/pgtap/` |
| 콘텐츠를 만드는 코드 | `tools/content-factory/` |
| 콘텐츠 자체 | ❌ 직접 만들지 않는다 — 설계 표를 고치고 재생성 |
| 개발자만 쓰는 CLI | `tools/` |
| 여러 명령을 엮는 실행기 | `scripts/` |
| 실기기·에디터가 필요한 것 | `apps/` *(예정)* |

---

## 아직 옮기지 않은 것

이 문서가 설명하는 최종 구조 중 다음은 **아직 이동 전**이다. 한 번에 옮기면 CI·import·
문서 경로가 동시에 깨지므로, 검증 가능한 단위로 나눠 진행한다.

| 지금 | 옮길 곳 | 이유 |
|---|---|---|
| `client/unity/` | `apps/unity/` | 배포물과 개발 도구 분리 |
| `client/cli/` | `tools/play-cli/` | 사용자가 아니라 개발자용이다 |
| `client/dotnet/` | `packages/domain-dotnet/` | 도메인 정합성 테스트지 클라이언트가 아니다 |
| `backend/supabase/` | `services/supabase/` | "backend"보다 무엇인지 정확하다 |
| `content/launch/` | `content/generated/` | 경로만 보고 생성물임을 알 수 있게 |
| `HANDOFF.md` · `CODEX_HANDOFF.md` | `docs/handoff/` | 최상위 마크다운 6개는 너무 많다 |

각 이동은 전체 게이트(단위 107 · pgTAP 1129 · 검증기 · smoke-play)를 통과한 뒤에만 커밋한다.
