package com.pillsaathi.alarm

import com.pillsaathi.alarm.ReadAloudRules.Step
import kotlin.math.max

/** The looping alarm sound, as read aloud needs it. */
interface RingSound {
  /** Ms until the current play ends, or null when that isn't known (nothing plays, say). */
  fun msToPlayEnd(): Long?

  /** Whether the sound is within [ReadAloudRules.PLAY_END_SLACK_MS] of a play's end or start. */
  fun atPlayEnd(): Boolean

  fun pause()

  /** Plays again after [pause], from the beginning or where it stopped. Never leaves it silent. */
  fun resume(fromStart: Boolean)
}

/** A text-to-speech voice. */
interface Voice {
  /** Whether it can speak [lang] now. False until it is ready. */
  fun hasVoice(lang: AppLanguage): Boolean

  /**
   * Speaks [parts] in order, each in its own language, replacing anything it was saying. False if
   * it can't speak yet (not ready): nothing was queued and [listener] won't be called.
   */
  fun speak(parts: List<SpeechPart>, listener: Listener): Boolean

  fun stop()

  fun shutdown()

  interface Listener {
    fun onStarted()

    /** The speech ended, or failed. At most once per [speak]. */
    fun onFinished()
  }
}

/** A clock and timer, so the controller can be tested without Android. */
interface Ticker {
  fun now(): Long

  /** Runs [block] after [delayMs]. The returned function cancels it. */
  fun after(delayMs: Long, block: () -> Unit): () -> Unit
}

/**
 * Speaks a ring's pills at breaks in its sound ([ReadAloudRules]), pausing the sound only once the
 * voice has actually started. The sound never waits for speech: a voice that doesn't start in
 * [ReadAloudRules.START_TIMEOUT_MS] is given up without touching the sound, and one that runs past
 * [ReadAloudRules.SPEECH_MAX_MS] is stopped and the sound resumed. After [stop], nothing here
 * touches the sound again. One thread only (the ringing service's main thread).
 */
class ReadAloud(
  private val sound: RingSound,
  private val voice: Voice,
  private val ticker: Ticker,
  private val speech: RingSpeech,
  private val ringStart: Long,
  private val log: (String) -> Unit = {},
) {
  private var stopped = false
  private var lastSpeechEnd: Long? = null
  /** The one timer armed: the next check, the start timeout or the speech watchdog. */
  private var cancelTimer: (() -> Unit)? = null
  /** The speech in progress; callbacks from any other are stale and ignored. */
  private var current: Speaking? = null

  fun start() {
    if (!stopped) scheduleCheck()
  }

  fun stop() {
    stopped = true
    current = null
    disarm()
    voice.stop()
  }

  private fun check() {
    if (stopped) return
    val step = ReadAloudRules.decide(ticker.now(), ringStart, lastSpeechEnd, sound.atPlayEnd())
    if (step != Step.WAIT) log("Read aloud ${ticker.now() - ringStart} ms into the ring: $step")
    when (step) {
      Step.SPEAK_FROM_START -> speak(fromStart = true)
      Step.SPEAK_AND_RESUME -> speak(fromStart = false)
      Step.WAIT -> scheduleCheck()
    }
  }

  private fun speak(fromStart: Boolean) {
    val speaking = Speaking(fromStart)
    current = speaking
    arm(ReadAloudRules.START_TIMEOUT_MS) { giveUp(speaking) }
    // A phone with no voice for the app's language hears it all in English.
    val parts =
      if (speech.lang == AppLanguage.EN || voice.hasVoice(speech.lang)) speech.parts else speech.english
    if (!voice.speak(parts, speaking)) {
      // Not ready (the engine can take seconds to start). Nothing was said, so this isn't a
      // speech: try again at the next play end, or soon if speech is already due.
      if (current === speaking) current = null
      val now = ticker.now()
      val at = ReadAloudRules.nextCheckAt(now, ringStart, lastSpeechEnd, sound.msToPlayEnd())
      arm(max(at - now, NOT_READY_RETRY_MS)) { check() }
    }
  }

  /** The voice never started: forget it, and leave the sound as it is. */
  private fun giveUp(speaking: Speaking) {
    if (current !== speaking) return
    current = null
    voice.stop()
    lastSpeechEnd = ticker.now()
    scheduleCheck()
  }

  private fun finish(speaking: Speaking) {
    if (current !== speaking) return
    current = null
    disarm()
    if (speaking.started) sound.resume(speaking.fromStart)
    lastSpeechEnd = ticker.now()
    scheduleCheck()
  }

  private fun scheduleCheck() {
    val now = ticker.now()
    val at = ReadAloudRules.nextCheckAt(now, ringStart, lastSpeechEnd, sound.msToPlayEnd())
    // Never a busy loop when a check lands just before a play's end.
    arm(max(at - now, MIN_CHECK_DELAY_MS)) { check() }
  }

  private fun arm(delayMs: Long, block: () -> Unit) {
    disarm()
    cancelTimer = ticker.after(delayMs, block)
  }

  private fun disarm() {
    cancelTimer?.invoke()
    cancelTimer = null
  }

  private inner class Speaking(val fromStart: Boolean) : Voice.Listener {
    var started = false

    override fun onStarted() {
      if (current !== this || started) return
      started = true
      sound.pause()
      arm(ReadAloudRules.SPEECH_MAX_MS) {
        if (current === this) voice.stop()
        finish(this)
      }
    }

    override fun onFinished() = finish(this)
  }

  private companion object {
    const val MIN_CHECK_DELAY_MS = 50L
    const val NOT_READY_RETRY_MS = 1_000L
  }
}
