package com.pillsaathi.alarm

import android.content.Context
import android.content.pm.ApplicationInfo
import android.util.Log
import com.pillsaathi.R
import java.io.File
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.Locale
import java.util.UUID

internal const val LOG_TAG = "PillSaathiAlarm"

enum class ReconcileTrigger { BOOT, CLOCK_CHANGED, APP_OPEN, PERMISSION_CHANGED, RECOVERY }

/**
 * The one entry point for changing pills, time cards (alarms) and dose records. Receivers, the
 * ringing service and the React Native modules all go through it, so every change is persisted and
 * rescheduled under the store lock.
 *
 * Pills drive the cards: after every pill change, reconcile and ring end, housekeeping
 * ([DoseRules.planCards]) makes one card per time the pills need and removes the rest.
 *
 * Two kinds of caller, two rules for a failed write ([StorageException]):
 * - A user's change ([savePill], [deletePill], [setCardSound], [markTaken], [clearSound]) is
 *   written first and scheduled only after, and a failed write is thrown, so the app never reports
 *   a change it didn't keep.
 * - The ringing path ([onFired], [onQueuedRingStarted], [onRingEnded], [onSnoozed], [reconcile])
 *   logs a failed write and schedules and rings anyway. Ringing comes first; the next reconcile
 *   repairs the lost bookkeeping.
 */
class AlarmEngine private constructor(context: Context) {
  private val context: Context = context.applicationContext
  val store = AlarmStore(this.context)
  private val scheduler = AlarmScheduler(this.context)

  fun alarms(): List<Alarm> = store.locked { store.loadAlarms() }

  fun pills(): List<Pill> = store.locked { store.loadPills() }

  /**
   * Adds a pill ([PillDraft.id] null) or edits one, then runs housekeeping. A new pill starts today,
   * or tomorrow when asked; an edit keeps its start date. The draft's photo is kept only if its file
   * exists, and a photo it replaces is deleted. Throws [NoSuchElementException] for an unknown id
   * and [StorageException] when either write fails.
   */
  fun savePill(draft: PillDraft): Pill {
    val (pill, removed) = store.locked {
      val now = System.currentTimeMillis()
      val pills = store.loadPills()
      val existing = draft.id?.let { id ->
        pills.firstOrNull { it.id == id } ?: throw NoSuchElementException("No pill $id")
      }
      val photo = draft.photo?.takeIf { name ->
        File(store.photosDir, name).exists().also {
          if (!it) Log.w(LOG_TAG, "Photo $name is gone; saving the pill without one")
        }
      }
      val pill =
        existing?.copy(
          name = draft.name,
          form = draft.form,
          amount = draft.amount,
          times = draft.times,
          days = draft.days,
          photo = photo,
        )
          ?: Pill(
            id = UUID.randomUUID().toString(),
            name = draft.name,
            form = draft.form,
            amount = draft.amount,
            times = draft.times,
            startDate = dateOf(now).plusDays(if (draft.startsTomorrow) 1L else 0L),
            days = draft.days,
            createdAt = now,
            photo = photo,
          )
      val saved = if (existing == null) pills + pill else pills.map { if (it.id == pill.id) pill else it }
      store.savePills(saved)
      existing?.photo?.takeIf { it != photo }?.let { deletePhotoUnlessUsed(it, saved) }
      pill to syncCards(now)
    }
    stopRings(removed)
    return pill
  }

  /**
   * Deletes pill [id] and its photo, then runs housekeeping: a card left with no pills goes, ring
   * and all.
   */
  fun deletePill(id: String) {
    val removed = store.locked {
      val pills = store.loadPills()
      val left = pills.filterNot { it.id == id }
      store.savePills(left)
      pills.firstOrNull { it.id == id }?.photo?.let { deletePhotoUnlessUsed(it, left) }
      syncCards(System.currentTimeMillis())
    }
    stopRings(removed)
  }

  /**
   * Deletes photos no pill uses once they are a day old ([PhotoRules.orphans]): photos picked for
   * a pill page that was then left without saving, for example.
   */
  fun cleanUpPhotos(now: Long) {
    store.locked {
      val used = store.loadPills().mapNotNull { it.photo }.toSet()
      val dir = store.photosDir
      val files = dir.listFiles().orEmpty().filter { it.isFile }.map { it.name to it.lastModified() }
      PhotoRules.orphans(files, used, now).forEach { name ->
        if (File(dir, name).delete()) Log.i(LOG_TAG, "Deleted unused photo $name")
        else Log.w(LOG_TAG, "Could not delete unused photo $name")
      }
    }
  }

