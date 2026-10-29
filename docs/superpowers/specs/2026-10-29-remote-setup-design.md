# Remote Setup (Android): Design

Date: 2026-10-29
Branch: `feature/remote-setup`
Status: written without a question round, at the user's request ("do not
wait for my confirmation to the next stage"). Every decision below not
quoted from the user is marked as my call, for the user to check while
reading.

## Intent

Today a son or daughter sets up the pills on the elder's phone, so they must
be holding it to add a pill, change a time or record their voice for her
alarm. Since stage 1 (Family online, PR #8) a relative can see her day from
his own phone, but he can't change anything.

On 2026-10-29 the user asked: "can the caregiver add pills and alarm sound.
we need to set that up". This is stage 2 of the 2026-10-26 roadmap ("family
sets up from afar").

After this step, from his own phone, the relative can:

- add, change and delete her pills;
- set the alarm sound for each of her dose times, including a recording of
  his own voice.

Her phone picks the change up by itself, and her alarms ring with it.

Names as in stage 1: **the elder** (Amma) and **the relative** (Ravi).

## Goals

1. **Pills from afar.** On his phone, the relative can add a pill to her
   list, edit one, or delete one. He uses the same pill page as on her
   phone, with the same fields: name, form, amount, times, start tomorrow,
   days, tablets left and photo.
2. **Alarm sounds from afar.** For each of her dose times, he can choose:
   - the default tone;
   - one of the sounds already on her phone;
   - one of the sounds on his phone, recorded or imported there.

   Recording uses the existing Record screen.
3. **Her phone applies changes by itself.** It uses the same engine paths a
   change made on her phone uses, so the alarms are rescheduled the same way.
   She doesn't tap anything.
4. **She is told.** Each applied change posts a notification on her phone,
   such as "Ravi added Telma 40 (8:00 AM)".
5. **He sees where each change stands.** Each change shows one of three
   states:
   - "Waiting for Amma's phone", with when her phone was last heard from;
   - "Done at 3:05 PM";
   - "Not done", with the reason.

   He can cancel a change that is still waiting.
6. **He can tell if her phone may not ring.** Her upload reports her
   phone's alarm health, and his screens warn when it is off (see "Her
   phone's alarm health" below).
7. **Her consent.** The Allow prompt says the relative will see *and
   change* her pills. Her Family page has a "Can change my pills" switch
   for each person.
8. **Free.** It runs on the Spark plan, as in stage 1.

## Non-goals (this step)

- **Instant delivery.** Spark has no server code, so nothing can push to
  her phone. Her phone checks in instead (see below).
- Changing her settings: language, read aloud, battery setup.
- Marking her doses taken or skipped, snoozing, or editing her History from
  afar.
- Sounds bigger than 5 MB.
- Merging two relatives' edits field by field. The change applied last
  wins.
- A relative changing pills on a phone that has never linked with Allow.
- iPhone, the web, the Play Store.
- The UI redesign the user asked for next. This step reuses today's
  screens and look.

## Anti-goals (failure even if it "works")

- **An alarm that fails or rings late because of a remote change.**
  - Changes are applied in the main process only, through
    `AlarmEngine.savePill`, `deletePill` and `setCardSound`. Those already
    run housekeeping and scheduling.
  - `:ringing` never touches Firebase, as in stage 1.
  - A sound is set only once its whole file is on her phone and reads as
    audio with a duration. A broken download leaves the card's old sound in
    place, and the default tone stays the fallback.
- **A change applied twice**, such as a pill added twice after a crash or a
  retry.
- **Telling the relative "done" when it isn't**, or "waiting" with no hint
  of why.
- **Anyone changing her pills without her phone allowing it.** This is
  enforced by the security rules, not just the app.
- **Surprising the elder.** A pill or a sound she didn't set up must not
  appear without a notice saying who did it.
- **A bill.**
- **New work for the elder.** Day to day she does nothing new.

## Constraints

- Everything in the stage 1 design's constraints still holds: Android, RN
  0.88, the native engine, Spark (Firestore + Auth only), `asia-south1`, no
  JS in background work, battery-aggressive phones, the public repo, i18n
  in English with Malayalam and Hindi drafts.
- **No push.** A change reaches her phone only when her phone reads it.
- **A Firestore document is at most 1 MiB, and there is no Cloud Storage.**
  Photos and sounds travel as bytes in Firestore documents, split into parts
  when needed.
- **The shared free quota** (50K reads, 20K writes, 20K deletes a day for
  every family together).

## What has been decided

### Decided by the user

- The relative (the user wrote "caregiver") can add pills and set alarm
  sounds from his phone (2026-10-29).
- Free plan only (from stage 1).
- Alarm reliability comes first (from the roadmap).

### How a change travels (my call)

- The relative's phone writes a **change request** under her online copy.
  Her phone is still the only writer of her pills. Her JSON files stay the
  source of truth, as in stage 1. The online copy is still only a copy.
- **Her phone checks in:**
  - when the app comes to the front;
  - at the start of every upload, which already runs after each ring, after
    each change on her phone, and every 6 hours;
  - every hour in the background, as WorkManager work that needs the
    internet;
  - while the app is in front, through a live listener, so a change made
    while someone is with her arrives within seconds.
- **Cost.** A check-in that finds nothing costs one read. That is about 30
  reads a day for each elder, which fits the stage 1 budget.
- **The relative's page explains the delay:** "Amma's phone checks in
  about once an hour, and when an alarm rings. To send it now, ask her to
  open PillSaathi."
- **Order.** Changes are applied in the order they were made (server time).

### What a change holds (my call; field names are the builder's)

- **Kinds:**
  - **Pill:** add or edit, with the full set of fields from the pill page.
    The photo is "keep hers", "none", or a new photo sent with the change.
  - **Delete pill.**
  - **Sound:** for one dose time (hour and minute on her clock). The choice
    is the default tone, one of her sounds by id, or a new sound sent with
    the change (its file, name and duration).
- **Who and when:** the relative's uid and his Google name, plus the time
  it was made.
- **State:** pending, applied or rejected, plus when it was done and, for a
  rejection, why. Only her phone sets these.
- **Applying twice is harmless:**
  - a new pill's id is the change's id;
  - a new sound's id is the change's id;
  - a delete of a pill that's already gone counts as done.
- **Checks on her phone:**
  - A pill change is checked with the same rules as her pill page
    (`PillInputValidator`). A change that fails them is rejected.
  - Editing a pill deleted on her phone is rejected ("deleted on Amma's
    phone").
  - A sound for a time she no longer has is rejected ("Amma has no
    8:00 AM dose now").
- **"Start tomorrow" means the date he meant.** The change carries the
  start date in her calendar, worked out on his phone from her time zone.
  If the change arrives after that date, the pill starts the day it
  arrives. Otherwise an evening "start tomorrow" applied after midnight
  (likely, with phones dozing overnight) would start a day late. An edit
  keeps the pill's start date, as on her phone.
- **Cancel can't race an apply.** Her phone claims a change in a
  transaction (pending → applying) before applying it. Once it is claimed,
  Cancel is refused. A change left "applying" by a crash is applied again
  at the next check-in, which is harmless (the ids above).
- **A change from someone no longer allowed is not applied.** If he was
  switched off or removed while his change waited, her phone marks it not
  done ("not allowed any more").
- **An edit replaces the pill's fields**, as her own pill page does.
  Tablets left follow the existing `remainingChanged` rule, so a page left
  open can't put back an older count.

### Photos and sounds (my call)

- **Files travel in parts.** A file sent with a change is split into parts
  of at most about 700 KB, each its own document. The parts are written
  before the change, so a change never points at missing parts.
- **Photos** are resized on the relative's phone to at most 1024 px, as JPEG
  (about 100 to 250 KB), which is one part.
- **Sounds** go as they are, up to 5 MB, which is at most 8 parts. A
  2-minute recording (the recorder's limit, 128 kbps) is about 1.9 MB, or 3
  parts. A bigger sound is refused on his phone: "This sound is too big to
  send (over 5 MB)."
- **On her phone**, a sound is saved with `SoundLibrary` as an imported
  sound named by the relative (the default is "Ravi's sound"), then checked
  the same way an import is.
- **Cleaning up.** Her phone deletes a change's parts once it has applied
  or rejected it. It also deletes, at a check-in, any parts older than 7
  days with no change waiting for them (from a send that stopped halfway).
  Done and rejected changes are deleted after 7 days.

### Consent and the rules (my call)

- Her online copy gets an **editors list**, a subset of her followers,
  written only by her phone.
- **The Allow prompt** becomes "Let Ravi see and change your pills?", with
  the body "ravi@gmail.com will see your pills and whether you took them,
  and can add or change pills and alarm sounds. You'll get a notice each
  time." Allow adds him to both lists.
- **Her Family page** shows a "Can change my pills" switch next to each
  person. Remove takes him off both lists.
- **People linked before this update** can see but not change until the
  switch is turned on. My reason: they agreed only to seeing. Only test
  links exist so far, so this costs little.
- **Rules:**
  - Creating a change or its parts needs the writer to be one of her
    editors, writing as himself, with state "pending", within the size
    limits.
  - Her phone and her followers can read her changes.
  - Only her phone sets a change's state.
  - Her phone can delete any change. Its maker can delete one only while it
    is pending (Cancel).
  - Only her phone writes the editors list.
- **Not an editor:** his page says "Amma's phone hasn't allowed you to
  change her pills. On her phone: Settings → Family → turn on Can change my
  pills next to your name." The Change button stays visible, so this is
  findable.

### What she sees (my call)

- **A notification for each applied change**, on a new channel "Family:
  changes" with default importance:
  - "Ravi added Telma 40 (8:00 AM, 8:00 PM)."
  - "Ravi changed Telma 40."
  - "Ravi deleted Telma 40."
  - "Ravi set the 8:00 AM alarm sound to Ravi's sound."

  Several changes in one check-in become one notification listing them.
- **No notice for a rejected change.** It didn't change anything.
- **Nothing to tap.** Today shows the result.

### What he sees (my call; layout is the builder's within today's look)

- **Her page (`ElderScreen`)** gets a **Change pills** button.
- It opens **her pills page**:
  - her pills from her copy, and **+ Add pill**;
  - her dose times, each with its sound's name;
  - at the top, changes still waiting (with **Cancel**), then the last 7
    days' done and not-done changes with their reasons;
  - the delay explanation above.
- **A pill, or + Add pill,** opens the usual pill page in a "for Amma" mode.
  The title names her ("Amma's pill"). Save sends a change and returns to
  the list. Delete asks first, then sends a delete. Photos use the same
  camera and gallery picker.
- **A time's sound** opens the usual sound picker in "for Amma" mode, with
  four groups:
  1. Default tone.
  2. Amma's sounds (names only, from her copy).
  3. My sounds (on this phone).
  4. Record new, using the existing Record screen. The recording is saved
     to his sounds and then sent.

  Choosing one sends a change.
- **Times are her clock times.** When their time zones differ, the stage 1
  label "Amma's time" shows on the pill page and her pills page.
- **Waiting changes show over her copy.** A pill with a waiting change says
  "Waiting for Amma's phone" on its row. A waiting new pill shows in the
  list, marked the same way. A waiting delete shows struck through.

### Her phone's alarm health (my call, from the builder check)

A phone whose pills all arrive from afar may never get the battery setup.
Today that screen opens only after the first pill is saved on her own pill
page, and her Today banner needs someone on her phone to tap it. Her
alarms could then fail on a Xiaomi-type phone while he sees "Done".

- **Her upload carries her alarm health**, from the same checks her Today
  banner uses (`HealthChecker`):
  - notifications and the alarm channel on;
  - exact alarms and full-screen alarms allowed;
  - battery optimisation off and the app not restricted;
  - whether the battery setup was ever opened.
- **His side warns** on her card's page and on her pills page when any of
  these is off: "Amma's phone may not ring alarms: battery setup not done.
  On her phone, open PillSaathi and tap the yellow banner." The text names
  the first problem found.
- **Not in this step:** changing her settings from afar, or opening setup
  on her phone by itself. Her Today banner still does that when someone
  opens the app.

### What her upload adds (my call)

- **Each dose time's sound:** its id and name, or the default tone.
- **The names and ids of her sounds** (no audio), so the relative can
  choose one.
- **Her alarm health** (above).

### Background work on her phone (my call)

- The hourly check-in runs only on a phone that shares (it has followers)
  and has at least one editor. It stops when the last editor goes.
- **Applying changes happens under the upload lock** (`ElderSync.lock`), so
  a check-in and an upload never run halfway through each other. Each
  applied change queues an upload, so the relative's view updates.

### Gaps in today's code the build must close (from the builder check)

- `AlarmEngine.savePill` and `SoundLibrary` can't yet save under an id the
  caller chooses, which "applying twice is harmless" needs.
- `setCardSound` works by card, not by dose time, and doesn't queue an
  upload.
- The rule that lets a relative stop following (`removesOnlyHimself`) must
  also let him leave the editors list.

## Left to the builder

- Document paths and field names, and the rule code, within the decisions
  above.
- The native API names, and whether her pills page is a new screen or part
  of her page.
- The part size, as long as a part fits in one document with room to spare.
- How the notification groups several changes.
- How the pill page and sound picker take the "for Amma" mode (route
  params, most likely).
- Translations follow the existing draft-language rule.

## Known risks

- **Delivery delay on battery-aggressive phones.** MIUI and others can
  defer the hourly work, so a pill added for a dose 30 minutes away may miss
  its first ring. The relative's page says it's waiting and how to hurry it.
  His missed-dose checks only cover times her copy already has.
- **Two relatives editing the same pill.** The change applied last wins.
- **The shared quota.** A 5 MB sound costs about 8 writes, 8 reads and 8
  deletes, and briefly 5 MB of the 1 GiB stored. That is fine at expected
  use.
- **A compromised relative account** can change her pills, but only after
  her phone allowed it. She gets a notice for each change, and the switch
  or Remove cuts it off.

## How we'll know it works

- **Rules tests** (Firestore emulator):
  - An editor can create a change and its parts. A follower who isn't an
    editor can't. A stranger can't.
  - Only her phone sets a change's state and writes the editors list.
  - A follower can't add himself to the editors list.
  - The maker can cancel a pending change but not a done one.
  - Size limits hold.
  - Removal cuts access at once.
- **Pure Kotlin tests:**
  - Turning a change into a pill draft, with validation.
  - Apply decisions: a new pill (and the same one again), an edit of a pill
    that's gone, a delete of a pill that's gone, a sound for a time that's
    gone, the default tone, one of her sounds, a new sound.
  - Splitting files into parts and joining them, with a missing part.
  - The notification texts.
  - When she checks in, and when the hourly work stops.
- **Jest:**
  - Her pills page: waiting, done and not-done changes, Cancel, and not an
    editor.
  - The pill page and the sound picker in "for Amma" mode.
  - The switch on her Family page and the new Allow text.
- **Two phones end to end** (emulator as the elder, the Redmi as the
  relative):
  - Add a pill from the Redmi with the elder's app open: it arrives within
    seconds, and it rings at its time.
  - With her app swiped away: it arrives at the next check-in.
  - Record a voice on the Redmi and set it for a time: her alarm rings with
    it.
  - Edit and delete a pill.
  - A non-editor is refused.
  - Cancel a waiting change.
  - Her notifications.
- **Alarm regression:** the alarm checklist passes with changes applied
  while a ring is due, and with Firestore unreachable.
