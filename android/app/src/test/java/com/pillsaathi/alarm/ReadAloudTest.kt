package com.pillsaathi.alarm

import com.pillsaathi.alarm.ReadAloudRules.Step
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ReadAloudTest {
  private val START = 1_000_000L

  // When to speak

  @Test fun decide_shortTone_speaksAtFirstPlayEnd() {
    assertEquals(Step.SPEAK_FROM_START, ReadAloudRules.decide(START + 2_000, START, null, atPlayEnd = true))
    assertEquals(START + 2_000, ReadAloudRules.nextCheckAt(START, START, null, msToPlayEnd = 2_000))
  }

  @Test fun decide_longSound_waitsUntil15s() {
    assertEquals(Step.WAIT, ReadAloudRules.decide(START + 14_900, START, null, atPlayEnd = false))
    assertEquals(Step.SPEAK_AND_RESUME, ReadAloudRules.decide(START + 15_000, START, null, atPlayEnd = false))
    assertEquals(START + 15_000, ReadAloudRules.nextCheckAt(START, START, null, msToPlayEnd = 180_000))
    assertEquals(START + 15_000, ReadAloudRules.nextCheckAt(START, START, null, msToPlayEnd = null))
  }

  @Test fun decide_14sRecording_neverCut() {
    assertEquals(START + 14_000, ReadAloudRules.nextCheckAt(START, START, null, msToPlayEnd = 14_000))
    assertEquals(Step.SPEAK_FROM_START, ReadAloudRules.decide(START + 14_000, START, null, atPlayEnd = true))
  }

  @Test fun decide_afterSpeech_playEndTooSoon_waits() {
    val last = START + 20_000
    assertEquals(Step.WAIT, ReadAloudRules.decide(last + 30_000, START, last, atPlayEnd = true))
  }

  @Test fun decide_afterSpeech_playEndAfter45s_speaks() {
    val last = START + 20_000
    assertEquals(Step.SPEAK_FROM_START, ReadAloudRules.decide(last + 46_000, START, last, atPlayEnd = true))
  }

  @Test fun decide_afterSpeech_midPlayAt60s_speaks() {
    val last = START + 20_000
    assertEquals(Step.WAIT, ReadAloudRules.decide(last + 59_999, START, last, atPlayEnd = false))
    assertEquals(Step.SPEAK_AND_RESUME, ReadAloudRules.decide(last + 60_000, START, last, atPlayEnd = false))
    assertEquals(last + 60_000, ReadAloudRules.nextCheckAt(last + 1, START, last, msToPlayEnd = 100_000))
  }

  // The controller

  @Test fun start_doesNotSpeakAtRingStart() {
    val (sound, voice, ticker) = rig()
    sound.atEnd = true // A sound's start counts as a play end too.
    readAloud(sound, voice, ticker).start()
    assertTrue(voice.spoken.isEmpty())
    ticker.advanceTo(START + 1_999)
    assertTrue(voice.spoken.isEmpty())
    ticker.advanceTo(START + 2_000)
    assertEquals(listOf(SPEECH.parts), voice.spoken)
  }

  @Test fun speechNeverStarts_soundNeverPaused() {
    val (sound, voice, ticker) = rig()
    readAloud(sound, voice, ticker).start()
    speakAtFirstPlayEnd(sound, ticker)
    ticker.advanceTo(START + 2_000 + ReadAloudRules.START_TIMEOUT_MS)
    assertEquals(1, voice.stops)
    voice.listener!!.onStarted() // Too late: ignored.
    voice.listener!!.onFinished()
    assertEquals(0, sound.pauses)
    assertTrue(sound.resumes.isEmpty())
  }

  @Test fun stopDuringSpeech_neverResumesSound() {
    val (sound, voice, ticker) = rig()
    val ra = readAloud(sound, voice, ticker)
    ra.start()
    speakAtFirstPlayEnd(sound, ticker)
    voice.listener!!.onStarted()
    assertEquals(1, sound.pauses)
    ra.stop()
    assertEquals(1, voice.stops)
    voice.listener!!.onFinished()
    ticker.advanceTo(START + 600_000)
    assertTrue(sound.resumes.isEmpty())
    assertEquals(1, voice.spoken.size)
  }

  @Test fun speechOverrun_stoppedAfter30s_resumes() {
    val (sound, voice, ticker) = rig()
    readAloud(sound, voice, ticker).start()
    speakAtFirstPlayEnd(sound, ticker)
    ticker.advanceTo(START + 2_100)
    voice.listener!!.onStarted()
    ticker.advanceTo(START + 2_100 + ReadAloudRules.SPEECH_MAX_MS - 1)
    assertTrue(sound.resumes.isEmpty())
    ticker.advanceTo(START + 2_100 + ReadAloudRules.SPEECH_MAX_MS)
    assertEquals(1, voice.stops)
    assertEquals(listOf(true), sound.resumes)
    voice.listener!!.onFinished() // Comes after the stop: ignored.
    assertEquals(listOf(true), sound.resumes)
  }

  @Test fun finished_resumesFromStartAtPlayEnd_inPlaceMidPlay() {
    val (short, voice, ticker) = rig()
    readAloud(short, voice, ticker).start()
    speakAtFirstPlayEnd(short, ticker)
    voice.listener!!.onStarted()
    voice.listener!!.onFinished()
    assertEquals(listOf(true), short.resumes)

    val (long, voice2, ticker2) = rig()
    long.msToEnd = 170_000
    readAloud(long, voice2, ticker2).start()
    ticker2.advanceTo(START + 15_000)
    assertEquals(1, voice2.spoken.size)
    voice2.listener!!.onStarted()
    voice2.listener!!.onFinished()
    assertEquals(listOf(false), long.resumes)
  }

  @Test fun afterSpeech_nextOneAtFirstPlayEndAfter45s() {
    val (sound, voice, ticker) = rig()
    sound.atEnd = true // A 2 s tone: every check lands on a play end.
    readAloud(sound, voice, ticker).start()
    ticker.advanceTo(START + 2_000)
    voice.listener!!.onStarted()
    ticker.advanceTo(START + 6_000)
    voice.listener!!.onFinished()
    ticker.advanceTo(START + 6_000 + 45_999)
    assertEquals(1, voice.spoken.size)
    ticker.advanceTo(START + 6_000 + 46_000)
    assertEquals(2, voice.spoken.size)
  }

  // The engine can take seconds to start: a play end it misses isn't a speech, so the next one
  // is tried, not one 45 s later.
  @Test fun voiceNotReady_triesAgainAtNextPlayEnd() {
    val (sound, voice, ticker) = rig()
    voice.ready = false
    sound.atEnd = true // A 2 s tone: every check lands on a play end.
    readAloud(sound, voice, ticker).start()
    ticker.advanceTo(START + 2_000)
    assertEquals(1, voice.spoken.size)
    voice.ready = true
    ticker.advanceTo(START + 4_000)
    assertEquals(2, voice.spoken.size)
    assertEquals(0, voice.stops)
  }

  @Test fun voiceNeverReady_noBusyLoopOnceSpeechIsDue() {
    val (sound, voice, ticker) = rig()
    voice.ready = false
    sound.msToEnd = 170_000 // A long song: speech is forced at 15 s, mid-play.
    readAloud(sound, voice, ticker).start()
    ticker.advanceTo(START + 25_000)
    assertTrue("${voice.spoken.size} tries", voice.spoken.size in 2..12)
    assertEquals(0, sound.pauses)
  }

  @Test fun noVoiceForAppLanguage_speaksEnglish() {
    val (sound, voice, ticker) = rig()
    voice.has = setOf(AppLanguage.EN)
    val ml = RingSpeech(
      AppLanguage.ML,
      listOf(SpeechPart("മരുന്ന് കഴിക്കാൻ സമയമായി.", AppLanguage.ML)),
      listOf(SpeechPart("Time for your medicines.", AppLanguage.EN)),
    )
    ReadAloud(sound, voice, ticker, ml, START).start()
    speakAtFirstPlayEnd(sound, ticker)
    assertEquals(listOf(ml.english), voice.spoken)
  }

  // Try it: what the phone can say for the app's language.
  @Test fun voiceAvailability_fallsBackToEnglishThenNone() {
    assertEquals(VoiceAvailability.FULL, VoiceAvailability.of(AppLanguage.ML, hasLanguage = true, hasEnglish = false))
    assertEquals(VoiceAvailability.ENGLISH_ONLY, VoiceAvailability.of(AppLanguage.ML, hasLanguage = false, hasEnglish = true))
    assertEquals(VoiceAvailability.NONE, VoiceAvailability.of(AppLanguage.HI, hasLanguage = false, hasEnglish = false))
    // Plain English is English: an app in English is fully spoken without an en-IN voice.
    assertEquals(VoiceAvailability.FULL, VoiceAvailability.of(AppLanguage.EN, hasLanguage = false, hasEnglish = true))
    assertEquals(VoiceAvailability.NONE, VoiceAvailability.of(AppLanguage.EN, hasLanguage = false, hasEnglish = false))
  }

  // Fakes

  private val SPEECH = RingSpeech(
    AppLanguage.EN,
    listOf(SpeechPart("Time for your medicines. Telma 40, 1 tablet.", AppLanguage.EN)),
    listOf(SpeechPart("Time for your medicines. Telma 40, 1 tablet.", AppLanguage.EN)),
  )

  private fun rig() = Triple(FakeSound(), FakeVoice(), ManualTicker(START))

  private fun readAloud(sound: FakeSound, voice: FakeVoice, ticker: ManualTicker) =
    ReadAloud(sound, voice, ticker, SPEECH, START)

  /** A 2 s tone ends its first play: the controller speaks. */
  private fun speakAtFirstPlayEnd(sound: FakeSound, ticker: ManualTicker) {
    sound.atEnd = true
    ticker.advanceTo(START + 2_000)
    sound.atEnd = false
    assertTrue(ticker.now() == START + 2_000)
  }

  private class FakeSound : RingSound {
    var msToEnd: Long? = 2_000
    var atEnd = false
    var pauses = 0
    val resumes = mutableListOf<Boolean>()

    override fun msToPlayEnd() = msToEnd

    override fun atPlayEnd() = atEnd

    override fun pause() {
      pauses++
    }

    override fun resume(fromStart: Boolean) {
      resumes.add(fromStart)
    }
  }

  private class FakeVoice : Voice {
    var has = AppLanguage.values().toSet()
    var ready = true
    val spoken = mutableListOf<List<SpeechPart>>()
    var listener: Voice.Listener? = null
    var stops = 0

    override fun hasVoice(lang: AppLanguage) = ready && lang in has

    override fun speak(parts: List<SpeechPart>, listener: Voice.Listener): Boolean {
      spoken.add(parts)
      this.listener = listener
      return ready
    }

    override fun stop() {
      stops++
    }

    override fun shutdown() {}
  }

  private class ManualTicker(private var t: Long) : Ticker {
    private class Task(val at: Long, val block: () -> Unit) {
      var cancelled = false
    }

    private val tasks = mutableListOf<Task>()

    override fun now() = t

    override fun after(delayMs: Long, block: () -> Unit): () -> Unit {
      val task = Task(t + delayMs, block)
      tasks.add(task)
      return { task.cancelled = true }
    }

    fun advanceTo(time: Long) {
      while (true) {
        val next = tasks.filter { !it.cancelled && it.at <= time }.minByOrNull { it.at } ?: break
        tasks.remove(next)
        t = next.at
        next.block()
      }
      t = time
    }
  }
}
