// 현실 러닝 검증과 85·10·5 영구 성장 배분의 플랫폼 독립 규칙을 정의한다.
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Security.Cryptography;
using System.Text;

namespace RunningUp.RunVerification
{
    public enum RunSource
    {
        DirectGps,
        HealthConnect,
        Fit,
        Gpx,
        Tcx,
    }

    [Serializable]
    public sealed class GpsSample
    {
        public double latitude;
        public double longitude;
        public long unixTimeMilliseconds;
        public float accuracyMeters;
        public long elapsedRealtimeNanos;
        public string provider;
        public bool hasSpeed;
        public float speedMetersPerSecond;
        public bool hasBearing;
        public float bearingDegrees;
        public bool hasAltitude;
        public double altitudeMeters;
        public string sessionId;
        public bool raw;
    }

    [Serializable]
    public sealed class RunCandidate
    {
        public string localId;
        public RunSource source;
        public string sourceRecordId;
        public string routeId;
        public long startedAtUnixMilliseconds;
        public long endedAtUnixMilliseconds;
        public int distanceMeters;
        public int movingSeconds;
        public int acceptedSampleCount;
        public float accuracyP95Meters;
        public string fingerprint;
    }

    [Serializable]
    public sealed class GrowthAward
    {
        public long runnerGrowthPoints;
        public long pacerBondPoints;
        public long restorationPoints;
        public int strideLeapChargeMeters;

        public long TotalPoints =>
            runnerGrowthPoints + pacerBondPoints + restorationPoints;
    }

    [Serializable]
    public sealed class VerifiedRunReceipt
    {
        public RunCandidate run;
        public GrowthAward award;
        public bool dailyContractCompleted;
        public bool duplicate;
        public bool awaitingServerConfirmation;
    }

    public sealed class RunVerificationResult
    {
        public bool IsVerified { get; }
        public string FailureCode { get; }
        public RunCandidate Candidate { get; }

        private RunVerificationResult(
            bool isVerified,
            string failureCode,
            RunCandidate candidate)
        {
            IsVerified = isVerified;
            FailureCode = failureCode;
            Candidate = candidate;
        }

        public static RunVerificationResult Verified(RunCandidate candidate) =>
            new(true, string.Empty, candidate);

        public static RunVerificationResult Rejected(string failureCode) =>
            new(false, failureCode, null);
    }

    public static class RunVerifier
    {
        private const double EarthRadiusMeters = 6371000.0;
        private const float MaximumAcceptedAccuracyMeters = 35f;
        private const double MinimumAverageMetersPerSecond = 0.5;
        private const double MaximumSegmentMetersPerSecond = 9.5;

        public static RunVerificationResult VerifyGps(
            IEnumerable<GpsSample> sourceSamples,
            string sourceRecordId,
            string routeId)
        {
            var samples = sourceSamples?
                .Where(sample =>
                    sample != null &&
                    sample.accuracyMeters > 0f &&
                    sample.accuracyMeters <= MaximumAcceptedAccuracyMeters &&
                    sample.latitude >= -90 &&
                    sample.latitude <= 90 &&
                    sample.longitude >= -180 &&
                    sample.longitude <= 180)
                .OrderBy(sample => sample.unixTimeMilliseconds)
                .ToArray() ?? Array.Empty<GpsSample>();
            if (samples.Length < 3)
            {
                return RunVerificationResult.Rejected("GPS_SAMPLE_COUNT");
            }

            var distanceMeters = 0.0;
            var movingMilliseconds = 0L;
            var hadSpeedJump = false;
            for (var index = 1; index < samples.Length; index++)
            {
                var elapsedMilliseconds =
                    samples[index].unixTimeMilliseconds -
                    samples[index - 1].unixTimeMilliseconds;
                if (elapsedMilliseconds <= 0)
                {
                    continue;
                }

                var segmentMeters = HaversineMeters(samples[index - 1], samples[index]);
                var segmentSpeed = segmentMeters / (elapsedMilliseconds / 1000.0);
                if (segmentSpeed > MaximumSegmentMetersPerSecond)
                {
                    hadSpeedJump = true;
                    continue;
                }

                if (segmentSpeed >= MinimumAverageMetersPerSecond)
                {
                    distanceMeters += segmentMeters;
                    movingMilliseconds += elapsedMilliseconds;
                }
            }

            var movingSeconds = (int)Math.Round(movingMilliseconds / 1000.0);
            var roundedDistance = (int)Math.Round(distanceMeters);
            var validation = ValidateSummary(roundedDistance, movingSeconds);
            if (validation != null)
            {
                return RunVerificationResult.Rejected(
                    hadSpeedJump ? "GPS_SPEED_JUMP" : validation);
            }

            var accuracy = samples
                .Select(sample => sample.accuracyMeters)
                .OrderBy(value => value)
                .ToArray();
            var p95Index = Math.Min(
                accuracy.Length - 1,
                (int)Math.Ceiling(accuracy.Length * 0.95) - 1);
            var candidate = CreateCandidate(
                RunSource.DirectGps,
                sourceRecordId,
                routeId,
                samples[0].unixTimeMilliseconds,
                samples[^1].unixTimeMilliseconds,
                roundedDistance,
                movingSeconds,
                samples.Length,
                accuracy[p95Index]);
            return RunVerificationResult.Verified(candidate);
        }

