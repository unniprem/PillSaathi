package com.pillsaathi.alarm

import org.junit.Assert.assertEquals
import org.junit.Test

class LanguageRulesTest {
  private val ALL = listOf(AppLanguage.EN, AppLanguage.ML, AppLanguage.HI)

  @Test fun effective_storedAvailable_wins() =
    assertEquals(AppLanguage.ML, LanguageRules.effective(AppLanguage.ML, "hi", ALL))

  @Test fun effective_noStored_followsPhone() =
    assertEquals(AppLanguage.HI, LanguageRules.effective(null, "hi", ALL))

  @Test fun effective_phoneNotListed_english() =
    assertEquals(AppLanguage.EN, LanguageRules.effective(null, "ta", ALL))

  // Malayalam chosen on a debug build, then a release build installed over it.
  @Test fun effective_storedButHidden_english() =
    assertEquals(AppLanguage.EN, LanguageRules.effective(AppLanguage.ML, "ml", listOf(AppLanguage.EN)))

  @Test fun available_release_checkedOnly() =
    assertEquals(listOf(AppLanguage.EN), LanguageRules.available(debug = false))

  @Test fun available_debug_allInOrder() = assertEquals(ALL, LanguageRules.available(debug = true))

  @Test fun fromCode_knownAndUnknown() {
    assertEquals(AppLanguage.HI, AppLanguage.fromCode("hi"))
    assertEquals(null, AppLanguage.fromCode("ta"))
    assertEquals(null, AppLanguage.fromCode(null))
  }
}
