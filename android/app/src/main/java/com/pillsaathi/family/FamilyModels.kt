package com.pillsaathi.family

import com.pillsaathi.alarm.DoseRecord
import com.pillsaathi.alarm.Pill
import com.pillsaathi.alarm.RefillLevel
import com.pillsaathi.alarm.RefillWarning
import java.time.LocalDate

/**
 * What the elder's phone last uploaded: the [elder] id it uploaded under, each month's hash by
 * "YYYY-MM", and each photo's file name by pill id. A different id (a new anonymous identity)
 * means nothing is uploaded there yet.
 */
data class Uploaded(
  val elder: String? = null,
  val months: Map<String, String> = emptyMap(),
  val photos: Map<String, String> = emptyMap(),
)

/**
 * An elder this phone looks after. [name], [phone] and [delayMinutes] (null = Off) are the
 * relative's own and never go online. The rest is her last read copy: her [zone], when her phone
 * was last heard from, her oldest record, her pills, her [recent] records (her today and
 * yesterday), and the cached photo file name by pill id. [since] is when the link was saved, so
 * no ping is ever sent for a dose before it.
 */
data class Follow(
  val elderId: String,
  val name: String,
  val phone: String?,
  val delayMinutes: Int?,
  val zone: String? = null,
  val heardAt: Long? = null,
  val oldest: String? = null,
  val pills: List<Pill> = emptyList(),
  val recent: List<DoseRecord> = emptyList(),
  val photos: Map<String, String> = emptyMap(),
  val since: Long? = null,
)

/**
 * Everything Family keeps on this phone (`family.json`). [sharing] is true once someone can see
 * this phone's pills. As a relative: the [follows], how far the checks have run, the pings
 * already sent ([pinged] by ping key, [refillPinged] by "elderId|pillId"), and the heard-from
 * time each silent elder was warned about.
 */
data class FamilyLocal(
  val sharing: Boolean = false,
  val uploaded: Uploaded = Uploaded(),
  val follows: List<Follow> = emptyList(),
  val checkedThrough: Long? = null,
  val pinged: Set<String> = emptySet(),
  val refillPinged: Map<String, RefillLevel> = emptyMap(),
  val silentWarned: Map<String, Long> = emptyMap(),
)

/** A relative who can see an elder's pills, as their Google account names them. */
data class Person(val name: String, val email: String)

/** An elder's online document, as a relative or the elder reads it. */
data class ElderDoc(
  val zone: String,
  val heardAt: Long?,
  val oldest: String?,
  val pills: List<Pill>,
  val followers: List<String>,
  val people: Map<String, Person>,
)

/** One check of an elder's dose at [date] [hour]:[minute], her time, due to run at [checkAt]. */
data class CheckItem(val elderId: String, val date: LocalDate, val hour: Int, val minute: Int, val checkAt: Long)

/** What a check found ([FamilyRules.decide]). Only [Missed], [NotReported] and [Silent] ping. */
sealed interface CheckDecision {
  /** Nothing to say: taken, skipped, already pinged, or a silence already warned about. */
  data object None : CheckDecision

  /** She no longer has a pill due at that time. */
  data object NoLongerDue : CheckDecision

  /** Too late to be worth a ping. */
  data object Expired : CheckDecision

  data class Missed(val names: String) : CheckDecision

  /** No record yet; [heardAt] is when her phone was last heard from, if ever. */
  data class NotReported(val names: String, val heardAt: Long?) : CheckDecision

  /** Her phone has been silent since [heardAt]. */
  data class Silent(val heardAt: Long) : CheckDecision
}

/** An elder's day in numbers; [later] counts doses still to come today. */
data class Tally(val taken: Int, val skipped: Int, val missed: Int, val notReported: Int, val later: Int)

/** One elder's card in Today's Family section. */
data class FamilyCardData(
  val follow: Follow,
  val tally: Tally,
  val silent: Boolean,
  val abandoned: Boolean,
  val otherZone: Boolean,
  val refills: List<RefillWarning>,
)
