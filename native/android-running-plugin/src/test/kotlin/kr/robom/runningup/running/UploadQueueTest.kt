package kr.robom.runningup.running

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

/**
 * Offline upload queue tests — master # 10.1 and # 22.5.
 *
 * The scenarios chosen are the ones that actually lose or duplicate a runner's work:
 * finishing offline, being killed mid-upload, a network that flaps, a server that is down
 * for hours, and a payload the server will never accept.
 */
class UploadQueueTest {

    private val t0 = 1_700_000_000_000L

    @Test
    fun `a finished run is queued and immediately due`() {
        val queue = UploadQueue()
        queue.enqueue("session-1", "idem-1", 4_096, t0)

        val due = queue.dueEntries(t0)
        assertEquals(1, due.size)
        assertEquals("session-1", due[0].sessionId)
        assertEquals(UploadQueue.State.Pending, due[0].state)
    }

    @Test
    fun `a successful upload is terminal`() {
        val queue = UploadQueue()
        queue.enqueue("session-1", "idem-1", 4_096, t0)
        queue.markInFlight("session-1")

        val next = queue.complete("session-1", UploadQueue.Outcome.Success, t0)

        assertNull(next, "a success schedules no retry")
        assertEquals(UploadQueue.State.Uploaded, queue.entry("session-1")!!.state)
        assertTrue(queue.dueEntries(t0 + 1_000_000).isEmpty())
    }

    @Test
    fun `the idempotency key survives every retry`() {
        val queue = UploadQueue()
        queue.enqueue("session-1", "idem-stable", 4_096, t0)

        var now = t0
        repeat(5) {
            queue.markInFlight("session-1")
            val delay = queue.complete("session-1", UploadQueue.Outcome.Retryable, now, "offline")
            assertNotNull(delay)
            now += delay
            // The key must never be regenerated: a fresh key per attempt would let a flaky
            // network produce duplicate rewards.
            assertEquals("idem-stable", queue.entry("session-1")!!.idempotencyKey)
        }
        assertEquals(5, queue.entry("session-1")!!.attempts)
    }

    @Test
    fun `re-enqueueing after a process kill keeps the original key and does not duplicate`() {
        val queue = UploadQueue()
        queue.enqueue("session-1", "idem-original", 4_096, t0)
        queue.markInFlight("session-1")
        // The app dies here, before the server answered. On next launch, recovery finds the
        // journal and enqueues the same session again.
        val again = queue.enqueue("session-1", "idem-regenerated", 4_096, t0 + 60_000)

        assertEquals("idem-original", again.idempotencyKey, "the original key must win")
        assertEquals(1, queue.snapshot().size, "the session must not be queued twice")
    }

    @Test
    fun `backoff grows exponentially and is capped`() {
        val queue = UploadQueue(baseDelayMillis = 30_000L, maxDelayMillis = 6 * 60 * 60 * 1000L)

        var previous = 0L
        for (attempt in 1..10) {
            val delay = queue.backoffMillis(attempt, "session-abc")
            assertTrue(delay >= previous, "backoff must not shrink at attempt $attempt")
            previous = delay
        }

        val capped = queue.backoffMillis(30, "session-abc")
        assertTrue(capped <= 6 * 60 * 60 * 1000L * 1.2, "backoff must stay capped")
    }

    @Test
    fun `two devices recovering from the same outage do not retry in lockstep`() {
        val queue = UploadQueue()
        val a = queue.backoffMillis(4, "session-aaaa")
        val b = queue.backoffMillis(4, "session-bbbb")
        val c = queue.backoffMillis(4, "session-cccc")

        assertTrue(
            setOf(a, b, c).size > 1,
            "jitter must spread retries, otherwise every phone stampedes the backend at once",
        )
    }

    @Test
    fun `jitter is deterministic for the same session`() {
        val queue = UploadQueue()
        assertEquals(
            queue.backoffMillis(3, "session-xyz"),
            queue.backoffMillis(3, "session-xyz"),
            "a reproducible schedule is what makes a bug report actionable",
        )
    }

