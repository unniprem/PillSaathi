package com.pillsaathi.alarm

import java.time.LocalDate

/**
 * A pill's type, with how its amount steps on the − / + stepper, and the [icon] shown where a pill
 * has no photo.
 */
enum class PillForm(
  val json: String,
  val step: Double,
  val min: Double,
  val max: Double,
  val initial: Double,
  val icon: String,
) {
  TABLET("tablet", 0.5, 0.5, 10.0, 1.0, "⚪"),
  CAPSULE("capsule", 1.0, 1.0, 10.0, 1.0, "💊"),
  SYRUP("syrup", 2.5, 2.5, 50.0, 5.0, "🧴"),
  DROPS("drops", 1.0, 1.0, 30.0, 2.0, "💧");

  companion object {
    fun fromJson(s: String): PillForm? = values().firstOrNull { it.json == s }
  }
}

data class DoseTime(val hour: Int, val minute: Int) : Comparable<DoseTime> {
  override fun compareTo(other: DoseTime): Int =
    compareValuesBy(this, other, DoseTime::hour, DoseTime::minute)
}

/**
 * A medicine taken every day at [times], from [startDate] for [days] days, or with no end when
 * [days] is null. [photo] is its photo's file name in the store's photos, if it has one.
 * [remaining] is how many tablets or capsules are left, null when they aren't counted, and
 * [refillNotified] the last refill warning posted for it ([RefillRules]).
 */
data class Pill(
  val id: String,
  val name: String,
  val form: PillForm,
  val amount: Double,
  val times: List<DoseTime>,
  val startDate: LocalDate,
  val days: Int?,
  val createdAt: Long,
  val photo: String? = null,
  val remaining: Double? = null,
  val refillNotified: RefillLevel? = null,
)

/**
 * A pill as the app sends it to be saved: [id] is null for a new pill. [remaining] counts only when
 * [remainingChanged] (or for a new pill), so a page left open can't put back an older count.
 */
data class PillDraft(
  val id: String?,
  val name: String,
  val form: PillForm,
  val amount: Double,
  val times: List<DoseTime>,
  val startsTomorrow: Boolean,
  val days: Int?,
  val photo: String? = null,
  val remaining: Double? = null,
  val remainingChanged: Boolean = false,
)

enum class DoseOutcome(val json: String) {
  TAKEN("taken"),
  SKIPPED("skipped"),
  MISSED("missed"),
}

/** A pill as it was when its dose was recorded, so later edits don't rewrite what happened. */
data class DosePill(val pillId: String, val name: String, val form: PillForm, val amount: Double)

/**
 * How the dose of one time card on one [date] ended, with the pills it covered. [marked] is true
 * for a dose marked taken later, so it never looks like it was taken on time.
 */
data class DoseRecord(
  val date: LocalDate,
  val hour: Int,
  val minute: Int,
  val outcome: DoseOutcome,
  val at: Long,
  val pills: List<DosePill>,
  val marked: Boolean = false,
)

enum class DoseStatus(val json: String) {
  TAKEN("taken"),
  SKIPPED("skipped"),
  MISSED("missed"),
  RINGING("ringing"),
  SNOOZED("snoozed"),
  UPCOMING("upcoming"),
  LATER("later"),
  DONE("done"),
}

/**
 * A pill row on the Today screen. [exists] is false for a pill deleted since its dose was recorded;
 * [fromTomorrow] marks a pill added to a card after today's dose was recorded. [photo] is the pill's
 * photo as it is now, null for a deleted pill.
 */
data class TodayPill(
  val pillId: String,
  val name: String,
  val form: PillForm,
  val amount: Double,
  val startDate: LocalDate?,
  val days: Int?,
  val exists: Boolean,
  val fromTomorrow: Boolean,
  val photo: String? = null,
)

/** One time on the Today screen. [alarmId] is null when the card is gone but today has a record. */
data class TodayCard(
  val alarmId: String?,
  val hour: Int,
  val minute: Int,
  val soundId: String?,
  val pills: List<TodayPill>,
  val status: DoseStatus,
  val statusAt: Long?,
)

/** The Today screen: its cards, and the counted pills running low or out. */
data class Today(val date: LocalDate, val cards: List<TodayCard>, val refills: List<RefillWarning>)

/**
 * The doses recorded in a date range, with the pills as they are now (for their photos, and to
 * tell a deleted one). [oldest] is the date of the oldest record kept, null when there is none.
 */
data class History(val today: LocalDate, val oldest: LocalDate?, val doses: List<DoseRecord>, val pills: List<Pill>)

/** The time cards the pills need, and the alarms housekeeping removed. */
data class CardPlan(val cards: List<Alarm>, val removedIds: List<String>)
