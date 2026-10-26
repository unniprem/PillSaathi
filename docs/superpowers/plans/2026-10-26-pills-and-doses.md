# Pills and Doses (Android) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task by task, inline in one session. The user asked for this plan not to run subagent-driven. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Users add pills (name, type, amount, times, number of days). Pills due at the same minute ring as one alarm that lists them all. Taken, Skip and Missed are recorded, and a Today screen replaces the plain alarm list.

**Architecture:**
- A **time card** is the engine's existing `Alarm`. It has one per distinct hour and minute, repeats every day, and only rings between an `activeFrom` date and an `activeUntil` date. Native Kotlin owns pills, cards and dose records in the same locked, device-protected store.
- Pure rules live in `DoseRules.kt` and `AlarmRules.kt`, where JVM tests can reach them:
  - which pills are due
  - card planning (housekeeping)
  - dose records
  - Today statuses
  - amount text
- The engine runs housekeeping after every pill change, reconcile and ring end. The ringing path records outcomes and never depends on JS.
- React Native renders the Today and Pill screens through new `NativeAlarms` calls. Pure display helpers live in `src/lib/amount.ts` and `src/lib/course.ts`.

**Tech Stack:**
- React Native 0.88.0 (new architecture) and React 19.3, in TypeScript
- Kotlin, using java.time through desugaring
- React Navigation 7 (native stack)
- Jest with `@testing-library/react-native` 14
- JUnit 4

**Spec:** `docs/superpowers/specs/2026-10-26-pills-and-doses-design.md`. It builds on `docs/superpowers/specs/2026-10-24-custom-sound-alarm-design.md`. Read both before starting.

## Global Constraints

- **Earlier constraints still apply.** Every line of "Global Constraints" in `docs/superpowers/plans/2026-10-25-custom-sound-alarm.md` still holds, with one exception: work happens on branch **`feature/pills-and-doses`**. That covers versions, Android only with the iOS bundle still building, ringing never depending on JS, audio, device-protected storage, 12/24-hour time, no battery-exemption permission, the `systemExempted` service, and code style.
- **Fixed values:**
  - Snooze is 10 min, auto-silence 10 min, and the missed grace 2 min, all unchanged.
  - Records are kept for **365 days**.
  - A name is **1–60 characters** after trimming.
  - A pill has **1–6 times**, with no repeats.
  - Duration presets are **5, 7, 10 and 20** days. "Other…" takes **1–365**, and "No end" is `days = null`.
  - A new pill starts **today or tomorrow**.
- **Amounts**, in the same format everywhere:

  | Type    | json      | Step | Min | Max | Initial | Shown as                                  |
  | ------- | --------- | ---- | --- | --- | ------- | ----------------------------------------- |
  | Tablet  | `tablet`  | 0.5  | 0.5 | 10  | 1       | ½ tablet, 1 tablet, 1½ tablets, 2 tablets |
  | Capsule | `capsule` | 1    | 1   | 10  | 1       | 1 capsule, 2 capsules                     |
  | Syrup   | `syrup`   | 2.5  | 2.5 | 50  | 5       | 2.5 ml, 5 ml, 7.5 ml, 10 ml               |
  | Drops   | `drops`   | 1    | 1   | 30  | 2       | 1 drop, 2 drops                           |

- **Cards keep the `Alarm` model.** Cards use `days = EVERY_DAY` (1..7). Keep `days`, `name` and `enabled` on `Alarm`; the reviewed engine logic and its tests stay. A card's `name` is its active pills' names joined with `", "`.
- **Dates** are ISO `YYYY-MM-DD` strings in JSON and over the bridge, and `java.time.LocalDate` in Kotlin, in the phone's current zone. A course of N days runs on its `startDate` through `startDate + N − 1`.
- **Error codes:** `INVALID_PILL`, `NOT_FOUND`, `STORAGE_ERROR`, `NO_ACTIVITY`.
- **Writes:**
  - User changes write first, schedule after, and throw on a failed write. These are saving or deleting a pill, setting a card's sound, and marking a dose taken.
  - Ringing-path writes log a failure and carry on, through the engine's `bestEffort`. These are fires, ring ends, reconcile, and the housekeeping that follows them.
- **Fixed copy:**
  - ringing screen: "Time for your medicines", "Taken", "Snooze 10 min", "Skip this time"
  - statuses: "✓ Taken {time}", "Skipped", "Missed", "Ringing now", "Snoozed until {time}", "Coming up", "Next: tomorrow", "Next: {Wed 28 Oct}"
  - pill rows: "day N of M", "last day", "starts tomorrow", "from tomorrow"
  - "Mark as taken", "+ Add pill"
  - missed notification: "Missed: {time}, {names}"
  - course summary: "Starts today · last dose Fri 30 Oct, 9:00 PM"
- **Commits:** one per task, conventional, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. `npx tsc --noEmit` and `npm run lint` stay clean after every task.

## Review Focus

The spec's own checks don't reach these five cases. They're the most likely to bite a real user, most likely first. Each one's test is added to the task that owns the code.

1. **A last-day dose snoozed past midnight** (23:55, snoozed to 00:05). It must still re-ring and list the pill, and its record goes under the earlier date. Housekeeping must not remove the card while it's snoozed or ringing. Tests: Task 2 (`planCards_finishedPillsOnly_keptWhileSnoozedOrRinging`, `doseRecord_snoozedPastMidnight_usesOccurrenceDate`).
2. **A time that already passed today**, on a pill added or edited at 10:00 with an 8:00 time. It never rings today, is never recorded as missed, and Today says "Next: tomorrow". Tests: Task 2 (`planCards_twoPillsSameTime_oneCard` arms tomorrow; `todayCards_statusPrecedence` gives LATER).
3. **Upgrading with old plain alarms.** An old alarm at a pill's time becomes that card and keeps its sound. Two alarms at the same minute collapse into one, and the rest are removed. Tests: Task 2 (`planCards_oldPlainAlarmAtPillTime_adoptedAsCard`, `planCards_duplicateAlarmsAtSameTime_keepOldestRemoveRest`, `planCards_alarmWithNoPillAtItsTime_removed`).
4. **No false "Missed".** The phone may be off or the app killed across a dose time on a day nothing was due: a finished course, or a clock moved back. That gives no record, no missed alert and no ring. Tests: Task 2 (`doseRecord_nothingDue_null`). Task 3 drops a missed alarm whose record is null, which the emulator check confirms.
5. **Junk in "Other…" days** (`0`, `366`, `5.5`, empty, `1e2`) keeps Save disabled, and `12` saves `days: 12`. Test: Task 6 (`keeps Save disabled for an invalid Other… duration`).

---

## File Structure

Kotlin, under `android/app/src/main/java/com/pillsaathi/`:

