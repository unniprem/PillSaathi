package com.pillsaathi.alarm

import android.util.Log
import java.util.concurrent.CopyOnWriteArrayList

/** What is ringing right now, in this process. Only [RingingService] changes it, on the main thread. */
object RingingState {
  /**
   * One ring. [startedAt] is wall-clock time, for display; [startedElapsed] is
   * `SystemClock.elapsedRealtime()` once it sounded, for [RingCommands]' input guard.
   * [followsAnother] is true for a ring that came from the queue the moment another ended.
   */
  data class Ring(
    val alarmId: String,
    val name: String,
    val soundName: String,
    val startedAt: Long,
    val startedElapsed: Long = 0L,
    val followsAnother: Boolean = false,
  )

  @Volatile
  var current: Ring? = null
    private set

  private val listeners = CopyOnWriteArrayList<(Ring?) -> Unit>()

  fun addListener(l: (Ring?) -> Unit) {
    listeners.add(l)
  }

  fun removeListener(l: (Ring?) -> Unit) {
    listeners.remove(l)
  }

  internal fun update(ring: Ring?) {
    if (ring == current) return
    current = ring
    listeners.forEach {
      try {
        it(ring)
      } catch (e: Exception) {
        Log.e(LOG_TAG, "RingingState listener failed", e)
      }
    }
  }
}
