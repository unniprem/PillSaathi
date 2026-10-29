# Remote Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A relative, from his own phone, adds, edits and deletes the elder's pills and sets the alarm sound for each of her dose times; her phone applies the changes by itself and tells her.

**Architecture:**
- His phone writes change requests (and file parts for photos and sounds) under her Firestore doc.
- Her phone, the only writer of her pills, checks in to claim, apply and mark each one. It checks in on app open, while the app is in front, before each upload, and hourly. It applies them through the same `AlarmEngine` calls her own screens use.
- Her upload adds her cards' sounds, her sound names and her alarm health, so his screens can show them.

**Tech Stack:**
- React Native 0.88 TurboModules, with Kotlin native code, Firebase Firestore and Auth (Spark), and WorkManager.
- Tests: Jest + Testing Library, JVM unit tests, and Firestore rules tests on the emulator.

**Spec:** `docs/superpowers/specs/2026-10-29-remote-setup-design.md` (builds on `docs/superpowers/specs/2026-10-27-family-online-design.md`).

## Global Constraints

- Spark plan only: Firestore and Auth. No Cloud Functions, Storage or FCM sends.
- `:ringing` never touches Firebase. Changes are applied in the main process only, through `AlarmEngine.savePill`, `deletePill` and `setSoundAt`, under `ElderSync.lock`.
- A sound is set only after its whole file is on her phone and `audioDurationMs(file)` returns a positive value.
- A phone that doesn't share (`FamilyLocal.sharing` false), or has no editors, never starts Firebase for check-ins.
- Ids: a new pill's id is the change id, and a new sound's id is the change id.
- Limits:
  - parts of at most `700 * 1024` bytes;
  - a sent sound at most `5 * 1024 * 1024` bytes (8 parts);
  - photos resized to at most 1024 px JPEG, quality 80;
  - done changes and orphan parts deleted after 7 days.
- Change states: `pending` → `applying` → `applied` | `rejected`. Only her phone sets `applying`, `applied` or `rejected`. Its maker may delete a change only while it is `pending`.
- Reject reasons (stored and shown): `notAllowed`, `invalid`, `pillGone`, `timeGone`, `soundGone`, `fileBroken`.
- Every new text goes through i18n: `src/i18n/{en,ml,hi}.ts`, and `res/values{,-ml,-hi}/strings.xml` for native notifications.
- Copy fixed by the spec, in English:
  - Allow title: "Let {name} see and change your pills?"
  - Allow body: "{email} will see your pills and whether you took them, and can add or change pills and alarm sounds. You'll get a notice each time."
  - Switch label: "Can change my pills".
  - Delay note: "{name}'s phone checks in about once an hour, and when an alarm rings. To send it now, ask her to open PillSaathi."
  - Not an editor: "{name}'s phone hasn't allowed you to change her pills. On her phone: Settings → Family → turn on Can change my pills next to your name."
  - Too big: "This sound is too big to send (over 5 MB)."
  - Health warning: "{name}'s phone may not ring alarms: {problem}. On her phone, open PillSaathi and tap the yellow banner."
  - Her notices: "{who} added {pill} ({times})." / "{who} changed {pill}." / "{who} deleted {pill}." / "{who} set the {time} alarm sound to {sound}."
  - The default name for a sent sound: "{who}'s sound".
- Tests: `npx jest`, `npx tsc --noEmit`, `npm run lint`, `(cd android && ./gradlew :app:testDebugUnitTest :app:assembleDebug)`, and `JAVA_HOME=$(/usr/libexec/java_home -v 21+) npm run test:rules`.

## Review Focus

1. **A change claimed, then her app killed before it's marked.** The next check-in must apply it again with no duplicate pill or sound (Task 3, idempotent decide; Task 6, re-applies `applying`).
2. **Cancel during an apply.** Cancelling a claimed change must fail with a clear message, never leave half a change (Task 2 rules test; Task 9 Jest).
3. **"Start tomorrow" applied after midnight.** The pill starts on the date he meant, or the day it arrives if that has passed. Never a day late (Task 3).
4. **A sound whose parts are missing or aren't audio.** Rejected `fileBroken`, the card keeps its old sound, and no file is left behind (Task 3 join; Task 6).
5. **A relative switched off while his change waits.** Rejected `notAllowed`, not applied (Task 3).

---

### Task 1: Engine: chosen ids, start dates, sound by time

**Files:**
- Modify: `android/app/src/main/java/com/pillsaathi/alarm/PillModels.kt` (PillDraft)
- Modify: `android/app/src/main/java/com/pillsaathi/alarm/AlarmEngine.kt` (`savePill`, `setCardSound`, new `setSoundAt`)
- Modify: `android/app/src/main/java/com/pillsaathi/sound/SoundLibrary.kt` (`add`, new `addBytes`)
- Test: `android/app/src/test/java/com/pillsaathi/alarm/DoseRulesTest.kt` (only if a pure helper is added)

