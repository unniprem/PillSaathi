package com.pillsaathi.alarm

import java.time.LocalDate
import org.json.JSONArray
import org.json.JSONObject

object PillJson {
  fun pillsToJson(pills: List<Pill>): String {
    val arr = JSONArray()
    pills.forEach { p ->
      arr.put(
        JSONObject()
          .put("id", p.id)
          .put("name", p.name)
          .put("form", p.form.json)
          .put("amount", p.amount)
          .put("times", timesToJson(p.times))
          .put("startDate", p.startDate.toString())
          .put("days", p.days ?: JSONObject.NULL)
          .put("createdAt", p.createdAt)
          .put("photo", p.photo ?: JSONObject.NULL)
          .put("remaining", p.remaining ?: JSONObject.NULL)
          .put("refillNotified", p.refillNotified?.json ?: JSONObject.NULL),
      )
    }
    return arr.toString()
  }

  fun pillsFromJson(json: String?): List<Pill> {
    if (json.isNullOrBlank()) return emptyList()
    val arr = JSONArray(json)
    return (0 until arr.length()).map { i ->
      val o = arr.getJSONObject(i)
      Pill(
        id = o.getString("id"),
        name = o.getString("name"),
        form = formOf(o),
        amount = o.getDouble("amount"),
        times = timesFromJson(o.getJSONArray("times")),
        startDate = LocalDate.parse(o.getString("startDate")),
        days = if (o.isNull("days")) null else o.getInt("days"),
        createdAt = o.getLong("createdAt"),
        // Missing in pills saved before photos.
        photo = if (o.isNull("photo")) null else o.getString("photo"),
        // Missing in pills saved before tablet counts: not counted.
        remaining = if (o.isNull("remaining")) null else o.getDouble("remaining"),
        refillNotified = if (o.isNull("refillNotified")) null else RefillLevel.fromJson(o.getString("refillNotified")),
      )
    }
  }

  fun dosesToJson(doses: List<DoseRecord>): String {
    val arr = JSONArray()
    doses.forEach { d ->
      val pills = JSONArray()
      d.pills.forEach { p ->
        pills.put(
          JSONObject()
            .put("pillId", p.pillId)
            .put("name", p.name)
            .put("form", p.form.json)
            .put("amount", p.amount),
        )
      }
      arr.put(
        JSONObject()
          .put("date", d.date.toString())
          .put("hour", d.hour)
          .put("minute", d.minute)
          .put("outcome", d.outcome.json)
          .put("at", d.at)
          .put("pills", pills)
          .put("marked", d.marked),
      )
    }
    return arr.toString()
  }

  fun dosesFromJson(json: String?): List<DoseRecord> {
    if (json.isNullOrBlank()) return emptyList()
    val arr = JSONArray(json)
    return (0 until arr.length()).map { i ->
      val o = arr.getJSONObject(i)
      val pills = o.getJSONArray("pills")
      val outcome = o.getString("outcome")
      DoseRecord(
        date = LocalDate.parse(o.getString("date")),
        hour = o.getInt("hour"),
        minute = o.getInt("minute"),
        // An unreadable outcome never claims a dose was taken.
        outcome = DoseOutcome.values().firstOrNull { it.json == outcome } ?: DoseOutcome.MISSED,
        at = o.getLong("at"),
        pills = (0 until pills.length()).map { j ->
          val p = pills.getJSONObject(j)
          DosePill(p.getString("pillId"), p.getString("name"), formOf(p), p.getDouble("amount"))
        },
        // Missing in doses recorded before History.
        marked = o.optBoolean("marked", false),
      )
    }
  }

  private fun formOf(o: JSONObject): PillForm = PillForm.fromJson(o.getString("form")) ?: PillForm.TABLET

  private fun timesToJson(times: List<DoseTime>): JSONArray {
    val arr = JSONArray()
    times.forEach { arr.put(JSONObject().put("hour", it.hour).put("minute", it.minute)) }
    return arr
  }

  private fun timesFromJson(arr: JSONArray): List<DoseTime> =
    (0 until arr.length()).map {
      val o = arr.getJSONObject(it)
      DoseTime(o.getInt("hour"), o.getInt("minute"))
    }
}
