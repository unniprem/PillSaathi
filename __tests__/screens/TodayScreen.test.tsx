import { Alert } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as alarms from '../../src/native/alarms';
import type { Today, TodayPill } from '../../src/native/alarms';
import * as sounds from '../../src/native/sounds';
import { mockAlarmsDefaults } from '../helpers/nativeMocks';
import { renderApp } from '../helpers/renderApp';

jest.mock('../../src/native/alarms');
jest.mock('../../src/native/sounds');

const at = (d: number, h: number, m: number) =>
  new Date(2026, 9, d, h, m).getTime();

function pill(
  pillId: string,
  name: string,
  more: Partial<TodayPill> = {},
): TodayPill {
  return {
    pillId,
    name,
    form: 'tablet',
    amount: 1,
    startDate: '2026-10-26',
    days: 5,
    exists: true,
    fromTomorrow: false,
    photoUri: null,
    ...more,
  };
}

const today: Today = {
  date: '2026-10-26',
  cards: [
    {
      alarmId: null,
      hour: 7,
      minute: 0,
      soundId: null,
      status: 'taken',
      statusAt: at(26, 7, 1),
      pills: [pill('gone', 'Old syrup', { exists: false, startDate: null })],
    },
    {
      alarmId: 'c8',
      hour: 8,
      minute: 0,
      soundId: 's1',
      status: 'taken',
      statusAt: at(26, 8, 2),
      pills: [
        pill('p1', 'Azithromycin 500'),
        pill('p2', 'Telma 40', { amount: 0.5, days: null }),
      ],
    },
    {
      alarmId: 'c9',
      hour: 9,
      minute: 0,
      soundId: null,
      status: 'later',
      statusAt: at(27, 9, 0),
      pills: [
        pill('p4', 'Iron', { startDate: '2026-10-27', fromTomorrow: true }),
      ],
    },
    {
      alarmId: 'c14',
      hour: 14,
      minute: 0,
      soundId: null,
      status: 'missed',
      statusAt: at(26, 14, 12),
      pills: [pill('p3', 'Vitamin D3', { form: 'capsule', days: null })],
    },
    {
      alarmId: 'c21',
      hour: 21,
      minute: 0,
      soundId: null,
      status: 'upcoming',
      statusAt: null,
      pills: [pill('p2', 'Telma 40', { amount: 0.5, days: null })],
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAlarmsDefaults();
  jest.mocked(alarms.getToday).mockResolvedValue(today);
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
  jest.mocked(sounds.stopPreview).mockResolvedValue();
  jest
    .mocked(sounds.onPreviewEnded)
    .mockReturnValue({ remove: jest.fn() } as never);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('shows each time card with its pills, amounts, sound and status', async () => {
  await renderApp();
  expect(await screen.findByText('✓ Taken 8:02 AM')).toBeTruthy();
  expect(screen.getByText('8:00 AM')).toBeTruthy();
  expect(screen.getByText('Azithromycin 500')).toBeTruthy();
  expect(screen.getAllByText('1 tablet').length).toBeGreaterThan(0);
  expect(screen.getAllByText('½ tablet')).toHaveLength(2);
  expect(screen.getByText('day 1 of 5')).toBeTruthy();
  expect(screen.getByText('♪ My voice')).toBeTruthy();
  expect(screen.getByText('Missed')).toBeTruthy();
  expect(screen.getByText('1 capsule')).toBeTruthy();
  expect(screen.getByText('Coming up')).toBeTruthy();
  expect(screen.getByText('Next: tomorrow')).toBeTruthy();
  expect(screen.getByText('from tomorrow')).toBeTruthy();
  expect(screen.getAllByText('♪ Default alarm tone')).toHaveLength(3);
  expect(screen.getByText('+ Add pill')).toBeTruthy();
});

test('marks a missed dose taken after confirming', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await renderApp();
  await fireEvent.press(await screen.findByText('Missed'));
  expect(alert).toHaveBeenCalledWith(
    'Mark as taken?',
    '2:00 PM · Vitamin D3',
    expect.any(Array),
  );
  const loads = jest.mocked(alarms.getToday).mock.calls.length;
  const buttons = alert.mock.calls[0][2]!;
  expect(buttons.map(b => b.text)).toEqual(['Cancel', 'Mark as taken']);
  await act(async () => buttons[1].onPress!());
  expect(alarms.markDoseTaken).toHaveBeenCalledWith('2026-10-26', 14, 0);
  await waitFor(() =>
    expect(jest.mocked(alarms.getToday).mock.calls.length).toBe(loads + 1),
  );
});

test('a failed mark-taken says so', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest
    .mocked(alarms.markDoseTaken)
    .mockRejectedValueOnce(new Error('disk full'));
  await renderApp();
  await fireEvent.press(await screen.findByText('Missed'));
  await act(async () => alert.mock.calls[0][2]![1].onPress!());
  expect(alert).toHaveBeenLastCalledWith(
    'Could not mark it taken',
    'Please try again.',
  );
});

test('a taken or upcoming status offers nothing', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await renderApp();
  await fireEvent.press(await screen.findByText('✓ Taken 8:02 AM'));
  await fireEvent.press(screen.getByText('Coming up'));
  expect(alert).not.toHaveBeenCalled();
});

