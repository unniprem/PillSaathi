package com.pillsaathi.alarm

import android.app.AlarmManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/** Reschedules every alarm after a reboot, a clock or time-zone change, an update or a permission change. */
class SystemEventReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val trigger =
      when (intent.action) {
        Intent.ACTION_LOCKED_BOOT_COMPLETED,
        Intent.ACTION_BOOT_COMPLETED,
        Intent.ACTION_MY_PACKAGE_REPLACED -> ReconcileTrigger.BOOT
        Intent.ACTION_TIME_CHANGED,
        Intent.ACTION_TIMEZONE_CHANGED -> ReconcileTrigger.CLOCK_CHANGED
        AlarmManager.ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED ->
          ReconcileTrigger.PERMISSION_CHANGED
        else -> return
      }
    try {
      val missed = AlarmEngine.get(context).reconcile(trigger)
      Log.i(LOG_TAG, "Reconciled on ${intent.action} ($trigger); missed ${missed.size}")
    } catch (e: Exception) {
      Log.e(LOG_TAG, "Reconcile on ${intent.action} failed", e)
    }
  }
}
