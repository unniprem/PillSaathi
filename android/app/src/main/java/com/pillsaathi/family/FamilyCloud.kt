package com.pillsaathi.family

import android.content.Context
import com.google.android.gms.tasks.Task
import com.google.android.gms.tasks.Tasks
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseNetworkException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.Blob
import com.google.firebase.firestore.DocumentReference
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreException
import com.google.firebase.firestore.SetOptions
import com.google.firebase.firestore.Source
import com.pillsaathi.alarm.DoseRecord
import com.pillsaathi.alarm.Pill
import java.util.concurrent.ExecutionException
import java.util.concurrent.TimeUnit
import java.util.concurrent.TimeoutException

/** A Family call failed; [code] is one of the error codes the screens know (OFFLINE, PERMISSION…). */
class FamilyException(val code: String, message: String, cause: Throwable? = null) : Exception(message, cause)

/**
 * Every Firebase call Family makes. The default app is "my pills": it signs in anonymously, and
 * its uid is this phone's elder id online. Main process only, and worker threads only: every call
 * blocks for at most [TIMEOUT_S] seconds, and throws [FamilyException] with OFFLINE (no internet,
 * Firestore unavailable or too slow), PERMISSION (the rules refused) or NOT_SET_UP (no Firebase
 * config in this build).
 */
class FamilyCloud private constructor(context: Context) {
  private val context: Context = context.applicationContext

  /** The link codes this phone made since the process started, so removing the copy removes them. */
  internal val madeCodes: MutableSet<String> = java.util.Collections.synchronizedSet(mutableSetOf())

  /** Whether this build has a Firebase config (`google-services.json`). */
  fun isSetUp(): Boolean = FirebaseApp.getApps(context).isNotEmpty()

  /** This phone's elder id, signing in anonymously the first time. */
  fun elderUid(): String {
    val auth = FirebaseAuth.getInstance(defaultApp())
    auth.currentUser?.let { return it.uid }
    return await(auth.signInAnonymously()).user?.uid ?: throw FamilyException(OFFLINE, "Anonymous sign-in gave no user")
  }

  /** Her zone, oldest record and pills, and the "last heard from" time, which every upload sets. */
  fun writeElder(uid: String, zone: String, oldest: String?, pills: List<Pill>) {
    val data = mapOf(
      "zone" to zone,
      "oldest" to oldest,
      "pills" to pills.map(FamilyJson::pillToMap),
      "heardAt" to FieldValue.serverTimestamp(),
    )
    await(elder(uid).set(data, SetOptions.merge()))
  }

  /** Makes her doc, with no one on it, unless it exists, so a link can add the first follower. */
  fun ensureElderDoc(uid: String) {
    val ref = elder(uid)
    if (!await(ref.get(Source.SERVER)).exists()) {
      await(ref.set(mapOf("followers" to emptyList<String>(), "people" to emptyMap<String, Any>())))
    }
  }

  /** Her doc as the server has it now, or null when there is none. */
  fun readElder(uid: String): ElderDoc? = elderOf(await(elder(uid).get(Source.SERVER)))

  fun writeMonth(uid: String, key: String, records: List<DoseRecord>) {
    await(elder(uid).collection(MONTHS).document(key).set(FamilyJson.recordsToMap(records)))
  }

  fun deleteMonth(uid: String, key: String) {
    await(elder(uid).collection(MONTHS).document(key).delete())
  }

  fun writePhoto(uid: String, pillId: String, name: String, jpeg: ByteArray) {
    await(elder(uid).collection(PHOTOS).document(pillId).set(mapOf("name" to name, "jpeg" to Blob.fromBytes(jpeg))))
  }

  fun deletePhoto(uid: String, pillId: String) {
    await(elder(uid).collection(PHOTOS).document(pillId).delete())
  }

