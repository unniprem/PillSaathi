package com.pillsaathi.alarm

import android.app.Notification
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.text.format.DateFormat
import android.util.Log
import androidx.core.app.NotificationChannelCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.pillsaathi.MainActivity
import com.pillsaathi.R
import java.util.Date

object Notifications {
  const val CHANNEL_RINGING = "alarms_ringing"
  const val CHANNEL_MISSED = "alarms_missed"
  const val CHANNEL_REFILL = "refill_reminders"
  const val RINGING_ID = 1001

  private const val FLAGS = PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT

  /** Creates the channels, or renames them after a language change. */
  fun ensureChannels(context: Context) {
    val words = words(context)
    val ringing =
      NotificationChannelCompat.Builder(CHANNEL_RINGING, NotificationManagerCompat.IMPORTANCE_HIGH)
        .setName(words.getString(R.string.channel_ringing))
        // RingingService plays and vibrates itself, at alarm volume.
        .setSound(null, null)
        .setVibrationEnabled(false)
        .build()
    val missed =
      NotificationChannelCompat.Builder(CHANNEL_MISSED, NotificationManagerCompat.IMPORTANCE_DEFAULT)
        .setName(words.getString(R.string.channel_missed))
        .build()
    val refill =
      NotificationChannelCompat.Builder(CHANNEL_REFILL, NotificationManagerCompat.IMPORTANCE_DEFAULT)
        .setName(words.getString(R.string.channel_refill))
        .build()
    NotificationManagerCompat.from(context).createNotificationChannelsCompat(listOf(ringing, missed, refill))
  }

  /** The ongoing ring: its pills by name, and expanded, one "name · amount" line per pill. */
  fun ringing(context: Context, ring: RingingState.Ring): Notification {
    val words = words(context)
    val screen = ringingScreenIntent(context)
    val names = if (ring.pills.isEmpty()) ring.name else ring.pills.joinToString(", ") { it.name }
    val lines =
      if (ring.pills.isEmpty()) ring.name else ring.pills.joinToString("\n") { "${it.name} · ${it.amount}" }
    return NotificationCompat.Builder(context, CHANNEL_RINGING)
      .setSmallIcon(R.drawable.ic_notification)
      .setContentTitle(formatTime(context, ring.startedAt))
      .setContentText(names)
      .setStyle(NotificationCompat.BigTextStyle().bigText(lines))
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setOngoing(true)
      .setContentIntent(screen)
      .setFullScreenIntent(screen, true)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .addAction(
        0,
        words.getString(R.string.action_taken),
        serviceIntent(context, RingingService.ACTION_TAKEN, ring.alarmId),
      )
      .addAction(
        0,
        words.getString(R.string.notification_snooze),
        serviceIntent(context, RingingService.ACTION_SNOOZE, ring.alarmId),
      )
      .build()
  }

  /** "Missed: 8:00 AM, Azithromycin 500, Telma 40": [MissedAlarm.name] holds the pill names. */
  fun postMissed(context: Context, missed: MissedAlarm) {
    val text =
      words(context).getString(R.string.missed_alarm, formatTime(context, missed.dueAt), missed.name)
    val open =
      PendingIntent.getActivity(context, 0, Intent(context, MainActivity::class.java), FLAGS)
    val notification =
      NotificationCompat.Builder(context, CHANNEL_MISSED)
        .setSmallIcon(R.drawable.ic_notification)
        .setContentText(text)
        .setContentIntent(open)
        .setAutoCancel(true)
        .build()
    try {
      NotificationManagerCompat.from(context).notify(missed.id.hashCode(), notification)
    } catch (e: SecurityException) {
      Log.w(LOG_TAG, "Notifications not allowed; missed alarm ${missed.id} not shown", e)
    }
  }

  /**
   * "Telma 40: 9 tablets left · about 4 days", or "Telma 40: none left", with the amount in the
   * app's language. One per pill, so a later level replaces an earlier one; tapping it opens the app.
   */
  fun postRefill(context: Context, w: RefillWarning) {
    val words = words(context)
    val text =
      if (w.level == RefillLevel.OUT) {
        words.getString(R.string.refill_out, w.name)
      } else {
        val days =
          if (w.daysLeft == 0) words.getString(R.string.refill_less_than_day)
          else words.resources.getQuantityString(R.plurals.refill_days, w.daysLeft, w.daysLeft)
        words.getString(R.string.refill_low, w.name, DoseRules.amountText(w.form, w.remaining, language(context)), days)
      }
    val open =
      PendingIntent.getActivity(context, 0, Intent(context, MainActivity::class.java), FLAGS)
    val notification =
      NotificationCompat.Builder(context, CHANNEL_REFILL)
        .setSmallIcon(R.drawable.ic_notification)
        .setContentText(text)
        .setStyle(NotificationCompat.BigTextStyle().bigText(text))
        .setContentIntent(open)
        .setAutoCancel(true)
        .build()
    try {
      NotificationManagerCompat.from(context).notify("refill:${w.pillId}".hashCode(), notification)
    } catch (e: SecurityException) {
      Log.w(LOG_TAG, "Notifications not allowed; refill for ${w.pillId} not shown", e)
    }
  }

  /** The app's language, or English if it can't be read. */
  private fun language(context: Context): AppLanguage =
    try {
      AlarmEngine.get(context).language()
    } catch (e: Exception) {
      Log.w(LOG_TAG, "Could not read the app language; using English", e)
      AppLanguage.EN
    }

  /**
   * [context] in the app's language, for the app's own words. Times are still formatted with
   * [context], so they look the same in every language.
   */
  private fun words(context: Context): Context =
    try {
      context.localized(AlarmEngine.get(context).language())
    } catch (e: Exception) {
      Log.w(LOG_TAG, "Could not localise the notification; using the phone's language", e)
      context
    }

  private fun ringingScreenIntent(context: Context): PendingIntent =
    PendingIntent.getActivity(context, 0, Intent(context, RingingActivity::class.java), FLAGS)

  private fun formatTime(context: Context, millis: Long): String =
    DateFormat.getTimeFormat(context).format(Date(millis))

  /** Taken or Snooze for [alarmId]'s ring only; each alarm's action is its own PendingIntent. */
  private fun serviceIntent(context: Context, action: String, alarmId: String): PendingIntent =
    PendingIntent.getService(
      context,
      0,
      RingingService.commandIntent(context, action, alarmId),
      FLAGS,
    )
}
