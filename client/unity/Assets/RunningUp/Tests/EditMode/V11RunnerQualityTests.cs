// V11 My Runner의 모델 예산, 3등신, animation, 세로 홈과 전투 잔재 제거를 자동 검증한다.
using System;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using RunningUp.Core;
using RunningUp.MyRunner;
using RunningUp.RunVerification;
using RunningUp.UI;
using UnityEditor;
using UnityEditor.Animations;
using UnityEditor.Build;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.UI;

namespace RunningUp.Tests.EditMode
{
    public sealed class V11RunnerQualityTests
    {
        private const string PrefabPath =
            "Assets/RunningUp/Generated/Prefabs/MyRunnerV11.prefab";
        private const string ScenePath =
            "Assets/RunningUp/Scenes/LiveJourneyHome.unity";
        private static readonly string[] StateNames =
        {
            "idle_stretch",
            "easy_jog",
            "steady_run",
            "tempo_run",
            "interval_sprint",
            "final_kick",
            "finish",
            "cheer",
            "tired_but_proud",
        };
        private static readonly string[] ForbiddenRuntimeTerms =
        {
            "combat",
            "monster",
            "weapon",
            "damage",
            "battle",
            "melee",
            "ranged",
            "spell",
            "knife",
            "crossbow",
            "throwable",
        };

        [Test]
        public void PremiumRunnerMatchesLockedArtBudget()
        {
            var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(PrefabPath);
            Assert.That(prefab, Is.Not.Null);
            var instance = PrefabUtility.InstantiatePrefab(prefab) as GameObject;
            Assert.That(instance, Is.Not.Null);
            try
            {
                var renderers = instance
                    .GetComponentsInChildren<Renderer>(true)
                    .Where(renderer => renderer.enabled)
                    .ToArray();
                var triangleCount =
                    instance.GetComponentsInChildren<MeshFilter>(true)
                        .Where(filter => filter.GetComponent<Renderer>()?.enabled == true)
                        .Sum(filter => filter.sharedMesh?.triangles.Length / 3 ?? 0) +
                    instance.GetComponentsInChildren<SkinnedMeshRenderer>(true)
                        .Where(renderer => renderer.enabled)
                        .Sum(renderer => renderer.sharedMesh?.triangles.Length / 3 ?? 0);
                var materials = renderers
                    .SelectMany(renderer => renderer.sharedMaterials)
                    .Where(material => material != null)
                    .Distinct()
                    .ToArray();
                var headRenderer = instance
                    .GetComponentsInChildren<SkinnedMeshRenderer>(true)
                    .Single(renderer =>
                        renderer.name.Contains("Head", StringComparison.OrdinalIgnoreCase));
                var runnerRange = CalculateYRange(renderers);
                var headRange = CalculateYRange(new Renderer[] { headRenderer });
                var ratio = (runnerRange.maximum - runnerRange.minimum) /
                    (headRange.maximum - headRange.minimum);
                var rig = instance
                    .GetComponentsInChildren<Transform>(true)
                    .Single(item => item.name == "Rig");
                var boneCount = rig.GetComponentsInChildren<Transform>(true).Length;

                Assert.That(triangleCount, Is.InRange(25000, 40000));
                Assert.That(materials.Length, Is.LessThanOrEqualTo(4));
                Assert.That(ratio, Is.InRange(3.0f, 3.25f));
                Assert.That(boneCount, Is.InRange(45, 65));
                Assert.That(headRenderer.sharedMesh.blendShapeCount, Is.InRange(12, 20));
                Assert.That(renderers.Any(renderer => renderer.name == "MyRunnerJersey"), Is.True);
                Assert.That(renderers.Any(renderer => renderer.name == "MyRunnerShorts"), Is.True);
                Assert.That(renderers.Any(renderer => renderer.name == "MyRunnerWatch"), Is.True);
                Assert.That(renderers.Any(renderer => renderer.name == "MyRunnerHeadBand"), Is.True);
            }
            finally
            {
                UnityEngine.Object.DestroyImmediate(instance);
            }
        }

