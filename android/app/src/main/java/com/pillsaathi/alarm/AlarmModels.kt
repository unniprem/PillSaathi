package com.pillsaathi.alarm

data class Alarm(
  val id: String,
  val hour: Int,
  val minute: Int,
  val days: Set<Int>,
  val name: String,
  val soundId: String?,
  val enabled: Boolean,
  val nextTriggerAt: Long?,
  val snoozeUntil: Long?,
  val lastFiredAt: Long?,
  val createdAt: Long,
)

enum class SoundKind(val json: String) {
  RECORDED("recorded"),
  IMPORTED("imported"),
}

data class Sound(
  val id: String,
  val name: String,
  val kind: SoundKind,
  val durationMs: Long,
  val fileName: String,
  val createdAt: Long,
)

data class MissedAlarm(val id: String, val name: String, val dueAt: Long)

data class ReconcileResult(val alarms: List<Alarm>, val missed: List<MissedAlarm>)

data class SetupState(val seen: Boolean, val doneSteps: Set<String>)

/**
 * Kept by the `:ringing` process while it rings: the alarm ringing now, when that ring started, and
 * the alarms queued behind it. The main process uses it to show the ringing screen, and while it is
 * fresh ([AlarmRules.isFresh]) reconcile leaves the alarms it names alone.
 */
data class RingingMarker(
  val alarmId: String,
  val startedAt: Long,
  val queued: List<String> = emptyList(),
)

/** What to do with an AlarmManager delivery: ring it, ignore it, or report it as missed. */
enum class FireDecision { RING, STALE, MISSED }
