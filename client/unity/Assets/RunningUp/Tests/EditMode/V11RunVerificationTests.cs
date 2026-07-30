// V11 러닝 검증, 파일 수집, 성장 배분, 오프라인 중복 방지를 회귀 검증한다.
using System;
using System.Collections.Generic;
using System.IO;
using NUnit.Framework;
using RunningUp.RunVerification;
using UnityEngine;
using UnityEngine.Networking;

namespace RunningUp.Tests.EditMode
{
    public sealed class V11RunVerificationTests
    {
        [Test]
        public void GpsVerificationRejectsJumpAndAcceptsRunningTrack()
        {
            var start = 1785369600000L;
            var valid = new[]
            {
                Sample(37.56650, 126.97800, start),
                Sample(37.56695, 126.97800, start + 30000),
                Sample(37.56740, 126.97800, start + 60000),
                Sample(37.56785, 126.97800, start + 90000),
            };
            var accepted = RunVerifier.VerifyGps(valid, "gps-valid", "CONT01-REG01-ROUTE01");
            Assert.That(accepted.IsVerified, Is.True, accepted.FailureCode);
            Assert.That(accepted.Candidate.distanceMeters, Is.InRange(140, 160));

            var jump = new[]
            {
                Sample(37.56650, 126.97800, start),
                Sample(37.66650, 126.97800, start + 1000),
                Sample(37.66660, 126.97800, start + 2000),
            };
            var rejected = RunVerifier.VerifyGps(jump, "gps-jump", "CONT01-REG01-ROUTE01");
            Assert.That(rejected.IsVerified, Is.False);
            Assert.That(rejected.FailureCode, Is.EqualTo("GPS_SPEED_JUMP"));
        }

        [Test]
        public void VerifiedDistanceIsOnlyPermanentGrowthSource()
        {
            var award = VerifiedRunGrowth.Calculate(5000);
            Assert.That(award.runnerGrowthPoints, Is.EqualTo(425));
            Assert.That(award.pacerBondPoints, Is.EqualTo(50));
            Assert.That(award.restorationPoints, Is.EqualTo(25));
            Assert.That(award.TotalPoints, Is.EqualTo(500));
            Assert.That(
                award.runnerGrowthPoints / (double)award.TotalPoints,
                Is.EqualTo(0.85).Within(0.00001));
        }

        [Test]
        public void GpxTcxAndFitImportProduceVerifiedCandidates()
        {
            const string gpx = @"
                <gpx version=""1.1"">
                  <trk><trkseg>
                    <trkpt lat=""37.56650"" lon=""126.97800""><time>2026-07-30T00:00:00Z</time></trkpt>
                    <trkpt lat=""37.56695"" lon=""126.97800""><time>2026-07-30T00:00:30Z</time></trkpt>
                    <trkpt lat=""37.56740"" lon=""126.97800""><time>2026-07-30T00:01:00Z</time></trkpt>
                    <trkpt lat=""37.56785"" lon=""126.97800""><time>2026-07-30T00:01:30Z</time></trkpt>
                  </trkseg></trk>
                </gpx>";
            var gpxResult = TrackFileImporter.ImportGpx(
                gpx,
                "gpx-1",
                "CONT01-REG01-ROUTE01");
            Assert.That(gpxResult.IsVerified, Is.True, gpxResult.FailureCode);
            Assert.That(gpxResult.Candidate.source, Is.EqualTo(RunSource.Gpx));

            const string tcx = @"
                <TrainingCenterDatabase>
                  <Activities><Activity><Id>2026-07-30T00:00:00Z</Id>
                    <Lap><TotalTimeSeconds>1800</TotalTimeSeconds>
                    <DistanceMeters>5000</DistanceMeters></Lap>
                  </Activity></Activities>
                </TrainingCenterDatabase>";
            var tcxResult = TrackFileImporter.ImportTcx(
                tcx,
                "tcx-1",
                "CONT01-REG01-ROUTE01");
            Assert.That(tcxResult.IsVerified, Is.True, tcxResult.FailureCode);
            Assert.That(tcxResult.Candidate.distanceMeters, Is.EqualTo(5000));

            var fitResult = TrackFileImporter.ImportFit(
                BuildFitSession(1000000000, 1800000, 500000),
                "fit-1",
                "CONT01-REG01-ROUTE01");
            Assert.That(fitResult.IsVerified, Is.True, fitResult.FailureCode);
            Assert.That(fitResult.Candidate.distanceMeters, Is.EqualTo(5000));
        }

