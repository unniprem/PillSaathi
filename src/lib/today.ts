import type { Strings } from '../i18n/en';
import type { DoseStatus, TodayCard } from '../native/alarms';
import { nextLabel } from './course';
import { formatTime } from './time';

const MINUTES_PER_DAY = 24 * 60;

/** Still to ring today, or ringing now. */
const COMING: DoseStatus[] = ['ringing', 'snoozed', 'upcoming'];

function clock(millis: number, is24h: boolean) {
  const d = new Date(millis);
  return formatTime(d.getHours(), d.getMinutes(), is24h);
}

/** "✓ Taken 8:02 AM", "Snoozed until 8:10 AM", "Next: tomorrow"…; empty for a card that is done. */
export function statusText(
  card: TodayCard,
  date: string,
  is24h: boolean,
  t: Strings,
) {
  const at = card.statusAt;
  switch (card.status) {
    case 'taken':
      return at === null ? t.status.taken : t.status.takenAt(clock(at, is24h));
    case 'skipped':
      return t.status.skipped;
    case 'missed':
      return t.status.missed;
    case 'ringing':
      return t.status.ringing;
    case 'snoozed':
      return at === null
        ? t.status.snoozed
        : t.status.snoozedUntil(clock(at, is24h));
    case 'upcoming':
      return t.status.upcoming;
    case 'later':
      return at === null ? '' : nextLabel(at, date, t);
    case 'notReported':
      return t.status.notReported;
    default:
      return '';
  }
}

/**
 * Today's cards (in time order) as Today shows them: the next dose to take, the ones missed, the
 * others still to come, and the ones done with.
 */
export function arrangeToday(cards: TodayCard[]): {
  next: TodayCard | null;
  missed: TodayCard[];
  later: TodayCard[];
  done: TodayCard[];
} {
  const next = cards.find(c => COMING.includes(c.status)) ?? null;
  return {
    next,
    missed: cards.filter(
      c => c.status === 'missed' || c.status === 'notReported',
    ),
    // Behind the next one: a second ring at once, the rest of the day, and times next due on
    // another day.
    later: cards.filter(
      c => c !== next && (COMING.includes(c.status) || c.status === 'later'),
    ),
    done: cards.filter(
      c =>
        c.status === 'taken' || c.status === 'skipped' || c.status === 'done',
    ),
  };
}

/**
 * Today's doses for the sky's bars: taken, missed (or skipped), and the rest still to come. A time
 * next due on another day, or with no ring left, isn't one of today's doses.
 */
export function doseCounts(cards: TodayCard[]): {
  taken: number;
  missed: number;
  rest: number;
} {
  const count = (statuses: DoseStatus[]) =>
    cards.filter(c => statuses.includes(c.status)).length;
  return {
    taken: count(['taken']),
    missed: count(['missed', 'skipped']),
    rest: count([...COMING, 'notReported']),
  };
}

/**
 * "in 6 hr 50 min" from [now] to the next [hour]:[minute] on the clock, which is tomorrow once
 * today's has passed. Counted in whole minutes on the clock, as she reads them.
 */
export function untilText(
  now: number,
  hour: number,
  minute: number,
  t: Strings,
): string {
  const d = new Date(now);
  const left =
    (hour * 60 +
      minute -
      (d.getHours() * 60 + d.getMinutes()) +
      MINUTES_PER_DAY) %
    MINUTES_PER_DAY;
  return t.today.until(Math.floor(left / 60), left % 60);
}
