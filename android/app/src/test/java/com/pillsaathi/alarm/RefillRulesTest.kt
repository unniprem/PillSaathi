package com.pillsaathi.alarm

import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class RefillRulesTest {
  private val IST = ZoneId.of("Asia/Kolkata")
  private val TODAY = LocalDate.of(2026, 10, 26)

  private fun oct(d: Int, h: Int, mi: Int): Long =
    LocalDateTime.of(2026, 10, d, h, mi).atZone(IST).toInstant().toEpochMilli()

  private val NOW = oct(26, 10, 0)

  private fun date(d: Int): LocalDate = LocalDate.of(2026, 10, d)

  /** Telma 40, 1 tablet at 8:00 and 21:00 from today with no end, unless stated. */
  private fun counted(
    remaining: Double?,
    amount: Double = 1.0,
    form: PillForm = PillForm.TABLET,
    start: LocalDate = TODAY,
    days: Int? = null,
    notified: RefillLevel? = null,
    id: String = "p1",
    createdAt: Long = 0L,
  ) = Pill(
    id, "Telma 40", form, amount, listOf(DoseTime(8, 0), DoseTime(21, 0)), start, days, createdAt,
    remaining = remaining, refillNotified = notified,
  )

  private fun snap(p: Pill, amount: Double = p.amount) = DosePill(p.id, p.name, p.form, amount)

  private fun taken(vararg pills: DosePill) = DoseRecord(TODAY, 8, 0, DoseOutcome.TAKEN, NOW, pills.toList())

  private fun low(remaining: Double, daysLeft: Int, id: String = "p1") =
    RefillWarning(id, "Telma 40", PillForm.TABLET, remaining, daysLeft, RefillLevel.LOW)

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

  // Days left and the warning

  @Test fun daysLeft_floorsAndCountsHalves() {
    assertEquals(4, RefillRules.daysLeft(counted(9.0)))
    assertEquals(9, RefillRules.daysLeft(counted(9.0, amount = 0.5)))
    assertNull(RefillRules.daysLeft(counted(null)))
  }

  @Test fun warning_fiveDaysOrFewer_low() {
    assertEquals(low(10.0, 5), RefillRules.warning(counted(10.0), NOW, IST))
    assertNull(RefillRules.warning(counted(12.0), NOW, IST))
  }

  @Test fun warning_zero_out() =
    assertEquals(
      RefillWarning("p1", "Telma 40", PillForm.TABLET, 0.0, 0, RefillLevel.OUT),
      RefillRules.warning(counted(0.0), NOW, IST),
    )

  // Last day Oct 28: 21:00 today, then two on each of the 27th and 28th, so 5 doses are left.
  @Test fun warning_courseEndsFirst_none() {
    assertNull(RefillRules.warning(counted(5.0, start = date(24), days = 5), NOW, IST))
    assertEquals(low(4.0, 2), RefillRules.warning(counted(4.0, start = date(24), days = 5), NOW, IST))
  }

  // The evening of the last day: the final dose is taken and the count is 0. Nothing to nag about.
  @Test fun warning_lastDoseTaken_none() =
    assertNull(RefillRules.warning(counted(0.0, start = date(22), days = 5), oct(26, 22, 0), IST))

  @Test fun warning_syrupOrNotCounted_none() {
    assertNull(RefillRules.warning(counted(null), NOW, IST))
    assertNull(RefillRules.warning(counted(3.0, form = PillForm.SYRUP, amount = 5.0), NOW, IST))
    assertNull(RefillRules.warning(counted(0.0, start = date(20), days = 3), NOW, IST))
  }

  @Test fun warnings_inAddOrder() {
    val later = counted(2.0, id = "b", createdAt = 2L)
    val first = counted(4.0, id = "a", createdAt = 1L)
    val plenty = counted(30.0, id = "c", createdAt = 0L)
    assertEquals(listOf(low(4.0, 2, "a"), low(2.0, 1, "b")), RefillRules.warnings(listOf(later, plenty, first), NOW, IST))
  }

  @Test fun dosesLeft_notStarted_fromStartDate() {
    assertEquals(4, RefillRules.dosesLeft(counted(10.0, start = date(28), days = 2), NOW, IST))
    assertNull(RefillRules.dosesLeft(counted(10.0), NOW, IST))
  }

  // Taken

  @Test fun afterTaken_lowersBySnapshotAmount() {
    val p = counted(10.0)
    assertEquals(8.5, RefillRules.afterTaken(listOf(p), taken(snap(p, 1.5)), NOW, IST).pills.single().remaining!!, 0.0)
  }

  @Test fun afterTaken_neverBelowZero() {
    val p = counted(0.5)
    assertEquals(0.0, RefillRules.afterTaken(listOf(p), taken(snap(p)), NOW, IST).pills.single().remaining!!, 0.0)
  }

  @Test fun afterTaken_skipsDeletedAndUncounted() {
    val uncounted = counted(null, id = "u")
    val syrup = counted(null, id = "s", form = PillForm.SYRUP, amount = 5.0)
    val notInDose = counted(10.0, id = "o")
    val deleted = DosePill("gone", "Old pill", PillForm.TABLET, 1.0)
    val u = RefillRules.afterTaken(listOf(uncounted, syrup, notInDose), taken(deleted, snap(uncounted), snap(syrup)), NOW, IST)
    assertEquals(listOf(uncounted, syrup, notInDose), u.pills)
    assertEquals(emptyList<RefillWarning>(), u.notices)
  }

  @Test fun afterTaken_noticeOncePerLevel() {
    var pill = counted(11.0)
    val notices = mutableListOf<Pair<Double, RefillLevel>>()
    repeat(11) {
      val u = RefillRules.afterTaken(listOf(pill), taken(snap(pill)), NOW, IST)
      pill = u.pills.single()
      u.notices.forEach { notices.add(it.remaining to it.level) }
    }
    assertEquals(listOf(10.0 to RefillLevel.LOW, 0.0 to RefillLevel.OUT), notices)
    assertEquals(RefillLevel.OUT, pill.refillNotified)
  }

  @Test fun afterTaken_rearmedAfterRefill() {
    val p = counted(8.0, notified = null)
    val u = RefillRules.afterTaken(listOf(p), taken(snap(p)), NOW, IST)
    assertEquals(listOf(low(7.0, 3)), u.notices)
    assertEquals(RefillLevel.LOW, u.pills.single().refillNotified)
  }

  // Mark as taken on Today, then the notification's Taken: the count goes down once.
  @Test fun takenNow_alreadyTaken_false() {
    val t = taken(snap(counted(10.0)))
    assertFalse(RefillRules.takenNow(t, t))
    assertTrue(RefillRules.takenNow(null, t))
    assertTrue(RefillRules.takenNow(t.copy(outcome = DoseOutcome.MISSED), t))
    assertFalse(RefillRules.takenNow(null, t.copy(outcome = DoseOutcome.SKIPPED)))
    assertFalse(RefillRules.takenNow(null, null))
  }
}
