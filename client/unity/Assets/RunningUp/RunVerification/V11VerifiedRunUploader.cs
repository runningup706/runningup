// 오프라인 검증 러닝을 인증된 Supabase RPC로 순서대로 전송하고 성공 뒤에만 영구 성장시킨다.
using System;
using System.Collections;
using System.Globalization;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace RunningUp.RunVerification
{
    [Serializable]
    internal sealed class SupabaseRunEvidence
    {
        public int accepted_sample_count;
        public float accuracy_p95_m;
    }

    [Serializable]
    internal sealed class SupabaseVerifiedRunRequest
    {
        public string p_source;
        public string p_source_record_id;
        public string p_route_id;
        public string p_started_at;
        public string p_ended_at;
        public int p_distance_m;
        public int p_moving_seconds;
        public string p_fingerprint;
        public SupabaseRunEvidence p_evidence;
    }

    [Serializable]
    public sealed class SupabaseIngestResponse
    {
        public string run_id;
        public bool duplicate;
        public bool daily_contract_completed;
        public long runner_growth_points;
        public long pacer_bond_points;
        public long restoration_points;
        public long monthly_verified_m;
        public bool world_crown;
    }

    [Serializable]
    internal sealed class SupabaseIngestEnvelope
    {
        public SupabaseIngestResponse[] items;
    }

    public enum SupabaseUploadDisposition
    {
        Accepted,
        RefreshSession,
        Retry,
        InterventionRequired,
    }

    public static class V11SupabaseUploadContract
    {
        public static string BuildJson(RunCandidate candidate)
        {
            if (candidate == null || string.IsNullOrWhiteSpace(candidate.fingerprint))
            {
                throw new ArgumentNullException(nameof(candidate));
            }

            return JsonUtility.ToJson(new SupabaseVerifiedRunRequest
            {
                p_source = SourceName(candidate.source),
                p_source_record_id = candidate.sourceRecordId,
                p_route_id = candidate.routeId,
                p_started_at = Timestamp(candidate.startedAtUnixMilliseconds),
                p_ended_at = Timestamp(candidate.endedAtUnixMilliseconds),
                p_distance_m = candidate.distanceMeters,
                p_moving_seconds = candidate.movingSeconds,
                p_fingerprint = candidate.fingerprint,
                p_evidence = new SupabaseRunEvidence
                {
                    accepted_sample_count = candidate.acceptedSampleCount,
                    accuracy_p95_m = candidate.accuracyP95Meters,
                },
            });
        }

        public static SupabaseUploadDisposition Classify(
            UnityWebRequest.Result transportResult,
            long responseCode)
        {
            if (transportResult == UnityWebRequest.Result.Success &&
                responseCode >= 200 &&
                responseCode < 300)
            {
                return SupabaseUploadDisposition.Accepted;
            }

            if (responseCode == 401)
            {
                return SupabaseUploadDisposition.RefreshSession;
            }

            if (transportResult == UnityWebRequest.Result.ConnectionError ||
                responseCode == 408 ||
                responseCode == 425 ||
                responseCode == 429 ||
                responseCode >= 500)
            {
                return SupabaseUploadDisposition.Retry;
            }

            return SupabaseUploadDisposition.InterventionRequired;
        }

        public static bool TryParseResponse(
            string json,
            out SupabaseIngestResponse response)
        {
            response = null;
            if (string.IsNullOrWhiteSpace(json))
            {
                return false;
            }

            var trimmed = json.Trim();
            var envelopeJson = trimmed.StartsWith("[", StringComparison.Ordinal)
                ? $"{{\"items\":{trimmed}}}"
                : $"{{\"items\":[{trimmed}]}}";
            var envelope = JsonUtility.FromJson<SupabaseIngestEnvelope>(envelopeJson);
            if (envelope?.items == null || envelope.items.Length != 1)
            {
                return false;
            }

            response = envelope.items[0];
            return response != null && !string.IsNullOrWhiteSpace(response.run_id);
        }

        private static string SourceName(RunSource source) =>
            source switch
            {
                RunSource.DirectGps => "direct_gps",
                RunSource.HealthConnect => "health_connect",
                RunSource.Fit => "fit",
                RunSource.Gpx => "gpx",
                RunSource.Tcx => "tcx",
                _ => throw new ArgumentOutOfRangeException(nameof(source)),
            };

        private static string Timestamp(long unixMilliseconds) =>
            DateTimeOffset.FromUnixTimeMilliseconds(unixMilliseconds)
                .UtcDateTime
                .ToString("O", CultureInfo.InvariantCulture);
    }

    [DisallowMultipleComponent]
    public sealed class V11VerifiedRunUploader : MonoBehaviour
    {
        [SerializeField] private V11SupabaseRuntimeConfig config;
        [SerializeField] private V11SupabaseSessionRuntime session;
        [SerializeField] private V11RunRuntime runtime;
        [SerializeField] private float syncIntervalSeconds = 10f;

        private bool syncing;
        private float nextSyncAt;

        public event Action<string> StatusChanged;
        public event Action<RunCandidate, SupabaseIngestResponse> ServerRunAccepted;
        public string CurrentStatus { get; private set; } = "initializing";

        private void Awake()
        {
            config ??= GetComponent<V11SupabaseRuntimeConfig>();
            session ??= GetComponent<V11SupabaseSessionRuntime>();
            runtime ??= GetComponent<V11RunRuntime>();
            nextSyncAt = Time.unscaledTime + 1f;
            Publish(config != null && config.IsConfigured
                ? "authentication_required"
                : "backend_project_required");
        }

        private void Update()
        {
            if (!syncing && Time.unscaledTime >= nextSyncAt)
            {
                SyncNow();
            }
        }

        private void OnApplicationFocus(bool hasFocus)
        {
            if (hasFocus)
            {
                nextSyncAt = Time.unscaledTime;
            }
        }

        public void SyncNow()
        {
            nextSyncAt = Time.unscaledTime + Mathf.Max(3f, syncIntervalSeconds);
            if (syncing)
            {
                return;
            }

            if (config == null || !config.IsConfigured)
            {
                Publish("backend_project_required");
                return;
            }

            if (session == null || !session.TryGetAccessToken(out _))
            {
                Publish("authentication_required");
                return;
            }

            StartCoroutine(SyncReadyRuns());
        }

        private IEnumerator SyncReadyRuns()
        {
            syncing = true;
            var ready = runtime?.GetReadyUploads(DateTimeOffset.UtcNow);
            if (ready == null || ready.Count == 0)
            {
                Publish("synchronized");
                syncing = false;
                yield break;
            }

            foreach (var item in ready)
            {
                var completed = false;
                yield return Upload(item.candidate, false, value => completed = value);
                if (!completed)
                {
                    break;
                }
            }

            syncing = false;
        }

        private IEnumerator Upload(
            RunCandidate candidate,
            bool refreshedOnce,
            Action<bool> completed)
        {
            if (!session.TryGetAccessToken(out var accessToken))
            {
                Publish("authentication_required");
                completed(false);
                yield break;
            }

            Publish("uploading");
            using var request = new UnityWebRequest(
                config.RpcUrl("v14_ingest_canonical_run"),
                UnityWebRequest.kHttpVerbPOST)
            {
                uploadHandler = new UploadHandlerRaw(
                    Encoding.UTF8.GetBytes(
                        V11SupabaseUploadContract.BuildJson(candidate))),
                downloadHandler = new DownloadHandlerBuffer(),
                timeout = 25,
            };
            request.SetRequestHeader("apikey", config.PublishableKey);
            request.SetRequestHeader("Authorization", $"Bearer {accessToken}");
            request.SetRequestHeader("Content-Type", "application/json");
            yield return request.SendWebRequest();

            var disposition = V11SupabaseUploadContract.Classify(
                request.result,
                request.responseCode);
            if (disposition == SupabaseUploadDisposition.Accepted)
            {
                if (!V11SupabaseUploadContract.TryParseResponse(
                        request.downloadHandler.text,
                        out var response))
                {
                    runtime.MarkUploadFailed(
                        candidate.fingerprint,
                        "SERVER_RESPONSE_INVALID",
                        DateTimeOffset.UtcNow);
                    Publish("server_response_invalid");
                    completed(false);
                    yield break;
                }

                runtime.ConfirmServerAcceptedRun(
                    candidate,
                    response.duplicate,
                    DateTimeOffset.UtcNow);
                ServerRunAccepted?.Invoke(candidate, response);
                Publish("synchronized");
                completed(true);
                yield break;
            }

            if (disposition == SupabaseUploadDisposition.RefreshSession &&
                !refreshedOnce)
            {
                var refreshed = false;
                yield return session.RefreshSession(config, value => refreshed = value);
                if (refreshed)
                {
                    yield return Upload(candidate, true, completed);
                    yield break;
                }
            }

            var errorCode = disposition == SupabaseUploadDisposition.InterventionRequired
                ? $"SERVER_REJECTED_{request.responseCode}"
                : disposition == SupabaseUploadDisposition.RefreshSession
                    ? "AUTHENTICATION_REQUIRED"
                    : "NETWORK_RETRY";
            runtime.MarkUploadFailed(
                candidate.fingerprint,
                errorCode,
                DateTimeOffset.UtcNow);
            Publish(errorCode.ToLowerInvariant());
            completed(false);
        }

        private void Publish(string status)
        {
            CurrentStatus = status;
            StatusChanged?.Invoke(status);
        }
    }
}
