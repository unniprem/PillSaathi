# Sky UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild every screen in the Sky look, add the login page and first-open flow on every phone, and restyle the native ringing screen, without touching the alarm engine.

**Architecture:** A small UI kit in `src/ui/` (tokens, icon font, pill shapes, sky headers, buttons, sheet, tab bar) that every screen is rebuilt on. Navigation becomes one native stack (no native headers) holding Login, Who, a bottom-tab `Main` (Today, History, Family, Settings) and the pushed pages, each drawing its own sky band. Native work is limited to bundled fonts, a `role` setting, a `display` settings target, and the ringing screen's layout, drawables and strings.

**Tech Stack:** React Native 0.88 (New Architecture), React Navigation 7 (+ `@react-navigation/bottom-tabs`), Kotlin, Jest + React Native Testing Library, JUnit.

**Spec:** `docs/superpowers/specs/2026-10-29-ui-redesign-design.md`. Mockups beside it; `10-journeys.html` is the newest and wins. Screen numbers E1–E14 and C1–C11 refer to it.

**One refinement of the spec (login), made while planning:** a Google account can belong to only one Firebase login. Linking her phone's anonymous login to Google would take over the account's existing login, and on a phone already logged in as a relative it would change that relative's id and break the elders who follow-list it. So the login page uses today's Google sign-in (the phone's "family" Firebase app, `signInWithGoogle`), and her elder id stays her phone's anonymous login, untouched. Her id, online copy and followers stay as they are, which is what the spec asks. The "already the elder on another phone" case cannot arise. Task 6 updates the spec's "Under the hood" bullets to say this.

## Global Constraints

- The alarm engine, scheduling, snooze, records and the `:ringing` process are untouched. The ringing screen changes only layout, drawables, fonts and strings; its button handlers stay as they are.
- **No SVG anywhere**: no `react-native-svg`, no `.svg` assets. Icons come only from the Material Symbols Rounded font through `<Icon>`. No emoji as icons (the "✓" inside status text stays).
- Font: Nunito at weights 600, 700, 800 and 900 for all text. Malayalam and Hindi fall back to the phone's fonts.
- Colours come only from `src/theme.ts`. Fills: navy `#15324A`, page `#F5F8FB`, card `#FFFFFF`, blue `#2A7BB8` (tint `#E3F1FB`), green `#2E9E5B` (tint `#E5F5EC`), coral `#E0533D` (tint `#FFF0EC`), amber (tint `#FFF3D6`). Text on light backgrounds uses the 4.5:1 shades: muted `#5B6E7E`, coral text `#C2412D`, green text `#1F7A43`, amber text `#8A5A00`, blue `#2A7BB8`. White text sits only on blue, or on green and coral at 18 sp bold and up.
- Sky by the hour: dawn 5:00–7:59, day 8:00–16:59, evening 17:00–18:59, night 19:00–4:59. Greetings: morning 5–11, afternoon 12–16, evening otherwise.
- Add-pill step 3 offers Morning 8:00 AM, Afternoon 1:30 PM and Night 9:00 PM.
- Words: "I took it" (action; the status stays "✓ Taken 8:04"), "Remind me in 10 min", "Skip this time", "Continue with Google", "Logged in as {email}", "Make alarms ring every time" (Setup title), "Let's make sure alarms ring" (first open), "Alarm setup" (Settings row), "Continue offline", "Skip for now".
- Every icon-only control has an `accessibilityLabel`. Tap targets are at least 48 dp.
- Every screen scrolls rather than clipping, at font scale 2.0 on a 360 dp-wide phone. No `numberOfLines` on pill names or people's names.
- `en`, `ml` and `hi` keep identical keys (the i18n test). New `ml` and `hi` strings are drafts.
- No Firebase rules change. Free plan only.
- Existing behaviour tests are ported to the new screens. A test is deleted only when the spec removes its behaviour (the sound line on Today; the separate Alarm sounds section on her pills page), and in that case the behaviour's new home gets the test.

## Review Focus

1. **Large text (font scale 1.3–2.0) on a 360 dp phone:** every screen must scroll, and "I took it", Save and Next must stay reachable. The tall sky header must not push the next-dose card off-screen. Pinned in Task 8 (Today is a ScrollView, with no fixed heights on text) and checked on the phone in Task 18.
2. **Long names** (a 60-character pill name; Malayalam names; "Amma (Kochi)"): cards wrap and keep their buttons. Pinned in Task 8 (a long name keeps "I took it") and Task 9 (a long elder name keeps Call).
3. **No internet, or a build without Firebase config, at first open:** the login page must still reach Today through "Continue offline", and alarms must be set. Pinned in Task 6.
4. **A tester's phone updated in place** (pills present, no role saved): the login shows once, "I take medicines" keeps everything, and first-open setup shows the steps already done as ticked. Pinned in Task 6 (the start route) and Task 7 (first run keeps existing ticks).
5. **Around midnight:** a 0:30 dose seen at 23:00 is "Tonight", and when every dose is done the card shows tomorrow's first time. Pinned in Task 8 (`arrangeToday`, `whenChip`).

---

## File Structure

New, `src/ui/` (the kit; no screen logic):
- `sky.ts`: sky and greeting by hour, gradients.
- `pillLook.ts`: pill palette, `pillColor`, `nameIndex`.
- `icons.ts`, `Icon.tsx`: the icon font map and component.
- `PillPicture.tsx`, `Avatar.tsx`.
- `SkyBand.tsx` (inner-page header), `SkyTop.tsx` (tall Today header).
- `Button.tsx`, `Card.tsx`, `Chip.tsx`, `Stepper.tsx`, `Sheet.tsx`, `DoseBars.tsx`, `TabBar.tsx`.

New, logic: `src/lib/today.ts`, `src/lib/start.ts`, `src/lib/pillDraft.ts`, `src/hooks/useSavePill.ts`.

New, screens and parts: `src/screens/LoginScreen.tsx`, `WhoScreen.tsx`, `AddPillScreen.tsx`, `PillScreen.tsx`; `src/components/today/*` (NextDoseCard, MissedCard, DoseLine, WarningCard, RefillCard, EmptyToday, PersonCard); `src/components/pill/*` (the summary's sheets); `src/components/RecordSheet.tsx`; `src/components/AllowDialog.tsx`.

Removed by the end: `src/components/DoseCard.tsx`, `FamilySection.tsx`, `HealthBanner.tsx`, `RefillBanner.tsx`, `PillPicture.tsx` (moved to `src/ui`), `src/screens/PillEditScreen.tsx`, `src/screens/RecordScreen.tsx`.

Native: `android/app/src/main/res/font/*` (fonts), `MainApplication.kt` (registers fonts), `alarm/SkyTime.kt`, `alarm/PillLook.kt`, `alarm/AppSettings.kt` + `AlarmJson.kt` (role), `bridge/NativeAlarmsModule.kt` (role, display target), the ringing layout, drawables, strings and `RingingActivity.kt`.

---

### Task 1: Fonts, theme tokens, and the sky and pill-colour rules

**Files:**
- Create: `android/app/src/main/res/font/nunito_semibold.ttf`, `nunito_bold.ttf`, `nunito_extrabold.ttf`, `nunito_black.ttf`, `nunito.xml`, `symbols_filled.ttf`, `symbols_outlined.ttf`
- Modify: `android/app/src/main/java/com/pillsaathi/MainApplication.kt`
- Modify: `src/theme.ts`
- Create: `src/ui/sky.ts`, `src/ui/pillLook.ts`
- Create: `android/app/src/main/java/com/pillsaathi/alarm/SkyTime.kt`, `alarm/PillLook.kt`
- Test: `__tests__/ui/sky.test.ts`, `__tests__/ui/pillLook.test.ts`, `android/app/src/test/java/com/pillsaathi/alarm/SkyTimeTest.kt`, `PillLookTest.kt`

**Interfaces:**
- Produces, `src/theme.ts`: `colors` with the Global Constraints values under these keys: `page, card, navy, muted, line, soft, blue, blueTint, green, greenTint, greenText, coral, coralTint, coralText, amberTint, amberText, onFill`. It also keeps today's keys as aliases so unconverted screens still compile: `background=page, surface=soft, text=navy, textMuted=muted, primary=blue, onPrimary=onFill, border=line, danger=coralText, success=greenText, warning=amberText`. Values: `line '#E3EAF0'`, `soft '#F1F5F9'`. Also `spacing` (unchanged), `radius = { card: 22, big: 26, button: 18, pill: 999 }`, `font(weight: 600 | 700 | 800 | 900): { fontFamily: 'Nunito'; fontWeight: '600' | '700' | '800' | '900' }`, and `shadow = { card: '0 4 14 0 rgba(21,50,74,0.06)', float: '0 14 34 0 rgba(21,50,74,0.16)' }` (for the `boxShadow` style).
- Produces, `src/ui/sky.ts`: `type Sky = 'dawn' | 'day' | 'evening' | 'night'`; `skyFor(hour: number): Sky`; `greetingFor(hour: number): 'morning' | 'afternoon' | 'evening'`; `whenChip(hour: number): 'morning' | 'afternoon' | 'tonight'` (5–11 morning, 12–16 afternoon, otherwise tonight); `SKY_GRADIENT: Record<Sky, [string, string, string]>` = dawn `['#8DCAF0','#C4E4F6','#FFE1C2']`, day `['#6DBBEA','#A9D9F2','#FBE2C4']`, evening `['#F2A27A','#F7C59F','#FBE2C4']`, night `['#0E1A3C','#1F3368','#3B5797']`.
- Produces, `src/ui/pillLook.ts`: `PILL_PALETTE = ['#9B3D2E','#F0845F','#5B8DEF','#E9C46A','#7FB685','#B48CDB','#F4F1EA','#E07A9B']`; `nameIndex(name: string, n: number): number` = (sum of UTF-16 code units of `name.trim().toLowerCase()`) mod `n`; `pillColor(name: string): string = PILL_PALETTE[nameIndex(name, 8)]`.
- Produces, Kotlin: `enum class Sky { DAWN, DAY, EVENING, NIGHT }` and `object SkyTime { fun of(hour: Int): Sky }`, with the same hours; `object PillLook { val PALETTE: IntArray; fun colorFor(name: String): Int }`, with the same palette (ARGB ints, alpha FF) and the same algorithm.
- Produces: React Native font families `'Nunito'` (weights 600–900), `'Symbols'` (filled) and `'SymbolsOutlined'`, registered from `res/font`. The native ringing screen reads the same files through `R.font.*`.

- [ ] **Step 1: Write the failing JS tests**

```ts
// __tests__/ui/sky.test.ts
test('the sky follows the clock', () => {
  expect([4, 5, 7, 8, 16, 17, 18, 19, 0].map(skyFor)).toEqual(
    ['night', 'dawn', 'dawn', 'day', 'day', 'evening', 'evening', 'night', 'night']);
});
test('greetings', () => {
  expect([5, 11, 12, 16, 17, 2].map(greetingFor)).toEqual(
    ['morning', 'morning', 'afternoon', 'afternoon', 'evening', 'evening']);
});
test('a dose after midnight is tonight', () => {
  expect([8, 13, 21, 0].map(whenChip)).toEqual(['morning', 'afternoon', 'tonight', 'tonight']);
});
// __tests__/ui/pillLook.test.ts
test('a pill keeps its colour whatever its spacing or case', () => {
  expect(pillColor('Iron')).toBe('#9B3D2E');          // "iron" sums to 440, 440 % 8 = 0
  expect(pillColor(' iron ')).toBe('#9B3D2E');
  expect(pillColor('Metformin 500')).toBe('#F4F1EA'); // sums to 1158, % 8 = 6
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx jest __tests__/ui`
Expected: FAIL, "Cannot find module '../../src/ui/sky'".

- [ ] **Step 3: Implement `src/ui/sky.ts`, `src/ui/pillLook.ts`, and the new `src/theme.ts` tokens**

- [ ] **Step 4: Run the JS tests and see them pass**

Run: `npx jest __tests__/ui`
Expected: PASS.

- [ ] **Step 5: Write the Kotlin tests**

`SkyTimeTest`: the same hours as the JS test, mapped to `Sky.*`. `PillLookTest`: `assertEquals(0xFF9B3D2E.toInt(), PillLook.colorFor("Iron"))` and `assertEquals(0xFFF4F1EA.toInt(), PillLook.colorFor("Metformin 500"))`. Build the palette from hex without `android.graphics.Color`, because the JVM unit tests have no Android framework.

- [ ] **Step 6: Implement `SkyTime.kt` and `PillLook.kt`, then run the tests**

Run: `cd android && ./gradlew :app:testDebugUnitTest --tests 'com.pillsaathi.alarm.SkyTimeTest' --tests 'com.pillsaathi.alarm.PillLookTest'`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 7: Fetch the fonts**

Google Fonts serves `.ttf` to an old user agent:
```bash
UA='Mozilla/4.0'
curl -sA "$UA" 'https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900' | grep -o 'https://[^)]*'
curl -sA "$UA" 'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,500,1,0' | grep -o 'https://[^)]*'
curl -sA "$UA" 'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,500,0,0' | grep -o 'https://[^)]*'
```
Download each URL to the matching `res/font` name. If a `.woff2` comes back instead, make the two static Symbols instances from Google's variable font with fontTools: `pip install fonttools`, then `fonttools varLib.instancer 'MaterialSymbolsRounded[FILL,GRAD,opsz,wght].ttf' FILL=1 GRAD=0 opsz=24 wght=500 -o symbols_filled.ttf` (and `FILL=0` for outlined). Write `nunito.xml` as a `<font-family>` with one `<font app:fontWeight=… app:font="@font/nunito_…"/>` per weight.

- [ ] **Step 8: Register the fonts in `MainApplication.onCreate`**

`ReactFontManager.getInstance().addCustomFont(this, "Nunito", R.font.nunito)`, `"Symbols"` → `R.font.symbols_filled`, `"SymbolsOutlined"` → `R.font.symbols_outlined`.

- [ ] **Step 9: Build and run all JS tests**

Run: `cd android && ./gradlew :app:assembleDebug && cd .. && npx jest`
Expected: BUILD SUCCESSFUL; all suites pass (the alias keys keep old screens compiling).

- [ ] **Step 10: Commit**

```bash
git add android/app/src/main/res/font android/app/src/main/java/com/pillsaathi/MainApplication.kt android/app/src/main/java/com/pillsaathi/alarm/SkyTime.kt android/app/src/main/java/com/pillsaathi/alarm/PillLook.kt android/app/src/test/java/com/pillsaathi/alarm/SkyTimeTest.kt android/app/src/test/java/com/pillsaathi/alarm/PillLookTest.kt src/theme.ts src/ui/sky.ts src/ui/pillLook.ts __tests__/ui
git commit -m "feat: add the Sky fonts, colours, and sky and pill-colour rules"
```

---

### Task 2: Icon, PillPicture and Avatar

**Files:**
- Create: `src/ui/icons.ts`, `src/ui/Icon.tsx`, `src/ui/PillPicture.tsx`, `src/ui/Avatar.tsx`
- Delete: `src/components/PillPicture.tsx` (point its importers at `src/ui/PillPicture`)
- Test: `__tests__/ui/Icon.test.tsx`, `__tests__/ui/PillPicture.test.tsx`, `__tests__/ui/Avatar.test.tsx`

**Interfaces:**
- Consumes: `pillColor`, `nameIndex` (Task 1).
- Produces: `type IconName` = `'home' | 'calendar_month' | 'group' | 'settings' | 'add' | 'remove' | 'check' | 'check_circle' | 'close' | 'arrow_back' | 'arrow_forward' | 'chevron_left' | 'chevron_right' | 'photo_camera' | 'image' | 'mic' | 'upload' | 'play_arrow' | 'pause' | 'stop' | 'share' | 'call' | 'notifications' | 'visibility' | 'edit' | 'delete' | 'schedule' | 'event' | 'music_note' | 'volume_up' | 'snooze' | 'medication' | 'medication_liquid' | 'water_drop' | 'inventory_2' | 'qr_code_2' | 'qr_code_scanner' | 'wb_twilight' | 'light_mode' | 'bedtime' | 'elderly_woman' | 'family_restroom' | 'person' | 'person_add' | 'hourglass_top' | 'verified_user' | 'translate' | 'format_size' | 'record_voice_over' | 'warning' | 'question_mark'`.
- Produces: `ICONS: Record<IconName, string>`, each the glyph's code point as a string, taken from Google's `MaterialSymbolsRounded[FILL,GRAD,opsz,wght].codepoints` file (`google/material-design-icons`, `variablefont/`).
- Produces: `<Icon name: IconName; size?: number = 24; color?: string; outlined?: boolean; accessibilityLabel?: string />`. It is a `Text` in `'Symbols'` (or `'SymbolsOutlined'` when outlined) with `allowFontScaling={false}`, hidden from accessibility unless it has a label.
- Produces: `<PillPicture pill: { name: string; form: PillForm; photoUri: string | null }; size?: 30 | 40 | 56 />`. A photo is a rounded `Image` (testID `pill-photo`). Without one: tablet is a round view with a score line; capsule is a two-tone pill view rotated −45°; syrup is `<Icon name="medication_liquid">`; drops is `<Icon name="water_drop">`. All use `pillColor(name)`, with testID `pill-shape-<form>`.
- Produces: `<Avatar name: string; size?: number = 46; icon?: IconName />`. It shows the first letter, upper-cased (or the icon), on a two-colour gradient from `AVATAR_COLORS[nameIndex(name, 6)]`.

- [ ] **Step 1: Write the failing tests**

```tsx
test('an icon is its code point in the Symbols font', () => {
  render(<Icon name="home" />);
  expect(screen.getByText(ICONS.home)).toHaveStyle({ fontFamily: 'Symbols' });
});
test('outlined icons use the outlined font', () => { /* fontFamily 'SymbolsOutlined' */ });
test('a labelled icon can be found by its label', () => { /* getByLabelText('History') */ });
test('every icon is one private-use code point', () => {
  Object.values(ICONS).forEach(c => {
    expect([...c]).toHaveLength(1);
    expect(c.codePointAt(0)!).toBeGreaterThanOrEqual(0xe000);
  });
});
test('a pill with a photo shows the photo', () => { /* getByTestId('pill-photo').props.source.uri === 'file:///p.jpg' */ });
test('a tablet without a photo is a round shape in its colour', () => {
  render(<PillPicture pill={{ name: 'Iron', form: 'tablet', photoUri: null }} />);
  expect(screen.getByTestId('pill-shape-tablet')).toHaveStyle({ backgroundColor: '#9B3D2E' });
});
test('syrup uses the liquid medicine symbol', () => { /* getByText(ICONS.medication_liquid) */ });
test('an avatar shows the first letter', () => { /* <Avatar name="amma" /> → getByText('A') */ });
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx jest __tests__/ui/Icon.test.tsx __tests__/ui/PillPicture.test.tsx __tests__/ui/Avatar.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `icons.ts`, `Icon.tsx`, `PillPicture.tsx` and `Avatar.tsx`; move today's PillPicture importers over**

- [ ] **Step 4: Run all tests**

Run: `npx jest`
Expected: PASS (Today's "photo" and "type icon" tests still pass; update their queries to the new testIDs if they used the old ones).

- [ ] **Step 5: Commit**

```bash
git add src/ui __tests__/ui src/components src/screens __tests__/screens
git commit -m "feat: add the icon font, pill pictures and letter avatars"
```

---

### Task 3: Sky headers, buttons, cards, chips, stepper, sheet, dose bars, tab bar

**Files:**
- Create: `src/ui/SkyBand.tsx`, `SkyTop.tsx`, `Button.tsx`, `Card.tsx`, `Chip.tsx`, `Stepper.tsx`, `Sheet.tsx`, `DoseBars.tsx`, `TabBar.tsx`
- Modify: `src/components/AmountStepper.tsx` (draw it with `Stepper`), `src/i18n/en.ts`, `ml.ts`, `hi.ts`
- Test: `__tests__/ui/kit.test.tsx`

**Interfaces:**
- Consumes: Tasks 1–2.
- Produces: `<SkyBand title: string; sub?: string; onBack?: () => void; onClose?: () => void; right?: ReactNode; progress?: { step: number; total: number }; hour?: number />`. It is a short gradient band using `SKY_GRADIENT[skyFor(hour ?? now)]`, with 48 dp round back and close buttons labelled `t.common.back` and `t.common.close`. The title has testID `sky-title`. With `progress`, it shows a bar and `t.steps.of(step, total)`.
- Produces: `<SkyTop hour: number; title: string; sub?: string; children?: ReactNode />`. It is the tall header (min height 196): sun and clouds for dawn and day, sun low for evening, moon and stars for night, all made of rounded views. The title has testID `sky-title`, and children render under the date (for example the dose bars).
- Produces: `<Button label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'green' | 'coral' = 'primary'; icon?: IconName; disabled?: boolean; testID?: string />`, min height 52 and radius 18.
- Produces: `<Card style?; children />` (white, radius 22, `shadow.card`); `<Chip label: string; on?: boolean; onPress?: () => void; icon?: IconName />` (`accessibilityState.selected`); `<Stepper value: string; sub?: string; onLess: () => void; onMore: () => void; lessLabel: string; moreLabel: string />`.
- Produces: `<Sheet visible: boolean; onClose: () => void; title?: string; children />`. It is an RN `Modal` (transparent, slide) with a dim backdrop that closes it when tapped, and a grab handle.
- Produces: `<DoseBars taken: number; missed: number; rest: number />`, one rounded segment per dose (green, then coral, then white).
- Produces: `TabBar(props: BottomTabBarProps)`, a floating white bar. Each route shows an icon and `t.tabs.<route>`; the selected one has a blue-tint pill and a filled icon, the others outlined. `accessibilityRole="tab"`.
- Produces strings: `common.back 'Back'`, `common.close 'Close'`, `common.next 'Next'`, `common.continue 'Continue'`, `steps.of: (n, total) => \`${n} of ${total}\``, `tabs.{Today,History,Family,Settings}` ('Today', 'History', 'Family', 'Settings').

- [ ] **Step 1: Write the failing tests**

```tsx
test('the sky band shows its title and goes back', () => {
  const onBack = jest.fn();
  renderWithI18n(<SkyBand title="Iron" onBack={onBack} />);
  expect(screen.getByTestId('sky-title')).toHaveTextContent('Iron');
  fireEvent.press(screen.getByLabelText('Back'));
  expect(onBack).toHaveBeenCalled();
});
test('the sky band shows step progress', () => { /* progress {step:3,total:5} → getByText('3 of 5') */ });
test('a closed sheet shows nothing', () => { /* visible false → queryByText('Inside') null */ });
test('an open sheet closes from its backdrop', () => { /* press testID 'sheet-backdrop' → onClose */ });
test('a chosen chip says so', () => { /* accessibilityState.selected true */ });
test('dose bars draw one bar per dose', () => { /* taken 1, missed 1, rest 1 → 3 testID 'dose-bar' */ });
```
(`renderWithI18n` wraps in `I18nProvider`; add it to `__tests__/helpers/` if it isn't there.)

- [ ] **Step 2: Run them and see them fail**

Run: `npx jest __tests__/ui/kit.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Check the gradient style name in RN 0.88**

Run: `grep -n "backgroundImage" node_modules/react-native/Libraries/StyleSheet/StyleSheetTypes.d.ts`
Use whichever exists (`backgroundImage` or `experimental_backgroundImage`) with `linear-gradient(180deg, a, b, c)`. Use `boxShadow` for shadows.

- [ ] **Step 4: Implement the kit components and strings; draw `AmountStepper` with `Stepper`**

- [ ] **Step 5: Run all tests**

Run: `npx jest`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/ui src/components/AmountStepper.tsx src/i18n __tests__/ui __tests__/helpers
git commit -m "feat: add the sky headers, buttons, cards, sheet and tab bar"
```

---

### Task 4: Navigation: bottom tabs, and a sky band on every page

**Files:**
- Modify: `package.json` (add `@react-navigation/bottom-tabs` ^7, matching `@react-navigation/native`)
- Modify: `src/navigation/RootNavigator.tsx`
- Modify: every screen in `src/screens/` (render `<SkyBand>` with today's title; drop `navigation.setOptions({ title / headerRight })`)
- Modify: `src/screens/TodayScreen.tsx` (drop the 📅 and ⚙ header buttons), `src/screens/SettingsScreen.tsx` (drop the Family row)
- Modify: `__tests__/helpers/renderApp.tsx`, and the screen tests that opened Settings or History from the header or Family from Settings
- Test: `__tests__/navigation/tabs.test.tsx`

**Interfaces:**
- Produces: `TabParamList = { Today: undefined; History: undefined; Family: undefined; Settings: undefined }`, and in `RootStackParamList`: `Main: NavigatorScreenParams<TabParamList> | undefined` and `ElderHistory: { elderId: string }`. The stack keeps every other route as it is for now. All stack screens use `headerShown: false`. `Main` is the initial route.
- Produces: `TAB_ROUTES: (keyof TabParamList)[]`. `renderApp(route, params)` opens `Main` with `{ screen: route, params }` when `route` is a tab, and `headerTitles()` returns the text of every `sky-title` on screen.
- History is a tab for this phone's own history. Her history on a relative's phone is the stack route `ElderHistory`, with the same `HistoryScreen`.

- [ ] **Step 1: Write the failing test**

```tsx
test('the tab bar opens each main page', async () => {
  renderApp('Today');
  fireEvent.press(await screen.findByRole('tab', { name: 'Settings' }));
  expect(headerTitles()).toContain('Settings');
  fireEvent.press(screen.getByRole('tab', { name: 'History' }));
  expect(headerTitles()).toContain('History');
  fireEvent.press(screen.getByRole('tab', { name: 'Family' }));
  expect(headerTitles()).toContain('Family');
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx jest __tests__/navigation/tabs.test.tsx`
Expected: FAIL, no element with role tab.

- [ ] **Step 3: Install the tabs package and rebuild `RootNavigator`, the helpers and the screens' headers**

Run: `npm install @react-navigation/bottom-tabs@^7`

- [ ] **Step 4: Port the tests that used the old headers**

Today's "opens Settings from the gear" and "opens History from the calendar icon" become "…from the tab bar". The Settings test that opened Family moves to the Family tab. Elder History tests use `ElderHistory`.

- [ ] **Step 5: Run all tests**

Run: `npx jest`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src __tests__
git commit -m "feat: bottom tabs and a sky band on every page"
```

---

### Task 5: The `role` setting and the display-settings target (native)

**Files:**
- Modify: `android/app/src/main/java/com/pillsaathi/alarm/AppSettings.kt`, `AlarmJson.kt`, `bridge/NativeAlarmsModule.kt`
- Modify: the Kotlin file that maps `openSetting` targets to intents (find it with `grep -rn '"alarmVolume"' android/app/src/main/java`)
- Modify: `specs/NativeAlarms.ts`, `src/native/alarms.ts`, `__tests__/helpers/nativeMocks.ts`
- Test: `android/app/src/test/java/com/pillsaathi/alarm/AlarmJsonTest.kt`, `__tests__/native/alarms.test.ts`

**Interfaces:**
- Produces: Kotlin `AppSettings(language, readAloud, role: String? = null)`, read and written by `AlarmJson` as `"role"`.
- Produces: the native `getSettings()` adds `role`; new `setRole(role: string): Promise<void>`; `openSetting('display')` opens `Settings.ACTION_DISPLAY_SETTINGS`.
- Produces, JS: `type Role = 'elder' | 'carer'`; `AppSettings.role: Role | null` (anything else reads as null); `setRole(role: Role): Promise<void>`; `SettingTarget` gains `'display'`. The mock defaults give `role: 'elder'`, so existing screen tests start as a set-up phone.

- [ ] **Step 1: Write the failing tests**

Kotlin: `settings keep their role through JSON` (`AppSettings(role = "carer")` round-trips) and `settings written before roles read with no role` (JSON without `"role"` → `role == null`).
JS: `getSettings maps an unknown role to null` (native `{ role: 'boss' }` → `null`) and `setRole passes the role through`.

- [ ] **Step 2: Run them and see them fail**

Run: `cd android && ./gradlew :app:testDebugUnitTest --tests 'com.pillsaathi.alarm.AlarmJsonTest'` and `npx jest __tests__/native/alarms.test.ts`
Expected: FAIL (no `role` parameter; `setRole` is not a function).

- [ ] **Step 3: Implement the Kotlin, the spec and the JS wrapper**

- [ ] **Step 4: Run the tests and build**

Run: `cd android && ./gradlew :app:testDebugUnitTest :app:assembleDebug && cd .. && npx jest`
Expected: BUILD SUCCESSFUL; PASS.

- [ ] **Step 5: Commit**

```bash
git add android specs src/native/alarms.ts __tests__
git commit -m "feat: remember who the phone is for, and open display settings"
```

---

### Task 6: Login page, "Who is this phone for?", and where the app starts

**Files:**
- Create: `src/screens/LoginScreen.tsx`, `src/screens/WhoScreen.tsx`, `src/lib/start.ts`
- Modify: `App.tsx`, `src/navigation/RootNavigator.tsx` (routes `Login: { again?: boolean } | undefined`, `Who: { first: string | null }`), `src/i18n/*`
- Modify: `docs/superpowers/specs/2026-10-29-ui-redesign-design.md` ("Under the hood": the refinement at the top of this plan)
- Test: `__tests__/lib/start.test.ts`, `__tests__/screens/LoginScreen.test.tsx`, `__tests__/screens/WhoScreen.test.tsx`, `__tests__/App.test.tsx`

**Interfaces:**
- Consumes: `getSettings`, `setRole`, `setLanguage` (alarms); `signInWithGoogle`, `signedInRelative`, `FamilyErrors` (family); `familyMessage` (lib/family); kit.
- Produces: `startRoute(o: { role: Role | null; account: Relative | null }): { name: 'Login'; params: { again: boolean } } | { name: 'Main' }`. No role → Login with `again: false`. A role but no account → Login with `again: true`. Otherwise → Main.
- Produces, `App.tsx`: it reads `getSettings()` and `signedInRelative()` (each failure counts as null), then renders `RootNavigator` at `startRoute(...)`. Until then it renders a plain page-coloured view.
- LoginScreen (E1, C1): a dawn sky, the logo (a capsule shape on a white tile), "PillSaathi", "Your medicines on time. Your family close by.". Then the language tiles from `getSettings().languages` (tapping one calls `setLanguage` and the page switches), "Welcome", "Log in to keep your pills safe and stay close to family.", `Button` "Continue with Google", and "One tap. No new password.".
  - Success: with `again`, reset to Main. Otherwise navigate to `Who` with `first = name.split(' ')[0]`.
  - Cancelled (null): stay on the page.
  - Any error: show `familyMessage(e, t)` and a secondary "Continue offline" that behaves like success with `first: null`.
- WhoScreen (E3, C3): `SkyTop` "Hi {first}!" ("Hi!" without a name) and "Who is this phone for?". Two choice cards, "I take medicines" / "Ring my alarms on this phone" and "I look after someone" / "See their day, set up their pills", then "You can do both later. Anyone can add their own pills or add family." and Continue (disabled until a choice is made).
  - elder → `setRole('elder')`, then reset to `[Setup { firstRun: true }]`.
  - carer → `setRole('carer')`, then reset to `[AddFamily { fromLogin: true }]`.
- Produces: the routes `Setup: { firstRun?: boolean } | undefined` and `AddFamily: { fromLogin?: boolean } | undefined` (their screens use the params in Tasks 7 and 16).

- [ ] **Step 1: Write the failing tests**

```ts
test('no role starts at the login page', () =>
  expect(startRoute({ role: null, account: null })).toEqual({ name: 'Login', params: { again: false } }));
test('a role without an account shows the login page again', () =>
  expect(startRoute({ role: 'elder', account: null })).toEqual({ name: 'Login', params: { again: true } }));
test('a set-up, logged-in phone starts at Today', () =>
  expect(startRoute({ role: 'carer', account: { name: 'Ravi', email: 'r@x' } })).toEqual({ name: 'Main' }));
```
LoginScreen tests:
- `Continue with Google moves on with the first name` (signInWithGoogle → `{ name: 'Kamala Nair', … }` → `findByText('Hi Kamala!')`).
- `a cancelled login stays on the page`.
- `no internet offers Continue offline, which still moves on` (reject `{ code: FamilyErrors.OFFLINE }` → the offline message shows; press "Continue offline" → "Hi!").
- `a build without Family offers Continue offline` (`NOT_SET_UP`).
- `logging in again goes straight to Today` (`renderApp('Login', { again: true })` → the Today tab is shown).
- `choosing Malayalam switches the page` (`setLanguage('ml')`; `ml.login.welcome` is shown).

WhoScreen tests:
- `I take medicines saves the role and opens alarm setup once` (`setRole('elder')`; `headerTitles()` contains "Let's make sure alarms ring").
- `I look after someone opens Add family` (`setRole('carer')`).
- `Continue waits for a choice`.

App tests:
- `a phone with no role opens the login page`.
- `a logged-out phone with a role opens the login page again`.
- `a tester's phone with pills and no role opens the login page, and Today keeps its pills after I take medicines` (Review Focus 4).

- [ ] **Step 2: Run them and see them fail**

Run: `npx jest __tests__/lib/start.test.ts __tests__/screens/LoginScreen.test.tsx __tests__/screens/WhoScreen.test.tsx __tests__/App.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `start.ts`, the two screens, the routes, `App.tsx` and the strings (`login.*`, `who.*`)**

- [ ] **Step 4: Run all tests**

Run: `npx jest`
Expected: PASS.

- [ ] **Step 5: Update the spec's "Under the hood" bullets and commit**

Write that her elder id stays her phone's anonymous login, and that the login uses the phone's existing Google sign-in. Drop the "another phone" bullet.
```bash
git add App.tsx src __tests__ docs/superpowers/specs/2026-10-29-ui-redesign-design.md
git commit -m "feat: a login page on every phone, then who the phone is for"
```

---

### Task 7: Alarm setup, on first open and from Settings

**Files:**
- Modify: `src/screens/SetupScreen.tsx`, `src/setup/oemSteps.ts`, `src/i18n/*`
- Test: `__tests__/screens/SetupScreen.test.tsx`, `__tests__/setup/oemSteps.test.ts`

**Interfaces:**
- Produces: `setupProgress(steps: SetupStep[], doneSteps: string[], autoDone: (key: string) => boolean): { done: number; total: number; current: string | null }` in `oemSteps.ts`. `current` is the first step not done. Settings uses it in Task 14.
- Screen (E4 and Settings → Alarm setup):
  - The `SkyBand` title is "Let's make sure alarms ring" with `firstRun` and "Make alarms ring every time" without it. Under it: a progress bar and `t.setup.progress(done, total, maker)` → "2 of 4 done · Xiaomi phone".
  - Done steps get a green tick, and "Allowed" for the steps the phone checks itself.
  - The `current` step is open, with its body, **Open settings** (when the step has a target) and secondary **I did this** (when it isn't auto-checked).
  - Later steps are faded.
  - Tapping a done manual step opens it with "I did this ✓", and pressing that unticks it.
  - Opening settings never ticks a step.
  - With `firstRun`: "Do this later" resets to Main, and so does Finish when every step is done. Without it, Finish goes back.

- [ ] **Step 1: Write the failing tests**

Port the six existing Setup tests. Add:
- `only the first step not done is open`
- `opening settings does not tick the step`
- `a done step can be unticked`
- `first run: Do this later opens Today`
- `first run keeps steps already done ticked` (`getSetupState` → `doneSteps: ['lockRecents']` shows a tick; Review Focus 4)
- `setupProgress counts auto-checked steps as done` (unit)

- [ ] **Step 2: Run them and see them fail**

Run: `npx jest __tests__/screens/SetupScreen.test.tsx __tests__/setup/oemSteps.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run all tests**

Run: `npx jest`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/screens/SetupScreen.tsx src/setup/oemSteps.ts src/i18n __tests__
git commit -m "feat: alarm setup one step at a time, and once on first open"
```

---

### Task 8: Today on her phone

**Files:**
- Create: `src/lib/today.ts`, `src/components/today/NextDoseCard.tsx`, `MissedCard.tsx`, `DoseLine.tsx`, `WarningCard.tsx`, `RefillCard.tsx`, `EmptyToday.tsx`
- Modify: `src/screens/TodayScreen.tsx`, `src/i18n/*`
- Delete: `src/components/DoseCard.tsx`, `HealthBanner.tsx`, `RefillBanner.tsx`, `__tests__/components/DoseCard.test.ts` (its test moves to `today.test.ts`)
- Test: `__tests__/lib/today.test.ts`, `__tests__/screens/TodayScreen.test.tsx`

**Interfaces:**
- Produces: `statusText(card, t, is24h)`, moved unchanged from `DoseCard.tsx`.
- Produces: `arrangeToday(cards: TodayCard[]): { next: TodayCard | null; missed: TodayCard[]; later: TodayCard[]; done: TodayCard[] }`. Cards are in time order.
  - `next` is the first card that is ringing, snoozed or upcoming.
  - `missed` is the missed and not-reported cards.
  - `later` is the other upcoming and later cards.
  - `done` is the taken, skipped and done cards.
- Produces: `doseCounts(cards: TodayCard[]): { taken: number; missed: number; rest: number }`. Missed counts missed plus skipped.
- Produces: `untilText(now: number, hour: number, minute: number, t: Strings): string` → "in 6 hr 50 min". It uses `formatDuration` and rolls past midnight.
- Screen (E8; empty E5), inside a `ScrollView` with testID `today-scroll`:
  1. `SkyTop` with the greeting `t.today.greeting[greetingFor(hour)]`, the date, `DoseBars` and `t.today.progress(taken, total)` → "1 of 3 done" (the spec's words; it counts taken doses).
  2. `WarningCard`: the first health issue with "+N more", "Alarms may not ring", that issue's message, and **Fix now** (the banner's old action).
  3. One `RefillCard` per refill (**+ Add** → the pill at its count).
  4. `NextDoseCard`: "NEXT DOSE", `whenChip`, the time, `untilText`, and the pills (tap → the pill page; `PillEdit` until Task 11 repoints it). Ringing: "Ringing now". Snoozed: `t.status.snoozedUntil`. Neither shows a button, and "Ringing now" isn't tappable: `MainActivity` already brings the ringing screen forward whenever the app opens during a ring. Note this in the spec's Today section in this task's commit. With no next dose but some cards: "All done for today" and the earliest card time as "Tomorrow, 8:00 AM".
  5. One `MissedCard` per missed dose, with **I took it**, which keeps today's "Mark as taken?" alert and `markDoseTaken`.
  6. `DoseLine`s for later doses.
  7. `DoseLine`s for done doses: taken is a green tick with "8:00 AM · both taken" (`t.today.allTaken(n)`); skipped is grey with a small **I took it**.
  8. A dashed "+ Add a pill" row.
  9. With no cards: `EmptyToday` with "No pills yet", "Add your first medicine. Or your son or daughter can add them from their own phone.", **Add a pill** and **Show my code** (→ ShareCode).

  The reconcile "Missed medicines" alert stays. The sound line is gone.

- [ ] **Step 1: Write the failing unit tests**

```ts
test('the next dose is the first one still to come', () => {
  const r = arrangeToday([card(8, 'taken'), card(13, 'missed'), card(21, 'upcoming'), card(22, 'upcoming')]);
  expect(r.next?.hour).toBe(21); expect(r.later.map(c => c.hour)).toEqual([22]);
  expect(r.missed.map(c => c.hour)).toEqual([13]); expect(r.done.map(c => c.hour)).toEqual([8]);
});
test('a ringing dose is the next one', () => { /* card(9,'ringing') → next.hour 9 */ });
test('counts taken, missed and the rest', () => { /* taken 1, missed+skipped 2, rest 1 */ });
test('a 0:30 dose at 23:00 is tonight, in 1 hr 30 min', () => {
  expect(untilText(new Date(2026, 9, 29, 23, 0).getTime(), 0, 30, en)).toBe('in 1 hr 30 min');
});
test('a dose with nothing uploaded reads "Not reported yet"', /* moved from DoseCard.test.ts */);
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx jest __tests__/lib/today.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `today.ts`, then run the unit tests and see them pass**

- [ ] **Step 4: Port the screen tests, and add the new ones**

Port the 32 Today tests. Two change because the spec moves their behaviour:
- "shows each time card with its pills, amounts, sound and status" loses the sound.
- "opens the sound picker for the card" moves to Task 11.

Add:
- `the next dose leads, with its time, pills and time left`
- `a ringing dose says Ringing now and offers no button`
- `a skipped dose is a grey line with I took it`
- `when all are done it says so with tomorrow's first time`
- `empty Today offers Add a pill and Show my code`
- `the greeting follows the clock` (fake timers at 14:10 → "Good afternoon")
- `a 60-character pill name wraps and keeps I took it` (Review Focus 2)
- `Today scrolls` (`today-scroll` is a ScrollView; Review Focus 1)

- [ ] **Step 5: Implement the components and the screen, then run all tests**

Run: `npx jest`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src __tests__
git commit -m "feat: Today leads with the next dose, then anything missed"
```

---

### Task 9: Today on a relative's phone

**Files:**
- Create: `src/components/today/PersonCard.tsx`
- Modify: `src/screens/TodayScreen.tsx`, `src/i18n/*`
- Delete: `src/components/FamilySection.tsx`
- Test: `__tests__/screens/TodayScreen.test.tsx` (the family block)

**Interfaces:**
- Consumes: `getFamily`, `refreshFamily`, `getElderSetup`, `signedInRelative`; `tallyText`, `heardText`, `problemText`; Avatar, DoseBars, Card.
- Produces: `<PersonCard card: FamilyCard; problem: string | null; onOpen: () => void />`. It shows:
  - the avatar, name and `tallyText`;
  - DoseBars from the tally (taken; missed + skipped; the rest);
  - a green Call button when `card.phone` is set (`Linking.openURL('tel:' + phone)`, labelled `t.family.call`);
  - `t.family.missedToday(n)` → "1 missed today" on a coral tint when `tally.missed > 0` (tap → her page);
  - amber lines for `problemText(name, problem, t)` first, then the refills as today, then `heardText` when silent or never heard.
- With follows, Today's sky greeting adds the account's first name ("Good afternoon, Ravi"). PersonCards sit on top, the next-dose card's place. Then a "My pills" label and this phone's own Today (no second tall sky), or "You have no pills of your own. + Add pill". Each card's problem comes from `getElderSetup(elderId).problem`, read on the same 2-minute refresh. A failed read means no problem line.

- [ ] **Step 1: Write the failing tests**

Port the six family tests. Add:
- `her alarm problem shows on her card first` (`getElderSetup` → `problem: 'battery'`)
- `Call dials her number`
- `the greeting uses the relative's first name`
- `a long elder name wraps and keeps Call` (Review Focus 2)
- `a failed setup read shows the card without a problem line`

- [ ] **Step 2: Run them and see them fail**

Run: `npx jest __tests__/screens/TodayScreen.test.tsx -t family`
Expected: FAIL.

- [ ] **Step 3: Implement, then run all tests**

Run: `npx jest`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src __tests__
git commit -m "feat: the people you look after come first on Today"
```

---

### Task 10: Adding a pill in five steps

**Files:**
- Create: `src/lib/pillDraft.ts`, `src/hooks/useSavePill.ts`, `src/screens/AddPillScreen.tsx`
- Modify: `src/navigation/RootNavigator.tsx` (route `AddPill: { elderId?: string } | undefined`), `src/i18n/*`, and every `navigate('PillEdit', {})` → `navigate('AddPill', …)`
- Test: `__tests__/lib/pillDraft.test.ts`, `__tests__/screens/AddPillScreen.test.tsx`

**Interfaces:**
- Produces, `pillDraft.ts`, moved from `PillEditScreen.tsx` rather than rewritten (`daysOf`, `Duration` and the input building):
  - `type PillDraft = { id: string | null; name: string; form: PillForm; amount: number; times: DoseTime[]; duration: Duration | null; otherDays: string; startsTomorrow: boolean; startDate: string | null; photo: string | null; photoUri: string | null; count: string; countChanged: boolean }`
  - `emptyDraft(): PillDraft`
  - `draftFromPill(p: Pill): PillDraft`
  - `toPillInput(d: PillDraft): PillInput`
  - `stepReady(d: PillDraft, step: 1 | 2 | 3 | 4 | 5): boolean` (1: a name; 3: at least one time; 4: a duration, with valid other days when "Other…")
  - `QUICK_TIMES: DoseTime[] = [{hour: 8, minute: 0}, {hour: 13, minute: 30}, {hour: 21, minute: 0}]`
- Produces, `useSavePill(elderId?: string): { save: (d: PillDraft) => Promise<boolean>; saving: boolean }`. It holds today's save path unchanged: `savePill` or `sendPill`, the exact-alarm prompt, the first-pill `markSetupSeen` → Setup, the `notEditor` and `tooBig` messages, and the save-failure alert.
- Screen (E6–E9, C10): a `SkyBand` with close (×), `progress {step, total: 5}`, Back and Next in a footer, and Save (green) on step 5.
  1. "What's the medicine called?": the name field, a dashed "Add a photo of the strip" ("Optional. Helps tell pills apart."), and Camera and Gallery.
  2. "What kind, and how much?": four tiles and a Stepper.
  3. "When should {name} ring?": the three `QUICK_TIMES` cards ("Morning", "Afternoon", "Night", each with "· change" when ticked, which opens `pickTime`), plus "Another time". With `elderId`: "Times are {name}'s time.".
  4. "For how long?": the 5 / 10 / 30 days, No end and Other… chips, then Starts Today or Tomorrow.
  5. "Does this look right?": a summary card and an optional Tablets left (tablets and capsules only).

  On a relative's phone the title is "Add a pill for {name}". After saving: back to where it came from.

- [ ] **Step 1: Write the failing unit tests**

- `a new draft has no times and starts today`
- `the three ready times are 8:00, 13:30 and 21:00`
- `toPillInput builds what savePill takes`: port today's input assertions from the PillEdit tests: name trimmed, `days` from the duration, `remaining` null when the count is empty, `remainingChanged`.
- `step 3 needs a time; step 4 needs a duration`

- [ ] **Step 2: Run them and see them fail, implement `pillDraft.ts`, then see them pass**

Run: `npx jest __tests__/lib/pillDraft.test.ts`

- [ ] **Step 3: Port the adding tests from `PillEditScreen.test.tsx` to `AddPillScreen.test.tsx`, and add the step tests**

Port every test about a new pill: saving, the exact-alarm prompt, the first pill opening Setup, "That time is already added.", photos, other days, starts tomorrow, the relative's `sendPill`, not editor, too big, and failures. Add:
- `Next waits until the step is answered`
- `ticking Morning and Night gives two times`
- `Back keeps what was entered`
- `close leaves without saving`

- [ ] **Step 4: Implement `useSavePill` and `AddPillScreen`, then run all tests**

Run: `npx jest`
Expected: PASS (`PillEditScreen` still serves editing until Task 11).

- [ ] **Step 5: Commit**

```bash
git add src __tests__
git commit -m "feat: add a pill in five short steps"
```

---

### Task 11: The pill summary and its sheets

**Files:**
- Create: `src/screens/PillScreen.tsx`, `src/components/pill/TimesSheet.tsx`, `SoundTimesSheet.tsx`, `DurationSheet.tsx`, `CountSheet.tsx`, `BasicsSheet.tsx`
- Modify: `RootNavigator.tsx` (route `Pill: { pillId: string; elderId?: string; focusCount?: boolean }`; remove `PillEdit`), every `navigate('PillEdit', { pillId … })`, `src/i18n/*`
- Delete: `src/screens/PillEditScreen.tsx`, `__tests__/screens/PillEditScreen.test.tsx` (once every test is ported)
- Test: `__tests__/screens/PillScreen.test.tsx`

**Interfaces:**
- Consumes: `PillDraft`, `draftFromPill`, `useSavePill` (Task 10); `Sheet`, `PillPicture`; `getToday` (her cards, for each time's `alarmId` and sound), `listChanges`, `waitingByPill`, `cancelChange`, `deletePill`, `sendDeletePill`.
- Screen (the mockup `02-pill.html`, right):
  - A `SkyBand` with back and a camera button (Camera or Gallery → saves the photo).
  - A large `PillPicture` in a white circle, the name, and "Tablet · 1 each time" (tap → `BasicsSheet`: name, type, amount).
  - One card of rows, each opening its sheet: Rings at → `TimesSheet`; Sound → `SoundTimesSheet`; For how long → `DurationSheet`; Tablets left (tablets and capsules) → `CountSheet` (amber when low, with "+ Add").
  - "Delete this pill" in coral, with today's confirmation.
- **Each sheet's Save calls `save` with the whole draft at once.** Its checks (exact alarm, time already added) are the same as in Task 10.
- `SoundTimesSheet` lists this pill's times, each with its sound name, and the line "Every pill at the same time rings with the same sound.". Tapping a time navigates to `SoundPicker` with that card's `alarmId`, or with `{ elderId, hour, minute }` on a relative's phone.
- `focusCount: true` opens `CountSheet` as the page opens.
- With `elderId`: the title is "{name}'s pill", "Times are {name}'s time." shows, and a waiting change for this pill shows an amber strip at the top, "Waiting for {name}'s phone: {changeTitle}", with Cancel (`cancelChange`).

- [ ] **Step 1: Port every remaining PillEdit test (editing, deleting, counts, photos, remote edits) to `PillScreen.test.tsx`, and add the new ones**

New tests:
- `each sheet saves its own change`: changing the duration calls `savePill` once with the new `days` and the other fields unchanged.
- `the sound row opens the sound list for the chosen time and says the sound is shared` (this replaces Today's "opens the sound picker for the card").
- `a waiting change for her pill shows the amber strip, and Cancel cancels it`
- `focusCount opens Tablets left`
- `syrup has no Tablets left row`

- [ ] **Step 2: Run them and see them fail**

Run: `npx jest __tests__/screens/PillScreen.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement, remove `PillEditScreen`, and repoint navigation**

- [ ] **Step 4: Run all tests and make sure no PillEdit remains**

Run: `npx jest && ! grep -rn "PillEdit" src __tests__`
Expected: PASS, and grep finds nothing.

- [ ] **Step 5: Commit**

```bash
git add -A src __tests__
git commit -m "feat: a pill opens to a summary; change one line at a time"
```

---

### Task 12: Sounds, and recording in a pop-up

**Files:**
- Create: `src/components/RecordSheet.tsx`
- Modify: `src/screens/SoundPickerScreen.tsx`, `src/components/SoundRow.tsx`, `RootNavigator.tsx` (remove `Record`), `src/i18n/*`
- Delete: `src/screens/RecordScreen.tsx`, `__tests__/screens/RecordScreen.test.tsx` (once ported)
- Test: `__tests__/components/RecordSheet.test.tsx`, `__tests__/screens/SoundPickerScreen.test.tsx`

**Interfaces:**
- Produces: `<RecordSheet visible: boolean; onClose: () => void; onSaved: (sound: Sound) => void />`. It moves `RecordScreen`'s logic over unchanged (permission, start, the level events drawn as bars, auto-stop at 2:00, too short, listen, record again, the name, save errors).
  - States: **ready** (a big coral mic button, "Start recording", "up to 2:00").
  - **recording**: the timer, the bars, and a big coral stop button with "Tap to stop".
  - **done**: "▶ Listen" and "↺ Record again" as Buttons with icons (no symbols in the text), the name field, and "Use this sound".
- SoundPicker:
  - The `SkyBand` title is "Sound for {time}", with the sub "{pill names} ring together", from the card for `alarmId` (or `hour` and `minute`).
  - Two tiles: **Record a voice** opens the `RecordSheet`; **Pick a song or file** calls `importSound`.
  - One card of `SoundRow`s: a round play/pause button, the name, "Recorded · 0:12" or "Song · 1:40", and a round tick on the chosen one. Tap uses it; hold deletes it (as today).
  - The line "Tap a sound to use it. Hold one to delete it.". On a relative's phone, "{name}'s sounds" and "My sounds" stay as two sections.
  - A saved recording is used for the time, as Record → Use does today.

- [ ] **Step 1: Port the 19 Record tests to `RecordSheet.test.tsx` and the 15 SoundPicker tests, and add the new ones**

New tests:
- `Record a voice opens the sheet over the list`
- `the title says which pills ring at that time`
- `closing the sheet while recording discards the recording`

- [ ] **Step 2: Run them and see them fail**

Run: `npx jest __tests__/components/RecordSheet.test.tsx __tests__/screens/SoundPickerScreen.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement, and remove the Record route and screen**

- [ ] **Step 4: Run all tests**

Run: `npx jest`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A src __tests__
git commit -m "feat: sound list with big buttons, and recording in a pop-up"
```

---

### Task 13: History and one day

**Files:**
- Modify: `src/screens/HistoryScreen.tsx`, `src/screens/HistoryDayScreen.tsx`, `src/i18n/*`
- Test: `__tests__/screens/HistoryScreen.test.tsx`, `__tests__/screens/HistoryDayScreen.test.tsx`

**Interfaces:**
- Consumes: `dayState`, `summarize`, `monthGrid`, `byDate`, `reportText` (lib/history, lib/report); kit.
- History (E14): a `SkyBand` "History", with a round Share button (labelled "Share"; today's report).
  - A summary card: the month in capitals, `{percent}%` large with "taken", a green bar, and `t.history.since(taken, total, firstDay)` → "31 of 35 doses since 18 Oct".
  - A calendar card: the month with round back and next buttons, and the grid. `all` is a green fill with white text; `some` is an orange ring on a cream fill; `none` is a coral fill; today has a navy ring; empty and future days are grey.
  - A legend: "All taken", "Some missed", "None".
  - `ElderHistory` shows "{name} · History", read-only.
- Day: a `SkyBand` with the date and "{n} of {m} taken". A timeline: one card per dose with an icon by `greetingFor(hour)` (`wb_twilight`, `light_mode`, `bedtime`), the time, a status chip, and the pill names. Missed cards are coral tint. "✓ Taken (marked Thu, 9:12 AM)" stays as today.

- [ ] **Step 1: Port the 11 History and 7 Day tests, and add the new ones**

New tests:
- `the month card shows the percent and the dose count`
- `days are coloured by what happened` (accessibility labels stay `t.history.dayLabel(...)`, so tests query by label)
- `a missed dose on the day page stands out`

- [ ] **Step 2: Run them and see them fail; implement; run all tests**

Run: `npx jest`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src __tests__
git commit -m "feat: History as a month at a glance, and each day as a timeline"
```

---

### Task 14: Settings

**Files:**
- Modify: `src/screens/SettingsScreen.tsx`, `src/i18n/*`
- Test: `__tests__/screens/SettingsScreen.test.tsx`

**Interfaces:**
- Consumes: `setupProgress` (Task 7), `openSetting('display')` (Task 5).
- Screen (`05-settings.html`, left):
  - **Language** tiles, each in its own script, with a "draft" tag for drafts.
  - A card with: "Read pill names aloud" (an RN `Switch` in green, sub "When an alarm rings"); "Hear how it sounds" with a **Try it** chip (today's `tryReadAloud` messages); and "Text size" / "Follows the phone's text size" → `openSetting('display')`.
  - A card with "Alarm setup": "{n} steps left" in amber, or "All set" in green → Setup.

- [ ] **Step 1: Port the 9 Settings tests, and add the new ones**

New tests:
- `text size opens the phone's display settings`
- `alarm setup says how many steps are left`
- `alarm setup says All set when nothing is left`

- [ ] **Step 2: Run them and see them fail; implement; run all tests**

Run: `npx jest`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src __tests__
git commit -m "feat: Settings in plain cards, with alarm setup's steps left"
```

---

### Task 15: Family on her phone: the tab, the code, and Allow

**Files:**
- Create: `src/components/AllowDialog.tsx`
- Modify: `src/screens/FamilyScreen.tsx`, `src/screens/ShareCodeScreen.tsx`, `src/hooks/useFollowRequests.ts`, `src/i18n/*`
- Test: `__tests__/screens/FamilyScreen.test.tsx`, `__tests__/screens/ShareCodeScreen.test.tsx`, `__tests__/components/AllowDialog.test.tsx`

**Interfaces:**
- Changes: `useFollowRequests(onAnswered)` returns `{ asking: Person | null; answer: (allow: boolean) => void }` instead of raising an `Alert`. Its queue, dedupe and error handling stay. Every user renders `<AllowDialog person={asking} onAnswer={answer} />`.
- Produces: `<AllowDialog person: Person | null; onAnswer: (allow: boolean) => void />`. It is a centred modal (E13) with:
  - the avatar, `t.family.allowTitle(name)`, and the email;
  - three lines with icons: `visibility` "{name} sees your pills and whether you took them"; `edit` "{name} can add or change pills and sounds"; `notifications` "You get a notice each time {name} does";
  - **No** (secondary) and **Allow** (green).
- Family tab (E12 entry):
  - "Who can see my pills": one card per follower with the avatar, name, email, "Remove" (today's confirm) and a "Can change my pills" `Switch` (`setCanChange`).
  - **Show my code** (→ ShareCode) and "To add someone, show them your code.".
  - Then, only when `listFollows()` isn't empty, "People I look after": avatar and name rows (→ `Elder`).
  - Last, always, a dashed "+ Add family" row.
- ShareCode (E12):
  - "My family code" with close, and "Show this to your son or daughter".
  - The QR image (unchanged source), the 6 digits in boxes, and a chip `t.family.worksFor(minutes)` ("Works for 14 more minutes") updated every 30 s.
  - **Send the code** (share).
  - Expired and New code as today.

- [ ] **Step 1: Port the 10 Family and 6 ShareCode tests, and change the Allow assertions from `Alert.alert` to the dialog**

New tests:
- `the Allow dialog says what she agrees to, and Allow answers yes`
- `No answers no`
- `People I look after appears only on a phone that follows someone`
- `the countdown counts down`

- [ ] **Step 2: Run them and see them fail; implement; run all tests**

Run: `npx jest`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src __tests__
git commit -m "feat: Family on her phone, a clearer Allow, and a code with a countdown"
```

---

### Task 16: The relative's family pages

**Files:**
- Modify: `src/screens/AddFamilyScreen.tsx`, `FollowEditScreen.tsx`, `ElderScreen.tsx`, `ElderPillsScreen.tsx`, `src/components/FollowForm.tsx`, `src/i18n/*`
- Test: `__tests__/screens/AddFamilyScreen.test.tsx`, `FollowEditScreen.test.tsx`, `ElderScreen.test.tsx`, `ElderPillsScreen.test.tsx`

**Interfaces:**
- AddFamily (C4–C6):
  - Not logged in (a phone that continued offline): **Continue with Google** first, as today's sign-in step.
  - Code: `t.family.loggedInAs(email)` → "Logged in as ravi@gmail.com"; the hint "On their phone: open PillSaathi, tap Family, then Show my code."; **Scan their code**; "or type the 6 digits" as six boxes over one hidden `TextInput` (`keyboardType="number-pad"`, `maxLength={6}`); Next; and with `fromLogin`, "Skip for now" → reset to Main.
  - Waiting: two avatars joined by dots, a spinner, the waiting text, and "Keep this open. It moves on by itself.". "They tapped No." stays.
  - Almost done: `FollowForm`, then Done → reset to Main (with `fromLogin`) or back.
- FollowForm: three cards ("What do you call them?", "Their phone number" / "for Call", "Tell me if a dose is missed" with four Chips) and the submit Button. FollowEdit adds **Stop following** (coral; today's confirms).
- Elder (C9):
  - A `SkyBand` with back and a gear (→ FollowEdit), a large avatar, the name, `heardText`, and a 52 dp green Call.
  - An amber problem card (`problemText`) when there is one.
  - One card of dose lines (time, names, a chip: "✓ 8:04", Missed, Later, Not reported).
  - Two tiles: **Her pills** (→ ElderPills) and **History** (→ ElderHistory). Then "Times are {name}'s time.".
- ElderPills (C11):
  - An amber card for waiting changes (`hourglass_top` and "Waiting for {name}'s phone"; one row per change with `changeTitle` and Cancel), with today's delay note.
  - The pill rows (PillPicture, name, "1 tablet · 8 AM, 9 PM") → `Pill { pillId, elderId }`.
  - A dashed "+ Add a pill for {name}" → `AddPill { elderId }`, or the amber not-editor card in its place.
  - "Recent changes" with "✓ Done at 1:12 PM" or "Not done: …" (`changeState`).
  - The separate "Alarm sounds" section is removed. Its tests move to Task 11's sound row, and get ported there if Task 11 didn't already cover them.

- [ ] **Step 1: Port the 11 + 4 + 6 + 8 tests, and add the new ones**

New tests:
- `from the login, Skip for now opens Today`
- `typing six digits fills the boxes and enables Next`
- `a not-logged-in phone asks to continue with Google first`
- `her page's gear opens the alert settings`
- `the waiting card cancels a change`

- [ ] **Step 2: Run them and see them fail; implement; run all tests**

Run: `npx jest`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add -A src __tests__
git commit -m "feat: adding family, her page and her pills in the Sky look"
```

---

### Task 17: The ringing screen

**Files:**
- Modify: `android/app/src/main/res/layout/activity_ringing.xml`, `android/app/src/main/java/com/pillsaathi/alarm/RingingActivity.kt`
- Create: `res/drawable/ringing_sky_dawn.xml`, `ringing_sky_day.xml`, `ringing_sky_evening.xml`, `ringing_sky_night.xml` (gradients from `SKY_GRADIENT`), `ringing_card.xml` (white, radius 22 dp), `ringing_take_bg.xml` (`#34B36A`, radius 26 dp)
- Modify: `res/drawable/ringing_snooze_bg.xml` (white 14% fill, 2 dp white 30% stroke, radius 22 dp), `res/values/strings.xml`, `values-ml/strings.xml`, `values-hi/strings.xml`
- Test: the existing Kotlin unit tests (`RingCommandsTest`, `SkyTimeTest`, `PillLookTest`), and a manual check on the emulator

**Interfaces:**
- Consumes: `SkyTime.of(hour)`, `PillLook.colorFor(name)` (Task 1), `R.font.nunito`, `R.font.symbols_filled`.
- The layout keeps every view id and click handler.
  - The background is `ringing_sky_<sky>` for the ringing dose's hour, with a moon (an oval with an offset dark oval) and a few small star dots for night, and a sun (a yellow oval) otherwise.
  - "Time for your medicines" is 17 sp, white at 85%. The time is 58 sp Nunito Black.
  - Each pill (in `renderPills`) is a `ringing_card` row: a 50 dp photo or shape, then the name (18 sp Nunito Black, navy) and the amount. The shape is a round view in `PillLook.colorFor(name)` for a tablet or capsule, or a `TextView` in `R.font.symbols_filled` with the `medication_liquid` or `water_drop` glyph.
  - The large single photo stays.
  - The sound chip is the `volume_up` glyph and the sound name, on white at 14%.
  - The buttons: `ringing_taken` is full width on `ringing_take_bg`, white 21 sp with the `check_circle` glyph. `ringing_snooze` is on `ringing_snooze_bg`. `ringing_skip` is 14.5 sp text.
- Strings: `action_taken` "I took it", `action_snooze` "Remind me in 10 min", `ringing_sound` "%1$s" (no 🔊). Malayalam and Hindi get drafts of the first two.

- [ ] **Step 1: Run the Kotlin tests before changing anything**

Run: `cd android && ./gradlew :app:testDebugUnitTest`
Expected: BUILD SUCCESSFUL (the baseline).

- [ ] **Step 2: Change the layout, drawables, strings and `RingingActivity` rendering (not its handlers)**

- [ ] **Step 3: Run the Kotlin tests and build**

Run: `cd android && ./gradlew :app:testDebugUnitTest :app:assembleDebug`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 4: Ring it on the emulator**

Install the build. Add a pill due in 2 minutes, lock the screen, and wait. Expected:
- the new screen shows over the lock screen, with a night sky at 19:00–4:59 (a day sky otherwise);
- **I took it** records Taken, and Today shows "✓ Taken";
- on the next ring, **Remind me in 10 min** rings again 10 minutes later;
- **Skip this time** records Skipped.

Save one screenshot for the PR.

- [ ] **Step 5: Commit**

```bash
git add android
git commit -m "feat: the ringing screen in the Sky look, with I took it"
```

---

### Task 18: Clean-up, translations, and the phone checks

**Files:**
- Modify: `src/i18n/ml.ts`, `hi.ts` (drafts for every new key), `README.md` (the screens and checks matrix), `JOURNAL.md`
- Delete: anything left from the "Removed by the end" list

- [ ] **Step 1: Check that nothing old remains**

Run:
```bash
ls src/components/DoseCard.tsx src/components/FamilySection.tsx src/components/HealthBanner.tsx src/components/RefillBanner.tsx src/components/PillPicture.tsx src/screens/PillEditScreen.tsx src/screens/RecordScreen.tsx 2>&1 | grep -c 'No such file'
grep -rn "react-native-svg\|\.svg'" src package.json
grep -rnP "[\x{1F300}-\x{1FAFF}\x{2600}-\x{26FF}]" src --include=*.tsx --include=*.ts
```
Expected: `7`; the two greps find nothing.

- [ ] **Step 2: Run every check**

Run: `npx jest && npx tsc --noEmit && npx eslint . && cd android && ./gradlew :app:testDebugUnitTest :app:assembleDebug`
Expected: all pass, with no lint errors.

- [ ] **Step 3: Walk both journeys on the phones**

On the emulator (Amma) and the Redmi (Ravi), go through E1–E14 and C1–C11 from a fresh install, and compare each screen with `10-journeys.html`. Then update the installed tester build in place: the login shows once, and the pills and followers remain.

- [ ] **Step 4: Check large text**

Run `adb shell settings put system font_scale 2.0`. Check that Today, the five steps, the pill summary, Setup and the ringing screen all scroll, with no clipped buttons. Then run `adb shell settings put system font_scale 1.0`.

- [ ] **Step 5: Update the README matrix and JOURNAL, then commit**

```bash
git add -A
git commit -m "chore: remove the old screens, add translation drafts, and update the checks"
```
