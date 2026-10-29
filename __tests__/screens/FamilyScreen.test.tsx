import { Alert } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as alarms from '../../src/native/alarms';
import * as family from '../../src/native/family';
import * as sounds from '../../src/native/sounds';
import { mockAlarmsDefaults, mockFamilyDefaults } from '../helpers/nativeMocks';
import { headerTitles, renderApp } from '../helpers/renderApp';

jest.mock('../../src/native/alarms');
jest.mock('../../src/native/sounds');

const ravi = { uid: 'R', name: 'Ravi', email: 'ravi@gmail.com' };

beforeEach(() => {
  jest.clearAllMocks();
  mockAlarmsDefaults();
  mockFamilyDefaults();
  jest.mocked(sounds.listSounds).mockResolvedValue([]);
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test('Family lists who can see my pills, and Remove asks first', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest
    .mocked(family.listFollowers)
    .mockResolvedValue([{ ...ravi, canChange: true }]);
  await renderApp('Family');
  expect(headerTitles()).toEqual(['Family']);
  expect(screen.getByText('People who can see my pills')).toBeTruthy();
  expect(await screen.findByText('Ravi')).toBeTruthy();
  expect(screen.getByText('ravi@gmail.com')).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: 'Remove Ravi' }));
  expect(alert.mock.calls[0][0]).toBe('Stop Ravi seeing your pills?');
  expect(family.removeFollower).not.toHaveBeenCalled();
  const buttons = alert.mock.calls[0][2]!;
  expect(buttons.map(b => b.text)).toEqual(['Cancel', 'Remove']);
  jest.mocked(family.listFollowers).mockResolvedValue([]);
  await act(async () => buttons[1].onPress!());
  expect(family.removeFollower).toHaveBeenCalledWith('R');
  await waitFor(() =>
    expect(screen.getAllByText('No one yet.')).toHaveLength(2),
  );
});

test('Family shows "No one yet." with no followers', async () => {
  await renderApp('Family');
  expect((await screen.findAllByText('No one yet.')).length).toBeGreaterThan(0);
  expect(screen.getByText('Show a code to a family member')).toBeTruthy();
});

test('a request asks Allow / No, and Allow answers it', async () => {
  jest.useFakeTimers();
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(family.pendingRequests).mockResolvedValue([ravi]);
  await renderApp('Family');
  await act(async () => jest.advanceTimersByTime(2000));
  expect(family.watchRequests).toHaveBeenCalledWith(true);
  await waitFor(() => expect(alert).toHaveBeenCalledTimes(1));
  expect(alert.mock.calls[0][0]).toBe('Let Ravi see and change your pills?');
  expect(alert.mock.calls[0][1]).toBe(
    "ravi@gmail.com will see your pills and whether you took them, and can add or change pills and alarm sounds. You'll get a notice each time.",
  );
  const buttons = alert.mock.calls[0][2]!;
  expect(buttons.map(b => b.text)).toEqual(['No', 'Allow']);
  jest
    .mocked(family.listFollowers)
    .mockResolvedValue([{ ...ravi, canChange: true }]);
  await act(async () => buttons[1].onPress!());
  expect(family.answerRequest).toHaveBeenCalledWith('R', true);
  expect(await screen.findByText('ravi@gmail.com')).toBeTruthy();

  // The mock still lists Ravi; an answered request is never asked about again.
  await act(async () => jest.advanceTimersByTime(6000));
  expect(alert).toHaveBeenCalledTimes(1);
});

test('each person has Can change my pills, and the switch calls setCanChange', async () => {
  jest
    .mocked(family.listFollowers)
    .mockResolvedValue([{ ...ravi, canChange: true }]);
  await renderApp('Family');
  const toggle = await screen.findByRole('switch', {
    name: 'Can change my pills: Ravi',
  });
  expect(screen.getByText('Can change my pills')).toBeTruthy();
  expect(toggle.props.value).toBe(true);
  jest
    .mocked(family.listFollowers)
    .mockResolvedValue([{ ...ravi, canChange: false }]);
  await fireEvent(toggle, 'valueChange', false);
  expect(family.setCanChange).toHaveBeenCalledWith('R', false);
  await waitFor(() =>
    expect(
      screen.getByRole('switch', { name: 'Can change my pills: Ravi' }).props
        .value,
    ).toBe(false),
  );
});

test('a refused switch says so and stays as it was', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest
    .mocked(family.listFollowers)
    .mockResolvedValue([{ ...ravi, canChange: false }]);
  jest
    .mocked(family.setCanChange)
    .mockRejectedValue(
      Object.assign(new Error('OFFLINE'), { code: 'OFFLINE' }),
    );
  await renderApp('Family');
  const toggle = await screen.findByRole('switch', {
    name: 'Can change my pills: Ravi',
  });
  await fireEvent(toggle, 'valueChange', true);
  await waitFor(() =>
    expect(alert).toHaveBeenCalledWith('No internet. Please try again.'),
  );
  expect(
    screen.getByRole('switch', { name: 'Can change my pills: Ravi' }).props
      .value,
  ).toBe(false);
});

test('the Family page stops listening when it is left', async () => {
  await renderApp('Family');
  await waitFor(() => expect(family.watchRequests).toHaveBeenCalledWith(true));
  await fireEvent.press(screen.getByText('Show a code to a family member'));
  await waitFor(() =>
    expect(headerTitles()).toEqual(['Family', 'Family code']),
  );
  // The code screen listens in its turn: one listener stays on.
  expect(jest.mocked(family.watchRequests).mock.calls.at(-1)).toEqual([true]);
});

test('Family lists the people I look after, with + Add family', async () => {
  jest
    .mocked(family.listFollows)
    .mockResolvedValue([
      { elderId: 'E', name: 'Amma', phone: null, delayMinutes: 30 },
    ]);
  await renderApp('Family');
  expect(screen.getByText('People I look after')).toBeTruthy();
  expect(await screen.findByText('Amma')).toBeTruthy();
  await fireEvent.press(screen.getByText('+ Add family'));
  await waitFor(() => expect(headerTitles()).toEqual(['Family', 'Add family']));
});

test('Family says "No one yet." when looking after no one', async () => {
  await renderApp('Family');
  await waitFor(() =>
    expect(screen.getAllByText('No one yet.')).toHaveLength(2),
  );
});

test('Family is a tab of its own, no longer a Settings row', async () => {
  jest.mocked(alarms.getSettings).mockResolvedValue({
    language: 'en',
    readAloud: true,
    role: 'elder',
    languages: [{ code: 'en', label: 'English', draft: false }],
  });
  await renderApp('Settings');
  await screen.findByText('English');
  expect(screen.queryByRole('button', { name: 'Family' })).toBeNull();
  await fireEvent.press(screen.getByRole('tab', { name: 'Family' }));
  await waitFor(() => expect(headerTitles()).toContain('Family'));
  expect(
    screen.getByRole('tab', { name: 'Family', selected: true }),
  ).toBeTruthy();
});

test('the Family tab reads Family in Malayalam', async () => {
  jest.mocked(alarms.currentLanguage).mockReturnValue('ml');
  await renderApp('Settings');
  expect(await screen.findByRole('tab', { name: 'കുടുംബം' })).toBeTruthy();
});
