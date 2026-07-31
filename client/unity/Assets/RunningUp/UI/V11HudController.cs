// V11의 다섯 하단 탭과 Daily Run Contract 표면을 실제 상호작용으로 연결한다.
using System.Collections.Generic;
using System.Globalization;
using RunningUp.Core;
using RunningUp.MyRunner;
using RunningUp.RunVerification;
using RunningUp.V14;
using RunningUp.V14.State;
using UnityEngine;
using UnityEngine.UI;

namespace RunningUp.UI
{
    [DisallowMultipleComponent]
    public sealed class V11HudController : MonoBehaviour
    {
        private const string GoalModeKey = "runningup.v11.goal-mode";
        private static readonly string[] GoalModeNames =
        {
            "FREE",
            "EASY",
            "TEMPO",
            "INTERVAL",
            "LONG",
        };

        [SerializeField] private List<GameObject> screens = new();
        [SerializeField] private List<Button> navigationButtons = new();
        [SerializeField] private List<Button> goalModeButtons = new();
        [SerializeField] private Button runButton;
        [SerializeField] private Button contractButton;
        [SerializeField] private GameObject toastRoot;
        [SerializeField] private Text toastText;
        [SerializeField] private ChibiRunnerView runner;
        [SerializeField] private V11AndroidRunBridge runBridge;
        [SerializeField] private Button strideLeapButton;
        [SerializeField] private Button directGpsButton;
        [SerializeField] private Button pauseRunButton;
        [SerializeField] private Button finishRunButton;
        [SerializeField] private Button healthPermissionButton;
        [SerializeField] private Button healthReadButton;
        [SerializeField] private Button importFileButton;
        [SerializeField] private Text monthlyText;
        [SerializeField] private Text contractText;
        [SerializeField] private Text strideLeapText;
        [SerializeField] private Text growthText;
        [SerializeField] private Text runStatusText;
        [SerializeField] private Text pendingUploadText;
        [SerializeField] private Text homeVerifiedText;

        private int activeScreen;
        private int selectedGoalMode = 1;
        private float toastUntil;
        private bool directGpsCapturing;
        private V11VerifiedRunUploader verifiedRunUploader;
        private V14JourneyRuntime v14Journey;
        private string backendSyncStatus = "initializing";

        public int ActiveScreen => activeScreen;
        public int ScreenCount => screens.Count;
        public int NavigationCount => navigationButtons.Count;
        public int GoalModeCount => goalModeButtons.Count;
        public string SelectedGoalMode =>
            GoalModeNames[Mathf.Clamp(selectedGoalMode, 0, GoalModeNames.Length - 1)];
        public bool IsToastVisible => toastRoot != null && toastRoot.activeSelf;

        private void Awake()
        {
            for (var index = 0; index < navigationButtons.Count; index++)
            {
                var captured = index;
                navigationButtons[index].transition = Selectable.Transition.None;
                navigationButtons[index].onClick.AddListener(() => ShowScreen(captured));
            }

            selectedGoalMode = Mathf.Clamp(
                PlayerPrefs.GetInt(GoalModeKey, 1),
                0,
                GoalModeNames.Length - 1);
            for (var index = 0; index < goalModeButtons.Count; index++)
            {
                var captured = index;
                goalModeButtons[index].onClick.AddListener(() => SelectGoalMode(captured));
            }
            ApplyGoalModeVisuals();

            if (runButton != null)
            {
                runButton.onClick.AddListener(() => ShowScreen(2));
            }

            if (contractButton != null)
            {
                contractButton.onClick.AddListener(TriggerDailyContract);
            }

            strideLeapButton?.onClick.AddListener(TriggerStrideLeap);
            directGpsButton?.onClick.AddListener(ToggleDirectGps);
            pauseRunButton?.onClick.AddListener(TogglePauseResume);
            finishRunButton?.onClick.AddListener(FinishV14Training);
            healthPermissionButton?.onClick.AddListener(RequestHealthPermission);
            healthReadButton?.onClick.AddListener(ReadHealthRuns);
            importFileButton?.onClick.AddListener(PickTrackFile);
            if (runBridge != null)
            {
                runBridge.StatusChanged += OnRunStatusChanged;
                runBridge.RunAccepted += OnRunAccepted;
                var runtime = runBridge.GetComponent<V11RunRuntime>();
                if (runtime != null)
                {
                    runtime.StateChanged += RefreshRuntimeTexts;
                }

                verifiedRunUploader = runBridge.GetComponent<V11VerifiedRunUploader>();
                if (verifiedRunUploader != null)
                {
                    backendSyncStatus = verifiedRunUploader.CurrentStatus;
                    verifiedRunUploader.StatusChanged += OnBackendSyncStatusChanged;
                }

                v14Journey = runBridge.GetComponent<V14JourneyRuntime>();
                if (v14Journey != null)
                {
                    v14Journey.StatusChanged += OnV14StatusChanged;
                    v14Journey.StateChanged += RefreshV14Controls;
                }
            }

            RefreshRuntimeTexts();
            RefreshSourceCapabilities();
            ShowScreen(0);
        }

