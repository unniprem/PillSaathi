package com.pillsaathi.bridge

import android.app.Activity
import android.content.Intent
import android.os.Handler
import android.os.HandlerThread
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableMap
import com.pillsaathi.alarm.LOG_TAG
import com.pillsaathi.alarm.Sound
import com.pillsaathi.alarm.StorageException
import com.pillsaathi.sound.SoundException
import com.pillsaathi.sound.SoundImporter
import com.pillsaathi.sound.SoundLibrary
import com.pillsaathi.sound.SoundPreviewer
import com.pillsaathi.sound.SoundRecorder
import com.pillsaathi.specs.NativeSoundsSpec

/**
 * The sound library for JS: list, record, import, preview and delete sounds.
 *
 * All recording, playback and file work runs in call order on one background thread, which owns
 * the recorder and the previewer, so big copies never block the UI and no locks are needed. Only
 * the file picker runs on the main thread, which hands its result back.
 */
class NativeSoundsModule(reactContext: ReactApplicationContext) : NativeSoundsSpec(reactContext) {
  private val thread = HandlerThread("PillSaathiSounds").apply { start() }
  private val handler = Handler(thread.looper)
  private val library = SoundLibrary(reactContext)
  private val importer = SoundImporter(reactContext, library)
  private val recorder =
    SoundRecorder(
      reactContext,
      handler,
      onLevel = { emitOnRecordingLevel(it) },
      onAutoStopped = { emitOnRecordingAutoStopped(it.toDouble()) },
    )
  private val previewer = SoundPreviewer(onEnded = { emitOnPreviewEnded(it) })

  /** The import waiting for the file picker. Main thread only. */
  private var pendingImport: Promise? = null

  private val pickerListener =
    object : BaseActivityEventListener() {
      override fun onActivityResult(
        activity: Activity,
        requestCode: Int,
        resultCode: Int,
        data: Intent?,
      ) {
        if (requestCode != REQUEST_IMPORT) return
        val promise = pendingImport ?: return
        pendingImport = null
        val uri = data?.data
        if (resultCode != Activity.RESULT_OK || uri == null) {
          promise.resolve(null)
          return
        }
        onSoundThread(promise) { soundToJs(importer.import(uri)) }
      }
    }

  init {
    reactContext.addActivityEventListener(pickerListener)
  }

  override fun getName() = NAME

  override fun listSounds(promise: Promise) =
    onSoundThread(promise) {
      Arguments.createArray().apply {
        library.list().forEach { pushMap(soundToJs(it.sound, it.usedBy)) }
      }
    }

  override fun importSound(promise: Promise) {
    UiThreadUtil.runOnUiThread {
      if (pendingImport != null) {
        promise.reject(SoundException.BUSY, "A file is already being picked")
        return@runOnUiThread
      }
      val activity = reactApplicationContext.currentActivity
      if (activity == null) {
        promise.reject(SoundException.NO_ACTIVITY, "There is no screen to show the file picker on")
        return@runOnUiThread
      }
      pendingImport = promise
      try {
        activity.startActivityForResult(importer.pickIntent(), REQUEST_IMPORT)
      } catch (e: Exception) {
        Log.e(LOG_TAG, "Could not open the file picker", e)
        pendingImport = null
        promise.reject(e)
      }
    }
  }

  override fun startRecording(promise: Promise) =
    onSoundThread(promise) {
      previewer.stop() // Or the preview ends up in the take.
      recorder.start()
      null
    }

  override fun stopRecording(promise: Promise) =
    onSoundThread(promise) { recorder.stop().toDouble() }

  override fun discardRecording(promise: Promise) =
    onSoundThread(promise) {
      previewer.stopIf(RECORDING_ID)
      recorder.discard()
      null
    }

  override fun saveRecording(name: String, promise: Promise) =
    onSoundThread(promise) {
      val durationMs = recorder.takeDurationMs ?: throw noTake()
      previewer.stopIf(RECORDING_ID)
      val sound = library.addRecording(recorder.takeFile, name, durationMs)
      recorder.discard() // The library has its own copy now.
      soundToJs(sound)
    }

  override fun previewSound(id: String, promise: Promise) =
    onSoundThread(promise) {
      val file = library.fileOf(id) ?: throw noSound(id)
      previewer.play(id, file)
      null
    }

  override fun previewRecording(promise: Promise) =
    onSoundThread(promise) {
      if (recorder.takeDurationMs == null) throw noTake()
      previewer.play(RECORDING_ID, recorder.takeFile)
      null
    }

  override fun stopPreview(promise: Promise) =
    onSoundThread(promise) {
      previewer.stop()
      null
    }

  override fun deleteSound(id: String, promise: Promise) =
    onSoundThread(promise) {
      previewer.stopIf(id)
      if (!library.delete(id)) throw noSound(id)
      null
    }

  /**
   * Releases the microphone and the player and deletes an unsaved take. A pick still open is
   * dropped unsettled: the JS that awaits it is going away.
   */
  override fun invalidate() {
    reactApplicationContext.removeActivityEventListener(pickerListener)
    handler.post {
      previewer.stop()
      recorder.discard()
    }
    thread.quitSafely() // After the work already queued, including the cleanup above.
    super.invalidate()
  }

  /**
   * Runs [block] on the sound thread and settles [promise] exactly once: with its result, with a
   * [SoundException]'s code, with [SoundException.STORAGE_ERROR] when the store couldn't be read or
   * written, or with any other exception.
   */
  private fun onSoundThread(promise: Promise, block: () -> Any?) {
    val posted =
      handler.post {
        val result =
          try {
            block()
          } catch (e: SoundException) {
            promise.reject(e.code, e.message)
            return@post
          } catch (e: StorageException) {
            Log.e(LOG_TAG, "Sound call failed on storage", e)
            promise.reject(SoundException.STORAGE_ERROR, e.message, e)
            return@post
          } catch (e: Exception) {
            Log.e(LOG_TAG, "Sound call failed", e)
            promise.reject(e)
            return@post
          }
        promise.resolve(result)
      }
    if (!posted) promise.reject(IllegalStateException("The sound module has shut down"))
  }

  private fun noTake() = SoundException(SoundException.NOT_FOUND, "There is no finished recording")

  private fun noSound(id: String) = SoundException(SoundException.NOT_FOUND, "No sound $id")

  private fun soundToJs(sound: Sound, usedBy: List<String> = emptyList()): WritableMap =
    Arguments.createMap().apply {
      putString("id", sound.id)
      putString("name", sound.name)
      putString("kind", sound.kind.json)
      putDouble("durationMs", sound.durationMs.toDouble())
      putDouble("createdAt", sound.createdAt.toDouble())
      putArray("usedBy", Arguments.createArray().apply { usedBy.forEach { pushString(it) } })
    }

  companion object {
    const val NAME = "NativeSounds"
    private const val REQUEST_IMPORT = 4_701

    /** The id previews of the unsaved take go by, as `onPreviewEnded` reports it. */
    private const val RECORDING_ID = "recording"
  }
}
