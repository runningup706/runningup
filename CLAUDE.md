# CLAUDE.md — RunningUp V11

<!-- AGENTS.md를 그대로 반영한다. 두 파일은 절대 서로 어긋나면 안 된다. -->

V11은 V5~V10의 패치가 아닌 clean rebuild다. Git 이력 외의 이전 런타임을
복구하거나 재사용하지 않는다. 전체 계약은 [`AGENTS.md`](AGENTS.md)에 있다.

## 쓰기 전에 읽을 순서

1. `requirements/v11/USER_DIRECTION_LOCK_V11.yaml`
2. `requirements/v11/VISUAL_DIRECTION_LOCK_V11.yaml`
3. `requirements/v11/QUALITY_GATES_V11.yaml`
4. `docs/v11/READ_COMPLETE.md`
5. `HANDOFF.md`
6. `requirements/TRACEABILITY_V11.csv`

## 명령

```bash
npm run validate           # V11 카탈로그·정책 검증
npm run validate:legacy    # 활성 트리의 전투 계열 잔재 검사
npm test                   # Node 회귀 테스트
npm run test:db            # migration + pgTAP
npm run test:unity         # Unity EditMode/PlayMode
npm run art:validate       # Production Art 상태 보고
npm run art:gate           # Production Art가 없으면 실패하는 것이 정상
```

## 깨뜨리면 빌드가 실패하는 규칙

- Combat, Battle, Enemy, Monster, Weapon, Damage, BossHP 런타임은 활성 트리에
  존재하면 안 된다.
- 홈은 `Live Journey Home`이며 premium 3등신 My Runner가 항상 달린다.
- 영구 성장의 85% 이상은 검증된 현실 러닝에서 온다. Idle은 최대 10%,
  메뉴 반복 조작은 최대 5%다.
- Daily Run Contract는 현지 날짜당 하나이며 추가 러닝은 기본 보상을 유지한다.
- 12대륙, 192지역, 2304코스, My Runner 12형태, Pacer 60명, 카드 360장,
  러닝 장비 192개, 120체크포인트, 1000km World Crown을 축소하지 않는다.
- 1000km 위에 어떤 tier나 checkpoint도 만들지 않는다.
- 직접 GPS, Health Connect, FIT/GPX/TCX는 Android P0다.
- 승인 전 Samsung, Garmin, Strava 버튼을 활성 상태로 표시하지 않는다.

## 작업 노트

- `content/v11/catalogs/**`와 `client/unity/Assets/StreamingAssets/RunningUpV11/**`는
  생성물이다. `tools/content-factory/`로 재생성한다.
- primitive 캐릭터와 단색 도시는 기능 프로토타입이다. 이를 확장해 Production
  Art로 PASS 처리하지 않는다. `art:gate` 실패는 정상이다.
- `BLOCKED_ART_ASSET`, `BLOCKED_SUPABASE_PROJECT`, `BLOCKED_REAL_DEVICE_QA`는
  실제 증거 없이 PASS로 바꾸지 않는다.
- PASS는 이번 실행에서 생성된 코드·빌드·테스트·실행 증거가 있을 때만 쓴다.
- `legacy_backup`, `v8_old`, `v9_old`, `v10_old`, `deprecated_copy` 폴더를
  만들지 않는다. 삭제는 `DEPRECATED_PURGE_MANIFEST.json`에 기록한다.
