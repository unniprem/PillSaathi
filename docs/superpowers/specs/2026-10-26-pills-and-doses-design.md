# Pills and Doses (Android): Design

Date: 2026-10-26
Branch: `feature/pills-and-doses` (from `main` after PR #3)
Status: draft, awaiting approval

## Intent

PillSaathi's first pillar, a custom-sound alarm that rings like the built-in
Clock, is built and merged. This step puts pills on top of it. The user adds
each medicine once: its name, how much to take each time (half a tablet, one
tablet, 5 ml of syrup), when to take it, and for how many days (a 5-day
antibiotic, a 20-day course, or a BP tablet with no end date). The app then
rings at those times.

The user's key rule is that **pills due at the same time merge into one
alarm**. At 8:00 AM the phone rings once and lists every pill due then with
its amount. It never rings three times for three pills.

When the alarm rings, the user taps **Taken**, and the app records it. The
home screen shows today's doses, card by card, with what was taken, skipped,
or missed.

Plain alarms go away. From this step on, every alarm in the app is a pill
time.

## Goals

- **Add, edit and delete pills.** One page per pill:
  - **Name**, typed.
  - **Type**: Tablet, Capsule, Syrup, or Drops.
  - **How much each time**: a − / + stepper. Tablets go in steps of ½,
    capsules in steps of 1, syrup in steps of 2.5 ml, and drops in steps of 1.
  - **When to remind**: one or more times of day, for example 8:00 AM and
    9:00 PM.
  - **For how long**: 5, 7, 10, or 20 days, "Other…" for any whole number of
    days, or "No end" for a daily medicine.
  - A line under the duration shows when the course starts and when its last
    dose is, for example "Starts today · last dose Fri 30 Oct, 9:00 PM".
- **One alarm per time.** All pills due at the same hour and minute share one
  alarm, called a *time card*. A pill with two times sits on two cards.
- **Courses end on their own.** After a pill's last day it drops off its
  cards. A card left with no pills due on a day doesn't ring that day. A card
  with no pills due ever again disappears.
- **Each card has its own sound**: a recorded or imported sound from the
  existing library, or the default alarm tone. A new card starts on the
  default alarm tone.
- **Ringing screen**:
  - The time, then "Time for your medicines", then every pill due with its
    amount.
  - A big green **Taken** button marks the whole card taken.
  - **Snooze 10 min** works as it does today.
  - A small **Skip this time** link stops the alarm and records a skip.
  - The Stop button goes away.
- **The ringing notification** offers **Taken** and **Snooze**.
- **Every dose is recorded**: taken (with the time tapped), skipped, or
  missed. A dose is missed when the ring went quiet after 10 minutes with no
  answer, or when the phone was off or the app was killed at the time. If a
  dose was snoozed and never answered, it ends as missed too.
- **Today screen (home)** shows one card per time, in time order:
  - Each card shows its time, the pills on it with their amounts, and the
    card's sound.
  - It also shows today's status: **Taken 8:02**, **Skipped**, **Missed**,
    **Snoozed until 8:10**, **Ringing now**, or **Coming up**.
  - Tapping a **Missed** or **Skipped** status offers "Mark as taken". This is
    for when someone took the pill but didn't tap.
  - Tapping a pill row opens that pill's edit page.
  - Tapping the sound row opens the existing Sound screen, and the chosen
    sound applies to that card.
  - A **+ Add pill** button opens a new pill page.
- **Reliability is unchanged.** Everything the custom-sound alarm guarantees
  still holds for every card, on the same native engine. It rings on time,
  through silent mode, on the lock screen, after reboot, and with the app
  killed, and it never rings late.

## Non-goals (this step)

- A history screen. The app stores the records, but this step only shows
  today.
- Family or caregiver features: someone else seeing doses or managing the
  pills.
- Marking each pill on a card separately. Taken covers the whole card.
- Marking a dose taken before its alarm rings.
- Specific weekdays, every-other-day, or "as needed" schedules. Every pill is
  every day, from its start to its end.
- Before or after food, notes, pill photos, stock or refill reminders.
- More than one person on a phone.
- A list of finished courses, or restarting one. To repeat a course, add the
  pill again.
- iOS.
- Plain alarms, with no pill attached.

## Anti-goals (failure even if it "works")

- **A due pill that doesn't ring, or doesn't appear on the ring.** Merging
  must never drop a pill from the alarm or the list. The worst case is the
  user never hearing about a pill.
- **A finished course that keeps ringing**, or a card that rings with nothing
  on it.
- **A daily medicine that silently stops** because a duration was picked by
  default. The user always chooses a duration; nothing is pre-selected.
- **A dose recorded as taken that nobody marked taken.**
- **Any loss of the alarm engine's reliability.** Pills layer on the native
  engine. They don't replace it with notifications, and ringing never depends
  on JavaScript.

## Constraints

- Everything in the custom-sound alarm spec still applies:
  `docs/superpowers/specs/2026-10-24-custom-sound-alarm-design.md`.
  - React Native 0.88, Android only, and the JS bundle must still build for
    iOS.
  - Native Kotlin owns the data, scheduling and ringing.
  - Data lives in device-protected storage, shared by the main and `:ringing`
    processes through the locked file store.
  - Snooze and auto-silence are 10 minutes each, with a 2-minute missed grace.
  - The ringing screen and its buttons are native and work with no React
    Native runtime.
- The ringing screen and notification must get the pill list from native data
  in the `:ringing` process, not from JS.
- Records are written on the ringing path. A write failure there is logged
  and the ring still stops or snoozes: ringing comes first, as it does today.
  A user's change from the app (saving a pill, marking a dose taken later)
  fails loudly, as it does today.
- Times follow the phone's 12/24-hour setting. Dates are local dates in the
  phone's current time zone.

## What has been decided

### Screens (agreed from the mockups)

1. **Today (home)** replaces the alarm list. It keeps the reliability banner
   and the missed-alarm alert on opening the app, and the alert now names the
   pills. It has one card per time and a **+ Add pill** button. With no pills,
   it shows a short prompt to add the first one.
2. **Add / edit pill**: the fields listed under Goals, then Save. When
   editing, it also has Delete, after a confirmation. Save stays disabled
   until the name, at least one time, and a duration are set.
3. **Sound** and **Record** stay as they are. Opened from a card, the chosen
   sound applies to that card.
4. **Setup** (making alarms reliable) stays. It opens after the first pill is
   saved, the way it now opens after the first alarm is saved.
5. **Ringing** (native) as described under Goals.

The alarm editor, repeat-day chips, alarm rows and on/off switches are
removed.

### How it fits the engine

- A **time card is the engine's existing alarm**, one per distinct hour and
  minute used by any pill that hasn't finished. The queue, recovery wakeups,
  reconcile, the missed rules and auto-silence all keep working per card,
  unchanged in spirit. Two cards a few minutes apart, like 8:00 and 8:05,
  ring separately, and the existing queue handles any overlap.
- **The engine keeps cards in step with pills.**
  - Saving or deleting a pill creates any card a new time needs, starting on
    the default sound, and removes cards that no longer have pills.
  - A card's sound survives as long as the card exists.
  - Housekeeping also runs on reconcile (app open, boot, clock change) and
    whenever a ring ends. That's how courses end without a daily job.
- **A card rings only on days when at least one of its pills is due.** A
  card's next ring is the next day, at its time, when a pill on it is due. A
  pill is due on every day from its start date through its last day, or
  forever with "No end". When a ring fires, the engine checks again at fire
  time, so a card whose pills all ended doesn't ring.
- **The ring shows the pills due on that ring's own date and time**, as the
  store has them when the ring starts.
- **Dose records** are kept natively, one per card per day it was due. Each
  record has:
  - the date and the card's time
  - the outcome: taken, skipped or missed, and when it was recorded
  - a snapshot of the pills it covered: their names and amounts

  The snapshot means editing or deleting a pill later doesn't rewrite what
  happened. A snoozed ring and its later ring are the same dose.
- **Old plain alarms are removed** on upgrade by the same housekeeping, since
  no pill uses them. Recorded and imported sounds are kept.

### Course dates (my call)

- A course of N days runs on N calendar days: its start date and the N − 1
  days after it.
- **The start date is today by default.** When adding a pill, the user can
  choose **Today** or **Tomorrow**. This covers adding a pill in the evening
  after today's times have passed.
- If today's times have already passed when a pill is added, those doses
  aren't due. They are never rung and never recorded as missed. A dose is due
  only at a time after the pill was saved.
- Editing a pill keeps its start date. Changing the duration moves the last
  day.
  - If the new last day is today, today's remaining doses still ring, because
    the last day counts in full.
  - If the new last day has already passed, the pill finishes now.
  - To stop a pill straight away, delete it.
- **Changing a pill's times applies right away** (the user's decision). The
  new times count from today, even if a dose of that pill already happened
  today. If a new time is still ahead today, it rings today; the user can tap
  Skip. For example, Telma moved from 8:00 AM to 9:00 PM after the 8:00 dose
  was taken rings again at 9:00 PM tonight.
