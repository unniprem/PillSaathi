import { AppState, Platform } from 'react-native';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import * as alarms from '../../src/native/alarms';
import * as sounds from '../../src/native/sounds';
import { ml } from '../../src/i18n/ml';
import { mockAlarmsDefaults, mockFamilyDefaults } from '../helpers/nativeMocks';
import { headerTitles, renderApp } from '../helpers/renderApp';

jest.mock('../../src/native/alarms');
jest.mock('../../src/native/sounds');

const health = {
  notificationsEnabled: true,
  alarmChannelEnabled: true,
  exactAlarmAllowed: true,
  fullScreenAllowed: true,
  ignoringBatteryOptimizations: false,
  backgroundRestricted: false,
  alarmVolumeLow: false,
};

const allowed = { ...health, ignoringBatteryOptimizations: true };

// The bodies of the Xiaomi steps, which only the open step shows.
const AUTOSTART_BODY = 'Find PillSaathi in the list and switch it on.';
const OEM_BATTERY_BODY = 'Tap PillSaathi, then choose No restrictions.';
const LOCK_BODY =
  'Open recent apps, then touch and hold the PillSaathi card and tap Lock.';
const BATTERY_BODY =
  "Battery saving can delay or stop alarms. On the next screen, switch to All apps, find PillSaathi and choose Don't optimise.";

const MANUAL = ['autostart', 'oemBattery', 'lockRecents'];

function doneSteps(keys: string[]) {
  jest
    .mocked(alarms.getSetupState)
    .mockResolvedValue({ seen: true, doneSteps: keys });
}

// Renders the Setup route and lets its health and setup reads settle.
async function renderSetup(params?: { firstRun: boolean }) {
  await renderApp('Setup', params);
  await act(async () => {});
}

/** Catches the AppState listeners; the returned function brings the app back, as from the phone's settings. */
function watchAppState() {
  const listeners: ((state: string) => void)[] = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, cb) => {
    listeners.push(cb as (state: string) => void);
    return { remove: jest.fn() } as never;
  });
  return () => act(async () => listeners.forEach(l => l('active')));
}

const stepRow = (key: string) =>
  within(screen.getByTestId(`setup-step-${key}`));

