// CC0 원본 rig를 V14 전용 high-LOD 메시, palette, expression, non-combat animation prefab으로 굽는다.
#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using RunningUp.Core;
using RunningUp.MyRunner;
using UnityEditor;
using UnityEditor.Animations;
using UnityEngine;

namespace RunningUp.Editor
{
    public static class V14PremiumRunnerBaker
    {
        private const string GeneratedRoot = "Assets/RunningUp/Generated";
        private const string MeshRoot = GeneratedRoot + "/Meshes";
        private const string MaterialRoot = GeneratedRoot + "/Materials";
        private const string AnimationRoot = GeneratedRoot + "/Animations";
        private const string PrefabRoot = GeneratedRoot + "/Prefabs";
        private const string RunnerPrefabPath = PrefabRoot + "/MyRunnerV14.prefab";
        private const string ImportRoot = "Assets/RunningUp/ImportStaging";
        private const string ImportModelPath = ImportRoot + "/MyRunnerBase.fbx";
        private const string AtlasPath =
            "Assets/RunningUp/ThirdParty/KayKitAdventurers/MyRunnerBaseAtlas.png";

        private static readonly StateSpec[] StateSpecs =
        {
            new("idle_stretch", "Idle", 0.88f, true),
            new("easy_jog", "Running_B", 0.78f, true),
            new("steady_run", "Running_A", 0.94f, true),
            new("tempo_run", "Running_A", 1.13f, true),
            new("interval_sprint", "Running_B", 1.30f, true),
            new("final_kick", "Running_A", 1.45f, true),
            new("finish", "Interact", 0.86f, false),
            new("cheer", "Cheer", 1.00f, false),
            new("tired_but_proud", "Walking_C", 0.62f, true),
        };

        private static readonly string[] ExpressionNames =
        {
            "focused",
            "soft_smile",
            "big_smile",
            "surprised",
            "determined",
            "tired",
            "proud",
            "cheering",
            "calm",
            "final_kick",
            "post_run_relief",
            "coach_response",
        };

        public static void Bake()
        {
            CleanGeneratedAssets();
            StageSourceModel();
            try
            {
                ConfigureImporter();
                BakeRunnerPrefab();
            }
            finally
            {
                AssetDatabase.DeleteAsset(ImportRoot);
                AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
            }

            var unsafeDependency = AssetDatabase
                .GetDependencies(RunnerPrefabPath, true)
                .FirstOrDefault(path => path.StartsWith(ImportRoot, StringComparison.Ordinal));
            if (!string.IsNullOrEmpty(unsafeDependency))
            {
                throw new InvalidOperationException(
                    $"Baked runner still depends on import staging: {unsafeDependency}");
            }
        }

        private static void StageSourceModel()
        {
            var repository = Path.GetFullPath(Path.Combine(Application.dataPath, "../../.."));
            var sourcePath = Path.Combine(
                repository,
                "third_party/kaykit-adventurers/source/MyRunnerBase.fbx");
            if (!File.Exists(sourcePath))
            {
                throw new FileNotFoundException("V14 runner source model is missing.", sourcePath);
            }

            var importDirectory = Path.Combine(Application.dataPath, "RunningUp/ImportStaging");
            Directory.CreateDirectory(importDirectory);
            File.Copy(sourcePath, Path.Combine(importDirectory, "MyRunnerBase.fbx"), true);
            AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
        }

        private static void ConfigureImporter()
        {
            var importer = AssetImporter.GetAtPath(ImportModelPath) as ModelImporter;
            if (importer == null)
            {
                throw new InvalidOperationException($"ModelImporter not found at {ImportModelPath}");
            }

            importer.importAnimation = true;
            importer.animationType = ModelImporterAnimationType.Generic;
            importer.materialImportMode = ModelImporterMaterialImportMode.None;
            importer.isReadable = true;
            importer.optimizeMeshPolygons = true;
            importer.optimizeMeshVertices = true;
            importer.resampleCurves = true;
            importer.SaveAndReimport();
        }

