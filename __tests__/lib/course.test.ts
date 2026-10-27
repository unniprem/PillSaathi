import {
  addDays,
  courseLabel,
  courseSummary,
  formatDay,
  lastDay,
  nextLabel,
  toISODate,
} from '../../src/lib/course';
import { hi } from '../../src/i18n/hi';
import { ml } from '../../src/i18n/ml';

test('toISODate gives the local date', () => {
  expect(toISODate(new Date(2026, 9, 26, 23, 59))).toBe('2026-10-26');
  expect(toISODate(new Date(2026, 0, 5, 0, 1))).toBe('2026-01-05');
});

test('addDays crosses month ends', () => {
  expect(addDays('2026-10-30', 2)).toBe('2026-11-01');
  expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  expect(addDays('2026-10-26', 0)).toBe('2026-10-26');
});

test('lastDay is the Nth day of the course, or none', () => {
  expect(lastDay('2026-10-26', 5)).toBe('2026-10-30');
  expect(lastDay('2026-10-26', 1)).toBe('2026-10-26');
  expect(lastDay('2026-10-26', null)).toBeNull();
});

test('formatDay names the weekday, day and month', () => {
  expect(formatDay('2026-10-30')).toBe('Fri 30 Oct');
  expect(formatDay('2026-10-28')).toBe('Wed 28 Oct');
  expect(formatDay('2027-01-03')).toBe('Sun 3 Jan');
});

test('names days and months in Malayalam', () => {
  expect(formatDay('2026-10-30', ml)).toBe('വെള്ളി 30 ഒക്ടോ');
  expect(formatDay('2027-01-03', hi)).toBe('रवि 3 जन');
  expect(courseLabel('2026-10-26', 5, '2026-10-27', ml)).toBe(ml.course.dayOf(2, 5));
  expect(nextLabel(new Date(2026, 9, 27, 8).getTime(), '2026-10-26', hi)).toBe(
    hi.status.nextTomorrow,
  );
});

test('courseLabel says where today is in the course', () => {
  expect(courseLabel('2026-10-26', 5, '2026-10-27')).toBe('day 2 of 5');
  expect(courseLabel('2026-10-26', 5, '2026-10-30')).toBe('last day');
  expect(courseLabel('2026-10-26', 1, '2026-10-26')).toBe('last day');
  expect(courseLabel('2026-10-27', 5, '2026-10-26')).toBe('starts tomorrow');
  expect(courseLabel('2026-10-20', null, '2026-10-26')).toBe('');
});

test('courseSummary says when the course starts and its last dose', () => {
  expect(
    courseSummary({
      startDate: '2026-10-26',
      days: 5,
      times: [
        { hour: 8, minute: 0 },
        { hour: 21, minute: 0 },
      ],
      today: '2026-10-26',
      is24h: false,
    }),
  ).toBe('Starts today · last dose Fri 30 Oct, 9:00 PM');
  expect(
    courseSummary({
      startDate: '2026-10-27',
      days: null,
      times: [{ hour: 8, minute: 0 }],
      today: '2026-10-26',
      is24h: false,
    }),
  ).toBe('Starts tomorrow · no end date');
  expect(
    courseSummary({
      startDate: '2026-10-26',
      days: 5,
      times: [{ hour: 21, minute: 0 }],
      today: '2026-10-28',
      is24h: false,
    }),
  ).toBe('Started Mon 26 Oct · last dose Fri 30 Oct, 9:00 PM');
  expect(
    courseSummary({
      startDate: '2026-10-26',
      days: 1,
      times: [
        { hour: 21, minute: 30 },
        { hour: 8, minute: 0 },
      ],
      today: '2026-10-26',
      is24h: true,
    }),
  ).toBe('Starts today · last dose Mon 26 Oct, 21:30');
});

test('nextLabel names the next ring day', () => {
  expect(nextLabel(new Date(2026, 9, 27, 8, 0).getTime(), '2026-10-26')).toBe(
    'Next: tomorrow',
  );
  expect(nextLabel(new Date(2026, 9, 28, 8, 0).getTime(), '2026-10-26')).toBe(
    'Next: Wed 28 Oct',
  );
});
