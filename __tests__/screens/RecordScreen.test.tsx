import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert, Linking, PermissionsAndroid } from 'react-native';
import * as alarms from '../../src/native/alarms';
import * as sounds from '../../src/native/sounds';
import { renderApp } from '../helpers/renderApp';

jest.mock('../../src/native/alarms');
jest.mock('../../src/native/sounds');

let autoStopped: (ms: number) => void;

afterEach(() => {
  jest.restoreAllMocks();
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue('granted');
  jest.mocked(alarms.listAlarms).mockResolvedValue([]);
  jest.mocked(alarms.reconcileOnAppOpen).mockResolvedValue([]);
  jest.mocked(alarms.is24HourFormat).mockReturnValue(false);
  jest.mocked(sounds.listSounds).mockResolvedValue([]);
  jest.mocked(sounds.startRecording).mockResolvedValue();
  jest.mocked(sounds.stopRecording).mockResolvedValue(5000);
  jest.mocked(sounds.discardRecording).mockResolvedValue();
  jest.mocked(sounds.previewRecording).mockResolvedValue();
  jest.mocked(sounds.stopPreview).mockResolvedValue();
  jest.mocked(sounds.saveRecording).mockResolvedValue({
    id: 's9',
    name: 'Amma voice',
    kind: 'recorded',
    durationMs: 5000,
    createdAt: 1,
    usedBy: [],
  });
  const sub = () => ({ remove: jest.fn() } as never);
  jest.mocked(sounds.onRecordingLevel).mockImplementation(() => sub());
  jest.mocked(sounds.onPreviewEnded).mockImplementation(() => sub());
  jest.mocked(sounds.onRecordingAutoStopped).mockImplementation(cb => {
    autoStopped = cb;
    return sub();
  });
});

async function startRecording() {
  await renderApp('Record');
  await fireEvent.press(await screen.findByLabelText('Start recording'));
  await screen.findByText('Tap to stop');
}

test('the idle screen shows 0:00 and the limit hint', async () => {
  await renderApp('Record');
  expect(await screen.findByText('0:00')).toBeTruthy();
  expect(screen.getByText('Up to 2:00')).toBeTruthy();
});

test('record then stop shows Listen, Redo and the name field', async () => {
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
  await fireEvent.press(screen.getByLabelText('Stop recording'));
  expect(await screen.findByText('▶ Listen')).toBeTruthy();
  expect(screen.getByText('↺ Redo')).toBeTruthy();
  expect(screen.getByDisplayValue('My recording')).toBeTruthy();
  expect(screen.getByText('0:05')).toBeTruthy();
});

test('a denied microphone offers the settings page', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
  jest.mocked(PermissionsAndroid.request).mockResolvedValue('denied');
  await renderApp('Record');
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

test('a too-short recording shows the retry alert and returns to idle', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(sounds.stopRecording).mockRejectedValue({
    code: 'RECORDING_TOO_SHORT',
  });
  await startRecording();
  await fireEvent.press(screen.getByLabelText('Stop recording'));
  expect(alert).toHaveBeenCalledWith(
    'That recording was too short. Try again.',
  );
  expect(await screen.findByText('Up to 2:00')).toBeTruthy();
  expect(screen.queryByText('▶ Listen')).toBeNull();
});

test('leaving while recording discards the take', async () => {
  await startRecording();
  expect(sounds.discardRecording).not.toHaveBeenCalled();
  await screen.unmount();
  expect(sounds.discardRecording).toHaveBeenCalled();
});

test('leaving after a save does not discard the take', async () => {
  await startRecording();
  await fireEvent.press(screen.getByLabelText('Stop recording'));
  await fireEvent.press(await screen.findByText('Use this sound'));
  await screen.unmount();
  expect(sounds.discardRecording).not.toHaveBeenCalled();
});

test('auto-stop at the limit moves to the recorded state', async () => {
  await startRecording();
  await act(async () => autoStopped(120000));
  expect(await screen.findByText('▶ Listen')).toBeTruthy();
  expect(screen.getByText('2:00')).toBeTruthy();
});

test('auto-stop with 0 shows the lost-take alert and returns to idle', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await startRecording();
  await act(async () => autoStopped(0));
  expect(alert).toHaveBeenCalledWith(
    "That recording couldn't be saved. Try again.",
  );
  expect(await screen.findByText('Up to 2:00')).toBeTruthy();
});

test('Redo discards the take and returns to idle', async () => {
  await startRecording();
  await fireEvent.press(screen.getByLabelText('Stop recording'));
  await fireEvent.press(await screen.findByText('↺ Redo'));
  expect(sounds.discardRecording).toHaveBeenCalled();
  expect(await screen.findByText('Up to 2:00')).toBeTruthy();
});

test('Listen plays the take and toggles to Stop', async () => {
  await startRecording();
  await fireEvent.press(screen.getByLabelText('Stop recording'));
  await fireEvent.press(await screen.findByText('▶ Listen'));
  expect(sounds.previewRecording).toHaveBeenCalled();
  await fireEvent.press(await screen.findByText('■ Stop'));
  expect(sounds.stopPreview).toHaveBeenCalled();
});

test('Use this sound saves with the typed name', async () => {
  await startRecording();
  await fireEvent.press(screen.getByLabelText('Stop recording'));
  await fireEvent.changeText(
    await screen.findByDisplayValue('My recording'),
    'Amma voice',
  );
  await fireEvent.press(screen.getByText('Use this sound'));
  expect(sounds.saveRecording).toHaveBeenCalledWith('Amma voice');
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const savedSound = {
  id: 's9',
  name: 'Amma voice',
  kind: 'recorded' as const,
  durationMs: 5000,
  createdAt: 1,
  usedBy: [],
};

async function recordedScreen() {
  await startRecording();
  await fireEvent.press(screen.getByLabelText('Stop recording'));
  await screen.findByText('Use this sound');
}

test('leaving while start is pending discards once start resolves', async () => {
  const start = deferred<void>();
  jest.mocked(sounds.startRecording).mockReturnValue(start.promise);
  await renderApp('Record');
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
  await recordedScreen();
  await fireEvent.press(screen.getByText('Use this sound'));
  await screen.unmount();
  await act(async () => save.resolve(savedSound));
  expect(sounds.discardRecording).not.toHaveBeenCalled();
});

test('leaving while save is pending then save fails discards the take', async () => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  const save = deferred<typeof savedSound>();
  jest.mocked(sounds.saveRecording).mockReturnValue(save.promise);
  await recordedScreen();
  await fireEvent.press(screen.getByText('Use this sound'));
  await screen.unmount();
  expect(sounds.discardRecording).not.toHaveBeenCalled();
  await act(async () => save.reject(new Error('disk full')));
  expect(sounds.discardRecording).toHaveBeenCalledTimes(1);
});

test('a second tap on Use this sound saves only once', async () => {
  const save = deferred<typeof savedSound>();
  jest.mocked(sounds.saveRecording).mockReturnValue(save.promise);
  await recordedScreen();
  await fireEvent.press(screen.getByText('Use this sound'));
  await fireEvent.press(screen.getByText('Use this sound'));
  expect(sounds.saveRecording).toHaveBeenCalledTimes(1);
  await act(async () => save.resolve(savedSound));
});

test('an unexpected stop failure discards the take and returns to idle', async () => {
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
  expect(await screen.findByText('Up to 2:00')).toBeTruthy();
});
