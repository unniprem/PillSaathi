package com.pillsaathi.alarm

import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/**
 * Pure rules for pills, their time cards and dose records. A time card is an [Alarm] for one hour
 * and minute, every day, that rings only on the dates its pills' courses cover.
 */
object DoseRules {
  val EVERY_DAY: Set<Int> = (1..7).toSet()
  const val RECORD_KEEP_DAYS = 365L

  /** The last day of [pill]'s course, or null when it has no end. */
  fun lastDay(pill: Pill): LocalDate? = pill.days?.let { pill.startDate.plusDays(it - 1L) }

  /** Whether [pill] has any day left from [today] on, today included. */
  fun isActive(pill: Pill, today: LocalDate): Boolean =
    lastDay(pill)?.let { !it.isBefore(today) } ?: true

  fun isDueOn(pill: Pill, date: LocalDate): Boolean =
    !date.isBefore(pill.startDate) && (lastDay(pill)?.let { !date.isAfter(it) } ?: true)

  /** The pills due at [hour]:[minute] on [date], in the order they were added. */
  fun pillsDue(pills: List<Pill>, hour: Int, minute: Int, date: LocalDate): List<Pill> =
    pills
      .filter { DoseTime(hour, minute) in it.times && isDueOn(it, date) }
      .sortedBy { it.createdAt }

  /** "½ tablet", "1½ tablets", "7.5 ml", "2 drops": the same text wherever an amount shows. */
  fun amountText(form: PillForm, amount: Double): String {
    val whole = amount.toLong()
    val half = amount - whole >= 0.25
    val number = when {
      form == PillForm.TABLET && half -> if (whole == 0L) "½" else "$whole½"
      half -> amount.toString()
      else -> whole.toString()
    }
    val plural = amount > 1.0
    return when (form) {
      PillForm.TABLET -> "$number ${if (plural) "tablets" else "tablet"}"
      PillForm.CAPSULE -> "$number ${if (plural) "capsules" else "capsule"}"
      PillForm.SYRUP -> "$number ml"
      PillForm.DROPS -> "$number ${if (plural) "drops" else "drop"}"
    }
  }

  /**
   * Housekeeping: the time cards [pills] need, made from [alarms].
   *
   * Each distinct time of the active pills gets one card, every day, named after its pills and
   * ringing over the union of their courses. An existing alarm at that time becomes the card,
   * keeping its id and sound; of several, the oldest wins and the rest are removed. A changed card
   * is re-armed only when no ring, queue or snooze holds it and it isn't waiting on a fire due now;
   * otherwise only its fields change and the pending fire or reconcile settles it. An alarm at a
   * time no pill uses is removed even if busy, and one at a time only finished pills use is removed
   * once nothing holds it.
   */
  fun planCards(
    alarms: List<Alarm>,
    pills: List<Pill>,
    busyIds: Set<String>,
    now: Long,
    zone: ZoneId,
    newId: () -> String,
  ): CardPlan {
    val today = dateOf(now, zone)
    val active = pills.filter { isActive(it, today) }.sortedBy { it.createdAt }
    val activeTimes = active.flatMap { it.times }.toSortedSet()
    val anyTimes = pills.flatMap { it.times }.toSet()
    val cards = mutableListOf<Alarm>()
    val removed = mutableListOf<String>()

    alarms.groupBy { DoseTime(it.hour, it.minute) }.forEach { (time, group) ->
      val keeper = group.minBy { it.createdAt }
      group.filter { it !== keeper }.forEach { removed.add(it.id) }
      when {
        time in activeTimes -> cards.add(updated(keeper, active.filter { time in it.times }, busyIds, now, zone))
        time in anyTimes && (keeper.id in busyIds || keeper.snoozeUntil != null) -> cards.add(keeper)
        else -> removed.add(keeper.id)
      }
    }

    val existingTimes = alarms.map { DoseTime(it.hour, it.minute) }.toSet()
    activeTimes.filter { it !in existingTimes }.forEach { time ->
      val onTime = active.filter { time in it.times }
      val card = Alarm(
        id = newId(),
        hour = time.hour,
        minute = time.minute,
        days = EVERY_DAY,
        name = cardName(onTime),
        soundId = null,
        enabled = true,
        nextTriggerAt = null,
        snoozeUntil = null,
        lastFiredAt = null,
        createdAt = now,
        activeFrom = onTime.minOf { it.startDate },
        activeUntil = windowEnd(onTime),
      )
      cards.add(AlarmRules.armed(card, now, zone))
    }
    return CardPlan(cards, removed)
  }

  /**
   * The record of [alarm]'s dose at [occurrenceAt], or null when no pill was due then. The date is
   * the occurrence's, so a dose snoozed past midnight still counts for the day it was due.
   */
  fun doseRecord(
    alarm: Alarm,
    pills: List<Pill>,
    occurrenceAt: Long,
    outcome: DoseOutcome,
    at: Long,
    zone: ZoneId,
  ): DoseRecord? {
    val date = dateOf(occurrenceAt, zone)
    val due = pillsDue(pills, alarm.hour, alarm.minute, date)
    if (due.isEmpty()) return null
    return DoseRecord(
      date,
      alarm.hour,
      alarm.minute,
      outcome,
      at,
      due.map { DosePill(it.id, it.name, it.form, it.amount) },
    )
  }

