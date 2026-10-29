package com.pillsaathi.family

import android.content.Context
import android.util.Log
import com.pillsaathi.alarm.Alarm
import com.pillsaathi.alarm.AlarmStore
import com.pillsaathi.alarm.Sound
import com.pillsaathi.bridge.HealthChecker
import java.io.File
import java.time.ZoneId

/**
 * Uploads the elder's copy: her pills, her records by month and small photo copies, sending only
 * what changed since the last upload, plus the "last heard from" time on every run (the heartbeat).
 * Runs only while someone can see her pills. When her last follower has gone, it deletes the copy
 * and stops sharing. Main process, worker thread; throws [FamilyException].
 */
object ElderSync {
  /**
   * Held by every upload, by turning sharing on (Allow) and by deleting the copy (Remove), so one
   * never runs halfway through another and leaves records online with no one to see them.
   */
  val lock = Any()

  fun run(context: Context) = synchronized(lock) { upload(context) }

  private fun upload(context: Context) {
    val store = AlarmStore(context)
    if (!FamilyRules.uploads(store.locked { store.loadFamily() })) return
    val cloud = FamilyCloud.get(context)
    val uid = cloud.elderUid()
    val (pills, records) = store.locked { store.loadPills() to store.loadDoses() }
    val elder = cloud.readElder(uid)
    if (elder == null || elder.followers.isEmpty()) {
      Log.i(FAMILY_TAG, "No one follows this phone any more; deleting its online copy")
      stopSharing(context, uid)
      return
    }
    store.locked { store.saveFamily(store.loadFamily().copy(editors = elder.editors)) }
    val (cards, sounds) = store.locked { cardSounds(store.loadAlarms(), store.loadSounds()) }
    cloud.writeElder(
      uid, ZoneId.systemDefault().id, records.minOfOrNull { it.date }?.toString(), pills, cards, sounds, health(context, store),
    )
    val last = store.locked { store.loadFamily() }.uploaded
    var done = if (last.elder == uid) last else Uploaded(uid)
    try {
      val byMonth = FamilyRules.byMonth(records)
      val hashes = byMonth.mapValues { FamilyJson.monthHash(it.value) }
      val (write, delete) = FamilyRules.monthsToWrite(hashes, done.months)
      write.sorted().forEach { key ->
        cloud.writeMonth(uid, key, byMonth.getValue(key))
        done = done.copy(months = done.months + (key to hashes.getValue(key)))
      }
      delete.forEach { key ->
        cloud.deleteMonth(uid, key)
        done = done.copy(months = done.months - key)
      }
      val photos = pills.mapNotNull { p -> p.photo?.let { p.id to it } }.toMap()
      photos.filter { (id, name) -> done.photos[id] != name }.forEach { (id, name) ->
        val jpeg = Thumbnails.jpeg(File(store.photosDir, name)) ?: return@forEach
        cloud.writePhoto(uid, id, name, jpeg)
        done = done.copy(photos = done.photos + (id to name))
      }
      (done.photos.keys - photos.keys).forEach { id ->
        cloud.deletePhoto(uid, id)
        done = done.copy(photos = done.photos - id)
      }
    } finally {
      // Whatever got there is remembered, so a retry sends only the rest.
      val uploaded = done
      store.locked { store.saveFamily(store.loadFamily().copy(uploaded = uploaded)) }
    }
    Log.i(FAMILY_TAG, "Uploaded ${pills.size} pills and ${done.months.size} months")
  }

  /** Her enabled cards with their sounds' names, and her sounds by name. */
  private fun cardSounds(alarms: List<Alarm>, sounds: List<Sound>): Pair<List<CardSound>, List<SoundRef>> {
    val byId = sounds.associateBy { it.id }
    val cards = alarms.filter { it.enabled }.sortedWith(compareBy({ it.hour }, { it.minute })).map {
      val sound = it.soundId?.let(byId::get)
      CardSound(it.hour, it.minute, sound?.id, sound?.name)
    }
    return cards to sounds.map { SoundRef(it.id, it.name) }
  }

  /** Whether this phone can ring alarms, as her Today banner checks it. */
  private fun health(context: Context, store: AlarmStore): ElderHealth {
    val h = HealthChecker(context).check()
    return ElderHealth(
      notifications = h.notificationsEnabled,
      alarmChannel = h.alarmChannelEnabled,
      exactAlarms = h.exactAlarmAllowed,
      fullScreen = h.fullScreenAllowed,
      battery = h.ignoringBatteryOptimizations,
      unrestricted = !h.backgroundRestricted,
      setupSeen = store.locked { store.loadSetup() }.seen,
    )
  }

  /** Deletes this phone's online copy and stops uploading, as when its last follower goes. */
  fun stopSharing(context: Context, uid: String) = synchronized(lock) {
    FamilyCloud.get(context).deleteElderCopy(uid)
    val store = AlarmStore(context)
    store.locked { store.saveFamily(store.loadFamily().copy(sharing = false, uploaded = Uploaded())) }
    FamilyWork.cancelHeartbeat(context)
  }
}
