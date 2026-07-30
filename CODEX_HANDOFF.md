# Codex handoff

<!-- 다음 실행자가 V11 1차 기능 완료 상태에서 출시 차단 항목만 이어가도록 범위를 고정한다. -->

먼저 `HANDOFF.md`, `docs/v11/UPGRADE_LOOP_ITERATION_3.md`,
`ASSET_SELECTION.md`, `design-qa.md`를 읽는다. V5~V10 파일을 복구하지 않고,
기능 프로토타입의 primitive·ChibiMeshFactory·KayKit를 Production Art로
확장하지 않는다.

현재 자동 검증은 Node 16/16, Supabase pgTAP 60/60, Unity EditMode 17/17,
PlayMode 1/1 PASS다. 설치 확인한 기능 APK의 SHA-256은
`e27a4a77427e62332486ebc408a0eefaad4bca7f8ce80386e00f9d117ad7d94b`다.

Supabase 인증 세션·401 refresh·RPC uploader는 소스와 smoke APK에 포함됐지만
전용 원격 프로젝트 통합은 아직 없다. 다음 작업은 RunningUp 전용 project ref
확인과 실제 JWT·RPC 검증,
라이선스 확인 Production Art Vertical Slice, Android 실기기 60분 검증 순서다.
실제 증거 없이 `BLOCKED_ART_ASSET`, `BLOCKED_SUPABASE_PROJECT`,
`BLOCKED_REAL_DEVICE_QA`를 PASS로 바꾸지 않는다.
