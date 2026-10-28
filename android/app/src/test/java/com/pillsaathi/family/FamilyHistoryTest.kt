package com.pillsaathi.family

import com.pillsaathi.alarm.DoseOutcome
import com.pillsaathi.alarm.DosePill
import com.pillsaathi.alarm.DoseRecord
import com.pillsaathi.alarm.DoseTime
import com.pillsaathi.alarm.Pill
import com.pillsaathi.alarm.PillForm
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZonedDateTime
import org.junit.Assert.assertEquals
import org.junit.Test

/** Her History on the relative's phone never shows a day better than what came in. */
class FamilyHistoryTest {
  private val kolkata = ZoneId.of("Asia/Kolkata")
  private val azee = Pill(
    "p1", "Azee 500", PillForm.TABLET, 1.0, listOf(DoseTime(8, 0), DoseTime(14, 0), DoseTime(21, 0)),
    LocalDate.of(2026, 10, 1), null, 100L,
  )
  private val now = ist(28, 15, 0)
  private val october = LocalDate.of(2026, 10, 1) to LocalDate.of(2026, 10, 31)

  private fun ist(day: Int, hour: Int, minute: Int): Long =
    ZonedDateTime.of(2026, 10, day, hour, minute, 0, 0, kolkata).toInstant().toEpochMilli()

  private fun oct(day: Int) = LocalDate.of(2026, 10, day)

  private fun taken(day: Int, hour: Int) =
    DoseRecord(oct(day), hour, 0, DoseOutcome.TAKEN, ist(day, hour, 5), listOf(DosePill("p1", "Azee 500", PillForm.TABLET, 1.0)))

  private fun unreported(records: List<DoseRecord>, heardAt: Long?, from: LocalDate = october.first, to: LocalDate = october.second) =
    FamilyRules.unreported(listOf(azee), records, heardAt, from, to, now, kolkata)

  @Test fun unreported_fromTheDayLastHeard() {
    // Heard from at 6 PM yesterday: its 8 AM and 2 PM came in, its 9 PM and today's didn't.
    val records = listOf(taken(26, 8), taken(26, 14), taken(26, 21), taken(27, 8), taken(27, 14))
    val got = unreported(records, ist(27, 18, 0))
    assertEquals(listOf(oct(27) to 21, oct(28) to 8, oct(28) to 14), got.map { it.date to it.hour })
    assertEquals(listOf("Azee 500"), got.first().pills.map { it.name })
  }

  @Test fun unreported_neverBeforeTheDayLastHeard() {
    // The 25th has no records, but her phone records every dose before it uploads, gaps included.
    assertEquals(emptyList<UnreportedDose>(), unreported(listOf(taken(28, 8), taken(28, 14)), ist(28, 14, 30)))
  }

  @Test fun unreported_onlyPastTimesInRange() {
    val got = unreported(emptyList(), ist(27, 18, 0), from = oct(27), to = oct(27))
    assertEquals(listOf(oct(27) to 8, oct(27) to 14, oct(27) to 21), got.map { it.date to it.hour })
    // Today's 9 PM is still to come.
    assertEquals(listOf(8, 14), unreported(emptyList(), ist(28, 9, 0), from = oct(28), to = oct(28)).map { it.hour })
  }

  @Test fun unreported_neverHeard_none() {
    assertEquals(emptyList<UnreportedDose>(), unreported(emptyList(), null))
  }
}
