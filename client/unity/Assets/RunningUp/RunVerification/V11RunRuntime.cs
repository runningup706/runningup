// V11 홈에서 검증 러닝, Daily Contract, 영구 성장, 오프라인 큐 상태를 실제로 유지한다.
using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

namespace RunningUp.RunVerification
{
    [DisallowMultipleComponent]
    public sealed class V11RunRuntime : MonoBehaviour
    {
        private const string ProgressKey = "runningup.v11.runner-progress";
        private OfflineRunQueue queue;
        private RunnerProgressState progress;

        public event Action StateChanged;

        public RunnerProgressState Progress => progress;
        public int PendingUploadCount => queue?.Items.Count ?? 0;
        public bool DailyContractCompleted
        {
            get
            {
                var today = DateTimeOffset.UtcNow.ToString("yyyy-MM-dd");
                return progress != null &&
                    string.Equals(progress.lastDailyContractDate, today, StringComparison.Ordinal);
            }
        }

        private void Awake() => EnsureInitialized();

        private void EnsureInitialized()
        {
            if (queue != null && progress != null)
            {
                return;
            }
            var queuePath = Path.Combine(
                Application.persistentDataPath,
                "v11-pending-runs.json");
            queue = new OfflineRunQueue(queuePath);
            progress = JsonUtility.FromJson<RunnerProgressState>(
                PlayerPrefs.GetString(ProgressKey, "{}")) ?? new RunnerProgressState();
        }

        public VerifiedRunReceipt AcceptVerifiedRun(RunVerificationResult result)
        {
            EnsureInitialized();
            if (result == null || !result.IsVerified || result.Candidate == null)
            {
                throw new InvalidOperationException(
                    result?.FailureCode ?? "RUN_NOT_VERIFIED");
            }

            var enqueued = queue.Enqueue(result.Candidate);
            if (!enqueued)
            {
                return new VerifiedRunReceipt
                {
                    run = result.Candidate,
                    award = VerifiedRunGrowth.Calculate(result.Candidate.distanceMeters),
                    duplicate = true,
                    awaitingServerConfirmation = true,
                };
            }

            StateChanged?.Invoke();
            return new VerifiedRunReceipt
            {
                run = result.Candidate,
                award = VerifiedRunGrowth.Calculate(result.Candidate.distanceMeters),
                duplicate = false,
                awaitingServerConfirmation = true,
            };
        }

        public VerifiedRunReceipt ConfirmServerAcceptedRun(
            RunCandidate candidate,
            bool canonicalDuplicate,
            DateTimeOffset serverTimeUtc)
        {
            EnsureInitialized();
            if (candidate == null || string.IsNullOrEmpty(candidate.fingerprint))
            {
                throw new ArgumentNullException(nameof(candidate));
            }

            if (canonicalDuplicate)
            {
                queue.Acknowledge(candidate.fingerprint);
                StateChanged?.Invoke();
                return new VerifiedRunReceipt
                {
                    run = candidate,
                    award = VerifiedRunGrowth.Calculate(candidate.distanceMeters),
                    duplicate = true,
                    awaitingServerConfirmation = false,
                };
            }

            var applied = progress.ApplyServerAccepted(
                candidate,
                serverTimeUtc,
                out var dailyCompleted);
            SaveProgress();
            queue.Acknowledge(candidate.fingerprint);
            StateChanged?.Invoke();
            return new VerifiedRunReceipt
            {
                run = candidate,
                award = VerifiedRunGrowth.Calculate(candidate.distanceMeters),
                dailyContractCompleted = dailyCompleted,
                duplicate = !applied,
                awaitingServerConfirmation = false,
            };
        }

        public int UseStrideLeap(int requestedMeters)
        {
            EnsureInitialized();
            var consumed = progress.ConsumeStrideLeap(requestedMeters);
            SaveProgress();
            StateChanged?.Invoke();
            return consumed;
        }

        public IReadOnlyList<PendingVerifiedRun> GetReadyUploads(DateTimeOffset nowUtc) =>
            queue?.Ready(nowUtc) ?? Array.Empty<PendingVerifiedRun>();

        public void MarkUploadFailed(
            string fingerprint,
            string errorCode,
            DateTimeOffset nowUtc)
        {
            queue?.MarkFailed(fingerprint, errorCode, nowUtc);
            StateChanged?.Invoke();
        }

        private void SaveProgress()
        {
            PlayerPrefs.SetString(ProgressKey, JsonUtility.ToJson(progress));
            PlayerPrefs.Save();
        }
    }
}
