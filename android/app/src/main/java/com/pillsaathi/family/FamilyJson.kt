package com.pillsaathi.family

import com.pillsaathi.alarm.DoseOutcome
import com.pillsaathi.alarm.DosePill
import com.pillsaathi.alarm.DoseRecord
import com.pillsaathi.alarm.DoseTime
import com.pillsaathi.alarm.Pill
import com.pillsaathi.alarm.PillForm
import com.pillsaathi.alarm.PillJson
import com.pillsaathi.alarm.RefillLevel
import java.security.MessageDigest
import java.time.LocalDate
import org.json.JSONArray
import org.json.JSONObject

/**
 * `family.json`, and the maps Firestore stores for pills, records and the elder doc. Firestore
 * gives back every whole number as a Long and every other number as a Double, so reads take any
 * [Number]. A read never throws: a malformed pill or record is dropped.
 */
object FamilyJson {
  fun localToJson(l: FamilyLocal): String =
    JSONObject()
      .put("sharing", l.sharing)
      .put(
        "uploaded",
        JSONObject()
          .put("elder", l.uploaded.elder ?: JSONObject.NULL)
          .put("months", JSONObject(l.uploaded.months))
          .put("photos", JSONObject(l.uploaded.photos)),
      )
      .put("follows", JSONArray().apply { l.follows.forEach { put(followToJson(it)) } })
      .put("checkedThrough", l.checkedThrough ?: JSONObject.NULL)
      .put("pinged", JSONArray(l.pinged.sorted()))
      .put("refillPinged", JSONObject(l.refillPinged.mapValues { it.value.json }))
      .put("silentWarned", JSONObject(l.silentWarned))
      .toString()

  fun localFromJson(json: String?): FamilyLocal {
    if (json.isNullOrBlank()) return FamilyLocal()
    val o = JSONObject(json)
    val up = o.optJSONObject("uploaded")
    val follows = o.optJSONArray("follows") ?: JSONArray()
    return FamilyLocal(
      sharing = o.optBoolean("sharing", false),
      uploaded = Uploaded(
        elder = up?.optStringOrNull("elder"),
        months = up?.optJSONObject("months")?.strings() ?: emptyMap(),
        photos = up?.optJSONObject("photos")?.strings() ?: emptyMap(),
      ),
      follows = (0 until follows.length()).map { followFromJson(follows.getJSONObject(it)) },
      checkedThrough = o.optLongOrNull("checkedThrough"),
      pinged = o.optJSONArray("pinged")?.let { a -> (0 until a.length()).map { a.getString(it) }.toSet() } ?: emptySet(),
      refillPinged = o.optJSONObject("refillPinged")?.strings()
        ?.mapNotNull { (k, v) -> RefillLevel.fromJson(v)?.let { k to it } }?.toMap() ?: emptyMap(),
      silentWarned = o.optJSONObject("silentWarned")?.let { s -> s.keys().asSequence().associateWith { s.getLong(it) } }
        ?: emptyMap(),
    )
  }

  /** [p] as uploaded. [Pill.refillNotified] is the elder phone's own and never goes online. */
  fun pillToMap(p: Pill): Map<String, Any?> =
    mapOf(
      "id" to p.id,
      "name" to p.name,
      "form" to p.form.json,
      "amount" to p.amount,
      "times" to p.times.map { mapOf("hour" to it.hour, "minute" to it.minute) },
      "startDate" to p.startDate.toString(),
      "days" to p.days,
      "createdAt" to p.createdAt,
      "photo" to p.photo,
      "remaining" to p.remaining,
    )

  fun pillFromMap(m: Map<String, Any?>): Pill? =
    try {
      Pill(
        id = m["id"] as String,
        name = m["name"] as String,
        form = PillForm.fromJson(m["form"] as String) ?: PillForm.TABLET,
        amount = (m["amount"] as Number).toDouble(),
        times = (m["times"] as List<*>).map {
          val t = it as Map<*, *>
          DoseTime((t["hour"] as Number).toInt(), (t["minute"] as Number).toInt())
        },
        startDate = LocalDate.parse(m["startDate"] as String),
        days = (m["days"] as Number?)?.toInt(),
        createdAt = (m["createdAt"] as Number).toLong(),
        photo = m["photo"] as String?,
        remaining = (m["remaining"] as Number?)?.toDouble(),
      )
    } catch (e: RuntimeException) {
      null
    }

  /** A month document: `{records: [...]}`, in date and time order. */
  fun recordsToMap(r: List<DoseRecord>): Map<String, Any?> =
    mapOf(
      "records" to r.sortedWith(compareBy({ it.date }, { it.hour }, { it.minute })).map { d ->
        mapOf(
          "date" to d.date.toString(),
          "hour" to d.hour,
          "minute" to d.minute,
          "outcome" to d.outcome.json,
          "at" to d.at,
          "marked" to d.marked,
          "pills" to d.pills.map { mapOf("pillId" to it.pillId, "name" to it.name, "form" to it.form.json, "amount" to it.amount) },
        )
      },
    )