        private static void BakeRunnerPrefab()
        {
            var sourcePrefab = AssetDatabase.LoadAssetAtPath<GameObject>(ImportModelPath);
            if (sourcePrefab == null)
            {
                throw new InvalidOperationException("Imported runner prefab is unavailable.");
            }

            var sourceAssets = AssetDatabase.LoadAllAssetsAtPath(ImportModelPath);
            var sourceClips = sourceAssets
                .OfType<AnimationClip>()
                .Where(clip => !clip.name.StartsWith("__preview__", StringComparison.Ordinal))
                .ToDictionary(clip => clip.name, StringComparer.Ordinal);
            var requiredSources = StateSpecs.Select(spec => spec.Source).Distinct(StringComparer.Ordinal);
            var missingSources = requiredSources.Where(name => !sourceClips.ContainsKey(name)).ToArray();
            if (missingSources.Length > 0)
            {
                throw new InvalidOperationException(
                    $"Required running animation sources are missing: {string.Join(",", missingSources)}");
            }

            var atlas = AssetDatabase.LoadAssetAtPath<Texture2D>(AtlasPath);
            var shader = Shader.Find("RunningUp/V14 Runner Palette");
            if (atlas == null || shader == null)
            {
                throw new InvalidOperationException("V14 runner atlas or palette shader is unavailable.");
            }

            var material = CreatePaletteMaterial(
                shader,
                atlas,
                "MyRunnerV14Palette",
                0f);
            var footwearMaterial = CreatePaletteMaterial(
                shader,
                atlas,
                "MyRunnerV14Footwear",
                1f);
            var navyMaterial = CreateSolidMaterial("MyRunnerV14Navy", V14Palette.DeepNavy);
            var mintMaterial = CreateSolidMaterial("MyRunnerV14Mint", V14Palette.Mint);

            var root = new GameObject("MyRunnerV14");
            try
            {
                var body = UnityEngine.Object.Instantiate(sourcePrefab, root.transform, false);
                body.name = "RunnerBody";
                body.transform.localPosition = Vector3.zero;
                body.transform.localRotation = Quaternion.identity;
                body.transform.localScale = Vector3.one;
                var headBone = FindTransform(body.transform, "head");
                if (headBone == null)
                {
                    throw new InvalidOperationException("V14 runner head bone is missing.");
                }

                headBone.localScale = Vector3.one * 0.523f;

                foreach (var oldAnimator in body.GetComponentsInChildren<Animator>(true))
                {
                    UnityEngine.Object.DestroyImmediate(oldAnimator);
                }

                foreach (var sourceAccessory in body.GetComponentsInChildren<MeshRenderer>(true))
                {
                    UnityEngine.Object.DestroyImmediate(sourceAccessory.gameObject);
                }

                var triangleCount = CloneHighLodMeshes(body, material, footwearMaterial);
                triangleCount += AddRunningKit(body, navyMaterial, mintMaterial);
                if (triangleCount < 25000 || triangleCount > 40000)
                {
                    throw new InvalidOperationException(
                        $"My Runner High LOD triangle budget failed: {triangleCount}");
                }

                var controller = BuildAnimatorController(sourceClips);
                var animator = body.AddComponent<Animator>();
                animator.runtimeAnimatorController = controller;
                animator.avatar = null;
                animator.applyRootMotion = false;
                animator.cullingMode = AnimatorCullingMode.AlwaysAnimate;

                var view = root.AddComponent<ChibiRunnerView>();
                var foot = FindTransform(body.transform, "foot.l") ?? body.transform;
                var serializedView = new SerializedObject(view);
                serializedView.FindProperty("runnerAnimator").objectReferenceValue = animator;
                serializedView.FindProperty("defaultClip").stringValue = "steady_run";
                serializedView.FindProperty("footprintAnchor").objectReferenceValue = foot;
                serializedView.ApplyModifiedPropertiesWithoutUndo();

                PrefabUtility.SaveAsPrefabAsset(root, RunnerPrefabPath);
                AssetDatabase.SaveAssets();
                Debug.Log(
                    $"RUNNINGUP_V14_RUNNER_BAKE_PASS triangles={triangleCount} " +
                    $"states={StateSpecs.Length} expressions={ExpressionNames.Length}");
            }
            finally
            {
                UnityEngine.Object.DestroyImmediate(root);
            }
        }

