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

        /// <summary>
        /// 판정 자체는 <see cref="V11UploadPolicy"/>가 한다. 여기서는 UnityWebRequest
        /// 결과를 엔진 없는 표현으로 옮기기만 해서, Unity Editor 없이도 같은 규칙을
        /// 테스트할 수 있게 한다.
        /// </summary>
        public static UploadDisposition Classify(
            UnityWebRequest.Result transportResult,
            long responseCode,
            string responseBody = null) =>
            V11UploadPolicy.Classify(
                ToTransportResult(transportResult),
                responseCode,
                responseBody);

        public static UploadTransportResult ToTransportResult(
            UnityWebRequest.Result transportResult) =>
            transportResult switch
            {
                UnityWebRequest.Result.Success => UploadTransportResult.Success,
                UnityWebRequest.Result.ConnectionError =>
                    UploadTransportResult.ConnectionError,
                UnityWebRequest.Result.DataProcessingError =>
                    UploadTransportResult.DataProcessingError,
                _ => UploadTransportResult.ProtocolError,
            };

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
        public string CurrentStatus { get; private set; } = "initializing";

        private void Awake()
        {
            config ??= GetComponent<V11SupabaseRuntimeConfig>();
            session ??= GetComponent<V11SupabaseSessionRuntime>();
            runtime ??= GetComponent<V11RunRuntime>();
            nextSyncAt = Time.unscaledTime + 1f;
            if (session != null)
            {
                session.StatusChanged += OnSessionStatusChanged;
            }

            Publish(config != null && config.IsConfigured
                ? "authentication_required"
                : "backend_project_required");
        }

        private void OnDestroy()
        {
            if (session != null)
            {
                session.StatusChanged -= OnSessionStatusChanged;
            }
        }

        /// <summary>
        /// 로그인이 복구되면 인증 실패로 밀려 있던 backoff를 풀고 곧바로 다시
        /// 시도한다. 그러지 않으면 재로그인하고도 최대 30분을 기다린다.
        /// </summary>
        private void OnSessionStatusChanged(string status)
        {
            if (!string.Equals(status, "authenticated", StringComparison.Ordinal))
            {
                return;
            }

            runtime?.ResetUploadBackoff();
            nextSyncAt = Time.unscaledTime;
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
            // finally 없이 coroutine 중간에서 예외가 나면 syncing이 true로 남아
            // 앱을 재시작할 때까지 동기화가 영영 멈춘다. 반드시 풀어준다.
            try
            {
                var ready = runtime?.GetReadyUploads(DateTimeOffset.UtcNow);
                if (ready == null || ready.Count == 0)
                {
                    Publish("synchronized");
                    yield break;
                }

                var uploaded = 0;
                foreach (var item in ready)
                {
                    var disposition = UploadDisposition.Retry;
                    yield return Upload(
                        item.candidate,
                        false,
                        value => disposition = value);

                    if (disposition == UploadDisposition.Accepted ||
                        disposition == UploadDisposition.AlreadyStored)
                    {
                        uploaded++;
                    }

                    // 영구 거절이나 일시 실패로 배치를 멈추면, 실패한 러닝 하나가
                    // 언제나 가장 오래된 항목으로 남아 이후 모든 러닝을 막는다.
                    // 계정 전체에 영향을 주는 인증 실패에서만 멈춘다.
                    if (V11UploadPolicy.StopsBatch(disposition))
                    {
                        yield break;
                    }
                }

                if (uploaded == ready.Count)
                {
                    Publish("synchronized");
                }
            }
            finally
            {
                syncing = false;
            }
        }

        private IEnumerator Upload(
            RunCandidate candidate,
            bool refreshedOnce,
            Action<UploadDisposition> completed)
        {
            if (!session.TryGetAccessToken(out var accessToken))
            {
                Publish("authentication_required");
                completed(UploadDisposition.RefreshSession);
                yield break;
            }

            Publish("uploading");
            using var request = new UnityWebRequest(
                config.RpcUrl("ingest_verified_run"),
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

            var body = request.downloadHandler?.text;
            var disposition = V11SupabaseUploadContract.Classify(
                request.result,
                request.responseCode,
                body);
            var now = DateTimeOffset.UtcNow;

            if (disposition == UploadDisposition.Accepted)
            {
                if (!V11SupabaseUploadContract.TryParseResponse(body, out _))
                {
                    // 2xx인데 본문을 못 읽으면 서버 상태를 알 수 없다. 러닝을 버리지
                    // 않고 재시도한다. 서버가 이미 저장했다면 다음 시도에서
                    // duplicate로 확인된다.
                    HandleRetry(candidate, "SERVER_RESPONSE_INVALID", now, completed);
                    yield break;
                }

                runtime.ConfirmServerAcceptedRun(candidate, now);
                completed(UploadDisposition.Accepted);
                yield break;
            }

            if (disposition == UploadDisposition.AlreadyStored)
            {
                // 앱이 서버 커밋 직후·응답 처리 직전에 죽었거나 다른 기기가 같은
                // 러닝을 먼저 올린 경우다. 서버가 정본이므로 큐에서만 내린다.
                runtime.AcknowledgeAlreadyStored(candidate.fingerprint);
                Publish("already_synchronized");
                completed(UploadDisposition.AlreadyStored);
                yield break;
            }

            if (disposition == UploadDisposition.RefreshSession)
            {
                if (!refreshedOnce)
                {
                    var refreshed = false;
                    yield return session.RefreshSession(config, value => refreshed = value);
                    if (refreshed)
                    {
                        // 세션이 살아났으니 인증 때문에 밀려 있던 backoff를 푼다.
                        runtime.ResetUploadBackoff();
                        yield return Upload(candidate, true, completed);
                        yield break;
                    }
                }

                // 재로그인 전에는 복구되지 않는다. 러닝은 큐에 남긴다.
                runtime.MarkUploadFailed(
                    candidate.fingerprint,
                    "AUTHENTICATION_REQUIRED",
                    now);
                Publish("authentication_required");
                completed(UploadDisposition.RefreshSession);
                yield break;
            }

            if (disposition == UploadDisposition.Abandon)
            {
                runtime.MarkUploadAbandoned(
                    candidate.fingerprint,
                    $"SERVER_REJECTED_{request.responseCode}",
                    now);
                Publish($"server_rejected_{request.responseCode}");
                completed(UploadDisposition.Abandon);
                yield break;
            }

            HandleRetry(candidate, "NETWORK_RETRY", now, completed);
        }

        private void HandleRetry(
            RunCandidate candidate,
            string errorCode,
            DateTimeOffset now,
            Action<UploadDisposition> completed)
        {
            var abandoned = runtime.MarkUploadFailed(
                candidate.fingerprint,
                errorCode,
                now);
            if (abandoned)
            {
                Publish("upload_gave_up");
                completed(UploadDisposition.Abandon);
                return;
            }

            Publish(errorCode.ToLowerInvariant());
            completed(UploadDisposition.Retry);
        }

        private void Publish(string status)
        {
            CurrentStatus = status;
            StatusChanged?.Invoke(status);
        }
    }
}
