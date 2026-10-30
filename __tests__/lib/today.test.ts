import { en } from '../../src/i18n/en';
import {
  arrangeToday,
  doseAt,
  doseCounts,
  pillsDueOn,
  refreshAt,
  statusText,
  untilText,
} from '../../src/lib/today';
import type { DoseStatus, TodayCard, TodayPill } from '../../src/native/alarms';
import { whenChip } from '../../src/ui/sky';

const DATE = '2026-10-29';
const at = (d: number, h: number, m = 0) =>
  new Date(2026, 9, d, h, m).getTime();
/** The clock at [h]:[m] on DATE. */
const clock = (h: number, m = 0) => at(29, h, m);

function pill(more: Partial<TodayPill> = {}): TodayPill {
  return {
    pillId: 'p1',
    name: 'Iron',
    form: 'tablet',
    amount: 1,
    startDate: '2026-10-20',
    days: null,
    exists: true,
    fromTomorrow: false,
    photoUri: null,
    ...more,
  };
}

function card(
  hour: number,
  status: DoseStatus,
  minute = 0,
  more: Partial<TodayCard> = {},
): TodayCard {
  return {
    alarmId: `c${hour}`,
    hour,
    minute,
    soundId: null,
    pills: [pill()],
    status,
    statusAt: null,
    ...more,
  };
}

const arrange = (cards: TodayCard[], now = clock(12)) =>
  arrangeToday(cards, DATE, now);

test('the next dose is the first one still to come', () => {
  const r = arrange([
    card(8, 'taken'),
    card(13, 'missed'),
    card(21, 'upcoming'),
    card(22, 'upcoming'),
  ]);
  expect(r.next).toEqual({ card: expect.anything(), day: DATE, at: clock(21) });
  expect(r.next?.card.hour).toBe(21);
  expect(r.later.map(c => c.hour)).toEqual([22]);
  expect(r.missed.map(c => c.hour)).toEqual([13]);
  expect(r.done.map(c => c.hour)).toEqual([8]);
  expect(r.after).toBeNull();
});

test('a ringing dose is the next one', () => {
  const r = arrange([card(8, 'taken'), card(9, 'ringing')]);
  expect(r.next?.card.hour).toBe(9);
});

test('a snoozed dose is the next one, due when its snooze ends, and none is lost behind it', () => {
  const r = arrange([
    card(8, 'snoozed', 0, { statusAt: clock(8, 10) }),
    card(9, 'ringing'),
    card(10, 'later', 0, { statusAt: at(30, 10) }),
    card(11, 'skipped'),
    card(12, 'done'),
    card(14, 'notReported'),
  ]);
  expect(r.next?.card.hour).toBe(8);
  expect(r.next?.at).toBe(clock(8, 10));
  expect(r.later.map(c => c.hour)).toEqual([9]);
  expect(r.otherDays.map(c => c.hour)).toEqual([10]);
  expect(r.done.map(c => c.hour)).toEqual([11, 12]);
  expect(r.missed.map(c => c.hour)).toEqual([14]);
});

test("a time next due on another day isn't under Later today", () => {
  const r = arrange([
    card(9, 'later', 0, { statusAt: at(30, 9) }),
    card(21, 'upcoming'),
    card(22, 'upcoming'),
  ]);
  expect(r.later.map(c => c.hour)).toEqual([22]);
  expect(r.otherDays.map(c => c.hour)).toEqual([9]);
});

test('with nothing still to come there is no next dose', () => {
  const r = arrange([
    card(8, 'taken'),
    card(9, 'later', 0, { statusAt: at(30, 9) }),
  ]);
  expect(r.next).toBeNull();
  expect(arrange([]).next).toBeNull();
  expect(arrange([]).after).toBeNull();
});

describe('with nothing left today', () => {
  test("the first ring after today is tomorrow's first time", () => {
    const r = arrange([card(8, 'taken'), card(21, 'skipped')], clock(22));
    expect(r.next).toBeNull();
    expect(r.after?.card.hour).toBe(8);
    expect(r.after?.day).toBe('2026-10-30');
    expect(r.after?.at).toBe(at(30, 8));
  });

  test('a time recorded today whose pill is gone rings no more', () => {
    const r = arrange(
      [
        card(7, 'taken', 0, {
          alarmId: null,
          pills: [pill({ exists: false, startDate: null })],
        }),
        card(8, 'taken'),
      ],
      clock(22),
    );
    expect(r.after?.card.hour).toBe(8);
  });

  test('a course that ends today rings no more', () => {
    const r = arrange(
      [
        // Started on the 25th for five days: the 29th is its last.
        card(7, 'taken', 0, {
          pills: [pill({ startDate: '2026-10-25', days: 5 })],
        }),
        card(8, 'taken', 0, {
          pills: [
            pill({ startDate: '2026-10-25', days: 5 }),
            pill({ pillId: 'p2', startDate: '2026-10-25', days: 6 }),
          ],
        }),
        card(12, 'done'),
      ],
      clock(22),
    );
    expect(r.after?.card.hour).toBe(8);
  });

  test('a time next due on another day says when it rings', () => {
    const r = arrange(
      [
        card(7, 'later', 0, { statusAt: at(31, 7) }),
        card(9, 'later', 0, { statusAt: at(30, 9) }),
      ],
      clock(22),
    );
    expect(r.after?.card.hour).toBe(9);
    expect(r.after?.at).toBe(at(30, 9));
    // The 31st's 7:00 comes after the 30th's 9:00.
    expect(r.after?.day).toBe('2026-10-30');
  });

  test('none, when nothing rings again', () => {
    const r = arrange(
      [
        card(8, 'taken', 0, {
          pills: [pill({ startDate: '2026-10-25', days: 5 })],
        }),
      ],
      clock(22),
    );
    expect(r.next).toBeNull();
    expect(r.after).toBeNull();
  });
});

