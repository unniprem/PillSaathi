package com.pillsaathi.alarm

import java.io.File
import java.io.IOException
import java.io.RandomAccessFile
import java.util.Collections
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Assume.assumeFalse
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

class FileStoreTest {
  @get:Rule val tmp = TemporaryFolder()

  private lateinit var dir: File
  private lateinit var store: FileStore

  @Before
  fun setUp() {
    dir = tmp.newFolder("store")
    store = FileStore(dir)
  }

  @Test
  fun write_thenRead_roundTrips() {
    store.write("alarms.json", "[{\"id\":\"a1\"}] ✓")
    assertEquals("[{\"id\":\"a1\"}] ✓", store.read("alarms.json"))
  }

  @Test
  fun write_null_deletesFile() {
    store.write("ringing.json", "{}")
    store.write("ringing.json", null)
    assertNull(store.read("ringing.json"))
    assertFalse(File(dir, "ringing.json").exists())
  }

  @Test
  fun read_missingFile_isNull() {
    assertNull(store.read("missing.json"))
  }

  @Test(timeout = 10_000)
  fun peek_whileAnotherThreadHoldsTheLock_readsWithoutWaiting() {
    store.write("settings.json", "{\"language\":\"ml\"}")
    val holding = java.util.concurrent.CountDownLatch(1)
    val release = java.util.concurrent.CountDownLatch(1)
    val holder = Thread { store.locked { holding.countDown(); release.await() } }.apply { start() }
    try {
      holding.await()
      assertEquals("{\"language\":\"ml\"}", store.peek("settings.json"))
      assertNull(store.peek("missing.json"))
    } finally {
      release.countDown()
      holder.join()
    }
  }

  @Test(timeout = 10_000)
  fun nestedLocked_doesNotDeadlockOrThrow() {
    // A second FileStore over the same dir shares the lock, like two AlarmStores in one process.
    store.locked { FileStore(dir).locked { store.locked { store.write("n.json", "1") } } }
    assertEquals("1", store.read("n.json"))
  }

  @Test(timeout = 60_000)
  fun concurrentLockedIncrements_areSerialised() {
    store.write(COUNTER, "0")
    val errors = Collections.synchronizedList(mutableListOf<Throwable>())
    val threads =
      (1..8).map {
        Thread {
          try {
            val mine = FileStore(dir)
            repeat(50) { mine.locked { increment(mine) } }
          } catch (e: Throwable) {
            errors.add(e)
          }
        }
      }
    threads.forEach { it.start() }
    threads.forEach { it.join() }
    assertEquals(emptyList<Throwable>(), errors)
    assertEquals("400", store.read(COUNTER))
  }

  @Test(timeout = 120_000)
  fun concurrentIncrementsFromTwoProcesses_areSerialised() {
    store.write(COUNTER, "0")
    val children = (1..2).map { startChild(Incrementer::class.java, dir.path, "300") }
    // Meanwhile this process increments too, so the in-process lock alone can't serialise them.
    repeat(100) { store.locked { increment(store) } }
    children.forEach { child ->
      val output = child.inputStream.bufferedReader().readText()
      assertEquals("child failed: $output", 0, child.waitFor())
    }
    assertEquals("700", store.read(COUNTER))
  }

  @Test
  fun write_isAtomic_noTmpLeftBehind() {
    store.write("alarms.json", "[]")
    store.write("alarms.json", "[1]")
    assertFalse(File(dir, "alarms.json.tmp").exists())
    assertEquals(listOf("alarms.json"), dir.list()!!.filter { it != "store.lock" })
  }

  @Test
  fun corruptAlarmsFile_isRenamedAndEmptyReturned() {
    store.write("alarms.json", "not json")

    val alarms = store.readParsed("alarms.json", AlarmJson::alarmsFromJson) { emptyList() }

    assertEquals(emptyList<Alarm>(), alarms)
    assertNull(store.read("alarms.json"))
    val backups = dir.list()!!.filter { it.startsWith("alarms.json.corrupt-") }
    assertEquals(1, backups.size)
    // The unreadable data is kept, and a later save can't overwrite it.
    store.write("alarms.json", "[]")
    assertEquals("not json", File(dir, backups.single()).readText())
  }

  @Test
  fun readParsed_validFile_isParsedAndKept() {
    store.write("alarms.json", "[]")
    var corrupt = false
    val alarms =
      store.readParsed("alarms.json", AlarmJson::alarmsFromJson) {
        corrupt = true
        emptyList()
      }
    assertEquals(emptyList<Alarm>(), alarms)
    assertFalse(corrupt)
    assertTrue(File(dir, "alarms.json").exists())
  }

