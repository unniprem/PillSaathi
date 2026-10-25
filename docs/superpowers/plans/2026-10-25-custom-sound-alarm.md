# Custom-Sound Alarm (Android) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An Android alarm app where each alarm plays a sound the user recorded or imported. It rings like the built-in Clock: on time, on the lock screen, through silent mode, after the app is swiped away or the phone reboots, and on battery-aggressive phones.

**Architecture:** Native Kotlin owns everything ringing depends on:
- the data, in device-protected SharedPreferences
- scheduling, through `AlarmManager.setAlarmClock`
- ringing: a foreground service plus a native full-screen Activity
- recording, import and preview

React Native renders the four management screens plus the setup screen. It talks to native code only through two app-local TurboModules, `NativeAlarms` and `NativeSounds`. Pure decision logic lives in `AlarmRules.kt`, where JVM unit tests can reach it. Pure display logic lives in `src/lib/*.ts`, where Jest can reach it.

**Tech Stack:**
- React Native 0.88.0 (new architecture) and React 19.3, in TypeScript
- Kotlin, using java.time through core-library desugaring
- React Navigation 7 (native stack)
- Jest with `@testing-library/react-native` 14
- JUnit 4 for Kotlin JVM tests

**Spec:** `docs/superpowers/specs/2026-10-24-custom-sound-alarm-design.md`. Read it before starting any task; this plan argues from it.

## Global Constraints

- Versions: React Native `0.88.0`, React `19.3.0`, TypeScript, `newArchEnabled=true`, npm (`package-lock.json`).
- Android: `minSdk 24`, `targetSdk 36`, `compileSdk 37`, applicationId and namespace `com.pillsaathi`.
- Platform: Android only. The JS bundle must still build for iOS. Access native modules with `TurboModuleRegistry.get` (not `getEnforcing`), and have the `src/native/*` wrappers throw `Error('PillSaathi alarms are Android-only for now')` when the module is null.
- Ringing never depends on JS. The sound, vibration, notification, ringing screen, Stop and Snooze all work with no React Native runtime.
- Fixed values: snooze `10 min` (600_000 ms), with no limit. Auto-silence after `10 min` (600_000 ms). Maximum recording `2 min` (120_000 ms). Missed-alarm grace `2 min` (120_000 ms).
- Audio: play with `AudioAttributes.USAGE_ALARM` and `CONTENT_TYPE_SONIFICATION`, looping. Never change the user's alarm volume, and never boost or normalise audio.
- Fallback chain: the alarm's sound file → the phone's default alarm tone → the bundled `res/raw/fallback_alarm.wav`. An alarm with `soundId = null` starts at the phone's default tone.
- Imports: accept mp3, m4a/aac, wav and ogg. The app copies the file into its own storage and never keeps a reference to the original. Recordings are AAC in an MPEG-4 container (`.m4a`), mono, 44.1 kHz, 128 kbps.
- Storage: all alarm, sound and setup data, plus the sound files, live in **device-protected storage** (`context.createDeviceProtectedStorageContext()`). There are no accounts, cloud or Firebase.
- Day encoding everywhere (JSON, TurboModule, JS): ISO `1 = Mon … 7 = Sun`. An empty list means a one-time alarm. The UI chip order is `S M T W T F S`, starting with Sunday (7).
- Time display follows the phone's 12/24-hour setting (`DateFormat.is24HourFormat`).
- Do **not** declare `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`. Play policy's accepted use cases don't include alarm apps, and `setAlarmClock()` alarms already fire through Doze. Open `Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS` instead, which is the spec's stated fallback.
- The foreground service type is `systemExempted` (permission `FOREGROUND_SERVICE_SYSTEM_EXEMPTED`). Android allows it for apps holding `USE_EXACT_ALARM`/`SCHEDULE_EXACT_ALARM`.
- Commits: one per task, conventional (`feat: …`, `test: …`, `chore: …`), ending with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Work on branch `feature/fresh-start`.
- Code style: match the template (Prettier `singleQuote`, `trailingComma: all`, `arrowParens: avoid`; ESLint `@react-native`). Kotlin uses 2-space indentation like the template's `MainApplication.kt`. `npm run lint` and `npx tsc --noEmit` must stay clean after every task.

## Review Focus

The spec's tests don't exercise these five conditions. They're the ones most likely to bite a real user, most likely first. Each line names the task that adds its test.

1. **A recording stopped almost immediately (under ~0.5 s).** `MediaRecorder.stop()` throws. The user should see "That recording was too short. Try again." and return to the ready-to-record state, with no crash and no saved sound. The test is in Task 7.
2. **Importing a file that isn't playable audio** (a renamed text file, DRM, a video). The import should be rejected with `UNSUPPORTED_AUDIO`, leave no file or sound record behind, and show "That file can't be played. Try an mp3, m4a, wav or ogg file." The test is in Task 7, and the native cleanup is in Task 4.
3. **Deleting or turning off an alarm that is ringing or snoozed.** The ringing stops, the snooze is cancelled, and no ghost ring comes later. The tests are in Task 1 (`disarmed` clears the snooze) and Task 2 (the engine stops an active ring).
4. **Leaving the Record screen while recording** (back gesture or header back). The take is discarded and the microphone released. The test is in Task 7.
5. **Saving an alarm for the current minute** (say, 07:00 saved at 07:00:30). It's scheduled for the next matching day, not rung immediately and not skipped. The test is in Task 1 (`nextTrigger` is strictly after `now`).

---

## File Structure

```
specs/NativeAlarms.ts                       codegen spec: alarms, health, settings, setup, time picker
specs/NativeSounds.ts                       codegen spec: sound library, record, import, preview + events
src/native/alarms.ts                        typed wrapper + iOS guard over NativeAlarms
src/native/sounds.ts                        typed wrapper + iOS guard over NativeSounds
src/lib/time.ts                             formatTime()
src/lib/days.ts                             describeDays(), DAY_CHIP_ORDER
src/lib/health.ts                           healthIssues()
src/setup/oemSteps.ts                       maker → setup steps table, isAggressiveMaker()
src/theme.ts                                colors/spacing (light theme only)
src/navigation/RootNavigator.tsx            stack + RootStackParamList
src/screens/AlarmListScreen.tsx
src/screens/AlarmEditScreen.tsx
src/screens/SoundPickerScreen.tsx
src/screens/RecordScreen.tsx
src/screens/SetupScreen.tsx
src/components/AlarmRow.tsx, DayChips.tsx, HealthBanner.tsx, SoundRow.tsx
App.tsx                                     SafeAreaProvider + NavigationContainer + RootNavigator
__tests__/lib/*.test.ts, __tests__/screens/*.test.tsx, __tests__/helpers/renderApp.tsx

android/app/src/main/java/com/pillsaathi/
  MainActivity.kt, MainApplication.kt       (modified)
  alarm/AlarmModels.kt                      Alarm, Sound, SoundKind, MissedAlarm, ReconcileResult, SetupState
  alarm/AlarmRules.kt                       pure scheduling/missed/snooze rules
  alarm/AlarmJson.kt                        org.json (de)serialisation
  alarm/AlarmStore.kt                       device-protected SharedPreferences + sounds dir
  alarm/AlarmScheduler.kt                   setAlarmClock / cancel
  alarm/AlarmEngine.kt                      facade used by receivers, service, modules
  alarm/AlarmFireReceiver.kt                alarm fired → engine.onFired → RingingService
  alarm/SystemEventReceiver.kt              boot / time / package / permission → reconcile
  alarm/RingingService.kt                   foreground service: play, vibrate, notify, queue, auto-silence
  alarm/RingingState.kt                     in-process current-ring info + listeners
  alarm/AlarmPlayer.kt                      MediaPlayer with fallback chain
  alarm/AlarmVibrator.kt                    repeating alarm vibration
  alarm/Notifications.kt                    channels, ringing + missed notifications
  alarm/RingingActivity.kt                  full-screen ringing UI (Task 3)
  alarm/DebugHooks.kt                       auto-silence override (set only from debug)
  sound/SoundLibrary.kt, SoundRecorder.kt, SoundPreviewer.kt, SoundImporter.kt
  bridge/PillSaathiPackage.kt, NativeAlarmsModule.kt, NativeSoundsModule.kt,
  bridge/HealthChecker.kt, SettingsLauncher.kt, OemIntents.kt
android/app/src/main/res/layout/activity_ringing.xml, res/raw/fallback_alarm.wav, res/values/strings.xml
android/app/src/debug/AndroidManifest.xml + java/com/pillsaathi/alarm/debug/DebugAlarmReceiver.kt
android/app/src/test/java/com/pillsaathi/alarm/AlarmRulesTest.kt, AlarmJsonTest.kt
```

---

### Task 1: Alarm models and rules (pure Kotlin, JVM-tested)

**Files:**
- Modify: `android/app/build.gradle`. Add `compileOptions { coreLibraryDesugaringEnabled true }` and the dependencies `coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.5")`, `testImplementation("junit:junit:4.13.2")` and `testImplementation("org.json:json:20240303")`. The real org.json is needed because the Android stub throws in JVM tests.
- Create: `android/app/src/main/java/com/pillsaathi/alarm/AlarmModels.kt`, `AlarmRules.kt`, `AlarmJson.kt`
- Test: `android/app/src/test/java/com/pillsaathi/alarm/AlarmRulesTest.kt`, `AlarmJsonTest.kt`

