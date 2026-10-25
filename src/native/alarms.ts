import NativeAlarms from '../../specs/NativeAlarms';
import type {
  AlarmInput,
  Health,
  MissedAlarm,
  NativeAlarm,
  PickedTime,
  SetupState,
  Spec,
} from '../../specs/NativeAlarms';

export type {
  AlarmInput,
  Health,
  MissedAlarm,
  NativeAlarm as Alarm,
  PickedTime,
  SetupState,
};

export type SettingTarget =
  | 'notifications'
  | 'alarmChannel'
  | 'exactAlarm'
  | 'fullScreen'
  | 'batteryOptimization'
  | 'backgroundRestricted'
  | 'alarmVolume'
  | 'appInfo'
  | 'oemAutostart'
  | 'oemBattery';

/** The codes the native module rejects its promises with. */
export const AlarmErrors = {
  InvalidAlarm: 'INVALID_ALARM',
  NoActivity: 'NO_ACTIVITY',
  NotFound: 'NOT_FOUND',
  /** The app's storage couldn't be read or written, often because the phone is full. */
  StorageError: 'STORAGE_ERROR',
} as const;

function native(): Spec {
  if (!NativeAlarms) {
    throw new Error('PillSaathi alarms are Android-only for now');
  }
  return NativeAlarms;
}

/** All alarms, sorted by hour then minute. */
export async function listAlarms(): Promise<NativeAlarm[]> {
  return native().listAlarms();
}

/** Creates (`id: null`) or updates an alarm; rejects `INVALID_ALARM` on out-of-range input. */
export async function saveAlarm(input: AlarmInput): Promise<NativeAlarm> {
  return native().saveAlarm(input);
}

export async function setAlarmEnabled(
  id: string,
  enabled: boolean,
): Promise<NativeAlarm> {
  return native().setAlarmEnabled(id, enabled);
}

export async function deleteAlarm(id: string): Promise<void> {
  return native().deleteAlarm(id);
}

/** Re-checks the schedule; gives alarms that were missed while the app was closed. */
export async function reconcileOnAppOpen(): Promise<MissedAlarm[]> {
  return native().reconcileOnAppOpen();
}

export async function getHealth(): Promise<Health> {
  return native().getHealth();
}

/** True if the specific settings page opened; false if it fell back to App info. */
export async function openSetting(target: SettingTarget): Promise<boolean> {
  return native().openSetting(target);
}

export async function getSetupState(): Promise<SetupState> {
  return native().getSetupState();
}

export async function setSetupStepDone(
  step: string,
  done: boolean,
): Promise<void> {
  return native().setSetupStepDone(step, done);
}

export async function markSetupSeen(): Promise<void> {
  return native().markSetupSeen();
}

/** Shows the system time picker; null if cancelled. */
export async function pickTime(
  hour: number,
  minute: number,
): Promise<PickedTime | null> {
  return native().pickTime(hour, minute);
}

/** The phone's 12/24-hour setting. */
export function is24HourFormat(): boolean {
  return native().is24HourFormat();
}
