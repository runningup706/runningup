// V14 목표 화면을 실제 Unity UI, GPS 표본, 서버 상태머신과 연결한다.
using System;
using System.Collections.Generic;
using System.Globalization;
using RunningUp.Core;
using RunningUp.MyRunner;
using RunningUp.RunVerification;
using RunningUp.V14.State;
using UnityEngine;
using UnityEngine.UI;

namespace RunningUp.V14.UI
{
    [DisallowMultipleComponent]
    public sealed class V14ScreenFlowController : MonoBehaviour
    {
        private const string ScreenKey = "runningup.v14.screen";
        private const string TrainingKey = "runningup.v14.training";
        private const string UnitsKey = "runningup.v14.metric-units";
        private const string AudioKey = "runningup.v14.audio";
        private const string BatteryKey = "runningup.v14.battery";
        private const string GraphicsKey = "runningup.v14.graphics";
        private static readonly Color Ink = new(0.005f, 0.035f, 0.075f, 0.98f);
        private static readonly Color Panel = new(0.02f, 0.10f, 0.19f, 0.96f);
        private static readonly Color PanelSoft = new(0.035f, 0.16f, 0.28f, 0.92f);
        private static readonly Color Blue = new(0.02f, 0.54f, 1f, 1f);
        private static readonly Color Cyan = new(0.10f, 0.82f, 1f, 1f);
        private static readonly Color Green = new(0.10f, 0.88f, 0.54f, 1f);
        private static readonly Color Gold = new(1f, 0.69f, 0.14f, 1f);
        private static readonly int[] MonthlyCheckpointsMeters =
        {
            1000, 2000, 3000, 4000, 5000, 6000, 8000, 10000, 13000, 15000, 18000, 21000, 24000, 27000, 30000,
            34000, 37000, 41000, 42195, 45000, 49000, 54000, 58000, 63000, 67000, 72000, 77000, 82000, 87000, 93000,
            98000, 104000, 110000, 115000, 121000, 127000, 134000, 140000, 146000, 153000, 160000, 166000, 173000, 180000,
            187000, 194000, 202000, 209000, 217000, 224000, 232000, 240000, 248000, 256000, 264000, 272000, 281000, 289000,
            298000, 306000, 315000, 324000, 333000, 342000, 351000, 360000, 369000, 379000, 388000, 398000, 407000, 417000,
            427000, 437000, 447000, 457000, 467000, 478000, 488000, 499000, 509000, 520000, 531000, 541000, 552000, 563000,
            574000, 586000, 597000, 608000, 620000, 631000, 643000, 654000, 666000, 678000, 690000, 702000, 714000, 726000,
            738000, 751000, 763000, 776000, 788000, 801000, 814000, 826000, 839000, 852000, 865000, 878000, 892000, 905000,
            918000, 932000, 945000, 959000, 972000, 986000, 1000000,
        };
        private static readonly (string id, string label)[] TrainingPlans =
        {
            ("RUN_WALK", "RUN-WALK\nBEGINNER"),
            ("TEN_MINUTES", "10 MIN\nSTART"),
            ("TWENTY_MINUTES", "20 MIN\nSTART"),
            ("THIRTY_MINUTES", "30 MIN\nSTART"),
            ("ONE_K", "1K\nGOAL"),
            ("TWO_K", "2K\nGOAL"),
            ("THREE_K", "3K\nGOAL"),
            ("FIRST_FIVE_K", "5K\nGOAL"),
            ("SEVEN_K", "7K\nGOAL"),
            ("TEN_K", "10K\nGOAL"),
            ("FIFTEEN_K", "15K\nGOAL"),
            ("TWENTY_K", "20K\nGOAL"),
            ("HALF_MARATHON", "HALF\nMARATHON"),
            ("THIRTY_K", "30K\nGOAL"),
            ("MARATHON", "MARATHON\n42.195K"),
            ("FIFTY_K", "50K\nULTRA"),
            ("FREE_RUN", "FREE RUN\nOPEN"),
            ("EASY_RUN", "EASY RUN\n30 MIN"),
            ("RECOVERY_RUN", "RECOVERY\nRUN"),
            ("STEADY_RUN", "STEADY\nRUN"),
            ("TEMPO_RUN", "TEMPO\nPACE"),
            ("THRESHOLD_RUN", "THRESHOLD\nPACE"),
            ("INTERVAL_TIME", "INTERVALS\nTIME"),
            ("INTERVAL_DISTANCE", "INTERVALS\nDISTANCE"),
            ("FARTLEK_RUN", "FARTLEK\nRUN"),
            ("PROGRESSION_RUN", "PROGRESSION\nRUN"),
            ("RACE_PACE_RUN", "RACE PACE\nRUN"),
            ("LONG_RUN", "LONG RUN\nOPEN"),
            ("TIME_GOAL", "TIME\nGOAL"),
            ("DISTANCE_GOAL", "DISTANCE\nGOAL"),
            ("TREADMILL_RUN", "TREADMILL\nRUN"),
            ("INDOOR_SENSOR_RUN", "INDOOR\nSENSOR"),
            ("CUSTOM_DISTANCE", "CUSTOM\nDISTANCE"),
            ("CUSTOM_WORKOUT", "CUSTOM\nBUILD"),
        };
        private const int TrainingPlansPerPage = 9;

        private enum Screen
        {
            Home,
            Sync,
            Training,
            ActiveTraining,
            TrainingResult,
            Matchmaking,
            Lobby,
            LiveRace,
            RaceResult,
            ActivityHistory,
            Character,
            World,
            MonthlyApex,
            Crew,
            Settings,
        }

        [SerializeField] private Font font;
        [SerializeField] private V14JourneyRuntime journey;
        [SerializeField] private V11AndroidRunBridge bridge;
        [SerializeField] private ChibiRunnerView runner;
        [SerializeField] private GameObject approvedJourneyBackdrop;
        [SerializeField] private GameObject approvedHomeRoot;
        [SerializeField] private List<Button> approvedHomeNavigation = new();
        [SerializeField] private Button approvedSettingsButton;
        [SerializeField] private Button approvedJourneyButton;
        [SerializeField] private Button approvedSyncButton;
        [SerializeField] private Text approvedProfileText;
        [SerializeField] private Text approvedEnergyText;
        [SerializeField] private Text approvedCoinText;
        [SerializeField] private Text approvedGemText;
        [SerializeField] private Text approvedJourneyProgressText;
        [SerializeField] private Text approvedMonthlyText;
        [SerializeField] private Text approvedCheckpointText;
        [SerializeField] private Text approvedCoachText;

        private readonly Dictionary<Screen, GameObject> screens = new();
        private readonly Dictionary<string, Button> trainingButtons = new();
        private readonly Dictionary<int, Button> raceDistanceButtons = new();
        private readonly Dictionary<string, Button> raceRegionButtons = new();
        private readonly List<Button> bottomButtons = new();
        private readonly List<GameObject> generatedChrome = new();
        private readonly List<Button> trainingPlanSlots = new();
        private RectTransform flowRoot;
        private Text globalStatus;
        private Text resourceText;
        private Text activeDistance;
        private Text activeElapsed;
        private Text activeCurrentPace;
        private Text activeAveragePace;
        private Text activeHeartRate;
        private Text activeCadence;
        private Text activeAltitude;
        private Text activeGps;
        private Text activeState;
        private Text trainingResultSummary;
        private Text trainingResultRewards;
        private Text syncState;
        private Text syncPreview;
        private Button syncImportButton;
        private Text matchmakingState;
        private Text lobbyState;
        private Text lobbyCountdown;
        private readonly List<Text> lobbySlots = new();
        private Button raceReadyButton;
        private Text liveRaceState;
        private Text liveRaceMetrics;
        private Text liveRaceStandings;
        private Text liveRaceProgressStrip;
        private Button raceFinishButton;
        private Button raceReconnectButton;
        private Text raceResultState;
        private Text raceResultValues;
        private Text activityHistoryState;
        private Transform activityHistoryRowsRoot;
        private Text monthlyApexState;
        private Text monthlyApexSummary;
        private Button monthlyApexClaimButton;
        private Text characterState;
        private Text characterSelection;
        private Text characterPresetSummary;
        private Transform characterItemsRoot;
        private Text worldState;
        private Text crewState;
        private InputField crewNameInput;
        private InputField crewSearchInput;
        private Transform crewResultsRoot;
        private Button pauseButton;
        private Button finishButton;
        private Button trainingStartButton;
        private Button trainingPreviousPageButton;
        private Button trainingNextPageButton;
        private Text trainingPageLabel;
        private readonly List<GpsSample> liveSamples = new();
        private Screen currentScreen;
        private string selectedTraining = "EASY_RUN";
        private int trainingPage;
        private bool controlsLocked;
        private int selectedRaceDistanceMeters = 1000;
        private string selectedRaceRegion = "GLOBAL";
        private int selectedWorldContinent = 1;
        private int selectedWorldRegion = 1;
        private int worldSelectionStage;
        private readonly List<Screen> backStack = new();
        private const int MaxBackDepth = 12;
        private float homeExitArmedUntil;
        private const float HomeExitWindowSeconds = 2f;

        public int ScreenCount => screens.Count;
        public string CurrentScreenName => currentScreen.ToString();
        public string SelectedTraining => selectedTraining;
        public int AvailableTrainingPlanCount => TrainingPlans.Length;
        public int TrainingPlanPageCount => Mathf.CeilToInt(
            TrainingPlans.Length / (float)TrainingPlansPerPage);

        public void Configure(
            Font uiFont,
            V14JourneyRuntime runtime,
            V11AndroidRunBridge androidBridge,
            ChibiRunnerView runnerView)
        {
            font = uiFont;
            journey = runtime;
            bridge = androidBridge;
            runner = runnerView;
        }

        public void ConfigureApprovedHome(
            GameObject journeyBackdrop,
            GameObject homeRoot,
            IEnumerable<Button> navigation,
            Button settingsButton,
            Button journeyButton,
            Button syncButton,
            Text profileLabel,
            Text energyLabel,
            Text coinLabel,
            Text gemLabel,
            Text journeyProgressLabel,
            Text monthlyLabel,
            Text checkpointLabel,
            Text coachLabel)
        {
            approvedJourneyBackdrop = journeyBackdrop;
            approvedHomeRoot = homeRoot;
            approvedHomeNavigation = new List<Button>(navigation);
            approvedSettingsButton = settingsButton;
            approvedJourneyButton = journeyButton;
            approvedSyncButton = syncButton;
            approvedProfileText = profileLabel;
            approvedEnergyText = energyLabel;
            approvedCoinText = coinLabel;
            approvedGemText = gemLabel;
            approvedJourneyProgressText = journeyProgressLabel;
            approvedMonthlyText = monthlyLabel;
            approvedCheckpointText = checkpointLabel;
            approvedCoachText = coachLabel;
        }

        private void Awake()
        {
            font ??= Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            journey ??= FindFirstObjectByType<V14JourneyRuntime>();
            bridge ??= FindFirstObjectByType<V11AndroidRunBridge>();
            runner ??= FindFirstObjectByType<ChibiRunnerView>();
            SetApprovedHudDynamicVisibility(true);
            HideLegacyHud();
            Build();
            WireApprovedHome();
            selectedTraining = NormalizeTrainingId(
                PlayerPrefs.GetString(TrainingKey, "EASY_RUN"));
            ApplyRuntimePreferences();
            PlayerPrefs.DeleteKey(ScreenKey);
            currentScreen = Screen.Home;
            backStack.Clear();
        }

        private void SetApprovedHudDynamicVisibility(bool visible)
        {
            if (approvedProfileText != null)
            {
                approvedProfileText.gameObject.SetActive(visible);
            }
            if (approvedEnergyText != null && approvedEnergyText.transform.parent != null)
            {
                approvedEnergyText.transform.parent.gameObject.SetActive(visible);
            }
            if (approvedCoinText != null && approvedCoinText.transform.parent != null)
            {
                approvedCoinText.transform.parent.gameObject.SetActive(visible);
            }
            if (approvedGemText != null && approvedGemText.transform.parent != null)
            {
                approvedGemText.transform.parent.gameObject.SetActive(visible);
            }
            if (approvedJourneyProgressText != null &&
                approvedJourneyProgressText.transform.parent != null)
            {
                approvedJourneyProgressText.transform.parent.gameObject.SetActive(visible);
            }
        }

        private void OnEnable()
        {
            if (journey != null)
            {
                journey.StatusChanged += OnJourneyStatus;
                journey.StateChanged += RefreshRuntimeState;
            }
            if (bridge != null)
            {
                bridge.StatusChanged += OnBridgeStatus;
                bridge.GpsSampleReceived += OnGpsSample;
            }
        }

        private void OnDisable()
        {
            if (journey != null)
            {
                journey.StatusChanged -= OnJourneyStatus;
                journey.StateChanged -= RefreshRuntimeState;
            }
            if (bridge != null)
            {
                bridge.StatusChanged -= OnBridgeStatus;
                bridge.GpsSampleReceived -= OnGpsSample;
            }
        }

        public bool HandleSystemBack()
        {
            if (currentScreen is Screen.ActiveTraining or Screen.LiveRace)
            {
                Show(Screen.Home);
                Publish("Run continues in the background");
                return true;
            }
            if (currentScreen == Screen.World && worldSelectionStage > 0)
            {
                worldSelectionStage--;
                RebuildWorld();
                return true;
            }
            if (backStack.Count > 0)
            {
                var previous = backStack[^1];
                backStack.RemoveAt(backStack.Count - 1);
                Show(previous);
                return true;
            }
            if (currentScreen != Screen.Home)
            {
                Show(Screen.Home);
                return true;
            }
            if (Time.unscaledTime <= homeExitArmedUntil)
            {
                return false;
            }
            homeExitArmedUntil = Time.unscaledTime + HomeExitWindowSeconds;
            Publish("Press back again to exit");
            return true;
        }

        public void OnAndroidBackPressed(string _)
        {
            if (!HandleSystemBack())
            {
                Application.Quit();
            }
        }

        private void NavigateBack()
        {
            if (!HandleSystemBack())
            {
                Application.Quit();
            }
        }

        private void Update()
        {
            if (Input.GetKeyDown(KeyCode.Escape) && !HandleSystemBack())
            {
                Application.Quit();
            }
        }

        private void GoTo(Screen screen)
        {
            if (screen != currentScreen)
            {
                backStack.Add(currentScreen);
                if (backStack.Count > MaxBackDepth)
                {
                    backStack.RemoveAt(0);
                }
            }
            homeExitArmedUntil = 0f;
            Show(screen);
        }

