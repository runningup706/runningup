# V11 정본 정독·무결성 증거

<!-- V11 실행 정본을 빠짐없이 읽고 검증한 사실과 발견 사항을 기록한다. -->

## 정본

- ZIP은 `/Users/runner706/Downloads/RunningUp_V11_Complete.zip`이다.
- ZIP SHA-256은 `a11d184f6ec2a44ea079e9cfaacf9a7ff1f60e4dd0af9d428cb5fed13960a04f`다.
- ZIP entry는 84개이며 `unzip -t`가 전부 통과했다.
- 절대 경로, 상위 경로 탈출, NUL, case-fold 중복 entry는 0개다.
- `SHA256SUMS.txt`의 모든 파일이 일치했다.
- master prompt는 22,341 bytes, 768 lines다.
- master SHA-256은 `e816fbf3efd54d71d11b6c57777d6902826dcc330e52197bc15836d1907a9798`다.
- `PROMPT/PARTS/01`부터 `14`까지 번호순 byte-concatenate 결과가 master와
  byte-for-byte 동일했다.

## 정독 범위

- 첫 순서 파일 4개를 지정 순서대로 읽었다.
- master prompt 14개 분할본을 첫 줄부터 마지막 줄까지 읽었다.
- DATA, SPECS, DOCS, RESEARCH, SUPABASE, VALIDATION, PROTOTYPE, TOOLS의 모든
  텍스트와 구조화 파일을 읽고 파싱했다.
- V11 original 시각 파일 16개와 user-reference-only 이미지 6개를 확인했다.
- 430×932, H.264, 15.034초 미리보기에서 7개 시간축 프레임을 추출해 확인했다.
- user-reference-only 파일은 고수준 원리만 분석했고 저장소 런타임에 복사하지
  않았다.

## 구조화 데이터 전수 검사

| 항목 | 결과 |
|---|---:|
| 대륙 | 12 |
| 지역 | 192 |
| 코스 | 2304, ID 2304개 고유 |
| 복구 beat | 11520 |
| mastery stamp | 6912 |
| My Runner 형태 | 12 |
| Pacer | 60, ID 60개 고유 |
| 카드 | 360, ID 360개 고유 |
| 장비 | 192, 16세트 × 12슬롯 |
| 월간 체크포인트 | 120, km 120개 고유·오름차순 |
| 최종 체크포인트 | MA120, 1000km, 유일한 final |
| Task DAG | 200, 누락 dependency 0, cycle 0 |
| Audit 정의 | 50 |

모든 JSON byte를 실제 parser가 읽었고 선언 수량과 실제 배열 수량을 비교했다.
카탈로그에서 전투 금지어와 1000km 초과 체크포인트는 0건이었다.

## 프로토타입 직접 조작

- 홈, 러너, RUN, 월드, 크루 탭 5개를 클릭하고 active screen 전환을 확인했다.
- 방치 이동, 오늘의 RUN, 외형 진화, 장비, Pacer, 카드 시트 6개를 열고 닫았다.
- 직접 GPS, Health Connect, FIT/GPX/TCX, Garmin 표면을 클릭했다.
- RUN 시작 후 10.27km Stride Leap 결과 시트를 확인했다.
- 브라우저 console warning/error는 0건이었다.

## 정본에서 발견한 구현 전 수정 항목

- EASY, TEMPO, INTERVAL, LONG을 눌러도 선택 상태가 FREE에서 바뀌지 않는다.
- 실제 연결 증거가 없는 Health Connect를 `연결됨`으로 표시한다.
- Pacer 60명의 hair 값이 2종뿐이라 60명 독창성 품질을 충족하지 않는다.
- 대륙별 region/route 명명 패턴이 과도하게 반복된다.
- 일부 V11 visual board는 720코스, 60체크포인트, 승인 전 서비스 연결, 전투형
  skill 아이콘을 표시해 최신 V11 lock과 충돌한다.

위 항목은 정본의 수량 계약을 축소할 이유가 아니다. V11 content factory와 실제
런타임에서 개선하고, 원본 reference board를 런타임 배경으로 사용하지 않는다.

