package com.pillsaathi.family

import com.pillsaathi.alarm.DoseOutcome
import com.pillsaathi.alarm.DosePill
import com.pillsaathi.alarm.DoseRecord
import com.pillsaathi.alarm.DoseTime
import com.pillsaathi.alarm.Pill
import com.pillsaathi.alarm.PillForm
import com.pillsaathi.alarm.RefillLevel
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Test

class FamilyJsonTest {
  private val azee = Pill(
    "p1", "Azee 500", PillForm.TABLET, 1.5, listOf(DoseTime(8, 0), DoseTime(14, 0)),
    LocalDate.of(2026, 10, 1), 5, 100L, photo = "a.jpg", remaining = 9.5,
  )
  private val taken = DoseRecord(
    LocalDate.of(2026, 10, 28), 8, 0, DoseOutcome.TAKEN, 1_000L,
    listOf(DosePill("p1", "Azee 500", PillForm.TABLET, 1.5), DosePill("p2", "Telma 40", PillForm.CAPSULE, 1.0)),
    marked = true,
  )
  private val missed = DoseRecord(
    LocalDate.of(2026, 10, 28), 14, 0, DoseOutcome.MISSED, 2_000L,
    listOf(DosePill("p1", "Azee 500", PillForm.TABLET, 1.5)),
  )

  @Test fun local_roundTrip() {
    val local = FamilyLocal(
      sharing = true,
      uploaded = Uploaded("E", mapOf("2026-10" to "h1"), mapOf("p1" to "a.jpg")),
      follows = listOf(
        Follow(
          "E", "Amma", "+919800000000", 30, zone = "Asia/Kolkata", heardAt = 5_000L, oldest = "2026-01-02",
          pills = listOf(azee), recent = listOf(taken, missed), photos = mapOf("p1" to "a.jpg"), since = 4_000L,
        ),
        Follow("F", "Appa", null, null),
      ),
      checkedThrough = 6_000L,
      pinged = setOf("E|2026-10-28|14:0"),
      refillPinged = mapOf("E|p1" to RefillLevel.LOW),
      silentWarned = mapOf("F" to 3_000L),
    )
    assertEquals(local, FamilyJson.localFromJson(FamilyJson.localToJson(local)))
  }

  @Test fun local_blank_defaults() {
    assertEquals(FamilyLocal(), FamilyJson.localFromJson(null))
    assertEquals(FamilyLocal(), FamilyJson.localFromJson(""))
    assertFalse(FamilyJson.localFromJson(null).sharing)
  }

  @Test fun pill_fromFirestoreNumbers() {
    val m: Map<String, Any?> = mapOf(
      "id" to "p1", "name" to "Azee 500", "form" to "tablet", "amount" to 1L,
      "times" to listOf(mapOf("hour" to 8L, "minute" to 0L)), "startDate" to "2026-10-01",
      "days" to null, "createdAt" to 100L, "photo" to null, "remaining" to 9.5,
    )
    val expected = Pill(
      "p1", "Azee 500", PillForm.TABLET, 1.0, listOf(DoseTime(8, 0)), LocalDate.of(2026, 10, 1), null, 100L,
      remaining = 9.5,
    )
    assertEquals(expected, FamilyJson.pillFromMap(m))
  }

  @Test fun pill_toMap_neverUploadsRefillNotified() {
    val m = FamilyJson.pillToMap(azee.copy(refillNotified = RefillLevel.LOW))
    assertFalse(m.containsKey("refillNotified"))
    assertEquals(azee, FamilyJson.pillFromMap(m))
  }

  @Test fun records_roundTrip() {
    val m = FamilyJson.recordsToMap(listOf(taken, missed))
    assertEquals(listOf(taken, missed), FamilyJson.recordsFromMap(firestoreNumbers(m)))
  }

  @Test fun elder_skipsBadPill() {
    val good = FamilyJson.pillToMap(azee)
    val bad = good - "times"
    val m: Map<String, Any?> = mapOf(
      "zone" to "Asia/Kolkata", "oldest" to "2026-01-02", "pills" to listOf(bad, good),
      "followers" to listOf("R"), "people" to mapOf("R" to mapOf("name" to "Ravi", "email" to "ravi@gmail.com")),
    )
    val elder = FamilyJson.elderFromMap(firestoreNumbers(m), 7_000L)
    assertEquals(
      ElderDoc("Asia/Kolkata", 7_000L, "2026-01-02", listOf(azee), listOf("R"), mapOf("R" to Person("Ravi", "ravi@gmail.com"))),
      elder,
    )
  }

  @Test fun monthHash_stable() {
    val a = FamilyJson.monthHash(listOf(taken, missed))
    assertEquals(a, FamilyJson.monthHash(listOf(missed, taken)))
    assertNotEquals(a, FamilyJson.monthHash(listOf(taken, missed.copy(outcome = DoseOutcome.SKIPPED))))
  }

  /** [value] as Firestore gives it back: every whole number a Long, every other number a Double. */
  @Suppress("UNCHECKED_CAST")
  private fun <T> firestoreNumbers(value: T): T = when (value) {
    is Map<*, *> -> value.mapValues { firestoreNumbers(it.value) } as T
    is List<*> -> value.map { firestoreNumbers(it) } as T
    is Int -> value.toLong() as T
    is Double -> (if (value % 1.0 == 0.0) value.toLong() else value) as T
    else -> value
  }
}
