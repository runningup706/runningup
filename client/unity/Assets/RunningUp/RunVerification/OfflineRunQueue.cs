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

    [Serializable]
    internal sealed class PendingRunEnvelope
    {
        public List<PendingVerifiedRun> items = new();
    }

    public sealed class OfflineRunQueue
    {
        private const string BackupSuffix = ".bak";
        private readonly string path;
        private readonly List<PendingVerifiedRun> items;

        public OfflineRunQueue(string storagePath)
        {
            path = storagePath ?? throw new ArgumentNullException(nameof(storagePath));
            items = Load(storagePath);
        }

        public IReadOnlyList<PendingVerifiedRun> Items => items;

        public bool Enqueue(RunCandidate candidate)
        {
            if (candidate == null)
            {
                throw new ArgumentNullException(nameof(candidate));
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

        public void MarkFailed(string fingerprint, string error, DateTimeOffset now)
        {
            var item = items.FirstOrDefault(entry =>
                entry.candidate.fingerprint == fingerprint);
            if (item == null)
            {
                return;
            }

            item.attemptCount++;
            item.lastError = error ?? string.Empty;
            var delaySeconds = Math.Min(1800, (int)Math.Pow(2, Math.Min(10, item.attemptCount)));
            item.nextAttemptUnixMilliseconds = now.AddSeconds(delaySeconds).ToUnixTimeMilliseconds();
            Save();
        }

        public IReadOnlyList<PendingVerifiedRun> Ready(DateTimeOffset now) =>
            items
                .Where(item => item.nextAttemptUnixMilliseconds <= now.ToUnixTimeMilliseconds())
                .OrderBy(item => item.candidate.startedAtUnixMilliseconds)
                .ToArray();

        private static List<PendingVerifiedRun> Load(string storagePath)
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

            return new List<PendingVerifiedRun>();
        }

        private static List<PendingVerifiedRun> TryLoad(string storagePath)
        {
            if (!File.Exists(storagePath))
            {
                return null;
            }

            try
            {
                var envelope = JsonUtility.FromJson<PendingRunEnvelope>(
                    File.ReadAllText(storagePath));
                return envelope?.items;
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
            var json = JsonUtility.ToJson(new PendingRunEnvelope { items = items }, true);
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
