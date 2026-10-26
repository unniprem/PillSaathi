# PillSaathi Journal

Session log, newest first.

---

## 2026-10-26 19:17 IST — Session: Next stages brainstorm, Easy for Amma and History designs

### Summary

The build from PR #5 went out for a few days of testing, and the user asked what comes next. Brainstorming with browser mockups laid out four possible stages for elders and their relatives: family can see doses, set up from afar, Easy for Amma, and History over time. The user chose stages 3 and 4 now, in that order, with caregiver features left until the app goes online. A son or daughter sets up the pills on the elder's phone, and the elder answers the rings. Two designs were written, each checked by a fresh builder-review subagent, and accepted as starting points to revise after the testing feedback. No app code changed.

### Changes Made

| Commit    | Type | Description                                                                |
| --------- | ---- | -------------------------------------------------------------------------- |
| `0a78ae5` | docs | Design for Easy for Amma: pill photos, language, read aloud, bigger text   |
| `8e8e001` | docs | Design for History, shared reports and refill counts                       |
| `1579e7f` | docs | Mark both designs as accepted starting points                              |

### Key Decisions

- **Offline stages first**: stages 3 and 4 work on the elder's phone alone. Stages 1 and 2 need internet, sign-in and a server for the first time, so they wait.
- **Easy for Amma before History**: an elder meets it on the first ring, and it changes the ringing screen, the riskiest part, so it should be built and tested early. History only pays off after weeks of records.
- **Speech waits for a break in the sound**: the first speech comes when a play of the sound ends, or after 15 s for a long sound. A relative's short recorded message is never cut off.
- **English-letter pill names use the English voice**: a Malayalam or Hindi voice may read "Telma 40" badly, so speech is built in parts with a language each.
- **Unchecked languages stay hidden**: the branch can merge and APKs can be shared without an elder seeing draft translations. Who checks Malayalam and Hindi is still open.
- **Reconcile records every missed dose in a gap**: today it records only each card's first missed time, so History would overstate adherence after the phone was off for days.

### Issues Encountered

- The builder checks found two real gaps: the read-aloud timing contradicted itself for long sounds, and "no record" days would have blamed the phone between courses. Both were fixed in the designs.
- The Redmi's wireless debugging connection went offline (`adb devices` shows it offline), which ended a log recording left running from the earlier session.

---

## 2026-10-26 16:00 IST — Session: First real phone, smaller APK, pill page top bar

### Summary

The user asked how to test on a real phone, for a standalone build they could install on other phones, for a smaller file, and for Save and Delete at the top of the pill page. A Redmi Note 10 (Android 12, MIUI 14) was already connected over wireless debugging. The debug build went on first, then a release build that carries its own JS bundle. The user's first two pills rang on time (0.3 s and 0.2 s from fire to sound), one with a recording made on the phone, and both recorded Taken. The 64 MB APK was mostly native code for four CPU types. Splitting it per ABI brought the arm64 file to 23 MB. Save and Delete moved into the pill page's top bar.

### Changes Made

| Commit    | Type  | Description                                 |
| --------- | ----- | ------------------------------------------- |
| `f2cb005` | feat  | Save and Delete in the pill page's top bar  |
| `a1fdc14` | build | One APK per CPU type (arm64: 64 MB → 23 MB) |

### Key Decisions

- **Split per ABI instead of dropping CPU types**: all four still build, so the emulator keeps working, and a tester with an old 32-bit phone gets its own file. Code shrinking (R8) would save about 4 MB more, but it can strip classes the native modules reach by reflection, so it waits for a full device retest.
- **Save and Delete in the top bar, not at the top of the page**: the top bar never scrolls, so both stay in reach on a long page. The Save callback is memoised with every field it reads, so the top bar always saves what is on screen (the existing save tests cover it).

### Issues Encountered

- MIUI refuses `adb shell input` ("Injecting to another application requires INJECT_EVENTS permission") unless "USB debugging (Security settings)" is on, so UI checks on the phone need the user's hands. Screenshots and `uiautomator dump` still work.
- MIUI's "clear all" in Recents kills the app (`OneKeyClean`). The swipe-away, reboot and overnight cases are still to be run.

