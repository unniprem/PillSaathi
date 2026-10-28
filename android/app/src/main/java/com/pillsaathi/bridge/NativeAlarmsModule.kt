package com.pillsaathi.bridge

import android.app.Activity
import android.app.TimePickerDialog
import android.content.ClipData
import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.HandlerThread
import android.os.Looper
import android.provider.MediaStore
import android.text.format.DateFormat
import android.util.Log
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts.PickVisualMedia
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableMap
import com.pillsaathi.alarm.AlarmEngine
import com.pillsaathi.alarm.AppLanguage
import com.pillsaathi.alarm.DoseRules
import com.pillsaathi.alarm.LOG_TAG
import com.pillsaathi.alarm.LanguageRules
import com.pillsaathi.alarm.MissedAlarm
import com.pillsaathi.alarm.Notifications
import com.pillsaathi.alarm.Pill
import com.pillsaathi.alarm.PillForm
import com.pillsaathi.alarm.ReconcileTrigger
import com.pillsaathi.alarm.SetupState
import com.pillsaathi.alarm.SpokenPill
import com.pillsaathi.alarm.StorageException
import com.pillsaathi.alarm.TtsVoice
import com.pillsaathi.alarm.Voice
import com.pillsaathi.alarm.VoiceAvailability
import com.pillsaathi.photo.PillPhotos
import com.pillsaathi.specs.NativeAlarmsSpec
import java.time.LocalDate
import java.time.format.DateTimeParseException
import java.util.Locale
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Pills and their photos, today's doses, card sounds, the app's language and read-aloud settings,
 * health checks, settings links, first-run setup and the time picker for JS.
 *
 * The engine and store are used fresh on every call, never cached, because the `:ringing` process
 * changes the same data. They can wait on the store lock, so they only ever run on one background
 * thread, never the UI thread.
 */
class NativeAlarmsModule(reactContext: ReactApplicationContext) : NativeAlarmsSpec(reactContext) {
  private val thread = HandlerThread("PillSaathiAlarms").apply { start() }
  private val handler = Handler(thread.looper)
  private val health = HealthChecker(reactContext)
  private val settings = SettingsLauncher(reactContext)

  private val engine: AlarmEngine
    get() = AlarmEngine.get(reactApplicationContext)

  private val photos by lazy { PillPhotos(reactApplicationContext, engine.store.photosDir) }

  private val maps by lazy { JsMaps(photos::fileUri) }

  private val main = Handler(Looper.getMainLooper())

  /** Try it's voice, kept so the engine starts once. Made on the worker; speaks on the main thread. */
  private var tryVoice: TtsVoice? = null

  /** The photo pick waiting for the camera or the photo picker. Main thread only. */
  private var pendingPick: Promise? = null

