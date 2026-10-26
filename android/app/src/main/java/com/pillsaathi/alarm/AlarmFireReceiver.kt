package com.pillsaathi.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Receives AlarmManager deliveries: an alarm firing, which starts ringing it, or the recovery
 * wakeup that reconciles a ring whose end was never recorded.
 */
class AlarmFireReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == ACTION_RECOVER) {
      try {
        val missed = AlarmEngine.get(context).reconcile(ReconcileTrigger.RECOVERY)
        Log.i(LOG_TAG, "Recovery wakeup for ${intent.data?.lastPathSegment}; missed ${missed.size}")
      } catch (e: Exception) {
        Log.e(LOG_TAG, "Recovery reconcile failed", e)
      }
      return
    }
    val id = intent.getStringExtra(EXTRA_ALARM_ID) ?: intent.data?.lastPathSegment ?: return
    // A stale or missed fire is settled inside onFired, while AlarmManager keeps the phone awake.
    val alarm =
      try {
        AlarmEngine.get(context).onFired(id)
      } catch (e: Exception) {
        Log.e(LOG_TAG, "Could not handle the fire of $id", e)
        null
      } ?: return
    val dueAt = AlarmRules.dueAt(alarm)
    // AlarmManager's wake lock ends when this returns, and the phone may sleep before the service
    // runs. RingingService releases this one once the sound plays or the fire is settled.
    RingWakeLock.acquire(context)
    try {
      RingingService.ring(context, alarm.id, dueAt)
    } catch (e: Exception) {
      RingWakeLock.release("could not start the ringing service")
      Log.e(LOG_TAG, "Could not start ringing ${alarm.id}; recording it as missed", e)
      try {
        AlarmEngine.get(context).onRingEnded(alarm.id, DoseOutcome.MISSED, dueAt)
      } catch (e2: Exception) {
        Log.e(LOG_TAG, "Could not record ${alarm.id} as missed", e2)
      }
    }
  }

  companion object {
    const val EXTRA_ALARM_ID = "alarmId"
    const val ACTION_RECOVER = "com.pillsaathi.alarm.RECOVER"
  }
}
