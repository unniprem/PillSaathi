package com.pillsaathi.bridge

import org.junit.Assert.assertEquals
import org.junit.Assert.fail
import org.junit.Test

class AlarmInputValidatorTest {
  private fun assertRejected(hour: Any?, minute: Any?, days: Any?) {
    try {
      AlarmInputValidator.validate(hour, minute, days)
      fail("accepted hour=$hour minute=$minute days=$days")
    } catch (e: AlarmException) {
      assertEquals("INVALID_ALARM", e.code)
    }
  }

  @Test fun rejectsHourOutOfRange() {
    assertRejected(-1.0, 0.0, listOf<Any?>())
    assertRejected(24.0, 0.0, listOf<Any?>())
  }

  @Test fun rejectsMinuteOutOfRange() {
    assertRejected(0.0, -1.0, listOf<Any?>())
    assertRejected(0.0, 60.0, listOf<Any?>())
  }

  @Test fun rejectsFractionalAndNaN() {
    assertRejected(1.5, 0.0, listOf<Any?>())
    assertRejected(Double.NaN, 0.0, listOf<Any?>())
  }

  @Test fun rejectsBadDays() {
    assertRejected(7.0, 0.0, listOf(0.0))
    assertRejected(7.0, 0.0, listOf(8.0))
    assertRejected(7.0, 0.0, listOf(1.0, 1.0))
    assertRejected(7.0, 0.0, listOf(null))
    assertRejected(7.0, 0.0, listOf("1"))
    assertRejected(7.0, 0.0, null)
    assertRejected(7.0, 0.0, "1,2")
  }

  @Test fun rejectsWrongTypedTime() {
    assertRejected("7", 0.0, listOf<Any?>())
    assertRejected(7.0, null, listOf<Any?>())
  }

  @Test fun acceptsValidInput() {
    assertEquals(ValidatedInput(0, 0, emptySet()), AlarmInputValidator.validate(0.0, 0.0, listOf<Any?>()))
    assertEquals(
      ValidatedInput(23, 59, setOf(1, 2, 3, 4, 5, 6, 7)),
      AlarmInputValidator.validate(23.0, 59.0, listOf(7.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0)),
    )
    assertEquals(
      setOf(1, 3, 5),
      AlarmInputValidator.validate(7.0, 30.0, listOf(1.0, 3.0, 5.0)).days,
    )
  }
}
