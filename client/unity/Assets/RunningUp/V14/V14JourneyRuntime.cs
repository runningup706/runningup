// V14 사용자 행동을 GPS·Supabase·Canonical Run·보상 상태머신과 재실행 복구에 연결한다.
using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using RunningUp.RunVerification;
using RunningUp.V14.Backend;
using RunningUp.V14.State;
using UnityEngine;

namespace RunningUp.V14
{
    [Serializable]
    internal sealed class V14BootstrapRequest
    {
        public string p_handle;
        public string p_locale = "en";
        public string p_timezone;
    }

    [Serializable]
    internal sealed class V14StartTrainingRequest
    {
        public string p_session_id;
        public string p_template_id;
    }

    [Serializable]
    internal sealed class V14TrainingStateRequest
    {
        public string p_session_id;
        public string p_expected_status;
        public string p_next_status;
    }

    [Serializable]
    internal sealed class V14FinalizeTrainingRequest
    {
        public string p_session_id;
        public string p_run_id;
    }

    [Serializable]
    internal sealed class V14PurchaseRequest
    {
        public string p_item_id;
        public string p_idempotency_key;
    }

    [Serializable]
    internal sealed class V14EquipRequest
    {
        public string p_item_id;
    }

    [Serializable]
    internal sealed class V14UnequipRequest
    {
        public string p_category;
    }

    [Serializable]
    internal sealed class V14WardrobePresetRequest
    {
        public short p_slot;
        public string p_runtime_name_en;
    }

    [Serializable]
    internal sealed class V14RuntimePreferencesRequest
    {
        public string p_distance_unit;
        public bool p_audio_enabled;
        public string p_graphics_profile;
        public short p_target_frame_rate;
        public bool p_auto_pause_enabled;
    }

    [Serializable]
    public sealed class V14CosmeticCatalogRow
    {
        public string item_id;
        public string runtime_name_en;
        public string category;
        public string currency;
        public long price;
        public bool owned;
        public bool equipped;
    }

    [Serializable]
    internal sealed class V14CosmeticCatalogEnvelope
    {
        public V14CosmeticCatalogRow[] items;
    }

    [Serializable]
    public sealed class V14WardrobePresetRow
    {
        public short slot;
        public string runtime_name_en;
    }

    [Serializable]
    internal sealed class V14WardrobePresetEnvelope
    {
        public V14WardrobePresetRow[] items;
    }

    [Serializable]
    public sealed class V14RuntimePreferencesRow
    {
        public string distance_unit;
        public bool audio_enabled;
        public string graphics_profile;
        public short target_frame_rate;
        public bool auto_pause_enabled;
    }

    [Serializable]
    internal sealed class V14RuntimePreferencesEnvelope
    {
        public V14RuntimePreferencesRow[] items;
    }

    [Serializable]
    public sealed class V14TrainingTemplateRow
    {
        public string id;
        public string runtime_name_en;
        public string category;
        public string target_type;
        public int target_value;
        public bool pause_allowed;
    }

    [Serializable]
    internal sealed class V14TrainingTemplateEnvelope
    {
        public V14TrainingTemplateRow[] items;
    }

    [Serializable]
    internal sealed class V14RaceQueueRequest
    {
        public int p_distance_m;
        public string p_mode;
        public string p_region;
        public int? p_verified_pace_ms_per_km;
    }

    [Serializable]
    internal sealed class V14MatchmakingEntry
    {
        public string id;
        public string state;
        public string match_id;
    }

    [Serializable]
    internal sealed class V14MatchmakingEnvelope
    {
        public V14MatchmakingEntry[] items;
    }

    [Serializable]
    internal sealed class V14RaceReadyRequest
    {
        public string p_match_id;
    }

    [Serializable]
    internal sealed class V14RaceReadyResponse
    {
        public int participant_count;
        public int ready_count;
        public bool all_ready;
        public string state;
        public string scheduled_start_at;
        public string server_now;
    }

    [Serializable]
    internal sealed class V14CancelRaceRequest
    {
        public string p_entry_id;
    }

    [Serializable]
    internal sealed class V14MatchmakerTickRequest
    {
        public int p_distance_m;
        public string p_mode;
        public string p_region;
    }

    [Serializable]
    internal sealed class V14RaceParticipantRow
    {
        public int slot;
        public bool ready;
        public string state;
    }

    [Serializable]
    internal sealed class V14RaceParticipantEnvelope
    {
        public V14RaceParticipantRow[] items;
    }

    [Serializable]
    internal sealed class V14RaceMatchRow
    {
        public string state;
        public string scheduled_start_at;
        public int distance_m;
    }

    [Serializable]
    internal sealed class V14RaceMatchEnvelope
    {
        public V14RaceMatchRow[] items;
    }

    [Serializable]
    internal sealed class V14RaceSnapshotRequest
    {
        public string p_match_id;
        public long p_sequence;
        public long p_elapsed_ms;
        public int p_filtered_distance_m;
        public int p_rolling_pace_ms_per_km;
        public string p_accuracy_bucket;
        public string p_participant_state;
    }

    [Serializable]
    internal sealed class V14RaceStandingRow
    {
        public string user_id;
        public int provisional_place;
        public int filtered_distance_m;
        public long elapsed_ms;
        public string participant_state;
    }

    [Serializable]
    internal sealed class V14RaceStandingEnvelope
    {
        public V14RaceStandingRow[] items;
    }

    [Serializable]
    internal sealed class V14FinalizeRaceRunRequest
    {
        public string p_match_id;
        public string p_run_id;
    }

    [Serializable]
    internal sealed class V14FinalizeRaceMatchRequest
    {
        public string p_match_id;
    }

    [Serializable]
    internal sealed class V14RaceReward
    {
        public int run_coins;
        public int xp;
        public int rating_delta;
    }

    [Serializable]
    internal sealed class V14RaceResultRow
    {
        public int final_place;
        public long verified_elapsed_ms;
        public int rating_before;
        public int rating_delta;
        public int rating_after;
        public V14RaceReward reward;
    }

    [Serializable]
    internal sealed class V14RaceResultEnvelope
    {
        public V14RaceResultRow[] items;
    }

    [Serializable]
    internal sealed class V14RouteRequest
    {
        public string p_route_id;
    }

    [Serializable]
    internal sealed class V14AccountSummaryRow
    {
        public int level;
        public long xp;
    }

    [Serializable]
    internal sealed class V14AccountSummaryEnvelope
    {
        public V14AccountSummaryRow[] items;
    }

    [Serializable]
    internal sealed class V14WalletSummaryRow
    {
        public string currency;
        public long balance;
    }

    [Serializable]
    internal sealed class V14WalletSummaryEnvelope
    {
        public V14WalletSummaryRow[] items;
    }

    [Serializable]
    internal sealed class V14ActiveRouteRow
    {
        public string route_id;
    }

    [Serializable]
    internal sealed class V14ActiveRouteEnvelope
    {
        public V14ActiveRouteRow[] items;
    }

    [Serializable]
    internal sealed class V14WorldProgressRow
    {
        public long progress_m;
    }

    [Serializable]
    internal sealed class V14WorldProgressEnvelope
    {
        public V14WorldProgressRow[] items;
    }

    [Serializable]
    internal sealed class V14CrewNameRequest
    {
        public string p_name;
    }

    [Serializable]
    internal sealed class V14CrewSearchRequest
    {
        public string p_query;
        public int p_limit = 20;
    }

    [Serializable]
    internal sealed class V14CrewIdRequest
    {
        public string p_crew_id;
    }

    [Serializable]
    internal sealed class V14CrewRow
    {
        public string crew_id;
        public string crew_name;
        public string member_role;
        public int member_count;
    }

    [Serializable]
    internal sealed class V14CrewEnvelope
    {
        public V14CrewRow[] items;
    }

    [Serializable]
    internal sealed class V14ActivityHistoryRow
    {
        public string run_id;
        public string source;
        public string route_id;
        public string started_at;
        public string ended_at;
        public int distance_m;
        public int moving_seconds;
        public string verification_status;
        public long runner_growth_points;
    }

    [Serializable]
    internal sealed class V14ActivityHistoryEnvelope
    {
        public V14ActivityHistoryRow[] items;
    }

    [Serializable]
    internal sealed class V14MonthlyApexStatusRow
    {
        public long verified_m;
        public int highest_claimed_checkpoint;
        public bool world_crown;
    }

    [Serializable]
    internal sealed class V14MonthlyApexStatusEnvelope
    {
        public V14MonthlyApexStatusRow[] items;
    }

    [Serializable]
    internal sealed class V14MonthlyMilestoneRequest
    {
        public int p_checkpoint;
        public int p_threshold_m;
    }

    [Serializable]
    internal sealed class V14MonthlyMilestoneClaimRow
    {
        public int checkpoint;
        public int threshold_m;
        public long run_coins;
        public long gems;
        public bool duplicate;
    }

    [Serializable]
    internal sealed class V14MonthlyMilestoneClaimEnvelope
    {
        public V14MonthlyMilestoneClaimRow[] items;
    }

    [DisallowMultipleComponent]
    public sealed class V14JourneyRuntime : MonoBehaviour
    {
        private const string InstallIdKey = "runningup.v14.install-id";
        [SerializeField] private V14SupabaseGateway gateway;
        [SerializeField] private V14AndroidRunBridge runBridge;
        [SerializeField] private V14VerifiedRunUploader uploader;

        private V14StateJournal journal;
        private V14FlowSnapshot snapshot;
        private V14FlowStateMachine<V14TrainingState> training;
        private V14FlowStateMachine<V14RaceState> race;
        private V14FlowStateMachine<V14SyncState> sync;
        private V14FlowStateMachine<V14StoreState> store;
        private bool operationInProgress;
        private Coroutine racePolling;
        private Coroutine raceStandingsPolling;
        private int queuedRaceDistanceMeters = 1000;
        private string queuedRaceRegion = "GLOBAL";
        private V14RaceParticipantRow[] raceParticipants =
            Array.Empty<V14RaceParticipantRow>();
        private V14RaceStandingRow[] raceStandings =
            Array.Empty<V14RaceStandingRow>();
        private readonly List<GpsSample> raceSamples = new();
        private bool raceSnapshotInFlight;
        private bool raceFinishing;
        private int consecutiveRaceNetworkFailures;
        private float nextRaceSnapshotAt;
        private double raceDistanceMeters;
        private double raceStartedRealtime;
        private Coroutine raceReconnectPolling;
        private V14CrewRow[] crewSearchResults = Array.Empty<V14CrewRow>();
        private V14ActivityHistoryRow[] activityHistory =
            Array.Empty<V14ActivityHistoryRow>();
        private V14CosmeticCatalogRow[] cosmeticCatalog =
            Array.Empty<V14CosmeticCatalogRow>();
        private V14WardrobePresetRow[] wardrobePresets =
            Array.Empty<V14WardrobePresetRow>();
        private V14RuntimePreferencesRow runtimePreferences;
        private bool runtimePreferencesLoaded;
        private V14TrainingTemplateRow[] trainingTemplates =
            Array.Empty<V14TrainingTemplateRow>();
        private bool trainingTemplatesLoaded;
        private string selectedCosmeticItemId = "V13-TOP-BASE-02";
        private bool cosmeticInventoryLoaded;
        private long monthlyVerifiedMeters;
        private int monthlyHighestClaimedCheckpoint;
        private bool monthlyWorldCrown;
        private bool monthlyApexLoaded;

