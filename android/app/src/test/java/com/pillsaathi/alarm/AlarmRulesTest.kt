package com.pillsaathi.alarm

import java.time.Instant
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

  private fun at(y: Int, mo: Int, d: Int, h: Int, mi: Int, s: Int = 0, zone: ZoneId = IST): Long =
    LocalDateTime.of(y, mo, d, h, mi, s).atZone(zone).toInstant().toEpochMilli()

  private fun alarm(
    days: Set<Int> = emptySet(),
    enabled: Boolean = true,
    next: Long? = null,
    snooze: Long? = null,
    lastFired: Long? = null,
  ) = Alarm("a1", 7, 0, days, "Pills", null, enabled, next, snooze, lastFired, 0L)

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

  @Test fun reconcile_stuckRing_endedNotReported() {
    val due = at(2026, 10, 25, 7, 0)
    val a = alarm(next = due, lastFired = due)
    val r = AlarmRules.reconcile(listOf(a), at(2026, 10, 25, 7, 13), IST)
    assertTrue(r.missed.isEmpty())
    assertFalse(r.alarms[0].enabled)
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
}
