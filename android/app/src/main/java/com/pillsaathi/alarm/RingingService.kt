package com.pillsaathi.alarm

import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import com.pillsaathi.R
import java.io.File

/**
 * Foreground service that rings one alarm at a time: sound, vibration and the ongoing
 * notification. Alarms that fire meanwhile wait in a queue. Everything runs on the main thread
 * and nothing here depends on React Native. It runs in the `:ringing` process, so a crash in the
 * React Native process can't silence a ring; [RingingState] therefore only has meaning there.
 */
class RingingService : Service() {

  companion object {
    const val ACTION_RING = "com.pillsaathi.RING"
    const val ACTION_STOP = "com.pillsaathi.STOP"
    const val ACTION_SNOOZE = "com.pillsaathi.SNOOZE"
    const val EXTRA_ALARM_ID = "alarmId"
    private const val ACTION_DISMISS = "com.pillsaathi.DISMISS"

    fun ring(context: Context, alarmId: String) {
      ContextCompat.startForegroundService(
        context,
        intent(context, ACTION_RING).putExtra(EXTRA_ALARM_ID, alarmId),
      )
    }

    /** Stops the current ring. Call only from the `:ringing` process (ringing screen, debug). */
    fun stop(context: Context) = command(context, intent(context, ACTION_STOP))

    /** Snoozes the current ring. Call only from the `:ringing` process (ringing screen, debug). */
    fun snooze(context: Context) = command(context, intent(context, ACTION_SNOOZE))

    /**
     * Ends [alarmId]'s ring without recording it, or drops it from the queue. Callable from any
     * process: it can't tell from here whether `:ringing` is ringing, so it always sends the
     * request, and a service with nothing to dismiss just stops again.
     */
    fun stopIfRinging(context: Context, alarmId: String) {
      try {
        context.startService(intent(context, ACTION_DISMISS).putExtra(EXTRA_ALARM_ID, alarmId))
      } catch (e: Exception) {
        Log.w(LOG_TAG, "Could not send the dismiss of $alarmId to RingingService", e)
      }
    }

    private fun intent(context: Context, action: String): Intent =
      Intent(context, RingingService::class.java).setAction(action)

    /**
     * Sends a command to the running service, judged by this process's [RingingState]. Never
     * starts it just to have nothing to do.
     */
    private fun command(context: Context, intent: Intent) {
      if (RingingState.current == null) return
      try {
        context.startService(intent)
      } catch (e: Exception) {
        Log.w(LOG_TAG, "Could not send ${intent.action} to RingingService", e)
      }
    }
  }

  private val handler = Handler(Looper.getMainLooper())
  private val queue = ArrayDeque<String>()

  /**
   * Alarms this service has taken on (ringing or queued) whose ring hasn't been recorded as ended.
   * If the service fails or is destroyed with any left, they are recorded as missed, so the next
   * occurrence is still scheduled.
   */
  private val owed = LinkedHashSet<String>()
  private val autoSilence = Runnable {
    guarded("auto-silence", null) { endCurrent { engine.onRingEnded(it, true) } }
  }
  private lateinit var engine: AlarmEngine
  private lateinit var player: AlarmPlayer
  private lateinit var vibrator: AlarmVibrator
  private var ringing = false
  private var lastStartId = 0

  override fun onCreate() {
    super.onCreate()
    engine = AlarmEngine.get(this)
    player = AlarmPlayer(this)
    vibrator = AlarmVibrator(this)
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    lastStartId = startId
    val action = intent?.action
    val alarmId = intent?.getStringExtra(EXTRA_ALARM_ID)
    guarded(action, alarmId) {
      when (action) {
        ACTION_RING -> onRing(alarmId)
        ACTION_STOP -> endCurrent { engine.onRingEnded(it, false) }
        ACTION_SNOOZE -> endCurrent { engine.onSnoozed(it) }
        ACTION_DISMISS -> onDismiss(alarmId)
        else -> if (!ringing) finish()
      }
    }
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    handler.removeCallbacks(autoSilence)
    silence()
    abandonOwed()
    RingingState.update(null)
    saveMarker(null)
    super.onDestroy()
  }

  private fun onRing(alarmId: String?) {
    alarmId?.let { owed.add(it) }
    val current = RingingState.current
    if (current != null) {
      // Every startForegroundService call needs its own startForeground.
      goForeground(current)
      if (alarmId != null && alarmId != current.alarmId && alarmId !in queue) {
        queue.addLast(alarmId)
        Log.i(LOG_TAG, "Queued $alarmId behind ${current.alarmId}")
      }
      return
    }
    if (alarmId != null && startRingFor(alarmId)) return
    goForeground(placeholderRing(alarmId))
    finish()
  }

