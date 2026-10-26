import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as alarms from '../../src/native/alarms';
import * as sounds from '../../src/native/sounds';
import { mockAlarmsDefaults } from '../helpers/nativeMocks';
import { renderApp } from '../helpers/renderApp';

jest.mock('../../src/native/alarms');
jest.mock('../../src/native/sounds');

const voice = {
  id: 's1',
  name: 'My voice',
  kind: 'recorded' as const,
  durationMs: 12000,
  createdAt: 2,
  usedBy: [],
};
const song = {
  id: 's2',
  name: 'Birdsong',
  kind: 'imported' as const,
  durationMs: 30000,
  createdAt: 1,
  usedBy: ['Morning tablet'],
};

afterEach(() => {
  jest.restoreAllMocks();
});

beforeEach(() => {
  jest.clearAllMocks();
  mockAlarmsDefaults();
  jest.mocked(sounds.listSounds).mockResolvedValue([voice, song]);
  jest.mocked(sounds.deleteSound).mockResolvedValue();
  jest.mocked(sounds.previewSound).mockResolvedValue();
  jest.mocked(sounds.stopPreview).mockResolvedValue();
  jest
    .mocked(sounds.onPreviewEnded)
    .mockReturnValue({ remove: jest.fn() } as never);
});

test('lists Default alarm tone first, then saved sounds with type and length', async () => {
  await renderApp('SoundPicker', { alarmId: 'c8', selectedSoundId: null });
  expect(await screen.findByText('My voice')).toBeTruthy();
  expect(screen.getByText('Recorded · 0:12')).toBeTruthy();
  expect(screen.getByText('Imported · 0:30')).toBeTruthy();
  const names = screen
    .getAllByTestId('sound-name')
    .map(n => n.props.children as string);
  expect(names).toEqual(['Default alarm tone', 'My voice', 'Birdsong']);
});

test('picking a sound sets it on the card and returns to Today', async () => {
  jest.mocked(alarms.getToday).mockResolvedValue({
    date: '2026-10-26',
    cards: [
      {
        alarmId: 'c8',
        hour: 8,
        minute: 0,
        soundId: null,
        status: 'upcoming',
        statusAt: null,
        pills: [],
      },
    ],
  });
  await renderApp();
  await fireEvent.press(await screen.findByText('♪ Default alarm tone'));
  await fireEvent.press(await screen.findByText('My voice'));
  expect(alarms.setCardSound).toHaveBeenCalledWith('c8', 's1');
  expect(await screen.findByText('+ Add pill')).toBeTruthy();
  expect(screen.queryByText('Your sounds')).toBeNull();
});

test('picking the default tone sets it on the card', async () => {
  await renderApp('SoundPicker', { alarmId: 'c8', selectedSoundId: 's1' });
  await fireEvent.press(await screen.findByText('Default alarm tone'));
  expect(alarms.setCardSound).toHaveBeenCalledWith('c8', null);
});

test('a failed pick says so and stays', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.mocked(alarms.setCardSound).mockRejectedValueOnce(new Error('gone'));
  await renderApp('SoundPicker', { alarmId: 'c8', selectedSoundId: null });
  await fireEvent.press(await screen.findByText('My voice'));
  await waitFor(() =>
    expect(alert).toHaveBeenCalledWith(
      'Could not change the sound',
      'Please try again.',
    ),
  );
  expect(screen.getByText('Your sounds')).toBeTruthy();
});

test('import of an unplayable file shows the format alert', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(sounds.importSound).mockRejectedValue({
    code: 'UNSUPPORTED_AUDIO',
  });
  await renderApp('SoundPicker', { alarmId: 'c8', selectedSoundId: null });
  await screen.findByText('My voice');
  await fireEvent.press(screen.getByText('⇪ Import'));
  expect(alert).toHaveBeenCalledWith(
    "That file can't be played. Try an mp3, m4a, wav or ogg file.",
  );
});