        private void OnDestroy()
        {
            if (runBridge == null)
            {
                return;
            }

            runBridge.StatusChanged -= OnRunStatusChanged;
            runBridge.RunAccepted -= OnRunAccepted;
            var runtime = runBridge.GetComponent<V11RunRuntime>();
            if (runtime != null)
            {
                runtime.StateChanged -= RefreshRuntimeTexts;
            }

            if (verifiedRunUploader != null)
            {
                verifiedRunUploader.StatusChanged -= OnBackendSyncStatusChanged;
            }
            if (v14Journey != null)
            {
                v14Journey.StatusChanged -= OnV14StatusChanged;
                v14Journey.StateChanged -= RefreshV14Controls;
            }
        }

        private void Update()
        {
            if (toastRoot != null && toastRoot.activeSelf && Time.unscaledTime >= toastUntil)
            {
                toastRoot.SetActive(false);
            }
        }

        public void Configure(
            IEnumerable<GameObject> screenObjects,
            IEnumerable<Button> navButtons,
            IEnumerable<Button> runGoalModeButtons,
            Button centerRun,
            Button dailyContract,
            GameObject toastContainer,
            Text toast,
            ChibiRunnerView runnerView,
            V11AndroidRunBridge androidRunBridge,
            Button strideLeap,
            Button directGps,
            Button pauseRun,
            Button finishRun,
            Button healthPermission,
            Button healthRead,
            Button importFile,
            Text monthly,
            Text contract,
            Text strideLeapLabel,
            Text growth,
            Text runStatus,
            Text pendingUpload,
            Text homeVerified)
        {
            screens = new List<GameObject>(screenObjects);
            navigationButtons = new List<Button>(navButtons);
            goalModeButtons = new List<Button>(runGoalModeButtons);
            runButton = centerRun;
            contractButton = dailyContract;
            toastRoot = toastContainer;
            toastText = toast;
            runner = runnerView;
            runBridge = androidRunBridge;
            strideLeapButton = strideLeap;
            directGpsButton = directGps;
            pauseRunButton = pauseRun;
            finishRunButton = finishRun;
            healthPermissionButton = healthPermission;
            healthReadButton = healthRead;
            importFileButton = importFile;
            monthlyText = monthly;
            contractText = contract;
            strideLeapText = strideLeapLabel;
            growthText = growth;
            runStatusText = runStatus;
            pendingUploadText = pendingUpload;
            homeVerifiedText = homeVerified;
        }

        private void OnApplicationFocus(bool hasFocus)
        {
            if (hasFocus && !directGpsCapturing)
            {
                RefreshSourceCapabilities();
            }
        }

        public void ShowScreen(int index)
        {
            if (index < 0 || index >= screens.Count)
            {
                return;
            }

            activeScreen = index;
            for (var screenIndex = 0; screenIndex < screens.Count; screenIndex++)
            {
                screens[screenIndex]?.SetActive(screenIndex == activeScreen);
            }

            ApplyNavigationVisuals();

            if (activeScreen == 0)
            {
                runner?.Play("steady_run");
            }
        }

        public void TriggerDailyContract()
        {
            ShowScreen(2);
            v14Journey?.StartOneKilometerTraining();
            ShowToast("Daily Run Contract · server-authoritative 1 km training");
            runner?.Play("easy_jog");
        }

        public void SelectGoalMode(int index)
        {
            if (index < 0 || index >= goalModeButtons.Count || index >= GoalModeNames.Length)
            {
                return;
            }

            selectedGoalMode = index;
            PlayerPrefs.SetInt(GoalModeKey, selectedGoalMode);
            PlayerPrefs.Save();
            ApplyGoalModeVisuals();
            if (runStatusText != null)
            {
                runStatusText.text =
                    $"{GoalModeNames[selectedGoalMode]} 목표 선택됨\n기록 소스를 선택하세요.";
            }
            ShowToast($"{GoalModeNames[selectedGoalMode]} 러닝 목표를 선택했습니다.");
        }

