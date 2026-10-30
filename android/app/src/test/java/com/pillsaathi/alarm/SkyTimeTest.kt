package com.pillsaathi.alarm

import org.junit.Assert.assertEquals
import org.junit.Test

class SkyTimeTest {
  @Test
  fun `the sky follows the clock`() {
    assertEquals(
      listOf(Sky.NIGHT, Sky.DAWN, Sky.DAWN, Sky.DAY, Sky.DAY, Sky.EVENING, Sky.EVENING, Sky.NIGHT, Sky.NIGHT),
      listOf(4, 5, 7, 8, 16, 17, 18, 19, 0).map { SkyTime.of(it) },
    )
  }
}
