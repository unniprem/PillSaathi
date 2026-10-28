# Family Online (Android): Design

Date: 2026-10-27
Branch: `feature/family-online`
Status: for the user's review (builder check done 2026-10-28)

## Intent

Today a son or daughter sets up the pills on the elder's phone, and the elder
answers the rings. Once the relative goes home, they can't tell whether the
elder took her pills unless someone shares a History report.

This step puts PillSaathi online for the first time. Then a relative can see
the elder's day on their own phone, and gets a notification when she misses a
dose or a pill is running low. It is stage 1 of the 2026-10-26 roadmap
("family sees doses"). Stage 2 ("family sets up from afar") comes later.

Names used below: **the elder** (Amma) and **the relative** (Ravi). The
elder's phone rings; the relative's phone watches.

Mockups (browser companion, gitignored):

- `.superpowers/brainstorm/24910-1793105792/content/family-shapes.html`: the
  four shapes of "family". This step is #3 with the ping from #2.
- `.superpowers/brainstorm/24910-1793105792/content/link-and-home.html`:
  linking, and home option **B**, which the user chose.

## Goals

1. **Linking, once per relative.**
   - On the elder's phone, **Settings → Family** shows a scan code, the same
     code as 6 digits, and a **Send code** button that opens the share sheet
     with a message saying how to use the code.
   - The code works once, for 15 minutes.
   - On his own phone the relative signs in with Google, then scans the code
     or types the 6 digits.
   - The elder's phone then asks: "Let Ravi (ravi@gmail.com) see your pills
     and whether you took them? Allow / No". Nothing is shared until someone
     taps Allow.
   - The relative then enters what he calls her ("Amma"), optionally her
     phone number for the Call button, and how long after a dose to ping
     him.
2. **Many to many.** Several relatives can follow one elder, and one
   relative can follow several elders.
3. **Who can see.** The elder's Family page always lists who can see her
   pills, each with **Remove**. The relative can also stop following from
   his side.
4. **The relative's home (option B).** It is the same Today screen everyone
   has. Once he follows someone, a **Family** section sits at the top with
   one card per elder: the name he gave her and today's tally, such as
   "2 taken · 1 missed · 1 later", plus a running-low line when one applies.
   His own pills, if any, stay below. There is no mode to choose.
5. **The elder's day on the relative's phone, read-only.** Tapping her card
   opens:
   - her today
   - her History calendar and day pages
   - tablets left and running-low
   - pill photos (small copies)
   - "Last heard from Amma's phone at 2:14 PM"

   He can't change anything.
6. **Missed-dose ping.** At each of the elder's dose times plus the chosen
   delay (30 minutes by default), the relative's phone checks her record and
   notifies him when the dose wasn't taken (rules below). The notification
   has a **Call** button when he gave her number.
7. **Running-low ping.** One notification per pill per level ("low", "out"),
   using the elder's existing rule (`RefillRules.WARN_DAYS`, 5 days), for
   example "Amma's Telma 40: 4 left".
8. **Uploading from the elder's phone.** It uploads her pills (with a small
   photo copy and tablets left), her Taken, Skip and Missed records
   (including the 365 days already on the phone, at first link), and a
   "last heard from" time. This happens whenever she has internet, including
   after a ring with the app swiped away.
9. **Free.** It runs on Firebase's free Spark plan with **no billing
   account attached**, so it can never be billed.

## Non-goals (this step)