**Interfaces:**
- Produces:
  ```kotlin
  data class Alarm(val id: String, val hour: Int, val minute: Int, val days: Set<Int>, val name: String,
                   val soundId: String?, val enabled: Boolean, val nextTriggerAt: Long?,
                   val snoozeUntil: Long?, val lastFiredAt: Long?, val createdAt: Long)
  enum class SoundKind(val json: String) { RECORDED("recorded"), IMPORTED("imported") }
  data class Sound(val id: String, val name: String, val kind: SoundKind, val durationMs: Long,
                   val fileName: String, val createdAt: Long)
  data class MissedAlarm(val id: String, val name: String, val dueAt: Long)
  data class ReconcileResult(val alarms: List<Alarm>, val missed: List<MissedAlarm>)
  data class SetupState(val seen: Boolean, val doneSteps: Set<String>)

  object AlarmRules {
    const val SNOOZE_MS = 600_000L; const val AUTO_SILENCE_MS = 600_000L; const val MISSED_GRACE_MS = 120_000L
    fun nextTrigger(hour: Int, minute: Int, days: Set<Int>, afterMillis: Long, zone: ZoneId): Long // strictly > afterMillis
    fun dueAt(alarm: Alarm): Long?                      // null if disabled, else snoozeUntil ?: nextTriggerAt
    fun armed(alarm: Alarm, now: Long, zone: ZoneId): Alarm   // enabled=true, nextTriggerAt=nextTrigger(after now), snoozeUntil=null
    fun disarmed(alarm: Alarm): Alarm                   // enabled=false, nextTriggerAt=null, snoozeUntil=null
    fun fired(alarm: Alarm, now: Long): Alarm           // lastFiredAt=now
    fun ringEnded(alarm: Alarm, now: Long, zone: ZoneId): Alarm // days empty → disarmed; else nextTrigger(after now), snoozeUntil=null
    fun snoozed(alarm: Alarm, now: Long): Alarm         // snoozeUntil = now + SNOOZE_MS
    fun isMissed(alarm: Alarm, now: Long): Boolean
    fun reconcile(alarms: List<Alarm>, now: Long, zone: ZoneId): ReconcileResult
  }
  object AlarmJson {
    fun alarmsToJson(alarms: List<Alarm>): String; fun alarmsFromJson(json: String?): List<Alarm>
    fun soundsToJson(sounds: List<Sound>): String; fun soundsFromJson(json: String?): List<Sound>
    fun setupToJson(s: SetupState): String; fun setupFromJson(json: String?): SetupState
  }
  ```

The rules `isMissed` and `reconcile` must follow. Nothing else determines them:

```
isMissed(a, now) = due != null && due < now - MISSED_GRACE_MS && (a.lastFiredAt == null || a.lastFiredAt < due)

reconcile, per alarm (disabled alarms pass through unchanged):
  due == null                                    → armed(a, now, zone)
  isMissed(a, now)                               → ringEnded(a, now, zone), and add MissedAlarm(a.id, a.name, due)
  lastFiredAt >= due && now - lastFiredAt > AUTO_SILENCE_MS + MISSED_GRACE_MS
                                                 → ringEnded(a, now, zone)  (stuck: the ring's process died; not missed)
  due > now && snoozeUntil == null               → a.copy(nextTriggerAt = nextTrigger(after now))  (re-zones after a TZ change)
  otherwise                                      → unchanged (ringing now, or about to fire)
```

`nextTrigger` uses `ZonedDateTime.of(date, LocalTime.of(hour, minute), zone)` for each candidate date from `afterMillis`'s local date, for up to 8 days. It returns the first candidate that is strictly after `afterMillis` and whose `dayOfWeek.value` is in `days` (any day when `days` is empty). The java.time rules handle DST: a time in a spring-forward gap shifts later, and an overlap picks the earlier offset.

- [ ] **Step 1: Write the failing tests.** All times use `IST = ZoneId.of("Asia/Kolkata")` unless noted. Use a helper `at(y, mo, d, h, mi, s = 0, zone = IST): Long`. Sat 2026-10-24, Sun 2026-10-25, Mon 2026-10-26.

```kotlin
// AlarmRulesTest.kt
@Test fun nextTrigger_oneTime_laterToday() = assertEquals(at(2026,10,25,7,0), AlarmRules.nextTrigger(7, 0, emptySet(), at(2026,10,25,6,0), IST))
@Test fun nextTrigger_oneTime_passed_goesTomorrow() = assertEquals(at(2026,10,26,7,0), AlarmRules.nextTrigger(7, 0, emptySet(), at(2026,10,25,8,0), IST))
@Test fun nextTrigger_currentMinute_goesToNextDay() {            // Review Focus 5
  assertEquals(at(2026,10,26,7,0), AlarmRules.nextTrigger(7, 0, emptySet(), at(2026,10,25,7,0,30), IST))
  assertEquals(at(2026,10,26,7,0), AlarmRules.nextTrigger(7, 0, emptySet(), at(2026,10,25,7,0,0), IST))
}
@Test fun nextTrigger_weekdays_fromSaturday_isMonday() = assertEquals(at(2026,10,26,7,0), AlarmRules.nextTrigger(7, 0, setOf(1,2,3,4,5), at(2026,10,24,8,0), IST))
@Test fun nextTrigger_weekdays_mondayMorning_isToday() = assertEquals(at(2026,10,26,7,0), AlarmRules.nextTrigger(7, 0, setOf(1,2,3,4,5), at(2026,10,26,6,0), IST))
@Test fun nextTrigger_acrossMidnight() = assertEquals(at(2026,10,25,0,15), AlarmRules.nextTrigger(0, 15, emptySet(), at(2026,10,24,23,50), IST))
@Test fun nextTrigger_dstGap_shiftsLater() { val ny = ZoneId.of("America/New_York")   // 2027-03-14 02:00→03:00
  assertEquals(at(2027,3,14,3,30, zone = ny), AlarmRules.nextTrigger(2, 30, emptySet(), at(2027,3,14,1,0, zone = ny), ny)) }
@Test fun nextTrigger_dstOverlap_earlierOffset() { val ny = ZoneId.of("America/New_York") // 2026-11-01 01:00–02:00 twice
  val t = AlarmRules.nextTrigger(1, 30, emptySet(), at(2026,11,1,0,0, zone = ny), ny)
  assertEquals(ZoneOffset.ofHours(-4), Instant.ofEpochMilli(t).atZone(ny).offset) }

@Test fun armed_setsNextAndClearsSnooze()        // armed(snoozed alarm) → enabled, nextTriggerAt = nextTrigger(...), snoozeUntil null
@Test fun disarmed_clearsNextAndSnooze()         // Review Focus 3: snoozeUntil != null in → null out, enabled false, nextTriggerAt null
@Test fun ringEnded_oneTime_disables()           // days empty → enabled false, nextTriggerAt null
@Test fun ringEnded_repeating_movesToNextDay()   // 07:00 Mon–Fri, ended Mon 07:04 → nextTriggerAt = Tue 2026-10-27 07:00, snoozeUntil null
@Test fun snoozed_dueIsTenMinutesLater()         // snoozed(a, now).snoozeUntil == now + 600_000 && dueAt(...) == now + 600_000
@Test fun isMissed_afterGrace_neverFired_true()  // due 07:00, now 07:03, lastFiredAt null → true
@Test fun isMissed_withinGrace_false()           // due 07:00, now 07:01 → false
@Test fun isMissed_fired_false()                 // due 07:00, lastFiredAt 07:00:01, now 07:30 → false
@Test fun reconcile_missedOneTime_disabledAndReported()   // missed list == [MissedAlarm(id, name, due)], alarm.enabled false
@Test fun reconcile_missedRepeating_rescheduledAndReported()
@Test fun reconcile_stuckRing_endedNotReported()  // fired 07:00, now 07:13 → ringEnded applied, missed empty
@Test fun reconcile_ringingNow_unchanged()        // fired 07:00, now 07:05 → identical alarm
@Test fun reconcile_zoneChange_recomputesToLocalTime() // next computed in IST for 07:00; reconcile with Asia/Dubai → 07:00 Dubai
@Test fun reconcile_snoozedFuture_unchanged()
@Test fun reconcile_disabled_unchanged()

// AlarmJsonTest.kt
@Test fun alarms_roundTrip_withNullsAndDays()     // two alarms, one with all nullable fields null, days {1,3,5}
@Test fun sounds_roundTrip()                      // RECORDED and IMPORTED → json "recorded"/"imported" → back
@Test fun setup_roundTrip_andDefaultsWhenNull()   // setupFromJson(null) == SetupState(false, emptySet())
@Test fun alarmsFromJson_nullOrBlank_isEmpty()
```

- [ ] **Step 2: Run the tests to verify they fail.** Run `cd android && ./gradlew :app:testDebugUnitTest`. Expected: a compilation failure (`AlarmRules` unresolved).
- [ ] **Step 3: Implement `AlarmModels.kt`, `AlarmRules.kt` and `AlarmJson.kt`** to the interfaces above. `AlarmJson` uses `org.json.JSONArray`/`JSONObject`. Write nullable `Long` fields as JSON `null`, and read them with `isNull` checks.
- [ ] **Step 4: Run the tests to verify they pass.** Run `cd android && ./gradlew :app:testDebugUnitTest`. Expected: `BUILD SUCCESSFUL`, with all `AlarmRulesTest` and `AlarmJsonTest` tests passing.
- [ ] **Step 5: Commit.** `git add android/app/build.gradle android/app/src/main/java/com/pillsaathi/alarm android/app/src/test && git commit -m "feat: add alarm models, scheduling rules and JSON storage format"`

---

### Task 2: Native alarm engine: storage, scheduling, ringing service, reboot handling

