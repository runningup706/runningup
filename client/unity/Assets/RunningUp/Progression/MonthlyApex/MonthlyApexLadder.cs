using System;
using System.Collections.Generic;
using System.Linq;

namespace RunningUp.Progression.MonthlyApex
{
    /// <summary>
    /// Client-side preview of the Monthly Apex ladder.
    ///
    /// The SQL transaction <c>private.apply_verified_run_reward</c> is always the authority;
    /// this type exists so the Unity client can show a runner what a finished session will
    /// be worth without a round trip, and so the Monthly Apex screen can render offline.
    ///
    /// Because that means the rule set now lives in three places (SQL, JS tooling, C#
    /// client), the conformance fixture at <c>content/conformance/monthly-apex-cases.json</c>
    /// pins all three to the same expected results. See MonthlyApexConformanceTests.
    ///
    /// This file deliberately references nothing from UnityEngine. Master # 17.2 requires the
    /// domain layer to be free of Unity, Supabase and Android types, which is also what lets
    /// it be compiled and unit tested by plain .NET in CI.
    /// </summary>
    public static class MonthlyApexLadder
    {
        /// <summary>The single final checkpoint. Direction lock DL-1.</summary>
        public const int FinalApexMeters = 1_000_000;

        /// <summary>The canonical 121-checkpoint ladder, 1 km to 1000 km, in integer metres.</summary>
        public static readonly IReadOnlyList<int> CheckpointMeters = new[]
        {
                1_000,     2_000,     3_000,     4_000,     5_000,     6_000,     8_000,    10_000,
               13_000,    15_000,    18_000,    21_000,    24_000,    27_000,    30_000,    34_000,
               37_000,    41_000,    42_195,    45_000,    49_000,    54_000,    58_000,    63_000,
               67_000,    72_000,    77_000,    82_000,    87_000,    93_000,    98_000,   104_000,
              110_000,   115_000,   121_000,   127_000,   134_000,   140_000,   146_000,   153_000,
              160_000,   166_000,   173_000,   180_000,   187_000,   194_000,   202_000,   209_000,
              217_000,   224_000,   232_000,   240_000,   248_000,   256_000,   264_000,   272_000,
              281_000,   289_000,   298_000,   306_000,   315_000,   324_000,   333_000,   342_000,
              351_000,   360_000,   369_000,   379_000,   388_000,   398_000,   407_000,   417_000,
              427_000,   437_000,   447_000,   457_000,   467_000,   478_000,   488_000,   499_000,
              509_000,   520_000,   531_000,   541_000,   552_000,   563_000,   574_000,   586_000,
              597_000,   608_000,   620_000,   631_000,   643_000,   654_000,   666_000,   678_000,
              690_000,   702_000,   714_000,   726_000,   738_000,   751_000,   763_000,   776_000,
              788_000,   801_000,   814_000,   826_000,   839_000,   852_000,   865_000,   878_000,
              892_000,   905_000,   918_000,   932_000,   945_000,   959_000,   972_000,   986_000,
            1_000_000,
        };

        /// <summary>
        /// Major ranks in ascending order. <c>world_crown</c> is last and nothing may be
        /// added above it — the database mirrors this as an enum whose order is the rank
        /// order, so a higher rank cannot be expressed there either.
        /// </summary>
        public static readonly IReadOnlyList<RankDefinition> Ranks = new[]
        {
            new RankDefinition("awakening",         0,    49_999),
            new RankDefinition("strider",      50_000,    99_999),
            new RankDefinition("runner",      100_000,   199_999),
            new RankDefinition("challenger",  200_000,   299_999),
            new RankDefinition("vanguard",    300_000,   399_999),
            new RankDefinition("champion",    400_000,   499_999),
            new RankDefinition("master",      500_000,   599_999),
            new RankDefinition("grandmaster", 600_000,   699_999),
            new RankDefinition("legend",      700_000,   799_999),
            new RankDefinition("mythic",      800_000,   899_999),
            new RankDefinition("apex",        900_000,   999_999),
            new RankDefinition("world_crown", 1_000_000, null),
        };

        static MonthlyApexLadder()
        {
            // Fail loudly at type-load rather than shipping a client whose ladder disagrees
            // with the server's.
            if (CheckpointMeters.Count != 121)
            {
                throw new InvalidOperationException("the Monthly Apex seed must contain exactly 121 checkpoints");
            }
            if (CheckpointMeters[0] != 1_000)
            {
                throw new InvalidOperationException("the ladder must start at exactly 1 km");
            }
            if (CheckpointMeters[CheckpointMeters.Count - 1] != FinalApexMeters)
            {
                throw new InvalidOperationException("the final checkpoint must be exactly 1000 km");
            }
            for (var i = 1; i < CheckpointMeters.Count; i++)
            {
                if (CheckpointMeters[i] <= CheckpointMeters[i - 1])
                {
                    throw new InvalidOperationException("checkpoints must be strictly ascending");
                }
            }
        }

