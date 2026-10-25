import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as alarms from '../../src/native/alarms';
import * as sounds from '../../src/native/sounds';
import { renderApp } from '../helpers/renderApp';

jest.mock('../../src/native/alarms');
jest.mock('../../src/native/sounds');

const existing = {
  id: 'a1',
  hour: 8,
  minute: 15,
  days: [2],
  name: 'Evening',
  soundId: null,
  enabled: true,
  nextTriggerAt: 1,
  snoozeUntil: null,
};

afterEach(() => {
  jest.restoreAllMocks();
});

beforeEach(() => {
  jest.mocked(alarms.listAlarms).mockResolvedValue([existing]);
  jest.mocked(alarms.reconcileOnAppOpen).mockResolvedValue([]);
  jest.mocked(alarms.is24HourFormat).mockReturnValue(false);
  jest.mocked(alarms.saveAlarm).mockResolvedValue(existing);
  jest.mocked(alarms.deleteAlarm).mockResolvedValue();
  jest.mocked(alarms.markSetupSeen).mockResolvedValue();
  jest.mocked(alarms.pickTime).mockResolvedValue({ hour: 6, minute: 30 });
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
  jest.mocked(sounds.listSounds).mockResolvedValue([
    {
      id: 's1',
      name: 'My voice',
      kind: 'recorded',
      durationMs: 5000,
      createdAt: 1,
      usedBy: [],
    },
  ]);
});

async function save() {
  await fireEvent.press(screen.getByText('Save'));
}

test('saving a new alarm sends the draft to saveAlarm', async () => {
  await renderApp('AlarmEdit', {});
  await fireEvent.press(await screen.findByText('7:00 AM'));
  expect(await screen.findByText('6:30 AM')).toBeTruthy();
  expect(alarms.pickTime).toHaveBeenCalledWith(7, 0);
  await fireEvent.press(screen.getByTestId('day-1'));
  await fireEvent.press(screen.getByTestId('day-3'));
  await fireEvent.changeText(screen.getByPlaceholderText('Alarm'), '  Pills ');
  await save();
  expect(alarms.saveAlarm).toHaveBeenCalledWith({
    id: null,
    hour: 6,
    minute: 30,
    days: [1, 3],
    name: 'Pills',
    soundId: null,
  });
});

test('a blank name is saved as "Alarm"', async () => {
  await renderApp('AlarmEdit', {});
  await screen.findByPlaceholderText('Alarm');
  await save();
  expect(alarms.saveAlarm).toHaveBeenCalledWith(
    expect.objectContaining({ hour: 7, minute: 0, name: 'Alarm' }),
  );
});

test('first saved alarm opens the Setup screen once', async () => {
  jest
    .mocked(alarms.getSetupState)
    .mockResolvedValue({ seen: false, doneSteps: [] });
  await renderApp('AlarmEdit', {});
  await screen.findByPlaceholderText('Alarm');
  await save();
  await waitFor(() => expect(alarms.markSetupSeen).toHaveBeenCalledTimes(1));
  // replace('Setup') unmounts the editor.
  await waitFor(() =>
    expect(screen.queryByPlaceholderText('Alarm')).toBeNull(),
  );
});

test('asks for the exact alarm permission when it is missing', async () => {
  jest.mocked(alarms.getHealth).mockResolvedValue({
    notificationsEnabled: true,
    alarmChannelEnabled: true,
    exactAlarmAllowed: false,
    fullScreenAllowed: true,
    ignoringBatteryOptimizations: true,
    backgroundRestricted: false,
    alarmVolumeLow: false,
  });
  jest.mocked(alarms.openSetting).mockResolvedValue(true);
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await renderApp('AlarmEdit', {});
  await screen.findByPlaceholderText('Alarm');
  await save();
  expect(alert).toHaveBeenCalledWith(
    'PillSaathi needs permission to set alarms',
    expect.any(String),
    expect.any(Array),
    expect.anything(),
  );
  const buttons = alert.mock.calls[0][2]!;
  await act(async () => {
    buttons.find(b => b.text === 'Allow')!.onPress!();
  });
  expect(alarms.openSetting).toHaveBeenCalledWith('exactAlarm');
  alert.mockRestore();
});

test('a picked sound from params replaces the draft sound', async () => {
  await renderApp('AlarmEdit', { pickedSoundId: 's1' });
  expect(await screen.findByText('My voice')).toBeTruthy();
  await save();
  expect(alarms.saveAlarm).toHaveBeenCalledWith(
    expect.objectContaining({ soundId: 's1' }),
  );
});

test('Delete asks for confirmation, then deletes', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await renderApp('AlarmEdit', { alarmId: 'a1' });
  expect(await screen.findByText('8:15 AM')).toBeTruthy();
  await fireEvent.press(screen.getByText('Delete'));
  expect(alert).toHaveBeenCalledWith(
    'Delete this alarm?',
    undefined,
    expect.any(Array),
  );
  const buttons = alert.mock.calls[0][2]!;
  await act(async () => {
    buttons.find(b => b.style === 'destructive')!.onPress!();
  });
  expect(alarms.deleteAlarm).toHaveBeenCalledWith('a1');
  alert.mockRestore();
});
