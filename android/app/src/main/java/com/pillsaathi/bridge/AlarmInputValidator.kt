package com.pillsaathi.bridge

/** A call the module refuses, with the code JS sees in `error.code`. */
class AlarmException(val code: String, message: String) : Exception(message)

data class ValidatedInput(val hour: Int, val minute: Int, val days: Set<Int>)

/**
 * Checks an alarm from JS before it reaches the engine (`AlarmRules.nextTrigger` throws on bad
 * days). Takes raw values so a wrong type is just another invalid input. Pure: no Android imports.
 */
object AlarmInputValidator {
  const val INVALID_ALARM = "INVALID_ALARM"

  /** Throws [AlarmException] with code [INVALID_ALARM] on any bad value. Repeated days are rejected. */
  fun validate(hour: Any?, minute: Any?, days: Any?): ValidatedInput {
    val list = days as? List<*> ?: throw invalid("days must be a list")
    val set = LinkedHashSet<Int>()
    for (day in list) {
      if (!set.add(whole(day, 1..7, "each day"))) throw invalid("days must not repeat")
    }
    return ValidatedInput(whole(hour, 0..23, "hour"), whole(minute, 0..59, "minute"), set)
  }

  private fun whole(value: Any?, range: IntRange, what: String): Int {
    val d = (value as? Number)?.toDouble()
    if (d == null || d.isNaN() || d.isInfinite() || d != Math.floor(d) || d.toInt() !in range) {
      throw invalid("$what must be a whole number in $range")
    }
    return d.toInt()
  }

  private fun invalid(message: String) = AlarmException(INVALID_ALARM, message)
}
