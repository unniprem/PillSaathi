package com.pillsaathi.alarm

import org.json.JSONArray
import org.json.JSONObject

object AlarmJson {
  fun alarmsToJson(alarms: List<Alarm>): String {
    val arr = JSONArray()
    alarms.forEach { a ->
      arr.put(
        JSONObject()
          .put("id", a.id)
          .put("hour", a.hour)
          .put("minute", a.minute)
          .put("days", JSONArray(a.days.sorted()))
          .put("name", a.name)
          .put("soundId", a.soundId ?: JSONObject.NULL)
          .put("enabled", a.enabled)
          .put("nextTriggerAt", a.nextTriggerAt ?: JSONObject.NULL)
          .put("snoozeUntil", a.snoozeUntil ?: JSONObject.NULL)
          .put("lastFiredAt", a.lastFiredAt ?: JSONObject.NULL)
          .put("createdAt", a.createdAt),
      )
    }
    return arr.toString()
  }

  fun alarmsFromJson(json: String?): List<Alarm> {
    if (json.isNullOrBlank()) return emptyList()
    val arr = JSONArray(json)
    return (0 until arr.length()).map { i ->
      val o = arr.getJSONObject(i)
      val days = o.getJSONArray("days")
      Alarm(
        id = o.getString("id"),
        hour = o.getInt("hour"),
        minute = o.getInt("minute"),
        days = (0 until days.length()).map { days.getInt(it) }.toSet(),
        name = o.getString("name"),
        soundId = if (o.isNull("soundId")) null else o.getString("soundId"),
        enabled = o.getBoolean("enabled"),
        nextTriggerAt = longOrNull(o, "nextTriggerAt"),
        snoozeUntil = longOrNull(o, "snoozeUntil"),
        lastFiredAt = longOrNull(o, "lastFiredAt"),
        createdAt = o.getLong("createdAt"),
      )
    }
  }

  fun soundsToJson(sounds: List<Sound>): String {
    val arr = JSONArray()
    sounds.forEach { s ->
      arr.put(
        JSONObject()
          .put("id", s.id)
          .put("name", s.name)
          .put("kind", s.kind.json)
          .put("durationMs", s.durationMs)
          .put("fileName", s.fileName)
          .put("createdAt", s.createdAt),
      )
    }
    return arr.toString()
  }

  fun soundsFromJson(json: String?): List<Sound> {
    if (json.isNullOrBlank()) return emptyList()
    val arr = JSONArray(json)
    return (0 until arr.length()).map { i ->
      val o = arr.getJSONObject(i)
      val kind = o.getString("kind")
      Sound(
        id = o.getString("id"),
        name = o.getString("name"),
        kind = SoundKind.values().firstOrNull { it.json == kind } ?: SoundKind.IMPORTED,
        durationMs = o.getLong("durationMs"),
        fileName = o.getString("fileName"),
        createdAt = o.getLong("createdAt"),
      )
    }
  }

  fun setupToJson(s: SetupState): String =
    JSONObject()
      .put("seen", s.seen)
      .put("doneSteps", JSONArray(s.doneSteps.sorted()))
      .toString()

  fun setupFromJson(json: String?): SetupState {
    if (json.isNullOrBlank()) return SetupState(false, emptySet())
    val o = JSONObject(json)
    val steps = o.optJSONArray("doneSteps")
    return SetupState(
      seen = o.optBoolean("seen", false),
      doneSteps = if (steps == null) emptySet() else (0 until steps.length()).map { steps.getString(it) }.toSet(),
    )
  }

  fun ringingMarkerToJson(m: RingingMarker): String =
    JSONObject()
      .put("alarmId", m.alarmId)
      .put("startedAt", m.startedAt)
      .put("queued", JSONArray(m.queued))
      .toString()

  fun ringingMarkerFromJson(json: String?): RingingMarker? {
    if (json.isNullOrBlank()) return null
    val o = JSONObject(json)
    val queued = o.optJSONArray("queued")
    return RingingMarker(
      o.getString("alarmId"),
      o.getLong("startedAt"),
      if (queued == null) emptyList() else (0 until queued.length()).map { queued.getString(it) },
    )
  }

  private fun longOrNull(o: JSONObject, key: String): Long? =
    if (o.isNull(key)) null else o.getLong(key)
}