        private void Start()
        {
            HideLegacyHud();
            Show(currentScreen);
            RefreshRuntimeState();
            Publish("Ready");
        }

        private void HideLegacyHud()
        {
            foreach (Transform child in transform)
            {
                if ((flowRoot != null && child == flowRoot) ||
                    (approvedJourneyBackdrop != null &&
                     child.gameObject == approvedJourneyBackdrop) ||
                    (approvedHomeRoot != null &&
                     child.gameObject == approvedHomeRoot))
                {
                    continue;
                }
                child.gameObject.SetActive(false);
            }
            var legacy = GetComponent<RunningUp.UI.V11HudController>();
            if (legacy != null)
            {
                legacy.enabled = false;
            }
        }

        private void Build()
        {
            var rootObject = Ui("V14ScreenFlow", transform);
            flowRoot = rootObject.GetComponent<RectTransform>();
            Stretch(flowRoot);
            BuildHome();
            BuildSync();
            BuildTraining();
            BuildActiveTraining();
            BuildTrainingResult();
            BuildMatchmaking();
            BuildLobby();
            BuildLiveRace();
            BuildRaceResult();
            BuildActivityHistory();
            BuildCharacter();
            BuildWorld();
            BuildMonthlyApex();
            BuildCrew();
            BuildSettings();
            BuildTopHud();
            BuildBottomNavigation();
            BuildStatusRail();
        }

        private void BuildTopHud()
        {
            var bar = ImagePanel(
                "TopHud",
                flowRoot,
                Ink,
                new Vector2(0f, 1f),
                new Vector2(1f, 1f),
                Vector2.zero,
                new Vector2(0f, 92f));
            generatedChrome.Add(bar.gameObject);
            resourceText = Label(
                "Resources",
                bar,
                "ENERGY -- / --     COINS --     GEMS --",
                25,
                FontStyle.Bold,
                Color.white,
                new Vector2(34f, -18f),
                new Vector2(760f, 54f),
                new Vector2(0f, 1f));
            Button(
                "RunnerShortcut",
                bar,
                "RUNNER",
                new Vector2(-258f, -18f),
                new Vector2(118f, 54f),
                new Vector2(1f, 1f),
                PanelSoft,
                () => GoTo(Screen.Character));
            Button(
                "SettingsShortcut",
                bar,
                "SETTINGS",
                new Vector2(-124f, -18f),
                new Vector2(108f, 54f),
                new Vector2(1f, 1f),
                PanelSoft,
                () => GoTo(Screen.Settings));
            Button(
                "HistoryShortcut",
                bar,
                "HISTORY",
                new Vector2(-382f, -18f),
                new Vector2(108f, 54f),
                new Vector2(1f, 1f),
                PanelSoft,
                () => GoTo(Screen.ActivityHistory));
        }

        private void BuildBottomNavigation()
        {
            var nav = ImagePanel(
                "BottomNavigation",
                flowRoot,
                Ink,
                new Vector2(0f, 0f),
                new Vector2(1f, 0f),
                Vector2.zero,
                new Vector2(0f, 154f));
            generatedChrome.Add(nav.gameObject);
            var destinations = new[]
            {
                (Screen.Home, "HOME"),
                (Screen.Training, "TRAIN"),
                (Screen.Training, "RUN"),
                (Screen.Matchmaking, "COMPETE"),
                (Screen.World, "WORLD"),
            };
            for (var index = 0; index < destinations.Length; index++)
            {
                var captured = destinations[index].Item1;
                var center = index == 2;
                var button = Button(
                    $"Nav{destinations[index].Item2}",
                    nav,
                    destinations[index].Item2,
                    new Vector2(index * 216f, center ? 24f : 0f),
                    center ? new Vector2(188f, 136f) : new Vector2(216f, 154f),
                    new Vector2(0f, 0f),
                    center ? Blue : Color.clear,
                    () => GoTo(captured));
                bottomButtons.Add(button);
            }
        }

        private void BuildStatusRail()
        {
            var rail = ImagePanel(
                "StatusRail",
                flowRoot,
                new Color(0.01f, 0.06f, 0.12f, 0.94f),
                new Vector2(0f, 0f),
                new Vector2(1f, 0f),
                new Vector2(0f, 154f),
                new Vector2(0f, 56f));
            generatedChrome.Add(rail.gameObject);
            globalStatus = CenterLabel(rail, "Connecting secure session…", 22, Cyan);
        }

        private void BuildHome()
        {
            var root = ScreenRoot(Screen.Home, Color.clear);
            if (approvedHomeRoot != null)
            {
                return;
            }
            var journeyCard = ImagePanel(
                "JourneyCard",
                root,
                Ink,
                new Vector2(0f, 1f),
                new Vector2(1f, 1f),
                new Vector2(30f, -120f),
                new Vector2(-60f, 188f));
            Label(
                "Title",
                journeyCard,
                "LIVE JOURNEY",
                36,
                FontStyle.Bold,
                Color.white,
                new Vector2(34f, -22f),
                new Vector2(580f, 48f),
                new Vector2(0f, 1f));
            Label(
                "Route",
                journeyCard,
                "LUMINA METROWAY · CITY BRIDGE",
                24,
                FontStyle.Normal,
                Cyan,
                new Vector2(34f, -78f),
                new Vector2(720f, 38f),
                new Vector2(0f, 1f));
            Label(
                "Progress",
                journeyCard,
                "Monthly verified distance updates after server approval",
                22,
                FontStyle.Normal,
                Color.white,
                new Vector2(34f, -124f),
                new Vector2(800f, 38f),
                new Vector2(0f, 1f));
            Button(
                "WorldProgress",
                journeyCard,
                "VIEW WORLD",
                new Vector2(-190f, -58f),
                new Vector2(160f, 82f),
                new Vector2(1f, 1f),
                PanelSoft,
                () => GoTo(Screen.World));

            var cards = ImagePanel(
                "HomeCards",
                root,
                Ink,
                new Vector2(0f, 0f),
                new Vector2(1f, 0f),
                new Vector2(30f, 244f),
                new Vector2(-60f, 382f));
            Label(
                "Monthly",
                cards,
                "MONTHLY DISTANCE\nWaiting for verified run",
                26,
                FontStyle.Bold,
                Color.white,
                new Vector2(24f, -28f),
                new Vector2(300f, 100f),
                new Vector2(0f, 1f));
            Label(
                "Checkpoint",
                cards,
                "NEXT CHECKPOINT\nCalculated by server",
                26,
                FontStyle.Bold,
                Color.white,
                new Vector2(360f, -28f),
                new Vector2(300f, 100f),
                new Vector2(0f, 1f));
            Label(
                "Recommended",
                cards,
                "RECOMMENDED\nEasy Run",
                26,
                FontStyle.Bold,
                Color.white,
                new Vector2(696f, -28f),
                new Vector2(300f, 100f),
                new Vector2(0f, 1f));
            Button(
                "SyncRun",
                cards,
                "SYNC RUN",
                new Vector2(26f, -166f),
                new Vector2(472f, 112f),
                new Vector2(0f, 1f),
                PanelSoft,
                () => GoTo(Screen.Sync));
            Button(
                "DailyRun",
                cards,
                "DAILY RUN CONTRACT",
                new Vector2(526f, -166f),
                new Vector2(472f, 112f),
                new Vector2(0f, 1f),
                Blue,
                () =>
                {
                    selectedTraining = "ONE_K";
                    StartSelectedTraining();
                });
        }

        private void WireApprovedHome()
        {
            if (approvedHomeRoot == null)
            {
                return;
            }

            var destinations = new[]
            {
                Screen.Home,
                Screen.Character,
                Screen.Training,
                Screen.World,
                Screen.Crew,
            };
            for (var index = 0;
                 index < approvedHomeNavigation.Count && index < destinations.Length;
                 index++)
            {
                var destination = destinations[index];
                approvedHomeNavigation[index]?.onClick.AddListener(
                    () => GoTo(destination));
            }
            approvedSettingsButton?.onClick.AddListener(
                () => GoTo(Screen.Settings));
            approvedJourneyButton?.onClick.AddListener(
                () => GoTo(Screen.World));
            approvedSyncButton?.onClick.AddListener(
                () => GoTo(Screen.Sync));
        }

        private void BuildSync()
        {
            var root = ScreenRoot(Screen.Sync, Ink);
            Button(
                "Back",
                root,
                "BACK",
                new Vector2(34f, -116f),
                new Vector2(108f, 66f),
                new Vector2(0f, 1f),
                PanelSoft,
                NavigateBack);
            Label(
                "ScreenTitle",
                root,
                "SYNC RUN",
                42,
                FontStyle.Bold,
                Color.white,
                new Vector2(168f, -112f),
                new Vector2(650f, 70f),
                new Vector2(0f, 1f));
            Button(
                "Help",
                root,
                "HELP",
                new Vector2(-34f, -116f),
                new Vector2(116f, 66f),
                new Vector2(1f, 1f),
                PanelSoft,
                () => Publish(
                    "Only provider-authorized running records can be imported"));

            var intro = ImagePanel(
                "SyncIntro",
                root,
                Panel,
                new Vector2(0f, 1f),
                new Vector2(1f, 1f),
                new Vector2(52f, -224f),
                new Vector2(-104f, 166f));
            Label(
                "IntroTitle",
                intro,
                "BRING YOUR VERIFIED RUN INTO RUNNINGUP",
                27,
                FontStyle.Bold,
                Color.white,
                new Vector2(28f, -24f),
                new Vector2(920f, 44f),
                new Vector2(0f, 1f));
            syncState = Label(
                "SyncState",
                intro,
                "Checking Health Connect capability…",
                22,
                FontStyle.Normal,
                Cyan,
                new Vector2(28f, -82f),
                new Vector2(920f, 54f),
                new Vector2(0f, 1f));

            var preview = ImagePanel(
                "RunPreview",
                root,
                new Color(0.025f, 0.14f, 0.25f, 0.98f),
                new Vector2(0f, 1f),
                new Vector2(1f, 1f),
                new Vector2(52f, -420f),
                new Vector2(-104f, 292f));
            syncPreview = Label(
                "PreviewText",
                preview,
                "NO NEW RUN SELECTED\nConnect Health Connect, then check for new runs.",
                27,
                FontStyle.Bold,
                Color.white,
                new Vector2(28f, -28f),
                new Vector2(920f, 104f),
                new Vector2(0f, 1f));
            var discover = Button(
                "Discover",
                preview,
                "CHECK FOR NEW RUNS",
                new Vector2(28f, -164f),
                new Vector2(442f, 96f),
                new Vector2(0f, 1f),
                PanelSoft,
                () => journey?.DiscoverHealthConnectRuns());
            discover.name = "V14.Sync.Discover";
            syncImportButton = Button(
                "ImportOne",
                preview,
                "IMPORT 1 RUN",
                new Vector2(506f, -164f),
                new Vector2(442f, 96f),
                new Vector2(0f, 1f),
                Blue,
                () => journey?.ImportFirstDiscoveredHealthRun());
            syncImportButton.interactable = false;

            Label(
                "ActivitySources",
                root,
                "ACTIVITY SOURCES",
                25,
                FontStyle.Bold,
                Color.white,
                new Vector2(52f, -756f),
                new Vector2(500f, 48f),
                new Vector2(0f, 1f),
                TextAnchor.MiddleLeft);
            var healthCapability =
                bridge?.HealthConnectCapability ?? "Checking runtime";
            ConnectionRow(
                root,
                "RunningUp Direct GPS",
                bridge?.DirectGpsCapability ?? "Checking device",
                -818f,
                bridge != null && bridge.DirectGpsCapability == "ready");
            ConnectionRow(
                root,
                "Health Connect",
                Humanize(healthCapability),
                -916f,
                healthCapability == "available");
            ConnectionRow(root, "Garmin Connect", "Awaiting official approval", -1014f, false);
            ConnectionRow(root, "Bluetooth FTMS", "Pair a supported treadmill", -1112f, false);
            ConnectionRow(root, "Apple Health", "Available in iOS companion", -1210f, false);
            ConnectionRow(root, "FIT · GPX · TCX", "Recovery import available", -1308f, true);

            Button(
                "Permission",
                root,
                "MANAGE HEALTH CONNECT",
                new Vector2(52f, -1428f),
                new Vector2(472f, 96f),
                new Vector2(0f, 1f),
                PanelSoft,
                () => bridge?.RequestHealthConnectPermission());
            Button(
                "ImportFile",
                root,
                "IMPORT TRACK FILE",
                new Vector2(556f, -1428f),
                new Vector2(472f, 96f),
                new Vector2(0f, 1f),
                PanelSoft,
                () => bridge?.PickTrackFile());
            RefreshSyncView();
        }

        private void RefreshSyncView()
        {
            if (syncPreview == null || syncImportButton == null)
            {
                return;
            }

            var pending = bridge?.PendingHealthRunCount ?? 0;
            if (pending > 0)
            {
                syncPreview.text =
                    $"NEW VERIFIED RUN FOUND · {pending}\n" +
                    $"{bridge.PendingHealthRunSummary}\n" +
                    "Review and import once. Duplicate rewards are blocked.";
                syncImportButton.interactable = true;
            }
            else
            {
                syncPreview.text =
                    "NO NEW RUN SELECTED\n" +
                    "Connect Health Connect, then check for new runs.";
                syncImportButton.interactable = false;
            }

            if (syncState != null)
            {
                syncState.text = journey == null
                    ? "Secure sync runtime unavailable"
                    : Humanize(journey.SyncState.ToString());
            }
        }

