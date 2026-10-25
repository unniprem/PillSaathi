package com.pillsaathi.sound

import android.media.AudioAttributes
import android.media.MediaPlayer
import android.util.Log
import com.pillsaathi.alarm.LOG_TAG
import java.io.File

/**
 * Plays one sound at a time at media volume, so the user can hear a sound before choosing it.
 * Alarms ring through `AlarmPlayer` instead. Confined to one thread with a Looper: every call must
 * come from it, and the player's callbacks arrive on it.
 *
 * [onEnded] reports a preview's id when it ends by itself, by finishing or failing. Stopping one,
 * or starting another, doesn't report: the caller already knows.
 */
class SoundPreviewer(private val onEnded: (id: String) -> Unit) {
  private var player: MediaPlayer? = null
  private var playingId: String? = null

  /** Plays [file] once under [id], stopping any current preview. */
  fun play(id: String, file: File) {
    stop()
    val created = MediaPlayer()
    try {
      created.setAudioAttributes(
        AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).build(),
      )
      created.setDataSource(file.absolutePath)
      created.setOnCompletionListener { done -> if (done === player) endedByItself(id) }
      created.setOnErrorListener { failed, what, extra ->
        if (failed === player) {
          Log.w(LOG_TAG, "Preview error ($what, $extra) on ${file.name}")
          endedByItself(id)
        }
        true
      }
      created.prepare()
      created.start()
    } catch (e: Exception) {
      created.release()
      throw SoundException(SoundException.UNSUPPORTED_AUDIO, "Can't play ${file.name}", e)
    }
    player = created
    playingId = id
  }

  fun stop() {
    player?.release()
    player = null
    playingId = null
  }

  /** Stops the preview only if it is playing [id]. */
  fun stopIf(id: String) {
    if (playingId == id) stop()
  }

  private fun endedByItself(id: String) {
    stop()
    onEnded(id)
  }
}
