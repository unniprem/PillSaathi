import { Alert } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as alarms from '../../src/native/alarms';
import type { Today, TodayPill } from '../../src/native/alarms';
import * as family from '../../src/native/family';
import type { FamilyCard } from '../../src/native/family';
import * as sounds from '../../src/native/sounds';
import { hi } from '../../src/i18n/hi';
import {
  emptyToday,
  healthy,
  mockAlarmsDefaults,
  mockFamilyDefaults,
} from '../helpers/nativeMocks';
import { headerTitles, renderApp } from '../helpers/renderApp';

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
  refills: [],
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

test('shows a pill photo when it has one', async () => {
  const withPhoto = pill('p1', 'Azithromycin 500', {
    photoUri: 'file:///p/a.jpg',
  });
  jest.mocked(alarms.getToday).mockResolvedValue({
    ...today,
    cards: [{ ...today.cards[1], pills: [withPhoto] }],
  });
  await renderApp();
  const photo = await screen.findByTestId('pill-photo-p1');
  expect(photo.props.source).toEqual({ uri: 'file:///p/a.jpg' });
  expect(screen.queryByTestId('pill-icon-p1')).toBeNull();
  // A photo that can't be read shows the type icon instead.
  await fireEvent(photo, 'error');
  expect(screen.getByTestId('pill-icon-p1').props.children).toBe('⚪');
});

test('shows the type icon without a photo', async () => {
  await renderApp();
  expect((await screen.findByTestId('pill-icon-p1')).props.children).toBe('⚪');
  expect(screen.getByTestId('pill-icon-p3').props.children).toBe('💊');
  expect(screen.queryByTestId('pill-photo-p1')).toBeNull();
});

test('shows Today in Hindi', async () => {
  jest.mocked(alarms.currentLanguage).mockReturnValue('hi');
  await renderApp();
  expect(await screen.findByText(hi.status.missed)).toBeTruthy();
  expect(screen.getByText('1 कैप्सूल')).toBeTruthy();
  expect(screen.getByText(hi.course.dayOf(1, 5))).toBeTruthy();
  expect(screen.getByText(hi.status.takenAt('8:02 AM'))).toBeTruthy();
  expect(screen.getAllByText(`♪ ${hi.common.defaultTone}`)).toHaveLength(3);
  expect(headerTitles()[0]).toContain('आज');
});

test('opens Settings from the gear', async () => {
  await renderApp();
  await fireEvent.press(await screen.findByLabelText('Settings'));
  await waitFor(() =>
    expect(headerTitles()).toEqual(['Today · Mon 26 Oct', 'Settings']),
  );
});

