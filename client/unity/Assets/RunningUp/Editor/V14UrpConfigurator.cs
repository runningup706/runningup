// Unity 6용 URP renderer와 pipeline asset을 만들고 모든 품질 단계에 정확히 연결한다.
#if UNITY_EDITOR
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace RunningUp.Editor
{
    public static class V14UrpConfigurator
    {
        private const string SettingsRoot = "Assets/RunningUp/ProductionArt/Settings";
        private const string RendererPath =
            SettingsRoot + "/RunningUpV14UniversalRenderer.asset";
        private const string PipelinePath =
            SettingsRoot + "/RunningUpV14UniversalPipeline.asset";

        [MenuItem("RunningUp V14/Production Art/Configure Unity 6 URP")]
        public static void Configure()
        {
            EnsureFolder(SettingsRoot);
            var renderer = AssetDatabase.LoadAssetAtPath<UniversalRendererData>(
                RendererPath);
            if (renderer == null)
            {
                const string packageRenderer =
                    "Packages/com.unity.render-pipelines.universal/" +
                    "Runtime/Data/UniversalRendererData.asset";
                if (!AssetDatabase.CopyAsset(packageRenderer, RendererPath))
                {
                    throw new System.InvalidOperationException(
                        $"Could not copy official URP renderer from {packageRenderer}");
                }

                renderer = AssetDatabase.LoadAssetAtPath<UniversalRendererData>(
                    RendererPath);
            }

            var pipeline = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(
                PipelinePath);
            if (pipeline == null)
            {
                pipeline = UniversalRenderPipelineAsset.Create(renderer);
                AssetDatabase.CreateAsset(pipeline, PipelinePath);
            }

            pipeline.supportsCameraDepthTexture = true;
            pipeline.supportsCameraOpaqueTexture = true;
            pipeline.renderScale = 1f;
            pipeline.msaaSampleCount = 4;
            pipeline.maxAdditionalLightsCount = 4;
            pipeline.shadowDistance = 55f;
            pipeline.shadowCascadeCount = 2;
            var serializedPipeline = new SerializedObject(pipeline);
            serializedPipeline.FindProperty("m_MainLightRenderingMode").intValue =
                (int)LightRenderingMode.PerPixel;
            serializedPipeline.FindProperty("m_MainLightShadowsSupported").boolValue =
                true;
            serializedPipeline.FindProperty("m_AdditionalLightsRenderingMode").intValue =
                (int)LightRenderingMode.PerPixel;
            serializedPipeline.FindProperty("m_AdditionalLightShadowsSupported").boolValue =
                true;
            serializedPipeline.FindProperty("m_SoftShadowsSupported").boolValue =
                true;
            serializedPipeline.FindProperty("m_AnyShadowsSupported").boolValue =
                true;
            serializedPipeline.ApplyModifiedPropertiesWithoutUndo();

            GraphicsSettings.defaultRenderPipeline = pipeline;
            var currentQuality = QualitySettings.GetQualityLevel();
            for (var index = 0; index < QualitySettings.names.Length; index++)
            {
                QualitySettings.SetQualityLevel(index, false);
                QualitySettings.renderPipeline = pipeline;
            }

            QualitySettings.SetQualityLevel(currentQuality, false);
            EditorUtility.SetDirty(renderer);
            EditorUtility.SetDirty(pipeline);
            AssetDatabase.SaveAssets();
            Debug.Log(
                "RUNNINGUP_V14_URP_CONFIG_PASS editor=6000.3.20f1 " +
                "urp=17.3.0 shadergraph=17.3.0");
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
    }
}
#endif
