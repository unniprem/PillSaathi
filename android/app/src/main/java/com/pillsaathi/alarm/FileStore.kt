package com.pillsaathi.alarm

import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.io.RandomAccessFile
import java.util.concurrent.locks.ReentrantLock

/**
 * Small text files in [dir], safe to share between the app's processes. Every read comes from
 * disk, writes replace a file atomically, and [locked] serialises access across threads and
 * processes. Plain JVM, so it can be unit tested.
 */
class FileStore(private val dir: File) {
  private val threadLock = lockFor(dir)

  /**
   * Runs [block] holding the store lock: an in-process lock shared by every [FileStore] over [dir],
   * plus a file lock on `store.lock` that other processes respect. Re-entrant; the file lock is
   * only taken by the outermost call, because a second one in the same JVM would throw.
   */
  fun <T> locked(block: () -> T): T {
    threadLock.lock()
    try {
      if (threadLock.holdCount > 1) return block()
      dir.mkdirs()
      RandomAccessFile(File(dir, LOCK_FILE), "rw").use { file ->
        val fileLock = file.channel.lock()
        try {
          return block()
        } finally {
          fileLock.release()
        }
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

  /** Replaces [name] with [content] atomically, or deletes it when [content] is null. */
  fun write(name: String, content: String?) {
    locked {
      val file = File(dir, name)
      if (content == null) {
        if (file.exists() && !file.delete()) throw IOException("Could not delete $name")
        return@locked
      }
      val tmp = File(dir, "$name.tmp")
      FileOutputStream(tmp).use { out ->
        out.write(content.toByteArray())
        out.fd.sync()
      }
      if (!tmp.renameTo(file)) {
        tmp.delete()
        throw IOException("Could not replace $name")
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

  private companion object {
    const val LOCK_FILE = "store.lock"
    val threadLocks = HashMap<String, ReentrantLock>()

    fun lockFor(dir: File): ReentrantLock {
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