| File | Change | Responsibility |
| --- | --- | --- |
| `alarm/AlarmModels.kt` | modify | `Alarm` gains `activeFrom` and `activeUntil` |
| `alarm/AlarmRules.kt` | modify | date-window triggers; a card with no future is disarmed; missed reports the occurrence |
| `alarm/AlarmJson.kt` | modify | window keys |
| `alarm/PillModels.kt` | create | pill, dose and Today types |
| `alarm/DoseRules.kt` | create | pure rules: due pills, card planning, records, Today, amount text |
| `alarm/PillJson.kt` | create | pills and doses JSON |
| `alarm/AlarmStore.kt` | modify | `pills.json` and `doses.json` |
| `alarm/AlarmEngine.kt` | modify | pill operations, housekeeping, fire-time check, records, outcomes |
| `alarm/RingingService.kt`, `RingingState.kt`, `RingingActivity.kt`, `Notifications.kt`, `AlarmFireReceiver.kt` | modify | Taken, Skip and Missed; pill list on the ring |
| `res/layout/activity_ringing.xml`, `res/values/strings.xml` | modify | ringing screen and copy |
| `debug/java/.../DebugAlarmReceiver.kt` | modify | debug pill commands |
| `bridge/PillInputValidator.kt` | create | replaces `AlarmInputValidator.kt`, which is deleted |
| `bridge/NativeAlarmsModule.kt` | modify | pill API instead of alarm CRUD |

JS:

| File | Change |
| --- | --- |
| `specs/NativeAlarms.ts`, `src/native/alarms.ts` | modify |
| `src/lib/amount.ts`, `src/lib/course.ts` | create |
| `src/lib/days.ts` | delete |
| `src/components/DoseCard.tsx`, `src/components/AmountStepper.tsx` | create |
| `src/components/AlarmRow.tsx`, `src/components/DayChips.tsx` | delete |
| `src/screens/TodayScreen.tsx` | `git mv` from `AlarmListScreen.tsx`, then rework |
| `src/screens/PillEditScreen.tsx` | `git mv` from `AlarmEditScreen.tsx`, then rewrite |
| `src/screens/SoundPickerScreen.tsx`, `src/screens/RecordScreen.tsx`, `src/navigation/RootNavigator.tsx` | modify |

Tests:
- Kotlin: `AlarmRulesTest`, `AlarmJsonTest` (modify); `DoseRulesTest`, `PillJsonTest`, `bridge/PillInputValidatorTest` (create); `AlarmInputValidatorTest` (delete).
- Jest: `__tests__/lib/amount.test.ts` and `course.test.ts` (create); `days.test.ts` (delete); `__tests__/screens/TodayScreen.test.tsx` and `PillEditScreen.test.tsx`, which replace the AlarmList and AlarmEdit tests; `SoundPickerScreen.test.tsx`, `RecordScreen.test.tsx` and `__tests__/native/alarms.test.ts` (modify).

Docs: `README.md`, `JOURNAL.md`.

---

### Task 1: Date windows for time cards in the alarm rules

**Files:**
- Modify: `alarm/AlarmModels.kt`, `alarm/AlarmRules.kt`, `alarm/AlarmJson.kt`
- Test: `android/app/src/test/java/com/pillsaathi/alarm/AlarmRulesTest.kt`, `AlarmJsonTest.kt`

**Interfaces:**
- Produces:
  - `Alarm(..., createdAt: Long, activeFrom: LocalDate? = null, activeUntil: LocalDate? = null)`. The two new fields are appended with defaults, so existing calls compile.
  - `AlarmRules.nextTriggerFor(alarm: Alarm, afterMillis: Long, zone: ZoneId): Long?` gives the first `nextTrigger(hour, minute, days, …)` strictly after `afterMillis` that falls on or after `activeFrom`. It returns `null` when that date is after `activeUntil`. Search from `max(afterMillis, startOfDay(activeFrom) − 1)`.
  - `armed(alarm, now, zone)` returns `disarmed(alarm)` when `nextTriggerFor` is null.
  - `ringEnded(alarm, now, zone)`: a one-time alarm is disarmed as before. A repeating one uses `nextTriggerFor ?: disarmed`.
  - `reconcile(...)`: the "recompute future time" branch disarms when `nextTriggerFor` is null. Every `MissedAlarm.dueAt` it reports is the **occurrence**, `a.nextTriggerAt ?: due`, not the snooze time.
  - `AlarmJson` writes `activeFrom` and `activeUntil` as ISO strings or JSON `null`. Missing keys read as `null`, for old data.

- [ ] **Step 1: Write the failing tests.** Extend the test helper:

  ```kotlin
  alarm(days, enabled, next, snooze, lastFired, from: LocalDate? = null, until: LocalDate? = null)
  ```

  Add `private val EVERY_DAY = (1..7).toSet()` and use an 8:00 card where noted. Mon = 26 Oct 2026.

  ```kotlin
  @Test fun nextTriggerFor_activeFromTomorrow_skipsToday()      // from 27 Oct, after 26 Oct 07:00 → 27 Oct 08:00
  @Test fun nextTriggerFor_lastDayBeforeTime_today()            // until 26 Oct, after 26 Oct 07:00 → 26 Oct 08:00
  @Test fun nextTriggerFor_lastDayAfterTime_null()              // until 26 Oct, after 26 Oct 09:00 → null
  @Test fun nextTriggerFor_noWindow_sameAsNextTrigger()         // EVERY_DAY, after 26 Oct 09:00 → 27 Oct 08:00
  @Test fun armed_noFutureInWindow_disarmed()                   // until 25 Oct, now 26 Oct → enabled=false, next=null
  @Test fun ringEnded_lastDoseOfWindow_disarmed()               // until 26 Oct, now 26 Oct 08:05 → disarmed
  @Test fun reconcile_futureBeyondShortenedWindow_disarmed()    // next 27 Oct 08:00, until 26 Oct, now 26 Oct 10:00 → disarmed, no missed
  @Test fun reconcile_missedWhileSnoozed_reportsOccurrence()    // next 26 Oct 07:00, snooze 07:10, lastFired 07:00, now 07:20 → MissedAlarm("a1","Pills", 26 Oct 07:00)
  ```

  In `AlarmJsonTest`, add `alarms_roundTrip_withWindow`. Also add `alarms_jsonWithoutWindowKeys_readsNullWindow`, using a literal JSON string in the old format.

- [ ] **Step 2: Run the tests to verify they fail.** Run `cd android && ./gradlew :app:testDebugUnitTest`. Expected: a compilation failure, because `nextTriggerFor` and the `from` and `until` parameters are unresolved.
- [ ] **Step 3: Implement** the interfaces above. Keep `nextTrigger(hour, minute, days, afterMillis, zone): Long` unchanged.
- [ ] **Step 4: Run the tests to verify they pass.** Run the same command. Expected: `BUILD SUCCESSFUL`, with every old and new test passing.
- [ ] **Step 5: Commit.** `git add android/app/src && git commit -m "feat: add date windows to alarms so time cards ring only during their pills' courses"`

---