        public V14TrainingState TrainingState =>
            training?.Current ?? V14TrainingState.SELECT;
        public V14RaceState RaceState =>
            race?.Current ?? V14RaceState.BROWSE;
        public V14SyncState SyncState =>
            sync?.Current ?? V14SyncState.CONNECTION_CHECK;
        public V14StoreState StoreState =>
            store?.Current ?? V14StoreState.BROWSE;
        public int AccountLevel => snapshot?.accountLevel ?? 0;
        public long AccountXp => snapshot?.accountXp ?? 0;
        public long RunCoins => snapshot?.runCoins ?? 0;
        public long Gems => snapshot?.gems ?? 0;
        public bool AccountSummaryLoaded =>
            snapshot != null && snapshot.accountSummaryLoaded;
        public string LastVerifiedRunId =>
            snapshot?.lastVerifiedRunId ?? string.Empty;
        public int LastVerifiedDistanceMeters =>
            snapshot?.lastVerifiedDistanceMeters ?? 0;
        public int LastVerifiedMovingSeconds =>
            snapshot?.lastVerifiedMovingSeconds ?? 0;
        public long LastRunnerGrowthPoints =>
            snapshot?.lastRunnerGrowthPoints ?? 0;
        public long LastPacerBondPoints =>
            snapshot?.lastPacerBondPoints ?? 0;
        public long LastRestorationPoints =>
            snapshot?.lastRestorationPoints ?? 0;
        public long LastMonthlyVerifiedMeters =>
            snapshot?.lastMonthlyVerifiedMeters ?? 0;
        public IReadOnlyList<V14CosmeticCatalogRow> CosmeticCatalog =>
            cosmeticCatalog;
        public IReadOnlyList<V14WardrobePresetRow> WardrobePresets =>
            wardrobePresets;
        public bool CosmeticInventoryLoaded => cosmeticInventoryLoaded;
        public string SelectedCosmeticItemId => selectedCosmeticItemId;
        public V14CosmeticCatalogRow SelectedCosmetic =>
            FindCosmetic(selectedCosmeticItemId);
        public V14RuntimePreferencesRow RuntimePreferences =>
            runtimePreferences;
        public bool RuntimePreferencesLoaded => runtimePreferencesLoaded;
        public IReadOnlyList<V14TrainingTemplateRow> TrainingTemplates =>
            trainingTemplates;
        public bool TrainingTemplatesLoaded => trainingTemplatesLoaded;
        public bool ActiveRouteLoaded => snapshot != null && snapshot.activeRouteLoaded;
        public string ActiveRouteId => snapshot?.activeRouteId ?? string.Empty;
        public long ActiveRouteProgressMeters =>
            snapshot?.activeRouteProgressMeters ?? 0;
        public int ActiveRouteTargetMeters =>
            snapshot?.activeRouteTargetMeters ?? 0;
        public int RaceCountdownSeconds { get; private set; }
        public int RaceDistanceMeters =>
            snapshot?.raceDistanceMeters ?? queuedRaceDistanceMeters;
        public int RaceFilteredDistanceMeters =>
            Mathf.Max(0, Mathf.RoundToInt((float)raceDistanceMeters));
        public long RaceElapsedMilliseconds =>
            raceStartedRealtime <= 0
                ? 0
                : Math.Max(
                    0,
                    (long)((Time.realtimeSinceStartupAsDouble -
                            raceStartedRealtime) * 1000.0));
        public int RaceRollingPaceMillisecondsPerKilometer =>
            RaceFilteredDistanceMeters <= 0
                ? 0
                : (int)Math.Round(
                    RaceElapsedMilliseconds * 1000.0 /
                    RaceFilteredDistanceMeters);
        public int RaceProvisionalPlace { get; private set; }
        public string RaceNetworkState { get; private set; } = "CONNECTED";
        public int LastRacePlace => snapshot?.lastRacePlace ?? 0;
        public long LastRaceElapsedMilliseconds =>
            snapshot?.lastRaceElapsedMilliseconds ?? 0;
        public int LastRaceRatingBefore =>
            snapshot?.lastRaceRatingBefore ?? 0;
        public int LastRaceRatingDelta =>
            snapshot?.lastRaceRatingDelta ?? 0;
        public int LastRaceRatingAfter =>
            snapshot?.lastRaceRatingAfter ?? 0;
        public int LastRaceXp => snapshot?.lastRaceXp ?? 0;
        public int LastRaceRunCoins => snapshot?.lastRaceRunCoins ?? 0;
        public bool CrewLoaded => snapshot != null && snapshot.crewLoaded;
        public bool HasCrew => !string.IsNullOrWhiteSpace(snapshot?.crewId);
        public string CrewName => snapshot?.crewName ?? string.Empty;
        public string CrewRole => snapshot?.crewRole ?? string.Empty;
        public int CrewMemberCount => snapshot?.crewMemberCount ?? 0;
        public int CrewSearchResultCount => crewSearchResults.Length;
        public int ActivityHistoryCount => activityHistory.Length;
        public long MonthlyVerifiedMeters => monthlyApexLoaded
            ? monthlyVerifiedMeters
            : LastMonthlyVerifiedMeters;
        public int MonthlyHighestClaimedCheckpoint =>
            monthlyHighestClaimedCheckpoint;
        public bool MonthlyWorldCrown => monthlyWorldCrown;
        public bool MonthlyApexLoaded => monthlyApexLoaded;
        public string RaceLobbySummary
        {
            get
            {
                var ready = 0;
                foreach (var participant in raceParticipants)
                {
                    if (participant.ready)
                    {
                        ready++;
                    }
                }
                return $"{raceParticipants.Length} / 8 JOINED · {ready} READY";
            }
        }
        public string[] RaceParticipantLabels
        {
            get
            {
                var labels = new string[8];
                for (var index = 0; index < labels.Length; index++)
                {
                    labels[index] = $"SLOT {index + 1} · WAITING FOR RUNNER";
                }
                foreach (var participant in raceParticipants)
                {
                    if (participant.slot < 1 || participant.slot > 8)
                    {
                        continue;
                    }
                    labels[participant.slot - 1] =
                        $"SLOT {participant.slot} · " +
                        (participant.ready ? "READY" : participant.state);
                }
                return labels;
            }
        }
        public string[] RaceStandingLabels
        {
            get
            {
                if (raceStandings.Length == 0)
                {
                    return new[]
                    {
                        "WAITING FOR VERIFIED SERVER SNAPSHOTS",
                    };
                }
                var labels = new string[raceStandings.Length];
                for (var index = 0; index < raceStandings.Length; index++)
                {
                    var row = raceStandings[index];
                    labels[index] =
                        $"#{row.provisional_place} · " +
                        $"{row.filtered_distance_m / 1000f:0.00} km · " +
                        $"{row.participant_state}";
                }
                return labels;
            }
        }
        public RunCandidate LastAcceptedRun { get; private set; }
        public SupabaseIngestResponse LastServerResponse { get; private set; }
        public string Status { get; private set; } = "initializing";
        public event Action<string> StatusChanged;
        public event Action StateChanged;

        private bool HasConfiguredBackend => gateway != null && gateway.IsConfigured;

        private void Awake()
        {
            gateway ??= GetComponent<V14SupabaseGateway>();
            runBridge ??= GetComponent<V14AndroidRunBridge>();
            uploader ??= GetComponent<V14VerifiedRunUploader>();
            journal = new V14StateJournal(Path.Combine(
                Application.persistentDataPath,
                "v14-flow-state.json"));
            snapshot = journal.Load();
            training = V14FlowFactory.Training(Parse(
                snapshot.training,
                V14TrainingState.SELECT));
            race = V14FlowFactory.Race(Parse(
                snapshot.race,
                V14RaceState.BROWSE));
            sync = V14FlowFactory.Sync(Parse(
                snapshot.sync,
                V14SyncState.CONNECTION_CHECK));
            store = V14FlowFactory.Store(Parse(
                snapshot.store,
                V14StoreState.BROWSE));
            training.Changed += (_, _) => Save();
            race.Changed += (_, _) => Save();
            sync.Changed += (_, _) => Save();
            store.Changed += (_, _) => Save();
        }

        private void OnEnable()
        {
            if (runBridge != null)
            {
                runBridge.StatusChanged += OnRunBridgeStatus;
                runBridge.RunAccepted += OnLocalRunAccepted;
                runBridge.GpsSampleReceived += OnRaceGpsSample;
            }
            if (uploader != null)
            {
                uploader.ServerRunAccepted += OnServerRunAccepted;
            }
        }

        private void Start()
        {
            var nativeState = runBridge?.DirectGpsState;
            if (nativeState == "capturing" &&
                race.Current != V14RaceState.ACTIVE &&
                training.Current is not V14TrainingState.ACTIVE and
                    not V14TrainingState.PAUSED and
                    not V14TrainingState.RESUMED)
            {
                training.Restore(V14TrainingState.ACTIVE);
                Save();
            }
            else if (nativeState == "paused")
            {
                training.Restore(V14TrainingState.PAUSED);
                Save();
            }

            Publish(gateway != null && gateway.IsConfigured
                ? "ready"
                : "backend_project_required");
            if (gateway != null && gateway.IsConfigured)
            {
                StartCoroutine(RefreshAccountSummaryFlow(false));
                StartCoroutine(RefreshCrewFlow(false));
                StartCoroutine(RefreshCosmeticInventoryFlow(false));
                StartCoroutine(RefreshRuntimePreferencesFlow(false));
                StartCoroutine(RefreshTrainingTemplatesFlow(false));
                if (race.Current is V14RaceState.MATCHMAKING or
                    V14RaceState.MATCH_FOUND or V14RaceState.LOBBY or
                    V14RaceState.READY)
                {
                    racePolling = StartCoroutine(PollRaceContextFlow());
                }
                else if (race.Current == V14RaceState.SERVER_COUNTDOWN)
                {
                    StartCoroutine(RefreshScheduledRaceStartFlow());
                }
                else if (race.Current is V14RaceState.ACTIVE or
                         V14RaceState.CONNECTION_LOST or
                         V14RaceState.RECONNECTING)
                {
                    ResumeActiveRace();
                }
                else if (race.Current == V14RaceState.FINISH_PENDING)
                {
                    raceFinishing = true;
                    StartCoroutine(RecoverFinishedRaceCaptureFlow(false));
                }
            }
        }

        private void OnApplicationFocus(bool hasFocus)
        {
            if (hasFocus &&
                race.Current is V14RaceState.CONNECTION_LOST or
                    V14RaceState.RECONNECTING)
            {
                ResumeActiveRace();
            }
        }

        private void OnDisable()
        {
            if (runBridge != null)
            {
                runBridge.StatusChanged -= OnRunBridgeStatus;
                runBridge.RunAccepted -= OnLocalRunAccepted;
                runBridge.GpsSampleReceived -= OnRaceGpsSample;
            }
            if (uploader != null)
            {
                uploader.ServerRunAccepted -= OnServerRunAccepted;
            }
        }

        public void AuthenticateGuest()
        {
            if (!BeginOperation("authentication_in_progress"))
            {
                return;
            }
            Publish("authentication_in_progress");
            StartCoroutine(AuthenticateGuestFlow());
        }

        public void SignOut()
        {
            if (!BeginOperation("sign_out_in_progress"))
            {
                return;
            }
            Publish("sign_out_in_progress");
            StartCoroutine(SignOutFlow());
        }

        public void StartOneKilometerTraining()
        {
            StartTraining("ONE_K");
        }

        public void StartTraining(string templateId)
        {
            if (operationInProgress)
            {
                Publish("operation_in_progress");
                return;
            }
            if (training.Current == V14TrainingState.REWARDED)
            {
                training.Move(V14TrainingState.SELECT);
            }
            if (training.Current == V14TrainingState.SENSOR_CHECK)
            {
                StartCoroutine(ContinueSensorCheck(templateId));
                return;
            }
            if (training.Current != V14TrainingState.SELECT)
            {
                Publish($"training_conflict:{training.Current}");
                return;
            }
            if (trainingTemplatesLoaded && FindTrainingTemplate(templateId) == null)
            {
                Publish("training_template_unavailable");
                return;
            }

            snapshot.trainingSessionId = Guid.NewGuid().ToString();
            snapshot.pendingIdempotencyKey =
                $"v14:training:{snapshot.trainingSessionId}:start";
            training.Move(V14TrainingState.CONFIGURE);
            training.Move(V14TrainingState.SENSOR_CHECK);
            Save();
            StartCoroutine(ContinueSensorCheck(templateId));
        }

