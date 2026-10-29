package com.pillsaathi.family

import com.pillsaathi.alarm.DoseOutcome
import com.pillsaathi.alarm.DosePill
import com.pillsaathi.alarm.DoseRecord
import com.pillsaathi.alarm.DoseStatus
import com.pillsaathi.alarm.DoseTime
import com.pillsaathi.alarm.Pill
import com.pillsaathi.alarm.PillForm
import com.pillsaathi.alarm.RefillLevel
import com.pillsaathi.alarm.Today
import com.pillsaathi.alarm.TodayCard
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

  @Test fun elderToday_recordWins() {
    val morning = azee.copy(times = listOf(DoseTime(8, 0), DoseTime(14, 0)))
    val taken = DoseRecord(oct28, 8, 0, DoseOutcome.TAKEN, ist(10, 28, 8, 3), emptyList())
    val card = FamilyRules.elderToday(listOf(morning), listOf(taken), now, kolkata).cards.first()
    assertEquals(DoseStatus.TAKEN, card.status)
    assertEquals(ist(10, 28, 8, 3), card.statusAt)
  }

  @Test fun elderToday_pastNoRecord_notReported() {
    val card = FamilyRules.elderToday(listOf(azee), emptyList(), now, kolkata).cards.single()
    assertEquals(DoseStatus.NOT_REPORTED, card.status)
    assertEquals(14, card.hour)
    assertEquals("Azee 500", card.pills.single().name)
  }

  @Test fun elderToday_future_upcoming() {
    val night = azee.copy(times = listOf(DoseTime(21, 0)))
    assertEquals(DoseStatus.UPCOMING, FamilyRules.elderToday(listOf(night), emptyList(), now, kolkata).cards.single().status)
  }

  @Test fun elderToday_notStarted_neverNotReported() {
    val tomorrow = azee.copy(startDate = LocalDate.of(2026, 10, 29))
    val card = FamilyRules.elderToday(listOf(tomorrow), emptyList(), now, kolkata).cards.single()
    assertEquals(DoseStatus.LATER, card.status)
    assertEquals(ist(10, 29, 14, 0), card.statusAt)
  }

  @Test fun elderToday_herDate() {
    val late = Instant.parse("2026-10-28T23:30:00Z").toEpochMilli()
    assertEquals(LocalDate.of(2026, 10, 29), FamilyRules.elderToday(listOf(azee), emptyList(), late, kolkata).date)
  }

  @Test fun elderToday_refills() {
    val refills = FamilyRules.elderToday(listOf(azee.copy(remaining = 4.0)), emptyList(), now, kolkata).refills
    assertEquals(listOf(RefillLevel.LOW), refills.map { it.level })
  }

  @Test fun tally_counts() {
    fun c(status: DoseStatus) = TodayCard(null, 8, 0, null, emptyList(), status, null)
    val today = Today(
      oct28,
      listOf(DoseStatus.TAKEN, DoseStatus.TAKEN, DoseStatus.MISSED, DoseStatus.NOT_REPORTED, DoseStatus.UPCOMING).map(::c),
      emptyList(),
    )
    assertEquals(Tally(2, 0, 1, 1, 1), FamilyRules.tally(today))
    assertEquals(Tally(0, 0, 0, 0, 0), FamilyRules.tally(today.copy(cards = listOf(c(DoseStatus.LATER)))))
  }

  @Test fun card_silentAndAbandoned() {
    val quiet = FamilyRules.card(amma.copy(heardAt = now - 13 * 3_600_000L), now, kolkata)
    assertTrue(quiet.silent)
    assertFalse(quiet.abandoned)
    val gone = FamilyRules.card(amma.copy(heardAt = now - 31 * 86_400_000L), now, kolkata)
    assertTrue(gone.silent)
    assertTrue(gone.abandoned)
    val fresh = FamilyRules.card(amma.copy(heardAt = now - 60_000L), now, kolkata)
    assertFalse(fresh.silent)
    assertEquals(Tally(0, 0, 0, 1, 0), fresh.tally)
  }

  @Test fun card_otherZone() {
    assertTrue(FamilyRules.card(amma, now, ZoneId.of("Europe/London")).otherZone)
    assertFalse(FamilyRules.card(amma, now, kolkata).otherZone)
  }

  @Test fun afterRefresh_refused_dropsFollow() {
    assertNull(FamilyRules.afterRefresh(amma, null, emptyList()))
  }

  @Test fun afterRefresh_keepsSettings() {
    val mine = amma.copy(phone = "+919800000000", delayMinutes = 15, photos = mapOf("p1" to "a.jpg"), since = 1L)
    val rec = record(DoseOutcome.TAKEN)
    val doc = ElderDoc("Europe/London", 9L, "2026-02-01", listOf(azee.copy(name = "Azee 250")), listOf("R"), emptyMap())
    assertEquals(
      mine.copy(zone = "Europe/London", heardAt = 9L, oldest = "2026-02-01", pills = doc.pills, recent = listOf(rec)),
      FamilyRules.afterRefresh(mine, doc, listOf(rec)),
    )
  }

  @Test fun afterRefresh_setsEditorAndCopiesHerSetup() {
    val doc = elder().copy(
      editors = listOf("R"), cards = listOf(CardSound(14, 0, null, null)), sounds = listOf(SoundRef("s1", "Bell")),
      health = ElderHealth(true, true, true, true, true, true, true),
    )
    val mine = FamilyRules.afterRefresh(amma, doc, emptyList(), "R")!!
    assertTrue(mine.editor)
    assertEquals(doc.cards, mine.cards)
    assertEquals(doc.sounds, mine.sounds)
    assertEquals(doc.health, mine.health)
    assertFalse(FamilyRules.afterRefresh(amma, doc, emptyList(), "S")!!.editor)
  }

  @Test fun healthProblem_namesTheFirstProblemInOrder() {
    val fine = ElderHealth(true, true, true, true, true, true, true)
    assertNull(FamilyRules.healthProblem(null))
    assertNull(FamilyRules.healthProblem(fine))
    assertEquals("notifications", FamilyRules.healthProblem(fine.copy(notifications = false, battery = false)))
    assertEquals("alarmChannel", FamilyRules.healthProblem(fine.copy(alarmChannel = false)))
    assertEquals("exactAlarms", FamilyRules.healthProblem(fine.copy(exactAlarms = false, setupSeen = false)))
    assertEquals("fullScreen", FamilyRules.healthProblem(fine.copy(fullScreen = false)))
    assertEquals("battery", FamilyRules.healthProblem(fine.copy(battery = false, unrestricted = false)))
    assertEquals("restricted", FamilyRules.healthProblem(fine.copy(unrestricted = false)))
    assertEquals("setup", FamilyRules.healthProblem(fine.copy(setupSeen = false)))
  }

  @Test fun wallClock_showsElderTime() {
    val london = ZoneId.of("Europe/London")
    val shifted = FamilyRules.wallClock(Instant.parse("2026-11-10T08:30:00Z").toEpochMilli(), kolkata, london)
    val wall = Instant.ofEpochMilli(shifted).atZone(london)
    assertEquals(14, wall.hour)
    assertEquals(0, wall.minute)
  }

  @Test fun thumbSize_scalesLongestSide() {
    assertEquals(256 to 192, FamilyRules.thumbSize(1024, 768))
    assertEquals(77 to 256, FamilyRules.thumbSize(300, 1000))
  }

  @Test fun thumbSize_keepsSmall() {
    assertEquals(200 to 100, FamilyRules.thumbSize(200, 100))
    assertEquals(256 to 256, FamilyRules.thumbSize(256, 256))
  }

  @Test fun withoutFollow_dropsItsKeys() {
    val appa = Follow("F", "Appa", null, 15)
    val local = FamilyLocal(
      follows = listOf(amma, appa),
      pinged = setOf("E|2026-10-28|14:0", "F|2026-10-28|8:0"),
      refillPinged = mapOf("E|p1" to RefillLevel.LOW, "F|p2" to RefillLevel.OUT),
      silentWarned = mapOf("E" to 1L, "F" to 2L),
      checkedThrough = 9L,
    )
    assertEquals(
      FamilyLocal(
        follows = listOf(appa),
        pinged = setOf("F|2026-10-28|8:0"),
        refillPinged = mapOf("F|p2" to RefillLevel.OUT),
        silentWarned = mapOf("F" to 2L),
        checkedThrough = 9L,
      ),
      FamilyRules.withoutFollow(local, "E"),
    )
  }

  @Test fun checksBetween_fromCheckedThrough() {
    val twice = amma.copy(pills = listOf(azee.copy(times = listOf(DoseTime(14, 0), DoseTime(16, 0)))))
    assertEquals(listOf(item), FamilyRules.checksBetween(twice, ist(10, 28, 14, 20), now))
  }

  @Test fun checksBetween_newFollowNoBackfill() {
    assertEquals(emptyList<CheckItem>(), FamilyRules.checksBetween(amma, now, now))
  }

  @Test fun checksBetween_neverBeforeTheLink() {
    // A second elder linked at 14:40, after an older follow's checks last ran at 14:00.
    val linked = amma.copy(since = ist(10, 28, 14, 40))
    assertEquals(emptyList<CheckItem>(), FamilyRules.checksBetween(linked, ist(10, 28, 14, 0), now))
    val later = linked.copy(pills = listOf(azee.copy(times = listOf(DoseTime(14, 15)))))
    assertEquals(
      listOf(ist(10, 28, 14, 45)),
      FamilyRules.checksBetween(later, ist(10, 28, 14, 0), now).map { it.checkAt },
    )
  }

  @Test fun heardLabel_dayOnlyWhenNotHerToday() {
    assertEquals(null to java.time.LocalTime.of(13, 12), FamilyRules.heardLabel(ist(10, 28, 13, 12), now, kolkata))
    assertEquals(
      LocalDate.of(2026, 10, 27) to java.time.LocalTime.of(8, 5),
      FamilyRules.heardLabel(ist(10, 27, 8, 5), now, kolkata),
    )
  }
}
