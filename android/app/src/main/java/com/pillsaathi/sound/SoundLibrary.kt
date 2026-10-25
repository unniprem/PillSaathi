package com.pillsaathi.sound

import android.content.Context
import android.media.MediaMetadataRetriever
import android.util.Log
import com.pillsaathi.alarm.AlarmEngine
import com.pillsaathi.alarm.LOG_TAG
import com.pillsaathi.alarm.Sound
import com.pillsaathi.alarm.SoundKind
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.InputStream
import java.util.UUID

/** A saved sound and the names of the alarms that use it. */
data class SoundEntry(val sound: Sound, val usedBy: List<String>)

/** A failure the user is told about. [code] is one of `SoundErrors` in `src/native/sounds.ts`. */
class SoundException(val code: String, message: String, cause: Throwable? = null) :
  Exception(message, cause) {
  companion object {
    const val UNSUPPORTED_AUDIO = "UNSUPPORTED_AUDIO"
    const val RECORDING_TOO_SHORT = "RECORDING_TOO_SHORT"
    const val NO_ACTIVITY = "NO_ACTIVITY"
    const val BUSY = "BUSY"
    const val NOT_FOUND = "NOT_FOUND"
    const val MIC_PERMISSION = "MIC_PERMISSION"
    const val STORAGE_ERROR = "STORAGE_ERROR"
  }
}

/**
 * The user's saved sounds: records in the alarm store and files in its sounds directory. The
 * `:ringing` process reads the same data, so nothing is cached and every change runs under the
 * store lock. A sound's file is always complete before its record is saved.
 */
class SoundLibrary(context: Context) {
  private val engine = AlarmEngine.get(context)
  private val store = engine.store

  /** Every sound, newest first. */
  fun list(): List<SoundEntry> = store.locked {
    val alarms = store.loadAlarms()
    store.loadSounds().sortedByDescending { it.createdAt }.map { sound ->
      SoundEntry(sound, usedBy = alarms.filter { it.soundId == sound.id }.map { it.name })
    }
  }

  /** The file of sound [id], or null if there is no such sound or its file is gone. */
  fun fileOf(id: String): File? {
    val sound = store.locked { store.loadSounds() }.firstOrNull { it.id == id } ?: return null
    return File(store.soundsDir, sound.fileName).takeIf { it.isFile }
  }

  /** A new, unused path in the sounds directory, for a file about to be added. */
  fun newFile(extension: String): File = File(store.soundsDir, "${UUID.randomUUID()}.$extension")

  /**
   * Saves the record for [file], which must already be complete in the sounds directory: the
   * `:ringing` process may play it as soon as the record exists.
   */
  fun add(file: File, name: String, kind: SoundKind, durationMs: Long): Sound = store.locked {
    val sound =
      Sound(
        id = UUID.randomUUID().toString(),
        name = name,
        kind = kind,
        durationMs = durationMs,
        fileName = file.name,
        createdAt = System.currentTimeMillis(),
      )
    store.saveSounds(store.loadSounds() + sound)
    sound
  }

  /**
   * Copies a finished recording, [take], into the library; the caller then deletes the take. A
   * blank [name] becomes the default. Not a rename: a file made in the cache directory keeps its
   * cache group, and Android would count the user's sound as cache.
   */
  fun addRecording(take: File, name: String, durationMs: Long): Sound {
    val file = newFile(RECORDING_EXTENSION)
    var added = false
    try {
      FileInputStream(take).use { copyDurably(it, file) }
      val cleanName = name.trim().ifEmpty { DEFAULT_RECORDING_NAME }
      val sound = add(file, cleanName, SoundKind.RECORDED, durationMs)
      added = true
      return sound
    } finally {
      if (!added) file.delete()
    }
  }

  /**
   * Deletes sound [id], its record and then its file, and points the alarms that used it back at
   * the default tone, all under one lock. Returns false if there is no such sound.
   */
  fun delete(id: String): Boolean = store.locked {
    val sounds = store.loadSounds()
    val sound = sounds.firstOrNull { it.id == id } ?: return@locked false
    store.saveSounds(sounds.filterNot { it.id == id })
    val file = File(store.soundsDir, sound.fileName)
    if (file.exists() && !file.delete()) Log.w(LOG_TAG, "Could not delete sound file ${file.name}")
    engine.clearSound(id)
    true
  }

  companion object {
    private const val DEFAULT_RECORDING_NAME = "My recording"
    private const val RECORDING_EXTENSION = "m4a"
  }
}

/**
 * The length of [file] in ms, or null unless Android reads it as audio: it must have an audio
 * track and a duration above zero. A video without sound fails, so it can't become a silent alarm.
 */
internal fun audioDurationMs(file: File): Long? {
  val retriever = MediaMetadataRetriever()
  return try {
    retriever.setDataSource(file.absolutePath)
    val hasAudio =
      retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_HAS_AUDIO) == "yes"
    val durationMs =
      retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull()
    durationMs?.takeIf { hasAudio && it > 0 }
  } catch (e: Exception) {
    Log.w(LOG_TAG, "Could not read ${file.name} as audio", e)
    null
  } finally {
    try {
      retriever.release()
    } catch (e: Exception) {
      Log.w(LOG_TAG, "Could not release the metadata retriever", e)
    }
  }
}

/** Writes [input] to [file] and flushes it to disk, so a record saved next never outlives it. */
internal fun copyDurably(input: InputStream, file: File) {
  FileOutputStream(file).use { out ->
    input.copyTo(out)
    out.fd.sync()
  }
}
