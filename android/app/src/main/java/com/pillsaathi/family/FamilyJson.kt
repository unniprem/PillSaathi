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
      .put("editors", JSONArray(l.editors))
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
      editors = o.optJSONArray("editors")?.let { a -> (0 until a.length()).map { a.getString(it) } } ?: emptyList(),
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
        // Her photo's name becomes a file name on a relative's phone: never a path.
        photo = (m["photo"] as String?)?.takeIf(::isSafeFileName),
        remaining = (m["remaining"] as Number?)?.toDouble(),
      )
    } catch (e: RuntimeException) {
      null
    }

  /** A plain file name: letters, digits, dot, dash and underscore, no "..", at most 100 long. */
  fun isSafeFileName(name: String): Boolean = SAFE_NAME.matches(name) && ".." !in name

  private val SAFE_NAME = Regex("[A-Za-z0-9._-]{1,100}")

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
      editors = (m["editors"] as? List<*>).orEmpty().filterIsInstance<String>(),
      cards = cardsFromMap(m["cards"]),
      sounds = soundsFromMap(m["sounds"]),
      health = healthFromMap(m["health"]),
    )

  fun cardsToMap(cards: List<CardSound>): List<Map<String, Any?>> =
    cards.map { mapOf("hour" to it.hour, "minute" to it.minute, "soundId" to it.soundId, "sound" to it.soundName) }

  fun soundsToMap(sounds: List<SoundRef>): List<Map<String, Any?>> = sounds.map { mapOf("id" to it.id, "name" to it.name) }

  fun healthToMap(h: ElderHealth): Map<String, Any?> =
    mapOf(
      "notifications" to h.notifications, "alarmChannel" to h.alarmChannel, "exactAlarms" to h.exactAlarms,
      "fullScreen" to h.fullScreen, "battery" to h.battery, "unrestricted" to h.unrestricted, "setupSeen" to h.setupSeen,
    )

  private fun cardsFromMap(value: Any?): List<CardSound> =
    (value as? List<*>).orEmpty().mapNotNull {
      val c = it as? Map<*, *> ?: return@mapNotNull null
      CardSound(
        (c["hour"] as? Number)?.toInt() ?: return@mapNotNull null, (c["minute"] as? Number)?.toInt() ?: return@mapNotNull null,
        c["soundId"] as? String, c["sound"] as? String,
      )
    }

  private fun soundsFromMap(value: Any?): List<SoundRef> =
    (value as? List<*>).orEmpty().mapNotNull {
      val s = it as? Map<*, *> ?: return@mapNotNull null
      SoundRef(s["id"] as? String ?: return@mapNotNull null, s["name"] as? String ?: "")
    }

  /** Her alarm health; a field missing reads as fine, so an odd doc never cries wolf. */
  private fun healthFromMap(value: Any?): ElderHealth? {
    val h = value as? Map<*, *> ?: return null
    fun on(key: String) = h[key] as? Boolean ?: true
    return ElderHealth(on("notifications"), on("alarmChannel"), on("exactAlarms"), on("fullScreen"), on("battery"), on("unrestricted"), on("setupSeen"))
  }

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
      .put("editor", f.editor)
      .put("cards", JSONArray(cardsToMap(f.cards).map { JSONObject(it) }))
      .put("sounds", JSONArray(soundsToMap(f.sounds).map { JSONObject(it) }))
      .put("health", f.health?.let { JSONObject(healthToMap(it)) } ?: JSONObject.NULL)

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
      editor = o.optBoolean("editor", false),
      cards = cardsFromMap(o.optJSONArray("cards")?.let { jsonList(it) }),
      sounds = soundsFromMap(o.optJSONArray("sounds")?.let { jsonList(it) }),
      health = healthFromMap(o.optJSONObject("health")?.let { jsonMap(it) }),
    )

  private fun jsonList(a: JSONArray): List<Any?> = (0 until a.length()).map { a.optJSONObject(it)?.let(::jsonMap) }

  private fun jsonMap(o: JSONObject): Map<String, Any?> = o.keys().asSequence().associateWith { if (o.isNull(it)) null else o.get(it) }

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
