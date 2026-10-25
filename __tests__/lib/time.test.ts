import { formatTime } from '../../src/lib/time';

test('formats 12-hour time without a leading zero on the hour', () => {
  expect(formatTime(7, 0, false)).toBe('7:00 AM');
  expect(formatTime(19, 5, false)).toBe('7:05 PM');
  expect(formatTime(0, 0, false)).toBe('12:00 AM');
  expect(formatTime(12, 0, false)).toBe('12:00 PM');
});

test('formats 24-hour time as HH:mm', () => {
  expect(formatTime(7, 0, true)).toBe('07:00');
  expect(formatTime(19, 5, true)).toBe('19:05');
});