        public void PauseTraining()
        {
            if (training.Current != V14TrainingState.ACTIVE)
            {
                Publish($"pause_conflict:{training.Current}");
                return;
            }
            if (!BeginOperation("pause_in_progress"))
            {
                return;
            }
            StartCoroutine(SetTrainingStateFlow(
                "ACTIVE",
                "PAUSED",
                V14TrainingState.PAUSED,
                () => runBridge?.PauseDirectGps() ?? "bridge_unavailable",
                "pausing",
                "training_paused"));
        }

        public void ResumeTraining()
        {
            if (training.Current != V14TrainingState.PAUSED)
            {
                Publish($"resume_conflict:{training.Current}");
                return;
            }
            if (!BeginOperation("resume_in_progress"))
            {
                return;
            }
            StartCoroutine(ResumeTrainingFlow());
        }

        public void FinishTraining()
        {
            if (training.Current is not V14TrainingState.ACTIVE and
                not V14TrainingState.PAUSED and
                not V14TrainingState.RESUMED)
            {
                Publish($"finish_conflict:{training.Current}");
                return;
            }
            if (!BeginOperation("finish_in_progress"))
            {
                return;
            }
            StartCoroutine(FinishTrainingFlow(
                training.Current == V14TrainingState.PAUSED
                    ? "PAUSED"
                    : "ACTIVE"));
        }

        public void DiscoverHealthConnectRuns()
        {
            if (sync.Current == V14SyncState.RESULT)
            {
                sync.Move(V14SyncState.CONNECTION_CHECK);
            }
            if (sync.Current != V14SyncState.CONNECTION_CHECK)
            {
                Publish($"sync_conflict:{sync.Current}");
                return;
            }
            sync.Move(V14SyncState.DISCOVERING);
            Publish(runBridge?.ReadRecentHealthRuns() ?? "bridge_unavailable");
        }

        public void ImportFirstDiscoveredHealthRun()
        {
            if (sync.Current != V14SyncState.PREVIEW)
            {
                Publish($"sync_import_conflict:{sync.Current}");
                return;
            }
            if (runBridge == null || runBridge.PendingHealthRunCount == 0)
            {
                sync.Restore(V14SyncState.CONNECTION_CHECK);
                Save();
                Publish("health_run_not_found");
                return;
            }

            sync.Move(V14SyncState.IMPORT_REQUESTED);
            sync.Move(V14SyncState.CANONICALIZING);
            sync.Move(V14SyncState.DUPLICATE_CHECK);
            sync.Move(V14SyncState.VERIFYING);
            Save();
            Publish(runBridge.ImportPendingHealthRun(0));
        }

        public void PurchaseStarterTop()
        {
            PurchaseCosmetic("V13-TOP-BASE-02");
        }

        public void EquipStarterTop()
        {
            EquipCosmetic("V13-TOP-BASE-02");
        }

        public void RefreshCosmeticInventory()
        {
            if (!BeginOperation("cosmetic_inventory_loading"))
            {
                return;
            }
            StartCoroutine(RefreshCosmeticInventoryFlow(true));
        }

        public void RefreshRuntimePreferences()
        {
            if (!BeginOperation("runtime_preferences_loading"))
            {
                return;
            }
            StartCoroutine(RefreshRuntimePreferencesFlow(true));
        }

        public void RefreshTrainingTemplates()
        {
            if (!BeginOperation("training_catalog_loading"))
            {
                return;
            }
            StartCoroutine(RefreshTrainingTemplatesFlow(true));
        }

        public bool IsTrainingTemplateAvailable(string templateId) =>
            FindTrainingTemplate(templateId) != null;

        public string TrainingTemplateDetail(string templateId)
        {
            var template = FindTrainingTemplate(templateId);
            if (template == null)
            {
                return trainingTemplatesLoaded
                    ? "UNAVAILABLE"
                    : "SERVER PLAN LOADING";
            }
            return template.target_type switch
            {
                "DISTANCE" => template.target_value > 0
                    ? $"{template.target_value / 1000f:0.###} KM VERIFIED"
                    : "SET DISTANCE IN PREP",
                "TIME" => template.target_value > 0
                    ? $"{template.target_value / 60} MIN VERIFIED"
                    : "SET TIME IN PREP",
                "STEPS" => template.target_value > 0
                    ? $"{template.target_value} BLOCKS · GPS"
                    : "BUILD IN PREP",
                _ => "OPEN · VERIFIED",
            };
        }

        public void SaveRuntimePreferences(
            string distanceUnit,
            bool audioEnabled,
            string graphicsProfile,
            short targetFrameRate,
            bool autoPauseEnabled)
        {
            if (!BeginOperation("runtime_preferences_saving"))
            {
                return;
            }
            StartCoroutine(SaveRuntimePreferencesFlow(
                new V14RuntimePreferencesRequest
                {
                    p_distance_unit = distanceUnit,
                    p_audio_enabled = audioEnabled,
                    p_graphics_profile = graphicsProfile,
                    p_target_frame_rate = targetFrameRate,
                    p_auto_pause_enabled = autoPauseEnabled,
                }));
        }

        public void SelectCosmeticItem(string itemId)
        {
            var item = FindCosmetic(itemId);
            if (item == null)
            {
                Publish(cosmeticInventoryLoaded
                    ? "cosmetic_item_not_found"
                    : "cosmetic_inventory_loading");
                return;
            }
            selectedCosmeticItemId = item.item_id;
            StateChanged?.Invoke();
            Publish($"cosmetic_selected:{item.category}");
        }

        public void PurchaseSelectedCosmetic()
        {
            PurchaseCosmetic(selectedCosmeticItemId);
        }

        public void PurchaseCosmetic(string itemId)
        {
            var item = FindCosmetic(itemId);
            if (item == null || item.owned)
            {
                Publish(item == null
                    ? "cosmetic_item_not_found"
                    : "cosmetic_already_owned");
                return;
            }
            if (!BeginOperation("purchase_in_progress"))
            {
                return;
            }
            StartCoroutine(PurchaseFlow(item.item_id));
        }

        public void EquipSelectedCosmetic()
        {
            EquipCosmetic(selectedCosmeticItemId);
        }

        public void EquipCosmetic(string itemId)
        {
            var item = FindCosmetic(itemId);
            if (item == null || !item.owned)
            {
                Publish(item == null
                    ? "cosmetic_item_not_found"
                    : "cosmetic_not_owned");
                return;
            }
            if (!BeginOperation("equip_in_progress"))
            {
                return;
            }
            StartCoroutine(EquipFlow(item.item_id));
        }

        public void UnequipSelectedCosmetic()
        {
            var item = FindCosmetic(selectedCosmeticItemId);
            if (item == null)
            {
                Publish("cosmetic_item_not_found");
                return;
            }
            if (!BeginOperation("unequip_in_progress"))
            {
                return;
            }
            StartCoroutine(UnequipFlow(item.category));
        }

        public void SaveWardrobePreset(short slot, string runtimeName)
        {
            if (!BeginOperation("preset_save_in_progress"))
            {
                return;
            }
            StartCoroutine(SaveWardrobePresetFlow(slot, runtimeName));
        }

        public void QueueRankedOneKilometer()
        {
            QueueRace(1000, "GLOBAL");
        }

        public void QueueRace(int distanceMeters, string region)
        {
            var capability = runBridge?.DirectGpsCapability ??
                "bridge_unavailable";
            if (capability == "permission_required")
            {
                Publish(runBridge?.StartDirectGps() ?? "bridge_unavailable");
                return;
            }
            if (capability != "ready")
            {
                Publish($"sensor_unavailable:{capability}");
                return;
            }
            if (!BeginOperation("matchmaking_in_progress"))
            {
                return;
            }
            queuedRaceDistanceMeters = distanceMeters;
            queuedRaceRegion = string.IsNullOrWhiteSpace(region)
                ? "GLOBAL"
                : region.ToUpperInvariant();
            StartCoroutine(QueueRaceFlow());
        }

        public void MarkRaceReady()
        {
            if (race.Current != V14RaceState.LOBBY ||
                string.IsNullOrWhiteSpace(snapshot.raceMatchId))
            {
                Publish($"race_ready_conflict:{race.Current}");
                return;
            }
            if (!BeginOperation("race_ready_in_progress"))
            {
                return;
            }
            StartCoroutine(RaceReadyFlow());
        }

        public void CancelRaceQueue()
        {
            if (race.Current != V14RaceState.MATCHMAKING ||
                string.IsNullOrWhiteSpace(snapshot.raceEntryId))
            {
                Publish($"race_cancel_conflict:{race.Current}");
                return;
            }
            if (!BeginOperation("race_cancel_in_progress"))
            {
                return;
            }
            StartCoroutine(CancelRaceQueueFlow());
        }

        public void FinishRace()
        {
            if (race.Current != V14RaceState.ACTIVE)
            {
                Publish($"race_finish_conflict:{race.Current}");
                return;
            }
            if (RaceFilteredDistanceMeters < RaceDistanceMeters)
            {
                Publish(
                    $"race_distance_remaining:" +
                    $"{RaceDistanceMeters - RaceFilteredDistanceMeters}");
                return;
            }
            BeginRaceFinish();
        }

        public void RetryRaceConnection()
        {
            if (race.Current is not V14RaceState.CONNECTION_LOST and
                not V14RaceState.RECONNECTING)
            {
                Publish($"race_reconnect_conflict:{race.Current}");
                return;
            }

            var nativeStatus = runBridge?.StartDirectGps() ??
                "bridge_unavailable";
            if (nativeStatus is not "started" and not "capturing")
            {
                race.Restore(V14RaceState.CONNECTION_LOST);
                Save();
                Publish(nativeStatus);
                return;
            }

            if (race.Current == V14RaceState.CONNECTION_LOST)
            {
                race.Move(V14RaceState.RECONNECTING);
            }
            Save();
            Publish("race_reconnect_requested");
            StartRaceReconnectPolling();
        }

        public void SelectFirstRoute()
        {
            // 월드 카탈로그와 동일한 공개 코스 ID로 첫 여정을 선택한다.
            SelectRoute("C01-R01-S01");
        }

        public void SelectRoute(string routeId)
        {
            var serverRouteId = ToServerRouteId(routeId);
            if (string.IsNullOrWhiteSpace(serverRouteId))
            {
                Publish("route_invalid");
                return;
            }
            if (!BeginOperation("route_selection_in_progress"))
            {
                return;
            }
            StartCoroutine(SelectRouteFlow(serverRouteId));
        }

        private static string ToServerRouteId(string routeId)
        {
            if (string.IsNullOrWhiteSpace(routeId))
            {
                return string.Empty;
            }
            var catalog = System.Text.RegularExpressions.Regex.Match(
                routeId.Trim(), "^C([0-9]{2})-R([0-9]{2})-S([0-9]{2})$");
            if (catalog.Success)
            {
                return $"CONT{catalog.Groups[1].Value}-REG{catalog.Groups[2].Value}-" +
                    $"ROUTE{catalog.Groups[3].Value}";
            }
            return System.Text.RegularExpressions.Regex.IsMatch(
                routeId.Trim(), "^CONT[0-9]{2}-REG[0-9]{2}-ROUTE[0-9]{2}$")
                ? routeId.Trim()
                : string.Empty;
        }

        public void RefreshCrew()
        {
            if (!BeginOperation("crew_refresh_in_progress"))
            {
                return;
            }
            StartCoroutine(RefreshCrewFlow(true));
        }

        public void CreateCrew(string crewName)
        {
            if (string.IsNullOrWhiteSpace(crewName))
            {
                Publish("crew_name_required");
                return;
            }
            if (!BeginOperation("crew_create_in_progress"))
            {
                return;
            }
            StartCoroutine(CreateCrewFlow(crewName.Trim()));
        }

        public void SearchCrews(string query)
        {
            if (!BeginOperation("crew_search_in_progress"))
            {
                return;
            }
            StartCoroutine(SearchCrewsFlow(query?.Trim() ?? string.Empty));
        }

