package com.pillsaathi.family

import android.content.Context
import android.util.Log
import com.pillsaathi.alarm.AlarmEngine
import com.pillsaathi.alarm.DoseTime
import com.pillsaathi.photo.PillPhotos
import com.pillsaathi.sound.SoundLibrary
import java.time.LocalDate

/** What a notice on her phone says a relative did. */
enum class NoticeKind { ADDED, CHANGED, DELETED, SOUND }

/** One change her phone applied, for her notice: who, what, and the pill or the time and sound. */
data class AppliedChange(
  val who: String,
  val kind: NoticeKind,
  val pill: String?,
  val times: List<DoseTime>,
  val time: DoseTime?,
  val sound: String?,
)

/**
 * Her phone checking in: it claims each change her family sent, applies it through the same
 * engine calls her own screens use, marks it done or not done, deletes its file parts, and tells
 * her what changed. Main process, worker thread, under [ElderSync.lock]; throws [FamilyException]
 * when Firestore can't be reached, leaving what's not done for the next check-in.
 */
object CheckIn {
  private const val DAY_MS = 86_400_000L

  /** Applies what waits and returns how many changes were applied. */
  fun apply(context: Context): Int {
    val engine = AlarmEngine.get(context)
    val store = engine.store
    val local = store.locked { store.loadFamily() }
    // A phone no one can change never starts Firebase here.
    if (!FamilyRules.uploads(local) || local.editors.isEmpty()) return 0
    val cloud = FamilyCloud.get(context)
    val uid = cloud.signedInElder() ?: return 0
    val waiting = cloud.waitingChanges(uid)
    if (waiting.isEmpty()) return 0
    // Who may change her pills now: a relative switched off while his change waited is refused.
    val editors = cloud.readElder(uid)?.editors.orEmpty()
    store.locked { store.saveFamily(store.loadFamily().copy(editors = editors)) }
    if (editors.isEmpty()) FamilyWork.cancelCheckIn(context)
    val applied = mutableListOf<AppliedChange>()
    for (change in waiting) {
      if (!cloud.claim(uid, change.id)) continue
      val reason =
        try {
          applyOne(context, engine, change, editors, applied) { file(cloud, uid, change) }
        } catch (e: FamilyException) {
          throw e
        } catch (e: Exception) {
          Log.e(FAMILY_TAG, "Could not apply change ${change.id}", e)
          RemoteRules.INVALID
        }
      cloud.finish(uid, change.id, reason)
      if (change.parts > 0) cloud.deleteParts(uid, change.id, change.parts)
      Log.i(FAMILY_TAG, "Change ${change.id} from ${change.by}: ${reason ?: "applied"}")
    }
    if (applied.isNotEmpty()) FamilyNotifications.postChanges(context, applied)
    cloud.cleanUp(uid, System.currentTimeMillis() - RemoteRules.KEEP_DAYS * DAY_MS)
    return applied.size
  }

  /** The words of [a]'s notice line, in the order its text takes them. */
  fun noticeArgs(a: AppliedChange, clock: (DoseTime) -> String, defaultTone: String): List<String> =
    when (a.kind) {
      NoticeKind.ADDED -> listOf(a.who, a.pill.orEmpty(), a.times.joinToString(", ", transform = clock))
      NoticeKind.CHANGED, NoticeKind.DELETED -> listOf(a.who, a.pill.orEmpty())
      NoticeKind.SOUND -> listOf(a.who, a.time?.let(clock).orEmpty(), a.sound ?: defaultTone)
    }

  /**
   * Debug builds: applies [change] as a check-in would, with [file] as its photo or sound, and
   * tells her; gives null when done, else why not. Firestore isn't touched.
   */
  fun applyLocally(context: Context, change: RemoteChange, file: ByteArray?): String? {
    val applied = mutableListOf<AppliedChange>()
    val reason = applyOne(context, AlarmEngine.get(context), change, listOf(change.by), applied) { file }
    if (applied.isNotEmpty()) FamilyNotifications.postChanges(context, applied)
    return reason
  }

  /**
   * Applies [change]; null when done, else why not. Adds what her notice should say to [applied].
   * [file] gives the photo or sound sent with it, null when a part is missing.
   */
  private fun applyOne(
    context: Context,
    engine: AlarmEngine,
    change: RemoteChange,
    editors: List<String>,
    applied: MutableList<AppliedChange>,
    file: () -> ByteArray?,
  ): String? {
    val store = engine.store
    val pills = engine.pills()
    val cardTimes = engine.alarms().filter { it.enabled }.map { DoseTime(it.hour, it.minute) }.toSet()
    val sounds = store.locked { store.loadSounds() }
    val photos = PillPhotos(context, store.photosDir)
    val body = change.body
    val newPhoto =
      if (body is ChangeBody.SavePill && body.photo == PhotoChoice.NEW) {
        file()?.let { bytes ->
          try {
            photos.importBytes(bytes)
          } catch (e: java.io.IOException) {
            Log.w(FAMILY_TAG, "The photo of change ${change.id} isn't an image", e)
            null
          }
        }
      } else {
        null
      }
    val decision = RemoteRules.decide(change, editors, pills, cardTimes, sounds.map { it.id }.toSet(), LocalDate.now(), newPhoto)
    if (decision !is ApplyDecision.SavePill) newPhoto?.let(photos::delete)
    when (decision) {
      is ApplyDecision.Reject -> return decision.reason
      is ApplyDecision.SavePill -> {
        val pill = engine.savePill(decision.draft)
        val kind = if (decision.isNew) NoticeKind.ADDED else NoticeKind.CHANGED
        applied += AppliedChange(change.byName, kind, pill.name, pill.times, null, null)
      }
      is ApplyDecision.DeletePill -> {
        // Already gone counts as done, with nothing to tell her.
        if (decision.name != null) {
          engine.deletePill(decision.pillId)
          applied += AppliedChange(change.byName, NoticeKind.DELETED, decision.name, emptyList(), null, null)
        }
      }
      is ApplyDecision.SetSound -> {
        val new = decision.newSound
        val sound =
          if (new != null) {
            val bytes = file() ?: return RemoteRules.FILE_BROKEN
            SoundLibrary(context).addBytes(change.id, new.name, new.ext, bytes) ?: return RemoteRules.FILE_BROKEN
          } else {
            decision.soundId?.let { id -> sounds.firstOrNull { it.id == id } }
          }
        if (!engine.setSoundAt(decision.hour, decision.minute, sound?.id)) return RemoteRules.TIME_GONE
        applied += AppliedChange(change.byName, NoticeKind.SOUND, null, emptyList(), DoseTime(decision.hour, decision.minute), sound?.name)
      }
    }
    return null
  }

  /** The file sent with [change], or null when a part is missing. */
  private fun file(cloud: FamilyCloud, uid: String, change: RemoteChange): ByteArray? =
    if (change.parts == 0) null else FileParts.join(cloud.readParts(uid, change.id, change.parts), change.parts)
}
