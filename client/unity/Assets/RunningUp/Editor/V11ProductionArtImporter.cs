// 합법적으로 인입한 Production Art 모델과 텍스처에만 Humanoid·URP·Android 가져오기 규칙을 적용한다.
#if UNITY_EDITOR
using System;
using UnityEditor;
using UnityEngine;

namespace RunningUp.Editor
{
    public sealed class V11ProductionArtImporter : AssetPostprocessor
    {
        private const string VendorRoot =
            "Assets/RunningUp/ProductionArt/Vendor/";

        private bool IsProductionVendorAsset =>
            assetPath.StartsWith(VendorRoot, StringComparison.Ordinal);

        private void OnPreprocessModel()
        {
            if (!IsProductionVendorAsset ||
                assetImporter is not ModelImporter importer)
            {
                return;
            }

            var normalized = assetPath.Replace('\\', '/').ToLowerInvariant();
            var isCharacterOrMotion =
                normalized.Contains("/character") ||
                normalized.Contains("/myrunner") ||
                normalized.Contains("/bozo") ||
                normalized.Contains("/animation") ||
                normalized.Contains("/motion") ||
                normalized.Contains("/mocap");

            importer.importCameras = false;
            importer.importLights = false;
            importer.importVisibility = false;
            importer.isReadable = false;
            importer.meshCompression = ModelImporterMeshCompression.Off;
            importer.optimizeMeshPolygons = true;
            importer.optimizeMeshVertices = true;
            importer.importNormals = ModelImporterNormals.Import;
            importer.importTangents = ModelImporterTangents.CalculateMikk;
            importer.materialImportMode =
                ModelImporterMaterialImportMode.ImportStandard;
            importer.materialLocation = ModelImporterMaterialLocation.External;

            if (isCharacterOrMotion)
            {
                importer.importAnimation = true;
                importer.importBlendShapes = true;
                importer.animationType = ModelImporterAnimationType.Human;
                importer.avatarSetup = ModelImporterAvatarSetup.CreateFromThisModel;
                importer.resampleCurves = true;
                importer.optimizeGameObjects = false;
            }
            else
            {
                importer.importAnimation = false;
                importer.importBlendShapes = false;
                importer.animationType = ModelImporterAnimationType.None;
                importer.generateSecondaryUV = true;
                importer.addCollider = false;
            }
        }

        private void OnPreprocessTexture()
        {
            if (!IsProductionVendorAsset ||
                assetImporter is not TextureImporter importer)
            {
                return;
            }

            var normalized = assetPath.Replace('\\', '/').ToLowerInvariant();
            var isUi = normalized.Contains("/ui/") ||
                normalized.Contains("/icon");
            importer.maxTextureSize = 2048;
            importer.textureCompression = TextureImporterCompression.CompressedHQ;
            importer.alphaIsTransparency = isUi;
            importer.mipmapEnabled = !isUi;
            if (isUi)
            {
                importer.textureType = TextureImporterType.Sprite;
                importer.spriteImportMode = SpriteImportMode.Single;
            }

            importer.SetPlatformTextureSettings(new TextureImporterPlatformSettings
            {
                name = "Android",
                overridden = true,
                maxTextureSize = 2048,
                format = isUi
                    ? TextureImporterFormat.ASTC_4x4
                    : TextureImporterFormat.ASTC_6x6,
                textureCompression = TextureImporterCompression.CompressedHQ,
                compressionQuality = 100,
            });
        }
    }
}
#endif
