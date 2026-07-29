package kr.robom.runningup.running

import java.io.File
import java.io.RandomAccessFile
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/**
 * Journal durability tests — master # 10.3 and # 22.5.
 *
 * These simulate the failures that actually lose runs: a process killed mid-write, a
 * reboot, disk corruption and a truncated file. The requirement is zero loss of records
 * that were already durably written, and honest detection of the ones that were not.
 */
class RunJournalTest {

    private lateinit var file: File
    private lateinit var journal: RunJournal

    @BeforeTest
    fun setUp() {
        file = File.createTempFile("run-journal-", ".bin")
        file.delete()
        journal = RunJournal(file)
    }

    @AfterTest
    fun tearDown() {
        file.delete()
    }

    private fun sample(index: Int): ByteArray =
        """{"seq":$index,"m":${index * 3},"t":$index}""".toByteArray()

    @Test
    fun `an empty journal recovers cleanly with no records`() {
        val result = journal.recover()
        assertTrue(result.isClean)
        assertEquals(0, result.records.size)
    }

    @Test
    fun `every appended record is recovered in order`() {
        repeat(500) { journal.append(sample(it)) }

        val result = journal.recover()
        assertTrue(result.isClean, "an untouched journal must recover cleanly")
        assertEquals(500, result.records.size)
        result.records.forEachIndexed { index, record ->
            assertEquals(index, record.sequence, "sequence must be gap-free")
            assertContentEquals(sample(index), record.payload)
        }
    }

    @Test
    fun `a process killed mid-write loses only the record in flight`() {
        repeat(100) { journal.append(sample(it)) }
        val intactLength = file.length()

        // Simulate a torn write: a partial frame appended and then the process dies.
        RandomAccessFile(file, "rw").use { raf ->
            raf.seek(intactLength)
            raf.write(byteArrayOf(0, 0, 1, 0, 9, 9, 9))   // truncated header + no payload
        }

        val result = journal.recover()
        assertFalse(result.isClean, "the damaged tail must be reported, not hidden")
        assertEquals(100, result.records.size, "all 100 durable records survive")
        assertEquals(intactLength, result.truncatedAtByte)
    }

    @Test
    fun `a corrupted payload is detected by CRC and stops recovery at that point`() {
        repeat(10) { journal.append(sample(it)) }

        // Flip one byte inside the fifth record's payload.
        RandomAccessFile(file, "rw").use { raf ->
            var offset = 0L
            repeat(4) {
                raf.seek(offset)
                val header = ByteArray(8)
                raf.read(header)
                val len = ((header[0].toInt() and 0xFF) shl 24) or
                    ((header[1].toInt() and 0xFF) shl 16) or
                    ((header[2].toInt() and 0xFF) shl 8) or
                    (header[3].toInt() and 0xFF)
                offset += 8 + len
            }
            raf.seek(offset + 8)
            val original = raf.readByte()
            raf.seek(offset + 8)
            raf.writeByte(original.toInt() xor 0xFF)
        }

        val result = journal.recover()
        assertFalse(result.isClean)
        assertEquals(4, result.records.size, "recovery stops at the first bad CRC")
    }

    @Test
    fun `a damaged tail can be truncated so the session keeps recording`() {
        repeat(20) { journal.append(sample(it)) }
        RandomAccessFile(file, "rw").use { raf ->
            raf.seek(raf.length())
            raf.write(byteArrayOf(127, 127, 127, 127))    // nonsense length field
        }

        assertFalse(journal.recover().isClean)
        val discarded = journal.truncateToLastIntactRecord()
        assertEquals(4L, discarded)

        val afterTruncate = journal.recover()
        assertTrue(afterTruncate.isClean, "the journal is usable again")
        assertEquals(20, afterTruncate.records.size, "no durable record was lost")

        journal.append(sample(20))
        assertEquals(21, journal.recordCount(), "recording continues after recovery")
    }

    @Test
    fun `a record larger than the limit is rejected rather than half written`() {
        val oversized = ByteArray(RunJournal.MAX_RECORD_BYTES + 1) { 'x'.code.toByte() }
        assertFailsWith<IllegalArgumentException> { journal.append(oversized) }
        assertEquals(0L, file.length().coerceAtLeast(0), "nothing was written")
    }

    @Test
    fun `an empty record is refused`() {
        assertFailsWith<IllegalArgumentException> { journal.append(ByteArray(0)) }
    }

    @Test
    fun `the checksum is stable across reopen and changes when content changes`() {
        repeat(50) { journal.append(sample(it)) }
        val first = journal.checksum()

        // Reopening the same file, as happens after a reboot, must not change the digest.
        val reopened = RunJournal(file)
        assertEquals(first, reopened.checksum(), "checksum survives a reopen")

        reopened.append(sample(50))
        assertTrue(first != reopened.checksum(), "checksum reflects new content")
    }

    @Test
    fun `a journal surviving a reboot is byte-identical to what was written`() {
        val payloads = (0 until 250).map { sample(it) }
        payloads.forEach { journal.append(it) }

        // A reboot: no in-process state at all, only the file on disk.
        val afterReboot = RunJournal(file).recover()

        assertTrue(afterReboot.isClean)
        assertEquals(payloads.size, afterReboot.records.size)
        payloads.forEachIndexed { index, expected ->
            assertContentEquals(expected, afterReboot.records[index].payload)
        }
    }
}
