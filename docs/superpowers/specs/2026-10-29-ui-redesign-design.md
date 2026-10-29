# UI Redesign (Sky): Design

Date: 2026-10-29
Branch: `feature/ui-redesign`
Status: decided screen by screen with the user in the browser mockups. What
the user picked is marked as theirs. Everything else is marked as my call,
for the user to check while reading.

Mockups: `docs/superpowers/specs/2026-10-29-ui-redesign-mockups/` (open the
`.html` files in a browser). **`10-journeys.html` is the newest and wins
where pages differ**: both phones' full journeys from the login page, with
the final icons (Material Symbols). Pages `01`–`09` were the screen-by-screen
choices, drawn earlier with placeholder line icons. `01-today.html` shows
three looks; **Sky** (the left one) is the one chosen. On the other pages, A
or B is named below. Screens are referred to by their journey numbers (E1–E14
on her phone, C1–C11 on the relative's).

Names as in the earlier stages: **the elder** (Amma), who answers the rings,
and **the relative** (Ravi), who sets up and checks from afar.

## Intent

On 2026-10-29 the user asked to "redesign the whole UI, with much clear and
simple way", deciding screen by screen. The first round of mockups
(plain, wireframe-like) was turned down: "didnt like all three perhaps much
more nice UI". The user wants the app to look **nice**, not just tidy, and
picked the warmest, most finished look of the second round.

The app works. This step changes how it looks and how the screens are laid
out, so that:

- the elder sees, at a glance, what to take next and whether she missed
  anything;
- the relative can set things up without getting lost, and sees her day
  first;
- every screen feels like one app, friendly rather than clinical.

## Goals

- Every screen in the **Sky** look (below), with the same header, cards,
  buttons, icons and font.
- A login page on every phone. Her phone logs in with her Google account
  too (the user: "amma will have account").
- Today leads with the next dose, then anything missed.
- Adding a pill becomes five short steps. Opening a pill shows a summary.
- Bottom tabs with words: Today, History, Family, Settings.
- The ringing screen gets the same look and clearer buttons, and stays as
  reliable as it is.
- The 📅 icon that Android draws as "July 17" is gone, along with every
  other emoji used as an icon.

## Non-goals

- No change to how alarms are scheduled, rung, snoozed or recorded, or to
  the native engine and the `:ringing` process (beyond the ringing screen's
  layout, drawables and strings).
- No change to Firebase, the rules, what is uploaded, or how changes from
  afar travel, except how her phone logs in (below).
- No new data fields (my call; this is why pill colours are derived, below).
- No dark mode (my call; the app has none today).
- No iPhone work.

## Anti-goals (failure even if it "works")

- An alarm that fails, or the ringing screen depending on JS.
- Text the elder can't read: small, low-contrast, or clipped when the
  phone's text size is turned up.
- An action the elder needs that is hidden behind a gesture or an icon with
  no word.
- A look that reads as a template or a hospital form, which is what the
  first round was turned down for.

## Constraints

- Android first, React Native 0.88. The ringing screen is native XML in
  `:ringing`, without JS. It must stay that way.
- The app follows the phone's text size, and must still lay out at the
  largest text sizes (scroll, never clip), on 360 dp-wide phones.
- English, Malayalam and Hindi keep the same keys. New or changed words get
  Malayalam and Hindi drafts, marked as draft as today, because the
  translations still await a checker.
- Text colours must reach 4.5:1 contrast on their background. The mockup's
  coral and amber may need darker shades for text (the builder's call).
- Free Firebase plan only (unchanged).
- Existing behaviour tests are updated to the new screens, not deleted.

## The Sky look (the user's pick: "sky")

From `01-today.html`, left.

- **Font:** Nunito, bundled with the app (my call to bundle; it is free
  under the OFL). Malayalam and Hindi fall back to the phone's own fonts.
  The ringing screen uses the same font from `res/font`.
- **Colours** (tokens; the builder may tune shades for contrast):
  - navy text `#15324A`, muted text `#6B7F90`, page `#F5F8FB`, cards white;
  - blue for actions `#2A7BB8` (tint `#E3F1FB`);
  - green for taken `#2E9E5B` (tint `#E5F5EC`);
  - coral for missed and delete `#E0533D` (tint `#FFF0EC`);
  - amber for warnings and running low `#A86A10` (tint `#FFF3D6`).
- **Sky header:** a gradient sky that follows the clock. On Today it is tall,
  with a sun or moon and soft clouds or stars. Inner pages get a short sky
  band with a round back button and the title. Times (my call): dawn
  5:00–8:00, day 8:00–17:00, evening 17:00–19:00, night 19:00–5:00.
- **Cards:** white, large rounded corners (about 22–26), soft shadow.
  Section labels are small blue capitals.
- **Buttons:** big, rounded, full words. Primary is blue (green for "I took
  it", coral for "I took it" on a missed dose). Secondary is white with a
  border.
- **Icons:** Google's **Material Symbols Rounded**, as an icon font, filled
  (outlined for tabs that aren't selected), as in `10-journeys.html`. The
  user asked for "good icons" and "do not use svgs", so **no SVG anywhere**.
  The same font file serves the app and the native ringing screen (it is
  free under the Apache licence). Icons always have a word beside or under
  them. No emoji as icons.
- **Pill pictures:** her photo when the pill has one. Without a photo, a
  shape by type, built from plain rounded views: tablet (round, with a score
  line), capsule (two-tone, tilted), oval; syrup and drops use the
  `medication_liquid` and `water_drop` symbols. Its colour comes from a fixed
  palette, picked by the pill's name, so it stays the same everywhere (my
  call; there is no colour field and none is added).
- **No SVG** also means the sun, moon, clouds and stars are rounded views and
  gradients. The QR code is already an image from the native side.
- **People:** a round letter avatar with a gradient picked from the name
  (my call).
- **Bottom tabs:** a floating white bar with four tabs, icon and word each:
  Today, History, Family, Settings. The current tab gets a blue pill shape
  behind it.

## Screen by screen

### First open: login, who the phone is for, alarm setup (the user: "login page missing", "amma will have account", "move on")

Mockup `10-journeys.html`, E1–E4 and C1–C3. Shown once, on every phone,
before Today.

1. **Login page (E1, C1):** full sunrise sky, the app's logo (a capsule on a
   white rounded tile), "PillSaathi", "Your medicines on time. Your family
   close by." A white sheet below holds the three language tiles (each in
   its own script; choosing one switches the page at once), "Welcome", "Log
   in to keep your pills safe and stay close to family.", one big **Continue
   with Google**, and "One tap. No new password."
2. **Account picker (E2, C2):** Android's own Google account sheet (Credential
   Manager). The phone already holds the account, so it is one tap.