        public void JoinCrewSearchResult(int index)
        {
            if (index < 0 || index >= crewSearchResults.Length ||
                string.IsNullOrWhiteSpace(crewSearchResults[index].crew_id))
            {
                Publish("crew_search_result_invalid");
                return;
            }
            if (!BeginOperation("crew_join_in_progress"))
            {
                return;
            }
            StartCoroutine(JoinCrewFlow(crewSearchResults[index].crew_id));
        }

        public void LeaveCrew()
        {
            if (string.IsNullOrWhiteSpace(snapshot.crewId))
            {
                Publish("crew_not_joined");
                return;
            }
            if (!BeginOperation("crew_leave_in_progress"))
            {
                return;
            }
            StartCoroutine(LeaveCrewFlow(snapshot.crewId));
        }

        public string CrewSearchLabel(int index)
        {
            if (index < 0 || index >= crewSearchResults.Length)
            {
                return string.Empty;
            }
            var row = crewSearchResults[index];
            return $"{row.crew_name} · {row.member_count} RUNNERS";
        }

        public string ActivityHistoryLabel(int index)
        {
            if (index < 0 || index >= activityHistory.Length)
            {
                return string.Empty;
            }

            var row = activityHistory[index];
            var started = DateTimeOffset.TryParse(
                row.started_at,
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal,
                out var parsed)
                ? parsed.ToLocalTime().ToString("MMM dd · HH:mm", CultureInfo.InvariantCulture)
                : "VERIFIED RUN";
            var source = string.IsNullOrWhiteSpace(row.source)
                ? "VERIFIED"
                : row.source.Replace('_', ' ').ToUpperInvariant();
            var route = string.IsNullOrWhiteSpace(row.route_id)
                ? "OPEN ROUTE"
                : row.route_id;
            return $"{started} · {source}\n" +
                $"{row.distance_m / 1000f:0.00} km · {row.moving_seconds / 60}:{row.moving_seconds % 60:00} · +{row.runner_growth_points:N0} GROWTH\n" +
                route;
        }

        public void RefreshActivityHistory()
        {
            if (!BeginOperation("activity_history_loading"))
            {
                return;
            }
            StartCoroutine(RefreshActivityHistoryFlow());
        }

        public void RefreshMonthlyApex()
        {
            if (!BeginOperation("monthly_apex_loading"))
            {
                return;
            }
            StartCoroutine(RefreshMonthlyApexRequestedFlow());
        }

        public void ClaimMonthlyApexCheckpoint(
            int checkpoint,
            int displayThresholdMeters)
        {
            if (checkpoint < 1 || checkpoint > 120)
            {
                Publish("monthly_checkpoint_invalid");
                return;
            }
            if (!BeginOperation("monthly_checkpoint_claiming"))
            {
                return;
            }
            StartCoroutine(ClaimMonthlyApexCheckpointFlow(
                checkpoint,
                displayThresholdMeters));
        }

        private IEnumerator AuthenticateGuestFlow()
        {
            yield return RefreshAccountSummaryFlow(true);
            operationInProgress = false;
        }

        private IEnumerator SignOutFlow()
        {
            var signedOut = false;
            if (gateway != null)
            {
                yield return gateway.SignOut(value => signedOut = value);
            }

            operationInProgress = false;
            if (!signedOut)
            {
                Publish("sign_out_failed");
                yield break;
            }

            snapshot.accountLevel = 0;
            snapshot.accountXp = 0;
            snapshot.runCoins = 0;
            snapshot.gems = 0;
            snapshot.accountSummaryLoaded = false;
            snapshot.activeRouteId = string.Empty;
            snapshot.activeRouteProgressMeters = 0;
            snapshot.activeRouteTargetMeters = 0;
            snapshot.activeRouteLoaded = false;
            snapshot.crewId = string.Empty;
            snapshot.crewName = string.Empty;
            snapshot.crewRole = string.Empty;
            snapshot.crewMemberCount = 0;
            snapshot.crewLoaded = false;
            runtimePreferences = null;
            runtimePreferencesLoaded = false;
            Save();
            Publish("signed_out");
        }

        private IEnumerator RefreshAccountSummaryFlow(bool publishResult)
        {
            var request = new V14BootstrapRequest
            {
                p_handle = InstallHandle(),
                p_timezone = TimeZoneInfo.Local.Id,
            };
            V14ServerReply reply = null;
            yield return gateway.InvokeRpc(
                $"v14:bootstrap:{request.p_handle}",
                "v13_bootstrap_profile",
                JsonUtility.ToJson(request),
                value => reply = value);
            if (reply == null || !reply.succeeded)
            {
                if (publishResult)
                {
                    Publish(reply?.error ?? "account_refresh_failed");
                }
                yield break;
            }

            var profile = ParseArray<V14AccountSummaryEnvelope>(
                reply.body)?.items;
            if (profile == null || profile.Length == 0)
            {
                if (publishResult)
                {
                    Publish("account_response_invalid");
                }
                yield break;
            }

            reply = null;
            yield return gateway.InvokeRpc(
                $"v14:wallet:{InstallHandle()}",
                "v13_wallet_summary",
                "{}",
                value => reply = value);
            if (reply == null || !reply.succeeded)
            {
                if (publishResult)
                {
                    Publish(reply?.error ?? "wallet_refresh_failed");
                }
                yield break;
            }

            snapshot.accountLevel = profile[0].level;
            snapshot.accountXp = profile[0].xp;
            snapshot.runCoins = 0;
            snapshot.gems = 0;
            foreach (var wallet in
                     ParseArray<V14WalletSummaryEnvelope>(reply.body)?.items ??
                     Array.Empty<V14WalletSummaryRow>())
            {
                if (string.Equals(
                        wallet.currency,
                        "RUN_COINS",
                        StringComparison.Ordinal))
                {
                    snapshot.runCoins = wallet.balance;
                }
                else if (string.Equals(
                             wallet.currency,
                             "GEMS",
                             StringComparison.Ordinal))
                {
                    snapshot.gems = wallet.balance;
                }
            }
            snapshot.accountSummaryLoaded = true;
            yield return RefreshActiveRouteSummaryFlow();
            Save();
            if (publishResult)
            {
                Publish("account_ready");
            }
        }

        private IEnumerator RefreshActiveRouteSummaryFlow()
        {
            if (gateway == null || string.IsNullOrWhiteSpace(gateway.AuthenticatedUserId))
            {
                yield break;
            }

            var userId = Uri.EscapeDataString(gateway.AuthenticatedUserId);
            V14ServerReply reply = null;
            yield return gateway.InvokeGet(
                $"v14:active-route:{InstallId()}",
                $"active_routes?select=route_id&user_id=eq.{userId}&limit=1",
                value => reply = value);
            var routes = reply != null && reply.succeeded
                ? ParseArray<V14ActiveRouteEnvelope>(reply.body)?.items
                : null;
            if (routes == null || routes.Length != 1 ||
                string.IsNullOrWhiteSpace(routes[0].route_id))
            {
                snapshot.activeRouteLoaded = false;
                yield break;
            }

            var routeId = routes[0].route_id;
            var routeIdQuery = Uri.EscapeDataString(routeId);
            reply = null;
            yield return gateway.InvokeGet(
                $"v14:route-progress:{InstallId()}:{routeId}",
                "world_progress?select=progress_m&user_id=eq." + userId +
                "&route_id=eq." + routeIdQuery + "&limit=1",
                value => reply = value);
            if (reply == null || !reply.succeeded)
            {
                snapshot.activeRouteLoaded = false;
                yield break;
            }

            var progress = ParseArray<V14WorldProgressEnvelope>(reply.body)?.items;
            snapshot.activeRouteId = routeId;
            snapshot.activeRouteProgressMeters = progress != null && progress.Length == 1
                ? Math.Max(0L, progress[0].progress_m)
                : 0L;
            // 현재 기본 코스의 서버 정의 길이는 10km이며 선택 코스 진행도는 이 값에 대해 표시한다.
            snapshot.activeRouteTargetMeters = 10000;
            snapshot.activeRouteLoaded = true;
        }

        private IEnumerator RefreshCrewFlow(bool publishResult)
        {
            V14ServerReply reply = null;
            yield return gateway.InvokeRpc(
                $"v14:crew:mine:{InstallId()}",
                "v14_my_crew",
                "{}",
                value => reply = value);
            if (reply == null || !reply.succeeded)
            {
                operationInProgress = false;
                if (publishResult)
                {
                    Publish(reply?.error ?? "crew_refresh_failed");
                }
                yield break;
            }

            var rows = ParseArray<V14CrewEnvelope>(reply.body)?.items ??
                Array.Empty<V14CrewRow>();
            if (rows.Length == 0)
            {
                snapshot.crewId = string.Empty;
                snapshot.crewName = string.Empty;
                snapshot.crewRole = string.Empty;
                snapshot.crewMemberCount = 0;
            }
            else
            {
                ApplyCrew(rows[0]);
            }
            snapshot.crewLoaded = true;
            Save();
            operationInProgress = false;
            if (publishResult)
            {
                Publish(rows.Length == 0 ? "crew_empty" : "crew_loaded");
            }
        }

        private IEnumerator RefreshActivityHistoryFlow()
        {
            V14ServerReply reply = null;
            yield return gateway.InvokeRpc(
                $"v14:activity-history:{InstallId()}",
                "v14_activity_history",
                "{\"p_limit\":20}",
                value => reply = value);
            if (reply == null || !reply.succeeded)
            {
                operationInProgress = false;
                Publish(reply?.error ?? "activity_history_failed");
                yield break;
            }

            activityHistory = ParseArray<V14ActivityHistoryEnvelope>(
                reply.body)?.items ?? Array.Empty<V14ActivityHistoryRow>();
            operationInProgress = false;
            StateChanged?.Invoke();
            Publish(activityHistory.Length == 0
                ? "activity_history_empty"
                : "activity_history_loaded");
        }

        private IEnumerator RefreshCosmeticInventoryFlow(bool publishResult)
        {
            V14ServerReply reply = null;
            yield return gateway.InvokeRpc(
                $"v14:cosmetic-catalog:{InstallId()}",
                "v14_cosmetic_catalog",
                "{}",
                value => reply = value);
            if (reply == null || !reply.succeeded)
            {
                if (publishResult)
                {
                    operationInProgress = false;
                    Publish(reply?.error ?? "cosmetic_catalog_failed");
                }
                yield break;
            }

            cosmeticCatalog = ParseArray<V14CosmeticCatalogEnvelope>(
                reply.body)?.items ?? Array.Empty<V14CosmeticCatalogRow>();
            if (FindCosmetic(selectedCosmeticItemId) == null &&
                cosmeticCatalog.Length > 0)
            {
                selectedCosmeticItemId = cosmeticCatalog[0].item_id;
            }

            reply = null;
            yield return gateway.InvokeRpc(
                $"v14:wardrobe-presets:{InstallId()}",
                "v14_wardrobe_presets",
                "{}",
                value => reply = value);
            if (reply == null || !reply.succeeded)
            {
                if (publishResult)
                {
                    operationInProgress = false;
                    Publish(reply?.error ?? "wardrobe_presets_failed");
                }
                yield break;
            }

            wardrobePresets = ParseArray<V14WardrobePresetEnvelope>(
                reply.body)?.items ?? Array.Empty<V14WardrobePresetRow>();
            cosmeticInventoryLoaded = true;
            StateChanged?.Invoke();
            if (publishResult)
            {
                operationInProgress = false;
                Publish("cosmetics_loaded");
            }
        }

        private IEnumerator RefreshRuntimePreferencesFlow(bool publishResult)
        {
            V14ServerReply reply = null;
            yield return gateway.InvokeRpc(
                $"v14:runtime-preferences:{InstallId()}",
                "v14_runtime_preferences",
                "{}",
                value => reply = value);
            if (reply == null || !reply.succeeded)
            {
                if (publishResult)
                {
                    operationInProgress = false;
                    Publish(reply?.error ?? "runtime_preferences_failed");
                }
                yield break;
            }

            var rows = ParseArray<V14RuntimePreferencesEnvelope>(reply.body)?.items;
            if (rows == null || rows.Length != 1)
            {
                if (publishResult)
                {
                    operationInProgress = false;
                    Publish("runtime_preferences_response_invalid");
                }
                yield break;
            }

            runtimePreferences = rows[0];
            runtimePreferencesLoaded = true;
            StateChanged?.Invoke();
            if (publishResult)
            {
                operationInProgress = false;
            }
            Publish("runtime_preferences_loaded");
        }

