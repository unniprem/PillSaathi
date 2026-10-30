import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import {
  Alert,
  DeviceEventEmitter,
  Linking,
  PermissionsAndroid,
  StyleSheet,
} from 'react-native';
import * as alarms from '../../src/native/alarms';
import * as sounds from '../../src/native/sounds';
import { hi } from '../../src/i18n/hi';
import RecordSheet from '../../src/components/RecordSheet';
import { mockAlarmsDefaults } from '../helpers/nativeMocks';
import { renderWithI18n } from '../helpers/renderWithI18n';

jest.mock('../../src/native/alarms');
jest.mock('../../src/native/sounds');

let autoStopped: (ms: number) => void;
const onSaved = jest.fn();
const onClose = jest.fn();

const savedSound = {
  id: 's9',
  name: 'Amma voice',
  kind: 'recorded' as const,
  durationMs: 5000,
  createdAt: 1,
  usedBy: [],
};

afterEach(() => {
  jest.restoreAllMocks();
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue('granted');
  mockAlarmsDefaults();
  jest.mocked(sounds.startRecording).mockResolvedValue();
  jest.mocked(sounds.stopRecording).mockResolvedValue(5000);
  jest.mocked(sounds.discardRecording).mockResolvedValue();
  jest.mocked(sounds.previewRecording).mockResolvedValue();
  jest.mocked(sounds.stopPreview).mockResolvedValue();
  jest.mocked(sounds.saveRecording).mockResolvedValue(savedSound);
  const sub = () => ({ remove: jest.fn() } as never);
  jest.mocked(sounds.onRecordingLevel).mockImplementation(() => sub());
  jest.mocked(sounds.onPreviewEnded).mockImplementation(() => sub());
  jest.mocked(sounds.onRecordingAutoStopped).mockImplementation(cb => {
    autoStopped = cb;
    return sub();
  });
});

function renderSheet() {
  return renderWithI18n(
    <RecordSheet visible onClose={onClose} onSaved={onSaved} />,
  );
}

async function startRecording() {
  await renderSheet();
  await fireEvent.press(await screen.findByLabelText('Start recording'));
  await screen.findByText('Tap to stop');
}

async function recordedSheet() {
  await startRecording();
  await fireEvent.press(screen.getByLabelText('Stop recording'));
  await screen.findByText('Use this sound');
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test('the ready sheet offers Start recording and says the limit', async () => {
  await renderSheet();
  expect(
    await screen.findByRole('header', { name: 'Record a voice' }),
  ).toBeTruthy();
  expect(screen.getByText('Start recording')).toBeTruthy();
  expect(screen.getByText('Up to 2:00')).toBeTruthy();
});

test('shows the sheet in Hindi', async () => {
  jest.mocked(alarms.currentLanguage).mockReturnValue('hi');
  await renderSheet();
  expect(await screen.findByText(hi.record.upTo)).toBeTruthy();
  expect(screen.getByRole('header', { name: hi.record.title })).toBeTruthy();
  await fireEvent.press(screen.getByLabelText(hi.record.start));
  expect(PermissionsAndroid.request).toHaveBeenCalledWith(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    {
      title: hi.record.allowMic,
      message: hi.record.micMessage,
      buttonPositive: hi.common.ok,
    },
  );
  expect(await screen.findByText(hi.record.tapToStop)).toBeTruthy();
  expect(
    screen.getByRole('header', { name: hi.record.recording }),
  ).toBeTruthy();
  await fireEvent.press(screen.getByLabelText(hi.record.stop));
  expect(await screen.findByText(hi.record.use)).toBeTruthy();
  expect(screen.getByText(hi.record.listen)).toBeTruthy();
  expect(screen.getByText(hi.record.redo)).toBeTruthy();
  expect(screen.getByDisplayValue(hi.record.defaultName)).toBeTruthy();
});

test('record then stop shows Listen, Record again and the name field', async () => {
  await startRecording();
  expect(PermissionsAndroid.request).toHaveBeenCalledWith(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    {
      title: 'Allow microphone',
      message: 'PillSaathi needs the microphone to record your alarm sound.',
      buttonPositive: 'OK',
    },
  );
  expect(sounds.startRecording).toHaveBeenCalled();
  expect(screen.getByRole('header', { name: 'Recording…' })).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Stop recording'));
  expect(await screen.findByText('Listen')).toBeTruthy();
  expect(screen.getByText('Record again')).toBeTruthy();
  expect(screen.getByDisplayValue('My recording')).toBeTruthy();
  expect(screen.getByText('0:05')).toBeTruthy();
});

test('a denied microphone offers the settings page', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
  jest.mocked(PermissionsAndroid.request).mockResolvedValue('denied');
  await renderSheet();
  await fireEvent.press(await screen.findByLabelText('Start recording'));
  expect(alert).toHaveBeenCalledWith(
    'Microphone access is off',
    expect.any(String),
    expect.any(Array),
  );
  expect(sounds.startRecording).not.toHaveBeenCalled();
  const buttons = alert.mock.calls[0][2]!;
  await act(async () => {
    buttons.find(b => b.text === 'Open settings')!.onPress!();
  });
  expect(open).toHaveBeenCalled();
});

