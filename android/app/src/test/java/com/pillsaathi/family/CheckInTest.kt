package com.pillsaathi.family

import com.pillsaathi.alarm.DoseTime
import org.junit.Assert.assertEquals
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
}
