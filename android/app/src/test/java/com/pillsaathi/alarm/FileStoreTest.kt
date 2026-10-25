package com.pillsaathi.alarm

import java.io.File
import java.util.Collections
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
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
    val java = File(System.getProperty("java.home"), "bin/java").path
    val classpath = System.getProperty("java.class.path")
    val children =
      (1..2).map {
        ProcessBuilder(java, "-cp", classpath, Incrementer::class.java.name, dir.path, "300")
          .redirectErrorStream(true)
          .start()
      }
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
