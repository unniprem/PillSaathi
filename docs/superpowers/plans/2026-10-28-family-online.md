# Family Online (Android) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans (the user picks one) to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A relative links their phone to an elder's phone once. From then on the relative sees the elder's day, History and tablets left from anywhere, and gets an ordinary notification when a dose is missed or a pill runs low. Everything runs on Firebase's free plan, with no server code.

**Architecture:**
- **The elder's phone stays the source.** Pills and records keep living in the JSON store. The online part is a copy, uploaded by a WorkManager job in the main process. `AlarmEngine` only sends a broadcast after each change. The broadcast is sent only when this phone shares, and `:ringing` never touches Firebase.
- **Two Firebase identities per phone, in two `FirebaseApp` instances.**
  - The default app signs in anonymously and is "my pills". Its uid is the elder's id online.
  - A second app named `family` signs in with Google and is "people I look after".
  - A son with his own pills can be followed and follow others with no account linking.
- **No server code.** Access is enforced by `firestore.rules`.
  - Linking is a short-lived code plus an Allow on the elder's phone.
  - The relative's phone checks for itself. An exact, silent wake-up runs a check worker after each dose time plus the delay, reads the elder's record, and posts the notification.
- **All decisions are pure Kotlin in `FamilyRules`, unit tested.** That covers codes, months, check times, the ping decision, refill pings, the elder's today and the tally. The Firebase glue only moves data, and the screens only draw.

**Tech Stack:**
- Existing: React Native 0.88 (new architecture), React 19.3, TypeScript, Kotlin 2.2 (java.time through desugaring), React Navigation 7, Jest with `@testing-library/react-native` 14, JUnit 4.
- **New Android dependencies:**
  - Firebase BoM: `firebase-auth`, `firebase-firestore`
  - the `com.google.gms.google-services` Gradle plugin
  - `androidx.credentials:credentials`, `androidx.credentials:credentials-play-services-auth`, `com.google.android.libraries.identity.googleid:googleid`
  - `com.google.android.gms:play-services-code-scanner`
  - `androidx.work:work-runtime`
  - `com.google.zxing:core` (to draw the QR)
- **New npm devDependencies:** `firebase-tools`, `@firebase/rules-unit-testing`, `firebase`, for the rules tests on the Firestore emulator. These need Java, which the Android setup already has.
- Pick the newest versions that build with this Gradle 9.4 / AGP / Kotlin 2.2 setup and `minSdk 24`.

**Spec:** `docs/superpowers/specs/2026-10-27-family-online-design.md`. Read it first, together with the History and refills plan (`docs/superpowers/plans/2026-10-27-history-and-refills.md`), whose constraints still hold.

## Global Constraints

- **Earlier constraints still apply.** Every "Global Constraints" line in the four earlier plans still holds, except that work happens on branch **`feature/family-online`**, which gets a new PR. In particular:
  - The ringing path never depends on JS.
  - User writes throw. Ringing-path writes are best effort.
  - The JS bundle still builds for iOS.
  - New words go into `en.ts`, `ml.ts` and `hi.ts` and, for native, into `values`, `values-ml` and `values-hi`. Malayalam and Hindi stay drafts.
- **Nothing online may touch an alarm.**
  - `:ringing` never calls Firebase or WorkManager.
  - The only family code it runs is `FamilyHooks.changed(context)`. That reads `family.json` lock-free (`peekFamily`) and, only when `sharing` is true, sends one explicit broadcast. It runs **after** the store lock is released, wrapped in `try/catch` that logs.
  - No engine method waits on the network.
- **Network code only after Family is used.** No Firebase call happens until someone opens Show code or Add family.
  - Firebase auto-init runs in the main process only. That's the default behaviour of its provider; keep it.
  - If `FirebaseApp.getApps(context)` is empty, because the build has no `google-services.json`, every family call rejects with `NOT_SET_UP`.
