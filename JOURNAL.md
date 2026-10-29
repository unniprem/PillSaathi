# PillSaathi Journal

Session log, newest first.

---

## 2026-10-29 15:44 IST — Session: Scan fix and Remote setup (stage 2)

### Summary

The user said "scan didn't work", asked for stage 2, and asked for a todo to redesign the whole UI. They also said not to wait for their confirmation between stages. PR #8 had already merged without the four findings from the morning's real-Firebase check, so all four went into a new branch, `fix/family-scan` (**PR #9**). Scan code did nothing because a sideloaded APK doesn't get Google's scanner module at install, and the failure was swallowed. Stage 2 was then designed, planned and built inline with no question round, every decision marked as Claude's call in the design. A relative can now add, edit and delete the elder's pills and set each dose time's alarm sound (his recording or one of hers) from his own phone. Her phone, still the only writer of her pills, checks in and applies the change through the same engine calls as her own screens, then tells her. Her upload now reports her alarm health, so he is warned when her phone may not ring. Her side was checked on the emulator with a debug hook, including rings on time with a sent sound. The two-phone checks wait for the rules to be deployed and the Redmi to be unlocked. A fresh review found 0 Critical and 4 Important issues; those and 4 re-graded Minors were fixed. `docs/TODO.md` now leads with the UI redesign.

### Changes Made

