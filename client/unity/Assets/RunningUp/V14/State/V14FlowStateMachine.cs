// V14 훈련·대전·동기화·상점 흐름의 허용 전환과 중복 호출 안전성을 정의한다.
using System;
using System.Collections.Generic;

namespace RunningUp.V14.State
{
    public enum V14TrainingState
    {
        SELECT,
        CONFIGURE,
        SENSOR_CHECK,
        READY,
        COUNTDOWN,
        ACTIVE,
        PAUSED,
        RESUMED,
        FINISH_REQUESTED,
        VERIFYING,
        RESULT,
        SERVER_SYNCED,
        REWARDED,
    }

    public enum V14RaceState
    {
        BROWSE,
        MATCHMAKING,
        MATCH_FOUND,
        LOBBY,
        READY,
        SERVER_COUNTDOWN,
        ACTIVE,
        CONNECTION_LOST,
        RECONNECTING,
        FINISH_PENDING,
        VERIFYING,
        FINALIZED,
        REWARDED,
    }

    public enum V14SyncState
    {
        CONNECTION_CHECK,
        DISCOVERING,
        NEW_RUN_FOUND,
        PREVIEW,
        IMPORT_REQUESTED,
        CANONICALIZING,
        DUPLICATE_CHECK,
        VERIFYING,
        SERVER_ACCEPTED,
        GAME_PROGRESS_APPLIED,
        RESULT,
    }

    public enum V14StoreState
    {
        BROWSE,
        ITEM_DETAIL,
        PRICE_CHECK,
        PURCHASE_PENDING,
        SERVER_PURCHASED,
        INVENTORY_ADDED,
        EQUIPPED,
        APPEARANCE_UPDATED,
        PERSISTED,
    }

    public sealed class V14FlowStateMachine<TState>
        where TState : struct, Enum
    {
        private readonly IReadOnlyDictionary<TState, HashSet<TState>> transitions;

        public V14FlowStateMachine(
            TState initialState,
            IReadOnlyDictionary<TState, HashSet<TState>> allowedTransitions)
        {
            Current = initialState;
            transitions = allowedTransitions ??
                throw new ArgumentNullException(nameof(allowedTransitions));
        }

        public TState Current { get; private set; }
        public event Action<TState, TState> Changed;

        public bool CanMove(TState next) =>
            EqualityComparer<TState>.Default.Equals(Current, next) ||
            transitions.TryGetValue(Current, out var allowed) &&
            allowed.Contains(next);

        public bool Move(TState next)
        {
            if (EqualityComparer<TState>.Default.Equals(Current, next))
            {
                return false;
            }
            if (!CanMove(next))
            {
                throw new InvalidOperationException(
                    $"V14_INVALID_TRANSITION:{Current}->{next}");
            }

            var previous = Current;
            Current = next;
            Changed?.Invoke(previous, next);
            return true;
        }

        public void Restore(TState savedState)
        {
            Current = savedState;
        }
    }

    public static class V14FlowFactory
    {
        public static V14FlowStateMachine<V14TrainingState> Training(
            V14TrainingState initial = V14TrainingState.SELECT) =>
            new(initial, Map(
                Link(V14TrainingState.SELECT, V14TrainingState.CONFIGURE),
                Link(V14TrainingState.CONFIGURE, V14TrainingState.SENSOR_CHECK),
                Link(V14TrainingState.SENSOR_CHECK, V14TrainingState.READY),
                Link(
                    V14TrainingState.READY,
                    V14TrainingState.SENSOR_CHECK,
                    V14TrainingState.COUNTDOWN),
                Link(V14TrainingState.COUNTDOWN, V14TrainingState.ACTIVE),
                Link(
                    V14TrainingState.ACTIVE,
                    V14TrainingState.PAUSED,
                    V14TrainingState.FINISH_REQUESTED),
                Link(
                    V14TrainingState.PAUSED,
                    V14TrainingState.RESUMED,
                    V14TrainingState.FINISH_REQUESTED),
                Link(
                    V14TrainingState.RESUMED,
                    V14TrainingState.ACTIVE,
                    V14TrainingState.PAUSED,
                    V14TrainingState.FINISH_REQUESTED),
                Link(V14TrainingState.FINISH_REQUESTED, V14TrainingState.VERIFYING),
                Link(V14TrainingState.VERIFYING, V14TrainingState.RESULT),
                Link(V14TrainingState.RESULT, V14TrainingState.SERVER_SYNCED),
                Link(V14TrainingState.SERVER_SYNCED, V14TrainingState.REWARDED),
                Link(V14TrainingState.REWARDED, V14TrainingState.SELECT)));