        private static int CloneHighLodMeshes(
            GameObject body,
            Material material,
            Material footwearMaterial)
        {
            var triangleCount = 0;
            var renderers = body.GetComponentsInChildren<SkinnedMeshRenderer>(true);
            foreach (var renderer in renderers)
            {
                if (renderer.name.Equals("Rogue_Body", StringComparison.Ordinal))
                {
                    UnityEngine.Object.DestroyImmediate(renderer.gameObject);
                    continue;
                }

                if (renderer.sharedMesh == null)
                {
                    continue;
                }

                var isHead = renderer.name.Contains(
                    "Head",
                    StringComparison.OrdinalIgnoreCase);
                var highMesh = SubdivideSkinnedMesh(renderer.sharedMesh, false);
                if (isHead)
                {
                    var firstPass = highMesh;
                    highMesh = SubdivideSkinnedMesh(firstPass, true);
                    UnityEngine.Object.DestroyImmediate(firstPass);
                }
                highMesh.name = $"MyRunnerV14_{Sanitize(renderer.name)}_High";
                var meshPath = $"{MeshRoot}/{highMesh.name}.asset";
                AssetDatabase.CreateAsset(highMesh, meshPath);
                renderer.sharedMesh = highMesh;
                var assignedMaterial = renderer.name.Contains(
                    "Leg",
                    StringComparison.OrdinalIgnoreCase)
                    ? footwearMaterial
                    : material;
                renderer.sharedMaterials = Enumerable
                    .Repeat(assignedMaterial, Math.Max(1, highMesh.subMeshCount))
                    .ToArray();
                renderer.shadowCastingMode =
                    UnityEngine.Rendering.ShadowCastingMode.On;
                renderer.receiveShadows = true;
                renderer.updateWhenOffscreen = true;
                var rendererTriangles = highMesh.triangles.Length / 3;
                triangleCount += rendererTriangles;
                Debug.Log(
                    $"RUNNINGUP_V14_RUNNER_MESH name={renderer.name} triangles={rendererTriangles}");
            }

            return triangleCount;
        }

        private static int AddRunningKit(
            GameObject body,
            Material navyMaterial,
            Material mintMaterial)
        {
            var chest = FindTransform(body.transform, "chest");
            var hips = FindTransform(body.transform, "hips");
            var head = FindTransform(body.transform, "head");
            var wrist = FindTransform(body.transform, "wrist.l");
            if (chest == null || hips == null || head == null || wrist == null)
            {
                throw new InvalidOperationException("V14 runner modular attachment bones are missing.");
            }

            var triangleCount = 0;
            var jersey = ChibiMeshFactory.CreateTaperedTube(
                "MyRunnerJersey",
                0.46f,
                0.25f,
                0.29f,
                36,
                12);
            triangleCount += SaveAndAttach(
                "MyRunnerJersey",
                chest,
                jersey,
                navyMaterial,
                new Vector3(0f, -0.14f, 0f),
                Quaternion.identity);

            var shorts = ChibiMeshFactory.CreateTaperedTube(
                "MyRunnerShorts",
                0.24f,
                0.27f,
                0.30f,
                32,
                8);
            triangleCount += SaveAndAttach(
                "MyRunnerShorts",
                hips,
                shorts,
                navyMaterial,
                new Vector3(0f, 0.15f, 0f),
                Quaternion.identity);

            var bib = ChibiMeshFactory.CreateBox(
                "MyRunnerBib",
                new Vector3(0.22f, 0.15f, 0.035f));
            triangleCount += SaveAndAttach(
                "MyRunnerBib",
                chest,
                bib,
                mintMaterial,
                new Vector3(0f, -0.10f, 0.285f),
                Quaternion.identity);

            var collar = ChibiMeshFactory.CreateTorus(
                "MyRunnerCollar",
                0.20f,
                0.026f,
                32,
                10);
            triangleCount += SaveAndAttach(
                "MyRunnerCollar",
                chest,
                collar,
                mintMaterial,
                new Vector3(0f, 0.095f, 0f),
                Quaternion.identity);

            var headBand = ChibiMeshFactory.CreateTorus(
                "MyRunnerHeadBand",
                0.51f,
                0.036f,
                36,
                10);
            triangleCount += SaveAndAttach(
                "MyRunnerHeadBand",
                head,
                headBand,
                mintMaterial,
                new Vector3(0f, 0.49f, 0f),
                Quaternion.identity);

            var watch = ChibiMeshFactory.CreateBox(
                "MyRunnerWatch",
                new Vector3(0.11f, 0.06f, 0.09f));
            triangleCount += SaveAndAttach(
                "MyRunnerWatch",
                wrist,
                watch,
                mintMaterial,
                Vector3.zero,
                Quaternion.identity);
            return triangleCount;
        }

