# PillSaathi

PillSaathi is an Android medicine reminder (React Native 0.88). You add each pill once: its name, its type (tablet, capsule, syrup or drops), how much to take, the times of day, and for how many days (5, 7, 10, 20, any other number, or no end). Pills due at the same minute ring as **one** alarm that lists every pill and its amount. On the ringing screen you tap **Taken**, **Snooze 10 min** or **Skip this time**, and the app records the dose as taken, skipped or missed. The home screen, **Today**, shows one card per time with its pills, its sound and today's status.

Each time can play a sound you recorded or imported, and it rings as reliably as the phone's built-in Clock app: with the screen locked, in silent or Do Not Disturb mode, after the app is swiped away, and after a reboot.

It is made for elders and the relatives who set it up for them:

- **A photo of each pill**, taken with the phone's camera or chosen from the gallery on the pill page. It shows on the ringing screen (tap it to see it full width), on Today and on the pill page. A pill without one shows an icon for its type.
- **The app in English, Malayalam or Hindi**, chosen in Settings (the ⚙ on Today), or the phone's language by default. Pill names stay as typed, and numbers stay Western (1, ½, 2.5).
- **Pill names read aloud** while it rings, at breaks in the alarm sound: "Time for your medicines. Telma 40, one tablet." Speech waits for a play of the sound to end, so a relative's short recording is never cut off. It plays at alarm volume through silent mode. Settings can turn it off, and **Try it** plays a sample.
- **Bigger text**, and every screen works at the phone's largest text size. On the ringing screen, Taken, Snooze and Skip always stay on screen.

Over time, for the elder and for the relatives who ask "did Amma take her tablets this week?":

- **History** (the 📅 on Today): a month calendar where each day is green (every dose taken), amber (some not taken) or red (none taken), with the month's share of doses taken ("92% taken · 46 of 50 doses", rounded down). Today is outlined, and the arrows go back to the oldest kept record. Tapping a day lists its doses with the pills as they were then, even a pill deleted since. A skipped or missed dose can be marked taken there, and then reads "✓ Taken (marked 26 Oct, 10:15 AM)".
- **Share report**: History's **Share** sends the month on screen, up to today, as plain text through WhatsApp, SMS or email: the doses taken, every dose not taken, and the medicines now with their amounts, times and last days. It is written in the app's language.
- **Tablets left**, optional, for tablets and capsules: a count on the pill page with **+10**, **+15** and **+30** or a typed number (in halves, up to 999). Each Taken lowers it by that dose's amount. When about 5 days are left, unless the course ends first, Today shows a banner ("Telma 40: 9 tablets left · About 4 days. · Add tablets") that opens the pill at its count, and the phone gets one **Refill reminders** notification, and one more at 0. Adding tablets re-arms both. A pill at 0 still rings.

**Draft languages:** Malayalam and Hindi are drafts until someone who reads each language checks them. A release build lists only checked languages (English for now), and a phone set to a hidden language gets English everywhere, the ringing screen included. Debug builds list all three, with "(draft)" after the unchecked ones. Showing a language once it is checked is a one-line change (`LanguageRules.CHECKED` in `AppSettings.kt`).

Android only for now. The JS bundle still builds for iOS, but the alarm features throw `PillSaathi alarms are Android-only for now`.

## How it is built

