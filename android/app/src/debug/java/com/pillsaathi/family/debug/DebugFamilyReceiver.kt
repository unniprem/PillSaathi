package com.pillsaathi.family.debug

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.pillsaathi.alarm.AlarmStore
import com.pillsaathi.family.ElderSync
import com.pillsaathi.family.FamilyJson
import kotlin.concurrent.thread

/**
 * Debug builds only: lets adb drive Family, in the main process, e.g.
 * `adb shell am broadcast -a com.pillsaathi.DEBUG_FAMILY_UPLOAD -n com.pillsaathi/.family.debug.DebugFamilyReceiver`
 */
class DebugFamilyReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val app = context.applicationContext
    when (intent.action) {
      // Uploads now, on a thread, and logs how it went.
      "com.pillsaathi.DEBUG_FAMILY_UPLOAD" -> {
        val pending = goAsync()
        thread(name = "debug-family-upload") {
          try {
            ElderSync.run(app)
            Log.i(TAG, "DEBUG_FAMILY_UPLOAD done")
          } catch (e: Exception) {
            Log.e(TAG, "DEBUG_FAMILY_UPLOAD failed", e)
          } finally {
            pending.finish()
          }
        }
      }
      // family.json, with each follow's pills reduced to their names.
      "com.pillsaathi.DEBUG_FAMILY_LIST" -> {
        val store = AlarmStore(app)
        val local = store.locked { store.loadFamily() }
        val brief = local.copy(follows = local.follows.map { it.copy(pills = emptyList(), recent = emptyList()) })
        Log.i(TAG, "family: ${FamilyJson.localToJson(brief)}")
        local.follows.forEach { f -> Log.i(TAG, "${f.elderId} pills: ${f.pills.joinToString { it.name }}; ${f.recent.size} recent") }
      }
    }
  }

  private companion object {
    const val TAG = "PillSaathiFamily"
  }
}
