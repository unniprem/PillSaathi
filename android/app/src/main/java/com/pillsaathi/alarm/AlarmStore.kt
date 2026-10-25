package com.pillsaathi.alarm

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import java.io.File

/**
 * Alarm, sound and setup data, kept in device-protected storage so alarms can ring before the
 * first unlock after a reboot.
 */
class AlarmStore(context: Context) {
  private val storage: Context = context.createDeviceProtectedStorageContext()
  private val prefs: SharedPreferences =
    storage.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  /** Runs [block] under the one process-wide store lock. All read-modify-write goes through here. */
  fun <T> locked(block: () -> T): T = synchronized(LOCK) { block() }

  fun loadAlarms(): List<Alarm> = load(KEY_ALARMS, emptyList(), AlarmJson::alarmsFromJson)

  fun saveAlarms(alarms: List<Alarm>) = save(KEY_ALARMS, AlarmJson.alarmsToJson(alarms))

  fun loadSounds(): List<Sound> = load(KEY_SOUNDS, emptyList(), AlarmJson::soundsFromJson)

  fun saveSounds(sounds: List<Sound>) = save(KEY_SOUNDS, AlarmJson.soundsToJson(sounds))

  fun loadSetup(): SetupState =
    load(KEY_SETUP, SetupState(seen = false, doneSteps = emptySet()), AlarmJson::setupFromJson)

  fun saveSetup(state: SetupState) = save(KEY_SETUP, AlarmJson.setupToJson(state))

  val soundsDir: File
    get() = File(storage.filesDir, SOUNDS_DIR).apply { mkdirs() }

  /**
   * Parses [key], or returns [empty] if the stored value can't be read. Unreadable data is moved
   * to a `<key>_corrupt_<epochMs>` backup first, so a later save never destroys it.
   */
  private fun <T> load(key: String, empty: T, parse: (String?) -> T): T = locked {
    try {
      parse(prefs.getString(key, null))
    } catch (e: Exception) {
      Log.e(LOG_TAG, "Stored $key is unreadable; backing it up and starting empty", e)
      backUpCorrupt(key)
      empty
    }
  }

  private fun backUpCorrupt(key: String) {
    val raw = prefs.all[key]?.toString()
    val editor = prefs.edit().remove(key)
    if (raw != null) editor.putString("${key}_corrupt_${System.currentTimeMillis()}", raw)
    if (!editor.commit()) Log.e(LOG_TAG, "Could not back up unreadable $key")
  }

  private fun save(key: String, json: String) {
    locked {
      if (!prefs.edit().putString(key, json).commit()) Log.e(LOG_TAG, "Could not write $key")
    }
  }

  private companion object {
    const val PREFS_NAME = "pillsaathi_store"
    const val KEY_ALARMS = "alarms"
    const val KEY_SOUNDS = "sounds"
    const val KEY_SETUP = "setup"
    const val SOUNDS_DIR = "sounds"
    val LOCK = Any()
  }
}
