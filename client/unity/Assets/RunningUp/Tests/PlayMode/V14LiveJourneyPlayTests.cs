// 실제 PlayMode에서 My Runner의 지속 달리기와 V14 화면 내비게이션을 검증한다.
using System.Collections;
using NUnit.Framework;
using RunningUp.MyRunner;
using RunningUp.V14.UI;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using UnityEngine.UI;

namespace RunningUp.Tests.PlayMode
{
    public sealed class V14LiveJourneyPlayTests
    {
        [UnityTest]
        public IEnumerator HomeKeepsRunnerMovingAndNavigationInteractive()
        {
            PlayerPrefs.SetString("runningup.v14.screen", "Home");
            PlayerPrefs.SetString("runningup.v14.training", "EASY_RUN");
            PlayerPrefs.Save();
            var load = SceneManager.LoadSceneAsync("LiveJourneyHome", LoadSceneMode.Single);
            while (!load.isDone)
            {
                yield return null;
            }

            yield return null;
            yield return null;
            var runner = Object.FindFirstObjectByType<ChibiRunnerView>();
            var hud = Object.FindFirstObjectByType<V14ScreenFlowController>();
            Assert.That(runner, Is.Not.Null);
            Assert.That(runner.RunnerAnimator, Is.Not.Null);
            Assert.That(hud, Is.Not.Null);
            Assert.That(hud.ScreenCount, Is.EqualTo(15));
            Assert.That(hud.AvailableTrainingPlanCount, Is.EqualTo(34));
            Assert.That(hud.TrainingPlanPageCount, Is.EqualTo(4));
            Assert.That(hud.CurrentScreenName, Is.EqualTo("Home"));
            Assert.That(
                runner.RunnerAnimator.GetCurrentAnimatorStateInfo(0).IsName("steady_run"),
                Is.True);

            var run = GameObject.Find("NavRUN").GetComponent<Button>();
            run.onClick.Invoke();
            Assert.That(hud.CurrentScreenName, Is.EqualTo("Training"));
            var nextTrainingPage = GameObject.Find("TrainingNextPage").GetComponent<Button>();
            nextTrainingPage.onClick.Invoke();
            var tempoObject = GameObject.Find("TrainingPlanSlot2");
            Assert.That(tempoObject, Is.Not.Null);
            var tempo = tempoObject.GetComponent<Button>();
            Assert.That(tempo, Is.Not.Null);
            tempo.onClick.Invoke();
            Assert.That(hud.SelectedTraining, Is.EqualTo("TEMPO_RUN"));
            var compete = GameObject.Find("LiveRace").GetComponent<Button>();
            compete.onClick.Invoke();
            Assert.That(hud.CurrentScreenName, Is.EqualTo("Matchmaking"));
            var settings = GameObject.Find("SettingsShortcut").GetComponent<Button>();
            settings.onClick.Invoke();
            Assert.That(hud.CurrentScreenName, Is.EqualTo("Settings"));
            var crew = GameObject.Find("CrewShortcut").GetComponent<Button>();
            crew.onClick.Invoke();
            Assert.That(hud.CurrentScreenName, Is.EqualTo("Crew"));
            Assert.That(GameObject.Find("CrewName"), Is.Not.Null);
            Assert.That(GameObject.Find("CrewSearchQuery"), Is.Not.Null);
            var world = GameObject.Find("NavWORLD").GetComponent<Button>();
            world.onClick.Invoke();
            Assert.That(hud.CurrentScreenName, Is.EqualTo("World"));
            var apex = GameObject.Find("OpenMonthlyApex").GetComponent<Button>();
            apex.onClick.Invoke();
            Assert.That(hud.CurrentScreenName, Is.EqualTo("MonthlyApex"));
            Assert.That(GameObject.Find("ClaimMonthlyCheckpoint"), Is.Not.Null);
            var worldBack = GameObject.Find("MonthlyApexBack").GetComponent<Button>();
            worldBack.onClick.Invoke();
            Assert.That(hud.CurrentScreenName, Is.EqualTo("World"));
            var history = GameObject.Find("HistoryShortcut").GetComponent<Button>();
            history.onClick.Invoke();
            Assert.That(hud.CurrentScreenName, Is.EqualTo("ActivityHistory"));
            Assert.That(GameObject.Find("RefreshActivityHistory"), Is.Not.Null);
            var home = GameObject.Find("HistoryBack").GetComponent<Button>();
            home.onClick.Invoke();
            Assert.That(hud.CurrentScreenName, Is.EqualTo("Home"));
        }
    }
}
