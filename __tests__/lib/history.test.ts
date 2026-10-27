import {
  addMonths,
  byDate,
  dayState,
  monthGrid,
  monthOf,
  monthRange,
  summarize,
  weekdays,
} from '../../src/lib/history';
import type { HistoryDose } from '../../src/native/alarms';

type Outcome = HistoryDose['outcome'];
const doses = (...outcomes: Outcome[]) =>
  outcomes.map(outcome => ({ outcome }));
const many = (n: number, outcome: Outcome) =>
  Array.from({ length: n }, () => ({ outcome }));

/** The days of [month] from [from] to [to], as `YYYY-MM-DD`. */
const days = (month: string, from: number, to: number) =>
  Array.from(
    { length: to - from + 1 },
    (_, i) => `${month}-${String(from + i).padStart(2, '0')}`,
  );

it('colours a day by its doses', () => {
  expect(dayState([])).toBe('empty');
  expect(dayState(doses('taken', 'taken'))).toBe('all');
  expect(dayState(doses('taken', 'missed'))).toBe('some');
  expect(dayState(doses('skipped', 'taken'))).toBe('some');
  expect(dayState(doses('skipped', 'missed'))).toBe('none');
});

it('summarize floors 199 of 200 to 99', () => {
  expect(summarize([...many(199, 'taken'), ...doses('missed')])).toEqual({
    taken: 199,
    total: 200,
    percent: 99,
  });
  expect(
    summarize([
      ...many(46, 'taken'),
      ...many(3, 'missed'),
      ...doses('skipped'),
    ]),
  ).toEqual({ taken: 46, total: 50, percent: 92 });
  expect(summarize(doses('missed', 'skipped'))).toEqual({
    taken: 0,
    total: 2,
    percent: 0,
  });
  expect(summarize([])).toEqual({ taken: 0, total: 0, percent: null });
});

it('steps months across years', () => {
  expect(monthOf('2026-10-26')).toBe('2026-10');
  expect(addMonths('2026-01', -1)).toBe('2025-12');
  expect(addMonths('2026-12', 1)).toBe('2027-01');
  expect(addMonths('2026-10', -13)).toBe('2025-09');
  expect(addMonths('2026-10', 0)).toBe('2026-10');
});

it('ranges a month up to today', () => {
  expect(monthRange('2026-10', '2026-10-25')).toEqual({
    from: '2026-10-01',
    to: '2026-10-25',
  });
  expect(monthRange('2026-09', '2026-10-25')).toEqual({
    from: '2026-09-01',
    to: '2026-09-30',
  });
  expect(monthRange('2028-02', '2028-03-01')).toEqual({
    from: '2028-02-01',
    to: '2028-02-29',
  });
});

it('lays out October 2026 from Sunday and from Monday', () => {
  // 1 October 2026 is a Thursday.
  const oct = (d: number) => `2026-10-${String(d).padStart(2, '0')}`;
  expect(monthGrid('2026-10', 0)).toEqual([
    [null, null, null, null, oct(1), oct(2), oct(3)],
    days('2026-10', 4, 10),
    days('2026-10', 11, 17),
    days('2026-10', 18, 24),
    days('2026-10', 25, 31),
  ]);
  expect(monthGrid('2026-10', 1)).toEqual([
    [null, null, null, oct(1), oct(2), oct(3), oct(4)],
    days('2026-10', 5, 11),
    days('2026-10', 12, 18),
    days('2026-10', 19, 25),
    [...days('2026-10', 26, 31), null],
  ]);
});

it('needs no blank row when the month starts on the first weekday', () => {
  // 1 February 2026 is a Sunday, and February 2026 has 28 days: four full rows.
  expect(monthGrid('2026-02', 0)).toEqual([
    days('2026-02', 1, 7),
    days('2026-02', 8, 14),
    days('2026-02', 15, 21),
    days('2026-02', 22, 28),
  ]);
});

it('lays out a leap February from Saturday', () => {
  // 1 February 2028 is a Tuesday: Sat, Sun and Mon are blank, and Saturday the 5th starts row 2.
  const grid = monthGrid('2028-02', 6);
  expect(grid[0]).toEqual([null, null, null, ...days('2028-02', 1, 4)]);
  expect(grid[1][0]).toBe('2028-02-05');
  expect(grid[grid.length - 1]).toEqual([
    ...days('2028-02', 26, 29),
    null,
    null,
    null,
  ]);
  grid.forEach(row => expect(row).toHaveLength(7));
  expect(grid.flat().filter(d => d !== null)).toEqual(days('2028-02', 1, 29));
});

it('orders the weekday header from the first day', () => {
  expect(weekdays(0)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  expect(weekdays(1)).toEqual([1, 2, 3, 4, 5, 6, 0]);
  expect(weekdays(6)).toEqual([6, 0, 1, 2, 3, 4, 5]);
});

it('groups doses by date in their order', () => {
  const dose = (date: string, hour: number): HistoryDose => ({
    date,
    hour,
    minute: 0,
    outcome: 'taken',
    at: 0,
    marked: false,
    pills: [],
  });
  const a = dose('2026-10-06', 8);
  const b = dose('2026-10-06', 21);
  const c = dose('2026-10-07', 8);
  const grouped = byDate([a, b, c]);
  expect([...grouped.keys()]).toEqual(['2026-10-06', '2026-10-07']);
  expect(grouped.get('2026-10-06')).toEqual([a, b]);
  expect(grouped.get('2026-10-07')).toEqual([c]);
});
