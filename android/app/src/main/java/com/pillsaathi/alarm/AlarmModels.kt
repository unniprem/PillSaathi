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

/** Kept by the `:ringing` process while an alarm rings, so the main process can show its screen. */
data class RingingMarker(val alarmId: String, val startedAt: Long)

/** What to do with an AlarmManager delivery: ring it, ignore it, or report it as missed. */
enum class FireDecision { RING, STALE, MISSED }
