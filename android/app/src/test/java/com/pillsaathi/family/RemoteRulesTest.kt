package com.pillsaathi.family

import com.pillsaathi.alarm.DoseTime
import com.pillsaathi.alarm.Pill
import com.pillsaathi.alarm.PillDraft
import com.pillsaathi.alarm.PillForm
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class RemoteRulesTest {
  private val oct29 = LocalDate.of(2026, 10, 29)
  private val oct30 = LocalDate.of(2026, 10, 30)
  private val telma = Pill("p1", "Telma 40", PillForm.TABLET, 1.0, listOf(DoseTime(8, 0)), oct29, null, 100L, photo = "a.jpg")
  private val eight = setOf(DoseTime(8, 0))
  private val draft = PillDraft(null, "Azee 500", PillForm.TABLET, 1.0, listOf(DoseTime(14, 0)), true, 5)

  private fun change(body: ChangeBody, id: String = "c1", by: String = "R") =
    RemoteChange(id, by, "Ravi", 1L, RemoteRules.PENDING, null, null, 0, body)

  private fun decide(
    body: ChangeBody,
    editors: List<String> = listOf("R"),
    pills: List<Pill> = listOf(telma),
    newPhoto: String? = null,
    id: String = "c1",
  ) = RemoteRules.decide(change(body, id), editors, pills, eight, setOf("s1"), oct29, newPhoto)

  @Test fun `a change round-trips through its map, numbers as Long`() {
    val bodies = listOf(
      ChangeBody.SavePill(draft, oct30, PhotoChoice.NEW),
      ChangeBody.SavePill(draft.copy(id = "p1", startsTomorrow = false, remaining = 30.0, remainingChanged = true), null, PhotoChoice.KEEP),
      ChangeBody.DeletePill("p1"),
      ChangeBody.SetSound(8, 0, SoundChoice.Default),
      ChangeBody.SetSound(8, 0, SoundChoice.Hers("s1")),
      ChangeBody.SetSound(8, 0, SoundChoice.New("Ravi's sound", 9_000, "m4a")),
    )
    for (body in bodies) {
      val map = RemoteRules.changeToMap("R", "Ravi", body, 2)
      // Firestore gives whole numbers back as Long.
      val stored = longs(map) as Map<String, Any?>
      val back = RemoteRules.changeFromMap("c1", stored + ("status" to "pending"), 5L, null)
      assertEquals(RemoteChange("c1", "R", "Ravi", 5L, "pending", null, null, 2, body), back)
    }
  }

  @Test fun `a bad pill map is Invalid, not a throw`() {
    val good = RemoteRules.changeToMap("R", "Ravi", ChangeBody.SavePill(draft, oct30, PhotoChoice.NONE), 0)
    @Suppress("UNCHECKED_CAST") val pill = good["pill"] as Map<String, Any?>
    val bad = listOf(
      good + ("pill" to pill + ("amount" to 0.3)),
      good + ("pill" to pill + ("times" to emptyList<Any>())),
      good + ("kind" to "wipe"),
      good + ("photo" to "maybe"),
      mapOf("kind" to "sound", "hour" to 8L),
    )
    for (m in bad) assertTrue(RemoteRules.changeFromMap("c1", m, null, null).body is ChangeBody.Invalid)
  }

  @Test fun `start date is the one he meant, or today once it has passed`() {
    assertEquals(oct30, RemoteRules.startDate(oct30, oct29))
    assertEquals(LocalDate.of(2026, 10, 31), RemoteRules.startDate(oct30, LocalDate.of(2026, 10, 31)))
    assertEquals(oct29, RemoteRules.startDate(null, oct29))
  }

  @Test fun `not an editor any more is rejected`() {
    assertEquals(ApplyDecision.Reject(RemoteRules.NOT_ALLOWED), decide(ChangeBody.DeletePill("p1"), editors = emptyList()))
  }

  @Test fun `a new pill uses the change id, and the same change again edits it`() {
    val first = decide(ChangeBody.SavePill(draft, oct30, PhotoChoice.NONE))
    assertEquals(ApplyDecision.SavePill(draft.copy(newId = "c1", startDate = oct30), isNew = true), first)
    val again = decide(ChangeBody.SavePill(draft, oct30, PhotoChoice.NONE), pills = listOf(telma.copy(id = "c1")))
    assertEquals(ApplyDecision.SavePill(draft.copy(id = "c1"), isNew = false), again)
  }

  @Test fun `an edit of a pill that is gone is rejected, and a delete of one is done`() {
    assertEquals(
      ApplyDecision.Reject(RemoteRules.PILL_GONE),
      decide(ChangeBody.SavePill(draft.copy(id = "p9"), null, PhotoChoice.KEEP)),
    )
    assertEquals(ApplyDecision.DeletePill("p9", null), decide(ChangeBody.DeletePill("p9")))
    assertEquals(ApplyDecision.DeletePill("p1", "Telma 40"), decide(ChangeBody.DeletePill("p1")))
  }

  @Test fun `photo keep, none and new`() {
    val edit = draft.copy(id = "p1", startsTomorrow = false)
    assertEquals(
      ApplyDecision.SavePill(edit.copy(photo = "a.jpg"), isNew = false),
      decide(ChangeBody.SavePill(edit, null, PhotoChoice.KEEP)),
    )
    assertEquals(ApplyDecision.SavePill(edit, isNew = false), decide(ChangeBody.SavePill(edit, null, PhotoChoice.NONE)))
    assertEquals(
      ApplyDecision.SavePill(edit.copy(photo = "b.jpg"), isNew = false),
      decide(ChangeBody.SavePill(edit, null, PhotoChoice.NEW), newPhoto = "b.jpg"),
    )
    assertEquals(
      ApplyDecision.Reject(RemoteRules.FILE_BROKEN),
      decide(ChangeBody.SavePill(edit, null, PhotoChoice.NEW), newPhoto = null),
    )
  }

  @Test fun `a sound for a time she no longer has, or a sound of hers that is gone`() {
    assertEquals(ApplyDecision.Reject(RemoteRules.TIME_GONE), decide(ChangeBody.SetSound(9, 0, SoundChoice.Default)))
    assertEquals(ApplyDecision.Reject(RemoteRules.SOUND_GONE), decide(ChangeBody.SetSound(8, 0, SoundChoice.Hers("s9"))))
    assertEquals(ApplyDecision.SetSound(8, 0, "s1", null), decide(ChangeBody.SetSound(8, 0, SoundChoice.Hers("s1"))))
  }

  @Test fun `default and new sounds`() {
    assertEquals(ApplyDecision.SetSound(8, 0, null, null), decide(ChangeBody.SetSound(8, 0, SoundChoice.Default)))
    val new = SoundChoice.New("Ravi's sound", 9_000, "m4a")
    assertEquals(ApplyDecision.SetSound(8, 0, "c1", new), decide(ChangeBody.SetSound(8, 0, new)))
  }

  @Test fun `Invalid is rejected invalid`() {
    assertEquals(ApplyDecision.Reject(RemoteRules.INVALID), decide(ChangeBody.Invalid("bad")))
  }

  @Test fun `only his changes still waiting are revoked when he is switched off`() {
    val mine = change(ChangeBody.DeletePill("p1"), id = "c1")
    val claimed = mine.copy(id = "c2", status = RemoteRules.APPLYING)
    val done = mine.copy(id = "c3", status = RemoteRules.APPLIED)
    val hers = change(ChangeBody.DeletePill("p1"), id = "c4", by = "S")
    assertEquals(listOf("c1", "c2"), RemoteRules.revoked(listOf(mine, claimed, done, hers), "R").map { it.id })
  }

  @Test fun `a change is ahead of her copy while it waits, and once done until she uploads again`() {
    val waiting = change(ChangeBody.DeletePill("p1"))
    assertTrue(RemoteRules.ahead(waiting, heardAt = 10L))
    assertTrue(RemoteRules.ahead(waiting.copy(status = RemoteRules.APPLYING), heardAt = 10L))
    val done = waiting.copy(status = RemoteRules.APPLIED, doneAt = 20L)
    assertTrue(RemoteRules.ahead(done, heardAt = 10L))
    assertTrue(RemoteRules.ahead(done, heardAt = null))
    assertFalse(RemoteRules.ahead(done, heardAt = 30L))
    assertFalse(RemoteRules.ahead(done.copy(status = RemoteRules.REJECTED), heardAt = 10L))
  }

  /** [value] with every Int turned into a Long, as Firestore gives numbers back. */
  private fun longs(value: Any?): Any? = when (value) {
    is Int -> value.toLong()
    is Map<*, *> -> value.mapValues { longs(it.value) }
    is List<*> -> value.map { longs(it) }
    else -> value
  }
}
