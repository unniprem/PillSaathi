import { Alert, DeviceEventEmitter, StyleSheet } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as family from '../../src/native/family';
import type { FamilyCard } from '../../src/native/family';
import * as sounds from '../../src/native/sounds';
import { mockAlarmsDefaults, mockFamilyDefaults } from '../helpers/nativeMocks';
import { headerTitles, renderApp } from '../helpers/renderApp';

jest.mock('../../src/native/alarms');
jest.mock('../../src/native/sounds');

const amma: FamilyCard = {
  elderId: 'E',
  name: 'Amma',
  phone: '+919800000000',
  delayMinutes: 15,
  heardAt: null,
  silent: false,
  abandoned: false,
  otherZone: false,
  tally: { taken: 0, skipped: 0, missed: 0, notReported: 0, later: 0 },
  refills: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAlarmsDefaults();
  mockFamilyDefaults();
  jest.mocked(sounds.listSounds).mockResolvedValue([]);
  jest.mocked(family.getFamily).mockResolvedValue([amma]);
});

afterEach(() => {
  jest.restoreAllMocks();
});

// The keyboard covers the page rather than shrinking it, so the page makes room for it.
test('the fields and Save stay above the keyboard', async () => {
  await renderApp('FollowEdit', { elderId: 'E' });
  await screen.findByLabelText('What do you call them?');
  // Each card's label is a heading, for TalkBack to jump between.
  expect(
    screen.getByRole('header', { name: 'Tell me if a dose is missed' }),
  ).toBeTruthy();
  const bottom = () =>
    StyleSheet.flatten(screen.getByTestId('follow-edit-page').props.style)
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

test('edits the name, number and delay', async () => {
  await renderApp('FollowEdit', { elderId: 'E' });
  const name = await screen.findByLabelText('What do you call them?');
  expect(name.props.value).toBe('Amma');
  expect(
    screen.getByRole('button', { name: 'After 15 min' }).props
      .accessibilityState,
  ).toEqual(expect.objectContaining({ selected: true }));
  await fireEvent.changeText(name, 'Ammachi');
  await fireEvent.press(screen.getByText('After 1 hour'));
  await fireEvent.press(screen.getByText('Save'));
  expect(family.saveFollow).toHaveBeenCalledWith({
    elderId: 'E',
    name: 'Ammachi',
    phone: '+919800000000',
    delayMinutes: 60,
  });
});

test('Stop following asks first', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await renderApp('FollowEdit', { elderId: 'E' });
  await fireEvent.press(await screen.findByText('Stop following'));
  expect(alert.mock.calls[0][0]).toBe("Stop seeing Amma's pills?");
  const stop = alert.mock.calls[0][2]!;
  expect(stop.map(b => b.text)).toEqual(['Cancel', 'Stop following']);
  expect(family.unfollow).not.toHaveBeenCalled();
  await act(async () => stop[1].onPress!());
  expect(family.unfollow).toHaveBeenCalledWith('E', false);
  expect(alert).toHaveBeenCalledTimes(1);
});

test('abandoned, Stop following also asks to delete the copy', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest
    .mocked(family.getFamily)
    .mockResolvedValue([{ ...amma, abandoned: true }]);
  await renderApp('FollowEdit', { elderId: 'E' });
  await fireEvent.press(await screen.findByText('Stop following'));
  await act(async () => alert.mock.calls[0][2]![1].onPress!());
  expect(family.unfollow).not.toHaveBeenCalled();
  expect(alert.mock.calls[1][0]).toBe("Also delete Amma's online copy?");
  const copy = alert.mock.calls[1][2]!;
  expect(copy.map(b => b.text)).toEqual(['Keep', 'Delete']);
  await act(async () => copy[1].onPress!());
  expect(family.unfollow).toHaveBeenCalledWith('E', true);
});

test('the elder page gear opens the edit page', async () => {
  jest.mocked(family.refreshFamily).mockResolvedValue([amma]);
  await renderApp('Elder', { elderId: 'E' });
  await waitFor(() => expect(headerTitles()).toEqual(['Amma']));
  await fireEvent.press(screen.getByLabelText('Edit'));
  await waitFor(() => expect(headerTitles()).toEqual(['Amma', 'Amma']));
});