        private void BuildTraining()
        {
            var root = ScreenRoot(
                Screen.Training,
                new Color(0.005f, 0.03f, 0.065f, 0.70f));
            Header(root, "TRAIN", "Choose a verified plan. Change it any time before GPS starts.");
            var recommendation = ImagePanel(
                "CoachRecommendation",
                root,
                new Color(0.025f, 0.16f, 0.29f, 0.98f),
                new Vector2(0f, 1f),
                new Vector2(1f, 1f),
                new Vector2(52f, -292f),
                new Vector2(-104f, 156f));
            Label(
                "CoachEyebrow",
                recommendation,
                "COACH PICK · TODAY",
                21,
                FontStyle.Bold,
                Cyan,
                new Vector2(26f, -18f),
                new Vector2(520f, 34f),
                new Vector2(0f, 1f));
            Label(
                "CoachPlan",
                recommendation,
                "EASY RUN · 30 MIN",
                33,
                FontStyle.Bold,
                Color.white,
                new Vector2(26f, -58f),
                new Vector2(560f, 50f),
                new Vector2(0f, 1f));
            Button(
                "CoachStart",
                recommendation,
                "SELECT",
                new Vector2(-24f, -40f),
                new Vector2(200f, 78f),
                new Vector2(1f, 1f),
                Blue,
                () => SelectTraining("EASY_RUN"));
            Label(
                "PlanSection",
                root,
                "RUN PLANS",
                25,
                FontStyle.Bold,
                Color.white,
                new Vector2(52f, -478f),
                new Vector2(420f, 54f),
                new Vector2(0f, 1f));
            trainingPageLabel = Label(
                "PlanPage",
                root,
                "PLANS 1/4",
                20,
                FontStyle.Bold,
                Cyan,
                new Vector2(500f, -478f),
                new Vector2(170f, 54f),
                new Vector2(0f, 1f),
                TextAnchor.MiddleCenter);
            trainingPreviousPageButton = Button(
                "TrainingPreviousPage",
                root,
                "‹",
                new Vector2(690f, -478f),
                new Vector2(112f, 62f),
                new Vector2(0f, 1f),
                PanelSoft,
                () => ChangeTrainingPage(-1));
            trainingNextPageButton = Button(
                "TrainingNextPage",
                root,
                "›",
                new Vector2(830f, -478f),
                new Vector2(112f, 62f),
                new Vector2(0f, 1f),
                PanelSoft,
                () => ChangeTrainingPage(1));
            for (var index = 0; index < TrainingPlansPerPage; index++)
            {
                var column = index % 3;
                var row = index / 3;
                var slot = index;
                var button = Button(
                    $"TrainingPlanSlot{slot}",
                    root,
                    "",
                    new Vector2(52f + column * 332f, -534f - row * 172f),
                    new Vector2(304f, 142f),
                    new Vector2(0f, 1f),
                    PanelSoft,
                    () => SelectTrainingSlot(slot));
                trainingPlanSlots.Add(button);
            }
            trainingStartButton = Button(
                "StartTraining",
                root,
                "START SELECTED TRAINING",
                new Vector2(52f, -1080f),
                new Vector2(976f, 128f),
                new Vector2(0f, 1f),
                Blue,
                StartSelectedTraining);
            Button(
                "LiveRace",
                root,
                "LIVE RACE · SKILL-BASED 8 RUNNERS",
                new Vector2(52f, -1232f),
                new Vector2(976f, 112f),
                new Vector2(0f, 1f),
                PanelSoft,
                () => GoTo(Screen.Matchmaking));
            Label(
                "TrainingTruth",
                root,
                "GPS permission, server session and route verification are required before rewards.",
                24,
                FontStyle.Normal,
                Color.white,
                new Vector2(52f, -1374f),
                new Vector2(976f, 90f),
                new Vector2(0f, 1f),
                TextAnchor.MiddleCenter);
            RefreshTrainingPlanPage();
        }

        private void BuildActiveTraining()
        {
            var root = ScreenRoot(Screen.ActiveTraining, Color.clear);
            activeGps = Label(
                "Gps",
                root,
                "GPS · waiting",
                24,
                FontStyle.Bold,
                Green,
                new Vector2(28f, -112f),
                new Vector2(430f, 50f),
                new Vector2(0f, 1f));
            activeState = Label(
                "State",
                root,
                "SENSOR CHECK",
                24,
                FontStyle.Bold,
                Color.white,
                new Vector2(-28f, -112f),
                new Vector2(430f, 50f),
                new Vector2(1f, 1f),
                TextAnchor.MiddleRight);
            activeDistance = CenterMetric(root, "Distance", "--", "DISTANCE", -180f, 76);
            var metrics = ImagePanel(
                "RunMetricDeck",
                root,
                new Color(0.005f, 0.035f, 0.075f, 0.93f),
                new Vector2(0f, 0f),
                new Vector2(1f, 0f),
                new Vector2(28f, 358f),
                new Vector2(-56f, 590f));
            activeElapsed = MetricCell(metrics, "Elapsed", "--:--:--", "ELAPSED", 24f, -24f, 452f);
            activeCurrentPace = MetricCell(metrics, "CurrentPace", "--", "CURRENT PACE", 506f, -24f, 452f);
            activeAveragePace = MetricCell(metrics, "AveragePace", "--", "AVERAGE PACE", 24f, -158f, 452f);
            activeHeartRate = MetricCell(metrics, "Heart", "--", "HEART RATE", 506f, -158f, 452f);
            activeCadence = MetricCell(metrics, "Cadence", "--", "CADENCE", 24f, -292f, 452f);
            activeAltitude = MetricCell(metrics, "Altitude", "--", "ALTITUDE", 506f, -292f, 452f);
            Button(
                "Lock",
                metrics,
                "LOCK",
                new Vector2(20f, -448f),
                new Vector2(270f, 110f),
                new Vector2(0f, 1f),
                PanelSoft,
                ToggleControlsLock);
            pauseButton = Button(
                "Pause",
                metrics,
                "PAUSE",
                new Vector2(354f, -448f),
                new Vector2(300f, 110f),
                new Vector2(0f, 1f),
                Blue,
                TogglePause);
            finishButton = Button(
                "Finish",
                metrics,
                "FINISH",
                new Vector2(718f, -448f),
                new Vector2(270f, 110f),
                new Vector2(0f, 1f),
                Gold,
                () => journey?.FinishTraining());
        }

        private void BuildMatchmaking()
        {
            var root = ScreenRoot(
                Screen.Matchmaking,
                new Color(0.005f, 0.03f, 0.065f, 0.84f));
            Header(root, "LIVE RACE", "Skill-based verified matchmaking. Eight real runners are required.");
            Label(
                "DistanceTitle",
                root,
                "DISTANCE",
                25,
                FontStyle.Bold,
                Color.white,
                new Vector2(52f, -380f),
                new Vector2(220f, 70f),
                new Vector2(0f, 1f));
            var raceDistances = new[] { (1000, "1K"), (5000, "5K"), (10000, "10K") };
            for (var index = 0; index < raceDistances.Length; index++)
            {
                var option = raceDistances[index];
                raceDistanceButtons[option.Item1] = Button(
                    $"RaceDistance{option.Item2}",
                    root,
                    option.Item2,
                    new Vector2(300f + index * 235f, -380f),
                    new Vector2(210f, 76f),
                    new Vector2(0f, 1f),
                    index == 0 ? Blue : PanelSoft,
                    () =>
                    {
                        selectedRaceDistanceMeters = option.Item1;
                        RefreshMatchmakingSelection();
                        Publish($"{option.Item2} selected");
                    });
            }
            Label(
                "RegionTitle",
                root,
                "REGION",
                25,
                FontStyle.Bold,
                Color.white,
                new Vector2(52f, -570f),
                new Vector2(220f, 70f),
                new Vector2(0f, 1f));
            raceRegionButtons["GLOBAL"] = Button(
                "RaceRegionGlobal",
                root,
                "GLOBAL",
                new Vector2(300f, -570f),
                new Vector2(300f, 76f),
                new Vector2(0f, 1f),
                Blue,
                () =>
                {
                    selectedRaceRegion = "GLOBAL";
                    RefreshMatchmakingSelection();
                    Publish("Global region selected");
                });
            raceRegionButtons["LOCAL"] = Button(
                "RaceRegionLocal",
                root,
                "LOCAL",
                new Vector2(635f, -570f),
                new Vector2(300f, 76f),
                new Vector2(0f, 1f),
                PanelSoft,
                () =>
                {
                    selectedRaceRegion = "LOCAL";
                    RefreshMatchmakingSelection();
                    Publish("Local region selected");
                });
            matchmakingState = StatusCard(root, "Queue is idle", -760f);
            Button(
                "StartMatch",
                root,
                "START MATCHMAKING",
                new Vector2(52f, -930f),
                new Vector2(976f, 126f),
                new Vector2(0f, 1f),
                Blue,
                () => journey?.QueueRace(
                    selectedRaceDistanceMeters,
                    selectedRaceRegion));
            Button(
                "CancelMatch",
                root,
                "CANCEL QUEUE",
                new Vector2(330f, -1074f),
                new Vector2(420f, 88f),
                new Vector2(0f, 1f),
                PanelSoft,
                () => journey?.CancelRaceQueue());
            Label(
                "RaceTruth",
                root,
                "The lobby opens only after the server creates a match. No synthetic opponents are generated.",
                24,
                FontStyle.Normal,
                Color.white,
                new Vector2(80f, -1190f),
                new Vector2(920f, 120f),
                new Vector2(0f, 1f),
                TextAnchor.MiddleCenter);
        }

        private void BuildTrainingResult()
        {
            var root = ScreenRoot(Screen.TrainingResult, Color.clear);
            Label(
                "ResultTitle",
                root,
                "RUN VERIFIED",
                52,
                FontStyle.Bold,
                Color.white,
                new Vector2(52f, -126f),
                new Vector2(976f, 80f),
                new Vector2(0f, 1f),
                TextAnchor.MiddleCenter);
            var card = ImagePanel(
                "VerifiedResultCard",
                root,
                new Color(0.01f, 0.06f, 0.12f, 0.90f),
                new Vector2(0f, 0f),
                new Vector2(1f, 0f),
                new Vector2(52f, 310f),
                new Vector2(-104f, 720f));
            trainingResultSummary = Label(
                "Summary",
                card,
                "Waiting for the verified server result",
                31,
                FontStyle.Bold,
                Color.white,
                new Vector2(36f, -40f),
                new Vector2(872f, 210f),
                new Vector2(0f, 1f),
                TextAnchor.UpperCenter);
            trainingResultRewards = Label(
                "Rewards",
                card,
                "Permanent progress is granted only after server approval.",
                27,
                FontStyle.Normal,
                Cyan,
                new Vector2(36f, -264f),
                new Vector2(872f, 250f),
                new Vector2(0f, 1f),
                TextAnchor.UpperCenter);
            Button(
                "ReturnHome",
                card,
                "RETURN TO LIVE JOURNEY",
                new Vector2(70f, -562f),
                new Vector2(804f, 112f),
                new Vector2(0f, 1f),
                Blue,
                NavigateBack);
        }

        private void BuildLobby()
        {
            var root = ScreenRoot(
                Screen.Lobby,
                new Color(0.005f, 0.03f, 0.065f, 0.86f));
            Header(root, "RACE LOBBY", "Server-authoritative participant list and countdown");
            lobbyState = StatusCard(root, "Waiting for a server-created match", -310f);
            for (var index = 0; index < 8; index++)
            {
                var row = ImagePanel(
                    $"Participant{index + 1}",
                    root,
                    Panel,
                    new Vector2(0f, 1f),
                    new Vector2(1f, 1f),
                    new Vector2(80f, -440f - index * 105f),
                    new Vector2(-160f, 82f));
                lobbySlots.Add(CenterLabel(
                    row,
                    $"SLOT {index + 1} · WAITING FOR SERVER",
                    23,
                    Color.white));
            }
            lobbyCountdown = Label(
                "ServerCountdown",
                root,
                "SERVER COUNTDOWN --",
                30,
                FontStyle.Bold,
                Cyan,
                new Vector2(80f, -1315f),
                new Vector2(920f, 70f),
                new Vector2(0f, 1f),
                TextAnchor.MiddleCenter);
            raceReadyButton = Button(
                "RaceReady",
                root,
                "READY",
                new Vector2(202f, -1410f),
                new Vector2(676f, 104f),
                new Vector2(0f, 1f),
                Blue,
                () => journey?.MarkRaceReady());
        }

        private void BuildLiveRace()
        {
            var root = ScreenRoot(
                Screen.LiveRace,
                new Color(0.005f, 0.03f, 0.065f, 0.18f));
            Header(root, "LIVE RACE", "Rank and opponent progress are accepted only from server snapshots.");
            liveRaceState = StatusCard(root, "No active verified race", -310f);
            var metricsPanel = ImagePanel(
                "LiveMetricsPanel",
                root,
                new Color(0.005f, 0.035f, 0.075f, 0.88f),
                new Vector2(0f, 1f),
                new Vector2(0f, 1f),
                new Vector2(42f, -470f),
                new Vector2(450f, 430f));
            liveRaceMetrics = Label(
                "RaceMetrics",
                metricsPanel,
                "RANK -- / 8\nDISTANCE --\nPACE --\nHEART RATE --\nNETWORK --",
                29,
                FontStyle.Bold,
                Color.white,
                new Vector2(28f, -28f),
                new Vector2(394f, 374f),
                new Vector2(0f, 1f));
            var standingsPanel = ImagePanel(
                "LiveStandingsPanel",
                root,
                new Color(0.005f, 0.035f, 0.075f, 0.88f),
                new Vector2(0f, 1f),
                new Vector2(0f, 1f),
                new Vector2(520f, -470f),
                new Vector2(508f, 430f));
            Label(
                "StandingsTitle",
                standingsPanel,
                "SERVER STANDINGS",
                25,
                FontStyle.Bold,
                Cyan,
                new Vector2(26f, -24f),
                new Vector2(456f, 42f),
                new Vector2(0f, 1f),
                TextAnchor.MiddleCenter);
            liveRaceStandings = Label(
                "StandingsRows",
                standingsPanel,
                "WAITING FOR VERIFIED SERVER SNAPSHOTS",
                22,
                FontStyle.Normal,
                Color.white,
                new Vector2(26f, -82f),
                new Vector2(456f, 316f),
                new Vector2(0f, 1f),
                TextAnchor.UpperLeft);
            raceFinishButton = Button(
                "FinishRace",
                root,
                "FINISH AFTER TARGET",
                new Vector2(270f, -930f),
                new Vector2(540f, 104f),
                new Vector2(0f, 1f),
                Gold,
                () => journey?.FinishRace());
            raceReconnectButton = Button(
                "RetryRaceConnection",
                root,
                "RETRY CONNECTION",
                new Vector2(270f, -1054f),
                new Vector2(540f, 90f),
                new Vector2(0f, 1f),
                PanelSoft,
                () => journey?.RetryRaceConnection());
            var progressStrip = ImagePanel(
                "RaceRunnerProgressStrip",
                root,
                new Color(0.005f, 0.035f, 0.075f, 0.92f),
                new Vector2(0f, 0f),
                new Vector2(1f, 0f),
                new Vector2(42f, 202f),
                new Vector2(-84f, 142f));
            liveRaceProgressStrip = CenterLabel(
                progressStrip,
                "SERVER PROGRESS · WAITING FOR LIVE SNAPSHOT",
                20,
                Cyan);
        }

