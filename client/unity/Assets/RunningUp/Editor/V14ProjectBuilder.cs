// 정식 아트가 아닌 기능 검증 전용 My Runner, 세로 홈 scene, animation과 UI를 생성한다.
#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using RunningUp.Core;
using RunningUp.LiveJourney;
using RunningUp.MyRunner;
using RunningUp.ProductionArt;
using RunningUp.RunVerification;
using RunningUp.UI;
using RunningUp.V14;
using RunningUp.V14.Backend;
using RunningUp.V14.UI;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

namespace RunningUp.Editor
{
    public static class V14ProjectBuilder
    {
        private const string GeneratedRoot = "Assets/RunningUp/Generated";
        private const string MeshRoot = GeneratedRoot + "/Meshes";
        private const string MaterialRoot = GeneratedRoot + "/Materials";
        private const string AnimationRoot = GeneratedRoot + "/Animations";
        private const string PrefabRoot = GeneratedRoot + "/Prefabs";
        private const string SceneRoot = "Assets/RunningUp/Scenes";
        private const string ScenePath = SceneRoot + "/LiveJourneyHome.unity";
        private const string RunnerPrefabPath = PrefabRoot + "/MyRunnerV14.prefab";

        [MenuItem("RunningUp V14/Prototype/Build Functional Prototype Only")]
        public static void BuildAll()
        {
            ConfigureProject();
            EnsureFolders();
            V14PremiumRunnerBaker.Bake();
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            BuildLiveJourneyScene();
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            UnityEngine.Debug.Log(
                "RUNNINGUP_V14_FUNCTIONAL_PROTOTYPE_ONLY_BUILD_PASS");
        }

        [MenuItem("RunningUp V14/Capture Portrait Evidence")]
        public static void CapturePortraitEvidence()
        {
            BuildAll();
            var scene = EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Single);
            var camera = UnityEngine.Object.FindFirstObjectByType<Camera>();
            if (camera == null)
            {
                throw new InvalidOperationException("V14 capture camera is missing.");
            }

            var repository = Path.GetFullPath(Path.Combine(Application.dataPath, "../../.."));
            var outputDirectory = Path.Combine(repository, "artifacts/visual");
            Directory.CreateDirectory(outputDirectory);

            var runner = UnityEngine.Object.FindFirstObjectByType<ChibiRunnerView>();
            var previewClip = AssetDatabase.LoadAssetAtPath<AnimationClip>(
                $"{AnimationRoot}/steady_run.anim");
            if (runner?.RunnerAnimator != null && previewClip != null)
            {
                AnimationMode.StartAnimationMode();
                try
                {
                    AnimationMode.SampleAnimationClip(
                        runner.RunnerAnimator.gameObject,
                        previewClip,
                        previewClip.length * 0.18f);
                    Capture(camera, Path.Combine(outputDirectory, "live-home-360x800.png"), 360, 800);
                    Capture(camera, Path.Combine(outputDirectory, "live-home-412x915.png"), 412, 915);
                    Capture(camera, Path.Combine(outputDirectory, "live-home-1080x1920.png"), 1080, 1920);
                }
                finally
                {
                    AnimationMode.StopAnimationMode();
                }
            }
            else
            {
                Capture(camera, Path.Combine(outputDirectory, "live-home-360x800.png"), 360, 800);
                Capture(camera, Path.Combine(outputDirectory, "live-home-412x915.png"), 412, 915);
                Capture(camera, Path.Combine(outputDirectory, "live-home-1080x1920.png"), 1080, 1920);
            }

            var meshFilters = runner == null
                ? Array.Empty<MeshFilter>()
                : runner.GetComponentsInChildren<MeshFilter>(true);
            var skinnedRenderers = runner == null
                ? Array.Empty<SkinnedMeshRenderer>()
                : runner.GetComponentsInChildren<SkinnedMeshRenderer>(true);
            var triangleCount =
                meshFilters.Sum(filter =>
                    filter.sharedMesh == null ? 0 : filter.sharedMesh.triangles.Length / 3) +
                skinnedRenderers.Sum(renderer =>
                    renderer.sharedMesh == null ? 0 : renderer.sharedMesh.triangles.Length / 3);
            var renderers = runner == null
                ? Array.Empty<Renderer>()
                : runner.GetComponentsInChildren<Renderer>(true);
            var materialCount = renderers
                .SelectMany(renderer => renderer.sharedMaterials)
                .Where(material => material != null)
                .Distinct()
                .Count();
            var headRenderer = skinnedRenderers.FirstOrDefault(renderer =>
                renderer.name.Contains("Head", StringComparison.OrdinalIgnoreCase));
            var runnerY = CalculateYRange(renderers);
            var headY = headRenderer == null
                ? (minimum: 0f, maximum: 0f)
                : CalculateYRange(new Renderer[] { headRenderer });
            var headHeight = headY.maximum - headY.minimum;
            var headRatio = headHeight <= 0.001f
                ? 0f
                : (runnerY.maximum - runnerY.minimum) / headHeight;
            var headBlendShapes = headRenderer?.sharedMesh?.blendShapeCount ?? 0;
            var rigRoot = runner?.RunnerAnimator == null
                ? null
                : runner.RunnerAnimator
                    .GetComponentsInChildren<Transform>(true)
                    .FirstOrDefault(item => item.name == "Rig");
            var boneCount = rigRoot == null
                ? 0
                : rigRoot.GetComponentsInChildren<Transform>(true).Length;
            var animationClipCount = AssetDatabase.FindAssets(
                    "t:AnimationClip",
                    new[] { AnimationRoot })
                .Length;
            var ratioText = headRatio.ToString("0.00", CultureInfo.InvariantCulture);
            var metrics =
                "{\n" +
                "  \"schema_version\": \"1.0.0\",\n" +
                "  \"product_version\": \"11.0.0\",\n" +
                "  \"scene\": \"LiveJourneyHome\",\n" +
                $"  \"runner_height_heads\": {ratioText},\n" +
                $"  \"runner_triangle_count\": {triangleCount},\n" +
                $"  \"runner_distinct_materials\": {materialCount},\n" +
                $"  \"runner_bone_count\": {boneCount},\n" +
                $"  \"runner_expression_count\": {headBlendShapes},\n" +
                $"  \"animation_clip_count\": {animationClipCount},\n" +
                "  \"captures\": [\"360x800\", \"412x915\", \"1080x1920\"]\n" +
                "}\n";
            File.WriteAllText(Path.Combine(outputDirectory, "live-home-metrics.json"), metrics);
            EditorSceneManager.MarkSceneDirty(scene);
            EditorSceneManager.SaveScene(scene);
            UnityEngine.Debug.Log(
                $"RUNNINGUP_V14_CAPTURE_PASS heads={ratioText} triangles={triangleCount} " +
                $"materials={materialCount} bones={boneCount} expressions={headBlendShapes}");
        }

        private static void ConfigureProject()
        {
            V14UrpConfigurator.Configure();
            PlayerSettings.companyName = "ROBOM";
            PlayerSettings.productName = "RunningUp";
            PlayerSettings.SetApplicationIdentifier(
                UnityEditor.Build.NamedBuildTarget.Android,
                "kr.robom.runningup");
            PlayerSettings.bundleVersion = "11.0.0";
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.Portrait;
            PlayerSettings.runInBackground = true;
            PlayerSettings.colorSpace = ColorSpace.Linear;
            PlayerSettings.Android.minSdkVersion = AndroidSdkVersions.AndroidApiLevel28;
            PlayerSettings.Android.targetSdkVersion = AndroidSdkVersions.AndroidApiLevel36;
            PlayerSettings.SetScriptingBackend(
                UnityEditor.Build.NamedBuildTarget.Android,
                ScriptingImplementation.IL2CPP);
            PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
            QualitySettings.vSyncCount = 0;
            Application.targetFrameRate = 60;
        }

