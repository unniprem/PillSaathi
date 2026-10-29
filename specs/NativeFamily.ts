import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export type LinkCode = {
  code: string; // 6 digits
  expiresAt: number; // ms
  qrUri: string; // file:// PNG of the scan code
};

export type Person = { uid: string; name: string; email: string };

/** Someone who can see this phone's pills; canChange = may also change them. */
export type Follower = {
  uid: string;
  name: string;
  email: string;
  canChange: boolean;
};

export type Relative = { name: string; email: string };

export type Follow = {
  elderId: string;
  name: string; // what the relative calls her
  phone: string | null; // for the Call button
  delayMinutes: number | null; // 15 | 30 | 60; null = Off
};

// The elder views mirror NativeAlarms' types; codegen can't read types from another spec file.

export type ElderPillTime = { hour: number; minute: number };

export type ElderPill = {
  id: string;
  name: string;
  form: string;
  amount: number;
  times: ElderPillTime[];
  startDate: string;
  days: number | null;
  photo: string | null;
  photoUri: string | null; // her photo's small copy, cached on this phone
  remaining: number | null;
};

export type ElderTodayPill = {
  pillId: string;
  name: string;
  form: string;
  amount: number;
  startDate: string | null;
  days: number | null;
  exists: boolean;
  fromTomorrow: boolean;
  photoUri: string | null;
};

export type ElderTodayCard = {
  alarmId: string | null;
  hour: number;
  minute: number;
  soundId: string | null;
  status: string; // as NativeAlarms, plus notReported
  statusAt: number | null;
  pills: ElderTodayPill[];
};

export type FamilyRefill = {
  pillId: string;
  name: string;
  form: string;
  remaining: number;
  daysLeft: number;
  level: string; // low | out
};

export type NativeElderToday = {
  date: string; // her date
  cards: ElderTodayCard[];
  refills: FamilyRefill[];
  heardAt: number | null;
  otherZone: boolean; // her times differ from this phone's
};

export type ElderHistoryPill = {
  pillId: string;
  name: string;
  form: string;
  amount: number;
  exists: boolean;
  photoUri: string | null;
};

export type ElderHistoryDose = {
  date: string;
  hour: number;
  minute: number;
  outcome: string;
  at: number;
  marked: boolean;
  pills: ElderHistoryPill[];
};

export type NativeElderHistory = {
  today: string; // her date
  oldest: string | null;
  firstDayOfWeek: number; // this phone's
  doses: ElderHistoryDose[];
};

export type FamilyTally = {
  taken: number;
  skipped: number;
  missed: number;
  notReported: number;
  later: number;
};

export type NativeFamilyCard = {
  elderId: string;
  name: string;
  phone: string | null;
  delayMinutes: number | null;
  heardAt: number | null; // shifted to her wall clock
  silent: boolean; // not heard from for 12 hours
  abandoned: boolean; // not heard from for 30 days
  otherZone: boolean;
  tally: FamilyTally;
  refills: FamilyRefill[];
};

/** One of her dose times and the sound it rings with; soundName null = default tone. */
export type ElderTime = {
  hour: number;
  minute: number;
  soundId: string | null;
  soundName: string | null;
};

export type ElderSound = { id: string; name: string };

/** What the relative's phone knows to change her pills, from its last read of her copy. */
export type ElderSetup = {
  editor: boolean; // her phone lets this one change her pills
  otherZone: boolean;
  heardAt: number | null; // shifted to her wall clock
  pills: ElderPill[];
  times: ElderTime[];
  sounds: ElderSound[];
  problem: string | null; // notifications | alarmChannel | exactAlarms | fullScreen | battery | restricted | setup
};

/** A pill to send to her phone, as the pill page saves one, with what to do with its photo. */
export type RemotePillInput = {
  id: string | null; // null = new pill
  name: string;
  form: string;
  amount: number;
  times: ElderPillTime[];
  startsTomorrow: boolean;
  days: number | null;
  photo: string | null; // this phone's photo name when photoChoice is 'new'
  remaining: number | null;
  remainingChanged: boolean;
  photoChoice: string; // keep | none | new
};

/** A change sent to her phone, and where it stands. Times are shifted to her wall clock. */
export type ChangeView = {
  id: string;
  kind: string; // pill | deletePill | sound | invalid
  status: string; // pending | applying | applied | rejected
  reason: string | null;
  mine: boolean;
  byName: string;
  at: number | null;
  doneAt: number | null;
  pillId: string | null; // null for a new pill
  pillName: string | null;
  hour: number | null;
  minute: number | null;
  soundName: string | null; // null = default tone
};

export interface Spec extends TurboModule {
  // The elder's side of linking.
  createLinkCode(): Promise<LinkCode>; // NOT_SET_UP, OFFLINE
  watchRequests(on: boolean): Promise<void>; // one listener on pending requests while on
  pendingRequests(): Promise<Person[]>; // from memory, no reads
  answerRequest(uid: string, allow: boolean): Promise<void>;
  listFollowers(): Promise<Follower[]>; // [] when never shared
  setCanChange(uid: string, on: boolean): Promise<void>;
  checkIn(): Promise<number>; // applies changes family sent; how many
  watchChanges(on: boolean): Promise<void>; // applies them live while on
  removeFollower(uid: string): Promise<void>;

  // The relative's side.
  signedInRelative(): Promise<Relative | null>;
  signInWithGoogle(): Promise<Relative | null>; // null = cancelled; NO_ACTIVITY, NOT_SET_UP, OFFLINE
  scanCode(): Promise<string | null>; // the 6 digits; null = cancelled
  requestFollow(code: string): Promise<string>; // elderId; BAD_CODE, NOT_SIGNED_IN, OFFLINE
  followState(elderId: string): Promise<string>; // pending | allowed | denied | expired; NOT_FOUND
  saveFollow(follow: Follow): Promise<void>;
  listFollows(): Promise<Follow[]>;
  unfollow(elderId: string, deleteCopy: boolean): Promise<void>;

  // The elders' days on the relative's phone. Every instant is shifted to her wall clock.
  getFamily(): Promise<NativeFamilyCard[]>; // from this phone only
  refreshFamily(): Promise<NativeFamilyCard[]>; // reads each elder; offline gives the cached cards
  getElderToday(elderId: string): Promise<NativeElderToday>; // NOT_FOUND
  getElderHistory(
    elderId: string,
    from: string,
    to: string,
  ): Promise<NativeElderHistory>; // NOT_FOUND, PERMISSION, OFFLINE
  listElderPills(elderId: string): Promise<ElderPill[]>; // NOT_FOUND

  // Changing her pills from the relative's phone.
  getElderSetup(elderId: string): Promise<ElderSetup>; // NOT_FOUND; no reads
  sendPill(elderId: string, input: RemotePillInput): Promise<string>; // change id; NOT_ALLOWED, INVALID_PILL, OFFLINE
  sendDeletePill(elderId: string, pillId: string): Promise<string>;
  sendSound(
    elderId: string,
    hour: number,
    minute: number,
    kind: string, // default | hers | mine
    soundId: string | null,
  ): Promise<string>; // TOO_BIG
  listChanges(elderId: string): Promise<ChangeView[]>; // newest first; the last 7 days
  cancelChange(elderId: string, changeId: string): Promise<void>; // ALREADY_TAKEN
}

export default TurboModuleRegistry.get<Spec>('NativeFamily');
