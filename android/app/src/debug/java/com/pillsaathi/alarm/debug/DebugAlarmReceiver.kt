package com.pillsaathi.alarm.debug

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.pillsaathi.alarm.Alarm
import com.pillsaathi.alarm.AlarmEngine
import com.pillsaathi.alarm.AppLanguage
import com.pillsaathi.alarm.DebugHooks
import com.pillsaathi.alarm.DoseOutcome
import com.pillsaathi.alarm.DoseRules
import com.pillsaathi.alarm.DoseTime
import com.pillsaathi.alarm.LOG_TAG
import com.pillsaathi.alarm.PillDraft
import com.pillsaathi.alarm.PillForm
import com.pillsaathi.alarm.RingingService
import java.time.Instant
import java.time.LocalDate
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
      // A pill whose one time is minutes_from_now away; days 0 means no end; photo is the name of a
      // photo already in the store; remaining is the tablets left (not counted when absent).
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
              photo = intent.getStringExtra("photo"),
              remaining =
                if (intent.hasExtra("remaining")) intent.getFloatExtra("remaining", 0f).toDouble() else null,
              remainingChanged = intent.hasExtra("remaining"),
            ),
          )
        Log.i(LOG_TAG, "Added $pill")
      }
      // Records the pills due at date hour:minute as taken, skipped or missed, for checking History.
      "com.pillsaathi.DEBUG_ADD_DOSE" -> {
        val zone = ZoneId.systemDefault()
        val date = LocalDate.parse(intent.getStringExtra("date") ?: return)
        val hour = intent.getIntExtra("hour", 8)
        val minute = intent.getIntExtra("minute", 0)
        val outcome = DoseOutcome.values().firstOrNull { it.json == intent.getStringExtra("outcome") }
        if (outcome == null) {
          Log.w(LOG_TAG, "DEBUG_ADD_DOSE needs --es outcome taken|skipped|missed")
          return
        }
        val dueAt = date.atTime(hour, minute).atZone(zone).toInstant().toEpochMilli()
        val card = Alarm("debug", hour, minute, DoseRules.EVERY_DAY, "", null, true, null, null, null, 0L)
        val store = engine.store
        val record = store.locked {
          DoseRules.doseRecord(card, store.loadPills(), dueAt, outcome, dueAt, zone)?.also {
            store.saveDoses(DoseRules.withRecord(store.loadDoses(), it, LocalDate.now(zone)))
          }
        }
        Log.i(LOG_TAG, record?.let { "Added dose $it" } ?: "No pill due on $date at $hour:$minute; nothing added")
      }
      "com.pillsaathi.DEBUG_LIST" -> {
        val alarms = engine.alarms()
        Log.i(LOG_TAG, "${alarms.size} card(s)")
        alarms.forEach { Log.i(LOG_TAG, describe(it)) }
        val pills = engine.pills()
        Log.i(LOG_TAG, "${pills.size} pill(s)")
        pills.forEach { Log.i(LOG_TAG, it.toString()) }
        val doses = engine.store.locked { engine.store.loadDoses() }
        Log.i(LOG_TAG, "${doses.size} dose record(s)")
        doses.forEach {
          Log.i(
            LOG_TAG,
            "Dose %s %02d:%02d %s at=%s pills=%s".format(
              it.date, it.hour, it.minute, it.outcome, local(it.at), it.pills.map { p -> p.name },
            ),
          )
        }
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
      // lang en|ml|hi stores that language, lang phone follows the phone; read_aloud true|false.
      "com.pillsaathi.DEBUG_SETTINGS" -> {
        val lang = intent.getStringExtra("lang")
        if (lang != null && lang != "phone" && AppLanguage.fromCode(lang) == null) {
          Log.w(LOG_TAG, "Unknown lang $lang; settings unchanged")
          return
        }
        engine.updateSettings { s ->
          s.copy(
            language = if (lang == null) s.language else AppLanguage.fromCode(lang),
            readAloud =
              if (intent.hasExtra("read_aloud")) intent.getBooleanExtra("read_aloud", true) else s.readAloud,
          )
        }
        Log.i(LOG_TAG, "Settings ${engine.settings()}, speaking ${engine.language()}")
      }
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