test('opens the pill page from a pill row', async () => {
  jest.mocked(alarms.listPills).mockResolvedValue([
    {
      id: 'p1',
      name: 'Azithromycin 500',
      form: 'tablet',
      amount: 1,
      times: [{ hour: 8, minute: 0 }],
      startDate: '2026-10-26',
      days: 5,
      photo: null,
      photoUri: null,
    },
  ]);
  await renderApp();
  await fireEvent.press(await screen.findByText('Azithromycin 500'));
  expect(await screen.findByDisplayValue('Azithromycin 500')).toBeTruthy();
  expect(screen.getByText('Delete')).toBeTruthy();
});

test('does not open a pill deleted since', async () => {
  await renderApp();
  await fireEvent.press(await screen.findByText('Old syrup'));
  expect(screen.queryByPlaceholderText('Medicine name')).toBeNull();
  expect(screen.getByText('+ Add pill')).toBeTruthy();
});

test('opens the sound picker for the card', async () => {
  await renderApp();
  await fireEvent.press(await screen.findByText('♪ My voice'));
  expect(await screen.findByText('Your sounds')).toBeTruthy();
});

test('+ Add pill opens a new pill page', async () => {
  await renderApp();
  await fireEvent.press(await screen.findByText('+ Add pill'));
  expect(await screen.findByPlaceholderText('Medicine name')).toBeTruthy();
  expect(screen.queryByText('Delete')).toBeNull();
});

test('alerts missed medicines from reconcile', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest
    .mocked(alarms.reconcileOnAppOpen)
    .mockResolvedValueOnce([
      { id: 'c8', name: 'Azithromycin 500, Telma 40', dueAt: at(26, 8, 0) },
      { id: 'c14', name: 'Vitamin D3', dueAt: at(26, 14, 0) },
    ])
    .mockResolvedValue([]);
  await renderApp();
  await waitFor(() => expect(alert).toHaveBeenCalledTimes(1));
  expect(alert).toHaveBeenCalledWith(
    'Missed medicines',
    'PillSaathi was stopped by your phone and missed:\n8:00 AM: Azithromycin 500, Telma 40\n2:00 PM: Vitamin D3',
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
});

test('no alert when nothing was missed', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await renderApp();
  await screen.findByText('✓ Taken 8:02 AM');
  expect(alert).not.toHaveBeenCalled();
});

test('shows the empty prompt', async () => {
  jest
    .mocked(alarms.getToday)
    .mockResolvedValue({ date: '2026-10-26', cards: [] });
  await renderApp();
  expect(
    await screen.findByText('No pills yet. Tap + Add pill to add one.'),
  ).toBeTruthy();
});

test('shows the load failure', async () => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.mocked(alarms.getToday).mockRejectedValue(new Error('x'));
  await renderApp();
  expect(
    await screen.findByText(
      "Couldn't load your pills. Reopen the app to try again.",
    ),
  ).toBeTruthy();
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
  await screen.findByText('✓ Taken 8:02 AM');
  expect(screen.queryByText(/Tap to/)).toBeNull();
});

describe('when a side call fails', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  test('getHealth rejecting still shows the cards and no banner', async () => {
    jest.mocked(alarms.getHealth).mockRejectedValue(new Error('boom'));
    await renderApp();
    expect(await screen.findByText('Azithromycin 500')).toBeTruthy();
    expect(screen.queryByText(/Tap to/)).toBeNull();
  });

  test('reconcileOnAppOpen rejecting still shows the cards', async () => {
    jest.mocked(alarms.reconcileOnAppOpen).mockRejectedValue(new Error('x'));
    await renderApp();
    expect(await screen.findByText('Azithromycin 500')).toBeTruthy();
  });

  test('listSounds rejecting still shows the cards, with the default tone name', async () => {
    jest.mocked(sounds.listSounds).mockRejectedValue(new Error('x'));
    await renderApp();
    expect(await screen.findByText('Azithromycin 500')).toBeTruthy();
    expect(screen.getAllByText('♪ Default alarm tone')).toHaveLength(4);
  });
});
