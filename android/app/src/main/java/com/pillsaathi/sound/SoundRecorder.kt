package com.pillsaathi.sound

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.MediaRecorder
import android.os.Build
import android.os.Handler
import android.util.Log
import com.pillsaathi.alarm.LOG_TAG
import java.io.File

/**
 * Records one take at a time into a scratch file, for the Record screen: AAC in MPEG-4, mono,
 * 44.1 kHz, 128 kbps, stopping by itself at 2 minutes. Confined to [handler]'s thread: every call
 * must come from it, and the recorder's callbacks and level polls run on it.
 */
class SoundRecorder(
  context: Context,
  private val handler: Handler,
  private val onLevel: (level: Double) -> Unit,
  private val onAutoStopped: (durationMs: Long) -> Unit,
) {
  private val context = context.applicationContext

  /** The take, in device-protected storage like the library it is moved into. */
  val takeFile = File(this.context.createDeviceProtectedStorageContext().cacheDir, TAKE_NAME)

  private var recorder: MediaRecorder? = null

  /** The length of the finished take in [takeFile], or null when there is none. */
  var takeDurationMs: Long? = null
    private set

  private val pollLevel =
    object : Runnable {
      override fun run() {
        val active = recorder ?: return
        val level =
          try {
            active.maxAmplitude / MAX_AMPLITUDE
          } catch (e: RuntimeException) {
            0.0
          }
        onLevel(level.coerceIn(0.0, 1.0))
        handler.postDelayed(this, LEVEL_INTERVAL_MS)
      }
    }

  /** Starts a new take, replacing any unsaved one. */
  fun start() {
    if (recorder != null) throw SoundException(SoundException.BUSY, "Already recording")
    if (context.checkSelfPermission(Manifest.permission.RECORD_AUDIO) !=
      PackageManager.PERMISSION_GRANTED
    ) {
      throw SoundException(SoundException.MIC_PERMISSION, "The microphone permission is off")
    }
    discard()
    val created = newRecorder()
    try {
      created.setAudioSource(MediaRecorder.AudioSource.MIC)
      created.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
      created.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
      created.setAudioSamplingRate(SAMPLE_RATE_HZ)
      created.setAudioChannels(1)
      created.setAudioEncodingBitRate(BIT_RATE)
      created.setMaxDuration(MAX_DURATION_MS)
      created.setOutputFile(takeFile.absolutePath)
      created.setOnInfoListener { source, what, _ ->
        if (what == MediaRecorder.MEDIA_RECORDER_INFO_MAX_DURATION_REACHED && source === recorder) {
          // 0 only if the take couldn't be kept; it is gone, and saving it reports NOT_FOUND.
          onAutoStopped(finish() ?: 0L)
        }
      }
      created.setOnErrorListener { _, what, extra ->
        // stop() then fails or leaves an unreadable file, so the take is dropped as too short.
        Log.w(LOG_TAG, "Recorder error ($what, $extra)")
      }
      created.prepare()
      created.start()
    } catch (e: Exception) {
      release(created)
      takeFile.delete()
      throw e
    }
    recorder = created
    handler.postDelayed(pollLevel, LEVEL_INTERVAL_MS)
  }

  /**
   * Stops recording and returns the take's length. If the recorder already stopped at the limit,
   * returns that take's length instead.
   */
  fun stop(): Long {
    if (recorder == null) {
      return takeDurationMs ?: throw SoundException(SoundException.NOT_FOUND, "Nothing recorded")
    }
    return finish()
      ?: throw SoundException(SoundException.RECORDING_TOO_SHORT, "The recording was too short")
  }

  /** Stops any recording, which releases the microphone, and deletes the take. */
  fun discard() {
    recorder?.let {
      recorder = null
      handler.removeCallbacks(pollLevel)
      release(it)
    }
    takeDurationMs = null
    if (takeFile.exists() && !takeFile.delete()) Log.w(LOG_TAG, "Could not delete the take")
  }

  /**
   * Stops the recorder and keeps the take if it is readable audio. Returns its length, or null
   * after deleting it: stop() throws when almost nothing was recorded.
   */
  private fun finish(): Long? {
    val active = recorder ?: return null
    recorder = null
    handler.removeCallbacks(pollLevel)
    val stopped =
      try {
        active.stop()
        true
      } catch (e: RuntimeException) {
        Log.w(LOG_TAG, "Recorder stop failed; dropping the take", e)
        false
      }
    release(active)
    val durationMs = if (stopped) audioDurationMs(takeFile) else null
    if (durationMs == null) takeFile.delete()
    takeDurationMs = durationMs
    return durationMs
  }

  @Suppress("DEPRECATION") // MediaRecorder() is the only constructor before API 31.
  private fun newRecorder(): MediaRecorder =
    if (Build.VERSION.SDK_INT >= 31) MediaRecorder(context) else MediaRecorder()

  private fun release(target: MediaRecorder) {
    try {
      target.release()
    } catch (e: RuntimeException) {
      Log.w(LOG_TAG, "Could not release the recorder", e)
    }
  }

  private companion object {
    const val TAKE_NAME = "take.m4a"
    const val SAMPLE_RATE_HZ = 44_100
    const val BIT_RATE = 128_000
    const val MAX_DURATION_MS = 120_000
    const val LEVEL_INTERVAL_MS = 100L
    const val MAX_AMPLITUDE = 32_767.0
  }
}
