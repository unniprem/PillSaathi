import type { EventSubscription } from 'react-native';
import NativeSounds from '../../specs/NativeSounds';
import type { NativeSound, Spec } from '../../specs/NativeSounds';

export type SoundKind = 'recorded' | 'imported';
export type Sound = Omit<NativeSound, 'kind'> & { kind: SoundKind };

/** The codes the native module rejects its promises with. */
export const SoundErrors = {
  UnsupportedAudio: 'UNSUPPORTED_AUDIO',
  TooShort: 'RECORDING_TOO_SHORT',
  NoActivity: 'NO_ACTIVITY',
  Busy: 'BUSY',
  NotFound: 'NOT_FOUND',
  MicPermission: 'MIC_PERMISSION',
  /** The app's storage couldn't be read or written, often because the phone is full. */
  StorageError: 'STORAGE_ERROR',
} as const;

function native(): Spec {
  if (!NativeSounds) {
    throw new Error('PillSaathi alarms are Android-only for now');
  }
  return NativeSounds;
}

function toSound(sound: NativeSound): Sound {
  return {
    ...sound,
    kind: sound.kind === 'recorded' ? 'recorded' : 'imported',
  };
}

/** Saved sounds, newest first; `usedBy` names the alarms that use each one. */
export async function listSounds(): Promise<Sound[]> {
  return (await native().listSounds()).map(toSound);
}

/** Opens the system file picker and copies the chosen file in; null if cancelled. */
export async function importSound(): Promise<Sound | null> {
  const sound = await native().importSound();
  return sound ? toSound(sound) : null;
}

export async function startRecording(): Promise<void> {
  return native().startRecording();
}

/** Stops recording and resolves the take's length in ms. */
export async function stopRecording(): Promise<number> {
  return native().stopRecording();
}

/** Stops any recording and deletes the unsaved take. Safe to call in any state. */
export async function discardRecording(): Promise<void> {
  return native().discardRecording();
}

export async function saveRecording(name: string): Promise<Sound> {
  return toSound(await native().saveRecording(name));
}

export async function previewSound(id: string): Promise<void> {
  return native().previewSound(id);
}

/** Plays the unsaved take; `onPreviewEnded` reports it as 'recording'. */
export async function previewRecording(): Promise<void> {
  return native().previewRecording();
}

export async function stopPreview(): Promise<void> {
  return native().stopPreview();
}

/** Deletes the sound; alarms that used it go back to the default alarm tone. */
export async function deleteSound(id: string): Promise<void> {
  return native().deleteSound(id);
}

/** The microphone level, 0..1, about every 100 ms while recording. */
export function onRecordingLevel(
  cb: (level: number) => void,
): EventSubscription {
  return native().onRecordingLevel(cb);
}

/** Recording stopped by itself at the 2:00 limit; gives the take's length in ms. */
export function onRecordingAutoStopped(
  cb: (durationMs: number) => void,
): EventSubscription {
  return native().onRecordingAutoStopped(cb);
}

/** A preview played to the end (or failed): the sound id, or 'recording'. */
export function onPreviewEnded(cb: (id: string) => void): EventSubscription {
  return native().onPreviewEnded(cb);
}
