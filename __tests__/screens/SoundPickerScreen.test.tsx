import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { Alert, PermissionsAndroid } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as alarms from '../../src/native/alarms';
import * as family from '../../src/native/family';
import * as sounds from '../../src/native/sounds';
import { ml } from '../../src/i18n/ml';
import { RootNavigator } from '../../src/navigation/RootNavigator';
import type { RootStackParamList } from '../../src/navigation/RootNavigator';
import type { Today, TodayPill } from '../../src/native/alarms';
import { mockAlarmsDefaults } from '../helpers/nativeMocks';
import { headerTitles, renderApp } from '../helpers/renderApp';

jest.mock('../../src/native/alarms');
jest.mock('../../src/native/sounds');

const HINT = 'Tap a sound to use it. Hold one to delete it.';

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
const savedSound = {
  id: 's9',
  name: 'Amma voice',
  kind: 'recorded' as const,
  durationMs: 5000,
  createdAt: 3,
  usedBy: [],
};

const pill = (pillId: string, name: string): TodayPill => ({
  pillId,
  name,
  form: 'tablet',
  amount: 1,
  startDate: '2026-10-20',
  days: null,
  exists: true,
  fromTomorrow: false,
  photoUri: null,
});

/** Today with one card, c8, at hour:minute. */
const todayWith = (
  hour: number,
  minute: number,
  pills: TodayPill[],
): Today => ({
  date: '2026-10-26',
  cards: [
    {
      alarmId: 'c8',
      hour,
      minute,
      soundId: null,
      status: 'upcoming',
      statusAt: null,
      pills,
    },
  ],
  refills: [],
});

/** The list opened from a page behind it, as the app opens it, so it has somewhere to go back to. */
function renderOverToday(params: RootStackParamList['SoundPicker']) {
  return render(
    <SafeAreaProvider>
      <NavigationContainer
        initialState={{
          index: 1,
          routes: [{ name: 'Main' }, { name: 'SoundPicker', params }],
        }}
      >
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>,
  );
}

/** Records a take in the sheet, up to "Use this sound". */
async function recordATake() {
  await fireEvent.press(await screen.findByText('Record a voice'));
  await fireEvent.press(await screen.findByLabelText('Start recording'));
  await fireEvent.press(await screen.findByLabelText('Stop recording'));
  await screen.findByText('Use this sound');
}

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
  // For the recording sheet.
  jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue('granted');
  jest.mocked(sounds.startRecording).mockResolvedValue();
  jest.mocked(sounds.stopRecording).mockResolvedValue(5000);
  jest.mocked(sounds.discardRecording).mockResolvedValue();
  jest.mocked(sounds.saveRecording).mockResolvedValue(savedSound);
  jest
    .mocked(sounds.onRecordingLevel)
    .mockReturnValue({ remove: jest.fn() } as never);
  jest
    .mocked(sounds.onRecordingAutoStopped)
    .mockReturnValue({ remove: jest.fn() } as never);
});

test('lists Default alarm tone first, then saved sounds with type and length', async () => {
  await renderApp('SoundPicker', { alarmId: 'c8', selectedSoundId: null });
  expect(await screen.findByText('My voice')).toBeTruthy();
  expect(screen.getByText("The phone's alarm")).toBeTruthy();
  expect(screen.getByText('Recorded · 0:12')).toBeTruthy();
  expect(screen.getByText('Song · 0:30')).toBeTruthy();
  const names = screen
    .getAllByTestId('sound-name')
    .map(n => n.props.children as string);
  expect(names).toEqual(['Default alarm tone', 'My voice', 'Birdsong']);
  expect(screen.getByText(HINT)).toBeTruthy();
});

test('shows the Sound screen in Malayalam', async () => {
  jest.mocked(alarms.currentLanguage).mockReturnValue('ml');
  jest.mocked(alarms.getToday).mockResolvedValue(todayWith(8, 0, []));
  await renderApp('SoundPicker', { alarmId: 'c8', selectedSoundId: null });
  expect(await screen.findByText(ml.sound.hint)).toBeTruthy();
  expect(screen.getByText(ml.sound.record)).toBeTruthy();
  expect(screen.getByText(ml.sound.import)).toBeTruthy();
  expect(await screen.findByText(`${ml.sound.recorded} · 0:12`)).toBeTruthy();
  expect(screen.getByLabelText(ml.sound.play('My voice'))).toBeTruthy();
  const names = screen
    .getAllByTestId('sound-name')
    .map(n => n.props.children as string);
  expect(names[0]).toBe(ml.common.defaultTone);
  await waitFor(() =>
    expect(headerTitles()).toEqual([ml.sound.titleAt('8:00 AM')]),
  );
});