beforeEach(() => {
  jest.clearAllMocks();
  mockAlarmsDefaults();
  mockFamilyDefaults();
  jest
    .spyOn(Platform, 'constants', 'get')
    .mockReturnValue({ Manufacturer: 'Xiaomi' } as never);
  jest.mocked(alarms.getHealth).mockResolvedValue(health);
  doneSteps([]);
  jest.mocked(sounds.listSounds).mockResolvedValue([]);
  jest.mocked(alarms.openSetting).mockResolvedValue(true);
  jest.mocked(alarms.setSetupStepDone).mockResolvedValue(undefined);
  jest.mocked(alarms.markSetupSeen).mockResolvedValue(undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('shows the Xiaomi steps in Malayalam', async () => {
  jest.mocked(alarms.currentLanguage).mockReturnValue('ml');
  doneSteps(['autostart']);
  await renderSetup();
  expect(
    await screen.findByText(ml.setup.steps.xiaomiAutostart.title),
  ).toBeTruthy();
  expect(screen.getByText(ml.setup.steps.xiaomiBattery.body)).toBeTruthy();
  expect(screen.getByText(ml.setup.steps.lockRecents.title)).toBeTruthy();
  expect(screen.getByText(ml.setup.steps.battery.title)).toBeTruthy();
  expect(screen.getByText(ml.setup.intro)).toBeTruthy();
  expect(screen.getByText(ml.setup.progress(1, 4, 'Xiaomi'))).toBeTruthy();
  expect(stepRow('autostart').getByLabelText(ml.setup.ticked)).toBeTruthy();
  expect(screen.getAllByText(ml.common.openSettings)).toHaveLength(1);
  expect(screen.getAllByText(ml.setup.done)).toHaveLength(1);
  expect(screen.getByText(ml.setup.finish)).toBeTruthy();
  expect(headerTitles()).toEqual([ml.setup.title]);
});

test('shows the intro and the Xiaomi steps in order', async () => {
  await renderSetup();
  expect(
    await screen.findByText(
      'Some phones stop apps in the background. Do these steps once so your alarms always ring.',
    ),
  ).toBeTruthy();
  expect(headerTitles()).toEqual(['Make alarms ring every time']);
  expect(screen.getByText('0 of 4 done · Xiaomi phone')).toBeTruthy();
  const rows = screen.getAllByTestId(/^setup-step-/);
  expect(rows.map(r => r.props.testID)).toEqual([
    'setup-step-autostart',
    'setup-step-oemBattery',
    'setup-step-lockRecents',
    'setup-step-battery',
  ]);
  [
    'Turn on Autostart',
    'Set Battery saver to No restrictions',
    'Lock PillSaathi in recent apps',
    'Allow unrestricted battery use',
  ].forEach((title, i) =>
    expect(within(rows[i]).getByText(title)).toBeTruthy(),
  );
  // Only the first step is open.
  expect(screen.getAllByText('Open settings')).toHaveLength(1);
  expect(screen.getAllByText('I did this')).toHaveLength(1);
});

test('Open settings on Autostart calls openSetting("oemAutostart")', async () => {
  await renderSetup();
  await screen.findByText('Turn on Autostart');
  await fireEvent.press(screen.getByText('Open settings'));
  expect(alarms.openSetting).toHaveBeenCalledWith('oemAutostart');
});

test('I did this ticks the step through setSetupStepDone and opens the next', async () => {
  await renderSetup();
  await screen.findByText('Turn on Autostart');
  await act(async () => fireEvent.press(screen.getByText('I did this')));
  expect(alarms.setSetupStepDone).toHaveBeenCalledWith('autostart', true);
  expect(stepRow('autostart').getByLabelText('Done')).toBeTruthy();
  expect(screen.getByText('1 of 4 done · Xiaomi phone')).toBeTruthy();
  expect(screen.queryByText(AUTOSTART_BODY)).toBeNull();
  expect(screen.getByText(OEM_BATTERY_BODY)).toBeTruthy();
  // Opened again, it unticks.
  await act(async () => fireEvent.press(screen.getByText('Turn on Autostart')));
  await act(async () => fireEvent.press(screen.getByText('I did this ✓')));
  expect(alarms.setSetupStepDone).toHaveBeenLastCalledWith('autostart', false);
  await waitFor(() => expect(screen.queryByText('I did this ✓')).toBeNull());
});

test('the battery step is ticked from health and has no I did this', async () => {
  jest.mocked(alarms.getHealth).mockResolvedValue(allowed);
  doneSteps(MANUAL);
  await renderSetup();
  expect(await screen.findByText('4 of 4 done · Xiaomi phone')).toBeTruthy();
  expect(stepRow('battery').getByText('Allowed')).toBeTruthy();
  expect(stepRow('battery').getByLabelText('Done')).toBeTruthy();
  expect(screen.getAllByLabelText('Done')).toHaveLength(4);
  expect(screen.queryByText('I did this')).toBeNull();
  expect(screen.queryByText('Open settings')).toBeNull();
});

test('while battery use is not allowed, its step has only Open settings', async () => {
  doneSteps(MANUAL);
  await renderSetup();
  expect(await screen.findByText(BATTERY_BODY)).toBeTruthy();
  expect(screen.queryByText('Allowed')).toBeNull();
  expect(screen.queryByText('I did this')).toBeNull();
  await fireEvent.press(screen.getByText('Open settings'));
  expect(alarms.openSetting).toHaveBeenCalledWith('batteryOptimization');
});

test('Finish goes back to where setup was opened from', async () => {
  await renderApp('Settings');
  await act(async () =>
    fireEvent.press(await screen.findByText('Make alarms reliable')),
  );
  expect(headerTitles()).toEqual(['Settings', 'Make alarms ring every time']);
  await act(async () => fireEvent.press(screen.getByText('Finish')));
  await waitFor(() => expect(headerTitles()).toEqual(['Settings']));
  // Seen only on the first open, or by the first pill saved.
  expect(alarms.markSetupSeen).not.toHaveBeenCalled();
});

test('only the first step not done is open', async () => {
  doneSteps(['autostart']);
  await renderSetup();
  expect(await screen.findByText(OEM_BATTERY_BODY)).toBeTruthy();
  expect(screen.queryByText(AUTOSTART_BODY)).toBeNull();
  expect(screen.queryByText(LOCK_BODY)).toBeNull();
  expect(screen.queryByText(BATTERY_BODY)).toBeNull();
  expect(screen.getAllByText('Open settings')).toHaveLength(1);
  expect(screen.getAllByText('I did this')).toHaveLength(1);
});

test('a later step opens when tapped, in place of the current one', async () => {
  await renderSetup();
  await act(async () =>
    fireEvent.press(await screen.findByText('Lock PillSaathi in recent apps')),
  );
  expect(screen.getByText(LOCK_BODY)).toBeTruthy();
  expect(screen.queryByText(AUTOSTART_BODY)).toBeNull();
  // Lock in recent apps has no settings page.
  expect(screen.queryByText('Open settings')).toBeNull();
  await act(async () => fireEvent.press(screen.getByText('I did this')));
  expect(alarms.setSetupStepDone).toHaveBeenCalledWith('lockRecents', true);
  // Back to the first step not done.
  expect(screen.getByText(AUTOSTART_BODY)).toBeTruthy();
  expect(screen.getByText('1 of 4 done · Xiaomi phone')).toBeTruthy();
});

test('opening settings does not tick the step', async () => {
  const comeBack = watchAppState();
  await renderSetup();
  await act(async () =>
    fireEvent.press(await screen.findByText('Open settings')),
  );
  expect(alarms.openSetting).toHaveBeenCalledWith('oemAutostart');
  await comeBack();
  expect(alarms.setSetupStepDone).not.toHaveBeenCalled();
  expect(screen.getByText('0 of 4 done · Xiaomi phone')).toBeTruthy();
  expect(screen.getByText(AUTOSTART_BODY)).toBeTruthy();
  expect(screen.queryByLabelText('Done')).toBeNull();
});

test('a done step can be unticked', async () => {
  doneSteps(['autostart']);
  await renderSetup();
  expect(stepRow('autostart').getByLabelText('Done')).toBeTruthy();
  await act(async () => fireEvent.press(screen.getByText('Turn on Autostart')));
  // Open again in place of the current step, with its words and a ticked I did this.
  expect(screen.getByText(AUTOSTART_BODY)).toBeTruthy();
  expect(screen.queryByText(OEM_BATTERY_BODY)).toBeNull();
  await act(async () => fireEvent.press(screen.getByText('I did this ✓')));
  expect(alarms.setSetupStepDone).toHaveBeenCalledWith('autostart', false);
  expect(screen.queryByLabelText('Done')).toBeNull();
  expect(screen.getByText('0 of 4 done · Xiaomi phone')).toBeTruthy();
  // Still open, so a slip can be ticked again.
  expect(screen.getByText('I did this')).toBeTruthy();
  expect(screen.getByText(AUTOSTART_BODY)).toBeTruthy();
});

test('the battery step ticks itself when the app comes back', async () => {
  const comeBack = watchAppState();
  doneSteps(MANUAL);
  await renderSetup();
  expect(await screen.findByText(BATTERY_BODY)).toBeTruthy();
  jest.mocked(alarms.getHealth).mockResolvedValue(allowed);
  await comeBack();
  expect(stepRow('battery').getByText('Allowed')).toBeTruthy();
  expect(screen.getByText('4 of 4 done · Xiaomi phone')).toBeTruthy();
  expect(screen.queryByText(BATTERY_BODY)).toBeNull();
});

test('first run: Do this later opens Today', async () => {
  await renderSetup({ firstRun: true });
  expect(headerTitles()).toEqual(["Let's make sure alarms ring"]);
  expect(screen.queryByLabelText('Back')).toBeNull();
  // Finish waits until every step is done.
  expect(screen.queryByText('Finish')).toBeNull();
  await act(async () => fireEvent.press(screen.getByText('Do this later')));
  expect(await screen.findByRole('tab', { name: 'Today' })).toBeTruthy();
  expect(headerTitles()).not.toContain("Let's make sure alarms ring");
});

test('first run: Finish opens Today once every step is done', async () => {
  jest.mocked(alarms.getHealth).mockResolvedValue(allowed);
  doneSteps(MANUAL);
  await renderSetup({ firstRun: true });
  expect(screen.queryByText('Do this later')).toBeNull();
  await act(async () => fireEvent.press(screen.getByText('Finish')));
  expect(await screen.findByRole('tab', { name: 'Today' })).toBeTruthy();
  expect(headerTitles()).not.toContain("Let's make sure alarms ring");
});

test('first run keeps steps already done ticked', async () => {
  // A tester's phone updated in place: lock in recent apps was done before.
  doneSteps(['lockRecents']);
  await renderSetup({ firstRun: true });
  expect(stepRow('lockRecents').getByLabelText('Done')).toBeTruthy();
  expect(screen.getAllByLabelText('Done')).toHaveLength(1);
  expect(screen.getByText('1 of 4 done · Xiaomi phone')).toBeTruthy();
  expect(screen.getByText(AUTOSTART_BODY)).toBeTruthy();
});

test('first run counts as seeing setup, so the first pill saved does not open it again', async () => {
  await renderSetup({ firstRun: true });
  expect(alarms.markSetupSeen).toHaveBeenCalledTimes(1);
});
