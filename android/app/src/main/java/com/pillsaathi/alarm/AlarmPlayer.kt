package com.pillsaathi.alarm

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.PowerManager
import android.util.Log
import com.pillsaathi.R
import java.io.File
import java.io.FileInputStream

/**
 * Loops an alarm sound at alarm volume. Falls back from the alarm's own file to the phone's
 * default alarm tone to the bundled tone, so a missing or broken sound never means silence.
 * Main thread only.
 */
class AlarmPlayer(context: Context) {
  private val context = context.applicationContext
  private var player: MediaPlayer? = null
  private var sources: List<Source> = emptyList()

  private sealed class Source(val label: String) {
    class SoundFile(val file: File) : Source("sound file ${file.name}")

    class Tone(val uri: Uri, label: String) : Source(label)

    object Bundled : Source("bundled fallback tone")
  }

  fun start(file: File?) {
    stop()
    sources =
      listOfNotNull<Source>(file?.let { Source.SoundFile(it) }) + defaultTones() + Source.Bundled
    playFrom(0)
  }

  fun stop() {
    player?.release()
    player = null
    sources = emptyList()
  }

  private fun playFrom(first: Int) {
    for (index in first until sources.size) {
      val mp = tryStart(index)
      if (mp != null) {
        player = mp
        return
      }
    }
    Log.e(LOG_TAG, "No alarm sound could be played")
  }

  private fun tryStart(index: Int): MediaPlayer? {
    val source = sources[index]
    val mp = MediaPlayer()
    return try {
      mp.setAudioAttributes(
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_ALARM)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build(),
      )
      mp.setWakeMode(context, PowerManager.PARTIAL_WAKE_LOCK)
      setDataSource(mp, source)
      mp.isLooping = true
      mp.setOnErrorListener { failed, what, extra ->
        if (failed === player) {
          Log.w(LOG_TAG, "Playback error ($what, $extra) on ${source.label}; trying the next sound")
          failed.release()
          player = null
          playFrom(index + 1)
        }
        true
      }
      mp.prepare()
      mp.start()
      Log.i(LOG_TAG, "Playing ${source.label}")
      mp
    } catch (e: Exception) {
      Log.w(LOG_TAG, "Could not play ${source.label}; trying the next sound", e)
      mp.release()
      null
    }
  }

  /**
   * The phone's default alarm tone. The tone it names usually lives in MediaProvider, which can't
   * be read before the first unlock after a reboot, so the settings URI is tried too: it plays the
   * same tone from a cache in device-protected storage.
   */
  private fun defaultTones(): List<Source> {
    val cached = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
    val actual =
      try {
        RingtoneManager.getActualDefaultRingtoneUri(context, RingtoneManager.TYPE_ALARM)
      } catch (e: Exception) {
        Log.w(LOG_TAG, "Could not read the default alarm tone setting", e)
        null
      }
    return listOfNotNull(actual ?: cached, cached.takeIf { actual != null && actual != it })
      .map { Source.Tone(it, "default alarm tone ($it)") }
  }

  private fun setDataSource(mp: MediaPlayer, source: Source) {
    when (source) {
      is Source.SoundFile -> FileInputStream(source.file).use { mp.setDataSource(it.fd) }
      is Source.Tone -> mp.setDataSource(context, source.uri)
      Source.Bundled ->
        context.resources.openRawResourceFd(R.raw.fallback_alarm).use { mp.setDataSource(it) }
    }
  }
}
