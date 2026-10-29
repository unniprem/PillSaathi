import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as alarms from '../../src/native/alarms';
import * as sounds from '../../src/native/sounds';
import { mockAlarmsDefaults, mockFamilyDefaults } from '../helpers/nativeMocks';
import { headerTitles, renderApp } from '../helpers/renderApp';

jest.mock('../../src/native/alarms');
jest.mock('../../src/native/sounds');

beforeEach(() => {
  jest.clearAllMocks();
  mockAlarmsDefaults();
  mockFamilyDefaults();
  jest.mocked(sounds.listSounds).mockResolvedValue([]);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('greets by the first name and asks who the phone is for', async () => {
  await renderApp('Who', { first: 'Kamala' });
  expect(headerTitles()).toEqual(['Hi Kamala!']);
  expect(screen.getByText('Who is this phone for?')).toBeTruthy();
  expect(screen.getByText('Ring my alarms on this phone')).toBeTruthy();
  expect(screen.getByText('See their day, set up their pills')).toBeTruthy();
  expect(
    screen.getByText(
      'You can do both later. Anyone can add their own pills or add family.',
    ),
  ).toBeTruthy();
});

test('without a name it just says hi', async () => {
  await renderApp('Who', { first: null });
  expect(headerTitles()).toEqual(['Hi!']);
});

test('Continue waits for a choice', async () => {
  await renderApp('Who', { first: 'Kamala' });
  const next = screen.getByRole('button', { name: 'Continue' });
  expect(next.props.accessibilityState).toEqual(
    expect.objectContaining({ disabled: true }),
  );
  await fireEvent.press(next);
  expect(alarms.setRole).not.toHaveBeenCalled();
  expect(headerTitles()).toEqual(['Hi Kamala!']);
});

test('I take medicines saves the role and opens alarm setup once', async () => {
  await renderApp('Who', { first: 'Kamala' });
  await fireEvent.press(screen.getByText('I take medicines'));
  expect(
    screen.getByRole('radio', { name: 'I take medicines' }).props
      .accessibilityState,
  ).toEqual(expect.objectContaining({ checked: true }));
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  expect(alarms.setRole).toHaveBeenCalledWith('elder');
  // The login and this page are gone: setup is the only page.
  await waitFor(() =>
    expect(headerTitles()).toEqual(["Let's make sure alarms ring"]),
  );
});

test('I look after someone opens Add family', async () => {
  await renderApp('Who', { first: 'Ravi' });
  await fireEvent.press(screen.getByText('I look after someone'));
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  expect(alarms.setRole).toHaveBeenCalledWith('carer');
  await waitFor(() => expect(headerTitles()).toEqual(['Add family']));
});

test('the last choice made is the one kept', async () => {
  await renderApp('Who', { first: 'Ravi' });
  await fireEvent.press(screen.getByText('I take medicines'));
  await fireEvent.press(screen.getByText('I look after someone'));
  expect(
    screen.getByRole('radio', { name: 'I take medicines' }).props
      .accessibilityState,
  ).toEqual(expect.objectContaining({ checked: false }));
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  expect(alarms.setRole).toHaveBeenCalledWith('carer');
});

test('a role that cannot be saved still moves on', async () => {
  jest.mocked(alarms.setRole).mockRejectedValue(new Error('disk'));
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  await renderApp('Who', { first: 'Kamala' });
  await fireEvent.press(screen.getByText('I take medicines'));
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await waitFor(() =>
    expect(headerTitles()).toEqual(["Let's make sure alarms ring"]),
  );
});
