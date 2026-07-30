// 기본 도형 장면이 정식 아트가 아닌 기능 검증 전용임을 런타임과 감사 도구에 명시한다.
using UnityEngine;

namespace RunningUp.ProductionArt
{
    [DisallowMultipleComponent]
    public sealed class FunctionalPrototypeOnlyMarker : MonoBehaviour
    {
        public const string Classification = "FUNCTIONAL_PROTOTYPE_ONLY";
    }
}
