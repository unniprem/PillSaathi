package com.pillsaathi.alarm

import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.io.RandomAccessFile
import java.nio.channels.FileLock
import java.nio.channels.OverlappingFileLockException
import java.util.concurrent.locks.ReentrantLock

/**
 * Small text files in [dir], safe to share between the app's processes. Every read comes from
 * disk, writes replace a file atomically, and [locked] serialises access across threads and
 * processes. Plain JVM, so it can be unit tested; problems with the lock go to [warn].
 */
class FileStore(
  private val dir: File,
  private val lockTimeoutMs: Long = DEFAULT_LOCK_TIMEOUT_MS,
  private val warn: (String, Throwable?) -> Unit = { _, _ -> },
) {
  private val threadLock = lockFor(dir)

  /**
   * Runs [block] holding the store lock: an in-process lock shared by every [FileStore] over [dir],
   * plus a file lock on `store.lock` that other processes respect. Re-entrant; the file lock is
   * only taken by the outermost call, because a second one in the same JVM would throw.
   *
   * The file lock is waited for at most [lockTimeoutMs]. If another process keeps it longer (it may
   * be frozen or stuck) or it can't be taken at all, [block] runs with only the in-process lock:
   * an alarm must still ring, at the risk of losing a concurrent update. Files stay whole either
   * way, because every [write] goes through its own temporary file.
   */
  fun <T> locked(block: () -> T): T {
    threadLock.lock()
    try {
      if (threadLock.holdCount > 1) return block()
      val held = acquireFileLock()
      try {
        return block()
      } finally {
        held?.let(::release)
      }
    } finally {
      threadLock.unlock()
    }
  }

  /** The contents of [name], or null if there is no such file. */
  fun read(name: String): String? = locked {
    val file = File(dir, name)
    if (file.exists()) file.readText() else null
  }

  /**
   * The contents of [name] as they are now, or null if there is no such file, without taking the
   * lock: a reader that must never wait. Safe because [write] replaces files by renaming, so a
   * reader sees the old file or the new one, never half of one.
   */
  fun peek(name: String): String? {
    val file = File(dir, name)
    return if (file.exists()) file.readText() else null
  }

  /** Replaces [name] with [content] atomically, or deletes it when [content] is null. */
  fun write(name: String, content: String?) {
    locked {
      val file = File(dir, name)
      if (content == null) {
        if (file.exists() && !file.delete()) throw IOException("Could not delete $name")
        return@locked
      }
      // Never a shared "<name>.tmp": a writer that lost the lock may still be writing to that one.
      val tmp = File.createTempFile("$name.", ".tmp", dir)
      var replaced = false
      try {
        FileOutputStream(tmp).use { out ->
          out.write(content.toByteArray())
          out.fd.sync()
        }
        replaced = tmp.renameTo(file)
        if (!replaced) throw IOException("Could not replace $name")
      } finally {
        if (!replaced) tmp.delete()
      }
    }
  }

  /**
   * Parses [name] (null when missing). If [parse] throws, the file is renamed to
   * `<name>.corrupt-<epochMs>`, which keeps the data where no later [write] can overwrite it, and
   * [onCorrupt] supplies the result. If that rename fails this throws instead, so the caller can't
   * go on to save over data that wasn't backed up.
   */
  fun <T> readParsed(name: String, parse: (String?) -> T, onCorrupt: (Exception) -> T): T = locked {
    val raw = read(name)
    try {
      parse(raw)
    } catch (e: Exception) {
      val backup = File(dir, "$name.corrupt-${System.currentTimeMillis()}")
      if (!File(dir, name).renameTo(backup)) {
        throw IOException("Could not back up unreadable $name", e)
      }
      onCorrupt(e)
    }
  }

  /** Takes the cross-process lock, trying every [POLL_MS] for up to [lockTimeoutMs]. */
  private fun acquireFileLock(): HeldLock? {
    val started = System.nanoTime()
    var file: RandomAccessFile? = null
    try {
      dir.mkdirs()
      val opened = RandomAccessFile(File(dir, LOCK_FILE), "rw")
      file = opened
      while (true) {
        val lock = opened.channel.tryLock()
        if (lock != null) return HeldLock(opened, lock)
        if (elapsedMs(started) >= lockTimeoutMs) break
        Thread.sleep(POLL_MS)
      }
      warn("Store lock held elsewhere for ${elapsedMs(started)} ms; going on without it", null)
    } catch (e: IOException) {
      warn("Store lock unavailable after ${elapsedMs(started)} ms; going on without it", e)
    } catch (e: OverlappingFileLockException) {
      warn("Store lock unavailable after ${elapsedMs(started)} ms; going on without it", e)
    } catch (e: InterruptedException) {
      Thread.currentThread().interrupt()
      warn("Interrupted after ${elapsedMs(started)} ms waiting for the store lock; going on", e)
    }
    try {
      file?.close()
    } catch (e: IOException) {
      warn("Could not close the store lock file", e)
    }
    return null
  }

  private fun release(held: HeldLock) {
    try {
      held.lock.release()
    } catch (e: IOException) {
      warn("Could not release the store lock; closing its file releases it", e)
    } finally {
      try {
        held.file.close()
      } catch (e: IOException) {
        warn("Could not close the store lock file", e)
      }
    }
  }

  private class HeldLock(val file: RandomAccessFile, val lock: FileLock)

  private fun elapsedMs(startedNanos: Long): Long = (System.nanoTime() - startedNanos) / 1_000_000

  companion object {
    /** How long to wait for another process to release the store before going on without it. */
    const val DEFAULT_LOCK_TIMEOUT_MS = 3_000L
    private const val POLL_MS = 25L
    private const val LOCK_FILE = "store.lock"
    private val threadLocks = HashMap<String, ReentrantLock>()

    private fun lockFor(dir: File): ReentrantLock {
      val key =
        try {
          dir.canonicalPath
        } catch (e: IOException) {
          dir.absolutePath
        }
      return synchronized(threadLocks) { threadLocks.getOrPut(key) { ReentrantLock() } }
    }
  }
}