  private val photoListener =
    object : BaseActivityEventListener() {
      override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != REQUEST_CAMERA && requestCode != REQUEST_GALLERY) return
        val promise = pendingPick ?: return
        pendingPick = null
        val camera = requestCode == REQUEST_CAMERA
        val uri = if (camera) Uri.fromFile(photos.captureFile) else data?.data
        if (resultCode != Activity.RESULT_OK || uri == null) {
          promise.resolve(null)
          return
        }
        onWorker(promise) {
          val name =
            try {
              photos.importFrom(uri)
            } catch (e: Exception) {
              Log.e(LOG_TAG, "Could not take in the photo", e)
              throw AlarmException(PHOTO_ERROR, "Couldn't add the photo")
            } finally {
              if (camera) photos.captureFile.delete()
            }
          Arguments.createMap().apply {
            putString("name", name)
            putString("uri", photos.fileUri(name))
          }
        }
      }
    }

  init {
    reactContext.addActivityEventListener(photoListener)
  }

  override fun getName() = NAME

  override fun listPills(promise: Promise) =
    onWorker(promise) {
      Arguments.createArray().apply {
        engine.pills().sortedBy { it.createdAt }.forEach { pushMap(maps.pill(it)) }
      }
    }

  override fun savePill(input: ReadableMap, promise: Promise) =
    onWorker(promise) {
      // Read as plain values so a wrong type is INVALID_PILL, not a cast error.
      val draft = PillInputValidator.validate(input.toHashMap())
      try {
        maps.pill(engine.savePill(draft))
      } catch (e: NoSuchElementException) {
        throw AlarmException(NOT_FOUND, "No pill ${draft.id}")
      }
    }

  override fun deletePill(id: String, promise: Promise) =
    onWorker(promise) {
      engine.deletePill(id)
      null
    }

  override fun getToday(promise: Promise) = onWorker(promise) { maps.today(engine.today()) }

  override fun getHistory(from: String, to: String, promise: Promise) =
    onWorker(promise) { maps.history(engine.history(LocalDate.parse(from), LocalDate.parse(to))) }

  override fun setCardSound(alarmId: String, soundId: String?, promise: Promise) =
    onWorker(promise) {
      try {
        engine.setCardSound(alarmId, soundId)
      } catch (e: NoSuchElementException) {
        throw AlarmException(NOT_FOUND, "No card $alarmId")
      }
      null
    }

  override fun markDoseTaken(date: String, hour: Double, minute: Double, promise: Promise) =
    onWorker(promise) {
      try {
        engine.markTaken(LocalDate.parse(date), hour.toInt(), minute.toInt())
      } catch (e: DateTimeParseException) {
        throw AlarmException(NOT_FOUND, "No dose on $date")
      } catch (e: NoSuchElementException) {
        throw AlarmException(NOT_FOUND, "No dose on $date at ${hour.toInt()}:${minute.toInt()}")
      }
      null
    }

  override fun reconcileOnAppOpen(promise: Promise) =
    onWorker(promise) {
      val missed = engine.reconcile(ReconcileTrigger.APP_OPEN)
      try {
        engine.cleanUpPhotos(System.currentTimeMillis())
      } catch (e: Exception) {
        Log.w(LOG_TAG, "Could not clean up unused photos", e)
      }
      Arguments.createArray().apply { missed.forEach { pushMap(missedToJs(it)) } }
    }

  override fun getSettings(promise: Promise) =
    onWorker(promise) {
      val settings = engine.settings()
      val offered = engine.availableLanguages()
      val speaking = LanguageRules.effective(settings.language, Locale.getDefault().language, offered)
      Arguments.createMap().apply {
        putString("language", speaking.code)
        putBoolean("readAloud", settings.readAloud)
        putArray(
          "languages",
          Arguments.createArray().apply {
            offered.forEach {
              pushMap(
                Arguments.createMap().apply {
                  putString("code", it.code)
                  putString("label", it.label)
                  putBoolean("draft", it !in LanguageRules.CHECKED)
                },
              )
            }
          },
        )
      }
    }

  /** Synchronous, for the first screen's words; the same lock-free read the ringing screen uses. */
  override fun currentLanguage(): String =
    try {
      engine.language().code
    } catch (e: Exception) {
      Log.e(LOG_TAG, "Could not read the app language", e)
      AppLanguage.EN.code
    }

  override fun setLanguage(code: String, promise: Promise) =
    onWorker(promise) {
      val lang =
        AppLanguage.fromCode(code)?.takeIf { it in engine.availableLanguages() }
          ?: throw AlarmException(INVALID_LANGUAGE, "The app doesn't offer the language $code")
      engine.updateSettings { it.copy(language = lang) }
      // Renames the notification channels; best effort, the language is saved.
      try {
        Notifications.ensureChannels(reactApplicationContext)
      } catch (e: Exception) {
        Log.w(LOG_TAG, "Could not rename the notification channels", e)
      }
      null
    }

  override fun setReadAloud(on: Boolean, promise: Promise) =
    onWorker(promise) {
      engine.updateSettings { it.copy(readAloud = on) }
      null
    }

  /**
   * Try it: reads today's first card's pills aloud as a ring would (or a sample pill), at alarm
   * volume. Resolves once the voice starts: "spoken", or "english" when the phone has no voice for
   * the app's language; "none" at once when it has no voice at all, or if speech never starts.
   */
  override fun tryReadAloud(promise: Promise) {
    val posted =
      handler.post {
        try {
          val lang = engine.language()
          val voice = tryVoice ?: TtsVoice(reactApplicationContext).also { tryVoice = it }
          val availability = voice.availability(lang)
          if (availability == VoiceAvailability.NONE) {
            promise.resolve(TRY_NONE)
            return@post
          }
          val say = if (availability == VoiceAvailability.FULL) lang else AppLanguage.EN
          val parts = engine.speech(say, samplePills(say))
          val result = if (say == lang) TRY_SPOKEN else TRY_ENGLISH
          val settled = AtomicBoolean(false)
          val settle = { value: String -> if (settled.compareAndSet(false, true)) promise.resolve(value) }
          main.post {
            val queued =
              voice.speak(
                parts,
                object : Voice.Listener {
                  override fun onStarted() = settle(result)

                  override fun onFinished() = settle(TRY_NONE)
                },
              )
            if (!queued) settle(TRY_NONE)
          }
          main.postDelayed({ settle(TRY_NONE) }, TRY_START_TIMEOUT_MS)
        } catch (e: Exception) {
          Log.e(LOG_TAG, "Could not try reading aloud", e)
          promise.reject(e)
        }
      }
    if (!posted) promise.reject(IllegalStateException("The alarm module has shut down"))
  }

  /** Today's first card's pills as they are read aloud in [lang], or "Telma 40, 1 tablet". */
  private fun samplePills(lang: AppLanguage): List<SpokenPill> =
    engine.today().cards.firstOrNull()?.pills.orEmpty()
      .filterNot { it.fromTomorrow }
      .map { SpokenPill(it.name, DoseRules.spokenAmount(it.form, it.amount, lang)) }
      .ifEmpty { listOf(SpokenPill(SAMPLE_PILL, DoseRules.spokenAmount(PillForm.TABLET, 1.0, lang))) }

  override fun pickPhoto(source: String, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      if (pendingPick != null) {
        promise.reject(PHOTO_ERROR, "A photo is already being picked")
        return@runOnUiThread
      }
      val activity = reactApplicationContext.currentActivity
      if (activity == null) {
        promise.reject(NO_ACTIVITY, "There is no screen to pick a photo on")
        return@runOnUiThread
      }
      try {
        val (intent, request) =
          when (source) {
            "camera" -> {
              val output = photos.captureUri()
              Intent(MediaStore.ACTION_IMAGE_CAPTURE)
                .putExtra(MediaStore.EXTRA_OUTPUT, output)
                .apply {
                  clipData = ClipData.newRawUri("", output)
                  addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_READ_URI_PERMISSION)
                } to REQUEST_CAMERA
            }
            "gallery" ->
              PickVisualMedia()
                .createIntent(
                  activity,
                  PickVisualMediaRequest.Builder().setMediaType(PickVisualMedia.ImageOnly).build(),
                ) to REQUEST_GALLERY
            else -> throw IllegalArgumentException("Unknown photo source $source")
          }
        pendingPick = promise
        activity.startActivityForResult(intent, request)
      } catch (e: Exception) {
        Log.e(LOG_TAG, "Could not open the $source for a photo", e)
        pendingPick = null
        promise.reject(PHOTO_ERROR, "Couldn't open the $source")
      }
    }
  }

  override fun getHealth(promise: Promise) =
    onWorker(promise) {
      health.check().let {
        Arguments.createMap().apply {
          putBoolean("notificationsEnabled", it.notificationsEnabled)
          putBoolean("alarmChannelEnabled", it.alarmChannelEnabled)
          putBoolean("exactAlarmAllowed", it.exactAlarmAllowed)
          putBoolean("fullScreenAllowed", it.fullScreenAllowed)
          putBoolean("ignoringBatteryOptimizations", it.ignoringBatteryOptimizations)
          putBoolean("backgroundRestricted", it.backgroundRestricted)
          putBoolean("alarmVolumeLow", it.alarmVolumeLow)
        }
      }
    }

  override fun openSetting(target: String, promise: Promise) =
    onWorker(promise) { settings.open(target) }

  override fun getSetupState(promise: Promise) =
    onWorker(promise) {
      val state = engine.store.locked { engine.store.loadSetup() }
      Arguments.createMap().apply {
        putBoolean("seen", state.seen)
        putArray("doneSteps", Arguments.createArray().apply { state.doneSteps.forEach { pushString(it) } })
      }
    }

  override fun setSetupStepDone(step: String, done: Boolean, promise: Promise) =
    onWorker(promise) {
      updateSetup { it.copy(doneSteps = if (done) it.doneSteps + step else it.doneSteps - step) }
      null
    }

  override fun markSetupSeen(promise: Promise) =
    onWorker(promise) {
      updateSetup { it.copy(seen = true) }
      null
    }

  override fun pickTime(hour: Double, minute: Double, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      val activity = reactApplicationContext.currentActivity
      if (activity == null) {
        promise.reject(NO_ACTIVITY, "There is no screen to show the time picker on")
        return@runOnUiThread
      }
      // The dialog dismisses after OK as well as after cancel; only the first outcome counts.
      var settled = false
      var dialog: TimePickerDialog? = null
      var lifecycle: LifecycleEventListener? = null
      fun settleWith(block: () -> Unit) {
        if (settled) return
        settled = true
        lifecycle?.let { reactApplicationContext.removeLifecycleEventListener(it) }
        block()
      }
      lifecycle =
        object : LifecycleEventListener {
          override fun onHostResume() {}

          override fun onHostPause() {}

          // The screen went away with the dialog open: nobody will answer it.
          override fun onHostDestroy() {
            settleWith { promise.resolve(null) }
            dialog?.dismiss()
          }
        }
      try {
        dialog =
          TimePickerDialog(
              activity,
              { _, h, m ->
                settleWith {
                  promise.resolve(
                    Arguments.createMap().apply {
                      putInt("hour", h)
                      putInt("minute", m)
                    },
                  )
                }
              },
              hour.toInt().coerceIn(0, 23),
              minute.toInt().coerceIn(0, 59),
              DateFormat.is24HourFormat(activity),
            )
            .apply { setOnDismissListener { settleWith { promise.resolve(null) } } }
        reactApplicationContext.addLifecycleEventListener(lifecycle)
        dialog?.show()
      } catch (e: Exception) {
        Log.e(LOG_TAG, "Could not show the time picker", e)
        settleWith { promise.reject(e) }
      }
    }
  }

  override fun is24HourFormat(): Boolean = DateFormat.is24HourFormat(reactApplicationContext)

  override fun invalidate() {
    reactApplicationContext.removeActivityEventListener(photoListener)
    // After any try still queued on the worker, so its voice is shut down too.
    handler.post {
      val voice = tryVoice
      tryVoice = null
      main.post { voice?.shutdown() }
    }
    thread.quitSafely() // After the work already queued.
    super.invalidate()
  }

  private fun updateSetup(change: (SetupState) -> SetupState) {
    val store = engine.store
    store.locked { store.saveSetup(change(store.loadSetup())) }
  }

  /**
   * Runs [block] on the worker thread and settles [promise] exactly once: with its result, with an
   * [AlarmException]'s code, with [STORAGE_ERROR] when the store couldn't be read or written, or
   * with any other exception.
   */
  private fun onWorker(promise: Promise, block: () -> Any?) {
    val posted =
      handler.post {
        val result =
          try {
            block()
          } catch (e: AlarmException) {
            promise.reject(e.code, e.message)
            return@post
          } catch (e: StorageException) {
            Log.e(LOG_TAG, "Alarm call failed on storage", e)
            promise.reject(STORAGE_ERROR, e.message, e)
            return@post
          } catch (e: Exception) {
            Log.e(LOG_TAG, "Alarm call failed", e)
            promise.reject(e)
            return@post
          }
        promise.resolve(result)
      }
    if (!posted) promise.reject(IllegalStateException("The alarm module has shut down"))
  }

  private fun missedToJs(missed: MissedAlarm): WritableMap =
    Arguments.createMap().apply {
      putString("id", missed.id)
      putString("name", missed.name)
      putDouble("dueAt", missed.dueAt.toDouble())
    }

  companion object {
    const val NAME = "NativeAlarms"
    private const val NO_ACTIVITY = "NO_ACTIVITY"
    private const val NOT_FOUND = "NOT_FOUND"
    private const val STORAGE_ERROR = "STORAGE_ERROR"
    private const val PHOTO_ERROR = "PHOTO_ERROR"
    private const val INVALID_LANGUAGE = "INVALID_LANGUAGE"
    private const val TRY_SPOKEN = "spoken"
    private const val TRY_ENGLISH = "english"
    private const val TRY_NONE = "none"
    private const val TRY_START_TIMEOUT_MS = 8_000L
    private const val SAMPLE_PILL = "Telma 40"
    private const val REQUEST_CAMERA = 4_801
    private const val REQUEST_GALLERY = 4_802
  }
}
