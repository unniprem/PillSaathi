import { DeviceEventEmitter, StyleSheet } from 'react-native';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
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

/** What the six boxes show, an empty string for a box not yet filled. */
const boxes = () =>
  screen
    .getAllByTestId('digit-box')
    .map(box => within(box).queryByText(/\d/)?.props.children ?? '');

/**
 * Pastes [text] into [field] as Android does: a field's maxLength cuts the paste before the app
 * sees it.
 */
async function paste(
  field: ReturnType<typeof screen.getByLabelText>,
  text: string,
) {
  const max: number | undefined = field.props.maxLength;
  await fireEvent.changeText(
    field,
    max === undefined ? text : text.slice(0, max),
  );
}

test('logged out: Continue with Google comes first', async () => {
  jest.mocked(family.signedInRelative).mockResolvedValue(null);
  jest.mocked(family.signInWithGoogle).mockResolvedValue(ravi);
  await renderApp('AddFamily');
  expect(headerTitles()).toEqual(['Add family']);
  expect(await screen.findByText('Continue with Google')).toBeTruthy();
  expect(screen.queryByText('Scan their code')).toBeNull();
  await fireEvent.press(screen.getByText('Continue with Google'));
  expect(family.signInWithGoogle).toHaveBeenCalled();
  expect(await screen.findByText('Scan their code')).toBeTruthy();
  expect(screen.getByLabelText('or type the 6 digits')).toBeTruthy();
});

test('a not-logged-in phone asks to continue with Google first', async () => {
  jest.mocked(family.signedInRelative).mockResolvedValue(null);
  jest.mocked(family.signInWithGoogle).mockResolvedValueOnce(null);
  await renderApp('AddFamily');
  expect(
    await screen.findByText('To add family, log in with Google first.'),
  ).toBeTruthy();
  // Cancelled: still asked.
  await fireEvent.press(screen.getByText('Continue with Google'));
  expect(screen.getByText('Continue with Google')).toBeTruthy();
  expect(screen.queryByText('Scan their code')).toBeNull();

  jest.mocked(family.signInWithGoogle).mockResolvedValueOnce(ravi);
  await fireEvent.press(screen.getByText('Continue with Google'));
  expect(await screen.findByText('Logged in as ravi@gmail.com')).toBeTruthy();
  expect(
    screen.getByText(
      'On their phone: open PillSaathi, tap Family, then Show my code.',
    ),
  ).toBeTruthy();
});

test('typing 6 digits and Next asks to follow', async () => {
  await renderApp('AddFamily');
  expect(await screen.findByText('Logged in as ravi@gmail.com')).toBeTruthy();
  // Not straight after the login: Back leaves, and there is no Skip for now.
  expect(screen.getByLabelText('Back')).toBeTruthy();
  expect(screen.queryByText('Skip for now')).toBeNull();
  await typeCode('482 913');
  expect(family.requestFollow).toHaveBeenCalledWith('482913');
  expect(
    await screen.findByText('Waiting for them to tap Allow on their phone…'),
  ).toBeTruthy();
});

test('typing six digits fills the boxes and enables Next', async () => {
  await renderApp('AddFamily');
  const input = await screen.findByLabelText('or type the 6 digits');
  expect(input.props.keyboardType).toBe('number-pad');
  expect(boxes()).toEqual(['', '', '', '', '', '']);
  const next = () => screen.getByRole('button', { name: 'Next' });
  expect(next().props.accessibilityState).toEqual(
    expect.objectContaining({ disabled: true }),
  );
  await fireEvent.changeText(input, '482');
  expect(boxes()).toEqual(['4', '8', '2', '', '', '']);
  expect(next().props.accessibilityState).toEqual(
    expect.objectContaining({ disabled: true }),
  );
  await fireEvent.changeText(input, '482913');
  expect(boxes()).toEqual(['4', '8', '2', '9', '1', '3']);
  expect(next().props.accessibilityState).toEqual(
    expect.objectContaining({ disabled: false }),
  );
});