  private fun onDismiss(alarmId: String?) {
    alarmId?.let { owed.remove(it) }
    if (alarmId != null && RingingState.current?.alarmId == alarmId) {
      silence()
      ringNextOrFinish()
    } else {
      alarmId?.let { queue.remove(it) }
      // Sent with startService, so a service started only for this needs no startForeground.
      if (!ringing) finish()
    }
  }

  /** Silences the current ring, records how it ended, then moves on to the queue. */
  private fun endCurrent(record: (String) -> Unit) {
    val ring = RingingState.current
    if (ring == null) {
      finish()
      return
    }
    silence()
    owed.remove(ring.alarmId)
    try {
      record(ring.alarmId)
    } catch (e: Exception) {
      Log.e(LOG_TAG, "Could not record the end of ${ring.alarmId}'s ring", e)
    }
    ringNextOrFinish()
  }

  private fun ringNextOrFinish() {
    while (queue.isNotEmpty()) {
      if (startRingFor(queue.removeFirst())) return
    }
    finish()
  }

  /** Starts ringing [alarmId] if it still exists and is on. */
  private fun startRingFor(alarmId: String): Boolean {
    val alarm = engine.alarms().firstOrNull { it.id == alarmId && it.enabled }
    if (alarm == null) {
      Log.i(LOG_TAG, "Not ringing $alarmId: it is gone or off")
      owed.remove(alarmId)
      return false
    }
    val ring =
      RingingState.Ring(alarm.id, alarm.name, engine.soundNameFor(alarm), System.currentTimeMillis())
    startRing(ring, engine.soundFileFor(alarm))
    return true
  }

  private fun startRing(ring: RingingState.Ring, sound: File?) {
    ringing = true
    RingingState.update(ring)
    goForeground(ring)
    // Arm auto-silence before anything that touches audio, so a ring can never run forever.
    handler.removeCallbacks(autoSilence)
    handler.postDelayed(autoSilence, DebugHooks.autoSilenceMsOverride ?: AlarmRules.AUTO_SILENCE_MS)
    vibrator.start()
    player.start(sound)
    saveMarker(RingingMarker(ring.alarmId, ring.startedAt))
    Log.i(LOG_TAG, "Ringing ${ring.alarmId} (${ring.name}), ${queue.size} queued")
  }

  private fun silence() {
    ringing = false
    handler.removeCallbacks(autoSilence)
    player.stop()
    vibrator.stop()
  }

  private fun finish() {
    silence()
    queue.clear()
    RingingState.update(null)
    saveMarker(null)
    ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
    // Only stops if no newer command has arrived, so a ring that is on its way isn't lost.
    stopSelfResult(lastStartId)
  }

  /** Records every ring still owed as missed (auto-silenced), which also schedules what's next. */
  private fun abandonOwed() {
    val ids = owed.toList()
    owed.clear()
    ids.forEach { id ->
      Log.w(LOG_TAG, "Ring of $id ended abnormally; recording it as missed")
      try {
        engine.onRingEnded(id, autoSilenced = true)
      } catch (e: Exception) {
        Log.e(LOG_TAG, "Could not record $id as missed", e)
      }
    }
  }

  /** Tells the main process what is ringing (null: nothing). Never fails the ring. */
  private fun saveMarker(marker: RingingMarker?) {
    try {
      engine.store.saveRingingMarker(marker)
    } catch (e: Exception) {
      Log.e(LOG_TAG, "Could not save the ringing marker ($marker)", e)
    }
  }

  private fun goForeground(ring: RingingState.Ring) {
    try {
      val type =
        if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_SYSTEM_EXEMPTED else 0
      ServiceCompat.startForeground(
        this,
        Notifications.RINGING_ID,
        Notifications.ringing(this, ring),
        type,
      )
    } catch (e: Exception) {
      Log.e(LOG_TAG, "startForeground failed for ${ring.alarmId}", e)
    }
  }

  private fun placeholderRing(alarmId: String?) =
    RingingState.Ring(
      alarmId.orEmpty(),
      AlarmEngine.DEFAULT_NAME,
      getString(R.string.default_alarm_tone),
      System.currentTimeMillis(),
    )

  /** Nothing on the ringing path may crash the process; on failure, end cleanly if silent. */
  private fun guarded(action: String?, alarmId: String?, block: () -> Unit) {
    try {
      block()
    } catch (e: Exception) {
      Log.e(LOG_TAG, "RingingService failed handling $action", e)
      if (!ringing) {
        if (action == ACTION_RING) goForeground(placeholderRing(alarmId))
        abandonOwed()
        finish()
      }
    }
  }
}