        [Test]
        public void OfflineQueueIsIdempotentAndRecoverable()
        {
            var path = Path.Combine(
                Path.GetTempPath(),
                $"runningup-v11-queue-{Guid.NewGuid():N}.json");
            try
            {
                var candidate = RunVerifier.VerifySummary(
                    RunSource.HealthConnect,
                    "health-1",
                    "CONT01-REG01-ROUTE01",
                    1785369600000L,
                    1785371400000L,
                    5000,
                    1800).Candidate;
                var queue = new OfflineRunQueue(path);
                Assert.That(queue.Enqueue(candidate), Is.True);
                Assert.That(queue.Enqueue(candidate), Is.False);
                Assert.That(queue.Items.Count, Is.EqualTo(1));

                var recovered = new OfflineRunQueue(path);
                Assert.That(recovered.Items.Count, Is.EqualTo(1));
                recovered.MarkFailed(
                    candidate.fingerprint,
                    "offline",
                    DateTimeOffset.FromUnixTimeMilliseconds(1785371400000L));
                Assert.That(recovered.Items[0].attemptCount, Is.EqualTo(1));
                Assert.That(recovered.Acknowledge(candidate.fingerprint), Is.True);
                Assert.That(recovered.Items.Count, Is.Zero);
            }
            finally
            {
                if (File.Exists(path))
                {
                    File.Delete(path);
                }
            }
        }

        [Test]
        public void OfflineQueueRecoversFromAtomicBackupAfterPrimaryCorruption()
        {
            var path = Path.Combine(
                Path.GetTempPath(),
                $"runningup-v11-queue-backup-{Guid.NewGuid():N}.json");
            try
            {
                var candidate = RunVerifier.VerifySummary(
                    RunSource.Gpx,
                    "gpx-backup",
                    "CONT01-REG01-ROUTE01",
                    1785369600000L,
                    1785371400000L,
                    5000,
                    1800).Candidate;
                var queue = new OfflineRunQueue(path);
                Assert.That(queue.Enqueue(candidate), Is.True);
                queue.MarkFailed(
                    candidate.fingerprint,
                    "offline",
                    DateTimeOffset.FromUnixTimeMilliseconds(1785371400000L));

                File.WriteAllText(path, "{corrupted");
                var recovered = new OfflineRunQueue(path);
                Assert.That(recovered.Items.Count, Is.EqualTo(1));
                Assert.That(
                    recovered.Items[0].candidate.fingerprint,
                    Is.EqualTo(candidate.fingerprint));
            }
            finally
            {
                foreach (var suffix in new[] { string.Empty, ".bak", ".tmp" })
                {
                    var candidatePath = path + suffix;
                    if (File.Exists(candidatePath))
                    {
                        File.Delete(candidatePath);
                    }
                }
            }
        }

        [Test]
        public void DailyContractCompletesOnceWhileAdditionalRunsStillReward()
        {
            var state = new RunnerProgressState();
            var first = RunVerifier.VerifySummary(
                RunSource.HealthConnect,
                "health-first",
                "CONT01-REG01-ROUTE01",
                1785369600000L,
                1785371400000L,
                5000,
                1800,
                3,
                6f).Candidate;
            var second = RunVerifier.VerifySummary(
                RunSource.Gpx,
                "gpx-second",
                "CONT01-REG01-ROUTE01",
                1785380400000L,
                1785381120000L,
                2000,
                720).Candidate;

            Assert.That(
                state.ApplyServerAccepted(first, DateTimeOffset.UtcNow, out var firstDaily),
                Is.True);
            Assert.That(firstDaily, Is.True);
            Assert.That(
                state.ApplyServerAccepted(second, DateTimeOffset.UtcNow, out var secondDaily),
                Is.True);
            Assert.That(secondDaily, Is.False);
            Assert.That(state.lifetimeVerifiedMeters, Is.EqualTo(7000));
            Assert.That(state.runnerGrowthPoints, Is.EqualTo(595));
            Assert.That(state.monthlyVerifiedMeters, Is.EqualTo(7000));
        }