3. **Who is this phone for? (E3, C3):** a morning sky with "Hi Kamala!" (the
   Google first name), two big choices, "I take medicines" and "I look after
   someone", the line "You can do both later. Anyone can add their own pills
   or add family.", and Continue. The choice only picks the next screen and
   is kept as a local setting (my call); both kinds of phone get the same
   app.
4. Then:
   - **I take medicines → alarm setup once (E4):** today's setup steps, as
     in Alarm setup below, with "Do this later". Then Today, empty (E5).
   - **I look after someone → Add family (C4)**, with "Skip for now" to
     Today.

**Under the hood (the user's decision; how is my call):**

- Today her phone logs in to Firebase anonymously, and that login's id is
  her id online (`FamilyCloud.elderUid()`; the rules check `isUser(e)`).
  With this step, **her phone logs in with her Google account**.
- On a phone that already has the app (the testers'), the anonymous login is
  **linked** to her Google account, not replaced, so her id, her online copy
  and the family who follow her all stay. The login page shows once after
  the update.
- The same Google login also serves as the phone's relative identity, when
  that phone looks after someone. Today a relative logs in with Google
  inside Add family; that moves to the login page.
- **Alarms never wait for the login** (my call, because alarm reliability
  comes first). If there is no internet at first open, the login page offers
  "Continue offline": pills and alarms work, Family waits, and the login page
  comes back once the phone is online.
- If the account is already the elder on another phone (a new phone), this
  phone asks before taking over as her phone. Bringing her pills across is
  out of scope (my call).
- The rules keep their checks. The Allow prompt still checks the relative's
  Google name and email. A rules change is needed only if the builder finds
  a check that assumes her login is anonymous.

### Today, on her phone (the user's pick: Sky)

Mockups `01-today.html` (Sky) and `05-settings.html` (right: with a
warning).

Top to bottom:

1. The sky header: "Good morning / afternoon / evening" (no name on her own
   phone, my call), the date, and "1 of 3 done" as short coloured bars (green
   taken, coral missed, white still to come).
2. **Warnings**, only when there are any (my call, from the user's "nah
   good" on page 5):
   - Alarm health: one white card with an amber top edge, "Alarms may not
     ring", one plain line why, and a "Fix now" button that does what
     tapping the banner does today. If there are several problems, the card
     shows the first and "+N more", as today.
   - Running low: a small card, "Iron: 4 left · About 4 days", with
     "+ Add", which opens the pill at Tablets left, as today.
3. **Next dose:** one big floating card: "NEXT DOSE", a chip saying
   Tonight / This morning and so on, the time very large, "in 6 hr 50 min",
   then each pill with its picture, name and amount. Tapping a pill opens
   its summary. When the next dose is ringing or snoozed, the card only says
   so ("Ringing now", which opens the ringing screen when tapped; "Snoozed
   until 9:10"), with **no "I took it" button** (my call, from the builder
   check: taking a ringing or snoozed dose from Today would need a new path
   into the alarm engine, which this step doesn't touch).
4. **Missed:** a soft-coral card per missed dose, with the pill, "1:30 PM ·
   missed" and an "I took it" button.
5. **Later today** (my call; the mockup had only one upcoming dose): other
   upcoming doses as compact lines.
6. **Done:** one line per taken dose, with a green tick, "8:00 AM · both
   taken" and the pill names. A skipped dose is a grey line, "Skipped",
   with a small "I took it", because today she can mark a skipped dose taken
   (my call, from the builder check).
7. **"+ Add a pill"** as a dashed row at the end (my call; the Sky mockup
   left out where Add pill goes).

When every dose is done, the next-dose card says "All done for today" and
shows tomorrow's first time (my call). With no pills at all (E5), the
floating card shows three pill shapes, "No pills yet", "Add your first
medicine. Or your son or daughter can add them from their own phone.", a
blue **Add a pill** and a white **Show my code**.

"I took it" keeps today's "Mark as taken?" confirmation, because there is no
undo (my call). The sound line ("♪ Default alarm tone") is no longer on
Today. Sounds are set from the pill summary.

Course words ("day 3 of 5", "last day", "starts tomorrow") stay, as small
text under the pill name.

### Today, on a relative's phone (the user's pick: B, "on Today, at the top")

Mockup `07-family-relative.html`, B.

- The sky header greets the relative by their Google first name: "Good
  afternoon, Ravi".
- First, one card per person they look after: letter avatar, name, "1 of 3
  taken so far", the coloured bars, a green Call button (when a number is
  saved), and a soft-coral line for anything missed, which opens her page.
  Below that, in amber: her phone's alarm problems first (new on this card;
  her page already reads them), then her pills running low, as today's card
  shows them ("Iron: 4 left · about 4 days"), and "Not heard from since …"
  as today (my call, from the builder check).
- Then **My pills**: their own Today, as on her phone, without the tall sky
  repeated. With no pills of their own, one line: "You have no pills of your
  own. + Add pill".

### Her page, on the relative's phone (both A and B)

Mockup `07-family-relative.html`, right.

- Sky band with back and a gear (alert settings and Stop following), her
  big letter avatar, her name, "Heard from at 2:05 PM", and a big green
  Call button.
- Her alarm problems, if any, as an amber card (today's wording).
- Her day: one line per dose, time, pill names and a status chip (✓ 8:04,
  Missed, Later, Not reported).
- Two tiles: **Her pills** (changing them from afar) and **History** (her
  history, read-only, as today).
- "Times are Amma's time." at the bottom.

### The pill: five steps to add, a summary to open (the user's pick: steps and summary)

Mockup `02-pill.html`, right.

**Adding** is five screens, each with one question, a progress bar ("3 of
5"), Back and Next, and a close (×) button (my call on the order and
grouping):

1. Name and photo: the name field, Take a photo, Choose from gallery.
2. Type and amount: Tablet, Capsule, Syrup, Drops as big chips; how much
   each time with − and +.
3. Times: "When should Iron ring?" with three ready choices, Morning 8:00
   AM, Afternoon 1:30 PM, Night 9:00 PM (my call; each time can be changed),
   ticked to choose, plus "Another time". At least one is needed.
4. How long: 5 days, 10 days, 30 days, No end, Other…; Starts Today or
   Tomorrow.
5. Check and save: the summary as it will look, with Tablets left
   (optional) and Save.

The exact-alarm permission prompt, the "time already added" check and the
save errors behave as today.

**Opening** a pill shows the summary:

- Sky band with back and a camera button (retake the photo), her photo or
  the pill shape large in a white circle, the name, and "Tablet · 1 each
  time".
- One card of rows, each opening a sheet to change just that row (my call
  on sheets):
  - Rings at: "8:00 AM and 9:00 PM" (add, change, remove times);
  - Sound: the sound for each of this pill's times. Tapping a time opens
    the sound list for it. The sheet says that a time's sound is shared by
    every pill at that time, because they ring together;
  - For how long: "30 days · day 12 of 30";
  - Tablets left (tablets and capsules only): "4 · about 4 days" in amber
    when low, with "+ Add".
- Tapping the name line opens a sheet for name, type and amount (my call).
- "Delete this pill" in coral at the bottom, with today's confirmation.
- **Each sheet has its own Save, which saves that one change at once** (my
  call, from the builder check). On her phone it saves the whole pill as
  today, with the exact-alarm prompt and the "time already added" check. On
  a relative's phone it sends one change (so she gets one notice per Save).

On a relative's phone the same steps and summary are titled "Amma's pill" /
"Add a pill for Amma", say "Times are Amma's time.", and Save sends the
change as today (with today's "not allowed" message). While a change waits
for her phone, the summary keeps showing her phone's values and adds an
amber strip at the top, "Waiting for Amma's phone: Change Iron", with
Cancel, so it is clear the change was sent (my call).

### Sounds and recording (the user's pick: B, recording in a pop-up)

Mockup `03-sound.html`, left and B.

- Sky band: "Sound for 9:00 PM", and under it which pills ring then.
- Two big tiles: **Record a voice** (coral) and **Pick a song or file**
  (blue).
- One card listing the sounds: a round play button, the name, "Recorded ·
  0:12" or "Song · 1:40", and a round tick on the one in use. Tap a row to
  use it; hold to delete, as today, with the line "Tap a sound to use it.
  Hold one to delete it." On a relative's phone, "Amma's sounds" and "My
  sounds" stay as two sections.
- **Recording** happens in a sheet that slides up over the list: a Start
  button, then the timer ("0:08, up to 2:00"), the voice drawn as bars, and
  a big coral stop button. After stopping, the same sheet shows Listen,
  Record again, the name, and "Use this sound". Microphone permission,
  "too short" and save errors behave as today.

### History (the user's pick: A, the calendar)

Mockup `04-history.html`, A and right.

- Sky band: "History", with a round Share button (shares the report, as
  today).
- A summary card: the month, "89% taken" large, a green bar, and "31 of 35
  doses since 18 Oct".
- The calendar card: month name with back and next, a 7-column grid. A
  green filled day means all taken; an orange ring, some not taken; coral
  filled, none taken; today has a navy ring; days with nothing and future
  days are plain grey. A legend below.
- **One day:** the date as the title, "2 of 3 taken", and a timeline with a
  sun, low-sun or moon per dose. A missed dose's card is soft coral. Taken
  doses show the time they were marked, and "marked Thu, 9:12 AM" when it
  was marked on another day, as today.

### Settings, alarm setup and warnings (the user: "nah good")

Mockup `05-settings.html`.

- **Settings:** Language as three tiles, each in its own script (English,
  മലയാളം, हिन्दी, the last two with a "draft" tag). A card with "Read pill
  names aloud" (switch, "When an alarm rings"), "Hear how it sounds" with
  Try it, and Text size ("Follows the phone's text size"; tapping it opens
  the phone's display settings, my call). A card for Alarm setup showing
  "2 steps left" in amber, or "All set" in green.
- Family is no longer in Settings; it has its own tab.
- **Alarm setup:** the title "Make alarms ring every time" ("Let's make
  sure alarms ring" on first open), a progress bar, "2 of 4 done · Xiaomi
  phone". Done steps get a green tick; only the current step is open, with
  its text and buttons; later steps are faded. The steps and their brand
  logic are today's. **How a step gets its tick stays as today** (my call,
  from the builder check, because the ticks switch off the "Alarms may not
  ring" warning). Steps the phone can check tick by themselves and show
  "Allowed". The others have **Open settings** plus **I did this** (today's
  Done), and a done step can be opened again and unticked. Opening the
  settings never counts as done. Steps with no settings page (lock in recent
  apps) have only "I did this".
- The voice and speech messages ("no Malayalam voice", "can't read aloud")
  stay as today.

### The ringing screen (the user's pick: A, big buttons at the bottom)

Mockup `06-ringing.html`, A. Native, in `:ringing`, without JS.

- Full-screen sky by the dose's time: night with a moon and stars at
  9:00 PM, a sunrise in the morning, blue by day.
- "Time for your medicines", then the time very large.
- One white card per pill: its photo (or the pill shape, which needs the
  same shape and colour rule in Kotlin), name and amount. With one pill that
  has a photo, today's large photo stays (my call).
- The sound as a small chip ("🔊" is replaced by the `volume_up` symbol).
- At the bottom: a wide green **I took it** button, then **Remind me in 10
  min** (white outline on the sky), then **Skip this time** as small text.
- Read aloud, the alarm sound and everything the buttons do are unchanged.

### Family, on her phone (the user: "move on")

Mockup `08-family-elder.html`.

- **Family tab:** "Who can see my pills": one card per person, letter
  avatar, name and email, "Remove", and a "Can change my pills" switch on
  the card. A big **Show my code** button, "To add someone, show them your
  code."
- On a phone that also looks after someone, "People I look after" follows,
  with each person (opening her page) and "+ Add family" (my call; the
  mockups showed the two sides separately).
- **My family code:** "Show this to your son or daughter", a big QR code,
  the 6 digits in large boxes, a countdown chip ("Works for 14 more
  minutes"), and "Send the code" (shares it, as today). "Expired" and "New
  code" as today.
- **Allow:** a dialog over the code screen with the person's letter avatar,
  "Let Ravi see and change your pills?", their email, three short lines with
  icons (Ravi sees your pills and whether you took them; Ravi can add or
  change pills and sounds; you get a notice each time Ravi does), and No /
  a green Allow.

### Adding family and her pills from afar (the user: "move on")

Mockup `09-family-add.html`.

- **Add family, step 1:** "Logged in as ravi@gmail.com" (the login now
  happens on the login page), one line on where to find the code on her
  phone, a big **Scan their code**, "or type the 6 digits" with six large
  boxes, Next, and "Skip for now" when it comes straight after the login.
  Scanner and code errors as today.
- **Step 2, waiting:** both letter avatars joined by a dotted line, a
  spinner, "Waiting for them to tap Allow on their phone…", "Keep this open.
  It moves on by itself." "They tapped No." in plain words.
- **Step 3, almost done:** three cards (what you call them, their phone
  number for the Call button, when to say a dose is missed: after 15 min,
  30 min, 1 hour, or Off), then Done. The same form opens later from the
  gear on her page, with "Stop following" at the bottom.
- **Amma's pills:** an amber card at the top for changes still waiting for
  her phone, each with Cancel, and today's delay note. Her pills as rows
  (picture, name, amount and times) opening the same summary; "+ Add a pill
  for Amma"; then "Recent changes" with "✓ Done at 1:12 PM" or "Not done:
  …". The separate "Alarm sounds" section goes, because each pill's summary
  sets its times' sounds (my call). The "not allowed" message stays, in an
  amber card.

### Words that change

- "Taken" (the action) and "Mark as taken" become **I took it**. The
  status stays "✓ Taken 8:04".
- "Snooze 10 min" becomes **Remind me in 10 min**.
- "Make alarms reliable" becomes **Make alarms ring every time** (title) and
  **Alarm setup** (Settings row).
- "Sign in with Google" becomes **Continue with Google**; "signed in"
  becomes "logged in".
- New: the login page, "Who is this phone for?", greetings, "1 of 3 done",
  "NEXT DOSE", "in 6 hr 50 min", "All done for today", "Later today", the
  step questions, "Show my code", "Send the code", the countdown, "Almost
  done", "Recent changes", "Continue offline", "Skip for now".

## Left to the builder

- Component structure, spacing, exact sizes and animations (a gentle pulse
  on the recording button is fine; nothing that slows the elder down).
- How to draw gradients and the sky, within "no SVG" (built-in styles,
  images or a small library), and how to load the icon font (by codepoint
  or ligature). New dependencies are fine if they are well maintained and
  needed (my call).
- The mechanics of linking her anonymous login to Google, within the rules
  above.
- Exact colour shades for contrast, and the sky's colours at each time.
- Loading, error and empty states not described above, in the same look,
  with today's words.
- How the bottom tabs are built on top of today's stack navigator.

## How we'll know it works

- Every screen in the list above matches its mockup in layout and look, on
  the emulator and on the Redmi Note 10.
- At the phone's largest text size, nothing is clipped and every button can
  be reached.
- An alarm rings on the locked Redmi with the app swiped away, and the new
  ringing screen's three buttons work as before.
- A fresh install goes login → who → setup → Today on both phones. A
  tester's phone updated in place logs in once and keeps its pills, its
  online id and the relatives who follow it. With no internet at first open,
  "Continue offline" still sets pills and rings alarms.
- Malayalam and Hindi show every new word (as drafts), and the language
  tiles switch the app as today.
- The existing tests pass after being updated to the new screens.
