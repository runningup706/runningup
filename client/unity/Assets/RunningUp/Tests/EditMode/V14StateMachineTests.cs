// V14 네 상태머신의 정상 경로, 금지 전환, 중복 안전성, 재실행 복구를 검증한다.
using System;
using System.IO;
using NUnit.Framework;
using RunningUp.V14.State;

namespace RunningUp.Tests.EditMode
{
    public sealed class V14StateMachineTests
    {
        [Test]
        public void TrainingFlowCompletesAndDuplicateTransitionIsNoOp()
        {
            var flow = V14FlowFactory.Training();
            foreach (var state in new[]
                     {
                         V14TrainingState.CONFIGURE,
                         V14TrainingState.SENSOR_CHECK,
                         V14TrainingState.READY,
                         V14TrainingState.COUNTDOWN,
                         V14TrainingState.ACTIVE,
                         V14TrainingState.PAUSED,
                         V14TrainingState.RESUMED,
                         V14TrainingState.ACTIVE,
                         V14TrainingState.FINISH_REQUESTED,
                         V14TrainingState.VERIFYING,
                         V14TrainingState.RESULT,
                         V14TrainingState.SERVER_SYNCED,
                         V14TrainingState.REWARDED,
                     })
            {
                Assert.That(flow.Move(state), Is.True);
            }

            Assert.That(flow.Move(V14TrainingState.REWARDED), Is.False);
        }

        [Test]
        public void RaceReconnectAndRewardFlowIsExplicit()
        {
            var flow = V14FlowFactory.Race();
            foreach (var state in new[]
                     {
                         V14RaceState.MATCHMAKING,
                         V14RaceState.MATCH_FOUND,
                         V14RaceState.LOBBY,
                         V14RaceState.READY,
                         V14RaceState.SERVER_COUNTDOWN,
                         V14RaceState.ACTIVE,
                         V14RaceState.CONNECTION_LOST,
                         V14RaceState.RECONNECTING,
                         V14RaceState.ACTIVE,
                         V14RaceState.FINISH_PENDING,
                         V14RaceState.VERIFYING,
                         V14RaceState.FINALIZED,
                         V14RaceState.REWARDED,
                     })
            {
                Assert.That(flow.Move(state), Is.True);
            }
        }

        [Test]
        public void RaceCountdownCanRecoverAfterLocationPermissionInterruption()
        {
            var flow = V14FlowFactory.Race();
            foreach (var state in new[]
                     {
                         V14RaceState.MATCHMAKING,
                         V14RaceState.MATCH_FOUND,
                         V14RaceState.LOBBY,
                         V14RaceState.READY,
                         V14RaceState.SERVER_COUNTDOWN,
                         V14RaceState.CONNECTION_LOST,
                         V14RaceState.RECONNECTING,
                         V14RaceState.ACTIVE,
                     })
            {
                Assert.That(flow.Move(state), Is.True);
            }
        }

        [Test]
        public void StoreCannotEquipBeforeServerPurchase()
        {
            var flow = V14FlowFactory.Store();
            flow.Move(V14StoreState.ITEM_DETAIL);
            Assert.Throws<InvalidOperationException>(
                () => flow.Move(V14StoreState.EQUIPPED));
        }

        [Test]
        public void SyncFlowRequiresCanonicalDuplicateAndServerStages()
        {
            var flow = V14FlowFactory.Sync();
            foreach (var state in new[]
                     {
                         V14SyncState.DISCOVERING,
                         V14SyncState.NEW_RUN_FOUND,
                         V14SyncState.PREVIEW,
                         V14SyncState.IMPORT_REQUESTED,
                         V14SyncState.CANONICALIZING,
                         V14SyncState.DUPLICATE_CHECK,
                         V14SyncState.VERIFYING,
                         V14SyncState.SERVER_ACCEPTED,
                         V14SyncState.GAME_PROGRESS_APPLIED,
                         V14SyncState.RESULT,
                     })
            {
                Assert.That(flow.Move(state), Is.True);
            }
        }