### Task 2: Pill and dose rules (pure Kotlin)

**Files:**
- Create: `alarm/PillModels.kt`, `alarm/DoseRules.kt`, `alarm/PillJson.kt`
- Test: `alarm/DoseRulesTest.kt`, `alarm/PillJsonTest.kt`

**Interfaces:**
- Consumes: `Alarm`, `AlarmRules.armed` and `AlarmRules.nextTriggerFor` (Task 1).
- Produces, in `PillModels.kt`:

  ```kotlin
  enum class PillForm(val json: String, val step: Double, val min: Double, val max: Double, val initial: Double) {
    TABLET("tablet", 0.5, 0.5, 10.0, 1.0), CAPSULE("capsule", 1.0, 1.0, 10.0, 1.0),
    SYRUP("syrup", 2.5, 2.5, 50.0, 5.0), DROPS("drops", 1.0, 1.0, 30.0, 2.0);
    companion object { fun fromJson(s: String): PillForm? }
  }
  data class DoseTime(val hour: Int, val minute: Int) : Comparable<DoseTime>
  data class Pill(val id: String, val name: String, val form: PillForm, val amount: Double,
    val times: List<DoseTime>, val startDate: LocalDate, val days: Int?, val createdAt: Long)
  data class PillDraft(val id: String?, val name: String, val form: PillForm, val amount: Double,
    val times: List<DoseTime>, val startsTomorrow: Boolean, val days: Int?)
  enum class DoseOutcome(val json: String) { TAKEN("taken"), SKIPPED("skipped"), MISSED("missed") }
  data class DosePill(val pillId: String, val name: String, val form: PillForm, val amount: Double)
  data class DoseRecord(val date: LocalDate, val hour: Int, val minute: Int,
    val outcome: DoseOutcome, val at: Long, val pills: List<DosePill>)
  enum class DoseStatus(val json: String) { TAKEN("taken"), SKIPPED("skipped"), MISSED("missed"),
    RINGING("ringing"), SNOOZED("snoozed"), UPCOMING("upcoming"), LATER("later"), DONE("done") }
  data class TodayPill(val pillId: String, val name: String, val form: PillForm, val amount: Double,
    val startDate: LocalDate?, val days: Int?, val exists: Boolean, val fromTomorrow: Boolean)
  data class TodayCard(val alarmId: String?, val hour: Int, val minute: Int, val soundId: String?,
    val pills: List<TodayPill>, val status: DoseStatus, val statusAt: Long?)
  data class Today(val date: LocalDate, val cards: List<TodayCard>)
  data class CardPlan(val cards: List<Alarm>, val removedIds: List<String>)
  ```

- Produces, in `DoseRules.kt` (`object DoseRules`):
  - `EVERY_DAY: Set<Int>` and `RECORD_KEEP_DAYS = 365L`.
  - `lastDay(pill): LocalDate?`.
  - `isActive(pill, today): Boolean`, true when `lastDay` is null or on or after `today`.
  - `isDueOn(pill, date): Boolean`.
  - `pillsDue(pills, hour, minute, date): List<Pill>`, in `createdAt` order.
  - `amountText(form, amount): String`.
  - `planCards(alarms: List<Alarm>, pills: List<Pill>, busyIds: Set<String>, now: Long, zone: ZoneId, newId: () -> String): CardPlan`.
  - `doseRecord(alarm: Alarm, pills: List<Pill>, occurrenceAt: Long, outcome: DoseOutcome, at: Long, zone: ZoneId): DoseRecord?`. It is null when nothing is due on the occurrence's date at the card's time.
  - `withRecord(records, record, today): List<DoseRecord>`. It upserts by `(date, hour, minute)`, never replaces a TAKEN record, and drops records dated before `today − 365`.
  - `markedTaken(records, date, hour, minute, at): List<DoseRecord>?`. It is null when there's no record.
  - `todayCards(alarms, pills, records, ringingIds: Set<String>, now, zone): List<TodayCard>`.
- Produces, in `PillJson.kt`: `pillsToJson` / `pillsFromJson` and `dosesToJson` / `dosesFromJson`. Blank input reads as an empty list, and an unknown `form` reads as `TABLET`.

**`planCards` rules.** The tests pin each one. `today` is the local date of `now`, and "active pills" means `isActive(pill, today)`.

1. **Each distinct time of the active pills gets one card.**
   - `days = EVERY_DAY`.
   - `name` is the pills' names in `createdAt` order, joined with `", "`.
   - `activeFrom` is the earliest `startDate`. `activeUntil` is the latest `lastDay`, or null if any of them has no end.
2. **An existing alarm at that time becomes the card**, keeping its `id` and `soundId`. If several share the time, keep the one with the lowest `createdAt` and remove the rest.
3. **A changed card is re-armed** with `AlarmRules.armed` only when it's safe. The card counts as changed when its window or `days` changed, or when it's `enabled == false`. It's safe when it isn't in `busyIds`, has no `snoozeUntil`, and its `nextTriggerAt` is null or after `now`. Otherwise only its fields are updated, and the pending fire or reconcile settles it.
4. **A new time gets a new card**: `Alarm(newId(), …, soundId = null, enabled = true, createdAt = now)`, armed.
5. **Removal:**
   - An alarm whose time no pill in the store has, active or finished, is **removed even if busy**. That covers a deleted pill or an old plain alarm.
   - An alarm whose time only finished pills have is removed **unless** it's in `busyIds` or snoozed.

**`todayCards` rules.**
- The cards are the alarms whose time has at least one active pill, plus every time with a record dated today. They're sorted by time.
- Status precedence:
  1. today's record gives TAKEN, SKIPPED or MISSED, with `statusAt` set to the record's `at`
  2. in `ringingIds` gives RINGING
  3. `snoozeUntil` gives SNOOZED, with `statusAt` set to `snoozeUntil`
  4. a `nextTriggerAt` on today's date gives UPCOMING
  5. any other `nextTriggerAt` gives LATER, with `statusAt` set to it
  6. otherwise DONE
- **Pills on a card with a record today:** the record's pills come first. Name, form and amount come from the snapshot. `exists` is true when the id is still in the store; for those, `startDate` and `days` come from the store, otherwise they're null. Then come the active pills at that time that aren't in the record, with `fromTomorrow = true`.
- **Pills on a card without a record:** its active pills, `exists = true`.
- `alarmId` and `soundId` are null for a time that has a record but no alarm.

