package com.pillsaathi.family

import com.pillsaathi.alarm.Alarm
import com.pillsaathi.alarm.DoseOutcome
import com.pillsaathi.alarm.DoseRecord
import com.pillsaathi.alarm.DoseRules
import com.pillsaathi.alarm.DoseStatus
import com.pillsaathi.alarm.DoseTime
import com.pillsaathi.alarm.Pill
import com.pillsaathi.alarm.RefillLevel
import com.pillsaathi.alarm.RefillRules
import com.pillsaathi.alarm.RefillWarning
import com.pillsaathi.alarm.Today
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime
import java.util.Random

/**
 * Every Family decision, pure: link codes, which months to upload, when the relative's phone
 * checks a dose, whether a check pings, and refill pings. Times for an elder are always worked out
 * in her zone, never the relative's.
 */
object FamilyRules {
  /** A link code works for 15 minutes. */
  const val CODE_TTL_MS = 900_000L

  /** After 12 hours without a word from her phone, per-dose pings give way to one warning. */
  const val SILENT_AFTER_MS = 43_200_000L

  /** After 30 days of silence any follower may delete her online copy. */
  const val ABANDONED_AFTER_MS = 2_592_000_000L

  /** A check that couldn't run (no internet) is retried for up to 3 hours, then dropped. */
  const val RETRY_WINDOW_MS = 10_800_000L

  /** The ping delays offered, in minutes; null is Off. */
  val DELAYS = listOf(15, 30, 60)
  const val DEFAULT_DELAY = 30

  private const val QR_PREFIX = "PILLSAATHI:"
  private const val LOOK_AHEAD_MS = 48 * 3_600_000L

  /** 6 random digits, zero-padded. */
  fun newCode(random: Random): String = "%06d".format(random.nextInt(1_000_000))

  /** The 6 digits in [text], typed with spaces or scanned as [qrText]; null when it isn't a code. */
  fun parseCode(text: String): String? {
    val digits = text.trim().removePrefix(QR_PREFIX).filterNot { it.isWhitespace() }
    return digits.takeIf { it.length == 6 && it.all { c -> c in '0'..'9' } }
  }

  fun qrText(code: String): String = "$QR_PREFIX$code"

  /** "2026-10": the month document a record on [date] belongs in. */
  fun monthKey(date: LocalDate): String = "%04d-%02d".format(date.year, date.monthValue)

  fun byMonth(records: List<DoseRecord>): Map<String, List<DoseRecord>> = records.groupBy { monthKey(it.date) }

  /**
   * Which months to write (new or changed hash) and which to delete (uploaded but no longer kept),
   * from the [current] hashes by month and the [uploaded] ones.
   */
  fun monthsToWrite(current: Map<String, String>, uploaded: Map<String, String>): Pair<Set<String>, Set<String>> =
    current.filter { (k, v) -> uploaded[k] != v }.keys to (uploaded.keys - current.keys)

  /**
   * The checks of [follow]'s doses whose check time is after [after] and no later than [through],
   * by check time: each time a pill is due on a date in her zone, plus his delay. A dose keeps its
   * own date even when the check falls after midnight. None when his pings are Off.
   */
  fun checksBetween(follow: Follow, after: Long, through: Long): List<CheckItem> {
    val delay = follow.delayMinutes ?: return emptyList()
    val zone = zoneOf(follow.zone) ?: return emptyList()
    val times = follow.pills.flatMap { it.times }.toSortedSet()
    var date = dateOf(after, zone).minusDays(1)
    val last = dateOf(through, zone)
    val items = mutableListOf<CheckItem>()
    while (!date.isAfter(last)) {
      for (t in times) {
        if (DoseRules.pillsDue(follow.pills, t.hour, t.minute, date).isEmpty()) continue
        val checkAt = at(date, t, zone) + delay * 60_000L
        if (checkAt in (after + 1)..through) items.add(CheckItem(follow.elderId, date, t.hour, t.minute, checkAt))
      }
      date = date.plusDays(1)
    }
    return items.sortedBy { it.checkAt }
  }

  /** The earliest check of any of [follows] after [now], looking up to 48 hours ahead, or null. */
  fun nextCheckAt(follows: List<Follow>, now: Long): Long? =
    follows.mapNotNull { checksBetween(it, now, now + LOOK_AHEAD_MS).firstOrNull()?.checkAt }.minOrNull()

