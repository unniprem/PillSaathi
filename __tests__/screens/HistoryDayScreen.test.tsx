import { Alert } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as alarms from '../../src/native/alarms';
import type {
  History,
  HistoryDose,
  HistoryPill,
} from '../../src/native/alarms';
import * as sounds from '../../src/native/sounds';
import { mockAlarmsDefaults } from '../helpers/nativeMocks';
import { headerTitles, renderApp } from '../helpers/renderApp';

jest.mock('../../src/native/alarms');
jest.mock('../../src/native/sounds');

const at = (d: number, h: number, m: number) =>
  new Date(2026, 9, d, h, m).getTime();

const telma: HistoryPill = {
  pillId: 'p1',
  name: 'Telma 40',
  form: 'tablet',
  amount: 1,
  exists: true,
  photoUri: 'file:///photos/p1.jpg',
};

function dose(
  hour: number,
  outcome: HistoryDose['outcome'],
  more: Partial<HistoryDose> = {},
): HistoryDose {
  return {
    date: '2026-10-06',
    hour,
    minute: 0,
    outcome,
    at: at(6, hour, 3),
    marked: false,
    pills: [telma],
    ...more,
  };
}

function history(doses: HistoryDose[]): History {
  return {
    today: '2026-10-26',
    oldest: '2026-10-01',
    firstDayOfWeek: 0,
    doses,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAlarmsDefaults();
  jest.mocked(sounds.listSounds).mockResolvedValue([]);
});

afterEach(() => {
  jest.restoreAllMocks();
});

it('lists the day’s doses with their pills as they were', async () => {
  jest
    .mocked(alarms.getHistory)
    .mockResolvedValue(history([dose(8, 'taken'), dose(21, 'missed')]));
  await renderApp('HistoryDay', { date: '2026-10-06' });
  expect(await screen.findByText('✓ Taken 8:03 AM')).toBeTruthy();
  expect(alarms.getHistory).toHaveBeenCalledWith('2026-10-06', '2026-10-06');
  expect(headerTitles()).toEqual(['Tue 6 Oct']);
  expect(screen.getByText('8:00 AM')).toBeTruthy();
  expect(screen.getByText('9:00 PM')).toBeTruthy();
  expect(screen.getByText('Missed')).toBeTruthy();
  expect(screen.getAllByText('Telma 40')).toHaveLength(2);
  expect(screen.getAllByText('1 tablet')).toHaveLength(2);
  expect(screen.getAllByTestId('pill-photo-p1')).toHaveLength(2);
  // Only the missed dose can be marked, and the pill rows open nothing.
  expect(screen.getAllByRole('button', { name: 'Mark as taken' })).toHaveLength(
    1,
  );
  expect(screen.queryAllByRole('button', { name: /Telma 40/ })).toHaveLength(0);
});

it('shows a pill deleted since from its snapshot', async () => {
  const gone: HistoryPill = {
    pillId: 'gone',
    name: 'Old syrup',
    form: 'syrup',
    amount: 5,
    exists: false,
    photoUri: null,
  };
  jest
    .mocked(alarms.getHistory)
    .mockResolvedValue(history([dose(8, 'skipped', { pills: [gone] })]));
  await renderApp('HistoryDay', { date: '2026-10-06' });
  expect(await screen.findByText('Old syrup')).toBeTruthy();
  expect(screen.getByText('5 ml')).toBeTruthy();
  expect(screen.getByText('Skipped')).toBeTruthy();
  expect(screen.getByTestId('pill-icon-gone').props.children).toBe('🧴');
  expect(screen.queryByTestId('pill-photo-gone')).toBeNull();
});

it('marks an earlier day’s dose taken', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest
    .mocked(alarms.getHistory)
    .mockResolvedValueOnce(history([dose(21, 'missed')]))
    .mockResolvedValue(
      history([dose(21, 'taken', { at: at(26, 10, 15), marked: true })]),
    );
  await renderApp('HistoryDay', { date: '2026-10-06' });
  await fireEvent.press(
    await screen.findByRole('button', { name: 'Mark as taken' }),
  );
  expect(alert).toHaveBeenCalledWith(
    'Mark as taken?',
    '9:00 PM · Telma 40',
    expect.any(Array),
  );
  const buttons = alert.mock.calls[0][2]!;
  await buttons.find(b => b.text === 'Mark as taken')!.onPress!();
  expect(alarms.markDoseTaken).toHaveBeenCalledWith('2026-10-06', 21, 0);
  expect(
    await screen.findByText('✓ Taken (marked 26 Oct, 10:15 AM)'),
  ).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Mark as taken' })).toBeNull();
});

it('says when marking it taken fails', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(alarms.markDoseTaken).mockRejectedValue(new Error('disk'));
  jest
    .mocked(alarms.getHistory)
    .mockResolvedValue(history([dose(21, 'missed')]));
  await renderApp('HistoryDay', { date: '2026-10-06' });
  await fireEvent.press(
    await screen.findByRole('button', { name: 'Mark as taken' }),
  );
  await alert.mock.calls[0][2]!.find(b => b.text === 'Mark as taken')!
    .onPress!();
  await waitFor(() =>
    expect(alert).toHaveBeenLastCalledWith(
      'Could not mark it taken',
      'Please try again.',
    ),
  );
});

it('says when nothing was recorded', async () => {
  await renderApp('HistoryDay', { date: '2026-10-06' });
  expect(
    await screen.findByText('Nothing was recorded on this day.'),
  ).toBeTruthy();
});
