package com.pillsaathi.alarm

import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class PillJsonTest {
  @Test fun pills_roundTrip() {
    val pills = listOf(
      Pill(
        "p1", "Azithromycin 500", PillForm.TABLET, 1.5,
        listOf(DoseTime(8, 0), DoseTime(21, 30)), LocalDate.of(2026, 10, 26), 5, 100L,
      ),
      Pill("p2", "Telma 40", PillForm.SYRUP, 7.5, listOf(DoseTime(9, 0)), LocalDate.of(2026, 10, 27), null, 200L),
    )
    val json = PillJson.pillsToJson(pills)
    assertTrue(json.contains("\"2026-10-26\"") && json.contains("\"syrup\""))
    assertEquals(pills, PillJson.pillsFromJson(json))
  }

  @Test fun pill_photo_roundTrip() {
    val pill = Pill(
      "p1", "Telma 40", PillForm.TABLET, 1.0, listOf(DoseTime(8, 0)), LocalDate.of(2026, 10, 26), null, 100L,
      photo = "3f2504e0-4f89-41d3-9a0c-0305e82c3301.jpg",
    )
    val json = PillJson.pillsToJson(listOf(pill))
    assertTrue(json.contains("\"photo\":\"3f2504e0-4f89-41d3-9a0c-0305e82c3301.jpg\""))
    assertEquals(listOf(pill), PillJson.pillsFromJson(json))
    val none = pill.copy(photo = null)
    assertEquals(listOf(none), PillJson.pillsFromJson(PillJson.pillsToJson(listOf(none))))
  }

  @Test fun pill_missingPhoto_null() {
    val json =
      "[{\"id\":\"p1\",\"name\":\"A\",\"form\":\"tablet\",\"amount\":1,\"times\":[{\"hour\":8,\"minute\":0}]," +
        "\"startDate\":\"2026-10-26\",\"days\":null,\"createdAt\":1}]"
    assertNull(PillJson.pillsFromJson(json).single().photo)
  }

  @Test fun doses_roundTrip() {
    val doses = listOf(
      DoseRecord(
        LocalDate.of(2026, 10, 26), 8, 0, DoseOutcome.TAKEN, 1000L,
        listOf(DosePill("p1", "Azithromycin 500", PillForm.TABLET, 0.5), DosePill("p2", "Cough", PillForm.SYRUP, 5.0)),
      ),
      DoseRecord(LocalDate.of(2026, 10, 26), 21, 0, DoseOutcome.SKIPPED, 2000L, emptyList()),
      DoseRecord(
        LocalDate.of(2026, 10, 25), 21, 0, DoseOutcome.MISSED, 3000L,
        listOf(DosePill("p3", "Eye", PillForm.DROPS, 2.0)),
      ),
    )
    val json = PillJson.dosesToJson(doses)
    assertTrue(json.contains("\"taken\"") && json.contains("\"missed\""))
    assertEquals(doses, PillJson.dosesFromJson(json))
  }

  @Test fun blank_readsEmpty() {
    assertTrue(PillJson.pillsFromJson(null).isEmpty())
    assertTrue(PillJson.pillsFromJson(" ").isEmpty())
    assertTrue(PillJson.dosesFromJson(null).isEmpty())
    assertTrue(PillJson.dosesFromJson("").isEmpty())
  }

  @Test fun unknownForm_readsTablet() {
    val json =
      "[{\"id\":\"p1\",\"name\":\"A\",\"form\":\"injection\",\"amount\":1,\"times\":[{\"hour\":8,\"minute\":0}]," +
        "\"startDate\":\"2026-10-26\",\"days\":null,\"createdAt\":1}]"
    assertEquals(PillForm.TABLET, PillJson.pillsFromJson(json).single().form)
    assertNull(PillForm.fromJson("injection"))
    assertEquals(PillForm.DROPS, PillForm.fromJson("drops"))
  }
}
