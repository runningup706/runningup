// Live Journey Home의 코스 흐름과 배경 이동을 낮은 비용으로 계속 연출한다.
using System.Collections.Generic;
using UnityEngine;

namespace RunningUp.LiveJourney
{
    [DisallowMultipleComponent]
    public sealed class LiveJourneyWorld : MonoBehaviour
    {
        [SerializeField] private List<Transform> laneMarkers = new();
        [SerializeField] private List<Transform> skylineBands = new();
        [SerializeField] private float markerSpeed = 5.4f;
        [SerializeField] private float markerLoopLength = 42f;
        [SerializeField] private float skylineDrift = 0.18f;

        private void Update()
        {
            var delta = Time.deltaTime;
            for (var index = 0; index < laneMarkers.Count; index++)
            {
                var marker = laneMarkers[index];
                if (marker == null)
                {
                    continue;
                }

                marker.localPosition += Vector3.back * (markerSpeed * delta);
                if (marker.localPosition.z < -8f)
                {
                    marker.localPosition += Vector3.forward * markerLoopLength;
                }
            }

            for (var index = 0; index < skylineBands.Count; index++)
            {
                var band = skylineBands[index];
                if (band == null)
                {
                    continue;
                }

                var position = band.localPosition;
                position.x = Mathf.Sin(Time.time * skylineDrift + index * 0.7f) * (0.18f + index * 0.04f);
                band.localPosition = position;
            }
        }

        public void Configure(
            IEnumerable<Transform> markers,
            IEnumerable<Transform> skyline)
        {
            laneMarkers.Clear();
            laneMarkers.AddRange(markers);
            skylineBands.Clear();
            skylineBands.AddRange(skyline);
        }
    }
}

