import { Alert } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { courseSummary, toISODate } from '../../src/lib/course';
import * as alarms from '../../src/native/alarms';
import type { Pill } from '../../src/native/alarms';
import * as sounds from '../../src/native/sounds';
import { mockAlarmsDefaults } from '../helpers/nativeMocks';
import { renderApp } from '../helpers/renderApp';

jest.mock('../../src/native/alarms');
jest.mock('../../src/native/sounds');

const telma: Pill = {
  id: 'p1',
  name: 'Telma 40',
  form: 'tablet',
  amount: 0.5,
  times: [{ hour: 21, minute: 0 }],
  startDate: '2026-10-20',
  days: 12,
  photo: null,
  photoUri: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAlarmsDefaults();
  jest.mocked(alarms.listPills).mockResolvedValue([telma]);
  jest.mocked(alarms.savePill).mockResolvedValue(telma);
  jest.mocked(alarms.deletePill).mockResolvedValue();
  jest.mocked(alarms.markSetupSeen).mockResolvedValue();
  jest.mocked(alarms.pickTime).mockResolvedValue({ hour: 8, minute: 0 });
  jest.mocked(sounds.listSounds).mockResolvedValue([]);
});

afterEach(() => {
  jest.restoreAllMocks();
});

async function newPill(name = 'Azithromycin 500') {
  await renderApp('PillEdit', {});
  await fireEvent.changeText(
    await screen.findByPlaceholderText('Medicine name'),
    name,
  );
  await fireEvent.press(screen.getByText('+ Add a time'));
  await screen.findByText('8:00 AM');
}

const save = () => fireEvent.press(screen.getByText('Save'));

/** Whether [el] sits in the page's scrolling content rather than the fixed top bar. */
function scrollsWithPage(el: { parent: unknown }): boolean {
  for (let n = el.parent as { type?: unknown; parent: unknown } | null; n; ) {
    if (n.type === 'RCTScrollView') {
      return true;
    }
    n = n.parent as typeof n;
  }
  return false;
}

test('Save and Delete sit in the top bar, not at the end of the page', async () => {
  await renderApp('PillEdit', { pillId: 'p1' });
  await screen.findByDisplayValue('Telma 40');
  expect(scrollsWithPage(screen.getByPlaceholderText('Medicine name'))).toBe(
    true,
  );
  expect(scrollsWithPage(screen.getByText('Save'))).toBe(false);
  expect(scrollsWithPage(screen.getByText('Delete'))).toBe(false);
});

test('starts with no duration chosen and Save disabled', async () => {
  await newPill();
  for (const label of [
    '5 days',
    '7 days',
    '10 days',
    '20 days',
    'Other…',
    'No end',
  ]) {
    expect(
      screen.getByRole('button', { name: label }).props.accessibilityState,
    ).toEqual(expect.objectContaining({ selected: false }));
  }
  expect(
    screen.getByRole('button', { name: 'Save' }).props.accessibilityState,
  ).toEqual(expect.objectContaining({ disabled: true }));
  await save();
  expect(alarms.savePill).not.toHaveBeenCalled();
});

test('saves a new pill with what was entered', async () => {
  await newPill('  Azithromycin 500 ');
  expect(alarms.pickTime).toHaveBeenCalledWith(8, 0);
  await fireEvent.press(screen.getByText('5 days'));
  await save();
  expect(alarms.savePill).toHaveBeenCalledWith({
    id: null,
    name: 'Azithromycin 500',
    form: 'tablet',
    amount: 1,
    times: [{ hour: 8, minute: 0 }],
    startsTomorrow: false,
    days: 5,
    photo: null,
  });
});

test('saves No end and Tomorrow as chosen', async () => {
  await newPill();
  await fireEvent.press(screen.getByText('No end'));
  await fireEvent.press(screen.getByText('Tomorrow'));
  await save();
  expect(alarms.savePill).toHaveBeenCalledWith(
    expect.objectContaining({ startsTomorrow: true, days: null }),
  );
});

test('keeps Save disabled for an invalid Other… duration', async () => {
  await newPill();
  await fireEvent.press(screen.getByText('Other…'));
  const days = screen.getByLabelText('Days');
  for (const junk of ['0', '366', '5.5', '', '1e2']) {
    await fireEvent.changeText(days, junk);
    await save();
  }
  expect(alarms.savePill).not.toHaveBeenCalled();
  await fireEvent.changeText(days, '12');
  await save();
  expect(alarms.savePill).toHaveBeenCalledWith(
    expect.objectContaining({ days: 12 }),
  );
});

test('resets the amount when the type changes', async () => {
  await renderApp('PillEdit', {});
  expect(await screen.findByText('1 tablet')).toBeTruthy();
  await fireEvent.press(screen.getByText('Syrup'));
  expect(screen.getByText('5 ml')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('More'));
  expect(screen.getByText('7.5 ml')).toBeTruthy();
  await fireEvent.press(screen.getByText('Tablet'));
  expect(screen.getByText('1 tablet')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Less'));
  await fireEvent.press(screen.getByLabelText('Less'));
  expect(screen.getByText('½ tablet')).toBeTruthy();
});

test('refuses a time already on the pill', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await newPill();
  await fireEvent.press(screen.getByText('+ Add a time'));
  await waitFor(() =>
    expect(alert).toHaveBeenCalledWith('That time is already added.'),
  );
  expect(screen.getAllByText('8:00 AM')).toHaveLength(1);
});

