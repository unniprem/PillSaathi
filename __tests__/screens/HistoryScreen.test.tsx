import { Alert, AppState, Share } from 'react-native';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import * as alarms from '../../src/native/alarms';
import type { History, HistoryDose } from '../../src/native/alarms';
import * as family from '../../src/native/family';
import * as sounds from '../../src/native/sounds';
import { colors } from '../../src/theme';
import { mockAlarmsDefaults, mockFamilyDefaults } from '../helpers/nativeMocks';
import { headerTitles, renderApp } from '../helpers/renderApp';

jest.mock('../../src/native/alarms');
jest.mock('../../src/native/sounds');

function dose(
  date: string,
  hour: number,
  outcome: HistoryDose['outcome'],
): HistoryDose {
  return {
    date,
    hour,
    minute: 0,
    outcome,
    at: 0,
    marked: false,
    pills: [
      {
        pillId: 'p1',
        name: 'Telma 40',
        form: 'tablet',
        amount: 1,
        exists: true,
        photoUri: null,
      },
    ],
  };
}

const october: History = {
  today: '2026-10-26',
  oldest: '2026-10-06',
  firstDayOfWeek: 0,
  doses: [
    dose('2026-10-06', 8, 'taken'),
    dose('2026-10-06', 21, 'missed'),
    dose('2026-10-07', 8, 'taken'),
    dose('2026-10-07', 21, 'taken'),
    dose('2026-10-08', 8, 'missed'),
  ],
};

const isDisabled = (label: string) =>
  screen.getByLabelText(label).props.accessibilityState?.disabled === true;

beforeEach(() => {
  jest.clearAllMocks();
  mockAlarmsDefaults();
  jest.mocked(sounds.listSounds).mockResolvedValue([]);
});

afterEach(() => {
  jest.restoreAllMocks();
});

it('shows the month, its share taken and each day’s colour', async () => {
  jest.mocked(alarms.getHistory).mockResolvedValue(october);
  await renderApp('History');
  expect(await screen.findByText('60% taken')).toBeTruthy();
  expect(screen.getByText('3 of 5 doses since 6 Oct')).toBeTruthy();
  expect(screen.getByText('Oct 2026')).toBeTruthy();
  expect(screen.getByLabelText('Tue 6 Oct: Some not taken')).toHaveStyle({
    borderColor: colors.amber,
  });
  expect(screen.getByLabelText('Wed 7 Oct: All taken')).toHaveStyle({
    backgroundColor: colors.green,
  });
  expect(screen.getByLabelText('Thu 8 Oct: None taken')).toHaveStyle({
    backgroundColor: colors.coral,
  });
  expect(screen.getByLabelText('Fri 9 Oct')).toBeTruthy();
  expect(screen.getByText('All taken')).toBeTruthy();
  expect(screen.getByText('Some missed')).toBeTruthy();
  expect(screen.getByText('None')).toBeTruthy();
  expect(headerTitles()).toEqual(['History']);
});

it('the month card shows the percent and the dose count', async () => {
  jest.mocked(alarms.getHistory).mockResolvedValue({
    ...october,
    // Records began on the 18th; the count says since when, whatever the order.
    doses: [
      dose('2026-10-20', 8, 'missed'),
      dose('2026-10-18', 8, 'taken'),
      dose('2026-10-19', 8, 'taken'),
    ],
  });
  await renderApp('History');
  expect(await screen.findByText('66% taken')).toBeTruthy();
  expect(screen.getByText('OCT')).toBeTruthy();
  expect(screen.getByTestId('month-bar')).toHaveStyle({ width: '66%' });
  expect(screen.getByText('2 of 3 doses since 18 Oct')).toBeTruthy();
});