test('a too-short recording shows the retry alert and returns to ready', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(sounds.stopRecording).mockRejectedValue({
    code: 'RECORDING_TOO_SHORT',
  });
  await startRecording();
  await fireEvent.press(screen.getByLabelText('Stop recording'));
  expect(alert).toHaveBeenCalledWith(
    'That recording was too short. Try again.',
  );
  expect(await screen.findByText('Start recording')).toBeTruthy();
  expect(screen.queryByText('Listen')).toBeNull();
});

test('leaving while recording discards the take', async () => {
  await startRecording();
  expect(sounds.discardRecording).not.toHaveBeenCalled();
  await screen.unmount();
  expect(sounds.discardRecording).toHaveBeenCalled();
});

test('leaving after a save does not discard the take', async () => {
  await recordedSheet();
  await fireEvent.press(screen.getByText('Use this sound'));
  await screen.unmount();
  expect(sounds.discardRecording).not.toHaveBeenCalled();
});

test('auto-stop at the limit moves to the recorded state', async () => {
  await startRecording();
  await act(async () => autoStopped(120000));
  expect(await screen.findByText('Listen')).toBeTruthy();
  expect(screen.getByText('2:00')).toBeTruthy();
});

test('auto-stop with 0 shows the lost-take alert and returns to ready', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await startRecording();
  await act(async () => autoStopped(0));
  expect(alert).toHaveBeenCalledWith(
    "That recording couldn't be saved. Try again.",
  );
  expect(await screen.findByText('Start recording')).toBeTruthy();
});

test('Record again discards the take and returns to ready', async () => {
  await recordedSheet();
  await fireEvent.press(screen.getByText('Record again'));
  expect(sounds.discardRecording).toHaveBeenCalled();
  expect(await screen.findByText('Start recording')).toBeTruthy();
});

test('Listen plays the take and toggles to Stop', async () => {
  await recordedSheet();
  await fireEvent.press(screen.getByText('Listen'));
  expect(sounds.previewRecording).toHaveBeenCalled();
  await fireEvent.press(await screen.findByText('Stop'));
  expect(sounds.stopPreview).toHaveBeenCalled();
});

test('Use this sound saves with the typed name and hands the sound over', async () => {
  await recordedSheet();
  await fireEvent.changeText(
    screen.getByDisplayValue('My recording'),
    'Amma voice',
  );
  await fireEvent.press(screen.getByText('Use this sound'));
  expect(sounds.saveRecording).toHaveBeenCalledWith('Amma voice');
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(savedSound));
});

test('leaving while start is pending discards once start resolves', async () => {
  const start = deferred<void>();
  jest.mocked(sounds.startRecording).mockReturnValue(start.promise);
  await renderSheet();
  await fireEvent.press(await screen.findByLabelText('Start recording'));
  await waitFor(() => expect(sounds.startRecording).toHaveBeenCalled());
  await screen.unmount();
  expect(sounds.discardRecording).not.toHaveBeenCalled();
  await act(async () => start.resolve());
  expect(sounds.discardRecording).toHaveBeenCalledTimes(1);
});

test('leaving while save is pending does not discard the saved take', async () => {
  const save = deferred<typeof savedSound>();
  jest.mocked(sounds.saveRecording).mockReturnValue(save.promise);
  await recordedSheet();
  await fireEvent.press(screen.getByText('Use this sound'));
  await screen.unmount();
  await act(async () => save.resolve(savedSound));
  expect(sounds.discardRecording).not.toHaveBeenCalled();
});

test('leaving while save is pending then save fails discards the take', async () => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  const save = deferred<typeof savedSound>();
  jest.mocked(sounds.saveRecording).mockReturnValue(save.promise);
  await recordedSheet();
  await fireEvent.press(screen.getByText('Use this sound'));
  await screen.unmount();
  expect(sounds.discardRecording).not.toHaveBeenCalled();
  await act(async () => save.reject(new Error('disk full')));
  expect(sounds.discardRecording).toHaveBeenCalledTimes(1);
  expect(onSaved).not.toHaveBeenCalled();
});

test('a second tap on Use this sound saves only once', async () => {
  const save = deferred<typeof savedSound>();
  jest.mocked(sounds.saveRecording).mockReturnValue(save.promise);
  await recordedSheet();
  await fireEvent.press(screen.getByText('Use this sound'));
  await fireEvent.press(screen.getByText('Use this sound'));
  expect(sounds.saveRecording).toHaveBeenCalledTimes(1);
  await act(async () => save.resolve(savedSound));
  expect(onSaved).toHaveBeenCalledTimes(1);
});

test('an unexpected stop failure discards the take and returns to ready', async () => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(sounds.stopRecording).mockRejectedValue(new Error('boom'));
  await startRecording();
  await fireEvent.press(screen.getByLabelText('Stop recording'));
  expect(alert).toHaveBeenCalledWith(
    'Could not save the recording',
    'Please try again.',
  );
  expect(sounds.discardRecording).toHaveBeenCalledTimes(1);
  expect(await screen.findByText('Start recording')).toBeTruthy();
});

// The keyboard covers the sheet rather than shrinking the page, so the sheet rises above it.
test('the sheet rises above the keyboard while the name is typed', async () => {
  await recordedSheet();
  const bottom = () =>
    StyleSheet.flatten(screen.getByTestId('sheet').props.style).paddingBottom;
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