- **The Firebase plugin is applied only when `android/app/google-services.json` exists**, and that file is gitignored. Jest, `tsc`, lint and Kotlin unit tests never need it.
- **Online data, exactly** (elderId = the default app's anonymous uid; times are Firestore `Timestamp`s unless noted):

  ```text
  codes/{code}                      { elderId, expiresAt }
  elders/{elderId}                  { zone: "Asia/Kolkata", heardAt (server time), oldest: "YYYY-MM-DD" | null,
                                      pills: [ { id, name, form, amount, times: [{hour, minute}], startDate,
                                                 days | null, createdAt (ms), photo | null, remaining | null } ],
                                      followers: [uid], people: { uid: { name, email } } }
  elders/{elderId}/months/{YYYY-MM} { records: [ { date, hour, minute, outcome, at (ms), marked,
                                                   pills: [ { pillId, name, form, amount } ] } ] }
  elders/{elderId}/photos/{pillId}  { name (the photo file name), jpeg (Blob) }
  elders/{elderId}/requests/{uid}   { code, name, email, at, status: "pending" | "allowed" | "denied" }
  ```

- **Numbers from the spec:**

  | What | Value |
  | --- | --- |
  | Code | 6 digits, zero-padded |
  | Code life | 15 min (`CODE_TTL_MS = 900_000`) |
  | QR text | `PILLSAATHI:<code>` |
  | Ping delays | 15, 30, 60 min or Off (null); default 30 |
  | Silent after | 12 h (`SILENT_AFTER_MS`) |
  | Abandoned after | 30 days (`ABANDONED_AFTER_MS`) |
  | Offline retry window | 3 h after the check time (`RETRY_WINDOW_MS`) |
  | Heartbeat upload | every 6 h |
  | Photo copy | longest side ≤ 256 px, JPEG quality 70 |
  | Kept months | the ones holding the 365 days of records the phone keeps |
  | Refill rule | `RefillRules.warning` as is (5 days) |
  | Pings remembered | 2 days of keys, then pruned |

- **Polling, never tight loops:**
  - Linking screens poll an **in-memory** status from native every 2 s. Native keeps one Firestore snapshot listener while the screen is open, so polling costs no reads.
  - Today refreshes family data on focus, on app foreground, and every 2 min while focused.
- **Times for an elder are her wall-clock times.** The bridge shifts every instant it returns for an elder view (`statusAt`, `at`, `heardAt`) with `FamilyRules.wallClock`, so JS's local `Date` shows her time. JS never handles zones. Card `hour:minute` values are already hers.
- **Fixed copy, English.** `{}` marks a value.

  **Elder side.**

  | Where | Copy |
  | --- | --- |
  | Settings row and screen title | "Family" |
  | Section | "People who can see my pills" |
  | Empty | "No one yet." |
  | Button | "Show a code to a family member" |
  | Code screen title | "Family code" |
  | Code screen body | "Show this to a family member, or send it. It works for 15 minutes." |
  | Share button | "Send code" |
  | Share message | "Open PillSaathi, tap Add family, and type {482 913}. It works for 15 minutes." |
  | Expired | "This code has expired." with the button "New code" |
  | Allow alert | Title "Let {Ravi} see your pills?"; body "{ravi@gmail.com} will see your pills and whether you took them."; buttons "No" and "Allow" |
  | Remove confirm | "Stop {Ravi} seeing your pills?" with "Cancel" and "Remove" |

  **Relative side.**

  | Where | Copy |
  | --- | --- |
  | Section | "People I look after" |
  | Empty | "No one yet." |
  | Button | "+ Add family" |
  | Add family | "Sign in with Google", "Scan code", "or type the 6 digits", "Next" |
  | Waiting | "Waiting for them to tap Allow on their phone…" |
  | Refused | "They tapped No." |
  | Bad code | "That code didn't work. Check the 6 digits, or ask for a new code." |
  | Offline | "No internet. Please try again." |
  | Not set up | "Family isn't set up in this build." |
  | Form | "What do you call them?"; "Their phone number"; "Optional. For the Call button."; "Tell me if a dose is missed"; choices "After 15 min", "After 30 min", "After 1 hour", "Off"; "Done" |
  | Edit | "Stop following"; confirm "Stop seeing {Amma}'s pills?"; when abandoned, the extra prompt "Also delete {Amma}'s online copy?" with "Keep" and "Delete" |
  | Today | Heading "Family" |
  | Tally | "{2} taken · {1} missed · {1} not reported · {1} later", nonzero parts only, in that order, skipped after missed; "Nothing due today" when all are zero |
  | Silent | "Not heard from since {time}" |
  | Low line | "{Telma 40}: {4 tablets} left" or "{Telma 40}: none left" |
  | Elder page | Title {name}; "Last heard from at {time}"; when zones differ, "Times are {Amma}'s time."; buttons "History" and "Call" |
  | Card status | "Not reported yet" |

  **Notifications.**

  | What | Copy |
  | --- | --- |
  | Channels | `family_missed` "Family: missed doses", `family_refill` "Family: running low", both `IMPORTANCE_DEFAULT` |
  | Missed | "{Amma} hasn't taken {Azee 500} ({2:00 PM})." |
  | Not reported | "{Amma}'s phone hasn't reported the {2:00 PM} dose ({Azee 500}). Last heard from at {1:12 PM}." |
  | Silent | "We haven't heard from {Amma}'s phone since {time}. Alarms on it may not be ringing. Please check on {Amma}." |
  | Refill | "{Amma}'s {Telma 40}: {4 tablets} left" or "{Amma}'s {Telma 40}: none left" |
  | Actions | "Call" (`ACTION_DIAL tel:`; only when a number is saved) and "Open" |

  - A `{time}` that is not today reads "{Tue 27 Oct}, {8:05 AM}".
- **Fixed copy, translations used in tests:** "Family" is ml "കുടുംബം" and hi "परिवार".
- **Error codes from `NativeFamily`:**

  | Code | When |
  | --- | --- |
  | `NOT_SET_UP` | No Firebase config in the build |
  | `OFFLINE` | No internet, or Firestore unavailable |
  | `BAD_CODE` | The code is missing, expired or used |
  | `NOT_SIGNED_IN` | |
  | `NO_ACTIVITY` | |
  | `NOT_FOUND` | Unknown follow |
  | `PERMISSION` | Rules refused |

- **Commits:** one per task, conventional, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. `npx tsc --noEmit` and `npm run lint` stay clean after every task. Before pushing, check the PR isn't merged (`gh pr view --json state`).

## Review Focus

These five cases are the ones no spec check reaches and the most likely to hurt a real family, most likely first. Each one's test is in the task that owns the code.

1. **A dose near midnight or at a month's end.** A 23:45 dose checked at 00:15 must read the record dated the day before, in the month document for that day, and not ping as "not reported" for the wrong day. Tests: Task 3 `checksBetween_lateDoseKeepsItsDate`, `monthKey_byRecordDate`.
2. **The elder in another zone, across a DST change.** Check times come from her zone and never from the relative's phone. Tests: Task 3 `checksBetween_elderZoneAcrossDst`; Task 4 `wallClock_showsElderTime`.
3. **The elder changed a pill's time after the relative's checks were set.** A check for a time she no longer has must not ping. Test: Task 3 `decide_timeNoLongerDue_noPing`.
4. **The same check running twice** (a retried worker, a double alarm delivery, a refresh racing a check) must not post two pings. Tests: Task 3 `decide_alreadyPinged_none`; Task 13 marks the key in `family.json` **before** posting.
5. **The relative removed, or the copy deleted, while checks are scheduled.** The next read is refused, and the follow must go quietly with its checks, not ping "not reported" forever. Tests: Task 4 `afterRefresh_refused_dropsFollow`; Task 13 cancels the check alarm when no follows are left.

---

## File Structure

Kotlin, under `android/app/src/main/java/com/pillsaathi/` (tests mirror it under `android/app/src/test/...`):

| File | Change | Responsibility |
| --- | --- | --- |
| `family/FamilyModels.kt` | create | `FamilyLocal`, `Uploaded`, `Follow`, `ElderDoc`, `CheckItem`, `CheckDecision`, `FamilyCardData`, `Tally` |
| `family/FamilyJson.kt` | create | `family.json`, and Firestore maps for pills, records and the elder doc (pure) |
| `family/FamilyRules.kt` | create | every family decision (pure) |
| `family/FamilyCloud.kt` | create | the two `FirebaseApp`s, Auth and Firestore calls, blocking, worker threads only |
| `family/ElderSync.kt` | create | the upload diff, heartbeat and last-follower cleanup |
| `family/FamilyChecks.kt` | create | runs due checks, posts pings, schedules the next wake-up |
| `family/FamilyWork.kt` | create | `UploadWorker`, `CheckWorker`, enqueue helpers |
| `family/FamilyReceivers.kt` | create | `FamilyChangeReceiver`, `CheckAlarmReceiver`, `FamilySystemReceiver` (main process) |
| `family/FamilyHooks.kt` | create | `changed(context)`, the one call from `AlarmEngine` |
| `family/FamilyNotifications.kt` | create | the two channels and three posts |
| `family/Thumbnails.kt` | create | photo file to small JPEG bytes |
| `family/CodeImage.kt` | create | QR PNG via zxing |
| `family/GoogleSignIn.kt` | create | Credential Manager to a Google ID token |
| `alarm/AlarmStore.kt` | modify | `loadFamily`, `saveFamily`, `peekFamily` (`family.json`) |
| `alarm/AlarmEngine.kt` | modify | `FamilyHooks.changed` after each pill or record change |
| `alarm/PillModels.kt` | modify | `DoseStatus.NOT_REPORTED("notReported")` |
| `bridge/NativeFamilyModule.kt` | create | the TurboModule |
| `bridge/PillSaathiPackage.kt` | modify | registers it |
| `src/debug/.../family/debug/DebugFamilyReceiver.kt` | create | `DEBUG_FAMILY_UPLOAD`, `DEBUG_FAMILY_CHECK`, `DEBUG_FAMILY_LIST` (main process) |

JS and config:

| File | Change | Responsibility |
| --- | --- | --- |
| `specs/NativeFamily.ts` | create | the codegen spec |
| `src/native/family.ts` | create | typed wrapper, `FamilyErrors` |
| `src/lib/family.ts` | create | `formatCode`, `shareMessage`, `tallyText`, `heardText` (pure) |
| `src/components/FamilySection.tsx`, `FollowForm.tsx` | create | Today's family cards; the name, number and delay form |
| `src/screens/FamilyScreen.tsx`, `ShareCodeScreen.tsx`, `AddFamilyScreen.tsx`, `ElderScreen.tsx`, `FollowEditScreen.tsx` | create | |
| `src/screens/TodayScreen.tsx`, `SettingsScreen.tsx`, `HistoryScreen.tsx`, `HistoryDayScreen.tsx` | modify | Family section, Settings row, `elderId` read-only mode |
| `src/components/DoseCard.tsx`, `RefillBanner.tsx` | modify | `readOnly`, `notReported` |
| `src/navigation/RootNavigator.tsx`, `src/native/alarms.ts`, `src/i18n/*.ts` | modify | routes, `DoseStatus`, words |
| `firestore.rules`, `firebase.json`, `firebase/rules.test.ts`, `jest.rules.config.js` | create | rules and their emulator tests |
| `jest.config.js`, `jest.setup.js`, `__tests__/helpers/nativeMocks.ts` | modify | ignore `firebase/`, default family mocks |
| `.gitignore`, `README.md` | modify | `google-services.json`, setup steps, matrix |

---

### Task 0 (the user): Create the Firebase project

Not code. The user does this in the Firebase console, any time before Task 8's device check. Tasks 1–7 don't need it. Give the user these steps as a message, and wait for their "done" before Task 8 Step 5.

1. **The old project `pillsathi-dev`.** Remove its Android app `com.pillsaathi` (Project settings → Your apps), or delete the whole project. Also check Usage and billing, and unlink any billing account.
2. **Create a new project**, for example `pillsaathi`. Turn Google Analytics off. Stay on the **Spark** plan and never add billing.
3. **Firestore.** Build → Firestore Database → Create database. Pick **Standard** edition, location **asia-south1 (Mumbai)**, production mode.
4. **Sign-in providers.** Build → Authentication → Get started. Turn on **Anonymous** and **Google** (with a support email).
5. **Add the Android app** `com.pillsaathi`, with the SHA-1 and SHA-256 from `cd android && ./gradlew signingReport` (the `debug` variant uses `app/debug.keystore`). Download `google-services.json` into `android/app/`.
6. **Deploy the rules.** Run `npx firebase login`, then `npx firebase deploy --only firestore:rules --project <project-id>`. This happens after Task 5 and again whenever `firestore.rules` changes.

---

### Task 1: Dependencies, the optional Firebase plugin, and the rules harness

**Files:**
- Modify: `android/build.gradle`, `android/app/build.gradle`, `.gitignore`, `package.json`, `jest.config.js`
- Create: `firebase.json`, `firestore.rules` (deny-all for now), `jest.rules.config.js`, `firebase/rules.test.ts`

**Interfaces:**
- Produces:
  - `npm run test:rules`, which is `firebase emulators:exec --only firestore --project demo-pillsaathi "jest -c jest.rules.config.js"`.
  - The Android dependencies listed in Tech Stack, all on the app classpath.

- [ ] **Step 1: Write the first rules test** in `firebase/rules.test.ts`. Use `@firebase/rules-unit-testing`, project `demo-pillsaathi`, and rules read from `firestore.rules`.

  ```ts
  test('a stranger reads nothing', async () => {
    const db = env.authenticatedContext('stranger').firestore();
    await assertFails(getDoc(doc(db, 'elders/E')));
    await assertFails(getDocs(collection(db, 'codes')));
  });
  ```

- [ ] **Step 2: Add the harness.**
  - `firebase.json`: the firestore rules path, and the emulator on port 8080.
  - `jest.rules.config.js`: node environment, `testMatch: ['<rootDir>/firebase/**/*.test.ts']`, and the same Babel transform the main config uses for TS.
  - Add `'/firebase/'` to `jest.config.js`'s `testPathIgnorePatterns`.
  - `firestore.rules`: `rules_version = '2'`, with every path denied.
  - Install the three devDependencies.
- [ ] **Step 3: Run it.** Run `npm run test:rules`. Expected: 1 pass. Then run `npm test`. Expected: the existing suite passes untouched.
- [ ] **Step 4: Add the Android dependencies.**
  - Put the `google-services` plugin on the root classpath.
  - In `app/build.gradle`:

    ```groovy
    // Family needs a Firebase project; without its config file the app builds and Family says it isn't set up.
    if (file('google-services.json').exists()) {
        apply plugin: 'com.google.gms.google-services'
    }
    ```

  - Add the dependencies.
  - Add `android/app/google-services.json` to `.gitignore`.
- [ ] **Step 5: Build without the file.** Run `cd android && ./gradlew :app:testDebugUnitTest :app:assembleDebug`. Expected: pass. Note each per-ABI APK's size before and after, from `app/build/outputs/apk/debug/`, for the PR.
- [ ] **Step 6: Commit** with `chore: add Firebase, sign-in, scanner and WorkManager libraries and the rules test harness`.

---

### Task 2: Family models and their JSON

**Files:**
- Create: `family/FamilyModels.kt`, `family/FamilyJson.kt`
- Modify: `alarm/AlarmStore.kt`
- Test: `family/FamilyJsonTest.kt`

**Interfaces:**
- Produces:

  ```kotlin
  data class Uploaded(val elder: String? = null, val months: Map<String, String> = emptyMap(), val photos: Map<String, String> = emptyMap())
  data class Follow(
    val elderId: String, val name: String, val phone: String?, val delayMinutes: Int?,   // null = Off
    val zone: String? = null, val heardAt: Long? = null, val oldest: String? = null,
    val pills: List<Pill> = emptyList(), val recent: List<DoseRecord> = emptyList(),      // her today and yesterday
    val photos: Map<String, String> = emptyMap(),                                         // pillId → cached file name
  )
  data class FamilyLocal(
    val sharing: Boolean = false, val uploaded: Uploaded = Uploaded(),
    val follows: List<Follow> = emptyList(), val checkedThrough: Long? = null,
    val pinged: Set<String> = emptySet(), val refillPinged: Map<String, RefillLevel> = emptyMap(),
    val silentWarned: Map<String, Long> = emptyMap(),                                     // elderId → the heardAt warned about
  )
  data class Person(val name: String, val email: String)
  data class ElderDoc(val zone: String, val heardAt: Long?, val oldest: String?, val pills: List<Pill>,
                      val followers: List<String>, val people: Map<String, Person>)
  ```

  - `FamilyJson.localToJson(l: FamilyLocal): String` and `localFromJson(json: String?): FamilyLocal`. Null or blank gives `FamilyLocal()`.
  - `FamilyJson.pillToMap(p: Pill): Map<String, Any?>` and `pillFromMap(m: Map<String, Any?>): Pill?`. `refillNotified` is never uploaded.
  - `FamilyJson.recordsToMap(r: List<DoseRecord>): Map<String, Any?>` (`{records: [...]}`) and `recordsFromMap(m): List<DoseRecord>`.
  - `FamilyJson.elderFromMap(m: Map<String, Any?>, heardAt: Long?): ElderDoc`. The caller converts the `Timestamp`.
  - `FamilyJson.monthHash(records: List<DoseRecord>): String`, the SHA-1 of `recordsToMap`'s JSON.
  - `AlarmStore.loadFamily(): FamilyLocal`, `saveFamily(l: FamilyLocal)`, and the lock-free `peekFamily(): FamilyLocal`, which gives `FamilyLocal()` on any error. All use `family.json`.

- [ ] **Step 1: Write the failing tests.** Maps are built the way Firestore returns them: whole numbers as `Long`, others as `Double`.

  ```kotlin
  @Test fun local_roundTrip()                 // every field set, including a Follow with pills, recent records, photos → equal after round trip
  @Test fun local_blank_defaults()            // localFromJson(null) == FamilyLocal(); sharing false
  @Test fun pill_fromFirestoreNumbers()       // amount 1L → 1.0, hour 8L → 8, days null, remaining 9.5 → equal Pill (refillNotified null)
  @Test fun records_roundTrip()               // a marked TAKEN and a MISSED record with two pill snapshots
  @Test fun elder_skipsBadPill()              // one pill missing "times" is dropped, the other kept; no throw
  @Test fun monthHash_stable()                // same records → same hash; one outcome changed → different
  ```

- [ ] **Step 2: Run them and see them fail.** Run: `cd android && ./gradlew :app:testDebugUnitTest --tests '*FamilyJsonTest'`.
- [ ] **Step 3: Implement the models, `FamilyJson` (with `org.json`, as `PillJson` does) and the three store calls.**
- [ ] **Step 4: Run all Kotlin tests and build.** Run: `./gradlew :app:testDebugUnitTest :app:assembleDebug`. Expected: pass.
- [ ] **Step 5: Commit** with `feat: add family models and their JSON`.

---

### Task 3: Family rules: codes, months, check times, the ping decision, refill pings

**Files:**
- Create: `family/FamilyRules.kt` (this task: everything below), with the `CheckItem` and `CheckDecision` models
- Test: `family/FamilyRulesTest.kt`

**Interfaces:**
- Consumes: Task 2's models; `DoseRules.pillsDue`, `RefillRules.warning`.
- Produces:

  ```kotlin
  data class CheckItem(val elderId: String, val date: LocalDate, val hour: Int, val minute: Int, val checkAt: Long)
  sealed interface CheckDecision {
    data object None : CheckDecision
    data object NoLongerDue : CheckDecision
    data object Expired : CheckDecision
    data class Missed(val names: String) : CheckDecision
    data class NotReported(val names: String, val heardAt: Long?) : CheckDecision
    data class Silent(val heardAt: Long) : CheckDecision
  }
  object FamilyRules {
    const val CODE_TTL_MS = 900_000L; const val SILENT_AFTER_MS = 43_200_000L
    const val ABANDONED_AFTER_MS = 2_592_000_000L; const val RETRY_WINDOW_MS = 10_800_000L
    val DELAYS = listOf(15, 30, 60); const val DEFAULT_DELAY = 30
    fun newCode(random: java.util.Random): String
    fun parseCode(text: String): String?                 // the 6 digits, spaces ignored, "PILLSAATHI:" allowed; else null
    fun qrText(code: String): String                     // "PILLSAATHI:$code"
    fun monthKey(date: LocalDate): String                // "2026-10"
    fun byMonth(records: List<DoseRecord>): Map<String, List<DoseRecord>>
    fun monthsToWrite(current: Map<String, String>, uploaded: Map<String, String>): Pair<Set<String>, Set<String>>  // (write, delete)
    fun checksBetween(follow: Follow, after: Long, through: Long): List<CheckItem>   // checkAt in (after, through], by checkAt
    fun nextCheckAt(follows: List<Follow>, now: Long): Long?                         // earliest checkAt > now within 48 h
    fun pingKey(item: CheckItem): String                 // "$elderId|$date|$hour:$minute"
    fun decide(item: CheckItem, elder: ElderDoc, records: List<DoseRecord>, local: FamilyLocal, now: Long): CheckDecision
    fun refillPings(elderId: String, pills: List<Pill>, sent: Map<String, RefillLevel>, now: Long, zone: ZoneId):
      Pair<List<RefillWarning>, Map<String, RefillLevel>>   // keys "$elderId|$pillId"
    fun prunePinged(pinged: Set<String>, today: LocalDate): Set<String>             // keeps today and yesterday
    fun uploads(local: FamilyLocal): Boolean            // local.sharing
  }
  ```

- **`decide`, in order:**
  1. `pingKey` already in `local.pinged` → `None`.
  2. No pill in `elder.pills` is due at that date and time (`DoseRules.pillsDue`) → `NoLongerDue`.
  3. `now > item.checkAt + RETRY_WINDOW_MS` → `Expired`.
  4. The record is TAKEN or SKIPPED → `None`. It is MISSED → `Missed(names of its pill snapshots)`.
  5. There is no record, and `heardAt` is null or `now − heardAt ≥ SILENT_AFTER_MS`:
     - if `local.silentWarned[elderId] == heardAt`, `None`;
     - else `Silent(heardAt)`, or `NotReported` when `heardAt` is null.
  6. Otherwise, `NotReported(names of the pills due, heardAt)`.

  Names are joined with ", ", as `namesOf` does in the engine.

- [ ] **Step 1: Write the failing tests.** Zone `Asia/Kolkata`; `NOW = ist(2026, 10, 28, 15, 0)`; pill "Azee 500" at 14:00, daily from Oct 1; follow delay 30.

  ```kotlin
  @Test fun newCode_sixDigitsZeroPadded()           // a Random whose nextInt(1_000_000) is 42 → "000042"
  @Test fun parseCode_forms()                       // "482 913"→"482913", "PILLSAATHI:482913"→"482913", "48291"→null, "4829134"→null, "abc"→null
  @Test fun monthKey_byRecordDate()                 // records Oct 31 23:45 and Nov 1 00:10 → keys "2026-10" and "2026-11"
  @Test fun monthsToWrite_changedAndOld()           // current {10:a, 11:b}, uploaded {09:x, 10:a, 11:old} → write {11}, delete {09}
  @Test fun checksBetween_delay()                   // after ist(28,14,0), through NOW → one item, date Oct 28 14:00, checkAt ist(28,14,30)
  @Test fun checksBetween_off()                     // delayMinutes null → empty
  @Test fun checksBetween_lateDoseKeepsItsDate()    // pill at 23:45, after ist(31,23,50), through ist(Nov 1, 0, 20) → date Oct 31, checkAt ist(Nov 1, 0, 15)
  @Test fun checksBetween_elderZoneAcrossDst()      // zone America/New_York, 8:00 daily: Oct 31 → 12:30Z, Nov 1 → 13:30Z (delay 30)
  @Test fun nextCheckAt_earliestAcrossFollows()     // two follows (14:00/30 and 14:10/15) after ist(28,14,0) → ist(28,14,25)
  @Test fun decide_taken_none()  ;  @Test fun decide_skipped_none()
  @Test fun decide_missed()                         // MISSED record → Missed("Azee 500")
  @Test fun decide_noRecord_notReported()           // heardAt ist(28,13,12) → NotReported("Azee 500", that heardAt)
  @Test fun decide_timeNoLongerDue_noPing()         // pill moved to 15:00 → NoLongerDue
  @Test fun decide_alreadyPinged_none()             // key in pinged → None even with a MISSED record
  @Test fun decide_pastRetryWindow_expired()        // now = checkAt + 3 h + 1 ms → Expired
  @Test fun decide_silent_warnsOnce()               // heardAt 13 h ago → Silent(heardAt); with silentWarned[E] == heardAt → None
  @Test fun decide_heardAgain_normal()              // heardAt 1 h ago, silentWarned holds an older one → NotReported
  @Test fun refillPings_oncePerLevel()              // 4 left at 1/day → [LOW]; same again → []; 0 left → [OUT]; count back to 30 → [] and the key removed
  @Test fun prunePinged_keepsTwoDays()              // keys for Oct 26, 27, 28 with today Oct 28 → 27 and 28 kept
  ```

- [ ] **Step 2: Run them and see them fail.** Run: `./gradlew :app:testDebugUnitTest --tests '*FamilyRulesTest'`.
- [ ] **Step 3: Implement them.** `checksBetween` walks dates in the follow's zone from the day before `after` through the day of `through`. It takes each time `DoseRules.pillsDue` gives for that date, adds the delay, and keeps the ones in range.
- [ ] **Step 4: Run all Kotlin tests.** Expected: pass.
- [ ] **Step 5: Commit** with `feat: add family rules for codes, months, check times and pings`.

---

### Task 4: Family rules: the elder's today, the card, the wall clock

**Files:**
- Modify: `family/FamilyRules.kt`, `family/FamilyModels.kt`, `alarm/PillModels.kt` (`DoseStatus.NOT_REPORTED("notReported")`)
- Test: `family/FamilyRulesTest.kt`

**Interfaces:**
- Produces:

  ```kotlin
  data class Tally(val taken: Int, val skipped: Int, val missed: Int, val notReported: Int, val later: Int)
  data class FamilyCardData(val follow: Follow, val tally: Tally, val silent: Boolean, val abandoned: Boolean,
                            val otherZone: Boolean, val refills: List<RefillWarning>)
  fun elderToday(pills: List<Pill>, records: List<DoseRecord>, now: Long, zone: ZoneId): Today
  fun tally(today: Today): Tally            // TAKEN, SKIPPED, MISSED, NOT_REPORTED; UPCOMING and LATER count as later
  fun card(follow: Follow, now: Long, localZone: ZoneId): FamilyCardData
  fun afterRefresh(follow: Follow, elder: ElderDoc?, recent: List<DoseRecord>): Follow?   // null elder (refused or gone) → null
  fun wallClock(millis: Long, elderZone: ZoneId, localZone: ZoneId): Long
  fun isAbandoned(heardAt: Long?, now: Long): Boolean
  ```

  - `elderToday` reuses `DoseRules.todayCards`. It gives each active time a synthetic card: id `"t$hour$minute"`, with `nextTriggerAt` set to today's time when it is after `now`, else null.
  - Then every card left `DONE` whose time today is ≤ `now`, and which has no record, becomes `NOT_REPORTED`.
  - Refills come from `RefillRules.warnings(pills, now, zone)`.

- [ ] **Step 1: Write the failing tests.**

  ```kotlin
  @Test fun elderToday_recordWins()                 // TAKEN record at 8:00 → TAKEN, statusAt = record.at
  @Test fun elderToday_pastNoRecord_notReported()   // 14:00, now 15:00 → NOT_REPORTED
  @Test fun elderToday_future_upcoming()            // 21:00 → UPCOMING
  @Test fun elderToday_herDate()                    // zone Asia/Kolkata, now 2026-10-28T23:30Z → today.date 2026-10-29
  @Test fun elderToday_refills()                    // 4 tablets left at 1/day → one LOW warning
  @Test fun tally_counts()                          // taken 2, missed 1, notReported 1, upcoming 1 → Tally(2,0,1,1,1)
  @Test fun card_silentAndAbandoned()               // heardAt 13 h ago → silent, not abandoned; 31 days ago → both
  @Test fun card_otherZone()                        // follow zone Asia/Kolkata, localZone Europe/London → true; same → false
  @Test fun afterRefresh_refused_dropsFollow()      // elder null → null
  @Test fun afterRefresh_keepsSettings()            // name, phone, delay kept; zone, heardAt, pills, recent replaced
  @Test fun wallClock_showsElderTime()              // 08:30Z, elder Asia/Kolkata, local Europe/London (Nov, GMT) → London wall clock reads 14:00
  ```

- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement them.**
  - Add `NOT_REPORTED` to `DoseStatus`.
  - Make any exhaustive `when` over it compile. The elder's own phone never produces it.
  - Add `'notReported'` to TS `DoseStatus` in `src/native/alarms.ts`.
  - In `DoseCard.statusText`, `'notReported'` returns `t.status.notReported`, which is "Not reported yet" (ml and hi drafts).
- [ ] **Step 4: Run every check.** Run: `./gradlew :app:testDebugUnitTest :app:assembleDebug && npm test && npx tsc --noEmit && npm run lint`. Expected: pass.
- [ ] **Step 5: Commit** with `feat: build an elder's today, tally and card from her uploaded data`.

---

### Task 5: Security rules

**Files:**
- Modify: `firestore.rules`, `firebase/rules.test.ts`

**Interfaces:**
- Produces: rules for the data layout in Global Constraints, which Tasks 6–13 rely on.
  - **`codes/{code}`:**
    - create by `elderId == auth.uid`, with `expiresAt ≤ request.time + 15 min`, and only if the code doesn't exist;
    - get by any signed-in user; list never;
    - delete by its elder.
  - **`elders/{e}`:**
    - read by `e` or a uid in `followers`;
    - create and update by `e`;
    - update by a follower only to remove himself: `affectedKeys` ⊆ {followers, people}, `followers == old.followers.removeAll([uid])`, and his `people` key gone;
    - delete by `e`, or by a follower once `heardAt < request.time − 30 d`.
  - **`months`, `photos`:**
    - read by `e` or a follower (via `get()` of the elder doc);
    - write by `e`;
    - delete also by a follower when the elder is abandoned.
  - **`requests/{uid}`:**
    - create by `uid` when `get(codes/request.resource.data.code).data.elderId == e`, it hasn't expired, and `status == 'pending'`;
    - read by `uid` or `e`;
    - update and delete by `e`;
    - delete by `uid`.

- [ ] **Step 1: Write the failing tests.**

  ```ts
  test('an elder writes only her own data')
  test('codes: 15-minute life, no listing, no overwrite')
  test('a follow request needs a live code for that elder')   // expired → fails; other elder's code → fails
  test('a requester reads only their own request')
  test('a follower reads the elder doc, months and photos, and writes none of them')
  test('a follower can remove only himself')                  // removing another uid fails
  test('a removed follower is refused at once')
  test('a follower deletes the copy only after 30 days of silence')  // 29 d fails, 31 d passes
  ```

- [ ] **Step 2: Run them and see them fail.** Run: `npm run test:rules`.
- [ ] **Step 3: Write the rules.**
- [ ] **Step 4: Run them and see them pass.**
- [ ] **Step 5: Commit** with `feat: add Firestore rules for family sharing`.

---

### Task 6: Uploading from the elder's phone

**Files:**
- Create: `family/FamilyCloud.kt` (default app and elder calls), `family/ElderSync.kt`, `family/Thumbnails.kt`, `family/FamilyWork.kt` (`UploadWorker`), `family/FamilyReceivers.kt` (`FamilyChangeReceiver`), `family/FamilyHooks.kt`, debug `DebugFamilyReceiver.kt`
- Modify: `alarm/AlarmEngine.kt`, `AndroidManifest.xml`, `src/debug/AndroidManifest.xml`
- Test: `FamilyRulesTest.kt` (`thumbSize`)

**Interfaces:**
- Consumes: Tasks 2–3.
- Produces:
  - `FamilyCloud`:
    - `FamilyCloud.get(context)`.
    - `isSetUp(): Boolean`.
    - `elderUid(): String`, which signs the default app in anonymously if needed.
    - `writeElder(uid, zone, oldest, pills)`, with merge on those fields plus `heardAt = serverTimestamp()`.
    - `ensureElderDoc(uid)`, which creates `{followers: [], people: {}}` when missing.
    - `readElder(uid): ElderDoc?`.
    - `writeMonth(uid, key, records)`, `deleteMonth(uid, key)`.
    - `writePhoto(uid, pillId, name, jpeg: ByteArray)`, `deletePhoto(uid, pillId)`.
    - `deleteElderCopy(uid)`, which removes the months, photos, requests, the elder's live codes, then the doc.
    - Every call is blocking (`Tasks.await` with a 20 s timeout). Network failures become `FamilyException("OFFLINE")`, a refused write `FamilyException("PERMISSION")`, and missing config `FamilyException("NOT_SET_UP")`.
  - `ElderSync.run(context)`:
    1. Nothing unless `sharing`.
    2. Read the pills and records under the store lock.
    3. `readElder`. If `followers` is empty, call `deleteElderCopy`, then save `sharing = false` and `uploaded = Uploaded()`, cancel the heartbeat, and stop.
    4. `writeElder` (always: it's the heartbeat).
    5. Write and delete months by `monthsToWrite` with `monthHash`.
    6. Write photos whose name changed, and delete those for pills gone.
    7. Save `uploaded`.
  - `FamilyWork.requestUpload(context)`: unique `"family-upload"`, `APPEND_OR_REPLACE`, needs network, exponential backoff.
  - `FamilyWork.ensureHeartbeat(context)`: unique periodic `"family-heartbeat"`, 6 h, `KEEP`. `cancelHeartbeat(context)`.
  - `FamilyHooks.changed(context)`, as in Global Constraints. It broadcasts to `FamilyChangeReceiver`, which calls `requestUpload`.
  - `FamilyRules.thumbSize(width: Int, height: Int, max: Int = 256): Pair<Int, Int>`.

- [ ] **Step 1: Write the failing tests.**

  ```kotlin
  @Test fun thumbSize_scalesLongestSide()           // 1024×768 → 256×192; 300×1000 → 77×256
  @Test fun thumbSize_keepsSmall()                  // 200×100 → 200×100
  @Test fun uploads_onlyWhenSharing()               // FamilyLocal() → false; sharing = true → true
  ```

- [ ] **Step 2: Run them and see them fail. Then implement this task's interfaces.**
  - In `AlarmEngine`, call `FamilyHooks.changed(context)` at the very end of each of these, outside the lock:
    - `savePill`
    - `deletePill`
    - `markTaken`
    - `onRingEnded`
    - `reconcile`
    - `onFired`'s MISSED branch
  - Register `FamilyChangeReceiver` with no `android:process` and `exported="false"`.
  - Add the debug receiver: `DEBUG_FAMILY_UPLOAD` runs `ElderSync.run` on a thread and logs the result; `DEBUG_FAMILY_LIST` logs `family.json` with pills reduced to names.
- [ ] **Step 3: Run all checks.** Run: `./gradlew :app:testDebugUnitTest :app:assembleDebug && npm test`. Expected: pass.
- [ ] **Step 4: Check the alarm is untouched (emulator, no Firebase config).**
  1. Add a pill 2 minutes away and let it ring.
  2. Take it on the ring screen.
  3. `adb logcat` shows no Firebase or WorkManager line from the `:ringing` pid, and the alarm checklist's Taken row behaves as before.
- [ ] **Step 5: Commit** with `feat: upload the elder's pills and records when someone can see them`.

---

### Task 7: The family module, elder half

**Files:**
- Create: `specs/NativeFamily.ts`, `src/native/family.ts`, `bridge/NativeFamilyModule.kt`, `family/CodeImage.kt`
- Modify: `bridge/PillSaathiPackage.kt`, `family/FamilyCloud.kt`, `jest.setup.js`, `__tests__/helpers/nativeMocks.ts`
- Test: `__tests__/native/family.test.ts`

**Interfaces:**
- Consumes: Task 6's `FamilyCloud`, `ElderSync`, `FamilyWork`.
- Produces, in the spec, the wrapper and the module:

  ```ts
  export type LinkCode = { code: string; expiresAt: number; qrUri: string };  // qrUri: file:// PNG
  export type Person = { uid: string; name: string; email: string };
  createLinkCode(): Promise<LinkCode>;          // NOT_SET_UP, OFFLINE
  watchRequests(on: boolean): Promise<void>;    // one snapshot listener on pending requests while on
  pendingRequests(): Promise<Person[]>;         // from memory, no reads
  answerRequest(uid: string, allow: boolean): Promise<void>;
  listFollowers(): Promise<Person[]>;           // [] when never shared
  removeFollower(uid: string): Promise<void>;
  ```

  - **`answerRequest(uid, true)`** runs one batch:
    - `followers` arrayUnion `uid`;
    - `people.uid = {name, email}`;
    - request `status = 'allowed'`;
    - delete the code.
    Then it saves `sharing = true`, and calls `requestUpload` and `ensureHeartbeat`.
  - **`answerRequest(uid, false)`** sets `status = 'denied'`.
  - **`removeFollower(uid)`** removes him. When no follower is left, it runs `deleteElderCopy` and turns sharing off.
  - **`createLinkCode`** retries up to 5 new codes when one is taken.
  - The module runs every call on its own worker thread, as `NativeAlarmsModule.onWorker` does, and rejects with the Global Constraints codes.
  - If codegen can't resolve types imported from another spec file, declare them in `NativeFamily.ts`.
  - `src/native/family.ts` exports the functions, the types and `FamilyErrors`. It throws "PillSaathi family is Android-only for now" when the module is missing.
  - `jest.setup.js` mocks `src/native/family` globally with resolved empty defaults (`[]`, `null`), so existing screen tests keep passing. `mockFamilyDefaults()` restores them.

- [ ] **Step 1: Write the failing tests.** Follow `__tests__/native/alarms.test.ts`: it rejects when the module is missing, and passes calls and results through.
- [ ] **Step 2: Run them and see them fail.** Run: `npx jest __tests__/native/family.test.ts`.
- [ ] **Step 3: Implement the spec, wrapper, module, QR image and mocks.**
- [ ] **Step 4: Run all checks.** Run: `npm test && npx tsc --noEmit && npm run lint && (cd android && ./gradlew :app:testDebugUnitTest :app:assembleDebug)`. Expected: pass.
- [ ] **Step 5: Commit** with `feat: add the family module with the elder's side of linking`.

---

### Task 8: Elder screens: Family and the code

**Files:**
- Create: `src/screens/FamilyScreen.tsx` (the elder half now), `src/screens/ShareCodeScreen.tsx`, `src/lib/family.ts` (`formatCode`, `shareMessage`)
- Modify: `src/screens/SettingsScreen.tsx` (a "Family" row), `src/navigation/RootNavigator.tsx` (`Family`, `ShareCode`), `src/i18n/*.ts`
- Test: `__tests__/lib/family.test.ts`, `__tests__/screens/FamilyScreen.test.tsx`, `__tests__/screens/ShareCodeScreen.test.tsx`

**Interfaces:**
- Consumes: Task 7's wrapper.
- Produces:
  - `formatCode('482913') === '482 913'`.
  - `shareMessage(code, t)` gives the exact share text.
  - Routes `Family: undefined` and `ShareCode: undefined`.

- [ ] **Step 1: Write the failing tests.**

  ```ts
  test('formatCode and shareMessage')                       // exact English text
  test('Family lists who can see my pills, and Remove asks first')   // removeFollower('R') only after "Remove"
  test('Family shows "No one yet." with no followers')
  test('the code screen shows the code, the QR and Send code')       // Share.share called with shareMessage
  test('a request asks Allow / No, and Allow answers it')            // pendingRequests → [{uid:'R', name:'Ravi', email}], alert title "Let Ravi see your pills?"
  test('after 15 minutes it says the code has expired and offers New code')   // fake timers
  test('NOT_SET_UP and OFFLINE show their messages')
  test('the Settings row opens Family, in Malayalam too')           // "കുടുംബം"
  ```

  - `watchRequests(true)` runs on focus and `false` on blur.
  - `pendingRequests` is polled every 2 s.
  - A request already answered is never asked about twice.
- [ ] **Step 2: Run them and see them fail. Then implement the screens.**
  - The QR is an `Image` of `qrUri`, at least 220 dp square.
  - The digits are 36 sp or more.
- [ ] **Step 3: Run all JS checks.**
- [ ] **Step 4: Commit** with `feat: add the Family page and the family code screen`.
- [ ] **Step 5 (needs Task 0): Check on the emulator** with `google-services.json` in place and the rules deployed.
  1. Settings → Family → Show a code.
  2. The console shows `codes/<code>` and `elders/<uid>` with `followers: []`.
  3. Send code opens the share sheet with the exact text.

  Record the results for Task 14.

---

### Task 9: The family module, relative half

**Files:**
- Create: `family/GoogleSignIn.kt`
- Modify: `family/FamilyCloud.kt` (the `family` app), `bridge/NativeFamilyModule.kt`, `specs/NativeFamily.ts`, `src/native/family.ts`, `__tests__/native/family.test.ts`

**Interfaces:**
- Consumes: Tasks 2, 3, 7.
- Produces:

  ```ts
  export type Relative = { name: string; email: string };
  export type FollowState = 'pending' | 'allowed' | 'denied' | 'expired';
  export type Follow = { elderId: string; name: string; phone: string | null; delayMinutes: number | null };
  signedInRelative(): Promise<Relative | null>;
  signInWithGoogle(): Promise<Relative | null>;   // null = cancelled; NO_ACTIVITY, NOT_SET_UP, OFFLINE
  scanCode(): Promise<string | null>;             // parseCode of the scan; null = cancelled or not a code
  requestFollow(code: string): Promise<string>;   // elderId; BAD_CODE, NOT_SIGNED_IN, OFFLINE
  followState(elderId: string): Promise<FollowState>;
  saveFollow(follow: Follow): Promise<void>;      // adds or edits locally; a new one starts checkedThrough at now
  listFollows(): Promise<Follow[]>;
  unfollow(elderId: string, deleteCopy: boolean): Promise<void>;
  ```

  - **The `family` app** is `FirebaseApp.initializeApp(context, FirebaseApp.getInstance().options, "family")`, made once. Its Auth and Firestore serve every relative call. The default app is never signed in with Google.
  - **`signInWithGoogle`** uses Credential Manager's `GetSignInWithGoogleOption`. The server client id is the `default_web_client_id` string, looked up by name with `resources.getIdentifier`, so the app compiles without the config. The result goes through `GoogleAuthProvider.getCredential`.
  - **`requestFollow`:**
    1. Gets `codes/{code}`. It is `BAD_CODE` when missing or expired.
    2. Writes `requests/{uid}` (`pending`, with the Google name and email).
    3. Starts a listener on that doc.
  - **`followState`** reads the listener's last value from memory, and gives `expired` once the code's `expiresAt` passed while still pending.
  - **`unfollow`:**
    1. Removes himself from the elder doc. Refused or missing is ignored.
    2. With `deleteCopy`, deletes the copy. A rules refusal there is ignored too.
    3. Removes the follow and its `pinged`, `refillPinged` and `silentWarned` keys.

- [ ] **Step 1: Write the failing tests** for the wrapper (passing through, and rejecting when the module is missing).
- [ ] **Step 2: Run them and see them fail. Then implement.**
- [ ] **Step 3: Run all checks**, as in Task 7.
- [ ] **Step 4: Commit** with `feat: add Google sign-in, scanning and following to the family module`.

---

### Task 10: Relative screens: Add family and the follow form

**Files:**
- Create: `src/screens/AddFamilyScreen.tsx`, `src/components/FollowForm.tsx`
- Modify: `src/screens/FamilyScreen.tsx` (the "People I look after" half), `src/navigation/RootNavigator.tsx` (`AddFamily`), `src/i18n/*.ts`
- Test: `__tests__/screens/AddFamilyScreen.test.tsx`, `__tests__/screens/FamilyScreen.test.tsx`

**Interfaces:**
- Consumes: Task 9's wrapper.
- Produces:
  - `FollowForm` with props `{ initial: Follow; onSubmit: (f: Follow) => void; submitLabel: string }`.
    - The name is required (trimmed).
    - The phone is optional; empty means null.
    - The delay chips are 15, 30, 60 and Off; a new follow starts at 30.
  - Route `AddFamily: undefined`.

- [ ] **Step 1: Write the failing tests.**

  ```ts
  test('signed out: Sign in with Google comes first')
  test('typing 6 digits and Next asks to follow')                   // requestFollow('482913')
  test('Scan code fills the code and asks to follow')
  test('waits for Allow, then shows the form; Done saves the follow')  // followState pending→allowed; saveFollow({elderId:'E', name:'Amma', phone:null, delayMinutes:30})
  test('No and expiry show their messages')
  test('BAD_CODE and OFFLINE show their messages')
  test('Family lists the people I look after, with + Add family')
  ```

- [ ] **Step 2: Run them and see them fail. Then implement.**
- [ ] **Step 3: Run all JS checks.**
- [ ] **Step 4: Commit** with `feat: add Add family and the follow form`.
- [ ] **Step 5 (needs Task 0): Link two emulators end to end.**
  1. Emulator A shows a code. Emulator B, signed in with a test Google account, types it.
  2. A asks Allow. Allow → B shows the form → Done.
  3. Then check:
     - A's console doc has B's uid in `followers`.
     - `DEBUG_FAMILY_UPLOAD` on A writes `pills` and the months.
     - A second request answered No shows "They tapped No." on B.

  Record the results.

---

### Task 11: The relative's data

**Files:**
- Modify: `bridge/NativeFamilyModule.kt`, `family/FamilyCloud.kt`, `specs/NativeFamily.ts`, `src/native/family.ts`, `__tests__/native/family.test.ts`

**Interfaces:**
- Consumes: Task 4's `elderToday`, `card`, `afterRefresh` and `wallClock`; Task 9's `family` app.
- Produces:

  ```ts
  export type FamilyCard = {
    elderId: string; name: string; phone: string | null; delayMinutes: number | null;
    heardAt: number | null;            // shifted to her wall clock
    silent: boolean; abandoned: boolean; otherZone: boolean;
    tally: { taken: number; skipped: number; missed: number; notReported: number; later: number };
    refills: NativeRefill[];
  };
  export type NativeElderToday = NativeToday & { heardAt: number | null; otherZone: boolean };
  getFamily(): Promise<FamilyCard[]>;        // from family.json only
  refreshFamily(): Promise<FamilyCard[]>;    // reads each elder doc and her current month (and the previous one on the 1st), then getFamily
  getElderToday(elderId: string): Promise<NativeElderToday>;           // from the cache; NOT_FOUND
  getElderHistory(elderId: string, from: string, to: string): Promise<NativeHistory>;   // the months needed; Firestore's cache when offline
  listElderPills(elderId: string): Promise<NativePill[]>;
  ```

  - **`refreshFamily`:**
    - It stores each `afterRefresh` result. A refused or missing elder drops the follow and its keys.
    - It downloads photo docs whose `name` changed, to `cacheDir/family/<elderId>/<name>`.
    - Offline, it returns the cached cards without rejecting.
    - It calls `FamilyChecks.scheduleNext` once Task 13 exists. Until then, leave a no-op hook.
  - **Elder views:** `photoUri` points at the cached file, and every instant goes through `wallClock`.
  - **`firstDayOfWeek`** is the relative phone's.

- [ ] **Step 1: Write the failing wrapper tests.**
- [ ] **Step 2: Run them and see them fail. Then implement.**
- [ ] **Step 3: Run all checks.**
- [ ] **Step 4: Commit** with `feat: read the elders' days on the relative's phone`.

---

### Task 12: Relative screens: Family on Today, the elder's page, read-only History

**Files:**
- Create: `src/components/FamilySection.tsx`, `src/screens/ElderScreen.tsx`, `src/screens/FollowEditScreen.tsx`
- Modify:
  - `src/screens/TodayScreen.tsx`, `src/components/DoseCard.tsx`, `src/components/RefillBanner.tsx`
  - `src/screens/HistoryScreen.tsx`, `src/screens/HistoryDayScreen.tsx`
  - `src/navigation/RootNavigator.tsx` (`Elder: { elderId: string }`, `FollowEdit: { elderId: string }`, and `elderId?: string` on `History` and `HistoryDay`)
  - `src/lib/family.ts` (`tallyText`, `heardText`), `src/i18n/*.ts`
- Test: `__tests__/lib/family.test.ts`, `__tests__/screens/TodayScreen.test.tsx`, `ElderScreen.test.tsx`, `FollowEditScreen.test.tsx`, `HistoryScreen.test.tsx`, `HistoryDayScreen.test.tsx`

**Interfaces:**
- Consumes: Task 11's wrapper; `statusText` with `notReported`.
- Produces:
  - `tallyText(tally, t)`, for example "2 taken · 1 missed · 1 not reported · 1 later", or "Nothing due today".
  - `heardText(at, today, is24h, t)`: a time today, else "{Tue 27 Oct}, {8:05 AM}".
  - `DoseCard` gains `readOnly?: boolean`. It hides the sound row and Mark as taken, and pills don't open.
  - `RefillBanner`'s `onOpen` becomes optional. Without it the banner has no button.
- **What Today does:**
  - The Family section sits above the cards when `getFamily()` gives any. It loads from `getFamily`, then `refreshFamily`, on focus, on app foreground, and every 2 min while focused.
  - The empty state, with no pills and no family, adds "+ Add family".
  - A card shows the name, the tally, the silent line when `silent`, and one low line per refill. Tapping it opens `Elder`.
- **The `Elder` page:**
  - It shows her cards with `readOnly`, her `RefillBanner` with no button, "Last heard from at …", the zone note, and the History and Call buttons. Call uses `Linking.openURL('tel:…')` and only shows with a number.
  - Its header ⚙ opens `FollowEdit`.
- **`FollowEdit`** is `FollowForm` with "Save", plus "Stop following". That asks first, and adds the delete-copy prompt when `abandoned`.
- **History and the day page** with `elderId` read from the elder calls. They hide Mark as taken, and the title becomes "{Amma} · History".
- **The health banner and the setup screen stay as they are.** `healthIssues` doesn't depend on pills, so a relative's phone with no pills of its own already gets them. The relative's checks need that battery setup.

- [ ] **Step 1: Write the failing tests.**

  ```ts
  test('tallyText and heardText')                         // exact English, zero parts skipped, "Nothing due today"
  test('Today shows Family above my pills, with tally and low line')
  test('Today with no pills and no family offers + Add family too')
  test('a silent elder shows "Not heard from since …"')
  test('with family and no pills of its own, Today still shows the health banner')
  test('Today refreshes family every 2 minutes while focused')   // fake timers: refreshFamily called again at 120 s
  test('the elder page is read-only')                     // no Mark as taken, no sound row; "Not reported yet" status
  test('Call shows only with a number and dials it')
  test('Stop following asks first; abandoned also asks to delete the copy')   // unfollow('E', true)
  test('History for an elder reads her history and hides Mark as taken')
  ```

- [ ] **Step 2: Run them and see them fail. Then implement.**
- [ ] **Step 3: Run all JS checks**, including every existing screen test.
- [ ] **Step 4: Commit** with `feat: show family on Today, the elder's page and her read-only History`.

---

### Task 13: Checks and pings

**Files:**
- Create: `family/FamilyChecks.kt`, `family/FamilyNotifications.kt`
- Modify:
  - `family/FamilyWork.kt` (`CheckWorker`), `family/FamilyReceivers.kt` (`CheckAlarmReceiver`, `FamilySystemReceiver`)
  - `bridge/NativeFamilyModule.kt` (`saveFollow`, `unfollow` and `refreshFamily` reschedule)
  - `AndroidManifest.xml`, `values*/strings.xml`, `MainApplication.kt` (family channels in the main process)
  - the debug receiver (`DEBUG_FAMILY_CHECK`)
- Test: `FamilyRulesTest.kt`

**Interfaces:**
- Consumes: Tasks 3, 4, 11.
- Produces:
  - **`FamilyChecks.scheduleNext(context)`:**
    - `nextCheckAt(follows, now)`, then one `setExactAndAllowWhileIdle(RTC_WAKEUP)` to `CheckAlarmReceiver`.
    - It cancels the alarm when there is none.
    - It never uses `setAlarmClock`.
  - **`CheckAlarmReceiver`** enqueues unique `"family-check"` with `KEEP`, expedited, needing network.
  - **`CheckWorker` runs `FamilyChecks.run(context, now)`:**
    1. Load local. Its items are `checksBetween(follow, checkedThrough ?: now, now)` for every follow.
    2. For each follow with items: read the elder doc and the months of the items' dates.
    3. `decide` each item, in time order.
    4. For a ping: **save the key (and `silentWarned`) in `family.json` first, then post.**
    5. Then `refillPings` on her pills, saved before posting.
    6. Then `prunePinged`, set `checkedThrough = now`, and `scheduleNext`.

    A network failure returns `Result.retry()` without moving `checkedThrough`. `decide` turns items older than the retry window into `Expired`. A refused read drops the follow, as `refreshFamily` does.
  - **`FamilySystemReceiver`** (BOOT_COMPLETED, TIME_SET, TIMEZONE_CHANGED, MY_PACKAGE_REPLACED; main process) calls `scheduleNext`. When sharing, it also calls `requestUpload` and `ensureHeartbeat`.
  - **`FamilyNotifications.ensureChannels(context)`** and the posts:
    - `postMissed(context, follow, item, names)`, `postNotReported(context, follow, item, names, heardAt)`, `postSilent(context, follow, heardAt)`, `postRefill(context, follow, warning)`.
    - The texts and actions are exactly as in Global Constraints, in the app's language, with times in the **elder's** zone.
    - The id is `pingKey.hashCode()` (silent: `"silent|$elderId"`; refill: `"frefill|$elderId|$pillId"`).
    - Call is `ACTION_DIAL`.
- **No pings for a follow saved a moment ago.** `saveFollow` for a new follow sets `checkedThrough` to now when it is null. The first run then never pings for doses before the link.

- [ ] **Step 1: Write the failing tests.**

  ```kotlin
  @Test fun checksBetween_fromCheckedThrough()     // checkedThrough ist(28,14,20), now ist(28,15,0), checks 14:30 and 16:30 → only 14:30
  @Test fun checksBetween_newFollowNoBackfill()     // checkedThrough = now → empty for earlier doses
  ```

- [ ] **Step 2: Run them and see them fail. Then implement.**
- [ ] **Step 3: Run all checks.** Run: `npm test && npx tsc --noEmit && npm run lint && (cd android && ./gradlew :app:testDebugUnitTest :app:assembleDebug)`.
- [ ] **Step 4: Check on two emulators** (needs Task 0), linked as in Task 10, with B's delay at 15 min.
  1. A: a pill 2 minutes away. Let it auto-silence (with `DEBUG_AUTO_SILENCE_MS` 30000).
     B at +15 min: "Amma hasn't taken …", with Call when a number is set, and Open.
  2. A: the next dose Taken with the app swiped away.
     B shows Taken on Today within the refresh, and no ping.
  3. A in airplane mode through a dose.
     B pings "hasn't reported … Last heard from at …". After A comes back, its records arrive.
  4. A's pill count at 4 at 1/day.
     B gets one refill ping, and a second check posts none.
  5. A removes B.
     B's next refresh drops Amma's card. `adb shell dumpsys alarm` shows no family check left.
  6. B: `adb shell am force-stop com.pillsaathi`, then the next check still fires and pings.

  Record each.
- [ ] **Step 5: Commit** with `feat: check each dose from the relative's phone and send missed and running-low pings`.

---

### Task 14: Docs, the full check, the device matrix and the PR

**Files:**
- Modify: `README.md`, `JOURNAL.md`, the new PR's description

- [ ] **Step 1: Run every check.** Run `npm test`, `npm run test:rules`, `npx tsc --noEmit`, `npm run lint` and `cd android && ./gradlew :app:testDebugUnitTest :app:assembleDebug :app:assembleRelease`. Expected: all pass. Report the counts, and the APK size change per ABI from Task 1.
- [ ] **Step 2: Re-run the spec's emulator checks** that a later task touched (Tasks 8, 10, 13). Also check the alarm checklist with A linked and offline, and with Firestore unreachable (wrong project id in a scratch build): every ring on time.
- [ ] **Step 3: Run the device-only checks on the Redmi Note 10** if `adb devices` lists it, as the elder's phone, with an emulator as the relative:
  - Upload after a ring with the app swiped away (MIUI).
  - The missed ping at +30.
  - The relative's checks with the app swiped away.

  Mark any not run as pending.
- [ ] **Step 4: Update the README.**
  - What the app does now.
  - **Firebase setup**: Task 0's steps, and that the file is not in git.
  - The `DEBUG_FAMILY_*` actions (main process: `-n com.pillsaathi/.family.debug.DebugFamilyReceiver`).
  - A "Family online" section in the device matrix with the results.
- [ ] **Step 5: Commit and open the PR.**
  1. Commit with `docs: update README and device matrix for Family online`.
  2. Push.
  3. `gh pr create` against `main`. List what it adds, the free-plan setup, the checks with their results, and the pending device checks.
- [ ] **Step 6: Add the session's journal entry** in the existing format. Commit it with `docs: add session journal for Family online` and push.