test('the title says which pills ring at that time', async () => {
  jest
    .mocked(alarms.getToday)
    .mockResolvedValue(
      todayWith(21, 0, [pill('p1', 'Iron'), pill('p2', 'Metformin')]),
    );
  await renderApp('SoundPicker', { alarmId: 'c8', selectedSoundId: null });
  expect(
    await screen.findByText('Iron and Metformin ring together'),
  ).toBeTruthy();
  expect(headerTitles()).toEqual(['Sound for 9:00 PM']);
});

test('picking a sound sets it on the card and goes back', async () => {
  jest.mocked(alarms.getToday).mockResolvedValue(todayWith(8, 0, []));
  await renderOverToday({ alarmId: 'c8', selectedSoundId: null });
  expect(headerTitles()).toContain('Sound for 8:00 AM');
  await fireEvent.press(await screen.findByText('My voice'));
  expect(alarms.setCardSound).toHaveBeenCalledWith('c8', 's1');
  await waitFor(() => expect(screen.queryByText(HINT)).toBeNull());
  expect(headerTitles()).not.toContain('Sound for 8:00 AM');
  expect(screen.getByRole('tab', { name: 'Today' })).toBeTruthy();
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
  expect(screen.getByText(HINT)).toBeTruthy();
});

test('import of an unplayable file shows the format alert', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(sounds.importSound).mockRejectedValue({
    code: 'UNSUPPORTED_AUDIO',
  });
  await renderApp('SoundPicker', { alarmId: 'c8', selectedSoundId: null });
  await screen.findByText('My voice');
  await fireEvent.press(screen.getByText('Pick a song or file'));
  expect(alert).toHaveBeenCalledWith(
    "That file can't be played. Try an mp3, m4a, wav or ogg file.",
  );
});

test('a cancelled import does nothing', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(sounds.importSound).mockResolvedValue(null);
  await renderApp('SoundPicker', { alarmId: 'c8', selectedSoundId: null });
  await screen.findByText('My voice');
  await fireEvent.press(screen.getByText('Pick a song or file'));
  expect(alert).not.toHaveBeenCalled();
  expect(screen.getByText(HINT)).toBeTruthy();
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

describe('recording a voice', () => {
  test('Record a voice opens the sheet over the list', async () => {
    await renderApp('SoundPicker', { alarmId: 'c8', selectedSoundId: null });
    await screen.findByText('My voice');
    expect(screen.queryByLabelText('Start recording')).toBeNull();
    await fireEvent.press(screen.getByText('Record a voice'));
    expect(await screen.findByLabelText('Start recording')).toBeTruthy();
    expect(screen.getByText('My voice')).toBeTruthy();
    expect(headerTitles()).toEqual(['Sound']);
  });

  test('opening the sheet stops a sound that is playing', async () => {
    await renderApp('SoundPicker', { alarmId: 'c8', selectedSoundId: null });
    await fireEvent.press(await screen.findByTestId('preview-s1'));
    jest.mocked(sounds.stopPreview).mockClear();
    await fireEvent.press(screen.getByText('Record a voice'));
    expect(sounds.stopPreview).toHaveBeenCalled();
    expect(screen.getByTestId('preview-s1').props.accessibilityLabel).toBe(
      'Play My voice',
    );
  });

  test('closing the sheet while recording discards the recording', async () => {
    await renderApp('SoundPicker', { alarmId: 'c8', selectedSoundId: null });
    await fireEvent.press(await screen.findByText('Record a voice'));
    await fireEvent.press(await screen.findByLabelText('Start recording'));
    await screen.findByText('Tap to stop');
    expect(sounds.discardRecording).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('sheet-backdrop'));
    expect(sounds.discardRecording).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Tap to stop')).toBeNull();
    expect(screen.getByText(HINT)).toBeTruthy();
  });

  test('a new recording is used for the time, and the list goes back', async () => {
    jest.mocked(alarms.getToday).mockResolvedValue(todayWith(8, 0, []));
    await renderOverToday({ alarmId: 'c8', selectedSoundId: null });
    await recordATake();
    await fireEvent.changeText(
      screen.getByDisplayValue('My recording'),
      'Amma voice',
    );
    await fireEvent.press(screen.getByText('Use this sound'));
    expect(sounds.saveRecording).toHaveBeenCalledWith('Amma voice');
    await waitFor(() =>
      expect(alarms.setCardSound).toHaveBeenCalledWith('c8', 's9'),
    );
    await waitFor(() => expect(screen.queryByText(HINT)).toBeNull());
    expect(headerTitles()).not.toContain('Sound for 8:00 AM');
  });

  test('a saved recording that cannot be set on the card says so, and is listed', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.mocked(alarms.setCardSound).mockRejectedValueOnce(new Error('gone'));
    jest
      .mocked(sounds.listSounds)
      .mockResolvedValueOnce([voice, song])
      .mockResolvedValue([savedSound, voice, song]);
    await renderApp('SoundPicker', { alarmId: 'c8', selectedSoundId: null });
    await recordATake();
    await fireEvent.press(screen.getByText('Use this sound'));
    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith(
        'Could not change the sound',
        'Please try again.',
      ),
    );
    expect(sounds.discardRecording).not.toHaveBeenCalled();
    expect(await screen.findByText('Amma voice')).toBeTruthy();
    expect(screen.queryByText('Use this sound')).toBeNull();
    expect(screen.getByText(HINT)).toBeTruthy();
  });
});