- [ ] **Step 1: Write the failing tests.** All times are in `IST`, and `now` is Mon 26 Oct 2026 10:00 unless noted. `newId` returns `"n1"`, `"n2"`, …. Use the helpers `pill(id, times, start, days, createdAt, name = id, form = TABLET, amount = 1.0)` and `card(id, h, m, …)`.

  ```kotlin
  @Test fun amountText_table()  // every "Shown as" value in Global Constraints, e.g. (TABLET,1.5)→"1½ tablets", (SYRUP,7.5)→"7.5 ml", (DROPS,1.0)→"1 drop"
  @Test fun lastDay_fiveDays_isFifthDay()                 // start 26 Oct, 5 → 30 Oct; null days → null
  @Test fun isDueOn_courseBounds()                        // 26..30 Oct true; 25 and 31 Oct false; no end → 1 Jan 2028 true
  @Test fun pillsDue_sameTime_inAddOrder_skipsFinishedAndNotStarted()
  @Test fun planCards_twoPillsSameTime_oneCard()          // A,B at 08:00 → one card n1, name "A, B", soundId null, next 27 Oct 08:00
  @Test fun planCards_pillWithTwoTimes_twoCards()         // A at 08:00+21:00 → 08:00 next 27 Oct; 21:00 next 26 Oct 21:00
  @Test fun planCards_window_isUnionOfActivePills()       // A 26 Oct ×5, B 27 Oct ×10 → from 26 Oct, until 5 Nov; add C no end → until null
  @Test fun planCards_existingCard_keepsIdAndSound()
  @Test fun planCards_oldPlainAlarmAtPillTime_adoptedAsCard()   // p1 08:00 days {1..5} "Wake" sound s1 → id p1, EVERY_DAY, name "A", s1, next 27 Oct 08:00
  @Test fun planCards_duplicateAlarmsAtSameTime_keepOldestRemoveRest()
  @Test fun planCards_alarmWithNoPillAtItsTime_removed()  // also when in busyIds
  @Test fun planCards_finishedPillsOnly_removedWhenIdle()
  @Test fun planCards_finishedPillsOnly_keptWhileSnoozedOrRinging()
  @Test fun planCards_pendingPastDue_notRearmed()         // next 26 Oct 09:59, window changes → next stays 09:59
  @Test fun planCards_shortenedToEndToday_tonightStillRings()   // until 30→26 Oct, next 26 Oct 21:00 kept
  @Test fun planCards_disarmedCardGetsNewFuture_rearmed()
  @Test fun planCards_pillStartsTomorrow_cardArmedTomorrow()    // now 26 Oct 07:00, start 27 Oct → next 27 Oct 08:00
  @Test fun planCards_timeMovedLaterToday_ringsTonight()  // spec: Telma 08:00 → 21:00 at 10:00 after a TAKEN 08:00 record → 21:00 card next 26 Oct 21:00, and pillsDue(21:00, 26 Oct) lists Telma
  @Test fun doseRecord_listsPillsDueOnOccurrenceDate()
  @Test fun doseRecord_snoozedPastMidnight_usesOccurrenceDate() // 23:55 card, last day 30 Oct, occurrence 30 Oct 23:55, at 31 Oct 00:07 → date 30 Oct, pill listed
  @Test fun doseRecord_nothingDue_null()
  @Test fun withRecord_upsertsBySameDateAndTime()
  @Test fun withRecord_neverReplacesTaken()
  @Test fun withRecord_dropsRecordsOlderThan365Days()     // today 26 Oct 2026: 25 Oct 2025 dropped, 26 Oct 2025 kept
  @Test fun markedTaken_missedBecomesTakenAtNow()
  @Test fun markedTaken_noRecord_null()
  @Test fun todayCards_statusPrecedence()                 // one card per status, TAKEN…DONE, with statusAt as above
  @Test fun todayCards_sortedByTime()
  @Test fun todayCards_recordedCard_listsSnapshotThenLaterAdditions()  // record [A] at 08:00; live A,B → A(exists,false), B(fromTomorrow=true)
  @Test fun todayCards_deletedPillInRecord_notOpenable()  // exists=false, startDate=null
  @Test fun todayCards_cardGoneButRecordToday_stillShown() // alarmId=null, soundId=null
  @Test fun todayCards_finishedTodayAfterLastDose_stillShown()
  @Test fun todayCards_finishedYesterday_notShown()
  ```

  `PillJsonTest`:
  - `pills_roundTrip`, including `days = null`, `amount = 1.5` and two times
  - `doses_roundTrip`
  - `blank_readsEmpty`
  - `unknownForm_readsTablet`

- [ ] **Step 2: Run the tests to verify they fail.** Run `cd android && ./gradlew :app:testDebugUnitTest`. Expected: a compilation failure.
- [ ] **Step 3: Implement** `PillModels.kt`, `DoseRules.kt` and `PillJson.kt` to the interfaces and rules above.
  - For `amountText`, a whole number prints with no decimals. A tablet's half prints as `½`, so 1.5 tablets is "1½" and 0.5 is "½". Syrup's halves print as `.5`.
  - Tablets, capsules and drops take a plural `s` when the amount is above 1.
- [ ] **Step 4: Run the tests to verify they pass.** Expected: `BUILD SUCCESSFUL`.
- [ ] **Step 5: Commit.** `git add android/app/src && git commit -m "feat: add pill, time card and dose record rules"`

---

### Task 3: Engine: pills, cards, records, and Taken/Skip

**Files:**
- Modify: `alarm/AlarmStore.kt`, `alarm/AlarmEngine.kt`, `alarm/RingingService.kt`, `alarm/RingingActivity.kt`, `res/layout/activity_ringing.xml`, `alarm/Notifications.kt`, `alarm/AlarmFireReceiver.kt`, `res/values/strings.xml`, `android/app/src/debug/java/com/pillsaathi/alarm/debug/DebugAlarmReceiver.kt`

**Interfaces:**
- Consumes: everything Task 2 produces.
- Produces, on `AlarmStore`: `loadPills()` / `savePills(list)` (`pills.json`) and `loadDoses()` / `saveDoses(list)` (`doses.json`).
- Produces, on `AlarmEngine`:

  ```kotlin
  fun pills(): List<Pill>
  fun savePill(draft: PillDraft): Pill              // NoSuchElementException if draft.id is unknown
  fun deletePill(id: String)
  fun setCardSound(alarmId: String, soundId: String?)  // NoSuchElementException
  fun markTaken(date: LocalDate, hour: Int, minute: Int)  // NoSuchElementException if no record
  fun today(): Today
  fun onRingEnded(id: String, outcome: DoseOutcome, dueAt: Long? = null)  // replaces (id, autoSilenced, dueAt)
  ```

- Produces, on `RingingService`:
  - `ACTION_TAKEN = "com.pillsaathi.TAKEN"` and `ACTION_SKIP = "com.pillsaathi.SKIP"`, which replace `ACTION_STOP`
  - `fun taken(context, alarmId: String? = null)` and `fun skip(context, alarmId: String? = null)`, alongside `snooze`
  - `commandIntent` verbs `taken`, `skip` and `snooze`

**Behaviour:**
- **`savePill`:**
  - A new pill gets `UUID`, `startDate` today (or tomorrow when `startsTomorrow`), and `createdAt = now`.
  - An edit keeps `id`, `startDate` and `createdAt`.
  - It writes pills, then housekeeping. Both throw `StorageException`.