  /** Sets card [alarmId]'s sound; null is the default alarm tone. */
  fun setCardSound(alarmId: String, soundId: String?) {
    store.locked {
      val alarms = store.loadAlarms()
      val card = alarms.firstOrNull { it.id == alarmId } ?: throw NoSuchElementException("No card $alarmId")
      store.saveAlarms(alarms.replace(card.copy(soundId = soundId)))
    }
  }

  /** Marks the recorded dose at [date] [hour]:[minute] taken now. */
  fun markTaken(date: LocalDate, hour: Int, minute: Int) {
    store.locked {
      val updated =
        DoseRules.markedTaken(store.loadDoses(), date, hour, minute, System.currentTimeMillis())
          ?: throw NoSuchElementException("No dose on $date at $hour:$minute")
      store.saveDoses(updated)
    }
  }

  /** The Today screen: today's cards with their pills and statuses. */
  fun today(): Today = store.locked {
    val now = System.currentTimeMillis()
    val cards = DoseRules.todayCards(
      store.loadAlarms(),
      store.loadPills(),
      store.loadDoses(),
      AlarmRules.ownedIds(ringingMarker(), now),
      now,
      zone(),
    )
    Today(dateOf(now), cards)
  }

  /**
   * Repairs the schedule ([AlarmRules.reconcile]), reschedules every card, records each missed dose
   * and runs housekeeping. Alarms that the `:ringing` process is ringing or has queued, as its fresh
   * marker says, are left alone: their time has passed, but they are not missed. A missed card with
   * no pill due at that occurrence is dropped: nothing was missed. The rest are named after the
   * pills they covered.
   */
  fun reconcile(trigger: ReconcileTrigger): List<MissedAlarm> {
    val (missed, removed) = store.locked {
      val now = System.currentTimeMillis()
      val owned = AlarmRules.ownedIds(ringingMarker(), now)
      val result = AlarmRules.reconcile(store.loadAlarms(), now, zone(), owned)
      Log.i(
        LOG_TAG,
        "Reconcile ($trigger): ${owned.size} ringing or queued, ${result.missed.size} missed",
      )
      bestEffort("the reconciled alarms") { store.saveAlarms(result.alarms) }
      result.alarms.forEach { scheduler.sync(it) }
      val missedDoses = mutableListOf<MissedAlarm>()
      bestEffort("the missed doses") {
        val pills = store.loadPills()
        var doses = store.loadDoses()
        result.missed.forEach { m ->
          val alarm = result.alarms.first { it.id == m.id }
          val record = DoseRules.doseRecord(alarm, pills, m.dueAt, DoseOutcome.MISSED, now, zone())
          if (record == null) {
            Log.i(LOG_TAG, "Missed ${m.id}: nothing was due, not recorded")
            return@forEach
          }
          doses = DoseRules.withRecord(doses, record, dateOf(now))
          // A dose already taken stays taken, and isn't reported missed.
          if (stillMissed(doses, record)) missedDoses.add(m.copy(name = namesOf(record)))
        }
        if (result.missed.isNotEmpty()) store.saveDoses(doses)
      }
      missedDoses to housekeeping(now)
    }
    stopRings(removed)
    if (trigger != ReconcileTrigger.APP_OPEN) missed.forEach { Notifications.postMissed(context, it) }
    return missed
  }

