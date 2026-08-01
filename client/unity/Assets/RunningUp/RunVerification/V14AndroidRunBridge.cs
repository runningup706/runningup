// Android 직접 GPS·Health Connect·기록 파일 결과를 V14 검증 러닝 런타임으로 전달한다.
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using RunningUp.V14.UI;
using UnityEngine;

namespace RunningUp.RunVerification
{
    [Serializable]
    internal sealed class HealthRunPayload
    {
        public string sourceRecordId;
        public long startedAtUnixMilliseconds;
        public long endedAtUnixMilliseconds;
        public int distanceMeters;
        public int movingSeconds;
        public string title;
    }

    [Serializable]
    internal sealed class HealthRunEnvelope
    {
        public HealthRunPayload[] items;
    }

    [DisallowMultipleComponent]
    public sealed class V14AndroidRunBridge : MonoBehaviour
    {
        private const string NativeClass = "kr.robom.runningup.v14.RunningUpV14Bridge";
        private const string PendingHealthRunsKey =
            "runningup.v14.pending-health-runs";
        private readonly List<GpsSample> directSamples = new();
        private readonly List<HealthRunPayload> pendingHealthRuns = new();
        private V14RunRuntime runtime;

        public event Action<string> StatusChanged;
        public event Action<VerifiedRunReceipt> RunAccepted;
        public event Action<GpsSample, int> GpsSampleReceived;

        public string DirectGpsCapability => CallNative("directGpsCapability", "editor_unavailable");
        public string HealthConnectCapability => CallNative("healthConnectCapability", "editor_unavailable");
        public string DirectGpsState => CallNative("directGpsState", "editor_unavailable");
        public string AutoPauseStatus => CallNative("autoPauseStatus", "editor_unavailable");
        public string NotificationPermissionStatus =>
            CallNative("notificationPermissionStatus", "editor_unavailable");
        public int PendingHealthRunCount => pendingHealthRuns.Count;
        public string PendingHealthRunSummary
        {
            get
            {
                if (pendingHealthRuns.Count == 0)
                {
                    return "No pending Health Connect run";
                }
                var run = pendingHealthRuns[0];
                var duration = TimeSpan.FromSeconds(
                    Math.Max(0, run.movingSeconds));
                return
                    $"{run.distanceMeters / 1000f:0.00} km · " +
                    $"{duration:hh\\:mm\\:ss} · {run.title}";
            }
        }

        private void Awake()
        {
            gameObject.name = "V14AndroidRunBridge";
            EnsureRuntime();
            RestorePendingHealthRuns();
#if UNITY_ANDROID && !UNITY_EDITOR
            CallNative("installBackHandler", "back_handler_unavailable");
#endif
        }

        public string StartDirectGps()
        {
            directSamples.Clear();
            return Publish(CallNative("startDirectGps", "editor_unavailable"));
        }

        public string StopDirectGps() =>
            Publish(CallNative("stopDirectGps", "editor_unavailable"));

        public string PauseDirectGps() =>
            Publish(CallNative("pauseDirectGps", "editor_unavailable"));

        public string ResumeDirectGps() =>
            Publish(CallNative("resumeDirectGps", "editor_unavailable"));

        public string DiscardDirectGps() =>
            Publish(CallNative("discardDirectGps", "editor_unavailable"));

        public string RequestHealthConnectPermission() =>
            Publish(CallNative("requestHealthConnectPermission", "editor_unavailable"));

        public string ToggleAutoPause() =>
            Publish(CallNative("toggleAutoPause", "editor_unavailable"));

        public string RequestNotificationPermission() =>
            Publish(CallNative("requestNotificationPermission", "editor_unavailable"));

        public string ReadRecentHealthRuns() =>
            Publish(CallNative("readRecentHealthRuns", "editor_unavailable"));

        public string PickTrackFile() =>
            Publish(CallNative("pickTrackFile", "editor_unavailable"));

        public void OnDirectGpsSample(string payload)
        {
            var sample = JsonUtility.FromJson<GpsSample>(payload);
            if (sample != null)
            {
                directSamples.Add(sample);
                GpsSampleReceived?.Invoke(sample, directSamples.Count);
                Publish($"capturing:{directSamples.Count}");
            }
        }

        public void OnDirectGpsStatus(string status) => Publish(status);

