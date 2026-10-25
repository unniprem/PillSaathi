# Custom-Sound Alarm (Android): Design

Date: 2026-10-24
Branch: `feature/fresh-start`
Status: draft, awaiting approval

## Intent

PillSaathi will become a medication companion. Its first pillar is an alarm
that **always rings, with a personal sound**: a voice the user recorded in the
app or an audio file they imported. Later, a family member will record the
sound for someone else's phone, and pills and doses will build on top of the
alarm. This version covers only the foundation: one person setting alarms on
their own Android phone.

Reliability matters most. The alarm has to behave like the phone's built-in
Clock app: it rings on time, loudly, on the lock screen, in silent mode, after
the app has been swiped away, and after a reboot. **This must hold on all kinds
of Android phones**, including makers whose battery management kills apps
aggressively (Xiaomi/Redmi/POCO, Vivo, Oppo, Realme, OnePlus, Samsung). These
are very common in India, so the app works with them instead of only with
stock Android.

## Goals

- Create, edit, delete, enable and disable **multiple alarms**.
- Each alarm has a **time**, **repeat days** (none means a one-time alarm),
  a **name**, and a **sound**.
- Sounds come from **recording in the app** or **importing an audio file**
  from the phone. Saved sounds form a reusable library: one sound can be used by
  many alarms, and any sound can be previewed before you choose it.
