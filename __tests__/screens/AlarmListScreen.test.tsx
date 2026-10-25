import { Alert } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
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

test('a switch change that fails says so and shows the stored state', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const failure = Object.assign(new Error('disk full'), {
    code: 'STORAGE_ERROR',
  });
  jest.mocked(alarms.listAlarms).mockResolvedValue([alarm]);
  jest.mocked(alarms.setAlarmEnabled).mockRejectedValueOnce(failure);
  await renderApp();
  const toggle = await screen.findByRole('switch');
  const loads = jest.mocked(alarms.listAlarms).mock.calls.length;
  await fireEvent(toggle, 'valueChange', false);
  expect(alert).toHaveBeenCalledWith(
    'Could not change the alarm',
    'Please try again.',
  );
  expect(warn).toHaveBeenCalledWith('Could not change the alarm', failure);
  // The list is re-read, so the switch shows what was really stored.
  await waitFor(() =>
    expect(jest.mocked(alarms.listAlarms).mock.calls.length).toBe(loads + 1),
  );
  alert.mockRestore();
  warn.mockRestore();
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

test('shows the first health issue in the banner and opens its setting on tap', async () => {
  jest.mocked(alarms.getHealth).mockResolvedValue({
    notificationsEnabled: true,
    alarmChannelEnabled: true,
    exactAlarmAllowed: true,
    fullScreenAllowed: true,
    ignoringBatteryOptimizations: false,
    backgroundRestricted: true,
    alarmVolumeLow: false,
  });
  jest.mocked(alarms.openSetting).mockResolvedValue(true);
  await renderApp();
  const banner = await screen.findByText(
    'Background use is restricted, so alarms may not ring. Tap to fix. (+1 more)',
  );
  fireEvent.press(banner);
  expect(alarms.openSetting).toHaveBeenCalledWith('backgroundRestricted');
});

test('shows no banner when there are no issues', async () => {
  await renderApp();
  await screen.findByText('No alarms yet. Tap + to add one.');
  expect(screen.queryByText(/Tap to/)).toBeNull();
});

test('alarms missed while the app was stopped are reported once with a Fix this button', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const dueAt = new Date();
  dueAt.setHours(7, 0, 0, 0);
  jest
    .mocked(alarms.reconcileOnAppOpen)
    .mockResolvedValueOnce([
      { id: 'a1', name: 'Morning tablet', dueAt: dueAt.getTime() },
    ])
    .mockResolvedValue([]);
  await renderApp();
  await waitFor(() => expect(alert).toHaveBeenCalledTimes(1));
  expect(alert).toHaveBeenCalledWith(
    'Alarm missed',
    'PillSaathi was stopped by your phone and missed Morning tablet (7:00 AM).',
    [
      { text: 'Later', style: 'cancel' },
      { text: 'Fix this', onPress: expect.any(Function) },
    ],
  );
  const buttons = alert.mock.calls[0][2]!;
  await act(async () => buttons[1].onPress!());
  expect(
    screen.getByText(
      'Some phones stop apps in the background. Do these steps once so your alarms always ring.',
    ),
  ).toBeTruthy();
  expect(alert).toHaveBeenCalledTimes(1);
  alert.mockRestore();
});

test('no alert when nothing was missed', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await renderApp();
  await screen.findByText('No alarms yet. Tap + to add one.');
  expect(alert).not.toHaveBeenCalled();
  alert.mockRestore();
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

  test('getHealth rejecting shows no banner', async () => {
    jest.mocked(alarms.getHealth).mockRejectedValue(new Error('boom'));
    await renderApp();
    await screen.findByText('No alarms yet. Tap + to add one.');
    expect(screen.queryByText(/Tap to/)).toBeNull();
  });

  test('listAlarms rejecting shows an error message', async () => {
    jest.mocked(alarms.listAlarms).mockRejectedValue(new Error('x'));
    await renderApp();
    expect(
      await screen.findByText(
        "Couldn't load your alarms. Reopen the app to try again.",
      ),
    ).toBeTruthy();
  });
});
