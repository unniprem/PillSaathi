import type { Strings } from '../i18n';
import type { FamilyTally } from '../../specs/NativeFamily';
import { FamilyErrors } from '../native/family';
import { formatDay, toISODate } from './course';
import { formatTime } from './time';

/** "482 913": a link code in two groups of three, easier to read out over the phone. */
export function formatCode(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}

/** The message Send code shares, telling a relative what to do with the code. */
export function shareMessage(code: string, t: Strings): string {
  return t.family.shareMessage(formatCode(code));
}

/** The error code a native family call rejected with, if any. */
export function errorCode(e: unknown): string | undefined {
  return (e as { code?: string } | null)?.code;
}

/** What to tell the user when a family call fails: "No internet" only when it was the internet. */
export function familyMessage(e: unknown, t: Strings): string {
  switch (errorCode(e)) {
    case FamilyErrors.Offline:
      return t.family.offline;
    case FamilyErrors.GoogleFailed:
      return t.family.googleFailed;
    case FamilyErrors.NotSetUp:
      return t.family.notSetUp;
    default:
      return t.family.failed;
  }
}

/**
 * "2 taken · 1 missed · 1 not reported · 1 later": an elder's day, nonzero parts only, or
 * "Nothing due today".
 */
export function tallyText(tally: FamilyTally, t: Strings): string {
  const parts = [
    tally.taken && t.family.taken(tally.taken),
    tally.missed && t.family.missed(tally.missed),
    tally.skipped && t.family.skipped(tally.skipped),
    tally.notReported && t.family.notReported(tally.notReported),
    tally.later && t.family.later(tally.later),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : t.family.nothingDue;
}

/** "Ravi" from the Google account's "Ravi Kumar", for Today's greeting; null when it has no name. */
export function firstName(name: string): string | null {
  return name.trim().split(/\s+/)[0] || null;
}

/** When her phone was heard from: "1:12 PM" today ([today], YYYY-MM-DD), else "Tue 27 Oct, 8:05 AM". */
export function heardText(
  at: number,
  today: string,
  is24h: boolean,
  t: Strings,
): string {
  const d = new Date(at);
  const time = formatTime(d.getHours(), d.getMinutes(), is24h);
  const day = toISODate(d);
  return day === today ? time : t.family.dayAndTime(formatDay(day, t), time);
}