- Ringing behaves like the built-in alarm clock:
  - fires on time with the phone locked, in silent or vibrate mode, with the app
    killed or swiped away, and after a reboot
  - plays at **alarm volume** (silent mode doesn't mute it)
  - shows **full screen over the lock screen**
  - **vibrates**
  - **loops the sound** until the user taps Stop or Snooze
  - **goes quiet automatically after 10 minutes** if nobody responds
  - **Snooze is 10 minutes, with no limit**
  - if the chosen sound is missing or can't be played, it **falls back to the
    phone's default alarm tone** and never stays silent

## Non-goals (this version)

- iOS. The iOS project stays as the template left it. Apple only allows
  alarm-style behaviour through AlarmKit (iOS 26+), so iPhone will be its own
  piece of work later.
- Pills, medicine names, doses, adherence tracking.
- Accounts, login, cloud, sync, Firebase.
- Someone else recording or managing alarms for another person's phone.
- Visual polish, branding, theming. The UI should be clean and simple but plain.
- Gradual volume increase, widgets, multiple languages, editing or trimming
  audio.

## Anti-goals (failure even if it "works")

- **An alarm that silently fails to ring.** If something the app can't control
  might stop alarms (a missing permission, for example), the app must show it
  clearly instead of failing quietly.
- An alarm that rings at notification volume, or that silent mode mutes.
- An alarm that breaks because the user deleted or moved the original audio
  file after importing it.
- Ringing that depends on JavaScript starting up. The sound has to begin even
  if the React Native side is slow to load or crashes.

## Constraints

- React Native **0.88.0**, React 19.3, TypeScript, new architecture (the
  template default), npm. The repo was just reset to a bare
  `@react-native-community/cli` template on `feature/fresh-start`.
- Android: `minSdk 24`, `targetSdk 36`, `compileSdk 37` (template values),
  package `com.pillsaathi`.
- Android only for now, but the JS bundle must still build for iOS. Guard
  Android-only modules so the iOS build doesn't break.
- The app is an alarm clock as Google Play defines it, so it qualifies for
  `USE_EXACT_ALARM` and `USE_FULL_SCREEN_INTENT`.

## What has been decided

### Screens (agreed from the wireframes)

1. **Alarms (home)**: a list of alarms. Each row shows the time, the name, the
   sound name, the repeat days (or "Once"), and an on/off switch. Tap a row to
   edit it; a floating **+** adds an alarm. Empty state: a short prompt to add
   the first alarm.
2. **New / edit alarm**: time picker, repeat-day chips (S M T W T F S),
   name field, and a sound row showing the chosen sound that opens the Sound
   screen. Save and Cancel; editing an existing alarm also offers Delete.
3. **Sound**: two big buttons, **Record** and **Import**, then "Your sounds":
   the saved sounds, each with a ▶ preview, its type (recorded or imported),
   its length, and a radio button to select it.
4. **Record**: tap to start and tap to stop, with a running timer and a live
   level/waveform indicator. Afterwards: Listen, Redo, a Name field, and
   **Use this sound**. Recording stops automatically at **2 minutes**.
5. **Ringing**: full screen with a dark background, showing the large time, the
   alarm name, and the sound name, plus a **Snooze 10 min** button and a large
   **Stop** button.

### How it gets built

These are the agent's calls. The user approved them in conversation.

- **The ringing engine is custom native Kotlin code in the app**, not a
  notification library. Notification libraries (Notifee and similar) play a
  sound once at notification volume and can't reliably loop a user file at
  alarm volume until it's dismissed.
  - Schedule each alarm's next occurrence with
    **`AlarmManager.setAlarmClock()`**, the API the built-in Clock app uses.
    It is exempt from Doze and shows the alarm icon in the status bar.
  - When it fires, a receiver starts a **foreground service** that:
    - plays the sound on loop with `AudioAttributes.USAGE_ALARM`
    - vibrates
    - posts a high-priority notification on an alarm-category channel, with a
      **full-screen intent** to the ringing screen and Stop/Snooze actions
    - auto-silences after 10 minutes
- **The ringing screen is a native Android Activity**, not a React Native
  screen, so the sound, the screen and the Stop/Snooze buttons work without
  starting JS. It follows the layout of wireframe 5. *(Agent's call.)*
- **The native side owns the alarm and sound data.** Native code must be able
  to read alarms and sounds with no JS running, for ringing and for
  rescheduling after a reboot. JS reads and writes through a native module
  (TurboModule) and keeps no separate copy. *(Agent's call.)*
- **Rescheduling.** After an alarm fires, a repeating alarm is rescheduled for
  its next day, and a one-time alarm switches itself off. Every enabled alarm
  is rescheduled on boot (`BOOT_COMPLETED`), on time or time-zone changes, and
  after an app update (`MY_PACKAGE_REPLACED`).
- **Sound files** are copied into the app's private storage. Imports are copied
  in, never referenced in place. Recordings are AAC/m4a. Imports accept common
  audio types: mp3, m4a/aac, wav, ogg.
- **Fallback chain when ringing:** the chosen sound → the phone's default alarm
  tone (`RingtoneManager.TYPE_ALARM`) → a small tone bundled with the app.
- **Permissions** are requested only when needed, each with a one-line reason:
  - microphone, when recording starts
  - notifications (Android 13+), on first launch
  - exact alarms (Android 12 needs a user grant; 13+ gets it through
    `USE_EXACT_ALARM`)
  - full-screen intent (Android 14+, checked with `canUseFullScreenIntent()`)

  If anything alarms depend on is missing, the home screen shows a **warning
  banner** that opens the right settings page. This is the anti-goal guard.
- **Battery-aggressive phones** (user decision: must work on all kinds of
  Android phones):
  - **"Make alarms reliable" setup screen.** It is shown once, after the first
    alarm is saved, and can be reopened from the home warning banner. It detects
    the maker (`Build.MANUFACTURER`) and walks through that maker's steps, each
    with a button that deep-links into the right settings page: Autostart,
    battery optimisation or "unrestricted battery", locking the app in recents,
    and Samsung's sleeping/deep-sleeping apps lists. If a deep link fails, the
    button falls back to the app's own App info page. Per-maker steps follow
    dontkillmyapp.com. Some settings, like Xiaomi Autostart, can't be read
    through any API, so those steps are confirmed by the user ("Done").
  - **Battery optimisation exemption.** The app asks for it (exemption from
    battery optimisation). If Play policy turns out not to allow the direct
    request for this kind of app, it opens the battery-optimisation settings
    list instead. The builder checks the policy when planning.
  - **Banner checks**, on every app open and resume:
    - notifications enabled, and the alarm channel not muted
    - exact-alarm permission
    - full-screen-intent permission
    - battery optimisation (`isIgnoringBatteryOptimizations`)
    - background restriction (`ActivityManager.isBackgroundRestricted`)
    - alarm volume
  - **Self-healing:** every time the app opens, and on boot, all enabled alarms
    are rescheduled. A force-stop by the phone maker cancels them silently, so
    this restores them.
  - **Detecting kills:** each alarm records when it was scheduled and when it
    actually fired. On app open, an alarm whose time passed without firing gets
    a "PillSaathi was stopped by your phone and missed <name>" message, with a
    link to the setup screen.
- **Do Not Disturb:** alarms use the alarm audio usage and the alarm
  notification category, so they ring under Android's default DND settings, as
  the built-in clock does.
- **Overlapping alarms** *(agent's call)*: if an alarm fires while another is
  ringing, the new one waits and starts as soon as the current one is stopped
  or snoozed. Alarms are never dropped.
- **Missed alarms** *(agent's call, following the user's "same as the built-in
  alarm app" rule)*: an alarm counts as missed if it auto-silenced after 10
  minutes, or if its time passed while the phone was off or the clock jumped
  past it. A missed alarm is **never rung late**. Instead the app posts a lasting
  "Missed alarm: <name>, <time>" notification. A one-time alarm that was missed
  switches itself off, and a repeating one just moves on to its next occurrence.
  Ringing late can be revisited when pills arrive.
- **Volume** *(agent's call, same rule)*: the app respects the user's alarm
  volume and never changes it. If alarm volume is at zero or its minimum, the
  home screen warning banner says so. The app doesn't boost or normalise
  recordings.
- **Ringing before the first unlock after a reboot** *(agent's call)*: the
  alarm and sound data the ringing path needs live in device-protected
  (direct-boot) storage, so alarms ring after a reboot even before the phone is
  unlocked, as the built-in Clock does.
- **Deleting a sound that alarms use** *(agent's call)*: deletion is allowed
  after a confirmation that names the affected alarms. Those alarms then use the
  default alarm tone.
- **JS side:** React Navigation (native stack) for the four React Native
  screens, plus TypeScript throughout.

## Left to the builder

- Recording and file-import libraries, or recording natively with
  `MediaRecorder` inside the same Kotlin module. Pick whatever works with
  RN 0.88 and the new architecture and keeps the dependency count low.
- The foreground service type (for example `systemExempted` or
  `mediaPlayback`) and the exact manifest entries. Pick whatever Android 14–16
  allows for an alarm clock app started from an exact alarm.
- How to store data natively (SharedPreferences + JSON, Room, or SQLite).
- Module and folder structure, component breakdown, styling details.
- 12- versus 24-hour display. Follow the phone's setting.
- Behaviour during an active phone call. Do what is sensible and match the
  built-in clock if that's easy.

## How we'll know it works

- Unit tests for the next-occurrence calculation: repeat days, one-time,
  across midnight, across DST and time-zone changes.
- Jest tests for the JS screens' logic.
- A manual test matrix **on real Android phones**, run before calling it done.
  Use at least one stock-Android phone (Pixel, or an emulator for early
  checks) and at least one battery-aggressive phone, preferably Xiaomi/Redmi,
  the most aggressive and the most common in India. Add Vivo/Oppo/Realme/Samsung
  as they become available. Cover Android 12, 13 and 14+ where possible, since
  the permission flows differ. Cases:
  - locked
  - silent mode
  - vibrate mode
  - Do Not Disturb
  - app swiped away
  - after reboot
  - snooze, including repeated snoozes
  - the 10-minute auto-silence
  - a deleted or corrupt sound falling back to the default tone
  - two alarms at the same minute
  - a missing permission showing the warning banner
  - an alarm missed while the phone was off, posting the notification
  - a reboot followed by the alarm time arriving before the first unlock
  - on the aggressive phone: the setup steps done, then swiped away, rebooted
    and left idle overnight, with the alarm still ringing; and the setup steps
    skipped, with the kill detected and reported on the next app open
