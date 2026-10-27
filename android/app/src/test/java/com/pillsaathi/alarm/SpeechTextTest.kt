package com.pillsaathi.alarm

import org.junit.Assert.assertEquals
import org.junit.Test

class SpeechTextTest {
  private val EN = AppLanguage.EN
  private val ML = AppLanguage.ML
  private val HI = AppLanguage.HI
  private val ML_TITLE = "മരുന്ന് കഴിക്കാൻ സമയമായി"

  @Test fun parts_english_onePart() =
    assertEquals(
      listOf(SpeechPart("Time for your medicines. Telma 40, 1 tablet. Vitamin D, 1 capsule.", EN)),
      SpeechText.parts(
        "Time for your medicines",
        EN,
        listOf(SpokenPill("Telma 40", "1 tablet"), SpokenPill("Vitamin D", "1 capsule")),
      ),
    )

  @Test fun parts_malayalam_englishNameInEnglishVoice() =
    assertEquals(
      listOf(SpeechPart("$ML_TITLE.", ML), SpeechPart("Telma 40,", EN), SpeechPart("1 ഗുളിക.", ML)),
      SpeechText.parts(ML_TITLE, ML, listOf(SpokenPill("Telma 40", "1 ഗുളിക"))),
    )

  @Test fun parts_malayalamName_onePart() =
    assertEquals(
      listOf(SpeechPart("$ML_TITLE. ടെൽമ 40, 1 ഗുളിക.", ML)),
      SpeechText.parts(ML_TITLE, ML, listOf(SpokenPill("ടെൽമ 40", "1 ഗുളിക"))),
    )

  @Test fun parts_noPills_titleOnly() =
    assertEquals(
      listOf(SpeechPart("Time for your medicines.", EN)),
      SpeechText.parts("Time for your medicines", EN, emptyList()),
    )

  // Pill names in mixed or no scripts each get a defined voice.
  @Test fun voiceFor_scripts() {
    assertEquals(EN, SpeechText.voiceFor("D3 60K", ML))
    assertEquals(ML, SpeechText.voiceFor("ടെൽമ 40", EN))
    assertEquals(ML, SpeechText.voiceFor("Telma ടെൽമ", HI))
    assertEquals(HI, SpeechText.voiceFor("दवा", EN))
    assertEquals(HI, SpeechText.voiceFor("500", HI))
  }
}
