package com.pillsaathi.alarm

import android.content.Context
import android.os.PowerManager
import android.util.Log

/**
 * Keeps the CPU awake from an alarm's delivery until its sound is playing. AlarmManager's own wake
 * lock ends when [AlarmFireReceiver.onReceive] returns, and the phone may sleep before
 * [RingingService] runs; once [AlarmPlayer] plays, the player's wake lock takes over. The service
 * also takes it while it moves from one ring to the next in its queue.
 *
 * Process-local: the receiver and the service both run in `:ringing`. Not reference counted, so one
 * release ends it however many fires took it, and the timeout ends it if a release is ever missed.
 */
object RingWakeLock {
  private const val TAG = "PillSaathi:ring-start"
  private const val TIMEOUT_MS = 60_000L

  private var lock: PowerManager.WakeLock? = null

  @Synchronized
  fun acquire(context: Context) {
    try {
      val held =
        lock
          ?: context.applicationContext
            .getSystemService(PowerManager::class.java)
            .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, TAG)
            .apply { setReferenceCounted(false) }
            .also { lock = it }
      held.acquire(TIMEOUT_MS)
    } catch (e: Exception) {
      Log.w(LOG_TAG, "Could not take the ring-start wake lock", e)
    }
  }

  /** Lets the CPU sleep again. Safe to call when it isn't held. [reason] is for the log. */
  @Synchronized
  fun release(reason: String) {
    try {
      val held = lock ?: return
      if (held.isHeld) {
        held.release()
        Log.i(LOG_TAG, "Released the ring-start wake lock: $reason")
      }
    } catch (e: Exception) {
      Log.w(LOG_TAG, "Could not release the ring-start wake lock", e)
    }
  }
}