**Files:**
- Create in `android/app/src/main/java/com/pillsaathi/alarm/`: `AlarmStore.kt`, `AlarmScheduler.kt`, `AlarmEngine.kt`, `AlarmFireReceiver.kt`, `SystemEventReceiver.kt`, `RingingService.kt`, `RingingState.kt`, `AlarmPlayer.kt`, `AlarmVibrator.kt`, `Notifications.kt`, `DebugHooks.kt`
- Create: `android/app/src/main/res/raw/fallback_alarm.wav`, generated (see Step 1)
- Create: `android/app/src/debug/AndroidManifest.xml`, `android/app/src/debug/java/com/pillsaathi/alarm/debug/DebugAlarmReceiver.kt`
- Modify: `android/app/src/main/AndroidManifest.xml`, `MainApplication.kt`, `MainActivity.kt`, `res/values/strings.xml`

**Interfaces:**
- Consumes: everything Task 1 produces.
- Produces:
  ```kotlin
  class AlarmStore(context: Context) {           // prefs file "pillsaathi_store" in device-protected storage
    fun <T> locked(block: () -> T): T            // all read-modify-write goes through this (one process-wide lock)
    fun loadAlarms(): List<Alarm>; fun saveAlarms(alarms: List<Alarm>)
    fun loadSounds(): List<Sound>; fun saveSounds(sounds: List<Sound>)
    fun loadSetup(): SetupState; fun saveSetup(state: SetupState)
    val soundsDir: File                          // <device-protected filesDir>/sounds, created on access
  }
  class AlarmScheduler(context: Context) {
    fun sync(alarm: Alarm): Boolean              // dueAt==null → cancel; else setAlarmClock. false on SecurityException
    fun cancel(alarmId: String)
  }
  enum class ReconcileTrigger { BOOT, CLOCK_CHANGED, APP_OPEN, PERMISSION_CHANGED }
  class AlarmEngine private constructor(context: Context) {
    companion object { fun get(context: Context): AlarmEngine }   // singleton on applicationContext
    val store: AlarmStore
    fun alarms(): List<Alarm>
    fun save(id: String?, hour: Int, minute: Int, days: Set<Int>, name: String, soundId: String?): Alarm // armed + synced; blank name → "Alarm"; new id = UUID
    fun setEnabled(id: String, enabled: Boolean): Alarm          // armed/disarmed + synced; disabling stops it if ringing
    fun delete(id: String)                                       // cancel + remove; stops it if ringing
    fun reconcile(trigger: ReconcileTrigger): List<MissedAlarm>  // AlarmRules.reconcile + sync all; posts missed notifications unless APP_OPEN
    fun onFired(id: String): Alarm?                              // fired(); null if alarm missing/disabled
    fun onRingEnded(id: String, autoSilenced: Boolean)           // ringEnded + sync; autoSilenced → missed notification
    fun onSnoozed(id: String)                                    // snoozed + sync
    fun soundFileFor(alarm: Alarm): File?                        // null if soundId null or sound record missing
    fun soundNameFor(alarm: Alarm): String                       // "Default alarm tone" when no sound
    fun clearSound(soundId: String)                              // alarms using it → soundId=null (used by Task 4)
  }
  object RingingState {
    data class Ring(val alarmId: String, val name: String, val soundName: String, val startedAt: Long)
    val current: Ring?
    fun addListener(l: (Ring?) -> Unit); fun removeListener(l: (Ring?) -> Unit)
  }
  class RingingService : Service() {
    companion object {
      const val ACTION_RING = "com.pillsaathi.RING"; const val ACTION_STOP = "com.pillsaathi.STOP"; const val ACTION_SNOOZE = "com.pillsaathi.SNOOZE"
      const val EXTRA_ALARM_ID = "alarmId"
      fun ring(context: Context, alarmId: String)     // startForegroundService(ACTION_RING)
      fun stop(context: Context); fun snooze(context: Context)
      fun stopIfRinging(context: Context, alarmId: String)  // removes from queue or stops current
    }
  }
  object Notifications {
    const val CHANNEL_RINGING = "alarms_ringing"; const val CHANNEL_MISSED = "alarms_missed"; const val RINGING_ID = 1001
    fun ensureChannels(context: Context)
    fun ringing(context: Context, ring: RingingState.Ring): Notification
    fun postMissed(context: Context, missed: MissedAlarm)
  }
  object DebugHooks { @Volatile var autoSilenceMsOverride: Long? = null }
  ```

Behaviour that the interfaces don't fix:
- **Scheduler.** `setAlarmClock(AlarmClockInfo(due, showIntent → MainActivity), operation)`. `operation` is a broadcast PendingIntent to `AlarmFireReceiver` with `data = Uri.parse("pillsaathi://alarm/$id")`, extra `alarmId`, and `FLAG_IMMUTABLE | FLAG_UPDATE_CURRENT`. Use the same intent for `cancel`.
- **`AlarmFireReceiver`** calls `engine.onFired(id)`. If that returns an alarm, it calls `RingingService.ring(context, id)`.
- **`SystemEventReceiver`** handles `LOCKED_BOOT_COMPLETED` and `BOOT_COMPLETED` (→ BOOT), `TIME_SET` and `TIMEZONE_CHANGED` (→ CLOCK_CHANGED), `MY_PACKAGE_REPLACED` (→ BOOT), and `AlarmManager.ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED` (→ PERMISSION_CHANGED).
- **`RingingService`:**
  - On every `ACTION_RING`, call `startForeground` within the first callback, using `ServiceCompat.startForeground(..., FOREGROUND_SERVICE_TYPE_SYSTEM_EXEMPTED)` on API 34+.
  - If nothing is ringing, start this alarm. If something is, append the id to an in-memory queue, skipping duplicates.
  - Starting a ring: set `RingingState`, post `Notifications.ringing`, start `AlarmPlayer` and `AlarmVibrator`, and post an auto-silence runnable at `DebugHooks.autoSilenceMsOverride ?: AlarmRules.AUTO_SILENCE_MS`.
  - Stop → `engine.onRingEnded(id, false)`. Snooze → `engine.onSnoozed(id)`. Auto-silence → `engine.onRingEnded(id, true)`. Each then rings the next queued id, or clears `RingingState` and calls `stopForeground(STOP_FOREGROUND_REMOVE)` + `stopSelf()`.
- **Ringing notification:**
  - channel `CHANNEL_RINGING`, category `ALARM`, `PRIORITY_MAX`, ongoing, `VISIBILITY_PUBLIC`
  - title: the ring's start time formatted with `DateFormat.getTimeFormat(context)`; text: the alarm name
  - actions **"Snooze 10 min"** and **"Stop"**: service PendingIntents to `ACTION_SNOOZE`/`ACTION_STOP`
  - Task 3 adds the full-screen intent.
- **Channels:**
  - `CHANNEL_RINGING` (name "Ringing alarms"): `IMPORTANCE_HIGH`, `setSound(null, null)`, `enableVibration(false)`, because the service plays and vibrates itself.
  - `CHANNEL_MISSED` (name "Missed alarms"): `IMPORTANCE_DEFAULT`.
- **Missed notification:** text **"Missed alarm: <name>, <time>"**, where `<time>` is `dueAt` in the phone's time format. Notification id = `alarmId.hashCode()`. Tapping it opens `MainActivity`.
- **`AlarmPlayer.start(file: File?)`** tries each source in order with a `MediaPlayer` (`USAGE_ALARM`, `CONTENT_TYPE_SONIFICATION`, `isLooping = true`, `setWakeMode(PARTIAL_WAKE_LOCK)`):
  1. the file
  2. `RingtoneManager.getActualDefaultRingtoneUri(ctx, TYPE_ALARM) ?: getDefaultUri(TYPE_ALARM)`
  3. `R.raw.fallback_alarm`

  It moves to the next source on any exception during setup **or** an `onError` callback during playback. `stop()` releases the player.
