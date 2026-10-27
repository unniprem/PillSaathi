import NativeAlarms from '../../specs/NativeAlarms';
import type {
  AppSettings,
  DoseTime,
  Health,
  LanguageOption,
  MissedAlarm,
  NativeHistory,
  NativeHistoryDose,
  NativeHistoryPill,
  NativePill,
  NativeRefill,
  NativeTodayCard,
  NativeTodayPill,
  PickedPhoto,
  PickedTime,
  PillInput as NativePillInput,
  SetupState,
  Spec,
} from '../../specs/NativeAlarms';
import type { PillForm } from '../lib/amount';

export type {
  AppSettings,
  DoseTime,
  Health,
  LanguageOption,
  MissedAlarm,
  PickedPhoto,
  PickedTime,
  PillForm,
  SetupState,
};

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
export type Refill = Omit<NativeRefill, 'form' | 'level'> & {
  form: PillForm;
  level: 'low' | 'out';
};
export type Today = { date: string; cards: TodayCard[]; refills: Refill[] };

export type HistoryPill = Omit<NativeHistoryPill, 'form'> & { form: PillForm };
export type HistoryDose = Omit<NativeHistoryDose, 'outcome' | 'pills'> & {
  outcome: 'taken' | 'skipped' | 'missed';
  pills: HistoryPill[];
};
export type History = Omit<NativeHistory, 'doses'> & { doses: HistoryDose[] };

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
  | 'oemBattery'
  | 'tts';

/** The codes the native module rejects its promises with. */
export const AlarmErrors = {
  InvalidPill: 'INVALID_PILL',
  /** A language the app doesn't offer (a draft one in a release build, say). */
  InvalidLanguage: 'INVALID_LANGUAGE',
  NoActivity: 'NO_ACTIVITY',
  NotFound: 'NOT_FOUND',
  /** A photo couldn't be taken in, or another pick is still open. */
  PhotoError: 'PHOTO_ERROR',
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

/** Today's time cards with their pills and statuses, and the counted pills running low. */
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

/**
 * The doses recorded from `from` through `to` (YYYY-MM-DD, both included), by date and time, with
 * the oldest record's date and the phone's first day of the week.
 */
export async function getHistory(from: string, to: string): Promise<History> {
  return (await native().getHistory(from, to)) as History;
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

/**
 * Takes a pill photo with the phone's camera or picks one from the gallery, and stores it. Saving
 * the pill with its `name` keeps it. Null if cancelled; rejects `PHOTO_ERROR` or `NO_ACTIVITY`.
 */
export async function pickPhoto(
  source: 'camera' | 'gallery',
): Promise<PickedPhoto | null> {
  return native().pickPhoto(source);
}

/** The language the app speaks, whether it reads pills aloud, and the languages it offers. */
export async function getSettings(): Promise<AppSettings> {
  return native().getSettings();
}

/** The language the app speaks now, read at once; the ringing screen uses the same one. */
export function currentLanguage(): string {
  return native().currentLanguage();
}

/** Saves the app's language. Rejects `INVALID_LANGUAGE` for one it doesn't offer. */
export async function setLanguage(code: string): Promise<void> {
  return native().setLanguage(code);
}

export async function setReadAloud(on: boolean): Promise<void> {
  return native().setReadAloud(on);
}

/**
 * How Try it went: `spoken` in the app's language, `english` because the phone has no voice for
 * it, or `none` because it has no voice at all.
 */
export type TryResult = 'spoken' | 'english' | 'none';

/**
 * Reads today's first pills aloud as a ring would, at alarm volume. Resolves once the voice
 * starts, or at once with `none`.
 */
export async function tryReadAloud(): Promise<TryResult> {
  return (await native().tryReadAloud()) as TryResult;
}
