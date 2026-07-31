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
        public void GpsVerificationDropsTeleportSegmentButKeepsRealTrack()
        {
            var start = 1785369600000L;
            var recovered = RunVerifier.VerifyGps(
                new[]
                {
                    Sample(37.56650, 126.98295, start),
                    Sample(37.56650, 126.98295, start + 10000),
                    Sample(37.56650, 126.97800, start + 12000),
                    Sample(37.56650, 126.97845, start + 42000),
                    Sample(37.56650, 126.97890, start + 72000),
                    Sample(37.56650, 126.97935, start + 102000),
                },
                "gps-location-reset",
                "CONT01-REG01-ROUTE01");

            Assert.That(recovered.IsVerified, Is.True, recovered.FailureCode);
            Assert.That(recovered.Candidate.distanceMeters, Is.InRange(115, 125));
            Assert.That(recovered.Candidate.movingSeconds, Is.EqualTo(90));
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
        public void HealthConnectDiscoveryPersistsPreviewUntilExplicitImport()
        {
            const string pendingKey = "runningup.v14.pending-health-runs";
            PlayerPrefs.DeleteKey(pendingKey);
            var objectUnderTest = new GameObject("HealthConnectDiscoveryTest");
            try
            {
                var bridge = objectUnderTest.AddComponent<V11AndroidRunBridge>();
                var statuses = new List<string>();
                bridge.StatusChanged += statuses.Add;
                bridge.OnHealthConnectPayload(
                    "[{\"sourceRecordId\":\"health-preview-1\"," +
                    "\"startedAtUnixMilliseconds\":1785369600000," +
                    "\"endedAtUnixMilliseconds\":1785371400000," +
                    "\"distanceMeters\":5000,\"movingSeconds\":1800," +
                    "\"title\":\"Morning Run\"}]");

                Assert.That(bridge.PendingHealthRunCount, Is.EqualTo(1));
                StringAssert.Contains("5.00 km", bridge.PendingHealthRunSummary);
                Assert.That(statuses, Does.Contain("health_runs_found:1"));
                Assert.That(
                    bridge.ImportPendingHealthRun(0),
                    Is.EqualTo("health_run_imported"));
                Assert.That(bridge.PendingHealthRunCount, Is.Zero);
                Assert.That(PlayerPrefs.HasKey(pendingKey), Is.False);
            }
            finally
            {
                PlayerPrefs.DeleteKey(pendingKey);
                UnityEngine.Object.DestroyImmediate(objectUnderTest);
            }
        }

        [Test]
        public void CompletedDirectGpsFileIgnoresControlRecordsAndRecoversRun()
        {
            var queuePath = Path.Combine(
                Application.persistentDataPath,
                "v11-pending-runs.json");
            var previousQueue = File.Exists(queuePath)
                ? File.ReadAllBytes(queuePath)
                : null;
            var path = Path.Combine(
                Path.GetTempPath(),
                $"direct-{Guid.NewGuid():N}.raw.ndjson");
            var objectUnderTest = new GameObject("CompletedDirectGpsRecoveryTest");
            try
            {
                var start = 1785369600000L;
                File.WriteAllLines(path, new[]
                {
                    JsonUtility.ToJson(Sample(37.56650, 126.97800, start)),
                    "{\"recordType\":\"CONTROL\",\"state\":\"PAUSED\"}",
                    JsonUtility.ToJson(Sample(
                        37.56695,
                        126.97800,
                        start + 30000)),
                    JsonUtility.ToJson(Sample(
                        37.56740,
                        126.97800,
                        start + 60000)),
                    JsonUtility.ToJson(Sample(
                        37.56785,
                        126.97800,
                        start + 90000)),
                    "{\"recordType\":\"CONTROL\",\"state\":\"FINISHED\"}",
                });

                var bridge = objectUnderTest.AddComponent<V11AndroidRunBridge>();
                VerifiedRunReceipt receipt = null;
                bridge.RunAccepted += value => receipt = value;
                bridge.OnDirectGpsFinished(path);

                Assert.That(receipt, Is.Not.Null);
                Assert.That(receipt.run.acceptedSampleCount, Is.EqualTo(4));
                Assert.That(receipt.run.distanceMeters, Is.InRange(140, 160));
            }
            finally
            {
                UnityEngine.Object.DestroyImmediate(objectUnderTest);
                if (File.Exists(path))
                {
                    File.Delete(path);
                }
                if (previousQueue == null)
                {
                    if (File.Exists(queuePath))
                    {
                        File.Delete(queuePath);
                    }
                }
                else
                {
                    File.WriteAllBytes(queuePath, previousQueue);
                }
            }
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
        public void CanonicalServerDuplicateClearsQueueWithoutApplyingGrowthAgain()
        {
            const string progressKey = "runningup.v11.runner-progress";
            var queuePath = Path.Combine(
                Application.persistentDataPath,
                "v11-pending-runs.json");
            var previousQueue = File.Exists(queuePath)
                ? File.ReadAllBytes(queuePath)
                : null;
            var previousQueueBackup = File.Exists(queuePath + ".bak")
                ? File.ReadAllBytes(queuePath + ".bak")
                : null;
            var previousQueueTemporary = File.Exists(queuePath + ".tmp")
                ? File.ReadAllBytes(queuePath + ".tmp")
                : null;
            var hadProgress = PlayerPrefs.HasKey(progressKey);
            var previousProgress = PlayerPrefs.GetString(progressKey, string.Empty);
            var objectUnderTest = new GameObject("CanonicalDuplicateTest");
            try
            {
                PlayerPrefs.DeleteKey(progressKey);
                foreach (var path in new[]
                {
                    queuePath,
                    queuePath + ".bak",
                    queuePath + ".tmp",
                })
                {
                    if (File.Exists(path))
                    {
                        File.Delete(path);
                    }
                }

                var runtime = objectUnderTest.AddComponent<V11RunRuntime>();
                var candidate = RunVerifier.VerifySummary(
                    RunSource.HealthConnect,
                    "health-same-run-as-direct-gps",
                    "CONT01-REG01-ROUTE01",
                    1785369600000L,
                    1785371400000L,
                    5000,
                    1800).Candidate;
                runtime.AcceptVerifiedRun(RunVerificationResult.Verified(candidate));

                var receipt = runtime.ConfirmServerAcceptedRun(
                    candidate,
                    true,
                    DateTimeOffset.UtcNow);

                Assert.That(receipt.duplicate, Is.True);
                Assert.That(receipt.awaitingServerConfirmation, Is.False);
                Assert.That(runtime.PendingUploadCount, Is.Zero);
                Assert.That(runtime.Progress.lifetimeVerifiedMeters, Is.Zero);
                Assert.That(runtime.Progress.runnerGrowthPoints, Is.Zero);
            }
            finally
            {
                UnityEngine.Object.DestroyImmediate(objectUnderTest);
                foreach (var path in new[]
                {
                    queuePath,
                    queuePath + ".bak",
                    queuePath + ".tmp",
                })
                {
                    if (File.Exists(path))
                    {
                        File.Delete(path);
                    }
                }
                if (previousQueue != null)
                {
                    File.WriteAllBytes(queuePath, previousQueue);
                }
                if (previousQueueBackup != null)
                {
                    File.WriteAllBytes(queuePath + ".bak", previousQueueBackup);
                }
                if (previousQueueTemporary != null)
                {
                    File.WriteAllBytes(queuePath + ".tmp", previousQueueTemporary);
                }
                if (hadProgress)
                {
                    PlayerPrefs.SetString(progressKey, previousProgress);
                }
                else
                {
                    PlayerPrefs.DeleteKey(progressKey);
                }
                PlayerPrefs.Save();
            }
        }

        [Test]
        public void SupabaseConfigAcceptsHostedHttpsAndExplicitLocalDevelopmentHosts()
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

                config.Configure("http://127.0.0.1:54321/", new string('p', 40));
                Assert.That(config.IsConfigured, Is.True);
                Assert.That(
                    config.RpcUrl("v13_bootstrap_profile"),
                    Is.EqualTo(
                        "http://127.0.0.1:54321/rest/v1/rpc/" +
                        "v13_bootstrap_profile"));

                config.Configure("http://10.0.2.2:54321", new string('p', 40));
                Assert.That(config.IsConfigured, Is.True);
                config.Configure("http://192.168.0.10:54321", new string('p', 40));
                Assert.That(config.IsConfigured, Is.False);
                config.Configure("http://10.0.2.2:54321/path", new string('p', 40));
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
        public void SupabaseUploadPolicySeparatesRefreshRetryAndIntervention()
        {
            Assert.That(
                V11SupabaseUploadContract.Classify(
                    UnityWebRequest.Result.Success,
                    200),
                Is.EqualTo(SupabaseUploadDisposition.Accepted));
            Assert.That(
                V11SupabaseUploadContract.Classify(
                    UnityWebRequest.Result.ProtocolError,
                    401),
                Is.EqualTo(SupabaseUploadDisposition.RefreshSession));
            Assert.That(
                V11SupabaseUploadContract.Classify(
                    UnityWebRequest.Result.ConnectionError,
                    0),
                Is.EqualTo(SupabaseUploadDisposition.Retry));
            Assert.That(
                V11SupabaseUploadContract.Classify(
                    UnityWebRequest.Result.ProtocolError,
                    429),
                Is.EqualTo(SupabaseUploadDisposition.Retry));
            Assert.That(
                V11SupabaseUploadContract.Classify(
                    UnityWebRequest.Result.ProtocolError,
                    400),
                Is.EqualTo(SupabaseUploadDisposition.InterventionRequired));
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
