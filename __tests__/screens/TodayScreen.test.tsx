import { Alert, Linking } from 'react-native';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import * as alarms from '../../src/native/alarms';
import type { Today, TodayPill } from '../../src/native/alarms';
import * as family from '../../src/native/family';
import type { ElderSetup, FamilyCard } from '../../src/native/family';
import * as sounds from '../../src/native/sounds';
import { hi } from '../../src/i18n/hi';
import { formatDay } from '../../src/lib/course';
import { reconcileAppOpen, takeMissed } from '../../src/lib/start';
import { pillColor } from '../../src/ui/pillLook';
import { familyDefaults } from '../helpers/familyDefaults';
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
      pills: [pill('p3', 'Vitamin D3', { form: 'capsule' })],
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
  jest.useRealTimers();
  jest.restoreAllMocks();
  // Nothing found missed in one test is left for the next.
  takeMissed();
});

/** Today's clock stopped at [hour]:[minute] on the fixture's day. */
function clockAt(hour: number, minute: number) {
  jest.useFakeTimers({ now: new Date(2026, 9, 26, hour, minute) });
}

test('shows each time with its pills, amounts and status', async () => {
  await renderApp();
  // Done: one line per time, each name a link to its pill.
  expect(await screen.findByText('8:00 AM · both taken')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Azithromycin 500' })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Telma 40' })).toBeTruthy();
  expect(screen.getByText('7:00 AM · taken')).toBeTruthy();
  // Deleted since: no page to open.
  expect(screen.getByText('Old syrup')).toBeTruthy();
  expect(screen.queryByRole('link', { name: 'Old syrup' })).toBeNull();
  // Next: each pill with its amount.
  expect(screen.getByText('9:00 PM')).toBeTruthy();
  expect(screen.getByRole('button', { name: /Telma 40/ })).toBeTruthy();
  expect(screen.getByText('½ tablet')).toBeTruthy();
  // Missed: each pill with its amount and course.
  expect(screen.getByText('2:00 PM · missed')).toBeTruthy();
  expect(screen.getByText('Vitamin D3')).toBeTruthy();
  expect(screen.getByText('1 capsule · day 1 of 5')).toBeTruthy();
  // Next due on another day, which isn't later today.
  expect(screen.queryByText('Later today')).toBeNull();
  expect(screen.getByText('Other days')).toBeTruthy();
  expect(screen.getByText('9:00 AM · Next: tomorrow')).toBeTruthy();
  expect(
    screen.getByRole('link', { name: 'Iron (from tomorrow)' }),
  ).toBeTruthy();
  // Sounds are set from the pill now.
  expect(screen.queryByText(/♪/)).toBeNull();
  expect(screen.getByText('Add a pill')).toBeTruthy();
});

test('shows a pill photo when it has one', async () => {
  const withPhoto = pill('p1', 'Azithromycin 500', {
    photoUri: 'file:///p/a.jpg',
  });
  jest.mocked(alarms.getToday).mockResolvedValue({
    ...today,
    cards: [{ ...today.cards[4], pills: [withPhoto] }],
  });
  await renderApp();
  const photo = await screen.findByTestId('pill-photo');
  expect(photo.props.source).toEqual({ uri: 'file:///p/a.jpg' });
  expect(screen.queryByTestId('pill-shape-tablet')).toBeNull();
  // A photo that can't be read shows the pill's shape instead.
  await fireEvent(photo, 'error');
  expect(screen.getByTestId('pill-shape-tablet')).toBeTruthy();
});

test("shows the pill's shape without a photo", async () => {
  await renderApp();
  // Telma, next, is a tablet; Vitamin D3, missed, is a capsule. The lines for the other times
  // show no pictures.
  expect(await screen.findAllByTestId('pill-shape-tablet')).toHaveLength(1);
  expect(screen.getByTestId('pill-shape-capsule')).toHaveStyle({
    backgroundColor: pillColor('Vitamin D3'),
  });
  expect(screen.queryByTestId('pill-photo')).toBeNull();
});

