# PillSaathi

PillSaathi is an Android alarm app (React Native 0.88) for medicine reminders. Each alarm can play a sound you recorded or imported, and it is built to ring as reliably as the phone's built-in Clock app: with the screen locked, in silent or Do Not Disturb mode, after the app is swiped away, and after a reboot.

Android only for now. The JS bundle still builds for iOS, but the alarm features throw `PillSaathi alarms are Android-only for now`.

## How it is built

- The alarm engine is native Kotlin in `android/app/src/main/java/com/pillsaathi/alarm/`. Alarms are scheduled with `AlarmManager.setAlarmClock()`.
- Everything that rings (`AlarmFireReceiver`, `SystemEventReceiver`, `RingingService`, `RingingActivity`) runs in a separate `:ringing` process, so a React Native or JS crash in the main process can't silence an alarm.
- Alarms, sounds and setup state live in a multi-process-safe file store in device-protected storage, so alarms ring before the first unlock after a reboot.
- Two app-local TurboModules (`specs/NativeAlarms.ts`, `specs/NativeSounds.ts`, native side in `android/app/src/main/java/com/pillsaathi/bridge/`) serve the five screens in `src/screens/`.

The full design is in [`docs/superpowers/specs/2026-10-24-custom-sound-alarm-design.md`](docs/superpowers/specs/2026-10-24-custom-sound-alarm-design.md).

## Run it

You need the [React Native Android environment](https://reactnative.dev/docs/set-up-your-environment) and an emulator or phone.

```sh
npm install
npm start          # Metro, in one terminal
npm run android    # build and install, in another
```

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
cd android && ./gradlew :app:testDebugUnitTest    # JVM tests for the alarm rules and JSON
```

## Debug broadcasts (debug builds only)

`DebugAlarmReceiver` runs in the `:ringing` process and lets adb drive the engine. Watch the result with `adb logcat -s PillSaathiAlarm`. Every command has this shape:

```sh
adb shell am broadcast -a <ACTION> -n com.pillsaathi/.alarm.debug.DebugAlarmReceiver [extras]
```

| Action                                 | Extras                                                                                                                                                                              | Effect                                                              |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `com.pillsaathi.DEBUG_ADD_ALARM`       | `--ei minutes_from_now N` (default 1), `--es name X` (default `Debug`), optional `--es days "1,2"` (ISO 1 = Mon to 7 = Sun; omit for a one-time alarm), optional `--es sound_id ID` | Saves an alarm that fires N minutes from now                        |
| `com.pillsaathi.DEBUG_LIST`            | none                                                                                                                                                                                | Logs every alarm with its next trigger, snooze and last-fired times |
| `com.pillsaathi.DEBUG_STOP`            | none                                                                                                                                                                                | Stops the current ring, as the Stop button does                     |
| `com.pillsaathi.DEBUG_SNOOZE`          | none                                                                                                                                                                                | Snoozes the current ring, as the Snooze button does                 |
| `com.pillsaathi.DEBUG_AUTO_SILENCE_MS` | `--el ms N`                                                                                                                                                                         | Overrides the 10-minute auto-silence for testing; `0` resets it     |
| `com.pillsaathi.DEBUG_STOP_SERVICE`    | none                                                                                                                                                                                | Destroys `RingingService` mid-ring, simulating a system kill        |

Example: `adb shell am broadcast -a com.pillsaathi.DEBUG_ADD_ALARM -n com.pillsaathi/.alarm.debug.DebugAlarmReceiver --ei minutes_from_now 2 --es name Test`

Useful while testing: `adb shell dumpsys alarm | grep -A6 com.pillsaathi`, `adb shell dumpsys activity services com.pillsaathi`, `adb shell dumpsys audio` (look for the `USAGE_ALARM` player), `adb shell am force-stop com.pillsaathi` (simulates an OEM kill).

## Device test matrix

Last run: 2026-10-25, emulator API 34 (`Medium_Phone_API_34`, arm64, Google). Everything marked pass was done with the real app on the emulator. Scheduling a fixed time through the debug receiver was used where the UI would only have added typing; the first alarm (locked case) was created through the UI.

Legend: `[x]` passed, `[ ]` pending (could not be run here).

**Passed on the emulator**

- [x] Locked: screen locked with a PIN, the ring screen showed over the keyguard and played a `USAGE_ALARM` stream.
- [x] Silent mode (set from the volume panel): sound and vibration still played.
- [x] Vibrate mode (set from the volume panel): sound and vibration still played.
- [x] Do Not Disturb (`cmd notification set_dnd priority`): rang normally.
- [x] Swiped from recents: the ring kept playing after both PillSaathi tasks were removed from Recents.
- [x] Reboot (`adb reboot`, and a power-off then cold start): the alarm rang before the first unlock, from the `:ringing` process alone. At that point the default tone's media URI can't be opened, and the engine fell back to the system alarm sound.
- [x] Alarm time reached while powered off: the "Missed alarm: ..., 11:33 AM" notification appeared at boot, before unlock.
- [x] Doze, light idle only (`deviceidle force-idle light`, screen off, app in the restricted standby bucket): rang on time. See "Not run" for deep Doze.
- [x] Snooze three times in a row: re-rang about 10 minutes after each snooze (10:58:58, 11:09:16, 11:19:29), and Stop ended it.
- [x] 10-minute auto-silence, real 10 minutes: the ring stopped by itself and posted a "Missed alarm" notification.
- [x] Corrupt sound: the file was overwritten with `x`, the engine logged `Could not play sound file` and played the default alarm tone. Deleting a sound that an alarm uses also shows "Those alarms will use the default alarm tone".
- [x] Two alarms in the same minute: one rang, the other queued behind it and started when the first was stopped.
- [x] Force-stop kill detection: after `am force-stop` the alarm did not ring, and the next app open showed "PillSaathi was stopped by your phone and missed ..." with a "Fix this" button that opens the setup screen.
- [x] Warning banners: notifications off, alarm notification channel off, full-screen intent denied, background use restricted, alarm volume at minimum, and battery optimization. Tapping a banner opens the matching settings screen.
- [x] Real permission dialogs: notifications at first launch and microphone on the first recording.

**Pending, needs a real device or another image**

- [ ] Xiaomi/Redmi, setup steps done: swipe the app away, reboot, leave idle overnight, and confirm the alarm still rings.
- [ ] Xiaomi/Redmi, setup steps skipped: confirm the kill is detected and reported on the next app open.
- [ ] The other makers' (Vivo, Oppo, Realme, Samsung and others) OEM settings shortcuts. Their component names couldn't be verified, and they fall back to App info.
- [ ] Android 12 exact-alarm grant flow. No API 31 or 32 image is installed. On API 34 the app holds `USE_EXACT_ALARM`, so the exact-alarm banner can't be triggered.
- [ ] Android 13 notification permission flow. No API 33 image is installed (only API 34 and 35). The API 34 flow, which is the same dialog, did pass.
- [ ] Android 16 (API 36) predictive Back on the ringing screen. The code registers an `OnBackInvokedCallback`, but on API 34 Back goes to `onBackPressed`, so the new path is unproven. There is no API 36 image.
- [ ] Level bars on the Record screen with a real microphone signal. The emulator microphone is silent.
- [ ] Deep Doze. The emulator never entered it (`deviceidle` stays at `INACTIVE`, "motion timeout went off and device isn't stationary"), so only light idle was tested.