        [Test]
        public void ServerAcceptedProgressIsIdempotentAfterLocalRestart()
        {
            var state = new RunnerProgressState();
            var candidate = RunVerifier.VerifySummary(
                RunSource.DirectGps,
                "gps-server-idempotent",
                "CONT01-REG01-ROUTE01",
                1785369600000L,
                1785371400000L,
                5000,
                1800,
                3,
                6f).Candidate;

            Assert.That(
                state.ApplyServerAccepted(candidate, DateTimeOffset.UtcNow, out _),
                Is.True);
            Assert.That(
                state.ApplyServerAccepted(candidate, DateTimeOffset.UtcNow, out _),
                Is.False);
            Assert.That(state.lifetimeVerifiedMeters, Is.EqualTo(5000));
            Assert.That(state.runnerGrowthPoints, Is.EqualTo(425));
        }

        [Test]
        public void SupabaseConfigAcceptsOnlyHttpsProjectHosts()
        {
            var objectUnderTest = new GameObject("SupabaseConfigTest");
            try
            {
                var config = objectUnderTest.AddComponent<V11SupabaseRuntimeConfig>();
                config.Configure(
                    "https://runningup-demo.supabase.co/",
                    new string('p', 40));
                Assert.That(config.IsConfigured, Is.True);
                Assert.That(
                    config.RpcUrl("ingest_verified_run"),
                    Is.EqualTo(
                        "https://runningup-demo.supabase.co/rest/v1/rpc/" +
                        "ingest_verified_run"));

                config.Configure("http://runningup-demo.supabase.co", new string('p', 40));
                Assert.That(config.IsConfigured, Is.False);
                config.Configure("https://example.com", new string('p', 40));
                Assert.That(config.IsConfigured, Is.False);
            }
            finally
            {
                UnityEngine.Object.DestroyImmediate(objectUnderTest);
            }
        }

        [Test]
        public void SupabaseRpcPayloadAndResponsePreserveIdempotencyFields()
        {
            var candidate = RunVerifier.VerifySummary(
                RunSource.HealthConnect,
                "health-rpc-contract",
                "CONT01-REG01-ROUTE01",
                1785369600000L,
                1785371400000L,
                5000,
                1800).Candidate;
            var json = V11SupabaseUploadContract.BuildJson(candidate);
            StringAssert.Contains("\"p_source\":\"health_connect\"", json);
            StringAssert.Contains(
                $"\"p_fingerprint\":\"{candidate.fingerprint}\"",
                json);
            StringAssert.Contains("\"p_distance_m\":5000", json);
            StringAssert.Contains("\"accepted_sample_count\":0", json);

            const string responseJson =
                "[{\"run_id\":\"11111111-1111-4111-8111-111111111111\"," +
                "\"duplicate\":false,\"daily_contract_completed\":true," +
                "\"runner_growth_points\":425,\"pacer_bond_points\":50," +
                "\"restoration_points\":25,\"monthly_verified_m\":5000," +
                "\"world_crown\":false}]";
            Assert.That(
                V11SupabaseUploadContract.TryParseResponse(
                    responseJson,
                    out var response),
                Is.True);
            Assert.That(response.runner_growth_points, Is.EqualTo(425));
            Assert.That(response.daily_contract_completed, Is.True);
        }

