import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as alarms from '../../src/native/alarms';
import * as family from '../../src/native/family';
import { FamilyErrors } from '../../src/native/family';
import * as sounds from '../../src/native/sounds';
import { ml } from '../../src/i18n/ml';
import { mockAlarmsDefaults, mockFamilyDefaults } from '../helpers/nativeMocks';
import { headerTitles, renderApp } from '../helpers/renderApp';

jest.mock('../../src/native/alarms');
jest.mock('../../src/native/sounds');

/** A login that rejects with [code], with its warning kept out of the test output. */
function failing(code: string) {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  return Object.assign(new Error(code), { code });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAlarmsDefaults();
  mockFamilyDefaults();
  jest.mocked(alarms.getSettings).mockResolvedValue({
    language: 'en',
    readAloud: true,
    role: null,
    languages: [
      { code: 'en', label: 'English', draft: false },
      { code: 'ml', label: 'മലയാളം', draft: true },
      { code: 'hi', label: 'हिन्दी', draft: true },
    ],
  });
  jest.mocked(sounds.listSounds).mockResolvedValue([]);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('shows the app, the languages and one way in', async () => {
  await renderApp('Login');
  expect(headerTitles()).toEqual(['PillSaathi']);
  expect(await screen.findByRole('radio', { name: 'മലയാളം' })).toBeTruthy();
  expect(
    screen.getByRole('radio', { name: 'English' }).props.accessibilityState,
  ).toEqual(expect.objectContaining({ checked: true }));
  expect(screen.getByText('Welcome')).toBeTruthy();
  expect(
    screen.getByText(
      'Log in to keep your pills safe and stay close to family.',
    ),
  ).toBeTruthy();
  expect(screen.getByText('One tap. No new password.')).toBeTruthy();
  expect(screen.queryByText('Continue offline')).toBeNull();
});

test('Continue with Google moves on with the first name', async () => {
  jest
    .mocked(family.signInWithGoogle)
    .mockResolvedValue({ name: 'Kamala Nair', email: 'kamala.nair@gmail.com' });
  await renderApp('Login');
  await fireEvent.press(
    screen.getByRole('button', { name: 'Continue with Google' }),
  );
  expect(await screen.findByText('Hi Kamala!')).toBeTruthy();
  expect(screen.getByText('Who is this phone for?')).toBeTruthy();
});

test('a cancelled login stays on the page, and offers Continue offline', async () => {
  jest.mocked(family.signInWithGoogle).mockResolvedValue(null);
  await renderApp('Login');
  await fireEvent.press(
    screen.getByRole('button', { name: 'Continue with Google' }),
  );
  // No Google account on the phone reads as cancelled too, so there is still a way in.
  expect(await screen.findByText('Continue offline')).toBeTruthy();
  expect(headerTitles()).toEqual(['PillSaathi']);
  expect(screen.queryByText('No internet. Please try again.')).toBeNull();
});

test('no internet offers Continue offline, which still moves on', async () => {
  jest
    .mocked(family.signInWithGoogle)
    .mockRejectedValue(failing(FamilyErrors.Offline));
  await renderApp('Login');
  await fireEvent.press(
    screen.getByRole('button', { name: 'Continue with Google' }),
  );
  expect(
    await screen.findByText('No internet. Please try again.'),
  ).toBeTruthy();
  await fireEvent.press(
    screen.getByRole('button', { name: 'Continue offline' }),
  );
  expect(await screen.findByText('Hi!')).toBeTruthy();
});

test('a build without Family offers Continue offline', async () => {
  jest
    .mocked(family.signInWithGoogle)
    .mockRejectedValue(failing(FamilyErrors.NotSetUp));
  await renderApp('Login');
  await fireEvent.press(
    screen.getByRole('button', { name: 'Continue with Google' }),
  );
  expect(
    await screen.findByText("Family isn't set up in this build."),
  ).toBeTruthy();
  await fireEvent.press(
    screen.getByRole('button', { name: 'Continue offline' }),
  );
  expect(await screen.findByText('Hi!')).toBeTruthy();
});

test('logging in again goes straight to Today', async () => {
  jest
    .mocked(family.signInWithGoogle)
    .mockResolvedValue({ name: 'Kamala Nair', email: 'kamala.nair@gmail.com' });
  await renderApp('Login', { again: true });
  await fireEvent.press(
    screen.getByRole('button', { name: 'Continue with Google' }),
  );
  await waitFor(() =>
    expect(
      screen.getByRole('tab', { name: 'Today' }).props.accessibilityState,
    ).toEqual(expect.objectContaining({ selected: true })),
  );
  expect(screen.queryByText('Who is this phone for?')).toBeNull();
});

test('continuing offline when logging in again goes to Today too', async () => {
  jest
    .mocked(family.signInWithGoogle)
    .mockRejectedValue(failing(FamilyErrors.Offline));
  await renderApp('Login', { again: true });
  await fireEvent.press(
    screen.getByRole('button', { name: 'Continue with Google' }),
  );
  await fireEvent.press(
    await screen.findByRole('button', { name: 'Continue offline' }),
  );
  expect(await screen.findByRole('tab', { name: 'Today' })).toBeTruthy();
});

test('choosing Malayalam switches the page', async () => {
  await renderApp('Login');
  await fireEvent.press(await screen.findByRole('radio', { name: 'മലയാളം' }));
  expect(alarms.setLanguage).toHaveBeenCalledWith('ml');
  expect(await screen.findByText(ml.login.welcome)).toBeTruthy();
  expect(screen.getByText(ml.login.google)).toBeTruthy();
});
