// 목표 스크린샷 기반 Unity 비주얼 슬라이스의 HUD 구조와 상호작용 계약을 검증한다.
using System.Linq;
using NUnit.Framework;
using RunningUp.ProductionArt;
using RunningUp.RunVerification;
using RunningUp.V14.UI;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

namespace RunningUp.Tests.EditMode
{
    public sealed class V11VisualSliceTests
    {
        private const string ScenePath =
            "Assets/RunningUp/ProductionArt/Scenes/LiveJourneyVisualSlice.unity";

        [Test]
        public void VisualSliceContainsUnifiedHudAndFiveInteractiveNavigationTargets()
        {
            EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Single);
            var runtime = Object.FindFirstObjectByType<V11VisualSliceRuntime>();
            Assert.That(runtime, Is.Not.Null);
            Assert.That(runtime.NavigationCount, Is.EqualTo(5));
            Assert.That(
                Object.FindFirstObjectByType<V14ScreenFlowController>(),
                Is.Not.Null);
            Assert.That(
                Object.FindFirstObjectByType<V11AndroidRunBridge>(),
                Is.Not.Null);
            Assert.That(GameObject.Find("ApprovedLiveJourneyHome"), Is.Not.Null);
            Assert.That(GameObject.Find("ApprovedSettings"), Is.Not.Null);
            Assert.That(GameObject.Find("ApprovedJourney"), Is.Not.Null);
            Assert.That(
                Object.FindFirstObjectByType<FunctionalPrototypeOnlyMarker>(),
                Is.Null);

            var requiredImages = new[]
            {
                "TopStatusBarTarget",
                "RouteCardTarget",
                "BottomNavigationTarget",
                "MyRunnerHero",
                "PacerGreen",
                "PacerGray",
                "PacerCap",
                "PacerOrange",
            };
            var images = Object.FindObjectsByType<Image>(
                FindObjectsInactive.Include,
                FindObjectsSortMode.None);
            foreach (var objectName in requiredImages)
            {
                var image = images.Single(item => item.name == objectName);
                if (objectName is not "BottomNavigationTarget")
                {
                    Assert.That(image.sprite, Is.Not.Null, objectName);
                }
                Assert.That(image.color.a, Is.GreaterThanOrEqualTo(0.99f), objectName);
            }

            foreach (var cardName in new[]
                     { "ThisMonthCard", "NextCheckpointCard", "CoachPickCard" })
            {
                Assert.That(GameObject.Find(cardName), Is.Not.Null, cardName);
            }

            var navigationNames = new[]
                { "NavHOME", "NavRUNNER", "NavRUN", "NavWORLD", "NavCREW" };
            foreach (var objectName in navigationNames)
            {
                var button = GameObject.Find(objectName)?.GetComponent<Button>();
                Assert.That(button, Is.Not.Null, objectName);
                Assert.That(button.interactable, Is.True, objectName);
            }

            runtime.Select("RUN");
            Assert.That(runtime.ActiveLabel, Is.EqualTo("RUN READY · GPS 연결 대기"));
        }
    }
}
