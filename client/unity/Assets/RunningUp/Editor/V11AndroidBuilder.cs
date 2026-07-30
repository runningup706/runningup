// V11 세로 ARM64 IL2CPP 프로젝트를 smoke APK와 FULL_SIDELOAD APK로 재현 가능하게 빌드한다.
#if UNITY_EDITOR
using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace RunningUp.Editor
{
    public static class V11AndroidBuilder
    {
        private const string FunctionalPrototypeScenePath =
            "Assets/RunningUp/Scenes/LiveJourneyHome.unity";

        public static void BuildSmoke()
        {
            Build(
                "RunningUp-V11-SMOKE.apk",
                BuildOptions.Development | BuildOptions.AllowDebugging,
                FunctionalPrototypeScenePath,
                true);
        }

        public static void BuildFullSideload()
        {
            V11ProductionArtGate.ValidateOrThrow();
            Build(
                "RunningUp-V11-FULL_SIDELOAD.apk",
                BuildOptions.None,
                V11ProductionArtGate.GetProductionScenePath(),
                false);
        }

        private static void Build(
            string fileName,
            BuildOptions options,
            string scenePath,
            bool buildFunctionalPrototype)
        {
            if (buildFunctionalPrototype)
            {
                V11ProjectBuilder.BuildAll();
            }

            EditorUserBuildSettings.SwitchActiveBuildTarget(
                BuildTargetGroup.Android,
                BuildTarget.Android);
            EditorUserBuildSettings.buildAppBundle = false;
            PlayerSettings.Android.useCustomKeystore = false;
            PlayerSettings.Android.bundleVersionCode = 110000;
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

            var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
            {
                scenes = new[] { scenePath },
                locationPathName = outputPath,
                target = BuildTarget.Android,
                targetGroup = BuildTargetGroup.Android,
                options = options | BuildOptions.CleanBuildCache,
            });
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
                    $"V11 Android build failed: {summary.result} " +
                    $"errors={summary.totalErrors}\n{string.Join("\n", messages)}");
            }

            var size = new FileInfo(outputPath).Length;
            if (size < 10 * 1024 * 1024)
            {
                throw new InvalidOperationException(
                    $"V11 APK is unexpectedly small: {size} bytes");
            }

            Debug.Log(
                $"RUNNINGUP_V11_ANDROID_BUILD_PASS file={fileName} " +
                $"bytes={size} warnings={summary.totalWarnings}");
        }
    }
}
#endif