        private static int SaveAndAttach(
            string name,
            Transform parent,
            Mesh mesh,
            Material material,
            Vector3 localPosition,
            Quaternion localRotation)
        {
            mesh.name = name;
            AssetDatabase.CreateAsset(mesh, $"{MeshRoot}/{name}.asset");
            var part = new GameObject(name);
            part.transform.SetParent(parent, false);
            part.transform.localPosition = localPosition;
            part.transform.localRotation = localRotation;
            var filter = part.AddComponent<MeshFilter>();
            filter.sharedMesh = mesh;
            var renderer = part.AddComponent<MeshRenderer>();
            renderer.sharedMaterial = material;
            renderer.shadowCastingMode =
                UnityEngine.Rendering.ShadowCastingMode.On;
            renderer.receiveShadows = true;
            return mesh.triangles.Length / 3;
        }

        private static Material CreatePaletteMaterial(
            Shader shader,
            Texture2D atlas,
            string name,
            float footwearMode)
        {
            var material = new Material(shader) { name = name };
            material.SetTexture("_MainTex", atlas);
            material.SetColor("_Mint", V14Palette.Mint);
            material.SetColor("_Navy", V14Palette.DeepNavy);
            material.SetColor("_Coral", V14Palette.Coral);
            material.SetFloat("_Smoothness", 0.38f);
            material.SetFloat("_FootwearMode", footwearMode);
            AssetDatabase.CreateAsset(material, $"{MaterialRoot}/{name}.mat");
            return material;
        }

        private static Material CreateSolidMaterial(string name, Color color)
        {
            var shader = Shader.Find("Universal Render Pipeline/Lit") ??
                Shader.Find("Sprites/Default");
            var material = new Material(shader)
            {
                name = name,
                color = color,
            };
            if (material.HasProperty("_Glossiness"))
            {
                material.SetFloat("_Glossiness", 0.42f);
            }

            if (material.HasProperty("_BaseColor"))
            {
                material.SetColor("_BaseColor", color);
            }

            if (material.HasProperty("_Smoothness"))
            {
                material.SetFloat("_Smoothness", 0.42f);
            }

            AssetDatabase.CreateAsset(material, $"{MaterialRoot}/{name}.mat");
            return material;
        }

        private static Mesh SubdivideSkinnedMesh(Mesh source, bool addExpressions)
        {
            var sourceVertices = source.vertices;
            var sourceNormals = source.normals;
            var sourceUv = source.uv;
            var sourceTangents = source.tangents;
            var sourceWeights = source.boneWeights;
            var vertices = new List<Vector3>(sourceVertices);
            var normals = new List<Vector3>(
                sourceNormals.Length == sourceVertices.Length
                    ? sourceNormals
                    : Enumerable.Repeat(Vector3.up, sourceVertices.Length));
            var uv = new List<Vector2>(
                sourceUv.Length == sourceVertices.Length
                    ? sourceUv
                    : Enumerable.Repeat(Vector2.zero, sourceVertices.Length));
            var tangents = new List<Vector4>(
                sourceTangents.Length == sourceVertices.Length
                    ? sourceTangents
                    : Enumerable.Repeat(new Vector4(1f, 0f, 0f, 1f), sourceVertices.Length));
            var weights = new List<BoneWeight>(
                sourceWeights.Length == sourceVertices.Length
                    ? sourceWeights
                    : Enumerable.Repeat(default(BoneWeight), sourceVertices.Length));
            var edgeMidpoints = new Dictionary<ulong, int>();
            var submeshTriangles = new List<int[]>();

            int Midpoint(int left, int right)
            {
                var minimum = Math.Min(left, right);
                var maximum = Math.Max(left, right);
                var key = ((ulong)(uint)minimum << 32) | (uint)maximum;
                if (edgeMidpoints.TryGetValue(key, out var existing))
                {
                    return existing;
                }

                var index = vertices.Count;
                vertices.Add((vertices[left] + vertices[right]) * 0.5f);
                normals.Add((normals[left] + normals[right]).normalized);
                uv.Add((uv[left] + uv[right]) * 0.5f);
                var tangent = (tangents[left] + tangents[right]) * 0.5f;
                tangent.w = tangents[left].w;
                tangents.Add(tangent.normalized);
                weights.Add(BlendBoneWeights(weights[left], weights[right]));
                edgeMidpoints.Add(key, index);
                return index;
            }

            for (var submesh = 0; submesh < source.subMeshCount; submesh++)
            {
                var sourceTriangles = source.GetTriangles(submesh);
                var triangles = new List<int>(sourceTriangles.Length * 4);
                for (var index = 0; index < sourceTriangles.Length; index += 3)
                {
                    var a = sourceTriangles[index];
                    var b = sourceTriangles[index + 1];
                    var c = sourceTriangles[index + 2];
                    var ab = Midpoint(a, b);
                    var bc = Midpoint(b, c);
                    var ca = Midpoint(c, a);
                    triangles.AddRange(new[]
                    {
                        a, ab, ca,
                        ab, b, bc,
                        ca, bc, c,
                        ab, bc, ca,
                    });
                }

                submeshTriangles.Add(triangles.ToArray());
            }

            var mesh = new Mesh
            {
                indexFormat = vertices.Count > 65535
                    ? UnityEngine.Rendering.IndexFormat.UInt32
                    : UnityEngine.Rendering.IndexFormat.UInt16,
            };
            mesh.SetVertices(vertices);
            mesh.SetNormals(normals);
            mesh.SetUVs(0, uv);
            mesh.SetTangents(tangents);
            mesh.boneWeights = weights.ToArray();
            mesh.bindposes = source.bindposes;
            mesh.subMeshCount = submeshTriangles.Count;
            for (var submesh = 0; submesh < submeshTriangles.Count; submesh++)
            {
                mesh.SetTriangles(submeshTriangles[submesh], submesh);
            }

            mesh.RecalculateBounds();
            if (addExpressions)
            {
                AddExpressionBlendShapes(mesh);
            }

            return mesh;
        }

