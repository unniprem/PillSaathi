# PillSaathi Journal

Session log, newest first.

---

## 2026-10-25 13:16 IST — Session: Fresh start + Android custom-sound alarm

### Summary

The user asked to wipe the old app on a new branch, start fresh on the latest React Native, and then build the first pillar: a simple alarm app where the user records or imports a sound and sets alarms. It must ring like the phone's built-in alarm, loudly through silent mode, and work on all kinds of Android phones, including battery-aggressive brands. Android only for now. The work went through brainstorming with wireframes, then a design spec, an implementation plan, and subagent-driven development with a review after every task. The result is a React Native 0.88 app with a native Kotlin ringing engine, a full-screen ringing screen over the lock screen, recording and importing, five React Native screens, a reliability banner, and a setup screen tailored to each phone brand. The emulator test checklist had 14 passes, 0 failures, and 8 cases pending a real device or another Android version.

### Changes Made

| Commit    | Type  | Description                                                           |
| --------- | ----- | --------------------------------------------------------------------- |
| `6aa40ee` | chore | Replace project with fresh React Native 0.88 app                      |
| `1beb35b` | docs  | Design for Android custom-sound alarm                                 |
| `d8e3988` | docs  | Implementation plan                                                   |
| `57e140a` | feat  | Alarm models, scheduling rules, JSON storage format                   |
| `17f891f` | feat  | Native alarm engine: scheduling, ringing service, reboot handling     |
| `de17003` | fix   | Never ring stale/late deliveries; recover rings that end abnormally   |
| `1f3fb2d` | feat  | Full-screen ringing screen over the lock screen                       |
| `c54402b` | fix   | Block predictive back on the ringing screen                           |
| `520c0e5` | feat  | Run ringing in its own `:ringing` process                             |
| `f527d48` | fix   | Cap the store lock wait so a stuck app process can't silence an alarm |
| `b10e5a6` | feat  | Native sound library: recording, import, preview (`NativeSounds`)     |
| `bca0e77` | feat  | `NativeAlarms` module, health checks, settings links, display helpers |
| `6d17b4e` | fix   | Tested input validator; settle `pickTime` on destroy                  |
| `70adbab` | feat  | Alarm list and alarm editor screens                                   |
| `febe42c` | fix   | Keep the list visible when health/reconcile/setup calls fail          |
| `e52b81b` | feat  | Sound picker and recorder screens                                     |
| `d1fa96f` | fix   | Mic release and take safety across start/save races                   |
| `fd8dc16` | feat  | Reliability banner, maker-specific setup screen, kill detection       |
| `7f4e836` | docs  | README with run instructions and device test matrix                   |
| `72097a6` | fix   | Queued/back-to-back rings reliable; user writes fail loudly           |
| `d676a55` | fix   | Guard the editor before load; say when a change fails                 |
| `cbf14d5` | fix   | Flag a lowered alarm channel; marker read off UI thread; quick boot   |
| `8cd03bf` | docs  | Narrow README test claims; record fix-wave checks                     |

### Key Decisions

- **Native Kotlin ringing engine, not a notification library**: notification libraries play once at notification volume. The engine uses `setAlarmClock()` and a foreground service playing with `USAGE_ALARM` and looping, which is how the built-in Clock behaves.
- **Ringing in a separate `:ringing` process**: in a release build a fatal JS error kills its process. Isolating ringing means a React Native crash can't silence an alarm.
- **Multi-process file store in device-protected storage**: alarms must ring after a reboot before the first unlock, and both processes share data. The store uses a bounded 3 s cross-process lock (ring anyway on timeout) and atomic writes.
- **Missed alarms are never rung late**: this matches the built-in Clock. Instead the app posts a lasting "Missed alarm" notification. The fire-decision rules (RING/STALE/MISSED) enforce it.
- **No direct battery-optimisation exemption request**: Play policy doesn't list alarm apps as an accepted use. The app opens the battery settings list instead, and `setAlarmClock` already fires through Doze.
- **OEM setup screen with user-confirmed steps**: Autostart and similar settings on Xiaomi, Vivo, Oppo and others can't be read through any API. Each deep link falls back to App info.

### Issues Encountered

- The emulator shut down twice on external requests and was restarted. Its low storage needed arm64-only installs.
- The final whole-branch review found cross-task ring-path issues: a double tap could dismiss the next queued alarm, queued alarms could be dropped, there was no wakelock between receiver and service, and failed store writes were swallowed. All were fixed and re-reviewed before the PR.
- Pending real-device checks: Xiaomi/Redmi runs, OEM shortcut names, the Android 12/13 permission flows, API 36 predictive back, the real-mic level bars, deep Doze, and screen-off latency.