        /// <summary>Stable checkpoint id, matching the server and the content seed exactly.</summary>
        public static string CheckpointId(int index)
        {
            if (index < 0 || index >= CheckpointMeters.Count)
            {
                throw new ArgumentOutOfRangeException(nameof(index));
            }

            var meters = CheckpointMeters[index];
            var km = meters / 1000m;
            // 42.195 km becomes "42p195km"; whole values stay plain.
            var label = km == decimal.Truncate(km)
                ? $"{decimal.Truncate(km)}km"
                : $"{km.ToString(System.Globalization.CultureInfo.InvariantCulture)}km".Replace(".", "p");

            return $"apex_cp_{(index + 1):D2}_{label}";
        }

        /// <summary>The rank for a laddered distance. Never returns anything above the crown.</summary>
        public static RankDefinition RankForMeters(int meters)
        {
            if (meters < 0)
            {
                throw new ArgumentOutOfRangeException(nameof(meters), "distance cannot be negative");
            }

            foreach (var rank in Ranks)
            {
                if (rank.MaxMeters == null)
                {
                    if (meters >= rank.MinMeters) return rank;
                }
                else if (meters >= rank.MinMeters && meters <= rank.MaxMeters.Value)
                {
                    return rank;
                }
            }

            throw new InvalidOperationException($"no rank defined for {meters} m");
        }

        /// <summary>
        /// Apply one verified session distance to a month's progress.
        ///
        /// Beyond 1000 km the ladder saturates: the surplus becomes over-crown distance,
        /// no checkpoint is crossed, the rank stays <c>world_crown</c>, and the ordinary
        /// per-run reward still applies. That is DL-1, not an implementation detail.
        /// </summary>
        public static ApexApplyResult Apply(ApexProgress before, int sessionMeters)
        {
            if (sessionMeters < 0)
            {
                throw new ArgumentOutOfRangeException(nameof(sessionMeters), "session distance cannot be negative");
            }

            var rawBefore = before.LadderedMeters + before.OverCrownMeters;
            var rawAfter = rawBefore + sessionMeters;

            var ladderedAfter = Math.Min(rawAfter, FinalApexMeters);
            var overCrownAfter = Math.Max(rawAfter - FinalApexMeters, 0);

            // -1 is the "no progress row yet" sentinel that lets the first verified run of a
            // month claim the 0 km journey-start checkpoint.
            var previousBoundary = before.Exists ? before.LadderedMeters : -1;

            var crossed = new List<string>();
            for (var i = 0; i < CheckpointMeters.Count; i++)
            {
                var threshold = CheckpointMeters[i];
                if (threshold > previousBoundary && threshold <= ladderedAfter)
                {
                    crossed.Add(CheckpointId(i));
                }
            }

            var crownNow = !before.WorldCrownAwarded && ladderedAfter >= FinalApexMeters;
            var axisNow = !before.ApexAxisUnlocked && ladderedAfter >= FinalApexMeters;

            var after = new ApexProgress(
                exists: true,
                ladderedMeters: ladderedAfter,
                overCrownMeters: overCrownAfter,
                worldCrownAwarded: before.WorldCrownAwarded || crownNow,
                apexAxisUnlocked: before.ApexAxisUnlocked || axisNow);

            if (after.LadderedMeters > FinalApexMeters)
            {
                throw new InvalidOperationException("laddered distance exceeded the final checkpoint");
            }

            return new ApexApplyResult(
                before: before,
                after: after,
                crossedCheckpointIds: crossed,
                rankBefore: RankForMeters(before.LadderedMeters).Id,
                rankAfter: RankForMeters(after.LadderedMeters).Id,
                worldCrownAwardedNow: crownNow,
                apexAxisUnlockedNow: axisNow,
                overCrownMetersAdded: overCrownAfter - before.OverCrownMeters,
                // DL-1: running past the crown never stops earning.
                baseRunRewardApplies: true);
        }

        /// <summary>The next checkpoints ahead, for the Today and Monthly Apex screens.</summary>
        public static IReadOnlyList<NextCheckpoint> NextCheckpoints(ApexProgress progress, int count = 3)
        {
            var result = new List<NextCheckpoint>();
            for (var i = 0; i < CheckpointMeters.Count && result.Count < count; i++)
            {
                var threshold = CheckpointMeters[i];
                if (threshold > progress.LadderedMeters)
                {
                    result.Add(new NextCheckpoint(CheckpointId(i), threshold, threshold - progress.LadderedMeters));
                }
            }
            return result;
        }

