// 목표 이미지의 자산을 분리된 Unity UI 레이어로 조립하고 실제 1080x1920 캡처를 만든다.
#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.IO;
using RunningUp.ProductionArt;
using RunningUp.RunVerification;
using RunningUp.V14;
using RunningUp.V14.Backend;
using RunningUp.V14.UI;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.Rendering;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

namespace RunningUp.Editor
{
    public static class V11VisualSliceBuilder
    {
        public const string ScenePath =
            "Assets/RunningUp/ProductionArt/Scenes/LiveJourneyVisualSlice.unity";

        private const string AssetRoot =
            "Assets/RunningUp/ProductionArt/VisualSliceAssets";
        private static readonly Color DeepNavy = new(0.025f, 0.105f, 0.20f, 0.96f);
        private static readonly Color Navy = new(0.04f, 0.16f, 0.29f, 0.94f);
        private static readonly Color Sky = new(0.06f, 0.58f, 0.98f, 1f);
        private static readonly Color Mint = new(0.18f, 0.95f, 0.76f, 1f);
        private static readonly Color SoftWhite = new(0.95f, 0.98f, 1f, 1f);
        private static readonly Color Muted = new(0.72f, 0.82f, 0.91f, 1f);

        [MenuItem("RunningUp V11/Visual Slice/Build and Capture")]
        public static void BuildAndCapture()
        {
            ConfigureTextureImports();
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            scene.name = "LiveJourneyVisualSlice";

            var cameraObject = new GameObject("VisualSliceCamera");
            cameraObject.tag = "MainCamera";
            var camera = cameraObject.AddComponent<Camera>();
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = DeepNavy;
            camera.orthographic = true;
            camera.orthographicSize = 5f;
            camera.nearClipPlane = 0.01f;
            camera.farClipPlane = 100f;
            camera.transform.position = new Vector3(0f, 0f, -10f);

            var canvasObject = new GameObject(
                "LiveJourneyCanvas",
                typeof(RectTransform),
                typeof(Canvas),
                typeof(CanvasScaler),
                typeof(GraphicRaycaster));
            var canvas = canvasObject.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceCamera;
            canvas.worldCamera = camera;
            canvas.planeDistance = 1f;
            var scaler = canvasObject.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080f, 1920f);
            scaler.screenMatchMode = CanvasScaler.ScreenMatchMode.MatchWidthOrHeight;
            scaler.matchWidthOrHeight = 0f;

            CreateEventSystem();
            var font = AssetDatabase.LoadAssetAtPath<Font>(
                "Assets/RunningUp/Fonts/NotoSansKR-V11.ttf");
            if (font == null)
            {
                throw new InvalidOperationException("V11 font missing");
            }

            var backdropObject = new GameObject(
                "ApprovedJourneyBackdrop",
                typeof(RectTransform));
            backdropObject.transform.SetParent(canvasObject.transform, false);
            Stretch(backdropObject.GetComponent<RectTransform>());
            var backdrop = backdropObject.transform;

            var approvedHomeObject = new GameObject(
                "ApprovedLiveJourneyHome",
                typeof(RectTransform));
            approvedHomeObject.transform.SetParent(canvasObject.transform, false);
            Stretch(approvedHomeObject.GetComponent<RectTransform>());
            var approvedHome = approvedHomeObject.transform;

            var far = CreateSpriteImage(
                "FarCity",
                backdrop,
                $"{AssetRoot}/FarCityBackground.png",
                Vector2.zero,
                Vector2.one,
                Vector2.zero,
                Vector2.zero);
            Stretch(far.rectTransform);

            var shadow = CreatePanel(
                "HeroContactShadow",
                backdrop,
                new Color(0f, 0.03f, 0.08f, 0.36f),
                new Vector2(0.5f, 0f),
                new Vector2(0.5f, 0f),
                new Vector2(0.5f, 0.5f),
                new Vector2(0f, 405f),
                new Vector2(420f, 76f));
            shadow.sprite = AssetDatabase.GetBuiltinExtraResource<Sprite>("UI/Skin/Knob.psd");
            shadow.type = Image.Type.Sliced;

