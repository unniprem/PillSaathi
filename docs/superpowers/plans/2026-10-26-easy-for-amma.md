# Easy for Amma (Android) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans (the user picks one) to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The elder can recognise and hear their pills. Each pill gets a photo. The app speaks English, Malayalam or Hindi, reads the pill names aloud while it rings, and works at the phone's largest text size.

**Architecture:**
- **Settings** (language, read aloud) live in the same locked, device-protected store as pills, in a new `settings.json`. Both processes read them. The `:ringing` process reads the language without taking the store lock, so a slow lock can never delay a ring.
- **Native copy** uses Android string resources (`values-ml`, `values-hi`), reached through a context localised to the app's language, not the phone's. Amount texts and spoken texts are pure Kotlin tables.
- **Read aloud** is a small controller (`ReadAloud`) that drives the existing looping `AlarmPlayer` and a `TextToSpeech` wrapper through interfaces. All of its timing is JVM-tested with fakes. The sound never waits for speech.
- **Photos** are JPEGs in device-protected `photos/`, named by UUID and referenced by `Pill.photo`. The bridge picks them through the system camera or the photo picker, so no new permissions are needed.
- **JS copy** moves into typed string tables (`src/i18n/`), with an `I18nProvider` whose first language comes from a synchronous native call, so there is no English flash.

**Tech Stack:** React Native 0.88 (new architecture), React 19.3, TypeScript, Kotlin (java.time through desugaring), Android `TextToSpeech`, React Navigation 7, Jest with `@testing-library/react-native` 14, JUnit 4.

**Spec:** `docs/superpowers/specs/2026-10-26-easy-for-amma-design.md`. It builds on `2026-10-24-custom-sound-alarm-design.md` and `2026-10-26-pills-and-doses-design.md`. Read all three first.

## Global Constraints