- The relative adding, changing or marking pills (stage 2).
- Restoring an elder's pills to a new phone, or any backup.
- Voice recordings or full-size photos online.
- iPhone (all the user's relatives are on Android).
- Anything that needs the paid Blaze plan: Cloud Functions, Cloud Storage,
  phone-number OTP sign-in.
- A loud, ringing alarm on the relative's phone. Pings are ordinary
  notifications with a sound.
- Two elders sharing one phone.
- The elder signing in to anything.
- A web dashboard, the Play Store, or App Check.
- Messages or comments between relatives.

## Anti-goals (failure even if it "works")

- **An alarm that fails, or rings late, because of anything online.**
  - The `:ringing` process never touches Firebase.
  - Ringing, recording a dose and lowering the count never wait on the
    network.
  - A failed sign-in, link or upload never touches alarm data.
  - The JSON files on the elder's phone stay the source of truth. The online
    copy is only a copy.
- **Telling the relative "taken" when it wasn't.** A dose with no uploaded
  record never shows as taken or skipped. It shows as "not reported yet",
  with the last-heard-from time. This matches the History anti-goal.
- **Crying wolf.**
  - A ping never says "hasn't taken" when the truth is "we haven't heard".
    The wording follows what is actually known.
  - No ping for a dose time the elder no longer has.
  - One missed ping per dose and one refill ping per level, never repeated
    by a later check.
- **Anyone seeing an elder's pills without her phone allowing it.** This is
  enforced by Firestore security rules, not just by the app.
- **A bill.** No billing account is attached, and nothing in this step needs
  one.
- **New work for the elder.** Day to day she does nothing new. Linking adds
  one Allow tap.
- **Network code on phones that don't use Family.** A phone that has never
  opened Family never signs in or uploads.

## Constraints

- Android only. React Native 0.88, with the native Kotlin alarm engine as it
  is. Pills, records and alarms live in JSON files through `AlarmStore` /
  `FileStore`, which are shared by the main and `:ringing` processes.
- APKs are shared directly (one per CPU type), signed with the committed
  `android/app/debug.keystore`, so there is one SHA-1 to register for Google
  sign-in.
- **Firebase Spark plan:**
  - Firestore (Standard edition) and Auth (Anonymous + Google) only.
  - The free quota is shared by every family together: 50K reads, 20K
    writes and 20K deletes a day, 1 GiB stored, 10 GiB a month downloaded.
  - Going over doesn't cost anything. Firestore stops answering until the
    daily reset (midnight Pacific time, about 1:30 PM IST, or 12:30 PM IST
    while US daylight saving is on).
  - There is no server code, so everything is the apps plus security rules.
- **Firestore location `asia-south1` (Mumbai).** It is chosen when the
  database is created and can't be changed later.
- **Background work with no JavaScript running.** The elder's upload after
  a ring, and the relative's checks, must work with the app swiped away.
- **Battery-aggressive phones on both sides** (Xiaomi, Vivo, Oppo, Realme,
  Samsung). The relative's checks are as exposed as the elder's alarms.
- **The repo is public.** `google-services.json` holds a Firebase API key.
  By Firebase's design the key isn't a secret, and the rules are what
  protect the data. But anyone who has the key can use up the shared free
  quota.
- **Languages.** Every new text, on both phones, goes through the existing
  i18n (English, with Malayalam and Hindi drafts).
- **Health data.** The Allow tap is the elder's consent, and its text says
  plainly what will be shared. Removing the last relative deletes her online
  copy.

## What has been decided

### Decided by the user

- Firebase, the free plan only. The user doesn't want to pay any money.
- Relatives sign in with Google. The elder never signs in.
- All relatives are on Android.
- Scope: the relative sees the elder's day and gets a missed-dose ping and a
  running-low ping. Setting up from afar comes later.
- Home option **B**: one Today screen, with Family on top.
- Pings are ordinary notifications, not ringing alarms.
- The linking flow from the mockup, with the 30-minute default delay.
- The relative types the 6 digits. A tap-to-open link comes later.

### Where Firebase runs (my call)

- **All Firebase code is native (Kotlin)**, using the Firebase Android SDK
  and a new TurboModule for the screens, the way `NativeAlarms` works today.
  There is no `@react-native-firebase`. The reason: the elder's uploads and
  the relative's checks run with no JS at all, and keeping one Firestore
  client in one place avoids two copies of the same logic.
- **Only the main process uses Firebase.** Firestore's offline cache is
  single-process.
  - When a dose record is written in either process, the change is passed
    to the main process to upload. For example, the `:ringing` process
    sends a broadcast that queues background upload work, which waits for
    internet.
  - Uploads also run on app open, after a pill change, and every few hours
    in the background as a heartbeat for "last heard from".
- **Nothing starts until Family is used.** The elder's phone signs in
  anonymously the first time someone opens Family on it. The relative's
  phone signs in with Google at Add family.

### Linking (my call)

- The elder's phone signs in with Firebase **Anonymous** auth. Its uid is
  the elder's identity online.
- The code is 6 random digits. It is stored online with the elder's id and
  an expiry, used once, and deleted on use or expiry.
- The relative's phone looks up the code, then asks to follow. The elder's
  Family page listens while it is open, shows the request with the
  relative's Google name and email, and on **Allow** adds him as a
  follower.
  - This step is what stops a stranger who guesses a code. The rules can't
    rate-limit guesses without server code.
  - If the two are apart, the elder (or whoever is with her) keeps the page
    open while the relative enters the code, probably on a phone call.
- **Send code shares text, not a link** (the user's call, 2026-10-28):
  "Open PillSaathi, tap Add family, and type 482 913. It works for 15
  minutes." A link that opens the app with the code filled in would need
  web hosting and Android App Links. That's left for later.
- Scanning uses Google's code scanner from Play services, which needs no
  camera permission.

### Online data (my call; shapes are the builder's)

- **Per elder:** her time zone, the "last heard from" time, her current
  pills (name, form, amount, times, start date, days, tablets left), and a
  small copy of each photo (about 256 px, a few tens of KB) kept apart from
  the pills, so it downloads once and is cached.
- **Dose records are grouped one document per month.** A year of History is
  then at most 13 reads, which keeps the shared free quota for many
  families. Rough budget:
  - About 50 reads a day per relative: the live home view, his checks, and
    a History visit.
  - About 15 writes a day per elder.
  - That covers roughly a thousand families on the free plan.
- **Followers** are stored under each elder. The name the relative gives
  her, her phone number and his ping delay stay **on the relative's phone
  only**.
- **The relative's own pills never go online**, unless someone follows him.
  The same app can be both elder and relative.

### The relative's view (my call)

- Her today is built from her uploaded pills and records with the same
  rules her phone uses (`DoseRules`), in **her** time zone, so the statuses
  match.
  - States only her phone knows, ringing and snoozed, show as "not
    reported yet".
  - When the relative is in another time zone, times are labelled "Amma's
    time".
- **Add family** appears at the end of the Family section. On a phone with
  no pills and no family, Today's empty state offers both **Add a pill** and
  **Add family**.
- **Settings → Family** on any phone lists "People who can see my pills"
  and "People I look after", each with Remove.
- He can edit the name, the phone number and the ping delay per elder. The
  delay choices are 15, 30 or 60 minutes, or Off.

### Missed-dose check (my call)

The relative's phone schedules a silent wake-up for each of her dose times
plus his delay, in her time zone, with `setExactAndAllowWhileIdle`. It uses
the app's existing exact-alarm permission, never an alarm clock, and never
rings. At the wake-up:

1. It re-reads her current pills. If that time isn't due today any more (a
   pill changed, ended or was deleted), there's no ping, and the checks are
   rescheduled.
2. It reads that day's record for the time:
   - **Taken or skipped:** nothing.
   - **Missed:** "Amma hasn't taken Azee 500 (2:00 PM)."
   - **No record:** "Amma's phone hasn't reported the 2:00 PM dose (Azee
     500). Last heard from at 1:12 PM." A missing record isn't proof of a
     miss. It may still be ringing or snoozed, or her phone may be offline.