test('shows Today in Hindi', async () => {
  jest.mocked(alarms.currentLanguage).mockReturnValue('hi');
  await renderApp();
  expect(await screen.findByText(`2:00 PM · ${hi.today.missed}`)).toBeTruthy();
  expect(screen.getByText(`1 कैप्सूल · ${hi.course.dayOf(1, 5)}`)).toBeTruthy();
  expect(screen.getByText(`8:00 AM · ${hi.today.allTaken(2)}`)).toBeTruthy();
  expect(screen.getByText(hi.today.tookIt)).toBeTruthy();
  expect(Object.values(hi.today.greeting)).toContain(headerTitles()[0]);
  expect(screen.getByText(formatDay('2026-10-26', hi))).toBeTruthy();
});

test('opens Settings from the tab bar', async () => {
  await renderApp();
  await fireEvent.press(await screen.findByRole('tab', { name: 'Settings' }));
  await waitFor(() => expect(headerTitles()).toContain('Settings'));
  expect(
    screen.getByRole('tab', { name: 'Settings', selected: true }),
  ).toBeTruthy();
});

test('opens History from the tab bar', async () => {
  await renderApp();
  await fireEvent.press(await screen.findByRole('tab', { name: 'History' }));
  await waitFor(() => expect(headerTitles()).toContain('History'));
  expect(
    screen.getByRole('tab', { name: 'History', selected: true }),
  ).toBeTruthy();
});

test('marks a missed dose taken after confirming', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await renderApp();
  await fireEvent.press(
    await screen.findByRole('button', { name: 'I took it' }),
  );
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
  await fireEvent.press(
    await screen.findByRole('button', { name: 'I took it' }),
  );
  await act(async () => alert.mock.calls[0][2]![1].onPress!());
  expect(alert).toHaveBeenLastCalledWith(
    'Could not mark it taken',
    'Please try again.',
  );
});

test('a taken or upcoming status offers nothing', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await renderApp();
  await fireEvent.press(await screen.findByText('8:00 AM · both taken'));
  await fireEvent.press(screen.getByText('9:00 PM'));
  expect(alert).not.toHaveBeenCalled();
});

test('opens the pill page from a pill row', async () => {
  jest.mocked(alarms.listPills).mockResolvedValue([
    {
      id: 'p3',
      name: 'Vitamin D3',
      form: 'capsule',
      amount: 1,
      times: [{ hour: 14, minute: 0 }],
      startDate: '2026-10-26',
      days: 5,
      photo: null,
      photoUri: null,
      remaining: null,
    },
  ]);
  await renderApp();
  await fireEvent.press(
    await screen.findByRole('button', { name: /Vitamin D3/ }),
  );
  expect(await screen.findByText('Delete this pill')).toBeTruthy();
  expect(screen.getByText('2:00 PM')).toBeTruthy();
});

// Her phone has no other list of her pills: one taken today still opens from its line.
test('opens the pill page from a taken pill', async () => {
  jest.mocked(alarms.listPills).mockResolvedValue([
    {
      id: 'p2',
      name: 'Telma 40',
      form: 'tablet',
      amount: 0.5,
      times: [
        { hour: 8, minute: 0 },
        { hour: 21, minute: 0 },
      ],
      startDate: '2026-10-26',
      days: null,
      photo: null,
      photoUri: null,
      remaining: null,
    },
  ]);
  await renderApp();
  await fireEvent.press(await screen.findByRole('link', { name: 'Telma 40' }));
  expect(await screen.findByText('Delete this pill')).toBeTruthy();
  expect(screen.getByText('8:00 AM and 9:00 PM')).toBeTruthy();
});

test('opens the pill page from a later line', async () => {
  jest.mocked(alarms.listPills).mockResolvedValue([
    {
      id: 'p4',
      name: 'Iron',
      form: 'tablet',
      amount: 1,
      times: [{ hour: 9, minute: 0 }],
      startDate: '2026-10-27',
      days: 5,
      photo: null,
      photoUri: null,
      remaining: null,
    },
  ]);
  await renderApp();
  await fireEvent.press(
    await screen.findByRole('link', { name: 'Iron (from tomorrow)' }),
  );
  expect(await screen.findByText('Delete this pill')).toBeTruthy();
  expect(screen.getByText('9:00 AM')).toBeTruthy();
});

test('does not open a pill deleted since', async () => {
  jest.mocked(alarms.getToday).mockResolvedValue({
    ...today,
    cards: [
      {
        ...today.cards[3],
        pills: [pill('gone', 'Old syrup', { exists: false, startDate: null })],
      },
    ],
  });
  await renderApp();
  await fireEvent.press(await screen.findByText('Old syrup'));
  expect(screen.queryByRole('button', { name: /Old syrup/ })).toBeNull();
  expect(screen.queryByPlaceholderText('Medicine name')).toBeNull();
  expect(screen.getByText('Add a pill')).toBeTruthy();
});

