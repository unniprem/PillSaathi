package com.pillsaathi.alarm

import kotlin.math.min

/**
 * When a ring speaks its pills. Speech waits for a break in the sound, so a relative's short
 * recording is never cut off: the first time at the end of the first play, or 15 s into the ring
 * if a long sound is still playing; after that at the first play end at least 45 s after the last
 * speech, or 60 s after it if the sound is mid-play. Times are on one clock (elapsed ms). Pure.
 */
object ReadAloudRules {
  const val FIRST_MAX_MS = 15_000L
  const val MIN_GAP_MS = 45_000L
  const val MAX_GAP_MS = 60_000L
  /** Speech that hasn't started by then is given up, and the sound never paused for it. */
  const val START_TIMEOUT_MS = 3_000L
  /** Speech still going after this is stopped, and the sound comes back. */
  const val SPEECH_MAX_MS = 30_000L
  /** How close to a play's end or start counts as "at a play end". */
  const val PLAY_END_SLACK_MS = 300L
  /** How far into a play a just-wrapped position still counts as its start. */
  const val WRAP_SLACK_MS = 600L

  enum class Step {
    /** At a play end: speak, then start the sound again from its beginning. */
    SPEAK_FROM_START,
    /** Mid-play, but speech is due: pause the sound, speak, and carry on where it stopped. */
    SPEAK_AND_RESUME,
    WAIT,
  }

  /**
   * Whether a looping sound at [position] of [duration] is at a break: within
   * [PLAY_END_SLACK_MS] of a play's end or start, or back near the start ([WRAP_SLACK_MS]) having
   * wrapped since the last look at [lastPosition]. A looping player's reported position stalls at
   * the loop point and then jumps, so a look meant for the end can land just past either side.
   * With no last look (a ring's first, or the first after speech), a position that near the start
   * is a wrap too: [ReadAloud] only looks at play ends, never at the start of a play.
   */
  fun atPlayEnd(position: Long, duration: Long, lastPosition: Long?): Boolean {
    if (duration <= 0) return false
    if (position <= PLAY_END_SLACK_MS || duration - position <= PLAY_END_SLACK_MS) return true
    return (lastPosition == null || position < lastPosition) && position <= WRAP_SLACK_MS
  }

  fun decide(now: Long, ringStart: Long, lastSpeechEnd: Long?, atPlayEnd: Boolean): Step =
    when {
      atPlayEnd && (lastSpeechEnd == null || now - lastSpeechEnd >= MIN_GAP_MS) -> Step.SPEAK_FROM_START
      now >= forcedAt(ringStart, lastSpeechEnd) -> Step.SPEAK_AND_RESUME
      else -> Step.WAIT
    }

  /** When to look again: at the next play end, or when speech is forced, whichever is first. */
  fun nextCheckAt(now: Long, ringStart: Long, lastSpeechEnd: Long?, msToPlayEnd: Long?): Long {
    val forced = forcedAt(ringStart, lastSpeechEnd)
    return if (msToPlayEnd == null) forced else min(now + msToPlayEnd, forced)
  }

  private fun forcedAt(ringStart: Long, lastSpeechEnd: Long?): Long =
    lastSpeechEnd?.plus(MAX_GAP_MS) ?: (ringStart + FIRST_MAX_MS)
}
