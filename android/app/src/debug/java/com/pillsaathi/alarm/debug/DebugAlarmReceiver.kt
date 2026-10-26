package com.pillsaathi.alarm.debug

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.pillsaathi.alarm.Alarm
import com.pillsaathi.alarm.AlarmEngine
import com.pillsaathi.alarm.DebugHooks
import com.pillsaathi.alarm.DoseTime
import com.pillsaathi.alarm.LOG_TAG
import com.pillsaathi.alarm.PillDraft
import com.pillsaathi.alarm.PillForm
import com.pillsaathi.alarm.RingingService
import java.time.Instant
import java.time.ZoneId

/**
 * Debug builds only: lets adb drive the pill engine without the UI, e.g.
 * `adb shell am broadcast -a com.pillsaathi.DEBUG_ADD_PILL -n com.pillsaathi/.alarm.debug.DebugAlarmReceiver --ei minutes_from_now 2 --es name A`
 */
class DebugAlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    // Runs in `:ringing`: a failure here (a full disk, say) must not take a ring down with it.
    try {
      handle(context, intent)
    } catch (e: Exception) {
      Log.e(LOG_TAG, "Debug command ${intent.action} failed", e)
    }
  }

  private fun handle(context: Context, intent: Intent) {
    val engine = AlarmEngine.get(context)
    when (intent.action) {
      // A pill whose one time is minutes_from_now away; days 0 means no end.
      "com.pillsaathi.DEBUG_ADD_PILL" -> {
        val minutes = intent.getIntExtra("minutes_from_now", 1)
        val at =
          Instant.ofEpochMilli(System.currentTimeMillis() + minutes * 60_000L)
            .atZone(ZoneId.systemDefault())
        val form = PillForm.fromJson(intent.getStringExtra("form") ?: "tablet") ?: PillForm.TABLET
        val amount =
          if (intent.hasExtra("amount")) intent.getFloatExtra("amount", 0f).toDouble() else form.initial
        val days = intent.getIntExtra("days", 0).takeIf { it > 0 }
        val pill =
          engine.savePill(
            PillDraft(
              id = null,
              name = intent.getStringExtra("name") ?: "Debug pill",
              form = form,
              amount = amount,
              times = listOf(DoseTime(at.hour, at.minute)),
              startsTomorrow = intent.getBooleanExtra("start_tomorrow", false),
              days = days,
            ),
          )
        Log.i(LOG_TAG, "Added $pill")
      }
      "com.pillsaathi.DEBUG_LIST" -> {
        val alarms = engine.alarms()
        Log.i(LOG_TAG, "${alarms.size} card(s)")
        alarms.forEach { Log.i(LOG_TAG, describe(it)) }
        val pills = engine.pills()
        Log.i(LOG_TAG, "${pills.size} pill(s)")
        pills.forEach { Log.i(LOG_TAG, it.toString()) }
        val today = engine.today()
        Log.i(LOG_TAG, "Today ${today.date}: ${today.cards.size} card(s)")
        today.cards.forEach {
          Log.i(
            LOG_TAG,
            "%02d:%02d %s at=%s alarm=%s pills=%s".format(
              it.hour,
              it.minute,
              it.status,
              local(it.statusAt),
              it.alarmId,
              it.pills.map { p -> p.name + if (p.fromTomorrow) " (from tomorrow)" else "" },
            ),
          )
        }
      }
      // With no alarm_id these act on whatever rings now; with one, only on that card's ring, as
      // the ringing screen and the notification do.
      "com.pillsaathi.DEBUG_TAKEN" -> RingingService.taken(context, intent.getStringExtra("alarm_id"))
      "com.pillsaathi.DEBUG_SKIP" -> RingingService.skip(context, intent.getStringExtra("alarm_id"))
      "com.pillsaathi.DEBUG_SNOOZE" ->
        RingingService.snooze(context, intent.getStringExtra("alarm_id"))
      // Simulates the system destroying RingingService mid-ring.
      "com.pillsaathi.DEBUG_STOP_SERVICE" ->
        context.stopService(Intent(context, RingingService::class.java))
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
