package com.pillsaathi.alarm

import android.content.Context
import android.util.Log
import java.io.File
import java.io.IOException

/** The alarm store couldn't be read or written, for example because the disk is full. */
class StorageException(message: String, cause: Throwable?) : IOException(message, cause)

/**
 * Alarm, pill, dose, sound, setup and settings data, kept in device-protected storage so alarms can ring before the
 * first unlock after a reboot. Shared by the main and `:ringing` processes: each value is a JSON
 * file under `store/`, read fresh from disk every time, so one process always sees the other's
 * writes.
 *
 * Every load and save throws [StorageException] when the disk fails it. Callers decide: a user's
 * change fails loudly, while the ringing path logs it and rings anyway.
 */
class AlarmStore(context: Context) {
  private val storage: Context = context.createDeviceProtectedStorageContext()
  private val files =
    FileStore(File(storage.filesDir, STORE_DIR)) { message, e -> Log.w(LOG_TAG, message, e) }

  /**
   * Runs [block] under the store lock, which every thread and process of the app shares. All
   * read-modify-write goes through here. Another process gets at most
   * [FileStore.DEFAULT_LOCK_TIMEOUT_MS] to let go, so a stuck process can't stop an alarm.
   */
  fun <T> locked(block: () -> T): T = files.locked(block)

  fun loadAlarms(): List<Alarm> = load(ALARMS, emptyList(), AlarmJson::alarmsFromJson)

  fun saveAlarms(alarms: List<Alarm>) = save(ALARMS, AlarmJson.alarmsToJson(alarms))

  fun loadPills(): List<Pill> = load(PILLS, emptyList(), PillJson::pillsFromJson)

  fun savePills(pills: List<Pill>) = save(PILLS, PillJson.pillsToJson(pills))

  fun loadDoses(): List<DoseRecord> = load(DOSES, emptyList(), PillJson::dosesFromJson)

  fun saveDoses(doses: List<DoseRecord>) = save(DOSES, PillJson.dosesToJson(doses))

  fun loadSounds(): List<Sound> = load(SOUNDS, emptyList(), AlarmJson::soundsFromJson)

  fun saveSounds(sounds: List<Sound>) = save(SOUNDS, AlarmJson.soundsToJson(sounds))

  fun loadSetup(): SetupState =
    load(SETUP, SetupState(seen = false, doneSteps = emptySet()), AlarmJson::setupFromJson)

  fun saveSetup(state: SetupState) = save(SETUP, AlarmJson.setupToJson(state))

  fun loadSettings(): AppSettings = load(SETTINGS, AppSettings(), AlarmJson::settingsFromJson)

  fun saveSettings(s: AppSettings) = save(SETTINGS, AlarmJson.settingsToJson(s))

  /**
   * The settings without the store lock, for the ringing path, which must never wait on it. Any
   * problem gives the defaults; an unreadable file is left where it is for [loadSettings] to back
   * up.
   */
  fun peekSettings(): AppSettings =
    try {
      AlarmJson.settingsFromJson(files.peek(SETTINGS))
    } catch (e: Exception) {
      Log.w(LOG_TAG, "Could not peek at the settings; using the defaults", e)
      AppSettings()
    }

  /** What the `:ringing` process is ringing, or null. A crashed process can leave a stale one. */
  fun loadRingingMarker(): RingingMarker? = load(RINGING, null, AlarmJson::ringingMarkerFromJson)

  fun saveRingingMarker(m: RingingMarker?) = save(RINGING, m?.let(AlarmJson::ringingMarkerToJson))

  val soundsDir: File
    get() = File(storage.filesDir, SOUNDS_DIR).apply { mkdirs() }

  /**
   * Parses [name], or returns [empty] if the stored value can't be read. Unreadable data is moved
   * to a `<name>.corrupt-<epochMs>` backup first, so a later save never destroys it.
   */
  private fun <T> load(name: String, empty: T, parse: (String?) -> T): T =
    try {
      files.readParsed(name, parse) { e ->
        Log.e(LOG_TAG, "Stored $name is unreadable; backed it up and starting empty", e)
        empty
      }
    } catch (e: IOException) {
      throw StorageException("Could not read $name", e)
    }

  private fun save(name: String, json: String?) {
    try {
      files.write(name, json)
    } catch (e: IOException) {
      throw StorageException("Could not write $name", e)
    }
  }

  private companion object {
    const val STORE_DIR = "store"
    const val ALARMS = "alarms.json"
    const val PILLS = "pills.json"
    const val DOSES = "doses.json"
    const val SOUNDS = "sounds.json"
    const val SETUP = "setup.json"
    const val SETTINGS = "settings.json"
    const val RINGING = "ringing.json"
    const val SOUNDS_DIR = "sounds"
  }
}
