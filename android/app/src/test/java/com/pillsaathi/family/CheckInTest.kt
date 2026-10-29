package com.pillsaathi.family

import com.pillsaathi.alarm.DoseTime
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

class CheckInTest {
  private val clock: (DoseTime) -> String = { "%d:%02d".format(it.hour, it.minute) }

  @Test fun `notice lines say who did what, with her times`() {
    val added = AppliedChange("Ravi", NoticeKind.ADDED, "Telma 40", listOf(DoseTime(8, 0), DoseTime(20, 0)), null, null)
    assertEquals(listOf("Ravi", "Telma 40", "8:00, 20:00"), CheckIn.noticeArgs(added, clock, "Default tone"))
    val changed = AppliedChange("Ravi", NoticeKind.CHANGED, "Telma 40", emptyList(), null, null)
    assertEquals(listOf("Ravi", "Telma 40"), CheckIn.noticeArgs(changed, clock, "Default tone"))
    val deleted = AppliedChange("Sita", NoticeKind.DELETED, "Azee 500", emptyList(), null, null)
    assertEquals(listOf("Sita", "Azee 500"), CheckIn.noticeArgs(deleted, clock, "Default tone"))
    val sound = AppliedChange("Ravi", NoticeKind.SOUND, null, emptyList(), DoseTime(8, 0), "Ravi's sound")
    assertEquals(listOf("Ravi", "8:00", "Ravi's sound"), CheckIn.noticeArgs(sound, clock, "Default tone"))
    val tone = sound.copy(sound = null)
    assertEquals(listOf("Ravi", "8:00", "Default tone"), CheckIn.noticeArgs(tone, clock, "Default tone"))
  }

  private fun change(id: String, by: String = "R", byName: String = "Ravi") =
    RemoteChange(id, by, byName, 1L, RemoteRules.PENDING, null, null, 0, ChangeBody.DeletePill("p1"))

  @Test fun `a notice goes out for what was applied even when a later change fails`() {
    val notified = mutableListOf<List<AppliedChange>>()
    val steps = object : CheckInSteps {
      override fun claim(change: RemoteChange) = true

      override fun apply(change: RemoteChange, applied: MutableList<AppliedChange>): String? {
        applied += AppliedChange("Ravi", NoticeKind.DELETED, change.id, emptyList(), null, null)
        return null
      }

      override fun finish(change: RemoteChange, reason: String?) {
        if (change.id == "c2") throw FamilyException(FamilyCloud.OFFLINE, "gone")
      }

      override fun notify(applied: List<AppliedChange>) {
        notified += applied.toList()
      }
    }
    try {
      CheckIn.process(listOf(change("c1"), change("c2"), change("c3")), steps)
      fail("the failure should reach the caller")
    } catch (e: FamilyException) {
      assertEquals(FamilyCloud.OFFLINE, e.code)
    }
    assertEquals(1, notified.size)
    assertEquals(listOf("c1", "c2"), notified.single().map { it.pill })
  }

  @Test fun `a change her phone can't apply is not done, and the rest go on`() {
    val finished = mutableListOf<Pair<String, String?>>()
    val steps = object : CheckInSteps {
      override fun claim(change: RemoteChange) = change.id != "gone"

      override fun apply(change: RemoteChange, applied: MutableList<AppliedChange>): String? =
        if (change.id == "bad") throw IllegalStateException("engine") else null

      override fun finish(change: RemoteChange, reason: String?) {
        finished += change.id to reason
      }

      override fun notify(applied: List<AppliedChange>) = Unit
    }
    CheckIn.process(listOf(change("gone"), change("bad"), change("ok")), steps)
    assertEquals(listOf("bad" to RemoteRules.INVALID, "ok" to null), finished)
  }

  @Test fun `who is her phone's name for him, not what his phone wrote`() {
    val people = mapOf("R" to Person("Ravi", "ravi@gmail.com"), "S" to Person("", "sita@gmail.com"))
    assertEquals("Ravi", CheckIn.who(change("c1", "R", "Doctor"), people))
    assertEquals("sita@gmail.com", CheckIn.who(change("c1", "S", "Doctor"), people))
    assertTrue(CheckIn.who(change("c1", "X", "Someone"), people) == "Someone")
  }
}