        public static RunVerificationResult VerifySummary(
            RunSource source,
            string sourceRecordId,
            string routeId,
            long startedAtUnixMilliseconds,
            long endedAtUnixMilliseconds,
            int distanceMeters,
            int movingSeconds,
            int acceptedSampleCount = 0,
            float accuracyP95Meters = 0f)
        {
            if (source == RunSource.DirectGps && acceptedSampleCount < 3)
            {
                return RunVerificationResult.Rejected("GPS_SAMPLE_COUNT");
            }

            if (endedAtUnixMilliseconds <= startedAtUnixMilliseconds)
            {
                return RunVerificationResult.Rejected("RUN_TIME_RANGE");
            }

            var validation = ValidateSummary(distanceMeters, movingSeconds);
            if (validation != null)
            {
                return RunVerificationResult.Rejected(validation);
            }

            return RunVerificationResult.Verified(CreateCandidate(
                source,
                sourceRecordId,
                routeId,
                startedAtUnixMilliseconds,
                endedAtUnixMilliseconds,
                distanceMeters,
                movingSeconds,
                acceptedSampleCount,
                accuracyP95Meters));
        }

        private static string ValidateSummary(int distanceMeters, int movingSeconds)
        {
            if (distanceMeters < 100 || distanceMeters > 200000)
            {
                return "RUN_DISTANCE_RANGE";
            }

            if (movingSeconds < 30 || movingSeconds > 86400)
            {
                return "RUN_DURATION_RANGE";
            }

            var averageSpeed = distanceMeters / (double)movingSeconds;
            return averageSpeed < MinimumAverageMetersPerSecond ||
                averageSpeed > MaximumSegmentMetersPerSecond
                ? "RUN_PACE_RANGE"
                : null;
        }

        private static RunCandidate CreateCandidate(
            RunSource source,
            string sourceRecordId,
            string routeId,
            long startedAtUnixMilliseconds,
            long endedAtUnixMilliseconds,
            int distanceMeters,
            int movingSeconds,
            int acceptedSampleCount,
            float accuracyP95Meters)
        {
            var route = string.IsNullOrWhiteSpace(routeId)
                ? "CONT01-REG01-ROUTE01"
                : routeId.Trim();
            var fingerprintInput = string.Join(
                "|",
                source,
                sourceRecordId ?? string.Empty,
                route,
                startedAtUnixMilliseconds.ToString(CultureInfo.InvariantCulture),
                endedAtUnixMilliseconds.ToString(CultureInfo.InvariantCulture),
                distanceMeters.ToString(CultureInfo.InvariantCulture),
                movingSeconds.ToString(CultureInfo.InvariantCulture));
            byte[] hash;
            using (var algorithm = SHA256.Create())
            {
                hash = algorithm.ComputeHash(Encoding.UTF8.GetBytes(fingerprintInput));
            }
            var fingerprint = BitConverter.ToString(hash)
                .Replace("-", string.Empty)
                .ToLowerInvariant();
            return new RunCandidate
            {
                localId = Guid.NewGuid().ToString("N"),
                source = source,
                sourceRecordId = sourceRecordId ?? string.Empty,
                routeId = route,
                startedAtUnixMilliseconds = startedAtUnixMilliseconds,
                endedAtUnixMilliseconds = endedAtUnixMilliseconds,
                distanceMeters = distanceMeters,
                movingSeconds = movingSeconds,
                acceptedSampleCount = acceptedSampleCount,
                accuracyP95Meters = accuracyP95Meters,
                fingerprint = fingerprint,
            };
        }

