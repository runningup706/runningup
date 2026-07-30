// 라이선스 자산과 사람의 동일 해상도 시각 평가가 없으면 정식 APK 빌드와 대량 생성을 차단한다.
#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.SceneManagement;

namespace RunningUp.Editor
{
    public static class V11ProductionArtGate
    {
        public const string ManifestPath =
            "Assets/RunningUp/ProductionArt/Manifest/production-art-manifest.json";

        [MenuItem("RunningUp V11/Production Art/Validate Vertical Slice")]
        public static void ValidateFromMenu()
        {
            ValidateOrThrow();
            Debug.Log("RUNNINGUP_V11_PRODUCTION_ART_GATE_PASS");
        }

        public static string GetProductionScenePath()
        {
            return LoadManifest().productionScene;
        }

        public static void ValidateOrThrow()
        {
            var manifest = LoadManifest();
            var violations = new List<string>();

            ValidateManifestStatus(manifest, violations);
            ValidatePackages(manifest, violations);
            ValidateRequiredAssets(manifest, violations);
            ValidateScene(manifest, violations);
            ValidateHumanQa(manifest, violations);

            if (violations.Count > 0)
            {
                throw new InvalidOperationException(
                    "BLOCKED_ART_ASSET\n- " + string.Join("\n- ", violations));
            }
        }

        private static ProductionArtManifest LoadManifest()
        {
            var asset = AssetDatabase.LoadAssetAtPath<TextAsset>(ManifestPath);
            if (asset == null)
            {
                throw new InvalidOperationException(
                    $"BLOCKED_ART_ASSET\n- manifest-missing:{ManifestPath}");
            }

            var manifest = JsonUtility.FromJson<ProductionArtManifest>(asset.text);
            if (manifest == null ||
                string.IsNullOrWhiteSpace(manifest.schemaVersion) ||
                string.IsNullOrWhiteSpace(manifest.productionScene))
            {
                throw new InvalidOperationException(
                    $"BLOCKED_ART_ASSET\n- manifest-invalid:{ManifestPath}");
            }

            return manifest;
        }

        private static void ValidateManifestStatus(
            ProductionArtManifest manifest,
            ICollection<string> violations)
        {
            if (!string.Equals(
                    manifest.status,
                    "HUMAN_QA_PASS",
                    StringComparison.Ordinal))
            {
                violations.Add($"manifest-status:{manifest.status}");
            }
        }

        private static void ValidatePackages(
            ProductionArtManifest manifest,
            ICollection<string> violations)
        {
            var registered = UnityEditor.PackageManager.PackageInfo
                .GetAllRegisteredPackages()
                .ToDictionary(item => item.name, item => item.version);
            foreach (var package in manifest.requiredPackages ?? Array.Empty<RequiredPackage>())
            {
                if (!registered.TryGetValue(package.name, out var version))
                {
                    violations.Add($"package-missing:{package.name}@{package.version}");
                    continue;
                }

                if (!string.Equals(version, package.version, StringComparison.Ordinal))
                {
                    violations.Add(
                        $"package-version:{package.name} expected={package.version} actual={version}");
                }
            }

            var pipeline = GraphicsSettings.defaultRenderPipeline ??
                QualitySettings.renderPipeline;
            if (pipeline == null ||
                !pipeline.GetType().Name.Contains(
                    "UniversalRenderPipelineAsset",
                    StringComparison.Ordinal))
            {
                violations.Add("urp-pipeline-not-assigned");
            }
        }

        private static void ValidateRequiredAssets(
            ProductionArtManifest manifest,
            ICollection<string> violations)
        {
            foreach (var item in manifest.requiredAssets ?? Array.Empty<RequiredAsset>())
            {
                if (string.IsNullOrWhiteSpace(item.path) ||
                    AssetDatabase.LoadMainAssetAtPath(item.path) == null)
                {
                    violations.Add($"asset-missing:{item.role}:{item.path}");
                }
            }
        }