        public void TriggerStrideLeap()
        {
            if (v14Journey != null)
            {
                v14Journey.DiscoverHealthConnectRuns();
                ShowToast("SYNC RUN · discovering new Health Connect activities");
                return;
            }
            var runtime = runBridge?.GetComponent<V11RunRuntime>();
            if (runtime == null)
            {
                ShowToast("Stride Leap 상태를 불러올 수 없습니다.");
                return;
            }

            var meters = runtime.UseStrideLeap(500);
            ShowToast(meters > 0
                ? $"Stride Leap · 여정 {meters}m 전진"
                : "검증 러닝으로 Stride Leap을 충전하세요.");
            if (meters > 0)
            {
                runner?.Play("final_kick");
            }
        }

        private void ToggleDirectGps()
        {
            if (v14Journey != null)
            {
                v14Journey.StartOneKilometerTraining();
                return;
            }
            if (runBridge == null)
            {
                return;
            }

            var status = directGpsCapturing
                ? runBridge.StopDirectGps()
                : runBridge.StartDirectGps();
            if (status == "started")
            {
                directGpsCapturing = true;
            }
            else if (status == "stopping")
            {
                directGpsCapturing = false;
            }
        }

        private void TogglePauseResume()
        {
            if (v14Journey == null)
            {
                ShowToast("V14 training state is unavailable.");
                return;
            }

            if (v14Journey.TrainingState == V14TrainingState.PAUSED)
            {
                v14Journey.ResumeTraining();
            }
            else
            {
                v14Journey.PauseTraining();
            }
        }

        private void FinishV14Training()
        {
            v14Journey?.FinishTraining();
        }

        private void OnV14StatusChanged(string status)
        {
            if (runStatusText != null)
            {
                runStatusText.text =
                    $"V14 TRAINING · {v14Journey.TrainingState}\n{status}";
            }
            RefreshV14Controls();
        }

        private void RefreshV14Controls()
        {
            if (v14Journey == null)
            {
                return;
            }

            var state = v14Journey.TrainingState;
            if (directGpsButton != null)
            {
                directGpsButton.interactable =
                    state is V14TrainingState.SELECT or
                        V14TrainingState.SENSOR_CHECK or
                        V14TrainingState.REWARDED;
                var label = directGpsButton.GetComponentInChildren<Text>();
                if (label != null)
                {
                    label.text = state == V14TrainingState.SENSOR_CHECK
                        ? "RETRY SENSOR CHECK"
                        : "START 1 KM TRAINING";
                }
            }
            if (pauseRunButton != null)
            {
                pauseRunButton.interactable =
                    state is V14TrainingState.ACTIVE or V14TrainingState.PAUSED;
                var label = pauseRunButton.GetComponentInChildren<Text>();
                if (label != null)
                {
                    label.text = state == V14TrainingState.PAUSED
                        ? "RESUME"
                        : "PAUSE";
                }
            }
            if (finishRunButton != null)
            {
                finishRunButton.interactable =
                    state is V14TrainingState.ACTIVE or
                        V14TrainingState.PAUSED or
                        V14TrainingState.RESUMED;
            }
        }

        private void RequestHealthPermission()
        {
            runBridge?.RequestHealthConnectPermission();
        }

        private void ReadHealthRuns()
        {
            runBridge?.ReadRecentHealthRuns();
        }

        private void PickTrackFile()
        {
            runBridge?.PickTrackFile();
        }

        private void OnRunStatusChanged(string status)
        {
            if (runStatusText != null)
            {
                runStatusText.text = HumanizeStatus(status);
            }

            if (status == "capturing")
            {
                directGpsCapturing = true;
            }
            else if (status.StartsWith("verified:", System.StringComparison.Ordinal) ||
                status.StartsWith("rejected:", System.StringComparison.Ordinal))
            {
                directGpsCapturing = false;
            }

            if (directGpsButton != null)
            {
                var label = directGpsButton.GetComponentInChildren<Text>();
                if (label != null)
                {
                    label.text = status == "permission_requested"
                        ? "직접 GPS\n권한 응답 대기"
                        : directGpsCapturing
                            ? "직접 GPS\n종료·검증"
                            : "직접 GPS\n시작";
                }
            }
        }