        private void BuildRaceResult()
        {
            var root = ScreenRoot(
                Screen.RaceResult,
                new Color(0.005f, 0.03f, 0.065f, 0.86f));
            Header(root, "RACE RESULT", "Rewards appear after verified server finalization.");
            raceResultState = StatusCard(root, "No finalized race result", -310f);
            raceResultValues = Label(
                "ResultValues",
                root,
                "FINAL RANK -- / 8\nFINISH TIME --\nPERSONAL BEST --\nXP --   COINS --   BADGE --   RATING --",
                32,
                FontStyle.Bold,
                Color.white,
                new Vector2(90f, -500f),
                new Vector2(900f, 420f),
                new Vector2(0f, 1f),
                TextAnchor.MiddleCenter);
            Button(
                "ResultHome",
                root,
                "RETURN HOME",
                new Vector2(100f, -1030f),
                new Vector2(880f, 112f),
                new Vector2(0f, 1f),
                Blue,
                NavigateBack);
        }

        private void BuildActivityHistory()
        {
            var root = ScreenRoot(
                Screen.ActivityHistory,
                new Color(0.005f, 0.03f, 0.065f, 0.90f));
            Header(
                root,
                "ACTIVITY HISTORY",
                "Only server-verified runs appear here. Imported duplicates never create another entry.");
            activityHistoryState = StatusCard(
                root,
                "Load your verified activity from the secure server.",
                -310f);
            Button(
                "HistoryBack",
                root,
                "BACK",
                new Vector2(52f, -390f),
                new Vector2(180f, 82f),
                new Vector2(0f, 1f),
                PanelSoft,
                NavigateBack);
            Button(
                "RefreshActivityHistory",
                root,
                "REFRESH",
                new Vector2(-52f, -390f),
                new Vector2(230f, 82f),
                new Vector2(1f, 1f),
                Blue,
                () => journey?.RefreshActivityHistory());
            activityHistoryRowsRoot = ImagePanel(
                "ActivityHistoryRows",
                root,
                Ink,
                new Vector2(0f, 0f),
                new Vector2(1f, 0f),
                new Vector2(42f, 222f),
                new Vector2(-84f, 742f));
        }

        private void BuildCharacter()
        {
            var root = ScreenRoot(Screen.Character, new Color(0f, 0.03f, 0.07f, 0.48f));
            Header(root, "MY RUNNER", "Owned and equipped items are server-authoritative.");
            characterState = StatusCard(root, "Loading wardrobe from your account", -310f);
            var wardrobe = ImagePanel(
                "Wardrobe",
                root,
                Ink,
                new Vector2(0f, 0f),
                new Vector2(1f, 0f),
                new Vector2(40f, 250f),
                new Vector2(-80f, 620f));
            Label(
                "Slots",
                wardrobe,
                "WARDROBE · SELECT AN ITEM, THEN PURCHASE, EQUIP, OR UNEQUIP",
                22,
                FontStyle.Bold,
                Color.white,
                new Vector2(30f, -28f),
                new Vector2(920f, 56f),
                new Vector2(0f, 1f),
                TextAnchor.MiddleCenter);
            characterSelection = Label(
                "CharacterSelection",
                wardrobe,
                "SELECTED · --",
                21,
                FontStyle.Bold,
                Color.white,
                new Vector2(30f, -92f),
                new Vector2(920f, 62f),
                new Vector2(0f, 1f),
                TextAnchor.MiddleCenter);
            var items = ImagePanel(
                "CosmeticItems",
                wardrobe,
                new Color(0.01f, 0.06f, 0.12f, 0.92f),
                new Vector2(0f, 0f),
                new Vector2(1f, 1f),
                new Vector2(30f, 382f),
                new Vector2(-30f, -188f));
            characterItemsRoot = items.transform;
            Button(
                "PurchaseSelectedCosmetic",
                wardrobe,
                "PURCHASE SELECTED",
                new Vector2(30f, -410f),
                new Vector2(286f, 82f),
                new Vector2(0f, 1f),
                PanelSoft,
                () => journey?.PurchaseSelectedCosmetic());
            Button(
                "EquipSelectedCosmetic",
                wardrobe,
                "EQUIP SELECTED",
                new Vector2(337f, -410f),
                new Vector2(286f, 82f),
                new Vector2(0f, 1f),
                Blue,
                () => journey?.EquipSelectedCosmetic());
            Button(
                "UnequipSelectedCosmetic",
                wardrobe,
                "UNEQUIP",
                new Vector2(644f, -410f),
                new Vector2(286f, 82f),
                new Vector2(0f, 1f),
                new Color(0.22f, 0.24f, 0.31f, 0.96f),
                () => journey?.UnequipSelectedCosmetic());
            characterPresetSummary = Label(
                "WardrobePresetSummary",
                wardrobe,
                "PRESET 1 · --",
                19,
                FontStyle.Normal,
                Color.white,
                new Vector2(30f, -510f),
                new Vector2(500f, 64f),
                new Vector2(0f, 1f),
                TextAnchor.MiddleLeft);
            Button(
                "SaveWardrobePresetOne",
                wardrobe,
                "SAVE PRESET 1",
                new Vector2(548f, -500f),
                new Vector2(382f, 72f),
                new Vector2(0f, 1f),
                Gold,
                () => journey?.SaveWardrobePreset(1, "Live Journey"));
            Button(
                "RefreshCosmeticInventory",
                wardrobe,
                "REFRESH WARDROBE",
                new Vector2(260f, -594f),
                new Vector2(440f, 64f),
                new Vector2(0f, 1f),
                new Color(0.04f, 0.28f, 0.40f, 0.96f),
                () => journey?.RefreshCosmeticInventory());
            RefreshCharacterUi();
        }

        private void BuildWorld()
        {
            var root = ScreenRoot(Screen.World, Ink);
            worldState = StatusCard(root, "Choose a continent to begin", -310f);
            var names = new[]
            {
                "LUMINA", "SOLARIS", "AQUAVEL", "VERDANT",
                "AURORA", "EMBERFALL", "ZEPHYRIA", "TERRANOVA",
                "CRYSTAL", "MOONLEAF", "NOVAHEIM", "CROWN REACH",
            };
            if (worldSelectionStage == 0)
            {
                Header(root, "WORLD MAP", "12 continents · 192 regions · 2,304 route definitions");
                for (var index = 0; index < names.Length; index++)
                {
                    var continentNumber = index + 1;
                    Button($"Continent{continentNumber}", root, names[index],
                        new Vector2(52f + index % 3 * 332f, -456f - index / 3 * 172f),
                        new Vector2(304f, 144f), new Vector2(0f, 1f), Blue,
                        () => SelectWorldContinent(continentNumber));
                }
            }
            else if (worldSelectionStage == 1)
            {
                Header(root, $"{names[selectedWorldContinent - 1]} REGIONS", "Choose one of 16 regions");
                for (var index = 0; index < 16; index++)
                {
                    var region = index + 1;
                    Button($"Region{region}", root, $"REGION {region:00}",
                        new Vector2(52f + index % 4 * 248f, -456f - index / 4 * 172f),
                        new Vector2(220f, 144f), new Vector2(0f, 1f), Blue,
                        () => SelectWorldRegion(region));
                }
                Button("WorldBack", root, "BACK", new Vector2(52f, -1180f), new Vector2(220f, 80f), new Vector2(0f, 1f), PanelSoft, () => { worldSelectionStage = 0; RebuildWorld(); });
            }
            else
            {
                Header(root, $"REGION {selectedWorldRegion:00} COURSES", "Choose one of 12 playable courses");
                for (var index = 0; index < 12; index++)
                {
                    var course = index + 1;
                    var routeId = $"C{selectedWorldContinent:00}-R{selectedWorldRegion:00}-S{course:00}";
                    Button($"Course{course}", root, $"COURSE {course:00}\nSELECT", new Vector2(52f + index % 3 * 332f, -456f - index / 3 * 172f), new Vector2(304f, 144f), new Vector2(0f, 1f), Blue, () => journey?.SelectRoute(routeId));
                }
                Button("WorldBack", root, "BACK TO REGIONS", new Vector2(52f, -1180f), new Vector2(300f, 80f), new Vector2(0f, 1f), PanelSoft, () => { worldSelectionStage = 1; RebuildWorld(); });
            }
            if (worldSelectionStage == 0)
            {
                Button(
                    "OpenMonthlyApex",
                    root,
                    "MONTHLY APEX · 120 CHECKPOINTS · WORLD CROWN AT 1,000 KM",
                    new Vector2(52f, -1180f),
                    new Vector2(976f, 80f),
                    new Vector2(0f, 1f),
                    Gold,
                    () => GoTo(Screen.MonthlyApex));
            }
        }

        private void SelectWorldContinent(int continent)
        {
            selectedWorldContinent = continent;
            worldSelectionStage = 1;
            RebuildWorld();
        }

        private void SelectWorldRegion(int region)
        {
            selectedWorldRegion = region;
            worldSelectionStage = 2;
            RebuildWorld();
        }

        private void RebuildWorld()
        {
            if (!screens.TryGetValue(Screen.World, out var old)) return;
            Destroy(old);
            screens.Remove(Screen.World);
            BuildWorld();
            Show(Screen.World);
        }

        private void BuildMonthlyApex()
        {
            var root = ScreenRoot(
                Screen.MonthlyApex,
                new Color(0.005f, 0.03f, 0.065f, 0.90f));
            Header(
                root,
                "MONTHLY APEX",
                "120 server-verified checkpoints. 1,000 km is the only World Crown.");
            monthlyApexState = StatusCard(
                root,
                "Load your server-authoritative monthly progress.",
                -310f);
            monthlyApexSummary = Label(
                "MonthlyApexSummary",
                root,
                "MONTHLY DISTANCE --\nNEXT CHECKPOINT --\nWORLD CROWN --",
                30,
                FontStyle.Bold,
                Color.white,
                new Vector2(72f, -480f),
                new Vector2(930f, 260f),
                new Vector2(0f, 1f),
                TextAnchor.MiddleCenter);
            monthlyApexClaimButton = Button(
                "ClaimMonthlyCheckpoint",
                root,
                "CHECK SERVER PROGRESS",
                new Vector2(72f, -790f),
                new Vector2(936f, 112f),
                new Vector2(0f, 1f),
                Blue,
                ClaimNextMonthlyCheckpoint);
            Button(
                "RefreshMonthlyApex",
                root,
                "REFRESH",
                new Vector2(72f, -930f),
                new Vector2(450f, 92f),
                new Vector2(0f, 1f),
                PanelSoft,
                () => journey?.RefreshMonthlyApex());
            Button(
                "MonthlyApexBack",
                root,
                "BACK TO WORLD",
                new Vector2(-72f, -930f),
                new Vector2(450f, 92f),
                new Vector2(1f, 1f),
                PanelSoft,
                NavigateBack);
        }

        private void BuildCrew()
        {
            var root = ScreenRoot(Screen.Crew, Ink);
            Header(root, "CREW & RANKING", "Only verified public activity can enter social rankings.");
            crewState = StatusCard(root, "Loading your crew…", -310f);
            var create = ImagePanel(
                "CrewCreate",
                root,
                Panel,
                new Vector2(0f, 1f),
                new Vector2(1f, 1f),
                new Vector2(52f, -458f),
                new Vector2(-104f, 190f));
            Label(
                "Title",
                create,
                "CREATE A CREW",
                26,
                FontStyle.Bold,
                Cyan,
                new Vector2(24f, -18f),
                new Vector2(640f, 40f),
                new Vector2(0f, 1f));
            crewNameInput = TextInput(
                "CrewName",
                create,
                "Crew name, 3–32 characters",
                new Vector2(24f, -76f),
                new Vector2(600f, 82f),
                new Vector2(0f, 1f));
            Button(
                "CreateCrew",
                create,
                "CREATE",
                new Vector2(-24f, -76f),
                new Vector2(230f, 82f),
                new Vector2(1f, 1f),
                Blue,
                () => journey?.CreateCrew(crewNameInput?.text));

            var search = ImagePanel(
                "CrewSearch",
                root,
                Panel,
                new Vector2(0f, 1f),
                new Vector2(1f, 1f),
                new Vector2(52f, -674f),
                new Vector2(-104f, 190f));
            Label(
                "Title",
                search,
                "FIND A CREW",
                26,
                FontStyle.Bold,
                Cyan,
                new Vector2(24f, -18f),
                new Vector2(640f, 40f),
                new Vector2(0f, 1f));
            crewSearchInput = TextInput(
                "CrewSearchQuery",
                search,
                "Search by crew name",
                new Vector2(24f, -76f),
                new Vector2(600f, 82f),
                new Vector2(0f, 1f));
            Button(
                "SearchCrew",
                search,
                "SEARCH",
                new Vector2(-24f, -76f),
                new Vector2(230f, 82f),
                new Vector2(1f, 1f),
                PanelSoft,
                () => journey?.SearchCrews(crewSearchInput?.text));

            var membership = ImagePanel(
                "CrewMembership",
                root,
                new Color(0.025f, 0.14f, 0.25f, 0.98f),
                new Vector2(0f, 1f),
                new Vector2(1f, 1f),
                new Vector2(52f, -890f),
                new Vector2(-104f, 164f));
            Label(
                "MyCrew",
                membership,
                "MY CREW",
                26,
                FontStyle.Bold,
                Color.white,
                new Vector2(24f, -20f),
                new Vector2(650f, 100f),
                new Vector2(0f, 1f));
            Button(
                "RefreshCrew",
                membership,
                "REFRESH",
                new Vector2(-250f, -42f),
                new Vector2(210f, 74f),
                new Vector2(1f, 1f),
                PanelSoft,
                () => journey?.RefreshCrew());
            Button(
                "LeaveCrew",
                membership,
                "LEAVE",
                new Vector2(-24f, -42f),
                new Vector2(190f, 74f),
                new Vector2(1f, 1f),
                Gold,
                () => journey?.LeaveCrew());

            Label(
                "SearchResultsTitle",
                root,
                "CREW RESULTS",
                25,
                FontStyle.Bold,
                Color.white,
                new Vector2(52f, -1088f),
                new Vector2(500f, 44f),
                new Vector2(0f, 1f));
            crewResultsRoot = ImagePanel(
                "CrewResults",
                root,
                Ink,
                new Vector2(0f, 1f),
                new Vector2(1f, 1f),
                new Vector2(52f, -1140f),
                new Vector2(-104f, 470f));
            RefreshCrewUi();
        }

