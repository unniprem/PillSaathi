package com.pillsaathi.alarm

/**
 * Decides whether a Stop or Snooze reaches the ring that is current. Pure, so it can be unit
 * tested.
 *
 * A command names the alarm whose ring it was meant for. When that ring ends, a queued alarm
 * starts in its place on the same screen and in the same notification, so a double tap, or a stale
 * notification action, would otherwise end that next alarm unseen.
 */
object RingCommands {
  /** How long a ring that has just replaced another ignores Stop and Snooze. */
  const val GUARD_MS = 1_500L

  enum class Verdict {
    /** End the current ring as asked. */
    ACT,

    /** Nothing is ringing. */
    NOTHING_RINGING,

    /** The command was meant for a ring that has already ended. */
    OTHER_RING,

    /** The current ring only just replaced another, so the tap was likely meant for that one. */
    TOO_SOON,
  }

  /**
   * [commandId] is the alarm the command was sent for, or null for one that means "whatever rings
   * now" (the debug receiver). [nowElapsed] is `SystemClock.elapsedRealtime()`.
   */
  fun judge(commandId: String?, current: RingingState.Ring?, nowElapsed: Long): Verdict =
    when {
      current == null -> Verdict.NOTHING_RINGING
      commandId == null -> Verdict.ACT
      commandId != current.alarmId -> Verdict.OTHER_RING
      inGuard(current, nowElapsed) -> Verdict.TOO_SOON
      else -> Verdict.ACT
    }

  /** Whether [ring] replaced another less than [GUARD_MS] ago. A first ring is never guarded. */
  fun inGuard(ring: RingingState.Ring, nowElapsed: Long): Boolean =
    ring.followsAnother && nowElapsed - ring.startedElapsed < GUARD_MS
}
