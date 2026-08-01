// 라이선스가 확인된 원경 plate 3~4장을 서로 다른 속도로 이동해 고정 2.5D 깊이를 만든다.
using System;
using System.Collections.Generic;
using UnityEngine;

namespace RunningUp.ProductionArt
{
    [DisallowMultipleComponent]
    public sealed class V14ProductionParallaxRig : MonoBehaviour
    {
        [Serializable]
        private sealed class ParallaxLayer
        {
            [SerializeField] private Transform root;
            [SerializeField, Range(0.01f, 1f)] private float speedMultiplier = 0.15f;
            [SerializeField, Min(1f)] private float loopWidth = 32f;

            private Vector3 origin;

            public bool IsConfigured => root != null;

            public void CaptureOrigin()
            {
                if (root != null)
                {
                    origin = root.localPosition;
                }
            }

            public void Apply(float journeyOffset)
            {
                if (root == null)
                {
                    return;
                }

                var wrapped = Mathf.Repeat(journeyOffset * speedMultiplier, loopWidth);
                root.localPosition = origin + Vector3.left * wrapped;
            }
        }

        [SerializeField, Min(0f)] private float previewMetersPerSecond = 5.4f;
        [SerializeField] private bool animateFromUnscaledTime;
        [SerializeField] private List<ParallaxLayer> layers = new();

        private float journeyOffset;

        public int ConfiguredLayerCount =>
            layers.FindAll(layer => layer != null && layer.IsConfigured).Count;

        private void OnEnable()
        {
            journeyOffset = 0f;
            foreach (var layer in layers)
            {
                layer?.CaptureOrigin();
            }
        }

        private void Update()
        {
            var delta = animateFromUnscaledTime ? Time.unscaledDeltaTime : Time.deltaTime;
            AdvanceJourney(previewMetersPerSecond * delta);
        }

        public void AdvanceJourney(float meters)
        {
            journeyOffset += Mathf.Max(0f, meters);
            foreach (var layer in layers)
            {
                layer?.Apply(journeyOffset);
            }
        }
    }
}