---

## 2026-10-26 08:50 IST — Session: Pills, merged dose alarms and dose records

### Summary

The user asked to execute the latest plan (`docs/superpowers/plans/2026-10-26-pills-and-doses.md`), make sure everything works, fix any issues found, and open a PR. The plan ran inline, task by task, with TDD and a ledger, and ended with one fresh whole-branch review. PillSaathi now manages pills instead of plain alarms. A pill has a name, a type (tablet, capsule, syrup or drops), an amount, 1–6 times and a course length (5/7/10/20 days, any other number, or no end). Every distinct time becomes a _time card_: the engine's existing alarm, repeating daily and ringing only inside its pills' date window. Pills due at the same minute ring once, and the native ringing screen lists each pill and amount. Taken, Skip and Missed are recorded natively with a snapshot of the pills. A Today screen replaces the alarm list, and a pill page replaces the alarm editor. Sound and Record now set a card's sound. Every emulator case passed, including the real UI end to end. The final review found one Important bug, and I promoted one Minor finding to Important. Both were fixed with tests.

### Changes Made

| Commit    | Type | Description                                                                  |
| --------- | ---- | ---------------------------------------------------------------------------- |
| `5361f82` | docs | Design for pills, merged dose alarms and taken records                       |
| `571bf1c` | docs | Implementation plan for pills and doses                                      |
| `d8aca06` | feat | Date windows on alarms so time cards ring only during their pills' courses   |
| `3fe5b08` | feat | Pure pill, time card and dose record rules (`DoseRules`, `PillJson`)         |
| `33f9ff9` | feat | Engine runs pills as merged time cards with Taken, Skip and missed records   |
| `c9fbe05` | feat | Ringing screen and notification list each due pill and its amount            |
| `cf67775` | feat | Amount and course display helpers (TypeScript)                               |
| `3c11243` | feat | Today screen and pill page on a new pill API, replacing plain alarms         |
| `ab62a8b` | docs | README and device matrix for pills                                           |
| `b4e3988` | fix  | Never record a dose against a card that moved on; never re-ring a taken dose |

### Key Decisions

- **A time card is the existing `Alarm` plus a date window**: the reviewed scheduling, queue, recovery, reconcile and missed rules keep working per card unchanged. Pills sit on top and housekeeping (`planCards`) keeps the cards in step after every pill change, reconcile and ring end, so courses end without a daily job.
- **Doses are dated by their occurrence, not the ring's end**: a last-day dose snoozed past midnight still re-rings, lists its pill, and is recorded under the day it was due.
- **Plain alarms are removed on upgrade (spec over plan)**: `MY_PACKAGE_REPLACED` reconciles before any pill can exist, so the plan's "old alarm becomes the card and keeps its sound" can't happen. The spec says plain alarms are removed and sounds kept, and that is what ships and was tested.
- **A dose already taken never rings again**: after a clock set back or a westward time-zone change the same time comes round. Ringing it would ask for a second dose, so a fire over a TAKEN record ends quietly.
- **An early delivery counts as the dose's fire**: a fire inside the 1-minute early tolerance no longer looks "missed" when the card is re-synced mid-ring. Before the fix, that could move the card to tomorrow and record Taken for the wrong day.

### Issues Encountered

- The emulator is a Play Store image without root, so `adb root` + `date` can't move the clock. `adb shell cmd alarm set-time <ms>` does it, and is now in the README.
- `adb shell am broadcast … --es name "Telma 40"` splits at the space on the device shell. Names need quoting for both shells.
- The local `main` ref is stale (the pre-fresh-start app). The upgrade test used `origin/main` (41a50a3).
- The final review (0 Critical, 1 Important, 7 Minor) found the early-fire mis-dating bug. Five Minor findings are deferred and listed in the PR: a sub-second midnight race on a last-day card, corrupt `pills.json` clearing every card, a queued card showing "Ringing now", unchanged cards being re-synced, and removed-id handling in `onFired`.
- Pending on a real device: the Xiaomi and other OEM cases from the earlier matrix still apply to cards.

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