        private IEnumerator RefreshTrainingTemplatesFlow(bool publishResult)
        {
            V14ServerReply reply = null;
            yield return gateway.InvokeGet(
                $"v14:training-templates:{InstallId()}",
                "training_templates?select=id,runtime_name_en,category,target_type,target_value,pause_allowed&enabled=eq.true&order=id.asc",
                value => reply = value);
            if (reply == null || !reply.succeeded)
            {
                if (publishResult)
                {
                    operationInProgress = false;
                    Publish(reply?.error ?? "training_catalog_failed");
                }
                yield break;
            }

            var rows = ParseArray<V14TrainingTemplateEnvelope>(reply.body)?.items;
            if (rows == null || rows.Length != 34)
            {
                if (publishResult)
                {
                    operationInProgress = false;
                    Publish("training_catalog_response_invalid");
                }
                yield break;
            }

            trainingTemplates = rows;
            trainingTemplatesLoaded = true;
            StateChanged?.Invoke();
            if (publishResult)
            {
                operationInProgress = false;
            }
            Publish("training_catalog_loaded");
        }

        private IEnumerator SaveRuntimePreferencesFlow(
            V14RuntimePreferencesRequest request)
        {
            V14ServerReply reply = null;
            yield return gateway.InvokeRpc(
                $"v14:runtime-preferences-save:{InstallId()}",
                "v14_save_runtime_preferences",
                JsonUtility.ToJson(request),
                value => reply = value);
            if (reply == null || !reply.succeeded)
            {
                operationInProgress = false;
                Publish(reply?.error ?? "runtime_preferences_save_failed");
                yield break;
            }

            var rows = ParseArray<V14RuntimePreferencesEnvelope>(reply.body)?.items;
            if (rows == null || rows.Length != 1)
            {
                operationInProgress = false;
                Publish("runtime_preferences_response_invalid");
                yield break;
            }

            runtimePreferences = rows[0];
            runtimePreferencesLoaded = true;
            operationInProgress = false;
            StateChanged?.Invoke();
            Publish("runtime_preferences_saved");
        }

        private IEnumerator RefreshMonthlyApexRequestedFlow()
        {
            yield return RefreshMonthlyApexFlow(true);
            operationInProgress = false;
        }

        private IEnumerator RefreshMonthlyApexFlow(bool publishResult)
        {
            V14ServerReply reply = null;
            yield return gateway.InvokeRpc(
                $"v14:monthly-apex:{InstallId()}",
                "v14_monthly_apex_status",
                "{}",
                value => reply = value);
            if (reply == null || !reply.succeeded)
            {
                if (publishResult)
                {
                    Publish(reply?.error ?? "monthly_apex_failed");
                }
                yield break;
            }

            var rows = ParseArray<V14MonthlyApexStatusEnvelope>(reply.body)?.items;
            var row = rows != null && rows.Length > 0 ? rows[0] : null;
            monthlyVerifiedMeters = Math.Max(0L, row?.verified_m ?? 0L);
            monthlyHighestClaimedCheckpoint = Mathf.Clamp(
                row?.highest_claimed_checkpoint ?? 0,
                0,
                120);
            monthlyWorldCrown = row?.world_crown ?? false;
            monthlyApexLoaded = true;
            snapshot.lastMonthlyVerifiedMeters = monthlyVerifiedMeters;
            Save();
            if (publishResult)
            {
                Publish("monthly_apex_loaded");
            }
        }

        private IEnumerator ClaimMonthlyApexCheckpointFlow(
            int checkpoint,
            int displayThresholdMeters)
        {
            V14ServerReply reply = null;
            yield return gateway.InvokeRpc(
                $"v14:monthly-claim:{InstallId()}:{checkpoint}",
                "v13_claim_monthly_milestone",
                JsonUtility.ToJson(new V14MonthlyMilestoneRequest
                {
                    p_checkpoint = checkpoint,
                    p_threshold_m = displayThresholdMeters,
                }),
                value => reply = value);
            var claim = reply != null && reply.succeeded
                ? ParseArray<V14MonthlyMilestoneClaimEnvelope>(reply.body)?.items
                : null;
            if (claim == null || claim.Length != 1)
            {
                operationInProgress = false;
                Publish(reply?.error ?? "monthly_checkpoint_claim_failed");
                yield break;
            }

            yield return RefreshAccountSummaryFlow(false);
            yield return RefreshMonthlyApexFlow(false);
            operationInProgress = false;
            Publish(claim[0].duplicate
                ? "monthly_checkpoint_already_claimed"
                : "monthly_checkpoint_claimed");
        }

        private IEnumerator CreateCrewFlow(string crewName)
        {
            V14ServerReply reply = null;
            yield return gateway.InvokeRpc(
                $"v14:crew:create:{InstallId()}:{crewName.ToLowerInvariant()}",
                "v14_create_crew",
                JsonUtility.ToJson(new V14CrewNameRequest { p_name = crewName }),
                value => reply = value);
            if (reply == null || !reply.succeeded)
            {
                EndOperation(reply, "crew_create_failed");
                yield break;
            }
            var rows = ParseArray<V14CrewEnvelope>(reply.body)?.items ??
                Array.Empty<V14CrewRow>();
            if (rows.Length == 0)
            {
                operationInProgress = false;
                Publish("crew_response_invalid");
                yield break;
            }
            ApplyCrew(rows[0]);
            snapshot.crewMemberCount = Math.Max(1, snapshot.crewMemberCount);
            snapshot.crewLoaded = true;
            Save();
            operationInProgress = false;
            Publish("crew_created");
        }

        private IEnumerator SearchCrewsFlow(string query)
        {
            V14ServerReply reply = null;
            yield return gateway.InvokeRpc(
                $"v14:crew:search:{InstallId()}:{query.ToLowerInvariant()}",
                "v14_search_crews",
                JsonUtility.ToJson(new V14CrewSearchRequest { p_query = query }),
                value => reply = value);
            if (reply == null || !reply.succeeded)
            {
                EndOperation(reply, "crew_search_failed");
                yield break;
            }
            crewSearchResults = ParseArray<V14CrewEnvelope>(reply.body)?.items ??
                Array.Empty<V14CrewRow>();
            operationInProgress = false;
            StateChanged?.Invoke();
            Publish(crewSearchResults.Length == 0
                ? "crew_search_empty"
                : "crew_search_ready");
        }

        private IEnumerator JoinCrewFlow(string crewId)
        {
            V14ServerReply reply = null;
            yield return gateway.InvokeRpc(
                $"v14:crew:join:{InstallId()}:{crewId}",
                "v14_join_crew",
                JsonUtility.ToJson(new V14CrewIdRequest { p_crew_id = crewId }),
                value => reply = value);
            if (reply == null || !reply.succeeded)
            {
                EndOperation(reply, "crew_join_failed");
                yield break;
            }
            var rows = ParseArray<V14CrewEnvelope>(reply.body)?.items ??
                Array.Empty<V14CrewRow>();
            if (rows.Length == 0)
            {
                operationInProgress = false;
                Publish("crew_response_invalid");
                yield break;
            }
            ApplyCrew(rows[0]);
            snapshot.crewMemberCount = Math.Max(1, snapshot.crewMemberCount);
            snapshot.crewLoaded = true;
            Save();
            operationInProgress = false;
            Publish("crew_joined");
        }

        private IEnumerator LeaveCrewFlow(string crewId)
        {
            V14ServerReply reply = null;
            yield return gateway.InvokeRpc(
                $"v14:crew:leave:{InstallId()}:{crewId}",
                "v14_leave_crew",
                JsonUtility.ToJson(new V14CrewIdRequest { p_crew_id = crewId }),
                value => reply = value);
            if (reply == null || !reply.succeeded)
            {
                EndOperation(reply, "crew_leave_failed");
                yield break;
            }
            snapshot.crewId = string.Empty;
            snapshot.crewName = string.Empty;
            snapshot.crewRole = string.Empty;
            snapshot.crewMemberCount = 0;
            snapshot.crewLoaded = true;
            Save();
            operationInProgress = false;
            Publish("crew_left");
        }

        private void ApplyCrew(V14CrewRow row)
        {
            snapshot.crewId = row.crew_id ?? string.Empty;
            snapshot.crewName = row.crew_name ?? string.Empty;
            snapshot.crewRole = row.member_role ?? string.Empty;
            snapshot.crewMemberCount = Math.Max(0, row.member_count);
        }

        private IEnumerator ContinueSensorCheck(string templateId = "ONE_K")
        {
            operationInProgress = true;
            var capability = runBridge?.DirectGpsCapability ?? "bridge_unavailable";
            if (capability == "permission_required")
            {
                Publish(runBridge.StartDirectGps());
                operationInProgress = false;
                yield break;
            }
            if (capability != "ready")
            {
                Publish($"sensor_unavailable:{capability}");
                operationInProgress = false;
                yield break;
            }

            training.Move(V14TrainingState.READY);
            if (!HasConfiguredBackend)
            {
                var localStartStatus = runBridge?.StartDirectGps() ??
                    "bridge_unavailable";
                if (localStartStatus is "started" or "capturing")
                {
                    training.Move(V14TrainingState.COUNTDOWN);
                    training.Move(V14TrainingState.ACTIVE);
                    snapshot.pendingIdempotencyKey = string.Empty;
                    Save();
                    operationInProgress = false;
                    Publish("training_active");
                    yield break;
                }

                training.Move(V14TrainingState.SENSOR_CHECK);
                Save();
                operationInProgress = false;
                Publish(localStartStatus);
                yield break;
            }
            var request = new V14StartTrainingRequest
            {
                p_session_id = snapshot.trainingSessionId,
                p_template_id = templateId,
            };
            V14ServerReply reply = null;
            yield return gateway.InvokeRpc(
                snapshot.pendingIdempotencyKey,
                "v13_start_training",
                JsonUtility.ToJson(request),
                value => reply = value);
            if (reply == null || !reply.succeeded)
            {
                training.Move(V14TrainingState.SENSOR_CHECK);
                Save();
                operationInProgress = false;
                Publish(reply?.error ?? "training_start_failed");
                yield break;
            }

            training.Move(V14TrainingState.COUNTDOWN);
            Publish("countdown");
            yield return new WaitForSecondsRealtime(3f);
            reply = null;
            yield return gateway.InvokeRpc(
                $"v14:training:{snapshot.trainingSessionId}:active",
                "v13_set_training_state",
                JsonUtility.ToJson(new V14TrainingStateRequest
                {
                    p_session_id = snapshot.trainingSessionId,
                    p_expected_status = "COUNTDOWN",
                    p_next_status = "ACTIVE",
                }),
                value => reply = value);
            if (reply == null || !reply.succeeded)
            {
                operationInProgress = false;
                Publish(reply?.error ?? "training_activation_failed");
                yield break;
            }
            var nativeStatus = runBridge.StartDirectGps();
            if (nativeStatus is not "started" and not "capturing")
            {
                operationInProgress = false;
                Publish(nativeStatus);
                yield break;
            }
            training.Move(V14TrainingState.ACTIVE);
            snapshot.pendingIdempotencyKey = string.Empty;
            Save();
            operationInProgress = false;
            Publish("training_active");
        }

