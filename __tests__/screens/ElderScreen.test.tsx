import { Linking } from 'react-native';
import {
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
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
  expect(screen.queryByLabelText('Call')).toBeNull();
});

test('Call dials her number', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  const withPhone = { ...amma, phone: '+919800000000' };
  jest.mocked(family.getFamily).mockResolvedValue([withPhone]);
  jest.mocked(family.refreshFamily).mockResolvedValue([withPhone]);
  await renderApp('Elder', { elderId: 'E' });
  await fireEvent.press(await screen.findByLabelText('Call'));
  expect(open).toHaveBeenCalledWith('tel:+919800000000');
});

test('Her pills opens her pills page', async () => {
  jest.mocked(family.getFamily).mockResolvedValue([amma]);
  jest.mocked(family.refreshFamily).mockResolvedValue([amma]);
  jest.mocked(family.getElderToday).mockResolvedValue(herToday);
  await renderApp('Elder', { elderId: 'E' });
  await fireEvent.press(await screen.findByText('Her pills'));
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
      "Amma's phone may not ring alarms: notifications are off. On her phone, open PillSaathi and tap Fix now.",
    ),
  ).toBeTruthy();
});

test("her page's gear opens the alert settings", async () => {
  await renderApp('Elder', { elderId: 'E' });
  await waitFor(() => expect(headerTitles()).toEqual(['Amma']));
  await fireEvent.press(screen.getByRole('button', { name: 'Edit' }));
  expect(
    (await screen.findByLabelText('What do you call them?')).props.value,
  ).toBe('Amma');
  expect(screen.getByText('Tell me if a dose is missed')).toBeTruthy();
  expect(screen.getByText('Stop following')).toBeTruthy();
});

test('her day is one line per dose, with what happened', async () => {
  jest.mocked(family.getElderToday).mockResolvedValue({
    ...herToday,
    cards: [
      {
        ...herToday.cards[0],
        status: 'taken',
        statusAt: at(28, 8, 4),
        pills: [
          herToday.cards[0].pills[0],
          { ...herToday.cards[0].pills[0], pillId: 'p3', name: 'Telma 40' },
        ],
      },
      { ...herToday.cards[1], hour: 21, status: 'upcoming' },
    ],
  });
  await renderApp('Elder', { elderId: 'E' });
  expect(await screen.findByText('✓ 8:04 AM')).toBeTruthy();
  expect(screen.getByText('Azee 500, Telma 40')).toBeTruthy();
  expect(screen.getByText('8:00 AM')).toBeTruthy();
  expect(screen.getByText('9:00 PM')).toBeTruthy();
  expect(screen.getByText('Later')).toBeTruthy();
});

// Review Focus: a long name at font scale 2.0 makes the sky band tall. It scrolls away with the
// page, so her day and the ways into her pills and History can still be reached.
test('a 40-character name scrolls away with the page', async () => {
  const long = { ...amma, name: 'Lakshmi Kutty Amma, Thekkekara, Kottayam' };
  expect(long.name).toHaveLength(40);
  jest.mocked(family.getFamily).mockResolvedValue([long]);
  jest.mocked(family.refreshFamily).mockResolvedValue([long]);
  await renderApp('Elder', { elderId: 'E' });
  await waitFor(() => expect(headerTitles()).toEqual([long.name]));
  const page = screen.getByTestId('elder-page');
  expect(page.type).toBe('RCTScrollView');
  expect(within(page).getByTestId('sky-title')).toHaveTextContent(long.name);
  expect(within(page).getByText('Missed')).toBeTruthy();
  expect(within(page).getByRole('button', { name: 'Her pills' })).toBeTruthy();
  expect(within(page).getByRole('button', { name: 'History' })).toBeTruthy();
});

test('two pills of the same name running low are both shown', async () => {
  const error = jest.spyOn(console, 'error');
  const iron = { ...herToday.refills[0], name: 'Iron' };
  jest.mocked(family.getElderToday).mockResolvedValue({
    ...herToday,
    refills: [iron, { ...iron, pillId: 'p9' }],
  });
  await renderApp('Elder', { elderId: 'E' });
  expect(await screen.findAllByText('Iron: 4 tablets left')).toHaveLength(2);
  const said = error.mock.calls.map(args => args.join(' '));
  expect(said.filter(line => line.includes('same key'))).toEqual([]);
});