        private static void EnsureFolders()
        {
            foreach (var path in new[]
                     {
                         GeneratedRoot,
                         MeshRoot,
                         MaterialRoot,
                         AnimationRoot,
                         PrefabRoot,
                         SceneRoot,
                     })
            {
                EnsureFolder(path);
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

        private static void BuildRunnerPrefab()
        {
            DeleteGeneratedRunnerAssets();

            var skin = CreateMaterial("Skin", new Color(1f, 0.78f, 0.64f), 0f, 0.44f);
            var hair = CreateMaterial("Hair", new Color(0.34f, 0.12f, 0.035f), 0f, 0.46f);
            var navy = CreateMaterial("RunnerNavy", new Color(0.025f, 0.090f, 0.160f), 0f, 0.38f);
            var mint = CreateMaterial("RunnerMint", V14Palette.Mint, 0.05f, 0.62f, V14Palette.Mint * 0.08f);
            var white = CreateMaterial("RunnerWhite", V14Palette.SoftWhite, 0f, 0.52f);
            var detail = CreateMaterial("FaceDetail", new Color(0.025f, 0.018f, 0.020f), 0f, 0.32f);
            var coral = CreateMaterial("RunnerCoral", V14Palette.Coral, 0f, 0.52f);

            var meshes = new Dictionary<string, Mesh>
            {
                ["Head"] = CreateMeshAsset(
                    "Head",
                    ChibiMeshFactory.CreateEllipsoid("MyRunnerHead", new Vector3(0.54f, 0.55f, 0.50f), 48, 24)),
                ["HairCap"] = CreateMeshAsset(
                    "HairCap",
                    ChibiMeshFactory.CreateEllipsoid("HairCap", new Vector3(0.58f, 0.41f, 0.47f), 48, 24)),
                ["Eye"] = CreateMeshAsset(
                    "Eye",
                    ChibiMeshFactory.CreateEllipsoid("Eye", new Vector3(0.082f, 0.118f, 0.030f), 20, 12)),
                ["EyeGlow"] = CreateMeshAsset(
                    "EyeGlow",
                    ChibiMeshFactory.CreateEllipsoid("EyeGlow", new Vector3(0.022f, 0.029f, 0.010f), 12, 8)),
                ["Mouth"] = CreateMeshAsset(
                    "Mouth",
                    ChibiMeshFactory.CreateEllipsoid("Mouth", new Vector3(0.075f, 0.024f, 0.016f), 16, 8)),
                ["Ear"] = CreateMeshAsset(
                    "Ear",
                    ChibiMeshFactory.CreateEllipsoid("Ear", new Vector3(0.100f, 0.145f, 0.070f), 16, 10)),
                ["Torso"] = CreateMeshAsset(
                    "Torso",
                    ChibiMeshFactory.CreateTaperedTube("Torso", 0.82f, 0.33f, 0.285f, 32, 12)),
                ["Shorts"] = CreateMeshAsset(
                    "Shorts",
                    ChibiMeshFactory.CreateTaperedTube("Shorts", 0.34f, 0.29f, 0.34f, 32, 10)),
                ["UpperArm"] = CreateMeshAsset(
                    "UpperArm",
                    ChibiMeshFactory.CreateTaperedTube("UpperArm", 0.30f, 0.13f, 0.15f, 24, 8)),
                ["Forearm"] = CreateMeshAsset(
                    "Forearm",
                    ChibiMeshFactory.CreateTaperedTube("Forearm", 0.42f, 0.095f, 0.13f, 24, 9)),
                ["Thigh"] = CreateMeshAsset(
                    "Thigh",
                    ChibiMeshFactory.CreateTaperedTube("Thigh", 0.39f, 0.13f, 0.17f, 24, 9)),
                ["Shin"] = CreateMeshAsset(
                    "Shin",
                    ChibiMeshFactory.CreateTaperedTube("Shin", 0.43f, 0.105f, 0.14f, 24, 9)),
                ["Hand"] = CreateMeshAsset(
                    "Hand",
                    ChibiMeshFactory.CreateEllipsoid("Hand", new Vector3(0.135f, 0.170f, 0.125f), 18, 12)),
                ["Shoe"] = CreateMeshAsset(
                    "Shoe",
                    ChibiMeshFactory.CreateEllipsoid("Shoe", new Vector3(0.205f, 0.145f, 0.340f), 28, 14)),
                ["Sole"] = CreateMeshAsset(
                    "Sole",
                    ChibiMeshFactory.CreateEllipsoid("Sole", new Vector3(0.218f, 0.062f, 0.355f), 28, 12)),
                ["Fringe"] = CreateMeshAsset(
                    "Fringe",
                    ChibiMeshFactory.CreateEllipsoid("Fringe", new Vector3(0.245f, 0.115f, 0.080f), 20, 12)),
                ["SideLock"] = CreateMeshAsset(
                    "SideLock",
                    ChibiMeshFactory.CreateEllipsoid("SideLock", new Vector3(0.085f, 0.225f, 0.075f), 20, 12)),
                ["Band"] = CreateMeshAsset(
                    "Band",
                    ChibiMeshFactory.CreateTorus("Band", 0.47f, 0.050f, 32, 10)),
                ["BandMark"] = CreateMeshAsset(
                    "BandMark",
                    ChibiMeshFactory.CreateBox("BandMark", new Vector3(0.24f, 0.09f, 0.045f))),
                ["JacketPanel"] = CreateMeshAsset(
                    "JacketPanel",
                    ChibiMeshFactory.CreateEllipsoid("JacketPanel", new Vector3(0.225f, 0.305f, 0.050f), 20, 12)),
                ["Collar"] = CreateMeshAsset(
                    "Collar",
                    ChibiMeshFactory.CreateTorus("Collar", 0.245f, 0.048f, 28, 10)),
                ["Watch"] = CreateMeshAsset(
                    "Watch",
                    ChibiMeshFactory.CreateBox("Watch", new Vector3(0.19f, 0.12f, 0.18f))),
            };

            var root = new GameObject("MyRunnerV14");
            var animation = root.AddComponent<Animation>();
            var view = root.AddComponent<ChibiRunnerView>();
            var rig = CreatePivot("Rig", root.transform, Vector3.zero);
            var hips = CreatePivot("Hips", rig, new Vector3(0f, 1.12f, 0f));
            var torsoPivot = CreatePivot("TorsoPivot", rig, new Vector3(0f, 1.63f, 0f));
            CreatePart("Torso", torsoPivot, meshes["Torso"], navy, Vector3.zero);
            CreatePart("MintJacketFront", torsoPivot, meshes["JacketPanel"], mint, new Vector3(0f, 0.005f, -0.315f));
            CreatePart("JacketZip", torsoPivot, meshes["BandMark"], white, new Vector3(0f, 0.025f, -0.335f), Quaternion.Euler(0f, 0f, 90f), new Vector3(2.2f, 0.11f, 0.70f));
            CreatePart("NavyCollar", torsoPivot, meshes["Collar"], navy, new Vector3(0f, 0.36f, -0.01f), Quaternion.identity, new Vector3(1f, 1f, 0.82f));
            CreatePart("Shorts", hips, meshes["Shorts"], navy, new Vector3(0f, 0.10f, 0f));

            var headPivot = CreatePivot("HeadPivot", rig, new Vector3(0f, 2.48f, 0f));
            CreatePart("Head", headPivot, meshes["Head"], skin, Vector3.zero);
            CreatePart("LeftEar", headPivot, meshes["Ear"], skin, new Vector3(-0.52f, 0.01f, -0.01f));
            CreatePart("RightEar", headPivot, meshes["Ear"], skin, new Vector3(0.52f, 0.01f, -0.01f));
            CreatePart("HairVolume", headPivot, meshes["HairCap"], hair, new Vector3(0f, 0.29f, 0.18f));
            CreatePart("HeadBand", headPivot, meshes["Band"], white, new Vector3(0f, 0.13f, -0.02f), Quaternion.identity, new Vector3(1.07f, 1f, 0.94f));
            CreatePart("HeadBandAccent", headPivot, meshes["BandMark"], mint, new Vector3(0f, 0.13f, -0.505f));
            CreatePart("LeftEye", headPivot, meshes["Eye"], detail, new Vector3(-0.18f, 0.01f, -0.482f), Quaternion.Euler(0f, 0f, -4f));
            CreatePart("RightEye", headPivot, meshes["Eye"], detail, new Vector3(0.18f, 0.01f, -0.482f), Quaternion.Euler(0f, 0f, 4f));
            CreatePart("LeftEyeGlow", headPivot, meshes["EyeGlow"], white, new Vector3(-0.205f, 0.05f, -0.523f));
            CreatePart("RightEyeGlow", headPivot, meshes["EyeGlow"], white, new Vector3(0.155f, 0.05f, -0.523f));
            CreatePart("LeftBrow", headPivot, meshes["BandMark"], hair, new Vector3(-0.18f, 0.19f, -0.505f), Quaternion.Euler(0f, 0f, -7f), new Vector3(0.55f, 0.16f, 0.65f));
            CreatePart("RightBrow", headPivot, meshes["BandMark"], hair, new Vector3(0.18f, 0.19f, -0.505f), Quaternion.Euler(0f, 0f, 7f), new Vector3(0.55f, 0.16f, 0.65f));
            CreatePart("Mouth", headPivot, meshes["Mouth"], coral, new Vector3(0f, -0.235f, -0.485f));
            CreatePart("LeftCheek", headPivot, meshes["Mouth"], coral, new Vector3(-0.31f, -0.14f, -0.46f), Quaternion.identity, new Vector3(1.15f, 1.10f, 0.65f));
            CreatePart("RightCheek", headPivot, meshes["Mouth"], coral, new Vector3(0.31f, -0.14f, -0.46f), Quaternion.identity, new Vector3(1.15f, 1.10f, 0.65f));

            var fringeX = new[] { -0.25f, -0.08f, 0.12f, 0.29f };
            var fringeY = new[] { 0.35f, 0.39f, 0.36f, 0.31f };
            var fringeRoll = new[] { -20f, -8f, 10f, 22f };
            for (var index = 0; index < fringeX.Length; index++)
            {
                CreatePart(
                    $"Fringe{index + 1:00}",
                    headPivot,
                    meshes["Fringe"],
                    hair,
                    new Vector3(fringeX[index], fringeY[index], -0.405f),
                    Quaternion.Euler(7f, 0f, fringeRoll[index]),
                    new Vector3(0.90f, 0.92f + index % 2 * 0.08f, 1f));
            }
            CreatePart("LeftSideLock", headPivot, meshes["SideLock"], hair, new Vector3(-0.44f, 0.07f, -0.26f), Quaternion.Euler(8f, 0f, -10f));
            CreatePart("RightSideLock", headPivot, meshes["SideLock"], hair, new Vector3(0.44f, 0.07f, -0.26f), Quaternion.Euler(8f, 0f, 10f));

            var leftArm = CreatePivot("LeftArmPivot", rig, new Vector3(-0.405f, 1.87f, -0.01f));
            var rightArm = CreatePivot("RightArmPivot", rig, new Vector3(0.405f, 1.87f, -0.01f));
            leftArm.localRotation = Quaternion.Euler(-28f, 0f, 7f);
            rightArm.localRotation = Quaternion.Euler(28f, 0f, -7f);
            CreatePart("LeftSleeve", leftArm, meshes["UpperArm"], navy, new Vector3(0f, -0.15f, 0f), Quaternion.Euler(0f, 0f, 4f));
            CreatePart("RightSleeve", rightArm, meshes["UpperArm"], navy, new Vector3(0f, -0.15f, 0f), Quaternion.Euler(0f, 0f, -4f));
            var leftElbow = CreatePivot("LeftElbow", leftArm, new Vector3(0f, -0.29f, 0f));
            var rightElbow = CreatePivot("RightElbow", rightArm, new Vector3(0f, -0.29f, 0f));
            leftElbow.localRotation = Quaternion.Euler(78f, 0f, 0f);
            rightElbow.localRotation = Quaternion.Euler(-78f, 0f, 0f);
            CreatePart("LeftForearm", leftElbow, meshes["Forearm"], skin, new Vector3(0f, -0.20f, 0f));
            CreatePart("RightForearm", rightElbow, meshes["Forearm"], skin, new Vector3(0f, -0.20f, 0f));
            CreatePart("LeftHand", leftElbow, meshes["Hand"], skin, new Vector3(0f, -0.43f, 0f));
            CreatePart("RightHand", rightElbow, meshes["Hand"], skin, new Vector3(0f, -0.43f, 0f));
            CreatePart("Watch", leftElbow, meshes["Watch"], mint, new Vector3(0f, -0.27f, -0.10f), Quaternion.Euler(14f, 0f, 0f));

            var leftLeg = CreatePivot("LeftLegPivot", rig, new Vector3(-0.19f, 1.08f, 0f));
            var rightLeg = CreatePivot("RightLegPivot", rig, new Vector3(0.19f, 1.08f, 0f));
            leftLeg.localRotation = Quaternion.Euler(20f, 0f, 0f);
            rightLeg.localRotation = Quaternion.Euler(-20f, 0f, 0f);
            CreatePart("LeftThigh", leftLeg, meshes["Thigh"], skin, new Vector3(0f, -0.19f, 0f));
            CreatePart("RightThigh", rightLeg, meshes["Thigh"], skin, new Vector3(0f, -0.19f, 0f));
            var leftKnee = CreatePivot("LeftKnee", leftLeg, new Vector3(0f, -0.38f, 0f));
            var rightKnee = CreatePivot("RightKnee", rightLeg, new Vector3(0f, -0.38f, 0f));
            leftKnee.localRotation = Quaternion.Euler(-18f, 0f, 0f);
            rightKnee.localRotation = Quaternion.Euler(34f, 0f, 0f);
            CreatePart("LeftShin", leftKnee, meshes["Shin"], skin, new Vector3(0f, -0.21f, 0f));
            CreatePart("RightShin", rightKnee, meshes["Shin"], skin, new Vector3(0f, -0.21f, 0f));
            CreatePart("LeftSock", leftKnee, meshes["Shin"], white, new Vector3(0f, -0.32f, 0f), Quaternion.identity, new Vector3(1.02f, 0.40f, 1.02f));
            CreatePart("RightSock", rightKnee, meshes["Shin"], white, new Vector3(0f, -0.32f, 0f), Quaternion.identity, new Vector3(1.02f, 0.40f, 1.02f));
            var leftShoe = CreatePart("LeftShoe", leftKnee, meshes["Shoe"], mint, new Vector3(0f, -0.48f, -0.11f), Quaternion.Euler(8f, 0f, 0f));
            var rightShoe = CreatePart("RightShoe", rightKnee, meshes["Shoe"], mint, new Vector3(0f, -0.48f, -0.11f), Quaternion.Euler(8f, 0f, 0f));
            CreatePart("LeftSole", leftKnee, meshes["Sole"], white, new Vector3(0f, -0.59f, -0.11f), Quaternion.Euler(8f, 0f, 0f));
            CreatePart("RightSole", rightKnee, meshes["Sole"], white, new Vector3(0f, -0.59f, -0.11f), Quaternion.Euler(8f, 0f, 0f));

            var clips = CreateAnimationClips();
            foreach (var clip in clips)
            {
                animation.AddClip(clip, clip.name);
            }

            animation.clip = clips.First(clip => clip.name == "steady_run");
            var serializedView = new SerializedObject(view);
            serializedView.FindProperty("runnerAnimation").objectReferenceValue = animation;
            serializedView.FindProperty("defaultClip").stringValue = "steady_run";
            serializedView.FindProperty("footprintAnchor").objectReferenceValue = leftShoe.transform;
            serializedView.ApplyModifiedPropertiesWithoutUndo();

            PrefabUtility.SaveAsPrefabAsset(root, RunnerPrefabPath);
            UnityEngine.Object.DestroyImmediate(root);
        }

        private static void DeleteGeneratedRunnerAssets()
        {
            foreach (var path in new[] { MeshRoot, MaterialRoot, AnimationRoot, PrefabRoot })
            {
                var assets = AssetDatabase.FindAssets(string.Empty, new[] { path });
                foreach (var guid in assets)
                {
                    var assetPath = AssetDatabase.GUIDToAssetPath(guid);
                    if (!AssetDatabase.IsValidFolder(assetPath))
                    {
                        AssetDatabase.DeleteAsset(assetPath);
                    }
                }
            }
        }

        private static void BuildLiveJourneyScene()
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            scene.name = "LiveJourneyHome";
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(0.42f, 0.68f, 0.88f);
            RenderSettings.ambientEquatorColor = new Color(0.40f, 0.54f, 0.62f);
            RenderSettings.ambientGroundColor = new Color(0.18f, 0.23f, 0.28f);
            RenderSettings.fog = true;
            RenderSettings.fogColor = new Color(0.42f, 0.72f, 0.88f);
            RenderSettings.fogMode = FogMode.Linear;
            RenderSettings.fogStartDistance = 24f;
            RenderSettings.fogEndDistance = 82f;

            var cameraObject = new GameObject("LiveJourneyCamera");
            cameraObject.tag = "MainCamera";
            var camera = cameraObject.AddComponent<Camera>();
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0.25f, 0.68f, 0.92f);
            camera.fieldOfView = 37f;
            camera.nearClipPlane = 0.1f;
            camera.farClipPlane = 160f;
            camera.transform.position = new Vector3(4.1f, 3.05f, -7.6f);
            camera.transform.LookAt(new Vector3(0f, 1.55f, 2.25f));

            var sunObject = new GameObject("WarmSun");
            var sun = sunObject.AddComponent<Light>();
            sun.type = LightType.Directional;
            sun.color = new Color(1f, 0.88f, 0.72f);
            sun.intensity = 1.35f;
            sun.shadows = LightShadows.Soft;
            sun.transform.rotation = Quaternion.Euler(42f, -28f, 0f);
            var fillObject = new GameObject("SkyFill");
            var fill = fillObject.AddComponent<Light>();
            fill.type = LightType.Directional;
            fill.color = V14Palette.SkyBlue;
            fill.intensity = 0.82f;
            fill.transform.rotation = Quaternion.Euler(70f, 145f, 0f);
            var portraitFillObject = new GameObject("PortraitFill");
            var portraitFill = portraitFillObject.AddComponent<Light>();
            portraitFill.type = LightType.Point;
            portraitFill.color = new Color(1f, 0.78f, 0.64f);
            portraitFill.intensity = 2.8f;
            portraitFill.range = 16f;
            portraitFill.transform.position = new Vector3(1.2f, 3.4f, -4.3f);

            var worldRoot = new GameObject("LiveJourneyWorld");
            worldRoot.AddComponent<FunctionalPrototypeOnlyMarker>();
            var world = worldRoot.AddComponent<LiveJourneyWorld>();
            var roadMaterial = CreateMaterial("Road", V14Palette.Asphalt, 0f, 0.24f);
            var sidewalkMaterial = CreateMaterial("Sidewalk", new Color(0.54f, 0.62f, 0.67f), 0f, 0.38f);
            var laneMaterial = CreateMaterial("Lane", V14Palette.WarmAmber, 0f, 0.52f, V14Palette.WarmAmber * 0.12f);
            var grassMaterial = CreateMaterial("Grass", new Color(0.20f, 0.58f, 0.35f), 0f, 0.32f);
            var trunkMaterial = CreateMaterial("TreeTrunk", new Color(0.26f, 0.13f, 0.07f), 0f, 0.22f);
            var leafMaterial = CreateMaterial("TreeLeaf", new Color(0.25f, 0.72f, 0.46f), 0f, 0.35f);
            var buildingMaterials = new[]
            {
                CreateMaterial("BuildingSky", new Color(0.29f, 0.58f, 0.76f), 0.12f, 0.48f),
                CreateMaterial("BuildingCoral", new Color(0.85f, 0.40f, 0.36f), 0.05f, 0.42f),
                CreateMaterial("BuildingCream", new Color(0.88f, 0.77f, 0.56f), 0f, 0.36f),
                CreateMaterial("BuildingLavender", new Color(0.46f, 0.38f, 0.68f), 0.08f, 0.44f),
            };
            var windowMaterial = CreateMaterial(
                "WindowGlow",
                new Color(0.42f, 0.86f, 1f),
                0.12f,
                0.72f,
                new Color(0.12f, 0.32f, 0.44f));

            var roadMesh = CreateMeshAsset(
                "LiveJourneyRoad",
                ChibiMeshFactory.CreateCurvedRoad("LiveJourneyRoad", 120f, 8.4f, 220, 3.4f, 0.035f));
            CreatePart("Road", worldRoot.transform, roadMesh, roadMaterial, Vector3.zero);
            var groundMesh = CreateMeshAsset(
                "WorldGround",
                ChibiMeshFactory.CreateBox("WorldGround", new Vector3(56f, 0.20f, 120f)));
            CreatePart("Ground", worldRoot.transform, groundMesh, grassMaterial, new Vector3(0f, -0.15f, 28f));
            var sidewalkMesh = CreateMeshAsset(
                "SidewalkStrip",
                ChibiMeshFactory.CreateBox("SidewalkStrip", new Vector3(2.5f, 0.16f, 120f)));
            CreatePart("LeftSidewalk", worldRoot.transform, sidewalkMesh, sidewalkMaterial, new Vector3(-5.25f, -0.01f, 28f));
            CreatePart("RightSidewalk", worldRoot.transform, sidewalkMesh, sidewalkMaterial, new Vector3(5.25f, -0.01f, 28f));

            var markerMesh = CreateMeshAsset(
                "LaneMarker",
                ChibiMeshFactory.CreateBox("LaneMarker", new Vector3(0.12f, 0.035f, 1.6f)));
            var markerTransforms = new List<Transform>();
            for (var index = 0; index < 18; index++)
            {
                var marker = CreatePart(
                    $"LaneMarker{index + 1:00}",
                    worldRoot.transform,
                    markerMesh,
                    laneMaterial,
                    new Vector3(0f, 0.025f, -5f + index * 2.45f));
                markerTransforms.Add(marker.transform);
            }

            var unitBox = CreateMeshAsset(
                "ArchitectureBox",
                ChibiMeshFactory.CreateBox("ArchitectureBox", Vector3.one));
            var treeTrunk = CreateMeshAsset(
                "TreeTrunk",
                ChibiMeshFactory.CreateTaperedTube("TreeTrunk", 1.45f, 0.14f, 0.20f, 20, 8));
            var treeCanopy = CreateMeshAsset(
                "TreeCanopy",
                ChibiMeshFactory.CreateEllipsoid("TreeCanopy", new Vector3(0.78f, 0.86f, 0.72f), 28, 18));
            var skylineTransforms = new List<Transform>();
            for (var index = 0; index < 26; index++)
            {
                var side = index % 2 == 0 ? -1f : 1f;
                var z = 8f + index * 2.55f;
                var height = 4.2f + (index * 17 % 9) * 0.72f;
                var width = 2.0f + (index * 13 % 5) * 0.34f;
                var building = CreatePart(
                    $"Skyline{index + 1:00}",
                    worldRoot.transform,
                    unitBox,
                    buildingMaterials[index % buildingMaterials.Length],
                    new Vector3(side * (8.2f + (index % 4) * 1.15f), height * 0.5f, z),
                    Quaternion.Euler(0f, side * (5f + index % 3 * 3f), 0f),
                    new Vector3(width, height, 2.2f + index % 3 * 0.45f));
                skylineTransforms.Add(building.transform);
                for (var row = 0; row < 3; row++)
                {
                    CreatePart(
                        $"Window{index + 1:00}_{row + 1}",
                        building.transform,
                        unitBox,
                        windowMaterial,
                        new Vector3(0f, -0.25f + row * 0.24f, side < 0 ? -0.51f : 0.51f),
                        Quaternion.identity,
                        new Vector3(0.62f, 0.10f, 0.025f));
                }

                if (index < 16)
                {
                    var treeX = side * (5.85f + index % 3 * 0.42f);
                    var treeZ = 3.5f + index * 3.1f;
                    CreatePart($"TreeTrunk{index + 1:00}", worldRoot.transform, treeTrunk, trunkMaterial, new Vector3(treeX, 0.72f, treeZ));
                    CreatePart($"TreeCanopy{index + 1:00}", worldRoot.transform, treeCanopy, leafMaterial, new Vector3(treeX, 1.90f, treeZ));
                }
            }

            world.Configure(markerTransforms, skylineTransforms);

            var runnerPrefab = AssetDatabase.LoadAssetAtPath<GameObject>(RunnerPrefabPath);
            if (runnerPrefab == null)
            {
                throw new InvalidOperationException("My Runner prefab did not build.");
            }

            var runnerObject = PrefabUtility.InstantiatePrefab(runnerPrefab) as GameObject;
            if (runnerObject == null)
            {
                throw new InvalidOperationException("My Runner prefab could not instantiate.");
            }

            runnerObject.transform.position = new Vector3(0f, -0.11f, 1.8f);
            runnerObject.transform.rotation = Quaternion.Euler(0f, 180f, 0f);
            runnerObject.transform.localScale = Vector3.one * 1.08f;

            var runBridgeObject = new GameObject("V14AndroidRunBridge");
            runBridgeObject.AddComponent<V14RunRuntime>();
            var supabaseConfig = runBridgeObject.AddComponent<V14SupabaseRuntimeConfig>();
            supabaseConfig.Configure(
                Environment.GetEnvironmentVariable("RUNNINGUP_SUPABASE_URL"),
                Environment.GetEnvironmentVariable(
                    "RUNNINGUP_SUPABASE_PUBLISHABLE_KEY"));
            runBridgeObject.AddComponent<V14SupabaseSessionRuntime>();
            runBridgeObject.AddComponent<V14VerifiedRunUploader>();
            var runBridge = runBridgeObject.AddComponent<V14AndroidRunBridge>();
            runBridgeObject.AddComponent<V14SupabaseGateway>();
            runBridgeObject.AddComponent<V14JourneyRuntime>();
            BuildHud(camera, runnerObject.GetComponent<ChibiRunnerView>(), runBridge);
            if (UnityEngine.Object.FindFirstObjectByType<EventSystem>() == null)
            {
                var eventSystem = new GameObject("EventSystem");
                eventSystem.AddComponent<EventSystem>();
                eventSystem.AddComponent<StandaloneInputModule>();
            }

            EditorSceneManager.SaveScene(scene, ScenePath);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
        }

