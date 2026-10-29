# Implementation Progress

**Plan file**: docs/superpowers/plans/2026-10-29-ui-redesign.md
**Next task**: Review fixes A–D (see "Next: review fixes" below; run them in parallel worktrees, then merge), then Task 18 (phone checks: fresh install on both phones, as the user chose)
**Waves**: A = 7, 8, 12, 13, 15, 17 ✓ · B = 9, 10, 14 ✓ · C = 11 + 16 ✓ · then 18. Parallel tasks were merged by cherry-pick; their notes are below.
**Last updated**: 2026-10-29 22:15 IST (stopped for the night at the user's request; nothing in progress)

Branch: `feature/ui-redesign` (one commit per task). Baseline before Task 1: 30 suites, 272 JS tests passing.
Spec: `docs/superpowers/specs/2026-10-29-ui-redesign-design.md`; mockups beside it (`10-journeys.html` wins).

## Next: review fixes (from the whole-branch review of 227e043..dd72795, three reviewers)

Verified by the orchestrator: C1 (only TodayScreen calls `reconcileOnAppOpen`) and I-1 (the base screen had `maxLength={7}`). The others came with probe tests. Each fix agent: verify first (superpowers:receiving-code-review), failing test first, one commit `fix: review: …` on its own branch, then cherry-pick. File ownership as listed so they can run at once.

**Fix A — her phone (owns App.tsx, lib/start.ts, Login/Who, TodayScreen except the family block, lib/today.ts, components/today/* except PersonCard, AddPillScreen):**
- **C1 Critical:** the app-open reconcile (`reconcileOnAppOpen`, the only re-arm after an OEM force-stop) runs only from Today, so a phone stuck at Login never re-arms. Reconcile in `App.tsx` at start and on AppState active, whatever the start route; hand the missed list to Today's "Missed medicines" alert (once). App test: Login shown → reconcile called.
- **I1:** the minute tick doesn't reload cards, so once the next dose's time passes Today says "in 23 hr 59 min" (and stays on yesterday after midnight). Refresh when `now` passes the next dose or the date changes; `untilText` says "now", not a wrap.
- **I2 (Review Focus 5):** a 0:30 dose seen at 23:00 shows "All done for today · Tomorrow, 12:30 AM", never "Tonight · in 1 hr 30 min". Screen-level test at 23:00.
- **I3:** done and later lines show pill names as plain text, so a taken pill can't be opened from Today (her phone has no other pill list). Make each name a link; put the ported "opens the pill page from a pill row" test back on a taken card.
- Minor: "Tomorrow, 7:00 AM" uses `cards[0]` (can be a record-only or last-day card); "Later today" heading covers tomorrow's `later` cards; the phone's Back in Add pill should step back on steps 2–5; a 7th ready time fails silently; Login with `again` should show Continue offline from the start; LoginScreen duplicates `firstName`; skipped lines' "I took it" needs the time in its TalkBack label; `start.ts`: logged in but no role → go to Who (not Google again, which could switch the relative's id).

**Fix B — the pill summary (owns PillScreen, components/pill/*, lib/remote.ts):**
- **C2 Critical:** on his phone each sheet sends the whole pill from her last-known copy, so a second Save while the first waits undoes it (add 8:00, then set 30 days → 8:00 dropped). Build the next draft from the waiting change (or block sheets while one waits). Test: two Saves in a row keep both.
- `waitingByPill` keeps the oldest waiting change (newest-first list overwritten); keep the newest.
- Minor: the camera works before the pill loads and the photo is silently dropped.

**Fix C — family, History, Settings, kit (owns theme.ts, src/ui/*, Family/ShareCode/AddFamily/FollowEdit/Elder/ElderPills/History/HistoryDay/Settings screens, FollowForm, AllowDialog, PersonCard):**
- **I-1:** AddFamily `maxLength={6}` cuts a pasted "482 913" to 5 digits. Drop maxLength (keep the digit filter); test what the boxes show after pasting.
- **I-2:** blue words on the page (`#2A7BB8` on `#F5F8FB`) are 4.26:1. Darken `colors.blue` to about `#2672AC` (4.82:1 on the page, 5.14:1 on white) and fix the theme comment.
- **I-3:** switches' off track `colors.edge` is 1.28:1 on white (Family "Can change my pills", Settings "Read aloud"); use ≥3:1.
- **I-4:** ElderScreen's band sits above the ScrollView; a 40-character name at font scale 2.0 fills the screen. Move it into the ScrollView; test with a 40-char name.
- Minor: ElderPills Cancel 44 → 48 dp; share message "tap Add family" → "tap Family, then + Add family"; unreported doses drawn like future ones and nearly invisible (DoseBars, PersonCard); History's today ring hides the amber "some missed" ring (and amber is 2.15:1); legend vs TalkBack words differ; remove the unused old colour aliases; Hindi "दिखाएं"/"दिखाएँ"; keyboard padding on AddFamily and FollowEdit; `key={line.text}` collisions (key by pillId); the morning time tile is 2.62:1; add `SectionLabel`, `AddRow`, `CallButton` to the kit (Today can switch over later).

**Fix D — the ringing screen (android only; owns activity_ringing.xml, RingingActivity.kt, ringing drawables, strings):**
- **I-1:** the title, time and three buttons are outside the scroll and the pill list is weighted 0dp, so in landscape (or Malayalam at font scale 2.0) the pills vanish and Skip is clipped. Move title and time into the ScrollView, `minHeight` ~80 dp on the list; optional `layout-land`.
- Minor: on API 24–25 load fonts through `createDeviceProtectedStorageContext()` (cache dir is unavailable before first unlock); catch `Throwable` in font loading; a dark nav-bar colour below API 26; short notification-only action strings (the Malayalam snooze label is cut in the heads-up); each pill card one TalkBack unit; two night stars sit under the time digits.

Native reviewer found no Critical: handlers, guard, lifecycle, flags and `RingingService` untouched; contrast on all four skies passes; fonts can't stop the screen showing.

## Next after the fixes: Task 18 phone checks (user chose fresh install on both phones)

- `android/app/google-services.json` (gitignored) is now the `pillsaathi` project's config, copied from `~/Downloads/google-services-10.json`; builds before tonight had no Firebase.
- Build `cd android && ./gradlew assembleRelease` (debug-key signed; release lists English only).
- Order on each phone: (1) `adb install -r` over the current build → the login shows once, pills and followers stay (Review Focus 4). (2) Then uninstall, install fresh, walk E1–E14 on Amma's emulator (`Medium_Phone_API_34`) and C1–C11 on the Redmi (M2101K7AI, wireless adb), re-link family, compare with `10-journeys.html`. (3) Ring it (see the Task 17 blocker below). (4) `adb shell settings put system font_scale 2.0`, check, then back to `1.0`.
- Phone-check notes per task are in each task's notes above (keyboard over sheets, code field paste/number pad, switches, night sky words, font scale 2.0).
- Then README matrix, JOURNAL, and the PR (check `gh pr list` first; the user merges PRs on GitHub silently).

---

## Completed Tasks

### Task 1: Fonts, theme tokens, and the sky and pill-colour rules
**Status**: ✓ Done
**Notes**:
- Google Fonts served `.ttf` directly for both Nunito and Material Symbols Rounded (static FILL=1 / FILL=0 at wght 500), so no fontTools step. Symbols files are ~1.8 MB and ~1.2 MB (full glyph set).
- Fonts are registered in `MainApplication.ensureReactNativeLoaded()` (just before `loadReactNative`), not at the top of `onCreate`, so the `:ringing` process never loads them. Use `com.facebook.react.common.assets.ReactFontManager` (the `views.text` one is deprecated).
- On API 24–27 RN maps weights to normal/bold only, so 800/900 render as bold there; fine for the target phones. Icons should not set `fontWeight`.

### Task 2: Icon, PillPicture and Avatar
**Status**: ✓ Done
**Notes**:
- `ICONS` is generated from Google's `MaterialSymbolsRounded[…].codepoints` as `\uXXXX` escapes; all 51 checked present in both bundled TTFs (`fc-query`). Unlabelled `<Icon>`s use `importantForAccessibility="no"` (TalkBack skips them, RNTL `getByText(ICONS.x)` still finds them); `no-hide-descendants` would hide them from RNTL queries too.
- Small additions: `<Icon style?>` (PillPicture gives syrup/drops glyphs a soft text shadow so the pale palette colours show on white); theme gets `colors.shade`, `shadow.pill` and `AVATAR_COLORS` (6 gradients, ordered so "Amma" is peach and "Ravi" mint as in the mockups). Removed the emoji `FORM_ICONS` from `lib/amount.ts` (no users left).
- PillPicture testIDs no longer carry the pill id (`pill-photo`, `pill-shape-<form>`); a photo that fails to load still falls back to the shape. It has no margin, so the old DoseCard/HistoryDay rows now use `gap`. Not yet viewed on a device.

### Task 3: Sky headers, buttons, cards, chips, stepper, sheet, dose bars, tab bar
**Status**: ✓ Done
**Notes**:
- Deviation: installed `@react-navigation/bottom-tabs` (7.21.0, pure JS) here, since `TabBar` is typed with its `BottomTabBarProps`; Task 4 can skip the `npm install`. TabBar sits in-flow under the page (not over it), so screens need no bottom padding; tab words are one line, shrink to fit, capped at 1.5× text size.
- Fixed Task 1's `shadow` tokens: RN's `boxShadow` parser drops a non-zero length without `px`, so `'0 4 14 0 …'` drew nothing on the phone; now `px`, and a kit test parses every shadow. New tokens: `colors.blueText` (blue words on blue tint), `edge`, `dim`, `shadow.blue/green/coral`, `skyColors`; `sky.ts` gains `skyImage(sky, middle%)` and `skyInk(sky)` (white words at night; Today's "1 of 3 done" should use it).
- Beyond the interface: `RoundButton` (named export of `SkyBand.tsx`, for `right` such as Share or the gear); `SkyBand title=""` puts the step bar beside close (E6); `Stepper` `lessDisabled`/`moreDisabled`; `DoseBars onCard` (full width, grey rest, for PersonCard). Both skies set light status-bar icons at night. `SkyTop` leaves 60 dp at its foot for the next card's −44 lift. `AmountStepper` keeps "1 tablet" whole as the value, so PillEdit tests stand. Sheet doesn't handle the keyboard yet: check sheets with inputs (Task 11) on the phone. Prettier 2.8.8 re-wrapped a few old lines in the i18n files.

### Task 4: Navigation: bottom tabs, and a sky band on every page
**Status**: ✓ Done
**Notes**:
- No `package.json` change (Task 3 installed bottom-tabs). `renderApp('Today' | 'History' | 'Family' | 'Settings', params)` opens `Main` at that tab; `headerTitles()` reads every `sky-title`, bottom page first. Visited tabs stay mounted, so after switching tabs use `toContain`; the tab bar's words are always on screen under `Main`, so `getByText('Family')` etc. can match a tab too (prefer `getByRole('tab', { name })`). Every stack page's band has `onBack={() => navigation.goBack()}`; tabs have none. Added a test that Back on a page opened from a tab returns to it.
- Tab screens take `TabProps<'Today'>` (exported from `RootNavigator`). `HistoryScreen` serves the History tab and the `ElderHistory` route, so its props are `NavigationProp<RootStackParamList>` + a union of the two `RouteProp`s (a union of the two screen-props types isn't callable). `replace`/`popTo('Today')` became `'Main'`; FollowEdit's `popToTop` lands on Main.
- Header buttons moved into the band: History's Share is a `RoundButton` (labelled "Share", shown once the month loads); Elder's gear is a `RoundButton` labelled `t.family.edit`; PillEdit's Cancel became the band's × (labelled "Close"), with Delete/Save on a white pill in `right` until Tasks 10–11 replace the page. Today's add button no longer adds `insets.bottom` (the tab bar pads for the gesture bar). Not yet viewed on a device.

### Task 5: The `role` setting and the display-settings target (native)
**Status**: ✓ Done
**Notes**:
- Kotlin `AppSettings.role: String?` (stored as given; JS is the gatekeeper), written to JSON as `"role"` (null when unset); `getSettings()` returns it, `setRole` saves it, `openSetting('display')` → `ACTION_DISPLAY_SETTINGS`. The native `Spec.AppSettings.role` is `string | null`; `src/native/alarms.ts` now defines its own `AppSettings` (role `Role | null`, anything but elder/carer reads as null) and exports `type Role`.
- `mockAlarmsDefaults()` gives `role: 'elder'` and mocks `setRole`. Tests that build their own `getSettings` value must include `role` (tsc); `FamilyScreen` and `SettingsScreen` tests updated. Jest 37 suites / 311 tests.

### Task 6: Login page, "Who is this phone for?", and where the app starts
**Status**: ✓ Done
**Notes**:
- Deviation: a cancelled login also offers "Continue offline" (no message), because native returns null for "no Google account on the phone" too (`NoCredentialException`); without it such a phone could never pass the login. `FamilyErrors` keys are `Offline`/`NotSetUp` (the plan wrote `OFFLINE`). The login's "PillSaathi" carries `testID="sky-title"`, so `headerTitles()` is `['PillSaathi']`. Small kit additions: `PillPicture color?` (the logo's blue capsule), `SkyTop` exports `Sun` (the login sky uses it). A failed `setRole` still moves on (warns).
- Bridges for Tasks 7 and 16: `Setup { firstRun }` shows `t.setup.firstTitle` ("Let's make sure alarms ring"), has no Back, and its Finish resets to Main (the App test presses Finish; Task 7 may switch it to "Do this later"). `AddFamily { fromLogin }`: Back and Done reset to Main (Task 16 adds "Skip for now"). First-run Setup doesn't call `markSetupSeen`, so the first pill saved still opens Setup again: Task 7 (or 10's `useSavePill`) should decide.
- `App.tsx` shows a plain page-coloured view until `getSettings` and `signedInRelative` settle; a phone with a role but no login sees the login (with `again`) at every open, as `startRoute` says. Spec "Under the hood" rewritten. Not yet viewed on a device. Jest 40 suites / 334 tests.

### Task 15: Family on her phone: the tab, the code, and Allow
**Status**: ✓ Done (parallel, branch `ui/task-15`)
**Notes**:
- `useFollowRequests(onAnswered)` returns `{ asking, answer }`; Family and ShareCode render `<AllowDialog>` (a fading Modal that Back doesn't close, like the old non-cancelable alert). A request on screen when the page loses focus is asked again on return; a failed answer alerts and asks again. `family.allowBody` removed; new `allowSees/allowEdits/allowNotice/howToAdd/worksFor`; several family words changed (ml/hi drafts).
- ShareCode: Close (not Back) in the band; the 6 digit boxes are one group labelled "4 8 2 9 1 3" (tests use `findByLabelText`); the countdown rounds up and never shows 0; the amber chip is local to the screen.
- For Task 16: `remote.notEditor` still says "Settings → Family → …" (Family is a tab now; reword it). Opening `Elder` in tests needs both `getFamily` and `refreshFamily` to include her. Check on the phone (Task 18): the "Can change my pills" switch's off state may be faint on a white card.

### Task 13: History and one day
**Status**: ✓ Done (parallel, branch `ui/task-13`)
**Notes**:
- Deviation: the day page's "Mark as taken" button is now "I took it" (`t.history.tookIt`; coral on missed, secondary on skipped); its confirm alert still uses `t.today.markTakenTitle` / `markTaken`, so Day tests press "Mark as taken" in the alert. Strings: `history.percentTaken`/`doseCount` replaced by `taken`, `since`, `dayTaken`, `tookIt`, `someMissed`, `none`; month names stay short ("OCT").
- Theme additions: `colors.amber '#F0A030'` (shapes only, never words) and `timeTiles` (morning/afternoon/evening `{ fill, ink }`), which Task 10's time cards can reuse. `PART_ICON` is local to `HistoryDayScreen.tsx`; move it to `src/ui` if Task 10 needs it.
- Day circles are ~45 dp on a 360 dp phone (seven columns allow no more). Test IDs: `month-bar`, `dose-card`, `dose-time`. A PillEdit test ("scrolls the count into view from the refill banner") failed once under machine load and passed alone; watch for flakiness.

### Task 7: Alarm setup, on first open and from Settings
**Status**: ✓ Done (parallel, branch `ui/task-7`)
**Notes**:
- First-run Setup calls `markSetupSeen()` on mount (so the first pill saved doesn't open Setup again); Setup from Settings doesn't. First run ends with "Do this later" (→ Main); Finish shows only when every step is done. Without `firstRun`, Finish always shows and goes back. The App tester test now checks "2 of 4 done · Xiaomi phone" and presses "Do this later" (Review Focus 4).
- Builder calls: tapping a faded later step opens it instead (only one step open at a time; no dead end); after unticking, the step stays open. An AppState "active" re-read makes the battery step tick itself on return from the phone's settings. `SkyBand` `progress` takes an optional `label` (under the bar). `markSetupSeen` is in `mockAlarmsDefaults`.
- For Task 14: `oemSteps.ts` exports `setupProgress(steps, doneSteps, autoDone)`, `autoChecked(health | null)`, `stepDone`, `makerName`; steps left = `total - done` of `setupProgress(stepsFor(currentManufacturer()), setup.doneSteps, autoChecked(health))`. Renaming the Settings row "Make alarms reliable" to "Alarm setup" changes two tests (Settings, and SetupScreen's "Finish goes back to where setup was opened from").

### Task 12: Sounds, and recording in a pop-up
**Status**: ✓ Done (parallel, branch `ui/task-12`)
**Notes**:
- RecordScreen's logic lives unchanged in an inner `Recorder` that exists only while `RecordSheet` is open, so closing discards an unsaved take. SoundPicker title "Sound for 9:00 PM" + "Iron and Metformin ring together" (her `getToday` card, or `getElderSetup` pills at hour:minute on his phone); the default tone is the first row ("The phone's alarm"). SoundRow's play button is a sibling control (TalkBack can reach it). Record route/screen/test removed; 3 Record tests moved into `SoundPickerScreen.test.tsx`.
- Deviation: after a pick or saved recording SoundPicker goes `back` (fallback `replace('Main')`) instead of `popTo('Main'/'ElderPills')`. `Sheet` got keyboard padding (`keyboardDidShow`) and `testID="sheet"`. Phone check (Task 18): the recording name field and Task 11's sheet inputs stay above the keyboard inside the Modal.
- For Task 11: navigate to `SoundPicker` with `selectedSoundId` (still required); close `SoundTimesSheet` before navigating (a Modal stays above a pushed page); reload the summary on focus so the new sound name shows. Words: no symbols in buttons ("Listen", "Record again"); "Imported" → "Song"; removed `sound.yourSounds`, `record.changeFailed`.

### Task 8: Today on her phone
**Status**: ✓ Done (parallel, branch `ui/task-8`)
**Notes**:
- Deviations: `DoseCard.tsx` and `RefillBanner.tsx` stay until Task 16 (ElderScreen still uses them); `statusText` moved unchanged to `src/lib/today.ts`, `daysText` to `today/RefillCard.tsx`; only `HealthBanner.tsx` and `DoseCard.test.ts` deleted. `untilText` uses a new `t.today.until(h, m)` ("in 6 hr 50 min", "in 25 min", "now"), since `formatDuration` only gives m:ss.
- Decisions: `doseCounts` leaves out `later` and `done` so the day can reach "3 of 3 done"; with a dose missed and nothing left to ring the card says "Nothing more today"; done/later lines are one line with names joined (a pill added after the dose shows "(from tomorrow)"); Today ticks its clock every minute while focused; "+ Add family" is gone from empty Today (the Family tab has it). Strings: `today.title`/`titleOn` removed, `addPill` "Add a pill", `empty` "No pills yet", new `today.*`, `health.title/fix`.
- For Tasks 9–10: Today is one ScrollView (`today-scroll`): SkyTop, then a body lifted −44: WarningCard, RefillCards, the family block (old `FamilySection` in a Card, where Task 9's PersonCards go), NextDoseCard / EmptyToday, MissedCards, "Later today" DoseLines, done DoseLines, the dashed "Add a pill" row. Pill taps go through `openPill` (`PillEdit`); both add buttons call one `addPill` line. Reusable: `today/PillRow.tsx`, `WHEN_ICONS`. Tests: `clockAt(h, m)` helper; always `await fireEvent.press` in RNTL 14 (unawaited presses broke act for later tests in a full run).

### Task 14: Settings
**Status**: ✓ Done (parallel, branch `ui/task-14`)
**Notes**:
- Steps left = `total - done` from `setupProgress(stepsFor(currentManufacturer()), doneSteps, autoChecked(health))`, re-read whenever the tab gains focus (tabs stay mounted); a failed read counts as nothing done; nothing shows until both reads settle.
- Strings: removed `settings.whenItRings/reliability/makeReliable`; added `readAloudNote`, `hear`, `alarmSetup`, `stepsLeft(n)`, `allSet`; `draft` is now the bare tag word. Language tiles are radios named by the language (draft as `accessibilityHint`); rows that open something have the title as label and the note as hint. In a row, the switch or Try it chip drops under the words when they need the room (large text, Malayalam).
- Phone check (Task 18) at font scale 2.0: the language tiles wrap; Try it moves under "Hear how it sounds" in Malayalam; amber "steps left" reads clearly.

### Task 17: The ringing screen
**Status**: ✓ Done in code (parallel, branch `ui/task-17`); Step 4 (ring it on the emulator) deferred, see Blockers
**Notes**:
- The sky comes from the hour the ring started (`SkyTime`; a ring has no due hour, and adding one would touch the engine). Words are navy on dawn/day/evening and white at night, so the snooze button and sound chip have light versions (`ringing_snooze_bg_light`, `ringing_chip_light`). The screen draws behind the system bars (keeps Skip above a 3-button bar on Android 15). Every view id and click handler kept; `ringing_title` got an id.
- Deviations: "I took it" uses the app green `#2E9E5B` (white 21 sp on `#34B36A` is 2.7:1, under 3:1); title and time stay in dp (58 sp overflows at font scale 2.0); the capsule is tilted two-tone as in `PillPicture`; snooze gets the `snooze` icon. Fonts load in code inside try/catch (falls back to the phone's bold font, or words without icons). New `RingingLook.kt` (AM/PM split, soft box colour) with `RingingLookTest`. Gradle: 298 unit tests, BUILD SUCCESSFUL.
- Strings also relabel the ringing notification's buttons ("I took it", "Remind me in 10 min"); ml/hi drafts "ഞാൻ കഴിച്ചു" / "मैंने ले ली" etc. (Task 18: align with the JS drafts).

### Task 9: Today on a relative's phone
**Status**: ✓ Done (parallel, branch `ui/task-9`)
**Notes**:
- Layout: PersonCards come first in the lifted body, then a "My pills" label, then this phone's own Today in her order (WarningCard, RefillCards, NextDose…). With people but no pills of his own: "You have no pills of your own." + an "Add a pill" link (same `addPill`). `FamilySection.tsx` deleted; PersonCard (`testID="person-card"`) holds its own refill and heard lines.
- Data: `problemsOf` calls `getElderSetup` per person on every family load (and the 2-minute timer); cards and problems show together; a failed read gives no problem line. The greeting's first name comes from `signedInRelative()` via a new `firstName()` in `lib/family.ts`, only when he follows someone. Before her first upload, the tally is hidden and "Not heard from Amma's phone yet" is the last amber line.
- Deviations: PersonCard takes `is24h`; the real signature is `problemText(problem, t, name)`; the name area and the missed line are separate buttons to her page, with Call a 48 dp round green button beside them. "Family" heading and "+ Add family" gone from Today. For Task 16: `remote.problem` still ends "…tap the yellow banner." (reword: her Today now shows an "Alarms may not ring" card with "Fix now"); her page can reuse the round Call style and `firstName`.

### Task 10: Adding a pill in five steps
**Status**: ✓ Done (parallel, branch `ui/task-10`)
**Notes**:
- `AddPill: { elderId?: string } | undefined`. Her phone: no band title (step bar beside ×); his: "Add a pill for Amma", step 3 says "Times are Amma's time.". Back/Next/Save sit in a fixed footer (`add-pill-foot`) below the scroll and above the keyboard. Step 3 cards tick on tap; tick (checkbox "Morning, 8:00 AM") and "Change" are separate controls; "Another time" hides at 6 times. Step 5 Tablets left is a row with "+ Add" (+10/+15/+30). The phone's Back closes Add pill (doesn't step back).
- Deviations: presets are 5/10/30 days everywhere (7 and 20 now load as "Other…"); `AmountStepper` shows the number with the unit under it, read as one label ("½ tablet"); `PillEdit` route now requires `pillId` (add-only branches and `pill.addTitle` gone); no `tooBig` on pill save (it never had it). New hooks `useElder(elderId?)` → `{ name, otherZone }`, `usePickPhoto(onPicked)` → `pick(source)`; `amount.ts` adds `amountParts`, `kindAndAmount` ("Tablet · 1 each time"); `t.addPill.joinTimes([...])`.
- For Task 11: `pillDraft.ts` exports `PillDraft` (plan fields + `savedPhoto`, the photo as loaded, so a relative's send knows keep/drop/replace), `Duration = 5|10|30|'other'|'none'`, `Step`, `PRESETS`, `MAX_TIMES = 6`, `QUICK_TIMES`, `sameTime`, `byTime`, `isCountable`, `daysOf`, `emptyDraft`, `draftFromPill`, `stepReady`, `draftReady`, `toPillInput` (throws without a duration), `addToCount`. `useSavePill(elderId?, { elderName?, onSaved? })` → `{ save, saving }`; without `onSaved` it leaves the page; pass `onSaved` to close a sheet and stay; `save` resolves false on failure/not ready/already saving. PillEdit already loads with `draftFromPill` and saves with `useSavePill` (only its time and count controls are its own). 25 tests remain in `PillEditScreen.test.tsx` to port (editing 11, counts 8, her pill on his phone 6); PillEdit's own time editing has no test until Task 11's sheets.

### Task 11: The pill summary and its sheets
**Status**: ✓ Done (parallel, branch `ui/task-11`)
**Notes**:
- `Pill: { pillId; elderId?; focusCount? }`, reloaded on every focus. Her phone reads `listPills`, `getToday` (each time's alarmId, soundId, refill) and `listSounds` (a failure of either still shows the page, default tone); his reads `getFamily`, `getElderSetup` (`times[].soundName`) and `listChanges` (`waitingByPill`). Each sheet saves the whole `draftFromPill` draft plus its change via `useSavePill(…, { onSaved })`; only CountSheet sets `countChanged`. His phone: amber "Waiting for Amma's phone: …" strip (Cancel only for `mine && pending`); "Times are Amma's time." always shows.
- Deviations: a `PhotoSheet` (Camera, Gallery, Remove); `components/pill/TimeTile.tsx` duplicates HistoryDay's `PART_ICON` (Task 18 may dedupe); `sheetLook.ts` for shared sheet styles; `SkyBand` gained `children`; the whole page scrolls (sky and hero too); her phone has no band title (`headerTitles()` is `[]`), his is "Amma's pill"; the default tone reads `t.common.defaultTone`; a time with no card today isn't tappable in the sound sheet. PillEditScreen and its test are gone; no "PillEdit" left in `src` or `__tests__`.
- The PillScreen sound-row tests now cover ElderPills' "Alarm sounds" section ("a time opens the sound list for her dose at that time" proves `{ elderId, hour, minute }` and `selectedSoundId`), so that section's test and the "8:00 AM · Ravi's sound" expectation can go with it. Phone checks (Task 18): sheet fields and Save stay above the keyboard; the camera returns to the summary with the new photo; the sound sheet is gone before SoundPicker slides in; 60-char name at font scale 2.0; hero readable on the night sky.

### Task 16: The relative's family pages
**Status**: ✓ Done (parallel, branch `ui/task-16`; ElderPills' pill-row link repointed to `Pill` during the merge, "Alarm sounds" removed in the follow-up commit "refactor: her sounds live on each pill's page": the section, its "a time opens the sound picker" test and `remote.soundsHeading` are gone; PillScreen's sound-row tests cover them)
**Notes**:
- AddFamily with `fromLogin`: no Back in the band (C4); "Skip for now" on the login and code steps resets to Main; the waiting step has ×; the phone's Back from the login leaves the app (as first-run Setup does). The code is six `digit-box`es over one nearly invisible `TextInput` (`number-pad`, `maxLength={6}`, digits only). "Logged in as …" sits beside his letter avatar.
- Kit: `SkyBand` takes `picture` and `action` (her avatar before the title, which moves under the buttons, and Call after it) alongside Task 11's `children`. Her page keeps her low pills ("About N days.") in the amber card under her alarm problem; dose chips "✓ 8:04 AM", Missed, Later, Not reported yet, Skipped; Call is a 52 dp round button labelled "Call"; "Change pills" → "Her pills". `DoseCard.tsx` and `RefillBanner.tsx` deleted (`daysText` stays, ElderScreen uses it).
- Words: `remote.problem` ends "…tap Fix now."; `remote.notEditor` "On her phone: open PillSaathi, tap Family, then turn on Can change my pills on your card."; `remote.done` "✓ Done at …"; `recentHeading` "Recent changes". Removed `family.signIn/next/phoneHint`, `remote.changePills/addPill/waitingHeading`. Phone checks (Task 18): the hidden code field opens the number pad, pastes, and TalkBack reads it; her page at font scale 2.0; the night band's white words; the Almost done form above the keyboard.

---

## Blockers / Deferred Items

<!-- Anything that couldn't be completed or was deferred -->

### Task 17: the ringing screen has not been seen on a device
The emulator (`Medium_Phone_API_34`, emulator-5556) exited at about 19:45 during the build, before a ring could be triggered. Do it with Task 18's phone checks: install with `install -r`, `DEBUG_ADD_PILL --ei minutes_from_now 1` (tablet, capsule, syrup, drops on one ring), test I took it / Remind me in 10 min / Skip, check with `DEBUG_LIST`. Test pills on Amma's emulator upload to Firebase and show on the Redmi. Checks: over the lock screen; night sky 19:00–4:59; moon cut-out and sun rings look right; icons centred in the buttons; the palest pill colour shows; font scale 2.0 keeps the buttons on screen; TalkBack reads "I took it".