        [Test]
        public void DuplicateSyncCanFinishWithoutGrantingServerProgressAgain()
        {
            var flow = V14FlowFactory.Sync();
            foreach (var state in new[]
                     {
                         V14SyncState.DISCOVERING,
                         V14SyncState.NEW_RUN_FOUND,
                         V14SyncState.PREVIEW,
                         V14SyncState.IMPORT_REQUESTED,
                         V14SyncState.CANONICALIZING,
                         V14SyncState.DUPLICATE_CHECK,
                         V14SyncState.VERIFYING,
                         V14SyncState.RESULT,
                     })
            {
                Assert.That(flow.Move(state), Is.True);
            }
        }

        [Test]
        public void JournalRestoresLastCompleteAtomicWrite()
        {
            var path = Path.Combine(
                Path.GetTempPath(),
                $"runningup-v14-state-{Guid.NewGuid():N}.json");
            try
            {
                var journal = new V14StateJournal(path);
                var snapshot = new V14FlowSnapshot
                {
                    training = V14TrainingState.ACTIVE.ToString(),
                    trainingSessionId = Guid.NewGuid().ToString(),
                    pendingIdempotencyKey = $"v14:test:{Guid.NewGuid():N}",
                    accountLevel = 7,
                    accountXp = 1234,
                    runCoins = 88,
                    gems = 3,
                    accountSummaryLoaded = true,
                    lastVerifiedRunId = Guid.NewGuid().ToString(),
                    lastVerifiedDistanceMeters = 5000,
                    lastVerifiedMovingSeconds = 1500,
                    activeRouteId = "CONT01-REG01-ROUTE01",
                    activeRouteProgressMeters = 6420,
                    activeRouteTargetMeters = 10000,
                    activeRouteLoaded = true,
                    crewId = Guid.NewGuid().ToString(),
                    crewName = "Morning Striders",
                    crewRole = "OWNER",
                    crewMemberCount = 4,
                    crewLoaded = true,
                };
                snapshot.Touch(DateTimeOffset.UtcNow);
                journal.Save(snapshot);

                var restored = journal.Load();
                Assert.That(restored.training, Is.EqualTo("ACTIVE"));
                Assert.That(
                    restored.trainingSessionId,
                    Is.EqualTo(snapshot.trainingSessionId));
                Assert.That(
                    restored.pendingIdempotencyKey,
                    Is.EqualTo(snapshot.pendingIdempotencyKey));
                Assert.That(restored.accountLevel, Is.EqualTo(7));
                Assert.That(restored.accountXp, Is.EqualTo(1234));
                Assert.That(restored.runCoins, Is.EqualTo(88));
                Assert.That(restored.gems, Is.EqualTo(3));
                Assert.That(restored.accountSummaryLoaded, Is.True);
                Assert.That(
                    restored.lastVerifiedRunId,
                    Is.EqualTo(snapshot.lastVerifiedRunId));
                Assert.That(restored.lastVerifiedDistanceMeters, Is.EqualTo(5000));
                Assert.That(restored.lastVerifiedMovingSeconds, Is.EqualTo(1500));
                Assert.That(restored.activeRouteId, Is.EqualTo("CONT01-REG01-ROUTE01"));
                Assert.That(restored.activeRouteProgressMeters, Is.EqualTo(6420));
                Assert.That(restored.activeRouteTargetMeters, Is.EqualTo(10000));
                Assert.That(restored.activeRouteLoaded, Is.True);
                Assert.That(restored.crewId, Is.EqualTo(snapshot.crewId));
                Assert.That(restored.crewName, Is.EqualTo("Morning Striders"));
                Assert.That(restored.crewRole, Is.EqualTo("OWNER"));
                Assert.That(restored.crewMemberCount, Is.EqualTo(4));
                Assert.That(restored.crewLoaded, Is.True);
            }
            finally
            {
                foreach (var suffix in new[] { string.Empty, ".bak", ".tmp" })
                {
                    if (File.Exists(path + suffix))
                    {
                        File.Delete(path + suffix);
                    }
                }
            }
        }
    }
}