        private IEnumerator SetTrainingStateFlow(
            string expectedStatus,
            string nextStatus,
            V14TrainingState localNext,
            Func<string> nativeAction,
            string acceptedNativeStatus,
            string successStatus)
        {
            if (!HasConfiguredBackend)
            {
                var localNativeStatus = nativeAction();
                if (localNativeStatus != acceptedNativeStatus)
                {
                    operationInProgress = false;
                    Publish(localNativeStatus);
                    yield break;
                }

                training.Move(localNext);
                Save();
                operationInProgress = false;
                Publish(successStatus);
                yield break;
            }
            V14ServerReply reply = null;
            yield return gateway.InvokeRpc(
                $"v14:training:{snapshot.trainingSessionId}:{nextStatus.ToLowerInvariant()}",
                "v13_set_training_state",
                JsonUtility.ToJson(new V14TrainingStateRequest
                {
                    p_session_id = snapshot.trainingSessionId,
                    p_expected_status = expectedStatus,
                    p_next_status = nextStatus,
                }),
                value => reply = value);
            if (reply == null || !reply.succeeded)
            {
                operationInProgress = false;
                Publish(reply?.error ?? "training_state_sync_failed");
                yield break;
            }

            var nativeStatus = nativeAction();
            if (nativeStatus != acceptedNativeStatus)
            {
                operationInProgress = false;
                Publish(nativeStatus);
                yield break;
            }

            training.Move(localNext);
            operationInProgress = false;
            Publish(successStatus);
        }

        private IEnumerator ResumeTrainingFlow()
        {
            if (!HasConfiguredBackend)
            {
                var localNativeStatus = runBridge?.ResumeDirectGps() ??
                    "bridge_unavailable";
                if (localNativeStatus != "resuming")
                {
                    operationInProgress = false;
                    Publish(localNativeStatus);
                    yield break;
                }

                training.Move(V14TrainingState.RESUMED);
                training.Move(V14TrainingState.ACTIVE);
                Save();
                operationInProgress = false;
                Publish("training_active");
                yield break;
            }
            V14ServerReply reply = null;
            yield return gateway.InvokeRpc(
                $"v14:training:{snapshot.trainingSessionId}:active-resume",
                "v13_set_training_state",
                JsonUtility.ToJson(new V14TrainingStateRequest
                {
                    p_session_id = snapshot.trainingSessionId,
                    p_expected_status = "PAUSED",
                    p_next_status = "ACTIVE",
                }),
                value => reply = value);
            if (reply == null || !reply.succeeded)
            {
                operationInProgress = false;
                Publish(reply?.error ?? "training_resume_sync_failed");
                yield break;
            }

            var nativeStatus = runBridge?.ResumeDirectGps() ?? "bridge_unavailable";
            if (nativeStatus != "resuming")
            {
                operationInProgress = false;
                Publish(nativeStatus);
                yield break;
            }

            training.Move(V14TrainingState.RESUMED);
            training.Move(V14TrainingState.ACTIVE);
            operationInProgress = false;
            Publish("training_active");
        }

        private IEnumerator FinishTrainingFlow(string expectedStatus)
        {
            if (!HasConfiguredBackend)
            {
                training.Move(V14TrainingState.FINISH_REQUESTED);
                Save();
                var localNativeStatus = runBridge?.StopDirectGps() ??
                    "bridge_unavailable";
                operationInProgress = false;
                Publish(localNativeStatus);
                yield break;
            }
            V14ServerReply reply = null;
            yield return gateway.InvokeRpc(
                $"v14:training:{snapshot.trainingSessionId}:local-finished",
                "v13_set_training_state",
                JsonUtility.ToJson(new V14TrainingStateRequest
                {
                    p_session_id = snapshot.trainingSessionId,
                    p_expected_status = expectedStatus,
                    p_next_status = "LOCAL_FINISHED",
                }),
                value => reply = value);
            if (reply == null || !reply.succeeded)
            {
                operationInProgress = false;
                Publish(reply?.error ?? "training_finish_sync_failed");
                yield break;
            }

            training.Move(V14TrainingState.FINISH_REQUESTED);
            var nativeStatus = runBridge?.StopDirectGps() ?? "bridge_unavailable";
            operationInProgress = false;
            Publish(nativeStatus);
        }

        private IEnumerator PurchaseFlow(string itemId)
        {
            if (store.Current == V14StoreState.PERSISTED)
            {
                store.Move(V14StoreState.BROWSE);
            }
            if (store.Current != V14StoreState.BROWSE)
            {
                operationInProgress = false;
                Publish($"store_conflict:{store.Current}");
                yield break;
            }

            store.Move(V14StoreState.ITEM_DETAIL);
            store.Move(V14StoreState.PRICE_CHECK);
            store.Move(V14StoreState.PURCHASE_PENDING);
            var request = new V14PurchaseRequest
            {
                p_item_id = itemId,
                p_idempotency_key = $"v14:purchase:{InstallId()}:{itemId}",
            };
            V14ServerReply reply = null;
            yield return gateway.InvokeRpc(
                request.p_idempotency_key,
                "v13_purchase_cosmetic",
                JsonUtility.ToJson(request),
                value => reply = value);
            if (reply == null || !reply.succeeded)
            {
                store.Move(V14StoreState.ITEM_DETAIL);
                EndOperation(reply, "purchase_failed");
                yield break;
            }

            store.Move(V14StoreState.SERVER_PURCHASED);
            store.Move(V14StoreState.INVENTORY_ADDED);
            yield return RefreshAccountSummaryFlow(false);
            yield return RefreshCosmeticInventoryFlow(false);
            operationInProgress = false;
            Publish("inventory_added");
        }

        private IEnumerator EquipFlow(string itemId)
        {
            if (store.Current is not V14StoreState.BROWSE and
                not V14StoreState.INVENTORY_ADDED and
                not V14StoreState.PERSISTED)
            {
                operationInProgress = false;
                Publish($"equip_conflict:{store.Current}");
                yield break;
            }

            V14ServerReply reply = null;
            yield return gateway.InvokeRpc(
                $"v14:equip:{InstallId()}:{itemId}",
                "v13_equip_cosmetic",
                JsonUtility.ToJson(new V14EquipRequest { p_item_id = itemId }),
                value => reply = value);
            if (reply == null || !reply.succeeded)
            {
                EndOperation(reply, "equip_failed");
                yield break;
            }

            store.Restore(V14StoreState.INVENTORY_ADDED);
            store.Move(V14StoreState.EQUIPPED);
            store.Move(V14StoreState.APPEARANCE_UPDATED);
            store.Move(V14StoreState.PERSISTED);
            yield return RefreshCosmeticInventoryFlow(false);
            EndOperation(reply, $"appearance_persisted:{itemId}");
        }

        private IEnumerator UnequipFlow(string category)
        {
            V14ServerReply reply = null;
            yield return gateway.InvokeRpc(
                $"v14:unequip:{InstallId()}:{category}",
                "v14_unequip_cosmetic",
                JsonUtility.ToJson(new V14UnequipRequest { p_category = category }),
                value => reply = value);
            if (reply == null || !reply.succeeded)
            {
                EndOperation(reply, "unequip_failed");
                yield break;
            }

            store.Restore(V14StoreState.BROWSE);
            yield return RefreshCosmeticInventoryFlow(false);
            EndOperation(reply, $"appearance_unequipped:{category}");
        }

        private IEnumerator SaveWardrobePresetFlow(short slot, string runtimeName)
        {
            V14ServerReply reply = null;
            yield return gateway.InvokeRpc(
                $"v14:wardrobe-preset:{InstallId()}:{slot}",
                "v14_save_wardrobe_preset",
                JsonUtility.ToJson(new V14WardrobePresetRequest
                {
                    p_slot = slot,
                    p_runtime_name_en = runtimeName,
                }),
                value => reply = value);
            if (reply == null || !reply.succeeded)
            {
                EndOperation(reply, "wardrobe_preset_save_failed");
                yield break;
            }

            yield return RefreshCosmeticInventoryFlow(false);
            EndOperation(reply, "wardrobe_preset_saved");
        }

        private IEnumerator QueueRaceFlow()
        {
            if (race.Current == V14RaceState.REWARDED)
            {
                race.Move(V14RaceState.BROWSE);
            }
            if (race.Current != V14RaceState.BROWSE)
            {
                operationInProgress = false;
                Publish($"race_conflict:{race.Current}");
                yield break;
            }

            race.Move(V14RaceState.MATCHMAKING);
            snapshot.raceDistanceMeters = queuedRaceDistanceMeters;
            snapshot.lastRacePlace = 0;
            snapshot.lastRaceElapsedMilliseconds = 0;
            V14ServerReply reply = null;
            yield return gateway.InvokeRpc(
                $"v14:race-queue:{InstallId()}:" +
                $"{queuedRaceDistanceMeters}:RANKED:{queuedRaceRegion}",
                "v13_enqueue_race",
                JsonUtility.ToJson(new V14RaceQueueRequest
                {
                    p_distance_m = queuedRaceDistanceMeters,
                    p_mode = "RANKED",
                    p_region = queuedRaceRegion,
                    p_verified_pace_ms_per_km = null,
                }),
                value => reply = value);
            if (reply == null || !reply.succeeded)
            {
                race.Move(V14RaceState.BROWSE);
                EndOperation(reply, "matchmaking_failed");
                yield break;
            }
            var entry = JsonUtility.FromJson<V14MatchmakingEntry>(reply.body);
            if (entry == null || string.IsNullOrWhiteSpace(entry.id))
            {
                race.Move(V14RaceState.BROWSE);
                operationInProgress = false;
                Publish("matchmaking_response_invalid");
                yield break;
            }
            snapshot.raceEntryId = entry.id;
            Save();
            operationInProgress = false;
            Publish("matchmaking");
            if (racePolling != null)
            {
                StopCoroutine(racePolling);
            }
            racePolling = StartCoroutine(PollRaceContextFlow());
        }

        private IEnumerator PollRaceContextFlow()
        {
            while (race.Current is V14RaceState.MATCHMAKING or
                   V14RaceState.MATCH_FOUND or V14RaceState.LOBBY or
                   V14RaceState.READY)
            {
                if (race.Current == V14RaceState.MATCHMAKING)
                {
                    V14ServerReply tick = null;
                    yield return gateway.InvokeRpc(
                        $"v14:matchmaker:{queuedRaceDistanceMeters}:{queuedRaceRegion}",
                        "v13_matchmaker_tick",
                        JsonUtility.ToJson(new V14MatchmakerTickRequest
                        {
                            p_distance_m = queuedRaceDistanceMeters,
                            p_mode = "RANKED",
                            p_region = queuedRaceRegion,
                        }),
                        value => tick = value);

                    V14ServerReply entryReply = null;
                    yield return gateway.InvokeGet(
                        $"v14:race-entry:{snapshot.raceEntryId}",
                        "matchmaking_entries?select=id,state,match_id" +
                        $"&id=eq.{snapshot.raceEntryId}",
                        value => entryReply = value);
                    var entries = entryReply != null && entryReply.succeeded
                        ? ParseArray<V14MatchmakingEnvelope>(
                            entryReply.body)?.items
                        : null;
                    if (entries != null &&
                        entries.Length == 1 &&
                        entries[0].state == "MATCHED" &&
                        !string.IsNullOrWhiteSpace(entries[0].match_id))
                    {
                        snapshot.raceMatchId = entries[0].match_id;
                        race.Move(V14RaceState.MATCH_FOUND);
                        race.Move(V14RaceState.LOBBY);
                        Save();
                        Publish("race_lobby_ready");
                    }
                    else
                    {
                        Publish("waiting_for_8_real_runners");
                    }
                }

                if (race.Current is V14RaceState.MATCH_FOUND or
                    V14RaceState.LOBBY)
                {
                    V14ServerReply participantsReply = null;
                    yield return gateway.InvokeGet(
                        $"v14:race-lobby:{snapshot.raceMatchId}",
                        "race_participants?select=slot,ready,state" +
                        $"&match_id=eq.{snapshot.raceMatchId}&order=slot.asc",
                        value => participantsReply = value);
                    if (participantsReply != null &&
                        participantsReply.succeeded)
                    {
                        raceParticipants =
                            ParseArray<V14RaceParticipantEnvelope>(
                                participantsReply.body)?.items ??
                            Array.Empty<V14RaceParticipantRow>();
                        StateChanged?.Invoke();
                    }
                }
                if (race.Current == V14RaceState.READY)
                {
                    yield return RefreshScheduledRaceStartFlow();
                }
                yield return new WaitForSecondsRealtime(1.5f);
            }
            racePolling = null;
        }