        private static void BuildHud(
            Camera camera,
            ChibiRunnerView runner,
            V14AndroidRunBridge runBridge)
        {
            var font = AssetDatabase.LoadAssetAtPath<Font>(
                "Assets/RunningUp/Fonts/NotoSansKR-V14.ttf");
            if (font == null)
            {
                throw new InvalidOperationException("Noto Sans KR font is missing.");
            }

            var canvasObject = new GameObject("V14Hud");
            var canvas = canvasObject.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceCamera;
            canvas.worldCamera = camera;
            canvas.planeDistance = 0.8f;
            var scaler = canvasObject.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080f, 1920f);
            scaler.matchWidthOrHeight = 0f;
            canvasObject.AddComponent<GraphicRaycaster>();
            var controller = canvasObject.AddComponent<V14HudController>();

            var home = CreateUiObject("HomeScreen", canvasObject.transform);
            Stretch(home.GetComponent<RectTransform>());
            CreateImage("TopBar", home.transform, V14Palette.DeepNavy.WithAlpha(0.92f), new Vector2(0f, 1f), new Vector2(1f, 1f), Vector2.zero, new Vector2(0f, 176f));
            CreateText(
                "RouteTitle",
                home.transform,
                font,
                "루미나 메트로웨이 · C01-R03-S07",
                38,
                FontStyle.Bold,
                V14Palette.SoftWhite,
                new Vector2(42f, -32f),
                new Vector2(670f, 62f),
                new Vector2(0f, 1f));
            CreateText(
                "AlwaysRunning",
                home.transform,
                font,
                "My Runner가 계속 달리는 중",
                28,
                FontStyle.Normal,
                V14Palette.MutedText,
                new Vector2(42f, -94f),
                new Vector2(620f, 48f),
                new Vector2(0f, 1f));
            var monthlyBadge = CreateImage(
                "MonthlyBadge",
                home.transform,
                V14Palette.PanelNavy.WithAlpha(0.96f),
                new Vector2(1f, 1f),
                new Vector2(1f, 1f),
                new Vector2(-38f, -32f),
                new Vector2(290f, 96f));
            var monthlyText = CreateTextCentered(
                monthlyBadge.transform,
                font,
                "0.0 / 1000km",
                34,
                V14Palette.WarmAmber);

