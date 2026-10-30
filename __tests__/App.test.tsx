/**
 * @format
 */

import { Alert, AppState, Linking, Platform } from 'react-native';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import App from '../App';
import { takeMissed } from '../src/lib/start';
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
  // Nothing found missed in one test is left for the next.
  takeMissed();
});

/** Catches the AppState listeners; the returned function brings the app back to the front. */
function watchAppState() {
  const listeners: ((state: string) => void)[] = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, cb) => {
    listeners.push(cb as (state: string) => void);
    return { remove: jest.fn() } as never;
  });
  return () => act(async () => listeners.forEach(l => l('active')));
}

const missedAt8 = {
  id: 'c8',
  name: 'Metformin 500',
  dueAt: new Date(2026, 9, 26, 8, 0).getTime(),
};

test('a set-up, logged-in phone opens on Today', async () => {
  jest.mocked(family.signedInRelative).mockResolvedValue(kamala);
  await render(<App />);
  expect(await screen.findByText('No pills yet')).toBeTruthy();
});

// A family notification about her opens her page, over Today.
test("a missed-dose notification's link opens her page, and Back comes to Today", async () => {
  jest
    .spyOn(Linking, 'getInitialURL')
    .mockResolvedValue('pillsaathi://elder/E');
  jest.mocked(family.signedInRelative).mockResolvedValue(kamala);
  const amma = {
    elderId: 'E',
    name: 'Amma',
    phone: null,
    delayMinutes: 30,
    heardAt: null,
    silent: false,
    abandoned: false,
    otherZone: false,
    tally: { taken: 0, skipped: 0, missed: 0, notReported: 0, later: 0 },
    refills: [],
  };
  jest.mocked(family.getFamily).mockResolvedValue([amma]);
  jest.mocked(family.refreshFamily).mockResolvedValue([amma]);
  await render(<App />);
  await waitFor(() => expect(headerTitles()).toContain('Amma'));
  await fireEvent.press(screen.getByLabelText('Back'));
  expect(
    await screen.findByText('You have no pills of your own.'),
  ).toBeTruthy();
  expect(headerTitles()).not.toContain('Amma');
});

test('a link never skips the login', async () => {
  jest
    .spyOn(Linking, 'getInitialURL')
    .mockResolvedValue('pillsaathi://elder/E');
  jest.mocked(alarms.getSettings).mockResolvedValue(settings(null));
  await render(<App />);
  expect(await screen.findByText('Continue with Google')).toBeTruthy();
  expect(headerTitles()).toEqual(['PillSaathi']);
});

test('a phone with no role opens the login page', async () => {
  jest.mocked(alarms.getSettings).mockResolvedValue(settings(null));
  await render(<App />);
  expect(await screen.findByText('Continue with Google')).toBeTruthy();
  expect(headerTitles()).toEqual(['PillSaathi']);
});

test('a logged-in phone with no role asks who it is for, without logging in again', async () => {
  jest.mocked(alarms.getSettings).mockResolvedValue(settings(null));
  jest.mocked(family.signedInRelative).mockResolvedValue(kamala);
  await render(<App />);
  expect(await screen.findByText('Hi Kamala!')).toBeTruthy();
  expect(screen.getByText('Who is this phone for?')).toBeTruthy();
  expect(family.signInWithGoogle).not.toHaveBeenCalled();
});

describe('mending the alarms when the app opens', () => {
  test('a phone left at the login page still mends its alarms', async () => {
    const comeBack = watchAppState();
    jest.mocked(alarms.getSettings).mockResolvedValue(settings(null));
    await render(<App />);
    expect(await screen.findByText('Continue with Google')).toBeTruthy();
    expect(alarms.reconcileOnAppOpen).toHaveBeenCalledTimes(1);
    // And each time it comes back to the front.
    await comeBack();
    expect(alarms.reconcileOnAppOpen).toHaveBeenCalledTimes(2);
  });

  test('opening on Today reconciles once, and shows what was missed once', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.mocked(family.signedInRelative).mockResolvedValue(kamala);
    jest.mocked(alarms.reconcileOnAppOpen).mockResolvedValue([missedAt8]);
    await render(<App />);
    expect(await screen.findByText('No pills yet')).toBeTruthy();
    await waitFor(() => expect(alert).toHaveBeenCalledTimes(1));
    expect(alert).toHaveBeenCalledWith(
      'Missed medicines',
      'PillSaathi was stopped by your phone and missed:\n8:00 AM: Metformin 500',
      expect.any(Array),
    );
    await act(async () => {});
    expect(alarms.reconcileOnAppOpen).toHaveBeenCalledTimes(1);
    expect(alert).toHaveBeenCalledTimes(1);
  });

  test('what was missed while at the login page shows once Today opens', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.mocked(alarms.reconcileOnAppOpen).mockResolvedValueOnce([missedAt8]);
    await render(<App />);
    expect(await screen.findByText('Continue with Google')).toBeTruthy();
    await waitFor(() =>
      expect(alarms.reconcileOnAppOpen).toHaveBeenCalledTimes(1),
    );
    await act(async () => {});
    expect(alert).not.toHaveBeenCalled();
    // It continued offline last time, so Continue offline is there from the start.
    await fireEvent.press(screen.getByText('Continue offline'));
    expect(await screen.findByText('No pills yet')).toBeTruthy();
    await waitFor(() => expect(alert).toHaveBeenCalledTimes(1));
    expect(alert.mock.calls[0][0]).toBe('Missed medicines');
  });

  test('coming back mends the alarms first, then Today shows the day as mended', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const comeBack = watchAppState();
    jest.mocked(family.signedInRelative).mockResolvedValue(kamala);
    await render(<App />);
    expect(await screen.findByText('No pills yet')).toBeTruthy();
    await waitFor(() => expect(alarms.getHealth).toHaveBeenCalled());
    const reads = jest.mocked(alarms.getToday).mock.calls.length;
    let mended = false;
    jest.mocked(alarms.reconcileOnAppOpen).mockImplementationOnce(async () => {
      mended = true;
      return [missedAt8];
    });
    jest.mocked(alarms.getToday).mockImplementation(async () => {
      expect(mended).toBe(true);
      return { date: '2026-10-26', cards: [], refills: [] };
    });
    await comeBack();
    await waitFor(() => expect(alert).toHaveBeenCalledTimes(1));
    expect(jest.mocked(alarms.getToday).mock.calls.length).toBeGreaterThan(
      reads,
    );
    expect(alarms.reconcileOnAppOpen).toHaveBeenCalledTimes(2);
  });

  test('a failed reconcile still opens the app', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.mocked(family.signedInRelative).mockResolvedValue(kamala);
    jest.mocked(alarms.reconcileOnAppOpen).mockRejectedValue(new Error('disk'));
    await render(<App />);
    expect(await screen.findByText('No pills yet')).toBeTruthy();
  });
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
