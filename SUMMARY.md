# Implementation Progress

**Plan file**: docs/superpowers/plans/2026-10-29-ui-redesign.md
**Next task**: 3
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

---

## Blockers / Deferred Items

<!-- Anything that couldn't be completed or was deferred -->
