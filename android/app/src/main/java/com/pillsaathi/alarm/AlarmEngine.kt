package com.pillsaathi.alarm

import android.content.Context
import android.util.Log
import com.pillsaathi.R
import java.io.File
import java.time.ZoneId
import java.util.UUID

internal const val LOG_TAG = "PillSaathiAlarm"

enum class ReconcileTrigger { BOOT, CLOCK_CHANGED, APP_OPEN, PERMISSION_CHANGED, RECOVERY }

/**
 * The one entry point for changing alarms. Receivers, the ringing service and the React Native
 * modules all go through it, so every change is persisted and rescheduled under the store lock.
 *
 * Two kinds of caller, two rules for a failed write ([StorageException]):
 * - A user's change ([save], [setEnabled], [delete], [clearSound]) is written first and scheduled
 *   only after, and a failed write is thrown, so the app never reports a change it didn't keep.
 * - The ringing path ([onFired], [onQueuedRingStarted], [onRingEnded], [onSnoozed], [reconcile])
 *   logs a failed write and schedules and rings anyway. Ringing comes first; the next reconcile
 *   repairs the lost bookkeeping.
 */
class AlarmEngine private constructor(context: Context) {
  private val context: Context = context.applicationContext
  val store = AlarmStore(this.context)
  private val scheduler = AlarmScheduler(this.context)

  fun alarms(): List<Alarm> = store.locked { store.loadAlarms() }

  fun save(
    id: String?,
    hour: Int,
    minute: Int,
    days: Set<Int>,
    name: String,
    soundId: String?,
  ): Alarm = store.locked {
    val now = System.currentTimeMillis()
    val alarms = store.loadAlarms()
    val existing = id?.let { wanted -> alarms.firstOrNull { it.id == wanted } }
    val cleanName = name.trim().ifEmpty { DEFAULT_NAME }
    val base =
      existing?.copy(hour = hour, minute = minute, days = days, name = cleanName, soundId = soundId)
        ?: Alarm(
          id = UUID.randomUUID().toString(),
          hour = hour,
          minute = minute,
          days = days,
          name = cleanName,
          soundId = soundId,
          enabled = true,
          nextTriggerAt = null,
          snoozeUntil = null,
          lastFiredAt = null,
          createdAt = now,
        )
    val armed = AlarmRules.armed(base, now, zone())
    store.saveAlarms(if (existing == null) alarms + armed else alarms.replace(armed))
    scheduler.sync(armed)
    armed
  }

  fun setEnabled(id: String, enabled: Boolean): Alarm {
    val updated = store.locked {
      val alarms = store.loadAlarms()
      val alarm = alarms.firstOrNull { it.id == id } ?: throw NoSuchElementException("No alarm $id")
      val next =
        if (enabled) AlarmRules.armed(alarm, System.currentTimeMillis(), zone())
        else AlarmRules.disarmed(alarm)
      store.saveAlarms(alarms.replace(next))
      scheduler.sync(next)
      if (!enabled) scheduler.cancelRecovery(id)
      next
    }
    if (!enabled) RingingService.stopIfRinging(context, id)
    return updated
  }

  fun delete(id: String) {
    store.locked {
      store.saveAlarms(store.loadAlarms().filterNot { it.id == id })
      scheduler.cancel(id)
      scheduler.cancelRecovery(id)
    }
    RingingService.stopIfRinging(context, id)
  }

  /**
   * Repairs the schedule ([AlarmRules.reconcile]) and reschedules every alarm. Alarms that the
   * `:ringing` process is ringing or has queued, as its fresh marker says, are left alone: their
   * time has passed, but they are not missed.
   */
  fun reconcile(trigger: ReconcileTrigger): List<MissedAlarm> {
    val missed = store.locked {
      val now = System.currentTimeMillis()
      val owned = AlarmRules.ownedIds(ringingMarker(), now)
      val result = AlarmRules.reconcile(store.loadAlarms(), now, zone(), owned)
      Log.i(
        LOG_TAG,
        "Reconcile ($trigger): ${owned.size} ringing or queued, ${result.missed.size} missed",
      )
      bestEffort("the reconciled alarms") { store.saveAlarms(result.alarms) }
      result.alarms.forEach { scheduler.sync(it) }
      result.missed
    }
    if (trigger != ReconcileTrigger.APP_OPEN) missed.forEach { Notifications.postMissed(context, it) }
    return missed
  }

  /**
   * Handles an AlarmManager delivery for [id]. Returns the alarm to ring, or null when it must not
   * ring: it is gone, the delivery is stale ([FireDecision.STALE]), or it came too late and is
   * reported as missed instead ([FireDecision.MISSED]).
   */
  fun onFired(id: String): Alarm? {
    val (ring, missed) = store.locked<Pair<Alarm?, MissedAlarm?>> {
      val alarms = store.loadAlarms()
      val alarm = alarms.firstOrNull { it.id == id }
      if (alarm == null) {
        Log.i(LOG_TAG, "Fire $id: alarm is gone")
        return@locked null to null
      }
      val now = System.currentTimeMillis()
      val decision = AlarmRules.fireDecision(alarm, now)
      Log.i(LOG_TAG, "Fire $id: $decision")
      when (decision) {
        FireDecision.STALE -> {
          scheduler.sync(alarm)
          null to null
        }
        FireDecision.MISSED -> {
          val ended = AlarmRules.ringEnded(alarm, now, zone())
          bestEffort("the missed fire of $id") { store.saveAlarms(alarms.replace(ended)) }
          scheduler.sync(ended)
          null to AlarmRules.dueAt(alarm)?.let { MissedAlarm(alarm.id, alarm.name, it) }
        }
        FireDecision.RING -> {
          val fired = AlarmRules.fired(alarm, now)
          bestEffort("the fire of $id") { store.saveAlarms(alarms.replace(fired)) }
          scheduler.scheduleRecovery(fired.id, AlarmRules.recoveryAt(now))
          fired to null
        }
      }
    }
    missed?.let { Notifications.postMissed(context, it) }
    return ring
  }