        public void OnSystemBackPressed(string _)
        {
            FindFirstObjectByType<V14ScreenFlowController>()
                ?.OnAndroidBackPressed(string.Empty);
        }

        public void OnDirectGpsFinished(string path)
        {
            ProcessCompletedDirectGps(path);
        }

        public string RecoverCompletedDirectGps()
        {
            var path = CallNative("completedDirectGpsPath", string.Empty);
            if (string.IsNullOrWhiteSpace(path) || !File.Exists(path))
            {
                path = FindLatestCompletedDirectGpsPath();
            }
            if (string.IsNullOrWhiteSpace(path))
            {
                return Publish("completed_run_not_found");
            }
            return ProcessCompletedDirectGps(path)
                ? Publish("completed_run_recovered")
                : Publish("completed_run_recovery_failed");
        }

        private bool ProcessCompletedDirectGps(string path)
        {
            if (string.IsNullOrWhiteSpace(path) || !File.Exists(path))
            {
                Publish("completed_run_file_missing");
                return false;
            }

            var fileSamples = new List<GpsSample>();
            var hasFinishedRecord = false;
            try
            {
                foreach (var line in File.ReadLines(path))
                {
                    if (string.IsNullOrWhiteSpace(line))
                    {
                        continue;
                    }
                    if (line.Contains(
                            "\"recordType\":\"CONTROL\"",
                            StringComparison.Ordinal))
                    {
                        hasFinishedRecord |= line.Contains(
                            "\"state\":\"FINISHED\"",
                            StringComparison.Ordinal);
                        continue;
                    }
                    var sample = JsonUtility.FromJson<GpsSample>(line);
                    if (sample != null &&
                        sample.unixTimeMilliseconds > 0 &&
                        sample.accuracyMeters > 0f)
                    {
                        fileSamples.Add(sample);
                    }
                }
            }
            catch (Exception exception)
            {
                Publish($"completed_run_read_error:{exception.GetType().Name}");
                return false;
            }

            if (!hasFinishedRecord)
            {
                Publish("completed_run_not_finished");
                return false;
            }

            directSamples.Clear();
            directSamples.AddRange(fileSamples);

            var recordId = Path.GetFileNameWithoutExtension(path);
            var result = RunVerifier.VerifyGps(
                directSamples,
                recordId,
                "CONT01-REG01-ROUTE01");
            if (!result.IsVerified)
            {
                Publish($"rejected:{result.FailureCode}");
                return false;
            }
            Accept(result);
            return true;
        }

        private static string FindLatestCompletedDirectGpsPath()
        {
            var directory = Path.Combine(
                Application.persistentDataPath,
                "v14-direct-runs");
            if (!Directory.Exists(directory))
            {
                return string.Empty;
            }

            string latestPath = null;
            var latestWrite = DateTime.MinValue;
            foreach (var path in Directory.EnumerateFiles(
                         directory,
                         "*.raw.ndjson",
                         SearchOption.TopDirectoryOnly))
            {
                try
                {
                    var completed = false;
                    foreach (var line in File.ReadLines(path))
                    {
                        if (line.Contains(
                                "\"recordType\":\"CONTROL\"",
                                StringComparison.Ordinal) &&
                            line.Contains(
                                "\"state\":\"FINISHED\"",
                                StringComparison.Ordinal))
                        {
                            completed = true;
                        }
                    }
                    var writeTime = File.GetLastWriteTimeUtc(path);
                    if (completed && writeTime > latestWrite)
                    {
                        latestPath = path;
                        latestWrite = writeTime;
                    }
                }
                catch (IOException)
                {
                    // 아직 foreground service가 쓰는 파일은 다음 복구에서 다시 읽는다.
                }
            }
            return latestPath ?? string.Empty;
        }

        public void OnHealthConnectStatus(string status) => Publish(status);

        public void OnHealthConnectPayload(string payload)
        {
            var envelope = JsonUtility.FromJson<HealthRunEnvelope>(
                $"{{\"items\":{payload}}}");
            pendingHealthRuns.Clear();
            foreach (var run in envelope?.items ?? Array.Empty<HealthRunPayload>())
            {
                var result = RunVerifier.VerifySummary(
                    RunSource.HealthConnect,
                    run.sourceRecordId,
                    "CONT01-REG01-ROUTE01",
                    run.startedAtUnixMilliseconds,
                    run.endedAtUnixMilliseconds,
                    run.distanceMeters,
                    run.movingSeconds);
                if (result.IsVerified)
                {
                    pendingHealthRuns.Add(run);
                }
            }

            SavePendingHealthRuns();
            Publish(pendingHealthRuns.Count == 0
                ? "health_runs_empty"
                : $"health_runs_found:{pendingHealthRuns.Count}");
        }