- **Earlier constraints still apply.** Every "Global Constraints" line in `docs/superpowers/plans/2026-10-25-custom-sound-alarm.md` and `docs/superpowers/plans/2026-10-26-pills-and-doses.md` still holds, except that work happens on branch **`feature/easy-for-amma`** (PR #6). In particular:
  - The ringing path never depends on JS.
  - User writes throw. Ringing-path writes are best effort.
  - The JS bundle still builds for iOS.
- **Languages:** `en` "English", `ml` "മലയാളം", `hi` "हिन्दी", in that order.
  - **Checked set:** `en` only.
  - **Release builds** list only checked languages. **Debug builds** (`ApplicationInfo.FLAG_DEBUGGABLE`) list all three, and unchecked ones show " (draft)" after their label.
  - **Effective language:** the stored choice if it is listed. Otherwise the phone's language (`Locale.getDefault().language`) if it is listed. Otherwise English.
  - Pill names are never translated. Digits stay Western (1, ½, 2.5). Times keep the current format ("8:00 AM", "20:00") in every language.
- **Read aloud:** on by default (also on upgrade).
  - First speech: at the first play end, or **15 s** after the ring starts, whichever comes first.
  - Later speeches: at the first play end at least **45 s** after the last speech ended, or **60 s** after it ended if the sound is still mid-play.
  - Speech that hasn't started within **3 s** is abandoned, and the sound is never paused for it. A speech running past **30 s** is stopped.
  - "At a play end" means within **300 ms** of the loop's end or start.
  - Speech plays as `USAGE_ALARM` / `CONTENT_TYPE_SPEECH`.
  - Voices: `en-IN`, `ml-IN` and `hi-IN`, each falling back to plain `en`.
- **Photos:** JPEG at quality **85**, long side at most **1024 px**, with EXIF rotation applied. They live in device-protected `photos/` and are named `<uuid>.jpg` (36-character lowercase UUID). A file nothing references and older than **24 h** is an orphan and is deleted on app open. No new `<uses-permission>`.
- **Type icons** (wherever a pill has no photo): tablet `⚪`, capsule `💊`, syrup `🧴`, drops `💧`.
- **Text sizes:**
  - Today: card time 32, statuses 18, pill names 20, course detail 16, amounts 18, sound row 16.
  - Ringing screen: the time and the title use **dp** (never scaled). Pill names, amounts and buttons use **sp**, and the buttons use `minHeight` instead of a fixed height.
- **Amount texts** (display), in the same format in Kotlin and TS:

  | form, amount   | en         | ml           | hi          |
  | -------------- | ---------- | ------------ | ----------- |
  | tablet 0.5     | ½ tablet   | ½ ഗുളിക      | ½ गोली      |
  | tablet 1       | 1 tablet   | 1 ഗുളിക      | 1 गोली      |
  | tablet 1.5     | 1½ tablets | 1½ ഗുളിക     | 1½ गोली     |
  | tablet 2       | 2 tablets  | 2 ഗുളിക      | 2 गोलियाँ   |
  | capsule 1 / 2  | 1 capsule / 2 capsules | 1 ക്യാപ്സ്യൂൾ / 2 ക്യാപ്സ്യൂൾ | 1 कैप्सूल / 2 कैप्सूल |
  | syrup 7.5      | 7.5 ml     | 7.5 ml       | 7.5 ml      |
  | drops 1 / 2    | 1 drop / 2 drops | 1 തുള്ളി / 2 തുള്ളി | 1 बूंद / 2 बूंदें |

  Plurals: English when the amount is above 1, as today. Malayalam never. Hindi when the amount is 2 or more.
- **Spoken amounts** (Kotlin only):
  - Halves of tablets use words:
    - **en:** "half a tablet" for 0.5. For 1.5 and up, "{n} and a half tablets".
    - **ml:** അര, ഒന്നര, രണ്ടര, മൂന്നര, നാലര, അഞ്ചര, ആറര, ഏഴര, എട്ടര, ഒമ്പതര, followed by " ഗുളിക".
    - **hi:** आधी, डेढ़, ढाई, साढ़े तीन, साढ़े चार, साढ़े पाँच, साढ़े छह, साढ़े सात, साढ़े आठ, साढ़े नौ, followed by " गोली", or " गोलियाँ" from 2 up.
  - Syrup is spoken as "{n} millilitres" / "{n} മില്ലിലിറ്റർ" / "{n} मिलीलीटर".
  - Everything else is spoken as its display text.
- **Fixed copy, English** (new in this step):
  - Settings: "Settings", "Language", "When it rings", "Read the pill names aloud", "Try it", "Text size", "PillSaathi follows your phone's text size.", "Reliability", "Make alarms reliable".
  - Pill page photo row: "Photo", "Take a photo", "Choose from gallery", "Retake", "Remove", "Couldn't add the photo".
  - Try it, no voice for the app's language: "Your phone has no {language} voice, so this was read in English." with the button "Open voice settings".
  - Try it, no voice at all: "Your phone can't read aloud. Add a text-to-speech voice in your phone's settings." with the button "Open voice settings".
- **Fixed copy, translations used in tests:**
  - **Ringing title:** ml "മരുന്ന് കഴിക്കാൻ സമയമായി", hi "दवा लेने का समय हो गया".
  - **Taken:** ml "കഴിച്ചു", hi "ले ली".
  - **Today:** ml "ഇന്ന്", hi "आज".
  - **Name label:** ml "പേര്", hi "नाम".
  - **Settings:** ml "ക്രമീകരണങ്ങൾ", hi "सेटिंग्स".
  - **Short day names (Sun…Sat):**
    - ml: ഞായർ, തിങ്കൾ, ചൊവ്വ, ബുധൻ, വ്യാഴം, വെള്ളി, ശനി
    - hi: रवि, सोम, मंगल, बुध, गुरु, शुक्र, शनि
  - **Short month names (Jan…Dec):**
    - ml: ജനു, ഫെബ്രു, മാർ, ഏപ്രി, മേയ്, ജൂൺ, ജൂലൈ, ഓഗ, സെപ്, ഒക്ടോ, നവം, ഡിസം
    - hi: जन, फ़र, मार्च, अप्रै, मई, जून, जुला, अग, सित, अक्टू, नव, दिस
  - All other Malayalam and Hindi text is drafted by the implementer. Each translation file starts with a comment saying it is a draft until a reader of that language checks it.
- **Error codes:** add `PHOTO_ERROR` and `INVALID_LANGUAGE` to `INVALID_PILL`, `NOT_FOUND`, `STORAGE_ERROR` and `NO_ACTIVITY`.
- **Commits:** one per task, conventional, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. `npx tsc --noEmit` and `npm run lint` stay clean after every task. Before pushing, check that PR #6 isn't merged (`gh pr view 6 --json state`).

## Review Focus

These five cases are the ones no spec check reaches and the most likely to hurt a real user, most likely first. Each one's test is added to the task that owns the code.

1. **A camera photo stored sideways** (EXIF orientation 6, as most phone cameras save a portrait shot). It must show upright. Test: Task 5 `rotationFor_exifOrientations`.
2. **A language that is stored but hidden**: `ml` was chosen on a debug build, then a release build was installed over it. The ringing screen, the notifications and the JS must all fall back to English together. Tests: Task 1 `effective_storedButHidden_english`; Task 7 `starts in English when native reports an unlisted language`.
3. **Taken tapped mid-sentence.** Speech stops at once, and the sound must not come back afterwards. Test: Task 4 `stopDuringSpeech_neverResumesSound`.
4. **Pill names in mixed or no scripts** ("D3 60K", "ടെൽമ 40", "Telma ടെൽമ", "500"). Each gets a defined voice and nothing is dropped. Test: Task 3 `voiceFor_scripts`.
5. **Abandoned photo picks** (picked, then the page cancelled) piling up, or cleanup deleting a photo in use. Test: Task 5 `orphans_onlyOldUnreferenced`.

---

## File Structure

Kotlin, under `android/app/src/main/java/com/pillsaathi/`:

| File | Change | Responsibility |
| --- | --- | --- |
| `alarm/AppSettings.kt` | create | `AppLanguage`, `AppSettings`, `LanguageRules` (pure) |
| `alarm/Localized.kt` | create | `Context.localized(lang)` |
| `alarm/SpeechText.kt` | create | what to say, in parts with a voice each (pure) |
| `alarm/ReadAloudRules.kt` | create | when to speak (pure) |
| `alarm/ReadAloud.kt` | create | the speech controller, plus its `RingSound`, `Voice` and `Ticker` interfaces |
| `alarm/TtsVoice.kt` | create | `Voice` on Android `TextToSpeech` |
| `alarm/PhotoRules.kt` | create | photo size, rotation, names, orphans (pure) |
| `photo/PillPhotos.kt` | create | capture URI, import, delete, file URI |
| `alarm/PillModels.kt` | modify | `PillForm.icon`; `photo` on `Pill`, `PillDraft` and `TodayPill` |
| `alarm/DoseRules.kt` | modify | amount text per language, spoken amounts, photo on Today pills |
| `alarm/PillJson.kt`, `alarm/AlarmJson.kt`, `alarm/AlarmStore.kt` | modify | `photo` key; `settings.json`; `photosDir` |
| `alarm/AlarmEngine.kt` | modify | settings, language, ring speech, photo lifecycle |
| `alarm/AlarmPlayer.kt` | modify | implements `RingSound` |
| `alarm/RingingState.kt`, `RingingService.kt`, `RingingActivity.kt`, `Notifications.kt` | modify | localised copy, read aloud, photos |
| `bridge/NativeAlarmsModule.kt`, `PillInputValidator.kt`, `SettingsLauncher.kt` | modify | settings, photos and Try it API; `tts` target |
| `res/layout/activity_ringing.xml`, `res/values*/strings.xml`, `res/xml/photo_paths.xml`, `AndroidManifest.xml` | modify/create | layout, copy, FileProvider |
| `debug/.../DebugAlarmReceiver.kt`, `debug/AndroidManifest.xml` | modify | `DEBUG_SETTINGS` |

JS:

| File | Change |
| --- | --- |
| `src/i18n/en.ts`, `ml.ts`, `hi.ts`, `index.tsx` | create |
| `src/screens/SettingsScreen.tsx` | create |
| `specs/NativeAlarms.ts`, `src/native/alarms.ts` | modify |
| `src/lib/amount.ts`, `course.ts`, `health.ts`, `src/setup/oemSteps.ts` | modify |
| `src/components/DoseCard.tsx`, `AmountStepper.tsx`, `SoundRow.tsx`, `HealthBanner.tsx` | modify |
| `src/screens/TodayScreen.tsx`, `PillEditScreen.tsx`, `SoundPickerScreen.tsx`, `RecordScreen.tsx`, `SetupScreen.tsx` | modify |
| `src/navigation/RootNavigator.tsx` | modify |

Tests:
- Kotlin: `LanguageRulesTest`, `SpeechTextTest`, `ReadAloudTest` and `PhotoRulesTest` (create). `AlarmJsonTest`, `PillJsonTest`, `DoseRulesTest` and `bridge/PillInputValidatorTest` (modify).
- Jest: `__tests__/i18n/i18n.test.tsx` and `__tests__/screens/SettingsScreen.test.tsx` (create). `amount`, `course`, `alarms`, `TodayScreen`, `PillEditScreen`, `SetupScreen` and `RecordScreen` tests (modify). `helpers/nativeMocks.ts` (modify).

Docs: `README.md`, `JOURNAL.md`, the PR #6 description.

---

### Task 1: Language and read-aloud settings in the store

**Files:**
- Create: `alarm/AppSettings.kt`, `alarm/Localized.kt`
- Modify: `alarm/AlarmJson.kt`, `alarm/AlarmStore.kt`, `alarm/AlarmEngine.kt`, `debug/.../DebugAlarmReceiver.kt`, `debug/AndroidManifest.xml`
- Test: `android/app/src/test/java/com/pillsaathi/alarm/LanguageRulesTest.kt`, `AlarmJsonTest.kt`

**Interfaces:**
- Produces:
  - `enum class AppLanguage(val code: String, val label: String)` with `EN("en","English")`, `ML("ml","മലയാളം")`, `HI("hi","हिन्दी")`, and `companion fun fromCode(code: String?): AppLanguage?`.
  - `data class AppSettings(val language: AppLanguage? = null, val readAloud: Boolean = true)`. A null language means "follow the phone".
  - `object LanguageRules { val CHECKED: Set<AppLanguage>; fun available(debug: Boolean): List<AppLanguage>; fun effective(stored: AppLanguage?, phoneLanguage: String, available: List<AppLanguage>): AppLanguage }`
  - `AlarmJson.settingsToJson(s: AppSettings): String` and `settingsFromJson(json: String?): AppSettings`, with the shape `{"language":"ml"|null,"readAloud":true}`.
  - `AlarmStore.loadSettings()` and `saveSettings(s)` (`settings.json`). Also `AlarmStore.peekSettings(): AppSettings`, which reads without the lock and returns `AppSettings()` on any error.
  - `AlarmEngine`:
    - `settings(): AppSettings` (locked read).
    - `updateSettings(change: (AppSettings) -> AppSettings)`: a user write that throws.
    - `availableLanguages(): List<AppLanguage>`, which uses `FLAG_DEBUGGABLE`.
    - `language(): AppLanguage`: lock-free through `peekSettings`, and never throws.
  - `fun Context.localized(lang: AppLanguage): Context`, through `createConfigurationContext` with `Locale(lang.code)`.
  - Debug broadcast `com.pillsaathi.DEBUG_SETTINGS` with optional `--es lang en|ml|hi|phone` and `--ez read_aloud true|false`.

- [ ] **Step 1: Write the failing tests**

  ```kotlin
  @Test fun effective_storedAvailable_wins()          // (ML, "hi", all) → ML
  @Test fun effective_noStored_followsPhone()         // (null, "hi", all) → HI
  @Test fun effective_phoneNotListed_english()        // (null, "ta", all) → EN
  @Test fun effective_storedButHidden_english()       // (ML, "ml", [EN]) → EN      (Review Focus 2)
  @Test fun available_release_checkedOnly()           // available(false) == [EN]
  @Test fun available_debug_allInOrder()              // available(true) == [EN, ML, HI]
  // AlarmJsonTest
  @Test fun settings_roundTrip()                      // AppSettings(HI, false) survives
  @Test fun settings_missing_defaults()               // settingsFromJson(null) == AppSettings(null, true)
  @Test fun settings_unknownLanguage_followsPhone()   // {"language":"ta"} → language null
  ```

- [ ] **Step 2: Run them and see them fail**

  Run: `cd android && ./gradlew :app:testDebugUnitTest --tests '*LanguageRulesTest' --tests '*AlarmJsonTest'`
  Expected: compilation fails on `AppLanguage`.

- [ ] **Step 3: Implement the interfaces above.** `peekSettings` reads the file without `locked`, because writes are atomic renames. `FileStore.read` and `readParsed` both take the lock, so add `FileStore.peek(name): String?`, which reads the file as is without it. If it hits a corrupt file it returns defaults and must not move the file. Add the debug action to the receiver and its manifest filter. `lang phone` stores `null`.

- [ ] **Step 4: Run the tests and see them pass**

  Run: the command from Step 2, then `./gradlew :app:testDebugUnitTest`.
  Expected: all pass.

- [ ] **Step 5: Commit** with `feat: store the app language and read-aloud settings`.

---

### Task 2: Native copy in three languages

**Files:**
- Create: `res/values-ml/strings.xml`, `res/values-hi/strings.xml`
- Modify: `alarm/DoseRules.kt`, `alarm/AlarmEngine.kt`, `alarm/Notifications.kt`, `alarm/RingingActivity.kt`, `alarm/RingingService.kt` (placeholder ring)
- Test: `DoseRulesTest.kt`

**Interfaces:**
- Consumes: `AlarmEngine.language()`, `Context.localized` (Task 1).
- Produces:
  - `DoseRules.amountText(form: PillForm, amount: Double, lang: AppLanguage = AppLanguage.EN): String`, following the Global Constraints table.
  - `AlarmEngine.ringPills` and `soundNameFor` speak the app's language.
  - `Notifications.ringing`, `postMissed` and `ensureChannels` read their strings from `context.localized(AlarmEngine.get(context).language())`.
  - `RingingActivity.attachBaseContext` wraps `newBase.localized(...)` in the same way.

- [ ] **Step 1: Write the failing tests.** Use one test per language. Each asserts every row of the amount table, and the English test stays as it is today.

  ```kotlin
  @Test fun amountText_malayalam()   // amountText(TABLET, 2.0, ML) == "2 ഗുളിക"; DROPS 2.0 → "2 തുള്ളി"; …
  @Test fun amountText_hindi()       // amountText(TABLET, 1.5, HI) == "1½ गोली"; TABLET 2.0 → "2 गोलियाँ"; DROPS 2.0 → "2 बूंदें"; …
  ```

- [ ] **Step 2: Run them and see them fail.** Run: `./gradlew :app:testDebugUnitTest --tests '*DoseRulesTest'`. Expected: FAIL, because there is no `lang` parameter.

- [ ] **Step 3: Implement.** Translate every key of `values/strings.xml` into both new files, including `ringing_title` and `action_taken` as fixed in Global Constraints. Each new file starts with the draft comment. Every native user-facing string goes through the localised context. Language reads never take the store lock.

- [ ] **Step 4: Run the tests and build.** Run: `./gradlew :app:testDebugUnitTest :app:assembleDebug`. Expected: pass, and the build succeeds.

- [ ] **Step 5: Check on the emulator.**
  1. Run `adb shell am broadcast -a com.pillsaathi.DEBUG_SETTINGS -n com.pillsaathi/.alarm.debug.DebugAlarmReceiver --es lang ml`.
  2. Run `DEBUG_ADD_PILL --ei minutes_from_now 1`.
  Expected: the ringing screen, its notification and the Taken action are in Malayalam. With `--es lang en`, they are in English.

- [ ] **Step 6: Commit** with `feat: ring and notify in English, Malayalam or Hindi`.

---

### Task 3: What to say: speech text

**Files:**
- Create: `alarm/SpeechText.kt`
- Modify: `alarm/DoseRules.kt`, `alarm/RingingState.kt`, `alarm/AlarmEngine.kt`
- Test: `SpeechTextTest.kt`, `DoseRulesTest.kt`

**Interfaces:**
- Produces:
  - `data class SpeechPart(val text: String, val lang: AppLanguage)` and `data class SpokenPill(val name: String, val spokenAmount: String)`.
  - `object SpeechText`:
    - `fun voiceFor(name: String, appLang: AppLanguage): AppLanguage`: any Malayalam character (U+0D00–U+0D7F) → ML. Otherwise any Devanagari character (U+0900–U+097F) → HI. Otherwise any Latin letter → EN. Otherwise `appLang`.
    - `fun parts(title: String, appLang: AppLanguage, pills: List<SpokenPill>): List<SpeechPart>`: the tokens are `"$title."` (appLang), then for each pill `"$name,"` (voiceFor) and `"$spokenAmount."` (appLang). Adjacent tokens with the same language are joined with one space.
  - `DoseRules.spokenAmount(form: PillForm, amount: Double, lang: AppLanguage): String`, following the Global Constraints.
  - `RingPill` gains `spokenAmount: String = ""`, which `ringPills` fills in.
  - `AlarmEngine.ringSpeech(pills: List<RingPill>): List<SpeechPart>?` is null when read aloud is off or `pills` is empty. Its title is `ringing_title` in the app's language.

- [ ] **Step 1: Write the failing tests**

  ```kotlin
  @Test fun parts_english_onePart()
  // EN, "Time for your medicines", [Telma 40/"1 tablet", Vitamin D/"1 capsule"]
  // → [("Time for your medicines. Telma 40, 1 tablet. Vitamin D, 1 capsule.", EN)]
  @Test fun parts_malayalam_englishNameInEnglishVoice()
  // ML, "മരുന്ന് കഴിക്കാൻ സമയമായി", [Telma 40/"1 ഗുളിക"]
  // → [("മരുന്ന് കഴിക്കാൻ സമയമായി.", ML), ("Telma 40,", EN), ("1 ഗുളിക.", ML)]
  @Test fun parts_malayalamName_onePart()          // name "ടെൽമ 40" → a single ML part
  @Test fun parts_noPills_titleOnly()              // → [("Time for your medicines.", EN)]
  @Test fun voiceFor_scripts()                     // (Review Focus 4)
  // ("D3 60K", ML) → EN; ("ടെൽമ 40", EN) → ML; ("Telma ടെൽമ", HI) → ML; ("दवा", EN) → HI; ("500", HI) → HI
  // DoseRulesTest
  @Test fun spokenAmount_halves()
  // (TABLET, 0.5, EN) "half a tablet"; (TABLET, 1.5, EN) "1 and a half tablets";
  // (TABLET, 1.5, ML) "ഒന്നര ഗുളിക"; (TABLET, 2.5, HI) "ढाई गोलियाँ"; (TABLET, 1.5, HI) "डेढ़ गोली"
  @Test fun spokenAmount_syrupAndWhole()
  // (SYRUP, 7.5, EN) "7.5 millilitres"; (SYRUP, 5.0, HI) "5 मिलीलीटर"; (CAPSULE, 2.0, EN) "2 capsules"
  ```

- [ ] **Step 2: Run them and see them fail.** Run: `./gradlew :app:testDebugUnitTest --tests '*SpeechTextTest' --tests '*DoseRulesTest'`. Expected: compilation fails.

- [ ] **Step 3: Implement the interfaces above.**

- [ ] **Step 4: Run the tests and see them pass.** Use the same command. Expected: pass.

- [ ] **Step 5: Commit** with `feat: build the spoken pill list, each part in its own voice`.

---

### Task 4: Read aloud while ringing

**Files:**
- Create: `alarm/ReadAloudRules.kt`, `alarm/ReadAloud.kt`, `alarm/TtsVoice.kt`
- Modify: `alarm/AlarmPlayer.kt`, `alarm/RingingService.kt`
- Test: `ReadAloudTest.kt`

**Interfaces:**
- Consumes: `SpeechPart`, `AlarmEngine.ringSpeech` (Task 3).
- Produces:
  - `object ReadAloudRules`:
    - constants `FIRST_MAX_MS = 15_000`, `MIN_GAP_MS = 45_000`, `MAX_GAP_MS = 60_000`, `START_TIMEOUT_MS = 3_000`, `SPEECH_MAX_MS = 30_000`, `PLAY_END_SLACK_MS = 300`.
    - `enum class Step { SPEAK_FROM_START, SPEAK_AND_RESUME, WAIT }`.
    - `fun decide(now: Long, ringStart: Long, lastSpeechEnd: Long?, atPlayEnd: Boolean): Step`:
      - SPEAK_FROM_START when at a play end and (there's no speech yet, or `now − lastSpeechEnd ≥ MIN_GAP_MS`).
      - Otherwise SPEAK_AND_RESUME when `now ≥ forcedAt`, where `forcedAt = lastSpeechEnd?.plus(MAX_GAP_MS) ?: ringStart + FIRST_MAX_MS`.
      - Otherwise WAIT.
    - `fun nextCheckAt(now: Long, ringStart: Long, lastSpeechEnd: Long?, msToPlayEnd: Long?): Long` = `min(now + msToPlayEnd, forcedAt)`, or `forcedAt` when `msToPlayEnd` is null.
  - `interface RingSound { fun msToPlayEnd(): Long?; fun atPlayEnd(): Boolean; fun pause(); fun resume(fromStart: Boolean) }`. `AlarmPlayer` implements it. A `resume` that throws restarts the sound sources from the beginning, so the sound never ends silent.
  - `interface Voice { fun speak(parts: List<SpeechPart>, listener: Listener); fun stop(); fun shutdown(); interface Listener { fun onStarted(); fun onFinished() } }`. `onFinished` also covers errors and comes at most once per `speak`.
  - `interface Ticker { fun now(): Long; fun after(delayMs: Long, block: () -> Unit): () -> Unit }`. The returned function cancels.
  - `class ReadAloud(sound: RingSound, voice: Voice, ticker: Ticker, parts: List<SpeechPart>, ringStart: Long) { fun start(); fun stop() }`:
    - It checks at `nextCheckAt`. On a SPEAK step it calls `voice.speak` and arms a `START_TIMEOUT_MS` timer.
    - `onStarted` pauses the sound and arms the `SPEECH_MAX_MS` watchdog.
    - `onFinished` resumes the sound (from the start after SPEAK_FROM_START, in place after SPEAK_AND_RESUME), records `lastSpeechEnd` and schedules the next check.
    - On a start timeout, it calls `voice.stop()`, sets `lastSpeechEnd = now` and never touches the sound.
    - `stop()` cancels everything and calls `voice.stop()`. Callbacks after it are ignored.
  - `class TtsVoice(context: Context) : Voice`:
    - It sets audio attributes `USAGE_ALARM` / `CONTENT_TYPE_SPEECH`.
    - Per part, it calls `setLanguage` (en-IN / ml-IN / hi-IN, falling back to `Locale.ENGLISH`, and skipping the part if neither is available), then `speak(QUEUE_ADD)` with an utterance id per part.
    - It posts its listener calls to the main thread.
    - Before init completes, `speak` does nothing, which the start timeout covers.
  - `RingingService.FoundRing` gains `speech: List<SpeechPart>?`, read in the same store lock. `startRing` starts a `ReadAloud` after `player.start` when `speech != null`. `silence()` stops it and shuts down its `TtsVoice`.

- [ ] **Step 1: Write the failing tests**, with a fake `RingSound` (records pause and resume), a fake `Voice` (the test fires `onStarted`/`onFinished`) and a manual `Ticker`.

  ```kotlin
  @Test fun decide_shortTone_speaksAtFirstPlayEnd()        // 2 s tone, now = start+2000, atPlayEnd → SPEAK_FROM_START
  @Test fun decide_longSound_waitsUntil15s()               // mid-play at +14_900 → WAIT; at +15_000 → SPEAK_AND_RESUME
  @Test fun decide_14sRecording_neverCut()                 // play end at +14_000 → SPEAK_FROM_START
  @Test fun decide_afterSpeech_playEndTooSoon_waits()      // last = t, play end at t+30_000 → WAIT
  @Test fun decide_afterSpeech_playEndAfter45s_speaks()    // play end at t+46_000 → SPEAK_FROM_START
  @Test fun decide_afterSpeech_midPlayAt60s_speaks()       // mid-play at t+60_000 → SPEAK_AND_RESUME
  @Test fun speechNeverStarts_soundNeverPaused()           // no onStarted within 3 s → voice.stop(), pause count 0
  @Test fun stopDuringSpeech_neverResumesSound()           // onStarted, stop(), onFinished → resume count 0 (Review Focus 3)
  @Test fun speechOverrun_stoppedAfter30s_resumes()
  @Test fun finished_resumesFromStartAtPlayEnd_inPlaceMidPlay()
  ```

- [ ] **Step 2: Run them and see them fail.** Run: `./gradlew :app:testDebugUnitTest --tests '*ReadAloudTest'`. Expected: compilation fails.

- [ ] **Step 3: Implement the interfaces above.** The service must start the sound exactly as today, before any speech code runs. A `TtsVoice` that fails to initialise only means no speech for that ring.

- [ ] **Step 4: Run all JVM tests and build.** Run: `./gradlew :app:testDebugUnitTest :app:assembleDebug`. Expected: pass.

- [ ] **Step 5: Check on the emulator**, watching `adb logcat -s PillSaathiAlarm`:
  - Ring a pill in English. Expected: the tone starts at the fire, the speech follows at the first loop end, and the tone resumes after it.
  - Tap Taken during speech. Expected: silence at once.
  - Set `DEBUG_SETTINGS --ez read_aloud false`. Expected: tone only.
  - Set `--es lang ml` on an image without a Malayalam voice. Expected: the speech is in English and the tone plays normally.

- [ ] **Step 6: Commit** with `feat: read the due pills aloud at breaks in the alarm sound`.

---

### Task 5: Pill photos: storage, picking and the pill API

**Files:**
- Create: `alarm/PhotoRules.kt`, `photo/PillPhotos.kt`, `res/xml/photo_paths.xml`
- Modify: `alarm/PillModels.kt`, `alarm/PillJson.kt`, `alarm/AlarmStore.kt`, `alarm/AlarmEngine.kt`, `alarm/DoseRules.kt`, `bridge/PillInputValidator.kt`, `bridge/NativeAlarmsModule.kt`, `AndroidManifest.xml`, `specs/NativeAlarms.ts`, `src/native/alarms.ts`
- Test: `PhotoRulesTest.kt`, `PillJsonTest.kt`, `PillInputValidatorTest.kt`, `DoseRulesTest.kt`, `__tests__/native/alarms.test.ts`. Update the Jest pill fixtures with `photo: null, photoUri: null`.

**Interfaces:**
- Produces:
  - `object PhotoRules`:
    - constants `MAX_SIDE = 1024`, `JPEG_QUALITY = 85`, `ORPHAN_AGE_MS = 86_400_000`.
    - `fun scaledSize(width: Int, height: Int): Pair<Int, Int>`.
    - `fun sampleSize(width: Int, height: Int): Int`: the largest power of 2 that keeps the long side ≥ `MAX_SIDE`.
    - `fun rotationFor(exifOrientation: Int): Int`.
    - `fun isPhotoName(name: String): Boolean`: matches `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$`.
    - `fun orphans(files: List<Pair<String, Long>>, referenced: Set<String>, now: Long): List<String>`. The pairs are a name and its last-modified time.
  - `Pill.photo: String? = null`, `PillDraft.photo: String? = null`, `TodayPill.photo: String? = null`. Each is appended with a default.
  - PillJson writes `"photo"` (a name or null). A missing key reads as null. `DosePill` is unchanged.
  - The validator rejects a `photo` that isn't null or `isPhotoName` with `INVALID_PILL`.
  - `AlarmStore.photosDir` is device-protected `photos/`, created on demand.
  - `class PillPhotos(context: Context, dir: File)`:
    - `fun captureUri(): Uri`: a FileProvider `${applicationId}.photos` URI for `cacheDir/camera/capture.jpg`.
    - `fun importFrom(uri: Uri): String`: decode with `sampleSize`, rotate by `rotationFor`, scale, then write the JPEG durably (temp file and rename). Returns the new name.
    - `fun delete(name: String)` and `fun fileUri(name: String): String` (`file://…`).
  - `AlarmEngine`:
    - `savePill` keeps `draft.photo` only if that file exists (otherwise null, logged).
    - After saving, it deletes the pill's previous photo if the photo changed. `deletePill` deletes the pill's photo.
    - `cleanUpPhotos(now: Long)` deletes `orphans(...)`. It runs best effort after `reconcile(APP_OPEN)`.
  - `DoseRules.todayCards`: `TodayPill.photo` is the live pill's photo, for record rows too, and null for a deleted pill.
  - Bridge:
    - `pickPhoto(source: string): Promise<PickedPhoto | null>` (`"camera"` or `"gallery"`), with `PickedPhoto = { name: string; uri: string }`.
      - camera: `ACTION_IMAGE_CAPTURE` with `EXTRA_OUTPUT = captureUri()` and write-grant flags.
      - gallery: the androidx `PickVisualMedia(ImageOnly)` contract's `createIntent`.
      - Results are imported on the worker thread. Cancel gives `null`. Failures give `PHOTO_ERROR`. No screen gives `NO_ACTIVITY`.
      - Only one pick runs at a time. A second call while one is pending rejects `PHOTO_ERROR`.
    - `NativePill` gains `photo: string | null` and `photoUri: string | null`. `PillInput` gains `photo: string | null`. `NativeTodayPill` gains `photoUri: string | null`.
  - JS: `pickPhoto(source: 'camera' | 'gallery'): Promise<PickedPhoto | null>` and `AlarmErrors.PhotoError = 'PHOTO_ERROR'`.

- [ ] **Step 1: Write the failing tests**

  ```kotlin
  @Test fun scaledSize_bigLandscape()        // (4000, 3000) → (1024, 768); (800, 600) → (800, 600); (3000, 4000) → (768, 1024)
  @Test fun sampleSize_keepsAtLeastMaxSide() // (4000, 3000) → 2; (1000, 800) → 1
  @Test fun rotationFor_exifOrientations()   // 6 → 90, 3 → 180, 8 → 270, 1 → 0, 0 → 0     (Review Focus 1)
  @Test fun isPhotoName_rejectsPaths()       // "../x.jpg", "a.jpg", "<uuid>.png" → false; "<uuid>.jpg" → true
  @Test fun orphans_onlyOldUnreferenced()    // referenced+old kept; unreferenced+1h old kept; unreferenced+25h old → removed  (Review Focus 5)
  // PillJsonTest: pill_photo_roundTrip(), pill_missingPhoto_null()
  // PillInputValidatorTest: photo_nullOrUuidName_valid(), photo_path_invalid()
  // DoseRulesTest: todayCards_photoFromLivePill_nullWhenDeleted()
  ```

  ```ts
  // __tests__/native/alarms.test.ts
  it('passes the photo source to native', ...)   // pickPhoto('camera') → native pickPhoto called with 'camera'
  ```

- [ ] **Step 2: Run them and see them fail.** Run: `./gradlew :app:testDebugUnitTest` and `npx jest __tests__/native`. Expected: FAIL.

- [ ] **Step 3: Implement the interfaces above.** Add the FileProvider `<provider>` (`exported="false"`, `grantUriPermissions="true"`) and `photo_paths.xml` with `<cache-path name="camera" path="camera/" />`. Don't add any `<uses-permission>`.

- [ ] **Step 4: Run all tests.** Run: `./gradlew :app:testDebugUnitTest`, `npm test`, `npx tsc --noEmit`, `npm run lint`. Expected: all pass.

- [ ] **Step 5: Commit** with `feat: store one photo per pill, taken with the camera or picked from the gallery`.

---

### Task 6: Ringing screen with photos, icons and safe large text

**Files:**
- Modify: `alarm/PillModels.kt` (`PillForm.icon`), `alarm/RingingState.kt`, `alarm/AlarmEngine.kt`, `alarm/RingingActivity.kt`, `res/layout/activity_ringing.xml`
- Test: `DoseRulesTest.kt` (`PillForm` icons)

**Interfaces:**
- Consumes: `Pill.photo`, `AlarmStore.photosDir` (Task 5).
- Produces:
  - `PillForm` gains `val icon: String` (Global Constraints values).
  - `RingPill` gains `form: PillForm = PillForm.TABLET` and `photoPath: String? = null` (an absolute path), filled in by `ringPills`.
  - Each ringing row shows a 64 dp rounded photo, decoded with `inSampleSize` to at most twice the box, or the form's icon at 32 sp in the same box.
  - Tapping a photo shows it full width over the pill list (`@+id/ringing_photo_large`). Tapping that hides it. A decode failure shows the icon.
  - Layout: the time is `72dp` and the title `22dp`. The buttons are `wrap_content` with `minHeight` 88 dp (Taken) and 64 dp (Snooze). The list keeps `layout_weight=1`, so the buttons stay on screen.

- [ ] **Step 1: Write the failing test** `pillForm_icons()`: TABLET "⚪", CAPSULE "💊", SYRUP "🧴", DROPS "💧".
- [ ] **Step 2: Run it and see it fail.** Run: `./gradlew :app:testDebugUnitTest --tests '*DoseRulesTest'`.
- [ ] **Step 3: Implement the interfaces above.**
- [ ] **Step 4: Run the tests and build.** Run: `./gradlew :app:testDebugUnitTest :app:assembleDebug`. Expected: pass.
- [ ] **Step 5: Check on the emulator.**
  - Ring a pill with no photo and confirm its type icon shows. Task 8's check covers a real photo on the ring.
  - Run `adb shell settings put system font_scale 2.0`, ring 10 pills (`DEBUG_ADD_PILL` ×10 at the same minute) and take a screenshot. Expected: Taken, Snooze and Skip are fully visible and the list scrolls.
  - Reset with `font_scale 1.0`.
- [ ] **Step 6: Commit** with `feat: show pill photos on the ringing screen and keep its buttons visible at large text`.

---

### Task 7: JS strings in three languages and the language setting

**Files:**
- Create: `src/i18n/en.ts`, `src/i18n/ml.ts`, `src/i18n/hi.ts`, `src/i18n/index.tsx`
- Modify: `specs/NativeAlarms.ts`, `src/native/alarms.ts`, `bridge/NativeAlarmsModule.kt`, `src/lib/amount.ts`, `src/lib/course.ts`, `src/navigation/RootNavigator.tsx`, `__tests__/helpers/nativeMocks.ts`
- Test: `__tests__/i18n/i18n.test.tsx`, `__tests__/lib/amount.test.ts`, `__tests__/lib/course.test.ts`

**Interfaces:**
- Consumes: `AlarmEngine.settings`, `updateSettings`, `availableLanguages` and `language` (Task 1).
- Produces:
  - Native bridge:
    - `getSettings(): Promise<{ language: string; readAloud: boolean; languages: { code: string; label: string; draft: boolean }[] }>`. `language` is the effective one.
    - `currentLanguage(): string`: synchronous, lock-free, never throws.
    - `setLanguage(code: string): Promise<void>`: rejects `INVALID_LANGUAGE` for a code that isn't listed.
    - `setReadAloud(on: boolean): Promise<void>`.
  - JS wrappers with the same names in `src/native/alarms.ts`. `nativeMocks` defaults: `currentLanguage` → `'en'`, `getSettings` → English only with read aloud on, and the setters resolve.
  - `src/i18n/index.tsx`:
    - `type Lang = 'en' | 'ml' | 'hi'`, `type Strings = typeof en`, `function stringsFor(lang: Lang): Strings`.
    - `function I18nProvider({ children })`: its first language comes from `currentLanguage()`, with any unknown value or error giving `'en'`.
    - `function useI18n(): { lang: Lang; t: Strings; setLanguage(lang: Lang): Promise<void> }`. `setLanguage` saves natively first, then redraws.
  - `en.ts` holds every user-visible string now in `src/` (moved verbatim), plus the new copy in Global Constraints. Strings with values are functions (`takenAt: (time: string) => string`), and `days` and `months` are arrays. `ml.ts` and `hi.ts` are typed `Strings`.
  - `formatAmount(form, amount, lang: Lang = 'en')`, following the table. `FORM_LABELS` moves to `t.forms`.
  - `course.ts`: `formatDay(iso, t = en)`, `courseLabel(start, days, today, t = en)`, `courseSummary({ …, t = en })`, `nextLabel(statusAt, today, t = en)`.
  - `RootNavigator` wraps its stack in `I18nProvider` and takes screen titles from `t`.

- [ ] **Step 1: Write the failing tests**

  ```ts
  it('has every key in every language')                  // deep key sets of ml and hi equal en's; days.length 7, months.length 12
  it('starts in the language native reports')            // currentLanguage → 'hi' → Today header contains "आज"
  it('starts in English when native reports an unlisted language') // 'ta' and a throwing mock → English  (Review Focus 2)
  // amount.test.ts
  it('formats Malayalam and Hindi amounts')              // the table rows, e.g. formatAmount('tablet', 2, 'hi') === '2 गोलियाँ'
  // course.test.ts
  it('names days and months in Malayalam')               // formatDay('2026-10-30', ml) === 'വെള്ളി 30 ഒക്ടോ'
  ```

- [ ] **Step 2: Run them and see them fail.** Run: `npx jest __tests__/i18n __tests__/lib`. Expected: FAIL.

- [ ] **Step 3: Implement the interfaces above.**

- [ ] **Step 4: Run all checks.** Run: `npm test && npx tsc --noEmit && npm run lint && (cd android && ./gradlew :app:testDebugUnitTest)`. Expected: all pass, and every existing English test is unchanged.

- [ ] **Step 5: Commit** with `feat: add English, Malayalam and Hindi app copy and the language setting`.

---

### Task 8: Today and the pill page in the chosen language, with photos and bigger text

**Files:**
- Modify: `src/components/DoseCard.tsx`, `AmountStepper.tsx`, `HealthBanner.tsx`, `src/lib/health.ts`, `src/screens/TodayScreen.tsx`, `src/screens/PillEditScreen.tsx`
- Test: `__tests__/screens/TodayScreen.test.tsx`, `PillEditScreen.test.tsx`, `__tests__/lib/health.test.ts`

**Interfaces:**
- Consumes: `useI18n` (Task 7), `pickPhoto` and the photo fields (Task 5).
- Produces:
  - `healthIssues(health, setup, manufacturer, t: Strings = en)`.
  - `DoseCard` rows show a 40×40 rounded `Image` (`testID="pill-photo-{pillId}"`) from `photoUri`. When there is no photo, or `onError` fires, they show the icon text (`testID="pill-icon-{pillId}"`). Text sizes follow Global Constraints.
  - Pill page: a "Photo" row under Name.
    - With no photo: "Take a photo" and "Choose from gallery".
    - With a photo: a 72×72 image plus "Retake", "Choose from gallery" and "Remove".
    - Save sends `photo: name | null`. A `pickPhoto` rejection shows the alert "Couldn't add the photo". A `null` pick keeps the current photo.
  - Every string on these screens comes from `t`.

- [ ] **Step 1: Write the failing tests**

  ```ts
  // TodayScreen
  it('shows a pill photo when it has one')        // photoUri 'file:///p/a.jpg' → getByTestId('pill-photo-p1').props.source.uri
  it('shows the type icon without a photo')       // getByTestId('pill-icon-p1') has text '⚪'
  it('shows Today in Hindi')                      // currentLanguage 'hi', a missed card → getByText(hi.status.missed); header contains 'आज'
  // PillEditScreen
  it('takes a photo and saves its name')          // pickPhoto('camera') → { name: UUID_JPG, uri } → savePill(expect.objectContaining({ photo: UUID_JPG }))
  it('removes a photo')                           // pill with photo → Remove → save → photo: null
  it('keeps the photo when a pick is cancelled')  // pickPhoto → null → save → photo unchanged
  it('says when a photo could not be added')      // pickPhoto rejects PHOTO_ERROR → Alert "Couldn't add the photo"
  it('shows the pill page in Malayalam')          // currentLanguage 'ml' → 'പേര്' visible
  ```

- [ ] **Step 2: Run them and see them fail.** Run: `npx jest __tests__/screens/TodayScreen.test.tsx __tests__/screens/PillEditScreen.test.tsx`.

- [ ] **Step 3: Implement the interfaces above.**

- [ ] **Step 4: Run all JS checks.** Run: `npm test && npx tsc --noEmit && npm run lint`. Expected: pass.

- [ ] **Step 5: Check on the emulator.** Take a photo with the emulator camera and pick one from the gallery. Each shows on the pill page and on Today. Ring the card, and the photo shows on the ringing screen (this finishes Task 6's check).

- [ ] **Step 6: Commit** with `feat: pill photos and bigger text on Today and the pill page, in the chosen language`.

---

### Task 9: Sound, Record and Setup in the chosen language

**Files:**
- Modify: `src/components/SoundRow.tsx`, `src/screens/SoundPickerScreen.tsx`, `RecordScreen.tsx`, `SetupScreen.tsx`, `src/setup/oemSteps.ts`, and the `en`, `ml` and `hi` tables
- Test: `__tests__/screens/SetupScreen.test.tsx`, `RecordScreen.test.tsx`, `__tests__/setup/oemSteps.test.ts`

**Interfaces:**
- Consumes: `useI18n`, `Strings` (Task 7).
- Produces: `stepsFor(manufacturer, t: Strings = en)`, with each step's title and body from `t.setup.steps[key]`. All copy on these screens and in the Android permission prompts they show comes from `t`.

- [ ] **Step 1: Write the failing tests**

  ```ts
  it('shows the Xiaomi steps in Malayalam')    // currentLanguage 'ml', Manufacturer 'Xiaomi' → getByText of the first Xiaomi step's title in ml
  it('shows the Record screen in Hindi')       // currentLanguage 'hi' → getByText of the Record button's text in hi
  ```

- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement the interfaces above.**
- [ ] **Step 4: Run all JS checks.** Run: `npm test && npx tsc --noEmit && npm run lint`. Expected: pass.
- [ ] **Step 5: Commit** with `feat: Sound, Record and Setup in English, Malayalam or Hindi`.

---

### Task 10: Settings screen and Try it

**Files:**
- Create: `src/screens/SettingsScreen.tsx`
- Modify: `src/navigation/RootNavigator.tsx`, `src/screens/TodayScreen.tsx`, `specs/NativeAlarms.ts`, `src/native/alarms.ts`, `bridge/NativeAlarmsModule.kt`, `bridge/SettingsLauncher.kt`, `alarm/TtsVoice.kt`
- Test: `__tests__/screens/SettingsScreen.test.tsx`, `TodayScreen.test.tsx`

**Interfaces:**
- Consumes: `TtsVoice`, `SpeechText`, `DoseRules.spokenAmount` (Tasks 3–4), and the settings bridge (Task 7).
- Produces:
  - `TtsVoice.availability(lang: AppLanguage): VoiceAvailability`, where `enum class VoiceAvailability { FULL, ENGLISH_ONLY, NONE }`. It waits up to 3 s for init.
  - Bridge `tryReadAloud(): Promise<string>` resolves `'spoken' | 'english' | 'none'`. It speaks `SpeechText.parts` for today's first card's due pills, or `Telma 40` with 1 tablet when there are none, at alarm volume. It resolves once speech starts, or with `'none'` at once.
  - `SettingTarget` gains `'tts'`, and `SettingsLauncher` opens `com.android.settings.TTS_SETTINGS`, falling back to App info.
  - Route `Settings: undefined`. Today's `headerRight` is a "⚙" button with `accessibilityLabel={t.settings.title}`.
  - `SettingsScreen`:
    - **Language:** a radio row per `getSettings().languages` entry, with " (draft)" after a draft label. Choosing one calls `useI18n().setLanguage`.
    - **When it rings:** a `Switch` that calls `setReadAloud`, and a "Try it" button.
    - **Text size:** the fixed note.
    - **Reliability:** "Make alarms reliable" opens Setup.
    - A failed save shows "Could not save" and keeps the old value.

- [ ] **Step 1: Write the failing tests**

  ```ts
  it('lists the languages from native, marking drafts')       // getSettings languages [en, ml(draft)] → 'English', 'മലയാളം (draft)'
  it('switches to Malayalam and redraws')                      // press 'മലയാളം (draft)' → setLanguage('ml'); title becomes 'ക്രമീകരണങ്ങൾ'
  it('turns read aloud off')                                   // Switch → setReadAloud(false)
  it('offers voice settings when there is no Malayalam voice') // tryReadAloud → 'english' → Alert with 'Open voice settings' → openSetting('tts')
  it('opens Setup from Make alarms reliable')
  // TodayScreen
  it('opens Settings from the gear')
  ```

- [ ] **Step 2: Run them and see them fail.** Run: `npx jest __tests__/screens/SettingsScreen.test.tsx __tests__/screens/TodayScreen.test.tsx`.
- [ ] **Step 3: Implement the interfaces above.**
- [ ] **Step 4: Run all checks.** Run: `npm test && npx tsc --noEmit && npm run lint && (cd android && ./gradlew :app:testDebugUnitTest :app:assembleDebug)`. Expected: pass.
- [ ] **Step 5: Check on the emulator.** Switch to मलयालम/हिन्दी (draft) in Settings. Today, the pill page and the next ring all change language. Try it speaks, or reports the missing voice.
- [ ] **Step 6: Commit** with `feat: add a Settings screen for language and read aloud, with Try it`.

---

### Task 11: Docs, the full check and the device matrix

**Files:**
- Modify: `README.md`, the PR #6 description (`gh pr edit 6`), `JOURNAL.md`

- [ ] **Step 1: Run every check.** Run `npm test`, `npx tsc --noEmit`, `npm run lint`, `cd android && ./gradlew :app:testDebugUnitTest :app:assembleDebug :app:assembleRelease`. Expected: all pass. Report the counts.
- [ ] **Step 2: Run the spec's emulator checks**, recording each pass or fail with times:
  - A ring with read aloud: sound first, speech after, sound back.
  - Taken during speech.
  - No voice for the language.
  - A ring before the first unlock after `adb reboot`: the photo and the language are right, and the sound plays.
  - The largest text with ten pills.
  - A camera photo and a gallery photo on the ring, on Today and on the pill page.
  - Malayalam on the ring and in the missed notification.
  - A release build lists English only.
- [ ] **Step 3: Run the same checks on the Redmi Note 10** if it is connected (`adb devices`), adding the two spec cases only a real phone can answer: how Malayalam sounds with "Telma 40", and a relative's 10-second recording never being cut. If the phone isn't connected, mark them pending.
- [ ] **Step 4: Update the README.**
  - What the app does now: photos, languages, read aloud, Settings.
  - The draft-language rule.
  - `DEBUG_SETTINGS` in the debug broadcast table.
  - An "Easy for Amma" section in the device matrix with Step 2's results.
- [ ] **Step 5: Commit** with `docs: update README and device matrix for Easy for Amma`. Check that PR #6 is open, push, then update its description: tick the boxes, list deferred items and pending device checks.
- [ ] **Step 6: Add the session's journal entry** in the existing format, commit it with `docs: add session journal for Easy for Amma` and push.