- **`deletePill`:** removes the pill, then runs housekeeping.
- **`setCardSound`:** saves the card's `soundId`.
- **`markTaken`:** applies `DoseRules.markedTaken` at `now`.
- **`today()`:** `todayCards`, with `ringingIds` taken from `AlarmRules.ownedIds(marker, now)`.
- **Housekeeping**, as `private fun syncCards(now: Long)`:
  - Call `planCards`, using the owned ids from the fresh marker and `UUID` for new ids.
  - Save the alarms, then `scheduler.sync` every card.
  - For each removed id, `cancel` and `cancelRecovery` it, then call `RingingService.stopIfRinging` **after** the lock.
- **`reconcile`:**
  - After `AlarmRules.reconcile`, turn each missed into `doseRecord(MISSED, occurrenceAt = missed.dueAt)`.
  - **Drop a missed alarm whose record is null.** Otherwise `withRecord` it, and rename the `MissedAlarm` to the record's pill names joined with `", "`.
  - Save the doses and run housekeeping, both `bestEffort`.
- **`onFired`:**
  - In the RING branch, if `pillsDue(pills, h, m, date(alarm.nextTriggerAt ?: now))` is empty, log `"Fire $id: nothing due"`. Then save `ringEnded`, sync, run housekeeping, and return null.
  - The MISSED branch records the dose and names the notification from the record. It skips both when the record is null.
- **`onRingEnded(id, outcome, dueAt)`:**
  - The occurrence is `alarm.nextTriggerAt ?: due`. Record the dose with `bestEffort`, then move the alarm on as today.
  - Run housekeeping with `bestEffort`.
  - Only MISSED posts the notification.
- **`RingingService`:**
  - TAKEN records `TAKEN`, and SKIP records `SKIPPED`, both through `onCommand`.
  - Auto-silence and `abandonOwed` record `MISSED`.
  - Snooze is unchanged.
- **`AlarmFireReceiver`:** its failure path records `MISSED`.
- **Ringing screen:** buttons **Taken** (88dp, `#2E7D32`, bold 28sp), **Snooze 10 min** (64dp, as now) and **Skip this time** (a text link, 18sp, `#B0B0B8`, underlined, 16dp padding). The input guard covers all three.
- **Notification:** actions **Taken** and **Snooze**. `postMissed` uses `R.string.missed_alarm` with (time, names).
- **Strings:**
  - add `action_taken` "Taken", `action_skip` "Skip this time", `ringing_title` "Time for your medicines"
  - change `missed_alarm` to "Missed: %1$s, %2$s"
  - remove `action_stop`