- **`AlarmVibrator`** repeats the waveform `[0, 800, 600]` from index 0, with alarm usage attributes: `VibrationAttributes.USAGE_ALARM` on API 33+, `AudioAttributes.USAGE_ALARM` on 26–32, and the legacy `vibrate(pattern, 0)` on 24–25.
- **Manifest permissions:** `RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK`, `VIBRATE`, `POST_NOTIFICATIONS`, `USE_EXACT_ALARM`, `SCHEDULE_EXACT_ALARM` (with `android:maxSdkVersion="32"`), `USE_FULL_SCREEN_INTENT`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_SYSTEM_EXEMPTED`. Keep `INTERNET`, which Metro needs in debug.
- **Manifest components:**
  - Both receivers and the service are `android:directBootAware="true"`.
  - `AlarmFireReceiver` has `exported="false"`. `SystemEventReceiver` has `exported="true"` with the intent filters above.
  - The service has `android:foregroundServiceType="systemExempted"` and `exported="false"`.
- **Direct boot.** `MainApplication.onCreate` calls `loadReactNative(this)` only when `UserManagerCompat.isUserUnlocked(this)`. Add `fun ensureReactNativeLoaded()`, idempotent with a flag. `MainActivity.onCreate` calls it before `super.onCreate`, and `onCreate` also does what the react-native-screens README requires once Task 6 adds it.
- **Debug receiver** (debug source set only, exported, action-filtered):
  - `com.pillsaathi.DEBUG_ADD_ALARM`: extras `minutes_from_now` (int, default 1), `name` (string, default "Debug"), `sound_id` (string, optional), `days` (string like "1,2,3", optional). It saves an alarm at the hour and minute of now + N minutes.
  - `com.pillsaathi.DEBUG_LIST`: logs every alarm to logcat tag `PillSaathiAlarm`.
  - `com.pillsaathi.DEBUG_STOP` and `com.pillsaathi.DEBUG_SNOOZE`: forward to the service.
  - `com.pillsaathi.DEBUG_AUTO_SILENCE_MS`: long extra `ms` sets `DebugHooks.autoSilenceMsOverride`.

- [ ] **Step 1: Generate the bundled fallback tone.** It is 2.0 s, 22050 Hz, 16-bit mono PCM WAV: four 0.2 s beeps at 880 Hz, amplitude 0.8, with 0.15 s gaps, then silence to 2.0 s. Write it with a throwaway Python script (stdlib `wave` + `math`) kept in the scratchpad, not the repo, and output it to `android/app/src/main/res/raw/fallback_alarm.wav`. Verify: `file android/app/src/main/res/raw/fallback_alarm.wav` prints `RIFF (little-endian) data, WAVE audio, Microsoft PCM, 16 bit, mono 22050 Hz`.
- [ ] **Step 2: Implement the files listed above** to the interfaces and behaviour above, and register everything in the manifests.
- [ ] **Step 3: Run the build and unit tests.** Run `cd android && ./gradlew :app:assembleDebug :app:testDebugUnitTest`. Expected: `BUILD SUCCESSFUL`.
- [ ] **Step 4: Verify scheduling on the emulator.** Start `Medium_Phone_API_34` with `~/Library/Android/sdk/emulator/emulator -avd Medium_Phone_API_34` in the background, run `adb wait-for-device`, then `cd android && ./gradlew installDebug`. Run:
  ```
  adb shell am broadcast -a com.pillsaathi.DEBUG_ADD_ALARM -n com.pillsaathi/.alarm.debug.DebugAlarmReceiver --ei minutes_from_now 2 --es name Test
  adb shell dumpsys alarm | grep -B2 -A6 'com.pillsaathi'
  ```
  Expected: an `ALARM_CLOCK`/`RTC_WAKEUP` entry for `com.pillsaathi` whose trigger time matches the alarm.
- [ ] **Step 5: Verify ringing with the app killed.** Run `adb shell am kill com.pillsaathi`, which kills the process without force-stopping it, then wait for the minute. Expected:
  - `adb shell dumpsys activity services com.pillsaathi` lists `RingingService` as foreground
  - `adb shell dumpsys notification --noredact | grep -A8 'pkg=com.pillsaathi'` shows a notification on channel `alarms_ringing` with actions `Snooze 10 min` and `Stop`
  - the emulator plays the default alarm tone, since no sound was given

  Then broadcast `DEBUG_STOP`. Expected: the service is gone, and `DEBUG_LIST` shows the alarm `enabled=false`, because it is one-time.
- [ ] **Step 6: Verify snooze, auto-silence, the queue and deleting while ringing.** Use the debug actions:
  - `DEBUG_SNOOZE`: `DEBUG_LIST` shows `snoozeUntil` = now + 10 min, and `dumpsys alarm` shows it scheduled.
  - `DEBUG_AUTO_SILENCE_MS --el ms 20000` with a new alarm: ringing stops by itself after about 20 s, and the "Missed alarm: Test, <time>" notification appears.
  - Two alarms at the same minute: the second rings right after the first is stopped.
  - Delete or disable a ringing alarm: this is checked from the app UI in Task 6 Step 6, since nothing can trigger it from adb yet.
- [ ] **Step 7: Verify reboot.** Add an alarm 5 minutes out, run `adb reboot`, `adb wait-for-device`, then `adb shell dumpsys alarm | grep -A6 com.pillsaathi`. Expected: still scheduled without opening the app. It also rings at its time while the emulator sits at the lock screen without being unlocked.
- [ ] **Step 8: Commit.** `git add android/app/src && git commit -m "feat: add native alarm engine with scheduling, ringing service and reboot handling"`

---

### Task 3: Full-screen ringing screen

**Files:**
- Create: `android/app/src/main/java/com/pillsaathi/alarm/RingingActivity.kt`, `android/app/src/main/res/layout/activity_ringing.xml`
- Modify: `Notifications.kt` (full-screen intent), `MainActivity.kt` (redirect while ringing), `AndroidManifest.xml`, `res/values/strings.xml`, `res/values/styles.xml` (a `RingingTheme`)

**Interfaces:**
- Consumes: `RingingState`, and `RingingService.stop`/`snooze`, from Task 2.
- Produces: `RingingActivity`, launched only through the ringing notification's full-screen intent or the `MainActivity` redirect.

Behaviour:
- **Layout** (wireframe 5): a near-black background. In the centre, a large time (the ring's `startedAt` in the phone's time format), the alarm name below it, and the line "🔊 <soundName>" below that. Near the bottom, an outlined **"Snooze 10 min"** button, and beneath it a large red **"Stop"** button.
- **Activity flags:** `setShowWhenLocked(true)` and `setTurnScreenOn(true)` on API 27+, or the equivalent window flags on 24–26, plus `FLAG_KEEP_SCREEN_ON`.
- **Manifest attributes:** `launchMode="singleInstance"`, `excludeFromRecents="true"`, `taskAffinity=""`, `directBootAware="true"`, `exported="false"`, `showWhenLocked="true"`, `turnScreenOn="true"`.
- **Updating with `RingingState`:** the activity observes it in `onStart` and stops observing in `onStop`. A new `Ring` re-renders the screen, which is how the queue shows. `null` finishes the activity. The back button does nothing, so the alarm can't be dismissed by accident.
- **Notification:** `Notifications.ringing` adds `setFullScreenIntent(pendingIntentTo(RingingActivity), true)` and a `contentIntent` to the same activity.
- **`MainActivity.onResume`:** if `RingingState.current != null`, start `RingingActivity`. This covers phones where notifications are denied, so the full-screen intent never shows.

- [ ] **Step 1: Implement the activity, layout, theme, notification change and redirect** described above.
- [ ] **Step 2: Run the build.** Run `cd android && ./gradlew :app:assembleDebug :app:testDebugUnitTest`. Expected: `BUILD SUCCESSFUL`.
- [ ] **Step 3: Verify on the locked emulator.** Install, lock the screen with `adb shell input keyevent KEYCODE_SLEEP`, and add a debug alarm 1 minute out. Expected:
  - the screen turns on and shows the ringing screen over the lock screen, with the time, the name "Test" and "🔊 Default alarm tone"
  - tapping Stop ends the sound and closes the screen
  - repeating with Snooze closes it and shows `snoozeUntil` in `DEBUG_LIST`
  - `adb shell input keyevent KEYCODE_BACK` while it rings leaves it ringing
- [ ] **Step 4: Verify the queue on screen.** Two debug alarms at the same minute: after Stop, the screen stays open and shows the second alarm's name.
- [ ] **Step 5: Commit.** `git add android/app/src/main && git commit -m "feat: add full-screen ringing screen over the lock screen"`

---

### Task 4: Native sounds: library, recorder, preview, import, and the `NativeSounds` TurboModule

**Files:**
- Create: `specs/NativeSounds.ts`, `src/native/sounds.ts`
- Create: `android/app/src/main/java/com/pillsaathi/sound/SoundLibrary.kt`, `SoundRecorder.kt`, `SoundPreviewer.kt`, `SoundImporter.kt`
- Create: `android/app/src/main/java/com/pillsaathi/bridge/PillSaathiPackage.kt`, `NativeSoundsModule.kt`
- Modify: `package.json`, adding:
  ```json
  "codegenConfig": {"name": "PillSaathiSpecs", "type": "modules", "jsSrcsDir": "specs", "android": {"javaPackageName": "com.pillsaathi.specs"}}
  ```
- Modify: `MainApplication.kt` (`add(PillSaathiPackage())`), `AndroidManifest.xml` (`RECORD_AUDIO`)
- Test: `__tests__/native/sounds.test.ts`

**Interfaces:**
- Consumes: `AlarmEngine.get(ctx).store` (sounds persistence, `soundsDir`) and `AlarmEngine.clearSound`, from Task 2.
- Produces. The codegen spec, following the RN 0.88 Turbo Native Module docs; events use `CodegenTypes.EventEmitter`:
  ```ts
  // specs/NativeSounds.ts
  import type {TurboModule, CodegenTypes} from 'react-native';
  import {TurboModuleRegistry} from 'react-native';
  export type NativeSound = {id: string; name: string; kind: string; durationMs: number; createdAt: number; usedBy: string[]};
  export interface Spec extends TurboModule {
    listSounds(): Promise<NativeSound[]>;            // newest first; usedBy = names of alarms using it
    importSound(): Promise<NativeSound | null>;      // null = picker cancelled
    startRecording(): Promise<void>;
    stopRecording(): Promise<number>;                // durationMs of the take
    discardRecording(): Promise<void>;               // safe to call in any state
    saveRecording(name: string): Promise<NativeSound>;
    previewSound(id: string): Promise<void>;
    previewRecording(): Promise<void>;               // plays the unsaved take
    stopPreview(): Promise<void>;
    deleteSound(id: string): Promise<void>;          // file + record; engine.clearSound(id)
    readonly onRecordingLevel: CodegenTypes.EventEmitter<number>;       // 0..1, ~every 100 ms while recording
    readonly onRecordingAutoStopped: CodegenTypes.EventEmitter<number>; // durationMs, at the 2:00 limit
    readonly onPreviewEnded: CodegenTypes.EventEmitter<string>;         // sound id, or 'recording'
  }
  export default TurboModuleRegistry.get<Spec>('NativeSounds');
  ```
  ```ts
  // src/native/sounds.ts (same functions as the spec, typed; kind narrowed)
  export type SoundKind = 'recorded' | 'imported';
  export type Sound = Omit<NativeSound, 'kind'> & {kind: SoundKind};
  export const SoundErrors = {UnsupportedAudio: 'UNSUPPORTED_AUDIO', TooShort: 'RECORDING_TOO_SHORT', NoActivity: 'NO_ACTIVITY', Busy: 'BUSY', NotFound: 'NOT_FOUND', MicPermission: 'MIC_PERMISSION'} as const;
  export function listSounds(): Promise<Sound[]>; export function importSound(): Promise<Sound | null>; /* …one function per spec method… */
  export function onRecordingLevel(cb: (level: number) => void): EventSubscription; // likewise onRecordingAutoStopped, onPreviewEnded
  ```
  Promise rejection codes are exactly the `SoundErrors` values.

Behaviour:
- **Recorder:**
  - `MediaRecorder` (use `MediaRecorder(context)` on API 31+): `MIC`, `MPEG_4`, `AAC`, 44100 Hz, 1 channel, 128 kbps, `setMaxDuration(120_000)`.
  - Records to `<device-protected cacheDir>/take.m4a`.
  - Polls `maxAmplitude / 32767.0` every 100 ms and emits it as `onRecordingLevel`.
  - `MEDIA_RECORDER_INFO_MAX_DURATION_REACHED` → finalise the take and emit `onRecordingAutoStopped(durationMs)`.
  - `startRecording` without the mic permission → reject `MIC_PERMISSION`.
  - If `stop()` throws (Review Focus 1), delete the take and reject `RECORDING_TOO_SHORT`.
  - Duration comes from `MediaMetadataRetriever`.
- **`saveRecording(name)`:** move the take to `soundsDir/<uuid>.m4a` and add `Sound(kind = RECORDED)`. A blank name becomes "My recording".
- **Importer:**
  - `ACTION_OPEN_DOCUMENT` with type `audio/*` and `EXTRA_MIME_TYPES` `["audio/mpeg","audio/mp4","audio/x-m4a","audio/aac","audio/wav","audio/x-wav","audio/ogg","application/ogg"]`, through `currentActivity.startActivityForResult` plus an `ActivityEventListener`.
  - Reject `BUSY` if a pick is already in flight, and `NO_ACTIVITY` with no current activity.
  - Copy the stream to `soundsDir/<uuid>.<ext from display name, default "audio">`.
  - Validate with `MediaMetadataRetriever` that the duration is > 0. If extraction fails or the duration is 0, delete the copy and reject `UNSUPPORTED_AUDIO` (Review Focus 2).
  - The name is the `OpenableColumns.DISPLAY_NAME` without its extension, and `kind = IMPORTED`.
- **Previewer:** one `MediaPlayer` with `USAGE_MEDIA`. Starting a preview stops the current one. Completion emits `onPreviewEnded(id)`.
- **`deleteSound`:** remove the file and the record, then call `engine.clearSound(id)`.
- **Persistence:** all sound reads and writes go through `store.locked { }`.
- **`PillSaathiPackage`** is a `BaseReactPackage` that returns `NativeSoundsModule` for name `"NativeSounds"`, with `ReactModuleInfo(isTurboModule = true)`. Task 5 adds `NativeAlarms` to it.

- [ ] **Step 1: Write the failing wrapper test** in `__tests__/native/sounds.test.ts`. Use `jest.mock('../../specs/NativeSounds', () => ({__esModule: true, default: null}))` and assert `await expect(listSounds()).rejects.toThrow('PillSaathi alarms are Android-only for now')`.
- [ ] **Step 2: Run the test to verify it fails.** Run `npx jest __tests__/native/sounds.test.ts`. Expected: FAIL, because the module cannot be found.
- [ ] **Step 3: Implement the spec, the wrapper, the Kotlin classes, the package and the registration.**
- [ ] **Step 4: Run the JS checks and the Android build.** Run `npx jest __tests__/native && npx tsc --noEmit && npm run lint && (cd android && ./gradlew :app:assembleDebug)`. Expected: everything passes. Codegen generates `com.pillsaathi.specs.NativeSoundsSpec`. Check the generated signatures, such as `emitOnRecordingLevel`, under `android/app/build/generated/source/codegen/java/com/pillsaathi/specs/` and implement against them.
- [ ] **Step 5: Commit.** `git add specs src/native __tests__/native package.json android/app/src/main && git commit -m "feat: add native sound library with recording, import and preview"`

---

### Task 5: `NativeAlarms` TurboModule, JS wrapper and display helpers

**Files:**
- Create: `specs/NativeAlarms.ts`, `src/native/alarms.ts`, `src/lib/time.ts`, `src/lib/days.ts`
- Create: `android/app/src/main/java/com/pillsaathi/bridge/NativeAlarmsModule.kt`, `HealthChecker.kt`, `SettingsLauncher.kt`
- Modify: `PillSaathiPackage.kt` (register `"NativeAlarms"`)
- Test: `__tests__/lib/time.test.ts`, `__tests__/lib/days.test.ts`, `__tests__/native/alarms.test.ts`

**Interfaces:**
- Consumes: `AlarmEngine` (Task 2), `RingingService.stopIfRinging` (called by the engine), `PillSaathiPackage` (Task 4).
- Produces:
  ```ts
  // specs/NativeAlarms.ts
  export type NativeAlarm = {id: string; hour: number; minute: number; days: number[]; name: string; soundId: string | null;
                             enabled: boolean; nextTriggerAt: number | null; snoozeUntil: number | null};
  export type AlarmInput = {id: string | null; hour: number; minute: number; days: number[]; name: string; soundId: string | null};
  export type Health = {notificationsEnabled: boolean; alarmChannelEnabled: boolean; exactAlarmAllowed: boolean; fullScreenAllowed: boolean;
                        ignoringBatteryOptimizations: boolean; backgroundRestricted: boolean; alarmVolumeLow: boolean};
  export type SetupState = {seen: boolean; doneSteps: string[]};
  export type MissedAlarm = {id: string; name: string; dueAt: number};
  export type PickedTime = {hour: number; minute: number};
  export interface Spec extends TurboModule {
    listAlarms(): Promise<NativeAlarm[]>;                 // sorted by hour, minute
    saveAlarm(input: AlarmInput): Promise<NativeAlarm>;   // engine.save
    setAlarmEnabled(id: string, enabled: boolean): Promise<NativeAlarm>;
    deleteAlarm(id: string): Promise<void>;
    reconcileOnAppOpen(): Promise<MissedAlarm[]>;         // engine.reconcile(APP_OPEN)
    getHealth(): Promise<Health>;
    openSetting(target: string): Promise<boolean>;        // true = specific page opened, false = fell back to App info
    getSetupState(): Promise<SetupState>;
    setSetupStepDone(step: string, done: boolean): Promise<void>;
    markSetupSeen(): Promise<void>;
    pickTime(hour: number, minute: number): Promise<PickedTime | null>; // native TimePickerDialog; null = cancelled
    is24HourFormat(): boolean;
  }
  export default TurboModuleRegistry.get<Spec>('NativeAlarms');
  ```
  ```ts
  // src/native/alarms.ts: one typed function per spec method (listAlarms, saveAlarm, …), plus:
  export type SettingTarget = 'notifications' | 'alarmChannel' | 'exactAlarm' | 'fullScreen' | 'batteryOptimization'
    | 'backgroundRestricted' | 'alarmVolume' | 'appInfo' | 'oemAutostart' | 'oemBattery';
  export function openSetting(target: SettingTarget): Promise<boolean>;
  // src/lib/time.ts
  export function formatTime(hour: number, minute: number, is24h: boolean): string;
  // src/lib/days.ts
  export const DAY_CHIP_ORDER: readonly number[] = [7, 1, 2, 3, 4, 5, 6];   // S M T W T F S
  export const DAY_CHIP_LETTER: Record<number, string>;                     // 7→'S', 1→'M', 2→'T', 3→'W', 4→'T', 5→'F', 6→'S'
  export function describeDays(days: number[]): string;
  ```

Behaviour:
- **`HealthChecker`:**
  - `notificationsEnabled`: `NotificationManagerCompat.areNotificationsEnabled()`.
  - `alarmChannelEnabled`: the `CHANNEL_RINGING` importance isn't `IMPORTANCE_NONE` (true below API 26).
  - `exactAlarmAllowed`: `canScheduleExactAlarms()` on API 31+, otherwise true.
  - `fullScreenAllowed`: `canUseFullScreenIntent()` on API 34+, otherwise true.
  - `ignoringBatteryOptimizations`: `PowerManager.isIgnoringBatteryOptimizations(pkg)`.
  - `backgroundRestricted`: `ActivityManager.isBackgroundRestricted` on API 28+, otherwise false.
  - `alarmVolumeLow`: `getStreamVolume(STREAM_ALARM) <= (getStreamMinVolume(STREAM_ALARM) on API 28+ else 0)`.
- **`SettingsLauncher` targets.** Each is started with `FLAG_ACTIVITY_NEW_TASK`. On `ActivityNotFoundException` or an API that's too old, it falls back to `ACTION_APPLICATION_DETAILS_SETTINGS` and returns false.

  | Target | Settings page |
  |---|---|
  | `notifications` | `ACTION_APP_NOTIFICATION_SETTINGS` |
  | `alarmChannel` | `ACTION_CHANNEL_NOTIFICATION_SETTINGS` (`CHANNEL_RINGING`) |
  | `exactAlarm` | `ACTION_REQUEST_SCHEDULE_EXACT_ALARM` + `package:` uri |
  | `fullScreen` | `ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT` + `package:` uri |
  | `batteryOptimization` | `ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS` |
  | `backgroundRestricted`, `appInfo` | `ACTION_APPLICATION_DETAILS_SETTINGS` |
  | `alarmVolume` | `ACTION_SOUND_SETTINGS` |

  `oemAutostart`/`oemBattery` arrive in Task 8; until then they use the fallback.
- **`pickTime`** runs `TimePickerDialog` on the UI thread with `DateFormat.is24HourFormat(ctx)`. Cancel or dismiss resolves `null`.
- **Engine requirement (Review Focus 3):** `setAlarmEnabled(id, false)` and `deleteAlarm(id)` go through `AlarmEngine`, which Task 2 already wires to `RingingService.stopIfRinging`. Task 6 Step 6 verifies it from the UI.
- **`formatTime`:** 12-hour gives `h:mm AM/PM` with no leading zero on the hour; 24-hour gives `HH:mm`.
- **`describeDays`:**
  - `[]` → `"Once"`
  - all seven → `"Every day"`
  - exactly `[1..5]` → `"Mon–Fri"` (en dash)
  - exactly `[6, 7]` → `"Weekends"`
  - otherwise short names in Sunday-first order joined with `", "`

- [ ] **Step 1: Write the failing tests.**
```ts
// __tests__/lib/time.test.ts
expect(formatTime(7, 0, false)).toBe('7:00 AM'); expect(formatTime(19, 5, false)).toBe('7:05 PM');
expect(formatTime(0, 0, false)).toBe('12:00 AM'); expect(formatTime(12, 0, false)).toBe('12:00 PM');
expect(formatTime(7, 0, true)).toBe('07:00'); expect(formatTime(19, 5, true)).toBe('19:05');
// __tests__/lib/days.test.ts
expect(describeDays([])).toBe('Once'); expect(describeDays([1,2,3,4,5,6,7])).toBe('Every day');
expect(describeDays([5,1,3,2,4])).toBe('Mon–Fri'); expect(describeDays([7,6])).toBe('Weekends');
expect(describeDays([5,3,7])).toBe('Sun, Wed, Fri'); expect(DAY_CHIP_ORDER).toEqual([7,1,2,3,4,5,6]);
// __tests__/native/alarms.test.ts — module null → listAlarms() rejects 'PillSaathi alarms are Android-only for now'
```
- [ ] **Step 2: Run the tests to verify they fail.** Run `npx jest __tests__/lib __tests__/native/alarms.test.ts`. Expected: FAIL, because the modules aren't found.
- [ ] **Step 3: Implement the TS files, then the Kotlin module, health checker and settings launcher.**
- [ ] **Step 4: Run all checks.** Run `npx jest && npx tsc --noEmit && npm run lint && (cd android && ./gradlew :app:assembleDebug :app:testDebugUnitTest)`. Expected: everything passes.
- [ ] **Step 5: Commit.** `git add specs src __tests__ android/app/src/main && git commit -m "feat: add NativeAlarms module with health checks, settings links and display helpers"`

---

### Task 6: Navigation, alarm list and alarm editor

**Files:**
- Modify: `package.json`, adding:
  - dependencies `@react-navigation/native@^7.5.1`, `@react-navigation/native-stack@^7.21.0` and `react-native-screens@^4.30.0`
  - devDependencies `@testing-library/react-native@^14.1.0` and `test-renderer@^1.0.0`
- Modify: `App.tsx`, `jest.config.js`, `MainActivity.kt` (the react-native-screens README `onCreate` requirement for the installed version)
- Create: `jest.setup.js`, holding the safe-area mock from `react-native-safe-area-context/jest/mock` plus anything the screens README needs for Jest
- Create: `src/theme.ts`, `src/navigation/RootNavigator.tsx`, `src/screens/AlarmListScreen.tsx`, `src/screens/AlarmEditScreen.tsx`, `src/components/AlarmRow.tsx`, `src/components/DayChips.tsx`
- Create: `src/screens/SoundPickerScreen.tsx`, `RecordScreen.tsx` and `SetupScreen.tsx` as **one-line placeholder components** that Tasks 7–8 replace, so the navigator type-checks
- Test: `__tests__/helpers/renderApp.tsx`, `__tests__/screens/AlarmListScreen.test.tsx`, `__tests__/screens/AlarmEditScreen.test.tsx`
- Modify: `__tests__/App.test.tsx` (mock `src/native/*`, assert that "No alarms yet. Tap + to add one." renders)

**Interfaces:**
- Consumes: `src/native/alarms.ts`, `src/native/sounds.ts` (`listSounds`), `formatTime`, `describeDays`, `DAY_CHIP_ORDER`, `DAY_CHIP_LETTER`.
- Produces:
  ```ts
  export type RootStackParamList = {
    AlarmList: undefined;
    AlarmEdit: {alarmId?: string; pickedSoundId?: string | null};   // undefined = no pick yet; null = "Default alarm tone" picked
    SoundPicker: {selectedSoundId: string | null};
    Record: undefined;
    Setup: undefined;
  };
  export function RootNavigator(props: {initialRouteName?: keyof RootStackParamList; initialParams?: object}): JSX.Element;
  // __tests__/helpers/renderApp.tsx
  export function renderApp(initialRouteName?: keyof RootStackParamList, initialParams?: object): ReturnType<typeof render>;
  ```
  Returning a pick from a child screen: `navigation.navigate('AlarmEdit', {pickedSoundId}, {merge: true, pop: true})`. `AlarmEdit` applies the pick to its draft, then calls `navigation.setParams({pickedSoundId: undefined})`.

Behaviour:
- **AlarmList** (wireframe 1), titled "Alarms":
  - Refresh on focus and on `AppState` → `active`. Each refresh calls `listAlarms`, `listSounds`, `getHealth` and `getSetupState`.
  - On mount and `AppState` → `active`, call `reconcileOnAppOpen()` first.
  - Each `AlarmRow` shows `formatTime(...)` large, the name, "🔊 <sound name or 'Default alarm tone'> · <describeDays>", and a `Switch` that calls `setAlarmEnabled`. Tapping the row opens `AlarmEdit {alarmId}`.
  - A floating "+" opens `AlarmEdit {}`.
  - Empty state: "No alarms yet. Tap + to add one."
  - First mount on Android 13+ (`Platform.Version >= 33`): `PermissionsAndroid.request(POST_NOTIFICATIONS, {title: 'Allow notifications', message: 'PillSaathi needs notifications to show your alarms when they ring.', buttonPositive: 'OK'})`.
  - Task 8 adds the banner and the missed alert, so leave a `HealthBanner` slot.
- **AlarmEdit** (wireframe 2):
  - Title "New alarm" or "Edit alarm", with a header Cancel (`goBack`).
  - A large time `Pressable` that calls `pickTime`. The new-alarm default is 07:00.
  - Repeat: `DayChips` in `DAY_CHIP_ORDER`, toggling.
  - Name `TextInput` with placeholder "Alarm".
  - A sound row that opens `SoundPicker {selectedSoundId}`.
  - **Save** calls `saveAlarm({id, hour, minute, days, name: name.trim() || 'Alarm', soundId})`. Then:
    - if `getHealth().exactAlarmAllowed` is false, `Alert` "PillSaathi needs permission to set alarms" with **Allow** → `openSetting('exactAlarm')`
    - if `getSetupState().seen` is false, `markSetupSeen()` then `navigation.replace('Setup')`
    - otherwise `goBack()`
  - Edit mode also shows **Delete**, which confirms with `Alert` "Delete this alarm?" and then `deleteAlarm(id)` + `goBack()`.

- [ ] **Step 1: Install the dependencies.** Run `npm install @react-navigation/native@^7.5.1 @react-navigation/native-stack@^7.21.0 react-native-screens@^4.30.0 && npm install -D @testing-library/react-native@^14.1.0 test-renderer@^1.0.0`. Add the `MainActivity` change and the Jest setup.
- [ ] **Step 2: Write the failing tests.** Each test file starts with `jest.mock('../../src/native/alarms')` and `jest.mock('../../src/native/sounds')`, with default resolved values set in `beforeEach`.
```tsx
// AlarmListScreen.test.tsx
test('shows each alarm with time, name, sound and repeat summary')
  // listAlarms → [{id:'a1',hour:7,minute:0,days:[1,2,3,4,5],name:'Morning tablet',soundId:'s1',enabled:true,…}]
  // listSounds → [{id:'s1',name:'My voice',…}]; is24HourFormat → false
  // expect getByText('7:00 AM'), getByText('Morning tablet'), getByText('🔊 My voice · Mon–Fri')
test('turning the switch off calls setAlarmEnabled(id, false)')
test('shows the empty state when there are no alarms')      // 'No alarms yet. Tap + to add one.'
test('unknown or null soundId shows Default alarm tone')
// AlarmEditScreen.test.tsx
test('saving a new alarm sends the draft to saveAlarm')
  // pickTime → {hour:6,minute:30}; press time, press chips M and W, type name, press Save
  // expect saveAlarm toHaveBeenCalledWith({id:null,hour:6,minute:30,days:[1,3],name:'Pills',soundId:null})
test('a blank name is saved as "Alarm"')
test('first saved alarm opens the Setup screen once')        // getSetupState → {seen:false,doneSteps:[]} → markSetupSeen called
test('a picked sound from params replaces the draft sound')  // renderApp('AlarmEdit', {pickedSoundId:'s1'}) → shows 'My voice'
test('Delete asks for confirmation, then deletes')           // spy on Alert.alert, invoke the destructive button
```
- [ ] **Step 3: Run the tests to verify they fail.** Run `npx jest __tests__/screens`. Expected: FAIL, because the screens don't exist.
- [ ] **Step 4: Implement the theme, navigator, screens, components, `App.tsx` and the placeholders.**
- [ ] **Step 5: Run all checks.** Run `npx jest && npx tsc --noEmit && npm run lint`. Expected: all pass.
- [ ] **Step 6: Run on the emulator.** `npm start` in the background, then `npm run android`. Expected:
  - the alarm list shows the empty state
  - creating a 07:00 Mon–Fri alarm shows it in the list
  - `adb shell dumpsys alarm | grep -A6 com.pillsaathi` shows it scheduled
  - switching it off removes it from `dumpsys`
  - while a debug alarm rings, switching it off in the app stops the ringing (Review Focus 3)
- [ ] **Step 7: Commit.** `git add package.json package-lock.json App.tsx jest.config.js jest.setup.js src __tests__ android/app/src/main && git commit -m "feat: add alarm list and alarm editor screens"`

---

### Task 7: Sound picker and recorder screens

**Files:**
- Create (replacing the placeholders): `src/screens/SoundPickerScreen.tsx`, `src/screens/RecordScreen.tsx`, `src/components/SoundRow.tsx`
- Test: `__tests__/screens/SoundPickerScreen.test.tsx`, `__tests__/screens/RecordScreen.test.tsx`

**Interfaces:**
- Consumes: `src/native/sounds.ts` (all of it, including `SoundErrors`), and `RootStackParamList` with the pick-return convention from Task 6.

Behaviour:
- **SoundPicker** (wireframe 3), titled "Sound":
  - Two large buttons, **"● Record"** (opens `Record`) and **"⇪ Import"**.
  - Then "Your sounds": a first row **"Default alarm tone"** (id `null`), then `listSounds()`. Each `SoundRow` has a ▶/■ preview toggle, the name, "Recorded · 0:12" or "Imported · 0:30" (m:ss), and a radio button for `selectedSoundId`.
  - Tapping a row returns the pick (`pickedSoundId`).
  - Long-pressing a sound row confirms deletion. If `usedBy` isn't empty, say: "Delete “<name>”? It's used by: <usedBy joined ', '>. Those alarms will use the default alarm tone." Otherwise: "Delete “<name>”?"
  - **Import:** a resolved sound returns as the pick. `null` does nothing. `UNSUPPORTED_AUDIO` → `Alert` "That file can't be played. Try an mp3, m4a, wav or ogg file."
  - Preview stops on blur, and `onPreviewEnded` resets the ▶.
- **Record** (wireframe 4) has the states `idle → recording → recorded`:
  - **Idle:** the timer shows "0:00", the hint reads "Up to 2:00", and there's a record button.
  - **Tapping record:** `PermissionsAndroid.request(RECORD_AUDIO, {title: 'Allow microphone', message: 'PillSaathi needs the microphone to record your alarm sound.', buttonPositive: 'OK'})`. If denied, `Alert` "Microphone access is off" with **Open settings** → `Linking.openSettings()`. If granted, `startRecording()`.
  - **Recording:** a m:ss timer counts up from the start time, the level bars show the last 24 `onRecordingLevel` values, and a stop button sits under "Tap to stop".
  - **Stopping:** `stopRecording()` → recorded. An `onRecordingAutoStopped` event also moves to recorded.
  - **Recorded:** **▶ Listen** (`previewRecording`/`stopPreview`), **↺ Redo** (`discardRecording` → idle), a name field (default "My recording"), and **Use this sound** → `saveRecording(name)` → return the pick.
  - `RECORDING_TOO_SHORT` → `Alert` "That recording was too short. Try again." and back to idle (Review Focus 1).
  - Unmounting while recording, or recorded but unsaved, calls `discardRecording()` (Review Focus 4).

- [ ] **Step 1: Write the failing tests.**
```tsx
// SoundPickerScreen.test.tsx
test('lists Default alarm tone first, then saved sounds with type and length')   // 'Recorded · 0:12', 'Imported · 0:30'
test('tapping a sound returns it to the alarm editor')       // renderApp('SoundPicker',{selectedSoundId:null}) inside a stack whose
                                                              // first screen is AlarmEdit; press 'My voice' → AlarmEdit shows 'My voice'
test('import of an unplayable file shows the format alert')  // importSound rejects {code:'UNSUPPORTED_AUDIO'} → Alert.alert called with
                                                              // "That file can't be played. Try an mp3, m4a, wav or ogg file."   (RF2)
test('deleting a sound in use names the alarms that use it') // usedBy:['Morning tablet'] → message contains "It's used by: Morning tablet."
// RecordScreen.test.tsx  (mock PermissionsAndroid.request → 'granted')
test('record then stop shows Listen, Redo and the name field')
test('a too-short recording shows the retry alert and returns to idle')   // stopRecording rejects {code:'RECORDING_TOO_SHORT'}   (RF1)
test('leaving while recording discards the take')            // start, then unmount → discardRecording called              (RF4)
test('auto-stop at the limit moves to the recorded state')   // fire the captured onRecordingAutoStopped callback with 120000
test('Use this sound saves with the typed name')             // saveRecording called with 'Amma voice'
```
- [ ] **Step 2: Run the tests to verify they fail.** Run `npx jest __tests__/screens/SoundPickerScreen.test.tsx __tests__/screens/RecordScreen.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement the screens and `SoundRow`.**
- [ ] **Step 4: Run all checks.** Run `npx jest && npx tsc --noEmit && npm run lint`. Expected: all pass.
- [ ] **Step 5: Run on the emulator.** Expected:
  - Record a 5 s clip (the emulator mic uses host audio), name it, use it, and save the alarm 1 minute out. The alarm rings with the recording, looping.
  - Push an mp3 with `adb push some.mp3 /sdcard/Download/`, import it, preview it, and set it on an alarm. It rings with the mp3.
  - Push a renamed text file `fake.mp3` and import it. The format alert shows, and the "Your sounds" count is unchanged.
  - Delete the sound used by an alarm. The alarm row shows "Default alarm tone".
- [ ] **Step 6: Commit.** `git add src __tests__ && git commit -m "feat: add sound picker and recorder screens"`

---

### Task 8: Reliability: warning banner, maker-specific setup screen, kill detection

**Files:**
- Create: `src/lib/health.ts`, `src/setup/oemSteps.ts`, `src/components/HealthBanner.tsx`, `src/screens/SetupScreen.tsx` (replacing the placeholder), `android/app/src/main/java/com/pillsaathi/bridge/OemIntents.kt`
- Modify: `SettingsLauncher.kt` (`oemAutostart`, `oemBattery` through `OemIntents`), `src/screens/AlarmListScreen.tsx` (banner + missed alert)
- Test: `__tests__/lib/health.test.ts`, `__tests__/setup/oemSteps.test.ts`, `__tests__/screens/SetupScreen.test.tsx`, additions to `__tests__/screens/AlarmListScreen.test.tsx`

**Interfaces:**
- Consumes: `Health`, `SetupState`, `MissedAlarm`, `openSetting`, `setSetupStepDone` and `reconcileOnAppOpen` from `src/native/alarms.ts`, and `formatTime`.
- Produces:
  ```ts
  // src/setup/oemSteps.ts
  export type SetupStep = {key: string; title: string; body: string; setting?: SettingTarget; autoDone?: 'batteryOptimization'};
  export function makerKey(manufacturer: string): 'xiaomi' | 'oppo' | 'vivo' | 'samsung' | 'huawei' | 'other';
  export function isAggressiveMaker(manufacturer: string): boolean;     // makerKey !== 'other'
  export function stepsFor(manufacturer: string): SetupStep[];
  // src/lib/health.ts
  export type IssueKey = 'notifications' | 'alarmChannel' | 'exactAlarm' | 'fullScreen' | 'backgroundRestricted' | 'alarmVolume' | 'batteryOptimization' | 'setup';
  export type Issue = {key: IssueKey; message: string; action: SettingTarget | 'setup'};
  export function healthIssues(health: Health, setup: SetupState, manufacturer: string): Issue[];
  ```

Behaviour:
- **`makerKey`** lower-cases the manufacturer and maps:
  - xiaomi, redmi, poco → `xiaomi`
  - oppo, realme, oneplus → `oppo` (ColorOS/OxygenOS)
  - vivo, iqoo → `vivo`
  - samsung → `samsung`
  - huawei, honor → `huawei`
  - anything else → `other`

  In JS the manufacturer comes from `Platform.constants.Manufacturer`.
- **`stepsFor`** always ends with a battery step:
  `{key: 'battery', title: 'Allow unrestricted battery use', body: 'Battery saving can delay or stop alarms.', setting: 'batteryOptimization', autoDone: 'batteryOptimization'}`. It is done when `health.ignoringBatteryOptimizations` is true.
- **Steps per maker,** listed before the battery step. Each step's `setting` is the target its button opens. `lockRecents` has no setting and is text plus a "Done" button.

  | Maker | Step key | Title | Setting |
  |---|---|---|---|
  | xiaomi | `autostart` | "Turn on Autostart" | `oemAutostart` |
  | xiaomi | `oemBattery` | "Set Battery saver to No restrictions" | `oemBattery` |
  | xiaomi | `lockRecents` | "Lock PillSaathi in recent apps" | none |
  | oppo | `autostart` | "Allow auto-launch" | `oemAutostart` |
  | oppo | `oemBattery` | "Allow background activity" | `oemBattery` |
  | oppo | `lockRecents` | "Lock PillSaathi in recent apps" | none |
  | vivo | `autostart` | "Allow background start (Autostart)" | `oemAutostart` |
  | vivo | `oemBattery` | "Allow high background power use" | `oemBattery` |
  | vivo | `lockRecents` | "Lock PillSaathi in recent apps" | none |
  | samsung | `samsungSleeping` | "Remove PillSaathi from Sleeping and Deep sleeping apps" | `oemBattery` |
  | huawei | `autostart` | "Set App launch to Manage manually and allow all" | `oemAutostart` |
  | other | — | — | — |

  Bodies are one plain sentence each, telling the user what to tap on that screen.
- **`OemIntents.kt`** returns candidate `Intent`s for (maker, target). `SettingsLauncher` tries each in order and falls back to App info. Candidates follow dontkillmyapp.com; verify the component names there when implementing.

  | Maker | Target | Candidate components, in order |
  |---|---|---|
  | xiaomi | autostart | `com.miui.securitycenter/com.miui.permcenter.autostart.AutoStartManagementActivity` |
  | xiaomi | battery | `com.miui.powerkeeper/.ui.HiddenAppsConfigActivity` (extras `package_name`, `package_label`) |
  | oppo | autostart | `com.coloros.safecenter/.startupapp.StartupAppListActivity`, then `com.coloros.safecenter/.permission.startup.StartupAppListActivity`, then `com.oppo.safe/.permission.startup.StartupAppListActivity`, then `com.oneplus.security/.chainlaunch.view.ChainLaunchAppListActivity` |
  | vivo | autostart | `com.vivo.permissionmanager/.activity.BgStartUpManagerActivity`, then `com.iqoo.secure/.ui.phoneoptimize.BgStartUpManager`, then `com.iqoo.secure/.ui.phoneoptimize.AddWhiteListActivity` |
  | samsung | battery | `com.samsung.android.lool/com.samsung.android.sm.battery.ui.BatteryActivity`, then `com.samsung.android.sm/.battery.ui.BatteryActivity` |
  | huawei | autostart | `com.huawei.systemmanager/.startupmgr.ui.StartupNormalAppListActivity`, then `com.huawei.systemmanager/.optimize.process.ProtectActivity` |

  Any (maker, target) pair not listed → App info.
- **`healthIssues`** returns issues in this exact order and with this exact copy:

  | Condition | Message | Action |
  |---|---|---|
  | `!notificationsEnabled` | "Notifications are off, so alarms can't show. Tap to turn them on." | `notifications` |
  | `!alarmChannelEnabled` | "Alarm notifications are turned off. Tap to turn them on." | `alarmChannel` |
  | `!exactAlarmAllowed` | "PillSaathi isn't allowed to set alarms. Tap to allow it." | `exactAlarm` |
  | `!fullScreenAllowed` | "Alarms can't show on the lock screen. Tap to allow it." | `fullScreen` |
  | `backgroundRestricted` | "Background use is restricted, so alarms may not ring. Tap to fix." | `backgroundRestricted` |
  | `alarmVolumeLow` | "Alarm volume is off. Tap to turn it up." | `alarmVolume` |
  | `!ignoringBatteryOptimizations` | "Battery saving may stop alarms. Tap to allow unrestricted battery use." | `batteryOptimization` |
  | `isAggressiveMaker && some non-auto step not in doneSteps` | "Finish setting up so alarms ring reliably on this phone." | `setup` |
- **`HealthBanner`** shows the first issue's message, plus " (+N more)" when there are others. Tapping it runs the action: `openSetting(...)`, or navigates to `Setup` for `setup`. It renders nothing when the list is empty.
- **SetupScreen**, titled "Make alarms reliable":
  - Intro: "Some phones stop apps in the background. Do these steps once so your alarms always ring."
  - One card per step: the title, the body, an **Open settings** button when `setting` is set, and a **Done** toggle (`setSetupStepDone(key, !done)`). The battery step shows ✓ automatically from health and has no Done toggle.
  - It re-reads health and setup on focus, so returning from Settings updates the ticks.
  - A bottom **Finish** button calls `goBack()`.
- **AlarmList additions:**
  - Render `HealthBanner` above the list.
  - When `reconcileOnAppOpen()` returns missed alarms, show one `Alert` titled "Alarm missed". Its message is "PillSaathi was stopped by your phone and missed <name> (<formatTime of dueAt>)." with one line per missed alarm. Buttons: **Later**, and **Fix this** → `navigate('Setup')`.

- [ ] **Step 1: Write the failing tests.**
```ts
// __tests__/setup/oemSteps.test.ts
expect(makerKey('Xiaomi')).toBe('xiaomi'); expect(makerKey('POCO')).toBe('xiaomi'); expect(makerKey('realme')).toBe('oppo');
expect(makerKey('OnePlus')).toBe('oppo'); expect(makerKey('iQOO')).toBe('vivo'); expect(makerKey('Google')).toBe('other');
expect(stepsFor('Xiaomi').map(s => s.key)).toEqual(['autostart', 'oemBattery', 'lockRecents', 'battery']);
expect(stepsFor('samsung').map(s => s.key)).toEqual(['samsungSleeping', 'battery']);
expect(stepsFor('Google').map(s => s.key)).toEqual(['battery']);
// __tests__/lib/health.test.ts
const ok: Health = {notificationsEnabled:true, alarmChannelEnabled:true, exactAlarmAllowed:true, fullScreenAllowed:true,
                    ignoringBatteryOptimizations:true, backgroundRestricted:false, alarmVolumeLow:false};
expect(healthIssues(ok, {seen:true, doneSteps:[]}, 'Google')).toEqual([]);
expect(healthIssues(ok, {seen:true, doneSteps:[]}, 'Xiaomi').map(i => i.key)).toEqual(['setup']);
expect(healthIssues(ok, {seen:true, doneSteps:['autostart','oemBattery','lockRecents']}, 'Xiaomi')).toEqual([]);
expect(healthIssues({...ok, notificationsEnabled:false, alarmVolumeLow:true, ignoringBatteryOptimizations:false},
  {seen:true, doneSteps:[]}, 'Google').map(i => i.key)).toEqual(['notifications', 'alarmVolume', 'batteryOptimization']);
```
```tsx
// SetupScreen.test.tsx  (Platform.constants.Manufacturer mocked to 'Xiaomi')
test('shows the Xiaomi steps in order')                       // 'Turn on Autostart' … 'Allow unrestricted battery use'
test('Open settings on Autostart calls openSetting("oemAutostart")')
test('Done toggles the step through setSetupStepDone')        // ('autostart', true)
// AlarmListScreen.test.tsx additions
test('shows the first health issue in the banner and opens its setting on tap')
test('alarms missed while the app was stopped are reported once with a Fix this button')
  // reconcileOnAppOpen → [{id:'a1',name:'Morning tablet',dueAt:<07:00 today>}] → Alert.alert('Alarm missed',
  //   'PillSaathi was stopped by your phone and missed Morning tablet (7:00 AM).', [Later, Fix this])
```
- [ ] **Step 2: Run the tests to verify they fail.** Run `npx jest __tests__/lib/health.test.ts __tests__/setup __tests__/screens/SetupScreen.test.tsx __tests__/screens/AlarmListScreen.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement `oemSteps.ts`, `health.ts`, `HealthBanner`, `SetupScreen`, the AlarmList additions, `OemIntents.kt` and the `SettingsLauncher` targets.**
- [ ] **Step 4: Run all checks.** Run `npx jest && npx tsc --noEmit && npm run lint && (cd android && ./gradlew :app:assembleDebug :app:testDebugUnitTest)`. Expected: all pass.
- [ ] **Step 5: Verify kill detection on the emulator.**
  1. Create an alarm 2 minutes out, then run `adb shell am force-stop com.pillsaathi`. This is what OEM killers do: it cancels the app's alarms.
  2. Wait past the time plus 2 minutes, then open the app. Expected: the "Alarm missed … stopped by your phone …" alert, and `dumpsys alarm` shows the app's other enabled alarms rescheduled.
  3. Run `adb shell cmd appops set com.pillsaathi RUN_ANY_IN_BACKGROUND ignore` and reopen the app. Expected: the banner shows "Background use is restricted…".
  4. Undo it with `allow`.
- [ ] **Step 6: Commit.** `git add src __tests__ android/app/src/main && git commit -m "feat: add reliability banner, maker-specific setup screen and kill detection"`

---

### Task 9: Device test matrix and README

**Files:**
- Modify: `README.md`. Replace the template text with what the app is, how to run it (`npm start`, `npm run android`), how to run tests (`npm test`, `cd android && ./gradlew :app:testDebugUnitTest`), the debug broadcasts from Task 2, and the manual test matrix below as a checklist with a "last run" line.

- [ ] **Step 1: Run the spec's manual matrix on the emulator** (`Medium_Phone_API_34`, plus an API 36 image if one is installed). Record pass or fail for each case in the README checklist. Use the app for real, not the debug receiver, wherever the UI covers the case.
  - locked
  - silent mode (`adb shell cmd audio set-ringer-mode silent`, or the volume panel)
  - vibrate mode
  - Do Not Disturb (`adb shell cmd notification set_dnd priority`)
  - swiped from recents
  - `adb reboot`, then the ring before unlock
  - Doze (`adb shell dumpsys deviceidle force-idle`)
  - snooze ×3
  - 10-minute auto-silence (the real 10 minutes, once)
  - a corrupt sound falling back to the default tone. Corrupt it with `adb shell run-as com.pillsaathi sh -c 'echo x > /data/user_de/0/com.pillsaathi/files/sounds/<file>'`; `run-as` works because this is a debug build.
  - two alarms at the same minute
  - each missing-permission banner
  - missed while powered off (emulator off across the alarm time, then boot): the "Missed alarm" notification
  - force-stop kill detection
- [ ] **Step 2: Mark the cases that need real phones as pending.** These are the Xiaomi/Redmi run (setup steps done → swipe away, reboot, overnight idle, still rings; setup skipped → kill detected), and Android 12 and 13 permission flows if no image is available. They can't run on the emulator. Mark them **pending, needs a real device** in the README rather than passing them.
- [ ] **Step 3: Run the final full checks.** Run `npx jest && npx tsc --noEmit && npm run lint && (cd android && ./gradlew :app:assembleDebug :app:testDebugUnitTest) && npx react-native bundle --platform ios --dev false --entry-file index.js --bundle-output "$TMPDIR/ios.jsbundle"`. Expected: all pass, and the iOS JS bundle still builds (Global Constraints).
- [ ] **Step 4: Commit.** `git add README.md && git commit -m "docs: add README with run instructions and device test matrix"`
