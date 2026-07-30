// 실제 PlayMode에서 My Runner의 지속 달리기, 다섯 탭과 Daily Run Contract 상호작용을 검증한다.
using System.Collections;
using NUnit.Framework;
using RunningUp.MyRunner;
using RunningUp.UI;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using UnityEngine.UI;

namespace RunningUp.Tests.PlayMode
{
    public sealed class V11LiveJourneyPlayTests
    {
        [UnityTest]
        public IEnumerator HomeKeepsRunnerMovingAndNavigationInteractive()
        {
            var load = SceneManager.LoadSceneAsync("LiveJourneyHome", LoadSceneMode.Single);
            while (!load.isDone)
            {
                yield return null;
            }

            yield return null;
            yield return null;
            var runner = Object.FindFirstObjectByType<ChibiRunnerView>();
            var hud = Object.FindFirstObjectByType<V11HudController>();
            Assert.That(runner, Is.Not.Null);
            Assert.That(runner.RunnerAnimator, Is.Not.Null);
            Assert.That(hud, Is.Not.Null);
            Assert.That(hud.ScreenCount, Is.EqualTo(5));
            Assert.That(hud.NavigationCount, Is.EqualTo(5));
            Assert.That(hud.GoalModeCount, Is.EqualTo(5));
            Assert.That(hud.ActiveScreen, Is.EqualTo(0));
            Assert.That(
                runner.RunnerAnimator.GetCurrentAnimatorStateInfo(0).IsName("steady_run"),
                Is.True);

            hud.ShowScreen(1);
            Assert.That(hud.ActiveScreen, Is.EqualTo(1));
            hud.ShowScreen(2);
            var tempo = GameObject.Find("ModeTEMPO").GetComponent<Button>();
            Assert.That(tempo, Is.Not.Null);
            tempo.onClick.Invoke();
            Assert.That(hud.SelectedGoalMode, Is.EqualTo("TEMPO"));
            var crew = GameObject.Find("Nav크루").GetComponent<Button>();
            crew.onClick.Invoke();
            Assert.That(hud.ActiveScreen, Is.EqualTo(4));
            hud.ShowScreen(0);
            Assert.That(hud.ActiveScreen, Is.EqualTo(0));

            hud.TriggerDailyContract();
            yield return new WaitForSeconds(0.18f);
            Assert.That(hud.IsToastVisible, Is.True);
            Assert.That(
                runner.RunnerAnimator.GetCurrentAnimatorStateInfo(0).IsName("easy_jog"),
                Is.True);
        }
    }
}