it('days are coloured by what happened', async () => {
  jest.mocked(alarms.getHistory).mockResolvedValue({
    ...october,
    doses: [...october.doses, dose('2026-10-26', 8, 'taken')],
  });
  await renderApp('History');
  await screen.findByText('66% taken');
  const day = (label: string) => screen.getByLabelText(label);
  const number = (label: string) =>
    within(day(label)).getByText(label.split(' ')[1]);
  // Every dose taken is green, none is coral, both with white numbers.
  expect(day('Wed 7 Oct: All taken')).toHaveStyle({
    backgroundColor: colors.green,
  });
  expect(number('Wed 7 Oct: All taken')).toHaveStyle({ color: colors.onFill });
  expect(day('Thu 8 Oct: None taken')).toHaveStyle({
    backgroundColor: colors.coral,
  });
  expect(number('Thu 8 Oct: None taken')).toHaveStyle({ color: colors.onFill });
  // Some missed is an orange ring on cream.
  expect(day('Tue 6 Oct: Some not taken')).toHaveStyle({
    backgroundColor: colors.amberTint,
    borderColor: colors.amber,
  });
  expect(number('Tue 6 Oct: Some not taken')).toHaveStyle({
    color: colors.navy,
  });
  // Today keeps its colour, with a navy ring.
  expect(day('Mon 26 Oct: All taken')).toHaveStyle({
    backgroundColor: colors.green,
    borderColor: colors.navy,
  });
  // A day with nothing recorded is plain and still opens; a day to come doesn't.
  expect(number('Fri 9 Oct')).toHaveStyle({ color: colors.muted });
  expect(isDisabled('Fri 9 Oct')).toBe(false);
  expect(isDisabled('Tue 27 Oct')).toBe(true);
});

it('moves between months within the kept records', async () => {
  jest.mocked(alarms.getHistory).mockImplementation(async from => ({
    ...october,
    oldest: '2026-09-10',
    doses: from.startsWith('2026-10') ? october.doses : [],
  }));
  await renderApp('History');
  expect(await screen.findByText('Oct 2026')).toBeTruthy();
  expect(isDisabled('Next month')).toBe(true);
  expect(isDisabled('Previous month')).toBe(false);

  await fireEvent.press(screen.getByLabelText('Previous month'));
  expect(await screen.findByText('Sep 2026')).toBeTruthy();
  expect(alarms.getHistory).toHaveBeenLastCalledWith(
    '2026-09-01',
    '2026-09-30',
  );
  expect(screen.getByText('No doses recorded')).toBeTruthy();
  expect(isDisabled('Previous month')).toBe(true);
  expect(isDisabled('Next month')).toBe(false);

  await fireEvent.press(screen.getByLabelText('Next month'));
  expect(await screen.findByText('Oct 2026')).toBeTruthy();
  expect(alarms.getHistory).toHaveBeenLastCalledWith(
    '2026-10-01',
    '2026-10-31',
  );
});

it('stays on this month with no records', async () => {
  await renderApp('History');
  expect(await screen.findByText('No doses recorded')).toBeTruthy();
  expect(screen.getByText('Oct 2026')).toBeTruthy();
  expect(isDisabled('Previous month')).toBe(true);
  expect(isDisabled('Next month')).toBe(true);
});

