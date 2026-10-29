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
import com.google.firebase.firestore.ListenerRegistration
import com.pillsaathi.alarm.AlarmStore
import com.pillsaathi.alarm.DoseRules
import com.pillsaathi.alarm.History
import com.pillsaathi.alarm.StorageException
import com.pillsaathi.family.CodeImage
import com.pillsaathi.family.CheckIn
import com.pillsaathi.family.CodeScanner
import com.pillsaathi.family.ElderSync
import com.pillsaathi.family.FamilyChecks
import com.pillsaathi.family.FamilyCloud
import com.pillsaathi.family.FamilyException
import com.pillsaathi.family.FamilyRefresh
import com.pillsaathi.family.FamilyRules
import com.pillsaathi.family.FamilyWork
import com.pillsaathi.family.Follow
import com.pillsaathi.family.FollowRequest
import com.pillsaathi.family.GoogleSignIn
import com.pillsaathi.family.Person
import com.pillsaathi.family.Relative
import com.pillsaathi.family.CardSound
import com.pillsaathi.family.ChangeBody
import com.pillsaathi.family.FamilyJson
import com.pillsaathi.family.FileParts
import com.pillsaathi.family.PhotoChoice
import com.pillsaathi.family.RemoteChange
import com.pillsaathi.family.RemoteRules
import com.pillsaathi.family.SoundChoice
import com.pillsaathi.family.Thumbnails
import com.pillsaathi.sound.SoundLibrary
import java.util.UUID
import com.pillsaathi.specs.NativeFamilySpec
import java.io.File
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZoneId
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
  private var watching = false
  private var requestsListener: ListenerRegistration? = null
  private var requestsRetryAt = 0L
  private var watchingChanges = false
  private var changesListener: ListenerRegistration? = null
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
      watching = on
      requestsListener?.remove()
      requestsListener = null
      requestsRetryAt = 0L
      pending = emptyList()
      listenForRequests()
      null
    }

  /**
   * Starts listening for follow requests while the page watches and no listener runs. Only a phone
   * that has made a code can have requests, and the first code signs in after the page started
   * watching; and Firestore stops a listener for good on its first error. So the page's polls call
   * this again, at most every [RETRY_MS] after an error.
   */
  private fun listenForRequests() {
    if (!watching || requestsListener != null || System.currentTimeMillis() < requestsRetryAt) return
    val uid = cloud.signedInElder() ?: return
    lateinit var listener: ListenerRegistration
    listener = cloud.listenRequests(
      uid,
      worker,
      onError = {
        if (requestsListener === listener) {
          requestsListener = null
          requestsRetryAt = System.currentTimeMillis() + RETRY_MS
        }
      },
    ) { requests -> pending = requests.filter { key(it) !in answered } }
    requestsListener = listener
  }

  override fun pendingRequests(promise: Promise) =
    onWorker(promise) {
      listenForRequests()
      people(pending.map { it.uid to Person(it.name, it.email) })
    }

  override fun answerRequest(uid: String, allow: Boolean, promise: Promise) =
    onWorker(promise) {
      val elder = cloud.elderUid()
      val request = pending.firstOrNull { it.uid == uid }
        ?: cloud.readRequest(elder, uid)
        ?: throw FamilyException(FamilyCloud.NOT_FOUND, "No request from $uid")
      if (allow) {
        // Sharing is on before the Allow is sent, under the upload lock: a write that times out
        // is still queued and lands later, and the upload must not stay off when it does. If it
        // is refused instead, the next upload finds no follower and turns sharing off again.
        synchronized(ElderSync.lock) {
          store.locked { store.saveFamily(store.loadFamily().copy(sharing = true)) }
          FamilyWork.requestUpload(reactApplicationContext)
          FamilyWork.ensureHeartbeat(reactApplicationContext)
          // Anything of his from an earlier link is never applied now.
          cloud.revokeChanges(elder, request.uid)
          cloud.answerRequest(elder, request, true)
          store.locked { store.saveFamily(store.loadFamily().let { it.copy(editors = (it.editors + uid).distinct()) }) }
          FamilyWork.ensureCheckIn(reactApplicationContext)
        }
        if (request.code == currentCode) currentCode = null
      } else {
        cloud.answerRequest(elder, request, false)
      }
      answered.add(key(request))
      pending = pending.filterNot { it.uid == uid }
      null
    }

  override fun listFollowers(promise: Promise) =
    onWorker(promise) {
      val uid = cloud.signedInElder() ?: return@onWorker Arguments.createArray()
      val elder = cloud.readElderCached(uid) ?: return@onWorker Arguments.createArray()
      Arguments.createArray().apply {
        elder.followers.forEach { follower ->
          val p = elder.people[follower] ?: Person("", "")
          pushMap(
            Arguments.createMap().apply {
              putString("uid", follower)
              putString("name", p.name)
              putString("email", p.email)
              putBoolean("canChange", follower in elder.editors)
            },
          )
        }
      }
    }

  override fun setCanChange(uid: String, on: Boolean, promise: Promise) =
    onWorker(promise) {
      val elder = cloud.signedInElder() ?: throw FamilyException(FamilyCloud.NOT_FOUND, "This phone never shared")
      // Under the upload lock, so a check-in can't apply his change halfway through. Switched
      // off, what he sent is not done; switched on, nothing he sent before is applied now.
      val editors = synchronized(ElderSync.lock) {
        if (on) cloud.revokeChanges(elder, uid)
        val editors = cloud.setEditor(elder, uid, on)
        if (!on) cloud.revokeChanges(elder, uid)
        editors
      }
      store.locked { store.saveFamily(store.loadFamily().copy(editors = editors)) }
      if (editors.isEmpty()) FamilyWork.cancelCheckIn(reactApplicationContext) else FamilyWork.ensureCheckIn(reactApplicationContext)
      null
    }

  override fun checkIn(promise: Promise) =
    onWorker(promise) { synchronized(ElderSync.lock) { CheckIn.apply(reactApplicationContext) }.toDouble() }

  override fun watchChanges(on: Boolean, promise: Promise) =
    onWorker(promise) {
      watchingChanges = on
      changesListener?.remove()
      changesListener = null
      listenForChanges()
      null
    }

  /**
   * While the app is in front, listens for changes her family sends and applies them at once. A
   * listener stopped by an error starts again after [RETRY_MS]. Worker thread.
   */
  private fun listenForChanges() {
    if (!watchingChanges || changesListener != null) return
    val local = store.locked { store.loadFamily() }
    if (!FamilyRules.uploads(local) || local.editors.isEmpty()) return
    val uid = cloud.signedInElder() ?: return
    lateinit var listener: ListenerRegistration
    listener = cloud.listenChanges(
      uid,
      worker,
      onError = {
        if (changesListener === listener) {
          changesListener = null
          handler.postDelayed({ listenForChanges() }, RETRY_MS)
        }
      },
    ) {
      try {
        synchronized(ElderSync.lock) { CheckIn.apply(reactApplicationContext) }
        Unit
      } catch (e: FamilyException) {
        Log.w(TAG, "Live check-in failed (${e.code})", e)
        FamilyWork.requestCheckIn(reactApplicationContext)
      }
    }
    changesListener = listener
  }

  override fun removeFollower(uid: String, promise: Promise) =
    onWorker(promise) {
      val elder = cloud.signedInElder() ?: throw FamilyException(FamilyCloud.NOT_FOUND, "This phone never shared")
      // After any upload still running, so nothing it writes outlives the copy.
      synchronized(ElderSync.lock) {
        val left = cloud.removeFollower(elder, uid)
        if (left.isNotEmpty()) cloud.revokeChanges(elder, uid)
        val editors = store.locked { store.loadFamily().editors - uid }
        store.locked { store.saveFamily(store.loadFamily().copy(editors = editors)) }
        if (editors.isEmpty()) FamilyWork.cancelCheckIn(reactApplicationContext)
        if (left.isEmpty()) ElderSync.stopSharing(reactApplicationContext, elder)
      }
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
      CodeScanner.scan(activity) { result ->
        result.fold(promise::resolve) { e ->
          val code = (e as? FamilyException)?.code ?: FamilyCloud.NO_SCANNER
          promise.reject(code, e.message, e)
        }
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
      asks[elderId] = ask
      listenForAnswer(elderId, ask)
      elderId
    }

  /** Listens for [elderId]'s answer to [ask]; again from [followState]'s polls when an error stopped it. */
  private fun listenForAnswer(elderId: String, ask: Ask) {
    if (ask.listener != null || System.currentTimeMillis() < ask.retryAt) return
    lateinit var listener: ListenerRegistration
    listener = cloud.listenRequest(
      elderId,
      worker,
      onError = {
        if (ask.listener === listener) {
          ask.listener = null
          ask.retryAt = System.currentTimeMillis() + RETRY_MS
        }
      },
    ) { ask.status = it }
    ask.listener = listener
  }

  override fun followState(elderId: String, promise: Promise) =
    onWorker(promise) {
      val ask = asks[elderId] ?: throw FamilyException(FamilyCloud.NOT_FOUND, "No request to $elderId")
      listenForAnswer(elderId, ask)
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
      FamilyChecks.scheduleNext(reactApplicationContext)
      // Read her copy now, then every few hours, so her new times are checked without app opens.
      FamilyWork.ensureRefresh(reactApplicationContext)
      FamilyWork.requestRefresh(reactApplicationContext)
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
      store.locked { store.saveFamily(FamilyRules.withoutFollow(store.loadFamily(), elderId)) }
      FamilyRefresh.photoDir(reactApplicationContext, elderId).deleteRecursively()
      // The last follow gone cancels the wake-up and the background reads.
      FamilyChecks.scheduleNext(reactApplicationContext)
      FamilyWork.stopRefreshIfUnused(reactApplicationContext)
      null
    }

  override fun getFamily(promise: Promise) = onWorker(promise) { cards() }

  override fun refreshFamily(promise: Promise) =
    onWorker(promise) {
      if (FamilyRefresh.run(reactApplicationContext)) afterRefresh()
      cards()
    }

  override fun getElderToday(elderId: String, promise: Promise) =
    onWorker(promise) {
      val follow = follow(elderId)
      val zone = zoneOf(follow)
      val local = ZoneId.systemDefault()
      val now = System.currentTimeMillis()
      elderMaps(follow, zone).today(FamilyRules.elderToday(follow.pills, follow.recent, now, zone)).apply {
        follow.heardAt?.let { putDouble("heardAt", FamilyRules.wallClock(it, zone, local).toDouble()) } ?: putNull("heardAt")
        putBoolean("otherZone", FamilyRules.card(follow, now, local).otherZone)
      }
    }

  override fun getElderHistory(elderId: String, from: String, to: String, promise: Promise) =
    onWorker(promise) {
      val follow = follow(elderId)
      val zone = zoneOf(follow)
      val (first, last) = LocalDate.parse(from) to LocalDate.parse(to)
      val months = generateSequence(YearMonth.from(first)) { it.plusMonths(1) }
        .takeWhile { !it.isAfter(YearMonth.from(last)) }
        .map { FamilyRules.monthKey(it.atDay(1)) }
      val records = months.flatMap { cloud.readFollowedMonth(elderId, it, cached = true) }.toList()
      val history = History(
        LocalDate.now(zone), follow.oldest?.let(LocalDate::parse), DoseRules.dosesBetween(records, first, last), follow.pills,
      )
      val unreported =
        FamilyRules.unreported(follow.pills, records, follow.heardAt, first, last, System.currentTimeMillis(), zone)
      elderMaps(follow, zone).history(history, unreported)
    }

  override fun listElderPills(elderId: String, promise: Promise) =
    onWorker(promise) {
      val follow = follow(elderId)
      val maps = elderMaps(follow, zoneOf(follow))
      Arguments.createArray().apply { follow.pills.sortedBy { it.createdAt }.forEach { pushMap(maps.pill(it)) } }
    }

  override fun getElderSetup(elderId: String, promise: Promise) =
    onWorker(promise) {
      val follow = follow(elderId)
      val zone = zoneOf(follow)
      val local = ZoneId.systemDefault()
      val maps = elderMaps(follow, zone)
      // A phone that hasn't uploaded its cards yet: her pills' times, sounds unknown.
      val cards = follow.cards.ifEmpty {
        follow.pills.flatMap { it.times }.distinct().sorted().map { CardSound(it.hour, it.minute, null, null) }
      }
      Arguments.createMap().apply {
        putBoolean("editor", follow.editor)
        putBoolean("otherZone", FamilyRules.card(follow, System.currentTimeMillis(), local).otherZone)
        follow.heardAt?.let { putDouble("heardAt", FamilyRules.wallClock(it, zone, local).toDouble()) } ?: putNull("heardAt")
        putArray("pills", Arguments.createArray().apply { follow.pills.sortedBy { it.createdAt }.forEach { pushMap(maps.pill(it)) } })
        putArray(
          "times",
          Arguments.createArray().apply {
            cards.forEach { c ->
              pushMap(
                Arguments.createMap().apply {
                  putInt("hour", c.hour)
                  putInt("minute", c.minute)
                  putString("soundId", c.soundId)
                  putString("soundName", c.soundName)
                },
              )
            }
          },
        )
        putArray(
          "sounds",
          Arguments.createArray().apply {
            follow.sounds.forEach { sound ->
              pushMap(Arguments.createMap().apply { putString("id", sound.id); putString("name", sound.name) })
            }
          },
        )
        putString("problem", FamilyRules.healthProblem(follow.health))
      }
    }

  override fun sendPill(elderId: String, input: ReadableMap, promise: Promise) =
    onWorker(promise) {
      val follow = follow(elderId)
      val raw = input.toHashMap()
      val draft =
        try {
          PillInputValidator.validate(raw - "photo" - "photoChoice")
        } catch (e: AlarmException) {
          throw FamilyException(e.code, e.message ?: "Invalid pill", e)
        }
      val photo = PhotoChoice.fromJson(input.getString("photoChoice")) ?: throw IllegalArgumentException("Unknown photo choice")
      // "Start tomorrow" is her tomorrow, worked out here, so a change her phone gets after
      // midnight still starts on the day he meant.
      val startDate = if (draft.id != null) null else LocalDate.now(zoneOf(follow)).plusDays(if (draft.startsTomorrow) 1L else 0L)
      val file =
        if (photo == PhotoChoice.NEW) {
          val name = input.getString("photo")?.takeIf(FamilyJson::isSafeFileName) ?: throw IllegalArgumentException("No photo")
          Thumbnails.jpeg(File(AlarmStore(reactApplicationContext).photosDir, name), SENT_PHOTO_PX, SENT_PHOTO_QUALITY)
            ?: throw FamilyException(FamilyCloud.NOT_FOUND, "The photo can't be read")
        } else {
          null
        }
      send(elderId, ChangeBody.SavePill(draft, startDate, photo), file)
    }

  override fun sendDeletePill(elderId: String, pillId: String, promise: Promise) =
    onWorker(promise) { send(elderId, ChangeBody.DeletePill(pillId), null) }

  override fun sendSound(elderId: String, hour: Double, minute: Double, kind: String, soundId: String?, promise: Promise) =
    onWorker(promise) {
      var file: ByteArray? = null
      val choice = when (kind) {
        "default" -> SoundChoice.Default
        "hers" -> SoundChoice.Hers(soundId ?: throw IllegalArgumentException("No sound"))
        "mine" -> {
          val library = SoundLibrary(reactApplicationContext)
          val id = soundId ?: throw IllegalArgumentException("No sound")
          val sound = library.list().firstOrNull { it.sound.id == id }?.sound
          val path = library.fileOf(id)
          if (sound == null || path == null) throw FamilyException(FamilyCloud.NOT_FOUND, "No sound $id")
          if (path.length() > FileParts.MAX_SEND_BYTES) throw FamilyException(FamilyCloud.TOO_BIG, "${path.length()} bytes")
          file = path.readBytes()
          SoundChoice.New(sound.name, sound.durationMs, path.extension.lowercase())
        }
        else -> throw IllegalArgumentException("Unknown sound kind $kind")
      }
      send(elderId, ChangeBody.SetSound(hour.toInt(), minute.toInt(), choice), file)
    }

  override fun listChanges(elderId: String, promise: Promise) =
    onWorker(promise) {
      val follow = follow(elderId)
      val zone = zoneOf(follow)
      val local = ZoneId.systemDefault()
      val me = cloud.relativeUid()
      val since = System.currentTimeMillis() - RemoteRules.KEEP_DAYS * 86_400_000L
      val shift = { at: Long? -> at?.let { FamilyRules.wallClock(it, zone, local).toDouble() } }
      val changes = cloud.readChanges(elderId)
        .filter { it.status == RemoteRules.PENDING || it.status == RemoteRules.APPLYING || (it.doneAt ?: 0L) >= since }
        .sortedByDescending { it.at ?: Long.MAX_VALUE }
      Arguments.createArray().apply {
        changes.forEach { c -> pushMap(changeToJs(c, follow, me, shift)) }
      }
    }

  override fun cancelChange(elderId: String, changeId: String, promise: Promise) =
    onWorker(promise) {
      cloud.cancelChange(elderId, changeId)
      null
    }

  /** Sends [body], with [file] in parts, to [elderId]'s phone; gives the change's id. */
  private fun send(elderId: String, body: ChangeBody, file: ByteArray?): String {
    val relative = cloud.relative() ?: throw FamilyException(FamilyCloud.NOT_SIGNED_IN, "Not signed in")
    val parts = file?.let(FileParts::split).orEmpty()
    if (parts.size > FileParts.MAX_PARTS) throw FamilyException(FamilyCloud.TOO_BIG, "${file?.size} bytes")
    val changeId = UUID.randomUUID().toString()
    try {
      cloud.sendChange(elderId, changeId, RemoteRules.changeToMap(cloud.relativeUid(), relative.name, body, parts.size), parts)
    } catch (e: FamilyException) {
      // Her phone hasn't allowed him to change her pills (or not any more).
      throw if (e.code == FamilyCloud.PERMISSION) FamilyException(FamilyCloud.NOT_ALLOWED, "Not an editor", e) else e
    }
    return changeId
  }

  private fun changeToJs(c: RemoteChange, follow: Follow, me: String, shift: (Long?) -> Double?): WritableMap =
    Arguments.createMap().apply {
      putString("id", c.id)
      putString("status", c.status)
      putString("reason", c.reason)
      putBoolean("mine", c.by == me)
      putString("byName", c.byName)
      shift(c.at)?.let { putDouble("at", it) } ?: putNull("at")
      shift(c.doneAt)?.let { putDouble("doneAt", it) } ?: putNull("doneAt")
      putNull("pillId")
      putNull("pillName")
      putNull("hour")
      putNull("minute")
      putNull("soundName")
      when (val body = c.body) {
        is ChangeBody.SavePill -> {
          putString("kind", "pill")
          putString("pillId", body.draft.id)
          putString("pillName", body.draft.name)
        }
        is ChangeBody.DeletePill -> {
          putString("kind", "deletePill")
          putString("pillId", body.pillId)
          putString("pillName", follow.pills.firstOrNull { it.id == body.pillId }?.name)
        }
        is ChangeBody.SetSound -> {
          putString("kind", "sound")
          putInt("hour", body.hour)
          putInt("minute", body.minute)
          when (val choice = body.choice) {
            SoundChoice.Default -> putNull("soundName")
            is SoundChoice.Hers -> putString("soundName", follow.sounds.firstOrNull { it.id == choice.id }?.name)
            is SoundChoice.New -> putString("soundName", choice.name)
          }
        }
        is ChangeBody.Invalid -> putString("kind", "invalid")
      }
    }

  override fun invalidate() {
    handler.post {
      requestsListener?.remove()
      requestsListener = null
      changesListener?.remove()
      changesListener = null
      asks.values.forEach { it.listener?.remove() }
      asks.clear()
      thread.quitSafely()
    }
    super.invalidate()
  }

  /** The Family section's cards, from `family.json`, every instant on her wall clock. */
  private fun cards(): WritableArray {
    val now = System.currentTimeMillis()
    val local = ZoneId.systemDefault()
    return Arguments.createArray().apply {
      store.locked { store.loadFamily() }.follows.forEach { follow ->
        val card = FamilyRules.card(follow, now, local)
        val maps = elderMaps(follow, zoneOf(follow))
        pushMap(
          followToJs(follow).apply {
            follow.heardAt?.let { putDouble("heardAt", FamilyRules.wallClock(it, zoneOf(follow), local).toDouble()) }
              ?: putNull("heardAt")
            putBoolean("silent", card.silent)
            putBoolean("abandoned", card.abandoned)
            putBoolean("otherZone", card.otherZone)
            putMap(
              "tally",
              Arguments.createMap().apply {
                putInt("taken", card.tally.taken)
                putInt("skipped", card.tally.skipped)
                putInt("missed", card.tally.missed)
                putInt("notReported", card.tally.notReported)
                putInt("later", card.tally.later)
              },
            )
            putArray("refills", Arguments.createArray().apply { card.refills.forEach { pushMap(maps.refill(it)) } })
          },
        )
      }
    }
  }

  /** After a fresh read: her times may have changed, and her counts may have run low. */
  private fun afterRefresh() {
    FamilyChecks.scheduleNext(reactApplicationContext)
    FamilyChecks.pingRefills(reactApplicationContext, System.currentTimeMillis())
  }

  private fun follow(elderId: String): Follow =
    store.locked { store.loadFamily() }.follows.firstOrNull { it.elderId == elderId }
      ?: throw FamilyException(FamilyCloud.NOT_FOUND, "Not following $elderId")

  private fun zoneOf(follow: Follow): ZoneId = FamilyRules.zoneOf(follow.zone) ?: ZoneId.systemDefault()

  /** Maps for [follow]'s views: her cached photos, and instants moved onto her wall clock. */
  private fun elderMaps(follow: Follow, zone: ZoneId): JsMaps {
    val dir = FamilyRefresh.photoDir(reactApplicationContext, follow.elderId)
    val local = ZoneId.systemDefault()
    return JsMaps(
      photoUri = { name -> File(dir, name).takeIf { it.exists() }?.let { Uri.fromFile(it).toString() } },
      shift = { FamilyRules.wallClock(it, zone, local) },
    )
  }

  /** A request to follow an elder, waiting for her answer: its last [status], from a listener. */
  private class Ask(val expiresAt: Long) {
    var listener: ListenerRegistration? = null
    var retryAt = 0L
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
    private const val RETRY_MS = 10_000L
    private const val SENT_PHOTO_PX = 1024
    private const val SENT_PHOTO_QUALITY = 80
  }
}
