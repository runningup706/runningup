
# V11 project structure

```text
client/unity/Assets/RunningUp/
  Bootstrap/
  Core/
  LiveJourney/
  RealRun/
  ActivityImport/
  RunVerification/
  StrideLeap/
  World/
  MyRunner/
  Pacer/
  Cards/
  Fusion/
  Gear/
  MonthlyApex/
  Social/
  RunnerLounge/
  Crew/
  UI/
  Audio/
  Infrastructure/Supabase/
  Native/Android/
  Content/
  Editor/
  Tests/EditMode/
  Tests/PlayMode/

native/android-running-plugin/
backend/supabase/
content/
tools/
requirements/
docs/
visual_reference/
```

`Combat`, `Monster`, `Enemy`, `Weapon`, `Damage`, `BossHP`는 활성 트리에 존재하면 안 된다. 삭제 내역은 manifest에 남기되 별도 legacy 복사본은 만들지 않는다.
