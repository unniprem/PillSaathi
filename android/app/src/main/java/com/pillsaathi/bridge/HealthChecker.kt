package com.pillsaathi.bridge

import android.app.ActivityManager
import android.app.AlarmManager
import android.app.NotificationManager
import android.content.Context
import android.media.AudioManager
import android.os.Build
import android.os.PowerManager
import androidx.core.app.NotificationManagerCompat
import com.pillsaathi.alarm.Notifications

/** What the phone currently allows, as the checks the setup and health banner need. */
data class Health(
  val notificationsEnabled: Boolean,
  val alarmChannelEnabled: Boolean,
  val exactAlarmAllowed: Boolean,
  val fullScreenAllowed: Boolean,
  val ignoringBatteryOptimizations: Boolean,
  val backgroundRestricted: Boolean,
  val alarmVolumeLow: Boolean,
)

class HealthChecker(context: Context) {
  private val context = context.applicationContext

  fun check(): Health =
    Health(
      notificationsEnabled = NotificationManagerCompat.from(context).areNotificationsEnabled(),
      alarmChannelEnabled = alarmChannelEnabled(),
      exactAlarmAllowed =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
          service<AlarmManager>(Context.ALARM_SERVICE).canScheduleExactAlarms(),
      fullScreenAllowed =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE ||
          NotificationManagerCompat.from(context).canUseFullScreenIntent(),
      ignoringBatteryOptimizations =
        service<PowerManager>(Context.POWER_SERVICE).isIgnoringBatteryOptimizations(context.packageName),
      backgroundRestricted =
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.P &&
          service<ActivityManager>(Context.ACTIVITY_SERVICE).isBackgroundRestricted,
      alarmVolumeLow = alarmVolumeLow(),
    )

  private fun alarmChannelEnabled(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return true
    val channel =
      service<NotificationManager>(Context.NOTIFICATION_SERVICE)
        .getNotificationChannel(Notifications.CHANNEL_RINGING)
    // A channel that doesn't exist yet isn't blocked.
    return channel == null || channel.importance != NotificationManager.IMPORTANCE_NONE
  }

  private fun alarmVolumeLow(): Boolean {
    val audio = service<AudioManager>(Context.AUDIO_SERVICE)
    val min =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P)
        audio.getStreamMinVolume(AudioManager.STREAM_ALARM)
      else 0
    return audio.getStreamVolume(AudioManager.STREAM_ALARM) <= min
  }

  @Suppress("UNCHECKED_CAST")
  private fun <T> service(name: String): T = context.getSystemService(name) as T
}