        private void OnRunAccepted(VerifiedRunReceipt receipt)
        {
            if (receipt.duplicate)
            {
                ShowToast("이미 업로드 대기 중인 러닝입니다. 중복 보상은 없습니다.");
                return;
            }

            ShowToast(
                $"{receipt.run.distanceMeters / 1000f:0.00}km 검증 · " +
                $"서버 확인 대기 · 예상 성장 {receipt.award.runnerGrowthPoints}P");
            runner?.Play("finish");
            RefreshRuntimeTexts();
        }

        private void RefreshRuntimeTexts()
        {
            var runtime = runBridge?.GetComponent<V11RunRuntime>();
            var progress = runtime?.Progress;
            if (progress == null)
            {
                return;
            }

            if (monthlyText != null)
            {
                monthlyText.text =
                    $"{progress.monthlyVerifiedMeters / 1000f:0.0} / 1000km";
                monthlyText.color = progress.HasWorldCrown
                    ? V11Palette.WarmAmber
                    : V11Palette.SoftWhite;
            }

            if (contractText != null)
            {
                contractText.text = runtime.DailyContractCompleted
                    ? "DAILY RUN\nCOMPLETE"
                    : "DAILY RUN\nNOT COMPLETE";
                contractText.color = runtime.DailyContractCompleted
                    ? V11Palette.Mint
                    : V11Palette.SoftWhite;
            }

            if (strideLeapText != null)
            {
                strideLeapText.text = "SYNC RUN\nHEALTH CONNECT";
            }

            if (growthText != null)
            {
                growthText.text =
                    $"VERIFIED {progress.lifetimeVerifiedMeters / 1000f:0.0} km · " +
                    $"Form {progress.EvolutionForm} / 12";
            }

            if (pendingUploadText != null)
            {
                pendingUploadText.text =
                    $"QUEUE {runtime.PendingUploadCount} · {HumanizeBackendStatus()}";
            }

            if (homeVerifiedText != null)
            {
                homeVerifiedText.text =
                    $"VERIFIED RUNS · {progress.lifetimeVerifiedMeters / 1000f:0.0} km";
            }
        }

        private void OnBackendSyncStatusChanged(string status)
        {
            backendSyncStatus = status;
            RefreshRuntimeTexts();
        }

        private string HumanizeBackendStatus() =>
            backendSyncStatus switch
            {
                "backend_project_required" => "서버 설정 필요",
                "authentication_required" => "로그인 필요",
                "uploading" => "업로드 중",
                "synchronized" => "동기화 완료",
                "network_retry" => "재시도 예약",
                "session_refresh_failed" => "로그인 갱신 필요",
                _ when backendSyncStatus.StartsWith(
                    "server_rejected_",
                    System.StringComparison.Ordinal) => "서버 확인 필요",
                _ => "연결 확인 중",
            };

        private static string HumanizeStatus(string status)
        {
            if (string.IsNullOrEmpty(status))
            {
                return "준비됨";
            }

            if (status.StartsWith("capturing:", System.StringComparison.Ordinal))
            {
                return $"GPS 기록 중 · 표본 {status.Split(':')[1]}개";
            }

            if (status.StartsWith("verified:", System.StringComparison.Ordinal))
            {
                var meters = int.Parse(
                    status.Split(':')[1],
                    CultureInfo.InvariantCulture);
                return $"검증 완료 · {meters / 1000f:0.00}km";
            }

            if (status.StartsWith("health_runs_accepted:", System.StringComparison.Ordinal))
            {
                return $"Health Connect 동기화 · {status.Split(':')[1]}건 반영";
            }

            if (status.StartsWith("rejected:", System.StringComparison.Ordinal))
            {
                return $"검증 보류 · {status.Split(':')[1]}";
            }

            return status switch
            {
                "started" => "GPS 기록을 시작했습니다.",
                "stopping" => "GPS 기록을 종료하고 검증합니다.",
                "capturing" => "GPS 기록 중",
                "permission_requested" => "위치 권한을 허용한 뒤 다시 눌러 주세요.",
                "permission_required" => "권한이 필요합니다.",
                "permission_screen_opened" => "Health Connect 권한 화면을 열었습니다.",
                "permission_denied" => "Health Connect 권한이 허용되지 않았습니다.",
                "ready" => "Health Connect 준비됨",
                "reading" => "Health Connect 러닝을 읽는 중",
                "picker_opened" => "FIT·GPX·TCX 파일을 선택하세요.",
                "cancelled" => "파일 선택을 취소했습니다.",
                "unsupported_extension" => "GPX·TCX·FIT 파일만 가져올 수 있습니다.",
                "file_missing" => "가져온 파일을 찾을 수 없습니다.",
                "unavailable" => "이 기기에서는 사용할 수 없습니다.",
                "provider_update_required" => "Health Connect 업데이트가 필요합니다.",
                "provider_disabled" => "기기의 GPS가 꺼져 있습니다.",
                "activity_unavailable" => "Android 화면을 준비하지 못했습니다.",
                "editor_unavailable" => "Android 기기에서 사용할 수 있습니다.",
                "duplicate" => "이미 반영된 러닝입니다.",
                _ => status,
            };
        }

