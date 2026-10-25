package com.pillsaathi.alarm

import com.pillsaathi.alarm.RingCommands.Verdict
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class RingCommandsTest {
  private val started = 50_000L

  private fun ring(id: String, followsAnother: Boolean) =
    RingingState.Ring(id, "Pills", "Tone", 1_000L, started, followsAnother)

  @Test fun command_forAnotherAlarm_isIgnored() =
    // A's Stop arriving after B has taken over (a double tap, or A's stale notification action).
    assertEquals(
      Verdict.OTHER_RING,
      RingCommands.judge("a", ring("b", followsAnother = true), started + 5_000L),
    )

  @Test fun command_insideGuardAfterQueueAdvance_isIgnored() =
    assertEquals(
      Verdict.TOO_SOON,
      RingCommands.judge("b", ring("b", followsAnother = true), started + RingCommands.GUARD_MS - 1),
    )

  @Test fun command_afterGuardWindow_isHonoured() =
    assertEquals(
      Verdict.ACT,
      RingCommands.judge("b", ring("b", followsAnother = true), started + RingCommands.GUARD_MS),
    )

  @Test fun command_forFirstRing_hasNoGuard() =
    assertEquals(Verdict.ACT, RingCommands.judge("a", ring("a", followsAnother = false), started + 10))

  @Test fun command_withoutId_actsOnCurrentRing_evenInsideGuard() =
    assertEquals(Verdict.ACT, RingCommands.judge(null, ring("b", followsAnother = true), started + 10))

  @Test fun command_withNothingRinging() =
    assertEquals(Verdict.NOTHING_RINGING, RingCommands.judge("a", null, started))

  @Test fun inGuard_onlyForARingThatReplacedAnother_andOnlyBriefly() {
    assertTrue(RingCommands.inGuard(ring("b", followsAnother = true), started))
    assertFalse(RingCommands.inGuard(ring("b", followsAnother = true), started + 1_500L))
    assertFalse(RingCommands.inGuard(ring("a", followsAnother = false), started))
  }
}