    @Test
    fun `a permanent failure escalates instead of looping forever`() {
        val queue = UploadQueue()
        queue.enqueue("session-1", "idem-1", 4_096, t0)
        queue.markInFlight("session-1")

        val next = queue.complete("session-1", UploadQueue.Outcome.Permanent, t0, "schema rejected")

        assertNull(next, "a permanent failure must not be retried")
        assertEquals(UploadQueue.State.NeedsAttention, queue.entry("session-1")!!.state)
        assertEquals("schema rejected", queue.entry("session-1")!!.lastFailureReason)
        assertEquals(1, queue.entry("session-1")!!.attempts, "it burned exactly one attempt")
    }

    @Test
    fun `exhausting the retry budget escalates and never discards the run`() {
        val queue = UploadQueue(maxAttempts = 3)
        queue.enqueue("session-1", "idem-1", 4_096, t0)

        var now = t0
        var lastDelay: Long? = null
        repeat(3) {
            queue.markInFlight("session-1")
            lastDelay = queue.complete("session-1", UploadQueue.Outcome.Retryable, now, "5xx")
            if (lastDelay != null) now += lastDelay!!
        }

        assertNull(lastDelay, "the final attempt schedules nothing further")
        val entry = queue.entry("session-1")!!
        assertEquals(UploadQueue.State.NeedsAttention, entry.state)
        assertNotNull(queue.entry("session-1"), "the run is still present — never silently dropped")
        assertEquals(3, entry.attempts)
    }

    @Test
    fun `an entry is not due again until its backoff has elapsed`() {
        val queue = UploadQueue()
        queue.enqueue("session-1", "idem-1", 4_096, t0)
        queue.markInFlight("session-1")
        val delay = queue.complete("session-1", UploadQueue.Outcome.Retryable, t0, "timeout")!!

        assertTrue(queue.dueEntries(t0 + delay - 1).isEmpty(), "not due one millisecond early")
        assertEquals(1, queue.dueEntries(t0 + delay).size, "due exactly on time")
    }

    @Test
    fun `many sessions queued offline all upload once connectivity returns`() {
        val queue = UploadQueue()
        repeat(20) { i -> queue.enqueue("session-$i", "idem-$i", 2_048, t0) }

        assertEquals(20, queue.dueEntries(t0).size)

        for (entry in queue.dueEntries(t0)) {
            queue.markInFlight(entry.sessionId)
            queue.complete(entry.sessionId, UploadQueue.Outcome.Success, t0)
        }

        assertEquals(20, queue.countByState(UploadQueue.State.Uploaded))
        assertEquals(0, queue.countByState(UploadQueue.State.Pending))
    }

    @Test
    fun `a flapping network eventually succeeds without duplicating`() {
        val queue = UploadQueue()
        queue.enqueue("session-1", "idem-1", 4_096, t0)

        var now = t0
        var uploads = 0
        var attempts = 0

        while (queue.entry("session-1")!!.state != UploadQueue.State.Uploaded && attempts < 10) {
            val due = queue.dueEntries(now)
            if (due.isEmpty()) { now += 1_000; continue }

            queue.markInFlight("session-1")
            attempts += 1
            // Fails three times, then succeeds.
            if (attempts < 4) {
                val delay = queue.complete("session-1", UploadQueue.Outcome.Retryable, now, "offline")!!
                now += delay
            } else {
                queue.complete("session-1", UploadQueue.Outcome.Success, now)
                uploads += 1
            }
        }

        assertEquals(UploadQueue.State.Uploaded, queue.entry("session-1")!!.state)
        assertEquals(1, uploads, "exactly one successful upload, however many attempts it took")
        assertEquals(4, attempts)
    }

    @Test
    fun `only confirmed uploads are pruned`() {
        val queue = UploadQueue()
        queue.enqueue("done", "idem-1", 1_024, t0)
        queue.enqueue("pending", "idem-2", 1_024, t0)
        queue.enqueue("broken", "idem-3", 1_024, t0)

        queue.markInFlight("done")
        queue.complete("done", UploadQueue.Outcome.Success, t0)
        queue.markInFlight("broken")
        queue.complete("broken", UploadQueue.Outcome.Permanent, t0, "bad payload")

        assertEquals(1, queue.pruneUploaded())
        assertNull(queue.entry("done"))
        assertNotNull(queue.entry("pending"), "a pending run is kept")
        assertNotNull(queue.entry("broken"), "a run needing attention is kept for the user")
    }
}