        [Test]
        public void SupabaseUploadPolicySeparatesRefreshRetryDuplicateAndAbandon()
        {
            Assert.That(
                V11SupabaseUploadContract.Classify(
                    UnityWebRequest.Result.Success,
                    200),
                Is.EqualTo(UploadDisposition.Accepted));
            Assert.That(
                V11SupabaseUploadContract.Classify(
                    UnityWebRequest.Result.ProtocolError,
                    401),
                Is.EqualTo(UploadDisposition.RefreshSession));
            // ingest_verified_run의 AUTH_REQUIRED는 errcode 42501이고 PostgREST는
            // 이를 403으로 매핑한다. 401만 보던 규칙은 이 경로에서 세션을 절대
            // 갱신하지 못했다.
            Assert.That(
                V11SupabaseUploadContract.Classify(
                    UnityWebRequest.Result.ProtocolError,
                    403),
                Is.EqualTo(UploadDisposition.RefreshSession));
            Assert.That(
                V11SupabaseUploadContract.Classify(
                    UnityWebRequest.Result.ConnectionError,
                    0),
                Is.EqualTo(UploadDisposition.Retry));
            Assert.That(
                V11SupabaseUploadContract.Classify(
                    UnityWebRequest.Result.ProtocolError,
                    429),
                Is.EqualTo(UploadDisposition.Retry));
            Assert.That(
                V11SupabaseUploadContract.Classify(
                    UnityWebRequest.Result.ProtocolError,
                    400),
                Is.EqualTo(UploadDisposition.Abandon));
            // 서버가 이미 러닝을 가지고 있으면 성공이다. 재시도하면 영원히 실패한다.
            Assert.That(
                V11SupabaseUploadContract.Classify(
                    UnityWebRequest.Result.ProtocolError,
                    409),
                Is.EqualTo(UploadDisposition.AlreadyStored));
            Assert.That(
                V11SupabaseUploadContract.Classify(
                    UnityWebRequest.Result.ProtocolError,
                    400,
                    "{\"code\":\"23505\",\"details\":\"Key already exists.\"}"),
                Is.EqualTo(UploadDisposition.AlreadyStored));
        }

        // 이전 구현은 첫 실패에서 배치를 끊었다. 영구 거절된 러닝 하나가 언제나
        // 가장 오래된 항목으로 남아 이후 모든 러닝을 영구히 막았다.
        [Test]
        public void OnlyAnAuthenticationFailureStopsTheUploadBatch()
        {
            Assert.That(
                V11UploadPolicy.StopsBatch(UploadDisposition.RefreshSession),
                Is.True);
            Assert.That(V11UploadPolicy.StopsBatch(UploadDisposition.Abandon), Is.False);
            Assert.That(V11UploadPolicy.StopsBatch(UploadDisposition.Retry), Is.False);
            Assert.That(
                V11UploadPolicy.StopsBatch(UploadDisposition.AlreadyStored),
                Is.False);
        }

        [Test]
        public void OfflineQueueAbandonsARunOnceTheRetryCapIsReached()
        {
            var path = Path.Combine(
                Path.GetTempPath(),
                $"v11-abandon-{Guid.NewGuid():N}.json");
            try
            {
                var queue = new OfflineRunQueue(path);
                var candidate = RunVerifier.VerifySummary(
                    RunSource.Gpx,
                    "abandon-source",
                    "CONT01-REG01-ROUTE01",
                    1785369600000L,
                    1785371400000L,
                    5000,
                    1800).Candidate;
                Assert.That(queue.Enqueue(candidate), Is.True);

                var now = DateTimeOffset.FromUnixTimeMilliseconds(1785371400000L);
                var abandoned = false;
                for (var attempt = 0;
                     attempt < V11UploadPolicy.MaxTransientAttempts;
                     attempt++)
                {
                    abandoned = queue.MarkFailed(
                        candidate.fingerprint,
                        "NETWORK_RETRY",
                        now);
                }

                Assert.That(abandoned, Is.True);
                Assert.That(queue.Items.Count, Is.EqualTo(0));
                Assert.That(queue.Abandoned.Count, Is.EqualTo(1));
                Assert.That(
                    queue.Abandoned[0].candidate.fingerprint,
                    Is.EqualTo(candidate.fingerprint));
            }
            finally
            {
                File.Delete(path);
                File.Delete(path + ".bak");
            }
        }

