package com.pillsaathi.alarm

import android.content.Context
import android.media.AudioAttributes
import android.os.Build
import android.os.VibrationAttributes
import android.os.VibrationEffect
import android.os.Vibrator
import android.util.Log

/** Repeating alarm vibration, with alarm usage so silent and vibrate modes don't block it. */
class AlarmVibrator(context: Context) {
  private val vibrator: Vibrator? = context.getSystemService(Vibrator::class.java)

  fun start() {
    val v = vibrator ?: return
    try {
      if (!v.hasVibrator()) return
      when {
        Build.VERSION.SDK_INT >= 33 ->
          v.vibrate(
            VibrationEffect.createWaveform(PATTERN, 0),
            VibrationAttributes.createForUsage(VibrationAttributes.USAGE_ALARM),
          )
        Build.VERSION.SDK_INT >= 26 -> {
          val attrs =
            AudioAttributes.Builder()
              .setUsage(AudioAttributes.USAGE_ALARM)
              .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
              .build()
          @Suppress("DEPRECATION") v.vibrate(VibrationEffect.createWaveform(PATTERN, 0), attrs)
        }
        else -> @Suppress("DEPRECATION") v.vibrate(PATTERN, 0)
      }
    } catch (e: Exception) {
      Log.w(LOG_TAG, "Could not start vibration", e)
    }
  }

  fun stop() {
    try {
      vibrator?.cancel()
    } catch (e: Exception) {
      Log.w(LOG_TAG, "Could not stop vibration", e)
    }
  }

  private companion object {
    val PATTERN = longArrayOf(0, 800, 600)
  }
}