        private void BuildSettings()
        {
            var root = ScreenRoot(Screen.Settings, Ink);
            Header(root, "SETTINGS", "Runtime controls apply now and sync to your account when signed in.");
            var gps = bridge == null ? "Unavailable" : bridge.DirectGpsCapability;
            SettingsRow(root, "DIRECT GPS", gps, -330f, null);
            SettingsRow(
                root,
                "AUDIO",
                PlayerPrefs.GetInt(AudioKey, 1) == 1 ? "ON" : "OFF",
                -460f,
                ToggleAudio);
            SettingsRow(
                root,
                "UNITS",
                PlayerPrefs.GetInt(UnitsKey, 1) == 1 ? "METRIC" : "IMPERIAL",
                -590f,
                ToggleUnits);
            SettingsRow(
                root,
                "GRAPHICS",
                PlayerPrefs.GetInt(GraphicsKey, 1) == 1 ? "HIGH" : "BATTERY",
                -720f,
                ToggleGraphics);
            SettingsRow(
                root,
                "FRAME RATE",
                PlayerPrefs.GetInt(BatteryKey, 0) == 1 ? "30 FPS" : "60 FPS",
                -850f,
                ToggleBattery);
            SettingsRow(
                root,
                "AUTO PAUSE",
                bridge?.AutoPauseStatus ?? "Unavailable",
                -980f,
                bridge == null ? null : ToggleAutoPause);
            SettingsRow(
                root,
                "NOTIFICATIONS",
                bridge?.NotificationPermissionStatus ?? "Unavailable",
                -1110f,
                bridge == null ? null : RequestNotificationPermission);
            SettingsRow(
                root,
                "HEALTH CONNECT",
                bridge?.HealthConnectCapability ?? "Unavailable",
                -1240f,
                bridge == null ? null : RequestHealthConnectPermission);
            Button(
                "SyncSettings",
                root,
                journey != null && journey.AccountSummaryLoaded
                    ? "SYNC SETTINGS"
                    : "SIGN IN TO SYNC SETTINGS",
                new Vector2(52f, -1372f),
                new Vector2(976f, 96f),
                new Vector2(0f, 1f),
                PanelSoft,
                SyncRuntimePreferences);
            Button(
                "AccountAction",
                root,
                journey != null && journey.AccountSummaryLoaded
                    ? "SIGN OUT"
                    : "CONTINUE AS GUEST",
                new Vector2(52f, -1484f),
                new Vector2(976f, 96f),
                new Vector2(0f, 1f),
                PanelSoft,
                () =>
                {
                    if (journey == null)
                    {
                        Publish("Account runtime unavailable");
                        return;
                    }
                    if (journey.AccountSummaryLoaded)
                    {
                        journey.SignOut();
                    }
                    else
                    {
                        journey.AuthenticateGuest();
                    }
                });
            Button(
                "CrewShortcut",
                root,
                "CREW & RANKINGS",
                new Vector2(52f, -1596f),
                new Vector2(976f, 96f),
                new Vector2(0f, 1f),
                PanelSoft,
                () => GoTo(Screen.Crew));
            Label(
                "SettingsTruth",
                root,
                "Guest access is protected on this device and can be signed out here. Provider connections remain disabled unless an official capability is available. Account upgrades require the dedicated V14 server project.",
                24,
                FontStyle.Normal,
                Color.white,
                new Vector2(80f, -1722f),
                new Vector2(920f, 180f),
                new Vector2(0f, 1f),
                TextAnchor.MiddleCenter);
        }

        private Transform ScreenRoot(Screen screen, Color background)
        {
            var root = Ui(screen.ToString(), flowRoot);
            Stretch(root.GetComponent<RectTransform>());
            if (background.a > 0f)
            {
                root.AddComponent<Image>().color = background;
            }
            screens[screen] = root;
            root.SetActive(false);
            return root.transform;
        }

        private void Header(Transform parent, string title, string subtitle)
        {
            Label(
                "ScreenTitle",
                parent,
                title,
                48,
                FontStyle.Bold,
                Color.white,
                new Vector2(52f, -132f),
                new Vector2(976f, 72f),
                new Vector2(0f, 1f));
            Label(
                "ScreenSubtitle",
                parent,
                subtitle,
                23,
                FontStyle.Normal,
                Cyan,
                new Vector2(52f, -208f),
                new Vector2(976f, 66f),
                new Vector2(0f, 1f));
        }

        private Text StatusCard(Transform parent, string value, float y)
        {
            var panel = ImagePanel(
                "Status",
                parent,
                Panel,
                new Vector2(0f, 1f),
                new Vector2(1f, 1f),
                new Vector2(52f, y),
                new Vector2(-104f, 104f));
            return CenterLabel(panel, value, 24, Color.white);
        }

        private void ConnectionRow(
            Transform parent,
            string name,
            string detail,
            float y,
            bool available)
        {
            var row = ImagePanel(
                $"Connection{name}",
                parent,
                Panel,
                new Vector2(0f, 1f),
                new Vector2(1f, 1f),
                new Vector2(82f, y),
                new Vector2(-164f, 80f));
            Label(
                "Name",
                row,
                name,
                24,
                FontStyle.Bold,
                Color.white,
                new Vector2(20f, -12f),
                new Vector2(320f, 50f),
                new Vector2(0f, 1f));
            Label(
                "Detail",
                row,
                detail,
                20,
                FontStyle.Normal,
                available ? Green : new Color(0.64f, 0.70f, 0.78f),
                new Vector2(-20f, -12f),
                new Vector2(560f, 50f),
                new Vector2(1f, 1f),
                TextAnchor.MiddleRight);
        }

        private void ChoiceRow(Transform parent, string title, string[] choices, float y)
        {
            Label(
                $"Choice{title}",
                parent,
                title,
                25,
                FontStyle.Bold,
                Color.white,
                new Vector2(52f, y),
                new Vector2(220f, 70f),
                new Vector2(0f, 1f));
            for (var index = 0; index < choices.Length; index++)
            {
                Button(
                    $"{title}{choices[index]}",
                    parent,
                    choices[index],
                    new Vector2(300f + index * 235f, y),
                    new Vector2(210f, 76f),
                    new Vector2(0f, 1f),
                    index == 0 ? Blue : PanelSoft,
                    null).interactable = false;
            }
        }

        private void SettingsRow(
            Transform parent,
            string title,
            string value,
            float y,
            Action action)
        {
            var row = ImagePanel(
                $"Setting{title}",
                parent,
                Panel,
                new Vector2(0f, 1f),
                new Vector2(1f, 1f),
                new Vector2(52f, y),
                new Vector2(-104f, 102f));
            Label(
                "Title",
                row,
                title,
                25,
                FontStyle.Bold,
                Color.white,
                new Vector2(26f, -18f),
                new Vector2(420f, 60f),
                new Vector2(0f, 1f));
            var button = Button(
                "Value",
                row,
                value.ToUpperInvariant(),
                new Vector2(-26f, -13f),
                new Vector2(430f, 70f),
                new Vector2(1f, 1f),
                action == null ? Panel : Blue,
                action);
            button.interactable = action != null;
        }

        private Text CenterMetric(
            Transform parent,
            string name,
            string value,
            string caption,
            float y,
            int size)
        {
            var text = Label(
                name,
                parent,
                $"{value}\n{caption}",
                size,
                FontStyle.Bold,
                Color.white,
                new Vector2(120f, y),
                new Vector2(840f, 240f),
                new Vector2(0f, 1f),
                TextAnchor.MiddleCenter);
            return text;
        }

        private Text MetricCell(
            Transform parent,
            string name,
            string value,
            string caption,
            float x,
            float y,
            float width = 290f)
        {
            var card = ImagePanel(
                $"{name}Card",
                parent,
                Panel,
                new Vector2(0f, 1f),
                new Vector2(0f, 1f),
                new Vector2(x, y),
                new Vector2(width, 112f));
            return Label(
                name,
                card,
                $"{value}\n{caption}",
                27,
                FontStyle.Bold,
                Color.white,
                Vector2.zero,
                Vector2.zero,
                new Vector2(0.5f, 0.5f),
                TextAnchor.MiddleCenter);
        }

        private void SelectTraining(string template)
        {
            selectedTraining = NormalizeTrainingId(template);
            EnsureTrainingPageForSelection();
            PlayerPrefs.SetString(TrainingKey, selectedTraining);
            PlayerPrefs.Save();
            RefreshTrainingSelection();
            if (trainingStartButton != null)
            {
                SetButtonText(trainingStartButton, $"START {selectedTraining.Replace('_', ' ')}");
            }
            Publish($"{selectedTraining.Replace('_', ' ')} selected");
        }

        private void SelectTrainingSlot(int slot)
        {
            var planIndex = trainingPage * TrainingPlansPerPage + slot;
            if (planIndex < 0 || planIndex >= TrainingPlans.Length)
            {
                return;
            }
            SelectTraining(TrainingPlans[planIndex].id);
        }

        private void ChangeTrainingPage(int delta)
        {
            var pageCount = Mathf.CeilToInt(
                TrainingPlans.Length / (float)TrainingPlansPerPage);
            trainingPage = Mathf.Clamp(trainingPage + delta, 0, pageCount - 1);
            RefreshTrainingPlanPage();
        }

        private void EnsureTrainingPageForSelection()
        {
            for (var index = 0; index < TrainingPlans.Length; index++)
            {
                if (TrainingPlans[index].id == selectedTraining)
                {
                    trainingPage = index / TrainingPlansPerPage;
                    return;
                }
            }
            trainingPage = 0;
        }

        private void RefreshTrainingPlanPage()
        {
            if (trainingPlanSlots.Count == 0)
            {
                return;
            }
            var pageCount = Mathf.CeilToInt(
                TrainingPlans.Length / (float)TrainingPlansPerPage);
            trainingPage = Mathf.Clamp(trainingPage, 0, pageCount - 1);
            trainingButtons.Clear();
            for (var slot = 0; slot < trainingPlanSlots.Count; slot++)
            {
                var button = trainingPlanSlots[slot];
                var planIndex = trainingPage * TrainingPlansPerPage + slot;
                var available = planIndex < TrainingPlans.Length;
                button.gameObject.SetActive(available);
                if (!available)
                {
                    continue;
                }
                var plan = TrainingPlans[planIndex];
                trainingButtons[plan.id] = button;
                var serverPlanAvailable = journey == null ||
                    !journey.TrainingTemplatesLoaded ||
                    journey.IsTrainingTemplateAvailable(plan.id);
                button.interactable = serverPlanAvailable;
                SetButtonText(
                    button,
                    $"{plan.label}\n{journey?.TrainingTemplateDetail(plan.id) ?? "SERVER PLAN LOADING"}");
            }
            if (trainingPageLabel != null)
            {
                trainingPageLabel.text = $"PLANS {trainingPage + 1}/{pageCount}";
            }
            if (trainingPreviousPageButton != null)
            {
                trainingPreviousPageButton.interactable = trainingPage > 0;
            }
            if (trainingNextPageButton != null)
            {
                trainingNextPageButton.interactable = trainingPage < pageCount - 1;
            }
            RefreshTrainingSelection();
        }

        private void RefreshTrainingSelection()
        {
            foreach (var item in trainingButtons)
            {
                if (item.Value?.targetGraphic != null)
                {
                    item.Value.targetGraphic.color =
                        item.Key == selectedTraining ? Blue : PanelSoft;
                }
            }
        }

        private void RefreshMatchmakingSelection()
        {
            foreach (var item in raceDistanceButtons)
            {
                if (item.Value?.targetGraphic != null)
                {
                    item.Value.targetGraphic.color = item.Key == selectedRaceDistanceMeters
                        ? Blue
                        : PanelSoft;
                }
            }
            foreach (var item in raceRegionButtons)
            {
                if (item.Value?.targetGraphic != null)
                {
                    item.Value.targetGraphic.color = item.Key == selectedRaceRegion
                        ? Blue
                        : PanelSoft;
                }
            }
        }

        private void StartSelectedTraining()
        {
            selectedTraining = NormalizeTrainingId(selectedTraining);
            if (journey != null && journey.TrainingTemplatesLoaded &&
                !journey.IsTrainingTemplateAvailable(selectedTraining))
            {
                Publish("Selected plan is unavailable on the server");
                return;
            }
            liveSamples.Clear();
            ResetMetrics();
            GoTo(Screen.ActiveTraining);
            journey?.StartTraining(selectedTraining);
        }

        private static string NormalizeTrainingId(string template) =>
            NormalizeTrainingAlias(template) switch
            {
                var normalized when IsKnownTraining(normalized) => normalized,
                _ => "EASY_RUN",
            };

        private static string NormalizeTrainingAlias(string template) =>
            template switch
            {
                "EASY" => "EASY_RUN",
                "TEMPO" => "TEMPO_RUN",
                "INTERVAL" => "INTERVAL_TIME",
                "LONG" => "LONG_RUN",
                "FIVE_K" => "FIRST_FIVE_K",
                "HALF" => "HALF_MARATHON",
                "TREADMILL" => "TREADMILL_RUN",
                "CUSTOM" => "CUSTOM_WORKOUT",
                _ => template,
            };

        private static bool IsKnownTraining(string template)
        {
            foreach (var plan in TrainingPlans)
            {
                if (plan.id == template)
                {
                    return true;
                }
            }
            return false;
        }

        private void TogglePause()
        {
            if (journey == null)
            {
                Publish("Training runtime unavailable");
                return;
            }
            if (journey.TrainingState == V14TrainingState.SENSOR_CHECK)
            {
                journey.StartTraining(selectedTraining);
            }
            else if (journey.TrainingState == V14TrainingState.PAUSED)
            {
                journey.ResumeTraining();
            }
            else
            {
                journey.PauseTraining();
            }
        }

        private void ToggleControlsLock()
        {
            controlsLocked = !controlsLocked;
            if (pauseButton != null)
            {
                pauseButton.interactable = !controlsLocked;
            }
            if (finishButton != null)
            {
                finishButton.interactable = !controlsLocked;
            }
            Publish(controlsLocked ? "Controls locked" : "Controls unlocked");
        }

        private void ToggleAudio()
        {
            var enabled = PlayerPrefs.GetInt(AudioKey, 1) != 1;
            PlayerPrefs.SetInt(AudioKey, enabled ? 1 : 0);
            PlayerPrefs.Save();
            AudioListener.volume = enabled ? 1f : 0f;
            SyncRuntimePreferences();
            RebuildSettings();
        }

        private void ToggleUnits()
        {
            var metric = PlayerPrefs.GetInt(UnitsKey, 1) != 1;
            PlayerPrefs.SetInt(UnitsKey, metric ? 1 : 0);
            PlayerPrefs.Save();
            SyncRuntimePreferences();
            RebuildSettings();
            RefreshMetrics();
        }

        private void ToggleGraphics()
        {
            var high = PlayerPrefs.GetInt(GraphicsKey, 1) != 1;
            PlayerPrefs.SetInt(GraphicsKey, high ? 1 : 0);
            PlayerPrefs.Save();
            QualitySettings.SetQualityLevel(high
                ? Mathf.Max(0, QualitySettings.names.Length - 1)
                : 0, true);
            SyncRuntimePreferences();
            RebuildSettings();
        }

