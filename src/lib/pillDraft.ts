import type { DoseTime, Pill, PillInput } from '../native/alarms';
import { AMOUNT_RULES } from './amount';
import type { PillForm } from './amount';

/** A preset number of days, "Other…" (typed), or "No end". Nothing is chosen for a new pill. */
export type Duration = 5 | 10 | 30 | 'other' | 'none';

export const PRESETS: (5 | 10 | 30)[] = [5, 10, 30];
export const MAX_TIMES = 6;
const MAX_DAYS = 365;
/** Tablets left: up to 999, in halves. Empty means not counted. */
const COUNT = /^\d{1,3}(\.[05])?$/;

/** Morning, afternoon and night, ready to tick when adding a pill. */
export const QUICK_TIMES: DoseTime[] = [
  { hour: 8, minute: 0 },
  { hour: 13, minute: 30 },
  { hour: 21, minute: 0 },
];

/** A pill as it is being added or changed, before it is saved. */
export type PillDraft = {
  /** null for a new pill. */
  id: string | null;
  name: string;
  form: PillForm;
  amount: number;
  /** In time order. */
  times: DoseTime[];
  duration: Duration | null;
  /** The days typed for "Other…". */
  otherDays: string;
  /** New pills only; an edit keeps its start date. */
  startsTomorrow: boolean;
  /** An edit's start date; null for a new pill. */
  startDate: string | null;
  /** The photo's file name; saving without it would delete the pill's photo. */
  photo: string | null;
  photoUri: string | null;
  /**
   * The photo the pill had when it was loaded. On a relative's phone her phone keeps its own
   * copy while [photo] is still this one.
   */
  savedPhoto: string | null;
  /** Tablets left as typed; empty means not counted. */
  count: string;
  /** The count is sent as changed only once touched, so one a Taken lowered isn't put back. */
  countChanged: boolean;
};

export type Step = 1 | 2 | 3 | 4 | 5;

export const sameTime = (a: DoseTime, b: DoseTime) =>
  a.hour === b.hour && a.minute === b.minute;
export const byTime = (a: DoseTime, b: DoseTime) =>
  a.hour - b.hour || a.minute - b.minute;

/** Only tablets and capsules are counted. */
export const isCountable = (form: PillForm) =>
  form === 'tablet' || form === 'capsule';

/** The days a duration stands for: a number, null for no end, or undefined when not valid yet. */
export function daysOf(
  duration: Duration | null,
  other: string,
): number | null | undefined {
  if (duration === null) {
    return undefined;
  }
  if (duration === 'none') {
    return null;
  }
  if (duration === 'other') {
    const n = /^\d+$/.test(other) ? Number(other) : NaN;
    return n >= 1 && n <= MAX_DAYS ? n : undefined;
  }
  return duration;
}

export function emptyDraft(): PillDraft {
  return {
    id: null,
    name: '',
    form: 'tablet',
    amount: AMOUNT_RULES.tablet.initial,
    times: [],
    duration: null,
    otherDays: '',
    startsTomorrow: false,
    startDate: null,
    photo: null,
    photoUri: null,
    savedPhoto: null,
    count: '',
    countChanged: false,
  };
}

export function draftFromPill(p: Pill): PillDraft {
  let duration: Duration = 'other';
  if (p.days === null) {
    duration = 'none';
  } else if ((PRESETS as number[]).includes(p.days)) {
    duration = p.days as Duration;
  }
  return {
    id: p.id,
    name: p.name,
    form: p.form,
    amount: p.amount,
    times: [...p.times].sort(byTime),
    duration,
    otherDays: duration === 'other' ? String(p.days) : '',
    startsTomorrow: false,
    startDate: p.startDate,
    photo: p.photo,
    photoUri: p.photoUri,
    savedPhoto: p.photo,
    count: p.remaining === null ? '' : String(p.remaining),
    countChanged: false,
  };
}

/** [count] plus [n], as the field shows it; a count that isn't a number yet counts as 0. */
export function addToCount(count: string, n: number): string {
  return String((COUNT.test(count) ? Number(count) : 0) + n);
}

/** Whether [step] of adding a pill is answered: Next waits until it is. */
export function stepReady(d: PillDraft, step: Step): boolean {
  switch (step) {
    case 1:
      return d.name.trim() !== '';
    case 2:
      return true;
    case 3:
      return d.times.length > 0;
    case 4:
      return daysOf(d.duration, d.otherDays) !== undefined;
    case 5:
      return !isCountable(d.form) || d.count === '' || COUNT.test(d.count);
  }
}

/** Whether the draft can be saved: every step is answered. */
export function draftReady(d: PillDraft): boolean {
  return ([1, 2, 3, 4, 5] as Step[]).every(step => stepReady(d, step));
}

/** What `savePill` takes. Only for a draft that is ready. */
export function toPillInput(d: PillDraft): PillInput {
  const days = daysOf(d.duration, d.otherDays);
  if (days === undefined) {
    throw new Error('The pill has no duration yet');
  }
  return {
    id: d.id,
    name: d.name.trim(),
    form: d.form,
    amount: d.amount,
    times: d.times,
    startsTomorrow: d.id ? false : d.startsTomorrow,
    days,
    photo: d.photo,
    remaining: isCountable(d.form) && d.count !== '' ? Number(d.count) : null,
    remainingChanged: d.countChanged,
  };
}