**Interfaces:**
- Produces:
  - `PillDraft(..., newId: String? = null, startDate: LocalDate? = null)`. For a new pill (`id == null`), `savePill` uses `newId ?: UUID` and `startDate ?: today (+1 when startsTomorrow)`. Both are ignored for edits.
  - `AlarmEngine.setSoundAt(hour: Int, minute: Int, soundId: String?): Boolean`. It returns false when no enabled card is at that time, and calls `FamilyHooks.changed` on success.
  - `setCardSound` now also calls `FamilyHooks.changed`.
  - `SoundLibrary.add(file, name, kind, durationMs, id: String = UUID.randomUUID().toString())`.
  - `SoundLibrary.addBytes(id: String, name: String, ext: String, bytes: ByteArray): Sound?`:
    - returns the existing sound when `id` is already saved;
    - otherwise writes the bytes durably to `newFile(ext)`, reads `audioDurationMs`, and returns null (deleting the file) when that isn't a positive value;
    - else adds the sound as `IMPORTED`.

- [ ] **Step 1:** Add the two `PillDraft` fields and use them in `savePill`. Callers that pass neither behave as before.
- [ ] **Step 2:** Add `setSoundAt`, which finds the card in `store.loadAlarms()` with that hour and minute, and send `FamilyHooks.changed` from `setCardSound`.
- [ ] **Step 3:** Add the `id` parameter and `addBytes` to `SoundLibrary`. The `ext` must pass the same `[a-z0-9]{1,10}` check `SoundImporter` uses, else it falls back to `audio`.
- [ ] **Step 4:** Run `(cd android && ./gradlew :app:testDebugUnitTest :app:assembleDebug -q)`. Expected: success, and existing tests unchanged.
- [ ] **Step 5:** Commit `feat: let the engine save pills and sounds under chosen ids, and set a sound by time`.

### Task 2: Rules: editors, changes and parts

**Files:**
- Modify: `firestore.rules`
- Test: `firebase/rules.test.ts`

**Interfaces:**
- Produces these paths and fields, used by Tasks 6 and 7:
  - `elders/{e}`: `editors: string[]`.
  - `elders/{e}/changes/{c}`: the keys are `by`, `byName`, `at` (== request.time), `status`, `kind` (`pill` | `deletePill` | `sound`), `pill`, `photo`, `pillId`, `hour`, `minute`, `sound` and `parts` (int, 0 to 8). Her phone adds `reason` and `doneAt`.
  - `elders/{e}/parts/{c}_{n}`: `change`, `index`, `by`, `at`, `data` (bytes, at most 716800).

- [ ] **Step 1: Write the failing tests** in `firebase/rules.test.ts`, seeding `editors: ['R']` on `elders/E` (R and S follow; S is not an editor):

```ts
test('an editor sends a change and its parts; a follower who is not an editor cannot', ...)
  // R: setDoc parts/c1_0 {change:'c1',index:0,by:'R',at:serverTimestamp(),data:Bytes(100)} succeeds;
  //    setDoc changes/c1 {by:'R',byName:'Ravi',at:serverTimestamp(),status:'pending',kind:'deletePill',pillId:'p1',parts:0} succeeds
  // S: the same as S fails; R writing by:'S' fails; R writing status:'applied' fails; parts: 9 fails
  // a stranger fails; a part of 716801 bytes fails
test('only her phone sets a change state; its maker cancels only while pending', ...)
  // R updateDoc changes/c1 {status:'applied'} fails; E updates to 'applying' succeeds;
  // R deleteDoc after 'applying' fails; a fresh pending one R deletes succeeds; S deletes R's fails
test('followers read changes; only her phone writes editors', ...)
  // S getDocs(changes) succeeds; stranger fails; R updateDoc elders/E {editors:['R','S']} fails;
  // R reads parts of his own change succeeds, S reads them fails
test('a follower who leaves takes himself off editors too', ...)
  // R update {followers: arrayRemove('R'), 'people.R': deleteField(), editors: arrayRemove('R')} succeeds;
  // S update removing R from editors fails
```

- [ ] **Step 2:** Run `JAVA_HOME=$(/usr/libexec/java_home -v 21+) npm run test:rules`. Expected: the 4 new tests FAIL.
- [ ] **Step 3: Write the rules.**
  - Add `function editor(e)`, which checks `request.auth.uid in elderDoc(e).get('editors', [])`.
  - Add `match /changes/{c}` and `match /parts/{p}` under `elders/{e}`, following the interfaces above.
  - Extend `removesOnlyHimself()`: `editors` joins the allowed keys, and `after.get('editors', []) == before.get('editors', []).removeAll([uid])`.
- [ ] **Step 4:** Run the rules tests. Expected: all pass, including the old ones.
- [ ] **Step 5:** Commit `feat: rules for editors, change requests and file parts`.