        private static void ValidateScene(
            ProductionArtManifest manifest,
            ICollection<string> violations)
        {
            if (AssetDatabase.LoadAssetAtPath<SceneAsset>(manifest.productionScene) == null)
            {
                violations.Add($"production-scene-missing:{manifest.productionScene}");
                return;
            }

            var dependencies = AssetDatabase.GetDependencies(
                manifest.productionScene,
                true);
            foreach (var prohibitedRoot in manifest.prohibitedAssetRoots ??
                Array.Empty<string>())
            {
                foreach (var dependency in dependencies.Where(path =>
                    path.StartsWith(prohibitedRoot, StringComparison.OrdinalIgnoreCase)))
                {
                    violations.Add($"prohibited-dependency:{dependency}");
                }
            }

            var scene = EditorSceneManager.OpenScene(
                manifest.productionScene,
                OpenSceneMode.Single);
            var roots = scene.GetRootGameObjects();
            var transforms = roots
                .SelectMany(root => root.GetComponentsInChildren<Transform>(true))
                .ToArray();
            ValidateNames(manifest, transforms, violations);
            ValidateRenderers(transforms, violations);
            ValidateRunner(manifest, violations);
            ValidateSceneSystems(roots, violations);
        }

        private static void ValidateNames(
            ProductionArtManifest manifest,
            IEnumerable<Transform> transforms,
            ICollection<string> violations)
        {
            foreach (var transform in transforms)
            {
                foreach (var prohibited in manifest.prohibitedNameTokens ??
                    Array.Empty<string>())
                {
                    if (transform.name.Contains(
                            prohibited,
                            StringComparison.OrdinalIgnoreCase))
                    {
                        violations.Add(
                            $"prohibited-name:{GetHierarchyPath(transform)}");
                    }
                }
            }
        }

        private static void ValidateRenderers(
            IEnumerable<Transform> transforms,
            ICollection<string> violations)
        {
            foreach (var transform in transforms)
            {
                var meshFilter = transform.GetComponent<MeshFilter>();
                if (meshFilter != null)
                {
                    ValidateMesh(
                        meshFilter.sharedMesh,
                        GetHierarchyPath(transform),
                        violations);
                }

                var skinned = transform.GetComponent<SkinnedMeshRenderer>();
                if (skinned != null)
                {
                    ValidateMesh(
                        skinned.sharedMesh,
                        GetHierarchyPath(transform),
                        violations);
                }

                var renderer = transform.GetComponent<Renderer>();
                if (renderer == null)
                {
                    continue;
                }

                if (renderer.sharedMaterials.Length == 0 ||
                    renderer.sharedMaterials.Any(material => material == null))
                {
                    violations.Add(
                        $"material-missing:{GetHierarchyPath(transform)}");
                    continue;
                }

                foreach (var material in renderer.sharedMaterials)
                {
                    if (material.shader == null ||
                        string.Equals(
                            material.shader.name,
                            "Hidden/InternalErrorShader",
                            StringComparison.Ordinal) ||
                        string.Equals(
                            material.shader.name,
                            "Standard",
                            StringComparison.Ordinal))
                    {
                        violations.Add(
                            $"urp-material-invalid:{GetHierarchyPath(transform)}:{material.name}");
                    }
                }
            }
        }

        private static void ValidateMesh(
            Mesh mesh,
            string hierarchyPath,
            ICollection<string> violations)
        {
            if (mesh == null)
            {
                violations.Add($"mesh-missing:{hierarchyPath}");
                return;
            }

            var path = AssetDatabase.GetAssetPath(mesh);
            if (string.IsNullOrWhiteSpace(path) ||
                path.Contains("unity default resources", StringComparison.OrdinalIgnoreCase))
            {
                violations.Add($"unity-primitive:{hierarchyPath}:{mesh.name}");
            }
        }

