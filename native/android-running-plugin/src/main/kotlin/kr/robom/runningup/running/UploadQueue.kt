package kr.robom.runningup.running

/**
 * Offline upload queue for finished run sessions.
 *
 * Master # 10.1 / # 22.5: a run finished in a tunnel, on a plane or with a dead network must
 * upload later without losing anything and without ever paying twice. On Android this is
 * driven by WorkManager, but the decision logic — what to retry, when, how often, and when
 * to stop — is pure state machine, so it lives here and is unit tested on the JVM.
 *
 * The rules that matter:
 *
 *  - Every entry carries an idempotency key generated ONCE at enqueue time and reused for
 *    every retry. The server collapses repeats onto the first result. A key regenerated per
 *    attempt would turn a flaky network into duplicate rewards, which is the single worst
 *    failure this queue can have.
 *
 *  - Backoff is exponential with jitter. Without jitter, every phone that lost connectivity
 *    during the same outage retries in lockstep and stampedes the backend the moment it
 *    returns.
 *
 *  - Failures are classified. A 5xx or a socket timeout is worth retrying forever; a 4xx
 *    schema rejection will fail identically every time and belongs in a review queue where a
 *    human can see it, not in an infinite loop burning the user's battery.
 *
 *  - An entry is NEVER silently dropped. Giving up moves it to `NeedsAttention`, because a
 *    run that vanished is indistinguishable to the user from a run that was stolen.
 */
class UploadQueue(
    private val maxAttempts: Int = 12,
    private val baseDelayMillis: Long = 30_000L,
    private val maxDelayMillis: Long = 6 * 60 * 60 * 1000L,
) {

    enum class State { Pending, InFlight, Uploaded, NeedsAttention }

    /** How an attempt ended, which decides whether another one is worth making. */
    enum class Outcome {
        /** Accepted, or recognised as already applied. Terminal success either way. */
        Success,

        /** Transient: offline, timeout, 5xx, rate limited. Retry. */
        Retryable,

        /** Permanent: malformed payload, schema rejection, revoked auth. Escalate. */
        Permanent,
    }

    data class Entry(
        val sessionId: String,
        val idempotencyKey: String,
        val payloadBytes: Int,
        var state: State = State.Pending,
        var attempts: Int = 0,
        var nextAttemptAtMillis: Long = 0L,
        var lastFailureReason: String? = null,
    )

    private val entries = LinkedHashMap<String, Entry>()

    /**
     * Enqueue a finished session.
     *
     * Enqueueing the same session twice is a no-op that keeps the ORIGINAL idempotency key.
     * This is the case that matters: a user taps finish, the app is killed before the upload
     * completes, and recovery re-enqueues the same session on next launch.
     */
    fun enqueue(sessionId: String, idempotencyKey: String, payloadBytes: Int, nowMillis: Long): Entry {
        val existing = entries[sessionId]
        if (existing != null) return existing

        val entry = Entry(
            sessionId = sessionId,
            idempotencyKey = idempotencyKey,
            payloadBytes = payloadBytes,
            nextAttemptAtMillis = nowMillis,
        )
        entries[sessionId] = entry
        return entry
    }

    /** Entries due for an attempt now, oldest first. */
    fun dueEntries(nowMillis: Long): List<Entry> =
        entries.values
            .filter { it.state == State.Pending && it.nextAttemptAtMillis <= nowMillis }
            .toList()

    fun markInFlight(sessionId: String) {
        val entry = requireNotNull(entries[sessionId]) { "unknown session $sessionId" }
        check(entry.state == State.Pending) { "session $sessionId is not pending" }
        entry.state = State.InFlight
        entry.attempts += 1
    }

    /**
     * Record the result of an attempt.
     *
     * @return the delay until the next attempt, or null when the entry reached a terminal
     *   state (uploaded, or escalated for attention).
     */
    fun complete(sessionId: String, outcome: Outcome, nowMillis: Long, reason: String? = null): Long? {
        val entry = requireNotNull(entries[sessionId]) { "unknown session $sessionId" }

        return when (outcome) {
            Outcome.Success -> {
                entry.state = State.Uploaded
                entry.lastFailureReason = null
                null
            }

            Outcome.Permanent -> {
                // Retrying would fail identically and drain the battery. A human decides.
                entry.state = State.NeedsAttention
                entry.lastFailureReason = reason ?: "permanent failure"
                null
            }

            Outcome.Retryable -> {
                entry.lastFailureReason = reason ?: "transient failure"
                if (entry.attempts >= maxAttempts) {
                    // Out of attempts, but NOT discarded: the run still exists and the user
                    // is told, rather than finding a hole in their history.
                    entry.state = State.NeedsAttention
                    null
                } else {
                    val delay = backoffMillis(entry.attempts, entry.sessionId)
                    entry.state = State.Pending
                    entry.nextAttemptAtMillis = nowMillis + delay
                    delay
                }
            }
        }
    }

    /**
     * Exponential backoff with deterministic per-session jitter.
     *
     * The jitter is derived from the session id rather than a random source so the schedule
     * is reproducible in tests and in a bug report, while still spreading load across
     * devices — two phones recovering from the same outage hold different session ids and so
     * retry at different moments.
     */
    fun backoffMillis(attempt: Int, sessionId: String): Long {
        val exponent = (attempt - 1).coerceIn(0, 20)
        val raw = baseDelayMillis.toDouble() * Math.pow(2.0, exponent.toDouble())
        val capped = raw.coerceAtMost(maxDelayMillis.toDouble())

        // +/-20% jitter from a stable hash of the session id.
        val hash = sessionId.hashCode().toLong() and 0x7FFFFFFFL
        val jitterFactor = 0.8 + (hash % 401).toDouble() / 1000.0
        return (capped * jitterFactor).toLong().coerceAtLeast(1_000L)
    }

    fun entry(sessionId: String): Entry? = entries[sessionId]

    fun countByState(state: State): Int = entries.values.count { it.state == state }

    /** Nothing is ever removed silently; only a confirmed upload can be forgotten. */
    fun pruneUploaded(): Int {
        val uploaded = entries.values.filter { it.state == State.Uploaded }.map { it.sessionId }
        uploaded.forEach { entries.remove(it) }
        return uploaded.size
    }

    fun snapshot(): List<Entry> = entries.values.map { it.copy() }
}
