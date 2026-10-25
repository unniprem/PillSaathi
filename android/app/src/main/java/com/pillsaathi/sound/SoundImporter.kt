package com.pillsaathi.sound

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns
import android.util.Log
import com.pillsaathi.alarm.LOG_TAG
import com.pillsaathi.alarm.Sound
import com.pillsaathi.alarm.SoundKind
import java.io.IOException

/**
 * Brings an audio file the user picks into the library. The file is copied in and the original is
 * never used again, so moving or deleting it can't break an alarm.
 */
class SoundImporter(context: Context, private val library: SoundLibrary) {
  private val resolver = context.applicationContext.contentResolver

  /** The system file picker, limited to the audio types an alarm can play. */
  fun pickIntent(): Intent =
    Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
      addCategory(Intent.CATEGORY_OPENABLE)
      type = "audio/*"
      putExtra(Intent.EXTRA_MIME_TYPES, MIME_TYPES)
    }

  /**
   * Copies [uri] into the library and adds it as an imported sound. Anything Android can't read as
   * audio is rejected with [SoundException.UNSUPPORTED_AUDIO]. On any failure the copy is deleted,
   * so nothing is left behind. Blocks for as long as the copy takes: never call it on the main
   * thread.
   */
  fun import(uri: Uri): Sound {
    val displayName = displayName(uri)
    val file = library.newFile(extensionOf(displayName))
    var added = false
    try {
      val input = resolver.openInputStream(uri) ?: throw IOException("Could not open $uri")
      input.use { copyDurably(it, file) }
      val durationMs =
        audioDurationMs(file)
          ?: throw SoundException(SoundException.UNSUPPORTED_AUDIO, "Not playable audio: $uri")
      val sound = library.add(file, nameOf(displayName), SoundKind.IMPORTED, durationMs)
      added = true
      return sound
    } finally {
      if (!added && file.exists() && !file.delete()) {
        Log.w(LOG_TAG, "Could not delete the failed import ${file.name}")
      }
    }
  }

  private fun displayName(uri: Uri): String? =
    try {
      resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use {
        if (it.moveToFirst() && !it.isNull(0)) it.getString(0) else null
      }
    } catch (e: Exception) {
      Log.w(LOG_TAG, "Could not read the name of $uri", e)
      null
    }

  /** The display name's extension, if it is a plain one; it becomes part of a file name. */
  private fun extensionOf(displayName: String?): String {
    val ext = displayName?.substringAfterLast('.', "")?.lowercase().orEmpty()
    val plain = ext.length in 1..MAX_EXT_LENGTH && ext.all { it in 'a'..'z' || it in '0'..'9' }
    return if (plain) ext else DEFAULT_EXTENSION
  }

  private fun nameOf(displayName: String?): String =
    displayName?.substringBeforeLast('.')?.trim()?.takeIf { it.isNotEmpty() } ?: DEFAULT_NAME

  private companion object {
    val MIME_TYPES =
      arrayOf(
        "audio/mpeg",
        "audio/mp4",
        "audio/x-m4a",
        "audio/aac",
        "audio/wav",
        "audio/x-wav",
        "audio/ogg",
        "application/ogg",
      )
    const val DEFAULT_EXTENSION = "audio"
    const val DEFAULT_NAME = "Imported sound"
    const val MAX_EXT_LENGTH = 10
  }
}
