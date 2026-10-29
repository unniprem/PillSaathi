# Implementation Progress

**Plan file**: docs/superpowers/plans/2026-10-29-ui-redesign.md
**Next task**: 4
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

---

## Blockers / Deferred Items

<!-- Anything that couldn't be completed or was deferred -->
