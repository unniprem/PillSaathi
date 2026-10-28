package com.pillsaathi.family

import android.content.Context
import android.content.Intent
import android.util.Log
import com.pillsaathi.alarm.AlarmStore

internal const val FAMILY_TAG = "PillSaathiFamily"

/**
 * The one Family call the alarm engine makes, from either process, after a pill or record change.
 * It never waits and never touches the network: it reads `family.json` without the store lock and,
 * only when this phone shares its pills, sends one broadcast to the main process, which queues an
 * upload ([FamilyChangeReceiver]). Any failure is logged; the alarm carries on.
 */
object FamilyHooks {
  fun changed(context: Context) {
    try {
      if (!FamilyRules.uploads(AlarmStore(context).peekFamily())) return
      context.sendBroadcast(Intent(context, FamilyChangeReceiver::class.java))
    } catch (e: Exception) {
      Log.w(FAMILY_TAG, "Could not pass a change on for upload", e)
    }
  }
}
