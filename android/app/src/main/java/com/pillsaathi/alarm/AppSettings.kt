package com.pillsaathi.alarm

/** A language the app can speak, with its name as its own readers write it. */
enum class AppLanguage(val code: String, val label: String) {
  EN("en", "English"),
  ML("ml", "മലയാളം"),
  HI("hi", "हिन्दी");

  companion object {
    fun fromCode(code: String?): AppLanguage? = values().firstOrNull { it.code == code }
  }
}

/**
 * The app's own settings. A null [language] follows the phone's language. [role] is who the phone
 * is for, "elder" or "carer" as JS chose it; null until it has been asked.
 */
data class AppSettings(
  val language: AppLanguage? = null,
  val readAloud: Boolean = true,
  val role: String? = null,
)

/** Which languages the app lists, and which one it speaks. Pure. */
object LanguageRules {
  /**
   * Languages a reader has checked. Only these are listed in a release build, so an elder never
   * sees a draft translation. Showing a language once it is checked is a change here.
   */
  val CHECKED: Set<AppLanguage> = setOf(AppLanguage.EN)

  /** The languages to list, in [AppLanguage] order: every one in a debug build, else [CHECKED]. */
  fun available(debug: Boolean): List<AppLanguage> =
    AppLanguage.values().filter { debug || it in CHECKED }

  /**
   * The language the app speaks: the [stored] choice if it is listed, else the phone's language if
   * it is listed, else English. A choice hidden since (made on a debug build, say) falls back too.
   */
  fun effective(stored: AppLanguage?, phoneLanguage: String, available: List<AppLanguage>): AppLanguage =
    stored?.takeIf { it in available }
      ?: AppLanguage.fromCode(phoneLanguage)?.takeIf { it in available }
      ?: AppLanguage.EN
}
