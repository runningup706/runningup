// 분리된 Live Journey 자산을 실제 런타임에서 움직이고 하단 탭과 RUN 버튼을 연결한다.
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace RunningUp.ProductionArt
{
    [DisallowMultipleComponent]
    public sealed class V14VisualSliceRuntime : MonoBehaviour
    {
        [SerializeField] private RectTransform hero;
        [SerializeField] private RectTransform pacers;
        [SerializeField] private RectTransform farCity;
        [SerializeField] private RectTransform midCity;
        [SerializeField] private RectTransform road;
        [SerializeField] private List<Button> navigationButtons = new();
        [SerializeField] private Text activeLabel;

        private Vector2 heroOrigin;
        private Vector2 pacerOrigin;
        private Vector2 farOrigin;
        private Vector2 midOrigin;
        private Vector2 roadOrigin;

        public int NavigationCount => navigationButtons.Count;
        public string ActiveLabel => activeLabel == null ? string.Empty : activeLabel.text;

        private void Awake()
        {
            CaptureOrigins();
            var labels = new[] { "홈", "러너", "RUN", "월드", "크루" };
            for (var index = 0; index < navigationButtons.Count; index++)
            {
                var captured = index;
                navigationButtons[index]?.onClick.AddListener(
                    () => Select(labels[Mathf.Clamp(captured, 0, labels.Length - 1)]));
            }

            Select("LIVE JOURNEY");
        }

        private void Update()
        {
            var time = Time.unscaledTime;
            if (hero != null)
            {
                hero.anchoredPosition = heroOrigin +
                    new Vector2(Mathf.Sin(time * 2.2f) * 2.5f, Mathf.Sin(time * 5.1f) * 5f);
                hero.localRotation = Quaternion.Euler(
                    0f,
                    0f,
                    Mathf.Sin(time * 2.2f) * 0.65f);
            }

            if (pacers != null)
            {
                pacers.anchoredPosition = pacerOrigin +
                    new Vector2(Mathf.Sin(time * 1.35f) * 3f, Mathf.Sin(time * 4.2f) * 2.5f);
            }

            if (farCity != null)
            {
                farCity.anchoredPosition = farOrigin +
                    Vector2.right * (Mathf.Sin(time * 0.08f) * 5f);
            }

            if (midCity != null)
            {
                midCity.anchoredPosition = midOrigin +
                    Vector2.right * (Mathf.Sin(time * 0.13f) * 9f);
            }

            if (road != null)
            {
                road.anchoredPosition = roadOrigin +
                    Vector2.down * (Mathf.Repeat(time * 8f, 12f) - 6f);
            }
        }

        public void Configure(
            RectTransform heroTransform,
            RectTransform pacerTransform,
            RectTransform farCityTransform,
            RectTransform midCityTransform,
            RectTransform roadTransform,
            IEnumerable<Button> buttons,
            Text label)
        {
            hero = heroTransform;
            pacers = pacerTransform;
            farCity = farCityTransform;
            midCity = midCityTransform;
            road = roadTransform;
            navigationButtons = new List<Button>(buttons);
            activeLabel = label;
            CaptureOrigins();
        }

        public void Select(string label)
        {
            if (activeLabel == null)
            {
                return;
            }

            activeLabel.text = label == "RUN" ? "RUN READY · GPS 연결 대기" : label;
        }

        private void CaptureOrigins()
        {
            heroOrigin = hero == null ? Vector2.zero : hero.anchoredPosition;
            pacerOrigin = pacers == null ? Vector2.zero : pacers.anchoredPosition;
            farOrigin = farCity == null ? Vector2.zero : farCity.anchoredPosition;
            midOrigin = midCity == null ? Vector2.zero : midCity.anchoredPosition;
            roadOrigin = road == null ? Vector2.zero : road.anchoredPosition;
        }
    }
}