test('Add a pill opens a new pill page', async () => {
  await renderApp();
  await fireEvent.press(await screen.findByText('Add a pill'));
  expect(await screen.findByPlaceholderText('Medicine name')).toBeTruthy();
  expect(screen.queryByText('Delete')).toBeNull();
});

test('alerts the missed medicines the app-open reconcile found', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(alarms.reconcileOnAppOpen).mockResolvedValueOnce([
    { id: 'c8', name: 'Azithromycin 500, Telma 40', dueAt: at(26, 8, 0) },
    { id: 'c14', name: 'Vitamin D3', dueAt: at(26, 14, 0) },
  ]);
  // As the app does when it opens, before Today is on screen.
  await reconcileAppOpen();
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
  await screen.findByText('8:00 AM · both taken');
  expect(alert).not.toHaveBeenCalled();
});

test('shows the empty prompt', async () => {
  jest
    .mocked(alarms.getToday)
    .mockResolvedValue({ date: '2026-10-26', cards: [], refills: [] });
  await renderApp();
  expect(await screen.findByText('No pills yet')).toBeTruthy();
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

test('refreshes health and setup state on open, and leaves the reconcile to the app', async () => {
  await renderApp();
  await waitFor(() => expect(alarms.getSetupState).toHaveBeenCalled());
  expect(alarms.getHealth).toHaveBeenCalled();
  await screen.findByText('8:00 AM · both taken');
  expect(alarms.reconcileOnAppOpen).not.toHaveBeenCalled();
});

test('a reconcile while Today is open shows what it found and the day as mended', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await renderApp();
  expect(await screen.findByText('2:00 PM · missed')).toBeTruthy();
  jest
    .mocked(alarms.reconcileOnAppOpen)
    .mockResolvedValueOnce([
      { id: 'c21', name: 'Telma 40', dueAt: at(26, 21, 0) },
    ]);
  jest.mocked(alarms.getToday).mockResolvedValue({
    ...today,
    cards: [
      ...today.cards.slice(0, 4),
      { ...today.cards[4], status: 'missed', statusAt: at(26, 21, 30) },
    ],
  });
  await act(() => reconcileAppOpen());
  expect(await screen.findByText('9:00 PM · missed')).toBeTruthy();
  expect(alert).toHaveBeenCalledTimes(1);
  expect(alert.mock.calls[0][1]).toBe(
    'PillSaathi was stopped by your phone and missed:\n9:00 PM: Telma 40',
  );
});

test('shows the first health issue in the warning card, and Fix now opens its setting', async () => {
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
  expect(await screen.findByText('Alarms may not ring')).toBeTruthy();
  expect(
    screen.getByText(
      'Background use is restricted, so alarms may not ring. Tap to fix. (+1 more)',
    ),
  ).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Fix now' }));
  expect(alarms.openSetting).toHaveBeenCalledWith('backgroundRestricted');
  // The words say "Tap to fix", so they do too.
  await fireEvent.press(
    screen.getByText(
      'Background use is restricted, so alarms may not ring. Tap to fix. (+1 more)',
    ),
  );
  expect(alarms.openSetting).toHaveBeenCalledTimes(2);
});

test('shows no warning when there are no issues', async () => {
  await renderApp();
  await screen.findByText('8:00 AM · both taken');
  expect(screen.queryByText('Alarms may not ring')).toBeNull();
  expect(screen.queryByText(/Tap to/)).toBeNull();
});

test('the next dose leads, with its time, pills and time left', async () => {
  clockAt(14, 10);
  await renderApp();
  expect(await screen.findByText('Next dose')).toBeTruthy();
  expect(screen.getByText('Tonight')).toBeTruthy();
  expect(screen.getByText('9:00 PM')).toBeTruthy();
  expect(screen.getByText('in 6 hr 50 min')).toBeTruthy();
  expect(screen.getByText('½ tablet')).toBeTruthy();
  // Then anything missed.
  const order = screen
    .getAllByText(/^Next dose$|^Telma 40$|· missed$/)
    .map(n => n.props.children);
  expect(order.slice(0, 3)).toEqual([
    'Next dose',
    'Telma 40',
    '2:00 PM · missed',
  ]);
});

test('the sky says how many doses are done, with a bar for each', async () => {
  await renderApp();
  // Iron's 9:00 is next due tomorrow, so today has four doses: two taken, one missed, one to come.
  expect(await screen.findByText('2 of 4 done')).toBeTruthy();
  expect(screen.getAllByTestId('dose-bar')).toHaveLength(4);
});

test('a ringing dose says Ringing now and offers no button', async () => {
  jest.mocked(alarms.getToday).mockResolvedValue({
    ...today,
    cards: [
      today.cards[1],
      {
        ...today.cards[4],
        hour: 9,
        status: 'ringing',
        pills: [pill('p4', 'Iron')],
      },
    ],
  });
  await renderApp();
  expect(await screen.findByText('Ringing now')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Ringing now/ })).toBeNull();
  expect(screen.queryByRole('button', { name: 'I took it' })).toBeNull();
  expect(screen.queryByText(/^in \d/)).toBeNull();
  // Her pills still open.
  expect(screen.getByRole('button', { name: /Iron/ })).toBeTruthy();
});