### Task 3: Pure rules: changes, parts and the apply decision

**Files:**
- Create: `android/app/src/main/java/com/pillsaathi/family/RemoteChanges.kt` (models and `RemoteRules`)
- Create: `android/app/src/main/java/com/pillsaathi/family/FileParts.kt`
- Test: `android/app/src/test/java/com/pillsaathi/family/RemoteRulesTest.kt`, `FilePartsTest.kt`

**Interfaces:**
- Produces:

```kotlin
enum class PhotoChoice(val json: String) { KEEP("keep"), NONE("none"), NEW("new") }
sealed interface SoundChoice {
  data object Default : SoundChoice
  data class Hers(val id: String) : SoundChoice
  data class New(val name: String, val durationMs: Long, val ext: String) : SoundChoice
}
sealed interface ChangeBody {
  data class SavePill(val draft: PillDraft, val startDate: LocalDate?, val photo: PhotoChoice) : ChangeBody
  data class DeletePill(val pillId: String) : ChangeBody
  data class SetSound(val hour: Int, val minute: Int, val choice: SoundChoice) : ChangeBody
  data class Invalid(val why: String) : ChangeBody
}
data class RemoteChange(
  val id: String, val by: String, val byName: String, val at: Long?, val status: String,
  val reason: String?, val doneAt: Long?, val parts: Int, val body: ChangeBody,
)
sealed interface ApplyDecision {
  data class SavePill(val draft: PillDraft, val isNew: Boolean) : ApplyDecision   // draft.id set for edits; newId+startDate for adds
  data class DeletePill(val pillId: String, val name: String?) : ApplyDecision    // name null = already gone
  data class SetSound(val hour: Int, val minute: Int, val soundId: String?, val newSound: SoundChoice.New?) : ApplyDecision
  data class Reject(val reason: String) : ApplyDecision
}
object RemoteRules {
  const val NOT_ALLOWED = "notAllowed"; const val INVALID = "invalid"; const val PILL_GONE = "pillGone"
  const val TIME_GONE = "timeGone"; const val SOUND_GONE = "soundGone"; const val FILE_BROKEN = "fileBroken"
  const val PENDING = "pending"; const val APPLYING = "applying"; const val APPLIED = "applied"; const val REJECTED = "rejected"
  const val KEEP_DAYS = 7L
  fun changeFromMap(id: String, m: Map<String, Any?>, at: Long?, doneAt: Long?): RemoteChange
  fun changeToMap(by: String, byName: String, body: ChangeBody, parts: Int): Map<String, Any?>   // without "at" (caller adds serverTimestamp)
  fun startDate(requested: LocalDate?, today: LocalDate): LocalDate                              // max(requested ?: today, today)
  fun decide(change: RemoteChange, editors: Collection<String>, pills: List<Pill>, cardTimes: Set<DoseTime>,
             soundIds: Set<String>, today: LocalDate, newPhoto: String?): ApplyDecision
}
object FileParts {
  const val PART_BYTES = 700 * 1024; const val MAX_SEND_BYTES = 5 * 1024 * 1024; const val MAX_PARTS = 8
  fun split(bytes: ByteArray): List<ByteArray>                 // emptyList() for an empty file
  fun join(parts: Map<Int, ByteArray>, count: Int): ByteArray? // null when any index 0 until count is missing
  fun partId(changeId: String, index: Int): String             // "${changeId}_$index"
}
```

  - `changeFromMap` validates a `pill` map with `PillInputValidator.validate`; Firestore gives numbers as `Long` or `Double`. Any bad field gives `ChangeBody.Invalid`, never a throw.
  - The `pill` map holds the validator's keys plus `startDate` (`"YYYY-MM-DD"` or null).
- [ ] **Step 1: Write the failing tests.**

```kotlin
// RemoteRulesTest
@Test fun `a change round-trips through its map, numbers as Long`()
@Test fun `a bad pill map is Invalid, not a throw`()           // amount 0.3 on a tablet; times []; unknown kind
@Test fun `start date is the one he meant, or today once it has passed`()
  // startDate(2026-10-30, today 2026-10-29) == 2026-10-30; startDate(2026-10-30, today 2026-10-31) == 2026-10-31; startDate(null, t) == t
@Test fun `not an editor any more is rejected`()                // editors = [] -> Reject(NOT_ALLOWED)
@Test fun `a new pill uses the change id, and the same change again edits it`()
  // decide(add c1) -> SavePill(isNew=true, draft.newId="c1", draft.id=null)
  // with pills containing id "c1" -> SavePill(isNew=false, draft.id="c1")
@Test fun `an edit of a pill that is gone is rejected; a delete of one is done`()
  // edit p9 -> Reject(PILL_GONE); DeletePill(p9) -> DeletePill("p9", name=null)
@Test fun `photo keep, none and new`()  // KEEP -> existing pill's photo; NONE -> null; NEW -> newPhoto; NEW with newPhoto null -> Reject(FILE_BROKEN)
@Test fun `a sound for a time she no longer has, or a sound of hers that is gone`()
  // cardTimes without 8:00 -> Reject(TIME_GONE); Hers("s9") not in soundIds -> Reject(SOUND_GONE)
@Test fun `default and new sounds`()   // Default -> SetSound(8,0,null,null); New -> SetSound(8,0,"c1",New(...))
@Test fun `Invalid is rejected invalid`()
// FilePartsTest
@Test fun `split and join round-trip at the part size`()  // 1_500_000 bytes -> 3 parts, sizes 716800,716800,66400; join == input
@Test fun `join is null with a part missing`()
@Test fun `split of an empty file is no parts`()
```