3. If the relative's phone is offline, it retries when the internet comes
   back, for up to 3 hours, then gives up.
4. Each dose pings each relative once at most. Whether a dose was already
   pinged is remembered on his phone. A dose marked taken later gets no
   follow-up.

There are no quiet hours: the elder's dose times are her waking hours.

His phone refreshes her pills, and reschedules its checks, on app open,
after every check, live while the app is open, and every few hours in the
background.

### Running-low ping (my call)

At each check and refresh, his phone runs the elder's `RefillRules` on her
uploaded pills. It posts at most once per pill per level, remembered on his
phone, and the memory resets when her count goes back up, like
`refillNotified` on her side.

### Notifications (my call)

Two new channels with ordinary importance and a sound: "Family: missed
doses" and "Family: running low". **Call** opens the dialer
(`ACTION_DIAL`, no permission). Without a number the button is **Open**.

### Removing and leaving (my call)

- When the elder removes a relative, the rules cut him off at once. His
  phone drops her card and cancels its checks the next time it reads.
- When the relative stops following, his follower entry goes.
- When she has no followers left, by either route, her phone deletes her
  online copy and stops uploading, at its next upload or app open.
- If the elder's app is reinstalled or its data is cleared, she gets a new
  anonymous identity. Her relatives must link again. Their links to the old
  identity still work, but it goes quiet (next section), so they see "not
  heard from" and can remove it. This is a known gap.

### When her phone goes quiet (my call)

The causes are a phone that's off, lost or broken, an app that was
reinstalled, or days without internet. A silent phone may not be ringing
her alarms either, so this needs one clear warning, not a flood.

- While she was last heard from less than **12 hours** ago, the per-dose
  "hasn't reported" pings work as above.
- Once she has been silent for 12 hours, the per-dose pings stop. Each
  relative gets **one** ping: "We haven't heard from Amma's phone since
  8:05 AM yesterday. Her alarms may not be ringing. Please check on her."
  Her card shows "Not heard from since …".
- When her phone is heard from again, everything goes back to normal, and a
  later silence can warn again.
- **Cleaning up an abandoned copy:** once she has been silent for **30
  days**, the rules let any of her followers delete her online copy. The
  last follower to remove her is asked whether to delete it. Otherwise
  nobody could ever delete it, because only her old identity can write it.