            var currentPill = CreateImage(
                "CurrentRoute",
                home.transform,
                V14Palette.DeepNavy.WithAlpha(0.84f),
                new Vector2(0f, 1f),
                new Vector2(0f, 1f),
                new Vector2(34f, -205f),
                new Vector2(255f, 70f));
            CreateTextCentered(currentPill.transform, font, "현재 코스 1 / 2304", 27, V14Palette.SoftWhite);
            var nextPill = CreateImage(
                "NextRoute",
                home.transform,
                V14Palette.DeepNavy.WithAlpha(0.84f),
                new Vector2(1f, 1f),
                new Vector2(1f, 1f),
                new Vector2(-34f, -205f),
                new Vector2(310f, 70f));
            CreateTextCentered(nextPill.transform, font, "다음 복원 1.0km", 27, V14Palette.SoftWhite);

            var infoPanel = CreateImage(
                "JourneyInfo",
                home.transform,
                V14Palette.DeepNavy.WithAlpha(0.93f),
                new Vector2(0f, 0f),
                new Vector2(1f, 0f),
                new Vector2(0f, 168f),
                new Vector2(0f, 380f));
            var journeyFacts = new[]
            {
                "PACER NOVA · ACTIVE",
                "UPLOAD QUEUE · 0",
                "VERIFIED RUNS · 0.0 km",
            };
            Text pendingUploadText = null;
            Text homeVerifiedText = null;
            for (var index = 0; index < journeyFacts.Length; index++)
            {
                var pill = CreateImage(
                    $"Friend{index + 1}",
                    infoPanel.transform,
                    V14Palette.PanelNavy,
                    new Vector2(0f, 1f),
                    new Vector2(0f, 1f),
                    new Vector2(30f + index * 340f, -28f),
                    new Vector2(320f, 76f));
                var factText = CreateTextCentered(
                    pill.transform,
                    font,
                    journeyFacts[index],
                    25,
                    V14Palette.SoftWhite);
                if (index == 1)
                {
                    pendingUploadText = factText;
                }
                else if (index == 2)
                {
                    homeVerifiedText = factText;
                }
            }