test('a cancelled import does nothing', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(sounds.importSound).mockResolvedValue(null);
  await renderApp('SoundPicker', { alarmId: 'c8', selectedSoundId: null });
  await screen.findByText('My voice');
  await fireEvent.press(screen.getByText('⇪ Import'));
  expect(alert).not.toHaveBeenCalled();
  expect(screen.getByText('Your sounds')).toBeTruthy();
});

test('deleting a sound in use names the alarms that use it', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await renderApp('SoundPicker', { alarmId: 'c8', selectedSoundId: null });
  await fireEvent(await screen.findByText('Birdsong'), 'longPress');
  expect(alert).toHaveBeenCalledWith(
    'Delete “Birdsong”?',
    "It's used by: Morning tablet. Those alarms will use the default alarm tone.",
    expect.any(Array),
  );
  const buttons = alert.mock.calls[0][2]!;
  await act(async () => {
    buttons.find(b => b.style === 'destructive')!.onPress!();
  });
  expect(sounds.deleteSound).toHaveBeenCalledWith('s2');
});

test('deleting an unused sound asks a plain question', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await renderApp('SoundPicker', { alarmId: 'c8', selectedSoundId: null });
  await fireEvent(await screen.findByText('My voice'), 'longPress');
  expect(alert).toHaveBeenCalledWith(
    'Delete “My voice”?',
    undefined,
    expect.any(Array),
  );
});

test('the preview toggle plays, stops, and resets when playback ends', async () => {
  await renderApp('SoundPicker', { alarmId: 'c8', selectedSoundId: null });
  await screen.findByText('My voice');
  await fireEvent.press(screen.getByTestId('preview-s1'));
  expect(sounds.previewSound).toHaveBeenCalledWith('s1');
  expect(screen.getByTestId('preview-s1').props.accessibilityLabel).toBe(
    'Stop My voice',
  );
  const ended = jest.mocked(sounds.onPreviewEnded).mock.calls[0][0];
  await act(async () => ended('s1'));
  expect(screen.getByTestId('preview-s1').props.accessibilityLabel).toBe(
    'Play My voice',
  );
  await fireEvent.press(screen.getByTestId('preview-s1'));
  await fireEvent.press(screen.getByTestId('preview-s1'));
  expect(sounds.stopPreview).toHaveBeenCalled();
});

test('a failed delete alerts, keeps the selection and reloads', async () => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(sounds.deleteSound).mockRejectedValue(new Error('boom'));
  await renderApp('SoundPicker', { alarmId: 'c8', selectedSoundId: 's1' });
  await fireEvent(await screen.findByText('My voice'), 'longPress');
  const buttons = alert.mock.calls[0][2]!;
  await act(async () => {
    buttons.find(b => b.style === 'destructive')!.onPress!();
  });
  expect(alert).toHaveBeenLastCalledWith(
    'Could not delete the sound',
    'Please try again.',
  );
  expect(
    screen.getAllByRole('radio').find(r => r.props.accessibilityState.checked),
  ).toBeTruthy();
  expect(
    screen
      .getAllByRole('radio')
      .filter(r => r.props.accessibilityState.checked),
  ).toHaveLength(1);
  expect(sounds.listSounds).toHaveBeenCalledTimes(2);
});

test('deleting the sound that is previewing stops the preview first', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await renderApp('SoundPicker', { alarmId: 'c8', selectedSoundId: null });
  await fireEvent.press(await screen.findByTestId('preview-s1'));
  jest.mocked(sounds.stopPreview).mockClear();
  await fireEvent(screen.getByText('My voice'), 'longPress');
  const buttons = alert.mock.calls[0][2]!;
  await act(async () => {
    buttons.find(b => b.style === 'destructive')!.onPress!();
  });
  expect(sounds.stopPreview).toHaveBeenCalledTimes(1);
  expect(sounds.deleteSound).toHaveBeenCalledWith('s1');
});
