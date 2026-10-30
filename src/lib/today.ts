import type { Strings } from '../i18n/en';
import type { DoseStatus, TodayCard, TodayPill } from '../native/alarms';
import { addDays, lastDay, nextLabel, toISODate } from './course';
import { formatTime } from './time';

const MINUTE_MS = 60_000;

/** The hour the morning starts, as the Tonight chip and the skies count it. */
const MORNING = 5;

/** Still to ring today, or ringing now. */
const COMING: DoseStatus[] = ['ringing', 'snoozed', 'upcoming'];

/** A dose to come: its time's card, the day it is for (`YYYY-MM-DD`), and when it is due. */
export type Due = { card: TodayCard; day: string; at: number };

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

/** [hour]:[minute] on [date] (`YYYY-MM-DD`), by the phone's clock. */
export function doseAt(date: string, hour: number, minute: number): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, hour, minute).getTime();
}

/** Whether [pill] is taken on [day]: not deleted, and its course has begun and not yet ended. */
function onCourse(pill: TodayPill, day: string): boolean {
  if (!pill.exists || pill.startDate === null || pill.startDate > day) {
    return false;
  }
  const last = lastDay(pill.startDate, pill.days);
  return last === null || last >= day;
}

/** The pills [card]'s time rings for on [day], a day after today; none is "from tomorrow" then. */
export function pillsDueOn(card: TodayCard, day: string): TodayPill[] {
  return card.pills
    .filter(p => onCourse(p, day))
    .map(p => ({ ...p, fromTomorrow: false }));
}

/**
 * When [card]'s time rings after today ([date]). One next due on another day says when; any other
 * with an alarm rings tomorrow while one of its pills is taken then. Null when it rings no more:
 * a time kept only by today's record, or courses that end today.
 */
function ringAfterToday(card: TodayCard, date: string): number | null {
  if (card.status === 'later') {
    return card.statusAt;
  }
  if (card.alarmId === null || card.status === 'done') {
    return null;
  }
  const tomorrow = addDays(date, 1);
  return pillsDueOn(card, tomorrow).length > 0
    ? doseAt(tomorrow, card.hour, card.minute)
    : null;
}

/**
 * Today's cards (in time order) as Today shows them, at [now] on [date]: the next dose to take,
 * the ones missed, the others still to come today, those next due on another day, and the ones
 * done with.
 *
 * The next dose is the first still to ring today. With none left, a dose after midnight but
 * before the morning is tonight's, and is the next dose too: the day isn't "all done" with a
 * dose an hour or two away. Otherwise [after] is the first ring after today, for "Tomorrow,
 * 8:00 AM"; null when nothing rings again.
 */
export function arrangeToday(
  cards: TodayCard[],
  date: string,
  now: number,
): {
  next: Due | null;
  after: Due | null;
  missed: TodayCard[];
  later: TodayCard[];
  otherDays: TodayCard[];
  done: TodayCard[];
} {
  const today = cards.find(c => COMING.includes(c.status)) ?? null;
  let next: Due | null = null;
  let after: Due | null = null;
  if (today) {
    // A snoozed dose is due again when its snooze ends.
    const snoozeEnd = today.status === 'snoozed' ? today.statusAt : null;
    next = {
      card: today,
      day: date,
      at: snoozeEnd ?? doseAt(date, today.hour, today.minute),
    };
  } else {
    for (const card of cards) {
      const at = ringAfterToday(card, date);
      if (at !== null && (after === null || at < after.at)) {
        after = { card, day: toISODate(new Date(at)), at };
      }
    }
    if (after && isTonight(after, date, now)) {
      next = after;
      after = null;
    }
  }
  return {
    next,
    after,
    missed: cards.filter(
      c => c.status === 'missed' || c.status === 'notReported',
    ),
    // Behind the next one: a second ring at once, and the rest of the day.
    later: cards.filter(c => c !== today && COMING.includes(c.status)),
    // Next due on another day, such as a pill that starts tomorrow; tonight's is the next dose.
    otherDays: cards.filter(c => c.status === 'later' && c !== next?.card),
    done: cards.filter(
      c =>
        c.status === 'taken' || c.status === 'skipped' || c.status === 'done',
    ),
  };
}

/**
 * Whether [ring], after today ([date]), is tonight's: after midnight but before the morning, and
 * not seen in the small hours already ([now]), when the next night is a day away.
 */
function isTonight(ring: Due, date: string, now: number): boolean {
  return (
    ring.day === addDays(date, 1) &&
    new Date(ring.at).getHours() < MORNING &&
    new Date(now).getHours() >= MORNING
  );
}

/**
 * When the cards read for [date] go out of date: once the [next] dose is due (and should be
 * ringing), or at midnight, when the day turns. Today reads them again then.
 */
export function refreshAt(next: Due | null, date: string): number {
  const midnight = doseAt(addDays(date, 1), 0, 0);
  return next ? Math.min(next.at, midnight) : midnight;
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
 * "in 6 hr 50 min" from [now] until a dose due [at], counted in whole minutes on the clock, as
 * she reads them; "now" once it is due, never a day's wrap.
 */
export function untilText(now: number, at: number, t: Strings): string {
  const left = Math.max(
    0,
    Math.floor(at / MINUTE_MS) - Math.floor(now / MINUTE_MS),
  );
  return t.today.until(Math.floor(left / 60), left % 60);
}