        private void ApplyGoalModeVisuals()
        {
            for (var index = 0; index < goalModeButtons.Count; index++)
            {
                var selected = index == selectedGoalMode;
                var image = goalModeButtons[index].GetComponent<Image>();
                if (image != null)
                {
                    image.color = selected ? V11Palette.Mint : V11Palette.PanelNavy;
                }

                var label = goalModeButtons[index].GetComponentInChildren<Text>();
                if (label != null && index < GoalModeNames.Length)
                {
                    label.text = selected
                        ? $"{GoalModeNames[index]}\n선택됨"
                        : GoalModeNames[index];
                    label.color = selected
                        ? V11Palette.DeepNavy
                        : V11Palette.SoftWhite;
                }
            }
        }

        private void ApplyNavigationVisuals()
        {
            for (var index = 0; index < navigationButtons.Count; index++)
            {
                var selected = index == activeScreen;
                navigationButtons[index].transition = Selectable.Transition.None;
                var image = navigationButtons[index].GetComponent<Image>();
                if (image != null)
                {
                    image.color = selected ? V11Palette.SkyBlue : Color.clear;
                }

                var label = navigationButtons[index].GetComponentInChildren<Text>();
                if (label != null)
                {
                    label.color = selected
                        ? V11Palette.DeepNavy
                        : V11Palette.MutedText;
                }
            }
        }

        private void RefreshSourceCapabilities()
        {
            if (runBridge == null)
            {
                return;
            }

            var gps = runBridge.DirectGpsCapability;
            var health = runBridge.HealthConnectCapability;
            if (directGpsButton != null)
            {
                var label = directGpsButton.GetComponentInChildren<Text>();
                if (label != null)
                {
                    label.text = gps == "permission_required"
                        ? "직접 GPS\n위치 권한 필요"
                        : gps == "ready"
                            ? "직접 GPS\n시작"
                            : "직접 GPS\n사용 불가";
                }
            }

            if (healthPermissionButton != null)
            {
                var label = healthPermissionButton.GetComponentInChildren<Text>();
                if (label != null)
                {
                    label.text = health switch
                    {
                        "available" => "HEALTH CONNECT\n권한 확인",
                        "provider_update_required" => "HEALTH CONNECT\n업데이트 필요",
                        _ => "HEALTH CONNECT\n사용 불가",
                    };
                }
            }

            if (healthReadButton != null)
            {
                healthReadButton.interactable = health == "available";
            }

            if (runStatusText != null)
            {
                runStatusText.text =
                    "실제 연동 상태\n" +
                    $"직접 GPS · {HumanizeCapability(gps)}\n" +
                    $"Health Connect · {HumanizeCapability(health)}\n" +
                    "FIT·GPX·TCX · 파일 선택 가능";
            }
        }

        private static string HumanizeCapability(string capability) =>
            capability switch
            {
                "ready" => "사용 가능",
                "available" => "사용 가능",
                "permission_required" => "위치 권한 필요",
                "provider_update_required" => "업데이트 필요",
                "editor_unavailable" => "Android 기기 전용",
                "activity_unavailable" => "앱 화면 준비 실패",
                _ => "사용 불가",
            };

        private void ShowToast(string message)
        {
            if (toastText == null || toastRoot == null)
            {
                return;
            }

            toastText.text = message;
            toastRoot.SetActive(true);
            toastUntil = Time.unscaledTime + 2.6f;
        }
    }
}