// Her phone shares the code as "482 913", and a relative pastes it, or her whole message.
test('pasting the code with its space, or her whole message, fills all six boxes', async () => {
  await renderApp('AddFamily');
  const input = await screen.findByLabelText('or type the 6 digits');
  await paste(input, '482 913');
  expect(boxes()).toEqual(['4', '8', '2', '9', '1', '3']);
  expect(
    screen.getByRole('button', { name: 'Next' }).props.accessibilityState,
  ).toEqual(expect.objectContaining({ disabled: false }));

  await paste(input, '');
  await paste(
    input,
    'Open PillSaathi, tap Family, then + Add family, and type 482 913. It works for 15 minutes.',
  );
  expect(boxes()).toEqual(['4', '8', '2', '9', '1', '3']);
  await fireEvent.press(screen.getByText('Next'));
  expect(family.requestFollow).toHaveBeenCalledWith('482913');
});

// The keyboard covers the page rather than shrinking it, so the page makes room for it.
test('the code and Next stay above the keyboard', async () => {
  await renderApp('AddFamily');
  await screen.findByLabelText('or type the 6 digits');
  const bottom = () =>
    StyleSheet.flatten(screen.getByTestId('add-family-page').props.style)
      .paddingBottom ?? 0;
  const closed = bottom();
  await act(() =>
    DeviceEventEmitter.emit('keyboardDidShow', {
      endCoordinates: { height: 300, width: 411, screenX: 0, screenY: 534 },
    }),
  );
  expect(bottom()).toBe(closed + 300);
  await act(() => DeviceEventEmitter.emit('keyboardDidHide', null));
  expect(bottom()).toBe(closed);
});

test('Scan their code fills the code and asks to follow', async () => {
  jest.mocked(family.scanCode).mockResolvedValue('482913');
  await renderApp('AddFamily');
  await fireEvent.press(await screen.findByText('Scan their code'));
  expect(family.requestFollow).toHaveBeenCalledWith('482913');
  expect(
    await screen.findByText('Waiting for them to tap Allow on their phone…'),
  ).toBeTruthy();
});

test('Scan their code says so while the scanner opens', async () => {
  let open: (code: string | null) => void = () => {};
  jest
    .mocked(family.scanCode)
    .mockReturnValue(new Promise(resolve => (open = resolve)));
  await renderApp('AddFamily');
  const pressed = fireEvent.press(await screen.findByText('Scan their code'));
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
  await fireEvent.press(await screen.findByText('Scan their code'));
  expect(
    await screen.findByText(
      "The scanner isn't ready yet. Try again in a minute, or type the 6 digits.",
    ),
  ).toBeTruthy();
  await fireEvent.press(screen.getByText('Scan their code'));
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
  await fireEvent.press(
    await screen.findByRole('button', { name: 'Add family' }),
  );
  await typeCode('482913');
  expect(
    await screen.findByText('Waiting for them to tap Allow on their phone…'),
  ).toBeTruthy();
  expect(
    screen.getByText('Keep this open. It moves on by itself.'),
  ).toBeTruthy();
  jest.mocked(family.followState).mockResolvedValue('allowed');
  await act(async () => jest.advanceTimersByTime(2000));
  expect(await screen.findByText('What do you call them?')).toBeTruthy();
  expect(headerTitles()).toContain('Almost done');
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

test('from the login, Skip for now opens Today', async () => {
  await renderApp('AddFamily', { fromLogin: true });
  expect(await screen.findByText('Scan their code')).toBeTruthy();
  // There is no page behind this one to go back to.
  expect(screen.queryByLabelText('Back')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Skip for now' }));
  await waitFor(() =>
    expect(
      screen.getByRole('tab', { name: 'Today' }).props.accessibilityState,
    ).toEqual(expect.objectContaining({ selected: true })),
  );
  expect(headerTitles()).not.toContain('Add family');
});

test('from the login, a phone not logged in can still skip', async () => {
  jest.mocked(family.signedInRelative).mockResolvedValue(null);
  await renderApp('AddFamily', { fromLogin: true });
  expect(await screen.findByText('Continue with Google')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Skip for now' }));
  await waitFor(() =>
    expect(screen.getByRole('tab', { name: 'Today' })).toBeTruthy(),
  );
});