        /// <summary>
        /// Snapshot for the Monthly Apex screen. <see cref="ApexSnapshot.HasTierAboveFinal"/>
        /// is always false: the UI renders a completed journey, never an empty locked slot.
        /// </summary>
        public static ApexSnapshot Snapshot(ApexProgress progress)
        {
            var reached = progress.Exists
                ? CheckpointMeters.Count(m => m <= progress.LadderedMeters)
                : 0;

            return new ApexSnapshot(
                ladderedMeters: progress.LadderedMeters,
                overCrownMeters: progress.OverCrownMeters,
                rank: RankForMeters(progress.LadderedMeters).Id,
                isFinalRank: progress.LadderedMeters >= FinalApexMeters,
                worldCrownAwarded: progress.WorldCrownAwarded,
                apexAxisUnlocked: progress.ApexAxisUnlocked,
                checkpointsReached: reached,
                checkpointsTotal: CheckpointMeters.Count,
                next: NextCheckpoints(progress),
                hasTierAboveFinal: false);
        }
    }

    public sealed class RankDefinition
    {
        public RankDefinition(string id, int minMeters, int? maxMeters)
        {
            Id = id;
            MinMeters = minMeters;
            MaxMeters = maxMeters;
        }

        public string Id { get; }
        public int MinMeters { get; }
        public int? MaxMeters { get; }
    }

    /// <summary>One month of ladder progress. Immutable: applying a session returns a new value.</summary>
    public sealed class ApexProgress
    {
        public ApexProgress(bool exists, int ladderedMeters, int overCrownMeters,
            bool worldCrownAwarded, bool apexAxisUnlocked)
        {
            Exists = exists;
            LadderedMeters = ladderedMeters;
            OverCrownMeters = overCrownMeters;
            WorldCrownAwarded = worldCrownAwarded;
            ApexAxisUnlocked = apexAxisUnlocked;
        }

        public static ApexProgress Empty => new ApexProgress(false, 0, 0, false, false);

        public bool Exists { get; }
        public int LadderedMeters { get; }
        public int OverCrownMeters { get; }
        public bool WorldCrownAwarded { get; }
        public bool ApexAxisUnlocked { get; }
    }

    public sealed class ApexApplyResult
    {
        public ApexApplyResult(ApexProgress before, ApexProgress after,
            IReadOnlyList<string> crossedCheckpointIds, string rankBefore, string rankAfter,
            bool worldCrownAwardedNow, bool apexAxisUnlockedNow, int overCrownMetersAdded,
            bool baseRunRewardApplies)
        {
            Before = before;
            After = after;
            CrossedCheckpointIds = crossedCheckpointIds;
            RankBefore = rankBefore;
            RankAfter = rankAfter;
            WorldCrownAwardedNow = worldCrownAwardedNow;
            ApexAxisUnlockedNow = apexAxisUnlockedNow;
            OverCrownMetersAdded = overCrownMetersAdded;
            BaseRunRewardApplies = baseRunRewardApplies;
        }

        public ApexProgress Before { get; }
        public ApexProgress After { get; }
        public IReadOnlyList<string> CrossedCheckpointIds { get; }
        public string RankBefore { get; }
        public string RankAfter { get; }
        public bool WorldCrownAwardedNow { get; }
        public bool ApexAxisUnlockedNow { get; }
        public int OverCrownMetersAdded { get; }
        public bool BaseRunRewardApplies { get; }
    }

    public sealed class NextCheckpoint
    {
        public NextCheckpoint(string checkpointId, int thresholdMeters, int remainingMeters)
        {
            CheckpointId = checkpointId;
            ThresholdMeters = thresholdMeters;
            RemainingMeters = remainingMeters;
        }

        public string CheckpointId { get; }
        public int ThresholdMeters { get; }
        public int RemainingMeters { get; }
    }

    public sealed class ApexSnapshot
    {
        public ApexSnapshot(int ladderedMeters, int overCrownMeters, string rank, bool isFinalRank,
            bool worldCrownAwarded, bool apexAxisUnlocked, int checkpointsReached, int checkpointsTotal,
            IReadOnlyList<NextCheckpoint> next, bool hasTierAboveFinal)
        {
            LadderedMeters = ladderedMeters;
            OverCrownMeters = overCrownMeters;
            Rank = rank;
            IsFinalRank = isFinalRank;
            WorldCrownAwarded = worldCrownAwarded;
            ApexAxisUnlocked = apexAxisUnlocked;
            CheckpointsReached = checkpointsReached;
            CheckpointsTotal = checkpointsTotal;
            Next = next;
            HasTierAboveFinal = hasTierAboveFinal;
        }

        public int LadderedMeters { get; }
        public int OverCrownMeters { get; }
        public string Rank { get; }
        public bool IsFinalRank { get; }
        public bool WorldCrownAwarded { get; }
        public bool ApexAxisUnlocked { get; }
        public int CheckpointsReached { get; }
        public int CheckpointsTotal { get; }
        public IReadOnlyList<NextCheckpoint> Next { get; }
        public bool HasTierAboveFinal { get; }
    }
}
