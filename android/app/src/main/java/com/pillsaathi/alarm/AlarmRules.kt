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

  /**
   * [alarm]'s first time strictly after [afterMillis] that falls in its date window, or null when
   * that would be after [Alarm.activeUntil]: the alarm has no future.
   */
  fun nextTriggerFor(alarm: Alarm, afterMillis: Long, zone: ZoneId): Long? {
    val windowStart = alarm.activeFrom?.atStartOfDay(zone)?.toInstant()?.toEpochMilli()?.minus(1)
    val after = maxOf(afterMillis, windowStart ?: afterMillis)
    val next = nextTrigger(alarm.hour, alarm.minute, alarm.days, after, zone)
    val until = alarm.activeUntil ?: return next
    return if (Instant.ofEpochMilli(next).atZone(zone).toLocalDate().isAfter(until)) null else next
  }

  fun dueAt(alarm: Alarm): Long? =
    if (!alarm.enabled) null else alarm.snoozeUntil ?: alarm.nextTriggerAt

  fun armed(alarm: Alarm, now: Long, zone: ZoneId): Alarm {
    val next = nextTriggerFor(alarm, now, zone) ?: return disarmed(alarm)
    return alarm.copy(enabled = true, nextTriggerAt = next, snoozeUntil = null)
  }

  fun disarmed(alarm: Alarm): Alarm =
    alarm.copy(enabled = false, nextTriggerAt = null, snoozeUntil = null)

  fun fired(alarm: Alarm, now: Long): Alarm = alarm.copy(lastFiredAt = now)

  fun ringEnded(alarm: Alarm, now: Long, zone: ZoneId): Alarm {
    if (alarm.days.isEmpty()) return disarmed(alarm)
    val next = nextTriggerFor(alarm, now, zone) ?: return disarmed(alarm)
    return alarm.copy(nextTriggerAt = next, snoozeUntil = null)
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

  /**
   * Whether [marker] can still describe a live ring. A ring and each one queued behind it rewrite
   * the marker when they start and last at most [AUTO_SILENCE_MS], so an older marker was left by a
   * `:ringing` process that died.
   */
  fun isFresh(marker: RingingMarker, now: Long): Boolean =
    now - marker.startedAt < AUTO_SILENCE_MS + MISSED_GRACE_MS

  /** The alarms a live ring owns, the one ringing and those queued behind it, for [reconcile]. */
  fun ownedIds(marker: RingingMarker?, now: Long): Set<String> =
    if (marker == null || !isFresh(marker, now)) emptySet()
    else (marker.queued + marker.alarmId).toSet()

  /**
   * Repairs the schedule: arms enabled alarms with no due time, reports and moves on alarms whose
   * time passed unrung, ends rings whose end was never recorded (their process died; reported as
   * missed, since nobody may have answered), and recomputes future times for the current zone,
   * switching off an alarm whose date window has no future left. A missed alarm is reported at its
   * occurrence, the time it was first due, even when it was snoozed since. Alarms in [ownedIds] are ringing or queued right now, so they are left exactly as they are.
   */
  fun reconcile(
    alarms: List<Alarm>,
    now: Long,
    zone: ZoneId,
    ownedIds: Set<String> = emptySet(),
  ): ReconcileResult {
    val missed = mutableListOf<MissedAlarm>()
    val result = alarms.map { a ->
      if (!a.enabled || a.id in ownedIds) return@map a
      val due = dueAt(a)
      val last = a.lastFiredAt
      when {
        due == null -> armed(a, now, zone)
        isMissed(a, now) -> {
          missed.add(MissedAlarm(a.id, a.name, a.nextTriggerAt ?: due))
          ringEnded(a, now, zone)
        }
        last != null && last >= due && now - last > AUTO_SILENCE_MS + MISSED_GRACE_MS -> {
          missed.add(MissedAlarm(a.id, a.name, a.nextTriggerAt ?: due))
          ringEnded(a, now, zone)
        }
        due > now && a.snoozeUntil == null ->
          nextTriggerFor(a, now, zone)?.let { a.copy(nextTriggerAt = it) } ?: disarmed(a)
        else -> a
      }
    }
    return ReconcileResult(result, missed)
  }
}