test('opens History from the calendar icon', async () => {
  await renderApp();
  await fireEvent.press(await screen.findByLabelText('History'));
  await waitFor(() =>
    expect(headerTitles()).toEqual(['Today · Mon 26 Oct', 'History']),
  );
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
      remaining: null,
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
    .mockResolvedValue({ date: '2026-10-26', cards: [], refills: [] });
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

describe('running low', () => {
  const lowTelma = {
    pillId: 'p2',
    name: 'Telma 40',
    form: 'tablet' as const,
    remaining: 9,
    daysLeft: 4,
    level: 'low' as const,
  };

  test('warns when tablets run low and opens the pill at its count', async () => {
    jest.mocked(alarms.getToday).mockResolvedValue({
      ...today,
      refills: [lowTelma],
    });
    jest.mocked(alarms.listPills).mockResolvedValue([
      {
        id: 'p2',
        name: 'Telma 40',
        form: 'tablet',
        amount: 0.5,
        times: [{ hour: 21, minute: 0 }],
        startDate: '2026-10-20',
        days: null,
        photo: null,
        photoUri: null,
        remaining: 9,
      },
    ]);
    await renderApp();
    expect(await screen.findByText('Telma 40: 9 tablets left')).toBeTruthy();
    expect(screen.getByText('About 4 days.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Add tablets'));
    expect(await screen.findByDisplayValue('9')).toBeTruthy();
    expect(screen.getByLabelText('Tablets left').props.autoFocus).toBe(true);
    expect(headerTitles()).toEqual(['Today · Mon 26 Oct', 'Edit pill']);
  });

  test('says none left', async () => {
    jest.mocked(alarms.getToday).mockResolvedValue({
      ...today,
      refills: [{ ...lowTelma, remaining: 0, daysLeft: 0, level: 'out' }],
    });
    await renderApp();
    expect(await screen.findByText('Telma 40: none left')).toBeTruthy();
    expect(screen.queryByText(/^About|^Less than/)).toBeNull();
    expect(screen.getByText('Add tablets')).toBeTruthy();
  });

  test('says one day, less than a day, and capsules', async () => {
    jest.mocked(alarms.getToday).mockResolvedValue({
      ...today,
      refills: [
        { ...lowTelma, remaining: 1.5, daysLeft: 1 },
        {
          ...lowTelma,
          pillId: 'p3',
          name: 'Vitamin D3',
          form: 'capsule',
          remaining: 1,
          daysLeft: 0,
        },
      ],
    });
    await renderApp();
    expect(await screen.findByText('Telma 40: 1½ tablets left')).toBeTruthy();
    expect(screen.getByText('About 1 day.')).toBeTruthy();
    expect(screen.getByText('Vitamin D3: 1 capsule left')).toBeTruthy();
    expect(screen.getByText('Less than a day.')).toBeTruthy();
    expect(screen.getByText('Add capsules')).toBeTruthy();
  });
});

const amma: FamilyCard = {
  elderId: 'E',
  name: 'Amma',
  phone: null,
  delayMinutes: 30,
  heardAt: at(26, 13, 12),
  silent: false,
  abandoned: false,
  otherZone: false,
  tally: { taken: 2, skipped: 0, missed: 1, notReported: 0, later: 1 },
  refills: [
    {
      pillId: 'p9',
      name: 'Telma 40',
      form: 'tablet',
      remaining: 4,
      daysLeft: 4,
      level: 'low',
    },
  ],
};

describe('family on Today', () => {
  beforeEach(() => {
    mockFamilyDefaults();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('Today shows Family above my pills, with tally and low line', async () => {
    jest.mocked(family.getFamily).mockResolvedValue([amma]);
    jest.mocked(family.refreshFamily).mockResolvedValue([amma]);
    await renderApp('Today');
    expect(await screen.findByText('Amma')).toBeTruthy();
    expect(screen.getByText('Family')).toBeTruthy();
    expect(screen.getByText('2 taken · 1 missed · 1 later')).toBeTruthy();
    expect(screen.getByText('Telma 40: 4 tablets left')).toBeTruthy();
    expect(screen.getByText('+ Add family')).toBeTruthy();
    // Above my own pills.
    const texts = screen
      .getAllByText(/Amma|Azithromycin 500/)
      .map(n => n.props.children);
    expect(texts.indexOf('Amma')).toBeLessThan(
      texts.indexOf('Azithromycin 500'),
    );
    await fireEvent.press(screen.getByText('Amma'));
    await waitFor(() =>
      expect(headerTitles()).toEqual([expect.any(String), 'Amma']),
    );
  });

  test('Today with no pills and no family offers + Add family too', async () => {
    jest.mocked(alarms.getToday).mockResolvedValue(emptyToday);
    await renderApp('Today');
    expect(
      await screen.findByText('No pills yet. Tap + Add pill to add one.'),
    ).toBeTruthy();
    expect(screen.getByText('+ Add pill')).toBeTruthy();
    await fireEvent.press(screen.getByText('+ Add family'));
    await waitFor(() =>
      expect(headerTitles()).toEqual([expect.any(String), 'Add family']),
    );
  });

  test('a silent elder shows "Not heard from since …"', async () => {
    const silent = { ...amma, silent: true, refills: [] };
    jest.mocked(family.getFamily).mockResolvedValue([silent]);
    jest.mocked(family.refreshFamily).mockResolvedValue([silent]);
    jest.mocked(alarms.getToday).mockResolvedValue(emptyToday);
    await renderApp('Today');
    expect(
      // Silent means 12 hours or more, so it is rarely today: the day is named.
      await screen.findByText('Not heard from since Mon 26 Oct, 1:12 PM'),
    ).toBeTruthy();
  });

  test('with family and no pills of its own, Today still shows the health banner', async () => {
    jest.mocked(family.getFamily).mockResolvedValue([amma]);
    jest.mocked(family.refreshFamily).mockResolvedValue([amma]);
    jest.mocked(alarms.getToday).mockResolvedValue(emptyToday);
    jest
      .mocked(alarms.getHealth)
      .mockResolvedValue({ ...healthy, exactAlarmAllowed: false });
    await renderApp('Today');
    expect(await screen.findByText('Amma')).toBeTruthy();
    expect(
      await screen.findByText(
        "PillSaathi isn't allowed to set alarms. Tap to allow it.",
      ),
    ).toBeTruthy();
    expect(
      screen.queryByText('No pills yet. Tap + Add pill to add one.'),
    ).toBeNull();
  });

  test('Today refreshes family every 2 minutes while focused', async () => {
    jest.useFakeTimers();
    jest.mocked(family.getFamily).mockResolvedValue([amma]);
    jest.mocked(family.refreshFamily).mockResolvedValue([amma]);
    await renderApp('Today');
    await waitFor(() => expect(family.refreshFamily).toHaveBeenCalledTimes(1));
    await act(async () => jest.advanceTimersByTime(119_000));
    expect(family.refreshFamily).toHaveBeenCalledTimes(1);
    await act(async () => jest.advanceTimersByTime(1_000));
    expect(family.refreshFamily).toHaveBeenCalledTimes(2);
  });
});