- The alarm engine is native Kotlin in `android/app/src/main/java/com/pillsaathi/alarm/`. Alarms are scheduled with `AlarmManager.setAlarmClock()`.
- Everything that rings (`AlarmFireReceiver`, `SystemEventReceiver`, `RingingService`, `RingingActivity`) runs in a separate `:ringing` process, so a React Native or JS crash in the main process can't silence an alarm.
- Each distinct pill time is a **time card**: one engine alarm that repeats every day and rings only between the earliest start and the latest last day of its pills. Housekeeping (`DoseRules.planCards`) keeps the cards in step with the pills after every pill change, reconcile and ring end, so courses end on their own. At fire time the engine checks again and doesn't ring a card with nothing due.
- Every dose is recorded natively on the ringing path (`doses.json`, kept 365 days) with a snapshot of its pills, so later edits don't rewrite history. When the phone was off or the app stopped, the next reconcile (or a late fire) records a missed dose for every time a card was due in between (`DoseRules.gapRecords`), so History never looks better than what happened. The pure rules (due pills, cards, records, Today statuses, amount text) live in `DoseRules.kt` with JVM tests.
- Tablet counts live on each pill in the same locked store. A Taken writes the dose first, then lowers the counts in a separate best-effort step, and posts any refill notification after the lock; the rules (days left, the 5-day warning, once per level) are pure Kotlin in `RefillRules.kt`. History reads records through one call, `getHistory(from, to)`; its colours, percentage, month grid and report text are pure TypeScript in `src/lib/history.ts` and `src/lib/report.ts`.
- Pills, cards, records, sounds, photos, settings and setup state live in a multi-process-safe file store in device-protected storage, so alarms ring before the first unlock after a reboot, with the right photo and language. The ringing path reads the language without taking the store lock.
- Read aloud (`ReadAloud`, `ReadAloudRules`, `SpeechText`) drives the alarm player and the phone's text-to-speech through small interfaces, so its timing is JVM-tested with fakes. The sound starts exactly as before, and pauses only once the voice has started.
- Native words use Android string resources (`values-ml`, `values-hi`) through a context in the app's language. JS words are typed tables in `src/i18n/` (`en`, `ml`, `hi`).
- Two app-local TurboModules (`specs/NativeAlarms.ts`, `specs/NativeSounds.ts`, native side in `android/app/src/main/java/com/pillsaathi/bridge/`) serve the eight screens in `src/screens/`: Today, the pill page, History, a day in History, Sound, Record, Setup and Settings.

The designs are in [`docs/superpowers/specs/2026-10-26-history-and-refills-design.md`](docs/superpowers/specs/2026-10-26-history-and-refills-design.md) (History, the report, tablet counts), [`docs/superpowers/specs/2026-10-26-easy-for-amma-design.md`](docs/superpowers/specs/2026-10-26-easy-for-amma-design.md) (photos, languages, read aloud, bigger text), [`docs/superpowers/specs/2026-10-26-pills-and-doses-design.md`](docs/superpowers/specs/2026-10-26-pills-and-doses-design.md) (pills) and [`docs/superpowers/specs/2026-10-24-custom-sound-alarm-design.md`](docs/superpowers/specs/2026-10-24-custom-sound-alarm-design.md) (the alarm engine).

## Run it