            var idleButton = CreateButton(
                "SyncRun",
                infoPanel.transform,
                font,
                "SYNC RUN\nHEALTH CONNECT",
                new Vector2(32f, -130f),
                new Vector2(484f, 106f),
                V14Palette.PanelNavy,
                new Vector2(0f, 1f));
            var contractButton = CreateButton(
                "DailyContract",
                infoPanel.transform,
                font,
                "DAILY RUN\nNOT COMPLETE",
                new Vector2(562f, -130f),
                new Vector2(484f, 106f),
                V14Palette.PanelNavy,
                new Vector2(0f, 1f));
            CreateText(
                "NextMarkTitle",
                infoPanel.transform,
                font,
                "다음 Monthly Mark",
                26,
                FontStyle.Bold,
                V14Palette.SoftWhite,
                new Vector2(42f, -265f),
                new Vector2(430f, 44f),
                new Vector2(0f, 1f));
            CreateText(
                "NextMarkValue",
                infoPanel.transform,
                font,
                "1km까지 1.0km",
                24,
                FontStyle.Normal,
                V14Palette.MutedText,
                new Vector2(-40f, -265f),
                new Vector2(360f, 44f),
                new Vector2(1f, 1f),
                TextAnchor.MiddleRight);
            var progressBase = CreateImage(
                "ProgressBase",
                infoPanel.transform,
                new Color(0.01f, 0.04f, 0.09f, 0.95f),
                new Vector2(0f, 1f),
                new Vector2(1f, 1f),
                new Vector2(42f, -326f),
                new Vector2(-84f, 22f));
            CreateImage(
                "ProgressFill",
                progressBase.transform,
                V14Palette.Mint,
                new Vector2(0f, 0.5f),
                new Vector2(0f, 0.5f),
                Vector2.zero,
                new Vector2(0f, 22f));

            var runnerScreen = BuildRunnerPanel(
                canvasObject.transform,
                font,
                out var growthText);
            var runScreen = BuildRunPanel(
                canvasObject.transform,
                font,
                out var goalModeButtons,
                out var directGpsButton,
                out var pauseRunButton,
                out var finishRunButton,
                out var healthPermissionButton,
                out var healthReadButton,
                out var importFileButton,
                out var runStatusText);
            var worldScreen = BuildWorldPanel(canvasObject.transform, font);
            var crewScreen = BuildCrewPanel(canvasObject.transform, font);
            runnerScreen.SetActive(false);
            runScreen.SetActive(false);
            worldScreen.SetActive(false);
            crewScreen.SetActive(false);

            var nav = CreateImage(
                "BottomNavigation",
                canvasObject.transform,
                V14Palette.DeepNavy.WithAlpha(0.98f),
                new Vector2(0f, 0f),
                new Vector2(1f, 0f),
                Vector2.zero,
                new Vector2(0f, 168f));
            var labels = new[] { "홈", "러너", "RUN", "월드", "크루" };
            var navigationButtons = new List<Button>();
            Button centerRun = null;
            for (var index = 0; index < labels.Length; index++)
            {
                var width = 216f;
                var button = CreateButton(
                    $"Nav{labels[index]}",
                    nav.transform,
                    font,
                    labels[index],
                    new Vector2(width * index, index == 2 ? 25f : 0f),
                    index == 2 ? new Vector2(180f, 145f) : new Vector2(width, 168f),
                    index == 0 ? V14Palette.SkyBlue : Color.clear,
                    new Vector2(0f, 0f),
                    index == 0 ? V14Palette.DeepNavy : V14Palette.MutedText);
                var buttonRect = button.GetComponent<RectTransform>();
                buttonRect.anchorMin = new Vector2(0f, 0f);
                buttonRect.anchorMax = new Vector2(0f, 0f);
                navigationButtons.Add(button);
                if (index == 2)
                {
                    centerRun = button;
                }
            }

