package com.pillsaathi.family

import com.pillsaathi.alarm.DoseTime
import com.pillsaathi.alarm.Pill
import com.pillsaathi.alarm.PillDraft
import com.pillsaathi.bridge.PillInputValidator
import java.time.LocalDate

/** What a change does with a pill's photo: hers as it is, none, or one sent with the change. */
enum class PhotoChoice(val json: String) {
  KEEP("keep"),
  NONE("none"),
  NEW("new");

  companion object {
    fun fromJson(s: String?): PhotoChoice? = values().firstOrNull { it.json == s }
  }
}

/** The sound a change sets: the default tone, one of hers, or one sent with the change. */
sealed interface SoundChoice {
  data object Default : SoundChoice

  data class Hers(val id: String) : SoundChoice

  data class New(val name: String, val durationMs: Long, val ext: String) : SoundChoice
}

/** What a relative asked for. [Invalid] is a change her phone can't read, kept to be rejected. */
sealed interface ChangeBody {
  /** Add ([draft] id null) or edit a pill; [startDate] is the day he meant a new one to start. */
  data class SavePill(val draft: PillDraft, val startDate: LocalDate?, val photo: PhotoChoice) : ChangeBody

  data class DeletePill(val pillId: String) : ChangeBody

  /** The sound of her dose at [hour]:[minute], on her clock. */
  data class SetSound(val hour: Int, val minute: Int, val choice: SoundChoice) : ChangeBody

  data class Invalid(val why: String) : ChangeBody
}

/**
 * A change request under her copy: who asked ([by], [byName]), when ([at], server time), where it
 * stands ([status], [reason] when rejected, [doneAt]), and how many file [parts] came with it.
 */
data class RemoteChange(
  val id: String,
  val by: String,
  val byName: String,
  val at: Long?,
  val status: String,
  val reason: String?,
  val doneAt: Long?,
  val parts: Int,
  val body: ChangeBody,
)

/** What her phone does with a change ([RemoteRules.decide]). */
sealed interface ApplyDecision {
  /** Save [draft]: an edit when its id is set, else a new pill under its newId. */
  data class SavePill(val draft: PillDraft, val isNew: Boolean) : ApplyDecision

  /** Delete pill [pillId]; [name] is null when it is already gone, which counts as done. */
  data class DeletePill(val pillId: String, val name: String?) : ApplyDecision

  /** Set the sound at [hour]:[minute] to [soundId] (null = default tone), saving [newSound] first. */
  data class SetSound(val hour: Int, val minute: Int, val soundId: String?, val newSound: SoundChoice.New?) : ApplyDecision

  data class Reject(val reason: String) : ApplyDecision
}

/**
 * Change requests from family, as pure rules: their Firestore maps, and what her phone does with
 * each. Her phone is the only writer of her pills; a change applied twice (after a crash, say) must
 * do nothing more, so a new pill or sound takes the change's id.
 */
object RemoteRules {
  const val NOT_ALLOWED = "notAllowed"
  const val INVALID = "invalid"
  const val PILL_GONE = "pillGone"
  const val TIME_GONE = "timeGone"
  const val SOUND_GONE = "soundGone"
  const val FILE_BROKEN = "fileBroken"

  const val PENDING = "pending"
  const val APPLYING = "applying"
  const val APPLIED = "applied"
  const val REJECTED = "rejected"

  /** Days a done change, or a part no change waits for, is kept. */
  const val KEEP_DAYS = 7L

  /** The change as his phone writes it, without "at" (the caller adds the server time). */
  fun changeToMap(by: String, byName: String, body: ChangeBody, parts: Int): Map<String, Any?> {
    val base = mapOf("by" to by, "byName" to byName, "status" to PENDING, "parts" to parts)
    return base + when (body) {
      is ChangeBody.SavePill -> mapOf("kind" to "pill", "pill" to pillToMap(body.draft, body.startDate), "photo" to body.photo.json)
      is ChangeBody.DeletePill -> mapOf("kind" to "deletePill", "pillId" to body.pillId)
      is ChangeBody.SetSound -> mapOf("kind" to "sound", "hour" to body.hour, "minute" to body.minute, "sound" to soundToMap(body.choice))
      is ChangeBody.Invalid -> throw IllegalArgumentException("An invalid change isn't sent")
    }
  }

