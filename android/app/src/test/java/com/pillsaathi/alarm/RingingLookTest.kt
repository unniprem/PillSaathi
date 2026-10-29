package com.pillsaathi.alarm

import org.junit.Assert.assertEquals
import org.junit.Test

class RingingLookTest {
  @Test
  fun `the AM or PM beside the time is drawn small, wherever the phone puts it`() {
    assertEquals(listOf(4..6), RingingLook.smallParts("9:00 PM"))
    assertEquals(listOf(4..6), RingingLook.smallParts("9:00 PM"))
    assertEquals(listOf(5..9), RingingLook.smallParts("12:30 p.m."))
    assertEquals(listOf(0..2), RingingLook.smallParts("오후 9:00"))
  }

  @Test
  fun `a 24-hour time is all large, whatever its separator`() {
    assertEquals(emptyList<IntRange>(), RingingLook.smallParts("21:00"))
    assertEquals(emptyList<IntRange>(), RingingLook.smallParts("21.00"))
    assertEquals(emptyList<IntRange>(), RingingLook.smallParts(""))
  }

  @Test
  fun `a pill's box is its colour laid thinly over white`() {
    assertEquals(0xFFFDEDE7.toInt(), RingingLook.tint(0xFFF0845F.toInt(), 0.15f))
    assertEquals(0xFFFFFFFF.toInt(), RingingLook.tint(0xFF9B3D2E.toInt(), 0f))
    assertEquals(0xFF9B3D2E.toInt(), RingingLook.tint(0xFF9B3D2E.toInt(), 1f))
  }
}
