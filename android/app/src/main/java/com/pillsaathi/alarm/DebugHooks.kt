package com.pillsaathi.alarm

/** Test-only overrides. Set only from the debug build's DebugAlarmReceiver. */
object DebugHooks {
  @Volatile var autoSilenceMsOverride: Long? = null
}
