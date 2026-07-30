// 네트워크가 없어도 검증 러닝을 잃지 않는 원자적 로컬 업로드 큐를 제공한다.
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using UnityEngine;

namespace RunningUp.RunVerification
{
    [Serializable]
    public sealed class PendingVerifiedRun
    {
        public RunCandidate candidate;
        public int attemptCount;
        public long nextAttemptUnixMilliseconds;
        public string lastError = string.Empty;
    }

    /// <summary>
    /// 서버가 영구히 거절했거나 재시도 상한을 넘겨 큐에서 내린 러닝이다.
    /// 조용히 버리면 사용자는 달린 기록이 사라진 이유를 알 수 없으므로 남긴다.
    /// </summary>
    [Serializable]
    public sealed class AbandonedVerifiedRun
    {
        public RunCandidate candidate;
        public int attemptCount;
        public string lastError = string.Empty;
        public long abandonedAtUnixMilliseconds;
    }

    [Serializable]
    internal sealed class PendingRunEnvelope
    {
        public List<PendingVerifiedRun> items = new();
        public List<AbandonedVerifiedRun> abandoned = new();
    }

    public sealed class OfflineRunQueue
    {
        private const string BackupSuffix = ".bak";

        /// <summary>포기 기록도 무한히 쌓이면 안 된다. 최근 것만 남긴다.</summary>
        private const int MaxAbandonedRecords = 64;

        private readonly string path;
        private readonly List<PendingVerifiedRun> items;
        private readonly List<AbandonedVerifiedRun> abandoned;

        public OfflineRunQueue(string storagePath)
        {
            path = storagePath ?? throw new ArgumentNullException(nameof(storagePath));
            var envelope = Load(storagePath);
            items = envelope.items ?? new List<PendingVerifiedRun>();
            abandoned = envelope.abandoned ?? new List<AbandonedVerifiedRun>();
            PruneUnusableEntries();
        }

        public IReadOnlyList<PendingVerifiedRun> Items => items;

        public IReadOnlyList<AbandonedVerifiedRun> Abandoned => abandoned;

        public bool Enqueue(RunCandidate candidate)
        {
            if (candidate == null)
            {
                throw new ArgumentNullException(nameof(candidate));
            }

            if (string.IsNullOrWhiteSpace(candidate.fingerprint))
            {
                throw new ArgumentException(
                    "RUN_FINGERPRINT_REQUIRED",
                    nameof(candidate));
            }

            if (items.Any(item =>
                    item.candidate.fingerprint == candidate.fingerprint))
            {
                return false;
            }

            items.Add(new PendingVerifiedRun { candidate = candidate });
            Save();
            return true;
        }

        public bool Acknowledge(string fingerprint)
        {
            var removed = items.RemoveAll(item =>
                item.candidate.fingerprint == fingerprint) > 0;
            if (removed)
            {
                Save();
            }

            return removed;
        }

        /// <summary>
        /// 일시적 실패를 기록하고 다음 시도를 jitter가 섞인 backoff 뒤로 미룬다.
        /// 재시도 상한을 넘으면 큐에서 내려 이후 러닝이 막히지 않게 한다.
        /// </summary>
        /// <returns>항목을 포기했으면 true.</returns>
        public bool MarkFailed(string fingerprint, string error, DateTimeOffset now)
        {
            var item = items.FirstOrDefault(entry =>
                entry.candidate.fingerprint == fingerprint);
            if (item == null)
            {
                return false;
            }

            item.attemptCount++;
            item.lastError = error ?? string.Empty;
            if (item.attemptCount >= V11UploadPolicy.MaxTransientAttempts)
            {
                Abandon(item, now);
                Save();
                return true;
            }

            var delaySeconds = V11UploadPolicy.NextAttemptDelaySeconds(
                item.attemptCount,
                item.candidate.fingerprint);
            item.nextAttemptUnixMilliseconds =
                now.AddSeconds(delaySeconds).ToUnixTimeMilliseconds();
            Save();
            return false;
        }

        /// <summary>
        /// 서버가 영구히 거절했다. 재시도해도 결과가 달라지지 않으므로 즉시 내린다.
        /// </summary>
        public bool MarkAbandoned(string fingerprint, string error, DateTimeOffset now)
        {
            var item = items.FirstOrDefault(entry =>
                entry.candidate.fingerprint == fingerprint);
            if (item == null)
            {
                return false;
            }

            item.attemptCount++;
            item.lastError = error ?? string.Empty;
            Abandon(item, now);
            Save();
            return true;
        }

