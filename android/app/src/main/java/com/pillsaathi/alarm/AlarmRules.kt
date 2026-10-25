package com.pillsaathi.alarm

import java.time.Instant
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime

object AlarmRules {
  const val SNOOZE_MS = 600_000L
  const val AUTO_SILENCE_MS = 600_000L
  const val MISSED_GRACE_MS = 120_000L

  /** A delivery may arrive this much before its due time and still ring. */
  const val EARLY_FIRE_TOLERANCE_MS = 60_000L

  /** First matching time strictly after [afterMillis]. Empty [days] means any day. */
  fun nextTrigger(hour: Int, minute: Int, days: Set<Int>, afterMillis: Long, zone: ZoneId): Long {
    val startDate = Instant.ofEpochMilli(afterMillis).atZone(zone).toLocalDate()
    for (offset in 0L..7L) {
      val date = startDate.plusDays(offset)
      val candidate = ZonedDateTime.of(date, LocalTime.of(hour, minute), zone)
      val millis = candidate.toInstant().toEpochMilli()
      if (millis > afterMillis && (days.isEmpty() || candidate.dayOfWeek.value in days)) {
        return millis
      }
    }
    throw IllegalStateException("No trigger found within 8 days")
  }

  fun dueAt(alarm: Alarm): Long? =
    if (!alarm.enabled) null else alarm.snoozeUntil ?: alarm.nextTriggerAt

  fun armed(alarm: Alarm, now: Long, zone: ZoneId): Alarm = alarm.copy(
    enabled = true,
    nextTriggerAt = nextTrigger(alarm.hour, alarm.minute, alarm.days, now, zone),
    snoozeUntil = null,
  )

  fun disarmed(alarm: Alarm): Alarm =
    alarm.copy(enabled = false, nextTriggerAt = null, snoozeUntil = null)

  fun fired(alarm: Alarm, now: Long): Alarm = alarm.copy(lastFiredAt = now)

  fun ringEnded(alarm: Alarm, now: Long, zone: ZoneId): Alarm =
    if (alarm.days.isEmpty()) {
      disarmed(alarm)
    } else {
      alarm.copy(
        nextTriggerAt = nextTrigger(alarm.hour, alarm.minute, alarm.days, now, zone),
        snoozeUntil = null,
      )
    }

  fun snoozed(alarm: Alarm, now: Long): Alarm = alarm.copy(snoozeUntil = now + SNOOZE_MS)

  fun isMissed(alarm: Alarm, now: Long): Boolean {
    val due = dueAt(alarm) ?: return false
    val last = alarm.lastFiredAt
    return due < now - MISSED_GRACE_MS && (last == null || last < due)
  }

  /**
   * Decides whether a delivery for [alarm] at [now] should ring. A delivery for an alarm that is
   * off or has moved on is stale, and one that arrives past the grace period is missed, never
   * rung late. A re-fire of a ring already under way still rings; the service ignores duplicates.
   */
  fun fireDecision(alarm: Alarm, now: Long): FireDecision {
    val due = dueAt(alarm) ?: return FireDecision.STALE
    return when {
      due > now + EARLY_FIRE_TOLERANCE_MS -> FireDecision.STALE
      isMissed(alarm, now) -> FireDecision.MISSED
      else -> FireDecision.RING
    }
  }

  /** When to reconcile a ring fired at [firedAt]: just after [reconcile] treats it as stuck. */
  fun recoveryAt(firedAt: Long): Long = firedAt + AUTO_SILENCE_MS + MISSED_GRACE_MS + 60_000L

  fun reconcile(alarms: List<Alarm>, now: Long, zone: ZoneId): ReconcileResult {
    val missed = mutableListOf<MissedAlarm>()
    val result = alarms.map { a ->
      if (!a.enabled) return@map a
      val due = dueAt(a)
      val last = a.lastFiredAt
      when {
        due == null -> armed(a, now, zone)
        isMissed(a, now) -> {
          missed.add(MissedAlarm(a.id, a.name, due))
          ringEnded(a, now, zone)
        }
        last != null && last >= due && now - last > AUTO_SILENCE_MS + MISSED_GRACE_MS ->
          ringEnded(a, now, zone)
        due > now && a.snoozeUntil == null ->
          a.copy(nextTriggerAt = nextTrigger(a.hour, a.minute, a.days, now, zone))
        else -> a
      }
    }
    return ReconcileResult(result, missed)
  }
}
