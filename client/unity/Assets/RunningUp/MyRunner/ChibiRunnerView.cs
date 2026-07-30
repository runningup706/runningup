// My Runner가 Live Journey Home에서 항상 자연스러운 달리기 animation을 유지한다.
using UnityEngine;

namespace RunningUp.MyRunner
{
    [DisallowMultipleComponent]
    public sealed class ChibiRunnerView : MonoBehaviour
    {
        [SerializeField] private Animation runnerAnimation;
        [SerializeField] private Animator runnerAnimator;
        [SerializeField] private string defaultClip = "steady_run";
        [SerializeField] private Transform footprintAnchor;
        [SerializeField] private Color footprintColor = new(0.373f, 0.941f, 0.761f, 0.7f);

        public Animation RunnerAnimation => runnerAnimation;
        public Animator RunnerAnimator => runnerAnimator;
        public string DefaultClip => defaultClip;

        private float footprintClock;
        private Material footprintMaterial;
        private Mesh footprintMesh;

        private void Awake()
        {
            if (runnerAnimation == null)
            {
                runnerAnimation = GetComponent<Animation>();
            }

            if (runnerAnimator == null)
            {
                runnerAnimator = GetComponentInChildren<Animator>();
            }

            var shader = Shader.Find("Sprites/Default");
            footprintMaterial = new Material(shader) { color = footprintColor };
            footprintMesh = ChibiMeshFactory.CreateEllipsoid("StrideGlowMesh", Vector3.one, 12, 8);
        }

        private void OnEnable()
        {
            Play(defaultClip);
        }

        private void Update()
        {
            if (runnerAnimation != null && runnerAnimator == null && !runnerAnimation.isPlaying)
            {
                Play(defaultClip);
            }

            footprintClock += Time.deltaTime;
            if (footprintClock >= 0.24f)
            {
                footprintClock = 0f;
                EmitFootprint();
            }
        }

        public void Play(string clipName)
        {
            if (runnerAnimator != null)
            {
                var state = Animator.StringToHash(clipName);
                if (runnerAnimator.HasState(0, state))
                {
                    runnerAnimator.CrossFade(state, 0.12f, 0);
                }

                return;
            }

            if (runnerAnimation == null || runnerAnimation.GetClip(clipName) == null)
            {
                return;
            }

            runnerAnimation.CrossFade(clipName, 0.12f);
        }

        private void EmitFootprint()
        {
            if (footprintAnchor == null || footprintMaterial == null)
            {
                return;
            }

            var footprint = new GameObject("StrideGlow");
            footprint.transform.position = footprintAnchor.position + new Vector3(0f, 0.015f, 0.12f);
            footprint.transform.rotation = Quaternion.identity;
            footprint.transform.localScale = new Vector3(0.16f, 0.015f, 0.32f);
            var filter = footprint.AddComponent<MeshFilter>();
            filter.sharedMesh = footprintMesh;
            var renderer = footprint.AddComponent<MeshRenderer>();
            renderer.sharedMaterial = footprintMaterial;
            var fade = footprint.AddComponent<FootprintFade>();
            fade.Initialize(footprintMaterial.color);
        }

        private void OnDestroy()
        {
            if (footprintMaterial != null)
            {
                Destroy(footprintMaterial);
            }

            if (footprintMesh != null)
            {
                Destroy(footprintMesh);
            }
        }
    }

    public sealed class FootprintFade : MonoBehaviour
    {
        private Color initialColor;
        private MeshRenderer meshRenderer;
        private Material runtimeMaterial;
        private float life;

        public void Initialize(Color color)
        {
            initialColor = color;
            meshRenderer = GetComponent<MeshRenderer>();
            runtimeMaterial = meshRenderer == null ? null : meshRenderer.material;
        }

        private void Update()
        {
            life += Time.deltaTime;
            transform.localScale *= 1f + Time.deltaTime * 0.6f;
            if (runtimeMaterial != null)
            {
                var color = initialColor;
                color.a = Mathf.Clamp01(1f - life / 0.8f) * initialColor.a;
                runtimeMaterial.color = color;
            }

            if (life >= 0.8f)
            {
                Destroy(gameObject);
            }
        }

        private void OnDestroy()
        {
            if (runtimeMaterial != null)
            {
                Destroy(runtimeMaterial);
            }
        }
    }
}
