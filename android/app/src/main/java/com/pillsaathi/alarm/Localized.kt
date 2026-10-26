package com.pillsaathi.alarm

import android.content.Context
import android.content.res.Configuration
import java.util.Locale

/** This context with its resources in [lang], whatever the phone's language is. */
fun Context.localized(lang: AppLanguage): Context {
  val config = Configuration(resources.configuration)
  config.setLocale(Locale(lang.code))
  return createConfigurationContext(config)
}