  /** The change in [m]; a body it can't read is [ChangeBody.Invalid], never a throw. */
  fun changeFromMap(id: String, m: Map<String, Any?>, at: Long?, doneAt: Long?): RemoteChange =
    RemoteChange(
      id = id,
      by = m["by"] as? String ?: "",
      byName = m["byName"] as? String ?: "",
      at = at,
      status = m["status"] as? String ?: PENDING,
      reason = m["reason"] as? String,
      doneAt = doneAt,
      parts = (m["parts"] as? Number)?.toInt() ?: 0,
      body = try {
        bodyFromMap(m)
      } catch (e: Exception) {
        ChangeBody.Invalid(e.message ?: e.javaClass.simpleName)
      },
    )

  /**
   * [uid]'s changes still waiting, to mark not done when her phone switches him off or removes
   * him, and to clear before it trusts him again, so none is ever applied later.
   */
  fun revoked(changes: List<RemoteChange>, uid: String): List<RemoteChange> =
    changes.filter { it.by == uid && (it.status == PENDING || it.status == APPLYING) }

  /**
   * Whether a relative's copy of her pills, read from her upload at [heardAt], doesn't show
   * [change] yet: it still waits, or her phone applied it after that upload. Until then his next
   * change to that pill starts from it, so as not to undo it. Her phone uploads after applying,
   * under the same lock, so any later upload has it.
   */
  fun ahead(change: RemoteChange, heardAt: Long?): Boolean =
    when (change.status) {
      PENDING, APPLYING -> true
      APPLIED -> heardAt == null || change.doneAt == null || change.doneAt > heardAt
      else -> false
    }

  /** The day a new pill starts: the one he meant, or [today] once that has passed. */
  fun startDate(requested: LocalDate?, today: LocalDate): LocalDate =
    if (requested == null || requested < today) today else requested

  /**
   * What to do with [change] on her phone, given her [editors], [pills], the times her cards ring
   * at ([cardTimes]), her sounds' ids, her [today], and the photo saved from the change's parts.
   */
  fun decide(
    change: RemoteChange,
    editors: Collection<String>,
    pills: List<Pill>,
    cardTimes: Set<DoseTime>,
    soundIds: Set<String>,
    today: LocalDate,
    newPhoto: String?,
  ): ApplyDecision {
    if (change.by !in editors) return ApplyDecision.Reject(NOT_ALLOWED)
    return when (val body = change.body) {
      is ChangeBody.Invalid -> ApplyDecision.Reject(INVALID)
      is ChangeBody.DeletePill -> ApplyDecision.DeletePill(body.pillId, pills.firstOrNull { it.id == body.pillId }?.name)
      is ChangeBody.SetSound -> when {
        DoseTime(body.hour, body.minute) !in cardTimes -> ApplyDecision.Reject(TIME_GONE)
        body.choice is SoundChoice.Hers && body.choice.id !in soundIds -> ApplyDecision.Reject(SOUND_GONE)
        else -> when (val choice = body.choice) {
          SoundChoice.Default -> ApplyDecision.SetSound(body.hour, body.minute, null, null)
          is SoundChoice.Hers -> ApplyDecision.SetSound(body.hour, body.minute, choice.id, null)
          is SoundChoice.New -> ApplyDecision.SetSound(body.hour, body.minute, change.id, choice)
        }
      }
      is ChangeBody.SavePill -> {
        // A new pill applied before (her phone stopped before marking it) is edited, not added again.
        val id = body.draft.id ?: change.id.takeIf { id -> pills.any { it.id == id } }
        val existing = id?.let { pillId -> pills.firstOrNull { it.id == pillId } }
        if (id != null && existing == null) return ApplyDecision.Reject(PILL_GONE)
        val photo = when (body.photo) {
          PhotoChoice.KEEP -> existing?.photo
          PhotoChoice.NONE -> null
          PhotoChoice.NEW -> newPhoto ?: return ApplyDecision.Reject(FILE_BROKEN)
        }
        if (existing != null) {
          ApplyDecision.SavePill(body.draft.copy(id = existing.id, photo = photo, newId = null, startDate = null), isNew = false)
        } else {
          ApplyDecision.SavePill(
            body.draft.copy(id = null, photo = photo, newId = change.id, startDate = startDate(body.startDate, today)),
            isNew = true,
          )
        }
      }
    }
  }