test('a snoozed dose says until when, and offers no button', async () => {
  jest.mocked(alarms.getToday).mockResolvedValue({
    ...today,
    cards: [
      {
        ...today.cards[4],
        hour: 9,
        status: 'snoozed',
        statusAt: at(26, 9, 10),
      },
    ],
  });
  await renderApp();
  expect(await screen.findByText('Snoozed until 9:10 AM')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'I took it' })).toBeNull();
});

test('a skipped dose is a grey line with I took it', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(alarms.getToday).mockResolvedValue({
    ...today,
    cards: [
      { ...today.cards[1], status: 'skipped', statusAt: at(26, 8, 5) },
      today.cards[4],
    ],
  });
  await renderApp();
  expect(await screen.findByText('8:00 AM · skipped')).toBeTruthy();
  // TalkBack says which dose: the time is on the line, not on the button.
  await fireEvent.press(
    screen.getByRole('button', { name: 'I took it, 8:00 AM' }),
  );
  expect(alert).toHaveBeenCalledWith(
    'Mark as taken?',
    '8:00 AM · Azithromycin 500, Telma 40',
    expect.any(Array),
  );
});

test("when all are done it says so with tomorrow's first time", async () => {
  clockAt(22, 0);
  jest.mocked(alarms.getToday).mockResolvedValue({
    ...today,
    cards: [
      // Recorded at 7:00, but its pill is gone: it doesn't ring tomorrow.
      today.cards[0],
      today.cards[1],
      { ...today.cards[4], status: 'taken', statusAt: at(26, 21, 3) },
    ],
  });
  await renderApp();
  expect(await screen.findByText('All done for today')).toBeTruthy();
  expect(screen.getByText('Tomorrow, 8:00 AM')).toBeTruthy();
  expect(screen.queryByText(/^in \d/)).toBeNull();
});

test("a course that ends today is not tomorrow's first time", async () => {
  clockAt(22, 0);
  jest.mocked(alarms.getToday).mockResolvedValue({
    ...today,
    cards: [
      {
        ...today.cards[1],
        hour: 7,
        // Day 5 of 5.
        pills: [pill('p1', 'Azithromycin 500', { startDate: '2026-10-22' })],
      },
      { ...today.cards[4], status: 'taken', statusAt: at(26, 21, 3) },
    ],
  });
  await renderApp();
  expect(await screen.findByText('All done for today')).toBeTruthy();
  expect(screen.getByText('Tomorrow, 9:00 PM')).toBeTruthy();
});

test('when nothing rings tomorrow it names the day it next does', async () => {
  clockAt(22, 0);
  jest.mocked(alarms.getToday).mockResolvedValue({
    ...today,
    cards: [
      { ...today.cards[2], statusAt: at(28, 9, 0) },
      {
        ...today.cards[4],
        status: 'taken',
        statusAt: at(26, 21, 3),
        pills: [pill('p2', 'Telma 40', { startDate: '2026-10-22' })],
      },
    ],
  });
  await renderApp();
  expect(await screen.findByText('All done for today')).toBeTruthy();
  expect(screen.getByText('Wed 28 Oct, 9:00 AM')).toBeTruthy();
});

