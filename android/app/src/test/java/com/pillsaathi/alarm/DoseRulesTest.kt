package com.pillsaathi.alarm

import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class DoseRulesTest {
  private val IST = ZoneId.of("Asia/Kolkata")
  private val EVERY_DAY = DoseRules.EVERY_DAY
  private val TODAY = LocalDate.of(2026, 10, 26)

  private fun at(y: Int, mo: Int, d: Int, h: Int, mi: Int): Long =
    LocalDateTime.of(y, mo, d, h, mi).atZone(IST).toInstant().toEpochMilli()

  private fun oct(d: Int, h: Int, mi: Int): Long = at(2026, 10, d, h, mi)

  private val NOW = oct(26, 10, 0)

  private fun date(d: Int, mo: Int = 10, y: Int = 2026): LocalDate = LocalDate.of(y, mo, d)

  private fun t(h: Int, m: Int) = DoseTime(h, m)

  private fun ids(): () -> String {
    var n = 0
    return { "n${++n}" }
  }

  private fun pill(
    id: String,
    times: List<DoseTime>,
    start: LocalDate = TODAY,
    days: Int? = null,
    createdAt: Long = 0L,
    name: String = id,
    form: PillForm = PillForm.TABLET,
    amount: Double = 1.0,
  ) = Pill(id, name, form, amount, times, start, days, createdAt)

  private fun card(
    id: String,
    h: Int,
    m: Int,
    days: Set<Int> = EVERY_DAY,
    name: String = "",
    soundId: String? = null,
    enabled: Boolean = true,
    next: Long? = null,
    snooze: Long? = null,
    lastFired: Long? = null,
    createdAt: Long = 0L,
    from: LocalDate? = null,
    until: LocalDate? = null,
  ) = Alarm(id, h, m, days, name, soundId, enabled, next, snooze, lastFired, createdAt, from, until)

  private fun dosePill(p: Pill) = DosePill(p.id, p.name, p.form, p.amount)

  private fun record(
    h: Int,
    m: Int,
    outcome: DoseOutcome,
    at: Long,
    pills: List<Pill>,
    date: LocalDate = TODAY,
  ) = DoseRecord(date, h, m, outcome, at, pills.map(::dosePill))

  private fun plan(
    alarms: List<Alarm>,
    pills: List<Pill>,
    busy: Set<String> = emptySet(),
    now: Long = NOW,
  ) = DoseRules.planCards(alarms, pills, busy, now, IST, ids())

  private fun CardPlan.at(h: Int, m: Int): Alarm = cards.single { it.hour == h && it.minute == m }

  // Amounts

  @Test fun amountText_table() {
    val table = listOf(
      Triple(PillForm.TABLET, 0.5, "½ tablet"),
      Triple(PillForm.TABLET, 1.0, "1 tablet"),
      Triple(PillForm.TABLET, 1.5, "1½ tablets"),
      Triple(PillForm.TABLET, 2.0, "2 tablets"),
      Triple(PillForm.CAPSULE, 1.0, "1 capsule"),
      Triple(PillForm.CAPSULE, 2.0, "2 capsules"),
      Triple(PillForm.SYRUP, 2.5, "2.5 ml"),
      Triple(PillForm.SYRUP, 5.0, "5 ml"),
      Triple(PillForm.SYRUP, 7.5, "7.5 ml"),
      Triple(PillForm.SYRUP, 10.0, "10 ml"),
      Triple(PillForm.DROPS, 1.0, "1 drop"),
      Triple(PillForm.DROPS, 2.0, "2 drops"),
    )
    table.forEach { (form, amount, text) ->
      assertEquals("$form $amount", text, DoseRules.amountText(form, amount))
      assertEquals("$form $amount", text, DoseRules.amountText(form, amount, AppLanguage.EN))
    }
  }

  @Test fun amountText_malayalam() {
    val table = listOf(
      Triple(PillForm.TABLET, 0.5, "½ ഗുളിക"),
      Triple(PillForm.TABLET, 1.0, "1 ഗുളിക"),
      Triple(PillForm.TABLET, 1.5, "1½ ഗുളിക"),
      Triple(PillForm.TABLET, 2.0, "2 ഗുളിക"),
      Triple(PillForm.CAPSULE, 1.0, "1 ക്യാപ്സ്യൂൾ"),
      Triple(PillForm.CAPSULE, 2.0, "2 ക്യാപ്സ്യൂൾ"),
      Triple(PillForm.SYRUP, 7.5, "7.5 ml"),
      Triple(PillForm.SYRUP, 10.0, "10 ml"),
      Triple(PillForm.DROPS, 1.0, "1 തുള്ളി"),
      Triple(PillForm.DROPS, 2.0, "2 തുള്ളി"),
    )
    table.forEach { (form, amount, text) ->
      assertEquals("$form $amount", text, DoseRules.amountText(form, amount, AppLanguage.ML))
    }
  }

  @Test fun amountText_hindi() {
    val table = listOf(
      Triple(PillForm.TABLET, 0.5, "½ गोली"),
      Triple(PillForm.TABLET, 1.0, "1 गोली"),
      Triple(PillForm.TABLET, 1.5, "1½ गोली"),
      Triple(PillForm.TABLET, 2.0, "2 गोलियाँ"),
      Triple(PillForm.CAPSULE, 1.0, "1 कैप्सूल"),
      Triple(PillForm.CAPSULE, 2.0, "2 कैप्सूल"),
      Triple(PillForm.SYRUP, 7.5, "7.5 ml"),
      Triple(PillForm.SYRUP, 10.0, "10 ml"),
      Triple(PillForm.DROPS, 1.0, "1 बूंद"),
      Triple(PillForm.DROPS, 2.0, "2 बूंदें"),
    )
    table.forEach { (form, amount, text) ->
      assertEquals("$form $amount", text, DoseRules.amountText(form, amount, AppLanguage.HI))
    }
  }

  // Shown wherever a pill has no photo.
  @Test fun pillForm_icons() {
    assertEquals("⚪", PillForm.TABLET.icon)
    assertEquals("💊", PillForm.CAPSULE.icon)
    assertEquals("🧴", PillForm.SYRUP.icon)
    assertEquals("💧", PillForm.DROPS.icon)
  }

  @Test fun spokenAmount_halves() {
    assertEquals("half a tablet", DoseRules.spokenAmount(PillForm.TABLET, 0.5, AppLanguage.EN))
    assertEquals("1 and a half tablets", DoseRules.spokenAmount(PillForm.TABLET, 1.5, AppLanguage.EN))
    assertEquals("ഒന്നര ഗുളിക", DoseRules.spokenAmount(PillForm.TABLET, 1.5, AppLanguage.ML))
    assertEquals("അര ഗുളിക", DoseRules.spokenAmount(PillForm.TABLET, 0.5, AppLanguage.ML))
    assertEquals("ഒമ്പതര ഗുളിക", DoseRules.spokenAmount(PillForm.TABLET, 9.5, AppLanguage.ML))
    assertEquals("ढाई गोलियाँ", DoseRules.spokenAmount(PillForm.TABLET, 2.5, AppLanguage.HI))
    assertEquals("डेढ़ गोली", DoseRules.spokenAmount(PillForm.TABLET, 1.5, AppLanguage.HI))
    assertEquals("आधी गोली", DoseRules.spokenAmount(PillForm.TABLET, 0.5, AppLanguage.HI))
    assertEquals("साढ़े नौ गोलियाँ", DoseRules.spokenAmount(PillForm.TABLET, 9.5, AppLanguage.HI))
  }

  @Test fun spokenAmount_syrupAndWhole() {
    assertEquals("7.5 millilitres", DoseRules.spokenAmount(PillForm.SYRUP, 7.5, AppLanguage.EN))
    assertEquals("5 मिलीलीटर", DoseRules.spokenAmount(PillForm.SYRUP, 5.0, AppLanguage.HI))
    assertEquals("10 മില്ലിലിറ്റർ", DoseRules.spokenAmount(PillForm.SYRUP, 10.0, AppLanguage.ML))
    assertEquals("2 capsules", DoseRules.spokenAmount(PillForm.CAPSULE, 2.0, AppLanguage.EN))
    assertEquals("2 tablets", DoseRules.spokenAmount(PillForm.TABLET, 2.0, AppLanguage.EN))
    assertEquals("2 തുള്ളി", DoseRules.spokenAmount(PillForm.DROPS, 2.0, AppLanguage.ML))
  }

  // Courses

  @Test fun lastDay_fiveDays_isFifthDay() {
    assertEquals(date(30), DoseRules.lastDay(pill("A", listOf(t(8, 0)), days = 5)))
    assertNull(DoseRules.lastDay(pill("A", listOf(t(8, 0)), days = null)))
  }

  @Test fun isDueOn_courseBounds() {
    val five = pill("A", listOf(t(8, 0)), days = 5)
    (26..30).forEach { assertTrue("$it Oct", DoseRules.isDueOn(five, date(it))) }
    assertFalse(DoseRules.isDueOn(five, date(25)))
    assertFalse(DoseRules.isDueOn(five, date(31)))
    assertTrue(DoseRules.isDueOn(pill("B", listOf(t(8, 0))), date(1, 1, 2028)))
  }

  @Test fun pillsDue_sameTime_inAddOrder_skipsFinishedAndNotStarted() {
    val b = pill("B", listOf(t(8, 0)), createdAt = 2L)
    val a = pill("A", listOf(t(21, 0), t(8, 0)), createdAt = 1L)
    val finished = pill("F", listOf(t(8, 0)), start = date(20), days = 3)
    val notStarted = pill("N", listOf(t(8, 0)), start = date(27))
    val otherTime = pill("O", listOf(t(9, 0)))
    assertEquals(
      listOf(a, b),
      DoseRules.pillsDue(listOf(b, finished, a, notStarted, otherTime), 8, 0, TODAY),
    )
  }

  // Card planning

  @Test fun planCards_twoPillsSameTime_oneCard() {
    val p = plan(emptyList(), listOf(pill("A", listOf(t(8, 0)), createdAt = 1L), pill("B", listOf(t(8, 0)), createdAt = 2L)))
    val c = p.cards.single()
    assertEquals("n1", c.id)
    assertEquals("A, B", c.name)
    assertNull(c.soundId)
    assertEquals(EVERY_DAY, c.days)
    assertTrue(c.enabled)
    assertEquals(oct(27, 8, 0), c.nextTriggerAt)
    assertEquals(NOW, c.createdAt)
    assertTrue(p.removedIds.isEmpty())
  }

  @Test fun planCards_pillWithTwoTimes_twoCards() {
    val p = plan(emptyList(), listOf(pill("A", listOf(t(21, 0), t(8, 0)))))
    assertEquals(2, p.cards.size)
    assertEquals(oct(27, 8, 0), p.at(8, 0).nextTriggerAt)
    assertEquals(oct(26, 21, 0), p.at(21, 0).nextTriggerAt)
    assertEquals("A", p.at(21, 0).name)
  }

  @Test fun planCards_window_isUnionOfActivePills() {
    val a = pill("A", listOf(t(8, 0)), start = date(26), days = 5, createdAt = 1L)
    val b = pill("B", listOf(t(8, 0)), start = date(27), days = 10, createdAt = 2L)
    val two = plan(emptyList(), listOf(a, b)).cards.single()
    assertEquals(date(26), two.activeFrom)
    assertEquals(date(5, 11), two.activeUntil)
    val c = pill("C", listOf(t(8, 0)), createdAt = 3L)
    val three = plan(emptyList(), listOf(a, b, c)).cards.single()
    assertEquals(date(26), three.activeFrom)
    assertNull(three.activeUntil)
  }

  @Test fun planCards_existingCard_keepsIdAndSound() {
    val existing = card("c1", 8, 0, name = "A", soundId = "s1", next = oct(27, 8, 0), createdAt = 5L, from = TODAY)
    val pills = listOf(pill("A", listOf(t(8, 0)), createdAt = 1L), pill("B", listOf(t(8, 0)), createdAt = 2L))
    val p = plan(listOf(existing), pills)
    val c = p.cards.single()
    assertEquals("c1", c.id)
    assertEquals("s1", c.soundId)
    assertEquals("A, B", c.name)
    assertEquals(5L, c.createdAt)
    assertEquals(oct(27, 8, 0), c.nextTriggerAt)
    assertTrue(p.removedIds.isEmpty())
  }

  @Test fun planCards_oldPlainAlarmAtPillTime_adoptedAsCard() {
    val old = card("p1", 8, 0, days = setOf(1, 2, 3, 4, 5), name = "Wake", soundId = "s1", next = oct(27, 8, 0))
    val p = plan(listOf(old), listOf(pill("A", listOf(t(8, 0)))))
    val c = p.cards.single()
    assertEquals("p1", c.id)
    assertEquals(EVERY_DAY, c.days)
    assertEquals("A", c.name)
    assertEquals("s1", c.soundId)
    assertEquals(TODAY, c.activeFrom)
    assertEquals(oct(27, 8, 0), c.nextTriggerAt)
    assertTrue(p.removedIds.isEmpty())
  }

  @Test fun planCards_duplicateAlarmsAtSameTime_keepOldestRemoveRest() {
    val alarms = listOf(
      card("p1", 8, 0, soundId = "s1", createdAt = 5L),
      card("p2", 8, 0, soundId = "s2", createdAt = 3L),
      card("p3", 8, 0, soundId = "s3", createdAt = 9L),
    )
    val p = plan(alarms, listOf(pill("A", listOf(t(8, 0)))))
    assertEquals("p2", p.cards.single().id)
    assertEquals("s2", p.cards.single().soundId)
    assertEquals(setOf("p1", "p3"), p.removedIds.toSet())
  }

  @Test fun planCards_alarmWithNoPillAtItsTime_removed() {
    val alarms = listOf(card("x", 7, 0, days = emptySet(), name = "Wake", next = oct(27, 7, 0)))
    val pills = listOf(pill("A", listOf(t(8, 0))))
    val idle = plan(alarms, pills)
    assertEquals(listOf("x"), idle.removedIds)
    assertEquals(listOf(t(8, 0)), idle.cards.map { t(it.hour, it.minute) })
    val busy = plan(alarms, pills, busy = setOf("x"))
    assertEquals(listOf("x"), busy.removedIds)
    assertTrue(busy.cards.none { it.id == "x" })
  }

  @Test fun planCards_finishedPillsOnly_removedWhenIdle() {
    val c = card("c1", 8, 0, name = "F", next = oct(26, 8, 0), lastFired = oct(26, 8, 0), from = date(20), until = date(22))
    val p = plan(listOf(c), listOf(pill("F", listOf(t(8, 0)), start = date(20), days = 3)))
    assertTrue(p.cards.isEmpty())
    assertEquals(listOf("c1"), p.removedIds)
  }

  @Test fun planCards_finishedPillsOnly_keptWhileSnoozedOrRinging() {
    // The last dose of a course was at 23:55 on 30 Oct and was snoozed past midnight.
    val f = pill("F", listOf(t(23, 55)), start = date(26), days = 5)
    val now = oct(31, 0, 2)
    val snoozed = card(
      "c1", 23, 55, name = "F",
      next = oct(30, 23, 55), snooze = oct(31, 0, 5), lastFired = oct(30, 23, 55),
      from = date(26), until = date(30),
    )
    val keptSnoozed = plan(listOf(snoozed), listOf(f), now = now)
    assertEquals(listOf(snoozed), keptSnoozed.cards)
    assertTrue(keptSnoozed.removedIds.isEmpty())

    val ringing = snoozed.copy(snoozeUntil = null)
    val keptRinging = plan(listOf(ringing), listOf(f), busy = setOf("c1"), now = now)
    assertEquals(listOf(ringing), keptRinging.cards)
    assertTrue(keptRinging.removedIds.isEmpty())
  }

  @Test fun planCards_pendingPastDue_notRearmed() {
    val c = card("c1", 9, 59, name = "A", next = oct(26, 9, 59), from = date(26), until = date(30))
    val p = plan(listOf(c), listOf(pill("A", listOf(t(9, 59)), days = 11)))
    val out = p.cards.single()
    assertEquals(oct(26, 9, 59), out.nextTriggerAt)
    assertEquals(date(5, 11), out.activeUntil)
  }

  @Test fun planCards_shortenedToEndToday_tonightStillRings() {
    val c = card("c1", 21, 0, name = "A", next = oct(26, 21, 0), from = date(26), until = date(30))
    val out = plan(listOf(c), listOf(pill("A", listOf(t(21, 0)), days = 1))).cards.single()
    assertTrue(out.enabled)
    assertEquals(date(26), out.activeUntil)
    assertEquals(oct(26, 21, 0), out.nextTriggerAt)
  }

  @Test fun planCards_disarmedCardGetsNewFuture_rearmed() {
    // Same window as its pills, but switched off: housekeeping arms it again.
    val c = card("c1", 8, 0, name = "A", enabled = false, from = TODAY)
    val out = plan(listOf(c), listOf(pill("A", listOf(t(8, 0))))).cards.single()
    assertTrue(out.enabled)
    assertEquals(oct(27, 8, 0), out.nextTriggerAt)
  }

  @Test fun planCards_pillStartsTomorrow_cardArmedTomorrow() {
    val p = plan(emptyList(), listOf(pill("A", listOf(t(8, 0)), start = date(27))), now = oct(26, 7, 0))
    assertEquals(oct(27, 8, 0), p.cards.single().nextTriggerAt)
    assertEquals(date(27), p.cards.single().activeFrom)
  }

  @Test fun planCards_timeMovedLaterToday_ringsTonight() {
    // Telma was at 08:00, taken at 08:02, and moved to 21:00 at 10:00.
    val c8 = card("c8", 8, 0, name = "Telma", next = oct(27, 8, 0), lastFired = oct(26, 8, 0), from = TODAY)
    val telma = pill("telma", listOf(t(21, 0)), name = "Telma")
    val p = plan(listOf(c8), listOf(telma))
    assertEquals(listOf("c8"), p.removedIds)
    val c21 = p.cards.single()
    assertEquals(t(21, 0), t(c21.hour, c21.minute))
    assertEquals(oct(26, 21, 0), c21.nextTriggerAt)
    assertEquals(listOf(telma), DoseRules.pillsDue(listOf(telma), 21, 0, TODAY))
  }

  // Records

  @Test fun doseRecord_listsPillsDueOnOccurrenceDate() {
    val a = pill("A", listOf(t(8, 0)), createdAt = 1L, form = PillForm.SYRUP, amount = 5.0)
    val notStarted = pill("N", listOf(t(8, 0)), start = date(27))
    val other = pill("O", listOf(t(21, 0)))
    val c = card("c8", 8, 0, next = oct(26, 8, 0))
    val r = DoseRules.doseRecord(c, listOf(a, notStarted, other), oct(26, 8, 0), DoseOutcome.TAKEN, oct(26, 8, 2), IST)
    assertEquals(DoseRecord(TODAY, 8, 0, DoseOutcome.TAKEN, oct(26, 8, 2), listOf(DosePill("A", "A", PillForm.SYRUP, 5.0))), r)
  }

  @Test fun doseRecord_snoozedPastMidnight_usesOccurrenceDate() {
    val f = pill("F", listOf(t(23, 55)), start = date(26), days = 5)
    val c = card("c1", 23, 55, next = oct(30, 23, 55), snooze = oct(31, 0, 5))
    val r = DoseRules.doseRecord(c, listOf(f), oct(30, 23, 55), DoseOutcome.TAKEN, oct(31, 0, 7), IST)!!
    assertEquals(date(30), r.date)
    assertEquals(listOf(dosePill(f)), r.pills)
    assertEquals(oct(31, 0, 7), r.at)
  }

  @Test fun doseRecord_nothingDue_null() {
    val finished = pill("F", listOf(t(8, 0)), start = date(20), days = 3)
    val c = card("c8", 8, 0, next = oct(26, 8, 0))
    assertNull(DoseRules.doseRecord(c, listOf(finished), oct(26, 8, 0), DoseOutcome.MISSED, oct(26, 8, 12), IST))
    assertNull(DoseRules.doseRecord(c, emptyList(), oct(26, 8, 0), DoseOutcome.MISSED, oct(26, 8, 12), IST))
  }

  @Test fun gapRecords_everyDueTime() {
    val a = pill("A", listOf(t(8, 0)), start = date(20))
    val r = DoseRules.gapRecords(card("c8", 8, 0), listOf(a), oct(23, 8, 0), NOW, IST)
    assertEquals(listOf(date(23), date(24), date(25), date(26)), r.map { it.date })
    r.forEach {
      assertEquals(DoseOutcome.MISSED, it.outcome)
      assertEquals(NOW, it.at)
      assertEquals(t(8, 0), t(it.hour, it.minute))
    }
  }

  @Test fun gapRecords_skipsDaysWithNothingDue() {
    val a = pill("A", listOf(t(8, 0)), start = date(22), days = 2, createdAt = 1L)
    val b = pill("B", listOf(t(8, 0)), start = date(25), createdAt = 2L)
    val r = DoseRules.gapRecords(card("c8", 8, 0), listOf(a, b), oct(23, 8, 0), NOW, IST)
    assertEquals(listOf(date(23), date(25), date(26)), r.map { it.date })
    assertEquals(listOf(listOf("A"), listOf("B"), listOf("B")), r.map { rec -> rec.pills.map { it.pillId } })
  }

  @Test fun gapRecords_todayNotYetDue() {
    val a = pill("A", listOf(t(8, 0)), start = date(20))
    val r = DoseRules.gapRecords(card("c8", 8, 0), listOf(a), oct(23, 8, 0), oct(26, 7, 0), IST)
    assertEquals(listOf(date(23), date(24), date(25)), r.map { it.date })
  }

  @Test fun gapRecords_keepsAYear() {
    val a = pill("A", listOf(t(8, 0)), start = TODAY.minusDays(500))
    val firstDue = TODAY.minusDays(400).atTime(8, 0).atZone(IST).toInstant().toEpochMilli()
    val r = DoseRules.gapRecords(card("c8", 8, 0), listOf(a), firstDue, NOW, IST)
    assertEquals(TODAY.minusDays(365), r.first().date)
    assertEquals(TODAY, r.last().date)
    assertEquals(366, r.size)
  }

  @Test fun gapRecords_snapshotsPillsDueEachDay() {
    val a = pill("A", listOf(t(8, 0)), start = date(20), createdAt = 1L)
    val b = pill("B", listOf(t(8, 0)), start = date(24), days = 2, createdAt = 2L, form = PillForm.SYRUP, amount = 5.0)
    val r = DoseRules.gapRecords(card("c8", 8, 0), listOf(b, a), oct(23, 8, 0), NOW, IST)
    assertEquals(
      listOf(
        listOf(dosePill(a)),
        listOf(dosePill(a), DosePill("B", "B", PillForm.SYRUP, 5.0)),
        listOf(dosePill(a), DosePill("B", "B", PillForm.SYRUP, 5.0)),
        listOf(dosePill(a)),
      ),
      r.map { it.pills },
    )
  }

  @Test fun withRecord_upsertsBySameDateAndTime() {
    val a = pill("A", listOf(t(8, 0), t(21, 0)))
    val missed8 = record(8, 0, DoseOutcome.MISSED, oct(26, 8, 12), listOf(a))
    val taken21 = record(21, 0, DoseOutcome.TAKEN, oct(26, 21, 1), listOf(a))
    val yesterday8 = record(8, 0, DoseOutcome.TAKEN, oct(25, 8, 1), listOf(a), date = date(25))
    val skipped8 = record(8, 0, DoseOutcome.SKIPPED, oct(26, 8, 20), listOf(a))
    assertEquals(
      listOf(yesterday8, skipped8, taken21),
      DoseRules.withRecord(listOf(yesterday8, missed8, taken21), skipped8, TODAY),
    )
    val newOne = record(14, 0, DoseOutcome.MISSED, oct(26, 14, 12), listOf(a))
    assertEquals(listOf(yesterday8, missed8, newOne), DoseRules.withRecord(listOf(yesterday8, missed8), newOne, TODAY))
  }

  @Test fun withRecord_neverReplacesTaken() {
    val a = pill("A", listOf(t(8, 0)))
    val taken = record(8, 0, DoseOutcome.TAKEN, oct(26, 8, 2), listOf(a))
    val missed = record(8, 0, DoseOutcome.MISSED, oct(26, 8, 12), listOf(a))
    assertEquals(listOf(taken), DoseRules.withRecord(listOf(taken), missed, TODAY))
  }

  @Test fun withRecord_dropsRecordsOlderThan365Days() {
    val a = pill("A", listOf(t(8, 0)))
    val tooOld = record(8, 0, DoseOutcome.TAKEN, 0L, listOf(a), date = date(25, 10, 2025))
    val oldest = record(8, 0, DoseOutcome.TAKEN, 0L, listOf(a), date = date(26, 10, 2025))
    val today = record(8, 0, DoseOutcome.TAKEN, oct(26, 8, 2), listOf(a))
    assertEquals(listOf(oldest, today), DoseRules.withRecord(listOf(tooOld, oldest), today, TODAY))
  }

  @Test fun markedTaken_missedBecomesTakenAtNow() {
    val a = pill("A", listOf(t(8, 0)))
    val missed = record(8, 0, DoseOutcome.MISSED, oct(26, 8, 12), listOf(a))
    val other = record(21, 0, DoseOutcome.SKIPPED, oct(25, 21, 3), listOf(a), date = date(25))
    assertEquals(
      listOf(other, missed.copy(outcome = DoseOutcome.TAKEN, at = NOW)),
      DoseRules.markedTaken(listOf(other, missed), TODAY, 8, 0, NOW),
    )
  }

  @Test fun markedTaken_noRecord_null() {
    val a = pill("A", listOf(t(8, 0)))
    val yesterday = record(8, 0, DoseOutcome.MISSED, oct(25, 8, 12), listOf(a), date = date(25))
    assertNull(DoseRules.markedTaken(listOf(yesterday), TODAY, 8, 0, NOW))
    assertNull(DoseRules.markedTaken(emptyList(), TODAY, 8, 0, NOW))
  }

  // Today

  @Test fun todayCards_statusPrecedence() {
    val a = pill("A", listOf(t(6, 0), t(7, 0), t(7, 30), t(8, 0), t(9, 0), t(9, 30)))
    val b = pill("B", listOf(t(21, 0), t(22, 0)))
    val alarms = listOf(
      card("c600", 6, 0, next = oct(27, 6, 0)),
      card("c700", 7, 0, next = oct(27, 7, 0)),
      card("c730", 7, 30, next = oct(27, 7, 30)),
      card("c800", 8, 0, next = oct(27, 8, 0)),
      card("c900", 9, 0, next = oct(26, 9, 0), snooze = oct(26, 10, 5)),
      card("c930", 9, 30, next = oct(26, 9, 30), snooze = oct(26, 10, 8)),
      card("c2100", 21, 0, next = oct(26, 21, 0)),
      card("c2200", 22, 0, enabled = false),
    )
    val records = listOf(
      record(6, 0, DoseOutcome.TAKEN, oct(26, 6, 2), listOf(a)),
      record(7, 0, DoseOutcome.SKIPPED, oct(26, 7, 5), listOf(a)),
      record(7, 30, DoseOutcome.MISSED, oct(26, 7, 42), listOf(a)),
    )
    val cards = DoseRules.todayCards(alarms, listOf(a, b), records, setOf("c600", "c900"), NOW, IST)
    assertEquals(
      listOf(
        "06:00" to (DoseStatus.TAKEN to oct(26, 6, 2)),
        "07:00" to (DoseStatus.SKIPPED to oct(26, 7, 5)),
        "07:30" to (DoseStatus.MISSED to oct(26, 7, 42)),
        "08:00" to (DoseStatus.LATER to oct(27, 8, 0)),
        "09:00" to (DoseStatus.RINGING to null),
        "09:30" to (DoseStatus.SNOOZED to oct(26, 10, 8)),
        "21:00" to (DoseStatus.UPCOMING to null),
        "22:00" to (DoseStatus.DONE to null),
      ),
      cards.map { "%02d:%02d".format(it.hour, it.minute) to (it.status to it.statusAt) },
    )
  }

  @Test fun todayCards_sortedByTime() {
    val a = pill("A", listOf(t(21, 0), t(8, 0), t(14, 0)))
    val alarms = listOf(card("c21", 21, 0), card("c8", 8, 0), card("c14", 14, 0))
    val cards = DoseRules.todayCards(alarms, listOf(a), emptyList(), emptySet(), NOW, IST)
    assertEquals(listOf("c8", "c14", "c21"), cards.map { it.alarmId })
  }

  @Test fun todayCards_recordedCard_listsSnapshotThenLaterAdditions() {
    val asTaken = pill("A", listOf(t(8, 0)), name = "Azithro", amount = 1.0, createdAt = 1L)
    val aNow = asTaken.copy(name = "Azithromycin 500", amount = 2.0, days = 5)
    val b = pill("B", listOf(t(8, 0)), createdAt = 2L, form = PillForm.SYRUP, amount = 5.0)
    val records = listOf(record(8, 0, DoseOutcome.TAKEN, oct(26, 8, 2), listOf(asTaken)))
    val card = DoseRules.todayCards(
      listOf(card("c8", 8, 0, soundId = "s1", next = oct(27, 8, 0))), listOf(aNow, b), records, emptySet(), NOW, IST,
    ).single()
    assertEquals("c8", card.alarmId)
    assertEquals("s1", card.soundId)
    assertEquals(
      listOf(
        TodayPill("A", "Azithro", PillForm.TABLET, 1.0, TODAY, 5, exists = true, fromTomorrow = false),
        TodayPill("B", "B", PillForm.SYRUP, 5.0, TODAY, null, exists = true, fromTomorrow = true),
      ),
      card.pills,
    )
  }

  @Test fun todayCards_deletedPillInRecord_notOpenable() {
    val gone = pill("X", listOf(t(8, 0)), name = "Old pill")
    val a = pill("A", listOf(t(8, 0)))
    val records = listOf(record(8, 0, DoseOutcome.TAKEN, oct(26, 8, 2), listOf(gone, a)))
    val card = DoseRules.todayCards(listOf(card("c8", 8, 0)), listOf(a), records, emptySet(), NOW, IST).single()
    assertEquals(
      TodayPill("X", "Old pill", PillForm.TABLET, 1.0, null, null, exists = false, fromTomorrow = false),
      card.pills[0],
    )
    assertTrue(card.pills[1].exists)
  }

  @Test fun todayCards_photoFromLivePill_nullWhenDeleted() {
    val a = pill("a", listOf(t(8, 0)), name = "A").copy(photo = "a-new.jpg")
    val b = pill("b", listOf(t(8, 0)), name = "B").copy(photo = "b.jpg")
    val gone = pill("gone", listOf(t(8, 0)), name = "Gone").copy(photo = "gone.jpg")
    // The record was made with a, b and a pill deleted since; a's photo has changed since too.
    val rec = record(8, 0, DoseOutcome.TAKEN, oct(26, 8, 1), listOf(a.copy(photo = "a-old.jpg"), b, gone))
    val recorded = DoseRules.todayCards(listOf(card("c8", 8, 0)), listOf(a, b), listOf(rec), emptySet(), NOW, IST)
    assertEquals(listOf("a-new.jpg", "b.jpg", null), recorded.single().pills.map { it.photo })
    val live = DoseRules.todayCards(listOf(card("c8", 8, 0)), listOf(a, b), emptyList(), emptySet(), NOW, IST)
    assertEquals(listOf("a-new.jpg", "b.jpg"), live.single().pills.map { it.photo })
  }

  @Test fun todayCards_cardGoneButRecordToday_stillShown() {
    val gone = pill("X", listOf(t(8, 0)))
    val records = listOf(record(8, 0, DoseOutcome.TAKEN, oct(26, 8, 2), listOf(gone)))
    val card = DoseRules.todayCards(emptyList(), emptyList(), records, emptySet(), NOW, IST).single()
    assertNull(card.alarmId)
    assertNull(card.soundId)
    assertEquals(DoseStatus.TAKEN, card.status)
    assertEquals(listOf("X"), card.pills.map { it.pillId })
  }

  @Test fun todayCards_finishedTodayAfterLastDose_stillShown() {
    val a = pill("A", listOf(t(8, 0)), start = date(24), days = 3)
    val c8 = card("c8", 8, 0, enabled = false, from = date(24), until = TODAY)
    val records = listOf(record(8, 0, DoseOutcome.MISSED, oct(26, 8, 12), listOf(a)))
    val card = DoseRules.todayCards(listOf(c8), listOf(a), records, emptySet(), NOW, IST).single()
    assertEquals("c8", card.alarmId)
    assertEquals(DoseStatus.MISSED, card.status)
    assertEquals(listOf("A"), card.pills.map { it.pillId })
  }

  @Test fun todayCards_finishedYesterday_notShown() {
    val a = pill("A", listOf(t(8, 0)), start = date(20), days = 6)
    val c8 = card("c8", 8, 0, enabled = false, from = date(20), until = date(25))
    val records = listOf(record(8, 0, DoseOutcome.TAKEN, oct(25, 8, 2), listOf(a), date = date(25)))
    assertTrue(DoseRules.todayCards(listOf(c8), listOf(a), records, emptySet(), NOW, IST).isEmpty())
  }

  // Whether a fire should ring

  @Test fun shouldRing_dueAndNotTaken_true() {
    val a = pill("A", listOf(t(8, 0)))
    val missed = record(8, 0, DoseOutcome.MISSED, oct(26, 8, 12), listOf(a))
    val c = card("c8", 8, 0, next = oct(26, 8, 0))
    assertTrue(DoseRules.shouldRing(c, listOf(a), emptyList(), oct(26, 8, 0), IST))
    assertTrue(DoseRules.shouldRing(c, listOf(a), listOf(missed), oct(26, 8, 0), IST))
  }

  @Test fun shouldRing_doseAlreadyTaken_false() {
    // Taken at 08:02, then the clock went back (a westward time-zone change): 08:00 comes again.
    val a = pill("A", listOf(t(8, 0)))
    val taken = record(8, 0, DoseOutcome.TAKEN, oct(26, 8, 2), listOf(a))
    val c = card("c8", 8, 0, next = oct(26, 8, 0))
    assertFalse(DoseRules.shouldRing(c, listOf(a), listOf(taken), oct(26, 8, 0), IST))
    val yesterday = record(8, 0, DoseOutcome.TAKEN, oct(25, 8, 2), listOf(a), date = date(25))
    assertTrue(DoseRules.shouldRing(c, listOf(a), listOf(yesterday), oct(26, 8, 0), IST))
  }

  @Test fun shouldRing_nothingDue_false() {
    val finished = pill("F", listOf(t(8, 0)), start = date(20), days = 3)
    assertFalse(DoseRules.shouldRing(card("c8", 8, 0), listOf(finished), emptyList(), oct(26, 8, 0), IST))
  }

  @Test fun recordOf_findsTheDoseAtThatDateAndTime() {
    val a = pill("A", listOf(t(8, 0)))
    val taken = record(8, 0, DoseOutcome.TAKEN, oct(26, 8, 2), listOf(a))
    val other = record(21, 0, DoseOutcome.MISSED, oct(26, 21, 12), listOf(a))
    assertEquals(taken, DoseRules.recordOf(listOf(other, taken), TODAY, 8, 0))
    assertNull(DoseRules.recordOf(listOf(other), TODAY, 8, 0))
  }
}

