package com.pillsaathi.alarm

import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Test

class RefillRulesTest {
  private val TODAY = LocalDate.of(2026, 10, 26)

  private fun stored(remaining: Double?, notified: RefillLevel? = null) =
    Pill(
      "p1", "Telma 40", PillForm.TABLET, 1.0, listOf(DoseTime(8, 0)), TODAY, null, 0L,
      remaining = remaining, refillNotified = notified,
    )

  private fun draft(remaining: Double?, changed: Boolean, id: String? = "p1", form: PillForm = PillForm.TABLET) =
    PillDraft(id, "Telma 40", form, 1.0, listOf(DoseTime(8, 0)), false, null, remaining = remaining, remainingChanged = changed)

  // Saving a pill

  @Test fun savedCount_newPill_usesDraft() =
    assertEquals(30.0 to null, RefillRules.savedCount(null, draft(30.0, changed = false, id = null)))

  // The pill page was open while a ring's Taken lowered the count: saving it mustn't put 30 back.
  @Test fun savedCount_untouched_keepsStored() =
    assertEquals(29.0 to RefillLevel.LOW, RefillRules.savedCount(stored(29.0, RefillLevel.LOW), draft(30.0, changed = false)))

  @Test fun savedCount_raised_rearms() =
    assertEquals(33.0 to null, RefillRules.savedCount(stored(3.0, RefillLevel.OUT), draft(33.0, changed = true)))

  @Test fun savedCount_lowered_keepsNotified() =
    assertEquals(8.0 to RefillLevel.LOW, RefillRules.savedCount(stored(9.0, RefillLevel.LOW), draft(8.0, changed = true)))

  @Test fun savedCount_cleared_notCounted() =
    assertEquals(null to null, RefillRules.savedCount(stored(9.0, RefillLevel.LOW), draft(null, changed = true)))

  @Test fun savedCount_syrup_null() =
    assertEquals(
      null to null,
      RefillRules.savedCount(stored(9.0, RefillLevel.LOW), draft(null, changed = false, form = PillForm.SYRUP)),
    )
}
