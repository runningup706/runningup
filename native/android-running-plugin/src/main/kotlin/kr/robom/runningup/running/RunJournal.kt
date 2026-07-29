package kr.robom.runningup.running

import java.io.File
import java.io.RandomAccessFile
import java.security.MessageDigest
import java.util.zip.CRC32

/**
 * Append-only run journal.
 *
 * Master # 10.3: a running session must survive screen-off, backgrounding, process death,
 * a full reboot, a disk-full condition and a revoked permission — without ever losing the
 * samples already written. This is the piece the whole reward pipeline rests on: a run that
 * is lost here can never be verified, rewarded or appealed.
 *
 * Design
 * ------
 * The journal is a sequence of length-prefixed records. Each record carries its own CRC32,
 * so a torn write at the tail is detectable and recoverable to the last intact record
 * rather than corrupting the whole file:
 *
 *     [4 bytes payload length][4 bytes CRC32 of payload][payload bytes]
 *
 * Recovery scans forward, keeping every record whose CRC matches and stopping at the first
 * that does not. A process killed mid-`write()` therefore costs at most the record in
 * flight, never the session.
 *
 * Durability
 * ----------
 * Each append is followed by `fd.sync()`. That is deliberately expensive and deliberately
 * chosen: a GPS sample arrives about once per second, so the cost is negligible against the
 * cost of losing a marathon.
 *
 * What this class does NOT do
 * ---------------------------
 * It performs no encryption itself. Location data is sensitive (master # 20.3), so the file
 * is expected to live behind `EncryptedFile`/Android Keystore, injected by the caller. This
 * class is pure JVM logic with no Android imports precisely so that it can be unit tested
 * on the JVM without a device or an emulator.
 */
class RunJournal(private val file: File) {

    companion object {
        private const val HEADER_BYTES = 8
        const val MAX_RECORD_BYTES = 64 * 1024
    }

    /** A single append-only entry. `sequence` is monotonic and gap-free within a session. */
    data class Record(
        val sequence: Int,
        val payload: ByteArray,
    ) {
        override fun equals(other: Any?): Boolean =
            other is Record && other.sequence == sequence && other.payload.contentEquals(payload)

        override fun hashCode(): Int = 31 * sequence + payload.contentHashCode()
    }

    /** Outcome of reading a journal back, including whether the tail was damaged. */
    data class RecoveryResult(
        val records: List<Record>,
        val truncatedAtByte: Long?,
        val discardedTailBytes: Long,
    ) {
        val isClean: Boolean get() = truncatedAtByte == null
    }

    /**
     * Append one record and fsync.
     *
     * @throws IllegalArgumentException if the payload exceeds [MAX_RECORD_BYTES]; an
     *   oversized record is rejected rather than written, because a partially written
     *   giant record is the hardest case to recover from.
     */
    fun append(payload: ByteArray) {
        require(payload.isNotEmpty()) { "refusing to append an empty record" }
        require(payload.size <= MAX_RECORD_BYTES) {
            "record of ${payload.size} bytes exceeds the $MAX_RECORD_BYTES byte limit"
        }

        val crc = CRC32().apply { update(payload) }.value.toInt()

        RandomAccessFile(file, "rw").use { raf ->
            raf.seek(raf.length())
            val frame = ByteArray(HEADER_BYTES + payload.size)
            writeInt(frame, 0, payload.size)
            writeInt(frame, 4, crc)
            payload.copyInto(frame, HEADER_BYTES)
            raf.write(frame)
            // Durability barrier. Without this the record lives in the page cache and a
            // kernel panic or battery pull loses it even though write() returned.
            raf.fd.sync()
        }
    }

    /**
     * Read every intact record.
     *
     * Stops at the first record whose declared length runs past the end of the file or
     * whose CRC does not match, and reports how many bytes were discarded. A caller that
     * sees `isClean == false` should treat the discarded tail as an integrity signal for
     * the anti-cheat pipeline, not silently repair it.
     */
    fun recover(): RecoveryResult {
        if (!file.exists() || file.length() == 0L) {
            return RecoveryResult(emptyList(), null, 0)
        }

        val records = mutableListOf<Record>()
        var offset = 0L
        var truncatedAt: Long? = null

        RandomAccessFile(file, "r").use { raf ->
            val length = raf.length()
            var sequence = 0

            while (offset + HEADER_BYTES <= length) {
                raf.seek(offset)
                val header = ByteArray(HEADER_BYTES)
                if (raf.read(header) != HEADER_BYTES) { truncatedAt = offset; break }

                val payloadLength = readInt(header, 0)
                val expectedCrc = readInt(header, 4)

                // A corrupted length field must not be trusted into a huge allocation.
                if (payloadLength <= 0 || payloadLength > MAX_RECORD_BYTES) { truncatedAt = offset; break }
                if (offset + HEADER_BYTES + payloadLength > length) { truncatedAt = offset; break }

                val payload = ByteArray(payloadLength)
                if (raf.read(payload) != payloadLength) { truncatedAt = offset; break }

                val actualCrc = CRC32().apply { update(payload) }.value.toInt()
                if (actualCrc != expectedCrc) { truncatedAt = offset; break }

                records.add(Record(sequence++, payload))
                offset += HEADER_BYTES + payloadLength
            }

            // Trailing bytes too short to even form a header are still a torn write. The
            // loop condition alone would walk past them and report a clean journal, which
            // would hide the very failure this class exists to detect.
            if (truncatedAt == null && offset < length) {
                truncatedAt = offset
            }
        }

        val discarded = if (truncatedAt != null) file.length() - truncatedAt!! else 0L
        return RecoveryResult(records, truncatedAt, discarded)
    }

    /**
     * Drop a damaged tail so the session can continue appending.
     *
     * Only ever called after [recover] has reported the intact prefix, and it never
     * shortens the file below that prefix — the point is to keep running, not to tidy up.
     */
    fun truncateToLastIntactRecord(): Long {
        val result = recover()
        val cut = result.truncatedAtByte ?: return 0L
        RandomAccessFile(file, "rw").use { raf -> raf.setLength(cut) }
        return result.discardedTailBytes
    }

    /** Stable fingerprint of the intact journal, submitted with the finish manifest. */
    fun checksum(): String {
        val digest = MessageDigest.getInstance("SHA-256")
        recover().records.forEach { digest.update(it.payload) }
        return digest.digest().joinToString("") { "%02x".format(it) }
    }

    fun recordCount(): Int = recover().records.size

    private fun writeInt(target: ByteArray, at: Int, value: Int) {
        target[at] = (value ushr 24).toByte()
        target[at + 1] = (value ushr 16).toByte()
        target[at + 2] = (value ushr 8).toByte()
        target[at + 3] = value.toByte()
    }

    private fun readInt(source: ByteArray, at: Int): Int =
        ((source[at].toInt() and 0xFF) shl 24) or
            ((source[at + 1].toInt() and 0xFF) shl 16) or
            ((source[at + 2].toInt() and 0xFF) shl 8) or
            (source[at + 3].toInt() and 0xFF)
}