        [Test]
        public void RunnerPrefabContainsOnlyNineRunningStates()
        {
            var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(PrefabPath);
            var animator = prefab.GetComponentInChildren<Animator>(true);
            var controller = animator.runtimeAnimatorController as AnimatorController;
            Assert.That(controller, Is.Not.Null);
            var actualStates = controller.layers[0].stateMachine.states
                .Select(item => item.state.name)
                .OrderBy(name => name, StringComparer.Ordinal)
                .ToArray();
            Assert.That(
                actualStates,
                Is.EqualTo(StateNames.OrderBy(name => name, StringComparer.Ordinal).ToArray()));
            Assert.That(
                controller.layers[0].stateMachine.defaultState.name,
                Is.EqualTo("steady_run"));

            var dependencies = AssetDatabase.GetDependencies(PrefabPath, true);
            Assert.That(
                dependencies.Any(path =>
                    path.Contains("ImportStaging", StringComparison.OrdinalIgnoreCase)),
                Is.False);
            Assert.That(
                dependencies.Any(path =>
                    path.EndsWith(".fbx", StringComparison.OrdinalIgnoreCase)),
                Is.False);
            Assert.That(
                prefab.GetComponentsInChildren<Transform>(true)
                    .Select(item => item.name)
                    .Any(ContainsForbiddenTerm),
                Is.False);
            Assert.That(
                actualStates.Any(ContainsForbiddenTerm),
                Is.False);
        }

        [Test]
        public void AndroidProjectIsPortraitArm64Il2Cpp()
        {
            Assert.That(
                PlayerSettings.GetApplicationIdentifier(NamedBuildTarget.Android),
                Is.EqualTo("kr.robom.runningup"));
            Assert.That(PlayerSettings.defaultInterfaceOrientation, Is.EqualTo(UIOrientation.Portrait));
            Assert.That(
                PlayerSettings.GetScriptingBackend(NamedBuildTarget.Android),
                Is.EqualTo(ScriptingImplementation.IL2CPP));
            Assert.That(
                PlayerSettings.Android.targetArchitectures,
                Is.EqualTo(AndroidArchitecture.ARM64));
            Assert.That(PlayerSettings.colorSpace, Is.EqualTo(ColorSpace.Linear));
        }

        [Test]
        public void LiveJourneyHomeHasFiveTabsAndOneDailyContract()
        {
            EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Single);
            var runner = UnityEngine.Object.FindFirstObjectByType<ChibiRunnerView>();
            var hud = UnityEngine.Object.FindFirstObjectByType<V11HudController>();
            Assert.That(runner, Is.Not.Null);
            Assert.That(runner.RunnerAnimator, Is.Not.Null);
            Assert.That(hud, Is.Not.Null);
            var serializedHud = new SerializedObject(hud);
            Assert.That(serializedHud.FindProperty("screens").arraySize, Is.EqualTo(5));
            Assert.That(serializedHud.FindProperty("navigationButtons").arraySize, Is.EqualTo(5));
            Assert.That(serializedHud.FindProperty("goalModeButtons").arraySize, Is.EqualTo(5));
            Assert.That(serializedHud.FindProperty("contractButton").objectReferenceValue, Is.Not.Null);
            Assert.That(
                UnityEngine.Object.FindFirstObjectByType<V11SupabaseRuntimeConfig>(),
                Is.Not.Null);
            Assert.That(
                UnityEngine.Object.FindFirstObjectByType<V11SupabaseSessionRuntime>(),
                Is.Not.Null);
            Assert.That(
                UnityEngine.Object.FindFirstObjectByType<V11VerifiedRunUploader>(),
                Is.Not.Null);
            Assert.That(Camera.main, Is.Not.Null);
        }

        [Test]
        public void PortraitLayoutKeepsCoreControlsInsideReferenceWidth()
        {
            EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Single);
            var scaler = UnityEngine.Object.FindFirstObjectByType<CanvasScaler>();
            Assert.That(scaler, Is.Not.Null);
            Assert.That(scaler.referenceResolution, Is.EqualTo(new Vector2(1080f, 1920f)));
            Assert.That(scaler.matchWidthOrHeight, Is.EqualTo(0f));

