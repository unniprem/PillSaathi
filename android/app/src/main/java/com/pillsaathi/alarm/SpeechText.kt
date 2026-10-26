package com.pillsaathi.alarm

/** A stretch of speech in one voice. */
data class SpeechPart(val text: String, val lang: AppLanguage)

/** A pill as it is read aloud: its name as typed, and its amount in words. */
data class SpokenPill(val name: String, val spokenAmount: String)

/**
 * What a ring says, in parts with a voice each. The app's own words (the title and the amounts)
 * are in the app's language. A pill name is in the voice of the script it is typed in, because a
 * Malayalam or Hindi voice may read "Telma 40" badly. Pure.
 */
object SpeechText {
  /**
   * The voice for [name]: Malayalam if it has any Malayalam letter, else Hindi if it has any
   * Devanagari, else English if it has any Latin letter, else (digits only, say) [appLang].
   */
  fun voiceFor(name: String, appLang: AppLanguage): AppLanguage =
    when {
      name.any { it in 'ഀ'..'ൿ' } -> AppLanguage.ML
      name.any { it in 'ऀ'..'ॿ' } -> AppLanguage.HI
      name.any { it.isLetter() && Character.UnicodeScript.of(it.code) == Character.UnicodeScript.LATIN } ->
        AppLanguage.EN
      else -> appLang
    }

  /**
   * "[title]." then "name," and "amount." for each pill, in order. Neighbours in the same voice
   * are joined with a space, so a card all in one language is one part.
   */
  fun parts(title: String, appLang: AppLanguage, pills: List<SpokenPill>): List<SpeechPart> {
    val tokens = mutableListOf(SpeechPart("$title.", appLang))
    pills.forEach {
      tokens.add(SpeechPart("${it.name},", voiceFor(it.name, appLang)))
      tokens.add(SpeechPart("${it.spokenAmount}.", appLang))
    }
    val parts = mutableListOf<SpeechPart>()
    tokens.forEach { token ->
      val last = parts.lastOrNull()
      if (last != null && last.lang == token.lang) {
        parts[parts.size - 1] = last.copy(text = "${last.text} ${token.text}")
      } else {
        parts.add(token)
      }
    }
    return parts
  }
}
