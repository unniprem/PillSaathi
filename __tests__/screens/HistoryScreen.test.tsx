import { Alert, Share } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as alarms from '../../src/native/alarms';
import type { History, HistoryDose } from '../../src/native/alarms';
import * as sounds from '../../src/native/sounds';
import { colors } from '../../src/theme';
import { mockAlarmsDefaults } from '../helpers/nativeMocks';
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
  expect(screen.getByText('3 of 5 doses')).toBeTruthy();
  expect(screen.getByText('Oct 2026')).toBeTruthy();
  expect(screen.getByLabelText('Tue 6 Oct: Some not taken')).toHaveStyle({
    backgroundColor: colors.warning,
  });
  expect(screen.getByLabelText('Wed 7 Oct: All taken')).toHaveStyle({
    backgroundColor: colors.success,
  });
  expect(screen.getByLabelText('Thu 8 Oct: None taken')).toHaveStyle({
    backgroundColor: colors.danger,
  });
  expect(screen.getByLabelText('Fri 9 Oct')).toBeTruthy();
  expect(screen.getByText('All taken')).toBeTruthy();
  expect(screen.getByText('Some not taken')).toBeTruthy();
  expect(screen.getByText('None taken')).toBeTruthy();
  expect(headerTitles()).toEqual(['History']);
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
  jest.mocked(alarms.getHistory).mockResolvedValue(october);
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
  await fireEvent.press(screen.getByText('Share'));
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
  await fireEvent.press(screen.getByText('Share'));
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