            var pacerLayerObject = new GameObject("PacerLayer", typeof(RectTransform));
            pacerLayerObject.transform.SetParent(backdrop, false);
            var pacerLayer = pacerLayerObject.GetComponent<RectTransform>();
            pacerLayer.anchorMin = new Vector2(0.5f, 0f);
            pacerLayer.anchorMax = new Vector2(0.5f, 0f);
            pacerLayer.pivot = new Vector2(0.5f, 0f);
            pacerLayer.anchoredPosition = Vector2.zero;
            pacerLayer.sizeDelta = new Vector2(1080f, 1200f);

            CreatePacer(
                "PacerGreen",
                pacerLayer,
                $"{AssetRoot}/PacerGreen.png",
                new Vector2(-335f, 400f),
                new Vector2(250f, 540f));
            CreatePacer(
                "PacerGray",
                pacerLayer,
                $"{AssetRoot}/PacerGray.png",
                new Vector2(-145f, 520f),
                new Vector2(170f, 395f));
            CreatePacer(
                "PacerCap",
                pacerLayer,
                $"{AssetRoot}/PacerCap.png",
                new Vector2(165f, 510f),
                new Vector2(225f, 455f));
            CreatePacer(
                "PacerOrange",
                pacerLayer,
                $"{AssetRoot}/PacerOrange.png",
                new Vector2(320f, 420f),
                new Vector2(255f, 560f));

            var hero = CreateSpriteImage(
                "MyRunnerHero",
                backdrop,
                $"{AssetRoot}/MyRunnerHero.png",
                new Vector2(0.5f, 0f),
                new Vector2(0.5f, 0f),
                new Vector2(0f, 370f),
                new Vector2(410f, 900f));
            hero.rectTransform.pivot = new Vector2(0.5f, 0f);

            var hudLabels = BuildTopBar(approvedHome, font);
            var journeyCard = BuildRouteCard(approvedHome, font);
            var syncButton = CreateButton(
                "ApprovedSyncRun",
                approvedHome,
                font,
                "SYNC RUN",
                new Vector2(304f, -510f),
                new Vector2(252f, 76f),
                new Color(0.035f, 0.19f, 0.34f, 0.96f),
                new Vector2(0.5f, 1f),
                28);
            var telemetry = BuildTelemetry(approvedHome, font);
            var (buttons, activeLabel) = BuildBottomNavigation(approvedHome, font);
            var settingsButton = CreateHotspotButton(
                "ApprovedSettings",
                approvedHome,
                new Vector2(-34f, -25f),
                new Vector2(105f, 92f),
                new Vector2(1f, 1f));

            var runtime = backdropObject.AddComponent<V11VisualSliceRuntime>();
            runtime.Configure(
                hero.rectTransform,
                pacerLayer,
                far.rectTransform,
                null,
                null,
                buttons,
                activeLabel);
            AttachV14Runtime(
                canvasObject,
                backdropObject,
                approvedHomeObject,
                buttons,
                settingsButton,
                journeyCard.button,
                syncButton,
                hudLabels.profile,
                hudLabels.energy,
                hudLabels.coins,
                hudLabels.gems,
                journeyCard.progress,
                telemetry.monthly,
                telemetry.checkpoint,
                telemetry.coach,
                font);

            Directory.CreateDirectory(Path.GetDirectoryName(ScenePath) ?? string.Empty);
            EditorSceneManager.SaveScene(scene, ScenePath);
            EditorBuildSettings.scenes = MergeBuildScenes(
                ScenePath,
                "Assets/RunningUp/Scenes/LiveJourneyHome.unity");

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Single);
            var captureCamera = UnityEngine.Object.FindFirstObjectByType<Camera>();
            if (captureCamera == null)
            {
                throw new InvalidOperationException("Visual Slice capture camera missing");
            }

