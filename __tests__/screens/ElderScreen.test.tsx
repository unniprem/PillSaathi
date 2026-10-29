import { Linking } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as family from '../../src/native/family';
import type { ElderToday, FamilyCard } from '../../src/native/family';
import * as sounds from '../../src/native/sounds';
import { mockAlarmsDefaults, mockFamilyDefaults } from '../helpers/nativeMocks';
import { headerTitles, renderApp } from '../helpers/renderApp';

jest.mock('../../src/native/alarms');
jest.mock('../../src/native/sounds');

const at = (d: number, h: number, m: number) =>
  new Date(2026, 9, d, h, m).getTime();

const amma: FamilyCard = {
  elderId: 'E',
  name: 'Amma',
  phone: null,
  delayMinutes: 30,
  heardAt: at(28, 13, 12),
  silent: false,
  abandoned: false,
  otherZone: false,
  tally: { taken: 1, skipped: 0, missed: 0, notReported: 1, later: 0 },
  refills: [],
};

const herToday: ElderToday = {
  date: '2026-10-28',
  heardAt: at(28, 13, 12),
  otherZone: false,
  refills: [
    {
      pillId: 'p2',
      name: 'Telma 40',
      form: 'tablet',
      remaining: 4,
      daysLeft: 4,
      level: 'low',
    },
  ],
  cards: [
    {
      alarmId: 't80',
      hour: 8,
      minute: 0,
      soundId: null,
      status: 'missed',
      statusAt: at(28, 8, 10),
      pills: [
        {
          pillId: 'p1',
          name: 'Azee 500',
          form: 'tablet',
          amount: 1,
          startDate: '2026-10-01',
          days: null,
          exists: true,
          fromTomorrow: false,
          photoUri: null,
        },
      ],
    },
    {
      alarmId: 't140',
      hour: 14,
      minute: 0,
      soundId: null,
      status: 'notReported',
      statusAt: null,
      pills: [],
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAlarmsDefaults();
  mockFamilyDefaults();
  jest.mocked(sounds.listSounds).mockResolvedValue([]);
  jest.mocked(family.getFamily).mockResolvedValue([amma]);
  jest.mocked(family.refreshFamily).mockResolvedValue([amma]);
  jest.mocked(family.getElderToday).mockResolvedValue(herToday);
  jest
    .mocked(family.listFollows)
    .mockResolvedValue([
      { elderId: 'E', name: 'Amma', phone: null, delayMinutes: 30 },
    ]);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('the elder page is read-only', async () => {
  await renderApp('Elder', { elderId: 'E' });
  expect(await screen.findByText('Not reported yet')).toBeTruthy();
  await waitFor(() => expect(headerTitles()).toEqual(['Amma']));
  expect(family.getElderToday).toHaveBeenCalledWith('E');
  expect(screen.getByText('Last heard from at 1:12 PM')).toBeTruthy();
  expect(screen.getByText('Azee 500')).toBeTruthy();
  expect(screen.getByText('Missed')).toBeTruthy();
  expect(screen.getByText('Telma 40: 4 tablets left')).toBeTruthy();
  expect(screen.queryByText('+ Add tablets')).toBeNull();
  expect(screen.queryByText(/♪/)).toBeNull();
  expect(screen.queryByRole('button', { name: 'Missed' })).toBeNull();
  expect(screen.queryByText("Times are Amma's time.")).toBeNull();
  await fireEvent.press(screen.getByText('History'));
  await waitFor(() =>
    expect(headerTitles()).toEqual(['Amma', 'Amma · History']),
  );
});

test('her own time zone is named', async () => {
  jest
    .mocked(family.getElderToday)
    .mockResolvedValue({ ...herToday, otherZone: true });
  await renderApp('Elder', { elderId: 'E' });
  expect(await screen.findByText("Times are Amma's time.")).toBeTruthy();
});

test('Call shows only with a number', async () => {
  await renderApp('Elder', { elderId: 'E' });
  expect(await screen.findByText('Not reported yet')).toBeTruthy();
  expect(screen.queryByText('Call')).toBeNull();
});

test('Call dials her number', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  const withPhone = { ...amma, phone: '+919800000000' };
  jest.mocked(family.getFamily).mockResolvedValue([withPhone]);
  jest.mocked(family.refreshFamily).mockResolvedValue([withPhone]);
  await renderApp('Elder', { elderId: 'E' });
  await fireEvent.press(await screen.findByText('Call'));
  expect(open).toHaveBeenCalledWith('tel:+919800000000');
});

test('Change pills opens her pills page', async () => {
  jest.mocked(family.getFamily).mockResolvedValue([amma]);
  jest.mocked(family.refreshFamily).mockResolvedValue([amma]);
  jest.mocked(family.getElderToday).mockResolvedValue(herToday);
  await renderApp('Elder', { elderId: 'E' });
  await fireEvent.press(await screen.findByText('Change pills'));
  await waitFor(() => expect(headerTitles()).toEqual(['Amma', "Amma's pills"]));
});

test('her page warns when her phone may not ring alarms', async () => {
  jest.mocked(family.getFamily).mockResolvedValue([amma]);
  jest.mocked(family.refreshFamily).mockResolvedValue([amma]);
  jest.mocked(family.getElderToday).mockResolvedValue(herToday);
  jest.mocked(family.getElderSetup).mockResolvedValue({
    editor: true,
    otherZone: false,
    heardAt: null,
    pills: [],
    times: [],
    sounds: [],
    problem: 'notifications',
  });
  await renderApp('Elder', { elderId: 'E' });
  expect(
    await screen.findByText(
      "Amma's phone may not ring alarms: notifications are off. On her phone, open PillSaathi and tap the yellow banner.",
    ),
  ).toBeTruthy();
});