  /**
   * Deletes her online copy: months, photos, requests, the codes this phone made while it ran
   * (codes can't be listed, and an expired one is useless), then the doc. The doc goes last,
   * since a follower's right to delete the rest is read from it.
   */
  fun deleteElderCopy(uid: String) {
    val ref = elder(uid)
    for (sub in listOf(MONTHS, PHOTOS, REQUESTS)) {
      await(ref.collection(sub).get(Source.SERVER)).documents.forEach { await(it.reference.delete()) }
    }
    madeCodes.toList().forEach { deleteCode(it) }
    await(ref.delete())
  }

  /** Deletes link code [code]; one already gone (used, or deleted) is fine. */
  fun deleteCode(code: String) {
    try {
      await(db().collection(CODES).document(code).delete())
    } catch (e: FamilyException) {
      if (e.code != PERMISSION) throw e
    }
    madeCodes.remove(code)
  }

  internal fun db(): FirebaseFirestore = FirebaseFirestore.getInstance(defaultApp())

  internal fun elder(uid: String): DocumentReference = db().collection(ELDERS).document(uid)

  internal fun defaultApp(): FirebaseApp {
    if (!isSetUp()) throw FamilyException(NOT_SET_UP, "This build has no Firebase config")
    return FirebaseApp.getInstance()
  }

  companion object {
    const val NOT_SET_UP = "NOT_SET_UP"
    const val OFFLINE = "OFFLINE"
    const val BAD_CODE = "BAD_CODE"
    const val NOT_SIGNED_IN = "NOT_SIGNED_IN"
    const val NO_ACTIVITY = "NO_ACTIVITY"
    const val NOT_FOUND = "NOT_FOUND"
    const val PERMISSION = "PERMISSION"

    const val TIMEOUT_S = 20L
    const val ELDERS = "elders"
    const val CODES = "codes"
    const val MONTHS = "months"
    const val PHOTOS = "photos"
    const val REQUESTS = "requests"

    @Volatile private var instance: FamilyCloud? = null

    fun get(context: Context): FamilyCloud =
      instance ?: synchronized(this) { instance ?: FamilyCloud(context.applicationContext).also { instance = it } }

    /** The elder doc in [snap], or null when it doesn't exist. */
    internal fun elderOf(snap: DocumentSnapshot): ElderDoc? {
      val data = snap.data ?: return null
      return FamilyJson.elderFromMap(data, snap.getTimestamp("heardAt")?.toDate()?.time)
    }

    /** Waits for [task] on this worker thread, turning its failure into a [FamilyException]. */
    fun <T> await(task: Task<T>): T =
      try {
        Tasks.await(task, TIMEOUT_S, TimeUnit.SECONDS)
      } catch (e: ExecutionException) {
        throw failure(e.cause ?: e)
      } catch (e: TimeoutException) {
        throw FamilyException(OFFLINE, "Firebase didn't answer in $TIMEOUT_S s", e)
      } catch (e: InterruptedException) {
        Thread.currentThread().interrupt()
        throw FamilyException(OFFLINE, "Interrupted", e)
      }

    internal fun failure(e: Throwable): FamilyException = when {
      e is FamilyException -> e
      e is FirebaseNetworkException -> FamilyException(OFFLINE, "No internet", e)
      e is FirebaseFirestoreException && e.code == FirebaseFirestoreException.Code.PERMISSION_DENIED ->
        FamilyException(PERMISSION, "The rules refused", e)
      e is FirebaseFirestoreException && e.code == FirebaseFirestoreException.Code.NOT_FOUND ->
        FamilyException(NOT_FOUND, "Not found", e)
      e is FirebaseFirestoreException &&
        (e.code == FirebaseFirestoreException.Code.UNAVAILABLE || e.code == FirebaseFirestoreException.Code.DEADLINE_EXCEEDED) ->
        FamilyException(OFFLINE, "Firestore unavailable", e)
      else -> FamilyException(OFFLINE, e.message ?: "Family call failed", e)
    }
  }
}
