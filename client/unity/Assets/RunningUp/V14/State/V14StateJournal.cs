// V14 진행 중인 상태와 서버 작업 식별자를 원자 파일로 저장하고 재실행 때 복구한다.
using System;
using System.IO;
using System.Text;
using UnityEngine;

namespace RunningUp.V14.State
{
    [Serializable]
    public sealed class V14FlowSnapshot
    {
        public string training = V14TrainingState.SELECT.ToString();
        public string race = V14RaceState.BROWSE.ToString();
        public string sync = V14SyncState.CONNECTION_CHECK.ToString();
        public string store = V14StoreState.BROWSE.ToString();
        public string trainingSessionId = string.Empty;
        public string raceEntryId = string.Empty;
        public string raceMatchId = string.Empty;
        public int raceDistanceMeters = 1000;
        public long raceScheduledStartAtUnixMilliseconds;
        public int lastRacePlace;
        public long lastRaceElapsedMilliseconds;
        public int lastRaceRatingBefore;
        public int lastRaceRatingDelta;
        public int lastRaceRatingAfter;
        public int lastRaceXp;
        public int lastRaceRunCoins;
        public string eventId = string.Empty;
        public string pendingCanonicalRunId = string.Empty;
        public string pendingIdempotencyKey = string.Empty;
        public int accountLevel;
        public long accountXp;
        public long runCoins;
        public long gems;
        public bool accountSummaryLoaded;
        public string lastVerifiedRunId = string.Empty;
        public int lastVerifiedDistanceMeters;
        public int lastVerifiedMovingSeconds;
        public long lastRunnerGrowthPoints;
        public long lastPacerBondPoints;
        public long lastRestorationPoints;
        public long lastMonthlyVerifiedMeters;
        public bool lastDailyContractCompleted;
        public bool lastWorldCrown;
        public string activeRouteId = string.Empty;
        public long activeRouteProgressMeters;
        public int activeRouteTargetMeters;
        public bool activeRouteLoaded;
        public string crewId = string.Empty;
        public string crewName = string.Empty;
        public string crewRole = string.Empty;
        public int crewMemberCount;
        public bool crewLoaded;
        public long updatedAtUnixMilliseconds;

        public void Touch(DateTimeOffset nowUtc)
        {
            updatedAtUnixMilliseconds = nowUtc.ToUnixTimeMilliseconds();
        }
    }

    public sealed class V14StateJournal
    {
        private readonly string path;

        public V14StateJournal(string storagePath)
        {
            path = string.IsNullOrWhiteSpace(storagePath)
                ? throw new ArgumentNullException(nameof(storagePath))
                : storagePath;
        }

        public V14FlowSnapshot Load()
        {
            var snapshot = TryLoad(path) ?? TryLoad(path + ".bak");
            return snapshot ?? new V14FlowSnapshot();
        }

        public void Save(V14FlowSnapshot snapshot)
        {
            if (snapshot == null)
            {
                throw new ArgumentNullException(nameof(snapshot));
            }

            var directory = Path.GetDirectoryName(path);
            if (!string.IsNullOrEmpty(directory))
            {
                Directory.CreateDirectory(directory);
            }

            var temporary = path + ".tmp";
            var bytes = new UTF8Encoding(false).GetBytes(
                JsonUtility.ToJson(snapshot, true));
            using (var stream = new FileStream(
                       temporary,
                       FileMode.Create,
                       FileAccess.Write,
                       FileShare.None))
            {
                stream.Write(bytes, 0, bytes.Length);
                stream.Flush(true);
            }

            if (!File.Exists(path))
            {
                File.Move(temporary, path);
                return;
            }

            var backup = path + ".bak";
            try
            {
                File.Replace(temporary, path, backup, true);
            }
            catch (PlatformNotSupportedException)
            {
                PortableReplace(temporary, backup);
            }
            catch (IOException)
            {
                PortableReplace(temporary, backup);
            }
        }

        private static V14FlowSnapshot TryLoad(string candidate)
        {
            if (!File.Exists(candidate))
            {
                return null;
            }

            try
            {
                return JsonUtility.FromJson<V14FlowSnapshot>(
                    File.ReadAllText(candidate));
            }
            catch (Exception exception)
            {
                Debug.LogWarning(
                    $"V14 state journal unreadable: {exception.GetType().Name}");
                return null;
            }
        }

        private void PortableReplace(string temporary, string backup)
        {
            File.Copy(path, backup, true);
            File.Copy(temporary, path, true);
            File.Delete(temporary);
        }
    }
}
