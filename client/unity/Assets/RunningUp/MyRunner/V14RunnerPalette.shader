// 기능 프로토타입의 CC0 atlas를 URP에서 보이게 유지하되 정식 캐릭터 재질로 판정하지 않는다.
Shader "RunningUp/V14 Runner Palette"
{
    Properties
    {
        _MainTex ("Atlas", 2D) = "white" {}
        _Color ("Tint", Color) = (1, 1, 1, 1)
        _Mint ("Mint", Color) = (0.35, 0.94, 0.76, 1)
        _Navy ("Navy", Color) = (0.025, 0.09, 0.16, 1)
        _Coral ("Coral", Color) = (1, 0.45, 0.38, 1)
        _Smoothness ("Smoothness", Range(0, 1)) = 0.36
        _FootwearMode ("Footwear Mode", Range(0, 1)) = 0
    }

    SubShader
    {
        Tags
        {
            "RenderType" = "Opaque"
            "Queue" = "Geometry"
            "RenderPipeline" = "UniversalPipeline"
        }
        LOD 250

        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode" = "UniversalForward" }

            HLSLPROGRAM
            #pragma target 3.0
            #pragma vertex Vertex
            #pragma fragment Fragment
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS_CASCADE
            #pragma multi_compile_fragment _ _SHADOWS_SOFT
            #pragma multi_compile_fog

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

            TEXTURE2D(_MainTex);
            SAMPLER(sampler_MainTex);

            CBUFFER_START(UnityPerMaterial)
                float4 _MainTex_ST;
                float4 _Color;
                float4 _Mint;
                float4 _Navy;
                float4 _Coral;
                float _Smoothness;
                float _FootwearMode;
            CBUFFER_END

            struct Attributes
            {
                float4 positionOS : POSITION;
                float3 normalOS : NORMAL;
                float2 uv : TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float3 normalWS : TEXCOORD0;
                float3 positionWS : TEXCOORD1;
                float2 uv : TEXCOORD2;
                float4 shadowCoord : TEXCOORD3;
                float fogFactor : TEXCOORD4;
            };

            Varyings Vertex(Attributes input)
            {
                Varyings output;
                VertexPositionInputs position = GetVertexPositionInputs(input.positionOS.xyz);
                VertexNormalInputs normal = GetVertexNormalInputs(input.normalOS);
                output.positionCS = position.positionCS;
                output.positionWS = position.positionWS;
                output.normalWS = normal.normalWS;
                output.uv = TRANSFORM_TEX(input.uv, _MainTex);
                output.shadowCoord = GetShadowCoord(position);
                output.fogFactor = ComputeFogFactor(position.positionCS.z);
                return output;
            }

            float4 Fragment(Varyings input) : SV_Target
            {
                float4 source =
                    SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv) * _Color;
                float brightness =
                    dot(source.rgb, float3(0.2126, 0.7152, 0.0722));
                float greenDominance =
                    step(source.r * 1.04, source.g) *
                    step(source.b * 1.05, source.g) *
                    step(0.16, source.g);
                float3 runningColor = lerp(
                    _Navy.rgb,
                    _Mint.rgb,
                    smoothstep(0.26, 0.70, brightness));
                float accentBand =
                    greenDominance *
                    smoothstep(0.69, 0.82, source.g) *
                    step(source.r, 0.48);
                float3 paletteColor = lerp(
                    source.rgb,
                    runningColor,
                    greenDominance * 0.96);
                paletteColor = lerp(
                    paletteColor,
                    _Coral.rgb,
                    accentBand * 0.26);
                float darkLeather =
                    _FootwearMode *
                    step(source.g * 1.08, source.r) *
                    step(source.b * 1.08, source.r) *
                    (1.0 - smoothstep(0.48, 0.64, brightness));
                float3 footwearColor = lerp(
                    _Navy.rgb,
                    _Mint.rgb,
                    smoothstep(0.15, 0.44, brightness));
                paletteColor = lerp(
                    paletteColor,
                    footwearColor,
                    darkLeather * 0.94);

                float3 normal = normalize(input.normalWS);
                Light mainLight = GetMainLight(input.shadowCoord);
                float lightRamp = smoothstep(
                    0.32,
                    0.58,
                    saturate(dot(normal, mainLight.direction)));
                float3 ambient = max(SampleSH(normal), float3(0.16, 0.16, 0.16));
                float3 lit =
                    ambient +
                    mainLight.color *
                    lerp(0.38, 1.0, lightRamp) *
                    mainLight.shadowAttenuation;
                float3 finalColor = MixFog(
                    paletteColor * lit,
                    input.fogFactor);
                return float4(finalColor, source.a);
            }
            ENDHLSL
        }

        UsePass "Universal Render Pipeline/Lit/ShadowCaster"
        UsePass "Universal Render Pipeline/Lit/DepthOnly"
    }

    FallBack Off
}