it.each([
  [1, ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']],
  [0, ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']],
])(
  'starts the week on the phone’s first day (%i)',
  async (firstDayOfWeek, header) => {
    jest
      .mocked(alarms.getHistory)
      .mockResolvedValue({ ...october, firstDayOfWeek });
    await renderApp('History');
    await screen.findByText('60% taken');
    expect(
      screen
        .getAllByText(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/)
        .map(n => n.props.children),
    ).toEqual(header);
  },
);

it('opens a past day and not a future one', async () => {
  // As native does: only the doses from `from` through `to`.
  jest.mocked(alarms.getHistory).mockImplementation(async (from, to) => ({
    ...october,
    doses: october.doses.filter(d => d.date >= from && d.date <= to),
  }));
  await renderApp('History');
  await screen.findByText('60% taken');
  await fireEvent.press(screen.getByLabelText('Tue 27 Oct'));
  expect(headerTitles()).toEqual(['History']);
  await fireEvent.press(screen.getByLabelText('Tue 6 Oct: Some not taken'));
  await waitFor(() => expect(headerTitles()).toEqual(['History', 'Tue 6 Oct']));
});

it('shares the month as text', async () => {
  const share = jest
    .spyOn(Share, 'share')
    .mockResolvedValue({ action: Share.sharedAction, activityType: undefined });
  jest.mocked(alarms.getHistory).mockResolvedValue(october);
  await renderApp('History');
  await screen.findByText('60% taken');
  await fireEvent.press(screen.getByLabelText('Share'));
  await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
  const { message } = share.mock.calls[0][0] as { message: string };
  expect(message.startsWith('PillSaathi · 1–26 Oct 2026\n')).toBe(true);
  expect(message).toContain('Taken 3 of 5 doses (60%)');
  expect(alarms.listPills).toHaveBeenCalled();
});

it('says so when the report cannot be shared', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(Share, 'share').mockRejectedValue(new Error('no sheet'));
  await renderApp('History');
  await screen.findByText('No doses recorded');
  await fireEvent.press(screen.getByLabelText('Share'));
  await waitFor(() =>
    expect(alert).toHaveBeenCalledWith(
      'Could not share the report',
      'Please try again.',
    ),
  );
});

it('says so when the history cannot be read', async () => {
  jest.mocked(alarms.getHistory).mockRejectedValue(new Error('disk'));
  await renderApp('History');
  expect(await screen.findByText("Couldn't load the history.")).toBeTruthy();
});

it('shows History in Malayalam', async () => {
  jest.mocked(alarms.currentLanguage).mockReturnValue('ml');
  await renderApp('History');
  await waitFor(() => expect(headerTitles()).toEqual(['ചരിത്രം']));
});

// Left open on History, the app misses a dose (or reconcile records one) before Share is tapped.
const withEveningMissed: History = {
  ...october,
  doses: [...october.doses, dose('2026-10-26', 21, 'missed')],
};

it('shares what is recorded now, not what was loaded', async () => {
  const share = jest
    .spyOn(Share, 'share')
    .mockResolvedValue({ action: Share.sharedAction, activityType: undefined });
  jest.mocked(alarms.getHistory).mockResolvedValue(october);
  await renderApp('History');
  await screen.findByText('60% taken');
  jest.mocked(alarms.getHistory).mockResolvedValue(withEveningMissed);
  await fireEvent.press(screen.getByLabelText('Share'));
  await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
  const { message } = share.mock.calls[0][0] as { message: string };
  expect(message).toContain('Taken 3 of 6 doses (50%)');
  expect(message).toContain('• Mon 26 Oct, 9:00 PM: missed (Telma 40)');
  expect(await screen.findByText('50% taken')).toBeTruthy();
});

it('reloads the month when the app comes back', async () => {
  const listeners: ((state: string) => void)[] = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, cb) => {
    listeners.push(cb as (state: string) => void);
    return { remove: jest.fn() } as never;
  });
  jest.mocked(alarms.getHistory).mockResolvedValue(october);
  await renderApp('History');
  await screen.findByText('60% taken');
  jest.mocked(alarms.getHistory).mockResolvedValue(withEveningMissed);
  await act(async () => listeners.forEach(l => l('active')));
  expect(await screen.findByText('50% taken')).toBeTruthy();
  expect(screen.getByLabelText('Mon 26 Oct: None taken')).toBeTruthy();
});

it('History for an elder reads her history and hides I took it', async () => {
  mockFamilyDefaults();
  jest.mocked(family.getElderHistory).mockResolvedValue(october);
  jest
    .mocked(family.listFollows)
    .mockResolvedValue([
      { elderId: 'E', name: 'Amma', phone: null, delayMinutes: 30 },
    ]);
  await renderApp('ElderHistory', { elderId: 'E' });
  expect(await screen.findByText('60% taken')).toBeTruthy();
  expect(family.getElderHistory).toHaveBeenCalledWith(
    'E',
    '2026-10-01',
    '2026-10-31',
  );
  expect(alarms.getHistory).not.toHaveBeenCalled();
  await waitFor(() => expect(headerTitles()).toEqual(['Amma · History']));

  // Her day page reads her history too, and offers no I took it.
  await fireEvent.press(screen.getByLabelText(/^Tue 6 Oct/));
  expect((await screen.findAllByText('Missed')).length).toBeGreaterThan(0);
  expect(family.getElderHistory).toHaveBeenCalledWith(
    'E',
    '2026-10-06',
    '2026-10-06',
  );
  expect(screen.queryByText('I took it')).toBeNull();
});
