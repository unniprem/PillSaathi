package com.pillsaathi.alarm

import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime
import kotlin.math.floor

/** How close a counted pill is to running out. [OUT] outranks [LOW] by ordinal. */
enum class RefillLevel(val json: String) {
  LOW("low"),
  OUT("out");

  companion object {
    fun fromJson(s: String): RefillLevel? = values().firstOrNull { it.json == s }
  }
}

/** A counted pill running low ([RefillLevel.LOW]) or out, for Today's banner and the notification. */
data class RefillWarning(
  val pillId: String,
  val name: String,
  val form: PillForm,
  val remaining: Double,
  val daysLeft: Int,
  val level: RefillLevel,
)

/** [pills] after a Taken lowered their counts, and the warnings to post as notifications. */
data class RefillUpdate(val pills: List<Pill>, val notices: List<RefillWarning>)

/**
 * Pure rules for counting tablets and capsules. A count never touches the alarm: it is updated
 * after the dose is recorded, best effort, and a pill at 0 still rings.
 */
object RefillRules {
  /** Only tablets and capsules are counted; syrup and drops aren't. */
  fun isCountable(form: PillForm): Boolean = form == PillForm.TABLET || form == PillForm.CAPSULE

  /**
   * The count and the last warning to save for [draft], given the pill as stored ([existing], null
   * for a new pill). The draft's count wins for a new pill or when it was changed; otherwise the
   * stored one stays, since a Taken may have lowered it while the page was open. A higher count
   * (more tablets bought, or counting turned on) clears the warning so it can be posted again.
   */
  fun savedCount(existing: Pill?, draft: PillDraft): Pair<Double?, RefillLevel?> {
    if (!isCountable(draft.form)) return null to null
    if (existing == null) return draft.remaining to null
    val count = if (draft.remainingChanged) draft.remaining else existing.remaining
    val stored = existing.remaining
    val raised = stored == null || (count != null && count > stored)
    return count to if (count == null || raised) null else existing.refillNotified
  }

  /** Warn when this many days are left, or fewer. */
  const val WARN_DAYS = 5

  /** Whole days the count lasts at the pill's amount and times, or null when it isn't counted. */
  fun daysLeft(pill: Pill): Int? {
    val remaining = pill.remaining ?: return null
    if (!isCountable(pill.form)) return null
    return floor(remaining / (pill.amount * pill.times.size)).toInt()
  }

  /**
   * The dose times after [now] through [pill]'s last day, from its start date if it hasn't
   * started, or null when its course has no end.
   */
  fun dosesLeft(pill: Pill, now: Long, zone: ZoneId): Int? {
    val last = DoseRules.lastDay(pill) ?: return null
    val today = Instant.ofEpochMilli(now).atZone(zone).toLocalDate()
    var date = maxOf(today, pill.startDate)
    var count = 0
    while (!date.isAfter(last)) {
      count += if (date == today) pill.times.count { at(date, it, zone) > now } else pill.times.size
      date = date.plusDays(1)
    }
    return count
  }

  /**
   * The warning for [pill], or null: it isn't counted (or can't be), its course is over, it has
   * more than [WARN_DAYS] days left, or its course ends first (the count covers every dose left).
   */
  fun warning(pill: Pill, now: Long, zone: ZoneId): RefillWarning? {
    val remaining = pill.remaining ?: return null
    val days = daysLeft(pill) ?: return null
    val today = Instant.ofEpochMilli(now).atZone(zone).toLocalDate()
    if (!DoseRules.isActive(pill, today) || days > WARN_DAYS) return null
    val dosesLeft = dosesLeft(pill, now, zone)
    if (dosesLeft != null && remaining >= pill.amount * dosesLeft) return null
    val level = if (remaining == 0.0) RefillLevel.OUT else RefillLevel.LOW
    return RefillWarning(pill.id, pill.name, pill.form, remaining, days, level)
  }

  /** The warnings of [pills], in the order the pills were added. */
  fun warnings(pills: List<Pill>, now: Long, zone: ZoneId): List<RefillWarning> =
    pills.sortedBy { it.createdAt }.mapNotNull { warning(it, now, zone) }

  /** Whether recording [after] made the dose taken: it is, and [before] it wasn't. */
  fun takenNow(before: DoseRecord?, after: DoseRecord?): Boolean =
    after?.outcome == DoseOutcome.TAKEN && before?.outcome != DoseOutcome.TAKEN

  /**
   * [pills] after the dose [taken]: each counted pill it covered goes down by the amount in the
   * dose's snapshot, never below 0. A pill whose warning now outranks the last one posted
   * ([Pill.refillNotified]) gets a notice, once per level, and that level is stored.
   */
  fun afterTaken(pills: List<Pill>, taken: DoseRecord, now: Long, zone: ZoneId): RefillUpdate {
    val notices = mutableListOf<RefillWarning>()
    val updated = pills.map { pill ->
      val snap = taken.pills.firstOrNull { it.pillId == pill.id }
      val remaining = pill.remaining
      if (snap == null || remaining == null || !isCountable(pill.form)) return@map pill
      val lowered = pill.copy(remaining = (remaining - snap.amount).coerceAtLeast(0.0))
      val warning = warning(lowered, now, zone)
      val notified = pill.refillNotified
      if (warning != null && (notified == null || warning.level > notified)) {
        notices.add(warning)
        lowered.copy(refillNotified = warning.level)
      } else {
        lowered
      }
    }
    return RefillUpdate(updated, notices)
  }

  private fun at(date: LocalDate, time: DoseTime, zone: ZoneId): Long =
    ZonedDateTime.of(date, LocalTime.of(time.hour, time.minute), zone).toInstant().toEpochMilli()
}