        /// <summary>
        /// 세션이 복구되면 인증 때문에 밀려 있던 backoff를 즉시 푼다. 재로그인하고도
        /// 최대 30분을 기다리게 두지 않기 위한 것이다.
        /// </summary>
        public int ResetBackoff()
        {
            var cleared = 0;
            foreach (var item in items)
            {
                if (item.nextAttemptUnixMilliseconds == 0)
                {
                    continue;
                }

                item.nextAttemptUnixMilliseconds = 0;
                cleared++;
            }

            if (cleared > 0)
            {
                Save();
            }

            return cleared;
        }

        public IReadOnlyList<PendingVerifiedRun> Ready(DateTimeOffset now) =>
            items
                .Where(item => item.nextAttemptUnixMilliseconds <= now.ToUnixTimeMilliseconds())
                .OrderBy(item => item.candidate.startedAtUnixMilliseconds)
                .ToArray();

        private void Abandon(PendingVerifiedRun item, DateTimeOffset now)
        {
            items.Remove(item);
            abandoned.Add(new AbandonedVerifiedRun
            {
                candidate = item.candidate,
                attemptCount = item.attemptCount,
                lastError = item.lastError,
                abandonedAtUnixMilliseconds = now.ToUnixTimeMilliseconds(),
            });
            if (abandoned.Count > MaxAbandonedRecords)
            {
                abandoned.RemoveRange(0, abandoned.Count - MaxAbandonedRecords);
            }
        }

        /// <summary>
        /// 손상된 백업에서 복구하면 fingerprint가 빈 항목이 섞여 들어올 수 있다.
        /// 그런 항목은 업로드 시 예외를 던져 동기화 전체를 멈추므로 미리 걷어낸다.
        /// </summary>
        private void PruneUnusableEntries()
        {
            var removed = items.RemoveAll(item =>
                item?.candidate == null ||
                string.IsNullOrWhiteSpace(item.candidate.fingerprint));
            removed += abandoned.RemoveAll(item => item?.candidate == null);
            if (removed > 0)
            {
                Debug.LogWarning(
                    $"V11 offline queue dropped {removed} unusable entries after recovery.");
                Save();
            }
        }

        private static PendingRunEnvelope Load(string storagePath)
        {
            var primary = TryLoad(storagePath);
            if (primary != null)
            {
                return primary;
            }

            var backupPath = storagePath + BackupSuffix;
            var backup = TryLoad(backupPath);
            if (backup != null)
            {
                Debug.LogWarning("V11 offline queue recovered from the previous atomic backup.");
                return backup;
            }

            return new PendingRunEnvelope();
        }

        private static PendingRunEnvelope TryLoad(string storagePath)
        {
            if (!File.Exists(storagePath))
            {
                return null;
            }

            try
            {
                var envelope = JsonUtility.FromJson<PendingRunEnvelope>(
                    File.ReadAllText(storagePath));
                if (envelope?.items == null)
                {
                    return null;
                }

                envelope.abandoned ??= new List<AbandonedVerifiedRun>();
                return envelope;
            }
            catch (Exception exception)
            {
                Debug.LogWarning(
                    $"V11 offline queue copy could not be read: {exception.GetType().Name}");
                return null;
            }
        }

        private void Save()
        {
            var directory = Path.GetDirectoryName(path);
            if (!string.IsNullOrEmpty(directory))
            {
                Directory.CreateDirectory(directory);
            }

            var temporary = path + ".tmp";
            var json = JsonUtility.ToJson(
                new PendingRunEnvelope { items = items, abandoned = abandoned },
                true);
            using (var stream = new FileStream(
                       temporary,
                       FileMode.Create,
                       FileAccess.Write,
                       FileShare.None))
            {
                using var writer = new StreamWriter(
                    stream,
                    new UTF8Encoding(false),
                    4096,
                    true);
                writer.Write(json);
                writer.Flush();
                stream.Flush(true);
            }

            if (!File.Exists(path))
            {
                File.Move(temporary, path);
                return;
            }

            var backup = path + BackupSuffix;
            try
            {
                File.Replace(temporary, path, backup, true);
            }
            catch (PlatformNotSupportedException)
            {
                ReplaceWithPortableFallback(temporary, backup);
            }
            catch (IOException)
            {
                ReplaceWithPortableFallback(temporary, backup);
            }
        }

        private void ReplaceWithPortableFallback(string temporary, string backup)
        {
            File.Copy(path, backup, true);
            File.Copy(temporary, path, true);
            File.Delete(temporary);
        }
    }
}