        public string ImportPendingHealthRun(int index)
        {
            if (index < 0 || index >= pendingHealthRuns.Count)
            {
                return Publish("health_run_not_found");
            }
            var run = pendingHealthRuns[index];
            var result = RunVerifier.VerifySummary(
                RunSource.HealthConnect,
                run.sourceRecordId,
                "CONT01-REG01-ROUTE01",
                run.startedAtUnixMilliseconds,
                run.endedAtUnixMilliseconds,
                run.distanceMeters,
                run.movingSeconds);
            pendingHealthRuns.RemoveAt(index);
            SavePendingHealthRuns();
            Accept(result);
            return result.IsVerified
                ? "health_run_imported"
                : $"rejected:{result.FailureCode}";
        }

        public void OnTrackFileStatus(string status) => Publish(status);

        public void OnTrackFileSelected(string path)
        {
            if (!File.Exists(path))
            {
                Publish("file_missing");
                return;
            }

            var extension = Path.GetExtension(path).ToLowerInvariant();
            var recordId = Path.GetFileNameWithoutExtension(path);
            RunVerificationResult result;
            try
            {
                result = extension switch
                {
                    ".gpx" => TrackFileImporter.ImportGpx(
                        File.ReadAllText(path),
                        recordId,
                        "CONT01-REG01-ROUTE01"),
                    ".tcx" => TrackFileImporter.ImportTcx(
                        File.ReadAllText(path),
                        recordId,
                        "CONT01-REG01-ROUTE01"),
                    ".fit" => TrackFileImporter.ImportFit(
                        File.ReadAllBytes(path),
                        recordId,
                        "CONT01-REG01-ROUTE01"),
                    _ => RunVerificationResult.Rejected("FILE_EXTENSION"),
                };
            }
            catch (Exception exception)
            {
                Publish($"file_parse_error:{exception.GetType().Name}");
                return;
            }

            Accept(result);
        }

        private void Accept(RunVerificationResult result)
        {
            if (!result.IsVerified)
            {
                Publish($"rejected:{result.FailureCode}");
                return;
            }

            EnsureRuntime();
            var receipt = runtime.AcceptVerifiedRun(result);
            RunAccepted?.Invoke(receipt);
            Publish(receipt.duplicate
                ? "duplicate"
                : $"verified:{receipt.run.distanceMeters.ToString(CultureInfo.InvariantCulture)}");
        }

        private void EnsureRuntime()
        {
            if (runtime != null)
            {
                return;
            }
            runtime = GetComponent<V14RunRuntime>();
            if (runtime == null)
            {
                runtime = gameObject.AddComponent<V14RunRuntime>();
            }
        }

        private string Publish(string status)
        {
            StatusChanged?.Invoke(status);
            return status;
        }

        private void RestorePendingHealthRuns()
        {
            var json = PlayerPrefs.GetString(PendingHealthRunsKey, string.Empty);
            if (string.IsNullOrWhiteSpace(json))
            {
                return;
            }
            var envelope = JsonUtility.FromJson<HealthRunEnvelope>(json);
            pendingHealthRuns.AddRange(
                envelope?.items ?? Array.Empty<HealthRunPayload>());
        }

        private void SavePendingHealthRuns()
        {
            if (pendingHealthRuns.Count == 0)
            {
                PlayerPrefs.DeleteKey(PendingHealthRunsKey);
            }
            else
            {
                PlayerPrefs.SetString(
                    PendingHealthRunsKey,
                    JsonUtility.ToJson(new HealthRunEnvelope
                    {
                        items = pendingHealthRuns.ToArray(),
                    }));
            }
            PlayerPrefs.Save();
        }

        private static string CallNative(string method, string editorFallback)
        {
#if UNITY_ANDROID && !UNITY_EDITOR
            using var bridge = new AndroidJavaClass(NativeClass);
            return bridge.CallStatic<string>(method);
#else
            return editorFallback;
#endif
        }
    }
}
