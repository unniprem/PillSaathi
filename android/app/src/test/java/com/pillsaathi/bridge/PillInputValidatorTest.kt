package com.pillsaathi.bridge

import com.pillsaathi.alarm.DoseTime
import com.pillsaathi.alarm.PillDraft
import com.pillsaathi.alarm.PillForm
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.fail
import org.junit.Test

class PillInputValidatorTest {
  private fun time(hour: Any?, minute: Any?) = hashMapOf("hour" to hour, "minute" to minute)

  /** A valid input as `ReadableMap.toHashMap()` gives it: numbers arrive as Double. */
  private fun input(vararg changes: Pair<String, Any?>): Map<String, Any?> =
    hashMapOf<String, Any?>(
      "id" to null,
      "name" to "  Azithromycin 500 ",
      "form" to "tablet",
      "amount" to 1.0,
      "times" to arrayListOf(time(21.0, 0.0), time(8.0, 0.0)),
      "startsTomorrow" to false,
      "days" to 5.0,
    ).apply { changes.forEach { (k, v) -> put(k, v) } }

  private fun assertRejected(vararg changes: Pair<String, Any?>) {
    try {
      val draft = PillInputValidator.validate(input(*changes))
      fail("accepted ${changes.toList()}: $draft")
    } catch (e: AlarmException) {
      assertEquals("INVALID_PILL", e.code)
    }
  }

  @Test fun acceptsValidInput_trimsNameAndSortsTimes() =
    assertEquals(
      PillDraft(null, "Azithromycin 500", PillForm.TABLET, 1.0, listOf(DoseTime(8, 0), DoseTime(21, 0)), false, 5),
      PillInputValidator.validate(input()),
    )

  @Test fun acceptsNoEndAnIdAndOtherForms() {
    assertNull(PillInputValidator.validate(input("days" to null)).days)
    assertEquals("p1", PillInputValidator.validate(input("id" to "p1")).id)
    val syrup = PillInputValidator.validate(input("form" to "syrup", "amount" to 7.5, "startsTomorrow" to true))
    assertEquals(PillForm.SYRUP, syrup.form)
    assertEquals(7.5, syrup.amount, 0.0)
    assertEquals(true, syrup.startsTomorrow)
    assertEquals(0.5, PillInputValidator.validate(input("amount" to 0.5)).amount, 0.0)
    assertEquals(60, PillInputValidator.validate(input("name" to "x".repeat(60))).name.length)
  }

  @Test fun rejectsBadNames() {
    assertRejected("name" to "   ")
    assertRejected("name" to "x".repeat(61))
    assertRejected("name" to null)
    assertRejected("name" to 5.0)
  }

  @Test fun rejectsUnknownForm() {
    assertRejected("form" to "pill")
    assertRejected("form" to null)
  }

  @Test fun rejectsAmountsOffTheStepOrRange() {
    assertRejected("amount" to 0.25)
    assertRejected("amount" to 0.0)
    assertRejected("amount" to 10.5)
    assertRejected("form" to "capsule", "amount" to 1.5)
    assertRejected("form" to "syrup", "amount" to 2.0)
    assertRejected("amount" to Double.NaN)
    assertRejected("amount" to Double.POSITIVE_INFINITY)
    assertRejected("amount" to "1")
  }

  @Test fun rejectsBadTimes() {
    assertRejected("times" to arrayListOf<Any?>())
    assertRejected("times" to ArrayList((0..6).map { time(it.toDouble(), 0.0) }))
    assertRejected("times" to arrayListOf(time(8.0, 0.0), time(8.0, 0.0)))
    assertRejected("times" to arrayListOf(time(24.0, 0.0)))
    assertRejected("times" to arrayListOf(time(8.0, 1.5)))
    assertRejected("times" to arrayListOf(time(8.0, null)))
    assertRejected("times" to arrayListOf("08:00"))
    assertRejected("times" to null)
  }

  @Test fun rejectsBadDays() {
    assertRejected("days" to 0.0)
    assertRejected("days" to 366.0)
    assertRejected("days" to 5.5)
    assertRejected("days" to "5")
  }

  @Test fun rejectsMissingOrWrongStartsTomorrow() {
    assertRejected("startsTomorrow" to null)
    assertRejected("startsTomorrow" to "false")
  }

  @Test fun rejectsNonStringId() = assertRejected("id" to 5.0)
}
