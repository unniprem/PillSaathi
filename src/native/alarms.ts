import NativeAlarms from '../../specs/NativeAlarms';
import type {
  DoseTime,
  Health,
  MissedAlarm,
  NativePill,
  NativeTodayCard,
  NativeTodayPill,
  PickedTime,
  PillInput as NativePillInput,
  SetupState,
  Spec,
} from '../../specs/NativeAlarms';
import type { PillForm } from '../lib/amount';

export type { DoseTime, Health, MissedAlarm, PickedTime, PillForm, SetupState };

/** A dose's state on the Today screen. */
export type DoseStatus =
  | 'taken'
  | 'skipped'
  | 'missed'
  | 'ringing'
  | 'snoozed'
  | 'upcoming'
  | 'later'
  | 'done';

export type Pill = Omit<NativePill, 'form'> & { form: PillForm };
export type PillInput = Omit<NativePillInput, 'form'> & { form: PillForm };
export type TodayPill = Omit<NativeTodayPill, 'form'> & { form: PillForm };
export type TodayCard = Omit<NativeTodayCard, 'status' | 'pills'> & {
  status: DoseStatus;
  pills: TodayPill[];
};
export type Today = { date: string; cards: TodayCard[] };

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
  InvalidPill: 'INVALID_PILL',
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

/** All pills, in the order they were added. */
export async function listPills(): Promise<Pill[]> {
  return (await native().listPills()) as Pill[];
}

/**
 * Adds (`id: null`) or edits a pill, then the native side rebuilds the time cards. Rejects
 * `INVALID_PILL` on out-of-range input and `NOT_FOUND` for an unknown id.
 */
export async function savePill(input: PillInput): Promise<Pill> {
  return (await native().savePill(input)) as Pill;
}

export async function deletePill(id: string): Promise<void> {
  return native().deletePill(id);
}

/** Today's time cards with their pills and statuses. */
export async function getToday(): Promise<Today> {
  return (await native().getToday()) as Today;
}

/** Sets a card's sound; null is the default alarm tone. Rejects `NOT_FOUND`. */
export async function setCardSound(
  alarmId: string,
  soundId: string | null,
): Promise<void> {
  return native().setCardSound(alarmId, soundId);
}

/** Marks a missed or skipped dose taken now. Rejects `NOT_FOUND`. */
export async function markDoseTaken(
  date: string,
  hour: number,
  minute: number,
): Promise<void> {
  return native().markDoseTaken(date, hour, minute);
}

/** Re-checks the schedule; gives doses that were missed while the app was closed, named after their pills. */
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
