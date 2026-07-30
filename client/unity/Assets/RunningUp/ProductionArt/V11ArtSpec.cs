// 인입된 Production Art 자산이 VISUAL_DIRECTION_LOCK을 충족하는지 판정한다.
//
// 이 파일은 UnityEngine을 참조하지 않는다. Unity Editor가 없는 환경에서도
// client/dotnet/RunningUp.V11.Domain.Tests가 그대로 컴파일해 검증하기 때문이다.
// Editor 쪽 V11ProductionArtGate는 실제 mesh/rig에서 수치를 읽어 여기에 넘긴다.
//
// 목적은 "왜 막혔는지"를 정확히 말해 주는 것이다. BLOCKED_ART_ASSET 한 줄로는
// 무엇을 더 사면 되는지, 무료 자산이 어디서 모자라는지 알 수 없다.
using System;
using System.Collections.Generic;
using System.Globalization;

namespace RunningUp.ProductionArt
{
    /// <summary>Live Journey Home이 요구하는 최소 러닝 상태 집합이다.</summary>
    public static class V11MotionSet
    {
        public static readonly string[] Required =
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
    }

    /// <summary>Editor가 실제 자산에서 읽어 채우는 측정값이다.</summary>
    public sealed class RunnerAssetMeasurement
    {
        public string AssetId = string.Empty;
        public double TotalHeightUnits;
        public double HeadHeightUnits;
        public int HighLodTriangles;
        public int MidLodTriangles;
        public int LowLodTriangles;
        public int Bones;
        public int BlendShapes;
        public int MaterialSlots;
        public bool HasValidHumanoidAvatar;
        public List<string> MotionClipIds = new();
        public List<string> SeparateMeshParts = new();
        public bool UsesPrimitiveOrGeneratedMesh;
    }

    public sealed class ArtRequirementResult
    {
        public string Requirement = string.Empty;
        public bool Satisfied;
        public string Actual = string.Empty;
        public string Expected = string.Empty;
        /// <summary>무료 자산으로 채울 수 있는지에 대한 사실 기록이다.</summary>
        public string Remedy = string.Empty;
    }

    public sealed class ArtVerdict
    {
        public string AssetId = string.Empty;
        public List<ArtRequirementResult> Requirements = new();
        public bool Passed;
        public int UnsatisfiedCount;
        public string Status = string.Empty;
    }

    public static class V11ArtSpec
    {
        // VISUAL_DIRECTION_LOCK_V11.yaml: character_ratio_heads [3.0, 3.25]
        public const double MinHeadRatio = 3.0;
        public const double MaxHeadRatio = 3.25;

        // V11_CHIBI_3D_ART_BIBLE.md 의 모바일 예산.
        public const int MinHighLodTriangles = 25_000;
        public const int MaxHighLodTriangles = 40_000;
        public const int MinMidLodTriangles = 12_000;
        public const int MaxMidLodTriangles = 22_000;
        public const int MinLowLodTriangles = 5_000;
        public const int MaxLowLodTriangles = 10_000;
        public const int MinBones = 45;
        public const int MaxBones = 65;
        public const int MinBlendShapes = 12;
        public const int MaxMaterialSlots = 4;

        /// <summary>아트 바이블이 별도 mesh로 요구하는 부위다.</summary>
        public static readonly string[] RequiredMeshParts =
        {
            "top", "bottom", "socks", "shoes", "watch", "headwear",
        };

