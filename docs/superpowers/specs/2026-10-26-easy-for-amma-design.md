# Easy for Amma (Android): Design

Date: 2026-10-26
Branch: `feature/easy-for-amma` (from `main` after PR #5)
Status: accepted as a starting point (2026-10-26); to be revised after the current build's testing

## Intent

PillSaathi is for elderly people and their relatives. Today the son or
daughter sits next to the elder and types the pills into the elder's phone.
After that, the elder mostly meets the app when it rings: they take the pill
and tap **Taken**. That part already works.

This step makes the app easier for the elder ("Amma") to read and
recognise. In the user's brainstorm this is stage 3 of four possible next
stages. The user chose stages 3 and 4 now, in that order. Stages 1 and 2
(family seeing doses and managing pills from their own phone) wait until the
app goes online.

Elders know their pills by how they look more than by their names. Many read
their own language more easily than English, and some see or read poorly. So
this step adds four things:

1. **A photo of each pill**, shown wherever the pill is listed.
2. **The app in the elder's language.**
3. **Pill names read aloud** while the alarm rings.
4. **Bigger text**, and every screen working at the phone's largest text
   size.

The mockups are in `.superpowers/brainstorm/74227-1793018754/content/`
(`next-stages-map.html` for the four stages, and `stages-3-4-screens.html`
for the screens of this stage and the next).

## Goals

- **Pill photo.** On the pill page, the relative can add one photo per pill:
  **Take a photo** with the phone's camera, or **Choose from gallery**. A
  photo can be retaken or removed. The photo shows:
  - on the ringing screen, next to the pill's name and amount
  - on Today, next to each pill row
  - on the pill page
  A pill without a photo shows a plain icon for its type (tablet, capsule,
  syrup or drops) in the same spot, so rows line up.
- **The app in the elder's language.** The app's own words appear in the
  chosen language everywhere: the ringing screen, the ringing and missed
  notifications, Today, the pill page, Sound, Record, Setup and Settings.
  Amounts are translated too ("½ tablet", "5 ml"). Pill names stay exactly
  as typed.
- **Read aloud.** While a card rings, the phone speaks the pills at breaks
  in the alarm sound. For example: "Time for your medicines. Telma 40,
  one tablet. Vitamin D, one capsule." It speaks in the app's language, at
  alarm volume, and through silent mode like the sound itself.
- **Bigger text.** Today's pill names, amounts and statuses get bigger. Every
  screen works at the phone's largest text size: nothing is cut off, and
  the ringing screen's Taken button is always on screen without scrolling.
- **A Settings screen**, opened from a gear (⚙) in Today's top bar, with:
  - **Language**: English, മലയാളം (Malayalam), हिन्दी (Hindi).
  - **Read the pill names aloud**: on or off, with **Try it**, which speaks a
    sample.
  - **Text size**: a note that the app follows the phone's text size.
  - **Make alarms reliable**: a link to the existing Setup screen.

## Non-goals (this step)

- Anything for a relative on another phone: seeing doses, alerts, or
  managing pills remotely (stages 1 and 2).
- Translating or transliterating pill names.
- Recording a spoken name for each pill. A card's sound can already be a
  relative's recording.
- Languages beyond the three above.
- Read aloud on or off per card.
- Changing Taken, Snooze or Skip, or what they record. Taken is already the
  one big button.
- A locked "elder mode" that stops the elder from editing pills.
- Photos in the notification or in dose history.
- iOS.

## Anti-goals (failure even if it "works")

- **A relative's short recorded message cut off mid-sentence** by speech.
- **Read aloud or a photo ever delaying, stopping or silencing an alarm.**
  The sound must start as fast as it does today. Speech comes after it. If
  speech fails, isn't installed, or is slow to start, the sound keeps
  playing as it does today.
- **Speech that doesn't match the screen.** The spoken list is exactly the
  pills shown on the ringing screen, in the same order, with the same
  amounts.
- **A wrong amount in any language**, such as ½ shown as 1. Every
  translation must be checked by someone who reads the language before it
  ships.
- **The ringing screen and the app in different languages**, or the ringing
  screen falling back to English after a reboot.
- **Taken pushed off the ringing screen** at a large text size or by a long
  pill list.

## Constraints

- Everything in the earlier specs still applies:
  `docs/superpowers/specs/2026-10-24-custom-sound-alarm-design.md` and
  `docs/superpowers/specs/2026-10-26-pills-and-doses-design.md`. In
  particular:
  - Ringing is native and runs in the `:ringing` process, with no React
    Native runtime.
  - Data lives in device-protected storage, so alarms ring before the first
    unlock after a reboot.
- **The ringing process needs the photo, the language and the read-aloud
  setting.** All three must be in device-protected storage, so a ring
  before the first unlock shows the photo and uses the right language.
  Speech may not be available before the first unlock (the phone's speech
  engine may not run then). If it isn't, the ring goes ahead with sound
  only.
- **No new permissions** (my call). The photo comes from the phone's camera
  app or the system photo picker, which need no permission from this app.
- **No internet.** Speech uses the phone's own text-to-speech engine.
- Times still follow the phone's 12/24-hour setting.

## What has been decided

### Decided by the user

- The next stages are 3 (Easy for Amma) and 4 (History and refills), in that
  order. Caregiver features are out for now.
- A son or daughter sets up the pills on the elder's phone. The elder
  answers the rings.
- The pieces are the ones on the stage 3 card: big text, the elder's
  language, a photo of each pill, names read aloud, and one big button.

### Photos (my call)

- One photo per pill, scaled down when saved (about 1024 px on the long
  side) so it loads fast on the ringing screen.
- The photo is stored with the pill's data and deleted with the pill.
  Removing the photo deletes the file.
- On the ringing screen the photo is about 64 dp square, rounded. Tapping it
  shows it full width. Tapping again shrinks it back. Taken, Snooze and Skip
  stay where they are.
- A missing or unreadable photo shows the type icon. It never stops the
  screen from showing.

### Language (my call)

- **English, Malayalam and Hindi first.** Adding a language later means
  adding a translation file.
- **The default follows the phone's language** if it is one of the three,
  and English otherwise. Settings can change it, and the choice is stored
  in the app, separately from the phone's language.
- Numbers stay as Western digits (1, ½, 2.5), as on medicine strips.
- I'll draft the translations. Someone who reads each language checks them,
  starting with the amount texts and the ringing screen. Who checks
  Malayalam and Hindi is still open (the user will decide later).
- **A language that hasn't been checked stays hidden.** It isn't in the
  Language list, and a phone set to it gets English. So the branch can
  merge with a draft translation, and an APK can be shared, without an
  elder ever seeing unchecked words. Showing a language once it is checked
  is a one-line change.

### Read aloud (my call)

- **On by default**, including for people upgrading.
- **When it speaks**: the sound starts at the fire exactly as today. Speech
  waits for a natural break, so a relative's short recording is never cut:
  - **The first time**, the phone speaks when the first play of the sound
    ends, or after 15 seconds if the sound is still playing, whichever
    comes first.
  - **After that**, it speaks at the first end of a play at least 45 seconds
    after the last speech, or 60 seconds after it if the sound is still
    playing then.
  - When speech interrupts a long sound, such as a long melody, the sound
    pauses and then resumes where it stopped. When speech comes at the end
    of a play, the sound starts again from the beginning.
  - This repeats until the ring ends (Taken, Snooze, Skip, or the 10-minute
    auto-silence). Ending the ring stops speech at once.
- **What it says**: the ringing screen's title, then each pill: its name as
  typed, then its amount. With no pills listed (a ring for a card with
  nothing due shouldn't happen), it says only the title.
- **Which voice**: the app's own words (the title and the amounts) are
  spoken in the app's language. Pill names are usually typed in English, as
  on the strip, and a Malayalam or Hindi voice may read them badly. So a
  name typed in English letters is spoken in the English voice, and a name
  typed in Malayalam or Hindi script is spoken in that language's voice.
  The spoken list is built as a series of parts, each with its own
  language. If the phone has no voice for the app's language, everything is
  spoken in English. If it has no speech engine at all, nothing is spoken.
- **Try it** in Settings speaks a sample with today's first card's pills, or
  "Telma 40, one tablet" if there are none. If no voice exists for the
  language, it says so and offers to open the phone's text-to-speech
  settings.
- Speech plays at alarm volume, through silent and Do Not Disturb, like the
  alarm sound.

### Text size (my call)

- No size setting in the app. It follows the phone's text size, which many
  elders' phones already have set large.
- Today's text gets bigger: pill names at least 20, amounts and statuses at
  least 18, up from 18, 16 and 16.
- At the phone's largest text size, every screen still works, and the
  ringing screen keeps Taken, Snooze and Skip visible while the pill list
  scrolls.

### Settings screen (my call)

- Opened from a gear in Today's top bar.
- Holds only the four items listed under Goals.
- Changing the language applies right away to every screen, including the
  next ring.

## Left to the builder

- How speech is woven into the sound: pausing the sound or lowering it,
  and the exact timing, within the rules above.
- How translations are stored and loaded: Android string resources on the
  native side, and the approach on the React Native side.
- How the chosen language reaches the `:ringing` process.
- The file format and size of photos, and where they sit in the store.
- How photos cross to the JS screens: a file path, a URI, or another way.
- Layout details within the mockups.

## How we'll know it works

- **Pure rule tests** (Kotlin JVM, and Jest where rules live in TS):
  - the spoken parts for a card, in each language, with English-letter pill
    names in the English voice
  - when speech comes: a short sound, a long sound, and a sound of about 15
    seconds
  - the amount texts in each language
  - the default language from the phone's language
- **Screen tests** (Jest):
  - adding, retaking and removing a photo on the pill page
  - Settings: switching language, and turning read aloud on and off
  - Today rows with and without a photo
- **On the emulator, then on the Redmi Note 10 (MIUI)**:
  - A ring with read aloud on: the sound starts at once, speech follows in
    the chosen language, and the sound comes back after it.
  - Taken during speech stops both sound and speech at once.
  - A ring with read aloud on but no voice for the language: speech is in
    English, or there is no speech, and the sound plays normally.
  - A Malayalam ring with "Telma 40": the Malayalam words and the English
    name each sound natural, and the switch between voices doesn't leave a
    long gap.
  - A card with a relative's 10-second recording: speech always comes after
    the recording ends, never in the middle.
  - A ring before the first unlock after a reboot: the photo and the
    language are right, and the sound plays even if speech can't run.
  - The phone at its largest text size: Taken stays on screen with ten pills
    due.
  - A photo taken with the camera and one chosen from the gallery both show
    on the ring, on Today and on the pill page.
  - Switching to Malayalam: the next ring, its notification and the missed
    notification are in Malayalam.
