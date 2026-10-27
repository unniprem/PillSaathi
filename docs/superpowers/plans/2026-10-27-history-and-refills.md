# History and Refills (Android) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans (the user picks one) to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The dose records become useful over time. A month calendar shows the doses and opens each day. A plain-text report can be shared through WhatsApp, SMS or email. An optional tablet count warns before a pill runs out.

**Architecture:**
- **Records stay the source.** Reconcile and a late fire now record a missed dose for *every* time a card was due during a gap, not only the first. History then counts records and nothing else. A record gains `marked`, so a dose marked taken later never looks like it was tapped on time.
- **History is read through one native call**, `getHistory(from, to)`. It returns the records in a date range, with each pill's snapshot plus whether that pill still exists and its photo now. It also returns the oldest record's date and the phone's first day of the week. The colours, the percentage, the month grid and the report text are pure TypeScript in `src/lib/history.ts` and `src/lib/report.ts`, and the screens only draw them.
- **Refill counts live on the pill** (`remaining`, plus the last warning posted, `refillNotified`), in the same locked store. All refill rules are pure Kotlin in `RefillRules`. A Taken (from the ring, the notification or Mark as taken) writes the dose first. It then lowers the counts best effort and posts at most one notification per level, after the lock. `getToday` returns the warnings, so the Today banner and the notification come from the same rule.

**Tech Stack:** React Native 0.88 (new architecture), React 19.3, TypeScript, Kotlin (java.time through desugaring), React Navigation 7, Jest with `@testing-library/react-native` 14, JUnit 4. Sharing uses React Native's own `Share`. The week start comes from `androidx.core.text.util.LocalePreferences`, from androidx.core, which is already on the classpath (1.17). There are no new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-26-history-and-refills-design.md`. It builds on the custom-sound alarm, pills and doses, and Easy for Amma specs in the same folder. Read it and the Easy for Amma plan (`docs/superpowers/plans/2026-10-26-easy-for-amma.md`) first.

## Global Constraints

- **Earlier constraints still apply.** Every "Global Constraints" line in the three earlier plans still holds, except that work happens on branch **`feature/history-and-refills`**, which gets a new PR. In particular:
  - The ringing path never depends on JS.
  - User writes throw. Ringing-path writes are best effort.
  - The JS bundle still builds for iOS.
  - Every new word goes into `en.ts`, `ml.ts` and `hi.ts` and, for native, into `values`, `values-ml` and `values-hi`. Malayalam and Hindi stay drafts.
- **Refills must never touch the alarm.** The dose record is written first, and the count is updated after it in its own best-effort step. A count at 0 still rings. A refill notification is posted outside the store lock, after the ring's end is recorded.
- **What counts:** taken ÷ every recorded dose (taken, skipped and missed). The percentage is rounded **down**, so 199 of 200 is 99%, never 100%. With no records there is no percentage.
- **Day states:** `all` (every record taken), `some`, `none` (records but none taken), and `empty` (no records). Their colours are `colors.success`, a new `colors.warning: '#B45309'`, `colors.danger`, and no fill. Each filled cell has a white number. Today is outlined (2 px, `colors.text`). Days after today use `colors.textMuted` and can't be opened.
- **Refill numbers:**
  - Only tablets and capsules are counted.
  - `remaining` is null (not counted, the default) or 0 to **999**, in steps of **0.5**.
  - The quick buttons are **+10**, **+15** and **+30**. They add to the field, and an empty field counts as 0.
  - Days left = ⌊remaining ÷ (amount × times per day)⌋.
  - Warn when days left ≤ **5**, unless the course ends first. Here "ends first" means the pill has a last day, and remaining ≥ amount × the dose times still to come (after now, through the last day).
  - `out` when remaining is 0, otherwise `low`.
  - A Taken lowers each counted pill by the amount in the **dose's snapshot**. The count never goes below 0.
- **Refill notifications:**
  - These go on channel `refill_reminders`, "Refill reminders", at `IMPORTANCE_DEFAULT`, with one notification id per pill (`"refill:$pillId".hashCode()`).
  - One is posted when a pill's level first rises to `low`, and one when it first rises to `out`.
  - Saving a higher count, or turning counting on, clears `refillNotified`.
- **Fixed copy, English:**
  - History:
    - Title and top bar: "History", "Share", "Previous month", "Next month".
    - Month label: "{Oct} {2026}", from `t.months`.
    - Summary: "{92}% taken", "{46} of {50} doses", "No doses recorded".
    - Legend: "All taken", "Some not taken", "None taken".
    - Errors: "Could not share the report", "Couldn't load the history."
  - Day page:
    - Title: `formatDay`, for example "Tue 6 Oct".
    - Statuses: "✓ Taken {8:03 AM}", "Skipped", "Missed", and "✓ Taken (marked {26 Oct}, {10:15 AM})".
    - Empty: "Nothing was recorded on this day."
  - Report: exactly the format in Task 6.
  - Pill page: "Tablets left", "Capsules left", "+10", "+15", "+30", "Optional. It goes down by the amount at each Taken."
  - Today banner: "{Telma 40}: {9 tablets} left", "{Telma 40}: none left", "About {4} days." ("About 1 day."), "Less than a day.", "Add tablets", "Add capsules".
  - Notification: "{Telma 40}: {9 tablets} left · about {4} days" ("about 1 day", "less than a day"), "{Telma 40}: none left", and the channel "Refill reminders".
  - Amounts use `formatAmount` / `DoseRules.amountText` in the app's language, so "9 tablets", "½ tablet" and "9½ tablets" all come out right. Times keep the phone's 12/24-hour format.