test('a 0:30 dose seen at 23:00 is tonight, not all done', async () => {
  clockAt(23, 0);
  jest.mocked(alarms.getToday).mockResolvedValue({
    ...today,
    cards: [
      {
        ...today.cards[1],
        hour: 0,
        minute: 30,
        statusAt: at(26, 0, 32),
        pills: [pill('p1', 'Azithromycin 500')],
      },
      { ...today.cards[4], status: 'taken', statusAt: at(26, 21, 3) },
    ],
  });
  await renderApp();
  expect(await screen.findByText('Next dose')).toBeTruthy();
  expect(screen.getByText('Tonight')).toBeTruthy();
  expect(screen.getByText('12:30 AM')).toBeTruthy();
  expect(screen.getByText('in 1 hr 30 min')).toBeTruthy();
  // Its pill, as it is tomorrow: day 2 of 5.
  expect(screen.getByRole('button', { name: /Azithromycin 500/ })).toBeTruthy();
  expect(screen.getByText('1 tablet · day 2 of 5')).toBeTruthy();
  expect(screen.queryByText('All done for today')).toBeNull();
  expect(screen.queryByText(/^Tomorrow/)).toBeNull();
});

test('with a dose missed and nothing to come, it is not all done', async () => {
  jest.mocked(alarms.getToday).mockResolvedValue({
    ...today,
    cards: [today.cards[1], today.cards[3]],
  });
  await renderApp();
  expect(await screen.findByText('Nothing more today')).toBeTruthy();
  expect(screen.getByText('Tomorrow, 8:00 AM')).toBeTruthy();
  expect(screen.queryByText('All done for today')).toBeNull();
  expect(screen.getByRole('button', { name: 'I took it' })).toBeTruthy();
});

