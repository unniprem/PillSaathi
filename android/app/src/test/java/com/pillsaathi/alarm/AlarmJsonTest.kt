package com.pillsaathi.alarm

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AlarmJsonTest {
  @Test fun alarms_roundTrip_withNullsAndDays() {
    val alarms = listOf(
      Alarm("a1", 7, 30, setOf(1, 3, 5), "Pills", "s1", true, 1000L, 2000L, 500L, 100L),
      Alarm("a2", 0, 5, emptySet(), "", null, false, null, null, null, 200L),
    )
    assertEquals(alarms, AlarmJson.alarmsFromJson(AlarmJson.alarmsToJson(alarms)))
  }

  @Test fun sounds_roundTrip() {
    val sounds = listOf(
      Sound("s1", "Voice", SoundKind.RECORDED, 5000L, "s1.m4a", 1L),
      Sound("s2", "Song", SoundKind.IMPORTED, 90000L, "s2.mp3", 2L),
    )
    val json = AlarmJson.soundsToJson(sounds)
    assertTrue(json.contains("\"recorded\"") && json.contains("\"imported\""))
    assertEquals(sounds, AlarmJson.soundsFromJson(json))
  }

  @Test fun setup_roundTrip_andDefaultsWhenNull() {
    val s = SetupState(true, setOf("battery", "autostart"))
    assertEquals(s, AlarmJson.setupFromJson(AlarmJson.setupToJson(s)))
    assertEquals(SetupState(false, emptySet()), AlarmJson.setupFromJson(null))
  }

  @Test fun alarmsFromJson_nullOrBlank_isEmpty() {
    assertTrue(AlarmJson.alarmsFromJson(null).isEmpty())
    assertTrue(AlarmJson.alarmsFromJson("").isEmpty())
    assertTrue(AlarmJson.alarmsFromJson("   ").isEmpty())
  }

  @Test fun ringingMarker_roundTrip_andNullWhenMissing() {
    val m = RingingMarker("a1", 1792890480992L)
    assertEquals(m, AlarmJson.ringingMarkerFromJson(AlarmJson.ringingMarkerToJson(m)))
    assertNull(AlarmJson.ringingMarkerFromJson(null))
  }
}