            var toastRoot = CreateImage(
                "Toast",
                canvasObject.transform,
                V14Palette.WarmAmber,
                new Vector2(0.5f, 0f),
                new Vector2(0.5f, 0f),
                new Vector2(0f, 580f),
                new Vector2(760f, 86f));
            var toast = CreateTextCentered(
                toastRoot.transform,
                font,
                "오늘의 Run Contract · EASY 5km",
                30,
                V14Palette.DeepNavy);
            toastRoot.SetActive(false);
            controller.Configure(
                new[] { home, runnerScreen, runScreen, worldScreen, crewScreen },
                navigationButtons,
                goalModeButtons,
                centerRun,
                contractButton,
                toastRoot,
                toast,
                runner,
                runBridge,
                idleButton,
                directGpsButton,
                pauseRunButton,
                finishRunButton,
                healthPermissionButton,
                healthReadButton,
                importFileButton,
                monthlyText,
                contractButton.GetComponentInChildren<Text>(),
                idleButton.GetComponentInChildren<Text>(),
                growthText,
                runStatusText,
                pendingUploadText,
                homeVerifiedText);
            var v14Screens = canvasObject.AddComponent<V14ScreenFlowController>();
            v14Screens.Configure(
                font,
                runBridge.GetComponent<V14JourneyRuntime>(),
                runBridge,
                runner);
        }

        private static GameObject BuildRunnerPanel(
            Transform parent,
            Font font,
            out Text growthText)
        {
            var panel = CreatePanelShell(
                parent,
                font,
                "RunnerScreen",
                "MY RUNNER",
                "현실에서 달린 만큼만 영구 성장");
            growthText = CreateText(
                "VerifiedGrowth",
                panel.transform,
                font,
                "검증 러닝 0.0km · Form 1 / 12",
                36,
                FontStyle.Bold,
                V14Palette.Mint,
                new Vector2(58f, -360f),
                new Vector2(920f, 64f),
                new Vector2(0f, 1f));

            var allocation = CreateImage(
                "GrowthAllocation",
                panel.transform,
                V14Palette.PanelNavy,
                new Vector2(0f, 1f),
                new Vector2(1f, 1f),
                new Vector2(52f, -460f),
                new Vector2(-104f, 230f));
            CreateText(
                "AllocationTitle",
                allocation.transform,
                font,
                "PERMANENT GROWTH",
                26,
                FontStyle.Bold,
                V14Palette.SoftWhite,
                new Vector2(30f, -24f),
                new Vector2(500f, 44f),
                new Vector2(0f, 1f));
            var allocations = new[]
            {
                ("MY RUNNER", "85%", V14Palette.Mint),
                ("PACER BOND", "10%", V14Palette.SkyBlue),
                ("ROUTE RESTORE", "5%", V14Palette.WarmAmber),
            };
            for (var index = 0; index < allocations.Length; index++)
            {
                var x = 30f + index * 313f;
                var item = CreateImage(
                    $"Allocation{index + 1}",
                    allocation.transform,
                    allocations[index].Item3.WithAlpha(0.16f),
                    new Vector2(0f, 1f),
                    new Vector2(0f, 1f),
                    new Vector2(x, -82f),
                    new Vector2(285f, 112f));
                CreateTextCentered(
                    item.transform,
                    font,
                    $"{allocations[index].Item2}\n{allocations[index].Item1}",
                    26,
                    allocations[index].Item3);
            }

            CreateText(
                "EvolutionTitle",
                panel.transform,
                font,
                "EVOLUTION FORMS · 12",
                28,
                FontStyle.Bold,
                V14Palette.SoftWhite,
                new Vector2(58f, -740f),
                new Vector2(700f, 54f),
                new Vector2(0f, 1f));
            for (var index = 0; index < 12; index++)
            {
                var column = index % 6;
                var row = index / 6;
                var tile = CreateImage(
                    $"Form{index + 1:00}",
                    panel.transform,
                    index == 0
                        ? V14Palette.Mint.WithAlpha(0.34f)
                        : V14Palette.PanelNavy,
                    new Vector2(0f, 1f),
                    new Vector2(0f, 1f),
                    new Vector2(58f + column * 164f, -812f - row * 142f),
                    new Vector2(142f, 118f));
                CreateTextCentered(
                    tile.transform,
                    font,
                    $"{index + 1:00}\n{(index == 0 ? "ACTIVE" : "LOCKED")}",
                    22,
                    index == 0 ? V14Palette.Mint : V14Palette.MutedText);
            }

            var catalog = CreateImage(
                "RunnerCatalog",
                panel.transform,
                V14Palette.PanelNavy,
                new Vector2(0f, 0f),
                new Vector2(1f, 0f),
                new Vector2(52f, 220f),
                new Vector2(-104f, 250f));
            CreateTextCentered(
                catalog.transform,
                font,
                "PACER 60    ·    RUN CARDS 360\nRUNNING GEAR 192    ·    12 VISIBLE SLOTS",
                30,
                V14Palette.SoftWhite);
            return panel;
        }

        private static GameObject BuildRunPanel(
            Transform parent,
            Font font,
            out List<Button> goalModeButtons,
            out Button directGpsButton,
            out Button pauseRunButton,
            out Button finishRunButton,
            out Button healthPermissionButton,
            out Button healthReadButton,
            out Button importFileButton,
            out Text statusText)
        {
            var panel = CreatePanelShell(
                parent,
                font,
                "RunScreen",
                "오늘 한 번의 RUN",
                "Daily Contract는 하나 · 추가 러닝은 기본 보상 계속");
            var modes = new[] { "FREE", "EASY", "TEMPO", "INTERVAL", "LONG" };
            goalModeButtons = new List<Button>();
            for (var index = 0; index < modes.Length; index++)
            {
                var mode = CreateButton(
                    $"Mode{modes[index]}",
                    panel.transform,
                    font,
                    modes[index],
                    new Vector2(50f + index * 202f, -365f),
                    new Vector2(182f, 86f),
                    index == 1 ? V14Palette.Mint : V14Palette.PanelNavy,
                    new Vector2(0f, 1f),
                    index == 1 ? V14Palette.DeepNavy : V14Palette.SoftWhite);
                goalModeButtons.Add(mode);
            }

            CreateText(
                "SourceTitle",
                panel.transform,
                font,
                "ACTIVITY SOURCE HUB",
                28,
                FontStyle.Bold,
                V14Palette.SoftWhite,
                new Vector2(58f, -510f),
                new Vector2(800f, 54f),
                new Vector2(0f, 1f));
            directGpsButton = CreateButton(
                "DirectGps",
                panel.transform,
                font,
                "직접 GPS\n시작",
                new Vector2(52f, -590f),
                new Vector2(466f, 150f),
                V14Palette.Mint,
                new Vector2(0f, 1f));
            healthPermissionButton = CreateButton(
                "HealthPermission",
                panel.transform,
                font,
                "HEALTH CONNECT\n권한 확인",
                new Vector2(562f, -590f),
                new Vector2(466f, 150f),
                V14Palette.SkyBlue,
                new Vector2(0f, 1f));
            healthReadButton = CreateButton(
                "HealthRead",
                panel.transform,
                font,
                "HEALTH CONNECT\n러닝 동기화",
                new Vector2(52f, -782f),
                new Vector2(466f, 150f),
                V14Palette.PanelNavy,
                new Vector2(0f, 1f));
            importFileButton = CreateButton(
                "TrackImport",
                panel.transform,
                font,
                "FIT · GPX · TCX\n파일 가져오기",
                new Vector2(562f, -782f),
                new Vector2(466f, 150f),
                V14Palette.PanelNavy,
                new Vector2(0f, 1f));
            pauseRunButton = CreateButton(
                "PauseRun",
                panel.transform,
                font,
                "PAUSE",
                new Vector2(52f, -960f),
                new Vector2(466f, 112f),
                V14Palette.PanelNavy,
                new Vector2(0f, 1f));
            finishRunButton = CreateButton(
                "FinishRun",
                panel.transform,
                font,
                "FINISH & VERIFY",
                new Vector2(562f, -960f),
                new Vector2(466f, 112f),
                V14Palette.WarmAmber,
                new Vector2(0f, 1f));
            pauseRunButton.interactable = false;
            finishRunButton.interactable = false;

            var status = CreateImage(
                "RunStatus",
                panel.transform,
                V14Palette.PanelNavy,
                new Vector2(0f, 1f),
                new Vector2(1f, 1f),
                new Vector2(52f, -1104f),
                new Vector2(-104f, 190f));
            statusText = CreateTextCentered(
                status.transform,
                font,
                "준비됨\n직접 GPS · Health Connect · FIT · GPX · TCX",
                30,
                V14Palette.SoftWhite);
            var privacy = CreateImage(
                "RunPrivacy",
                panel.transform,
                V14Palette.DeepNavy.WithAlpha(0.72f),
                new Vector2(0f, 0f),
                new Vector2(1f, 0f),
                new Vector2(52f, 226f),
                new Vector2(-104f, 210f));
            CreateTextCentered(
                privacy.transform,
                font,
                "원본 경로는 앱 전용 저장소에 보관\n검증 성공 후에만 영구 성장 · 중복 기록은 0회 보상",
                27,
                V14Palette.MutedText);
            return panel;
        }

        private static GameObject BuildWorldPanel(Transform parent, Font font)
        {
            var panel = CreatePanelShell(
                parent,
                font,
                "WorldScreen",
                "12 CONTINENTS",
                "192지역 · 2304 고유 코스 · 러닝으로 복원");
            var continents = new[]
            {
                "루미나", "솔라리스", "아쿠아벨", "베르단트",
                "오로라", "엠버폴", "제피리아", "테라노바",
                "크리스탈", "문리프", "노바하임", "크라운 리치",
            };
            for (var index = 0; index < continents.Length; index++)
            {
                var column = index % 3;
                var row = index / 3;
                var tile = CreateImage(
                    $"Continent{index + 1:00}",
                    panel.transform,
                    index == 0
                        ? V14Palette.Mint.WithAlpha(0.27f)
                        : V14Palette.PanelNavy,
                    new Vector2(0f, 1f),
                    new Vector2(0f, 1f),
                    new Vector2(52f + column * 340f, -375f - row * 218f),
                    new Vector2(316f, 184f));
                CreateTextCentered(
                    tile.transform,
                    font,
                    $"{index + 1:00} · {continents[index]}\n16지역 · 192코스",
                    25,
                    index == 0 ? V14Palette.Mint : V14Palette.SoftWhite);
            }

            var apex = CreateImage(
                "MonthlyApex",
                panel.transform,
                V14Palette.PanelNavy,
                new Vector2(0f, 0f),
                new Vector2(1f, 0f),
                new Vector2(52f, 218f),
                new Vector2(-104f, 230f));
            CreateTextCentered(
                apex.transform,
                font,
                "MONTHLY APEX · 0 / 1000km\n120 CHECKPOINTS · WORLD CROWN은 1000km에서 단 한 번",
                29,
                V14Palette.WarmAmber);
            return panel;
        }

        private static GameObject BuildCrewPanel(Transform parent, Font font)
        {
            var panel = CreatePanelShell(
                parent,
                font,
                "CrewScreen",
                "RUNNER LOUNGE",
                "친구·크루 공개 범위는 Identity Hub에서 통제");
            var sections = new[]
            {
                ("RUNNER PLAZA", "내 공개 범위 · friends\n승인된 친구 기록만 표시"),
                ("CREW RELAY", "현재 참여 크루 없음\n가입 전에는 기록 공유 안 함"),
                ("RIVAL ECHO", "검증 러닝이 쌓이면\n내 과거 페이스와 비교"),
                ("LIVING COACH", "Gentle · Focus · Data · Cheer\n4 persona를 러닝 후 선택"),
            };
            for (var index = 0; index < sections.Length; index++)
            {
                var column = index % 2;
                var row = index / 2;
                var tile = CreateImage(
                    $"Lounge{index + 1:00}",
                    panel.transform,
                    V14Palette.PanelNavy,
                    new Vector2(0f, 1f),
                    new Vector2(0f, 1f),
                    new Vector2(52f + column * 510f, -390f - row * 350f),
                    new Vector2(466f, 300f));
                CreateText(
                    "Title",
                    tile.transform,
                    font,
                    sections[index].Item1,
                    28,
                    FontStyle.Bold,
                    index == 0 ? V14Palette.Mint : V14Palette.SkyBlue,
                    new Vector2(28f, -28f),
                    new Vector2(410f, 50f),
                    new Vector2(0f, 1f));
                CreateText(
                    "Body",
                    tile.transform,
                    font,
                    sections[index].Item2,
                    26,
                    FontStyle.Normal,
                    V14Palette.SoftWhite,
                    new Vector2(28f, -105f),
                    new Vector2(410f, 150f),
                    new Vector2(0f, 1f));
            }
            var note = CreateImage(
                "CrewTruth",
                panel.transform,
                V14Palette.DeepNavy.WithAlpha(0.78f),
                new Vector2(0f, 0f),
                new Vector2(1f, 0f),
                new Vector2(52f, 226f),
                new Vector2(-104f, 190f));
            CreateTextCentered(
                note.transform,
                font,
                "가짜 랭킹·가상 러닝 기록을 만들지 않습니다.\n친구·크루 데이터가 생기면 RLS 허용 범위에서만 표시합니다.",
                27,
                V14Palette.MutedText);
            return panel;
        }

        private static GameObject CreatePanelShell(
            Transform parent,
            Font font,
            string name,
            string title,
            string subtitle)
        {
            var panel = CreateUiObject(name, parent);
            Stretch(panel.GetComponent<RectTransform>());
            var background = panel.AddComponent<Image>();
            background.color = V14Palette.DeepNavy;
            CreateImage(
                "HeaderBand",
                panel.transform,
                V14Palette.PanelNavy,
                new Vector2(0f, 1f),
                new Vector2(1f, 1f),
                Vector2.zero,
                new Vector2(0f, 300f));
            CreateText(
                "Title",
                panel.transform,
                font,
                title,
                62,
                FontStyle.Bold,
                V14Palette.SoftWhite,
                new Vector2(58f, -88f),
                new Vector2(964f, 90f),
                new Vector2(0f, 1f));
            CreateText(
                "Subtitle",
                panel.transform,
                font,
                subtitle,
                30,
                FontStyle.Normal,
                V14Palette.Mint,
                new Vector2(58f, -188f),
                new Vector2(964f, 56f),
                new Vector2(0f, 1f));
            return panel;
        }

        private static AnimationClip[] CreateAnimationClips()
        {
            var specs = new[]
            {
                new RunClipSpec("idle_stretch", 1.55f, 16f, 8f, 0.025f),
                new RunClipSpec("easy_jog", 1.10f, 28f, 34f, 0.045f),
                new RunClipSpec("steady_run", 0.88f, 38f, 46f, 0.060f),
                new RunClipSpec("tempo_run", 0.70f, 46f, 56f, 0.074f),
                new RunClipSpec("interval_sprint", 0.54f, 58f, 67f, 0.088f),
                new RunClipSpec("final_kick", 0.48f, 66f, 74f, 0.102f),
                new RunClipSpec("finish", 1.20f, 18f, 12f, 0.030f),
                new RunClipSpec("cheer", 1.10f, 76f, 8f, 0.040f),
                new RunClipSpec("tired_but_proud", 1.75f, 24f, 18f, 0.025f),
            };
            var clips = new List<AnimationClip>();
            foreach (var spec in specs)
            {
                var clip = new AnimationClip
                {
                    name = spec.Name,
                    frameRate = 60f,
                    legacy = true,
                    wrapMode = WrapMode.Loop,
                };
                SetCycleCurve(clip, "Rig", typeof(Transform), "m_LocalPosition.y", spec.Duration, spec.Bob, spec.Bob);
                SetCycleCurve(clip, "Rig/LeftArmPivot", typeof(Transform), "localEulerAnglesRaw.x", spec.Duration, -spec.Arm, spec.Arm);
                SetCycleCurve(clip, "Rig/RightArmPivot", typeof(Transform), "localEulerAnglesRaw.x", spec.Duration, spec.Arm, -spec.Arm);
                SetCycleCurve(clip, "Rig/LeftLegPivot", typeof(Transform), "localEulerAnglesRaw.x", spec.Duration, spec.Leg, -spec.Leg);
                SetCycleCurve(clip, "Rig/RightLegPivot", typeof(Transform), "localEulerAnglesRaw.x", spec.Duration, -spec.Leg, spec.Leg);
                SetCycleCurve(clip, "Rig/HeadPivot", typeof(Transform), "localEulerAnglesRaw.z", spec.Duration, -2.6f, 2.6f);
                SetCycleCurve(clip, "Rig/TorsoPivot", typeof(Transform), "localEulerAnglesRaw.z", spec.Duration, 4.2f, -4.2f);
                var path = $"{AnimationRoot}/{spec.Name}.anim";
                AssetDatabase.CreateAsset(clip, path);
                clips.Add(clip);
            }

            return clips.ToArray();
        }

        private static void SetCycleCurve(
            AnimationClip clip,
            string path,
            Type type,
            string property,
            float duration,
            float low,
            float high)
        {
            var keys = new[]
            {
                new Keyframe(0f, low),
                new Keyframe(duration * 0.25f, high),
                new Keyframe(duration * 0.5f, low),
                new Keyframe(duration * 0.75f, high),
                new Keyframe(duration, low),
            };
            var curve = new AnimationCurve(keys);
            for (var index = 0; index < curve.length; index++)
            {
                AnimationUtility.SetKeyLeftTangentMode(
                    curve,
                    index,
                    AnimationUtility.TangentMode.ClampedAuto);
                AnimationUtility.SetKeyRightTangentMode(
                    curve,
                    index,
                    AnimationUtility.TangentMode.ClampedAuto);
            }

            AnimationUtility.SetEditorCurve(
                clip,
                EditorCurveBinding.FloatCurve(path, type, property),
                curve);
        }

        private static Mesh CreateMeshAsset(string name, Mesh mesh)
        {
            var path = $"{MeshRoot}/{name}.asset";
            var existing = AssetDatabase.LoadAssetAtPath<Mesh>(path);
            if (existing != null)
            {
                return existing;
            }

            AssetDatabase.CreateAsset(mesh, path);
            return mesh;
        }

        private static Material CreateMaterial(
            string name,
            Color color,
            float metallic,
            float smoothness,
            Color? emission = null)
        {
            var path = $"{MaterialRoot}/{name}.mat";
            var existing = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (existing != null)
            {
                return existing;
            }

            var shader = Shader.Find("Universal Render Pipeline/Lit");
            if (shader == null)
            {
                shader = Shader.Find("Sprites/Default");
            }

            var material = new Material(shader)
            {
                name = name,
                color = color,
            };
            if (material.HasProperty("_Metallic"))
            {
                material.SetFloat("_Metallic", metallic);
            }

            if (material.HasProperty("_Glossiness"))
            {
                material.SetFloat("_Glossiness", smoothness);
            }

            if (material.HasProperty("_BaseColor"))
            {
                material.SetColor("_BaseColor", color);
            }

            if (material.HasProperty("_Smoothness"))
            {
                material.SetFloat("_Smoothness", smoothness);
            }

            if (emission.HasValue && material.HasProperty("_EmissionColor"))
            {
                material.EnableKeyword("_EMISSION");
                material.SetColor("_EmissionColor", emission.Value);
            }

            AssetDatabase.CreateAsset(material, path);
            return material;
        }

        private static Transform CreatePivot(
            string name,
            Transform parent,
            Vector3 localPosition)
        {
            var pivot = new GameObject(name).transform;
            pivot.SetParent(parent, false);
            pivot.localPosition = localPosition;
            return pivot;
        }

        private static GameObject CreatePart(
            string name,
            Transform parent,
            Mesh mesh,
            Material material,
            Vector3 localPosition,
            Quaternion? localRotation = null,
            Vector3? localScale = null)
        {
            var part = new GameObject(name);
            part.transform.SetParent(parent, false);
            part.transform.localPosition = localPosition;
            part.transform.localRotation = localRotation ?? Quaternion.identity;
            part.transform.localScale = localScale ?? Vector3.one;
            var filter = part.AddComponent<MeshFilter>();
            filter.sharedMesh = mesh;
            var renderer = part.AddComponent<MeshRenderer>();
            renderer.sharedMaterial = material;
            renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.On;
            renderer.receiveShadows = true;
            return part;
        }

        private static GameObject CreateUiObject(string name, Transform parent)
        {
            var gameObject = new GameObject(name, typeof(RectTransform));
            gameObject.transform.SetParent(parent, false);
            return gameObject;
        }

        private static GameObject CreateImage(
            string name,
            Transform parent,
            Color color,
            Vector2 anchorMin,
            Vector2 anchorMax,
            Vector2 anchoredPosition,
            Vector2 sizeDelta)
        {
            var gameObject = CreateUiObject(name, parent);
            var rect = gameObject.GetComponent<RectTransform>();
            rect.anchorMin = anchorMin;
            rect.anchorMax = anchorMax;
            rect.pivot = new Vector2(
                Mathf.Approximately(anchorMin.x, 1f) ? 1f : anchorMin.x,
                Mathf.Approximately(anchorMin.y, 1f) ? 1f : anchorMin.y);
            rect.anchoredPosition = anchoredPosition;
            rect.sizeDelta = sizeDelta;
            var image = gameObject.AddComponent<Image>();
            image.color = color;
            return gameObject;
        }

        private static Text CreateText(
            string name,
            Transform parent,
            Font font,
            string value,
            int size,
            FontStyle style,
            Color color,
            Vector2 anchoredPosition,
            Vector2 sizeDelta,
            Vector2 anchor,
            TextAnchor alignment = TextAnchor.MiddleLeft)
        {
            var gameObject = CreateUiObject(name, parent);
            var rect = gameObject.GetComponent<RectTransform>();
            rect.anchorMin = anchor;
            rect.anchorMax = anchor;
            rect.pivot = anchor;
            rect.anchoredPosition = anchoredPosition;
            rect.sizeDelta = sizeDelta;
            var text = gameObject.AddComponent<Text>();
            text.font = font;
            text.text = value;
            text.fontSize = size;
            text.fontStyle = style;
            text.color = color;
            text.alignment = alignment;
            text.horizontalOverflow = HorizontalWrapMode.Wrap;
            text.verticalOverflow = VerticalWrapMode.Overflow;
            return text;
        }

        private static Text CreateTextCentered(
            Transform parent,
            Font font,
            string value,
            int size,
            Color color)
        {
            var text = CreateText(
                "Label",
                parent,
                font,
                value,
                size,
                FontStyle.Bold,
                color,
                Vector2.zero,
                Vector2.zero,
                new Vector2(0.5f, 0.5f),
                TextAnchor.MiddleCenter);
            Stretch(text.rectTransform);
            return text;
        }

        private static Button CreateButton(
            string name,
            Transform parent,
            Font font,
            string label,
            Vector2 anchoredPosition,
            Vector2 sizeDelta,
            Color color,
            Vector2 anchor,
            Color? labelColor = null)
        {
            var gameObject = CreateImage(
                name,
                parent,
                color,
                anchor,
                anchor,
                anchoredPosition,
                sizeDelta);
            var button = gameObject.AddComponent<Button>();
            var colors = button.colors;
            colors.normalColor = Color.white;
            colors.highlightedColor = new Color(1f, 1f, 1f, 0.88f);
            colors.pressedColor = new Color(0.82f, 0.92f, 1f, 0.85f);
            colors.selectedColor = Color.white;
            button.colors = colors;
            CreateTextCentered(
                gameObject.transform,
                font,
                label,
                28,
                labelColor ?? (color == Color.clear
                    ? V14Palette.MutedText
                    : V14Palette.SoftWhite));
            return button;
        }

        private static void Stretch(RectTransform rect)
        {
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;
        }

        private static void Capture(Camera camera, string outputPath, int width, int height)
        {
            var renderTexture = new RenderTexture(width, height, 24, RenderTextureFormat.ARGB32);
            var previousTarget = camera.targetTexture;
            var previousActive = RenderTexture.active;
            try
            {
                camera.targetTexture = renderTexture;
                RenderTexture.active = renderTexture;
                Canvas.ForceUpdateCanvases();
                camera.Render();
                var image = new Texture2D(width, height, TextureFormat.RGB24, false);
                image.ReadPixels(new Rect(0, 0, width, height), 0, 0);
                image.Apply();
                File.WriteAllBytes(outputPath, image.EncodeToPNG());
                UnityEngine.Object.DestroyImmediate(image);
            }
            finally
            {
                camera.targetTexture = previousTarget;
                RenderTexture.active = previousActive;
                renderTexture.Release();
                UnityEngine.Object.DestroyImmediate(renderTexture);
            }
        }

        private static (float minimum, float maximum) CalculateYRange(
            IEnumerable<Renderer> renderers)
        {
            var minimum = float.PositiveInfinity;
            var maximum = float.NegativeInfinity;
            foreach (var renderer in renderers.Where(item => item != null && item.enabled))
            {
                Mesh mesh = null;
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

            return float.IsPositiveInfinity(minimum)
                ? (0f, 0f)
                : (minimum, maximum);
        }

        private readonly struct RunClipSpec
        {
            public RunClipSpec(string name, float duration, float arm, float leg, float bob)
            {
                Name = name;
                Duration = duration;
                Arm = arm;
                Leg = leg;
                Bob = bob;
            }

            public string Name { get; }
            public float Duration { get; }
            public float Arm { get; }
            public float Leg { get; }
            public float Bob { get; }
        }
    }

    internal static class ColorExtensions
    {
        public static Color WithAlpha(this Color color, float alpha)
        {
            color.a = alpha;
            return color;
        }
    }
}
#endif