- A dose never rings for a time that had already passed when that time was
  added to the pill. Editing a pill's name, type or amount doesn't change
  which doses are due. A snoozed dose still re-rings with the edited pill.

### Amounts (my call)

Every amount reads as a number plus a unit, and the same rules apply on the
Today screen, the pill page, the ringing screen and the notification:

| Type    | Steps  | Range      | Default | Shown as                               |
| ------- | ------ | ---------- | ------- | -------------------------------------- |
| Tablet  | ½      | ½ – 10     | 1       | ½ tablet, 1 tablet, 1½ tablets, 2 tablets |
| Capsule | 1      | 1 – 10     | 1       | 1 capsule, 2 capsules                  |
| Syrup   | 2.5 ml | 2.5 – 50   | 5 ml    | 2.5 ml, 5 ml, 7.5 ml, 10 ml            |
| Drops   | 1      | 1 – 30     | 2       | 1 drop, 2 drops                        |

Switching the type resets the amount to that type's default.

### Statuses (my call where marked)

- **Coming up**: the dose is due later today and hasn't rung.
- **Ringing now** / **Snoozed until 8:10**: the dose is in progress.
- **Taken 8:02**, **Skipped**, **Missed**: the dose's record.
- "Mark as taken" from Today changes a Skipped or Missed record to Taken,
  using the time it was tapped. *(My call: it doesn't keep the original
  outcome.)*