You need the [React Native Android environment](https://reactnative.dev/docs/set-up-your-environment) and an emulator or phone.

```sh
npm install
npm start          # Metro, in one terminal
npm run android    # build and install, in another
```

To build an APK to install on a phone without Metro:

```sh
cd android && ./gradlew assembleRelease
```

It writes one APK per CPU type to `android/app/build/outputs/apk/release/`. Share `app-arm64-v8a-release.apk` (about 25 MB), which fits almost every phone from the last several years, or `app-armeabi-v7a-release.apk` for an old 32-bit phone. The x86 ones are for emulators. It is signed with the debug key, so it is for testing only.

Setup gotchas:

- A checkout built before the TurboModules were added needs `rm -rf android/app/.cxx` once. Without it the modules aren't linked and JS sees `null`.
- On an emulator that is low on storage, install only the one ABI:
  `cd android && ./gradlew installDebug -PreactNativeArchitectures=arm64-v8a`
- After a reinstall you can skip the permission dialogs with
  `adb shell pm grant com.pillsaathi android.permission.POST_NOTIFICATIONS` and the same for `android.permission.RECORD_AUDIO`.

## Tests

```sh
npm test                                          # Jest: screens and lib
npx tsc --noEmit && npm run lint                  # types and lint
cd android && ./gradlew :app:testDebugUnitTest    # JVM tests: alarm, dose, refill, language, speech, read-aloud and photo rules, pill input, ring commands, JSON, file store
```

## Debug broadcasts (debug builds only)

`DebugAlarmReceiver` runs in the `:ringing` process and lets adb drive the engine. Watch the result with `adb logcat -s PillSaathiAlarm`. Every command has this shape:

```sh
adb shell am broadcast -a <ACTION> -n com.pillsaathi/.alarm.debug.DebugAlarmReceiver [extras]
```

| Action                                 | Extras                                                                                                                                                                                                                                   | Effect                                                                                                    |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `com.pillsaathi.DEBUG_ADD_PILL`        | `--ei minutes_from_now N` (default 1), `--es name X` (default `Debug pill`), `--es form tablet\|capsule\|syrup\|drops` (default `tablet`), `--ef amount A` (default: the form's), `--ei days N` (0 = no end), `--ez start_tomorrow true`, `--es photo <uuid>.jpg` (a photo already in the store), `--ef remaining N` (tablets left; not counted when absent) | Saves a pill whose one time is N minutes from now; pills at the same minute share one card                |
| `com.pillsaathi.DEBUG_ADD_DOSE`        | `--es date YYYY-MM-DD`, `--ei hour H`, `--ei minute M`, `--es outcome taken\|skipped\|missed`                                                                                                                                          | Records the pills due at that date and time with that outcome (a taken dose is never replaced), for filling History |
| `com.pillsaathi.DEBUG_SETTINGS`        | optional `--es lang en\|ml\|hi\|phone` (`phone` follows the phone's language), optional `--ez read_aloud true\|false`                                                                                                                                  | Changes the app's language and read aloud, and logs the settings and the language the app now speaks      |
| `com.pillsaathi.DEBUG_LIST`            | none                                                                                                                                                                                                                                     | Logs every card with its next trigger, snooze and last-fired times, every pill (with its count), every dose record, and `today()`'s cards |
| `com.pillsaathi.DEBUG_TAKEN`           | optional `--es alarm_id ID`                                                                                                                                                                                                              | Ends whatever rings now and records it taken; with an id, only that card's ring, as the Taken button does |
| `com.pillsaathi.DEBUG_SKIP`            | optional `--es alarm_id ID`                                                                                                                                                                                                              | Ends the ring and records it skipped, like Skip this time                                                 |
| `com.pillsaathi.DEBUG_SNOOZE`          | optional `--es alarm_id ID`                                                                                                                                                                                                              | Snoozes whatever rings now; with an id, only that card's ring                                             |
| `com.pillsaathi.DEBUG_AUTO_SILENCE_MS` | `--el ms N`                                                                                                                                                                                                                              | Overrides the 10-minute auto-silence for testing; `0` resets it                                           |
| `com.pillsaathi.DEBUG_STOP_SERVICE`    | none                                                                                                                                                                                                                                     | Destroys `RingingService` mid-ring, simulating a system kill                                              |

Example: `adb shell am broadcast -a com.pillsaathi.DEBUG_ADD_PILL -n com.pillsaathi/.alarm.debug.DebugAlarmReceiver --ei minutes_from_now 2 --es name Telma --ef amount 0.5`

A name with spaces has to survive two shells: quote it for the device shell too, e.g. `adb shell "am broadcast ... --es name 'Telma 40'"`.

To move the emulator's clock without root (Play Store images): `adb shell cmd alarm set-time <epoch-ms>`, then `adb shell settings put global auto_time 1` to go back.

Useful while testing: `adb shell dumpsys alarm | grep -A6 com.pillsaathi`, `adb shell dumpsys activity services com.pillsaathi`, `adb shell dumpsys audio` (look for the `USAGE_ALARM` player), `adb shell am force-stop com.pillsaathi` (simulates an OEM kill).

## Device test matrix

### History and refills

Last run: 2026-10-27, emulator API 34 (`Medium_Phone_API_34`, arm64, Google Play image). Rings used the debug receiver; History, the day page, the pill page and Today used the real UI. A month was filled by moving the clock back to 25 Sep, adding two pills, returning, and letting reconcile record the gap, then `DEBUG_ADD_DOSE` for the taken and skipped doses.

- [x] Gap: a dose taken, the app force-stopped and the clock moved 2 days on. The next app open recorded one missed dose for each day in between (`recorded 2 missed doses`), showed one missed alert for the card, and posted no notification.
- [x] A gap from 25 Sep to today: 33 and 32 missed doses, one per due time, none on days with nothing due.
- [x] The clock moved 2 days on and back: the missed doses recorded ahead were dropped at the next app open, and today's taken ones kept.
- [x] Calendar: green, amber and red days as recorded, today outlined, later days grey; "92% taken · 49 of 53 doses" (92.45 rounded down). The arrows stop at the oldest kept month and at this month.
- [x] At `font_scale 2.0` the cells stay square with their numbers inside, and the weekday names fit.
- [x] Share into Messages: plain text with its line breaks intact (`PillSaathi · 1–27 Oct 2026`, the four doses not taken, the medicines now). It wasn't sent.
- [x] A day's page: both doses with their pills. Mark as taken read "✓ Taken (marked 27 Oct, 5:31 PM)", and the day turned amber on Back. A pill deleted since still showed on that day from its snapshot.
- [x] Tablets left: +10 on the pill page saved `remaining=10.0`. Taken on the ring lowered 6 → 5 and posted one "Telma 40: 5 tablets left · about 5 days" after the ring ended, none while it rang. The next day's Taken lowered it to 4 with no second notification.
- [x] The same with the app killed (only `:ringing` alive): the count went down and the notification came.
- [x] A pill at 0 still rang, and Taken left it at 0.
- [x] Today's banner ("Iron: 10 tablets left / About 5 days. / Add tablets") opened the pill page at the count, above the keyboard. Adding 30 re-armed the warning (`refillNotified=null`) and the banner went.
- [x] At `font_scale 2.0` the count field and +10, +15, +30 fit, none cut off.
- [x] A release build: History in English.

**Pending, needs a real phone (the Redmi Note 10 was not connected):**

- [ ] Taken lowers the count with the app swiped away (MIUI).
- [ ] The share sheet into WhatsApp, in English and in Malayalam.
- [ ] The calendar at the phone's own text size.

### Easy for Amma

Last run: 2026-10-26, emulator API 34 (`Medium_Phone_API_34`, arm64, Google Play image, Google text-to-speech with an ml-IN voice). Rings used the debug receiver; photos, Settings, Today and the pill page used the real UI. Times are from the fire.

- [x] A ring with read aloud: the tone started 0.6 s after the fire; speech came at the end of the tone's first play (2.1 s), the tone paused once the voice had started, and it resumed from the start after the 6.5 s speech. The next speech came at the first play end 46.5 s later.
- [x] Taken 2 s into a speech: silence at once, the sound did not come back, and no player was left (`dumpsys audio`). Speech plays as `USAGE_ALARM` / `CONTENT_TYPE_SPEECH`.
- [x] Read aloud off (`DEBUG_SETTINGS --ez read_aloud false`): tone only. The Settings switch showed that stored state and turned it back on.
- [x] The engine not ready at the first play end (a cold start takes 1–3 s): that play end is not counted as a speech, and speech comes at the next one (4.5–5 s).
- [x] A ring before the first unlock after `adb reboot` (PIN set, `RUNNING_LOCKED`): the ringing screen showed over the keyguard in Malayalam with the pill's camera photo; the sound played 0.4 s after the fire (the media tone can't be read before unlock, so the cached tone played); on this image speech also worked before unlock.
- [x] The largest text (`font_scale 2.0`) with ten pills: Taken, Snooze and Skip fully visible, the list scrolls, and long names wrap at spaces (the amount goes under the name).
- [x] A gallery photo (a portrait shot stored sideways with EXIF orientation 6, picked through the system photo picker with no permission prompt) was stored upright at 768×1024 and showed upright on the pill page, Today and the ringing screen, and full width when tapped. A camera photo (emulated camera, `-camera-back emulated`) went through the FileProvider and showed on the pill page and Today. Cancelling either pick kept the page as it was.
- [x] Replacing a photo kept the old file while another pill still used it; deleting that pill then deleted the file. (Replacing a photo no other pill uses deletes it too; that case wasn't run on the emulator.)
- [x] Malayalam (chosen in Settings): Settings, Today, the pill page and Try it changed at once; the next ring's screen, notification actions and speech were Malayalam (the English name "Telma 40" in the English voice); an auto-silenced ring posted "നഷ്ടമായി: 9:10 PM, Iron".
- [x] A release build installed over a stored Malayalam choice lists English only in Settings, and the app, the ringing screen, its notification and its speech were all English.

**Observed:** on this emulator (no audio output), the player's reported position is sometimes stale for a second or more (the same value at two looks 0.9–1.4 s apart). Then the looks aimed at play ends miss them, and speech comes at the forced time instead (15 s into the ring, or 60 s after the last speech). The sound keeps playing throughout. A real phone may report the position smoothly; the 10-second recording case below decides it. If a phone shows the same, the fix is to loop the sound in the app (restart on the player's completion event) so each play end is an exact event.

**Pending, needs a real phone (Redmi Note 10 was not connected):**

- [ ] No voice for the app's language: speech in English (covered by a JVM test; the emulator has a Malayalam voice).
- [ ] How Malayalam sounds with "Telma 40": the Malayalam words and the English name each natural, with no long gap at the switch.
- [ ] A relative's 10-second recording: speech always after the recording ends, never in the middle. Watch `adb logcat -s PillSaathiAlarm` for "Read aloud … SPEAK_FROM_START" near 10 s (good) or "SPEAK_AND_RESUME" at 15 s (a missed play end).
- [ ] The delay from speech starting to the sound pausing (the start of the next play is heard until then; 0.15–1 s on the emulator).
- [ ] The camera photo of a real pill strip, taken in portrait, upright everywhere.

### Pills and doses

Last run: 2026-10-26, emulator API 34 (`Medium_Phone_API_34`, arm64, Google Play image). The pill page, Today, Sound and Record cases used the real UI; ring timing used the debug receiver to add pills a minute or two out.

- [x] Two pills at the same minute (added through the pill page) show as one card on Today and ring once, listing both with their amounts ("1 tablet", "½ tablet", "5 ml"). The expanded notification shows one "name · amount" line per pill, with Taken and Snooze.
- [x] Taken records the dose, and Today shows "✓ Taken 7:54 AM".
- [x] Skip this time records SKIPPED.
- [x] Letting the ring auto-silence (20 s override) records MISSED and posts "Missed: 7:06 AM, E".
- [x] Snooze, the re-ring 10 minutes later, then Taken: exactly one record, TAKEN, under the original time.
- [x] A 1-day course: rang and was taken today; with the clock moved to tomorrow 10:00, the card and its system alarm were gone. Moving the clock back recorded nothing and alerted nothing.
- [x] Ten pills in one minute: the list scrolls, and Taken, Snooze and Skip stay on screen.
- [x] A recording set on one card through its sound row: that card's next ring played the recording; the other card kept the default tone.
- [x] Deleting the only pill on a card removed the card and its system alarm; today's record of it stays on Today, not openable.
- [x] Setup opened after the first pill was saved.
- [x] Rings with both app processes killed (`am kill`), and after `adb reboot` with a card 5 minutes out.
- [x] Upgrade from `main`'s plain-alarm build with two plain alarms, one using a recording: at the first reconcile after the install (`MY_PACKAGE_REPLACED`) both alarms and their system alarms were removed, and the recording stayed in the library. This is the spec's rule ("old plain alarms are removed on upgrade… sounds are kept"); an old alarm's sound is not carried over to a later pill at that time.

**Real phone:** Redmi Note 10 (`M2101K7AI`), Android 12 (API 31), MIUI 14.0.5, 2026-10-26. The rings below ran on the debug build, with pills added through the real UI.

- [x] A pill rang at its minute with the default alarm tone (MIUI's `miui_week_ringtone.ogg`), and Taken recorded "✓ Taken 11:22 AM". Fire to sound: 0.3 s.
- [x] A recording made on the phone and set on a card played at that card's ring (0.2 s from the fire), and Taken was recorded.
- [x] Pills, records and the recording survived installing over the app: debug, then release, then a release with one APK per CPU type.
- Observed: MIUI's "clear all" in Recents kills the app's main process (`Killing … OneKeyClean` in the log). Whether a pill still rings after that is the pending Xiaomi case below.

### Alarm engine

Last run: 2026-10-25, before pills (the buttons were Stop and Snooze then; Stop is now Taken or Skip), emulator API 34 (`Medium_Phone_API_34`, arm64, Google). Everything marked pass was done with the real app on the emulator. Scheduling a fixed time through the debug receiver was used where the UI would only have added typing; the first alarm (locked case) was created through the UI.

Legend: `[x]` passed, `[ ]` pending (could not be run here).

**Passed on the emulator**

- [x] Locked: screen locked with a PIN, the ring screen showed over the keyguard and played a `USAGE_ALARM` stream.
- [x] Silent mode (set from the volume panel): sound and vibration still played.
- [x] Vibrate mode (set from the volume panel): sound and vibration still played.
- [x] Do Not Disturb (`cmd notification set_dnd priority`): rang normally.
- [x] Swiped from recents: the ring kept playing after both PillSaathi tasks were removed from Recents.
- [x] Reboot (`adb reboot`, and a power-off then cold start): the alarm rang before the first unlock, from the `:ringing` process alone. At that point the default tone's media URI can't be opened, and the engine fell back to the system alarm sound.
- [x] Alarm time reached while powered off: the "Missed alarm: ..., 11:33 AM" notification appeared at boot, before unlock.
- [x] Doze, light idle only (`deviceidle force-idle light`, screen off): rang on time. See "Pending" for deep Doze.
- [x] Snooze three times in a row: re-rang about 10 minutes after each snooze (10:58:58, 11:09:16, 11:19:29), and Stop ended it.
- [x] 10-minute auto-silence, real 10 minutes: the ring stopped by itself and posted a "Missed alarm" notification.
- [x] Corrupt sound: the file was overwritten with `x`, the engine logged `Could not play sound file` and played the default alarm tone. (The confirmation for deleting a sound that an alarm uses, "Those alarms will use the default alarm tone", is covered by the Jest tests only; it wasn't checked on the emulator.)
- [x] Two alarms in the same minute: one rang, the other queued behind it and started when the first was stopped.
- [x] Double tap on Stop with a second alarm queued (two `input tap`s back to back): the first alarm stopped, and the second started and kept ringing; the ringing screen ignores Stop and Snooze for 1.5 s after one ring replaces another.
- [x] Three alarms in the same minute with a 20 s auto-silence: each rang in turn, each posted "Missed alarm", and all three ended switched off. Opening the app while the second rang left the queued third alone.
- [x] A queued alarm whose stored times were edited by hand to look 20 minutes overdue was left alone by reconciles in both processes while it waited, then rang and was reported missed at its real time. An overdue alarm that wasn't queued was ended and reported missed.
- [x] Force-stop kill detection: after `am force-stop` the alarm did not ring, and the next app open showed "PillSaathi was stopped by your phone and missed ..." with a "Fix this" button that opens the setup screen.
- [x] Warning banners: notifications off, alarm notification channel off, full-screen intent denied, background use restricted, alarm volume at minimum, and battery optimization. Tapping the notifications banner and the alarm-volume banner opened their settings screens; the other banners' links weren't tapped.
- [x] Real permission dialogs: notifications at first launch and microphone on the first recording.

**Observed**

- One ring (screen off, loaded emulator) took about 9 s from the fire to the sound; other rings took 1–4 s. A possible cause is the phone sleeping between the alarm's delivery and the ringing service starting. The ring-start wake lock (`PillSaathi:ring-start`, held from the delivery until the sound plays) was added for that gap. Re-checking the latency on a real device is pending.

**Pending, needs a real device or another image**

- [ ] Fire-to-sound latency with the screen off and the phone idle, now with the ring-start wake lock (see "Observed").

- [ ] Xiaomi/Redmi, setup steps done: swipe the app away, reboot, leave idle overnight, and confirm the alarm still rings.
- [ ] Xiaomi/Redmi, setup steps skipped: confirm the kill is detected and reported on the next app open.
- [ ] The other makers' (Vivo, Oppo, Realme, Samsung and others) OEM settings shortcuts. Their component names couldn't be verified, and they fall back to App info.
- [ ] Android 12 exact-alarm grant flow. No API 31 or 32 image is installed. On API 34 the app holds `USE_EXACT_ALARM`, so the exact-alarm banner can't be triggered.
- [ ] Android 13 notification permission flow. No API 33 image is installed (only API 34 and 35). The API 34 flow, which is the same dialog, did pass.
- [ ] Android 16 (API 36) predictive Back on the ringing screen. The code registers an `OnBackInvokedCallback`, but on API 34 Back goes to `onBackPressed`, so the new path is unproven. There is no API 36 image.
- [ ] Level bars on the Record screen with a real microphone signal. The emulator microphone is silent.
- [ ] Deep Doze. The emulator never entered it (`deviceidle` stays at `INACTIVE`, "motion timeout went off and device isn't stationary"), so only light idle was tested.