        private static void ValidateRunner(
            ProductionArtManifest manifest,
            ICollection<string> violations)
        {
            var runnerPath = (manifest.requiredAssets ?? Array.Empty<RequiredAsset>())
                .FirstOrDefault(item =>
                    string.Equals(
                        item.role,
                        "my_runner_production_prefab",
                        StringComparison.Ordinal))?.path;
            var runner = string.IsNullOrWhiteSpace(runnerPath)
                ? null
                : AssetDatabase.LoadAssetAtPath<GameObject>(runnerPath);
            if (runner == null)
            {
                return;
            }

            var hierarchyNames = runner
                .GetComponentsInChildren<Transform>(true)
                .Select(item => item.name)
                .ToArray();
            foreach (var token in manifest.requiredHierarchyTokens ??
                Array.Empty<string>())
            {
                if (!hierarchyNames.Any(name =>
                    name.Contains(token, StringComparison.OrdinalIgnoreCase)))
                {
                    violations.Add($"runner-hierarchy-role-missing:{token}");
                }
            }

            var animator = runner.GetComponentInChildren<Animator>(true);
            if (animator == null ||
                animator.avatar == null ||
                !animator.avatar.isValid ||
                !animator.avatar.isHuman)
            {
                violations.Add("runner-humanoid-avatar-invalid");
            }

            var clips = animator?.runtimeAnimatorController?.animationClips ??
                Array.Empty<AnimationClip>();
            var uniqueClips = clips
                .Where(clip => clip != null)
                .GroupBy(clip => clip.name, StringComparer.OrdinalIgnoreCase)
                .Select(group => group.First())
                .ToArray();
            if (uniqueClips.Length < manifest.minimumRunningClipCount)
            {
                violations.Add(
                    $"runner-clips expected>={manifest.minimumRunningClipCount} actual={uniqueClips.Length}");
            }

            foreach (var state in manifest.requiredRunningStates ??
                Array.Empty<string>())
            {
                if (!uniqueClips.Any(clip =>
                    clip.name.Contains(state, StringComparison.OrdinalIgnoreCase)))
                {
                    violations.Add($"runner-state-missing:{state}");
                }
            }

            var expressionCount = runner
                .GetComponentsInChildren<SkinnedMeshRenderer>(true)
                .Where(item => item.sharedMesh != null)
                .Select(item => item.sharedMesh.blendShapeCount)
                .DefaultIfEmpty(0)
                .Max();
            if (expressionCount < manifest.minimumExpressionCount)
            {
                violations.Add(
                    $"runner-expressions expected>={manifest.minimumExpressionCount} actual={expressionCount}");
            }

            var lod = runner.GetComponentInChildren<LODGroup>(true);
            if (lod == null || lod.lodCount < 2)
            {
                violations.Add("runner-lod-missing-or-single-level");
            }
        }

        private static void ValidateSceneSystems(
            IEnumerable<GameObject> roots,
            ICollection<string> violations)
        {
            var components = roots
                .SelectMany(root => root.GetComponentsInChildren<Component>(true))
                .Where(item => item != null)
                .ToArray();
            if (!components.Any(item =>
                    item.GetType().Name.Contains(
                        "CinemachineCamera",
                        StringComparison.Ordinal)))
            {
                violations.Add("cinemachine-camera-missing");
            }

            if (!components.Any(item =>
                    item.GetType().Name.Contains(
                        "CinemachineBrain",
                        StringComparison.Ordinal)))
            {
                violations.Add("cinemachine-brain-missing");
            }

            if (!components.Any(item =>
                    string.Equals(
                        item.GetType().Name,
                        "RigBuilder",
                        StringComparison.Ordinal)))
            {
                violations.Add("animation-rigging-rigbuilder-missing");
            }

            if (!components.OfType<Camera>().Any())
            {
                violations.Add("production-camera-missing");
            }

            if (!components.OfType<Canvas>().Any())
            {
                violations.Add("production-ui-canvas-missing");
            }

            if (!components.OfType<Light>().Any(light =>
                    light.type == LightType.Directional &&
                    light.shadows != LightShadows.None))
            {
                violations.Add("shadow-casting-directional-light-missing");
            }

            if (!components.OfType<LODGroup>().Any(group => group.lodCount >= 2))
            {
                violations.Add("scene-lod-groups-missing");
            }
        }

