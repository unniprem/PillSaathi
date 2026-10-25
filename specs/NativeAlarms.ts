import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export type NativeAlarm = {
  id: string;
  hour: number;
  minute: number;
  days: number[]; // ISO: 1 = Mon … 7 = Sun; empty = one-time
  name: string;
  soundId: string | null;
  enabled: boolean;
  nextTriggerAt: number | null;
  snoozeUntil: number | null;
};

export type AlarmInput = {
  id: string | null; // null = new alarm
  hour: number;
  minute: number;
  days: number[];
  name: string;
  soundId: string | null;
};

export type Health = {
  notificationsEnabled: boolean;
  alarmChannelEnabled: boolean;
  exactAlarmAllowed: boolean;
  fullScreenAllowed: boolean;
  ignoringBatteryOptimizations: boolean;
  backgroundRestricted: boolean;
  alarmVolumeLow: boolean;
};

export type SetupState = { seen: boolean; doneSteps: string[] };
export type MissedAlarm = { id: string; name: string; dueAt: number };
export type PickedTime = { hour: number; minute: number };

export interface Spec extends TurboModule {
  listAlarms(): Promise<NativeAlarm[]>; // sorted by hour, minute
  saveAlarm(input: AlarmInput): Promise<NativeAlarm>; // INVALID_ALARM on bad input
  setAlarmEnabled(id: string, enabled: boolean): Promise<NativeAlarm>;
  deleteAlarm(id: string): Promise<void>;
  reconcileOnAppOpen(): Promise<MissedAlarm[]>;
  getHealth(): Promise<Health>;
  openSetting(target: string): Promise<boolean>; // true = specific page, false = App info fallback
  getSetupState(): Promise<SetupState>;
  setSetupStepDone(step: string, done: boolean): Promise<void>;
  markSetupSeen(): Promise<void>;
  pickTime(hour: number, minute: number): Promise<PickedTime | null>; // null = cancelled
  is24HourFormat(): boolean;
}

export default TurboModuleRegistry.get<Spec>('NativeAlarms');