  @Test(timeout = 60_000)
  fun locked_proceedsAfterDeadline_whenAnotherProcessHoldsLock() {
    val warnings = Collections.synchronizedList(mutableListOf<String>())
    val impatient = FileStore(dir, lockTimeoutMs = 300) { message, _ -> warnings.add(message) }
    val holder = startChild(LockHolder::class.java, dir.path, "3000")
    val output = holder.inputStream.bufferedReader()
    assertEquals("child did not take the lock", "locked", output.readLine())

    val started = System.nanoTime()
    val result = impatient.locked { impatient.write("alarms.json", "[]").let { "ran" } }
    val elapsedMs = (System.nanoTime() - started) / 1_000_000

    assertEquals("ran", result)
    assertTrue("gave up too early: $elapsedMs ms", elapsedMs >= 300)
    assertTrue("waited for the holder: $elapsedMs ms", elapsedMs < 2_000)
    assertEquals("[]", File(dir, "alarms.json").readText())
    assertEquals(1, warnings.size)
    assertTrue(warnings.single(), warnings.single().contains(" ms"))
    assertEquals(0, holder.waitFor())
  }

  @Test(timeout = 10_000)
  fun locked_runsBlock_whenLockFileCannotBeOpened() {
    val warnings = Collections.synchronizedList(mutableListOf<String>())
    val unlockable = FileStore(dir) { message, _ -> warnings.add(message) }
    assertTrue(File(dir, "store.lock").mkdir())

    val result = unlockable.locked { unlockable.write("alarms.json", "[1]").let { 42 } }

    assertEquals(42, result)
    assertEquals("[1]", File(dir, "alarms.json").readText())
    assertEquals(1, warnings.size)
  }

  @Test(timeout = 30_000)
  fun locked_releasesLock_whenBlockThrows() {
    try {
      store.locked { throw IllegalStateException("boom") }
      fail("the block's exception should propagate")
    } catch (e: IllegalStateException) {
      assertEquals("boom", e.message)
    }
    // A lock leaked by this JVM would still block another process (POSIX locks are per process).
    val probe = startChild(LockProbe::class.java, dir.path)
    val output = probe.inputStream.bufferedReader().readText()
    assertEquals("lock still held: $output", 0, probe.waitFor())
  }

  @Test(timeout = 10_000)
  fun write_throws_whenTheDirectoryIsAFile() {
    assertTrue(dir.delete())
    dir.writeText("not a directory")

    assertThrows(IOException::class.java) { store.write("alarms.json", "[]") }
    assertEquals("not a directory", dir.readText())
  }

  @Test(timeout = 10_000)
  fun write_throws_whenTheDirectoryIsReadOnly() {
    store.write("alarms.json", "[1]")
    assertTrue(dir.setWritable(false))
    try {
      assumeFalse("running as a user who can write anyway", dir.canWrite())

      assertThrows(IOException::class.java) { store.write("alarms.json", "[2]") }
      assertThrows(IOException::class.java) { store.write("alarms.json", null) }
      assertEquals("[1]", store.read("alarms.json"))
    } finally {
      dir.setWritable(true)
    }
  }

  @Test
  fun write_usesOwnTempFile_soAStaleTmpIsNeverTheTarget() {
    // A writer that lost the lock mid-write may still hold "<name>.tmp" open; never reuse it.
    File(dir, "alarms.json.tmp").writeText("other writer")
    store.write("alarms.json", "[2]")
    assertEquals("[2]", store.read("alarms.json"))
    assertEquals("other writer", File(dir, "alarms.json.tmp").readText())
  }

  private fun startChild(main: Class<*>, vararg args: String): Process {
    val java = File(System.getProperty("java.home"), "bin/java").path
    val classpath = System.getProperty("java.class.path")
    return ProcessBuilder(listOf(java, "-cp", classpath, main.name) + args)
      .redirectErrorStream(true)
      .start()
  }

  /** Child JVM: holds the store's file lock for `args[1]` ms. */
  object LockHolder {
    @JvmStatic
    fun main(args: Array<String>) {
      RandomAccessFile(File(args[0], "store.lock"), "rw").use { file ->
        val lock = file.channel.lock()
        println("locked")
        System.out.flush()
        Thread.sleep(args[1].toLong())
        lock.release()
      }
    }
  }

  /** Child JVM: exits 0 if the store's file lock is free right now, 2 if another process has it. */
  object LockProbe {
    @JvmStatic
    fun main(args: Array<String>) {
      RandomAccessFile(File(args[0], "store.lock"), "rw").use { file ->
        val lock = file.channel.tryLock()
        lock?.release()
        System.exit(if (lock != null) 0 else 2)
      }
    }
  }

  /** Run in a child JVM by [concurrentIncrementsFromTwoProcesses_areSerialised]. */
  object Incrementer {
    @JvmStatic
    fun main(args: Array<String>) {
      val store = FileStore(File(args[0]))
      repeat(args[1].toInt()) { store.locked { increment(store) } }
    }
  }

  private companion object {
    const val COUNTER = "counter"

    fun increment(store: FileStore) {
      val n = store.read(COUNTER)!!.toInt()
      store.write(COUNTER, (n + 1).toString())
    }
  }
}
