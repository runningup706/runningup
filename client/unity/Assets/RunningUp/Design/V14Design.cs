// V14 화면 디자인 토큰 — 색과 크기를 여기 한곳에서 관리한다.
//
// 왜 이 파일이 생겼는가
// --------------------
// V14 화면 코드에는 `new Color(0.005f, 0.03f, 0.065f, 0.86f)` 같은 값이 33군데 흩어져
// 있었다. 색 하나를 바꾸려면 3,600줄짜리 파일을 뒤져야 했고, 같은 색인지 아닌지도 눈으로
// 세야 했다. `RunningUp.Core.V11Palette` 라는 팔레트가 이미 있었는데도 V14 쪽은 쓰지
// 않고 있었다.
//
// 값을 모아 보니 실제로는 체계가 있었다. 배경은 어두운 네이비 다섯 종류를 투명도만 바꿔
// 쓰고 있었고, 글자는 세 단계, 버튼은 네 상태였다. 그 체계에 이름을 붙인 것이 이 파일이다.
//
// 중요: 이 파일을 만들면서 **화면에 보이는 색은 한 값도 바꾸지 않았다.**
// `tests/design-tokens.test.mjs` 가 리팩터 전후 66개 값이 동일한지 대조한다.
//
// 바꾸는 법
// --------
// 앱 전체의 배경 톤을 바꾸고 싶으면 SurfaceDeep 한 줄만 고치면 된다. 예전에는 같은
// 작업이 20군데 수정이었다.
//
// 색은 0~1 범위다. 포토샵의 #RRGGBB 는 255 로 나눈다.
//   #1A3D5C  ->  new(26f / 255f, 61f / 255f, 92f / 255f)

using UnityEngine;

namespace RunningUp.Design
{
    public static class V14Design
    {
        // ------------------------------------------------------------------
        // 배경 (Surface) — 어두운 것부터
        // ------------------------------------------------------------------
        // 화면 뒤에 깔리는 판. 같은 색을 투명도만 달리해 층을 만든다.
        // 투명도는 Alpha() 로 그때그때 지정한다.

        /// 가장 어두운 바닥. 몰입 화면(러닝 중, 레이스)의 배경.
        public static readonly Color SurfaceDeep = new(0.005f, 0.03f, 0.065f);

        /// SurfaceDeep 보다 아주 살짝 푸른 쪽. 라이브 레이스 계열 패널.
        public static readonly Color SurfaceDeepCool = new(0.005f, 0.035f, 0.075f);

        /// 중간 밝기 배경. 결과·캐릭터·상태 레일.
        public static readonly Color SurfaceMid = new(0.01f, 0.06f, 0.12f);

        /// 떠 있는 패널. 동기화·크루 화면 카드.
        public static readonly Color SurfacePanel = new(0.025f, 0.14f, 0.25f);

        /// SurfacePanel 의 따뜻한 변형. 트레이닝 화면 카드.
        public static readonly Color SurfacePanelWarm = new(0.025f, 0.16f, 0.29f);

        /// 회색 슬레이트 패널. 캐릭터 화면의 비활성 슬롯.
        public static readonly Color SurfaceSlate = new(0.22f, 0.24f, 0.31f);

        /// 청록 강조 패널. 캐릭터 화면의 선택된 슬롯.
        public static readonly Color SurfaceTeal = new(0.04f, 0.28f, 0.40f);

        /// 모달 뒤를 덮는 반투명 막.
        public static readonly Color Scrim = new(0f, 0.03f, 0.07f);

        // ------------------------------------------------------------------
        // 글자
        // ------------------------------------------------------------------

        /// 본문. 흐린 청회색.
        public static readonly Color TextMuted = new(0.64f, 0.70f, 0.78f);

        /// 보조 설명문. TextMuted 보다 밝다.
        public static readonly Color TextSecondary = new(0.70f, 0.80f, 0.88f);

        /// 입력창의 안내 문구.
        public static readonly Color TextPlaceholder = new(0.62f, 0.73f, 0.82f);

        // ------------------------------------------------------------------
        // 버튼 상태
        // ------------------------------------------------------------------

        /// 손가락이 올라갔을 때.
        public static readonly Color ButtonHighlighted = new(0.82f, 0.94f, 1f);

        /// 눌린 순간.
        public static readonly Color ButtonPressed = new(0.64f, 0.82f, 1f);

        /// 누를 수 없는 상태.
        public static readonly Color ButtonDisabled = new(0.42f, 0.48f, 0.56f);

        // ------------------------------------------------------------------
        // 설정 화면의 아트 기준 색 (V13 베이스 스와치)
        // ------------------------------------------------------------------
        // 승인된 아트 기준값이다. 임의로 바꾸면 V11ProductionArtGate 검사에 걸린다.

        public static readonly Color SwatchTopBase = new(0.18f, 0.07f, 0.03f);
        public static readonly Color SwatchBottomBase = new(0.02f, 0.08f, 0.20f);
        public static readonly Color SwatchAccentMint = new(0.10f, 0.92f, 0.66f);
        public static readonly Color SwatchAccentViolet = new(0.68f, 0.40f, 1f);

        // ------------------------------------------------------------------
        // 도우미
        // ------------------------------------------------------------------

        /// 같은 색을 다른 투명도로. `SurfaceDeep.Alpha(0.86f)`
        ///
        /// Unity 의 Color 는 구조체라 값 복사가 일어난다. 원본 상수는 바뀌지 않는다.
        public static Color Alpha(this Color color, float alpha)
        {
            color.a = alpha;
            return color;
        }
    }
}
