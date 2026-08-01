// V14 세로 ARM64 IL2CPP 프로젝트를 smoke APK와 FULL_SIDELOAD APK로 재현 가능하게 빌드한다.
#if UNITY_EDITOR
using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace RunningUp.Editor
{
    public static class V14AndroidBuilder
    {
        private const string FunctionalPrototypeScenePath =
            "Assets/RunningUp/Scenes/LiveJourneyHome.unity";

        public static void BuildSmoke()
        {
            Build(
                "RunningUp-V14-SMOKE.apk",
                BuildOptions.Development | BuildOptions.AllowDebugging,
                FunctionalPrototypeScenePath,
                true);
        }

        public static void BuildPlayableVisualPreview()
        {
            V14ProjectBuilder.BuildAll();
            V14VisualSliceBuilder.BuildAndCapture();
            Build(
                "RunningUp-V14-PLAYABLE-PREVIEW.apk",
                BuildOptions.Development | BuildOptions.AllowDebugging,
                V14VisualSliceBuilder.ScenePath,
                false);
        }

        public static void BuildV14Development()
        {
            V14VisualSliceBuilder.BuildAndCapture();
            Build(
                "RunningUp-V14-DEVELOPMENT.apk",
                BuildOptions.Development | BuildOptions.AllowDebugging,
                V14VisualSliceBuilder.ScenePath,
                false,
                "14.0.2",
                140002,
                true);
        }

        public static void BuildFullSideload()
        {
            V14ProductionArtGate.ValidateOrThrow();
            Build(
                "RunningUp-V14-FULL_SIDELOAD.apk",
                BuildOptions.None,
                V14ProductionArtGate.GetProductionScenePath(),
                false);
        }

        private static void Build(
            string fileName,
            BuildOptions options,
            string scenePath,
            bool buildFunctionalPrototype,
            string versionName = "14.0.3",
            int versionCode = 140003,
            bool allowLocalDevelopmentHttp = false)
        {
            if (buildFunctionalPrototype)
            {
                V14ProjectBuilder.BuildAll();
            }

            EditorUserBuildSettings.SwitchActiveBuildTarget(
                BuildTargetGroup.Android,
                BuildTarget.Android);
            EditorUserBuildSettings.buildAppBundle = false;
            PlayerSettings.Android.useCustomKeystore = false;
            PlayerSettings.bundleVersion = versionName;
            PlayerSettings.Android.bundleVersionCode = versionCode;
            PlayerSettings.stripEngineCode = true;

            var repository = Path.GetFullPath(
                Path.Combine(Application.dataPath, "../../.."));
            var outputDirectory = Path.Combine(repository, "artifacts/builds");
            Directory.CreateDirectory(outputDirectory);
            var outputPath = Path.Combine(outputDirectory, fileName);
            if (File.Exists(outputPath))
            {
                File.Delete(outputPath);
            }

            var previousInsecureHttpOption = PlayerSettings.insecureHttpOption;
            BuildReport report;
            try
            {
                PlayerSettings.insecureHttpOption = allowLocalDevelopmentHttp
                    ? InsecureHttpOption.DevelopmentOnly
                    : InsecureHttpOption.NotAllowed;
                report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
                {
                    scenes = new[] { scenePath },
                    locationPathName = outputPath,
                    target = BuildTarget.Android,
                    targetGroup = BuildTargetGroup.Android,
                    // 개발 APK는 빠른 반복을 위해 증분 빌드를 유지하고 release만 stale cache를 비운다.
                    options = options | (options.HasFlag(BuildOptions.Development)
                        ? BuildOptions.None
                        : BuildOptions.CleanBuildCache),
                });
            }
            finally
            {
                PlayerSettings.insecureHttpOption = previousInsecureHttpOption;
            }
            var summary = report.summary;
            if (summary.result != BuildResult.Succeeded ||
                summary.totalErrors > 0 ||
                !File.Exists(outputPath))
            {
                var messages = report.steps
                    .SelectMany(step => step.messages)
                    .Where(message => message.type == LogType.Error ||
                        message.type == LogType.Exception)
                    .Select(message => message.content)
                    .Take(12);
                throw new InvalidOperationException(
                    $"V14 Android build failed: {summary.result} " +
                    $"errors={summary.totalErrors}\n{string.Join("\n", messages)}");
            }

            var size = new FileInfo(outputPath).Length;
            if (size < 10 * 1024 * 1024)
            {
                throw new InvalidOperationException(
                    $"V14 APK is unexpectedly small: {size} bytes");
            }

            Debug.Log(
                $"RUNNINGUP_V14_ANDROID_BUILD_PASS file={fileName} " +
                $"bytes={size} warnings={summary.totalWarnings}");
        }
    }
}
#endif