  /**
   * [records] with [record] added, or replacing the one for the same date and time unless that was
   * taken: a dose someone marked taken stays taken. Records older than [RECORD_KEEP_DAYS] go.
   */
  fun withRecord(records: List<DoseRecord>, record: DoseRecord, today: LocalDate): List<DoseRecord> {
    val existing = records.firstOrNull { it.sameDose(record) }
    val updated = when {
      existing == null -> records + record
      existing.outcome == DoseOutcome.TAKEN -> records
      else -> records.map { if (it.sameDose(record)) record else it }
    }
    val oldest = today.minusDays(RECORD_KEEP_DAYS)
    return updated.filterNot { it.date.isBefore(oldest) }
  }

  /** [records] with the dose at [date] [hour]:[minute] marked taken [at], or null if none exists. */
  fun markedTaken(
    records: List<DoseRecord>,
    date: LocalDate,
    hour: Int,
    minute: Int,
    at: Long,
  ): List<DoseRecord>? {
    val match = { r: DoseRecord -> r.date == date && r.hour == hour && r.minute == minute }
    val existing = records.firstOrNull(match) ?: return null
    if (existing.outcome == DoseOutcome.TAKEN) return records
    return records.map { if (match(it)) it.copy(outcome = DoseOutcome.TAKEN, at = at) else it }
  }

  /**
   * The Today screen: one card per time of the active pills plus every time recorded today, in
   * time order. A recorded card lists the pills its record covered, then any added since as "from
   * tomorrow"; its status is the record's. Otherwise the alarm decides: ringing (or queued), snoozed,
   * coming up today, next on a later day, or done.
   */
  fun todayCards(
    alarms: List<Alarm>,
    pills: List<Pill>,
    records: List<DoseRecord>,
    ringingIds: Set<String>,
    now: Long,
    zone: ZoneId,
  ): List<TodayCard> {
    val today = dateOf(now, zone)
    val active = pills.filter { isActive(it, today) }.sortedBy { it.createdAt }
    val recorded = records.filter { it.date == today }.associateBy { DoseTime(it.hour, it.minute) }
    val cardTimes = alarms.map { DoseTime(it.hour, it.minute) }.filter { t -> active.any { t in it.times } }
    return (cardTimes + recorded.keys).toSortedSet().map { time ->
      val alarm = alarms.firstOrNull { it.hour == time.hour && it.minute == time.minute }
      val record = recorded[time]
      val onTime = active.filter { time in it.times }
      val rows = if (record == null) {
        onTime.map { todayPill(it, fromTomorrow = false) }
      } else {
        record.pills.map { snap ->
          val live = pills.firstOrNull { it.id == snap.pillId }
          TodayPill(snap.pillId, snap.name, snap.form, snap.amount, live?.startDate, live?.days, live != null, false)
        } + onTime.filter { p -> record.pills.none { it.pillId == p.id } }.map { todayPill(it, fromTomorrow = true) }
      }
      val (status, statusAt) = statusOf(alarm, record, ringingIds, today, zone)
      TodayCard(alarm?.id, time.hour, time.minute, alarm?.soundId, rows, status, statusAt)
    }
  }

  private fun statusOf(
    alarm: Alarm?,
    record: DoseRecord?,
    ringingIds: Set<String>,
    today: LocalDate,
    zone: ZoneId,
  ): Pair<DoseStatus, Long?> {
    if (record != null) {
      val status = when (record.outcome) {
        DoseOutcome.TAKEN -> DoseStatus.TAKEN
        DoseOutcome.SKIPPED -> DoseStatus.SKIPPED
        DoseOutcome.MISSED -> DoseStatus.MISSED
      }
      return status to record.at
    }
    val next = alarm?.nextTriggerAt
    return when {
      alarm == null -> DoseStatus.DONE to null
      alarm.id in ringingIds -> DoseStatus.RINGING to null
      alarm.snoozeUntil != null -> DoseStatus.SNOOZED to alarm.snoozeUntil
      next != null && dateOf(next, zone) == today -> DoseStatus.UPCOMING to null
      next != null -> DoseStatus.LATER to next
      else -> DoseStatus.DONE to null
    }
  }

  private fun todayPill(p: Pill, fromTomorrow: Boolean) =
    TodayPill(p.id, p.name, p.form, p.amount, p.startDate, p.days, exists = true, fromTomorrow = fromTomorrow)

  private fun updated(
    alarm: Alarm,
    onTime: List<Pill>,
    busyIds: Set<String>,
    now: Long,
    zone: ZoneId,
  ): Alarm {
    val from = onTime.minOf { it.startDate }
    val until = windowEnd(onTime)
    val card = alarm.copy(days = EVERY_DAY, name = cardName(onTime), activeFrom = from, activeUntil = until)
    val changed =
      from != alarm.activeFrom || until != alarm.activeUntil || alarm.days != EVERY_DAY || !alarm.enabled
    val next = alarm.nextTriggerAt
    val safe = alarm.id !in busyIds && alarm.snoozeUntil == null && (next == null || next > now)
    return if (changed && safe) AlarmRules.armed(card, now, zone) else card
  }

  private fun cardName(onTime: List<Pill>): String = onTime.joinToString(", ") { it.name }

  /** The latest last day of [onTime], or null when any of them has no end. */
  private fun windowEnd(onTime: List<Pill>): LocalDate? {
    val ends = onTime.map { lastDay(it) }
    return if (ends.any { it == null }) null else ends.filterNotNull().max()
  }

  private fun DoseRecord.sameDose(other: DoseRecord): Boolean =
    date == other.date && hour == other.hour && minute == other.minute

  private fun dateOf(millis: Long, zone: ZoneId): LocalDate =
    Instant.ofEpochMilli(millis).atZone(zone).toLocalDate()
}
