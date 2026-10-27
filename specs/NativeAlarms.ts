import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export type DoseTime = { hour: number; minute: number };

export type NativePill = {
  id: string;
  name: string;
  form: string; // tablet | capsule | syrup | drops
  amount: number;
  times: DoseTime[]; // sorted
  startDate: string; // YYYY-MM-DD
  days: number | null; // null = no end
  photo: string | null; // the photo's file name
  photoUri: string | null; // file:// URI to show it
  remaining: number | null; // tablets or capsules left; null = not counted
};

export type PillInput = {
  id: string | null; // null = new pill
  name: string;
  form: string;
  amount: number;
  times: DoseTime[];
  startsTomorrow: boolean; // new pills only; an edit keeps its start date
  days: number | null;
  photo: string | null; // a name from pickPhoto, or null for none
  remaining: number | null; // 0 to 999 in halves, tablets and capsules only; null = not counted
  remainingChanged: boolean; // false keeps the stored count, which a Taken may have lowered
};

export type NativeTodayPill = {
  pillId: string;
  name: string;
  form: string;
  amount: number;
  startDate: string | null; // null when the pill was deleted since
  days: number | null;
  exists: boolean;
  fromTomorrow: boolean; // added to the card after today's dose was recorded
  photoUri: string | null; // the pill's photo now; null when it has none or was deleted
};

export type NativeTodayCard = {
  alarmId: string | null; // null when the card is gone but today has a record
  hour: number;
  minute: number;
  soundId: string | null;
  status: string; // taken | skipped | missed | ringing | snoozed | upcoming | later | done
  statusAt: number | null;
  pills: NativeTodayPill[];
};

/** A counted pill running low or out. */
export type NativeRefill = {
  pillId: string;
  name: string;
  form: string; // tablet | capsule
  remaining: number;
  daysLeft: number;
  level: string; // low | out
};

export type NativeToday = {
  date: string;
  cards: NativeTodayCard[];
  refills: NativeRefill[]; // in the order the pills were added
};

/** A pill as a dose recorded it, with whether it still exists and its photo now. */
export type NativeHistoryPill = {
  pillId: string;
  name: string;
  form: string;
  amount: number;
  exists: boolean;
  photoUri: string | null;
};

export type NativeHistoryDose = {
  date: string; // YYYY-MM-DD, the day it was due
  hour: number;
  minute: number;
  outcome: string; // taken | skipped | missed
  at: number; // when it was answered or found missed
  marked: boolean; // marked taken later
  pills: NativeHistoryPill[];
};

export type NativeHistory = {
  today: string;
  oldest: string | null; // the oldest record kept
  firstDayOfWeek: number; // 0 = Sunday, as Date.getDay()
  doses: NativeHistoryDose[]; // by date, then time
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
export type PickedPhoto = { name: string; uri: string };
export type LanguageOption = { code: string; label: string; draft: boolean };
export type AppSettings = {
  language: string; // the one the app speaks now
  readAloud: boolean;
  languages: LanguageOption[]; // the ones to offer, in order
};

export interface Spec extends TurboModule {
  listPills(): Promise<NativePill[]>; // in the order they were added
  savePill(input: PillInput): Promise<NativePill>; // INVALID_PILL, NOT_FOUND
  deletePill(id: string): Promise<void>;
  getToday(): Promise<NativeToday>;
  setCardSound(alarmId: string, soundId: string | null): Promise<void>; // NOT_FOUND
  markDoseTaken(date: string, hour: number, minute: number): Promise<void>; // NOT_FOUND
  getHistory(from: string, to: string): Promise<NativeHistory>; // YYYY-MM-DD, both inclusive
  reconcileOnAppOpen(): Promise<MissedAlarm[]>;
  getHealth(): Promise<Health>;
  openSetting(target: string): Promise<boolean>; // true = specific page, false = App info fallback
  getSetupState(): Promise<SetupState>;
  setSetupStepDone(step: string, done: boolean): Promise<void>;
  markSetupSeen(): Promise<void>;
  pickTime(hour: number, minute: number): Promise<PickedTime | null>; // null = cancelled
  is24HourFormat(): boolean;
  // camera | gallery; null = cancelled. PHOTO_ERROR, NO_ACTIVITY
  pickPhoto(source: string): Promise<PickedPhoto | null>;
  getSettings(): Promise<AppSettings>;
  currentLanguage(): string; // never throws; read without waiting on the store
  setLanguage(code: string): Promise<void>; // INVALID_LANGUAGE
  setReadAloud(on: boolean): Promise<void>;
  // spoken | english (no voice for the app's language) | none (no voice at all)
  tryReadAloud(): Promise<string>;
}

export default TurboModuleRegistry.get<Spec>('NativeAlarms');