            var rects = UnityEngine.Object.FindObjectsByType<RectTransform>(
                FindObjectsInactive.Include,
                FindObjectsSortMode.None);
            var boundedNames = new[]
            {
                "Nav홈",
                "Nav러너",
                "NavRUN",
                "Nav월드",
                "Nav크루",
                "ModeFREE",
                "ModeEASY",
                "ModeTEMPO",
                "ModeINTERVAL",
                "ModeLONG",
            };
            foreach (var objectName in boundedNames)
            {
                var rect = rects.Single(item => item.name == objectName);
                var left = rect.anchoredPosition.x - rect.sizeDelta.x * rect.pivot.x;
                var right = left + rect.sizeDelta.x;
                Assert.That(left, Is.GreaterThanOrEqualTo(0f), $"{objectName} left");
                Assert.That(right, Is.LessThanOrEqualTo(1080f), $"{objectName} right");
            }

            var runnerPanel = rects.Single(item => item.name == "RunnerScreen");
            var title = runnerPanel.Find("Title").GetComponent<RectTransform>();
            var subtitle = runnerPanel.Find("Subtitle").GetComponent<RectTransform>();
            var titleBottom = title.anchoredPosition.y - title.sizeDelta.y;
            var subtitleTop = subtitle.anchoredPosition.y;
            Assert.That(titleBottom, Is.GreaterThan(subtitleTop));
        }

        [Test]
        public void NavigationHighlightFollowsTheVisibleScreen()
        {
            EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Single);
            var hud = UnityEngine.Object.FindFirstObjectByType<V11HudController>();
            Assert.That(hud, Is.Not.Null);

            hud.ShowScreen(4);
            var names = new[] { "Nav홈", "Nav러너", "NavRUN", "Nav월드", "Nav크루" };
            for (var index = 0; index < names.Length; index++)
            {
                var button = GameObject.Find(names[index]).GetComponent<Button>();
                var selected = index == 4;
                Assert.That(button.transition, Is.EqualTo(Selectable.Transition.None));
                Assert.That(
                    Vector4.Distance(
                        button.GetComponent<Image>().color,
                        selected ? V11Palette.SkyBlue : Color.clear),
                    Is.LessThan(0.001f),
                    $"{names[index]} background");
                Assert.That(
                    Vector4.Distance(
                        button.GetComponentInChildren<Text>().color,
                        selected ? V11Palette.DeepNavy : V11Palette.MutedText),
                    Is.LessThan(0.001f),
                    $"{names[index]} label");
            }
        }

        private static bool ContainsForbiddenTerm(string value)
        {
            return ForbiddenRuntimeTerms.Any(term =>
                value.Contains(term, StringComparison.OrdinalIgnoreCase));
        }

        private static (float minimum, float maximum) CalculateYRange(
            IEnumerable<Renderer> renderers)
        {
            var minimum = float.PositiveInfinity;
            var maximum = float.NegativeInfinity;
            foreach (var renderer in renderers)
            {
                Mesh mesh;
                var destroyMesh = false;
                if (renderer is SkinnedMeshRenderer skinned)
                {
                    mesh = new Mesh();
                    skinned.BakeMesh(mesh);
                    destroyMesh = true;
                }
                else
                {
                    mesh = renderer.GetComponent<MeshFilter>()?.sharedMesh;
                }

                if (mesh == null)
                {
                    continue;
                }

                foreach (var vertex in mesh.vertices)
                {
                    var worldY = renderer.transform.TransformPoint(vertex).y;
                    minimum = Mathf.Min(minimum, worldY);
                    maximum = Mathf.Max(maximum, worldY);
                }

                if (destroyMesh)
                {
                    UnityEngine.Object.DestroyImmediate(mesh);
                }
            }

            return (minimum, maximum);
        }
    }
}
