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
