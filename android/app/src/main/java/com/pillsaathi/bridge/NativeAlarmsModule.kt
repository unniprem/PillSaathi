package com.pillsaathi.bridge

import android.app.TimePickerDialog
import android.os.Handler
import android.os.HandlerThread
import android.text.format.DateFormat
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableMap
import com.pillsaathi.alarm.Alarm
import com.pillsaathi.alarm.AlarmEngine
import com.pillsaathi.alarm.LOG_TAG
import com.pillsaathi.alarm.MissedAlarm
import com.pillsaathi.alarm.ReconcileTrigger
import com.pillsaathi.alarm.SetupState
import com.pillsaathi.specs.NativeAlarmsSpec

/** A call the module refuses, with the code JS sees in `error.code`. */
class AlarmException(val code: String, message: String) : Exception(message)

/**
 * Alarms, health checks, settings links, first-run setup and the time picker for JS.
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

  override fun getName() = NAME

  override fun listAlarms(promise: Promise) =
    onWorker(promise) {
      Arguments.createArray().apply {
        engine.alarms().sortedWith(compareBy({ it.hour }, { it.minute })).forEach {
          pushMap(alarmToJs(it))
        }
      }
    }

  override fun saveAlarm(input: ReadableMap, promise: Promise) =
    onWorker(promise) {
      val id = if (input.hasKey("id") && !input.isNull("id")) input.getString("id") else null
      val hour = intField(input, "hour", 0..23)
      val minute = intField(input, "minute", 0..59)
      val days = daysField(input)
      val name = if (input.hasKey("name") && !input.isNull("name")) input.getString("name") else ""
      val soundId =
        if (input.hasKey("soundId") && !input.isNull("soundId")) input.getString("soundId") else null
      alarmToJs(engine.save(id, hour, minute, days, name.orEmpty(), soundId))
    }

  override fun setAlarmEnabled(id: String, enabled: Boolean, promise: Promise) =
    onWorker(promise) {
      try {
        alarmToJs(engine.setEnabled(id, enabled))
      } catch (e: NoSuchElementException) {
        throw AlarmException(NOT_FOUND, "No alarm $id")
      }
    }

  override fun deleteAlarm(id: String, promise: Promise) =
    onWorker(promise) {
      engine.delete(id)
      null
    }

  override fun reconcileOnAppOpen(promise: Promise) =
    onWorker(promise) {
      Arguments.createArray().apply {
        engine.reconcile(ReconcileTrigger.APP_OPEN).forEach { pushMap(missedToJs(it)) }
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
      try {
        TimePickerDialog(
            activity,
            { _, h, m ->
              if (!settled) {
                settled = true
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
          .apply {
            setOnDismissListener {
              if (!settled) {
                settled = true
                promise.resolve(null)
              }
            }
          }
          .show()
      } catch (e: Exception) {
        Log.e(LOG_TAG, "Could not show the time picker", e)
        if (!settled) {
          settled = true
          promise.reject(e)
        }
      }
    }
  }

  override fun is24HourFormat(): Boolean = DateFormat.is24HourFormat(reactApplicationContext)

  override fun invalidate() {
    thread.quitSafely() // After the work already queued.
    super.invalidate()
  }

  private fun updateSetup(change: (SetupState) -> SetupState) {
    val store = engine.store
    store.locked { store.saveSetup(change(store.loadSetup())) }
  }

  /** Reads a whole number in [range] or throws INVALID_ALARM. */
  private fun intField(input: ReadableMap, key: String, range: IntRange): Int {
    val value = if (input.hasKey(key) && !input.isNull(key)) input.getDouble(key) else Double.NaN
    if (value != Math.floor(value) || value.isInfinite() || value.toInt() !in range) {
      throw AlarmException(INVALID_ALARM, "$key must be a whole number in $range")
    }
    return value.toInt()
  }

  /** Days must be whole numbers in 1..7 with no repeats; duplicates are rejected, not merged. */
  private fun daysField(input: ReadableMap): Set<Int> {
    val array = input.getArray("days") ?: throw AlarmException(INVALID_ALARM, "days is missing")
    val days = LinkedHashSet<Int>()
    for (i in 0 until array.size()) {
      val value = array.getDouble(i)
      if (value != Math.floor(value) || value.isInfinite() || value.toInt() !in 1..7) {
        throw AlarmException(INVALID_ALARM, "days must be whole numbers from 1 to 7")
      }
      if (!days.add(value.toInt())) {
        throw AlarmException(INVALID_ALARM, "days must not repeat")
      }
    }
    return days
  }

  /**
   * Runs [block] on the worker thread and settles [promise] exactly once: with its result, with an
   * [AlarmException]'s code, or with any other exception.
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
          } catch (e: Exception) {
            Log.e(LOG_TAG, "Alarm call failed", e)
            promise.reject(e)
            return@post
          }
        promise.resolve(result)
      }
    if (!posted) promise.reject(IllegalStateException("The alarm module has shut down"))
  }

  private fun alarmToJs(alarm: Alarm): WritableMap =
    Arguments.createMap().apply {
      putString("id", alarm.id)
      putInt("hour", alarm.hour)
      putInt("minute", alarm.minute)
      putArray(
        "days",
        Arguments.createArray().apply { alarm.days.sorted().forEach { pushInt(it) } },
      )
      putString("name", alarm.name)
      putString("soundId", alarm.soundId)
      putBoolean("enabled", alarm.enabled)
      alarm.nextTriggerAt?.let { putDouble("nextTriggerAt", it.toDouble()) } ?: putNull("nextTriggerAt")
      alarm.snoozeUntil?.let { putDouble("snoozeUntil", it.toDouble()) } ?: putNull("snoozeUntil")
    }

  private fun missedToJs(missed: MissedAlarm): WritableMap =
    Arguments.createMap().apply {
      putString("id", missed.id)
      putString("name", missed.name)
      putDouble("dueAt", missed.dueAt.toDouble())
    }

  companion object {
    const val NAME = "NativeAlarms"
    private const val INVALID_ALARM = "INVALID_ALARM"
    private const val NO_ACTIVITY = "NO_ACTIVITY"
    private const val NOT_FOUND = "NOT_FOUND"
  }
}
