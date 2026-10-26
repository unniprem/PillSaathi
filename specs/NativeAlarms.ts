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

export type NativeToday = { date: string; cards: NativeTodayCard[] };

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

export interface Spec extends TurboModule {
  listPills(): Promise<NativePill[]>; // in the order they were added
  savePill(input: PillInput): Promise<NativePill>; // INVALID_PILL, NOT_FOUND
  deletePill(id: string): Promise<void>;
  getToday(): Promise<NativeToday>;
  setCardSound(alarmId: string, soundId: string | null): Promise<void>; // NOT_FOUND
  markDoseTaken(date: string, hour: number, minute: number): Promise<void>; // NOT_FOUND
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
}

export default TurboModuleRegistry.get<Spec>('NativeAlarms');
