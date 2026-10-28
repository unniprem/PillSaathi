package com.pillsaathi.bridge

import android.net.Uri
import android.os.Handler
import android.os.HandlerThread
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableArray
import com.google.firebase.firestore.ListenerRegistration
import com.pillsaathi.alarm.AlarmStore
import com.pillsaathi.alarm.StorageException
import com.pillsaathi.family.CodeImage
import com.pillsaathi.family.ElderSync
import com.pillsaathi.family.FamilyCloud
import com.pillsaathi.family.FamilyException
import com.pillsaathi.family.FamilyRules
import com.pillsaathi.family.FamilyWork
import com.pillsaathi.family.FollowRequest
import com.pillsaathi.family.Person
import com.pillsaathi.specs.NativeFamilySpec
import java.io.File
import java.util.concurrent.Executor

/**
 * Family for JS: linking this phone to a relative, and who can see its pills.
 *
 * Every call runs on one background thread, since each can wait on the network (up to
 * [FamilyCloud.TIMEOUT_S] seconds) or the store lock, and rejects with the codes in
 * [FamilyCloud]. Nothing here signs in until the elder asks for a code: opening the Family page on
 * a phone that never shared costs no network at all.
 */
class NativeFamilyModule(reactContext: ReactApplicationContext) : NativeFamilySpec(reactContext) {
  private val thread = HandlerThread("PillSaathiFamily").apply { start() }
  private val handler = Handler(thread.looper)
  private val worker = Executor { handler.post(it) }

  private val cloud: FamilyCloud
    get() = FamilyCloud.get(reactApplicationContext)

  private val store: AlarmStore
    get() = AlarmStore(reactApplicationContext)

  // Worker thread only.
  private var requestsListener: ListenerRegistration? = null
  private var pending: List<FollowRequest> = emptyList()
  private val answered = mutableSetOf<String>()
  private var currentCode: String? = null

  override fun getName() = NAME

  override fun createLinkCode(promise: Promise) =
    onWorker(promise) {
      val uid = cloud.elderUid()
      cloud.ensureElderDoc(uid)
      // A new code replaces the one on screen; that one is no use now.
      currentCode?.let { old ->
        try {
          cloud.deleteCode(old)
        } catch (e: FamilyException) {
          Log.w(TAG, "Could not delete the old code", e)
        }
      }
      val (code, expiresAt) = cloud.createCode(uid)
      currentCode = code
      val qr = CodeImage.png(FamilyRules.qrText(code), File(reactApplicationContext.cacheDir, "family/qr-$code.png"))
      Arguments.createMap().apply {
        putString("code", code)
        putDouble("expiresAt", expiresAt.toDouble())
        putString("qrUri", Uri.fromFile(qr).toString())
      }
    }

  override fun watchRequests(on: Boolean, promise: Promise) =
    onWorker(promise) {
      requestsListener?.remove()
      requestsListener = null
      pending = emptyList()
      // Only a phone that has made a code can have requests.
      val uid = if (on) cloud.signedInElder() else null
      if (uid != null) {
        requestsListener = cloud.listenRequests(uid, worker) { requests ->
          pending = requests.filter { key(it) !in answered }
        }
      }
      null
    }

  override fun pendingRequests(promise: Promise) =
    onWorker(promise) { people(pending.map { it.uid to Person(it.name, it.email) }) }

  override fun answerRequest(uid: String, allow: Boolean, promise: Promise) =
    onWorker(promise) {
      val elder = cloud.elderUid()
      val request = pending.firstOrNull { it.uid == uid }
        ?: cloud.readRequest(elder, uid)
        ?: throw FamilyException(FamilyCloud.NOT_FOUND, "No request from $uid")
      cloud.answerRequest(elder, request, allow)
      answered.add(key(request))
      pending = pending.filterNot { it.uid == uid }
      if (allow) {
        if (request.code == currentCode) currentCode = null
        store.locked { store.saveFamily(store.loadFamily().copy(sharing = true)) }
        FamilyWork.requestUpload(reactApplicationContext)
        FamilyWork.ensureHeartbeat(reactApplicationContext)
      }
      null
    }

  override fun listFollowers(promise: Promise) =
    onWorker(promise) {
      val uid = cloud.signedInElder() ?: return@onWorker Arguments.createArray()
      val elder = cloud.readElderCached(uid) ?: return@onWorker Arguments.createArray()
      people(elder.followers.map { it to (elder.people[it] ?: Person("", "")) })
    }

  override fun removeFollower(uid: String, promise: Promise) =
    onWorker(promise) {
      val elder = cloud.signedInElder() ?: throw FamilyException(FamilyCloud.NOT_FOUND, "This phone never shared")
      if (cloud.removeFollower(elder, uid).isEmpty()) ElderSync.stopSharing(reactApplicationContext, elder)
      null
    }

  override fun invalidate() {
    handler.post {
      requestsListener?.remove()
      requestsListener = null
      thread.quitSafely()
    }
    super.invalidate()
  }

  /** A request is asked about once; asking again with a new code is a new request. */
  private fun key(r: FollowRequest) = "${r.uid}|${r.code}"

  private fun people(list: List<Pair<String, Person>>): WritableArray =
    Arguments.createArray().apply {
      list.forEach { (uid, p) ->
        pushMap(
          Arguments.createMap().apply {
            putString("uid", uid)
            putString("name", p.name)
            putString("email", p.email)
          },
        )
      }
    }

  /**
   * Runs [block] on the worker thread and settles [promise] exactly once: with its result, with a
   * [FamilyException]'s code, with STORAGE_ERROR when the store failed, or with any other exception.
   */
  private fun onWorker(promise: Promise, block: () -> Any?) {
    val posted =
      handler.post {
        val result =
          try {
            block()
          } catch (e: FamilyException) {
            Log.w(TAG, "Family call failed (${e.code})", e)
            promise.reject(e.code, e.message, e)
            return@post
          } catch (e: StorageException) {
            Log.e(TAG, "Family call failed on storage", e)
            promise.reject(STORAGE_ERROR, e.message, e)
            return@post
          } catch (e: Exception) {
            Log.e(TAG, "Family call failed", e)
            promise.reject(e)
            return@post
          }
        promise.resolve(result)
      }
    if (!posted) promise.reject(IllegalStateException("The family module has shut down"))
  }

  companion object {
    const val NAME = "NativeFamily"
    private const val TAG = "PillSaathiFamily"
    private const val STORAGE_ERROR = "STORAGE_ERROR"
  }
}
