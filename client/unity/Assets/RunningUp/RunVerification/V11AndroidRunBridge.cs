// Android 직접 GPS·Health Connect·기록 파일 결과를 V11 검증 러닝 런타임으로 전달한다.
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
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
    public sealed class V11AndroidRunBridge : MonoBehaviour
    {
        private const string NativeClass = "kr.robom.runningup.v11.RunningUpV11Bridge";
        private readonly List<GpsSample> directSamples = new();
        private V11RunRuntime runtime;

        public event Action<string> StatusChanged;
        public event Action<VerifiedRunReceipt> RunAccepted;

        public string DirectGpsCapability => CallNative("directGpsCapability", "editor_unavailable");
        public string HealthConnectCapability => CallNative("healthConnectCapability", "editor_unavailable");

        private void Awake()
        {
            gameObject.name = "V11AndroidRunBridge";
            runtime = GetComponent<V11RunRuntime>();
            if (runtime == null)
            {
                runtime = gameObject.AddComponent<V11RunRuntime>();
            }
        }

        public string StartDirectGps()
        {
            directSamples.Clear();
            return Publish(CallNative("startDirectGps", "editor_unavailable"));
        }

        public string StopDirectGps() =>
            Publish(CallNative("stopDirectGps", "editor_unavailable"));

        public string RequestHealthConnectPermission() =>
            Publish(CallNative("requestHealthConnectPermission", "editor_unavailable"));

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
                Publish($"capturing:{directSamples.Count}");
            }
        }

        public void OnDirectGpsStatus(string status) => Publish(status);

        public void OnDirectGpsFinished(string path)
        {
            if (directSamples.Count < 3 && File.Exists(path))
            {
                foreach (var line in File.ReadLines(path))
                {
                    if (!string.IsNullOrWhiteSpace(line))
                    {
                        var sample = JsonUtility.FromJson<GpsSample>(line);
                        if (sample != null)
                        {
                            directSamples.Add(sample);
                        }
                    }
                }
            }

            var recordId = Path.GetFileNameWithoutExtension(path);
            Accept(RunVerifier.VerifyGps(
                directSamples,
                recordId,
                "CONT01-REG01-ROUTE01"));
        }

        public void OnHealthConnectStatus(string status) => Publish(status);

        public void OnHealthConnectPayload(string payload)
        {
            var envelope = JsonUtility.FromJson<HealthRunEnvelope>(
                $"{{\"items\":{payload}}}");
            var accepted = 0;
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
                    Accept(result);
                    accepted++;
                }
            }

            Publish($"health_runs_accepted:{accepted}");
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

            var receipt = runtime.AcceptVerifiedRun(result);
            RunAccepted?.Invoke(receipt);
            Publish(receipt.duplicate
                ? "duplicate"
                : $"verified:{receipt.run.distanceMeters.ToString(CultureInfo.InvariantCulture)}");
        }

        private string Publish(string status)
        {
            StatusChanged?.Invoke(status);
            return status;
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

