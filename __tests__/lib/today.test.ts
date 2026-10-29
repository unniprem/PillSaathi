import { en } from '../../src/i18n/en';
import {
  arrangeToday,
  doseCounts,
  statusText,
  untilText,
} from '../../src/lib/today';
import type { DoseStatus, TodayCard } from '../../src/native/alarms';
import { whenChip } from '../../src/ui/sky';

function card(hour: number, status: DoseStatus, minute = 0): TodayCard {
  return {
    alarmId: `c${hour}`,
    hour,
    minute,
    soundId: null,
    pills: [],
    status,
    statusAt: null,
  };
}

test('the next dose is the first one still to come', () => {
  const r = arrangeToday([
    card(8, 'taken'),
    card(13, 'missed'),
    card(21, 'upcoming'),
    card(22, 'upcoming'),
  ]);
  expect(r.next?.hour).toBe(21);
  expect(r.later.map(c => c.hour)).toEqual([22]);
  expect(r.missed.map(c => c.hour)).toEqual([13]);
  expect(r.done.map(c => c.hour)).toEqual([8]);
});

test('a ringing dose is the next one', () => {
  const r = arrangeToday([card(8, 'taken'), card(9, 'ringing')]);
  expect(r.next?.hour).toBe(9);
});

test('a snoozed dose is the next one, and none is lost behind it', () => {
  const r = arrangeToday([
    card(8, 'snoozed'),
    card(9, 'ringing'),
    card(10, 'later'),
    card(11, 'skipped'),
    card(12, 'done'),
    card(14, 'notReported'),
  ]);
  expect(r.next?.hour).toBe(8);
  expect(r.later.map(c => c.hour)).toEqual([9, 10]);
  expect(r.done.map(c => c.hour)).toEqual([11, 12]);
  expect(r.missed.map(c => c.hour)).toEqual([14]);
});

test('with nothing still to come there is no next dose', () => {
  expect(arrangeToday([card(8, 'taken'), card(9, 'later')]).next).toBeNull();
  expect(arrangeToday([]).next).toBeNull();
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

test('a 0:30 dose at 23:00 is tonight, in 1 hr 30 min', () => {
  expect(untilText(new Date(2026, 9, 29, 23, 0).getTime(), 0, 30, en)).toBe(
    'in 1 hr 30 min',
  );
  expect(whenChip(0)).toBe('tonight');
});

test('time left reads in minutes, hours, or both', () => {
  const at = new Date(2026, 9, 29, 14, 10, 40).getTime();
  expect(untilText(at, 21, 0, en)).toBe('in 6 hr 50 min');
  expect(untilText(at, 15, 10, en)).toBe('in 1 hr');
  expect(untilText(at, 14, 35, en)).toBe('in 25 min');
  expect(untilText(at, 14, 10, en)).toBe('now');
});

test('a dose with nothing uploaded reads "Not reported yet"', () => {
  expect(statusText(card(14, 'notReported'), '2026-10-28', false, en)).toBe(
    'Not reported yet',
  );
});
