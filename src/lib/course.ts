import { formatTime } from './time';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const DAY_MS = 24 * 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, '0');

/** An ISO date at local noon, so a daylight-saving change can't move it to another day. */
function parse(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

/** Whole days from [from] to [to]. */
function daysBetween(from: string, to: string): number {
  return Math.round((parse(to).getTime() - parse(from).getTime()) / DAY_MS);
}

/** The local date of [d] as `YYYY-MM-DD`. */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(iso: string, n: number): string {
  const d = parse(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** The last day of a course of [days] days, or null when it has no end. */
export function lastDay(startDate: string, days: number | null): string | null {
  return days === null ? null : addDays(startDate, days - 1);
}

/** `Fri 30 Oct` */
export function formatDay(iso: string): string {
  const d = parse(iso);
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

/** Where [today] is in a course: "day 2 of 5", "last day", "starts tomorrow", or nothing. */
export function courseLabel(
  startDate: string,
  days: number | null,
  today: string,
): string {
  const offset = daysBetween(startDate, today);
  if (offset < 0) {
    return offset === -1 ? 'starts tomorrow' : `starts ${formatDay(startDate)}`;
  }
  if (days === null || offset >= days) {
    return '';
  }
  return offset === days - 1 ? 'last day' : `day ${offset + 1} of ${days}`;
}

/** "Starts today · last dose Fri 30 Oct, 9:00 PM" */
export function courseSummary(o: {
  startDate: string;
  days: number | null;
  times: { hour: number; minute: number }[];
  today: string;
  is24h: boolean;
}): string {
  const offset = daysBetween(o.today, o.startDate);
  let start: string;
  if (offset === 0) {
    start = 'Starts today';
  } else if (offset === 1) {
    start = 'Starts tomorrow';
  } else if (offset < 0) {
    start = `Started ${formatDay(o.startDate)}`;
  } else {
    start = `Starts ${formatDay(o.startDate)}`;
  }
  const end = lastDay(o.startDate, o.days);
  if (end === null) {
    return `${start} · no end date`;
  }
  const latest = [...o.times].sort(
    (a, b) => a.hour - b.hour || a.minute - b.minute,
  )[o.times.length - 1];
  const time = latest
    ? `, ${formatTime(latest.hour, latest.minute, o.is24h)}`
    : '';
  return `${start} · last dose ${formatDay(end)}${time}`;
}

/** "Next: tomorrow" or "Next: Wed 28 Oct", for a card whose next ring is on a later day. */
export function nextLabel(statusAt: number, today: string): string {
  const next = toISODate(new Date(statusAt));
  return next === addDays(today, 1)
    ? 'Next: tomorrow'
    : `Next: ${formatDay(next)}`;
}
