
# V11 3등신 3D 러너 아트 바이블

## 비율
- 총 신장: 3.0~3.25 heads.
- 머리: 전체 높이 36~40%.
- 몸통: 28~32%.
- 다리: 28~34%.
- 손과 러닝화는 실제 비율보다 12~18% 크게 하여 작은 화면에서 읽히게 한다.

## 얼굴과 헤어
- 큰 눈, 눈썹, 코, 입, 볼과 귀를 별도 형태로 모델링한다.
- 최소 12개 표정 blend shape: 기쁨, 집중, 놀람, 지침, 승리, 응원 등.
- 헤어는 단순 덩어리가 아니라 앞머리·옆머리·뒷머리의 3층 실루엣을 가진다.
- 모든 캐릭터는 64px 크기에서도 얼굴과 헤어가 구별되어야 한다.

## 몸과 의상
- 원통형 팔다리와 기본 Capsule 실루엣을 금지한다.
- 어깨·팔꿈치·무릎·발목의 형태가 러닝 포즈에서 읽혀야 한다.
- 상의, 하의, 양말, 러닝화, 워치, 헤드웨어를 실제 별도 mesh 또는 검증된 modular part로 만든다.
- 옷 주름과 신발 솔은 normal/roughness 또는 geometry로 표현한다.

## 애니메이션
- Idle stretch, easy jog, steady run, tempo, interval sprint, final kick, finish, cheer, tired-but-proud를 최소 세트로 제작한다.
- 골반 회전, 어깨 반대 회전, 발 착지, 팔 스윙, 머리 bob이 자연스러워야 한다.
- 캐릭터별로 보폭·케이던스·팔 동작을 바꾼다.

## 모바일 예산
- My Runner High LOD 25k~40k triangles, Mid 12k~22k, Low 5k~10k.
- Pacer High 18k~30k, Mid 9k~16k, Low 4k~8k.
- skeleton 45~65 bones, face blend shapes 12~20.
- material slots 4개 이하를 목표로 하고 atlas를 사용한다.

## 자동 탈락
- Stick figure, capsule limbs, flat face, default material, hair helmet, shoe without sole, recolor-only Pacer.
- 달리기 중 발이 미끄러지거나 지면을 뚫는 foot sliding.
- 전신이 화면 높이의 18% 미만으로 보이는 Live Journey Home.