  /**
   * Handles an AlarmManager delivery for [id]. Returns the alarm to ring, or null when it must not
   * ring: it is gone, the delivery is stale ([FireDecision.STALE]), or it came too late and is
   * reported as missed instead ([FireDecision.MISSED]).
   */
  fun onFired(id: String): Alarm? {
    val (ring, missed) = store.locked<Pair<Alarm?, MissedAlarm?>> {
      val alarms = store.loadAlarms()
      val alarm = alarms.firstOrNull { it.id == id }
      if (alarm == null) {
        Log.i(LOG_TAG, "Fire $id: alarm is gone")
        return@locked null to null
      }
      val now = System.currentTimeMillis()
      val decision = AlarmRules.fireDecision(alarm, now)
      Log.i(LOG_TAG, "Fire $id: $decision")
      when (decision) {
        FireDecision.STALE -> {
          scheduler.sync(alarm)
          null to null
        }
        FireDecision.MISSED -> {
          val ended = AlarmRules.ringEnded(alarm, now, zone())
          bestEffort("the missed fire of $id") { store.saveAlarms(alarms.replace(ended)) }
          scheduler.sync(ended)
          val occurrence = alarm.nextTriggerAt ?: AlarmRules.dueAt(alarm)
          val record = occurrence?.let { recordDose(alarm, it, DoseOutcome.MISSED, now) }
          housekeeping(now)
          null to record?.takeIf { it.outcome == DoseOutcome.MISSED }?.let {
            MissedAlarm(alarm.id, namesOf(it), occurrence)
          }
        }
        FireDecision.RING -> {
          if (!shouldRing(alarm, now)) {
            Log.i(LOG_TAG, "Fire $id: nothing to ring (nothing due, or already taken)")
            val ended = AlarmRules.ringEnded(alarm, now, zone())
            bestEffort("the empty fire of $id") { store.saveAlarms(alarms.replace(ended)) }
            scheduler.sync(ended)
            housekeeping(now)
            return@locked null to null
          }
          val fired = AlarmRules.fired(alarm, now)
          bestEffort("the fire of $id") { store.saveAlarms(alarms.replace(fired)) }
          scheduler.scheduleRecovery(fired.id, AlarmRules.recoveryAt(now))
          fired to null
        }
      }
    }
    missed?.let { Notifications.postMissed(context, it) }
    return ring
  }

  /**
   * Stamps queued alarm [id] as fired now, when its ring starts after waiting behind another, and
   * moves its recovery wakeup to count from now. Until then it was judged by the time it fired,
   * and reconcile would have taken it for stuck. Returns the alarm, or null if it no longer exists.
   * Rings whether or not it is still on: see [RingingService].
   */
  fun onQueuedRingStarted(id: String): Alarm? = store.locked {
    val alarms = store.loadAlarms()
    val alarm = alarms.firstOrNull { it.id == id } ?: return@locked null
    val now = System.currentTimeMillis()
    val fired = AlarmRules.fired(alarm, now)
    bestEffort("the queued start of $id") { store.saveAlarms(alarms.replace(fired)) }
    scheduler.scheduleRecovery(id, AlarmRules.recoveryAt(now))
    fired
  }

  /**
   * Records how [id]'s ring ended as a dose with [outcome], then runs housekeeping. The dose is the
   * card's occurrence, the time it was first due even if snoozed since, and lists the pills due
   * then; [dueAt] is when it was due as its fire saw it, used when the card no longer says. A missed
   * dose (auto-silenced, or a ring that ended abnormally) is also posted as a notification. The card
   * itself moves on only if it is still on: one switched off or deleted while ringing has already
   * been cancelled.
   */
  fun onRingEnded(id: String, outcome: DoseOutcome, dueAt: Long? = null) {
    val (missed, removed) = store.locked {
      scheduler.cancelRecovery(id)
      val alarms = store.loadAlarms()
      val alarm = alarms.firstOrNull { it.id == id } ?: return@locked null to emptyList()
      val now = System.currentTimeMillis()
      val occurrence = AlarmRules.occurrence(alarm, dueAt, now)
      val record = occurrence?.let { recordDose(alarm, it, outcome, now) }
      if (alarm.enabled) {
        val ended = AlarmRules.ringEnded(alarm, now, zone())
        bestEffort("the end of $id's ring") { store.saveAlarms(alarms.replace(ended)) }
        scheduler.sync(ended)
      }
      val missed =
        if (outcome == DoseOutcome.MISSED && record?.outcome == DoseOutcome.MISSED) {
          MissedAlarm(alarm.id, namesOf(record), occurrence)
        } else {
          null
        }
      // This ring is over, so its card no longer counts as busy.
      missed to housekeeping(now, endedId = id)
    }
    stopRings(removed)
    missed?.let { Notifications.postMissed(context, it) }
  }

  fun onSnoozed(id: String) {
    store.locked {
      scheduler.cancelRecovery(id)
      val alarms = store.loadAlarms()
      val alarm = alarms.firstOrNull { it.id == id && it.enabled } ?: return@locked
      val snoozed = AlarmRules.snoozed(alarm, System.currentTimeMillis())
      bestEffort("the snooze of $id") { store.saveAlarms(alarms.replace(snoozed)) }
      scheduler.sync(snoozed)
    }
  }