        private void ToggleBattery()
        {
            var battery = PlayerPrefs.GetInt(BatteryKey, 0) != 1;
            PlayerPrefs.SetInt(BatteryKey, battery ? 1 : 0);
            PlayerPrefs.Save();
            Application.targetFrameRate = battery ? 30 : 60;
            SyncRuntimePreferences();
            RebuildSettings();
        }

        private void ToggleAutoPause()
        {
            Publish(bridge?.ToggleAutoPause() ?? "bridge_unavailable");
            SyncRuntimePreferences();
            RebuildSettings();
        }

        private void SyncRuntimePreferences()
        {
            if (journey == null || !journey.AccountSummaryLoaded)
            {
                Publish("runtime_preferences_local_only");
                return;
            }
            journey.SaveRuntimePreferences(
                PlayerPrefs.GetInt(UnitsKey, 1) == 1 ? "METRIC" : "IMPERIAL",
                PlayerPrefs.GetInt(AudioKey, 1) == 1,
                PlayerPrefs.GetInt(GraphicsKey, 1) == 1 ? "HIGH" : "BATTERY",
                (short)(PlayerPrefs.GetInt(BatteryKey, 0) == 1 ? 30 : 60),
                bridge?.AutoPauseStatus != "disabled");
        }

        private void RequestNotificationPermission()
        {
            Publish(bridge?.RequestNotificationPermission() ?? "bridge_unavailable");
            RebuildSettings();
        }

        private void RequestHealthConnectPermission()
        {
            Publish(bridge?.RequestHealthConnectPermission() ?? "bridge_unavailable");
            RebuildSettings();
        }

        private void ApplyRuntimePreferences()
        {
            AudioListener.volume = PlayerPrefs.GetInt(AudioKey, 1) == 1 ? 1f : 0f;
            Application.targetFrameRate = PlayerPrefs.GetInt(BatteryKey, 0) == 1 ? 30 : 60;
            var high = PlayerPrefs.GetInt(GraphicsKey, 1) == 1;
            QualitySettings.SetQualityLevel(
                high ? Mathf.Max(0, QualitySettings.names.Length - 1) : 0,
                true);
        }

        private void ApplyServerRuntimePreferences()
        {
            var preferences = journey?.RuntimePreferences;
            if (preferences == null || !journey.RuntimePreferencesLoaded)
            {
                return;
            }

            PlayerPrefs.SetInt(
                UnitsKey,
                string.Equals(
                    preferences.distance_unit,
                    "IMPERIAL",
                    StringComparison.OrdinalIgnoreCase) ? 0 : 1);
            PlayerPrefs.SetInt(AudioKey, preferences.audio_enabled ? 1 : 0);
            PlayerPrefs.SetInt(
                GraphicsKey,
                string.Equals(
                    preferences.graphics_profile,
                    "BATTERY",
                    StringComparison.OrdinalIgnoreCase) ? 0 : 1);
            PlayerPrefs.SetInt(
                BatteryKey,
                preferences.target_frame_rate == 30 ? 1 : 0);
            PlayerPrefs.Save();
            ApplyRuntimePreferences();

            var deviceAutoPause = bridge?.AutoPauseStatus;
            if ((deviceAutoPause == "enabled" || deviceAutoPause == "disabled") &&
                preferences.auto_pause_enabled != (deviceAutoPause == "enabled"))
            {
                bridge?.ToggleAutoPause();
            }
        }

        private void RebuildSettings()
        {
            if (!screens.TryGetValue(Screen.Settings, out var old))
            {
                return;
            }
            Destroy(old);
            screens.Remove(Screen.Settings);
            BuildSettings();
            screens[Screen.Settings].transform.SetSiblingIndex(11);
            Show(Screen.Settings);
        }

        private void OnJourneyStatus(string status)
        {
            Publish(Humanize(status));
            if (status == "runtime_preferences_loaded" ||
                status == "runtime_preferences_saved")
            {
                ApplyServerRuntimePreferences();
                if (currentScreen == Screen.Settings)
                {
                    RebuildSettings();
                }
            }
            if (syncState != null && currentScreen == Screen.Sync)
            {
                RefreshSyncView();
                syncState.text = Humanize(status);
            }
            if (matchmakingState != null && currentScreen == Screen.Matchmaking)
            {
                matchmakingState.text = Humanize(status);
            }
            if (characterState != null && currentScreen == Screen.Character)
            {
                characterState.text = Humanize(status);
                if (status == "cosmetics_loaded" ||
                    status == "inventory_added" ||
                    status.StartsWith("cosmetic_selected:", StringComparison.Ordinal) ||
                    status.StartsWith("appearance_", StringComparison.Ordinal) ||
                    status == "wardrobe_preset_saved")
                {
                    RefreshCharacterUi();
                }
                if (status == "cosmetics_loaded")
                {
                    ApplyServerEquippedCosmetics();
                }
            }
            if (activityHistoryState != null &&
                currentScreen == Screen.ActivityHistory)
            {
                activityHistoryState.text = Humanize(status);
                if (status == "activity_history_loaded" ||
                    status == "activity_history_empty")
                {
                    RefreshActivityHistoryUi();
                }
            }
            if (monthlyApexState != null && currentScreen == Screen.MonthlyApex)
            {
                monthlyApexState.text = Humanize(status);
                if (status == "monthly_apex_loaded" ||
                    status == "monthly_checkpoint_claimed" ||
                    status == "monthly_checkpoint_already_claimed")
                {
                    RefreshMonthlyApexUi();
                }
            }
            if (worldState != null && currentScreen == Screen.World)
            {
                RefreshWorldUi();
            }
            if (crewState != null && currentScreen == Screen.Crew &&
                status.StartsWith("crew_", StringComparison.Ordinal))
            {
                RefreshCrewUi();
            }
            if (currentScreen == Screen.Settings &&
                (status.StartsWith("authentication_", StringComparison.Ordinal) ||
                 status.StartsWith("sign_out", StringComparison.Ordinal) ||
                 status == "signed_out" || status == "authenticated" ||
                 status == "runtime_preferences_saved" ||
                 status == "runtime_preferences_loaded"))
            {
                RebuildSettings();
            }
            if (status == "training_catalog_loaded" &&
                currentScreen == Screen.Training)
            {
                RefreshTrainingPlanPage();
            }
            if (status == "training_active")
            {
                Show(Screen.ActiveTraining);
                runner?.Play("steady_run");
            }
            else if (status.StartsWith(
                         "appearance_persisted:",
                         StringComparison.Ordinal))
            {
                ApplyEquippedCosmetic(status["appearance_persisted:".Length..]);
            }
            else if (status.StartsWith(
                         "appearance_unequipped:",
                         StringComparison.Ordinal))
            {
                ApplyUnequippedCosmetic(status["appearance_unequipped:".Length..]);
            }
            else if (status == "training_rewarded")
            {
                RefreshApprovedResources();
                RefreshTrainingResult();
                Show(Screen.TrainingResult);
            }
            else if (status == "race_lobby_ready")
            {
                RefreshRaceUi();
                Show(Screen.Lobby);
            }
            else if (status.StartsWith(
                         "race_countdown:",
                         StringComparison.Ordinal))
            {
                RefreshRaceUi();
                Show(Screen.Lobby);
            }
            else if (status == "race_active" ||
                     status == "race_reconnected")
            {
                RefreshRaceUi();
                Show(Screen.LiveRace);
                runner?.Play("steady_run");
            }
            else if (status == "race_reconnect_requested" ||
                     status == "race_reconnecting")
            {
                RefreshRaceUi();
                Show(Screen.LiveRace);
            }
            else if (status == "race_rewarded")
            {
                RefreshApprovedResources();
                RefreshRaceUi();
                Show(Screen.RaceResult);
            }
        }

        private void OnBridgeStatus(string status)
        {
            if (status == "capturing")
            {
                Show(
                    journey != null &&
                    journey.RaceState == V14RaceState.ACTIVE
                        ? Screen.LiveRace
                        : Screen.ActiveTraining);
            }
            if (activeGps != null)
            {
                activeGps.text = status.StartsWith("capturing", StringComparison.Ordinal)
                    ? "GPS · RECORDING"
                    : $"GPS · {Humanize(status).ToUpperInvariant()}";
            }
            Publish(Humanize(status));
            if (currentScreen == Screen.Sync)
            {
                RefreshSyncView();
                if (syncState != null)
                {
                    syncState.text = Humanize(status);
                }
            }
        }

        private void OnGpsSample(GpsSample sample, int count)
        {
            liveSamples.Add(sample);
            RefreshMetrics();
        }

        private void RefreshRuntimeState()
        {
            if (journey == null)
            {
                return;
            }
            RefreshApprovedResources();
            RefreshRaceUi();
            if (currentScreen == Screen.Crew)
            {
                RefreshCrewUi();
            }
            if (currentScreen == Screen.World)
            {
                RefreshWorldUi();
            }
            if (activeState != null)
            {
                activeState.text = journey.TrainingState.ToString().Replace('_', ' ');
            }
            if (activeGps != null &&
                bridge != null &&
                journey.TrainingState == V14TrainingState.SENSOR_CHECK &&
                bridge.DirectGpsCapability == "ready")
            {
                activeGps.text = "GPS · READY";
            }
            if (pauseButton != null)
            {
                var paused = journey.TrainingState == V14TrainingState.PAUSED;
                var sensorCheck =
                    journey.TrainingState == V14TrainingState.SENSOR_CHECK;
                SetButtonText(
                    pauseButton,
                    sensorCheck ? "RETRY START" : paused ? "RESUME" : "PAUSE");
                pauseButton.interactable = !controlsLocked &&
                    journey.TrainingState is V14TrainingState.SENSOR_CHECK or
                        V14TrainingState.ACTIVE or
                        V14TrainingState.PAUSED;
            }
            if (finishButton != null)
            {
                finishButton.interactable = !controlsLocked &&
                    journey.TrainingState is V14TrainingState.ACTIVE or
                        V14TrainingState.PAUSED or
                        V14TrainingState.RESUMED;
            }
        }

        private void RefreshWorldUi()
        {
            if (worldState == null || journey == null)
            {
                return;
            }
            worldState.text = journey.ActiveRouteLoaded
                ? $"ACTIVE {journey.ActiveRouteId} · " +
                  $"{journey.ActiveRouteProgressMeters / 1000f:0.00} / " +
                  $"{journey.ActiveRouteTargetMeters / 1000f:0.00} km"
                : "Choose an open route to begin your live journey.";
        }

        private void RefreshRaceUi()
        {
            if (journey == null)
            {
                return;
            }
            if (matchmakingState != null)
            {
                matchmakingState.text = journey.RaceState switch
                {
                    V14RaceState.BROWSE => "Queue is idle",
                    V14RaceState.MATCHMAKING =>
                        "Waiting for exactly 8 verified runners",
                    _ => Humanize(journey.RaceState.ToString()),
                };
            }
            if (lobbyState != null)
            {
                lobbyState.text = journey.RaceLobbySummary;
            }
            var labels = journey.RaceParticipantLabels;
            for (var index = 0;
                 index < lobbySlots.Count && index < labels.Length;
                 index++)
            {
                lobbySlots[index].text = labels[index];
                lobbySlots[index].color =
                    labels[index].EndsWith("READY", StringComparison.Ordinal)
                        ? Green
                        : Color.white;
            }
            if (lobbyCountdown != null)
            {
                lobbyCountdown.text =
                    journey.RaceState == V14RaceState.SERVER_COUNTDOWN
                        ? $"SERVER COUNTDOWN {journey.RaceCountdownSeconds}"
                        : journey.RaceState == V14RaceState.READY
                            ? "WAITING FOR ALL 8 RUNNERS TO READY"
                            : "SERVER COUNTDOWN --";
            }
            if (raceReadyButton != null)
            {
                var waiting =
                    journey.RaceState == V14RaceState.LOBBY;
                raceReadyButton.interactable = waiting;
                SetButtonText(
                    raceReadyButton,
                    waiting ? "READY" : "READY CONFIRMED");
            }
            if (liveRaceState != null)
            {
                liveRaceState.text =
                    $"{journey.RaceState} · {journey.RaceNetworkState}";
            }
            if (liveRaceMetrics != null)
            {
                var pace = journey.RaceRollingPaceMillisecondsPerKilometer;
                liveRaceMetrics.text =
                    $"RANK {(journey.RaceProvisionalPlace > 0 ? journey.RaceProvisionalPlace.ToString() : "--")} / 8\n" +
                    $"DISTANCE {journey.RaceFilteredDistanceMeters / 1000f:0.00} / " +
                    $"{journey.RaceDistanceMeters / 1000f:0.00} km\n" +
                    $"PACE {(pace > 0 ? TimeSpan.FromMilliseconds(pace).ToString("m\\:ss") : "--")} /km\n" +
                    $"ELAPSED {TimeSpan.FromMilliseconds(journey.RaceElapsedMilliseconds):mm\\:ss}\n" +
                    $"NETWORK {journey.RaceNetworkState}";
            }
            if (liveRaceStandings != null)
            {
                liveRaceStandings.text =
                    string.Join("\n", journey.RaceStandingLabels);
            }
            if (liveRaceProgressStrip != null)
            {
                var standings = journey.RaceStandingLabels;
                liveRaceProgressStrip.text = standings.Length == 0
                    ? "SERVER PROGRESS · WAITING FOR LIVE SNAPSHOT"
                    : string.Join("  ·  ", standings);
            }
            if (raceFinishButton != null)
            {
                raceFinishButton.interactable =
                    journey.RaceState == V14RaceState.ACTIVE &&
                    journey.RaceFilteredDistanceMeters >=
                    journey.RaceDistanceMeters;
            }
            if (raceReconnectButton != null)
            {
                var connectionLost =
                    journey.RaceState == V14RaceState.CONNECTION_LOST;
                var reconnecting =
                    journey.RaceState == V14RaceState.RECONNECTING;
                raceReconnectButton.gameObject.SetActive(
                    connectionLost || reconnecting);
                raceReconnectButton.interactable = connectionLost;
                SetButtonText(
                    raceReconnectButton,
                    reconnecting ? "RECONNECTING…" : "RETRY CONNECTION");
            }
            if (raceResultState != null)
            {
                raceResultState.text = journey.LastRacePlace > 0
                    ? "SERVER VERIFIED · REWARD SAVED"
                    : "No finalized race result";
            }
            if (raceResultValues != null && journey.LastRacePlace > 0)
            {
                raceResultValues.text =
                    $"FINAL RANK {journey.LastRacePlace} / 8\n" +
                    $"FINISH TIME {TimeSpan.FromMilliseconds(journey.LastRaceElapsedMilliseconds):mm\\:ss\\.ff}\n" +
                    $"XP +{journey.LastRaceXp}   COINS +{journey.LastRaceRunCoins}\n" +
                    $"RATING {journey.LastRaceRatingBefore} " +
                    $"{journey.LastRaceRatingDelta:+#;-#;0} → " +
                    $"{journey.LastRaceRatingAfter}";
            }
        }

