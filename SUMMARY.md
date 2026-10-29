# Implementation Progress

**Plan file**: docs/superpowers/plans/2026-10-29-ui-redesign.md
**Next task**: 9, 10 (running in parallel, one worktree and branch `ui/task-N` each); then 11, 16, 18
**Waves**: A = 7, 8, 12, 13, 15, 17 ✓ · B = 9, 10, 14 (14 ✓) · C = 11 · D = 16 · then 18. Parallel agents don't edit this file; the orchestrator merges their branches (cherry-pick) and adds their notes here.
**Last updated**: 2026-10-29

Branch: `feature/ui-redesign` (one commit per task). Baseline before Task 1: 30 suites, 272 JS tests passing.
Spec: `docs/superpowers/specs/2026-10-29-ui-redesign-design.md`; mockups beside it (`10-journeys.html` wins).

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

---

## Blockers / Deferred Items

<!-- Anything that couldn't be completed or was deferred -->

### Task 17: the ringing screen has not been seen on a device
The emulator (`Medium_Phone_API_34`, emulator-5556) exited at about 19:45 during the build, before a ring could be triggered. Do it with Task 18's phone checks: install with `install -r`, `DEBUG_ADD_PILL --ei minutes_from_now 1` (tablet, capsule, syrup, drops on one ring), test I took it / Remind me in 10 min / Skip, check with `DEBUG_LIST`. Test pills on Amma's emulator upload to Firebase and show on the Redmi. Checks: over the lock screen; night sky 19:00–4:59; moon cut-out and sun rings look right; icons centred in the buttons; the palest pill colour shows; font scale 2.0 keeps the buttons on screen; TalkBack reads "I took it".
