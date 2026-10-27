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
 * Read aloud pauses and resumes it ([RingSound]). Main thread only.
 */
class AlarmPlayer(context: Context) : RingSound {
  private val context = context.applicationContext
  private var player: MediaPlayer? = null
  private var sources: List<Source> = emptyList()
  /** Where the sound was at the last [atPlayEnd], to see a loop restart between looks. */
  private var lastPosition: Long? = null

  /** Keeps the phone awake while speech has the sound paused: a paused player lets it sleep. */
  private val pausedLock: PowerManager.WakeLock? =
    try {
      this.context
        .getSystemService(PowerManager::class.java)
        .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "PillSaathi:read-aloud")
        .apply { setReferenceCounted(false) }
    } catch (e: Exception) {
      Log.w(LOG_TAG, "No wake lock for read aloud", e)
      null
    }

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
    lastPosition = null
    releasePausedLock()
  }

  override fun msToPlayEnd(): Long? =
    try {
      player?.let { mp -> mp.duration.takeIf { it > 0 }?.let { (it - mp.currentPosition).coerceAtLeast(0).toLong() } }
    } catch (e: Exception) {
      null
    }

  override fun atPlayEnd(): Boolean =
    try {
      val mp = player
      if (mp == null) {
        false
      } else {
        val position = mp.currentPosition.toLong()
        ReadAloudRules.atPlayEnd(position, mp.duration.toLong(), lastPosition).also { lastPosition = position }
      }
    } catch (e: Exception) {
      false
    }

  override fun pause() {
    try {
      val mp = player ?: return
      pausedLock?.acquire(ReadAloudRules.SPEECH_MAX_MS + PAUSED_LOCK_MARGIN_MS)
      mp.pause()
      Log.i(LOG_TAG, "Sound paused for speech")
    } catch (e: Exception) {
      Log.w(LOG_TAG, "Could not pause the alarm sound for speech; it keeps playing", e)
    }
  }

  /** Plays again from [fromStart] or where it paused; if that fails, starts the sounds over. */
  override fun resume(fromStart: Boolean) {
    lastPosition = null
    try {
      val mp = player
      if (mp == null) {
        restart()
      } else {
        if (fromStart) mp.seekTo(0)
        mp.start()
        Log.i(LOG_TAG, "Sound resumed ${if (fromStart) "from the start" else "where it paused"}")
      }
    } catch (e: Exception) {
      Log.w(LOG_TAG, "Could not resume the alarm sound; starting it again", e)
      restart()
    } finally {
      releasePausedLock()
    }
  }

  /** Every sound again from the first, as at the start of the ring. Nothing once stopped. */
  private fun restart() {
    if (sources.isEmpty()) return
    player?.release()
    player = null
    playFrom(0)
  }

  private fun releasePausedLock() {
    try {
      pausedLock?.takeIf { it.isHeld }?.release()
    } catch (e: Exception) {
      Log.w(LOG_TAG, "Could not release the read-aloud wake lock", e)
    }
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
    val mp =
      try {
        MediaPlayer()
      } catch (e: Exception) {
        Log.w(LOG_TAG, "Could not create a player for ${source.label}", e)
        return null
      }
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
        try {
          if (failed === player) {
            Log.w(LOG_TAG, "Playback error ($what, $extra) on ${source.label}; trying the next sound")
            player = null
            failed.release()
            playFrom(index + 1)
          }
        } catch (e: Exception) {
          Log.e(LOG_TAG, "Could not move on from ${source.label}", e)
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

  private companion object {
    const val PAUSED_LOCK_MARGIN_MS = 10_000L
  }
}