### Setup and secrets (my call)

- **A new Firebase project, not the old `pillsathi-dev`** from before the
  fresh start. The old project's config, API key included, is in the public
  repo's history (added in `486a18d`, removed in `6aa40ee`). Its rules let
  any signed-in user read and write everything, and it ran Cloud Functions,
  so it may have a billing account attached. It is also registered for
  `com.pillsaathi`, probably with the same stock React Native debug SHA-1.
  Google lets only one project hold the Android sign-in client for a
  package and SHA-1, so the setup steps start with the user removing the
  `com.pillsaathi` Android app from `pillsathi-dev`, or deleting that
  project. The user hasn't yet said whether anything still uses it.
  Deleting it is their choice.
- The user creates the Firebase project with their own Google account. The
  builder can't, so the plan gives exact steps:
  - Spark plan, no billing.
  - Firestore Standard in `asia-south1`.
  - Turn on the Anonymous and Google sign-in providers.
  - Add the Android app `com.pillsaathi` with the SHA-1 and SHA-256 of
    `android/app/debug.keystore`.
  - Download `google-services.json`.
  - Deploy the rules.
- `google-services.json` stays **out of git** (gitignored), with the steps
  in the README. That makes casual use of the shared quota harder. Nothing
  depends on it being secret.
- `firestore.rules` lives in the repo and is tested against the Firestore
  emulator (local and free).
- **The battery setup screen applies on the relative's phone too**, once he
  follows someone, because his checks depend on it.

## Left to the builder

- The exact Firestore documents, fields and rule code, within the decisions
  above (records grouped by month, access enforced by rules).
- The new native module's API, and how the relative-side screens reuse
  Today, History and the cards with online data.
- WorkManager, a broadcast, or another way to get uploads into the main
  process, as long as `:ringing` never touches Firebase.
- Library versions that work with React Native 0.88 and its Android Gradle
  Plugin: the Firebase BoM, Credential Manager with Google ID, and the code
  scanner.
- Photo copy size and format.
- Layout and words within the mockups. Translations follow the existing
  draft-language rule.
- Measuring the APK size change (expected a few MB per APK).

## Known risks

- **The shared free quota.** Anyone with the public API key, or a bug that
  loops reads, can use it up. Then every family's online view pauses until
  the daily reset, while alarms are unaffected. App Check would fix this but
  needs Play Store distribution, so revisit it with the Play Store.
- **The public debug keystore** means the app's signing SHA-1 is public.
  It's low risk for read-only family data guarded by rules.
- **Late uploads on MIUI and similar phones** can turn a taken dose into a
  "hasn't reported" ping. The wording keeps that honest. The phone checks
  will show how often it happens.
- **The relative's checks can run late** on a battery-aggressive phone that
  wasn't set up.
- **Reinstalling on the elder's phone breaks every link** (above).

## How we'll know it works

- **Rules tests** (Firestore emulator):
  - A stranger reads nothing.
  - A relative reads only elders who allowed him, and writes none of their
    data.
  - Only the elder's phone writes her data.
  - A used or expired code can't be redeemed.
  - Removal cuts access at once.
  - A follower can delete an elder's copy only after 30 days of silence.
- **Pure rule tests** (Kotlin):
  - The check decision: taken, skipped, missed, no record, time no longer
    due, offline retry window, silent for 12 hours (one warning, then
    quiet), heard from again.
  - The notification texts.
  - One ping per dose; refill pings once per level, with reset.
  - Grouping records by month.
  - Dose times in another time zone.
- **Screen tests** (Jest):
  - The Family section and its tally.
  - Add family: signed out, scanning, typing, waiting for Allow, refused,
    expired.
  - The elder's Family page and the Allow prompt.
  - The read-only elder view.
  - Today's empty state with both buttons.
- **Two phones (emulator plus the Redmi), end to end:**
  - Link by scanning and by typing; Allow and No.
  - The elder takes a dose with the app swiped away: the relative sees
    Taken within minutes and gets no ping.
  - The elder lets a ring time out: the relative gets the missed ping at
    +30 minutes, with Call working.
  - Elder in airplane mode: the relative gets the "hasn't reported" ping.
    When she comes back online, her records arrive.
  - Running low posts once.
  - The elder removes the relative: he loses access. With the last one
    removed, her online copy is gone (checked in the console).
  - The relative's checks fire with his app swiped away (Xiaomi).
- **Alarm regression:** the existing alarm checklist passes with Family
  linked, with the phone offline, and with Firestore unreachable. Ringing
  never waits.
- **Free:** the Firebase console shows the Spark plan with no billing
  account.
