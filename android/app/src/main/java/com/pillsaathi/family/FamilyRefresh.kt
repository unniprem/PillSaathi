package com.pillsaathi.family

import android.content.Context
import android.util.Log
import com.pillsaathi.alarm.AlarmStore
import java.io.File
import java.time.LocalDate
import java.time.ZoneOffset

/**
 * Reads each followed elder's latest copy into `family.json`: her doc, her today's and
 * yesterday's records, and photos whose file changed. A follow whose read the rules refuse (she
 * removed him, or her copy is gone) is dropped with its ping memory. Main process, worker thread.
 */
object FamilyRefresh {
  /** Reads every elder. Returns false when offline: what was read by then is still saved. */
  fun run(context: Context): Boolean {
    val store = AlarmStore(context)
    // A phone that follows no one never starts Firebase here (Today asks on every focus).
    val follows = store.locked { store.loadFamily() }.follows
    if (follows.isEmpty()) return true
    val cloud = FamilyCloud.get(context)
    // Signed out, every read would be refused; that says nothing about her.
    if (cloud.relative() == null) return true
    val read = mutableMapOf<String, Follow?>()
    try {
      for (follow in follows) {
        read[follow.elderId] = try {
          readOne(context, cloud, follow)
        } catch (e: FamilyException) {
          if (e.code != FamilyCloud.PERMISSION && e.code != FamilyCloud.NOT_FOUND) throw e
          Log.i(FAMILY_TAG, "Can't read ${follow.elderId} any more; dropping the follow")
          null
        }
      }
    } catch (e: FamilyException) {
      Log.w(FAMILY_TAG, "Refresh stopped (${e.code})", e)
      save(context, read)
      return false
    }
    save(context, read)
    return true
  }

  /** Where [elderId]'s photo copies are cached. */
  fun photoDir(context: Context, elderId: String): File = File(context.cacheDir, "family/$elderId")

  private fun readOne(context: Context, cloud: FamilyCloud, follow: Follow): Follow? {
    val elder = cloud.readFollowedElder(follow.elderId) ?: return null
    val today = LocalDate.now(FamilyRules.zoneOf(elder.zone) ?: ZoneOffset.UTC)
    val days = setOf(today, today.minusDays(1))
    val records = days.map(FamilyRules::monthKey).toSet()
      .flatMap { cloud.readFollowedMonth(follow.elderId, it) }
      .filter { it.date in days }
    val refreshed = FamilyRules.afterRefresh(follow, elder, records, cloud.relativeUid()) ?: return null
    return refreshed.copy(photos = photos(context, cloud, refreshed))
  }

  /** The cached photo file of each of her pills, downloading those whose file changed. */
  private fun photos(context: Context, cloud: FamilyCloud, follow: Follow): Map<String, String> {
    val dir = photoDir(context, follow.elderId)
    val wanted = follow.pills.mapNotNull { p -> p.photo?.let { p.id to it } }.toMap()
    val cached = follow.photos.filter { (id, name) -> wanted[id] == name && File(dir, name).exists() }.toMutableMap()
    for ((id, name) in wanted - cached.keys) {
      val (stored, jpeg) = cloud.readFollowedPhoto(follow.elderId, id) ?: continue
      // Her phone hasn't uploaded the new one yet.
      if (stored != name) continue
      dir.mkdirs()
      File(dir, name).writeBytes(jpeg)
      cached[id] = name
    }
    dir.listFiles()?.filter { it.name !in cached.values }?.forEach { it.delete() }
    return cached
  }

  /** Saves [read] over the follows as they are now: his own settings stay, hers are replaced. */
  private fun save(context: Context, read: Map<String, Follow?>) {
    if (read.isEmpty()) return
    val store = AlarmStore(context)
    store.locked {
      var local = store.loadFamily()
      for ((elderId, fresh) in read) {
        local = if (fresh == null) {
          photoDir(context, elderId).deleteRecursively()
          FamilyRules.withoutFollow(local, elderId)
        } else {
          local.copy(
            follows = local.follows.map {
              if (it.elderId != elderId) {
                it
              } else {
                it.copy(
                  zone = fresh.zone, heardAt = fresh.heardAt, oldest = fresh.oldest, pills = fresh.pills,
                  recent = fresh.recent, photos = fresh.photos,
                )
              }
            },
          )
        }
      }
      store.saveFamily(local)
    }
  }
}