  /** Names a ping for [item], so one dose pings once: "elderId|2026-10-28|14:0". */
  fun pingKey(item: CheckItem): String = "${item.elderId}|${item.date}|${item.hour}:${item.minute}"

  /**
   * What the check of [item] says, from [elder]'s doc and her [records] for that date. A ping says
   * only what is known: a missed record is "hasn't taken", no record is "hasn't reported", and a
   * phone silent for [SILENT_AFTER_MS] gets one warning instead of a ping per dose.
   */
  fun decide(item: CheckItem, elder: ElderDoc, records: List<DoseRecord>, local: FamilyLocal, now: Long): CheckDecision {
    if (pingKey(item) in local.pinged) return CheckDecision.None
    val due = DoseRules.pillsDue(elder.pills, item.hour, item.minute, item.date)
    if (due.isEmpty()) return CheckDecision.NoLongerDue
    if (now > item.checkAt + RETRY_WINDOW_MS) return CheckDecision.Expired
    val record = DoseRules.recordOf(records, item.date, item.hour, item.minute)
    if (record != null) {
      return when (record.outcome) {
        DoseOutcome.TAKEN, DoseOutcome.SKIPPED -> CheckDecision.None
        DoseOutcome.MISSED -> CheckDecision.Missed(record.pills.joinToString(", ") { it.name })
      }
    }
    val heardAt = elder.heardAt
    val names = due.joinToString(", ") { it.name }
    if (heardAt == null) return CheckDecision.NotReported(names, null)
    if (now - heardAt >= SILENT_AFTER_MS) {
      return if (local.silentWarned[item.elderId] == heardAt) CheckDecision.None else CheckDecision.Silent(heardAt)
    }
    return CheckDecision.NotReported(names, heardAt)
  }

  /**
   * The refill pings due for [elderId]'s [pills], at most one per pill per level, and the levels
   * sent after them (keys "elderId|pillId"). A level that drops back, or a pill with no warning
   * now (her count went back up) or gone, is forgotten, so a later warning pings again. Keys of
   * other elders stay.
   */
  fun refillPings(
    elderId: String,
    pills: List<Pill>,
    sent: Map<String, RefillLevel>,
    now: Long,
    zone: ZoneId,
  ): Pair<List<RefillWarning>, Map<String, RefillLevel>> {
    val prefix = "$elderId|"
    val next = sent.filterKeys { !it.startsWith(prefix) }.toMutableMap()
    val pings = mutableListOf<RefillWarning>()
    for (warning in RefillRules.warnings(pills, now, zone)) {
      val key = prefix + warning.pillId
      val before = sent[key]
      if (before == null || warning.level > before) pings.add(warning)
      next[key] = warning.level
    }
    return pings to next
  }

  /** [pinged] without keys older than yesterday ([today] is the relative's). */
  fun prunePinged(pinged: Set<String>, today: LocalDate): Set<String> {
    val yesterday = today.minusDays(1)
    return pinged.filterTo(mutableSetOf()) { key ->
      val date = key.split('|').getOrNull(1)?.let { runCatching { LocalDate.parse(it) }.getOrNull() }
      date != null && !date.isBefore(yesterday)
    }
  }

  /**
   * Her today on the relative's phone, from her uploaded [pills] and [records], in her [zone], with
   * the same card rules her phone uses. Each time gets a stand-in card: coming up when a pill is due
   * later today, next on the day a pill is next due, else done. A time due today that has passed
   * with no record is "not reported": her phone may still be ringing, snoozed or offline, so it is
   * never shown as taken.
   */
  fun elderToday(pills: List<Pill>, records: List<DoseRecord>, now: Long, zone: ZoneId): Today {
    val today = dateOf(now, zone)
    val times = pills.filter { DoseRules.isActive(it, today) }.flatMap { it.times }.toSortedSet()
    val cards = times.map { t ->
      Alarm(
        "t${t.hour}${t.minute}", t.hour, t.minute, DoseRules.EVERY_DAY, "", null, true,
        nextDue(pills, t, today, now, zone), null, null, 0L,
      )
    }
    val todayCards = DoseRules.todayCards(cards, pills, records, emptySet(), now, zone).map { card ->
      val passed = at(today, DoseTime(card.hour, card.minute), zone) <= now
      val dueToday = DoseRules.pillsDue(pills, card.hour, card.minute, today).isNotEmpty()
      if (card.status == DoseStatus.DONE && passed && dueToday) card.copy(status = DoseStatus.NOT_REPORTED) else card
    }
    return Today(today, todayCards, RefillRules.warnings(pills, now, zone))
  }

