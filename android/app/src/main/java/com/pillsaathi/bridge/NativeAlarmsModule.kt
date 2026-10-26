package com.pillsaathi.bridge

import android.app.Activity
import android.app.TimePickerDialog
import android.content.ClipData
import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.HandlerThread
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
import com.pillsaathi.alarm.LOG_TAG
import com.pillsaathi.alarm.MissedAlarm
import com.pillsaathi.alarm.Pill
import com.pillsaathi.alarm.ReconcileTrigger
import com.pillsaathi.alarm.SetupState
import com.pillsaathi.alarm.StorageException
import com.pillsaathi.alarm.TodayCard
import com.pillsaathi.alarm.TodayPill
import com.pillsaathi.photo.PillPhotos
import com.pillsaathi.specs.NativeAlarmsSpec
import java.time.LocalDate
import java.time.format.DateTimeParseException

/**
 * Pills and their photos, today's doses, card sounds, health checks, settings links, first-run
 * setup and the time picker for JS.
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
        engine.pills().sortedBy { it.createdAt }.forEach { pushMap(pillToJs(it)) }
      }
    }

  override fun savePill(input: ReadableMap, promise: Promise) =
    onWorker(promise) {
      // Read as plain values so a wrong type is INVALID_PILL, not a cast error.
      val draft = PillInputValidator.validate(input.toHashMap())
      try {
        pillToJs(engine.savePill(draft))
      } catch (e: NoSuchElementException) {
        throw AlarmException(NOT_FOUND, "No pill ${draft.id}")
      }
    }

  override fun deletePill(id: String, promise: Promise) =
    onWorker(promise) {
      engine.deletePill(id)
      null
    }

  override fun getToday(promise: Promise) =
    onWorker(promise) {
      val today = engine.today()
      Arguments.createMap().apply {
        putString("date", today.date.toString())
        putArray("cards", Arguments.createArray().apply { today.cards.forEach { pushMap(cardToJs(it)) } })
      }
    }

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

  private fun pillToJs(pill: Pill): WritableMap =
    Arguments.createMap().apply {
      putString("id", pill.id)
      putString("name", pill.name)
      putString("form", pill.form.json)
      putDouble("amount", pill.amount)
      putArray(
        "times",
        Arguments.createArray().apply {
          pill.times.forEach {
            pushMap(
              Arguments.createMap().apply {
                putInt("hour", it.hour)
                putInt("minute", it.minute)
              },
            )
          }
        },
      )
      putString("startDate", pill.startDate.toString())
      pill.days?.let { putInt("days", it) } ?: putNull("days")
      putString("photo", pill.photo)
      putString("photoUri", pill.photo?.let(photos::fileUri))
    }

  private fun cardToJs(card: TodayCard): WritableMap =
    Arguments.createMap().apply {
      putString("alarmId", card.alarmId)
      putInt("hour", card.hour)
      putInt("minute", card.minute)
      putString("soundId", card.soundId)
      putString("status", card.status.json)
      card.statusAt?.let { putDouble("statusAt", it.toDouble()) } ?: putNull("statusAt")
      putArray("pills", Arguments.createArray().apply { card.pills.forEach { pushMap(todayPillToJs(it)) } })
    }

  private fun todayPillToJs(pill: TodayPill): WritableMap =
    Arguments.createMap().apply {
      putString("pillId", pill.pillId)
      putString("name", pill.name)
      putString("form", pill.form.json)
      putDouble("amount", pill.amount)
      putString("startDate", pill.startDate?.toString())
      pill.days?.let { putInt("days", it) } ?: putNull("days")
      putBoolean("exists", pill.exists)
      putBoolean("fromTomorrow", pill.fromTomorrow)
      putString("photoUri", pill.photo?.let(photos::fileUri))
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
    private const val REQUEST_CAMERA = 4_801
    private const val REQUEST_GALLERY = 4_802
  }
}