            var repository = Path.GetFullPath(Path.Combine(Application.dataPath, "../../.."));
            var outputDirectory = Path.Combine(
                repository,
                "artifacts/visual/production-art/iterations");
            Directory.CreateDirectory(outputDirectory);
            var outputPath = Path.Combine(
                outputDirectory,
                "visual-slice-iteration-10-responsive-hud-1080x1920.png");
            Capture(captureCamera, outputPath, 1080, 1920);
            Debug.Log($"RUNNINGUP_V11_VISUAL_SLICE_CAPTURE_PASS path={outputPath}");
        }

        private static (Text profile, Text energy, Text coins, Text gems) BuildTopBar(
            Transform parent,
            Font font)
        {
            CreateSpriteImage(
                "TopStatusBarTarget",
                parent,
                $"{AssetRoot}/TopHudTarget.png",
                new Vector2(0.5f, 1f),
                new Vector2(0.5f, 1f),
                new Vector2(0f, -70f),
                new Vector2(1008f, 80f));
            var profileLabel = CreateText(
                "ApprovedProfile",
                parent,
                font,
                "LV 18",
                16,
                FontStyle.Bold,
                SoftWhite,
                new Vector2(-166f, -70f),
                new Vector2(104f, 44f),
                new Vector2(0.5f, 1f),
                TextAnchor.MiddleCenter);
            profileLabel.gameObject.SetActive(false);
            // 정적인 목표 자산의 수치를 완전히 가리고 런타임 계정 값만 표시한다.
            var energyCover = CreateOpaqueHudValueCover(
                "EnergyValueCover",
                parent,
                new Vector2(-24f, -70f),
                new Vector2(116f, 50f));
            var energyLabel = CreateText(
                "ApprovedEnergy",
                energyCover.transform,
                font,
                "--/--",
                15,
                FontStyle.Bold,
                SoftWhite,
                Vector2.zero,
                Vector2.zero,
                new Vector2(0.5f, 0.5f),
                TextAnchor.MiddleCenter);
            Stretch(energyLabel.rectTransform);
            energyCover.gameObject.SetActive(false);

            var coinCover = CreateOpaqueHudValueCover(
                "CoinValueCover",
                parent,
                new Vector2(160f, -70f),
                new Vector2(160f, 50f));
            var coinLabel = CreateText(
                "ApprovedCoins",
                coinCover.transform,
                font,
                "12,345,678",
                13,
                FontStyle.Bold,
                SoftWhite,
                Vector2.zero,
                Vector2.zero,
                new Vector2(0.5f, 0.5f),
                TextAnchor.MiddleCenter);
            Stretch(coinLabel.rectTransform);
            coinCover.gameObject.SetActive(false);
            var gemCover = CreateOpaqueHudValueCover(
                "GemValueCover",
                parent,
                new Vector2(330f, -70f),
                new Vector2(120f, 50f));
            var gemLabel = CreateText(
                "ApprovedGems",
                gemCover.transform,
                font,
                "8,765",
                15,
                FontStyle.Bold,
                SoftWhite,
                Vector2.zero,
                Vector2.zero,
                new Vector2(0.5f, 0.5f),
                TextAnchor.MiddleCenter);
            Stretch(gemLabel.rectTransform);
            gemCover.gameObject.SetActive(false);
            return (profileLabel, energyLabel, coinLabel, gemLabel);
        }

        private static RawImage CreateOpaqueHudValueCover(
            string name,
            Transform parent,
            Vector2 anchoredPosition,
            Vector2 sizeDelta)
        {
            var gameObject = new GameObject(name, typeof(RectTransform), typeof(CanvasRenderer));
            gameObject.transform.SetParent(parent, false);
            var rect = gameObject.GetComponent<RectTransform>();
            rect.anchorMin = new Vector2(0.5f, 1f);
            rect.anchorMax = new Vector2(0.5f, 1f);
            rect.pivot = new Vector2(0.5f, 0.5f);
            rect.anchoredPosition = anchoredPosition;
            rect.sizeDelta = sizeDelta;
            var cover = gameObject.AddComponent<RawImage>();
            cover.texture = Texture2D.whiteTexture;
            cover.color = new Color(Navy.r, Navy.g, Navy.b, 1f);
            cover.raycastTarget = false;
            var outline = cover.gameObject.AddComponent<Outline>();
            outline.effectColor = new Color(0.16f, 0.58f, 0.92f, 0.40f);
            outline.effectDistance = new Vector2(1f, -1f);
            return cover;
        }

        private static (Button button, Text progress) BuildRouteCard(
            Transform parent,
            Font font)
        {
            var card = CreateSpriteImage(
                "RouteCardTarget",
                parent,
                $"{AssetRoot}/RouteHudTarget.png",
                new Vector2(0.5f, 1f),
                new Vector2(0.5f, 1f),
                new Vector2(0f, -256f),
                new Vector2(840f, 216f));
            // 목표 카드 원본에 포함된 예시 거리를 가리고 서버 진행도로 대체한다.
            var progressCover = CreateOpaqueHudValueCover(
                "JourneyProgressValueCover",
                card.transform,
                new Vector2(96f, -56f),
                new Vector2(380f, 52f));
            // 카드 중앙을 기준으로 예시 거리 문구 자리만 덮어 원본 카드의 핀과 진행 막대는 보존한다.
            var progressCoverRect = progressCover.rectTransform;
            progressCoverRect.anchorMin = new Vector2(0.5f, 0.5f);
            progressCoverRect.anchorMax = new Vector2(0.5f, 0.5f);
            progressCoverRect.pivot = new Vector2(0.5f, 0.5f);
            progressCover.color = new Color(0.032f, 0.145f, 0.245f, 1f);
            var progressOutline = progressCover.GetComponent<Outline>();
            if (progressOutline != null)
            {
                UnityEngine.Object.DestroyImmediate(progressOutline);
            }
            var progress = CreateText(
                "ApprovedJourneyProgress",
                progressCover.transform,
                font,
                "-- km / -- km",
                20,
                FontStyle.Bold,
                SoftWhite,
                Vector2.zero,
                Vector2.zero,
                new Vector2(0.5f, 0.5f),
                TextAnchor.MiddleCenter);
            Stretch(progress.rectTransform);
            progressCover.gameObject.SetActive(false);
            var button = CreateHotspotButton(
                "ApprovedJourney",
                card.transform,
                new Vector2(420f, 0f),
                new Vector2(840f, 216f));
            return (button, progress);
        }

        private static void AttachV14Runtime(
            GameObject canvasObject,
            GameObject backdrop,
            GameObject approvedHome,
            IEnumerable<Button> navigation,
            Button settingsButton,
            Button journeyButton,
            Button syncButton,
            Text profileLabel,
            Text energyLabel,
            Text coinLabel,
            Text gemLabel,
            Text journeyProgressLabel,
            Text monthlyLabel,
            Text checkpointLabel,
            Text coachLabel,
            Font font)
        {
            var runtimeObject = new GameObject("V14Runtime");
            runtimeObject.AddComponent<V11RunRuntime>();
            var config = runtimeObject.AddComponent<V11SupabaseRuntimeConfig>();
            config.Configure(
                Environment.GetEnvironmentVariable("RUNNINGUP_SUPABASE_URL"),
                Environment.GetEnvironmentVariable(
                    "RUNNINGUP_SUPABASE_PUBLISHABLE_KEY"));
            runtimeObject.AddComponent<V11SupabaseSessionRuntime>();
            runtimeObject.AddComponent<V11VerifiedRunUploader>();
            var bridge = runtimeObject.AddComponent<V11AndroidRunBridge>();
            runtimeObject.AddComponent<V14SupabaseGateway>();
            var journey = runtimeObject.AddComponent<V14JourneyRuntime>();
            var flow = canvasObject.AddComponent<V14ScreenFlowController>();
            flow.Configure(font, journey, bridge, null);
            flow.ConfigureApprovedHome(
                backdrop,
                approvedHome,
                navigation,
                settingsButton,
                journeyButton,
                syncButton,
                profileLabel,
                energyLabel,
                coinLabel,
                gemLabel,
                journeyProgressLabel,
                monthlyLabel,
                checkpointLabel,
                coachLabel);
        }

        private static (Text monthly, Text checkpoint, Text coach) BuildTelemetry(
            Transform parent,
            Font font)
        {
            var monthly = CreateHomeInfoCard(
                "ThisMonthCard",
                parent,
                font,
                "THIS MONTH",
                "-- KM",
                -330f);
            var checkpoint = CreateHomeInfoCard(
                "NextCheckpointCard",
                parent,
                font,
                "NEXT CHECKPOINT",
                "-- KM",
                0f);
            var coach = CreateHomeInfoCard(
                "CoachPickCard",
                parent,
                font,
                "COACH PICK",
                "EASY RUN",
                330f);
            return (monthly, checkpoint, coach);
        }

        private static Text CreateHomeInfoCard(
            string name,
            Transform parent,
            Font font,
            string title,
            string value,
            float x)
        {
            var card = CreatePanel(
                name,
                parent,
                new Color(0.025f, 0.105f, 0.20f, 0.96f),
                new Vector2(0.5f, 0f),
                new Vector2(0.5f, 0f),
                new Vector2(0.5f, 0f),
                new Vector2(x, 342f),
                new Vector2(304f, 132f));
            var outline = card.gameObject.AddComponent<Outline>();
            outline.effectColor = new Color(0.12f, 0.58f, 0.92f, 0.48f);
            outline.effectDistance = new Vector2(2f, -2f);
            CreateText(
                "Title",
                card.transform,
                font,
                title,
                18,
                FontStyle.Bold,
                Muted,
                new Vector2(0f, 38f),
                new Vector2(270f, 30f),
                new Vector2(0.5f, 0.5f),
                TextAnchor.MiddleCenter);
            return CreateText(
                "Value",
                card.transform,
                font,
                value,
                32,
                FontStyle.Bold,
                SoftWhite,
                new Vector2(0f, -12f),
                new Vector2(270f, 54f),
                new Vector2(0.5f, 0.5f),
                TextAnchor.MiddleCenter);
        }

        private static (List<Button> buttons, Text activeLabel) BuildBottomNavigation(
            Transform parent,
            Font font)
        {
            var nav = CreateSpriteImage(
                "BottomNavigationTarget",
                parent,
                $"{AssetRoot}/BottomNavTarget.png",
                new Vector2(0.5f, 0f),
                new Vector2(0.5f, 0f),
                new Vector2(0f, 0f),
                new Vector2(1080f, 250f));
            nav.rectTransform.pivot = new Vector2(0.5f, 0f);
            nav.rectTransform.anchoredPosition = Vector2.zero;
            nav.raycastTarget = false;
            var labels = new[] { "HOME", "RUNNER", "RUN", "WORLD", "CREW" };
            var centers = new[] { -424f, -212f, 0f, 212f, 424f };
            var buttons = new List<Button>();
            for (var index = 0; index < labels.Length; index++)
            {
                var center = index == 2;
                var button = CreateHotspotButton(
                    $"Nav{labels[index]}",
                    parent,
                    new Vector2(centers[index], center ? 28f : 0f),
                    center ? new Vector2(224f, 176f) : new Vector2(202f, 210f),
                    new Vector2(0.5f, 0f));
                buttons.Add(button);
            }

            var active = CreateText(
                "ActiveLabel",
                parent,
                font,
                "LIVE JOURNEY",
                1,
                FontStyle.Normal,
                Color.clear,
                new Vector2(0f, -100f),
                new Vector2(1f, 1f),
                new Vector2(0.5f, 0f),
                TextAnchor.MiddleCenter);
            return (buttons, active);
        }

        private static void CreateMetric(
            Transform parent,
            Font font,
            string label,
            string value,
            float x,
            Color color)
        {
            CreateText(
                $"{label}Label",
                parent,
                font,
                label,
                20,
                FontStyle.Bold,
                Muted,
                new Vector2(x, 69f),
                new Vector2(260f, 32f),
                new Vector2(0.5f, 0f),
                TextAnchor.MiddleCenter);
            CreateText(
                $"{label}Value",
                parent,
                font,
                value,
                33,
                FontStyle.Bold,
                color,
                new Vector2(x, 18f),
                new Vector2(290f, 56f),
                new Vector2(0.5f, 0f),
                TextAnchor.MiddleCenter);
        }

        private static void ConfigureTextureImports()
        {
            var assets = new[]
            {
                "FarCityBackground.png",
                "MidCitySides.png",
                "ForegroundRoad.png",
                "PacerGroup.png",
                "PacerGreen.png",
                "PacerOrange.png",
                "PacerGray.png",
                "PacerCap.png",
                "MyRunnerHero.png",
                "TopHudTarget.png",
                "RouteHudTarget.png",
                "StatDistanceTarget.png",
                "StatPaceTarget.png",
                "StatHeartTarget.png",
                "BottomNavTarget.png",
            };
            foreach (var file in assets)
            {
                var path = $"{AssetRoot}/{file}";
                AssetDatabase.ImportAsset(path, ImportAssetOptions.ForceSynchronousImport);
                if (AssetImporter.GetAtPath(path) is not TextureImporter importer)
                {
                    throw new InvalidOperationException($"Texture importer missing: {path}");
                }

                importer.textureType = TextureImporterType.Sprite;
                importer.spriteImportMode = SpriteImportMode.Single;
                importer.alphaIsTransparency = true;
                importer.mipmapEnabled = false;
                importer.maxTextureSize = 2048;
                importer.textureCompression = TextureImporterCompression.CompressedHQ;
                importer.spritePixelsPerUnit = 100f;
                importer.SaveAndReimport();
            }
        }

        private static Image CreateSpriteImage(
            string name,
            Transform parent,
            string assetPath,
            Vector2 anchorMin,
            Vector2 anchorMax,
            Vector2 anchoredPosition,
            Vector2 sizeDelta)
        {
            var sprite = AssetDatabase.LoadAssetAtPath<Sprite>(assetPath);
            if (sprite == null)
            {
                throw new InvalidOperationException($"Sprite missing: {assetPath}");
            }

            var image = CreateImage(
                name,
                parent,
                Color.white,
                anchorMin,
                anchorMax,
                anchoredPosition,
                sizeDelta);
            image.sprite = sprite;
            image.preserveAspect = false;
            image.raycastTarget = false;
            return image;
        }

        private static void CreatePacer(
            string name,
            Transform parent,
            string assetPath,
            Vector2 anchoredPosition,
            Vector2 sizeDelta)
        {
            var image = CreateSpriteImage(
                name,
                parent,
                assetPath,
                new Vector2(0.5f, 0f),
                new Vector2(0.5f, 0f),
                anchoredPosition,
                sizeDelta);
            image.rectTransform.pivot = new Vector2(0.5f, 0f);
            image.rectTransform.anchoredPosition = anchoredPosition;
        }

        private static Image CreatePanel(
            string name,
            Transform parent,
            Color color,
            Vector2 anchorMin,
            Vector2 anchorMax,
            Vector2 pivot,
            Vector2 anchoredPosition,
            Vector2 sizeDelta)
        {
            var image = CreateImage(
                name,
                parent,
                color,
                anchorMin,
                anchorMax,
                anchoredPosition,
                sizeDelta);
            image.rectTransform.pivot = pivot;
            image.sprite = AssetDatabase.GetBuiltinExtraResource<Sprite>(
                "UI/Skin/Background.psd");
            image.type = Image.Type.Sliced;
            return image;
        }

        private static Image CreateImage(
            string name,
            Transform parent,
            Color color,
            Vector2 anchorMin,
            Vector2 anchorMax,
            Vector2 anchoredPosition,
            Vector2 sizeDelta)
        {
            var gameObject = new GameObject(name, typeof(RectTransform), typeof(CanvasRenderer));
            gameObject.transform.SetParent(parent, false);
            var rect = gameObject.GetComponent<RectTransform>();
            rect.anchorMin = anchorMin;
            rect.anchorMax = anchorMax;
            rect.pivot = new Vector2(0.5f, 0.5f);
            rect.anchoredPosition = anchoredPosition;
            rect.sizeDelta = sizeDelta;
            var image = gameObject.AddComponent<Image>();
            image.color = color;
            return image;
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
            TextAnchor alignment)
        {
            var gameObject = new GameObject(name, typeof(RectTransform), typeof(CanvasRenderer));
            gameObject.transform.SetParent(parent, false);
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
            text.horizontalOverflow = HorizontalWrapMode.Overflow;
            text.verticalOverflow = VerticalWrapMode.Overflow;
            text.raycastTarget = false;
            return text;
        }

        private static void CreateTextCentered(
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
        }

        private static Button CreateHotspotButton(
            string name,
            Transform parent,
            Vector2 anchoredPosition,
            Vector2 sizeDelta)
        {
            return CreateHotspotButton(
                name,
                parent,
                anchoredPosition,
                sizeDelta,
                Vector2.zero);
        }

        private static Button CreateHotspotButton(
            string name,
            Transform parent,
            Vector2 anchoredPosition,
            Vector2 sizeDelta,
            Vector2 anchor)
        {
            var image = CreateImage(
                name,
                parent,
                Color.clear,
                anchor,
                anchor,
                anchoredPosition,
                sizeDelta);
            image.rectTransform.pivot = anchor == Vector2.zero
                ? new Vector2(0.5f, 0f)
                : anchor;
            image.raycastTarget = true;
            var button = image.gameObject.AddComponent<Button>();
            button.targetGraphic = image;
            return button;
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
            int labelSize)
        {
            var image = CreatePanel(
                name,
                parent,
                color,
                anchor,
                anchor,
                new Vector2(0.5f, 0f),
                anchoredPosition,
                sizeDelta);
            var button = image.gameObject.AddComponent<Button>();
            button.targetGraphic = image;
            var colors = button.colors;
            colors.normalColor = Color.white;
            colors.highlightedColor = new Color(0.90f, 0.96f, 1f);
            colors.pressedColor = new Color(0.70f, 0.88f, 1f);
            colors.selectedColor = Color.white;
            button.colors = colors;
            CreateTextCentered(image.transform, font, label, labelSize, SoftWhite);
            return button;
        }

        private static void Stretch(RectTransform rect)
        {
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;
        }

        private static void CreateEventSystem()
        {
            var eventSystem = new GameObject(
                "EventSystem",
                typeof(EventSystem),
                typeof(StandaloneInputModule));
            eventSystem.transform.position = Vector3.zero;
        }

        private static EditorBuildSettingsScene[] MergeBuildScenes(params string[] paths)
        {
            var scenes = new List<EditorBuildSettingsScene>();
            foreach (var path in paths)
            {
                if (File.Exists(Path.Combine(
                        Application.dataPath,
                        path.Substring("Assets/".Length))))
                {
                    scenes.Add(new EditorBuildSettingsScene(path, true));
                }
            }

            return scenes.ToArray();
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
    }
}
#endif