| Commit    | Type | Description                                                                        |
| --------- | ---- | ---------------------------------------------------------------------------------- |
| `35e805c` | fix  | Fetch Google's scanner (urgent module download) before the first scan; say when it isn't ready (PR #9) |
| `f7ca2fb` | fix  | "No internet" only for OFFLINE; `familyMessage` everywhere (PR #9)                  |
| `5fd66d9` | fix  | Restart the follow-request listeners after an error (PR #9)                         |
| `db74516` | fix  | One upload for changes made offline (`REPLACE`), plus `DEBUG_FAMILY_CHANGED` (PR #9) |
| `6125b84` | docs | Real-Firebase run and the fixes in the device matrix (PR #9)                        |
| `3d9cb41` | docs | Remote setup design (stage 2)                                                       |
| `cfe594d` | docs | Remote setup plan (12 tasks)                                                        |
| `aa303b4` | feat | Engine: pills and sounds under chosen ids, sound by time                            |
| `a4ac015` | feat | Rules: editors, change requests, file parts                                         |
| `ceb36e5` | feat | Pure rules: changes, parts, the apply decision                                      |
| `92535d6` | feat | Upload her card sounds, sound names, alarm health; read them on his phone           |
| `43b54fe` | feat | Allow grants changes; "Can change my pills" switch                                  |
| `55725b8` | feat | Her phone checks in, applies changes, tells her                                     |
| `2dbecef` | feat | His phone sends, lists and cancels changes                                          |
| `4070f5f` | feat | Words for changes and her alarm health                                              |
| `0d43001` | feat | Her pills page on his phone                                                         |
| `bac91ff` | feat | The pill page "for her"                                                             |
| `451f4fd` | feat | Choose or record alarm sounds for her                                               |
| `df532a9` | test | `DEBUG_FAMILY_APPLY`: apply a change on her phone without Firestore                 |
| `1400bfd` | docs | README and "Remote setup" device matrix                                             |
| `4f54f1b` | docs | `docs/TODO.md`, UI redesign next                                                    |
| `ae4e399` | fix  | Review: notice survives a failed check-in; sender named from her own list          |
| `9716846` | fix  | Review: a switched-off or removed relative's waiting changes are marked not done    |
| `080289f` | fix  | Review: deleting her copy deletes changes and parts                                 |
| `9e0ec63` | fix  | Review: listen right after Allow; no check-in can crash the app or stop the upload  |
| `a14e27c` | fix  | Review: "Amma's time" on the pill page; last heard from on her pills page           |

### Key Decisions

- **Change requests, not a second writer.** Spark has no server code to push anything to her phone. So his phone writes requests and her phone, the only writer of her pills, applies them through `savePill`, `deletePill` and `setSoundAt`, the same paths as her own screens. That keeps every alarm-scheduling path as it was, and `:ringing` still never touches Firebase (no Firebase lines in its log at either test ring).
- **Idempotent by id, claimed in a transaction.** A new pill or sound takes the change's id, so a check-in that dies halfway re-applies harmlessly. Claiming (pending → applying) in a transaction stops Cancel racing an apply. Sending the change doc in a transaction stops a "No internet" retry leaving two changes queued offline.
- **Files in parts.** Firestore docs hold 1 MiB and Spark has no Storage, so photos (1024 px) and sounds (up to 5 MB) travel as 700 KB parts, which her phone deletes once used.
- **Her alarm health goes up with her copy** (from the builder check). A phone set up entirely from afar may never get the battery setup, so "Done" alone could hide a phone that won't ring.
- **Consent is a switch per person.** Old links can see but not change until her phone allows it.

### Issues Encountered

- PR #8 had merged mid-morning without the four findings; caught by checking the PR state before pushing.
- The Redmi was locked all session, so Scan code on it and every two-phone stage 2 check are pending. The new rules aren't deployed (Claude Code's auto mode blocks `firebase deploy`).
- Jest: native screens opened by navigation in a test need their event mocks (`onPreviewEnded`, `stopPreview`), or React throws an AggregateError.
- One full Jest run showed a failure that didn't repeat in three later runs.

---

## 2026-10-28 18:46 IST — Session: Family online build

### Summary

The user asked to execute the latest plan (`docs/superpowers/plans/2026-10-28-family-online.md`): PillSaathi's first online step, on Firebase's free Spark plan. It ran inline, task by task, with TDD, a ledger and one fresh whole-branch review at the end, as for stages 3 and 4. A relative links once with a 6-digit code and an Allow tap on the elder's phone. His Today then shows her day, and his phone checks each of her doses after his chosen delay and pings him when a dose was missed, wasn't reported, or her phone went quiet, and when a pill runs low. All decisions are pure Kotlin (`FamilyRules`). The Firebase glue is native, and access is enforced by `firestore.rules`, tested on the emulator. The user's Firebase project (Task 0) wasn't created yet, so nothing ran against real Firebase. Every check that needs it, and the Redmi checks, are pending in the README matrix and the PR.

### Changes Made

| Commit    | Type  | Description                                                                          |
| --------- | ----- | ------------------------------------------------------------------------------------ |
| `5312ff0` | chore | Firebase, sign-in, scanner and WorkManager libraries; the rules test harness          |
| `41c4277` | feat  | Family models and their JSON (`family.json`, Firestore maps)                         |
| `a767363` | feat  | Family rules: codes, months, check times, the ping decision, refill pings            |
| `5e1cb45` | feat  | An elder's today, tally and card from her uploaded data; "Not reported yet" status  |
| `e971efd` | feat  | Firestore rules for family sharing                                                   |
| `4eacc20` | feat  | Uploading the elder's pills and records when someone can see them                    |
| `4ae4343` | feat  | Family module, elder side of linking (codes, QR, requests, followers)                |
| `139bd31` | feat  | Family page and the family code screen                                               |
| `edb87f3` | feat  | Google sign-in, scanning and following in the family module                          |
| `b8fbdaa` | feat  | Add family and the follow form                                                       |
| `af0ee5f` | feat  | Reading the elders' days on the relative's phone; shared `JsMaps`                    |
| `22d4372` | feat  | Family on Today, the elder's page and her read-only History                          |
| `0f204d9` | feat  | Checks and pings from the relative's phone                                           |
| `ba05d62` | fix   | Review fixes: requester identity, safe photo names, serialized uploads, background reads, unreported doses in her History |
| `20dfd51` | docs  | README and device matrix for Family online                                           |

### Key Decisions

- **Family runs native and in the main process only.** The elder's uploads and the relative's checks must run with no JS. The engine's single family call (`FamilyHooks.changed`) reads `family.json` lock-free and sends a broadcast, so `:ringing` never touches Firebase or WorkManager (checked on the emulator: 0 such log lines, alarm on time).
- **Checks refresh before deciding.** Each check first reads her copy afresh, so a dose time she no longer has never pings. The ping key is saved before posting, so a check that runs twice pings once. The relative's phone also reads every 6 hours, which the review showed the spec needs.
- **Honest wording over completeness.** A dose with no uploaded record is "Not reported yet" on her today and in her History, never taken. A card that has never heard from her phone says so instead of "Nothing due today".
- **Rules check identity, not just codes.** The Allow prompt's name and email must match the requester's Google ID token. Otherwise anyone holding a live code could pose as a relative.
- **Library versions held back for Kotlin 2.2.** Firebase BoM 34.19.0 and googleid 1.1.1, because newer ones ship Kotlin 2.4 metadata.

### Issues Encountered

- `npm run test:rules` needs Java 21+ (firebase-tools 15); the Android build uses Java 17, so the README shows `JAVA_HOME=$(/usr/libexec/java_home -v 21+)`.
- Jest tests that unmounted and re-rendered inside one test left later tests rendering nothing; each was split in two.
- The final review (0 Critical, 6 Important, 15 Minor) found a spoofable Allow prompt, server photo names used as file paths, an Allow that times out leaving sharing off, uploads racing Remove, no background refresh, and History days shown green with unreported doses. All six were fixed. Fifteen minors are deferred and listed in the PR.
- Pending: everything that needs the Firebase project (linking, uploads, pings on two emulators) and the Redmi checks (uploads and checks with the app swiped away on MIUI).

---

## 2026-10-27 18:08 IST — Session: History and refills build

### Summary

The user asked to execute the latest plan (`docs/superpowers/plans/2026-10-27-history-and-refills.md`). It ran inline, task by task, with TDD, a ledger and one fresh whole-branch review at the end, as for stage 3.

PillSaathi now has:

- **History:** a month calendar coloured by how each day's doses went, with the month's share taken, and a page for each day where a missed or skipped dose can be marked taken.
- **A share report:** plain text of the month on screen, for WhatsApp, SMS or email.
- **Tablets left (optional):** each Taken lowers it, Today shows a banner when about 5 days are left, and one "Refill reminders" notification is posted per level.
- **Every missed dose in a gap is recorded**, so History never looks better than what happened.

Every emulator case in the plan passed. The three device checks are pending, because the Redmi wasn't connected. The review found no Critical issues and one Important. A Minor about future-dated records was re-graded Important. Both are fixed with tests. PR #7 is open.

### Changes Made

| Commit    | Type | Description                                                         |
| --------- | ---- | ------------------------------------------------------------------- |
| `493b041` | feat | Record every dose missed while the phone was off or the app stopped |
| `7ffcfa5` | feat | Store tablet counts on pills and mark doses taken later as marked   |
| `2a692fa` | feat | Lower tablet counts on Taken and warn once before they run out      |
| `9c4ae99` | feat | Read dose history for a date range from native (`getHistory`)       |
| `2bf4ff6` | feat | Pure calendar rules for History (`src/lib/history.ts`)              |
| `ae82f35` | feat | Plain-text dose report for a month (`src/lib/report.ts`)            |
| `b6585c0` | feat | History calendar with a shareable monthly report                    |
| `b4686ac` | feat | One day's doses in History, with Mark as taken                      |
| `dcf247b` | feat | Tablets left on the pill page and a running-low banner on Today     |
| `30b3ce2` | fix  | Read History again on Share and when the app comes back (review)    |
| `00db7ca` | fix  | Drop missed doses a clock moved back left in the future (review)    |
| `b407596` | docs | README and device matrix for History and refills                    |

### Key Decisions

- **Counts never touch the alarm.** The dose is written first. The count is lowered in its own best-effort step, and only when that write made the dose taken, so Mark as taken followed by the notification's Taken lowers it once. A refill notice is posted after the lock, once the ring has ended. A pill at 0 still rings, as checked on the emulator.
- **A pill page left open can't put an old count back.** It sends the count as changed only once it is touched. On the native side, `RefillRules.savedCount` keeps the stored count otherwise.
- **History asks for the whole month.** It drops records after native's "today", re-reads on Share, and re-reads when the app comes back. A report can never leave out a dose recorded since the screen was opened.
- **Future-dated missed doses are dropped by date, not by time.** A clock moved back can leave them. Dropping by date means a skip a few seconds before its time is never lost.
- **The banner opens the pill page at the count, above the keyboard.** The edge-to-edge window doesn't shrink for the keyboard, so the page makes room below its content and scrolls the count up, a frame later. Android ignored a scroll made during the resize.
- **Plan defects were settled for the spec, not guessed.**
  - The emulator step for the LOW notice used 6 tablets, not 11: at one dose a day, 10 left is more than 5 days.
  - The leap-February row and the report example's 46-of-50 were corrected to what's true.

### Issues Encountered

- `DEBUG_ADD_PILL` can only start a pill today. To fill a month, the clock was moved back to 25 Sep, two pills were added, and the gap reconcile recorded the misses. `DEBUG_ADD_DOSE` then turned most of them into taken or skipped doses.
- One History test unmounted and re-rendered inside the test, which left later renders empty (the same trap as stage 3). It became `it.each`.
- A test mock returned a whole month to the day page, which native never does. That caused duplicate-key warnings until the mock honoured its range.
- Android's emoji font draws 📅 as a page reading "July 17". It was kept as the plan's icon and flagged in the PR.
- Deferred minors from the review, left for the user to decide:
  - "999.5" passes the page's check but native refuses it.
  - Mark as taken's refill notice isn't wrapped in a try/catch.
  - +10/+15/+30 add to the count as loaded.
  - A refill notice can sound just as a queued ring starts.
  - Share has no disabled look while loading.
  - One log line wrongly says reconcile will repair a lost count.
- Pending on the Redmi Note 10: Taken with the app swiped away (MIUI), sharing into WhatsApp in English and Malayalam, and the calendar at the phone's text size.

---

## 2026-10-26 21:57 IST — Session: Easy for Amma build

### Summary

The user asked to execute the latest plan (`docs/superpowers/plans/2026-10-26-easy-for-amma.md`). It ran inline, task by task, with TDD, a ledger and one fresh whole-branch review at the end. PillSaathi now has a photo per pill (camera or gallery, no new permissions), shown on the ringing screen, Today and the pill page. The app speaks English, Malayalam or Hindi, chosen in a new Settings screen. Malayalam and Hindi are drafts, hidden in release builds. While a card rings, the phone reads its pills aloud at breaks in the alarm sound. Text is bigger, and every screen works at the largest text size. Every emulator case in the plan passed except one, which needs a real phone (the Redmi wasn't connected). The review found no Critical issues and two Important ones, both fixed with tests. A last sanity ring found that the emulator's player position can be stale, which is now the main open question for the phone check.

### Changes Made

| Commit    | Type | Description                                                                         |
| --------- | ---- | ----------------------------------------------------------------------------------- |
| `ffbbe77` | feat | Language and read-aloud settings in the store; lock-free language read for the ring |
| `687d4e4` | feat | Ringing screen and notifications in English, Malayalam or Hindi                     |
| `8db5606` | feat | Spoken pill list in parts, each in its own voice; half tablets in words             |
| `e5707cf` | feat | Read aloud at breaks in the alarm sound (`ReadAloud`, `TtsVoice`)                    |
| `5400040` | feat | One photo per pill: storage, camera and gallery picks, cleanup                      |
| `c176a09` | feat | Photos and icons on the ringing screen; buttons stay visible at large text          |
| `db59e84` | feat | JS copy in three languages and the language setting (`src/i18n/`)                   |
| `ce07670` | feat | Today and the pill page with photos, bigger text and the chosen language            |
| `d5aab17` | feat | Sound, Record and Setup in the chosen language                                      |
| `c0fde2c` | feat | Settings screen with Try it                                                         |
| `7479e92` | fix  | Catch a play end when the looping player's position jumps past it                   |
| `275aec6` | docs | README and device matrix for Easy for Amma                                          |
| `74be4ef` | fix  | Count a ring's first look just past the loop point as a play end (review)           |
| `55ce72f` | fix  | Read the app language again when the app comes back (review)                        |
| `f2c7155` | docs | Note the emulator's stale player position and what the phone check decides          |

### Key Decisions

- **The sound starts exactly as before, and speech only pauses it once the voice has started**: a slow, missing or locked-out speech engine can never silence an alarm. A voice that isn't ready yet doesn't count as a speech, so the next play end tries again instead of waiting 45 s (found on the emulator: the engine takes 1–3 s to start).
- **No voice for the app's language means the whole speech in English**, not Malayalam text read by an English voice. The ring carries both versions (spec over plan).
- **The ringing path reads the language without the store lock** (`FileStore.peek`), so a slow lock can't delay a ring. The JS reads the same value synchronously at start and on every return to the foreground, so the app and the next ring always agree.
- **Unchecked languages are hidden in release builds**: checked on the emulator by installing a release build over a stored Malayalam choice. The app, ring, notification and speech all came out English.
- **Photos live in device-protected storage under UUID names**: a ring before the first unlock shows them (checked with a PIN after `adb reboot`), and a photo name can never be a path.
- **At large text the ringing row puts the amount under the name**: at font scale 2.0 a name next to "1 capsule" broke mid-word.

### Issues Encountered

- The emulator's camera was set to the Mac's webcam and gave no frames; it was restarted with `-camera-back emulated` for the camera check. A pushed test photo stayed `is_pending` until a media scan broadcast.
- The player's reported position stalls and jumps around the loop point, and on a fresh emulator boot it was stale for over a second at a time. Two fixes now catch the jump. A stale position still makes speech miss play ends and wait for the forced 15 s. Whether a real phone does this is the open question for the Redmi (a 10-second recording). If it does, the fix is to loop the sound in the app, which needs the user's decision.
- One i18n test rendered the app twice with a manual unmount, which left the next test's render empty. It was split in two.
- The emulator shut down once mid-check and was restarted.
- Pending on the Redmi Note 10: the 10-second recording, the delay from speech starting to the sound pausing, Malayalam with "Telma 40", no voice for the language, and a real portrait photo.

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