        private static void ValidateHumanQa(
            ProductionArtManifest manifest,
            ICollection<string> violations)
        {
            var repository = Path.GetFullPath(
                Path.Combine(Application.dataPath, "../../.."));
            var scorecardPath = Path.Combine(repository, manifest.humanQaScorecard);
            if (!File.Exists(scorecardPath))
            {
                violations.Add($"human-qa-scorecard-missing:{manifest.humanQaScorecard}");
                return;
            }

            var scorecard = JsonUtility.FromJson<HumanQaScorecard>(
                File.ReadAllText(scorecardPath));
            if (scorecard == null ||
                !string.Equals(
                    scorecard.status,
                    "HUMAN_QA_PASS",
                    StringComparison.Ordinal) ||
                scorecard.aestheticAutoPass ||
                string.IsNullOrWhiteSpace(scorecard.evaluator))
            {
                violations.Add("human-qa-not-approved");
                return;
            }

            var scores = scorecard.categories == null
                ? Array.Empty<int>()
                : scorecard.categories.GetScores();
            if (scores.Length != 7 ||
                scores.Any(score => score < manifest.minimumCategoryScore))
            {
                violations.Add(
                    $"human-qa-category-score-below-{manifest.minimumCategoryScore}");
            }

            var average = scores.Length == 0 ? 0 : scores.Average();
            if (average < manifest.minimumAverageScore)
            {
                violations.Add(
                    $"human-qa-average expected>={manifest.minimumAverageScore} " +
                    $"actual={average.ToString("0.00", CultureInfo.InvariantCulture)}");
            }

            if (!scorecard.primitivePlaceholderVerified ||
                scorecard.primitivePlaceholderCount != 0)
            {
                violations.Add("human-qa-primitive-placeholder-not-zero");
            }

            ValidatePngDimensions(
                repository,
                manifest.productionCapture,
                manifest.targetWidth,
                manifest.targetHeight,
                violations);
            ValidatePngDimensions(
                repository,
                manifest.targetCapture,
                manifest.targetWidth,
                manifest.targetHeight,
                violations);
            ValidatePngDimensions(
                repository,
                manifest.comparisonCapture,
                manifest.targetWidth * 2,
                manifest.targetHeight,
                violations);
        }

        private static void ValidatePngDimensions(
            string repository,
            string relativePath,
            int expectedWidth,
            int expectedHeight,
            ICollection<string> violations)
        {
            var filePath = Path.Combine(repository, relativePath);
            if (!File.Exists(filePath))
            {
                violations.Add($"qa-capture-missing:{relativePath}");
                return;
            }

            var image = new Texture2D(2, 2, TextureFormat.RGBA32, false);
            try
            {
                if (!ImageConversion.LoadImage(image, File.ReadAllBytes(filePath), false) ||
                    image.width != expectedWidth ||
                    image.height != expectedHeight)
                {
                    violations.Add(
                        $"qa-capture-dimensions:{relativePath} " +
                        $"expected={expectedWidth}x{expectedHeight} " +
                        $"actual={image.width}x{image.height}");
                }
            }
            finally
            {
                UnityEngine.Object.DestroyImmediate(image);
            }
        }

        private static string GetHierarchyPath(Transform transform)
        {
            var names = new Stack<string>();
            while (transform != null)
            {
                names.Push(transform.name);
                transform = transform.parent;
            }

            return string.Join("/", names);
        }

        [Serializable]
        private sealed class ProductionArtManifest
        {
            public string schemaVersion;
            public string status;
            public string productionScene;
            public int targetWidth;
            public int targetHeight;
            public int minimumCategoryScore;
            public int minimumAverageScore;
            public int minimumExpressionCount;
            public int minimumRunningClipCount;
            public RequiredPackage[] requiredPackages;
            public RequiredAsset[] requiredAssets;
            public string[] requiredHierarchyTokens;
            public string[] requiredRunningStates;
            public string[] prohibitedAssetRoots;
            public string[] prohibitedNameTokens;
            public string humanQaScorecard;
            public string targetCapture;
            public string productionCapture;
            public string comparisonCapture;
        }

        [Serializable]
        private sealed class RequiredPackage
        {
            public string name;
            public string version;
        }

        [Serializable]
        private sealed class RequiredAsset
        {
            public string role;
            public string path;
        }

        [Serializable]
        private sealed class HumanQaScorecard
        {
            public string status;
            public string evaluator;
            public bool aestheticAutoPass;
            public int primitivePlaceholderCount;
            public bool primitivePlaceholderVerified;
            public QaCategories categories;
        }

        [Serializable]
        private sealed class QaCategories
        {
            public int characterForm;
            public int screenOccupancy;
            public int materials;
            public int lighting;
            public int animation;
            public int environmentDensity;
            public int uiFinish;

            public int[] GetScores()
            {
                return new[]
                {
                    characterForm,
                    screenOccupancy,
                    materials,
                    lighting,
                    animation,
                    environmentDensity,
                    uiFinish,
                };
            }
        }
    }
}
#endif
