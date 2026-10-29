package com.pillsaathi.alarm

import org.junit.Assert.assertEquals
import org.junit.Test

class PillLookTest {
  @Test
  fun `a pill keeps its colour whatever its spacing or case`() {
    assertEquals(0xFF9B3D2E.toInt(), PillLook.colorFor("Iron"))
    assertEquals(0xFF9B3D2E.toInt(), PillLook.colorFor(" iron "))
    assertEquals(0xFFF4F1EA.toInt(), PillLook.colorFor("Metformin 500"))
  }
}
