package com.pillsaathi.bridge

import android.net.Uri
import android.os.Handler
import android.os.HandlerThread
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning
import com.google.firebase.firestore.ListenerRegistration
import com.pillsaathi.alarm.AlarmStore
import com.pillsaathi.alarm.StorageException
import com.pillsaathi.family.CodeImage
import com.pillsaathi.family.ElderSync
import com.pillsaathi.family.FamilyCloud
import com.pillsaathi.family.FamilyException
import com.pillsaathi.family.FamilyRules
import com.pillsaathi.family.FamilyWork
import com.pillsaathi.family.Follow
import com.pillsaathi.family.FollowRequest
import com.pillsaathi.family.GoogleSignIn
import com.pillsaathi.family.Person
import com.pillsaathi.family.Relative
import com.pillsaathi.specs.NativeFamilySpec
import java.io.File
import java.util.concurrent.Executor

/**
 * Family for JS: linking this phone to a relative and who can see its pills; signing in with
 * Google, scanning or typing an elder's code, and the elders this phone follows.
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
  private val asks = mutableMapOf<String, Ask>()

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

  override fun signedInRelative(promise: Promise) = onWorker(promise) { cloud.relative()?.let(::relativeToJs) }

  override fun signInWithGoogle(promise: Promise) {
    UiThreadUtil.runOnUiThread {
      val activity = reactApplicationContext.currentActivity
      val clientId = GoogleSignIn.webClientId(reactApplicationContext)
      when {
        !cloud.isSetUp() || clientId == null -> promise.reject(FamilyCloud.NOT_SET_UP, "This build has no Firebase config")
        activity == null -> promise.reject(FamilyCloud.NO_ACTIVITY, "There is no screen to sign in on")
        else -> GoogleSignIn.idToken(activity, clientId) { result ->
          onWorker(promise) {
            val token = result.getOrThrow() ?: return@onWorker null
            relativeToJs(cloud.signInRelative(token))
          }
        }
      }
    }
  }

  override fun scanCode(promise: Promise) {
    UiThreadUtil.runOnUiThread {
      val activity = reactApplicationContext.currentActivity
      if (activity == null) {
        promise.reject(FamilyCloud.NO_ACTIVITY, "There is no screen to scan on")
        return@runOnUiThread
      }
      val options = GmsBarcodeScannerOptions.Builder().setBarcodeFormats(Barcode.FORMAT_QR_CODE).build()
      GmsBarcodeScanning.getClient(activity, options).startScan()
        .addOnSuccessListener { promise.resolve(it.rawValue?.let(FamilyRules::parseCode)) }
        .addOnCanceledListener { promise.resolve(null) }
        .addOnFailureListener {
          Log.w(TAG, "Scanning failed", it)
          promise.reject(FamilyCloud.OFFLINE, it.message, it)
        }
    }
  }

  override fun requestFollow(code: String, promise: Promise) =
    onWorker(promise) {
      val digits = FamilyRules.parseCode(code) ?: throw FamilyException(FamilyCloud.BAD_CODE, "Not a code")
      cloud.relativeUid()
      val (elderId, expiresAt) = cloud.readCode(digits)?.takeIf { it.second > System.currentTimeMillis() }
        ?: throw FamilyException(FamilyCloud.BAD_CODE, "No live code $digits")
      try {
        cloud.askToFollow(elderId, digits)
      } catch (e: FamilyException) {
        // The rules refuse a code that ran out on the server's clock.
        throw if (e.code == FamilyCloud.PERMISSION) FamilyException(FamilyCloud.BAD_CODE, "Code refused", e) else e
      }
      asks.remove(elderId)?.listener?.remove()
      val ask = Ask(expiresAt)
      ask.listener = cloud.listenRequest(elderId, worker) { ask.status = it }
      asks[elderId] = ask
      elderId
    }

  override fun followState(elderId: String, promise: Promise) =
    onWorker(promise) {
      val ask = asks[elderId] ?: throw FamilyException(FamilyCloud.NOT_FOUND, "No request to $elderId")
      when (ask.status) {
        FamilyCloud.ALLOWED -> "allowed"
        FamilyCloud.DENIED -> "denied"
        else -> if (System.currentTimeMillis() > ask.expiresAt) "expired" else "pending"
      }
    }

  override fun saveFollow(follow: ReadableMap, promise: Promise) =
    onWorker(promise) {
      val elderId = follow.getString("elderId") ?: throw IllegalArgumentException("No elderId")
      val name = follow.getString("name")?.trim().orEmpty()
      require(name.isNotEmpty()) { "A follow needs a name" }
      val phone = follow.getString("phone")?.trim()?.takeIf { it.isNotEmpty() }
      val delay = if (follow.isNull("delayMinutes")) null else follow.getDouble("delayMinutes").toInt()
      require(delay == null || delay in FamilyRules.DELAYS) { "No such delay $delay" }
      store.locked {
        val local = store.loadFamily()
        val now = System.currentTimeMillis()
        val existing = local.follows.firstOrNull { it.elderId == elderId }
        val follows = if (existing == null) {
          local.follows + Follow(elderId, name, phone, delay, since = now)
        } else {
          local.follows.map { if (it.elderId == elderId) it.copy(name = name, phone = phone, delayMinutes = delay) else it }
        }
        store.saveFamily(local.copy(follows = follows, checkedThrough = local.checkedThrough ?: now))
      }
      asks.remove(elderId)?.listener?.remove()
      null
    }

  override fun listFollows(promise: Promise) =
    onWorker(promise) {
      Arguments.createArray().apply { store.locked { store.loadFamily() }.follows.forEach { pushMap(followToJs(it)) } }
    }

  override fun unfollow(elderId: String, deleteCopy: Boolean, promise: Promise) =
    onWorker(promise) {
      try {
        if (deleteCopy) {
          try {
            cloud.deleteCopyAsFollower(elderId)
          } catch (e: FamilyException) {
            // Not silent long enough after all, or already gone: just leave.
            if (e.code != FamilyCloud.PERMISSION && e.code != FamilyCloud.NOT_FOUND) throw e
            cloud.leave(elderId)
          }
        } else {
          cloud.leave(elderId)
        }
      } catch (e: FamilyException) {
        // Signed out (or never set up): there is nothing online to leave.
        if (e.code != FamilyCloud.NOT_SIGNED_IN && e.code != FamilyCloud.NOT_SET_UP) throw e
      }
      store.locked {
        val local = store.loadFamily()
        val prefix = "$elderId|"
        store.saveFamily(
          local.copy(
            follows = local.follows.filterNot { it.elderId == elderId },
            pinged = local.pinged.filterNot { it.startsWith(prefix) }.toSet(),
            refillPinged = local.refillPinged.filterKeys { !it.startsWith(prefix) },
            silentWarned = local.silentWarned - elderId,
          ),
        )
      }
      File(reactApplicationContext.cacheDir, "family/$elderId").deleteRecursively()
      null
    }

  override fun invalidate() {
    handler.post {
      requestsListener?.remove()
      requestsListener = null
      asks.values.forEach { it.listener?.remove() }
      asks.clear()
      thread.quitSafely()
    }
    super.invalidate()
  }

  /** A request to follow an elder, waiting for her answer: its last [status], from a listener. */
  private class Ask(val expiresAt: Long) {
    var listener: ListenerRegistration? = null
    @Volatile var status: String? = FamilyCloud.PENDING
  }

  private fun relativeToJs(r: Relative): WritableMap =
    Arguments.createMap().apply {
      putString("name", r.name)
      putString("email", r.email)
    }

  private fun followToJs(f: Follow): WritableMap =
    Arguments.createMap().apply {
      putString("elderId", f.elderId)
      putString("name", f.name)
      putString("phone", f.phone)
      f.delayMinutes?.let { putInt("delayMinutes", it) } ?: putNull("delayMinutes")
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
