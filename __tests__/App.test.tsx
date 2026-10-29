/**
 * @format
 */

import { Platform } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import App from '../App';
import * as alarms from '../src/native/alarms';
import type { AppSettings, Today } from '../src/native/alarms';
import * as family from '../src/native/family';
import * as sounds from '../src/native/sounds';
import { mockAlarmsDefaults, mockFamilyDefaults } from './helpers/nativeMocks';
import { headerTitles } from './helpers/renderApp';

jest.mock('../src/native/alarms');
jest.mock('../src/native/sounds');

const settings = (role: AppSettings['role']): AppSettings => ({
  language: 'en',
  readAloud: true,
  role,
  languages: [{ code: 'en', label: 'English', draft: false }],
});

const kamala = { name: 'Kamala Nair', email: 'kamala.nair@gmail.com' };

beforeEach(() => {
  jest.clearAllMocks();
  mockAlarmsDefaults();
  mockFamilyDefaults();
  jest.mocked(sounds.listSounds).mockResolvedValue([]);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('a set-up, logged-in phone opens on Today', async () => {
  jest.mocked(family.signedInRelative).mockResolvedValue(kamala);
  await render(<App />);
  expect(await screen.findByText('No pills yet')).toBeTruthy();
});

test('a phone with no role opens the login page', async () => {
  jest.mocked(alarms.getSettings).mockResolvedValue(settings(null));
  jest.mocked(family.signedInRelative).mockResolvedValue(kamala);
  await render(<App />);
  expect(await screen.findByText('Continue with Google')).toBeTruthy();
  expect(headerTitles()).toEqual(['PillSaathi']);
});

test('a logged-out phone with a role opens the login page again', async () => {
  jest.mocked(family.signedInRelative).mockResolvedValue(null);
  await render(<App />);
  expect(await screen.findByText('Continue with Google')).toBeTruthy();
  jest.mocked(family.signInWithGoogle).mockResolvedValue(kamala);
  await fireEvent.press(screen.getByText('Continue with Google'));
  // Asked once already: straight back to Today.
  expect(await screen.findByText('No pills yet')).toBeTruthy();
});

test('a phone whose settings or login cannot be read opens the login page', async () => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.mocked(alarms.getSettings).mockRejectedValue(new Error('disk'));
  jest
    .mocked(family.signedInRelative)
    .mockRejectedValue(Object.assign(new Error('x'), { code: 'NOT_SET_UP' }));
  await render(<App />);
  expect(await screen.findByText('Continue with Google')).toBeTruthy();
});

test("a tester's phone with pills and no role opens the login page, and Today keeps its pills after I take medicines", async () => {
  const today: Today = {
    date: '2026-10-26',
    refills: [],
    cards: [
      {
        alarmId: 'c21',
        hour: 21,
        minute: 0,
        soundId: null,
        status: 'upcoming',
        statusAt: new Date(2026, 9, 26, 21, 0).getTime(),
        pills: [
          {
            pillId: 'p1',
            name: 'Metformin 500',
            form: 'tablet',
            amount: 1,
            startDate: '2026-10-20',
            days: null,
            exists: true,
            fromTomorrow: false,
            photoUri: null,
          },
        ],
      },
    ],
  };
  jest.mocked(alarms.getToday).mockResolvedValue(today);
  jest.mocked(alarms.getSettings).mockResolvedValue(settings(null));
  jest.mocked(alarms.getSetupState).mockResolvedValue({
    seen: true,
    doneSteps: ['lockRecents'],
  });
  jest
    .spyOn(Platform, 'constants', 'get')
    .mockReturnValue({ Manufacturer: 'Xiaomi' } as never);
  jest.mocked(family.signInWithGoogle).mockResolvedValue(kamala);
  await render(<App />);
  await fireEvent.press(await screen.findByText('Continue with Google'));
  await fireEvent.press(await screen.findByText('I take medicines'));
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  expect(alarms.setRole).toHaveBeenCalledWith('elder');
  expect(await screen.findByText("Let's make sure alarms ring")).toBeTruthy();
  // Lock in recent apps stays ticked, and the phone has allowed battery use.
  expect(screen.getByText('2 of 4 done · Xiaomi phone')).toBeTruthy();
  await fireEvent.press(screen.getByText('Do this later'));
  expect(await screen.findByText('Metformin 500')).toBeTruthy();
  expect(alarms.deletePill).not.toHaveBeenCalled();
});