  /**
   * The pills due on [alarm]'s ring, with their amounts: those due on its occurrence's date, so a
   * dose snoozed past midnight still lists its pills, with amounts in the app's language. Empty if
   * the pills can't be read; the ring then shows the card's name.
   */
  fun ringPills(alarm: Alarm): List<RingPill> =
    try {
      val date = dateOf(alarm.nextTriggerAt ?: System.currentTimeMillis())
      val lang = language()
      DoseRules.pillsDue(store.locked { store.loadPills() }, alarm.hour, alarm.minute, date).map {
        RingPill(
          it.name,
          DoseRules.amountText(it.form, it.amount, lang),
          DoseRules.spokenAmount(it.form, it.amount, lang),
          DoseRules.spokenAmount(it.form, it.amount, AppLanguage.EN),
        )
      }
    } catch (e: Exception) {
      Log.e(LOG_TAG, "Could not read the pills of ${alarm.id}; ringing with its name", e)
      emptyList()
    }

  fun settings(): AppSettings = store.locked { store.loadSettings() }

  /** Changes the settings: a user's change, so a failed write throws [StorageException]. */
  fun updateSettings(change: (AppSettings) -> AppSettings) {
    store.locked { store.saveSettings(change(store.loadSettings())) }
  }

  /** The languages to offer: all of them in a debug build, only checked ones in a release. */
  fun availableLanguages(): List<AppLanguage> =
    LanguageRules.available(context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0)

  /**
   * The language the app speaks now ([LanguageRules.effective]). Read without the store lock and
   * never throws, so the ringing path can call it before anything else.
   */
  fun language(): AppLanguage =
    LanguageRules.effective(store.peekSettings().language, Locale.getDefault().language, availableLanguages())

  /**
   * What a ring with [pills] says ([SpeechText.parts]): the title in the app's language, then each
   * pill as on the ringing screen; also all in English, for a phone with no voice for the app's
   * language. Null when read aloud is off, or if anything fails: a ring never waits on, or fails
   * for, its speech. Lock-free, like [language].
   */
  fun ringSpeech(pills: List<RingPill>): RingSpeech? =
    try {
      if (!store.peekSettings().readAloud) {
        null
      } else {
        val lang = language()
        RingSpeech(
          lang,
          speech(lang, pills.map { SpokenPill(it.name, it.spokenAmount) }),
          speech(AppLanguage.EN, pills.map { SpokenPill(it.name, it.spokenEnglish) }),
        )
      }
    } catch (e: Exception) {
      Log.e(LOG_TAG, "Could not build the ring's speech; ringing without it", e)
      null
    }

  /** The ringing screen's title in [lang], then [pills]. */
  fun speech(lang: AppLanguage, pills: List<SpokenPill>): List<SpeechPart> =
    SpeechText.parts(context.localized(lang).getString(R.string.ringing_title), lang, pills)

  fun soundFileFor(alarm: Alarm): File? {
    val sound = soundOf(alarm) ?: return null
    return File(store.soundsDir, sound.fileName)
  }

  /** The name of [alarm]'s sound; the default tone's in the app's language. */
  fun soundNameFor(alarm: Alarm): String = soundOf(alarm)?.name ?: defaultToneName()

  /** "Default alarm tone" in the app's language. */
  fun defaultToneName(): String = words().getString(R.string.default_alarm_tone)

  /** The app context in the app's language ([language]), for the app's own words. */
  fun words(): Context = context.localized(language())

  /** Points every alarm that uses [soundId] back at the default tone. */
  fun clearSound(soundId: String) {
    store.locked {
      store.saveAlarms(
        store.loadAlarms().map { if (it.soundId == soundId) it.copy(soundId = null) else it },
      )
    }
  }

  /**
   * Housekeeping under the store lock: plans the cards ([DoseRules.planCards]) with the fresh
   * marker's rings counted as busy, saves and schedules them, and cancels the removed ones. Returns
   * the removed ids, whose rings are stopped after the lock ([stopRings]). Throws on a failed write:
   * the ringing path calls [housekeeping] instead.
   */
  private fun syncCards(now: Long, endedId: String? = null): List<String> {
    val busy = AlarmRules.ownedIds(ringingMarker(), now) - setOfNotNull(endedId)
    val plan = DoseRules.planCards(store.loadAlarms(), store.loadPills(), busy, now, zone()) {
      UUID.randomUUID().toString()
    }
    store.saveAlarms(plan.cards)
    plan.cards.forEach { scheduler.sync(it) }
    plan.removedIds.forEach {
      scheduler.cancel(it)
      scheduler.cancelRecovery(it)
    }
    if (plan.removedIds.isNotEmpty()) Log.i(LOG_TAG, "Housekeeping removed ${plan.removedIds}")
    return plan.removedIds
  }