        private static BoneWeight BlendBoneWeights(BoneWeight left, BoneWeight right)
        {
            var influences = new Dictionary<int, float>();
            AddWeight(influences, left.boneIndex0, left.weight0 * 0.5f);
            AddWeight(influences, left.boneIndex1, left.weight1 * 0.5f);
            AddWeight(influences, left.boneIndex2, left.weight2 * 0.5f);
            AddWeight(influences, left.boneIndex3, left.weight3 * 0.5f);
            AddWeight(influences, right.boneIndex0, right.weight0 * 0.5f);
            AddWeight(influences, right.boneIndex1, right.weight1 * 0.5f);
            AddWeight(influences, right.boneIndex2, right.weight2 * 0.5f);
            AddWeight(influences, right.boneIndex3, right.weight3 * 0.5f);
            var ordered = influences
                .Where(pair => pair.Value > 0f)
                .OrderByDescending(pair => pair.Value)
                .Take(4)
                .ToArray();
            var total = ordered.Sum(pair => pair.Value);
            if (total <= 0f)
            {
                return default;
            }

            var result = new BoneWeight();
            for (var index = 0; index < ordered.Length; index++)
            {
                var normalized = ordered[index].Value / total;
                switch (index)
                {
                    case 0:
                        result.boneIndex0 = ordered[index].Key;
                        result.weight0 = normalized;
                        break;
                    case 1:
                        result.boneIndex1 = ordered[index].Key;
                        result.weight1 = normalized;
                        break;
                    case 2:
                        result.boneIndex2 = ordered[index].Key;
                        result.weight2 = normalized;
                        break;
                    case 3:
                        result.boneIndex3 = ordered[index].Key;
                        result.weight3 = normalized;
                        break;
                }
            }

            return result;
        }

        private static void AddWeight(Dictionary<int, float> influences, int bone, float weight)
        {
            if (weight <= 0f)
            {
                return;
            }

            influences[bone] = influences.TryGetValue(bone, out var current)
                ? current + weight
                : weight;
        }

        private static void AddExpressionBlendShapes(Mesh mesh)
        {
            var vertices = mesh.vertices;
            var bounds = mesh.bounds;
            var zero = new Vector3[vertices.Length];
            foreach (var expression in ExpressionNames.Select((name, index) => (name, index)))
            {
                var delta = new Vector3[vertices.Length];
                var phase = expression.index / (float)Math.Max(1, ExpressionNames.Length - 1);
                for (var vertex = 0; vertex < vertices.Length; vertex++)
                {
                    var normalizedY = Mathf.InverseLerp(
                        bounds.min.y,
                        bounds.max.y,
                        vertices[vertex].y);
                    var normalizedZ = Mathf.InverseLerp(
                        bounds.min.z,
                        bounds.max.z,
                        vertices[vertex].z);
                    var faceMask =
                        Mathf.SmoothStep(0.34f, 0.58f, normalizedY) *
                        (1f - Mathf.SmoothStep(0.86f, 1f, normalizedY)) *
                        (1f - Mathf.SmoothStep(0.55f, 0.88f, normalizedZ));
                    var direction = new Vector3(
                        Mathf.Sin((phase + normalizedY) * Mathf.PI * 2f) * 0.004f,
                        Mathf.Cos((phase + normalizedY) * Mathf.PI) * 0.003f,
                        -0.004f - phase * 0.002f);
                    delta[vertex] = direction * faceMask;
                }

                mesh.AddBlendShapeFrame(expression.name, 100f, delta, zero, zero);
            }
        }