        // 인증 실패로 backoff가 걸린 채 재로그인하면, 최대 30분을 기다리지 않고
        // 즉시 다시 시도할 수 있어야 한다.
        [Test]
        public void RestoringTheSessionClearsTheQueueBackoff()
        {
            var path = Path.Combine(
                Path.GetTempPath(),
                $"v11-backoff-{Guid.NewGuid():N}.json");
            try
            {
                var queue = new OfflineRunQueue(path);
                var candidate = RunVerifier.VerifySummary(
                    RunSource.Gpx,
                    "backoff-source",
                    "CONT01-REG01-ROUTE01",
                    1785369600000L,
                    1785371400000L,
                    5000,
                    1800).Candidate;
                queue.Enqueue(candidate);

                var now = DateTimeOffset.FromUnixTimeMilliseconds(1785371400000L);
                queue.MarkFailed(candidate.fingerprint, "AUTHENTICATION_REQUIRED", now);
                Assert.That(queue.Ready(now).Count, Is.EqualTo(0));

                Assert.That(queue.ResetBackoff(), Is.EqualTo(1));
                Assert.That(queue.Ready(now).Count, Is.EqualTo(1));
            }
            finally
            {
                File.Delete(path);
                File.Delete(path + ".bak");
            }
        }

        [Test]
        public void SupabaseSessionTokenStaysInMemoryAndExpiresSafely()
        {
            var objectUnderTest = new GameObject("SupabaseSessionTest");
            try
            {
                var session = objectUnderTest.AddComponent<V11SupabaseSessionRuntime>();
                session.SetSession(
                    "access-token-for-test",
                    "refresh-token-for-test",
                    DateTimeOffset.UtcNow.AddHours(1).ToUnixTimeSeconds());
                Assert.That(session.TryGetAccessToken(out var token), Is.True);
                Assert.That(token, Is.EqualTo("access-token-for-test"));

                session.ClearSession();
                Assert.That(session.TryGetAccessToken(out _), Is.False);
            }
            finally
            {
                UnityEngine.Object.DestroyImmediate(objectUnderTest);
            }
        }

        private static GpsSample Sample(
            double latitude,
            double longitude,
            long unixTimeMilliseconds) =>
            new()
            {
                latitude = latitude,
                longitude = longitude,
                unixTimeMilliseconds = unixTimeMilliseconds,
                accuracyMeters = 6f,
            };

        private static byte[] BuildFitSession(
            uint startTimestamp,
            uint elapsedMilliseconds,
            uint distanceCentimeters)
        {
            var data = new List<byte>
            {
                0x40,
                0x00,
                0x00,
                18,
                0,
                3,
                2,
                4,
                0x86,
                7,
                4,
                0x86,
                9,
                4,
                0x86,
                0x00,
            };
            WriteUInt32(data, startTimestamp);
            WriteUInt32(data, elapsedMilliseconds);
            WriteUInt32(data, distanceCentimeters);

            var bytes = new List<byte>
            {
                14,
                0x20,
                0,
                0,
            };
            WriteUInt32(bytes, (uint)data.Count);
            bytes.AddRange(new byte[] { 0x2e, 0x46, 0x49, 0x54, 0, 0 });
            bytes.AddRange(data);
            bytes.AddRange(new byte[] { 0, 0 });
            return bytes.ToArray();
        }

        private static void WriteUInt32(ICollection<byte> bytes, uint value)
        {
            bytes.Add((byte)(value & 0xff));
            bytes.Add((byte)(value >> 8 & 0xff));
            bytes.Add((byte)(value >> 16 & 0xff));
            bytes.Add((byte)(value >> 24 & 0xff));
        }
    }
}
