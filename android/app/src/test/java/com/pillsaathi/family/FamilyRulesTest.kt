package com.pillsaathi.family

import com.pillsaathi.alarm.DoseOutcome
import com.pillsaathi.alarm.DosePill
import com.pillsaathi.alarm.DoseRecord
import com.pillsaathi.alarm.DoseTime
import com.pillsaathi.alarm.Pill
import com.pillsaathi.alarm.PillForm
import com.pillsaathi.alarm.RefillLevel
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZonedDateTime
import java.util.Random
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class FamilyRulesTest {
  private val kolkata = ZoneId.of("Asia/Kolkata")
  private val now = ist(10, 28, 15, 0)
  private val azee = Pill("p1", "Azee 500", PillForm.TABLET, 1.0, listOf(DoseTime(14, 0)), LocalDate.of(2026, 10, 1), null, 100L)
  private val amma = Follow("E", "Amma", null, 30, zone = "Asia/Kolkata", pills = listOf(azee))
  private val oct28 = LocalDate.of(2026, 10, 28)
  private val item = CheckItem("E", oct28, 14, 0, ist(10, 28, 14, 30))

  private fun ist(month: Int, day: Int, hour: Int, minute: Int): Long =
    ZonedDateTime.of(2026, month, day, hour, minute, 0, 0, kolkata).toInstant().toEpochMilli()

  private fun elder(pills: List<Pill> = listOf(azee), heardAt: Long? = ist(10, 28, 14, 50)) =
    ElderDoc("Asia/Kolkata", heardAt, "2026-10-01", pills, listOf("R"), emptyMap())

  private fun record(outcome: DoseOutcome) =
    DoseRecord(oct28, 14, 0, outcome, ist(10, 28, 14, 10), listOf(DosePill("p1", "Azee 500", PillForm.TABLET, 1.0)))

  @Test fun newCode_sixDigitsZeroPadded() {
    val random = object : Random() {
      override fun nextInt(bound: Int): Int = 42
    }
    assertEquals("000042", FamilyRules.newCode(random))
    assertEquals(6, FamilyRules.newCode(Random(7)).length)
  }

  @Test fun parseCode_forms() {
    assertEquals("482913", FamilyRules.parseCode("482 913"))
    assertEquals("482913", FamilyRules.parseCode("PILLSAATHI:482913"))
    assertNull(FamilyRules.parseCode("48291"))
    assertNull(FamilyRules.parseCode("4829134"))
    assertNull(FamilyRules.parseCode("abc"))
    assertEquals("PILLSAATHI:482913", FamilyRules.qrText("482913"))
  }

  @Test fun monthKey_byRecordDate() {
    val late = DoseRecord(LocalDate.of(2026, 10, 31), 23, 45, DoseOutcome.TAKEN, ist(11, 1, 0, 5), emptyList())
    val early = DoseRecord(LocalDate.of(2026, 11, 1), 0, 10, DoseOutcome.TAKEN, ist(11, 1, 0, 12), emptyList())
    assertEquals(mapOf("2026-10" to listOf(late), "2026-11" to listOf(early)), FamilyRules.byMonth(listOf(late, early)))
    assertEquals("2026-01", FamilyRules.monthKey(LocalDate.of(2026, 1, 31)))
  }

  @Test fun monthsToWrite_changedAndOld() {
    val (write, delete) = FamilyRules.monthsToWrite(
      mapOf("2026-10" to "a", "2026-11" to "b"),
      mapOf("2026-09" to "x", "2026-10" to "a", "2026-11" to "old"),
    )
    assertEquals(setOf("2026-11"), write)
    assertEquals(setOf("2026-09"), delete)
  }

  @Test fun checksBetween_delay() {
    assertEquals(listOf(item), FamilyRules.checksBetween(amma, ist(10, 28, 14, 0), now))
  }

  @Test fun checksBetween_off() {
    assertEquals(emptyList<CheckItem>(), FamilyRules.checksBetween(amma.copy(delayMinutes = null), ist(10, 28, 14, 0), now))
  }

  @Test fun checksBetween_lateDoseKeepsItsDate() {
    val late = amma.copy(pills = listOf(azee.copy(times = listOf(DoseTime(23, 45)))))
    assertEquals(
      listOf(CheckItem("E", LocalDate.of(2026, 10, 31), 23, 45, ist(11, 1, 0, 15))),
      FamilyRules.checksBetween(late, ist(10, 31, 23, 50), ist(11, 1, 0, 20)),
    )
  }

  @Test fun checksBetween_elderZoneAcrossDst() {
    val ny = amma.copy(zone = "America/New_York", pills = listOf(azee.copy(times = listOf(DoseTime(8, 0)))))
    val items = FamilyRules.checksBetween(
      ny, Instant.parse("2026-10-31T00:00:00Z").toEpochMilli(), Instant.parse("2026-11-02T00:00:00Z").toEpochMilli(),
    )
    assertEquals(
      listOf(Instant.parse("2026-10-31T12:30:00Z").toEpochMilli(), Instant.parse("2026-11-01T13:30:00Z").toEpochMilli()),
      items.map { it.checkAt },
    )
    assertEquals(listOf(LocalDate.of(2026, 10, 31), LocalDate.of(2026, 11, 1)), items.map { it.date })
  }

  @Test fun nextCheckAt_earliestAcrossFollows() {
    val appa = Follow(
      "F", "Appa", null, 15, zone = "Asia/Kolkata",
      pills = listOf(azee.copy(id = "p2", times = listOf(DoseTime(14, 10)))),
    )
    assertEquals(ist(10, 28, 14, 25), FamilyRules.nextCheckAt(listOf(amma, appa), ist(10, 28, 14, 0)))
    assertNull(FamilyRules.nextCheckAt(listOf(amma.copy(delayMinutes = null)), ist(10, 28, 14, 0)))
  }

  @Test fun decide_taken_none() {
    assertEquals(CheckDecision.None, FamilyRules.decide(item, elder(), listOf(record(DoseOutcome.TAKEN)), FamilyLocal(), now))
  }

  @Test fun decide_skipped_none() {
    assertEquals(CheckDecision.None, FamilyRules.decide(item, elder(), listOf(record(DoseOutcome.SKIPPED)), FamilyLocal(), now))
  }

  @Test fun decide_missed() {
    assertEquals(
      CheckDecision.Missed("Azee 500"),
      FamilyRules.decide(item, elder(), listOf(record(DoseOutcome.MISSED)), FamilyLocal(), now),
    )
  }

  @Test fun decide_noRecord_notReported() {
    val heard = ist(10, 28, 13, 12)
    assertEquals(
      CheckDecision.NotReported("Azee 500", heard),
      FamilyRules.decide(item, elder(heardAt = heard), emptyList(), FamilyLocal(), now),
    )
  }

  @Test fun decide_timeNoLongerDue_noPing() {
    val moved = elder(pills = listOf(azee.copy(times = listOf(DoseTime(15, 0)))))
    assertEquals(CheckDecision.NoLongerDue, FamilyRules.decide(item, moved, emptyList(), FamilyLocal(), now))
  }

  @Test fun decide_alreadyPinged_none() {
    val local = FamilyLocal(pinged = setOf(FamilyRules.pingKey(item)))
    assertEquals(CheckDecision.None, FamilyRules.decide(item, elder(), listOf(record(DoseOutcome.MISSED)), local, now))
    assertEquals("E|2026-10-28|14:0", FamilyRules.pingKey(item))
  }

  @Test fun decide_pastRetryWindow_expired() {
    val late = item.checkAt + FamilyRules.RETRY_WINDOW_MS + 1
    assertEquals(CheckDecision.Expired, FamilyRules.decide(item, elder(), listOf(record(DoseOutcome.MISSED)), FamilyLocal(), late))
  }

  @Test fun decide_silent_warnsOnce() {
    val heard = now - 13 * 3_600_000L
    assertEquals(CheckDecision.Silent(heard), FamilyRules.decide(item, elder(heardAt = heard), emptyList(), FamilyLocal(), now))
    val warned = FamilyLocal(silentWarned = mapOf("E" to heard))
    assertEquals(CheckDecision.None, FamilyRules.decide(item, elder(heardAt = heard), emptyList(), warned, now))
  }

  @Test fun decide_neverHeard_notReported() {
    assertEquals(
      CheckDecision.NotReported("Azee 500", null),
      FamilyRules.decide(item, elder(heardAt = null), emptyList(), FamilyLocal(), now),
    )
  }

  @Test fun decide_heardAgain_normal() {
    val heard = now - 3_600_000L
    val warned = FamilyLocal(silentWarned = mapOf("E" to now - 20 * 3_600_000L))
    assertEquals(CheckDecision.NotReported("Azee 500", heard), FamilyRules.decide(item, elder(heardAt = heard), emptyList(), warned, now))
  }

  @Test fun refillPings_oncePerLevel() {
    val counted = azee.copy(remaining = 4.0)
    val other = mapOf("F|p9" to RefillLevel.LOW)
    val (first, sent1) = FamilyRules.refillPings("E", listOf(counted), other, now, kolkata)
    assertEquals(listOf(RefillLevel.LOW), first.map { it.level })
    assertEquals(RefillLevel.LOW, sent1["E|p1"])
    val (again, sent2) = FamilyRules.refillPings("E", listOf(counted), sent1, now, kolkata)
    assertEquals(emptyList<RefillLevel>(), again.map { it.level })
    val (out, sent3) = FamilyRules.refillPings("E", listOf(counted.copy(remaining = 0.0)), sent2, now, kolkata)
    assertEquals(listOf(RefillLevel.OUT), out.map { it.level })
    val (refilled, sent4) = FamilyRules.refillPings("E", listOf(counted.copy(remaining = 30.0)), sent3, now, kolkata)
    assertTrue(refilled.isEmpty())
    assertFalse(sent4.containsKey("E|p1"))
    assertEquals(RefillLevel.LOW, sent4["F|p9"])
  }

  @Test fun prunePinged_keepsTwoDays() {
    val keys = setOf("E|2026-10-26|14:0", "E|2026-10-27|14:0", "E|2026-10-28|8:30")
    assertEquals(setOf("E|2026-10-27|14:0", "E|2026-10-28|8:30"), FamilyRules.prunePinged(keys, oct28))
  }

  @Test fun uploads_onlyWhenSharing() {
    assertFalse(FamilyRules.uploads(FamilyLocal()))
    assertTrue(FamilyRules.uploads(FamilyLocal(sharing = true)))
  }
}