- **Fixed copy, translations used in tests:** "History" is ml "ചരിത്രം" and hi "इतिहास".
- **Commits:** one per task, conventional, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. `npx tsc --noEmit` and `npm run lint` stay clean after every task. Before pushing, check that the PR isn't merged (`gh pr view --json state`).

## Review Focus

These five cases are the ones no spec check reaches and the most likely to hurt a real user, most likely first. Each one's test is in the task that owns the code.

1. **The pill page is open while a ring's Taken lowers the count.** Saving the page after a name change must not put the old count back. Tests: Task 2 `savedCount_untouched_keepsStored`; Task 9 `keeps the stored count when the field is untouched`.
2. **One missed dose in 200 shows 100%.** Rounding up would show a better month than happened. Test: Task 5 `summarize floors 199 of 200 to 99`.
3. **A Taken on a dose already taken** (Mark as taken on Today, then the notification's Taken) lowers the count twice. Test: Task 3 `takenNow_alreadyTaken_false`.
4. **Calendar edges:** a month that starts on the phone's first weekday (no blank row), a leap February, and a Monday or a Saturday week start. Test: Task 5 `monthGrid` cases.
5. **The evening of a course's last day.** After the final dose the count is 0, and Today must not nag "none left". Test: Task 3 `warning_lastDoseTaken_none`.

---

## File Structure

Kotlin, under `android/app/src/main/java/com/pillsaathi/`:

| File | Change | Responsibility |
| --- | --- | --- |
| `alarm/RefillRules.kt` | create | `RefillLevel`, `RefillWarning`, `RefillUpdate`, `RefillRules` (pure) |
| `alarm/PillModels.kt` | modify | `Pill.remaining`, `Pill.refillNotified`, `PillDraft.remaining/remainingChanged`, `DoseRecord.marked`, `Today.refills`, `History` |
| `alarm/DoseRules.kt` | modify | `gapRecords`, `dosesBetween`, `markedTaken` sets `marked` |
| `alarm/PillJson.kt` | modify | the new keys, with defaults for files without them |
| `alarm/AlarmEngine.kt` | modify | gap recording, counts on Taken, `history()`, refills in `today()` |
| `alarm/Notifications.kt` | modify | refill channel and `postRefill` |
| `bridge/PillInputValidator.kt`, `bridge/NativeAlarmsModule.kt` | modify | count input; `getHistory`; `remaining` and `refills` out |
| `res/values*/strings.xml` | modify | refill notification copy |
| `debug/.../DebugAlarmReceiver.kt`, `debug/AndroidManifest.xml` | modify | `--ef remaining` on `DEBUG_ADD_PILL`; `DEBUG_ADD_DOSE` |

JS:

| File | Change |
| --- | --- |
| `src/lib/history.ts`, `src/lib/report.ts` | create (pure) |
| `src/screens/HistoryScreen.tsx`, `src/screens/HistoryDayScreen.tsx` | create |
| `src/components/PillPicture.tsx`, `src/components/RefillBanner.tsx` | create (`PillPicture` moves out of `DoseCard`) |
| `specs/NativeAlarms.ts`, `src/native/alarms.ts` | modify |
| `src/screens/TodayScreen.tsx`, `PillEditScreen.tsx`, `src/components/DoseCard.tsx`, `src/navigation/RootNavigator.tsx`, `src/theme.ts` | modify |
| `src/i18n/en.ts`, `ml.ts`, `hi.ts` | modify |

Tests:
- Kotlin: `RefillRulesTest` (create). `DoseRulesTest`, `PillJsonTest` and `bridge/PillInputValidatorTest` (modify).
- Jest: `__tests__/lib/history.test.ts`, `__tests__/lib/report.test.ts`, `__tests__/screens/HistoryScreen.test.tsx` and `HistoryDayScreen.test.tsx` (create). `TodayScreen`, `PillEditScreen`, `native/alarms` and `helpers/nativeMocks.ts` (modify).

Docs: `README.md`, `JOURNAL.md`, the new PR's description.

---

### Task 1: Record every missed dose in a gap

**Files:**
- Modify: `alarm/DoseRules.kt`, `alarm/AlarmEngine.kt` (`reconcile`, `onFired`)
- Test: `DoseRulesTest.kt`

**Interfaces:**
- Produces: `DoseRules.gapRecords(alarm: Alarm, pills: List<Pill>, firstDue: Long, now: Long, zone: ZoneId): List<DoseRecord>`.
  - It returns a MISSED record (`at = now`) for [firstDue] and for each later day's `alarm.hour:alarm.minute` up to and including [now].
  - It covers only days in `alarm.days` (empty means any day) on which `pillsDue` is not empty, oldest first.
  - It gives no record dated before `today − RECORD_KEEP_DAYS`, and loops at most 366 days.

- [ ] **Step 1: Write the failing tests** (`NOW = oct(26, 10, 0)`, card at 8:00)

  ```kotlin
  @Test fun gapRecords_everyDueTime()               // pill from Oct 20, no end; firstDue oct(23,8,0) → dates 23, 24, 25, 26, all MISSED, at == NOW
  @Test fun gapRecords_skipsDaysWithNothingDue()    // A: Oct 22, days 2; B: from Oct 25 → 23 (A), 25 (B), 26 (B); none on 24
  @Test fun gapRecords_todayNotYetDue()             // now oct(26,7,0) → 23, 24, 25 only
  @Test fun gapRecords_keepsAYear()                 // firstDue 400 days before NOW → first record dated TODAY − 365, last TODAY
  @Test fun gapRecords_snapshotsPillsDueEachDay()   // each record's pills are the ones pillsDue gives for its date
  ```

- [ ] **Step 2: Run them and see them fail.** Run: `cd android && ./gradlew :app:testDebugUnitTest --tests '*DoseRulesTest'`. Expected: compilation fails on `gapRecords`.

- [ ] **Step 3: Implement `gapRecords`, and use it in the engine.**
  - In `reconcile`, each `result.missed` entry now records `gapRecords(alarm, pills, m.dueAt, now, zone())`, folded through `withRecord`, instead of one `doseRecord`.
  - The alert stays one per card. It is named after that card's first gap record that is still missed, and is left out when there is none.
  - `onFired`'s MISSED branch does the same from its `occurrence`. Replace `recordDose` there with a best-effort `recordMissedGap(alarm, firstDue, now): DoseRecord?` that returns that first still-missed record.
  - Update both KDocs.

- [ ] **Step 4: Run the tests and build.** Run: `./gradlew :app:testDebugUnitTest :app:assembleDebug`. Expected: pass.

- [ ] **Step 5: Check on the emulator.**
  1. Add a pill at a time 2 minutes away, and let it ring once (Taken).
  2. Run `adb shell am force-stop com.pillsaathi`, then `adb shell cmd alarm set-time <now + 2 days + 5 min, in ms>`.
  3. Open the app.

  Expected: `DEBUG_LIST` and the log show one MISSED record for each of the two days in between. The app shows one missed alert for the card, and the notification shade shows none (`APP_OPEN`). Set the clock back afterwards.

- [ ] **Step 6: Commit** with `feat: record every dose missed while the phone was off or the app stopped`.

---

### Task 2: Marked doses and tablet counts in the store

**Files:**
- Create: `alarm/RefillRules.kt` (this task: `RefillLevel`, `isCountable` and `savedCount` only)
- Modify: `alarm/PillModels.kt`, `alarm/PillJson.kt`, `alarm/DoseRules.kt` (`markedTaken`), `alarm/AlarmEngine.kt` (`savePill`), `bridge/PillInputValidator.kt`, `bridge/NativeAlarmsModule.kt` (`pillToJs`), `debug/.../DebugAlarmReceiver.kt`
- Test: `RefillRulesTest.kt`, `PillJsonTest.kt`, `DoseRulesTest.kt`, `bridge/PillInputValidatorTest.kt`

**Interfaces:**
- Produces:
  - `enum class RefillLevel(val json: String) { LOW("low"), OUT("out") }`. `OUT` outranks `LOW` by ordinal.
  - `Pill` gains `remaining: Double? = null` and `refillNotified: RefillLevel? = null`.
  - `PillDraft` gains `remaining: Double? = null` and `remainingChanged: Boolean = false`.
  - `DoseRecord` gains `marked: Boolean = false`. `DoseRules.markedTaken` sets it to true.
  - JSON keys: `remaining` and `refillNotified` (`"low"`/`"out"`/null) on pills, and `marked` on doses. A missing key reads as null/false, and an unknown level reads as null.
  - `RefillRules.isCountable(form: PillForm): Boolean` is true for TABLET and CAPSULE.
  - `RefillRules.savedCount(existing: Pill?, draft: PillDraft): Pair<Double?, RefillLevel?>` returns the count and `refillNotified` to save:
    - When the form isn't countable, (null, null).
    - The count is the draft's for a new pill or when `remainingChanged` is true, and otherwise the stored one.
    - `refillNotified` is null for a new pill, a null count, or a count above the stored one (including one counted for the first time). Otherwise it stays the stored value.
  - Validator:
    - `remaining` is missing or null, or a number from 0 to 999 in steps of 0.5. A non-null count on syrup or drops is `INVALID_PILL`.
    - `remainingChanged` is missing (false) or a boolean.
  - `pillToJs` adds `remaining` (number or null).

- [ ] **Step 1: Write the failing tests**

  ```kotlin
  // RefillRulesTest
  @Test fun savedCount_newPill_usesDraft()           // (null, draft 30) → (30.0, null)
  @Test fun savedCount_untouched_keepsStored()       // stored 29 (LOW), draft 30 unchanged → (29.0, LOW)   (Review Focus 1)
  @Test fun savedCount_raised_rearms()               // stored 3 (OUT), draft 33 changed → (33.0, null)
  @Test fun savedCount_lowered_keepsNotified()       // stored 9 (LOW), draft 8 changed → (8.0, LOW)
  @Test fun savedCount_cleared_notCounted()          // draft null changed → (null, null)
  @Test fun savedCount_syrup_null()                  // stored tablet 9, draft form SYRUP → (null, null)
  // PillJsonTest
  @Test fun pill_countRoundTrip()                    // remaining 9.5, refillNotified LOW survive
  @Test fun pill_withoutCount_notCounted()           // pre-stage-4 JSON → remaining null, refillNotified null
  @Test fun dose_markedRoundTrip_andMissingFalse()
  // DoseRulesTest
  @Test fun markedTaken_setsMarked()
  // PillInputValidatorTest
  @Test fun remaining_halfStepsInRange()             // 0, 9.5, 999 ok; −1, 9.3, 999.5, "9" rejected
  @Test fun remaining_onSyrup_rejected()
  @Test fun remaining_missing_notCountedUnchanged()  // → remaining null, remainingChanged false
  ```

- [ ] **Step 2: Run them and see them fail.** Run: `./gradlew :app:testDebugUnitTest --tests '*RefillRulesTest' --tests '*PillJsonTest' --tests '*DoseRulesTest' --tests '*PillInputValidatorTest'`.

- [ ] **Step 3: Implement the interfaces above.** `savePill` sets the pill's `remaining` and `refillNotified` from `savedCount`, inside the same lock. In `DebugAlarmReceiver`, `DEBUG_ADD_PILL` takes `--ef remaining <n>` (with `remainingChanged = true`).

- [ ] **Step 4: Run all Kotlin tests and build.** Run: `./gradlew :app:testDebugUnitTest :app:assembleDebug`. Expected: pass. JS is unchanged and still passes, because the bridge accepts input without the new keys.

- [ ] **Step 5: Commit** with `feat: store tablet counts on pills and mark doses taken later as marked`.

---

### Task 3: Lower counts on Taken, warn on Today and notify once

**Files:**
- Modify: `alarm/RefillRules.kt`, `alarm/PillModels.kt` (`Today.refills`), `alarm/AlarmEngine.kt` (`onRingEnded`, `markTaken`, `today`), `alarm/Notifications.kt`, `bridge/NativeAlarmsModule.kt` (`getToday`), `res/values/strings.xml`, `res/values-ml/strings.xml`, `res/values-hi/strings.xml`
- Test: `RefillRulesTest.kt`

**Interfaces:**
- Consumes: `RefillLevel`, `Pill.remaining`, `Pill.refillNotified`, `isCountable` (Task 2).
- Produces:
  - `data class RefillWarning(val pillId: String, val name: String, val form: PillForm, val remaining: Double, val daysLeft: Int, val level: RefillLevel)`
  - `data class RefillUpdate(val pills: List<Pill>, val notices: List<RefillWarning>)`
  - `RefillRules`:
    - `WARN_DAYS = 5`.
    - `daysLeft(pill: Pill): Int?`: null when the pill isn't counted.
    - `dosesLeft(pill: Pill, now: Long, zone: ZoneId): Int?`: the dose times after [now] through the last day, counting from the start date if the course hasn't started yet. Null when the course has no end.
    - `warning(pill: Pill, now: Long, zone: ZoneId): RefillWarning?`: null when the pill isn't countable, isn't counted, isn't active, has more than `WARN_DAYS` left, or its course ends first.
    - `warnings(pills: List<Pill>, now: Long, zone: ZoneId): List<RefillWarning>`, in the order the pills were added.
    - `takenNow(before: DoseRecord?, after: DoseRecord?): Boolean`: whether [after] is TAKEN and [before] wasn't.
    - `afterTaken(pills: List<Pill>, taken: DoseRecord, now: Long, zone: ZoneId): RefillUpdate`: lowers each counted pill in `taken.pills` by its snapshot amount. A warning whose level outranks the pill's `refillNotified` (or any warning, when that is null) becomes a notice and is stored as the new `refillNotified`.
  - `Today` gains `refills: List<RefillWarning>`. `getToday` adds `refills: [{pillId, name, form, remaining, daysLeft, level}]`.
  - `Notifications.CHANNEL_REFILL = "refill_reminders"`, which `ensureChannels` now creates. `Notifications.postRefill(context: Context, w: RefillWarning)` opens the app when tapped.
  - Strings: `channel_refill`, `refill_low` (`%1$s: %2$s left · %3$s`), `refill_out` (`%1$s: none left`), plurals `refill_days` (`about %d day` / `about %d days`), and `refill_less_than_day`.

- [ ] **Step 1: Write the failing tests** (`NOW = oct(26, 10, 0)`, tablet amount 1 at 8:00 and 21:00, no end, unless stated)

  ```kotlin
  @Test fun daysLeft_floorsAndCountsHalves()          // 9 → 4; amount 0.5 at 2 times, 9 → 9; null when not counted
  @Test fun warning_fiveDaysOrFewer_low()             // 10 → LOW, daysLeft 5; 12 → null
  @Test fun warning_zero_out()                        // 0 → OUT
  @Test fun warning_courseEndsFirst_none()            // last day Oct 28, remaining 5 (doses left: 21:00 today + 4) → null; remaining 4 → LOW
  @Test fun warning_lastDoseTaken_none()              // last day Oct 26, now oct(26,22,0), remaining 0 → null      (Review Focus 5)
  @Test fun warning_syrupOrNotCounted_none()
  @Test fun dosesLeft_notStarted_fromStartDate()      // starts Oct 28, 2 days → 4
  @Test fun afterTaken_lowersBySnapshotAmount()       // snapshot 1.5, pill now amount 1, remaining 10 → 8.5
  @Test fun afterTaken_neverBelowZero()               // remaining 0.5, snapshot 1 → 0
  @Test fun afterTaken_skipsDeletedAndUncounted()
  @Test fun afterTaken_noticeOncePerLevel()           // 11 → 10: one LOW notice; 10 → 9: none; …; 1 → 0: one OUT notice
  @Test fun afterTaken_rearmedAfterRefill()           // refillNotified null with a LOW-level count → LOW notice again
  @Test fun takenNow_alreadyTaken_false()             // (TAKEN, TAKEN) false; (null, TAKEN) true; (MISSED, TAKEN) true   (Review Focus 3)
  ```

- [ ] **Step 2: Run them and see them fail.** Run: `./gradlew :app:testDebugUnitTest --tests '*RefillRulesTest'`.

- [ ] **Step 3: Implement the rules, then wire the engine.**
  - **`onRingEnded`:** `recordDose` also reports the stored record before the write. When `takenNow` is true, a separate `bestEffort("the counts after …")` loads the pills, applies `afterTaken` and saves them. Its notices are posted with `postRefill` after the lock, next to `postMissed`.
  - **`markTaken`:** it saves the doses as now, which still throws. It then lowers the counts the same way, best effort, so a failed count never fails Mark as taken. Its notices are posted after the lock too.
  - **`today()`:** it adds `RefillRules.warnings`.
  - **Translations:** translate the new strings into `values-ml` and `values-hi` (drafts).

- [ ] **Step 4: Run the tests and build.** Run: `./gradlew :app:testDebugUnitTest :app:assembleDebug`. Expected: pass.

- [ ] **Step 5: Check on the emulator** (debug build):
  1. Add a pill with `DEBUG_ADD_PILL --ei minutes_from_now 1 --ef remaining 11` (one time a day). Answer Taken on the ring. Expected: `DEBUG_LIST` shows `remaining=10.0` and `refillNotified=LOW`. One "Refill reminders" notification appears after the ring ends, never while it rings.
  2. Edit the time to ring again and answer Taken. Expected: 9 left and no second notification.
  3. Repeat step 1 with the app killed (`adb shell am kill com.pillsaathi` before the ring), so only `:ringing` runs. Expected: the same.
  4. Add a pill with `--ef remaining 0`. Expected: it still rings, and Taken leaves it at 0.

- [ ] **Step 6: Commit** with `feat: lower tablet counts on Taken and warn once before they run out`.

---

### Task 4: History data from native

**Files:**
- Modify: `alarm/PillModels.kt`, `alarm/DoseRules.kt`, `alarm/AlarmEngine.kt`, `bridge/NativeAlarmsModule.kt`, `specs/NativeAlarms.ts`, `src/native/alarms.ts`, `__tests__/helpers/nativeMocks.ts`, `debug/.../DebugAlarmReceiver.kt`, `debug/AndroidManifest.xml`
- Test: `DoseRulesTest.kt`, `__tests__/native/alarms.test.ts`

**Interfaces:**
- Produces:
  - Kotlin:
    - `DoseRules.dosesBetween(records: List<DoseRecord>, from: LocalDate, to: LocalDate): List<DoseRecord>` returns the records from [from] through [to], by date and then time.
    - `data class History(val today: LocalDate, val oldest: LocalDate?, val doses: List<DoseRecord>, val pills: List<Pill>)`.
    - `AlarmEngine.history(from, to): History` reads under the lock.
  - Spec and TS:

    ```ts
    export type NativeHistoryPill = { pillId: string; name: string; form: string; amount: number; exists: boolean; photoUri: string | null };
    export type NativeHistoryDose = { date: string; hour: number; minute: number; outcome: string; at: number; marked: boolean; pills: NativeHistoryPill[] };
    export type NativeHistory = { today: string; oldest: string | null; firstDayOfWeek: number; doses: NativeHistoryDose[] };
    getHistory(from: string, to: string): Promise<NativeHistory>; // from, to: YYYY-MM-DD, inclusive
    ```

    `src/native/alarms.ts` exports `HistoryPill`, `HistoryDose` (with `outcome: 'taken' | 'skipped' | 'missed'` and `form: PillForm`), `History` and `getHistory`.
  - `firstDayOfWeek` counts from 0 for Sunday, as `Date.getDay()` does. It comes from `LocalePreferences.getFirstDayOfWeek()` (`sun`…`sat`), or `Calendar.getInstance().firstDayOfWeek - 1` if that fails.
  - `exists` and `photoUri` come from the pills as they are now.
  - Mock default: `getHistory` resolves `{ today: '2026-10-26', oldest: null, firstDayOfWeek: 0, doses: [] }`.
  - Debug broadcast `com.pillsaathi.DEBUG_ADD_DOSE --es date YYYY-MM-DD --ei hour H --ei minute M --es outcome taken|skipped|missed` records the pills due then, through `doseRecord` and `withRecord`, for checking the screens.

- [ ] **Step 1: Write the failing tests**

  ```kotlin
  @Test fun dosesBetween_inclusiveAndSorted()   // records 5, 6 21:00, 6 08:00, 7, 8 Oct; (6, 7) → [6 08:00, 6 21:00, 7]
  ```

  ```ts
  test('passes getHistory through')   // native mock returns a history → getHistory('2026-10-01', '2026-10-31') resolves it, called with both dates
  ```

- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement the interfaces above.**
- [ ] **Step 4: Run all checks.** Run: `npm test && npx tsc --noEmit && npm run lint && (cd android && ./gradlew :app:testDebugUnitTest :app:assembleDebug)`. Expected: pass.
- [ ] **Step 5: Commit** with `feat: read dose history for a date range from native`.

---

### Task 5: Calendar rules

**Files:**
- Create: `src/lib/history.ts`
- Test: `__tests__/lib/history.test.ts`

**Interfaces:**
- Consumes: `HistoryDose` (Task 4), and `addDays`, `toISODate` (`src/lib/course.ts`).
- Produces:

  ```ts
  export type DayState = 'all' | 'some' | 'none' | 'empty';
  export function dayState(doses: Pick<HistoryDose, 'outcome'>[]): DayState;
  export function summarize(doses: Pick<HistoryDose, 'outcome'>[]): { taken: number; total: number; percent: number | null }; // floor; null when total is 0
  export function monthOf(iso: string): string;                       // '2026-10-26' → '2026-10'
  export function addMonths(month: string, n: number): string;        // ('2026-01', -1) → '2025-12'
  export function monthRange(month: string, today: string): { from: string; to: string }; // to = the month's last day, or today if earlier
  export function monthGrid(month: string, firstDayOfWeek: number): (string | null)[][];  // rows of 7; null pads either end
  export function weekdays(firstDayOfWeek: number): number[];         // 1 → [1, 2, 3, 4, 5, 6, 0]
  export function byDate(doses: HistoryDose[]): Map<string, HistoryDose[]>;
  ```

- [ ] **Step 1: Write the failing tests**

  ```ts
  it('colours a day by its doses')            // [] → 'empty'; all taken → 'all'; taken + missed → 'some'; skipped + missed → 'none'
  it('summarize floors 199 of 200 to 99')     // and 46 of 50 → 92; [] → percent null     (Review Focus 2)
  it('steps months across years')
  it('ranges a month up to today')            // ('2026-10', '2026-10-25') → 1st–25th; ('2026-09', '2026-10-25') → 1st–30th
  it('lays out October 2026 from Sunday and from Monday')  // Oct 1 2026 is a Thursday: 4 leading nulls, then 3   (Review Focus 4)
  it('needs no blank row when the month starts on the first weekday')  // Feb 2026 from Sunday: first row starts '2026-02-01'
  it('lays out a leap February from Saturday')            // '2028-02' with 6: 29 days, first row starts '2028-02-05'… check every date once
  ```

- [ ] **Step 2: Run them and see them fail.** Run: `npx jest __tests__/lib/history.test.ts`.
- [ ] **Step 3: Implement.** Dates are ISO strings throughout, built through `course.ts`'s local-noon parsing, so a time zone can never shift a day.
- [ ] **Step 4: Run them and see them pass, then `npx tsc --noEmit && npm run lint`.**
- [ ] **Step 5: Commit** with `feat: add pure calendar rules for History`.

---

### Task 6: The shared report text

**Files:**
- Create: `src/lib/report.ts`
- Modify: `src/i18n/en.ts`, `ml.ts`, `hi.ts` (a `report` group)
- Test: `__tests__/lib/report.test.ts`

**Interfaces:**
- Consumes: `summarize`, `monthRange` (Task 5); `formatDay`, `lastDay` (`course.ts`); `formatAmount`; `formatTime`; `Pill`, `HistoryDose`.
- Produces: `reportText(o: { month: string; today: string; doses: HistoryDose[]; pills: Pill[]; is24h: boolean; lang: Lang; t: Strings }): string`.
  - **Range:** "1–25 Oct 2026" (en dash), or "1 Oct 2026" when the range is a single day.
  - **Not taken:** every skipped or missed dose, oldest first, with its pills' snapshot names.
  - **Medicines now:** the pills whose course hasn't ended (no end, or last day ≥ today), in the order they were added. Each has its amount in `lang`, its times sorted, and "no end" or "last day {formatDay}".
  - **Format** (English, lines joined with `\n`):

    ```
    PillSaathi · 1–25 Oct 2026
    Taken 46 of 50 doses (92%)        ← "No doses recorded" when there are none

    Not taken:                        ← "Not taken: none" when all were taken; the block is left out when there are none
    • Tue 6 Oct, 9:00 PM: missed (Telma 40)
    • Wed 14 Oct, 8:00 AM: skipped (Telma 40, Vitamin D)

    Medicines now:                    ← "Medicines now: none" with no current pills
    • Telma 40: 1 tablet at 8:00 AM, 9:00 PM, no end
    • Vitamin D: 1 capsule at 8:00 AM, last day Fri 30 Oct
    ```

- [ ] **Step 1: Write the failing tests**

  ```ts
  it('writes the spec example exactly')         // the block above, with the annotations removed
  it('writes an empty month')                   // 'No doses recorded', no Not taken block
  it('writes a month with only misses')         // 'Taken 0 of 2 doses (0%)'
  it('says none when every dose was taken')     // 'Not taken: none'
  it('ranges a past month to its last day')     // month '2026-09', today '2026-10-25' → '1–30 Sep 2026'
  it('leaves finished courses out of Medicines now')
  it('writes Malayalam with pill names as typed') // lang 'ml', t: ml → contains ml.report.notTaken and 'Telma 40'; no 'Not taken' or 'Medicines now'
  ```

- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement it.** Put every word in `t.report`, with Malayalam and Hindi as drafts. Leave the outcome words "missed" and "skipped" lowercase in English.
- [ ] **Step 4: Run all JS checks.** Run: `npm test && npx tsc --noEmit && npm run lint`.
- [ ] **Step 5: Commit** with `feat: build a plain-text dose report for a month`.

---

### Task 7: History screen

**Files:**
- Create: `src/screens/HistoryScreen.tsx`
- Modify: `src/navigation/RootNavigator.tsx`, `src/screens/TodayScreen.tsx`, `src/theme.ts`, `src/i18n/en.ts`, `ml.ts`, `hi.ts`
- Test: `__tests__/screens/HistoryScreen.test.tsx`, `TodayScreen.test.tsx`

**Interfaces:**
- Consumes: `getHistory`, `listPills`, `is24HourFormat` (Task 4); everything in Tasks 5 and 6; `useI18n`.
- Produces:
  - Routes: `History: undefined`. Also add `HistoryDay: { date: string }` to `RootStackParamList` now, though its screen comes in Task 8.
  - Today's `headerRight` is a 📅 button (`accessibilityLabel={t.history.title}`) next to the ⚙.
  - **History:**
    - The title is `t.history.title`, and `headerRight` is a "Share" text button.
    - The month row is ‹ "Oct 2026" ›. The arrows' `accessibilityLabel`s are "Previous month" and "Next month". They are `disabled` before `monthOf(oldest)` (or always, with no records) and after `monthOf(today)`.
    - The summary is "92% taken" (large) with "46 of 50 doses" under it, or "No doses recorded".
    - The weekday header uses `t.days`, ordered by `weekdays(firstDayOfWeek)`.
    - The grid comes from `monthGrid`. Each day cell has `accessibilityLabel` "{formatDay}: {legend word}", or just `formatDay` for an empty or future day.
    - The legend sits under the grid.
    - Opening it loads the current month, and returning to it (focus) reloads the month on screen.
    - Pressing a day up to today navigates to `HistoryDay { date }`.
  - **Share:**
    1. Read `listPills()`.
    2. Build `reportText` for the month on screen with the doses already loaded.
    3. Call `Share.share({ message })`.

    A failure shows "Could not share the report".

- [ ] **Step 1: Write the failing tests**

  ```ts
  it('opens History from the calendar icon')            // TodayScreen test
  it('shows the month, its share taken and each day's colour')
  // doses: Oct 6 taken + missed, Oct 7 two taken, Oct 8 missed → '60% taken', '3 of 5 doses';
  // labels 'Tue 6 Oct: Some not taken', 'Wed 7 Oct: All taken', 'Thu 8 Oct: None taken'
  it('moves between months within the kept records')
  // oldest '2026-09-10', today '2026-10-26': Next disabled; Previous → getHistory('2026-09-01', '2026-09-30'); Previous then disabled
  it('stays on this month with no records')             // both arrows disabled; 'No doses recorded'
  it('starts the week on the phone's first day')        // firstDayOfWeek 1 → the first header is 'Mon'; 0 → 'Sun'
  it('opens a past day and not a future one')           // press 'Tue 6 Oct: …' → HistoryDay; 'Tue 27 Oct' does nothing
  it('shares the month as text')                        // jest.spyOn(Share, 'share') called with { message } starting 'PillSaathi · 1–26 Oct 2026'
  it('shows History in Malayalam')                      // currentLanguage 'ml' → header title 'ചരിത്രം'
  ```

- [ ] **Step 2: Run them and see them fail.** Run: `npx jest __tests__/screens/HistoryScreen.test.tsx __tests__/screens/TodayScreen.test.tsx`.
- [ ] **Step 3: Implement the interfaces above.** At large text, each cell keeps a 1:1 square with `flex: 1` in its row, and the numbers stay inside. Check at font scale 2.0 in Step 5.
- [ ] **Step 4: Run all JS checks.**
- [ ] **Step 5: Check on the emulator.**
  1. Seed a month with `DEBUG_ADD_DOSE`.
  2. Check the colours, the outlined today, the month arrows, and font scale 2.0 (`adb shell settings put system font_scale 2.0`).
  3. Share into Messages (the emulator has no WhatsApp). Expected: plain text with line breaks intact.
- [ ] **Step 6: Commit** with `feat: add a History calendar with a shareable monthly report`.

---

### Task 8: One day's page

**Files:**
- Create: `src/screens/HistoryDayScreen.tsx`, `src/components/PillPicture.tsx` (moved from `DoseCard.tsx`, its prop narrowed to `Pick<TodayPill, 'pillId' | 'form' | 'photoUri'>`, testIDs unchanged)
- Modify: `src/components/DoseCard.tsx` (imports it), `src/navigation/RootNavigator.tsx`, `src/i18n/en.ts`, `ml.ts`, `hi.ts`
- Test: `__tests__/screens/HistoryDayScreen.test.tsx`

**Interfaces:**
- Consumes: `getHistory`, `markDoseTaken` (bridge); `formatDay`, `formatTime`, `formatAmount`; `PillPicture` (prop `pill: Pick<TodayPill, 'pillId' | 'form' | 'photoUri'>`).
- Produces:
  - Route `HistoryDay: { date: string }`. The title is `formatDay(date)`. The page loads `getHistory(date, date)` on focus.
  - Each dose, by time, shows its time, its status and its snapshot pills as rows of photo or icon, name and amount. The rows can't be pressed.
  - Statuses:
    - "✓ Taken {time of at}".
    - "✓ Taken (marked {d Mon}, {time})" when `marked`. `{d Mon}` is "26 Oct", from `t.months`.
    - "Skipped" or "Missed", with a "Mark as taken" button.
  - "Mark as taken" confirms as Today does (`t.today.markTakenTitle`, "{time} · {names}"). It then calls `markDoseTaken(date, hour, minute)` and reloads. A failure shows `t.today.markFailed`.
  - With no records the page says "Nothing was recorded on this day."

- [ ] **Step 1: Write the failing tests**

  ```ts
  it('lists the day's doses with their pills as they were')  // taken at 8:03 → '✓ Taken 8:03 AM'; missed 9:00 PM; 'Telma 40', '1 tablet'
  it('shows a pill deleted since from its snapshot')          // exists false → its name, 'pill-icon-<id>', no photo
  it('marks an earlier day's dose taken')
  // press 'Mark as taken' → confirm → markDoseTaken('2026-10-06', 21, 0); the reload returns it marked at Oct 26 10:15
  // → '✓ Taken (marked 26 Oct, 10:15 AM)'
  it('says when nothing was recorded')
  ```

- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement the interfaces above.** `DoseCard`'s own tests must pass unchanged after the `PillPicture` move.
- [ ] **Step 4: Run all JS checks.**
- [ ] **Step 5: Check on the emulator.**
  1. Open a seeded day.
  2. Delete one of its pills, then reopen the day. Expected: the deleted pill is still shown from its snapshot.
  3. Mark a missed dose taken. Expected: the calendar's colour for that day updates on Back.
- [ ] **Step 6: Commit** with `feat: show one day's doses in History, with Mark as taken`.

---

### Task 9: Tablet counts on the pill page and the Today banner

**Files:**
- Create: `src/components/RefillBanner.tsx`
- Modify: `specs/NativeAlarms.ts`, `src/native/alarms.ts`, `src/screens/PillEditScreen.tsx`, `src/screens/TodayScreen.tsx`, `src/navigation/RootNavigator.tsx`, `src/i18n/en.ts`, `ml.ts`, `hi.ts`, `__tests__/helpers/nativeMocks.ts`
- Test: `__tests__/screens/PillEditScreen.test.tsx`, `TodayScreen.test.tsx`

**Interfaces:**
- Consumes: the `remaining`, `refills` and input keys from Tasks 2–3.
- Produces:
  - Types:
    - `NativePill.remaining: number | null`.
    - `PillInput.remaining: number | null` and `remainingChanged: boolean`.
    - `NativeToday.refills: NativeRefill[]`, where `NativeRefill = { pillId: string; name: string; form: string; remaining: number; daysLeft: number; level: string }`.
    - In TS, `Refill` has `form: PillForm` and `level: 'low' | 'out'`.
    - `emptyToday` and every `Today` fixture gain `refills: []`.
  - Route: `PillEdit: { pillId?: string; focusCount?: boolean }`.
  - **Pill page, tablet and capsule only:**
    - The section is labelled "Tablets left" or "Capsules left".
    - It has a `TextInput` (`decimal-pad`, `accessibilityLabel` = that label, `autoFocus` when `focusCount`), buttons "+10", "+15" and "+30", and the note.
    - A loaded count shows as `String(remaining)`.
    - The text must match `/^\d{1,3}(\.[05])?$/`. Empty means not counted. Anything else disables Save.
    - Any edit or button sets `remainingChanged`.
    - Save sends `remaining` (null for syrup, drops or an empty field) and `remainingChanged`.
  - **`RefillBanner`**, below `HealthBanner`, has one row per refill, and each whole row is a button:
    - Line 1: "Telma 40: 9 tablets left", or "Telma 40: none left".
    - Line 2, for `low` only: "About 4 days.", "About 1 day." or "Less than a day.".
    - Then the action, "Add tablets" or "Add capsules".
    - Pressing it navigates to `PillEdit { pillId, focusCount: true }`.

- [ ] **Step 1: Write the failing tests**

  ```ts
  // PillEditScreen
  it('adds tablets with the quick buttons')                // +10, +15 → field '25'; Save → remaining 25, remainingChanged true
  it('types a count and clears it')                       // '40' → 40; '' → null; both remainingChanged true
  it('keeps the stored count when the field is untouched') // loaded remaining 9, change the name → remaining 9, remainingChanged false   (Review Focus 1)
  it('refuses a count that is not a whole or half number') // '9.3' and '1000' disable Save
  it('hides the count for syrup and drops')                // switch to Syrup → no 'Tablets left'; Save → remaining null
  it('says Capsules left for capsules')
  it('opens at the count from the refill banner')          // focusCount → the field's autoFocus is true
  // TodayScreen
  it('warns when tablets run low and opens the pill at its count')
  // refills [{ Telma 40, tablet, 9, 4, 'low' }] → 'Telma 40: 9 tablets left', 'About 4 days.'; press → PillEdit { pillId, focusCount: true }
  it('says none left')                                     // level 'out', remaining 0 → 'Telma 40: none left', no days line
  ```

- [ ] **Step 2: Run them and see them fail.** Run: `npx jest __tests__/screens/PillEditScreen.test.tsx __tests__/screens/TodayScreen.test.tsx`.
- [ ] **Step 3: Implement the interfaces above.** Add `remaining` and `remainingChanged` to the existing save-expectation objects in `PillEditScreen.test.tsx`.
- [ ] **Step 4: Run all checks.** Run: `npm test && npx tsc --noEmit && npm run lint && (cd android && ./gradlew :app:testDebugUnitTest :app:assembleDebug)`.
- [ ] **Step 5: Check on the emulator.**
  1. Set a count with +10 on a real pill page and save. Expected: `DEBUG_LIST` shows `remaining=10.0`.
  2. Answer a ring with Taken.
  3. Open the banner and add tablets. Expected: the banner goes, and a later low notice can be posted again.
  4. Repeat at font scale 2.0. Expected: the buttons wrap and none is cut off.
- [ ] **Step 6: Commit** with `feat: add tablets left on the pill page and a running-low banner on Today`.

---

### Task 10: Docs, the full check, the device matrix and the PR

**Files:**
- Modify: `README.md`, `JOURNAL.md`, the new PR's description

- [ ] **Step 1: Run every check.** Run `npm test`, `npx tsc --noEmit`, `npm run lint` and `cd android && ./gradlew :app:testDebugUnitTest :app:assembleDebug :app:assembleRelease`. Expected: all pass. Report the counts.
- [ ] **Step 2: Run the spec's emulator checks**, recording each pass or fail. Tasks 1, 3, 7, 8 and 9 already ran most of them. Re-run any that a later task touched, and add the release build's History in English only.
- [ ] **Step 3: Run the device-only checks on the Redmi Note 10** if `adb devices` lists it:
  - Taken lowers the count with the app swiped away (MIUI).
  - The share sheet into WhatsApp, in English and in Malayalam.
  - The calendar at the phone's text size.

  If the phone isn't connected, mark them pending.
- [ ] **Step 4: Update the README.**
  - What the app does now: History, Share report, tablet counts.
  - `DEBUG_ADD_DOSE` and `--ef remaining` in the debug broadcast table.
  - A "History and refills" section in the device matrix, with the results from Steps 2–3.
- [ ] **Step 5: Commit and open the PR.**
  1. Commit with `docs: update README and device matrix for History and refills`.
  2. Push the branch.
  3. Open the PR against `main` with `gh pr create`. List what it adds, the checks with their results, and the pending device checks.
- [ ] **Step 6: Add the session's journal entry** in the existing format. Commit it with `docs: add session journal for History and refills` and push.
