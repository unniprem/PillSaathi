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
      scheduler.cancel(id)
      scheduler.cancelRecovery(id)
      store.saveAlarms(store.loadAlarms().filterNot { it.id == id })
    }
    RingingService.stopIfRinging(context, id)
  }

  fun reconcile(trigger: ReconcileTrigger): List<MissedAlarm> {
    val missed = store.locked {
      val result = AlarmRules.reconcile(store.loadAlarms(), System.currentTimeMillis(), zone())
      store.saveAlarms(result.alarms)
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
          store.saveAlarms(alarms.replace(ended))
          scheduler.sync(ended)
          null to AlarmRules.dueAt(alarm)?.let { MissedAlarm(alarm.id, alarm.name, it) }
        }
        FireDecision.RING -> {
          val fired = AlarmRules.fired(alarm, now)
          store.saveAlarms(alarms.replace(fired))
          scheduler.scheduleRecovery(fired.id, AlarmRules.recoveryAt(now))
          fired to null
        }
      }
    }
    missed?.let { Notifications.postMissed(context, it) }
    return ring
  }

  fun onRingEnded(id: String, autoSilenced: Boolean) {
    val missed = store.locked {
      scheduler.cancelRecovery(id)
      val alarms = store.loadAlarms()
      // Deleted or switched off while ringing: it has already been cancelled.
      val alarm = alarms.firstOrNull { it.id == id && it.enabled } ?: return@locked null
      val dueAt = AlarmRules.dueAt(alarm)
      val ended = AlarmRules.ringEnded(alarm, System.currentTimeMillis(), zone())
      store.saveAlarms(alarms.replace(ended))
      scheduler.sync(ended)
      if (autoSilenced && dueAt != null) MissedAlarm(alarm.id, alarm.name, dueAt) else null
    }
    missed?.let { Notifications.postMissed(context, it) }
  }

  fun onSnoozed(id: String) {
    store.locked {
      scheduler.cancelRecovery(id)
      val alarms = store.loadAlarms()
      val alarm = alarms.firstOrNull { it.id == id && it.enabled } ?: return@locked
      val snoozed = AlarmRules.snoozed(alarm, System.currentTimeMillis())
      store.saveAlarms(alarms.replace(snoozed))
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