  private fun pillToMap(d: PillDraft, startDate: LocalDate?): Map<String, Any?> =
    mapOf(
      "id" to d.id,
      "name" to d.name,
      "form" to d.form.json,
      "amount" to d.amount,
      "times" to d.times.map { mapOf("hour" to it.hour, "minute" to it.minute) },
      "startsTomorrow" to d.startsTomorrow,
      "days" to d.days,
      "remaining" to d.remaining,
      "remainingChanged" to d.remainingChanged,
      "startDate" to startDate?.toString(),
    )

  private fun soundToMap(c: SoundChoice): Map<String, Any?> =
    when (c) {
      SoundChoice.Default -> mapOf("kind" to "default")
      is SoundChoice.Hers -> mapOf("kind" to "hers", "id" to c.id)
      is SoundChoice.New -> mapOf("kind" to "new", "name" to c.name, "durationMs" to c.durationMs, "ext" to c.ext)
    }

  private fun bodyFromMap(m: Map<String, Any?>): ChangeBody =
    when (m["kind"]) {
      "pill" -> {
        @Suppress("UNCHECKED_CAST")
        val pill = m["pill"] as? Map<String, Any?> ?: throw IllegalArgumentException("no pill")
        val photo = PhotoChoice.fromJson(m["photo"] as? String) ?: throw IllegalArgumentException("unknown photo choice")
        // The photo travels as a choice; the draft's photo is set on her phone.
        val draft = PillInputValidator.validate(pill - "photo")
        val startDate = (pill["startDate"] as? String)?.let(LocalDate::parse)
        ChangeBody.SavePill(draft, startDate, photo)
      }
      "deletePill" -> ChangeBody.DeletePill(m["pillId"] as? String ?: throw IllegalArgumentException("no pillId"))
      "sound" -> ChangeBody.SetSound(clock(m["hour"], 23), clock(m["minute"], 59), soundFromMap(m["sound"]))
      else -> throw IllegalArgumentException("unknown kind ${m["kind"]}")
    }

  private fun soundFromMap(value: Any?): SoundChoice {
    val m = value as? Map<*, *> ?: throw IllegalArgumentException("no sound")
    return when (m["kind"]) {
      "default" -> SoundChoice.Default
      "hers" -> SoundChoice.Hers(m["id"] as? String ?: throw IllegalArgumentException("no sound id"))
      "new" -> SoundChoice.New(
        name = (m["name"] as? String)?.trim()?.takeIf { it.isNotEmpty() } ?: throw IllegalArgumentException("no sound name"),
        durationMs = (m["durationMs"] as? Number)?.toLong() ?: throw IllegalArgumentException("no duration"),
        ext = m["ext"] as? String ?: throw IllegalArgumentException("no extension"),
      )
      else -> throw IllegalArgumentException("unknown sound kind ${m["kind"]}")
    }
  }

  private fun clock(value: Any?, max: Int): Int {
    val n = (value as? Number)?.toDouble() ?: throw IllegalArgumentException("not a number")
    if (n != Math.floor(n) || n < 0 || n > max) throw IllegalArgumentException("$n is out of range")
    return n.toInt()
  }
}
