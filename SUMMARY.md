# Implementation Progress

**Plan file**: docs/superpowers/plans/2026-10-29-ui-redesign.md
**Next task**: 7, 8, 12, 13, 15, 17 (running in parallel, one worktree and branch `ui/task-N` each)
**Waves**: A = 7, 8, 12, 13, 15, 17 · B = 9, 10, 14 · C = 11 · D = 16 · then 18. Parallel agents don't edit this file; the orchestrator merges their branches and adds their notes here.
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

---

## Blockers / Deferred Items

<!-- Anything that couldn't be completed or was deferred -->
