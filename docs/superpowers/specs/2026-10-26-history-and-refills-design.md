# History and Refills (Android): Design

Date: 2026-10-26
Branch: its own feature branch, after `feature/easy-for-amma` is merged
Status: accepted as a starting point (2026-10-26); to be revised after the current build's testing

## Intent

PillSaathi already records every dose (taken, skipped or missed) for 365
days, with a snapshot of the pills it covered. Today the app only shows
today's doses. This step makes that record useful over time, for the elder
and for the relatives who ask "did Amma take her tablets this week?".

In the user's brainstorm this is stage 4. It comes after stage 3, Easy for
Amma (`docs/superpowers/specs/2026-10-26-easy-for-amma-design.md`). Like
stage 3, it works on the elder's phone alone, with no internet. Relatives
get the information when someone shares a report with them.

It adds three things:

1. **History**: a month calendar of doses, and each day's doses.
2. **Share report**: a plain-text summary for WhatsApp, SMS or email.
3. **Refills**: an optional count of tablets left, with a warning before
   they run out.

The mockups are in `.superpowers/brainstorm/74227-1793018754/content/stages-3-4-screens.html`,
under "Stage 4 · Over time".

## Goals

- **History screen**, opened from a calendar icon (📅) in Today's top bar.
  - One month at a time. Arrows go back to the oldest kept record and
    forward to the current month.
  - At the top: the month's share of doses taken, for example "92% taken ·
    46 of 50 doses".
  - A calendar where each past day is coloured by its doses: all taken, some
    not taken, or none taken. Today is outlined. Days with nothing due are
    left plain, and days after today are greyed.
- **One day's page**, opened by tapping a day. It lists that day's doses by
  time. Each shows its outcome (Taken 8:03, Skipped, Missed) and the pills
  and amounts as they were then. A Skipped or Missed dose offers **Mark as
  taken**, as Today does.
- **Share report**, from History's top bar. It shares the month on screen,
  up to today, as plain text through Android's share sheet. The text has:
  - the date range
  - the doses taken, as a count and a percentage
  - every dose not taken, with its date, time, outcome and pills
  - the medicines now: each pill with its amount and times, and its last day
    or "no end"
- **Refills**, for tablets and capsules.
  - On the pill page, an optional **Tablets left** (or **Capsules left**)
    count, with quick buttons **+10**, **+15** and **+30** and a field to
    type a number. Empty means the pill isn't counted, and that is the
    default.
  - Each Taken lowers the count by that pill's amount. This includes Taken
    on the ringing screen, from the notification, and Mark as taken later.
    A half tablet takes off ½.
  - When about 5 days are left, Today shows a banner: "Telma 40: 9 tablets
    left · about 4 days · Add tablets". Tapping it opens the pill page at
    the count.
  - At 0, the banner says "Telma 40: none left".

## Non-goals (this step)

- Anything sent automatically, or any alert on a relative's phone (stage
  1).
- A PDF report, charts, or a breakdown of each pill over time.
- Counting syrup and drops.
- Expiry dates, ordering from a pharmacy, or a history of refills.
- Editing past records beyond Mark as taken.
- History older than the 365 days already kept.
- A person's name on the report. The app holds one person's pills, and the
  sender knows who it's about.
- iOS.

## Anti-goals (failure even if it "works")

- **History or a report that shows something better than what happened.**
  A dose that wasn't marked taken never shows as taken. A dose that was due
  while the phone was off or the app was stopped counts as missed. It is
  never left out of the count.
- **History that changes when a pill is edited or deleted.** Past days show
  their recorded snapshots.
- **Refills touching the alarm.** A pill with 0 left still rings. Updating
  the count can never delay a ring, block Taken, or lose the dose record.
  The dose record is written first. The count is updated after it, best
  effort.
- **Nagging.** No low-stock warning for a course that ends before the
  tablets run out. The refill banner doesn't repeat as a notification on
  every Taken.

## Constraints

- Everything in the earlier specs still applies (custom-sound alarm, pills
  and doses, Easy for Amma). The dose records, their 365-day keep, and their
  pill snapshots are the source of History.
- Refill counts are part of each pill's data in device-protected storage.
  The `:ringing` process updates them on Taken, inside the same locked
  store.
- All new words (History, the report, refill banners) are translated into
  the stage 3 languages, and amounts use the stage 3 amount texts.
- The report is plain text with no links or attachments, so it reads the
  same in WhatsApp, SMS and email.

## What has been decided

### Decided by the user

