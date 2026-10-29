package com.pillsaathi.family.debug

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.pillsaathi.alarm.AlarmStore
import com.pillsaathi.family.ElderSync
import com.pillsaathi.family.FamilyChecks
import com.pillsaathi.family.FamilyJson
import com.pillsaathi.family.FamilyWork
import com.pillsaathi.alarm.DoseTime
import com.pillsaathi.alarm.PillDraft
import com.pillsaathi.alarm.PillForm
import com.pillsaathi.family.ChangeBody
import com.pillsaathi.family.CheckIn
import com.pillsaathi.family.PhotoChoice
import com.pillsaathi.family.RemoteChange
import com.pillsaathi.family.RemoteRules
import com.pillsaathi.family.SoundChoice
import java.time.LocalDate
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
      // Queues an upload as a change of hers would: as background work, once there is internet.
      "com.pillsaathi.DEBUG_FAMILY_CHANGED" -> {
        FamilyWork.requestUpload(app)
        Log.i(TAG, "DEBUG_FAMILY_CHANGED queued an upload")
      }
      // Applies a change as her check-in would, without Firestore: a pill at --ei hour/minute
      // named --es name, or with --es kind sound the file --es file (in the app's files) as the
      // sound at that time. --es id makes it the same change again.
      "com.pillsaathi.DEBUG_FAMILY_APPLY" -> {
        val pending = goAsync()
        thread(name = "debug-family-apply") {
          try {
            val id = intent.getStringExtra("id") ?: java.util.UUID.randomUUID().toString()
            val hour = intent.getIntExtra("hour", 8)
            val minute = intent.getIntExtra("minute", 0)
            val name = intent.getStringExtra("name") ?: "Remote test"
            val (body, file) = when (intent.getStringExtra("kind")) {
              "sound" -> {
                val f = java.io.File(app.filesDir, intent.getStringExtra("file") ?: "debug.m4a")
                ChangeBody.SetSound(hour, minute, SoundChoice.New(name, 1_000, f.extension)) to f.readBytes()
              }
              "delete" -> ChangeBody.DeletePill(intent.getStringExtra("pillId") ?: id) to null
              else -> ChangeBody.SavePill(
                PillDraft(null, name, PillForm.TABLET, 1.0, listOf(DoseTime(hour, minute)), false, null),
                LocalDate.now(),
                PhotoChoice.NONE,
              ) to null
            }
            val change = RemoteChange(id, "debug", "Ravi", null, RemoteRules.APPLYING, null, null, if (file == null) 0 else 1, body)
            val reason = synchronized(ElderSync.lock) { CheckIn.applyLocally(app, change, file) }
            Log.i(TAG, "DEBUG_FAMILY_APPLY $id: ${reason ?: "applied"}")
          } catch (e: Exception) {
            Log.e(TAG, "DEBUG_FAMILY_APPLY failed", e)
          } finally {
            pending.finish()
          }
        }
      }
      // Runs the due checks now, on a thread, as the wake-up would.
      "com.pillsaathi.DEBUG_FAMILY_CHECK" -> {
        val pending = goAsync()
        thread(name = "debug-family-check") {
          try {
            Log.i(TAG, "DEBUG_FAMILY_CHECK done: ${FamilyChecks.run(app, System.currentTimeMillis())}")
          } catch (e: Exception) {
            Log.e(TAG, "DEBUG_FAMILY_CHECK failed", e)
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
