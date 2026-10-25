import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as alarms from '../../src/native/alarms';
import * as sounds from '../../src/native/sounds';
import { renderApp } from '../helpers/renderApp';

jest.mock('../../src/native/alarms');
jest.mock('../../src/native/sounds');

const alarm = {
  id: 'a1',
  hour: 7,
  minute: 0,
  days: [1, 2, 3, 4, 5],
  name: 'Morning tablet',
  soundId: 's1' as string | null,
  enabled: true,
  nextTriggerAt: 1,
  snoozeUntil: null,
};

const sound = {
  id: 's1',
  name: 'My voice',
  kind: 'recorded' as const,
  durationMs: 5000,
  createdAt: 1,
  usedBy: [],
};

beforeEach(() => {
  jest.mocked(alarms.listAlarms).mockResolvedValue([]);
  jest.mocked(alarms.reconcileOnAppOpen).mockResolvedValue([]);
  jest.mocked(alarms.is24HourFormat).mockReturnValue(false);
  jest.mocked(alarms.setAlarmEnabled).mockResolvedValue(alarm);
  jest.mocked(alarms.getHealth).mockResolvedValue({
    notificationsEnabled: true,
    alarmChannelEnabled: true,
    exactAlarmAllowed: true,
    fullScreenAllowed: true,
    ignoringBatteryOptimizations: true,
    backgroundRestricted: false,
    alarmVolumeLow: false,
  });
  jest.mocked(alarms.getSetupState).mockResolvedValue({
    seen: true,
    doneSteps: [],
  });
  jest.mocked(sounds.listSounds).mockResolvedValue([sound]);
});

test('shows each alarm with time, name, sound and repeat summary', async () => {
  jest.mocked(alarms.listAlarms).mockResolvedValue([alarm]);
  await renderApp();
  expect(await screen.findByText('7:00 AM')).toBeTruthy();
  expect(screen.getByText('Morning tablet')).toBeTruthy();
  expect(screen.getByText('🔊 My voice · Mon–Fri')).toBeTruthy();
});

test('turning the switch off calls setAlarmEnabled(id, false)', async () => {
  jest.mocked(alarms.listAlarms).mockResolvedValue([alarm]);
  await renderApp();
  const toggle = await screen.findByRole('switch');
  await fireEvent(toggle, 'valueChange', false);
  expect(alarms.setAlarmEnabled).toHaveBeenCalledWith('a1', false);
});

test('shows the empty state when there are no alarms', async () => {
  await renderApp();
  expect(
    await screen.findByText('No alarms yet. Tap + to add one.'),
  ).toBeTruthy();
});

test('unknown or null soundId shows Default alarm tone', async () => {
  jest.mocked(alarms.listAlarms).mockResolvedValue([
    { ...alarm, id: 'a2', soundId: null, days: [] },
    { ...alarm, id: 'a3', soundId: 'gone', days: [6, 7] },
  ]);
  await renderApp();
  expect(await screen.findByText('🔊 Default alarm tone · Once')).toBeTruthy();
  expect(screen.getByText('🔊 Default alarm tone · Weekends')).toBeTruthy();
});

test('reconciles on open and refreshes health and setup state', async () => {
  await renderApp();
  await waitFor(() => expect(alarms.getSetupState).toHaveBeenCalled());
  expect(alarms.reconcileOnAppOpen).toHaveBeenCalled();
  expect(alarms.getHealth).toHaveBeenCalled();
});

describe('when a side call fails', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  test('getHealth rejecting still shows the alarms', async () => {
    jest.mocked(alarms.listAlarms).mockResolvedValue([alarm]);
    jest.mocked(alarms.getHealth).mockRejectedValue(new Error('boom'));
    await renderApp();
    expect(await screen.findByText('Morning tablet')).toBeTruthy();
  });

  test('reconcileOnAppOpen rejecting still shows the alarms', async () => {
    jest.mocked(alarms.listAlarms).mockResolvedValue([alarm]);
    jest.mocked(alarms.reconcileOnAppOpen).mockRejectedValue(new Error('x'));
    await renderApp();
    expect(await screen.findByText('Morning tablet')).toBeTruthy();
  });

  test('listAlarms rejecting shows an error message', async () => {
    jest.mocked(alarms.listAlarms).mockRejectedValue(new Error('x'));
    await renderApp();
    expect(
      await screen.findByText(
        "Couldn't load your alarms. Pull down or reopen the app to try again.",
      ),
    ).toBeTruthy();
  });
});