- This is stage 4 of the brainstorm: a calendar of taken and missed doses, a
  report for the doctor or family, and a warning before tablets run out. It
  comes after stage 3 and stays offline.

### History (my call)

- **What counts**: taken ÷ every recorded dose (taken, skipped and missed).
  Skipped counts as not taken. Doses still coming up today aren't counted.
- **Day colours**: green when every recorded dose was taken, amber when some
  were, red when none were, and plain when nothing was due.
- **Every missed dose in a gap is recorded (an engine change).** Today, when
  the phone is off for several days or the app is stopped, the next
  reconcile records only one missed dose for each time card: its first
  missed time. Without a fix, the doses after it would have no record, and
  History's count would look better than reality. So reconcile now records
  a missed dose for every time each card was due during the gap, using the
  same due-pill rules and the pills as they are at reconcile. The pills
  can't change during the gap, because opening the app reconciles first.
  - The gap goes back at most the 365 days that records are kept.
  - A day where no pill was due gets no record, so the time between two
    courses stays empty.
  - The missed notification and the alert on opening the app stay one per
    card, so a long gap doesn't flood the phone.
  - This is the pills spec's own definition of missed ("the phone was off or
    the app was killed at the time"), now applied to every dose in the gap.
  With this, History and the report count only records, and a day that had
  doses due always has records.
- **The week starts on the day the phone's settings say.**
- **Mark as taken on an earlier day**: allowed for any day History shows.
  The day's page then says "Taken (marked 26 Oct, 10:15 AM)", so the record
  doesn't look like it was tapped on time.

### Report (my call)

- **The month on screen, up to today**: "1–25 Oct 2026" when today is the
  25th, or the whole month for a past month.
- **Written in the app's language.** Pill names stay as typed.
- **Every not-taken dose is listed**, oldest first, even in a bad month.
- **Example**:

  ```
  PillSaathi · 1–25 Oct 2026
  Taken 46 of 50 doses (92%)

  Not taken:
  • Tue 6 Oct, 9:00 PM: missed (Telma 40)
  • Wed 14 Oct, 8:00 AM: skipped (Telma 40, Vitamin D)

  Medicines now:
  • Telma 40: 1 tablet at 8:00 AM, 9:00 PM, no end
  • Vitamin D: 1 capsule at 8:00 AM, last day Fri 30 Oct
  ```

### Refills (my call)

- **Tablets and capsules only.** Syrup and drops show no count field.
- **The count goes down on Taken only.** Skipped and missed doses don't
  change it. It never goes below 0. Marking a past dose taken lowers it if
  the pill still exists and is counted.
- **Days left** = the count ÷ (the amount × the pill's times per day),
  rounded down.
- **The warning starts at 5 days left or fewer**, but only if the course
  doesn't end before the tablets run out.
- **One notification when a pill first reaches 5 days left, and one when it
  reaches 0**, on a new "Refill reminders" channel at normal importance.
  It's posted after the ring has ended, never during it. Adding tablets
  re-arms both notifications.
- **Editing the amount or times** recalculates days left. Deleting the pill
  drops its count.

## Left to the builder

- **Plan this after stage 3 is merged**, and use stage 3's translation
  mechanism, amount texts and Today top bar as built. Don't plan it against
  guessed stage 3 interfaces.
- Whether History reads records through a new native call (for example,
  records for a date range), and its shape.
- Where the colour, percentage, no-record and days-left rules live. They
  must be pure and tested.
- How the report text is built: on the native side, in TS, or shared.
- Layout details within the mockups.

## How we'll know it works

- **Pure rule tests**:
  - the day colours and the month percentage
  - reconcile after a gap of several days: one missed record per due time,
    none on days with nothing due, and none older than 365 days
  - the report text, including an empty month and a month with only misses
  - days left, the 5-day warning, and the course-ends-first case
  - lowering the count by whole and half tablets, and never below 0
- **Screen tests** (Jest):
  - moving between months, and the bounds at both ends
  - a day's page from a snapshot of a pill deleted since
  - Mark as taken on an earlier day
  - the refill field: the quick buttons, typing a number, clearing it
  - the low-stock banner
- **On the emulator and the Redmi**:
  - Taken on the ring lowers the count, also with the app killed (the
    `:ringing` process alone).
  - Reaching 5 days posts one notification after the ring ends, and later
    Takens don't repeat it.
  - A pill at 0 still rings.
  - With the clock moved two days forward while the app is stopped, the next
    app open records every missed time in between, and shows only one missed
    alert per card.
  - Share opens the share sheet. The text pastes cleanly into WhatsApp, in
    English and in Malayalam.