        private IEnumerator RaceReadyFlow()
        {
            V14ServerReply reply = null;
            yield return gateway.InvokeRpc(
                $"v14:race-ready:{snapshot.raceMatchId}",
                "v14_race_ready",
                JsonUtility.ToJson(new V14RaceReadyRequest
                {
                    p_match_id = snapshot.raceMatchId,
                }),
                value => reply = value);
            if (reply == null || !reply.succeeded)
            {
                operationInProgress = false;
                Publish(reply?.error ?? "race_ready_failed");
                yield break;
            }
            var response = JsonUtility.FromJson<V14RaceReadyResponse>(
                reply.body);
            if (response == null)
            {
                operationInProgress = false;
                Publish("race_ready_response_invalid");
                yield break;
            }
            race.Move(V14RaceState.READY);
            Save();
            operationInProgress = false;
            if (response.all_ready)
            {
                foreach (var participant in raceParticipants)
                {
                    participant.ready = true;
                    participant.state = "READY";
                }
                StartServerCountdown(
                    response.scheduled_start_at,
                    response.server_now);
            }
            else
            {
                Publish(
                    $"waiting_for_ready:" +
                    $"{response.ready_count}/{response.participant_count}");
                if (racePolling == null)
                {
                    racePolling = StartCoroutine(PollRaceContextFlow());
                }
            }
        }

        private IEnumerator CancelRaceQueueFlow()
        {
            V14ServerReply reply = null;
            yield return gateway.InvokeRpc(
                $"v14:race-cancel:{snapshot.raceEntryId}",
                "v13_cancel_race_queue",
                JsonUtility.ToJson(new V14CancelRaceRequest
                {
                    p_entry_id = snapshot.raceEntryId,
                }),
                value => reply = value);
            operationInProgress = false;
            if (reply == null || !reply.succeeded)
            {
                Publish(reply?.error ?? "race_cancel_failed");
                yield break;
            }
            race.Move(V14RaceState.BROWSE);
            snapshot.raceEntryId = string.Empty;
            snapshot.raceMatchId = string.Empty;
            raceParticipants = Array.Empty<V14RaceParticipantRow>();
            Save();
            Publish("race_queue_cancelled");
        }

        private IEnumerator RefreshScheduledRaceStartFlow()
        {
            if (string.IsNullOrWhiteSpace(snapshot.raceMatchId))
            {
                yield break;
            }
            V14ServerReply reply = null;
            yield return gateway.InvokeGet(
                $"v14:race-start:{snapshot.raceMatchId}",
                "race_matches?select=state,scheduled_start_at,distance_m" +
                $"&id=eq.{snapshot.raceMatchId}",
                value => reply = value);
            var rows = reply != null && reply.succeeded
                ? ParseArray<V14RaceMatchEnvelope>(reply.body)?.items
                : null;
            if (rows == null || rows.Length != 1)
            {
                Publish(reply?.error ?? "race_start_refresh_failed");
                yield break;
            }
            snapshot.raceDistanceMeters = rows[0].distance_m;
            if (rows[0].state == "COUNTDOWN")
            {
                StartServerCountdown(
                    rows[0].scheduled_start_at,
                    reply.serverDate);
            }
        }

        private void StartServerCountdown(
            string scheduledText,
            string serverNowText)
        {
            if (!DateTimeOffset.TryParse(
                    scheduledText,
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.AssumeUniversal,
                    out var scheduledStart))
            {
                Publish("race_start_time_invalid");
                return;
            }
            var serverNow = DateTimeOffset.UtcNow;
            if (DateTimeOffset.TryParse(
                    serverNowText,
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.AssumeUniversal,
                    out var parsedServerNow))
            {
                serverNow = parsedServerNow;
            }
            snapshot.raceScheduledStartAtUnixMilliseconds =
                scheduledStart.ToUnixTimeMilliseconds();
            if (race.Current == V14RaceState.READY)
            {
                race.Move(V14RaceState.SERVER_COUNTDOWN);
            }
            else if (race.Current != V14RaceState.SERVER_COUNTDOWN)
            {
                race.Restore(V14RaceState.SERVER_COUNTDOWN);
            }
            Save();
            StartCoroutine(RaceCountdownFlow(
                scheduledStart,
                serverNow - DateTimeOffset.UtcNow));
        }

        private IEnumerator RaceCountdownFlow(
            DateTimeOffset scheduledStart,
            TimeSpan serverOffset)
        {
            while (race.Current == V14RaceState.SERVER_COUNTDOWN)
            {
                RaceCountdownSeconds = Math.Max(
                    0,
                    (int)Math.Ceiling(
                        (scheduledStart -
                         (DateTimeOffset.UtcNow + serverOffset)).TotalSeconds));
                StateChanged?.Invoke();
                Publish($"race_countdown:{RaceCountdownSeconds}");
                if (RaceCountdownSeconds <= 0)
                {
                    var nativeStatus =
                        runBridge?.StartDirectGps() ?? "bridge_unavailable";
                    if (nativeStatus is not "started" and not "capturing")
                    {
                        race.Move(V14RaceState.CONNECTION_LOST);
                        Save();
                        Publish(nativeStatus);
                        yield break;
                    }
                    race.Move(V14RaceState.ACTIVE);
                    raceSamples.Clear();
                    raceDistanceMeters = 0;
                    raceStartedRealtime = Time.realtimeSinceStartupAsDouble;
                    nextRaceSnapshotAt = Time.realtimeSinceStartup;
                    RaceNetworkState = "CONNECTED";
                    Save();
                    StartRaceStandingsPolling();
                    Publish("race_active");
                    yield break;
                }
                yield return new WaitForSecondsRealtime(1f);
            }
        }

        private void ResumeActiveRace()
        {
            if (race.Current != V14RaceState.ACTIVE)
            {
                race.Restore(V14RaceState.ACTIVE);
            }
            if (runBridge?.DirectGpsState != "capturing")
            {
                var status = runBridge?.StartDirectGps() ?? "bridge_unavailable";
                if (status is not "started" and not "capturing")
                {
                    race.Restore(V14RaceState.CONNECTION_LOST);
                    Save();
                    Publish(status);
                    return;
                }
            }
            raceStartedRealtime = Time.realtimeSinceStartupAsDouble;
            RaceNetworkState = "RECONNECTED";
            StartRaceStandingsPolling();
            Save();
        }

        private void OnRaceGpsSample(GpsSample sample, int count)
        {
            if (race.Current != V14RaceState.ACTIVE || sample == null)
            {
                return;
            }
            if (raceSamples.Count > 0)
            {
                var previous = raceSamples[^1];
                var elapsedMilliseconds =
                    sample.unixTimeMilliseconds - previous.unixTimeMilliseconds;
                if (elapsedMilliseconds > 0)
                {
                    var segmentMeters = Haversine(previous, sample);
                    var speed =
                        segmentMeters / (elapsedMilliseconds / 1000.0);
                    if (speed >= 0.5 && speed <= 9.5)
                    {
                        raceDistanceMeters += segmentMeters;
                    }
                }
            }
            raceSamples.Add(sample);
            StateChanged?.Invoke();
            if (!raceSnapshotInFlight &&
                Time.realtimeSinceStartup >= nextRaceSnapshotAt)
            {
                nextRaceSnapshotAt = Time.realtimeSinceStartup + 2f;
                StartCoroutine(SubmitRaceSnapshotFlow(sample));
            }
            if (!raceFinishing &&
                RaceFilteredDistanceMeters >= RaceDistanceMeters)
            {
                BeginRaceFinish();
            }
        }

        private IEnumerator SubmitRaceSnapshotFlow(GpsSample sample)
        {
            raceSnapshotInFlight = true;
            var request = new V14RaceSnapshotRequest
            {
                p_match_id = snapshot.raceMatchId,
                p_sequence = raceSamples.Count,
                p_elapsed_ms = RaceElapsedMilliseconds,
                p_filtered_distance_m = RaceFilteredDistanceMeters,
                p_rolling_pace_ms_per_km =
                    RaceRollingPaceMillisecondsPerKilometer,
                p_accuracy_bucket = sample.accuracyMeters <= 10
                    ? "GOOD"
                    : sample.accuracyMeters <= 25 ? "FAIR" : "POOR",
                p_participant_state = "ACTIVE",
            };
            V14ServerReply reply = null;
            yield return gateway.InvokeRpc(
                $"v14:race-snapshot:{snapshot.raceMatchId}:" +
                $"{request.p_sequence}",
                "v13_submit_race_snapshot",
                JsonUtility.ToJson(request),
                value => reply = value);
            raceSnapshotInFlight = false;
            if (reply != null && reply.succeeded)
            {
                consecutiveRaceNetworkFailures = 0;
                RaceNetworkState = "CONNECTED";
                StateChanged?.Invoke();
                yield break;
            }
            consecutiveRaceNetworkFailures++;
            RaceNetworkState = reply?.retryable == true
                ? "RECONNECTING"
                : "SERVER REJECTED";
            StateChanged?.Invoke();
            if (consecutiveRaceNetworkFailures >= 2 &&
                race.Current == V14RaceState.ACTIVE)
            {
                race.Move(V14RaceState.CONNECTION_LOST);
                race.Move(V14RaceState.RECONNECTING);
                Save();
                Publish("race_reconnecting");
                StartRaceReconnectPolling();
            }
        }

        private void StartRaceReconnectPolling()
        {
            if (raceReconnectPolling != null)
            {
                StopCoroutine(raceReconnectPolling);
            }
            raceReconnectPolling = StartCoroutine(ReconnectRaceFlow());
        }

        private void StartRaceStandingsPolling()
        {
            if (raceStandingsPolling == null)
            {
                raceStandingsPolling = StartCoroutine(PollRaceStandingsFlow());
            }
        }

        private IEnumerator PollRaceStandingsFlow()
        {
            while (race.Current is V14RaceState.ACTIVE or
                   V14RaceState.CONNECTION_LOST or
                   V14RaceState.RECONNECTING)
            {
                V14ServerReply reply = null;
                yield return gateway.InvokeRpc(
                    $"v14:race-standings:{snapshot.raceMatchId}:" +
                    $"{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}",
                    "v13_race_standings",
                    JsonUtility.ToJson(new V14RaceReadyRequest
                    {
                        p_match_id = snapshot.raceMatchId,
                    }),
                    value => reply = value);
                if (reply != null && reply.succeeded)
                {
                    ApplyStandings(reply.body);
                }
                yield return new WaitForSecondsRealtime(1.5f);
            }
            raceStandingsPolling = null;
        }

        private void ApplyStandings(string json)
        {
            var rows = ParseArray<V14RaceStandingEnvelope>(json)?.items ??
                Array.Empty<V14RaceStandingRow>();
            raceStandings = rows;
            var userId = gateway.AuthenticatedUserId;
            foreach (var row in rows)
            {
                if (row.user_id == userId)
                {
                    RaceProvisionalPlace = row.provisional_place;
                    break;
                }
            }
            RaceNetworkState = "CONNECTED";
            StateChanged?.Invoke();
        }

        private IEnumerator ReconnectRaceFlow()
        {
            while (race.Current == V14RaceState.RECONNECTING)
            {
                V14ServerReply reply = null;
                yield return gateway.InvokeRpc(
                    $"v14:race-reconnect:{snapshot.raceMatchId}:" +
                    $"{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}",
                    "v13_race_standings",
                    JsonUtility.ToJson(new V14RaceReadyRequest
                    {
                        p_match_id = snapshot.raceMatchId,
                    }),
                    value => reply = value);
                if (reply != null && reply.succeeded)
                {
                    ApplyStandings(reply.body);
                    consecutiveRaceNetworkFailures = 0;
                    race.Move(V14RaceState.ACTIVE);
                    Save();
                    Publish("race_reconnected");
                    raceReconnectPolling = null;
                    yield break;
                }
                yield return new WaitForSecondsRealtime(2f);
            }
            raceReconnectPolling = null;
        }