        public static ArtVerdict Evaluate(RunnerAssetMeasurement measurement)
        {
            if (measurement == null)
            {
                throw new ArgumentNullException(nameof(measurement));
            }

            var verdict = new ArtVerdict { AssetId = measurement.AssetId };

            var ratio = measurement.HeadHeightUnits <= 0
                ? 0
                : measurement.TotalHeightUnits / measurement.HeadHeightUnits;
            Add(verdict, "head_ratio",
                ratio >= MinHeadRatio && ratio <= MaxHeadRatio,
                ratio.ToString("0.00", CultureInfo.InvariantCulture),
                $"{MinHeadRatio:0.00}–{MaxHeadRatio:0.00} heads",
                "무료 자산 대부분이 여기서 걸린다. 리깅된 원본을 비율만 바꾸면 얼굴이 뭉개지므로, 3등신으로 설계된 원본이 필요하다.");

            Add(verdict, "high_lod_triangles",
                InRange(measurement.HighLodTriangles, MinHighLodTriangles, MaxHighLodTriangles),
                measurement.HighLodTriangles.ToString(CultureInfo.InvariantCulture),
                $"{MinHighLodTriangles}–{MaxHighLodTriangles}",
                "폴리곤이 모자라면 저폴리 자산이고, 넘치면 저사양 30fps 예산을 깬다.");

            Add(verdict, "mid_lod_triangles",
                InRange(measurement.MidLodTriangles, MinMidLodTriangles, MaxMidLodTriangles),
                measurement.MidLodTriangles.ToString(CultureInfo.InvariantCulture),
                $"{MinMidLodTriangles}–{MaxMidLodTriangles}",
                "LOD는 원본이 없어도 Unity에서 생성할 수 있다.");

            Add(verdict, "low_lod_triangles",
                InRange(measurement.LowLodTriangles, MinLowLodTriangles, MaxLowLodTriangles),
                measurement.LowLodTriangles.ToString(CultureInfo.InvariantCulture),
                $"{MinLowLodTriangles}–{MaxLowLodTriangles}",
                "Pacer 군집을 그리려면 반드시 필요하다.");

            Add(verdict, "bone_count",
                InRange(measurement.Bones, MinBones, MaxBones),
                measurement.Bones.ToString(CultureInfo.InvariantCulture),
                $"{MinBones}–{MaxBones}",
                "Humanoid 리그면 대개 충족한다.");

            Add(verdict, "expression_blend_shapes",
                measurement.BlendShapes >= MinBlendShapes,
                measurement.BlendShapes.ToString(CultureInfo.InvariantCulture),
                $"at least {MinBlendShapes}",
                "표정 blend shape가 없는 무료 자산이 많다. 이건 사후 생성이 사실상 불가능하다.");

            Add(verdict, "material_slots",
                measurement.MaterialSlots > 0 && measurement.MaterialSlots <= MaxMaterialSlots,
                measurement.MaterialSlots.ToString(CultureInfo.InvariantCulture),
                $"1–{MaxMaterialSlots}",
                "아틀라스로 합치면 해결된다.");

            Add(verdict, "humanoid_avatar",
                measurement.HasValidHumanoidAvatar,
                measurement.HasValidHumanoidAvatar ? "valid" : "missing",
                "valid Humanoid avatar",
                "Humanoid가 아니면 Mixamo 모션을 리타깃할 수 없다.");

            var missingMotions = MissingMotions(measurement.MotionClipIds);
            Add(verdict, "running_motion_set",
                missingMotions.Count == 0,
                $"{V11MotionSet.Required.Length - missingMotions.Count}/{V11MotionSet.Required.Length}",
                $"all {V11MotionSet.Required.Length} states",
                missingMotions.Count == 0
                    ? "충족했다."
                    : $"부족: {string.Join(", ", missingMotions)}. Mixamo에서 무료로 받아 채울 수 있는 항목이다.");

            var missingParts = MissingMeshParts(measurement.SeparateMeshParts);
            Add(verdict, "separate_garment_meshes",
                missingParts.Count == 0,
                $"{RequiredMeshParts.Length - missingParts.Count}/{RequiredMeshParts.Length}",
                "top, bottom, socks, shoes, watch, headwear",
                missingParts.Count == 0
                    ? "충족했다."
                    : $"부족: {string.Join(", ", missingParts)}. 장비 192종이 3D에 반영되려면 부위가 분리돼 있어야 한다.");

            // 이건 완화 대상이 아니다. primitive를 확장해 정식 아트로 만들지 않는다.
            Add(verdict, "no_primitive_or_generated_mesh",
                !measurement.UsesPrimitiveOrGeneratedMesh,
                measurement.UsesPrimitiveOrGeneratedMesh ? "present" : "none",
                "none",
                "ChibiMeshFactory와 Assets/RunningUp/Generated는 기능 프로토타입 전용이다.");

            verdict.UnsatisfiedCount = 0;
            foreach (var requirement in verdict.Requirements)
            {
                if (!requirement.Satisfied)
                {
                    verdict.UnsatisfiedCount++;
                }
            }

            verdict.Passed = verdict.UnsatisfiedCount == 0;
            verdict.Status = verdict.Passed
                ? "ART_ASSET_MEETS_DIRECTION_LOCK"
                : "BLOCKED_ART_ASSET";
            return verdict;
        }

        public static List<string> MissingMotions(IEnumerable<string> clipIds)
        {
            var present = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var id in clipIds ?? Array.Empty<string>())
            {
                if (!string.IsNullOrWhiteSpace(id))
                {
                    present.Add(id.Trim());
                }
            }

            var missing = new List<string>();
            foreach (var required in V11MotionSet.Required)
            {
                if (!present.Contains(required))
                {
                    missing.Add(required);
                }
            }

            return missing;
        }

        public static List<string> MissingMeshParts(IEnumerable<string> parts)
        {
            var present = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var part in parts ?? Array.Empty<string>())
            {
                if (!string.IsNullOrWhiteSpace(part))
                {
                    present.Add(part.Trim());
                }
            }

            var missing = new List<string>();
            foreach (var required in RequiredMeshParts)
            {
                if (!present.Contains(required))
                {
                    missing.Add(required);
                }
            }

            return missing;
        }

        /// <summary>
        /// 카메라 프레이밍은 자산과 무관하게 레이아웃 계약이 정한다.
        /// 러너가 화면 높이에서 차지해야 할 비율로부터 필요한 수직 FOV를 구한다.
        /// </summary>
        public static double VerticalFieldOfViewDegrees(
            double runnerWorldHeight,
            double runnerScreenHeightPercent,
            double cameraDistance)
        {
            if (runnerWorldHeight <= 0 ||
                cameraDistance <= 0 ||
                runnerScreenHeightPercent <= 0 ||
                runnerScreenHeightPercent > 100)
            {
                throw new ArgumentOutOfRangeException(nameof(runnerScreenHeightPercent));
            }

            // 러너가 화면의 p%를 채우려면 화면 전체 높이는 러너 높이의 100/p 배다.
            var visibleWorldHeight = runnerWorldHeight * (100.0 / runnerScreenHeightPercent);
            var radians = 2.0 * Math.Atan((visibleWorldHeight / 2.0) / cameraDistance);
            return radians * (180.0 / Math.PI);
        }

        private static bool InRange(int value, int minimum, int maximum) =>
            value >= minimum && value <= maximum;

        private static void Add(
            ArtVerdict verdict,
            string requirement,
            bool satisfied,
            string actual,
            string expected,
            string remedy) =>
            verdict.Requirements.Add(new ArtRequirementResult
            {
                Requirement = requirement,
                Satisfied = satisfied,
                Actual = actual,
                Expected = expected,
                Remedy = remedy,
            });
    }
}
