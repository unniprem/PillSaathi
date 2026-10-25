import type { TurboModule, CodegenTypes } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export type NativeSound = {
  id: string;
  name: string;
  kind: string;
  durationMs: number;
  createdAt: number;
  usedBy: string[];
};

export interface Spec extends TurboModule {
  listSounds(): Promise<NativeSound[]>; // newest first; usedBy = names of alarms using it
  importSound(): Promise<NativeSound | null>; // null = picker cancelled
  startRecording(): Promise<void>;
  stopRecording(): Promise<number>; // durationMs of the take
  discardRecording(): Promise<void>; // safe to call in any state
  saveRecording(name: string): Promise<NativeSound>;
  previewSound(id: string): Promise<void>;
  previewRecording(): Promise<void>; // plays the unsaved take
  stopPreview(): Promise<void>;
  deleteSound(id: string): Promise<void>; // file + record; engine.clearSound(id)
  readonly onRecordingLevel: CodegenTypes.EventEmitter<number>; // 0..1, ~every 100 ms while recording
  readonly onRecordingAutoStopped: CodegenTypes.EventEmitter<number>; // durationMs, at the 2:00 limit
  readonly onPreviewEnded: CodegenTypes.EventEmitter<string>; // sound id, or 'recording'
}

export default TurboModuleRegistry.get<Spec>('NativeSounds');
