package com.pillsaathi.family

import android.content.Context
import android.util.Log
import com.google.android.gms.tasks.Task
import com.google.android.gms.tasks.Tasks
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseNetworkException
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.firestore.Blob
import com.google.firebase.firestore.DocumentReference
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreException
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.SetOptions
import com.google.firebase.firestore.Source
import com.pillsaathi.alarm.DoseRecord
import com.pillsaathi.alarm.Pill
import java.security.SecureRandom
import java.util.Date
import java.util.concurrent.ExecutionException
import java.util.concurrent.Executor
import java.util.concurrent.TimeUnit
import java.util.concurrent.TimeoutException

/** A relative asking to follow this phone, with the [code] they used (null if unreadable). */
data class FollowRequest(val uid: String, val name: String, val email: String, val code: String?)

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
  fun writeElder(
    uid: String,
    zone: String,
    oldest: String?,
    pills: List<Pill>,
    cards: List<CardSound>,
    sounds: List<SoundRef>,
    health: ElderHealth,
  ) {
    val data = mapOf(
      "zone" to zone,
      "oldest" to oldest,
      "pills" to pills.map(FamilyJson::pillToMap),
      "cards" to FamilyJson.cardsToMap(cards),
      "sounds" to FamilyJson.soundsToMap(sounds),
      "health" to FamilyJson.healthToMap(health),
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

  /**
   * A new link code for elder [uid], live for [FamilyRules.CODE_TTL_MS]: tries up to 5 random codes,
   * skipping any already in use. Returns the code and when it expires.
   */
  fun createCode(uid: String): Pair<String, Long> {
    val random = SecureRandom()
    var last: FamilyException? = null
    repeat(5) {
      val code = FamilyRules.newCode(random)
      val ref = db().collection(CODES).document(code)
      if (await(ref.get(Source.SERVER)).exists()) return@repeat
      // A little short of the full life, so a phone clock a few seconds fast still passes the rules.
      val expiresAt = System.currentTimeMillis() + FamilyRules.CODE_TTL_MS - CLOCK_MARGIN_MS
      try {
        await(ref.set(mapOf("elderId" to uid, "expiresAt" to Timestamp(Date(expiresAt)))))
        madeCodes.add(code)
        return code to expiresAt
      } catch (e: FamilyException) {
        // Taken a moment ago by another phone (a create can't overwrite), or refused.
        if (e.code != PERMISSION) throw e
        last = e
      }
    }
    throw last ?: FamilyException(PERMISSION, "No free link code after 5 tries")
  }

  /**
   * Calls [onChange] on [executor] with elder [uid]'s pending follow requests, until removed.
   * Firestore ends a listener on its first error, so [onError] means it has stopped.
   */
  fun listenRequests(
    uid: String,
    executor: Executor,
    onError: () -> Unit,
    onChange: (List<FollowRequest>) -> Unit,
  ): ListenerRegistration =
    elder(uid).collection(REQUESTS).whereEqualTo("status", PENDING).addSnapshotListener(executor) { snap, e ->
      if (e != null) {
        Log.w(FAMILY_TAG, "Listening for follow requests failed", e)
        onError()
        return@addSnapshotListener
      }
      onChange(
        snap?.documents.orEmpty().map {
          FollowRequest(it.id, it.getString("name") ?: "", it.getString("email") ?: "", it.getString("code"))
        },
      )
    }

  /**
   * Answers [request] to elder [uid]. Allow adds the relative to her followers and uses up the
   * code, in one batch; No marks the request denied.
   */
  fun answerRequest(uid: String, request: FollowRequest, allow: Boolean) {
    val requestRef = elder(uid).collection(REQUESTS).document(request.uid)
    if (!allow) {
      await(requestRef.update("status", DENIED))
      return
    }
    val batch = db().batch()
    batch.update(
      elder(uid),
      mapOf(
        "followers" to FieldValue.arrayUnion(request.uid),
        "people.${request.uid}" to mapOf("name" to request.name, "email" to request.email),
      ),
    )
    batch.update(requestRef, "status", ALLOWED)
    // A code already gone (expired and deleted, or used) can't be deleted again.
    val code = request.code?.let { db().collection(CODES).document(it) }
    if (code != null && await(code.get(Source.SERVER)).getString("elderId") == uid) batch.delete(code)
    await(batch.commit())
    request.code?.let { madeCodes.remove(it) }
  }

  /** The request [requester] made to elder [uid], or null. */
  fun readRequest(uid: String, requester: String): FollowRequest? {
    val snap = await(elder(uid).collection(REQUESTS).document(requester).get(Source.SERVER))
    if (!snap.exists()) return null
    return FollowRequest(snap.id, snap.getString("name") ?: "", snap.getString("email") ?: "", snap.getString("code"))
  }

  /** Elder [uid]'s doc from the server, or from the cache when offline; null when there is none. */
  fun readElderCached(uid: String): ElderDoc? = elderOf(await(elder(uid).get()))

  /** Takes [follower] off elder [uid]'s list. Returns who is left. */
  fun removeFollower(uid: String, follower: String): List<String> {
    await(elder(uid).update(mapOf("followers" to FieldValue.arrayRemove(follower), "people.$follower" to FieldValue.delete())))
    return readElder(uid)?.followers.orEmpty()
  }

  /** The uid this phone's default app is signed in as, or null when it never has been. */
  fun signedInElder(): String? = if (isSetUp()) FirebaseAuth.getInstance(defaultApp()).currentUser?.uid else null

  /**
   * The second app, "people I look after", signed in with Google. Made once, from the default
   * app's options. The default app is never signed in with Google, so a phone can have its own
   * pills followed and follow others at once.
   */
  fun familyApp(): FirebaseApp {
    val options = defaultApp().options
    synchronized(this) {
      return FirebaseApp.getApps(context).firstOrNull { it.name == FAMILY_APP }
        ?: FirebaseApp.initializeApp(context, options, FAMILY_APP)
    }
  }

  /** The relative's Google account, or null when this phone hasn't signed in (or has no config). */
  fun relative(): Relative? {
    if (!isSetUp()) return null
    val user = FirebaseAuth.getInstance(familyApp()).currentUser ?: return null
    return Relative(user.displayName ?: "", user.email ?: "")
  }

  /** Signs the family app in with a Google [idToken]. */
  fun signInRelative(idToken: String): Relative {
    val auth = FirebaseAuth.getInstance(familyApp())
    val user = await(auth.signInWithCredential(GoogleAuthProvider.getCredential(idToken, null))).user
      ?: throw FamilyException(OFFLINE, "Google sign-in gave no user")
    return Relative(user.displayName ?: "", user.email ?: "")
  }

  fun relativeUid(): String =
    FirebaseAuth.getInstance(familyApp()).currentUser?.uid ?: throw FamilyException(NOT_SIGNED_IN, "Not signed in")

  /** The elder and expiry of link code [code], or null when there is no such code. */
  fun readCode(code: String): Pair<String, Long>? {
    val snap = await(familyDb().collection(CODES).document(code).get(Source.SERVER))
    val elderId = snap.getString("elderId") ?: return null
    val expiresAt = snap.getTimestamp("expiresAt")?.toDate()?.time ?: return null
    return elderId to expiresAt
  }

  /**
   * Asks elder [elderId] to let this relative follow her, with her live [code]. The name and email
   * are read from his Google ID token, the same claims the rules check them against.
   */
  fun askToFollow(elderId: String, code: String) {
    val user = FirebaseAuth.getInstance(familyApp()).currentUser
      ?: throw FamilyException(NOT_SIGNED_IN, "Not signed in")
    val claims = await(user.getIdToken(false)).claims
    val request = mapOf(
      "code" to code,
      "name" to (claims["name"] as? String ?: ""),
      "email" to (claims["email"] as? String ?: ""),
      "at" to FieldValue.serverTimestamp(),
      "status" to PENDING,
    )
    await(familyDb().collection(ELDERS).document(elderId).collection(REQUESTS).document(relativeUid()).set(request))
  }

  /**
   * Calls [onChange] on [executor] with this relative's request to [elderId]: its status, or null
   * when gone. As with [listenRequests], [onError] means the listener has stopped.
   */
  fun listenRequest(
    elderId: String,
    executor: Executor,
    onError: () -> Unit,
    onChange: (String?) -> Unit,
  ): ListenerRegistration =
    familyDb().collection(ELDERS).document(elderId).collection(REQUESTS).document(relativeUid())
      .addSnapshotListener(executor) { snap, e ->
        if (e != null) {
          Log.w(FAMILY_TAG, "Listening for an answer failed", e)
          onError()
          return@addSnapshotListener
        }
        onChange(snap?.getString("status"))
      }

  /** Takes this relative off [elderId]'s followers. Already off, or her copy gone, is fine. */
  fun leave(elderId: String) {
    val uid = relativeUid()
    try {
      await(
        familyDb().collection(ELDERS).document(elderId)
          .update(mapOf("followers" to FieldValue.arrayRemove(uid), "people.$uid" to FieldValue.delete())),
      )
    } catch (e: FamilyException) {
      if (e.code != PERMISSION && e.code != NOT_FOUND) throw e
    }
  }

  /**
   * Deletes [elderId]'s online copy as one of her followers, which the rules allow once her phone
   * has been silent for 30 days: months and photos, then the doc, whose followers grant the rest.
   */
  fun deleteCopyAsFollower(elderId: String) {
    val ref = familyDb().collection(ELDERS).document(elderId)
    for (sub in listOf(MONTHS, PHOTOS)) {
      await(ref.collection(sub).get(Source.SERVER)).documents.forEach { await(it.reference.delete()) }
    }
    await(ref.delete())
  }

  /** Followed elder [elderId]'s doc from the server; PERMISSION once she removed him or her copy went. */
  fun readFollowedElder(elderId: String): ElderDoc? =
    elderOf(await(familyDb().collection(ELDERS).document(elderId).get(Source.SERVER)))

  /**
   * Followed elder [elderId]'s records for month [key], none when there is no such month. [cached]
   * reads Firestore's copy when offline, for History; checks need the server's.
   */
  fun readFollowedMonth(elderId: String, key: String, cached: Boolean = false): List<DoseRecord> {
    val ref = familyDb().collection(ELDERS).document(elderId).collection(MONTHS).document(key)
    val snap = await(if (cached) ref.get() else ref.get(Source.SERVER))
    return snap.data?.let(FamilyJson::recordsFromMap).orEmpty()
  }

  /** The small copy of pill [pillId]'s photo: its file name and JPEG bytes, or null. */
  fun readFollowedPhoto(elderId: String, pillId: String): Pair<String, ByteArray>? {
    val snap = await(familyDb().collection(ELDERS).document(elderId).collection(PHOTOS).document(pillId).get(Source.SERVER))
    val name = snap.getString("name") ?: return null
    val jpeg = snap.getBlob("jpeg") ?: return null
    return name to jpeg.toBytes()
  }

  internal fun familyDb(): FirebaseFirestore = FirebaseFirestore.getInstance(familyApp())

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
    const val NO_SCANNER = "NO_SCANNER"

    const val TIMEOUT_S = 20L
    const val FAMILY_APP = "family"
    private const val CLOCK_MARGIN_MS = 30_000L
    const val PENDING = "pending"
    const val ALLOWED = "allowed"
    const val DENIED = "denied"
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
