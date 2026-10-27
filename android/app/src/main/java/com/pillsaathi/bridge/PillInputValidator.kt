package com.pillsaathi.bridge

import com.pillsaathi.alarm.DoseTime
import com.pillsaathi.alarm.PhotoRules
import com.pillsaathi.alarm.PillDraft
import com.pillsaathi.alarm.PillForm
import kotlin.math.abs
import kotlin.math.roundToLong

/** A call the module refuses, with the code JS sees in `error.code`. */
class AlarmException(val code: String, message: String) : Exception(message)

/**
 * Checks a pill from JS before it reaches the engine. Takes the raw values of
 * `ReadableMap.toHashMap()`, so a wrong type is just another invalid input. Pure: no Android imports.
 */
object PillInputValidator {
  const val INVALID_PILL = "INVALID_PILL"
  const val MAX_NAME_LENGTH = 60
  const val MAX_TIMES = 6
  const val MAX_DAYS = 365

  /**
   * Throws [AlarmException] with code [INVALID_PILL] on any bad value: a name blank or over
   * [MAX_NAME_LENGTH] after trimming, an unknown form, an amount off its form's steps or range,
   * 1 to [MAX_TIMES] distinct times, days null (no end) or 1 to [MAX_DAYS], and a photo that is
   * null (or missing) or a photo's file name, never a path. Times come back sorted.
   */
  fun validate(raw: Map<String, Any?>): PillDraft {
    val id = raw["id"]
    if (id != null && id !is String) throw invalid("id must be text or null")
    val name = (raw["name"] as? String)?.trim() ?: throw invalid("name must be text")
    if (name.isEmpty() || name.length > MAX_NAME_LENGTH) {
      throw invalid("name must be 1 to $MAX_NAME_LENGTH characters")
    }
    val form = (raw["form"] as? String)?.let(PillForm::fromJson) ?: throw invalid("unknown form")
    val times = times(raw["times"])
    val startsTomorrow = raw["startsTomorrow"] as? Boolean ?: throw invalid("startsTomorrow must be true or false")
    val days = raw["days"]?.let { whole(it, 1..MAX_DAYS, "days") }
    val photo = raw["photo"]?.let {
      if (it !is String || !PhotoRules.isPhotoName(it)) throw invalid("photo must be a photo's name or null")
      it
    }
    return PillDraft(id as String?, name, form, amount(raw["amount"], form), times, startsTomorrow, days, photo)
  }

  /** The amount as a whole number of [form]'s steps, within its range. */
  private fun amount(value: Any?, form: PillForm): Double {
    val d = (value as? Number)?.toDouble()
    if (d == null || !d.isFinite()) throw invalid("amount must be a number")
    val steps = d / form.step
    val wholeSteps = steps.roundToLong()
    val amount = wholeSteps * form.step
    if (abs(steps - wholeSteps) > 1e-9 || amount < form.min || amount > form.max) {
      throw invalid("amount must be ${form.min} to ${form.max} in steps of ${form.step}")
    }
    return amount
  }

  private fun times(value: Any?): List<DoseTime> {
    val list = value as? List<*> ?: throw invalid("times must be a list")
    if (list.size !in 1..MAX_TIMES) throw invalid("a pill has 1 to $MAX_TIMES times")
    val times = list.map {
      val t = it as? Map<*, *> ?: throw invalid("each time must have an hour and minute")
      DoseTime(whole(t["hour"], 0..23, "hour"), whole(t["minute"], 0..59, "minute"))
    }
    if (times.toSet().size != times.size) throw invalid("times must not repeat")
    return times.sorted()
  }

  private fun whole(value: Any?, range: IntRange, what: String): Int {
    val d = (value as? Number)?.toDouble()
    if (d == null || d.isNaN() || d.isInfinite() || d != Math.floor(d) || d.toInt() !in range) {
      throw invalid("$what must be a whole number in $range")
    }
    return d.toInt()
  }

  private fun invalid(message: String) = AlarmException(INVALID_PILL, message)
}
