package com.pillsaathi.alarm

import java.time.LocalDate
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

  @Test fun alarms_roundTrip_withWindow() {
    val alarms = listOf(
      Alarm(
        "c1", 8, 0, (1..7).toSet(), "A, B", null, true, 1000L, null, null, 100L,
        LocalDate.of(2026, 10, 26), LocalDate.of(2026, 11, 5),
      ),
      Alarm("c2", 21, 0, (1..7).toSet(), "C", "s1", true, 2000L, null, null, 200L, LocalDate.of(2026, 10, 27), null),
    )
    val json = AlarmJson.alarmsToJson(alarms)
    assertTrue(json.contains("\"2026-10-26\"") && json.contains("\"2026-11-05\""))
    assertEquals(alarms, AlarmJson.alarmsFromJson(json))
  }

  @Test fun alarms_jsonWithoutWindowKeys_readsNullWindow() {
    val old =
      "[{\"id\":\"a1\",\"hour\":7,\"minute\":30,\"days\":[1,3,5],\"name\":\"Pills\"," +
        "\"soundId\":\"s1\",\"enabled\":true,\"nextTriggerAt\":1000,\"snoozeUntil\":null," +
        "\"lastFiredAt\":null,\"createdAt\":100}]"
    assertEquals(
      listOf(Alarm("a1", 7, 30, setOf(1, 3, 5), "Pills", "s1", true, 1000L, null, null, 100L, null, null)),
      AlarmJson.alarmsFromJson(old),
    )
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

  @Test fun ringingMarker_roundTrip_withQueue() {
    val m = RingingMarker("a1", 1792890480992L, listOf("a3", "a2"))
    assertEquals(m, AlarmJson.ringingMarkerFromJson(AlarmJson.ringingMarkerToJson(m)))
  }

  @Test fun ringingMarker_writtenBeforeQueues_readsWithEmptyQueue() =
    assertEquals(
      RingingMarker("a1", 5L, emptyList()),
      AlarmJson.ringingMarkerFromJson("{\"alarmId\":\"a1\",\"startedAt\":5}"),
    )
}
