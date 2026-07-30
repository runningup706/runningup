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

        private void Awake()
        {
            var queuePath = Path.Combine(
                Application.persistentDataPath,
                "v11-pending-runs.json");
            queue = new OfflineRunQueue(queuePath);
            progress = JsonUtility.FromJson<RunnerProgressState>(
                PlayerPrefs.GetString(ProgressKey, "{}")) ?? new RunnerProgressState();
        }

        public VerifiedRunReceipt AcceptVerifiedRun(RunVerificationResult result)
        {
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
            DateTimeOffset serverTimeUtc)
        {
            if (candidate == null || string.IsNullOrEmpty(candidate.fingerprint))
            {
                throw new ArgumentNullException(nameof(candidate));
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
            var consumed = progress.ConsumeStrideLeap(requestedMeters);
            SaveProgress();
            StateChanged?.Invoke();
            return consumed;
        }

        public IReadOnlyList<PendingVerifiedRun> GetReadyUploads(DateTimeOffset nowUtc) =>
            queue?.Ready(nowUtc) ?? Array.Empty<PendingVerifiedRun>();

        public IReadOnlyList<AbandonedVerifiedRun> AbandonedUploads =>
            queue?.Abandoned ?? Array.Empty<AbandonedVerifiedRun>();

        /// <summary>
        /// 서버가 이미 이 러닝을 가지고 있다. 영구 성장은 서버 응답으로 확정하고
        /// 큐에서만 제거한다.
        /// </summary>
        public void AcknowledgeAlreadyStored(string fingerprint)
        {
            queue?.Acknowledge(fingerprint);
            StateChanged?.Invoke();
        }

        /// <returns>재시도 상한을 넘겨 항목을 포기했으면 true.</returns>
        public bool MarkUploadFailed(
            string fingerprint,
            string errorCode,
            DateTimeOffset nowUtc)
        {
            var abandoned = queue?.MarkFailed(fingerprint, errorCode, nowUtc) ?? false;
            StateChanged?.Invoke();
            return abandoned;
        }

        public void MarkUploadAbandoned(
            string fingerprint,
            string errorCode,
            DateTimeOffset nowUtc)
        {
            queue?.MarkAbandoned(fingerprint, errorCode, nowUtc);
            StateChanged?.Invoke();
        }

        /// <summary>세션이 복구되면 밀려 있던 backoff를 즉시 푼다.</summary>
        public int ResetUploadBackoff()
        {
            var cleared = queue?.ResetBackoff() ?? 0;
            if (cleared > 0)
            {
                StateChanged?.Invoke();
            }

            return cleared;
        }

        private void SaveProgress()
        {
            PlayerPrefs.SetString(ProgressKey, JsonUtility.ToJson(progress));
            PlayerPrefs.Save();
        }
    }
}
