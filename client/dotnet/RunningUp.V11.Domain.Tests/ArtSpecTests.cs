// Production Art 판정 규칙을 Unity Editor 없이 실행해 검증한다.
using System;
using System.Collections.Generic;
using System.Linq;
using RunningUp.ProductionArt;

namespace RunningUp.V11.Domain.Tests
{
    internal static class ArtSpecTests
    {
        public static void Run(Action<bool, string> isTrue, Action<object, object, string> areEqual)
        {
            // 정본 요구를 전부 만족하는 자산은 통과해야 한다.
            var good = Measurement();
            var goodVerdict = V11ArtSpec.Evaluate(good);
            isTrue(goodVerdict.Passed, "a fully conforming runner asset passes the direction lock");
            areEqual("ART_ASSET_MEETS_DIRECTION_LOCK", goodVerdict.Status,
                "a conforming asset is not reported as blocked");
            areEqual(0, goodVerdict.UnsatisfiedCount, "a conforming asset has no unmet requirement");

            // 3등신이 아닌 자산 — 무료 캐릭터가 실제로 걸리는 지점이다.
            var tall = Measurement();
            tall.HeadHeightUnits = tall.TotalHeightUnits / 7.0;
            var tallVerdict = V11ArtSpec.Evaluate(tall);
            isTrue(!tallVerdict.Passed, "a seven-head character is rejected");
            isTrue(Failed(tallVerdict, "head_ratio"), "the head ratio is the requirement that fails");
            areEqual("7.00", Actual(tallVerdict, "head_ratio"),
                "the report states the measured ratio, not just a failure");

            // 경계값은 통과해야 한다. 3.0과 3.25는 lock이 허용한 값이다.
            foreach (var ratio in new[] { 3.0, 3.25 })
            {
                var edge = Measurement();
                edge.HeadHeightUnits = edge.TotalHeightUnits / ratio;
                isTrue(!Failed(V11ArtSpec.Evaluate(edge), "head_ratio"),
                    $"{ratio:0.00} heads sits inside the locked range");
            }

            var justOutside = Measurement();
            justOutside.HeadHeightUnits = justOutside.TotalHeightUnits / 3.26;
            isTrue(Failed(V11ArtSpec.Evaluate(justOutside), "head_ratio"),
                "3.26 heads is outside the locked range");

            // 표정이 없는 자산 — 사후 생성이 사실상 불가능한 항목이다.
            var expressionless = Measurement();
            expressionless.BlendShapes = 0;
            var expressionlessVerdict = V11ArtSpec.Evaluate(expressionless);
            isTrue(Failed(expressionlessVerdict, "expression_blend_shapes"),
                "a character with no expression blend shapes is rejected");
            isTrue(Remedy(expressionlessVerdict, "expression_blend_shapes").Length > 0,
                "the report explains why blend shapes cannot be added later");

            // 모션 부족은 몇 개가 왜 부족한지까지 나와야 한다.
            var partialMotion = Measurement();
            partialMotion.MotionClipIds = new List<string> { "easy_jog", "steady_run", "finish" };
            var partialVerdict = V11ArtSpec.Evaluate(partialMotion);
            isTrue(Failed(partialVerdict, "running_motion_set"), "an incomplete motion set is rejected");
            areEqual("3/9", Actual(partialVerdict, "running_motion_set"),
                "the report counts how many motion states are present");
            isTrue(Remedy(partialVerdict, "running_motion_set").Contains("interval_sprint"),
                "the report names the missing motion states");

            areEqual(9, V11ArtSpec.MissingMotions(Array.Empty<string>()).Count,
                "an asset with no clips is missing every required state");
            areEqual(0, V11ArtSpec.MissingMotions(V11MotionSet.Required).Count,
                "the full required set leaves nothing missing");
            areEqual(0, V11ArtSpec.MissingMotions(
                    V11MotionSet.Required.Select(id => id.ToUpperInvariant())).Count,
                "clip identifiers are matched case-insensitively");

            // 의상 부위가 붙어 있으면 장비 192종을 3D에 반영할 수 없다.
            var fusedGarments = Measurement();
            fusedGarments.SeparateMeshParts = new List<string> { "top", "bottom" };
            var fusedVerdict = V11ArtSpec.Evaluate(fusedGarments);
            isTrue(Failed(fusedVerdict, "separate_garment_meshes"),
                "a character with fused garments is rejected");
            isTrue(Remedy(fusedVerdict, "separate_garment_meshes").Contains("shoes"),
                "the report names the missing garment parts");

            // primitive 확장은 어떤 경우에도 통과시키지 않는다.
            var primitive = Measurement();
            primitive.UsesPrimitiveOrGeneratedMesh = true;
            var primitiveVerdict = V11ArtSpec.Evaluate(primitive);
            isTrue(!primitiveVerdict.Passed,
                "an otherwise perfect asset built from primitives is still rejected");
            isTrue(Failed(primitiveVerdict, "no_primitive_or_generated_mesh"),
                "the primitive requirement is the one that fails");

            // Humanoid가 아니면 Mixamo 모션을 붙일 수 없다.
            var noAvatar = Measurement();
            noAvatar.HasValidHumanoidAvatar = false;
            isTrue(Failed(V11ArtSpec.Evaluate(noAvatar), "humanoid_avatar"),
                "a non-Humanoid rig is rejected");

            // 저폴리 자산과 과폴리 자산 양쪽을 다 막는다.
            var lowPoly = Measurement();
            lowPoly.HighLodTriangles = 3_000;
            isTrue(Failed(V11ArtSpec.Evaluate(lowPoly), "high_lod_triangles"),
                "a low-poly free asset fails the high LOD budget");

            var overBudget = Measurement();
            overBudget.HighLodTriangles = 120_000;
            isTrue(Failed(V11ArtSpec.Evaluate(overBudget), "high_lod_triangles"),
                "an over-budget asset fails the same requirement");

            // 여러 항목이 동시에 어긋나면 전부 보고돼야 한다. 하나만 고치고
            // 다시 돌리는 왕복을 줄이기 위한 것이다.
            var freeAssetLike = new RunnerAssetMeasurement
            {
                AssetId = "Quaternius/UltimateModularCharacters",
                TotalHeightUnits = 1.8,
                HeadHeightUnits = 1.8 / 4.5,
                HighLodTriangles = 2_400,
                MidLodTriangles = 1_200,
                LowLodTriangles = 600,
                Bones = 52,
                BlendShapes = 0,
                MaterialSlots = 1,
                HasValidHumanoidAvatar = true,
                MotionClipIds = new List<string>(),
                SeparateMeshParts = new List<string> { "top", "bottom" },
            };
            var freeVerdict = V11ArtSpec.Evaluate(freeAssetLike);
            isTrue(freeVerdict.UnsatisfiedCount >= 6,
                $"a typical free low-poly character reports every gap at once (got {freeVerdict.UnsatisfiedCount})");
            isTrue(freeVerdict.Requirements.Count == 11,
                "every requirement is reported, satisfied or not");

            // 카메라 프레이밍은 자산과 무관하게 레이아웃 계약이 정한다.
            var fov = V11ArtSpec.VerticalFieldOfViewDegrees(
                runnerWorldHeight: 1.2,
                runnerScreenHeightPercent: 36,
                cameraDistance: 6.0);
            isTrue(fov > 30 && fov < 40,
                $"a 1.2m runner at 36% of a 6m-distant frame needs a sane vertical FOV (got {fov:0.0})");

            // 러너를 화면에서 더 크게 잡으려면 FOV는 좁아져야 한다.
            var tighter = V11ArtSpec.VerticalFieldOfViewDegrees(1.2, 44, 6.0);
            isTrue(tighter < fov, "filling more of the screen requires a narrower field of view");

            var threw = false;
            try
            {
                V11ArtSpec.VerticalFieldOfViewDegrees(1.2, 0, 6.0);
            }
            catch (ArgumentOutOfRangeException)
            {
                threw = true;
            }

            isTrue(threw, "a zero screen-height percentage is refused rather than returning nonsense");
        }

        private static RunnerAssetMeasurement Measurement() => new()
        {
            AssetId = "Vendor/ConformingRunner",
            TotalHeightUnits = 1.2,
            HeadHeightUnits = 1.2 / 3.1,
            HighLodTriangles = 30_000,
            MidLodTriangles = 16_000,
            LowLodTriangles = 7_000,
            Bones = 54,
            BlendShapes = 14,
            MaterialSlots = 3,
            HasValidHumanoidAvatar = true,
            MotionClipIds = new List<string>(V11MotionSet.Required),
            SeparateMeshParts = new List<string>(V11ArtSpec.RequiredMeshParts),
            UsesPrimitiveOrGeneratedMesh = false,
        };

        private static bool Failed(ArtVerdict verdict, string requirement) =>
            verdict.Requirements.Any(entry => entry.Requirement == requirement && !entry.Satisfied);

        private static string Actual(ArtVerdict verdict, string requirement) =>
            verdict.Requirements.First(entry => entry.Requirement == requirement).Actual;

        private static string Remedy(ArtVerdict verdict, string requirement) =>
            verdict.Requirements.First(entry => entry.Requirement == requirement).Remedy;
    }
}