  /**
   * Her day in numbers. Later counts only what is still to come today, so a pill that starts
   * tomorrow never makes the day look unfinished.
   */
  fun tally(today: Today): Tally {
    fun count(s: DoseStatus) = today.cards.count { it.status == s }
    return Tally(
      count(DoseStatus.TAKEN), count(DoseStatus.SKIPPED), count(DoseStatus.MISSED), count(DoseStatus.NOT_REPORTED),
      count(DoseStatus.UPCOMING),
    )
  }

  /** [follow]'s card from its last read copy. [localZone] is the relative's, to tell him her times differ. */
  fun card(follow: Follow, now: Long, localZone: ZoneId): FamilyCardData {
    val zone = zoneOf(follow.zone) ?: localZone
    val today = elderToday(follow.pills, follow.recent, now, zone)
    val heardAt = follow.heardAt
    val instant = Instant.ofEpochMilli(now)
    return FamilyCardData(
      follow = follow,
      tally = tally(today),
      silent = heardAt != null && now - heardAt >= SILENT_AFTER_MS,
      abandoned = isAbandoned(heardAt, now),
      otherZone = zone.rules.getOffset(instant) != localZone.rules.getOffset(instant),
      refills = today.refills,
    )
  }

  /**
   * [follow] after reading her doc and [recent] records: his own name, number and delay stay, the
   * copy of hers is replaced. Null when the read was refused or the doc is gone, so the follow goes.
   */
  fun afterRefresh(follow: Follow, elder: ElderDoc?, recent: List<DoseRecord>): Follow? =
    elder?.let {
      follow.copy(zone = it.zone, heardAt = it.heardAt, oldest = it.oldest, pills = it.pills, recent = recent)
    }

  /**
   * The instant whose wall clock in [localZone] reads what [millis] reads in [elderZone], so a
   * screen that formats times in the phone's zone shows her times.
   */
  fun wallClock(millis: Long, elderZone: ZoneId, localZone: ZoneId): Long =
    LocalDateTime.ofInstant(Instant.ofEpochMilli(millis), elderZone).atZone(localZone).toInstant().toEpochMilli()

  /** Whether her phone has been silent long enough that a follower may delete her copy. */
  fun isAbandoned(heardAt: Long?, now: Long): Boolean = heardAt != null && now - heardAt >= ABANDONED_AFTER_MS

  /** A photo's small copy: [width] × [height] scaled so the longest side is at most [max]. */
  fun thumbSize(width: Int, height: Int, max: Int = 256): Pair<Int, Int> {
    val longest = maxOf(width, height)
    if (longest <= max) return width to height
    return Math.round(width * max.toDouble() / longest).toInt() to Math.round(height * max.toDouble() / longest).toInt()
  }

  /** Whether this phone uploads its pills: only once someone can see them. */
  fun uploads(local: FamilyLocal): Boolean = local.sharing

  /** When a pill is next due at [t]: today's time if still to come, else the next day one is due, else null. */
  private fun nextDue(pills: List<Pill>, t: DoseTime, today: LocalDate, now: Long, zone: ZoneId): Long? {
    val todayAt = at(today, t, zone)
    if (DoseRules.pillsDue(pills, t.hour, t.minute, today).isNotEmpty()) return todayAt.takeIf { it > now }
    val next = pills.filter { t in it.times }.mapNotNull { p ->
      val from = maxOf(p.startDate, today.plusDays(1))
      from.takeIf { DoseRules.isDueOn(p, it) }
    }.minOrNull()
    return next?.let { at(it, t, zone) }
  }

  internal fun zoneOf(id: String?): ZoneId? = id?.let { runCatching { ZoneId.of(it) }.getOrNull() }

  private fun dateOf(millis: Long, zone: ZoneId): LocalDate = Instant.ofEpochMilli(millis).atZone(zone).toLocalDate()

  private fun at(date: LocalDate, time: DoseTime, zone: ZoneId): Long =
    ZonedDateTime.of(date, LocalTime.of(time.hour, time.minute), zone).toInstant().toEpochMilli()
}