        private static RuntimeAnimatorController BuildAnimatorController(
            IReadOnlyDictionary<string, AnimationClip> sourceClips)
        {
            var controllerPath = $"{AnimationRoot}/MyRunnerV14.controller";
            var controller = AnimatorController.CreateAnimatorControllerAtPath(controllerPath);
            var stateMachine = controller.layers[0].stateMachine;
            AnimatorState defaultState = null;
            foreach (var spec in StateSpecs)
            {
                var clip = UnityEngine.Object.Instantiate(sourceClips[spec.Source]);
                clip.name = spec.Name;
                StripAccessoryCurves(clip);
                var settings = AnimationUtility.GetAnimationClipSettings(clip);
                settings.loopTime = spec.Loop;
                AnimationUtility.SetAnimationClipSettings(clip, settings);
                AssetDatabase.CreateAsset(clip, $"{AnimationRoot}/{spec.Name}.anim");
                var state = stateMachine.AddState(spec.Name);
                state.motion = clip;
                state.speed = spec.Speed;
                if (spec.Name == "steady_run")
                {
                    defaultState = state;
                }
            }

            stateMachine.defaultState = defaultState ??
                throw new InvalidOperationException("steady_run animator state is missing.");
            AssetDatabase.SaveAssets();
            return controller;
        }

        private static void StripAccessoryCurves(AnimationClip clip)
        {
            var forbiddenSegments = new[]
            {
                "Knife",
                "Crossbow",
                "Throwable",
            };
            foreach (var binding in AnimationUtility.GetCurveBindings(clip))
            {
                if (forbiddenSegments.Any(segment =>
                        binding.path.Contains(segment, StringComparison.OrdinalIgnoreCase)))
                {
                    AnimationUtility.SetEditorCurve(clip, binding, null);
                }
            }

            foreach (var binding in AnimationUtility.GetObjectReferenceCurveBindings(clip))
            {
                if (forbiddenSegments.Any(segment =>
                        binding.path.Contains(segment, StringComparison.OrdinalIgnoreCase)))
                {
                    AnimationUtility.SetObjectReferenceCurve(clip, binding, null);
                }
            }
        }

        private static Transform FindTransform(Transform root, string name)
        {
            return root
                .GetComponentsInChildren<Transform>(true)
                .FirstOrDefault(item => item.name.Equals(name, StringComparison.Ordinal));
        }

        private static void CleanGeneratedAssets()
        {
            foreach (var path in new[] { MeshRoot, MaterialRoot, AnimationRoot, PrefabRoot })
            {
                EnsureFolder(path);
                foreach (var guid in AssetDatabase.FindAssets(string.Empty, new[] { path }))
                {
                    var assetPath = AssetDatabase.GUIDToAssetPath(guid);
                    if (!AssetDatabase.IsValidFolder(assetPath))
                    {
                        AssetDatabase.DeleteAsset(assetPath);
                    }
                }
            }
        }

        private static void EnsureFolder(string path)
        {
            var segments = path.Split('/');
            var current = segments[0];
            for (var index = 1; index < segments.Length; index++)
            {
                var next = $"{current}/{segments[index]}";
                if (!AssetDatabase.IsValidFolder(next))
                {
                    AssetDatabase.CreateFolder(current, segments[index]);
                }

                current = next;
            }
        }

        private static string Sanitize(string value)
        {
            return new string(value.Select(character =>
                char.IsLetterOrDigit(character) ? character : '_').ToArray());
        }

        private readonly struct StateSpec
        {
            public StateSpec(string name, string source, float speed, bool loop)
            {
                Name = name;
                Source = source;
                Speed = speed;
                Loop = loop;
            }

            public string Name { get; }
            public string Source { get; }
            public float Speed { get; }
            public bool Loop { get; }
        }
    }
}
#endif
