// CC0 원본 모델에서 V11 러닝에 필요한 메시와 non-combat animation만 확인한다.
#if UNITY_EDITOR
using System.Linq;
using UnityEditor;
using UnityEngine;

namespace RunningUp.Editor
{
    public static class V11VendorModelInspector
    {
        private const string ModelPath =
            "Assets/RunningUp/ThirdParty/KayKitAdventurers/MyRunnerBase.fbx";

        public static void Inspect()
        {
            var importer = AssetImporter.GetAtPath(ModelPath) as ModelImporter;
            if (importer == null)
            {
                throw new System.InvalidOperationException($"ModelImporter not found at {ModelPath}");
            }

            importer.importAnimation = true;
            importer.animationType = ModelImporterAnimationType.Generic;
            importer.materialImportMode = ModelImporterMaterialImportMode.None;
            importer.SaveAndReimport();

            var assets = AssetDatabase.LoadAllAssetsAtPath(ModelPath);
            var meshes = assets.OfType<Mesh>().ToArray();
            var clips = assets.OfType<AnimationClip>()
                .Where(clip => !clip.name.StartsWith("__preview__", System.StringComparison.Ordinal))
                .ToArray();
            var root = AssetDatabase.LoadAssetAtPath<GameObject>(ModelPath);
            var renderers = root == null
                ? System.Array.Empty<SkinnedMeshRenderer>()
                : root.GetComponentsInChildren<SkinnedMeshRenderer>(true);
            var triangles = meshes.Sum(mesh => mesh.triangles.Length / 3);

            Debug.Log(
                $"RUNNINGUP_V11_VENDOR_INSPECT_PASS meshes={meshes.Length} " +
                $"renderers={renderers.Length} triangles={triangles} clips={clips.Length} " +
                $"clip_names={string.Join(",", clips.Select(clip => clip.name))} " +
                $"renderers={string.Join(",", renderers.Select(renderer => $"{renderer.name}:{renderer.sharedMesh?.name}"))} " +
                $"transforms={string.Join(",", root == null ? System.Array.Empty<string>() : root.GetComponentsInChildren<Transform>(true).Select(item => item.name))}");
        }
    }
}
#endif