        private void RefreshMetrics()
        {
            if (liveSamples.Count == 0)
            {
                return;
            }
            var last = liveSamples[^1];
            var distanceMeters = 0.0;
            var unstableSegments = 0;
            var movingMilliseconds = 0L;
            var latestSegmentSpeed = 0.0;
            for (var index = 1; index < liveSamples.Count; index++)
            {
                var previous = liveSamples[index - 1];
                var current = liveSamples[index];
                var elapsedMilliseconds =
                    current.unixTimeMilliseconds - previous.unixTimeMilliseconds;
                if (elapsedMilliseconds <= 0)
                {
                    continue;
                }
                var segmentMeters = Haversine(previous, current);
                var segmentSpeed =
                    segmentMeters / (elapsedMilliseconds / 1000.0);
                if (segmentSpeed > 9.5)
                {
                    unstableSegments++;
                    continue;
                }
                if (segmentSpeed >= 0.5)
                {
                    distanceMeters += segmentMeters;
                    movingMilliseconds += elapsedMilliseconds;
                    latestSegmentSpeed = segmentSpeed;
                }
            }
            var elapsedSeconds = movingMilliseconds / 1000.0;
            var metric = PlayerPrefs.GetInt(UnitsKey, 1) == 1;
            var distance = metric
                ? $"{distanceMeters / 1000.0:0.00} km"
                : $"{distanceMeters / 1609.344:0.00} mi";
            activeDistance.text = $"{distance}\nDISTANCE";
            activeElapsed.text = $"{TimeSpan.FromSeconds(elapsedSeconds):hh\\:mm\\:ss}\nELAPSED";
            var currentPace = last.hasSpeed && last.speedMetersPerSecond > 0.2f
                ? Pace(last.speedMetersPerSecond, metric)
                : Pace(latestSegmentSpeed, metric);
            var averageSpeed = elapsedSeconds > 0 ? distanceMeters / elapsedSeconds : 0.0;
            activeCurrentPace.text = $"{currentPace}\nCURRENT PACE";
            activeAveragePace.text = $"{Pace(averageSpeed, metric)}\nAVERAGE PACE";
            activeAltitude.text = last.hasAltitude
                ? $"{last.altitudeMeters:0} m\nALTITUDE"
                : "--\nALTITUDE";
            activeGps.text = unstableSegments > 0
                ? $"GPS · SIGNAL UNSTABLE · {unstableSegments} rejected"
                : $"GPS · ±{last.accuracyMeters:0} m · {liveSamples.Count} samples";
        }

        private void ResetMetrics()
        {
            if (activeDistance == null)
            {
                return;
            }
            activeDistance.text = "--\nDISTANCE";
            activeElapsed.text = "--:--:--\nELAPSED";
            activeCurrentPace.text = "--\nCURRENT PACE";
            activeAveragePace.text = "--\nAVERAGE PACE";
            activeHeartRate.text = "--\nHEART RATE";
            activeCadence.text = "--\nCADENCE";
            activeAltitude.text = "--\nALTITUDE";
            activeGps.text = "GPS · waiting";
        }

        private void ApplyEquippedCosmetic(string itemId)
        {
            V14CosmeticCatalogRow item = null;
            foreach (var catalogItem in journey?.CosmeticCatalog ??
                Array.Empty<V14CosmeticCatalogRow>())
            {
                if (string.Equals(catalogItem.item_id, itemId,
                    StringComparison.Ordinal))
                {
                    item = catalogItem;
                    break;
                }
            }
            if (item == null)
            {
                return;
            }
            PlayerPrefs.SetString(
                $"runningup.v14.equipped-{item.category.ToLowerInvariant()}",
                item.item_id);
            PlayerPrefs.Save();
            ApplyCosmeticMaterial(item.category, CosmeticColor(item.item_id));
            runner?.Play("cheer");
        }

        private void ApplyServerEquippedCosmetics()
        {
            foreach (var item in journey?.CosmeticCatalog ??
                Array.Empty<V14CosmeticCatalogRow>())
            {
                if (!item.equipped)
                {
                    continue;
                }
                PlayerPrefs.SetString(
                    $"runningup.v14.equipped-{item.category.ToLowerInvariant()}",
                    item.item_id);
                ApplyCosmeticMaterial(item.category, CosmeticColor(item.item_id));
            }
            PlayerPrefs.Save();
        }

        private void ApplyUnequippedCosmetic(string category)
        {
            if (string.IsNullOrWhiteSpace(category))
            {
                return;
            }
            PlayerPrefs.DeleteKey(
                $"runningup.v14.equipped-{category.ToLowerInvariant()}");
            PlayerPrefs.Save();
            runner?.Play("steady_run");
        }

        private void ApplyCosmeticMaterial(string category, Color color)
        {
            foreach (var renderer in runner?.GetComponentsInChildren<Renderer>(true) ??
                Array.Empty<Renderer>())
            {
                if (!RendererMatchesCosmetic(renderer.name, category))
                {
                    continue;
                }
                foreach (var material in renderer.materials)
                {
                    if (material.HasProperty("_BaseColor"))
                    {
                        material.SetColor("_BaseColor", color);
                    }
                    material.color = color;
                }
            }
        }

        private static bool RendererMatchesCosmetic(string rendererName, string category)
        {
            if (string.IsNullOrWhiteSpace(rendererName) ||
                string.IsNullOrWhiteSpace(category))
            {
                return false;
            }
            var name = rendererName.ToUpperInvariant();
            return category.ToUpperInvariant() switch
            {
                "HAIR" => name.Contains("HAIR"),
                "TOP" => name.Contains("TORSO") || name.Contains("JERSEY") ||
                         name.Contains("TOP"),
                "BOTTOM" => name.Contains("SHORT") || name.Contains("LEG") ||
                            name.Contains("BOTTOM"),
                "SHOES" => name.Contains("SHOE") || name.Contains("FOOT"),
                "WATCH" => name.Contains("WATCH") || name.Contains("WRIST"),
                "AURA" => name.Contains("AURA") || name.Contains("EFFECT"),
                _ => false,
            };
        }

        private static Color CosmeticColor(string itemId) =>
            itemId switch
            {
                "V13-HAIR-BASE-01" => new Color(0.18f, 0.07f, 0.03f, 1f),
                "V13-TOP-BASE-02" => Blue,
                "V13-BOTTOM-BASE-03" => new Color(0.02f, 0.08f, 0.20f, 1f),
                "V13-SHOES-BASE-04" => new Color(0.10f, 0.92f, 0.66f, 1f),
                "V13-WATCH-BASE-05" => Gold,
                "V13-AURA-BASE-06" => new Color(0.68f, 0.40f, 1f, 1f),
                _ => Color.white,
            };

        private void RefreshApprovedResources()
        {
            var value =
                journey != null && journey.AccountSummaryLoaded
                    ? $"LV {journey.AccountLevel}     XP {journey.AccountXp:N0}     " +
                      $"COINS {journey.RunCoins:N0}     GEMS {journey.Gems:N0}"
                    : "LV --     XP --     COINS --     GEMS --";
            if (approvedProfileText != null)
            {
                approvedProfileText.text = journey != null && journey.AccountSummaryLoaded
                    ? $"LV {journey.AccountLevel}"
                    : "LV --";
            }
            if (approvedEnergyText != null)
            {
                // 에너지는 서버 원장에 없는 동안 임의 수치가 아닌 미확정 상태로 남긴다.
                approvedEnergyText.text = "--/--";
            }
            if (approvedCoinText != null)
            {
                approvedCoinText.text = journey != null && journey.AccountSummaryLoaded
                    ? $"{journey.RunCoins:N0}"
                    : "--";
            }
            if (approvedGemText != null)
            {
                approvedGemText.text = journey != null && journey.AccountSummaryLoaded
                    ? $"{journey.Gems:N0}"
                    : "--";
            }
            if (resourceText != null)
            {
                resourceText.text = value;
            }

            var monthlyMeters = Math.Max(0L, journey?.LastMonthlyVerifiedMeters ?? 0L);
            if (approvedJourneyProgressText != null)
            {
                // 서버가 현재 코스와 누적 진행도를 확인하기 전에는 예시 기록을 표시하지 않는다.
                approvedJourneyProgressText.text =
                    journey != null && journey.ActiveRouteLoaded
                        ? $"{journey.ActiveRouteProgressMeters / 1000f:0.00} km / " +
                          $"{journey.ActiveRouteTargetMeters / 1000f:0.00} km"
                        : "-- km / -- km";
            }
            if (approvedMonthlyText != null)
            {
                approvedMonthlyText.text =
                    journey != null && journey.AccountSummaryLoaded
                        ? $"{monthlyMeters / 1000f:0.0} KM"
                        : "-- KM";
            }
            if (approvedCheckpointText != null)
            {
                approvedCheckpointText.text = NextCheckpointLabel(monthlyMeters);
            }
            if (approvedCoachText != null)
            {
                approvedCoachText.text =
                    selectedTraining == "EASY_RUN"
                        ? "EASY RUN"
                        : selectedTraining.Replace('_', ' ');
            }
        }

        private static string NextCheckpointLabel(long monthlyMeters)
        {
            foreach (var checkpointMeters in MonthlyCheckpointsMeters)
            {
                if (monthlyMeters < checkpointMeters)
                {
                    return checkpointMeters == 42195
                        ? "42.195 KM"
                        : $"{checkpointMeters / 1000f:0} KM";
                }
            }
            return "WORLD CROWN";
        }

        private void RefreshTrainingResult()
        {
            if (trainingResultSummary == null || trainingResultRewards == null)
            {
                return;
            }
            if (journey == null ||
                string.IsNullOrWhiteSpace(journey.LastVerifiedRunId))
            {
                trainingResultSummary.text =
                    "The server result is not available yet.";
                trainingResultRewards.text =
                    "No reward has been displayed or granted.";
                return;
            }
            trainingResultSummary.text =
                $"{journey.LastVerifiedDistanceMeters / 1000f:0.00} km\n" +
                $"{TimeSpan.FromSeconds(journey.LastVerifiedMovingSeconds):hh\\:mm\\:ss} MOVING TIME\n" +
                "SERVER VERIFIED · SAVED";
            trainingResultRewards.text =
                $"RUNNER GROWTH +{journey.LastRunnerGrowthPoints:N0}\n" +
                $"PACER BOND +{journey.LastPacerBondPoints:N0}   " +
                $"RESTORATION +{journey.LastRestorationPoints:N0}\n" +
                $"MONTHLY DISTANCE {journey.LastMonthlyVerifiedMeters / 1000f:0.00} km\n" +
                $"XP {journey.AccountXp:N0}   COINS {journey.RunCoins:N0}   " +
                $"GEMS {journey.Gems:N0}";
        }

        private void RefreshCrewUi()
        {
            if (crewState != null)
            {
                if (journey == null || !journey.CrewLoaded)
                {
                    crewState.text = "Loading server-authoritative crew membership…";
                }
                else if (!journey.HasCrew)
                {
                    crewState.text = "NO CREW · Create one or search the live directory.";
                }
                else
                {
                    crewState.text =
                        $"{journey.CrewName} · {journey.CrewRole.ToUpperInvariant()} · " +
                        $"{journey.CrewMemberCount} RUNNERS";
                }
            }
            if (crewResultsRoot == null)
            {
                return;
            }
            for (var index = crewResultsRoot.childCount - 1; index >= 0; index--)
            {
                Destroy(crewResultsRoot.GetChild(index).gameObject);
            }
            var resultCount = journey?.CrewSearchResultCount ?? 0;
            if (resultCount == 0)
            {
                Label(
                    "Empty",
                    crewResultsRoot,
                    "Search crew names to see live results.",
                    23,
                    FontStyle.Normal,
                    new Color(0.70f, 0.80f, 0.88f, 0.9f),
                    new Vector2(20f, -20f),
                    new Vector2(900f, 70f),
                    new Vector2(0f, 1f));
                return;
            }
            var visibleCount = Math.Min(4, resultCount);
            for (var index = 0; index < visibleCount; index++)
            {
                var resultIndex = index;
                Button(
                    $"JoinCrew{index}",
                    crewResultsRoot,
                    journey.CrewSearchLabel(index),
                    new Vector2(0f, -index * 108f),
                    new Vector2(976f, 94f),
                    new Vector2(0f, 1f),
                    journey.HasCrew ? Panel : Blue,
                    () => journey?.JoinCrewSearchResult(resultIndex)).interactable =
                    journey != null && !journey.HasCrew;
            }
        }

        private void RefreshActivityHistoryUi()
        {
            if (activityHistoryRowsRoot == null)
            {
                return;
            }
            for (var index = activityHistoryRowsRoot.childCount - 1;
                 index >= 0;
                 index--)
            {
                Destroy(activityHistoryRowsRoot.GetChild(index).gameObject);
            }
            var count = journey?.ActivityHistoryCount ?? 0;
            if (count == 0)
            {
                Label(
                    "ActivityHistoryEmpty",
                    activityHistoryRowsRoot,
                    "NO VERIFIED RUNS YET\nFinish a real run or sync an authorized activity, then refresh.",
                    25,
                    FontStyle.Normal,
                    new Color(0.70f, 0.80f, 0.88f, 0.9f),
                    new Vector2(32f, -36f),
                    new Vector2(890f, 120f),
                    new Vector2(0f, 1f));
                return;
            }
            var visibleCount = Math.Min(4, count);
            for (var index = 0; index < visibleCount; index++)
            {
                Label(
                    $"ActivityHistory{index}",
                    activityHistoryRowsRoot,
                    journey.ActivityHistoryLabel(index),
                    22,
                    FontStyle.Normal,
                    Color.white,
                    new Vector2(28f, -26f - index * 166f),
                    new Vector2(900f, 148f),
                    new Vector2(0f, 1f));
            }
        }