  /** [syncCards] on the ringing path: a failure is logged and nothing is removed. */
  private fun housekeeping(now: Long, endedId: String? = null): List<String> {
    var removed = emptyList<String>()
    bestEffort("housekeeping") { removed = syncCards(now, endedId) }
    return removed
  }

  private fun stopRings(removedIds: List<String>) =
    removedIds.forEach { RingingService.stopIfRinging(context, it) }

  /**
   * Whether [alarm]'s fire should ring ([DoseRules.shouldRing]): judged on its occurrence's date,
   * so a dose snoozed past midnight still rings. If the store can't be read, it rings anyway.
   */
  private fun shouldRing(alarm: Alarm, now: Long): Boolean =
    try {
      DoseRules.shouldRing(alarm, store.loadPills(), store.loadDoses(), alarm.nextTriggerAt ?: now, zone())
    } catch (e: Exception) {
      Log.e(LOG_TAG, "Could not read the pills or doses; ringing ${alarm.id} anyway", e)
      true
    }

  /**
   * Records [alarm]'s dose at [occurrenceAt] on the ringing path. Returns the dose as it now
   * stands, which stays taken if it already was, or null when nothing was due.
   */
  private fun recordDose(alarm: Alarm, occurrenceAt: Long, outcome: DoseOutcome, now: Long): DoseRecord? {
    var record: DoseRecord? = null
    bestEffort("the $outcome dose of ${alarm.id}") {
      record = DoseRules.doseRecord(alarm, store.loadPills(), occurrenceAt, outcome, now, zone())
      record?.let { r ->
        val doses = DoseRules.withRecord(store.loadDoses(), r, dateOf(now))
        store.saveDoses(doses)
        record = DoseRules.recordOf(doses, r.date, r.hour, r.minute) ?: r
      }
    }
    if (record == null) Log.i(LOG_TAG, "No $outcome dose recorded for ${alarm.id}: nothing was due")
    return record
  }

  /**
   * Deletes photo [name] after a user's change no longer needs it, unless one of [pills] still
   * does. The change is already saved, so a failure is only logged; cleanup gets it later.
   */
  private fun deletePhotoUnlessUsed(name: String, pills: List<Pill>) {
    if (!PhotoRules.isPhotoName(name) || pills.any { it.photo == name }) return
    if (!File(store.photosDir, name).delete()) Log.w(LOG_TAG, "Could not delete photo $name")
  }

  private fun stillMissed(doses: List<DoseRecord>, record: DoseRecord): Boolean =
    DoseRules.recordOf(doses, record.date, record.hour, record.minute)?.outcome == DoseOutcome.MISSED

  private fun namesOf(record: DoseRecord): String = record.pills.joinToString(", ") { it.name }

  private fun soundOf(alarm: Alarm): Sound? {
    val soundId = alarm.soundId ?: return null
    return store.locked { store.loadSounds() }.firstOrNull { it.id == soundId }
  }

  /** The `:ringing` process's marker, or null if there is none or it can't be read. */
  private fun ringingMarker(): RingingMarker? =
    try {
      store.loadRingingMarker()
    } catch (e: Exception) {
      Log.e(LOG_TAG, "Could not read the ringing marker; reconciling as if nothing rings", e)
      null
    }

  /** Runs a ringing-path [write]; a failure is logged and the caller carries on. */
  private inline fun bestEffort(what: String, write: () -> Unit) {
    try {
      write()
    } catch (e: Exception) {
      Log.e(LOG_TAG, "Could not save $what; carrying on, reconcile will repair it", e)
    }
  }

  private fun zone(): ZoneId = ZoneId.systemDefault()

  private fun dateOf(millis: Long): LocalDate = Instant.ofEpochMilli(millis).atZone(zone()).toLocalDate()

  private fun List<Alarm>.replace(alarm: Alarm): List<Alarm> =
    map { if (it.id == alarm.id) alarm else it }

  companion object {
    const val DEFAULT_NAME = "Alarm"

    @Volatile private var instance: AlarmEngine? = null

    fun get(context: Context): AlarmEngine =
      instance
        ?: synchronized(this) {
          instance ?: AlarmEngine(context.applicationContext).also { instance = it }
        }
  }
}
