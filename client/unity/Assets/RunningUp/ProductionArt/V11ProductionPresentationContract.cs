// V11 Production Art의 2.8등신 2.5D 화면 수치가 런타임과 검증에서 같도록 고정한다.
namespace RunningUp.ProductionArt
{
    public static class V11ProductionPresentationContract
    {
        public const string Mode = "FIXED_CAMERA_2_5D";
        public const string FarPacerRepresentation = "ANIMATED_BILLBOARD";
        public const float HeadRatioMinimum = 2.6f;
        public const float HeadRatioTarget = 2.8f;
        public const float HeadRatioMaximum = 2.9f;
        public const int LiveViewportMinimumPercent = 60;
        public const int RunnerScreenHeightMinimumPercent = 32;
        public const int RunnerScreenHeightTargetPercent = 36;
        public const int RunnerScreenHeightMaximumPercent = 42;
        public const int ParallaxLayerMinimum = 3;
        public const int ParallaxLayerMaximum = 4;
        public const int VisiblePacerMinimum = 5;
        public const int VisiblePacerMaximum = 7;
        public const int Near3dPacerMaximum = 4;
        public const int Total3dSkinnedCharacterMaximum = 5;
    }
}