- [ ] **Step 2:** Run `(cd android && ./gradlew :app:testDebugUnitTest --tests '*RemoteRulesTest' --tests '*FilePartsTest' -q)`. Expected: FAIL (unresolved).
- [ ] **Step 3:** Implement `RemoteChanges.kt` and `FileParts.kt` to the interfaces.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5:** Commit `feat: change requests, file parts and the apply decision as pure rules`.

### Task 4: Upload her cards, sounds, health and editors; read them on his phone

**Files:**
- Modify:
  - `family/FamilyModels.kt`: new `CardSound`, `SoundRef` and `ElderHealth`; new fields on `ElderDoc`, `Follow` and `FamilyLocal`.
  - `family/FamilyJson.kt`: maps and `family.json` for the new fields.
  - `family/FamilyRules.kt`: `afterRefresh` copies the new fields.
  - `family/FamilyCloud.kt`: `writeElder` takes the new fields.
  - `family/ElderSync.kt`: gathers them.
- Test: `FamilyJsonTest.kt`, `FamilyRulesTest.kt`

**Interfaces:**
- Produces:

```kotlin
data class CardSound(val hour: Int, val minute: Int, val soundId: String?, val soundName: String?) // null = default tone
data class SoundRef(val id: String, val name: String)
data class ElderHealth(val notifications: Boolean, val alarmChannel: Boolean, val exactAlarms: Boolean,
  val fullScreen: Boolean, val battery: Boolean, val unrestricted: Boolean, val setupSeen: Boolean)
// ElderDoc + editors: List<String>, cards: List<CardSound>, sounds: List<SoundRef>, health: ElderHealth?
// Follow + editor: Boolean = false, cards, sounds, health: ElderHealth? = null   (editor = his uid in her editors)
// FamilyLocal + editors: List<String> = emptyList()   (her own editors, as her phone last wrote or read them)
fun FamilyCloud.writeElder(uid, zone, oldest, pills, cards: List<CardSound>, sounds: List<SoundRef>, health: ElderHealth)
fun FamilyRules.afterRefresh(follow: Follow, elder: ElderDoc, records: List<DoseRecord>, me: String): Follow?
```

  - `ElderSync` builds:
    - `cards` from `store.loadAlarms()`, enabled ones only, with sound names from `store.loadSounds()`;
    - `sounds` from `store.loadSounds()`;
    - `health` from `HealthChecker(context).check()` plus `store.loadSetup().seen`, where `battery` = `ignoringBatteryOptimizations` and `unrestricted` = `!backgroundRestricted`.
  - It saves `elder.editors` into `FamilyLocal.editors` after `readElder`.
- [ ] **Step 1: Write the failing tests:**
  - `FamilyJsonTest`: `elderFromMap reads editors, cards, sounds and health; a doc without them reads as empty and null`, and `family.json keeps editors and each follow's editor, cards, sounds and health`.
  - `FamilyRulesTest`: `afterRefresh sets editor from her editors and my uid`.
- [ ] **Step 2:** Run the Kotlin tests. Expected: FAIL.
- [ ] **Step 3:** Implement. `FamilyRefresh.readOne` passes `cloud.relativeUid()` as `me`.
- [ ] **Step 4:** Run the Kotlin tests and the build. Expected: PASS.
- [ ] **Step 5:** Commit `feat: upload her alarm sounds, sound names and alarm health; read them on his phone`.

### Task 5: Her consent: Allow adds an editor; the "Can change my pills" switch

**Files:**
- Modify:
  - `family/FamilyCloud.kt`: in `answerRequest`, Allow also does `arrayUnion` on `editors`; new `setEditor(uid, follower, on)`; `removeFollower` also removes from `editors`; `leave` removes from `editors` too.
  - `bridge/NativeFamilyModule.kt`: `listFollowers` adds `canChange`; new `setCanChange`.
  - `specs/NativeFamily.ts`, `src/native/family.ts`: `Person` + `canChange: boolean`; `setCanChange(uid: string, on: boolean): Promise<void>`.
  - `src/screens/FamilyScreen.tsx`: a `Switch` per person.
  - `src/hooks/useFollowRequests.ts`: unchanged; the strings change.
  - `src/i18n/*.ts`: `allowTitle`, `allowBody`, `canChange`.
