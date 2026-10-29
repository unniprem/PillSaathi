import { Alert, Share } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as family from '../../src/native/family';
import * as sounds from '../../src/native/sounds';
import { mockAlarmsDefaults, mockFamilyDefaults } from '../helpers/nativeMocks';
import { headerTitles, renderApp } from '../helpers/renderApp';

jest.mock('../../src/native/alarms');
jest.mock('../../src/native/sounds');

const MINUTE = 60_000;

function failing(code: string) {
  return Object.assign(new Error(code), { code });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAlarmsDefaults();
  mockFamilyDefaults();
  jest.mocked(sounds.listSounds).mockResolvedValue([]);
  jest.mocked(family.createLinkCode).mockImplementation(async () => ({
    code: '482913',
    expiresAt: Date.now() + 15 * MINUTE,
    qrUri: 'file:///cache/family/qr-482913.png',
  }));
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test('the code screen shows the code, the QR and Send code', async () => {
  const share = jest
    .spyOn(Share, 'share')
    .mockResolvedValue({ action: 'sharedAction', activityType: undefined });
  await renderApp('ShareCode');
  expect(headerTitles()).toEqual(['Family code']);
  expect(await screen.findByText('482 913')).toBeTruthy();
  expect(
    screen.getByText(
      'Show this to a family member, or send it. It works for 15 minutes.',
    ),
  ).toBeTruthy();
  const qr = screen.getByLabelText('Scan code');
  expect(qr.props.source).toEqual({
    uri: 'file:///cache/family/qr-482913.png',
  });
  await fireEvent.press(screen.getByText('Send code'));
  expect(share).toHaveBeenCalledWith({
    message:
      'Open PillSaathi, tap Add family, and type 482 913. It works for 15 minutes.',
  });
});

test('after 15 minutes it says the code has expired and offers New code', async () => {
  jest.useFakeTimers();
  await renderApp('ShareCode');
  expect(await screen.findByText('482 913')).toBeTruthy();
  await act(async () => jest.advanceTimersByTime(15 * MINUTE));
  expect(await screen.findByText('This code has expired.')).toBeTruthy();
  expect(screen.queryByText('482 913')).toBeNull();
  jest.mocked(family.createLinkCode).mockResolvedValueOnce({
    code: '111222',
    expiresAt: Date.now() + 15 * MINUTE,
    qrUri: 'file:///cache/family/qr-111222.png',
  });
  await fireEvent.press(screen.getByText('New code'));
  expect(await screen.findByText('111 222')).toBeTruthy();
  expect(family.createLinkCode).toHaveBeenCalledTimes(2);
});

test('NOT_SET_UP shows its message', async () => {
  jest
    .mocked(family.createLinkCode)
    .mockRejectedValueOnce(failing(family.FamilyErrors.NotSetUp));
  await renderApp('ShareCode');
  expect(
    await screen.findByText("Family isn't set up in this build."),
  ).toBeTruthy();
  expect(screen.queryByText('New code')).toBeNull();
});

test('OFFLINE shows its message, and New code tries again', async () => {
  jest
    .mocked(family.createLinkCode)
    .mockRejectedValueOnce(failing(family.FamilyErrors.Offline));
  await renderApp('ShareCode');
  expect(
    await screen.findByText('No internet. Please try again.'),
  ).toBeTruthy();
  await fireEvent.press(screen.getByText('New code'));
  expect(await screen.findByText('482 913')).toBeTruthy();
});

test('Allow on the code screen goes back to the Family page', async () => {
  jest.useFakeTimers();
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await renderApp('Family');
  await fireEvent.press(
    await screen.findByText('Show a code to a family member'),
  );
  expect(await screen.findByText('482 913')).toBeTruthy();
  jest
    .mocked(family.pendingRequests)
    .mockResolvedValue([{ uid: 'R', name: 'Ravi', email: 'ravi@gmail.com' }]);
  await act(async () => jest.advanceTimersByTime(2000));
  await waitFor(() => expect(alert).toHaveBeenCalledTimes(1));
  await act(async () => alert.mock.calls[0][2]![1].onPress!());
  expect(family.answerRequest).toHaveBeenCalledWith('R', true);
  await waitFor(() => expect(headerTitles()).toEqual(['Family']));
});
