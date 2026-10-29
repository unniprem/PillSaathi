package com.pillsaathi.family

import android.app.Notification
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.text.format.DateFormat
import android.util.Log
import androidx.core.app.NotificationChannelCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.pillsaathi.MainActivity
import com.pillsaathi.R
import com.pillsaathi.alarm.AlarmEngine
import com.pillsaathi.alarm.AppLanguage
import com.pillsaathi.alarm.DoseRules
import com.pillsaathi.alarm.RefillLevel
import com.pillsaathi.alarm.RefillWarning
import com.pillsaathi.alarm.localized
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Date
import java.util.Locale

/**
 * The relative's pings: ordinary notifications on two channels of their own, in the app's
 * language, with times on the elder's clock. Call opens the dialer with her number, when he saved
 * one; Open opens the app.
 */
object FamilyNotifications {
  const val CHANNEL_MISSED = "family_missed"
  const val CHANNEL_REFILL = "family_refill"
  const val CHANNEL_CHANGES = "family_changes"
  private const val CHANGES_ID = 2002

  private const val FLAGS = PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT

  /** Creates the channels, or renames them after a language change. Main process only. */
  fun ensureChannels(context: Context) {
    val words = words(context)
    val missed = NotificationChannelCompat.Builder(CHANNEL_MISSED, NotificationManagerCompat.IMPORTANCE_DEFAULT)
      .setName(words.getString(R.string.channel_family_missed))
      .build()
    val refill = NotificationChannelCompat.Builder(CHANNEL_REFILL, NotificationManagerCompat.IMPORTANCE_DEFAULT)
      .setName(words.getString(R.string.channel_family_refill))
      .build()
    val changes = NotificationChannelCompat.Builder(CHANNEL_CHANGES, NotificationManagerCompat.IMPORTANCE_DEFAULT)
      .setName(words.getString(R.string.channel_family_changes))
      .build()
    NotificationManagerCompat.from(context).createNotificationChannelsCompat(listOf(missed, refill, changes))
  }

  /**
   * On her phone: what her family changed at one check-in, one line each, such as "Ravi added
   * Telma 40 (8:00 AM, 8:00 PM)." Open opens the app, where Today shows the result.
   */
  fun postChanges(context: Context, applied: List<AppliedChange>) {
    val words = words(context)
    val clock = { t: com.pillsaathi.alarm.DoseTime -> clock(context, LocalTime.of(t.hour, t.minute)) }
    val tone = AlarmEngine.get(context).defaultToneName()
    val lines = applied.map { a ->
      val res = when (a.kind) {
        NoticeKind.ADDED -> R.string.family_change_added
        NoticeKind.CHANGED -> R.string.family_change_changed
        NoticeKind.DELETED -> R.string.family_change_deleted
        NoticeKind.SOUND -> R.string.family_change_sound
      }
      words.getString(res, *CheckIn.noticeArgs(a, clock, tone).toTypedArray())
    }
    val text = lines.joinToString("\n")
    val open = PendingIntent.getActivity(context, 0, Intent(context, MainActivity::class.java), FLAGS)
    val notification = NotificationCompat.Builder(context, CHANNEL_CHANGES)
      .setSmallIcon(android.R.drawable.ic_dialog_info)
      .setContentText(lines.first())
      .setStyle(NotificationCompat.BigTextStyle().bigText(text))
      .setContentIntent(open)
      .setAutoCancel(true)
      .build()
    try {
      ensureChannels(context)
      NotificationManagerCompat.from(context).notify(CHANGES_ID + applied.hashCode() % 1000, notification)
    } catch (e: SecurityException) {
      Log.w(FAMILY_TAG, "Notifications not allowed; a family change notice wasn't shown", e)
    }
  }

  /** "Amma hasn't taken Azee 500 (2:00 PM)." */
  fun postMissed(context: Context, follow: Follow, item: CheckItem, names: String) {
    val text = words(context).getString(R.string.family_missed, follow.name, names, doseTime(context, item))
    post(context, CHANNEL_MISSED, FamilyRules.pingKey(item).hashCode(), follow, text)
  }

  /** "Amma's phone hasn't reported the 2:00 PM dose (Azee 500). Last heard from at 1:12 PM." */
  fun postNotReported(context: Context, follow: Follow, item: CheckItem, names: String, heardAt: Long?) {
    val words = words(context)
    val text = if (heardAt == null) {
      words.getString(R.string.family_not_reported_never, follow.name, doseTime(context, item), names)
    } else {
      words.getString(R.string.family_not_reported, follow.name, doseTime(context, item), names, heardText(context, follow, heardAt))
    }
    post(context, CHANNEL_MISSED, FamilyRules.pingKey(item).hashCode(), follow, text)
  }