- Test: `__tests__/screens/FamilyScreen.test.tsx`, `__tests__/native/family.test.ts`

**Interfaces:**
- Produces:
  - `setCanChange(uid, on)`. It writes the editors list, saves `FamilyLocal.editors`, and then starts or stops the hourly check-in with `FamilyWork.ensureCheckIn` / `cancelCheckIn` (Task 6; until then, leave a call site Task 6 fills).
- [ ] **Step 1: Write the failing Jest tests:**
  - `each person has Can change my pills, and the switch calls setCanChange`: the switch's `value` follows `canChange`, and pressing it calls `setCanChange('R', false)`;
  - `a refused switch shows the family message and turns back`;
  - `the Allow prompt says see and change`: the `Alert.alert` title is "Let Ravi see and change your pills?" and the body is the spec's text.
- [ ] **Step 2:** Run `npx jest __tests__/screens/FamilyScreen.test.tsx`. Expected: FAIL.
- [ ] **Step 3:** Implement the native and JS sides. On Allow, `answerRequest` also adds the uid to `FamilyLocal.editors`.
- [ ] **Step 4:** Run the Jest tests, `tsc`, lint and the Gradle build. Expected: PASS.
- [ ] **Step 5:** Commit `feat: Allow lets a relative change her pills, with a switch per person`.

### Task 6: Her phone checks in and applies changes

**Files:**
- Create: `android/app/src/main/java/com/pillsaathi/family/CheckIn.kt`
- Modify:
  - `family/FamilyCloud.kt`: elder-side change calls.
  - `family/FamilyWork.kt`: hourly `CheckInWorker`.
  - `family/ElderSync.kt`: runs `CheckIn.apply` first.
  - `family/FamilyNotifications.kt` and `res/values{,-ml,-hi}/strings.xml`: the `family_changes` channel and texts.
  - `bridge/NativeFamilyModule.kt`: `checkIn()` and `watchChanges(on)`.
  - `specs/NativeFamily.ts`, `src/native/family.ts`.
  - `App.tsx` (or `src/hooks/useCheckIn.ts`, mounted once): check in and watch while the app is active.
- Test: `__tests__/hooks/useCheckIn.test.tsx` (or in `App.test.tsx`), `FamilyRulesTest.kt` for the notice lines

**Interfaces:**
- Consumes: `RemoteRules`, `FileParts` (Task 3); `setSoundAt`, `addBytes`, `PillDraft.newId`/`startDate` (Task 1); `FamilyLocal.editors` (Task 4).
- Produces:

