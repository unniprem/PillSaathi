package com.pillsaathi.family

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.util.Log
import com.pillsaathi.alarm.AlarmStore
import com.pillsaathi.alarm.RefillWarning
import java.time.LocalDate
import java.time.ZoneId

/**
 * The relative's checks: after each of an elder's dose times plus his delay, a silent exact
 * wake-up reads her latest copy and pings when the dose wasn't taken. Never an alarm clock, never
 * a ring. Main process, worker thread.
 */
object FamilyChecks {
  private const val FLAGS = PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT

  /** Sets one wake-up for the next check of any follow, or cancels it when there is none. */
  fun scheduleNext(context: Context) {
    val store = AlarmStore(context)
    val next = FamilyRules.nextCheckAt(store.locked { store.loadFamily() }.follows, System.currentTimeMillis())
    val alarms = context.getSystemService(AlarmManager::class.java)
    val wake = PendingIntent.getBroadcast(context, 0, Intent(context, CheckAlarmReceiver::class.java), FLAGS)
    if (next == null) {
      alarms.cancel(wake)
      Log.i(FAMILY_TAG, "No family checks to schedule")
      return
    }
    try {
      alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next, wake)
    } catch (e: SecurityException) {
      // Exact alarms were taken away; a check a little late beats none.
      Log.w(FAMILY_TAG, "Exact alarms not allowed; the next check may run late", e)
      alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next, wake)
    }
    Log.i(FAMILY_TAG, "Next family check at $next")
  }

  /**
   * Runs every check due by [now]: reads each elder afresh ([FamilyRefresh]), so a dose time she
   * no longer has never pings, then decides each check in time order. A ping's key is saved before
   * it is posted, so a check that runs twice pings once. Returns false when Firestore couldn't be
   * reached; nothing moves then, and a retry within [FamilyRules.RETRY_WINDOW_MS] still pings.
   */
  fun run(context: Context, now: Long): Boolean {
    val store = AlarmStore(context)
    val cloud = FamilyCloud.get(context)
    if (cloud.isSetUp() && cloud.relative() != null) {
      if (!FamilyRefresh.run(context)) return false
      val local = store.locked { store.loadFamily() }
      val after = local.checkedThrough ?: now
      for (follow in local.follows) {
        FamilyRules.checksBetween(follow, after, now).forEach { check(context, store, follow, it, now) }
      }
      pingRefills(context, now)
    }
    store.locked {
      val l = store.loadFamily()
      val today = LocalDate.now(ZoneId.systemDefault())
      store.saveFamily(l.copy(checkedThrough = now, pinged = FamilyRules.prunePinged(l.pinged, today)))
    }
    scheduleNext(context)
    return true
  }

  /** Posts any refill pings due for the elders as last read, once per pill per level. */
  fun pingRefills(context: Context, now: Long) {
    val store = AlarmStore(context)
    val posts = store.locked {
      val local = store.loadFamily()
      var sent = local.refillPinged
      val posts = mutableListOf<Pair<Follow, RefillWarning>>()
      for (follow in local.follows) {
        val zone = FamilyRules.zoneOf(follow.zone) ?: continue
        val (pings, next) = FamilyRules.refillPings(follow.elderId, follow.pills, sent, now, zone)
        sent = next
        pings.forEach { posts.add(follow to it) }
      }
      // Saved before posting, so a second run posts none.
      if (sent != local.refillPinged) store.saveFamily(local.copy(refillPinged = sent))
      posts
    }
    posts.forEach { (follow, w) -> FamilyNotifications.postRefill(context, follow, w) }
  }

  private fun check(context: Context, store: AlarmStore, follow: Follow, item: CheckItem, now: Long) {
    val elder = ElderDoc(follow.zone ?: "UTC", follow.heardAt, follow.oldest, follow.pills, emptyList(), emptyMap())
    val decision = store.locked {
      val local = store.loadFamily()
      val decision = FamilyRules.decide(item, elder, follow.recent, local, now)
      val key = FamilyRules.pingKey(item)
      when (decision) {
        is CheckDecision.Missed, is CheckDecision.NotReported -> store.saveFamily(local.copy(pinged = local.pinged + key))
        is CheckDecision.Silent ->
          store.saveFamily(
            local.copy(pinged = local.pinged + key, silentWarned = local.silentWarned + (item.elderId to decision.heardAt)),
          )
        else -> {}
      }
      decision
    }
    Log.i(FAMILY_TAG, "Check ${FamilyRules.pingKey(item)}: $decision")
    when (decision) {
      is CheckDecision.Missed -> FamilyNotifications.postMissed(context, follow, item, decision.names)
      is CheckDecision.NotReported -> FamilyNotifications.postNotReported(context, follow, item, decision.names, decision.heardAt)
      is CheckDecision.Silent -> FamilyNotifications.postSilent(context, follow, decision.heardAt)
      else -> {}
    }
  }
}
