# PillSaathi TODO

Newest decisions first. Stages done so far: alarms (PR #3), pills and doses (#4, #5), Easy for Amma (#6), History and refills (#7), Family online (#8, fixes in #9), Remote setup (stage 2).

## Next: redesign the whole UI

Asked for on 2026-10-29: "redesign the whole UI, with much clear and simple way. we can decide on screen and all."

- **Decide screen by screen together.** Before any code: who uses each screen (the elder, the relative, or both), what it is for, and a mockup to react to (the brainstorming browser companion). Then a design doc and a plan, as for every stage.
- **The screens today:**
  - Today
  - the pill page
  - the sound picker and Record
  - History (the calendar and the day page)
  - Settings and the battery Setup
  - the ringing screen
  - Family: her page with Allow, the code screen, Add family, his page for her (her day), her pills page (changing from afar), and the follow settings
- **Carry over:**
  - big text and plain words for elders;
  - the app's text size and Malayalam/Hindi;
  - the ringing screen must stay as reliable as it is (it runs in `:ringing`, without JS);
  - the 📅 History icon draws as "July 17" on Android (open since stage 4).
- **Not decided yet:** whether the elder and the relative should get different home screens, now that the relative can do more than watch.

## Waiting on the user or a phone

- **Deploy the stage 2 rules:** `npx firebase deploy --only firestore:rules` (Claude Code's auto mode blocks it, so run it with `!`).
- **Redmi checks:**
  - Scan code (PR #9);
  - remote setup end to end (README "Remote setup" matrix);
  - Family online with the app swiped away overnight;
  - stage 4's checks (Taken lowering the count with the app swiped away, sharing in English and Malayalam, the calendar at the phone's text size);
  - stage 1's Xiaomi swipe-away, reboot and overnight checks.
- **Translations:** someone who reads Malayalam and Hindi checks them before they leave draft.
- **The old Firebase project `pillsathi-dev`:** delete it or not (its key is in public git history).

## Later

- Play Store internal testing (skipped for now, 2026-10-27); App Check once on the Play Store.
- iPhone, via AlarmKit (iOS 26+).
- Deferred review minors:
  - 15 from Family online (listed in PR #8);
  - 6 from History and refills (JOURNAL.md, 2026-10-27);
  - stage 2's (in its PR).
