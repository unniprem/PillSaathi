package com.pillsaathi.alarm

import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.ZoneOffset
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AlarmRulesTest {
  private val IST = ZoneId.of("Asia/Kolkata")
  private val WEEKDAYS = setOf(1, 2, 3, 4, 5)
  private val EVERY_DAY = (1..7).toSet()

  private fun at(y: Int, mo: Int, d: Int, h: Int, mi: Int, s: Int = 0, zone: ZoneId = IST): Long =
    LocalDateTime.of(y, mo, d, h, mi, s).atZone(zone).toInstant().toEpochMilli()

  private fun alarm(
    days: Set<Int> = emptySet(),
    enabled: Boolean = true,
    next: Long? = null,
    snooze: Long? = null,
    lastFired: Long? = null,
    from: LocalDate? = null,
    until: LocalDate? = null,
  ) = Alarm("a1", 7, 0, days, "Pills", null, enabled, next, snooze, lastFired, 0L, from, until)

  /** The 8:00 every-day card the date-window tests use. */
  private fun card8(
    next: Long? = null,
    from: LocalDate? = null,
    until: LocalDate? = null,
  ) = alarm(EVERY_DAY, next = next, from = from, until = until).copy(hour = 8)

  @Test fun nextTrigger_oneTime_laterToday() =
    assertEquals(at(2026, 10, 25, 7, 0), AlarmRules.nextTrigger(7, 0, emptySet(), at(2026, 10, 25, 6, 0), IST))

  @Test fun nextTrigger_oneTime_passed_goesTomorrow() =
    assertEquals(at(2026, 10, 26, 7, 0), AlarmRules.nextTrigger(7, 0, emptySet(), at(2026, 10, 25, 8, 0), IST))

  @Test fun nextTrigger_currentMinute_goesToNextDay() {
    assertEquals(at(2026, 10, 26, 7, 0), AlarmRules.nextTrigger(7, 0, emptySet(), at(2026, 10, 25, 7, 0, 30), IST))
    assertEquals(at(2026, 10, 26, 7, 0), AlarmRules.nextTrigger(7, 0, emptySet(), at(2026, 10, 25, 7, 0, 0), IST))
  }

  @Test fun nextTrigger_weekdays_fromSaturday_isMonday() =
    assertEquals(at(2026, 10, 26, 7, 0), AlarmRules.nextTrigger(7, 0, WEEKDAYS, at(2026, 10, 24, 8, 0), IST))

  @Test fun nextTrigger_weekdays_mondayMorning_isToday() =
    assertEquals(at(2026, 10, 26, 7, 0), AlarmRules.nextTrigger(7, 0, WEEKDAYS, at(2026, 10, 26, 6, 0), IST))

  @Test fun nextTrigger_acrossMidnight() =
    assertEquals(at(2026, 10, 25, 0, 15), AlarmRules.nextTrigger(0, 15, emptySet(), at(2026, 10, 24, 23, 50), IST))

  @Test fun nextTrigger_dstGap_shiftsLater() {
    val ny = ZoneId.of("America/New_York")
    assertEquals(
      at(2027, 3, 14, 3, 30, zone = ny),
      AlarmRules.nextTrigger(2, 30, emptySet(), at(2027, 3, 14, 1, 0, zone = ny), ny),
    )
  }

  @Test fun nextTrigger_dstOverlap_earlierOffset() {
    val ny = ZoneId.of("America/New_York")
    val t = AlarmRules.nextTrigger(1, 30, emptySet(), at(2026, 11, 1, 0, 0, zone = ny), ny)
    assertEquals(ZoneOffset.ofHours(-4), Instant.ofEpochMilli(t).atZone(ny).offset)
  }

  @Test fun armed_setsNextAndClearsSnooze() {
    val now = at(2026, 10, 25, 6, 0)
    val a = AlarmRules.armed(alarm(enabled = false, snooze = now + 5), now, IST)
    assertTrue(a.enabled)
    assertEquals(AlarmRules.nextTrigger(7, 0, emptySet(), now, IST), a.nextTriggerAt)
    assertNull(a.snoozeUntil)
  }

  @Test fun disarmed_clearsNextAndSnooze() {
    val now = at(2026, 10, 25, 7, 0)
    val a = AlarmRules.disarmed(alarm(next = now, snooze = now + 600_000L))
    assertFalse(a.enabled)
    assertNull(a.nextTriggerAt)
    assertNull(a.snoozeUntil)
  }

  @Test fun ringEnded_oneTime_disables() {
    val now = at(2026, 10, 25, 7, 4)
    val a = AlarmRules.ringEnded(alarm(next = at(2026, 10, 25, 7, 0)), now, IST)
    assertFalse(a.enabled)
    assertNull(a.nextTriggerAt)
  }

  @Test fun ringEnded_repeating_movesToNextDay() {
    val now = at(2026, 10, 26, 7, 4)
    val a = AlarmRules.ringEnded(alarm(WEEKDAYS, next = at(2026, 10, 26, 7, 0), snooze = now), now, IST)
    assertTrue(a.enabled)
    assertEquals(at(2026, 10, 27, 7, 0), a.nextTriggerAt)
    assertNull(a.snoozeUntil)
  }

  @Test fun snoozed_dueIsTenMinutesLater() {
    val now = at(2026, 10, 25, 7, 1)
    val a = AlarmRules.snoozed(alarm(next = at(2026, 10, 25, 7, 0)), now)
    assertEquals(now + 600_000L, a.snoozeUntil)
    assertEquals(now + 600_000L, AlarmRules.dueAt(a))
  }

  @Test fun isMissed_afterGrace_neverFired_true() =
    assertTrue(AlarmRules.isMissed(alarm(next = at(2026, 10, 25, 7, 0)), at(2026, 10, 25, 7, 3)))

  @Test fun isMissed_withinGrace_false() =
    assertFalse(AlarmRules.isMissed(alarm(next = at(2026, 10, 25, 7, 0)), at(2026, 10, 25, 7, 1)))

  @Test fun isMissed_fired_false() =
    assertFalse(
      AlarmRules.isMissed(
        alarm(next = at(2026, 10, 25, 7, 0), lastFired = at(2026, 10, 25, 7, 0, 1)),
        at(2026, 10, 25, 7, 30),
      ),
    )

  @Test fun reconcile_missedOneTime_disabledAndReported() {
    val due = at(2026, 10, 25, 7, 0)
    val r = AlarmRules.reconcile(listOf(alarm(next = due)), at(2026, 10, 25, 7, 30), IST)
    assertEquals(listOf(MissedAlarm("a1", "Pills", due)), r.missed)
    assertFalse(r.alarms[0].enabled)
  }

  @Test fun reconcile_missedRepeating_rescheduledAndReported() {
    val due = at(2026, 10, 26, 7, 0)
    val r = AlarmRules.reconcile(listOf(alarm(WEEKDAYS, next = due)), at(2026, 10, 26, 7, 30), IST)
    assertEquals(listOf(MissedAlarm("a1", "Pills", due)), r.missed)
    assertTrue(r.alarms[0].enabled)
    assertEquals(at(2026, 10, 27, 7, 0), r.alarms[0].nextTriggerAt)
  }

  @Test fun reconcile_stuckRing_endedAndReportedMissed() {
    // The ring's process died before its end was recorded, so the user may never have answered it.
    val due = at(2026, 10, 25, 7, 0)
    val a = alarm(next = due, lastFired = due)
    val r = AlarmRules.reconcile(listOf(a), at(2026, 10, 25, 7, 13), IST)
    assertEquals(listOf(MissedAlarm("a1", "Pills", due)), r.missed)
    assertFalse(r.alarms[0].enabled)
  }

  @Test fun reconcile_ownedQueuedAlarm_unchanged() {
    // Fired at 07:00 and still waiting behind another ring at 07:20: not stuck, not missed.
    val due = at(2026, 10, 25, 7, 0)
    val a = alarm(next = due, lastFired = due)
    val r = AlarmRules.reconcile(listOf(a), at(2026, 10, 25, 7, 20), IST, ownedIds = setOf("a1"))
    assertEquals(listOf(a), r.alarms)
    assertTrue(r.missed.isEmpty())
  }

  @Test fun reconcile_ownedCurrentAlarm_unchanged() {
    // Due 07:00 and never stamped as fired (its fire's write was lost), ringing now at 07:05.
    val a = alarm(WEEKDAYS, next = at(2026, 10, 26, 7, 0))
    val r = AlarmRules.reconcile(listOf(a), at(2026, 10, 26, 7, 5), IST, ownedIds = setOf("a1"))
    assertEquals(listOf(a), r.alarms)
    assertTrue(r.missed.isEmpty())
  }

  @Test fun reconcile_ownedIds_leaveOtherAlarmsToTheRules() {
    val due = at(2026, 10, 25, 7, 0)
    val owned = alarm(next = due, lastFired = due)
    val other = owned.copy(id = "a2", name = "Other")
    val r =
      AlarmRules.reconcile(listOf(owned, other), at(2026, 10, 25, 7, 20), IST, ownedIds = setOf("a1"))
    assertEquals(owned, r.alarms[0])
    assertFalse(r.alarms[1].enabled)
    assertEquals(listOf(MissedAlarm("a2", "Other", due)), r.missed)
  }

  @Test fun ownedIds_freshMarker_ownsCurrentAndQueued() {
    val started = at(2026, 10, 25, 7, 10)
    val marker = RingingMarker("a1", started, listOf("a2", "a3"))
    assertEquals(setOf("a1", "a2", "a3"), AlarmRules.ownedIds(marker, at(2026, 10, 25, 7, 21, 59)))
    assertTrue(AlarmRules.isFresh(marker, at(2026, 10, 25, 7, 21, 59)))
  }

  @Test fun ownedIds_markerAsOldAsAnyRingCanLast_ownsNothing() {
    val started = at(2026, 10, 25, 7, 10)
    val marker = RingingMarker("a1", started, listOf("a2"))
    val now = started + AlarmRules.AUTO_SILENCE_MS + AlarmRules.MISSED_GRACE_MS
    assertFalse(AlarmRules.isFresh(marker, now))
    assertEquals(emptySet<String>(), AlarmRules.ownedIds(marker, now))
    assertEquals(emptySet<String>(), AlarmRules.ownedIds(null, now))
  }

  @Test fun reconcile_ringingNow_unchanged() {
    val due = at(2026, 10, 25, 7, 0)
    val a = alarm(next = due, lastFired = due)
    val r = AlarmRules.reconcile(listOf(a), at(2026, 10, 25, 7, 5), IST)
    assertEquals(listOf(a), r.alarms)
    assertTrue(r.missed.isEmpty())
  }

  @Test fun reconcile_zoneChange_recomputesToLocalTime() {
    val dubai = ZoneId.of("Asia/Dubai")
    val now = at(2026, 10, 25, 6, 0)
    val a = alarm(next = AlarmRules.nextTrigger(7, 0, emptySet(), now, IST))
    val r = AlarmRules.reconcile(listOf(a), now, dubai)
    assertEquals(AlarmRules.nextTrigger(7, 0, emptySet(), now, dubai), r.alarms[0].nextTriggerAt)
    val local = Instant.ofEpochMilli(r.alarms[0].nextTriggerAt!!).atZone(dubai)
    assertEquals(7, local.hour)
    assertEquals(0, local.minute)
  }

  @Test fun reconcile_snoozedFuture_unchanged() {
    val now = at(2026, 10, 25, 7, 5)
    val a = alarm(next = at(2026, 10, 25, 7, 0), snooze = now + 300_000L, lastFired = at(2026, 10, 25, 7, 0))
    val r = AlarmRules.reconcile(listOf(a), now, IST)
    assertEquals(listOf(a), r.alarms)
  }

  @Test fun reconcile_disabled_unchanged() {
    val a = alarm(enabled = false)
    val r = AlarmRules.reconcile(listOf(a), at(2026, 10, 25, 7, 30), IST)
    assertEquals(listOf(a), r.alarms)
    assertTrue(r.missed.isEmpty())
  }

  @Test fun fireDecision_onTime_rings() =
    assertEquals(
      FireDecision.RING,
      AlarmRules.fireDecision(alarm(next = at(2026, 10, 25, 7, 0)), at(2026, 10, 25, 7, 0, 5)),
    )

  @Test fun fireDecision_clockJumpedPastGrace_missed() =
    assertEquals(
      FireDecision.MISSED,
      AlarmRules.fireDecision(alarm(next = at(2026, 10, 25, 7, 0)), at(2026, 10, 25, 7, 5)),
    )

  @Test fun fireDecision_dueAdvancedAfterStop_stale() =
    assertEquals(
      FireDecision.STALE,
      AlarmRules.fireDecision(
        alarm(WEEKDAYS, next = at(2026, 10, 27, 7, 0), lastFired = at(2026, 10, 26, 7, 0, 1)),
        at(2026, 10, 26, 7, 0, 10),
      ),
    )

  @Test fun fireDecision_disabled_stale() =
    assertEquals(
      FireDecision.STALE,
      AlarmRules.fireDecision(
        alarm(enabled = false, next = at(2026, 10, 25, 7, 0)),
        at(2026, 10, 25, 7, 0, 5),
      ),
    )

  @Test fun fireDecision_refireWhileRinging_rings() =
    assertEquals(
      FireDecision.RING,
      AlarmRules.fireDecision(
        alarm(next = at(2026, 10, 25, 7, 0), lastFired = at(2026, 10, 25, 7, 0, 1)),
        at(2026, 10, 25, 7, 3),
      ),
    )

  @Test fun fireDecision_snoozeDue_rings() =
    assertEquals(
      FireDecision.RING,
      AlarmRules.fireDecision(
        alarm(
          next = at(2026, 10, 25, 7, 0),
          snooze = at(2026, 10, 25, 7, 10, 2),
          lastFired = at(2026, 10, 25, 7, 0, 1),
        ),
        at(2026, 10, 25, 7, 10, 2),
      ),
    )

  @Test fun recoveryAt_reconcileThenEndsStuckRing() {
    val fired = at(2026, 10, 26, 7, 0, 1)
    val a = alarm(WEEKDAYS, next = at(2026, 10, 26, 7, 0), lastFired = fired)
    val r = AlarmRules.reconcile(listOf(a), AlarmRules.recoveryAt(fired), IST)
    assertEquals(at(2026, 10, 27, 7, 0), r.alarms[0].nextTriggerAt)
    assertEquals(listOf(MissedAlarm("a1", "Pills", at(2026, 10, 26, 7, 0))), r.missed)
  }

  @Test fun nextTriggerFor_activeFromTomorrow_skipsToday() =
    assertEquals(
      at(2026, 10, 27, 8, 0),
      AlarmRules.nextTriggerFor(card8(from = LocalDate.of(2026, 10, 27)), at(2026, 10, 26, 7, 0), IST),
    )

  @Test fun nextTriggerFor_lastDayBeforeTime_today() =
    assertEquals(
      at(2026, 10, 26, 8, 0),
      AlarmRules.nextTriggerFor(card8(until = LocalDate.of(2026, 10, 26)), at(2026, 10, 26, 7, 0), IST),
    )

  @Test fun nextTriggerFor_lastDayAfterTime_null() =
    assertNull(
      AlarmRules.nextTriggerFor(card8(until = LocalDate.of(2026, 10, 26)), at(2026, 10, 26, 9, 0), IST),
    )

  @Test fun nextTriggerFor_noWindow_sameAsNextTrigger() =
    assertEquals(
      at(2026, 10, 27, 8, 0),
      AlarmRules.nextTriggerFor(card8(), at(2026, 10, 26, 9, 0), IST),
    )

  @Test fun armed_noFutureInWindow_disarmed() {
    val a = AlarmRules.armed(card8(until = LocalDate.of(2026, 10, 25)), at(2026, 10, 26, 7, 0), IST)
    assertFalse(a.enabled)
    assertNull(a.nextTriggerAt)
  }

  @Test fun ringEnded_lastDoseOfWindow_disarmed() {
    val a = card8(next = at(2026, 10, 26, 8, 0), until = LocalDate.of(2026, 10, 26))
    val ended = AlarmRules.ringEnded(a, at(2026, 10, 26, 8, 5), IST)
    assertFalse(ended.enabled)
    assertNull(ended.nextTriggerAt)
    assertNull(ended.snoozeUntil)
  }

  @Test fun reconcile_futureBeyondShortenedWindow_disarmed() {
    val a = card8(next = at(2026, 10, 27, 8, 0), until = LocalDate.of(2026, 10, 26))
    val r = AlarmRules.reconcile(listOf(a), at(2026, 10, 26, 10, 0), IST)
    assertFalse(r.alarms[0].enabled)
    assertNull(r.alarms[0].nextTriggerAt)
    assertTrue(r.missed.isEmpty())
  }

  @Test fun reconcile_missedWhileSnoozed_reportsOccurrence() {
    val a = alarm(
      next = at(2026, 10, 26, 7, 0),
      snooze = at(2026, 10, 26, 7, 10),
      lastFired = at(2026, 10, 26, 7, 0),
    )
    val r = AlarmRules.reconcile(listOf(a), at(2026, 10, 26, 7, 20), IST)
    assertEquals(listOf(MissedAlarm("a1", "Pills", at(2026, 10, 26, 7, 0))), r.missed)
  }

  // An early delivery (within EARLY_FIRE_TOLERANCE_MS) is the dose's fire, not a fire before it.

  @Test fun fireDecision_refireAfterEarlyFire_rings() =
    assertEquals(
      FireDecision.RING,
      AlarmRules.fireDecision(
        alarm(next = at(2026, 10, 26, 7, 0), lastFired = at(2026, 10, 26, 6, 59, 30)),
        at(2026, 10, 26, 7, 5),
      ),
    )

  @Test fun reconcile_earlyFiredRingNotStuckYet_unchanged() {
    val a = alarm(next = at(2026, 10, 26, 7, 0), lastFired = at(2026, 10, 26, 6, 59, 30))
    val r = AlarmRules.reconcile(listOf(a), at(2026, 10, 26, 7, 5), IST)
    assertEquals(listOf(a), r.alarms)
    assertTrue(r.missed.isEmpty())
  }

  @Test fun reconcile_earlyFiredStuckRing_endedAndReportedMissed() {
    val due = at(2026, 10, 26, 7, 0)
    val a = alarm(EVERY_DAY, next = due, lastFired = at(2026, 10, 26, 6, 59, 30))
    val r = AlarmRules.reconcile(listOf(a), at(2026, 10, 26, 7, 13), IST)
    assertEquals(listOf(MissedAlarm("a1", "Pills", due)), r.missed)
    assertEquals(at(2026, 10, 27, 7, 0), r.alarms[0].nextTriggerAt)
  }

  @Test fun occurrence_ringingCard_isItsNextTrigger() {
    val a = card8(next = at(2026, 10, 30, 23, 55), until = LocalDate.of(2026, 10, 30))
      .copy(snoozeUntil = at(2026, 10, 31, 0, 5))
    assertEquals(at(2026, 10, 30, 23, 55), AlarmRules.occurrence(a, at(2026, 10, 31, 0, 5), at(2026, 10, 31, 0, 7)))
  }

  @Test fun occurrence_cardMovedOnDuringRing_usesTheFiresDueAt() {
    val a = card8(next = at(2026, 10, 27, 8, 0))
    assertEquals(at(2026, 10, 26, 8, 0), AlarmRules.occurrence(a, at(2026, 10, 26, 8, 0), at(2026, 10, 26, 8, 6)))
  }

  @Test fun occurrence_disarmedCard_fallsBackToDueAtThenLastFired() {
    val a = card8().copy(enabled = false, lastFiredAt = at(2026, 10, 26, 8, 0))
    assertEquals(at(2026, 10, 26, 8, 0), AlarmRules.occurrence(a, null, at(2026, 10, 26, 8, 6)))
    assertEquals(at(2026, 10, 26, 7, 59), AlarmRules.occurrence(a, at(2026, 10, 26, 7, 59), at(2026, 10, 26, 8, 6)))
  }
}