        private void RefreshCharacterUi()
        {
            if (characterSelection != null)
            {
                var selected = journey?.SelectedCosmetic;
                characterSelection.text = selected == null
                    ? "SELECTED · Loading server wardrobe…"
                    : $"SELECTED · {selected.runtime_name_en.ToUpperInvariant()} · " +
                      (selected.equipped
                          ? "EQUIPPED"
                          : selected.owned
                              ? "OWNED"
                              : $"{selected.price:N0} {selected.currency}");
            }
            if (characterPresetSummary != null)
            {
                var preset = journey?.WardrobePresets.Count > 0
                    ? journey.WardrobePresets[0]
                    : null;
                characterPresetSummary.text = preset == null
                    ? "PRESET 1 · NOT SAVED"
                    : $"PRESET {preset.slot} · {preset.runtime_name_en.ToUpperInvariant()}";
            }
            if (characterItemsRoot == null)
            {
                return;
            }
            for (var index = characterItemsRoot.childCount - 1; index >= 0;
                 index--)
            {
                Destroy(characterItemsRoot.GetChild(index).gameObject);
            }
            var cosmetics = journey?.CosmeticCatalog;
            if (cosmetics == null || cosmetics.Count == 0)
            {
                Label(
                    "WardrobeLoading",
                    characterItemsRoot,
                    "LOADING SERVER WARDROBE…",
                    20,
                    FontStyle.Bold,
                    new Color(0.70f, 0.80f, 0.88f, 0.9f),
                    new Vector2(20f, -20f),
                    new Vector2(890f, 80f),
                    new Vector2(0f, 1f),
                    TextAnchor.MiddleCenter);
                return;
            }
            var visibleCount = Math.Min(8, cosmetics.Count);
            for (var index = 0; index < visibleCount; index++)
            {
                var item = cosmetics[index];
                var column = index % 4;
                var row = index / 4;
                var itemId = item.item_id;
                var label = $"{item.category}\n" +
                            (item.equipped
                                ? "EQUIPPED"
                                : item.owned
                                    ? "OWNED"
                                    : $"{item.price:N0} {item.currency}");
                var color = item.equipped
                    ? Green
                    : string.Equals(
                        journey.SelectedCosmeticItemId,
                        item.item_id,
                        StringComparison.Ordinal)
                        ? Blue
                        : PanelSoft;
                Button(
                    $"SelectCosmetic{index}",
                    characterItemsRoot,
                    label,
                    new Vector2(12f + column * 232f, -14f - row * 86f),
                    new Vector2(216f, 72f),
                    new Vector2(0f, 1f),
                    color,
                    () => journey?.SelectCosmeticItem(itemId));
            }
        }

        private void ClaimNextMonthlyCheckpoint()
        {
            if (journey == null || !journey.MonthlyApexLoaded ||
                journey.MonthlyWorldCrown)
            {
                journey?.RefreshMonthlyApex();
                return;
            }
            var next = journey.MonthlyHighestClaimedCheckpoint + 1;
            if (next < 1 || next > MonthlyCheckpointsMeters.Length)
            {
                return;
            }
            journey.ClaimMonthlyApexCheckpoint(
                next,
                MonthlyCheckpointsMeters[next - 1]);
        }

        private void RefreshMonthlyApexUi()
        {
            if (monthlyApexSummary == null || monthlyApexClaimButton == null)
            {
                return;
            }
            var buttonText = monthlyApexClaimButton.GetComponentInChildren<Text>();
            if (journey == null || !journey.MonthlyApexLoaded)
            {
                monthlyApexSummary.text =
                    "MONTHLY DISTANCE --\nNEXT CHECKPOINT --\nWORLD CROWN --";
                buttonText.text = "CHECK SERVER PROGRESS";
                monthlyApexClaimButton.interactable = false;
                return;
            }
            var monthlyMeters = Math.Max(0L, journey.MonthlyVerifiedMeters);
            var next = journey.MonthlyHighestClaimedCheckpoint + 1;
            var crown = journey.MonthlyWorldCrown;
            var nextMeters = next >= 1 && next <= MonthlyCheckpointsMeters.Length
                ? MonthlyCheckpointsMeters[next - 1]
                : 1000000L;
            monthlyApexSummary.text =
                $"MONTHLY DISTANCE {monthlyMeters / 1000f:0.00} km\n" +
                (crown
                    ? "WORLD CROWN EARNED · 1,000 km\n"
                    : $"NEXT CHECKPOINT {next} · {nextMeters / 1000f:0.###} km\n") +
                $"CLAIMED {journey.MonthlyHighestClaimedCheckpoint} / 120";
            if (crown || next > MonthlyCheckpointsMeters.Length)
            {
                buttonText.text = "WORLD CROWN COMPLETE";
                monthlyApexClaimButton.interactable = false;
            }
            else if (monthlyMeters < nextMeters)
            {
                buttonText.text =
                    $"NEXT CHECKPOINT AT {nextMeters / 1000f:0.###} KM";
                monthlyApexClaimButton.interactable = false;
            }
            else
            {
                buttonText.text = $"CLAIM CHECKPOINT {next}";
                monthlyApexClaimButton.interactable = true;
            }
        }

        private void Show(Screen screen)
        {
            currentScreen = screen;
            var approvedHomeVisible =
                approvedHomeRoot != null && screen == Screen.Home;
            var immersive = screen is Screen.ActiveTraining or
                Screen.TrainingResult or Screen.LiveRace;
            var approvedBackdropVisible =
                approvedJourneyBackdrop != null &&
                (approvedHomeVisible || immersive ||
                 screen is Screen.Training or Screen.Matchmaking or
                     Screen.Lobby or Screen.RaceResult);
            if (approvedJourneyBackdrop != null)
            {
                approvedJourneyBackdrop.SetActive(approvedBackdropVisible);
            }
            if (approvedHomeRoot != null)
            {
                approvedHomeRoot.SetActive(approvedHomeVisible);
            }
            foreach (var pair in screens)
            {
                pair.Value?.SetActive(pair.Key == screen);
            }
            foreach (var chrome in generatedChrome)
            {
                chrome?.SetActive(!approvedHomeVisible && !immersive);
            }
            foreach (var button in bottomButtons)
            {
                button.transform.parent.gameObject.SetActive(
                    !immersive && !approvedHomeVisible);
            }
            // Deliberately does not persist the current screen.
            //
            // Awake deletes ScreenKey and starts at Home, so this write fed nothing —
            // but it ran on every navigation and called PlayerPrefs.Save(), which is a
            // synchronous disk flush. Worse, a stored value that nothing reads is an
            // invitation for someone to start reading it again, which is exactly the
            // cold-start bug ("the app reopens the screen it died on") coming back.
            // ScreenKey survives only so Awake can clear a value left by an older build.
            if (screen == Screen.Home)
            {
                runner?.Play("steady_run");
            }
            else if (screen == Screen.Sync)
            {
                RefreshSyncView();
            }
            else if (screen == Screen.TrainingResult)
            {
                RefreshTrainingResult();
            }
            else if (screen == Screen.Training)
            {
                EnsureTrainingPageForSelection();
                RefreshTrainingPlanPage();
            }
            else if (screen == Screen.Crew)
            {
                RefreshCrewUi();
            }
            else if (screen == Screen.ActivityHistory)
            {
                RefreshActivityHistoryUi();
                journey?.RefreshActivityHistory();
            }
            else if (screen == Screen.MonthlyApex)
            {
                RefreshMonthlyApexUi();
                journey?.RefreshMonthlyApex();
            }
            else if (screen == Screen.Character)
            {
                RefreshCharacterUi();
                journey?.RefreshCosmeticInventory();
            }
            else if (screen is Screen.Matchmaking or Screen.Lobby or
                     Screen.LiveRace or Screen.RaceResult)
            {
                RefreshRaceUi();
                if (screen == Screen.Matchmaking)
                {
                    RefreshMatchmakingSelection();
                }
            }
            RefreshApprovedResources();
            RefreshRuntimeState();
        }

        private void Publish(string status)
        {
            if (globalStatus != null)
            {
                globalStatus.text = status;
            }
        }

        private static Screen ParseScreen(string value) =>
            Enum.TryParse(value, true, out Screen parsed) ? parsed : Screen.Home;

        private static string Humanize(string status)
        {
            if (string.IsNullOrWhiteSpace(status))
            {
                return "Ready";
            }
            if (status == "backend_project_required")
            {
                return "RunningUp Supabase project configuration required";
            }
            if (status == "permission_requested")
            {
                return "Allow precise location, then tap Start again";
            }
            if (status.StartsWith("error:", StringComparison.Ordinal))
            {
                return $"Server error · {status[6..].Replace('_', ' ')}";
            }
            return CultureInfo.InvariantCulture.TextInfo.ToTitleCase(
                status.Replace('_', ' ').Replace(':', ' '));
        }

        private static string Pace(double metersPerSecond, bool metric)
        {
            if (metersPerSecond <= 0.2)
            {
                return "--";
            }
            var seconds = (metric ? 1000.0 : 1609.344) / metersPerSecond;
            if (seconds > 5999)
            {
                return "--";
            }
            var span = TimeSpan.FromSeconds(seconds);
            return $"{(int)span.TotalMinutes}:{span.Seconds:00}/{(metric ? "km" : "mi")}";
        }

        private static double Haversine(GpsSample a, GpsSample b)
        {
            const double radius = 6371000.0;
            var lat1 = a.latitude * Math.PI / 180.0;
            var lat2 = b.latitude * Math.PI / 180.0;
            var dLat = (b.latitude - a.latitude) * Math.PI / 180.0;
            var dLon = (b.longitude - a.longitude) * Math.PI / 180.0;
            var h = Math.Sin(dLat / 2.0) * Math.Sin(dLat / 2.0) +
                Math.Cos(lat1) * Math.Cos(lat2) *
                Math.Sin(dLon / 2.0) * Math.Sin(dLon / 2.0);
            return radius * 2.0 * Math.Atan2(Math.Sqrt(h), Math.Sqrt(1.0 - h));
        }

        private GameObject Ui(string name, Transform parent)
        {
            var item = new GameObject(name, typeof(RectTransform));
            item.transform.SetParent(parent, false);
            return item;
        }

        private Transform ImagePanel(
            string name,
            Transform parent,
            Color color,
            Vector2 anchorMin,
            Vector2 anchorMax,
            Vector2 position,
            Vector2 size)
        {
            var item = Ui(name, parent);
            var rect = item.GetComponent<RectTransform>();
            rect.anchorMin = anchorMin;
            rect.anchorMax = anchorMax;
            rect.pivot = new Vector2(anchorMin.x, anchorMin.y);
            rect.anchoredPosition = position;
            rect.sizeDelta = size;
            var image = item.AddComponent<Image>();
            image.color = color;
            return item.transform;
        }

        private Text Label(
            string name,
            Transform parent,
            string value,
            int size,
            FontStyle style,
            Color color,
            Vector2 position,
            Vector2 dimensions,
            Vector2 anchor,
            TextAnchor alignment = TextAnchor.MiddleLeft)
        {
            var item = Ui(name, parent);
            var rect = item.GetComponent<RectTransform>();
            rect.anchorMin = anchor;
            rect.anchorMax = anchor;
            rect.pivot = anchor;
            rect.anchoredPosition = position;
            rect.sizeDelta = dimensions;
            var text = item.AddComponent<Text>();
            text.font = font;
            text.text = value;
            text.fontSize = size;
            text.fontStyle = style;
            text.color = color;
            text.alignment = alignment;
            text.horizontalOverflow = HorizontalWrapMode.Wrap;
            text.verticalOverflow = VerticalWrapMode.Overflow;
            return text;
        }

        private Text CenterLabel(Transform parent, string value, int size, Color color)
        {
            var text = Label(
                "Label",
                parent,
                value,
                size,
                FontStyle.Bold,
                color,
                Vector2.zero,
                Vector2.zero,
                new Vector2(0.5f, 0.5f),
                TextAnchor.MiddleCenter);
            Stretch(text.rectTransform);
            return text;
        }

        private Button Button(
            string name,
            Transform parent,
            string label,
            Vector2 position,
            Vector2 dimensions,
            Vector2 anchor,
            Color color,
            Action action)
        {
            var panel = ImagePanel(name, parent, color, anchor, anchor, position, dimensions);
            var button = panel.gameObject.AddComponent<Button>();
            button.targetGraphic = panel.GetComponent<Image>();
            button.transition = Selectable.Transition.ColorTint;
            var colors = button.colors;
            colors.normalColor = Color.white;
            colors.highlightedColor = new Color(0.82f, 0.94f, 1f);
            colors.pressedColor = new Color(0.64f, 0.82f, 1f);
            colors.disabledColor = new Color(0.42f, 0.48f, 0.56f, 0.58f);
            button.colors = colors;
            if (action != null)
            {
                button.onClick.AddListener(() => action());
            }
            var labelSize = label == "RUN" ? 30 : 23;
            CenterLabel(panel, label, labelSize, Color.white);
            return button;
        }

        private InputField TextInput(
            string name,
            Transform parent,
            string placeholderValue,
            Vector2 position,
            Vector2 dimensions,
            Vector2 anchor)
        {
            var panel = ImagePanel(
                name,
                parent,
                new Color(0.01f, 0.06f, 0.12f, 0.98f),
                anchor,
                anchor,
                position,
                dimensions);
            var input = panel.gameObject.AddComponent<InputField>();
            input.targetGraphic = panel.GetComponent<Image>();
            input.lineType = InputField.LineType.SingleLine;
            input.characterLimit = 32;

            var value = Ui("Text", panel);
            var valueRect = value.GetComponent<RectTransform>();
            Stretch(valueRect);
            valueRect.offsetMin = new Vector2(18f, 6f);
            valueRect.offsetMax = new Vector2(-18f, -6f);
            var valueText = value.AddComponent<Text>();
            valueText.font = font;
            valueText.fontSize = 24;
            valueText.color = Color.white;
            valueText.alignment = TextAnchor.MiddleLeft;
            valueText.supportRichText = false;

            var placeholder = Ui("Placeholder", panel);
            var placeholderRect = placeholder.GetComponent<RectTransform>();
            Stretch(placeholderRect);
            placeholderRect.offsetMin = new Vector2(18f, 6f);
            placeholderRect.offsetMax = new Vector2(-18f, -6f);
            var placeholderText = placeholder.AddComponent<Text>();
            placeholderText.font = font;
            placeholderText.fontSize = 21;
            placeholderText.color = new Color(0.62f, 0.73f, 0.82f, 0.82f);
            placeholderText.alignment = TextAnchor.MiddleLeft;
            placeholderText.text = placeholderValue;

            input.textComponent = valueText;
            input.placeholder = placeholderText;
            return input;
        }

        private static void SetButtonText(Button button, string value)
        {
            var text = button?.GetComponentInChildren<Text>();
            if (text != null)
            {
                text.text = value;
            }
        }

        private static void Stretch(RectTransform rect)
        {
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;
        }
    }
}
