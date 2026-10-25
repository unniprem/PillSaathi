package com.pillsaathi.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import com.pillsaathi.MainActivity

/** Keeps each alarm's AlarmManager entry in step with its [AlarmRules.dueAt]. */
class AlarmScheduler(context: Context) {
  private val context = context.applicationContext
  private val alarmManager = this.context.getSystemService(AlarmManager::class.java)

  /** Schedules [alarm] at its due time, or cancels it. Returns false if exact alarms are denied. */
  fun sync(alarm: Alarm): Boolean {
    val due = AlarmRules.dueAt(alarm)
    if (due == null) {
      cancel(alarm.id)
      return true
    }
    return try {
      alarmManager.setAlarmClock(AlarmManager.AlarmClockInfo(due, showIntent()), fireIntent(alarm.id))
      true
    } catch (e: SecurityException) {
      Log.w(LOG_TAG, "Exact alarms not allowed; ${alarm.id} is not scheduled", e)
      false
    }
  }

  fun cancel(alarmId: String) {
    alarmManager.cancel(fireIntent(alarmId))
  }

  private fun fireIntent(alarmId: String): PendingIntent {
    val intent =
      Intent(context, AlarmFireReceiver::class.java)
        .setData(Uri.parse("pillsaathi://alarm/$alarmId"))
        .putExtra(AlarmFireReceiver.EXTRA_ALARM_ID, alarmId)
    return PendingIntent.getBroadcast(context, 0, intent, FLAGS)
  }

  private fun showIntent(): PendingIntent =
    PendingIntent.getActivity(context, 0, Intent(context, MainActivity::class.java), FLAGS)

  private companion object {
    const val FLAGS = PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
  }
}
