import { Platform } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as alarms from '../../src/native/alarms';
import * as sounds from '../../src/native/sounds';
import { renderApp } from '../helpers/renderApp';

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

beforeAll(() => {
  jest
    .spyOn(Platform, 'constants', 'get')
    .mockReturnValue({ Manufacturer: 'Xiaomi' } as never);
});
afterAll(() => {
  jest.restoreAllMocks();
});

// Renders the Setup route and lets its health and setup reads settle.
async function renderSetup() {
  await renderApp('Setup');
  await act(async () => {});
}

beforeEach(() => {
  jest.mocked(alarms.getHealth).mockResolvedValue(health);
  jest.mocked(alarms.getSetupState).mockResolvedValue({
    seen: true,
    doneSteps: [],
  });
  jest
    .mocked(alarms.getToday)
    .mockResolvedValue({ date: '2026-10-26', cards: [] });
  jest.mocked(alarms.reconcileOnAppOpen).mockResolvedValue([]);
  jest.mocked(alarms.is24HourFormat).mockReturnValue(false);
  jest.mocked(sounds.listSounds).mockResolvedValue([]);
  jest.mocked(alarms.openSetting).mockResolvedValue(true);
  jest.mocked(alarms.setSetupStepDone).mockResolvedValue(undefined);
});

test('shows the intro and the Xiaomi steps in order', async () => {
  await renderSetup();
  expect(
    await screen.findByText(
      'Some phones stop apps in the background. Do these steps once so your alarms always ring.',
    ),
  ).toBeTruthy();
  const titles = [
    'Turn on Autostart',
    'Set Battery saver to No restrictions',
    'Lock PillSaathi in recent apps',
    'Allow unrestricted battery use',
  ];
  const positions = titles.map(t => screen.getByText(t));
  expect(positions).toHaveLength(4);
  expect(screen.getAllByText('Open settings')).toHaveLength(3);
  expect(screen.getAllByText('Done')).toHaveLength(3);
});

test('Open settings on Autostart calls openSetting("oemAutostart")', async () => {
  await renderSetup();
  await screen.findByText('Turn on Autostart');
  fireEvent.press(screen.getAllByText('Open settings')[0]);
  expect(alarms.openSetting).toHaveBeenCalledWith('oemAutostart');
});

test('Done toggles the step through setSetupStepDone', async () => {
  await renderSetup();
  await screen.findByText('Turn on Autostart');
  await act(async () => fireEvent.press(screen.getAllByText('Done')[0]));
  expect(alarms.setSetupStepDone).toHaveBeenCalledWith('autostart', true);
  await waitFor(() =>
    expect(screen.getAllByText('Done ✓').length).toBeGreaterThan(0),
  );
  await act(async () => fireEvent.press(screen.getByText('Done ✓')));
  expect(alarms.setSetupStepDone).toHaveBeenLastCalledWith('autostart', false);
  await waitFor(() => expect(screen.queryByText('Done ✓')).toBeNull());
});

test('the battery step is ticked from health and has no Done toggle', async () => {
  jest
    .mocked(alarms.getHealth)
    .mockResolvedValue({ ...health, ignoringBatteryOptimizations: true });
  await renderSetup();
  expect(await screen.findByText('✓ Allowed')).toBeTruthy();
  expect(screen.getAllByText('Done')).toHaveLength(3);
});

test('Finish goes back to the alarm list', async () => {
  jest
    .mocked(alarms.getHealth)
    .mockResolvedValue({ ...health, ignoringBatteryOptimizations: true });
  await renderApp();
  const banner = await screen.findByText(
    'Finish setting up so alarms ring reliably on this phone.',
  );
  await act(async () => fireEvent.press(banner));
  expect(screen.getByText('Turn on Autostart')).toBeTruthy();
  await act(async () => fireEvent.press(screen.getByText('Finish')));
  await waitFor(() =>
    expect(screen.queryByText('Turn on Autostart')).toBeNull(),
  );
  await act(async () => {});
});