- A card where nothing is due today but something is due later (a pill that
  starts tomorrow) says **Next: tomorrow** or **Next: Wed 28 Oct**. *(My
  call.)*
- Each pill row also says where it is in its course, for example "day 2 of
  5", "last day", or nothing for "No end". *(My call.)*

### What Today shows (my call)

Today shows what already happened today as well as what's still coming.

- A card that already has a record today lists the pills that record
  covered, as they were at the time. Any pill added to that card since is
  listed below them as "from tomorrow". This way a pill added at 10:00 never
  shows under "Taken 8:02".
- A card stays on Today for the rest of the day, even after its course ends
  with that dose. A missed last dose can still be marked taken.
- A pill deleted since still shows in that day's record. Its row can't be
  opened.
- A card with no record yet lists the pills due on it now.

### Other choices (my call)

- **Name**: required, trimmed, up to 60 characters.
- **Times per pill**: 1 to 6. The same time can't appear twice on one pill.
- **Today's sort order**: by time. Within a card, pills are listed in the
  order they were added.
- **"Other…" duration**: 1 to 365 days.
- **Deleting a pill whose card is ringing**: if other pills are still on the
  card, the ring carries on. If none are left, the ring stops, the same as
  deleting a ringing alarm does today.
- **The missed-alarm notification and the alert on opening the app** name the
  card's pills, for example "Missed: 8:00 AM, Azithromycin 500, Telma 40".
- **Records are kept for 365 days**, then dropped.

## Left to the builder

- How the pill and record data is stored and split into files, and its JSON
  shape, as long as it lives in the same locked, device-protected store.
- Whether the pill calls go on the existing `NativeAlarms` module or a new
  one.
- Where the amount and course-date rules live, and whether they're shared
  between Kotlin and TypeScript. The table above must hold everywhere.
- Layout details of the Today cards and the pill page, within the agreed
  mockups (`.superpowers/brainstorm/…/pill-flow.html` and `taken.html`).
- How the ringing screen scrolls when many pills are due at once.
- Which existing JS and Kotlin pieces are deleted outright and which are
  reshaped.

## How we'll know it works

- **Pure rule tests** (Kotlin JVM, Jest where the rules live in TS):
  - which pills are due on a date
  - the next ring of a card, skipping days with nothing due
  - course end
  - card creation and removal when pills change
  - the amount formatting table
  - the dose record JSON
- **Screen tests** (Jest):
  - pill page validation, including no pre-selected duration and Save
    disabled until ready
  - Today statuses and "Mark as taken"
  - the sound pick applied to the right card
- **On the emulator**:
  - Two pills at the same minute ring once, with both listed.
  - Taken records the dose, and Today shows it.
  - Skip records a skip.
  - Letting the ring auto-silence shows Missed.
  - Snooze rings again, and the dose resolves once.
  - A 1-day course rings today and not tomorrow (moved forward with the
    emulator clock).
  - Deleting the only pill on a card removes the card and its alarm.
  - Upgrading from a build with plain alarms removes them and keeps the
    sounds.
  - Ringing with the app killed and after a reboot still works for a card.