test('empty Today offers Add a pill and Show my code', async () => {
  jest.mocked(alarms.getToday).mockResolvedValue(emptyToday);
  await renderApp();
  expect(await screen.findByText('No pills yet')).toBeTruthy();
  expect(
    screen.getByText(
      'Add your first medicine. Or your son or daughter can add them from their own phone.',
    ),
  ).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Add a pill' }));
  expect(await screen.findByPlaceholderText('Medicine name')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Close'));
  await fireEvent.press(
    await screen.findByRole('button', { name: 'Show my code' }),
  );
  await waitFor(() => expect(family.createLinkCode).toHaveBeenCalled());
  expect(headerTitles()).toHaveLength(2);
});

test('the greeting follows the clock', async () => {
  clockAt(14, 10);
  await renderApp();
  await screen.findByText('8:00 AM · both taken');
  expect(headerTitles()[0]).toBe('Good afternoon');
  expect(screen.getByText('Mon 26 Oct')).toBeTruthy();
});

test('a 60-character pill name wraps and keeps I took it', async () => {
  const long = 'Telmisartan 40 mg with Hydrochlorothiazide 12.5 mg (Telma-H)';
  expect(long).toHaveLength(60);
  jest.mocked(alarms.getToday).mockResolvedValue({
    ...today,
    cards: [{ ...today.cards[3], pills: [pill('p5', long)] }],
  });
  await renderApp();
  expect((await screen.findByText(long)).props.numberOfLines).toBeUndefined();
  expect(screen.getByRole('button', { name: 'I took it' })).toBeTruthy();
});

test('Today scrolls', async () => {
  await renderApp();
  await screen.findByText('8:00 AM · both taken');
  const scroll = screen.getByTestId('today-scroll');
  expect(scroll.type).toBe('RCTScrollView');
  // The tall sky scrolls away too, so large text can't push the doses off the screen.
  expect(within(scroll).getByTestId('sky-title')).toBeTruthy();
  expect(within(scroll).getByText('Next dose')).toBeTruthy();
  expect(
    within(scroll).getByRole('button', { name: 'I took it' }),
  ).toBeTruthy();
});

describe('as the clock moves on', () => {
  const ringing: Today = {
    ...today,
    cards: [
      ...today.cards.slice(0, 4),
      { ...today.cards[4], status: 'ringing', statusAt: null },
    ],
  };
  const minute = () => act(async () => jest.advanceTimersByTime(60_000));
  const reads = () => jest.mocked(alarms.getToday).mock.calls.length;

  test('once the next dose is due, Today reads the day again', async () => {
    clockAt(20, 59);
    await renderApp();
    expect(await screen.findByText('in 1 min')).toBeTruthy();
    const before = reads();
    jest.mocked(alarms.getToday).mockResolvedValue(ringing);
    await minute();
    expect(await screen.findByText('Ringing now')).toBeTruthy();
    expect(reads()).toBe(before + 1);
    expect(screen.queryByText(/23 hr/)).toBeNull();
  });

  test('a dose not yet ringing at its time says now, and is read again once', async () => {
    clockAt(20, 59);
    await renderApp();
    expect(await screen.findByText('in 1 min')).toBeTruthy();
    const before = reads();
    await minute();
    expect(await screen.findByText('now')).toBeTruthy();
    expect(reads()).toBe(before + 1);
    await minute();
    expect(screen.getByText('now')).toBeTruthy();
    expect(reads()).toBe(before + 1);
    expect(screen.queryByText(/23 hr/)).toBeNull();
  });

  test('at midnight Today turns to the new day', async () => {
    clockAt(23, 59);
    jest.mocked(alarms.getToday).mockResolvedValue({
      ...today,
      cards: [
        today.cards[1],
        { ...today.cards[4], status: 'taken', statusAt: at(26, 21, 3) },
      ],
    });
    await renderApp();
    expect(await screen.findByText('Mon 26 Oct')).toBeTruthy();
    jest.mocked(alarms.getToday).mockResolvedValue({
      ...today,
      date: '2026-10-27',
      cards: [
        { ...today.cards[1], status: 'upcoming', statusAt: null },
        { ...today.cards[4], status: 'upcoming', statusAt: null },
      ],
    });
    await minute();
    expect(await screen.findByText('Tue 27 Oct')).toBeTruthy();
    expect(screen.getByText('in 8 hr')).toBeTruthy();
    expect(screen.queryByText('All done for today')).toBeNull();
    // The rest of the new day.
    expect(screen.getByText('Later today')).toBeTruthy();
    expect(screen.queryByText('Other days')).toBeNull();
  });
});

describe('when a side call fails', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  test('getHealth rejecting still shows the cards and no warning', async () => {
    jest.mocked(alarms.getHealth).mockRejectedValue(new Error('boom'));
    await renderApp();
    expect(await screen.findByText('Vitamin D3')).toBeTruthy();
    expect(screen.queryByText('Alarms may not ring')).toBeNull();
  });

  test('a failed app-open reconcile still reads the day again', async () => {
    await renderApp();
    expect(await screen.findByText('Vitamin D3')).toBeTruthy();
    const reads = jest.mocked(alarms.getToday).mock.calls.length;
    jest.mocked(alarms.reconcileOnAppOpen).mockRejectedValue(new Error('x'));
    await act(() => reconcileAppOpen());
    expect(jest.mocked(alarms.getToday).mock.calls.length).toBe(reads + 1);
    expect(screen.getByText('Vitamin D3')).toBeTruthy();
  });

  test('listSounds rejecting still shows the cards', async () => {
    jest.mocked(sounds.listSounds).mockRejectedValue(new Error('x'));
    await renderApp();
    expect(await screen.findByText('Vitamin D3')).toBeTruthy();
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
    expect(screen.getByText('Delete this pill')).toBeTruthy();
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

  /** Her card on Today, for looking inside it. */
  const herCard = () => screen.getByTestId('person-card');

  test('Today shows her card above my pills, with tally, bars and low line', async () => {
    jest.mocked(family.getFamily).mockResolvedValue([amma]);
    jest.mocked(family.refreshFamily).mockResolvedValue([amma]);
    await renderApp('Today');
    expect(await screen.findByText('Amma')).toBeTruthy();
    expect(screen.getByText('2 taken · 1 missed · 1 later')).toBeTruthy();
    expect(screen.getByText('Telma 40: 4 tablets left')).toBeTruthy();
    // Two taken, one missed, one later.
    expect(within(herCard()).getAllByTestId('dose-bar')).toHaveLength(4);
    // No number saved, so no Call; + Add family is on the Family tab now.
    expect(screen.queryByRole('button', { name: 'Call' })).toBeNull();
    expect(screen.queryByText('+ Add family')).toBeNull();
    // Above my own pills, under their own label.
    const texts = screen
      .getAllByText(/^Amma$|^My pills$|^Telma 40$/)
      .map(n => n.props.children);
    expect(texts.slice(0, 3)).toEqual(['Amma', 'My pills', 'Telma 40']);
    await fireEvent.press(screen.getByText('Amma'));
    await waitFor(() =>
      expect(headerTitles()).toEqual([expect.any(String), 'Amma']),
    );
  });

  test('her missed dose is a line that opens her page', async () => {
    jest.mocked(family.getFamily).mockResolvedValue([amma]);
    jest.mocked(family.refreshFamily).mockResolvedValue([amma]);
    await renderApp('Today');
    await fireEvent.press(
      await screen.findByRole('button', { name: '1 missed today' }),
    );
    await waitFor(() =>
      expect(headerTitles()).toEqual([expect.any(String), 'Amma']),
    );
  });

  test('nothing missed, no missed line', async () => {
    const fine = {
      ...amma,
      tally: { taken: 2, skipped: 0, missed: 0, notReported: 0, later: 1 },
    };
    jest.mocked(family.getFamily).mockResolvedValue([fine]);
    jest.mocked(family.refreshFamily).mockResolvedValue([fine]);
    await renderApp('Today');
    expect(await screen.findByText('2 taken · 1 later')).toBeTruthy();
    expect(screen.queryByText(/missed today/)).toBeNull();
  });

  // E5 offers Show my code here; + Add family is on the Family tab.
  test('Today with no pills and no family shows the empty card, and no family block', async () => {
    jest.mocked(alarms.getToday).mockResolvedValue(emptyToday);
    await renderApp('Today');
    expect(await screen.findByText('No pills yet')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add a pill' })).toBeTruthy();
    // Only the tab's word.
    expect(screen.getAllByText('Family')).toHaveLength(1);
    expect(screen.queryByText('+ Add family')).toBeNull();
    expect(screen.queryByText('My pills')).toBeNull();
  });

  test('with family and no pills of its own, it says so and offers Add a pill', async () => {
    jest.mocked(family.getFamily).mockResolvedValue([amma]);
    jest.mocked(family.refreshFamily).mockResolvedValue([amma]);
    jest.mocked(alarms.getToday).mockResolvedValue(emptyToday);
    await renderApp('Today');
    expect(
      await screen.findByText('You have no pills of your own.'),
    ).toBeTruthy();
    expect(screen.getByText('My pills')).toBeTruthy();
    // Not her empty card: Show my code is for an elder's phone.
    expect(screen.queryByText('No pills yet')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Show my code' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Add a pill' }));
    expect(await screen.findByPlaceholderText('Medicine name')).toBeTruthy();
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

  test('with family and no pills of its own, Today still shows the health warning', async () => {
    jest.mocked(family.getFamily).mockResolvedValue([amma]);
    jest.mocked(family.refreshFamily).mockResolvedValue([amma]);
    jest.mocked(alarms.getToday).mockResolvedValue(emptyToday);
    jest
      .mocked(alarms.getHealth)
      .mockResolvedValue({ ...healthy, exactAlarmAllowed: false });
    await renderApp('Today');
    expect(await screen.findByText('Amma')).toBeTruthy();
    expect(await screen.findByText('Alarms may not ring')).toBeTruthy();
    expect(
      screen.getByText(
        "PillSaathi isn't allowed to set alarms. Tap to allow it.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText('No pills yet')).toBeNull();
  });

  test('Today refreshes family every 2 minutes while focused', async () => {
    jest.useFakeTimers();
    jest.mocked(family.getFamily).mockResolvedValue([amma]);
    jest.mocked(family.refreshFamily).mockResolvedValue([amma]);
    await renderApp('Today');
    await waitFor(() => expect(family.refreshFamily).toHaveBeenCalledTimes(1));
    await act(async () => jest.advanceTimersByTime(119_000));
    expect(family.refreshFamily).toHaveBeenCalledTimes(1);
    const setupReads = jest.mocked(family.getElderSetup).mock.calls.length;
    await act(async () => jest.advanceTimersByTime(1_000));
    expect(family.refreshFamily).toHaveBeenCalledTimes(2);
    // Her alarm problem is read again with her card.
    expect(jest.mocked(family.getElderSetup).mock.calls.length).toBeGreaterThan(
      setupReads,
    );
  });

  test('before her phone has ever uploaded, the card says so instead of a tally', async () => {
    const waiting = {
      ...amma,
      heardAt: null,
      refills: [],
      tally: { taken: 0, skipped: 0, missed: 0, notReported: 0, later: 0 },
    };
    jest.mocked(family.getFamily).mockResolvedValue([waiting]);
    jest.mocked(family.refreshFamily).mockResolvedValue([waiting]);
    await renderApp('Today');
    expect(
      await screen.findByText("Not heard from Amma's phone yet"),
    ).toBeTruthy();
    expect(screen.queryByText('Nothing due today')).toBeNull();
  });

  test('her alarm problem shows on her card first', async () => {
    const silent = { ...amma, silent: true };
    jest.mocked(family.getFamily).mockResolvedValue([silent]);
    jest.mocked(family.refreshFamily).mockResolvedValue([silent]);
    jest.mocked(family.getElderSetup).mockResolvedValue({
      ...(familyDefaults.getElderSetup as ElderSetup),
      problem: 'battery',
    });
    await renderApp('Today');
    const problem =
      "Amma's phone may not ring alarms: battery setup not done. On her phone, open PillSaathi and tap Fix now.";
    expect(await screen.findByText(problem)).toBeTruthy();
    expect(family.getElderSetup).toHaveBeenCalledWith('E');
    // Then her pills running low, then when she was last heard from.
    const lines = within(herCard())
      .getAllByText(/may not ring|tablets left|Not heard from/)
      .map(n => n.props.children);
    expect(lines).toEqual([
      problem,
      'Telma 40: 4 tablets left',
      'Not heard from since Mon 26 Oct, 1:12 PM',
    ]);
  });

  test('a failed setup read shows the card without a problem line', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.mocked(family.getFamily).mockResolvedValue([amma]);
    jest.mocked(family.refreshFamily).mockResolvedValue([amma]);
    jest
      .mocked(family.getElderSetup)
      .mockRejectedValue(Object.assign(new Error('x'), { code: 'NOT_FOUND' }));
    await renderApp('Today');
    expect(
      await screen.findByText('2 taken · 1 missed · 1 later'),
    ).toBeTruthy();
    expect(screen.getByText('Amma')).toBeTruthy();
    expect(screen.getByText('Telma 40: 4 tablets left')).toBeTruthy();
    expect(screen.queryByText(/may not ring/)).toBeNull();
  });

  test('Call dials her number', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const withPhone = { ...amma, phone: '+919800000000' };
    jest.mocked(family.getFamily).mockResolvedValue([withPhone]);
    jest.mocked(family.refreshFamily).mockResolvedValue([withPhone]);
    await renderApp('Today');
    await fireEvent.press(await screen.findByRole('button', { name: 'Call' }));
    expect(open).toHaveBeenCalledWith('tel:+919800000000');
    // Calling her doesn't open her page.
    expect(headerTitles()).toHaveLength(1);
  });

  test("the greeting uses the relative's first name", async () => {
    clockAt(14, 10);
    jest
      .mocked(family.signedInRelative)
      .mockResolvedValue({ name: 'Ravi Kumar', email: 'ravi@gmail.com' });
    jest.mocked(family.getFamily).mockResolvedValue([amma]);
    jest.mocked(family.refreshFamily).mockResolvedValue([amma]);
    await renderApp('Today');
    await screen.findByText('Amma');
    await waitFor(() => expect(headerTitles()[0]).toBe('Good afternoon, Ravi'));
  });

  test('logged in but looking after no one, the greeting has no name', async () => {
    clockAt(14, 10);
    jest
      .mocked(family.signedInRelative)
      .mockResolvedValue({ name: 'Ravi Kumar', email: 'ravi@gmail.com' });
    await renderApp('Today');
    await screen.findByText('8:00 AM · both taken');
    await waitFor(() => expect(family.signedInRelative).toHaveBeenCalled());
    expect(headerTitles()[0]).toBe('Good afternoon');
  });

  test('a long elder name wraps and keeps Call', async () => {
    const long = 'Amma (Kochi), Saraswathi Kunjamma, Thrippunithura';
    const named = { ...amma, name: long, phone: '+919800000000' };
    jest.mocked(family.getFamily).mockResolvedValue([named]);
    jest.mocked(family.refreshFamily).mockResolvedValue([named]);
    await renderApp('Today');
    expect((await screen.findByText(long)).props.numberOfLines).toBeUndefined();
    expect(
      within(herCard()).getByRole('button', { name: 'Call' }),
    ).toBeTruthy();
  });
});
