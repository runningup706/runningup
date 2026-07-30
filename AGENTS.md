# AGENTS.md — RunningUp V11

<!-- V11 작업자가 정본과 검증 순서를 빠뜨리지 않도록 안내한다. -->

V11은 V5~V10의 패치가 아닌 clean rebuild다. Git 이력 외의 이전 런타임을
복구하거나 재사용하지 않는다.

## 쓰기 전에 읽을 순서

1. `requirements/v11/USER_DIRECTION_LOCK_V11.yaml`
2. `requirements/v11/VISUAL_DIRECTION_LOCK_V11.yaml`
3. `requirements/v11/QUALITY_GATES_V11.yaml`
4. `docs/v11/READ_COMPLETE.md`
5. `HANDOFF.md`
6. `requirements/TRACEABILITY_V11.csv`

## 불변 조건

- 홈에는 premium 3등신 My Runner가 항상 달린다.
- Combat, Battle, Enemy, Monster, Weapon, Damage 런타임을 만들지 않는다.
- 영구 성장의 85% 이상은 검증된 현실 러닝에서 온다.
- Daily Run Contract는 현지 날짜당 하나이며 추가 러닝은 기본 보상을 유지한다.
- 12대륙, 192지역, 2304코스, My Runner 12형태, Pacer 60명, 카드 360장,
  러닝 장비 192개, 120체크포인트, 1000km World Crown을 축소하지 않는다.
- 직접 GPS, Health Connect, FIT/GPX/TCX는 Android P0다.
- 승인 전 Samsung, Garmin, Strava 버튼을 활성 상태로 표시하지 않는다.
- 사용자 참고 이미지와 V11 시각 보드는 런타임 자산으로 복사하지 않는다.
- PASS는 이번 실행에서 생성된 코드·빌드·테스트·실행 증거가 있을 때만 사용한다.

## 표준 검증

```bash
npm run validate
npm run test
npm run test:db
npm run test:unity
npm run build:android:smoke
```

개별 명령이 아직 구현되지 않은 Gate에서는 `NOT_RUN` 또는 정확한 blocker를
기록하며 우회 PASS를 만들지 않는다.