```kotlin
// FamilyCloud (her phone)
fun waitingChanges(uid: String): List<RemoteChange>            // status in [pending, applying], ordered by at
fun claim(uid: String, changeId: String): Boolean              // transaction: pending|applying -> applying; false when gone
fun finish(uid: String, changeId: String, reason: String?)     // applied (reason null) or rejected, doneAt = serverTimestamp
fun readParts(uid: String, changeId: String, count: Int): Map<Int, ByteArray>
fun deleteParts(uid: String, changeId: String, count: Int)
fun cleanUp(uid: String, before: Long)                         // done changes with doneAt < before, parts with at < before
fun listenChanges(uid: String, executor: Executor, onError: () -> Unit, onWaiting: () -> Unit): ListenerRegistration
// CheckIn
object CheckIn { fun apply(context: Context): Int }             // applied count; call under ElderSync.lock; throws FamilyException
data class AppliedChange(val who: String, val kind: String, val pill: String?, val times: String?, val time: String?, val sound: String?)
fun FamilyNotifications.postChanges(context: Context, applied: List<AppliedChange>)   // one notification, one line each
// FamilyWork
fun ensureCheckIn(context: Context)   // periodic 1 h, CONNECTED, unique "family-check-in", KEEP
fun cancelCheckIn(context: Context)
fun requestCheckIn(context: Context)  // one-time, CONNECTED, unique "family-check-in-now", REPLACE
```

  - `apply` does nothing (and starts no Firebase) unless `sharing` and `editors` are not empty.
  - For each waiting change, in order:
    1. `claim`. If it returns false, skip.
    2. Read its parts.
    3. For a new photo, save it with `PillPhotos` (a JPEG in her photos directory) and get the file name.
    4. For a new sound, use `SoundLibrary.addBytes(change.id, name, ext, bytes)`. A null result rejects the change `fileBroken`.
    5. `decide`, then call the engine.
    6. `finish`, then `deleteParts`.
  - An engine failure finishes the change rejected `invalid` and logs it.
  - It notifies once for everything applied, calls `cleanUp(now - 7 days)`, and returns the count.
  - `ElderSync.upload` calls `CheckIn.apply` before reading pills, catching and logging its `FamilyException` so the upload still runs.
  - `checkIn()` runs `ElderSync.run`'s lock and `CheckIn.apply` on the module worker.
  - `watchChanges(on)` listens while on (the app is active). It restarts on errors like `listenForRequests` (PR #9), and on a waiting change it calls `requestCheckIn`.
  - In JS, `useCheckIn()`, from the `AppState` `active` event and on mount, calls `checkIn()` and `watchChanges(true)`; on background it calls `watchChanges(false)`. Errors are only logged.
- [ ] **Step 1: Write the failing tests:**
  - JVM test `noticeLines lists who did what, in the order applied`, on a pure `CheckIn.noticeLine(applied)` that returns the resource key and arguments (texts per the Global Constraints);
  - Jest `useCheckIn checks in on mount and when the app comes back, and watches only while active`, with `AppState` mocked.
- [ ] **Step 2:** Run both. Expected: FAIL.
- [ ] **Step 3:** Implement `CheckIn`, the cloud calls, the worker, the notifications, the module methods and the hook. `ensureCheckIn` is called by `setCanChange`/Allow when editors become non-empty, by `FamilySystemReceiver` on boot when editors are non-empty, and `cancelCheckIn` when the last editor goes.
- [ ] **Step 4:** Run everything: Jest, tsc, lint, Gradle tests and build, rules. Expected: PASS.
- [ ] **Step 5:** Commit `feat: her phone checks in, applies changes from family and tells her`.

### Task 7: His phone sends changes

**Files:**
- Modify:
  - `family/FamilyCloud.kt`: relative-side calls.
  - `bridge/NativeFamilyModule.kt`: `getElderSetup`, `sendPill`, `sendDeletePill`, `sendSound`, `listChanges`, `cancelChange`.
  - `specs/NativeFamily.ts`, `src/native/family.ts`.
  - `family/Thumbnails.kt`: `jpeg(file, maxPx = 1024, quality = 80)`, keeping the 256/70 default for uploads.
- Test: `__tests__/native/family.test.ts`

**Interfaces:**
- Consumes: `RemoteRules.changeToMap`, `FileParts` (Task 3); `Follow.editor/cards/sounds/health` (Task 4).
- Produces (JS types in `specs/NativeFamily.ts`):

```ts
export type ElderTime = { hour: number; minute: number; soundId: string | null; soundName: string | null };
export type ElderSetup = {
  editor: boolean; otherZone: boolean; heardAt: number | null;
  pills: ElderPill[]; times: ElderTime[]; sounds: { id: string; name: string }[];
  problem: string | null; // 'notifications' | 'alarmChannel' | 'exactAlarms' | 'fullScreen' | 'battery' | 'restricted' | 'setup'
};
export type RemotePillInput = PillInput & { photoChoice: string }; // 'keep' | 'none' | 'new'; photo = his photo name when 'new'
export type ChangeView = {
  id: string; kind: string; status: string; reason: string | null; mine: boolean; byName: string;
  at: number | null; doneAt: number | null;
  pillId: string | null; pillName: string | null; hour: number | null; minute: number | null; soundName: string | null;
};
getElderSetup(elderId: string): Promise<ElderSetup>;                  // NOT_FOUND; no reads
sendPill(elderId: string, input: RemotePillInput): Promise<string>;   // change id; NOT_ALLOWED, INVALID_PILL, OFFLINE
sendDeletePill(elderId: string, pillId: string): Promise<string>;
sendSound(elderId: string, hour: number, minute: number, kind: string, soundId: string | null): Promise<string>; // kind 'default'|'hers'|'mine'; TOO_BIG
listChanges(elderId: string): Promise<ChangeView[]>;                  // one server read; newest first; last 7 days
cancelChange(elderId: string, changeId: string): Promise<void>;       // ALREADY_TAKEN when claimed
```

  - `FamilyErrors` gains `NotAllowed: 'NOT_ALLOWED'`, `TooBig: 'TOO_BIG'` and `AlreadyTaken: 'ALREADY_TAKEN'`.
  - A rules refusal on send is `NOT_ALLOWED`. On cancel it is `ALREADY_TAKEN`.
  - `sendPill`:
    - validates with `PillInputValidator`;
    - for a new pill with `startsTomorrow`, sets `startDate` to her tomorrow in her zone (`FamilyRules.zoneOf(follow.zone)`);
    - for `photoChoice 'new'`, compresses his photo file with `Thumbnails.jpeg(file, 1024, 80)` into one part;
    - writes the parts first, then the change with `at = serverTimestamp()`.
  - `sendSound 'mine'` reads `SoundLibrary.fileOf(id)`. Over `MAX_SEND_BYTES` it is `TOO_BIG`. The name is the sound's own; the extension is the file's.
  - `problem` is the first false field of `health`, in the order of the type above, with `setup` when `setupSeen` is false. It is null when health is unknown or all true.
- [ ] **Step 1: Write the failing Jest test** in `__tests__/native/family.test.ts`: `names the error codes the module rejects with` includes the three new codes, and the wrappers pass their arguments through.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement the native and JS sides.
- [ ] **Step 4:** Run Jest, tsc, lint and the Gradle build. Expected: PASS.
- [ ] **Step 5:** Commit `feat: send pill and sound changes to her phone, list and cancel them`.

### Task 8: Words for changes and health

**Files:**
- Create: `src/lib/remote.ts`
- Modify: `src/i18n/{en,ml,hi}.ts` (a `remote` section)
- Test: `__tests__/lib/remote.test.ts`

**Interfaces:**
- Produces:

```ts
export function changeTitle(c: ChangeView, t: Strings, is24h: boolean): string;
  // pill: "Add Telma 40" / "Change Telma 40" (pillId null => add); deletePill: "Delete Telma 40"; sound: "8:00 AM sound: Ravi's sound" ("Default tone" when null)
export function changeState(c: ChangeView, t: Strings, is24h: boolean, elderName: string): string;
  // pending/applying: "Waiting for Amma's phone"; applied: "Done at 3:05 PM"; rejected: "Not done: <reason text>"
export function waitingByPill(changes: ChangeView[]): Map<string, ChangeView>;   // pending|applying pill and deletePill changes by pillId
export function problemText(problem: string | null, t: Strings, elderName: string): string | null; // the spec's health warning
```

  - The reason texts:
    - `notAllowed`: "you're not allowed to change her pills now";
    - `invalid`: "her phone couldn't use it";
    - `pillGone`: "the pill was deleted on her phone";
    - `timeGone`: "she has no dose at that time now";
    - `soundGone`: "that sound is gone from her phone";
    - `fileBroken`: "the photo or sound didn't arrive whole".
  - The problem texts:
    - `notifications`: "notifications are off";
    - `alarmChannel`: "the alarm notifications are off";
    - `exactAlarms`: "alarms aren't allowed";
    - `fullScreen`: "full-screen alarms aren't allowed";
    - `battery`: "battery setup not done";
    - `restricted`: "PillSaathi is restricted in the background";
    - `setup`: "battery setup not done".
- [ ] **Step 1:** Write the failing tests: one per function, with the exact strings above, including `waitingByPill` ignoring applied and rejected changes.
- [ ] **Step 2:** Run `npx jest __tests__/lib/remote.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement, with drafts in ml and hi.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit `feat: words for family changes and her alarm health`.

### Task 9: Her pills page on his phone

**Files:**
- Create: `src/screens/ElderPillsScreen.tsx`
- Modify:
  - `src/navigation/RootNavigator.tsx`: `ElderPills: { elderId: string }`.
  - `src/screens/ElderScreen.tsx`: a **Change pills** button, and the health warning from `problemText`.
- Test: `__tests__/screens/ElderPillsScreen.test.tsx`, `__tests__/screens/ElderScreen.test.tsx`

**Interfaces:**
- Consumes: `getElderSetup`, `listChanges`, `cancelChange` (Task 7); `changeTitle`, `changeState`, `waitingByPill`, `problemText` (Task 8).
- Produces: navigation to `PillEdit` with `{ elderId, pillId? }`, and to `SoundPicker` with `{ elderId, hour, minute, selectedSoundId }`.

  The layout, top to bottom:
  1. the health warning;
  2. the delay note;
  3. waiting changes, each with **Cancel**;
  4. her pills, each row with "Waiting for Amma's phone" from `waitingByPill`, and a waiting delete struck through;
  5. **+ Add pill**;
  6. "Alarm sounds": one row per time, "8:00 AM · Ravi's sound";
  7. "Recent": done and not-done changes.

  Not an editor: the not-an-editor text and nothing else. On focus it reloads (`getElderSetup`, then `listChanges`). Offline, it shows the setup with `familyMessage`.
- [ ] **Step 1: Write the failing Jest tests:**
  - `lists her pills and times, waiting first, and Cancel cancels`;
  - `a cancel that is too late says her phone already has it`: an `ALREADY_TAKEN` rejection shows "Amma's phone already has it.";
  - `not an editor sees how to be allowed, and no Add pill`;
  - `the health warning shows the first problem`;
  - `+ Add pill and a pill row open the pill page for her; a time opens the sound picker for her`;
  - on `ElderScreen`: `Change pills opens her pills page`.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement. Reuse the list and row styles from `FamilyScreen`/`ElderScreen`; no new design.
- [ ] **Step 4:** Run Jest, tsc and lint. Expected: PASS.
- [ ] **Step 5:** Commit `feat: her pills page on the relative's phone, with waiting and done changes`.

### Task 10: The pill page for her

**Files:**
- Modify: `src/screens/PillEditScreen.tsx`, `src/navigation/RootNavigator.tsx` (`PillEdit: { pillId?: string; focusCount?: boolean; elderId?: string }`)
- Test: `__tests__/screens/PillEditScreen.test.tsx`

**Interfaces:**
- Consumes: `getElderSetup` (pills, `otherZone`), `sendPill`, `sendDeletePill` (Task 7); `pickPhoto` as today (his phone).
- With `elderId`:
  - the title is "{name}'s pill" (`t.remote.pillTitle(name)`), and "Amma's time" shows under the times when `otherZone`;
  - the page loads from `getElderSetup(elderId).pills` instead of `listPills`;
  - Save calls `sendPill` with `photoChoice`:
    - `'keep'` when the photo is unchanged from hers;
    - `'none'` when removed;
    - `'new'` when picked here;
  - Delete confirms, then calls `sendDeletePill`;
  - both go back to `ElderPills`, skipping the setup and exact-alarm checks;
  - `NOT_ALLOWED` and the other errors alert `familyMessage`, or the not-an-editor text for `NOT_ALLOWED`.
- [ ] **Step 1: Write the failing tests:**
  - `for her: loads her pill, Save sends it with photoChoice keep, and returns`;
  - `for her: a new pill with Start tomorrow sends startsTomorrow true and photoChoice none`;
  - `for her: Delete confirms and sends a delete`;
  - `for her: NOT_ALLOWED says how to be allowed`;
  - `for her: never opens setup`.
- [ ] **Step 2:** Run `npx jest __tests__/screens/PillEditScreen.test.tsx`. Expected: the new tests FAIL.
- [ ] **Step 3:** Implement a small source object chosen once from `elderId`: `{ load, save, remove, after }`. The local path's behaviour is unchanged (existing tests pass).
- [ ] **Step 4:** Run Jest, tsc and lint. Expected: PASS.
- [ ] **Step 5:** Commit `feat: the pill page sends changes for her`.

### Task 11: Alarm sounds for her

**Files:**
- Modify:
  - `src/screens/SoundPickerScreen.tsx` and `src/screens/RecordScreen.tsx`;
  - `src/navigation/RootNavigator.tsx`: `SoundPicker: { alarmId?: string; selectedSoundId: string | null; elderId?: string; hour?: number; minute?: number }` and `Record: { alarmId?: string; elderId?: string; hour?: number; minute?: number }`.
- Test: `__tests__/screens/SoundPickerScreen.test.tsx`, `__tests__/screens/RecordScreen.test.tsx`

**Interfaces:**
- Consumes: `getElderSetup(elderId).sounds`, `sendSound` (Task 7).
- With `elderId`:
  - the picker shows Default tone, "{name}'s sounds" (no preview; her names only), then "My sounds" (his, with preview as today), then Record and Import as today;
  - choosing sends `sendSound(elderId, hour, minute, 'default' | 'hers' | 'mine', id)`, then `popTo('ElderPills')`;
  - Record, after Save, calls `sendSound(..., 'mine', savedSound.id)` instead of `setCardSound`;
  - Import: after `importSound`, sends 'mine';
  - `TOO_BIG` alerts the too-big text, and `NOT_ALLOWED` the not-an-editor text.
- [ ] **Step 1: Write the failing tests:**
  - `for her: shows her sounds and mine; choosing hers sends hers and returns to her pills`;
  - `for her: Default tone sends default`;
  - `for her: TOO_BIG says the sound is too big`;
  - Record: `for her: Save sends the recording as mine`.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement. The local paths are unchanged.
- [ ] **Step 4:** Run Jest, tsc and lint. Expected: PASS.
- [ ] **Step 5:** Commit `feat: choose or record alarm sounds for her`.

### Task 12: Two phones, README, review

**Files:**
- Modify: `README.md` (feature section, the "Remote setup" device matrix, debug hooks)
- Modify: `android/app/src/debug/.../DebugFamilyReceiver.kt` (`DEBUG_FAMILY_CHECK_IN`: runs `CheckIn.apply` under the lock and logs the count)

- [ ] **Step 1:** Run the full suite (Global Constraints commands). Expected: all pass.
- [ ] **Step 2:** On the emulator (elder) and the Redmi (relative), run each "Two phones" check from the spec. Record pass or pending rows in the README matrix, with what was seen:
  - add with her app open;
  - add with her app swiped away, then `DEBUG_FAMILY_CHECK_IN`;
  - a recorded voice rings;
  - edit; delete; non-editor; cancel; her notification;
  - the health warning with battery optimisation on.
  - Any check that needs the Redmi unlocked stays pending, with the reason.
- [ ] **Step 3:** Run the alarm checklist row: a pill due in 2 minutes with a change applied 1 minute before rings on time, and `:ringing` logs no Firebase line.
- [ ] **Step 4:** Commit `docs: README and device matrix for remote setup`.
- [ ] **Step 5:** Run a fresh whole-branch review (superpowers:requesting-code-review). Fix Critical and Important findings with tests, one commit each, and list the Minor ones in the PR.