        public static V14FlowStateMachine<V14RaceState> Race(
            V14RaceState initial = V14RaceState.BROWSE) =>
            new(initial, Map(
                Link(V14RaceState.BROWSE, V14RaceState.MATCHMAKING),
                Link(
                    V14RaceState.MATCHMAKING,
                    V14RaceState.MATCH_FOUND,
                    V14RaceState.BROWSE),
                Link(V14RaceState.MATCH_FOUND, V14RaceState.LOBBY),
                Link(V14RaceState.LOBBY, V14RaceState.READY),
                Link(V14RaceState.READY, V14RaceState.SERVER_COUNTDOWN),
                Link(
                    V14RaceState.SERVER_COUNTDOWN,
                    V14RaceState.ACTIVE,
                    V14RaceState.CONNECTION_LOST),
                Link(
                    V14RaceState.ACTIVE,
                    V14RaceState.CONNECTION_LOST,
                    V14RaceState.FINISH_PENDING),
                Link(V14RaceState.CONNECTION_LOST, V14RaceState.RECONNECTING),
                Link(
                    V14RaceState.RECONNECTING,
                    V14RaceState.ACTIVE,
                    V14RaceState.FINISH_PENDING),
                Link(V14RaceState.FINISH_PENDING, V14RaceState.VERIFYING),
                Link(V14RaceState.VERIFYING, V14RaceState.FINALIZED),
                Link(V14RaceState.FINALIZED, V14RaceState.REWARDED),
                Link(V14RaceState.REWARDED, V14RaceState.BROWSE)));

        public static V14FlowStateMachine<V14SyncState> Sync(
            V14SyncState initial = V14SyncState.CONNECTION_CHECK) =>
            new(initial, Map(
                Link(V14SyncState.CONNECTION_CHECK, V14SyncState.DISCOVERING),
                Link(
                    V14SyncState.DISCOVERING,
                    V14SyncState.NEW_RUN_FOUND,
                    V14SyncState.RESULT),
                Link(V14SyncState.NEW_RUN_FOUND, V14SyncState.PREVIEW),
                Link(V14SyncState.PREVIEW, V14SyncState.IMPORT_REQUESTED),
                Link(V14SyncState.IMPORT_REQUESTED, V14SyncState.CANONICALIZING),
                Link(V14SyncState.CANONICALIZING, V14SyncState.DUPLICATE_CHECK),
                Link(V14SyncState.DUPLICATE_CHECK, V14SyncState.VERIFYING),
                Link(
                    V14SyncState.VERIFYING,
                    V14SyncState.SERVER_ACCEPTED,
                    V14SyncState.RESULT),
                Link(
                    V14SyncState.SERVER_ACCEPTED,
                    V14SyncState.GAME_PROGRESS_APPLIED),
                Link(V14SyncState.GAME_PROGRESS_APPLIED, V14SyncState.RESULT),
                Link(V14SyncState.RESULT, V14SyncState.CONNECTION_CHECK)));

        public static V14FlowStateMachine<V14StoreState> Store(
            V14StoreState initial = V14StoreState.BROWSE) =>
            new(initial, Map(
                Link(V14StoreState.BROWSE, V14StoreState.ITEM_DETAIL),
                Link(
                    V14StoreState.ITEM_DETAIL,
                    V14StoreState.PRICE_CHECK,
                    V14StoreState.BROWSE),
                Link(V14StoreState.PRICE_CHECK, V14StoreState.PURCHASE_PENDING),
                Link(
                    V14StoreState.PURCHASE_PENDING,
                    V14StoreState.SERVER_PURCHASED,
                    V14StoreState.ITEM_DETAIL),
                Link(
                    V14StoreState.SERVER_PURCHASED,
                    V14StoreState.INVENTORY_ADDED),
                Link(V14StoreState.INVENTORY_ADDED, V14StoreState.EQUIPPED),
                Link(V14StoreState.EQUIPPED, V14StoreState.APPEARANCE_UPDATED),
                Link(V14StoreState.APPEARANCE_UPDATED, V14StoreState.PERSISTED),
                Link(V14StoreState.PERSISTED, V14StoreState.BROWSE)));

        private static KeyValuePair<TState, HashSet<TState>> Link<TState>(
            TState from,
            params TState[] to)
            where TState : struct, Enum =>
            new(from, new HashSet<TState>(to));

        private static IReadOnlyDictionary<TState, HashSet<TState>> Map<TState>(
            params KeyValuePair<TState, HashSet<TState>>[] links)
            where TState : struct, Enum
        {
            var result = new Dictionary<TState, HashSet<TState>>();
            foreach (var link in links)
            {
                result[link.Key] = link.Value;
            }

            return result;
        }
    }
}