describe('for her, on a relative’s phone', () => {
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
  const herPill = (id: string, name: string, hour: number) => ({
    id,
    name,
    form: 'tablet',
    amount: 1,
    times: [{ hour, minute: 0 }],
    startDate: '2026-10-20',
    days: null,
    photo: null,
    photoUri: null,
    remaining: null,
  });
  const forHer = { elderId: 'E', hour: 8, minute: 0, selectedSoundId: 'h1' };

  beforeEach(() => {
    jest.mocked(family.getFamily).mockResolvedValue([amma]);
    jest.mocked(family.getElderSetup).mockResolvedValue({
      editor: true,
      otherZone: false,
      heardAt: null,
      pills: [herPill('p1', 'Iron', 8), herPill('p2', 'Vitamin D', 21)],
      times: [],
      sounds: [{ id: 'h1', name: 'Bell' }],
      problem: null,
    });
    jest.mocked(family.sendSound).mockResolvedValue('c1');
  });

  test('shows her sounds and mine; choosing hers sends hers', async () => {
    await renderApp('SoundPicker', forHer);
    expect(await screen.findByText('Bell')).toBeTruthy();
    expect(screen.getByText("Amma's sounds")).toBeTruthy();
    expect(screen.getByText('My sounds')).toBeTruthy();
    const names = screen
      .getAllByTestId('sound-name')
      .map(n => n.props.children as string);
    expect(names).toEqual([
      'Default alarm tone',
      'Bell',
      'My voice',
      'Birdsong',
    ]);
    await fireEvent.press(screen.getByText('Bell'));
    expect(family.sendSound).toHaveBeenCalledWith('E', 8, 0, 'hers', 'h1');
    expect(alarms.setCardSound).not.toHaveBeenCalled();
  });

  test('the title names her pills at that time', async () => {
    await renderApp('SoundPicker', forHer);
    expect(await screen.findByText('Iron rings at this time')).toBeTruthy();
    expect(headerTitles()).toEqual(['Sound for 8:00 AM']);
  });

  test('Default tone sends default, and mine sends mine', async () => {
    await renderApp('SoundPicker', forHer);
    await fireEvent.press(await screen.findByText('Default alarm tone'));
    expect(family.sendSound).toHaveBeenCalledWith('E', 8, 0, 'default', null);
    await renderApp('SoundPicker', forHer);
    await fireEvent.press(await screen.findByText('My voice'));
    expect(family.sendSound).toHaveBeenCalledWith('E', 8, 0, 'mine', 's1');
  });

  test('TOO_BIG says the sound is too big', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest
      .mocked(family.sendSound)
      .mockRejectedValue(
        Object.assign(new Error('TOO_BIG'), { code: 'TOO_BIG' }),
      );
    await renderApp('SoundPicker', forHer);
    await fireEvent.press(await screen.findByText('Birdsong'));
    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith(
        'This sound is too big to send (over 5 MB).',
      ),
    );
  });

  test('a new recording is sent as mine', async () => {
    await renderApp('SoundPicker', forHer);
    await recordATake();
    await fireEvent.press(screen.getByText('Use this sound'));
    await waitFor(() =>
      expect(family.sendSound).toHaveBeenCalledWith('E', 8, 0, 'mine', 's9'),
    );
    expect(alarms.setCardSound).not.toHaveBeenCalled();
  });
});