describe('a dose after midnight', () => {
  test('a 0:30 dose at 23:00 is the next dose, tonight, in 1 hr 30 min', () => {
    const now = clock(23);
    const r = arrange([card(0, 'taken', 30), card(8, 'taken')], now);
    expect(r.next?.card.hour).toBe(0);
    expect(r.next?.day).toBe('2026-10-30');
    expect(r.next?.at).toBe(at(30, 0, 30));
    expect(r.after).toBeNull();
    expect(untilText(now, r.next!.at, en)).toBe('in 1 hr 30 min');
    expect(whenChip(0)).toBe('tonight');
  });

  test('one added today after its time is the next dose too, and not under Other days', () => {
    const r = arrange(
      [card(0, 'later', 30, { statusAt: at(30, 0, 30) }), card(8, 'taken')],
      clock(23),
    );
    expect(r.next?.card.hour).toBe(0);
    expect(r.otherDays).toEqual([]);
  });

  test('a ring in the morning is tomorrow, not tonight', () => {
    const r = arrange([card(5, 'taken'), card(21, 'taken')], clock(23));
    expect(r.next).toBeNull();
    expect(r.after?.card.hour).toBe(5);
  });

  test('seen in the small hours, the next night is a day away, not tonight', () => {
    const r = arrange([card(1, 'taken')], clock(2));
    expect(r.next).toBeNull();
    expect(r.after?.at).toBe(at(30, 1));
  });
});

test('the pills due on a day: on their course then, not deleted, none from tomorrow', () => {
  const c = card(0, 'taken', 30, {
    pills: [
      pill({ name: 'Ends today', startDate: '2026-10-25', days: 5 }),
      pill({ name: 'Gone', exists: false, startDate: null }),
      pill({ name: 'Added since', fromTomorrow: true }),
      pill({ name: 'Starts tomorrow', startDate: '2026-10-30', days: 5 }),
    ],
  });
  expect(pillsDueOn(c, '2026-10-30')).toEqual([
    pill({ name: 'Added since' }),
    pill({ name: 'Starts tomorrow', startDate: '2026-10-30', days: 5 }),
  ]);
});

describe('when the cards on screen go out of date', () => {
  test("at the next dose's time, or when its snooze ends", () => {
    const next = arrange([card(21, 'upcoming')]).next;
    expect(refreshAt(next, DATE)).toBe(clock(21));
    const snoozed = arrange([
      card(8, 'snoozed', 0, { statusAt: clock(8, 10) }),
    ]).next;
    expect(refreshAt(snoozed, DATE)).toBe(clock(8, 10));
  });

  test('at midnight, with nothing left today or with a dose tonight', () => {
    expect(refreshAt(null, DATE)).toBe(at(30, 0));
    const tonight = arrange([card(0, 'taken', 30)], clock(23)).next;
    expect(refreshAt(tonight, DATE)).toBe(at(30, 0));
  });
});

test('counts taken, missed and the rest', () => {
  expect(
    doseCounts([
      card(8, 'taken'),
      card(9, 'missed'),
      card(10, 'skipped'),
      card(21, 'upcoming'),
    ]),
  ).toEqual({ taken: 1, missed: 2, rest: 1 });
});

test('a time that does not ring today is not counted', () => {
  // later: next on another day, such as a pill that starts tomorrow; done: no ring left.
  expect(
    doseCounts([card(8, 'taken'), card(9, 'later'), card(10, 'done')]),
  ).toEqual({ taken: 1, missed: 0, rest: 0 });
});

test('a dose is due at its time on its day', () => {
  expect(doseAt('2026-10-30', 0, 30)).toBe(at(30, 0, 30));
});

test('time left reads in minutes, hours, or both', () => {
  const now = new Date(2026, 9, 29, 14, 10, 40).getTime();
  expect(untilText(now, clock(21), en)).toBe('in 6 hr 50 min');
  expect(untilText(now, clock(15, 10), en)).toBe('in 1 hr');
  expect(untilText(now, clock(14, 35), en)).toBe('in 25 min');
  expect(untilText(now, clock(14, 10), en)).toBe('now');
});

test('a dose whose time has passed is due now, not in a day', () => {
  expect(untilText(clock(21, 1), clock(21), en)).toBe('now');
  expect(untilText(clock(23, 59), clock(21), en)).toBe('now');
});

test('a dose with nothing uploaded reads "Not reported yet"', () => {
  expect(statusText(card(14, 'notReported'), '2026-10-28', false, en)).toBe(
    'Not reported yet',
  );
});
