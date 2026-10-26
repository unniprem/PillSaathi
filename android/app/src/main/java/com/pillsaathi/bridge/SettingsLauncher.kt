package com.pillsaathi.bridge

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import com.pillsaathi.alarm.LOG_TAG
import com.pillsaathi.alarm.Notifications

/** Opens the system settings page for a [target]; App info when it has no page here. */
class SettingsLauncher(context: Context) {
  private val context = context.applicationContext

  /** True if the specific page opened, false if it fell back to App info. */
  fun open(target: String): Boolean {
    for (intent in candidatesFor(target)) {
      try {
        context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        return true
      } catch (e: ActivityNotFoundException) {
        Log.w(LOG_TAG, "No settings page for $target (${intent.component}); trying next", e)
      } catch (e: SecurityException) {
        Log.w(LOG_TAG, "Settings page for $target (${intent.component}) is not allowed; trying next", e)
      } catch (e: RuntimeException) {
        // Some ROMs throw other exceptions from their private activities.
        Log.w(LOG_TAG, "Settings page for $target (${intent.component}) failed; trying next", e)
      }
    }
    context.startActivity(appInfo().addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    return false
  }

  private fun candidatesFor(target: String): List<Intent> =
    when (target) {
      "oemAutostart",
      "oemBattery" -> OemIntents.candidates(context, Build.MANUFACTURER, target)
      else -> listOfNotNull(intentFor(target))
    }

  /** The page's intent, or null when this API level or target has none. */
  private fun intentFor(target: String): Intent? {
    val sdk = Build.VERSION.SDK_INT
    return when (target) {
      "notifications" ->
        if (sdk >= Build.VERSION_CODES.O)
          Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
            .putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
        else null
      "alarmChannel" ->
        if (sdk >= Build.VERSION_CODES.O)
          Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS)
            .putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
            .putExtra(Settings.EXTRA_CHANNEL_ID, Notifications.CHANNEL_RINGING)
        else null
      "exactAlarm" ->
        if (sdk >= Build.VERSION_CODES.S)
          Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, packageUri())
        else null
      "fullScreen" ->
        if (sdk >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE)
          Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, packageUri())
        else null
      "batteryOptimization" -> Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
      // The phone's text-to-speech voices; no public constant, but every Android has the page.
      "tts" -> Intent(TTS_SETTINGS)
      "alarmVolume" -> Intent(Settings.ACTION_SOUND_SETTINGS)
      "backgroundRestricted",
      "appInfo" -> appInfo()
      else -> null
    }
  }

  private fun appInfo() = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, packageUri())

  private fun packageUri(): Uri = Uri.parse("package:${context.packageName}")

  private companion object {
    const val TTS_SETTINGS = "com.android.settings.TTS_SETTINGS"
  }
}
