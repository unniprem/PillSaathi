package com.pillsaathi.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/** Receives the AlarmManager broadcast for an alarm and starts ringing it. */
class AlarmFireReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val id = intent.getStringExtra(EXTRA_ALARM_ID) ?: intent.data?.lastPathSegment ?: return
    try {
      val alarm = AlarmEngine.get(context).onFired(id)
      if (alarm == null) {
        Log.i(LOG_TAG, "Alarm $id fired but is gone or off; not ringing")
        return
      }
      RingingService.ring(context, alarm.id)
    } catch (e: Exception) {
      Log.e(LOG_TAG, "Could not ring alarm $id", e)
    }
  }

  companion object {
    const val EXTRA_ALARM_ID = "alarmId"
  }
}