  /**
   * Stamps queued alarm [id] as fired now, when its ring starts after waiting behind another, and
   * moves its recovery wakeup to count from now. Until then it was judged by the time it fired,
   * and reconcile would have taken it for stuck. Returns the alarm, or null if it no longer exists.
   * Rings whether or not it is still on: see [RingingService].
   */
  fun onQueuedRingStarted(id: String): Alarm? = store.locked {
    val alarms = store.loadAlarms()
    val alarm = alarms.firstOrNull { it.id == id } ?: return@locked null
    val now = System.currentTimeMillis()
    val fired = AlarmRules.fired(alarm, now)
    bestEffort("the queued start of $id") { store.saveAlarms(alarms.replace(fired)) }
    scheduler.scheduleRecovery(id, AlarmRules.recoveryAt(now))
    fired
  }

  /**
   * Records how [id]'s ring ended. An auto-silenced ring nobody answered is reported as missed
   * whenever the alarm still exists, even if a reconcile has since switched it off or moved it on;
   * [dueAt] is when it was due, as its fire saw it. The alarm itself moves on only if it is still
   * on: one switched off or deleted while ringing has already been cancelled.
   */
  fun onRingEnded(id: String, autoSilenced: Boolean, dueAt: Long? = null) {
    val missed = store.locked {
      scheduler.cancelRecovery(id)
      val alarms = store.loadAlarms()
      val alarm = alarms.firstOrNull { it.id == id } ?: return@locked null
      val due = dueAt ?: AlarmRules.dueAt(alarm) ?: alarm.lastFiredAt
      if (alarm.enabled) {
        val ended = AlarmRules.ringEnded(alarm, System.currentTimeMillis(), zone())
        bestEffort("the end of $id's ring") { store.saveAlarms(alarms.replace(ended)) }
        scheduler.sync(ended)
      }
      if (autoSilenced && due != null) MissedAlarm(alarm.id, alarm.name, due) else null
    }
    missed?.let { Notifications.postMissed(context, it) }
  }

  fun onSnoozed(id: String) {
    store.locked {
      scheduler.cancelRecovery(id)
      val alarms = store.loadAlarms()
      val alarm = alarms.firstOrNull { it.id == id && it.enabled } ?: return@locked
      val snoozed = AlarmRules.snoozed(alarm, System.currentTimeMillis())
      bestEffort("the snooze of $id") { store.saveAlarms(alarms.replace(snoozed)) }
      scheduler.sync(snoozed)
    }
  }

  fun soundFileFor(alarm: Alarm): File? {
    val sound = soundOf(alarm) ?: return null
    return File(store.soundsDir, sound.fileName)
  }

  fun soundNameFor(alarm: Alarm): String =
    soundOf(alarm)?.name ?: context.getString(R.string.default_alarm_tone)

  /** Points every alarm that uses [soundId] back at the default tone. */
  fun clearSound(soundId: String) {
    store.locked {
      store.saveAlarms(
        store.loadAlarms().map { if (it.soundId == soundId) it.copy(soundId = null) else it },
      )
    }
  }

  private fun soundOf(alarm: Alarm): Sound? {
    val soundId = alarm.soundId ?: return null
    return store.locked { store.loadSounds() }.firstOrNull { it.id == soundId }
  }

  /** The `:ringing` process's marker, or null if there is none or it can't be read. */
  private fun ringingMarker(): RingingMarker? =
    try {
      store.loadRingingMarker()
    } catch (e: Exception) {
      Log.e(LOG_TAG, "Could not read the ringing marker; reconciling as if nothing rings", e)
      null
    }

  /** Runs a ringing-path [write]; a failure is logged and the caller carries on. */
  private inline fun bestEffort(what: String, write: () -> Unit) {
    try {
      write()
    } catch (e: Exception) {
      Log.e(LOG_TAG, "Could not save $what; carrying on, reconcile will repair it", e)
    }
  }

  private fun zone(): ZoneId = ZoneId.systemDefault()

  private fun List<Alarm>.replace(alarm: Alarm): List<Alarm> =
    map { if (it.id == alarm.id) alarm else it }

  companion object {
    const val DEFAULT_NAME = "Alarm"

    @Volatile private var instance: AlarmEngine? = null

    fun get(context: Context): AlarmEngine =
      instance
        ?: synchronized(this) {
          instance ?: AlarmEngine(context.applicationContext).also { instance = it }
        }
  }
}
