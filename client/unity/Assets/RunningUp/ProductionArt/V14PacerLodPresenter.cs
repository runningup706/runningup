// 한 장면의 Pacer를 5~7명으로 제한하고 가까운 3D와 먼 애니메이션 빌보드를 전환한다.
using System;
using System.Collections.Generic;
using UnityEngine;

namespace RunningUp.ProductionArt
{
    [DisallowMultipleComponent]
    public sealed class V14PacerLodPresenter : MonoBehaviour
    {
        [Serializable]
        private sealed class PacerSlot
        {
            [SerializeField] private Transform distanceAnchor;
            [SerializeField] private GameObject near3dRoot;
            [SerializeField] private GameObject animatedBillboardRoot;

            public float DistanceFrom(Vector3 cameraPosition)
            {
                var anchor = distanceAnchor != null
                    ? distanceAnchor
                    : near3dRoot != null
                        ? near3dRoot.transform
                        : animatedBillboardRoot?.transform;
                return anchor == null
                    ? float.PositiveInfinity
                    : Vector3.Distance(cameraPosition, anchor.position);
            }

            public bool HasNear3d => near3dRoot != null;
            public bool HasAnimatedBillboard =>
                animatedBillboardRoot != null &&
                animatedBillboardRoot.GetComponentInChildren<Animator>(true) != null;

            public void Present(bool visible, bool useNear3d)
            {
                if (near3dRoot != null)
                {
                    near3dRoot.SetActive(visible && useNear3d);
                }

                if (animatedBillboardRoot != null)
                {
                    animatedBillboardRoot.SetActive(visible && !useNear3d);
                }
            }
        }

        [SerializeField] private Camera presentationCamera;
        [SerializeField, Min(0.1f)] private float near3dDistance = 18f;
        [SerializeField, Range(5, 7)] private int visiblePacerLimit = 7;
        [SerializeField, Range(1, 4)] private int near3dPacerLimit = 4;
        [SerializeField, Min(0.05f)] private float refreshIntervalSeconds = 0.2f;
        [SerializeField] private List<PacerSlot> pacers = new();

        private readonly List<(PacerSlot slot, float distance)> ordered = new();
        private float nextRefreshTime;

        public int ConfiguredPacerCount => pacers.Count;
        public int ConfiguredNear3dCount => pacers.FindAll(slot => slot?.HasNear3d == true).Count;
        public int ConfiguredAnimatedBillboardCount =>
            pacers.FindAll(slot => slot?.HasAnimatedBillboard == true).Count;
        public int VisiblePacerLimit => visiblePacerLimit;
        public int Near3dPacerLimit => near3dPacerLimit;

        private void OnValidate()
        {
            visiblePacerLimit = Mathf.Clamp(
                visiblePacerLimit,
                V14ProductionPresentationContract.VisiblePacerMinimum,
                V14ProductionPresentationContract.VisiblePacerMaximum);
            near3dPacerLimit = Mathf.Clamp(
                near3dPacerLimit,
                1,
                V14ProductionPresentationContract.Near3dPacerMaximum);
        }

        private void LateUpdate()
        {
            if (Time.unscaledTime < nextRefreshTime)
            {
                return;
            }

            nextRefreshTime = Time.unscaledTime + refreshIntervalSeconds;
            RefreshPresentation();
        }

        public void RefreshPresentation()
        {
            var camera = presentationCamera != null ? presentationCamera : Camera.main;
            if (camera == null)
            {
                return;
            }

            ordered.Clear();
            foreach (var slot in pacers)
            {
                if (slot != null)
                {
                    ordered.Add((slot, slot.DistanceFrom(camera.transform.position)));
                }
            }

            ordered.Sort((left, right) => left.distance.CompareTo(right.distance));
            var activeNear3d = 0;
            for (var index = 0; index < ordered.Count; index++)
            {
                var candidate = ordered[index];
                var visible = index < visiblePacerLimit;
                var useNear3d =
                    visible &&
                    candidate.slot.HasNear3d &&
                    candidate.distance <= near3dDistance &&
                    activeNear3d < near3dPacerLimit;
                candidate.slot.Present(visible, useNear3d);
                if (useNear3d)
                {
                    activeNear3d++;
                }
            }
        }
    }
}