test('changes and removes a time', async () => {
  await newPill();
  jest.mocked(alarms.pickTime).mockResolvedValueOnce({ hour: 21, minute: 0 });
  await fireEvent.press(screen.getByText('+ Add a time'));
  expect(await screen.findByText('9:00 PM')).toBeTruthy();
  jest.mocked(alarms.pickTime).mockResolvedValueOnce({ hour: 7, minute: 30 });
  await fireEvent.press(screen.getAllByText('Change')[0]);
  expect(await screen.findByText('7:30 AM')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Remove 9:00 PM'));
  expect(screen.queryByText('9:00 PM')).toBeNull();
  await fireEvent.press(screen.getByText('7 days'));
  await save();
  expect(alarms.savePill).toHaveBeenCalledWith(
    expect.objectContaining({ times: [{ hour: 7, minute: 30 }], days: 7 }),
  );
});

test('hides + Add a time at six times', async () => {
  await newPill();
  for (let h = 9; h <= 13; h++) {
    jest.mocked(alarms.pickTime).mockResolvedValueOnce({ hour: h, minute: 0 });
    await fireEvent.press(screen.getByText('+ Add a time'));
    await screen.findByText(
      `${h > 12 ? h - 12 : h}:00 ${h < 12 ? 'AM' : 'PM'}`,
    );
  }
  expect(screen.queryByText('+ Add a time')).toBeNull();
});

test('shows the course summary', async () => {
  await newPill();
  await fireEvent.press(screen.getByText('5 days'));
  const today = toISODate(new Date());
  expect(
    screen.getByText(
      courseSummary({
        startDate: today,
        days: 5,
        times: [{ hour: 8, minute: 0 }],
        today,
        is24h: false,
      }),
    ),
  ).toBeTruthy();
});

test('loads an existing pill and saves it with its id', async () => {
  await renderApp('PillEdit', { pillId: 'p1' });
  expect(await screen.findByDisplayValue('Telma 40')).toBeTruthy();
  expect(screen.getByText('½ tablet')).toBeTruthy();
  expect(screen.getByText('9:00 PM')).toBeTruthy();
  expect(
    screen.getByRole('button', { name: 'Other…' }).props.accessibilityState,
  ).toEqual(expect.objectContaining({ selected: true }));
  expect(screen.getByDisplayValue('12')).toBeTruthy();
  expect(screen.queryByText('Tomorrow')).toBeNull();
  await save();
  expect(alarms.savePill).toHaveBeenCalledWith({
    id: 'p1',
    name: 'Telma 40',
    form: 'tablet',
    amount: 0.5,
    times: [{ hour: 21, minute: 0 }],
    startsTomorrow: false,
    days: 12,
    photo: null,
  });
});

test('an edit keeps the pill photo', async () => {
  const photo = '3f2504e0-4f89-41d3-9a0c-0305e82c3301.jpg';
  jest
    .mocked(alarms.listPills)
    .mockResolvedValue([
      { ...telma, photo, photoUri: `file:///photos/${photo}` },
    ]);
  await renderApp('PillEdit', { pillId: 'p1' });
  expect(await screen.findByDisplayValue('Telma 40')).toBeTruthy();
  await save();
  expect(alarms.savePill).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'p1', photo }),
  );
});

test('a pill that no longer exists leaves the page', async () => {
  jest.mocked(alarms.listPills).mockResolvedValue([]);
  await renderApp('PillEdit', { pillId: 'p1' });
  await waitFor(() => expect(screen.queryByText('Save')).toBeNull());
  expect(alarms.savePill).not.toHaveBeenCalled();
});

test('deletes after confirming', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await renderApp('PillEdit', { pillId: 'p1' });
  await screen.findByDisplayValue('Telma 40');
  await fireEvent.press(screen.getByText('Delete'));
  expect(alert).toHaveBeenCalledWith(
    'Delete this pill?',
    undefined,
    expect.any(Array),
  );
  const buttons = alert.mock.calls[0][2]!;
  await act(async () => {
    buttons.find(b => b.style === 'destructive')!.onPress!();
  });
  expect(alarms.deletePill).toHaveBeenCalledWith('p1');
  await waitFor(() => expect(screen.queryByText('Delete')).toBeNull());
});

test('a failed save says so and stays', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.mocked(alarms.savePill).mockRejectedValueOnce(new Error('disk full'));
  await newPill();
  await fireEvent.press(screen.getByText('No end'));
  await save();
  expect(alert).toHaveBeenCalledWith(
    'Could not save the pill',
    'Please try again.',
  );
  expect(screen.getByText('Save')).toBeTruthy();
});

test('opens setup after the first pill', async () => {
  jest
    .mocked(alarms.getSetupState)
    .mockResolvedValue({ seen: false, doneSteps: [] });
  await newPill();
  await fireEvent.press(screen.getByText('No end'));
  await save();
  await waitFor(() => expect(alarms.markSetupSeen).toHaveBeenCalledTimes(1));
  expect(
    await screen.findByText(
      'Some phones stop apps in the background. Do these steps once so your alarms always ring.',
    ),
  ).toBeTruthy();
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
  await newPill();
  await fireEvent.press(screen.getByText('No end'));
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
});
