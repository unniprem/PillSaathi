package com.pillsaathi.alarm

import android.content.Context
import android.media.AudioAttributes
import android.os.Handler
import android.os.Looper
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.util.Log
import java.util.Locale
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * [Voice] on the phone's text-to-speech engine, at alarm volume and through silent mode like the
 * alarm itself. Each part is spoken in its own language's voice (en-IN, ml-IN, hi-IN), or plain
 * English when the phone has none; a part with neither is skipped. Until the engine is ready, or
 * if it never is (none installed, or before the first unlock), [speak] does nothing. Listener
 * calls come on the main thread. Create, use and shut down on the main thread.
 */
class TtsVoice(context: Context) : Voice {
  private val main = Handler(Looper.getMainLooper())
  @Volatile private var ready = false
  private val initialised = CountDownLatch(1)

  /** Bumped by every [speak] and [stop]; callbacks for an older one are ignored. */
  private var generation = 0
  private var listener: Voice.Listener? = null
  private var lastId: String? = null
  private var started = false
  private var finished = false

  private val tts: TextToSpeech =
    TextToSpeech(context.applicationContext) { status ->
      ready = status == TextToSpeech.SUCCESS
      if (ready) Log.i(LOG_TAG, "Text-to-speech ready")
      else Log.w(LOG_TAG, "Text-to-speech didn't start ($status); this ring is sound only")
      initialised.countDown()
    }

  init {
    tts.setAudioAttributes(
      AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_ALARM)
        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
        .build(),
    )
    tts.setOnUtteranceProgressListener(
      object : UtteranceProgressListener() {
        override fun onStart(utteranceId: String) =
          onMain(utteranceId) {
            if (!started) {
              started = true
              Log.i(LOG_TAG, "Speech started")
              it.onStarted()
            }
          }

        override fun onDone(utteranceId: String) =
          onMain(utteranceId) { if (utteranceId == lastId) finish(it) }

        @Deprecated("Deprecated in Java")
        override fun onError(utteranceId: String) = failed(utteranceId)

        override fun onError(utteranceId: String, errorCode: Int) = failed(utteranceId)
      },
    )
  }

  override fun hasVoice(lang: AppLanguage): Boolean =
    ready &&
      try {
        tts.isLanguageAvailable(localeOf(lang)) >= TextToSpeech.LANG_AVAILABLE
      } catch (e: Exception) {
        false
      }

  /**
   * What the phone can say in [lang], waiting up to [INIT_WAIT_MS] for the engine to start.
   * Blocks: never call it on the main thread, which delivers the engine's start.
   */
  fun availability(lang: AppLanguage): VoiceAvailability {
    if (!initialised.await(INIT_WAIT_MS, TimeUnit.MILLISECONDS) || !ready) return VoiceAvailability.NONE
    return try {
      VoiceAvailability.of(
        lang,
        hasLanguage = tts.isLanguageAvailable(localeOf(lang)) >= TextToSpeech.LANG_AVAILABLE,
        hasEnglish = tts.isLanguageAvailable(Locale.ENGLISH) >= TextToSpeech.LANG_AVAILABLE,
      )
    } catch (e: Exception) {
      Log.w(LOG_TAG, "Could not ask text-to-speech for its voices", e)
      VoiceAvailability.NONE
    }
  }

  override fun speak(parts: List<SpeechPart>, listener: Voice.Listener): Boolean {
    generation++
    this.listener = listener
    lastId = null
    started = false
    finished = false
    if (!ready) {
      warnOnce("Text-to-speech isn't ready yet; not speaking")
      return false
    }
    try {
      tts.stop()
      Log.i(LOG_TAG, "Speaking ${parts.map { it.lang }}")
      parts.forEachIndexed { i, part ->
        if (!useLanguage(part.lang)) {
          warnOnce("No ${part.lang} or English voice; skipping a part")
          return@forEachIndexed
        }
        val id = "$generation:$i"
        if (tts.speak(part.text, TextToSpeech.QUEUE_ADD, null, id) == TextToSpeech.SUCCESS) lastId = id
      }
    } catch (e: Exception) {
      Log.e(LOG_TAG, "Could not speak", e)
    }
    return lastId != null
  }

  override fun stop() {
    generation++
    listener = null
    if (!ready) return
    try {
      tts.stop()
    } catch (e: Exception) {
      Log.w(LOG_TAG, "Could not stop text-to-speech", e)
    }
  }

  override fun shutdown() {
    stop()
    try {
      tts.shutdown()
    } catch (e: Exception) {
      Log.w(LOG_TAG, "Could not shut down text-to-speech", e)
    }
  }

  /** The voice for [lang], else plain English. False if the phone has neither. */
  private fun useLanguage(lang: AppLanguage): Boolean =
    tts.setLanguage(localeOf(lang)) >= TextToSpeech.LANG_AVAILABLE ||
      tts.setLanguage(Locale.ENGLISH) >= TextToSpeech.LANG_AVAILABLE

  private val warned = mutableSetOf<String>()

  /** Logs [message] the first time only: a ring may try every few seconds for ten minutes. */
  private fun warnOnce(message: String) {
    if (warned.add(message)) Log.w(LOG_TAG, message)
  }

  private fun failed(utteranceId: String) =
    onMain(utteranceId) {
      Log.w(LOG_TAG, "Text-to-speech failed on $utteranceId")
      stop()
      finish(it)
    }

  private fun finish(l: Voice.Listener) {
    if (finished) return
    finished = true
    Log.i(LOG_TAG, "Speech finished")
    l.onFinished()
  }

  /** Runs [block] on the main thread if [utteranceId] belongs to the current [speak]. */
  private fun onMain(utteranceId: String, block: (Voice.Listener) -> Unit) {
    main.post {
      val l = listener ?: return@post
      if (utteranceId.substringBefore(':') != generation.toString()) return@post
      block(l)
    }
  }

  companion object {
    private const val INIT_WAIT_MS = 3_000L

    fun localeOf(lang: AppLanguage): Locale = Locale(lang.code, "IN")
  }
}