- **Debug receiver:**
  - `DEBUG_ADD_PILL` takes `--ei minutes_from_now` (default 1), `--es name` ("Debug pill"), `--es form` (tablet), `--ef amount` (the form's initial), `--ei days` (0 = no end) and `--ez start_tomorrow`. It saves a pill whose one time is N minutes from now.
  - `DEBUG_LIST` logs the cards, pills and `today()`.
  - `DEBUG_TAKEN`, `DEBUG_SKIP` and `DEBUG_SNOOZE` take an optional `alarm_id`.
  - Keep `DEBUG_STOP_SERVICE` and `DEBUG_AUTO_SILENCE_MS`. Remove `DEBUG_ADD_ALARM` and `DEBUG_STOP`.
- **The old bridge methods stay until Task 6.** Leave `engine.save`, `setEnabled` and `delete` in place so `NativeAlarmsModule` still compiles. Housekeeping removes plain alarms at the next reconcile, so the old alarm list is out of use from here on.

- [ ] **Step 1: Implement** the store, engine, service, receiver, activity, layout, notification, strings and debug receiver above.
- [ ] **Step 2: Run the build and unit tests.** Run `cd android && ./gradlew :app:assembleDebug :app:testDebugUnitTest`. Expected: `BUILD SUCCESSFUL`.
- [ ] **Step 3: Verify the merged ring and Taken on the emulator.**
  - Set up: start `Medium_Phone_API_34`, then `adb wait-for-device && cd android && ./gradlew installDebug`. Broadcast `DEBUG_ADD_PILL` twice with `--ei minutes_from_now 2`: once with `--es name A`, and once with `--es name B --es form syrup --ef amount 5`.
  - Expected:
    - `adb logcat -s PillSaathiAlarm` after `DEBUG_LIST` shows **one** card named "A, B".
    - At the minute it rings once, with Taken, Snooze and Skip showing.
    - Tap **Taken**. `DEBUG_LIST` then shows that card's `today()` status as TAKEN with pills [A, B].
- [ ] **Step 4: Verify Skip, Missed and Snooze.**
  - Expected for Skip: a new pair at +2 min, then tap **Skip this time** → SKIPPED.
  - Expected for Missed: set `DEBUG_AUTO_SILENCE_MS --el ms 20000`, then add a pill and don't answer → MISSED, and a notification "Missed: {time}, {name}".
  - Expected for Snooze: Snooze, then the re-ring, then Taken → exactly one record, TAKEN.
- [ ] **Step 5: Verify that a course ends.**
  - Set up: add a pill with `--ei days 1` and tap Taken when it rings. Then run `adb root`, `adb shell settings put global auto_time 0` and `adb shell date 102710002026.00` (next day, 10:00). The system sends `TIME_CHANGED`, which reconciles.
  - Expected: `DEBUG_LIST` no longer shows the card, and `dumpsys alarm | grep -A6 com.pillsaathi` shows no alarm for it. Afterwards, restore with `settings put global auto_time 1`.
- [ ] **Step 6: Verify the reliability paths for a card.**
  - Expected after `adb shell am kill com.pillsaathi` before the minute: the card still rings.
  - Expected after `adb reboot` with a card 5 min out: it's still scheduled and rings at the lock screen.
- [ ] **Step 7: Commit.** `git add android/app/src && git commit -m "feat: run pills as merged time cards with Taken, Skip and missed dose records"`

---

### Task 4: The ringing screen and notification list the pills

**Files:**
- Modify: `alarm/RingingState.kt`, `alarm/RingingService.kt`, `alarm/AlarmEngine.kt`, `alarm/RingingActivity.kt`, `res/layout/activity_ringing.xml`, `alarm/Notifications.kt`

**Interfaces:**
- Produces:
  - `data class RingPill(val name: String, val amount: String)`, in `RingingState.kt`.
  - `RingingState.Ring(..., val pills: List<RingPill> = emptyList())`.
  - `AlarmEngine.ringPills(alarm: Alarm): List<RingPill>`. It returns the `pillsDue` on `date(alarm.nextTriggerAt ?: now)`, with `DoseRules.amountText`.

**Behaviour:**
- `startRingFor` gets the pills inside the same store lock as the alarm and sound.
- **Layout, top to bottom:**
  - time (72sp)
  - `ringing_title` (22sp, `#B0B0B8`)
  - a `ScrollView` (weight 1) holding `LinearLayout @+id/ringing_pills`
  - the sound line
  - Taken, Snooze and Skip
- **Pill rows:** each row is built in `render()`. It's a horizontal row with the name (24sp white, weight 1) and the amount (22sp, `#B0B0B8`). With no pills, show `ring.name` as a single row.
- **Notification:**
  - The content text is the pill names joined with `", "`, falling back to `ring.name`.
  - A `BigTextStyle` shows one `"name · amount"` line per pill.

- [ ] **Step 1: Implement** the behaviour above.
- [ ] **Step 2: Run the build and unit tests.** Run `cd android && ./gradlew :app:assembleDebug :app:testDebugUnitTest`. Expected: `BUILD SUCCESSFUL`.
- [ ] **Step 3: Verify on the locked emulator.**
  - Set up: add three debug pills for the same minute: a tablet with `--ef amount 1`, a tablet with `--ef amount 0.5`, and syrup with `--ef amount 5`. Lock with `adb shell input keyevent KEYCODE_SLEEP`.
  - Expected:
    - The screen lists "1 tablet", "½ tablet" and "5 ml" next to the names.
    - The expanded notification shows three lines plus Taken and Snooze.
- [ ] **Step 4: Verify a long list.** Add 10 pills for the same minute. Expected: the list scrolls, and Taken, Snooze and Skip stay visible without scrolling.
- [ ] **Step 5: Commit.** `git add android/app/src && git commit -m "feat: list each due pill and its amount on the ringing screen and notification"`

---

### Task 5: Amount and course display helpers (TypeScript)

**Files:**
- Create: `src/lib/amount.ts`, `src/lib/course.ts`
- Test: `__tests__/lib/amount.test.ts`, `__tests__/lib/course.test.ts`

**Interfaces:**
- Produces, in `amount.ts`:
  - `type PillForm = 'tablet' | 'capsule' | 'syrup' | 'drops'`
  - `FORMS: PillForm[]`, in table order
  - `FORM_LABELS: Record<PillForm, string>` (`Tablet` …)
  - `AMOUNT_RULES: Record<PillForm, { step: number; min: number; max: number; initial: number }>`
  - `formatAmount(form: PillForm, amount: number): string`
  - `stepAmount(form: PillForm, amount: number, direction: 1 | -1): number`, which clamps to min and max
- Produces, in `course.ts`:
  - `toISODate(d: Date): string`
  - `addDays(iso: string, n: number): string`
  - `lastDay(startDate: string, days: number | null): string | null`
  - `formatDay(iso: string): string`, giving `Fri 30 Oct`
  - `courseLabel(startDate: string, days: number | null, today: string): string`
  - `courseSummary(o: { startDate: string; days: number | null; times: { hour: number; minute: number }[]; today: string; is24h: boolean }): string`
  - `nextLabel(statusAt: number, today: string): string`
  - Parse ISO dates at local noon so DST can't shift the day. Use fixed English day and month names, not `Intl`.

- [ ] **Step 1: Write the failing tests.**

  ```ts
  // amount.test.ts
  test.each([
    ['tablet', 0.5, '½ tablet'], ['tablet', 1, '1 tablet'], ['tablet', 1.5, '1½ tablets'], ['tablet', 2, '2 tablets'],
    ['capsule', 1, '1 capsule'], ['capsule', 2, '2 capsules'],
    ['syrup', 2.5, '2.5 ml'], ['syrup', 5, '5 ml'], ['syrup', 7.5, '7.5 ml'], ['syrup', 10, '10 ml'],
    ['drops', 1, '1 drop'], ['drops', 2, '2 drops'],
  ])('formatAmount(%s, %s) is %s', (form, amount, text) => expect(formatAmount(form as PillForm, amount)).toBe(text));
  test('stepAmount steps and clamps', () => {
    expect(stepAmount('tablet', 1, 1)).toBe(1.5);
    expect(stepAmount('tablet', 0.5, -1)).toBe(0.5);
    expect(stepAmount('syrup', 5, 1)).toBe(7.5);
    expect(stepAmount('syrup', 50, 1)).toBe(50);
    expect(stepAmount('capsule', 1, -1)).toBe(1);
    expect(stepAmount('drops', 2, 1)).toBe(3);
  });
  // course.test.ts
  expect(addDays('2026-10-30', 2)).toBe('2026-11-01');
  expect(lastDay('2026-10-26', 5)).toBe('2026-10-30');
  expect(lastDay('2026-10-26', null)).toBeNull();
  expect(formatDay('2026-10-30')).toBe('Fri 30 Oct');
  expect(courseLabel('2026-10-26', 5, '2026-10-27')).toBe('day 2 of 5');
  expect(courseLabel('2026-10-26', 5, '2026-10-30')).toBe('last day');
  expect(courseLabel('2026-10-26', 1, '2026-10-26')).toBe('last day');
  expect(courseLabel('2026-10-27', 5, '2026-10-26')).toBe('starts tomorrow');
  expect(courseLabel('2026-10-20', null, '2026-10-26')).toBe('');
  expect(courseSummary({ startDate: '2026-10-26', days: 5, times: [{ hour: 8, minute: 0 }, { hour: 21, minute: 0 }], today: '2026-10-26', is24h: false }))
    .toBe('Starts today · last dose Fri 30 Oct, 9:00 PM');
  expect(courseSummary({ startDate: '2026-10-27', days: null, times: [{ hour: 8, minute: 0 }], today: '2026-10-26', is24h: false }))
    .toBe('Starts tomorrow · no end date');
  expect(courseSummary({ startDate: '2026-10-26', days: 5, times: [{ hour: 21, minute: 0 }], today: '2026-10-28', is24h: false }))
    .toBe('Started Mon 26 Oct · last dose Fri 30 Oct, 9:00 PM');
  expect(nextLabel(new Date(2026, 9, 27, 8, 0).getTime(), '2026-10-26')).toBe('Next: tomorrow');
  expect(nextLabel(new Date(2026, 9, 28, 8, 0).getTime(), '2026-10-26')).toBe('Next: Wed 28 Oct');
  ```

- [ ] **Step 2: Run the tests to verify they fail.** Run `npx jest __tests__/lib`. Expected: FAIL, because the modules aren't found.
- [ ] **Step 3: Implement** `amount.ts` and `course.ts`. `courseSummary` uses `formatTime` from `src/lib/time.ts` for the latest time.
- [ ] **Step 4: Run the checks.** Run `npx jest __tests__/lib && npx tsc --noEmit && npm run lint`. Expected: all pass.
- [ ] **Step 5: Commit.** `git add src/lib __tests__/lib && git commit -m "feat: add amount and course display helpers"`

---

### Task 6: Pill API, Today screen and pill page

**Files:**
- Create: `bridge/PillInputValidator.kt`, `src/components/DoseCard.tsx`, `src/components/AmountStepper.tsx`
- Modify: `bridge/NativeAlarmsModule.kt`, `alarm/AlarmEngine.kt` (remove `save`, `setEnabled` and `delete`), `specs/NativeAlarms.ts`, `src/native/alarms.ts`, `src/navigation/RootNavigator.tsx`, `src/screens/SoundPickerScreen.tsx`, `src/screens/RecordScreen.tsx`
- Move and rework: `src/screens/AlarmListScreen.tsx` becomes `TodayScreen.tsx`, and `AlarmEditScreen.tsx` becomes `PillEditScreen.tsx`
- Delete:
  - `bridge/AlarmInputValidator.kt` and its test
  - `src/components/AlarmRow.tsx`, `src/components/DayChips.tsx`
  - `src/lib/days.ts` and its test
  - `__tests__/screens/AlarmListScreen.test.tsx` and `AlarmEditScreen.test.tsx`
- Test: `bridge/PillInputValidatorTest.kt`, `__tests__/screens/TodayScreen.test.tsx`, `__tests__/screens/PillEditScreen.test.tsx`, `SoundPickerScreen.test.tsx`, `RecordScreen.test.tsx`, `__tests__/native/alarms.test.ts`

**Interfaces:**
- Consumes: the Task 3 engine API, the Task 5 helpers, and `PillForm` (Task 2).
- Produces:
  - `PillInputValidator.validate(raw: Map<String, Any?>): PillDraft`. It throws `AlarmException(INVALID_PILL)` and enforces Global Constraints:
    - `name`: trimmed, 1–60 characters
    - `form`: a known json value
    - `amount`: finite, within min and max, a whole multiple of `step` (within 1e-9)
    - `times`: 1–6 maps with whole `hour` 0–23 and `minute` 0–59, no repeats, returned sorted
    - `startsTomorrow`: a Boolean
    - `days`: null or a whole number 1–365
    - `id`: a String or null
  - `specs/NativeAlarms.ts`. Remove `NativeAlarm`, `AlarmInput`, `listAlarms`, `saveAlarm`, `setAlarmEnabled` and `deleteAlarm`. Add:

    ```ts
    export type DoseTime = { hour: number; minute: number };
    export type NativePill = { id: string; name: string; form: string; amount: number; times: DoseTime[]; startDate: string; days: number | null };
    export type PillInput = { id: string | null; name: string; form: string; amount: number; times: DoseTime[]; startsTomorrow: boolean; days: number | null };
    export type NativeTodayPill = { pillId: string; name: string; form: string; amount: number; startDate: string | null; days: number | null; exists: boolean; fromTomorrow: boolean };
    export type NativeTodayCard = { alarmId: string | null; hour: number; minute: number; soundId: string | null; status: string; statusAt: number | null; pills: NativeTodayPill[] };
    export type NativeToday = { date: string; cards: NativeTodayCard[] };
    listPills(): Promise<NativePill[]>;
    savePill(input: PillInput): Promise<NativePill>;   // INVALID_PILL, NOT_FOUND
    deletePill(id: string): Promise<void>;
    getToday(): Promise<NativeToday>;
    setCardSound(alarmId: string, soundId: string | null): Promise<void>;  // NOT_FOUND
    markDoseTaken(date: string, hour: number, minute: number): Promise<void>;  // NOT_FOUND
    ```

  - `src/native/alarms.ts` wraps each call. It re-exports `PillForm` and `DoseStatus = 'taken' | 'skipped' | 'missed' | 'ringing' | 'snoozed' | 'upcoming' | 'later' | 'done'`. It exports `Pill`, `TodayCard` and `Today` with `form` and `status` narrowed, and adds `AlarmErrors.InvalidPill = 'INVALID_PILL'`.
  - `RootStackParamList`:

    ```ts
    { Today: undefined; PillEdit: { pillId?: string }; SoundPicker: { alarmId: string; selectedSoundId: string | null }; Record: { alarmId: string }; Setup: undefined }
    ```

    The initial route is `Today`, titled "Today".

**Screen behaviour:**
- **TodayScreen** keeps the AlarmList's refresh logic: reconcile on open and on resume, the banner, the notification permission, focus refresh, and the load-failure and empty states.
  - Copy changes:
    - empty state: "No pills yet. Tap + Add pill to add one."
    - load failure: "Couldn't load your pills. Reopen the app to try again."
    - missed alert: titled "Missed medicines", with lines of the form `"{time}: {names}"`
  - A full-width **+ Add pill** button sits at the bottom.
  - The header shows `Today · {formatDay(date)}`.
- **DoseCard**, for each card:
  - It shows the time, then the status text from Global Constraints, then one row per pill: name, `formatAmount`, and `courseLabel(...)`, or "from tomorrow" when `fromTomorrow`.
  - Below them is a sound row, "♪ {sound name or Default alarm tone}", shown only when `alarmId` is set.
  - A pill row opens `PillEdit {pillId}` only if `exists`. The sound row opens `SoundPicker {alarmId, selectedSoundId}`.
  - A Missed or Skipped status is pressable. It shows `Alert.alert('Mark as taken?', '{time} · {names}', [Cancel, 'Mark as taken'])`, then calls `markDoseTaken(date, hour, minute)` and refreshes. A failure shows "Could not mark it taken" / "Please try again."
- **PillEditScreen:**
  - The title is "Add pill" or "Edit pill", with Cancel in the header.
  - **Fields:**
    - name (`maxLength 60`, placeholder "Medicine name")
    - type chips; changing the type resets the amount to `initial`
    - `AmountStepper` (− / + with accessibility labels "Less" and "More")
    - times, each row with "Change" through `pickTime` and "✕" labelled `Remove {time}`
    - **+ Add a time**, which first offers 8:00 and is hidden once there are 6 times
    - duration chips "5 days", "7 days", "10 days", "20 days", "Other…" (which shows a numeric "Days" input) and "No end", with **none pre-selected**
    - for a new pill only, Starts chips "Today" (the default) and "Tomorrow"
    - the `courseSummary` line, once times and a duration are set
  - A repeated time shows `Alert.alert('That time is already added.')`.
  - **Save** is disabled until the name, at least one time and a valid duration are set. A valid duration is a preset, "No end", or "Other…" text matching `/^\d+$/` within 1–365.
  - Save calls `savePill`. It then runs the existing exact-alarm check and first-run Setup flow from AlarmEdit, and leaves.
  - Editing loads through `listPills`; a missing pill leaves. Delete asks "Delete this pill?" and calls `deletePill`.
- **SoundPicker:** a pick calls `setCardSound(alarmId, id)`, then `navigation.popTo('Today')`. A failure shows "Could not change the sound" / "Please try again." Record opens with `{ alarmId }`.
- **Record:** after saving, it calls `setCardSound(alarmId, sound.id)`, then `popTo('Today')`.

- [ ] **Step 1: Write the failing validator test.** In `PillInputValidatorTest`:
  - A valid map with name `"  Azithromycin 500 "` and times `[{21,0},{8,0}]` returns `PillDraft(null, "Azithromycin 500", TABLET, 1.0, [DoseTime(8,0), DoseTime(21,0)], false, 5)`.
  - Each of these throws `INVALID_PILL`:
    - a blank name, or one of 61 characters
    - form `"pill"`
    - tablet amounts 0.25, 0 and 10.5
    - capsule 1.5, syrup 2.0
    - 0 times, 7 times, a repeated time
    - hour 24, minute 1.5
    - days 0, 366 and 5.5
    - a missing `startsTomorrow`
  - `days = null` is accepted.
- [ ] **Step 2: Run it to verify it fails.** Run `cd android && ./gradlew :app:testDebugUnitTest`. Expected: a compilation failure.
- [ ] **Step 3: Implement the validator and the module methods.** Delete `AlarmInputValidator` with its test, and the engine's `save`, `setEnabled` and `delete`. Map `NoSuchElementException` to `NOT_FOUND`. In `markDoseTaken`, an unparsable date is `NOT_FOUND`. The `getToday` and pill maps follow the TS types above, with `statusAt` and `days` sent as null when absent.
- [ ] **Step 4: Write the failing JS tests.**
  - **`__tests__/native/alarms.test.ts`:**
    - `listPills()` rejects with "PillSaathi alarms are Android-only for now" when the module is null.
    - `getToday()` passes a native result through.
  - **`TodayScreen.test.tsx`**, with `getToday` mocked to date `'2026-10-26'` and these cards:
    - `c8` at 08:00: TAKEN, `statusAt` 8:02, pills Azithromycin 500 (1 tablet) and Telma 40 (0.5 tablet), sound `s1`
    - `c14` at 14:00: MISSED, Vitamin D3 capsule
    - `c21` at 21:00: UPCOMING
    - `c9` at 09:00: LATER, tomorrow, with a `fromTomorrow` pill
    - a 07:00 card with `alarmId: null` whose pill has `exists: false`

    Tests:
    - `shows each time card with its pills, amounts, sound and status`: "✓ Taken 8:02 AM", "½ tablet", "♪ My voice", "Missed", "Coming up", "Next: tomorrow", "from tomorrow"
    - `marks a missed dose taken after confirming`: `markDoseTaken('2026-10-26', 14, 0)`, then `getToday` is called again
    - `opens the pill page from a pill row`: "Edit pill" shows
    - `does not open a pill deleted since`
    - `opens the sound picker for the card`
    - `alerts missed medicines from reconcile`
    - `shows the empty prompt`
    - `shows the load failure`
    - the AlarmList health-banner tests, ported over
  - **`PillEditScreen.test.tsx`:**
    - `starts with no duration chosen and Save disabled`
    - `saves a new pill with what was entered`: `savePill` gets `{ id: null, name: 'Azithromycin 500', form: 'tablet', amount: 1, times: [{ hour: 8, minute: 0 }], startsTomorrow: false, days: 5 }`
    - `keeps Save disabled for an invalid Other… duration`: `'0'`, `'366'`, `'5.5'`, `''` and `'1e2'`, then `'12'` saves `days: 12`
    - `resets the amount when the type changes`: Syrup shows "5 ml"; a tablet at "1 tablet", tapped "Less" twice, shows "½ tablet"
    - `refuses a time already on the pill`
    - `shows the course summary`, expected from `courseSummary` with `toISODate(new Date())`
    - `loads an existing pill and saves it with its id`: `days: 12` opens as "Other…" with 12, and the Starts chips are hidden
    - `deletes after confirming`
    - `opens setup after the first pill`
  - **SoundPicker and Record tests**, updated:
    - Picking `s1` calls `setCardSound('c8', 's1')` and returns to Today.
    - Picking the default tone calls `setCardSound('c8', null)`.
    - A failure alerts.
    - Saving a recording calls `setCardSound('c8', <new id>)`.
- [ ] **Step 5: Run them to verify they fail.** Run `npx jest`. Expected: FAIL, because the screens and wrapper functions are missing.
- [ ] **Step 6: Implement** the spec, the wrapper, the navigator, `TodayScreen` with `DoseCard`, `PillEditScreen` with `AmountStepper`, and the SoundPicker and Record changes. Delete the files listed above.
- [ ] **Step 7: Run all checks.** Run `npx jest && npx tsc --noEmit && npm run lint && (cd android && ./gradlew :app:assembleDebug :app:testDebugUnitTest)`. Expected: everything passes. Check the generated `NativeAlarmsSpec` signatures under `android/app/build/generated/source/codegen/java/com/pillsaathi/specs/`, and implement against them.
- [ ] **Step 8: Run on the emulator.** Start `npm start` in the background, then run `npm run android`. Expected:
  - Add two pills through the UI at the same time, 2 minutes out.
    - Today shows one card with both pills.
    - Setup opens after the first save.
    - The phone rings once with both listed. After Taken, Today shows "✓ Taken {time}".
  - Change the card's sound to a recording. The next ring plays it.
  - Delete the only pill on a card. The card and its system alarm are gone.
- [ ] **Step 9: Commit.** `git add -A specs src __tests__ android/app/src && git commit -m "feat: add Today screen and pill page on a new pill API, replacing plain alarms"`

---

### Task 7: Device matrix, README and journal

**Files:**
- Modify: `README.md`, `JOURNAL.md`

- [ ] **Step 1: Update the README.**
  - Describe pills instead of plain alarms.
  - Replace the debug table with the Task 3 commands.
  - Add the spec's "How we'll know it works" emulator cases to the test matrix, next to the existing reliability cases.
- [ ] **Step 2: Run the matrix on `Medium_Phone_API_34`.** Use the real UI wherever it covers a case.
  - The pill cases:
    - merged ring
    - Taken, Skip, Missed and Snooze each recording once
    - a 1-day course ending
    - deleting the only pill on a card
    - ringing with the app killed and after a reboot
  - The upgrade case: install `main`'s build, add two plain alarms (one at a time a pill will use), then install this branch and add that pill. Expected: one card that kept the old alarm's sound, and the other plain alarm gone, with the sounds kept.
  - Record pass or fail for each. Cases that need a real phone (Xiaomi and others) stay **pending, needs a real device**.
- [ ] **Step 3: Run the final checks.** Run `npx jest && npx tsc --noEmit && npm run lint && (cd android && ./gradlew :app:assembleDebug :app:testDebugUnitTest) && npx react-native bundle --platform ios --dev false --entry-file index.js --bundle-output "$TMPDIR/ios.jsbundle"`. Expected: all pass.
- [ ] **Step 4: Commit the README.** `git add README.md && git commit -m "docs: update README and device matrix for pills"`
- [ ] **Step 5: Prepend the session's `JOURNAL.md` entry** in the existing format, with commit hashes from `git log --oneline`. Commit it with `docs: add session journal for pills and doses`.