        private static double HaversineMeters(GpsSample left, GpsSample right)
        {
            var leftLat = left.latitude * Math.PI / 180.0;
            var rightLat = right.latitude * Math.PI / 180.0;
            var deltaLat = rightLat - leftLat;
            var deltaLon = (right.longitude - left.longitude) * Math.PI / 180.0;
            var a = Math.Sin(deltaLat / 2.0) * Math.Sin(deltaLat / 2.0) +
                Math.Cos(leftLat) * Math.Cos(rightLat) *
                Math.Sin(deltaLon / 2.0) * Math.Sin(deltaLon / 2.0);
            return EarthRadiusMeters * 2.0 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1.0 - a));
        }
    }

    public static class VerifiedRunGrowth
    {
        public static GrowthAward Calculate(int verifiedDistanceMeters)
        {
            if (verifiedDistanceMeters < 0)
            {
                throw new ArgumentOutOfRangeException(nameof(verifiedDistanceMeters));
            }

            var total = Math.Max(1L, (long)Math.Floor(verifiedDistanceMeters / 10.0));
            var runner = (long)Math.Floor(total * 0.85);
            var pacer = (long)Math.Floor(total * 0.10);
            return new GrowthAward
            {
                runnerGrowthPoints = runner,
                pacerBondPoints = pacer,
                restorationPoints = total - runner - pacer,
                strideLeapChargeMeters = Math.Min(1000, verifiedDistanceMeters / 5),
            };
        }
    }

    [Serializable]
    public sealed class RunnerProgressState
    {
        public long lifetimeVerifiedMeters;
        public long runnerGrowthPoints;
        public long pacerBondPoints;
        public long restorationPoints;
        public int strideLeapChargeMeters;
        public string lastDailyContractDate = string.Empty;
        public int monthlyVerifiedMeters;
        public string monthlyKey = string.Empty;
        public List<string> serverAcceptedFingerprints = new();

        public int EvolutionForm =>
            Math.Min(12, 1 + (int)(lifetimeVerifiedMeters / 100000));

        public bool ApplyServerAccepted(
            RunCandidate candidate,
            DateTimeOffset nowUtc,
            out bool dailyContractCompleted)
        {
            if (candidate == null)
            {
                throw new ArgumentNullException(nameof(candidate));
            }

            serverAcceptedFingerprints ??= new List<string>();
            if (serverAcceptedFingerprints.Contains(candidate.fingerprint))
            {
                dailyContractCompleted = false;
                return false;
            }

            var award = VerifiedRunGrowth.Calculate(candidate.distanceMeters);
            lifetimeVerifiedMeters += candidate.distanceMeters;
            runnerGrowthPoints += award.runnerGrowthPoints;
            pacerBondPoints += award.pacerBondPoints;
            restorationPoints += award.restorationPoints;
            strideLeapChargeMeters += award.strideLeapChargeMeters;

            var runTime = DateTimeOffset.FromUnixTimeMilliseconds(
                candidate.startedAtUnixMilliseconds);
            var contractDate = runTime.UtcDateTime.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            var completedToday = !string.Equals(
                lastDailyContractDate,
                contractDate,
                StringComparison.Ordinal);
            if (completedToday)
            {
                lastDailyContractDate = contractDate;
            }

            var monthKey = runTime.UtcDateTime.ToString("yyyy-MM", CultureInfo.InvariantCulture);
            if (!string.Equals(monthlyKey, monthKey, StringComparison.Ordinal))
            {
                monthlyKey = monthKey;
                monthlyVerifiedMeters = 0;
            }

            monthlyVerifiedMeters += candidate.distanceMeters;
            serverAcceptedFingerprints.Add(candidate.fingerprint);
            dailyContractCompleted = completedToday;
            return true;
        }

        public bool HasWorldCrown => monthlyVerifiedMeters >= 1000000;

        public int ConsumeStrideLeap(int requestedMeters)
        {
            var consumed = Math.Max(0, Math.Min(requestedMeters, strideLeapChargeMeters));
            strideLeapChargeMeters -= consumed;
            return consumed;
        }
    }
}