  /** "We haven't heard from Amma's phone since 8:05 AM. Alarms on it may not be ringing…" */
  fun postSilent(context: Context, follow: Follow, heardAt: Long) {
    val text = words(context).getString(R.string.family_silent, follow.name, heardText(context, follow, heardAt))
    post(context, CHANNEL_MISSED, "silent|${follow.elderId}".hashCode(), follow, text)
  }

  /** "Amma's Telma 40: 4 tablets left", or "Amma's Telma 40: none left". */
  fun postRefill(context: Context, follow: Follow, w: RefillWarning) {
    val words = words(context)
    val text = if (w.level == RefillLevel.OUT) {
      words.getString(R.string.family_refill_out, follow.name, w.name)
    } else {
      words.getString(R.string.family_refill_low, follow.name, w.name, DoseRules.amountText(w.form, w.remaining, language(context)))
    }
    post(context, CHANNEL_REFILL, "frefill|${follow.elderId}|${w.pillId}".hashCode(), follow, text)
  }

  /** The quiet notification an older phone shows while a check runs in the foreground. */
  fun checking(context: Context): Notification {
    ensureChannels(context)
    return NotificationCompat.Builder(context, CHANNEL_MISSED)
      .setSmallIcon(android.R.drawable.ic_dialog_info)
      .setContentText(words(context).getString(R.string.family_checking))
      .setSilent(true)
      .setPriority(NotificationCompat.PRIORITY_MIN)
      .build()
  }

  private fun post(context: Context, channel: String, id: Int, follow: Follow, text: String) {
    val words = words(context)
    val open = PendingIntent.getActivity(context, 0, Intent(context, MainActivity::class.java), FLAGS)
    val builder = NotificationCompat.Builder(context, channel)
      .setSmallIcon(android.R.drawable.ic_dialog_info)
      .setContentText(text)
      .setStyle(NotificationCompat.BigTextStyle().bigText(text))
      .setContentIntent(open)
      .setAutoCancel(true)
    follow.phone?.let { phone ->
      // The dialer, with her number in it: no call permission, and he still taps to call.
      val dial = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone"))
      builder.addAction(0, words.getString(R.string.family_call), PendingIntent.getActivity(context, id, dial, FLAGS))
    }
    builder.addAction(0, words.getString(R.string.family_open), open)
    try {
      ensureChannels(context)
      NotificationManagerCompat.from(context).notify(id, builder.build())
    } catch (e: SecurityException) {
      Log.w(FAMILY_TAG, "Notifications not allowed; a family ping wasn't shown", e)
    }
  }

  /** The dose's own time, as on her phone. */
  private fun doseTime(context: Context, item: CheckItem): String = clock(context, LocalTime.of(item.hour, item.minute))

  /** When her phone was heard from, on her clock: "1:12 PM", or "Tue 27 Oct, 8:05 AM" on another day. */
  private fun heardText(context: Context, follow: Follow, heardAt: Long): String {
    val zone = FamilyRules.zoneOf(follow.zone) ?: ZoneId.systemDefault()
    val (date, time) = FamilyRules.heardLabel(heardAt, System.currentTimeMillis(), zone)
    val clock = clock(context, time)
    if (date == null) return clock
    val day = DateTimeFormatter.ofPattern("EEE d MMM", Locale(language(context).code)).format(date)
    return words(context).getString(R.string.family_day_time, day, clock)
  }

  /** [time] in the phone's 12- or 24-hour format. */
  private fun clock(context: Context, time: LocalTime): String {
    val instant = LocalDate.now().atTime(time).atZone(ZoneId.systemDefault()).toInstant()
    return DateFormat.getTimeFormat(context).format(Date.from(instant))
  }

  private fun language(context: Context): AppLanguage =
    try {
      AlarmEngine.get(context).language()
    } catch (e: Exception) {
      Log.w(FAMILY_TAG, "Could not read the app language; using English", e)
      AppLanguage.EN
    }

  private fun words(context: Context): Context =
    try {
      context.localized(language(context))
    } catch (e: Exception) {
      Log.w(FAMILY_TAG, "Could not localise the ping; using the phone's language", e)
      context
    }
}