  fun recordsFromMap(m: Map<String, Any?>): List<DoseRecord> =
    (m["records"] as? List<*>).orEmpty().mapNotNull { recordFromMap(it as? Map<*, *> ?: return@mapNotNull null) }

  /** The elder doc in [m]. [heardAt] is its server time, which the caller converts from a Timestamp. */
  fun elderFromMap(m: Map<String, Any?>, heardAt: Long?): ElderDoc =
    ElderDoc(
      // A doc made at the first code has no zone until the first upload, and no pills either.
      zone = m["zone"] as? String ?: "UTC",
      heardAt = heardAt,
      oldest = m["oldest"] as? String,
      pills = (m["pills"] as? List<*>).orEmpty().mapNotNull { p ->
        @Suppress("UNCHECKED_CAST")
        (p as? Map<String, Any?>)?.let(::pillFromMap)
      },
      followers = (m["followers"] as? List<*>).orEmpty().filterIsInstance<String>(),
      people = (m["people"] as? Map<*, *>).orEmpty().mapNotNull { (uid, v) ->
        val p = v as? Map<*, *> ?: return@mapNotNull null
        (uid as? String ?: return@mapNotNull null) to Person(p["name"] as? String ?: "", p["email"] as? String ?: "")
      }.toMap(),
    )

  /** The SHA-1 of [records]' month document, to tell which months changed since the last upload. */
  fun monthHash(records: List<DoseRecord>): String {
    val bytes = MessageDigest.getInstance("SHA-1").digest(canonical(recordsToMap(records)).toByteArray())
    return bytes.joinToString("") { "%02x".format(it) }
  }

  private fun recordFromMap(m: Map<*, *>): DoseRecord? =
    try {
      val outcome = m["outcome"] as String
      DoseRecord(
        date = LocalDate.parse(m["date"] as String),
        hour = (m["hour"] as Number).toInt(),
        minute = (m["minute"] as Number).toInt(),
        // An unreadable outcome never claims a dose was taken.
        outcome = DoseOutcome.values().firstOrNull { it.json == outcome } ?: DoseOutcome.MISSED,
        at = (m["at"] as Number).toLong(),
        pills = (m["pills"] as List<*>).map {
          val p = it as Map<*, *>
          DosePill(
            p["pillId"] as String, p["name"] as String, PillForm.fromJson(p["form"] as String) ?: PillForm.TABLET,
            (p["amount"] as Number).toDouble(),
          )
        },
        marked = m["marked"] as? Boolean ?: false,
      )
    } catch (e: RuntimeException) {
      null
    }

  private fun followToJson(f: Follow): JSONObject =
    JSONObject()
      .put("elderId", f.elderId)
      .put("name", f.name)
      .put("phone", f.phone ?: JSONObject.NULL)
      .put("delayMinutes", f.delayMinutes ?: JSONObject.NULL)
      .put("zone", f.zone ?: JSONObject.NULL)
      .put("heardAt", f.heardAt ?: JSONObject.NULL)
      .put("oldest", f.oldest ?: JSONObject.NULL)
      .put("pills", JSONArray(PillJson.pillsToJson(f.pills)))
      .put("recent", JSONArray(PillJson.dosesToJson(f.recent)))
      .put("photos", JSONObject(f.photos))
      .put("since", f.since ?: JSONObject.NULL)

  private fun followFromJson(o: JSONObject): Follow =
    Follow(
      elderId = o.getString("elderId"),
      name = o.getString("name"),
      phone = o.optStringOrNull("phone"),
      delayMinutes = if (o.isNull("delayMinutes")) null else o.getInt("delayMinutes"),
      zone = o.optStringOrNull("zone"),
      heardAt = o.optLongOrNull("heardAt"),
      oldest = o.optStringOrNull("oldest"),
      pills = PillJson.pillsFromJson(o.optJSONArray("pills")?.toString()),
      recent = PillJson.dosesFromJson(o.optJSONArray("recent")?.toString()),
      photos = o.optJSONObject("photos")?.strings() ?: emptyMap(),
      since = o.optLongOrNull("since"),
    )

  /** [value] as JSON with every map's keys sorted, so equal maps always give equal text. */
  private fun canonical(value: Any?): String = when (value) {
    null -> "null"
    is Map<*, *> -> value.entries.sortedBy { it.key.toString() }
      .joinToString(",", "{", "}") { JSONObject.quote(it.key.toString()) + ":" + canonical(it.value) }
    is List<*> -> value.joinToString(",", "[", "]") { canonical(it) }
    is String -> JSONObject.quote(value)
    else -> value.toString()
  }

  private fun JSONObject.strings(): Map<String, String> = keys().asSequence().associateWith { getString(it) }

  private fun JSONObject.optStringOrNull(key: String): String? = if (isNull(key)) null else getString(key)

  private fun JSONObject.optLongOrNull(key: String): Long? = if (isNull(key)) null else getLong(key)
}
