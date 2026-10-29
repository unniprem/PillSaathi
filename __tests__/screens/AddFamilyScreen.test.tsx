import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as family from '../../src/native/family';
import * as sounds from '../../src/native/sounds';
import { mockAlarmsDefaults, mockFamilyDefaults } from '../helpers/nativeMocks';
import { headerTitles, renderApp } from '../helpers/renderApp';

jest.mock('../../src/native/alarms');
jest.mock('../../src/native/sounds');

const ravi = { name: 'Ravi', email: 'ravi@gmail.com' };

function failing(code: string) {
  return Object.assign(new Error(code), { code });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAlarmsDefaults();
  mockFamilyDefaults();
  jest.mocked(sounds.listSounds).mockResolvedValue([]);
  jest.mocked(family.signedInRelative).mockResolvedValue(ravi);
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

async function typeCode(code: string) {
  await fireEvent.changeText(
    await screen.findByLabelText('or type the 6 digits'),
    code,
  );
  await fireEvent.press(screen.getByText('Next'));
}

test('signed out: Sign in with Google comes first', async () => {
  jest.mocked(family.signedInRelative).mockResolvedValue(null);
  jest.mocked(family.signInWithGoogle).mockResolvedValue(ravi);
  await renderApp('AddFamily');
  expect(headerTitles()).toEqual(['Add family']);
  expect(await screen.findByText('Sign in with Google')).toBeTruthy();
  expect(screen.queryByText('Scan code')).toBeNull();
  await fireEvent.press(screen.getByText('Sign in with Google'));
  expect(family.signInWithGoogle).toHaveBeenCalled();
  expect(await screen.findByText('Scan code')).toBeTruthy();
  expect(screen.getByLabelText('or type the 6 digits')).toBeTruthy();
});

test('typing 6 digits and Next asks to follow', async () => {
  await renderApp('AddFamily');
  await typeCode('482 913');
  expect(family.requestFollow).toHaveBeenCalledWith('482913');
  expect(
    await screen.findByText('Waiting for them to tap Allow on their phone…'),
  ).toBeTruthy();
});

test('Scan code fills the code and asks to follow', async () => {
  jest.mocked(family.scanCode).mockResolvedValue('482913');
  await renderApp('AddFamily');
  await fireEvent.press(await screen.findByText('Scan code'));
  expect(family.requestFollow).toHaveBeenCalledWith('482913');
  expect(
    await screen.findByText('Waiting for them to tap Allow on their phone…'),
  ).toBeTruthy();
});

test('Scan code says so while the scanner opens', async () => {
  let open: (code: string | null) => void = () => {};
  jest
    .mocked(family.scanCode)
    .mockReturnValue(new Promise(resolve => (open = resolve)));
  await renderApp('AddFamily');
  const pressed = fireEvent.press(await screen.findByText('Scan code'));
  expect(await screen.findByText('Opening the scanner…')).toBeTruthy();
  await act(async () => open(null));
  await pressed;
  expect(screen.queryByText('Opening the scanner…')).toBeNull();
  expect(family.requestFollow).not.toHaveBeenCalled();
});

test('a scanner that is not ready, or a code that is not ours, says so', async () => {
  jest
    .mocked(family.scanCode)
    .mockRejectedValueOnce(failing(family.FamilyErrors.NoScanner))
    .mockRejectedValueOnce(failing(family.FamilyErrors.BadCode));
  await renderApp('AddFamily');
  await fireEvent.press(await screen.findByText('Scan code'));
  expect(
    await screen.findByText(
      "The scanner isn't ready yet. Try again in a minute, or type the 6 digits.",
    ),
  ).toBeTruthy();
  await fireEvent.press(screen.getByText('Scan code'));
  expect(
    await screen.findByText(
      "That code didn't work. Check the 6 digits, or ask for a new code.",
    ),
  ).toBeTruthy();
  expect(family.requestFollow).not.toHaveBeenCalled();
});

test('waits for Allow, then shows the form; Done saves the follow', async () => {
  jest.useFakeTimers();
  await renderApp('Family');
  await fireEvent.press(await screen.findByText('+ Add family'));
  await typeCode('482913');
  expect(
    await screen.findByText('Waiting for them to tap Allow on their phone…'),
  ).toBeTruthy();
  jest.mocked(family.followState).mockResolvedValue('allowed');
  await act(async () => jest.advanceTimersByTime(2000));
  expect(await screen.findByText('What do you call them?')).toBeTruthy();
  expect(family.followState).toHaveBeenCalledWith('E');
  expect(
    screen.getByRole('button', { name: 'After 30 min' }).props
      .accessibilityState,
  ).toEqual(expect.objectContaining({ selected: true }));
  await fireEvent.changeText(
    screen.getByLabelText('What do you call them?'),
    ' Amma ',
  );
  await fireEvent.press(screen.getByText('Done'));
  expect(family.saveFollow).toHaveBeenCalledWith({
    elderId: 'E',
    name: 'Amma',
    phone: null,
    delayMinutes: 30,
  });
  await waitFor(() => expect(headerTitles()).toEqual(['Family']));
});

test('the form needs a name, and keeps the number and Off', async () => {
  jest.useFakeTimers();
  jest.mocked(family.followState).mockResolvedValue('allowed');
  await renderApp('AddFamily');
  await typeCode('482913');
  await act(async () => jest.advanceTimersByTime(2000));
  await fireEvent.press(await screen.findByText('Done'));
  expect(family.saveFollow).not.toHaveBeenCalled();
  await fireEvent.changeText(
    screen.getByLabelText('What do you call them?'),
    'Amma',
  );
  await fireEvent.changeText(
    screen.getByLabelText('Their phone number'),
    '+91 98000 00000',
  );
  await fireEvent.press(screen.getByText('Off'));
  await fireEvent.press(screen.getByText('Done'));
  expect(family.saveFollow).toHaveBeenCalledWith({
    elderId: 'E',
    name: 'Amma',
    phone: '+91 98000 00000',
    delayMinutes: null,
  });
});

test('No and expiry show their messages', async () => {
  jest.useFakeTimers();
  jest.mocked(family.followState).mockResolvedValue('denied');
  await renderApp('AddFamily');
  await typeCode('482913');
  await act(async () => jest.advanceTimersByTime(2000));
  expect(await screen.findByText('They tapped No.')).toBeTruthy();
  expect(screen.getByLabelText('or type the 6 digits')).toBeTruthy();

  jest.mocked(family.followState).mockResolvedValue('expired');
  await typeCode('482913');
  await act(async () => jest.advanceTimersByTime(2000));
  expect(await screen.findByText('This code has expired.')).toBeTruthy();
});

test('BAD_CODE and OFFLINE show their messages', async () => {
  jest
    .mocked(family.requestFollow)
    .mockRejectedValueOnce(failing(family.FamilyErrors.BadCode))
    .mockRejectedValueOnce(failing(family.FamilyErrors.Offline));
  await renderApp('AddFamily');
  await typeCode('482913');
  expect(
    await screen.findByText(
      "That code didn't work. Check the 6 digits, or ask for a new code.",
    ),
  ).toBeTruthy();
  await typeCode('482913');
  expect(
    await screen.findByText('No internet. Please try again.'),
  ).toBeTruthy();
});

test('only OFFLINE is called no internet', async () => {
  jest
    .mocked(family.signedInRelative)
    .mockRejectedValue(failing(family.FamilyErrors.Permission));
  await renderApp('AddFamily');
  expect(
    await screen.findByText('Something went wrong. Please try again later.'),
  ).toBeTruthy();
});

test('Next waits for all 6 digits', async () => {
  await renderApp('AddFamily');
  await typeCode('48291');
  expect(family.requestFollow).not.toHaveBeenCalled();
});
