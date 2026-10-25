package com.pillsaathi.alarm.debug

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.pillsaathi.alarm.Alarm
import com.pillsaathi.alarm.AlarmEngine
import com.pillsaathi.alarm.DebugHooks
import com.pillsaathi.alarm.LOG_TAG
import com.pillsaathi.alarm.RingingService
import java.time.Instant
import java.time.ZoneId

/**
 * Debug builds only: lets adb drive the alarm engine before any UI exists, e.g.
 * `adb shell am broadcast -a com.pillsaathi.DEBUG_ADD_ALARM -n com.pillsaathi/.alarm.debug.DebugAlarmReceiver --ei minutes_from_now 2 --es name Test`
 */
class DebugAlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val engine = AlarmEngine.get(context)
    when (intent.action) {
      "com.pillsaathi.DEBUG_ADD_ALARM" -> {
        val minutes = intent.getIntExtra("minutes_from_now", 1)
        val at =
          Instant.ofEpochMilli(System.currentTimeMillis() + minutes * 60_000L)
            .atZone(ZoneId.systemDefault())
        val days =
          intent.getStringExtra("days")
            ?.split(',')
            ?.mapNotNull { it.trim().toIntOrNull() }
            ?.filter { it in 1..7 }
            ?.toSet()
            .orEmpty()
        val alarm =
          engine.save(
            id = null,
            hour = at.hour,
            minute = at.minute,
            days = days,
            name = intent.getStringExtra("name") ?: "Debug",
            soundId = intent.getStringExtra("sound_id"),
          )
        Log.i(LOG_TAG, "Added ${describe(alarm)}")
      }
      "com.pillsaathi.DEBUG_LIST" -> {
        val alarms = engine.alarms()
        Log.i(LOG_TAG, "${alarms.size} alarm(s)")
        alarms.forEach { Log.i(LOG_TAG, describe(it)) }
      }
      "com.pillsaathi.DEBUG_STOP" -> RingingService.stop(context)
      "com.pillsaathi.DEBUG_SNOOZE" -> RingingService.snooze(context)
      "com.pillsaathi.DEBUG_AUTO_SILENCE_MS" -> {
        DebugHooks.autoSilenceMsOverride = intent.getLongExtra("ms", -1L).takeIf { it > 0 }
        Log.i(LOG_TAG, "autoSilenceMsOverride=${DebugHooks.autoSilenceMsOverride}")
      }
    }
  }

  private fun describe(a: Alarm): String =
    "$a | next=${local(a.nextTriggerAt)} snooze=${local(a.snoozeUntil)} " +
      "lastFired=${local(a.lastFiredAt)}"

  private fun local(millis: Long?): String =
    millis?.let { Instant.ofEpochMilli(it).atZone(ZoneId.systemDefault()).toLocalDateTime() }
      .toString()
}