        private void BeginRaceFinish()
        {
            if (raceFinishing || race.Current != V14RaceState.ACTIVE)
            {
                return;
            }
            raceFinishing = true;
            race.Move(V14RaceState.FINISH_PENDING);
            Save();
            StartCoroutine(RecoverFinishedRaceCaptureFlow(true));
        }

        private IEnumerator RecoverFinishedRaceCaptureFlow(bool requestStop)
        {
            if (requestStop)
            {
                Publish(runBridge?.StopDirectGps() ?? "bridge_unavailable");
            }
            var deadline = Time.realtimeSinceStartup + 8f;
            while (race.Current == V14RaceState.FINISH_PENDING &&
                   runBridge?.DirectGpsState is "capturing" or "paused" &&
                   Time.realtimeSinceStartup < deadline)
            {
                yield return new WaitForSecondsRealtime(0.25f);
            }
            if (race.Current == V14RaceState.FINISH_PENDING)
            {
                Publish(runBridge?.RecoverCompletedDirectGps() ??
                    "bridge_unavailable");
            }
        }

        private IEnumerator FinalizeRaceRunFlow(string runId)
        {
            V14ServerReply reply = null;
            yield return gateway.InvokeRpc(
                $"v14:race-run-finalize:{snapshot.raceMatchId}",
                "v13_finalize_race_run",
                JsonUtility.ToJson(new V14FinalizeRaceRunRequest
                {
                    p_match_id = snapshot.raceMatchId,
                    p_run_id = runId,
                }),
                value => reply = value);
            if (reply == null || !reply.succeeded)
            {
                Publish(reply?.error ?? "race_run_finalize_failed");
                yield break;
            }

            while (race.Current == V14RaceState.VERIFYING)
            {
                reply = null;
                yield return gateway.InvokeRpc(
                    $"v14:race-match-finalize:{snapshot.raceMatchId}:" +
                    $"{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}",
                    "v14_try_finalize_race_match",
                    JsonUtility.ToJson(new V14FinalizeRaceMatchRequest
                    {
                        p_match_id = snapshot.raceMatchId,
                    }),
                    value => reply = value);
                if (reply != null &&
                    reply.succeeded &&
                    int.TryParse(reply.body, out var finalizedCount) &&
                    finalizedCount == 8)
                {
                    yield return LoadRaceResultFlow();
                    yield break;
                }
                Publish("waiting_for_8_verified_finishes");
                yield return new WaitForSecondsRealtime(2f);
            }
        }

        private IEnumerator LoadRaceResultFlow()
        {
            V14ServerReply reply = null;
            yield return gateway.InvokeGet(
                $"v14:race-result:{snapshot.raceMatchId}",
                "race_results?select=final_place,verified_elapsed_ms," +
                "rating_before,rating_delta,rating_after,reward" +
                $"&match_id=eq.{snapshot.raceMatchId}" +
                $"&user_id=eq.{gateway.AuthenticatedUserId}",
                value => reply = value);
            var rows = reply != null && reply.succeeded
                ? ParseArray<V14RaceResultEnvelope>(reply.body)?.items
                : null;
            if (rows == null || rows.Length != 1)
            {
                Publish(reply?.error ?? "race_result_load_failed");
                yield break;
            }
            var result = rows[0];
            snapshot.lastRacePlace = result.final_place;
            snapshot.lastRaceElapsedMilliseconds =
                result.verified_elapsed_ms;
            snapshot.lastRaceRatingBefore = result.rating_before;
            snapshot.lastRaceRatingDelta = result.rating_delta;
            snapshot.lastRaceRatingAfter = result.rating_after;
            snapshot.lastRaceXp = result.reward?.xp ?? 0;
            snapshot.lastRaceRunCoins = result.reward?.run_coins ?? 0;
            race.Move(V14RaceState.FINALIZED);
            race.Move(V14RaceState.REWARDED);
            raceFinishing = false;
            Save();
            yield return RefreshAccountSummaryFlow(false);
            Publish("race_rewarded");
        }

        private static double Haversine(GpsSample left, GpsSample right)
        {
            const double earthRadiusMeters = 6371000.0;
            var leftLatitude = left.latitude * Math.PI / 180.0;
            var rightLatitude = right.latitude * Math.PI / 180.0;
            var latitudeDelta = rightLatitude - leftLatitude;
            var longitudeDelta =
                (right.longitude - left.longitude) * Math.PI / 180.0;
            var a =
                Math.Sin(latitudeDelta / 2.0) *
                Math.Sin(latitudeDelta / 2.0) +
                Math.Cos(leftLatitude) *
                Math.Cos(rightLatitude) *
                Math.Sin(longitudeDelta / 2.0) *
                Math.Sin(longitudeDelta / 2.0);
            return earthRadiusMeters * 2.0 *
                Math.Atan2(Math.Sqrt(a), Math.Sqrt(1.0 - a));
        }

        private IEnumerator SelectRouteFlow(string routeId)
        {
            V14ServerReply reply = null;
            yield return gateway.InvokeRpc(
                $"v14:route:{InstallId()}:{routeId}",
                "v13_select_route",
                JsonUtility.ToJson(new V14RouteRequest { p_route_id = routeId }),
                value => reply = value);
            if (reply != null && reply.succeeded)
            {
                snapshot.activeRouteId = routeId;
                snapshot.activeRouteProgressMeters = 0;
                snapshot.activeRouteTargetMeters = 10000;
                snapshot.activeRouteLoaded = true;
                yield return RefreshActiveRouteSummaryFlow();
                Save();
            }
            EndOperation(reply, "route_selected");
        }

        private void OnRunBridgeStatus(string status)
        {
            if (status.StartsWith(
                    "health_runs_found:",
                    StringComparison.Ordinal))
            {
                if (sync.Current == V14SyncState.DISCOVERING)
                {
                    sync.Move(V14SyncState.NEW_RUN_FOUND);
                    sync.Move(V14SyncState.PREVIEW);
                    Save();
                }
            }
            else if (status == "health_runs_empty" &&
                     sync.Current == V14SyncState.DISCOVERING)
            {
                sync.Restore(V14SyncState.CONNECTION_CHECK);
                Save();
            }
            Publish(status);
        }

        private void OnLocalRunAccepted(VerifiedRunReceipt receipt)
        {
            LastAcceptedRun = receipt.run;
            if (training.Current == V14TrainingState.FINISH_REQUESTED)
            {
                training.Move(V14TrainingState.VERIFYING);
                if (!HasConfiguredBackend)
                {
                    training.Move(V14TrainingState.RESULT);
                    Save();
                    Publish("training_local_saved");
                    return;
                }
            }
            if (race.Current == V14RaceState.FINISH_PENDING)
            {
                race.Move(V14RaceState.VERIFYING);
                Save();
            }
            if (sync.Current == V14SyncState.VERIFYING && receipt.duplicate)
            {
                sync.Move(V14SyncState.RESULT);
                Save();
            }
            Publish(receipt.duplicate
                ? "duplicate_run_no_reward"
                : "canonical_run_upload_pending");
        }

        private void OnServerRunAccepted(
            RunCandidate candidate,
            SupabaseIngestResponse response)
        {
            LastAcceptedRun = candidate;
            LastServerResponse = response;
            snapshot.lastVerifiedRunId = response.run_id;
            snapshot.lastVerifiedDistanceMeters = candidate.distanceMeters;
            snapshot.lastVerifiedMovingSeconds = candidate.movingSeconds;
            snapshot.lastRunnerGrowthPoints = response.runner_growth_points;
            snapshot.lastPacerBondPoints = response.pacer_bond_points;
            snapshot.lastRestorationPoints = response.restoration_points;
            snapshot.lastMonthlyVerifiedMeters = response.monthly_verified_m;
            snapshot.lastDailyContractCompleted =
                response.daily_contract_completed;
            snapshot.lastWorldCrown = response.world_crown;
            snapshot.pendingCanonicalRunId = response.run_id;
            Save();
            if (training.Current == V14TrainingState.VERIFYING &&
                !string.IsNullOrWhiteSpace(snapshot.trainingSessionId))
            {
                training.Move(V14TrainingState.RESULT);
                StartCoroutine(FinalizeTrainingFlow(response.run_id));
            }
            if (sync.Current == V14SyncState.VERIFYING)
            {
                sync.Move(V14SyncState.SERVER_ACCEPTED);
                sync.Move(V14SyncState.GAME_PROGRESS_APPLIED);
                sync.Move(V14SyncState.RESULT);
            }
            if (race.Current == V14RaceState.VERIFYING &&
                !string.IsNullOrWhiteSpace(snapshot.raceMatchId))
            {
                StartCoroutine(FinalizeRaceRunFlow(response.run_id));
            }
        }

        private IEnumerator FinalizeTrainingFlow(string runId)
        {
            V14ServerReply reply = null;
            yield return gateway.InvokeRpc(
                $"v14:training:{snapshot.trainingSessionId}:finalize",
                "v13_finalize_training",
                JsonUtility.ToJson(new V14FinalizeTrainingRequest
                {
                    p_session_id = snapshot.trainingSessionId,
                    p_run_id = runId,
                }),
                value => reply = value);
            if (reply == null || !reply.succeeded)
            {
                Publish(reply?.error ?? "training_finalize_failed");
                yield break;
            }

            training.Move(V14TrainingState.SERVER_SYNCED);
            training.Move(V14TrainingState.REWARDED);
            snapshot.pendingCanonicalRunId = string.Empty;
            Save();
            yield return RefreshAccountSummaryFlow(false);
            Publish("training_rewarded");
        }

        private V14CosmeticCatalogRow FindCosmetic(string itemId)
        {
            if (string.IsNullOrWhiteSpace(itemId))
            {
                return null;
            }
            foreach (var item in cosmeticCatalog)
            {
                if (string.Equals(item.item_id, itemId,
                    StringComparison.Ordinal))
                {
                    return item;
                }
            }
            return null;
        }

        private V14TrainingTemplateRow FindTrainingTemplate(string templateId)
        {
            if (string.IsNullOrWhiteSpace(templateId))
            {
                return null;
            }
            foreach (var template in trainingTemplates)
            {
                if (string.Equals(template.id, templateId,
                    StringComparison.Ordinal))
                {
                    return template;
                }
            }
            return null;
        }

        private bool BeginOperation(string conflict)
        {
            if (operationInProgress)
            {
                Publish(conflict);
                return false;
            }
            operationInProgress = true;
            return true;
        }

        private void EndOperation(V14ServerReply reply, string successStatus)
        {
            operationInProgress = false;
            Publish(reply != null && reply.succeeded
                ? successStatus
                : reply?.error ?? "server_request_failed");
        }

        private void Save()
        {
            snapshot.training = training.Current.ToString();
            snapshot.race = race.Current.ToString();
            snapshot.sync = sync.Current.ToString();
            snapshot.store = store.Current.ToString();
            snapshot.Touch(DateTimeOffset.UtcNow);
            journal.Save(snapshot);
            StateChanged?.Invoke();
        }

        private void Publish(string status)
        {
            Status = status ?? string.Empty;
            StatusChanged?.Invoke(Status);
        }

        private static T Parse<T>(string value, T fallback)
            where T : struct, Enum =>
            Enum.TryParse<T>(value, true, out var parsed) ? parsed : fallback;

        private static T ParseArray<T>(string json)
            where T : class =>
            string.IsNullOrWhiteSpace(json)
                ? null
                : JsonUtility.FromJson<T>($"{{\"items\":{json}}}");

        private static string InstallHandle() =>
            $"RUNNER_{InstallId().Substring(0, 8).ToUpperInvariant()}";

        private static string InstallId()
        {
            var value = PlayerPrefs.GetString(InstallIdKey, string.Empty);
            if (!Guid.TryParse(value, out _))
            {
                value = Guid.NewGuid().ToString("N");
                PlayerPrefs.SetString(InstallIdKey, value);
                PlayerPrefs.Save();
            }

            return value.Replace("-", string.Empty);
        }
    }
}
