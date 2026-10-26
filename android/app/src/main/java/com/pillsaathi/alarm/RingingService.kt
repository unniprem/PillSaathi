package com.pillsaathi.alarm

import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.SystemClock
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
 *
 * The ringing marker in the store tells other processes what this one owns: the current ring and
 * the queue. It is rewritten before each ring starts and whenever the queue changes, so reconcile
 * never takes a waiting alarm for a stuck or missed one.
 */
class RingingService : Service() {

  companion object {
    const val ACTION_RING = "com.pillsaathi.RING"
    const val ACTION_TAKEN = "com.pillsaathi.TAKEN"
    const val ACTION_SKIP = "com.pillsaathi.SKIP"
    const val ACTION_SNOOZE = "com.pillsaathi.SNOOZE"
    const val EXTRA_ALARM_ID = "alarmId"
    private const val EXTRA_DUE_AT = "dueAt"
    private const val ACTION_DISMISS = "com.pillsaathi.DISMISS"

    /** Rings [alarmId], or queues it behind the current ring. [dueAt] is when it was due. */
    fun ring(context: Context, alarmId: String, dueAt: Long?) {
      val intent = intent(context, ACTION_RING).putExtra(EXTRA_ALARM_ID, alarmId)
      dueAt?.let { intent.putExtra(EXTRA_DUE_AT, it) }
      ContextCompat.startForegroundService(context, intent)
    }

    /**
     * Ends [alarmId]'s ring and records its dose taken; ignored once another ring has taken its
     * place. With no id it acts on whatever rings (debug). Call only from the `:ringing` process
     * (ringing screen, debug).
     */
    fun taken(context: Context, alarmId: String? = null) =
      command(context, commandIntent(context, ACTION_TAKEN, alarmId))

    /** Ends [alarmId]'s ring and records its dose skipped, like [taken]. */
    fun skip(context: Context, alarmId: String? = null) =
      command(context, commandIntent(context, ACTION_SKIP, alarmId))

    /** Snoozes [alarmId]'s ring, like [taken]. Call only from the `:ringing` process. */
    fun snooze(context: Context, alarmId: String? = null) =
      command(context, commandIntent(context, ACTION_SNOOZE, alarmId))

    /**
     * A Taken, Skip or Snooze meant for [alarmId]'s ring. Its data gives each alarm's notification
     * action its own PendingIntent, so one alarm's action never carries another's id.
     */
    fun commandIntent(context: Context, action: String, alarmId: String?): Intent {
      val intent = intent(context, action)
      if (alarmId != null) {
        val verb =
          when (action) {
            ACTION_TAKEN -> "taken"
            ACTION_SKIP -> "skip"
            else -> "snooze"
          }
        intent
          .setData(Uri.parse("pillsaathi://ring/${Uri.encode(alarmId)}/$verb"))
          .putExtra(EXTRA_ALARM_ID, alarmId)
      }
      return intent
    }

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
   * Alarms this service has taken on (ringing or queued) whose ring hasn't been recorded as ended,
   * each with the time it was due. If the service fails or is destroyed with any left, their doses
   * are recorded as missed, so the next occurrence is still scheduled.
   */
  private val owed = LinkedHashMap<String, Long?>()
  private val autoSilence = Runnable {
    guarded("auto-silence", null) {
      endCurrent { id, dueAt -> engine.onRingEnded(id, DoseOutcome.MISSED, dueAt) }
    }
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
        ACTION_RING -> onRing(alarmId, intent?.dueAt())
        ACTION_TAKEN ->
          onCommand(action, alarmId) { id, dueAt -> engine.onRingEnded(id, DoseOutcome.TAKEN, dueAt) }
        ACTION_SKIP ->
          onCommand(action, alarmId) { id, dueAt -> engine.onRingEnded(id, DoseOutcome.SKIPPED, dueAt) }
        ACTION_SNOOZE -> onCommand(action, alarmId) { id, _ -> engine.onSnoozed(id) }
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
    // Marker first, so the main process never sees it after the ringing screen has closed.
    saveMarker(null)
    RingingState.update(null)
    RingWakeLock.release("ringing service destroyed")
    super.onDestroy()
  }

  private fun onRing(alarmId: String?, dueAt: Long?) {
    // Every startForegroundService call needs its own startForeground, and it comes before any
    // store access, which can wait for the lock. The notification is updated once the ring is
    // known.
    val current = RingingState.current
    goForeground(current ?: placeholderRing(alarmId))
    alarmId?.let { if (it !in owed) owed[it] = dueAt }
    if (current != null) {
      if (alarmId != null && alarmId != current.alarmId && alarmId !in queue) {
        queue.addLast(alarmId)
        Log.i(LOG_TAG, "Queued $alarmId behind ${current.alarmId}")
        saveMarker(markerFor(current))
      } else {
        Log.i(LOG_TAG, "Ignoring a repeat fire of $alarmId; it is ringing or queued")
      }
      // The current ring's player keeps the phone awake from here.
      RingWakeLock.release("fire of $alarmId taken by the running ring")
      return
    }
    if (alarmId != null && startRingFor(alarmId, fromQueue = false)) return
    finish()
  }

  /** Taken, Skip or Snooze: ends the current ring only if meant for it ([RingCommands]). */
  private fun onCommand(action: String, alarmId: String?, record: (String, Long?) -> Unit) {
    val current = RingingState.current
    when (val verdict = RingCommands.judge(alarmId, current, SystemClock.elapsedRealtime())) {
      RingCommands.Verdict.ACT -> {
        Log.i(LOG_TAG, "$action for ${current?.alarmId}")
        endCurrent(record)
      }
      RingCommands.Verdict.NOTHING_RINGING -> finish()
      RingCommands.Verdict.OTHER_RING,
      RingCommands.Verdict.TOO_SOON ->
        Log.w(LOG_TAG, "Ignoring $action for $alarmId ($verdict); ringing ${current?.alarmId}")
    }
  }

  private fun onDismiss(alarmId: String?) {
    alarmId?.let { owed.remove(it) }
    val current = RingingState.current
    if (alarmId != null && current?.alarmId == alarmId) {
      advancing()
      silence()
      ringNextOrFinish()
    } else {
      if (alarmId != null && queue.remove(alarmId) && current != null) {
        saveMarker(markerFor(current))
      }
      // Sent with startService, so a service started only for this needs no startForeground.
      if (!ringing) finish()
    }
  }

  /** Silences the current ring, records how it ended, then moves on to the queue. */
  private fun endCurrent(record: (String, Long?) -> Unit) {
    val ring = RingingState.current
    if (ring == null) {
      finish()
      return
    }
    advancing()
    silence()
    val dueAt = owed.remove(ring.alarmId)
    try {
      record(ring.alarmId, dueAt)
    } catch (e: Exception) {
      Log.e(LOG_TAG, "Could not record the end of ${ring.alarmId}'s ring", e)
    }
    ringNextOrFinish()
  }

  /** About to silence one ring for the next: keep the phone awake until the next one plays. */
  private fun advancing() {
    if (queue.isNotEmpty()) RingWakeLock.acquire(this)
  }

  private fun ringNextOrFinish() {
    while (queue.isNotEmpty()) {
      if (startRingFor(queue.removeFirst(), fromQueue = true)) return
    }
    finish()
  }

  /**
   * Starts ringing [alarmId]. A fresh fire rings only if the alarm is still on, since the user may
   * have switched it off since. One that waited in the queue rings as long as it still exists: a
   * user's switch-off or delete removes it from the queue first (DISMISS), so if it is off now, a
   * reconcile turned it off while it waited.
   */
  private fun startRingFor(alarmId: String, fromQueue: Boolean): Boolean {
    val startedAt = System.currentTimeMillis()
    val marker = RingingMarker(alarmId, startedAt, queue.toList())
    // One store lock for everything, so a stuck lock delays the ring once, not several times.
    val found =
      engine.store.locked {
        val alarm =
          if (fromQueue) {
            // The marker first, so the queued alarm stays owned while it is stamped as fired.
            saveMarker(marker)
            engine.onQueuedRingStarted(alarmId)
          } else {
            engine.alarms().firstOrNull { it.id == alarmId && it.enabled }?.also {
              saveMarker(marker)
            }
          }
        alarm?.let { FoundRing(it, engine.soundNameFor(it), engine.soundFileFor(it), engine.ringPills(it)) }
      }
    if (found == null) {
      Log.i(LOG_TAG, "Not ringing $alarmId: it is gone or off")
      owed.remove(alarmId)
      return false
    }
    startRing(found, startedAt, fromQueue)
    return true
  }

  /** What a ring needs from the store, read under one lock. */
  private class FoundRing(
    val alarm: Alarm,
    val soundName: String,
    val sound: File?,
    val pills: List<RingPill>,
  )

  private fun startRing(found: FoundRing, startedAt: Long, followsAnother: Boolean) {
    val alarm = found.alarm
    ringing = true
    // Arm auto-silence before anything that touches audio, so a ring can never run forever.
    handler.removeCallbacks(autoSilence)
    handler.postDelayed(autoSilence, DebugHooks.autoSilenceMsOverride ?: AlarmRules.AUTO_SILENCE_MS)
    try {
      vibrator.start()
      player.start(found.sound)
    } finally {
      // Published once it sounds (all on this thread, so the screen couldn't redraw sooner): the
      // Taken, Skip and Snooze guard of a ring that replaced another counts from here.
      val ring =
        RingingState.Ring(
          alarm.id,
          alarm.name,
          found.soundName,
          startedAt,
          SystemClock.elapsedRealtime(),
          followsAnother,
          found.pills,
        )
      RingingState.update(ring)
      goForeground(ring)
      // The player holds its own wake lock while it plays.
      RingWakeLock.release("ring of ${ring.alarmId} started")
    }
    Log.i(LOG_TAG, "Ringing ${alarm.id} (${alarm.name}), ${queue.size} queued")
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
    saveMarker(null)
    RingingState.update(null)
    ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
    RingWakeLock.release("nothing left to ring")
    // Only stops if no newer command has arrived, so a ring that is on its way isn't lost.
    stopSelfResult(lastStartId)
  }

  /** Records every ring still owed as a missed dose, which also schedules what's next. */
  private fun abandonOwed() {
    val rings = owed.toList()
    owed.clear()
    rings.forEach { (id, dueAt) ->
      Log.w(LOG_TAG, "Ring of $id ended abnormally; recording it as missed")
      try {
        engine.onRingEnded(id, DoseOutcome.MISSED, dueAt)
      } catch (e: Exception) {
        Log.e(LOG_TAG, "Could not record $id as missed", e)
      }
    }
  }

  /** The marker for [current] ringing with the queue as it is now. */
  private fun markerFor(current: RingingState.Ring) =
    RingingMarker(current.alarmId, current.startedAt, queue.toList())

  /**
   * Tells other processes what this one owns: the current ring and the queue (null: nothing).
   * Never fails the ring.
   */
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
      defaultToneName(),
      System.currentTimeMillis(),
    )

  /** The default tone's name in the app's language, or the phone's if that fails. */
  private fun defaultToneName(): String =
    try {
      engine.defaultToneName()
    } catch (e: Exception) {
      Log.w(LOG_TAG, "Could not name the default tone in the app's language", e)
      getString(R.string.default_alarm_tone)
    }

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
      // Whatever rings now has its player's wake lock; nothing else is on its way.
      RingWakeLock.release("$action failed")
    }
  }

  private fun Intent.dueAt(): Long? =
    if (hasExtra(EXTRA_DUE_AT)) getLongExtra(EXTRA_DUE_AT, 0L) else null
}
