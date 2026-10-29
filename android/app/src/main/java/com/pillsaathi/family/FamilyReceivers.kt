package com.pillsaathi.family

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/** A pill or record changed in either process ([FamilyHooks]): queue an upload. Main process. */
class FamilyChangeReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    try {
      FamilyWork.requestUpload(context)
    } catch (e: Exception) {
      Log.w(FAMILY_TAG, "Could not queue an upload", e)
    }
  }
}

/** A check is due ([FamilyChecks.scheduleNext]): run it as background work. Main process. */
class CheckAlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    try {
      FamilyWork.requestCheck(context)
    } catch (e: Exception) {
      Log.w(FAMILY_TAG, "Could not queue a family check", e)
    }
  }
}

/**
 * After a reboot, a clock or time-zone change or an app update, sets the next check again, and on
 * a phone that shares its pills, uploads and keeps the heartbeat going. Main process.
 */
class FamilySystemReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val pending = goAsync()
    Thread {
      try {
        FamilyChecks.scheduleNext(context)
        val store = com.pillsaathi.alarm.AlarmStore(context)
        val local = store.locked { store.loadFamily() }
        if (FamilyRules.uploads(local)) {
          FamilyWork.requestUpload(context)
          FamilyWork.ensureHeartbeat(context)
        }
        if (local.follows.isNotEmpty()) FamilyWork.ensureRefresh(context)
      } catch (e: Exception) {
        Log.w(FAMILY_TAG, "Could not set up Family after ${intent.action}", e)
      } finally {
        pending.finish()
      }
    }.start()
  }
}
