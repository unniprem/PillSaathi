import {
  DAY_CHIP_LETTER,
  DAY_CHIP_ORDER,
  describeDays,
} from '../../src/lib/days';

test('describes common day sets', () => {
  expect(describeDays([])).toBe('Once');
  expect(describeDays([1, 2, 3, 4, 5, 6, 7])).toBe('Every day');
  expect(describeDays([5, 1, 3, 2, 4])).toBe('Mon–Fri');
  expect(describeDays([7, 6])).toBe('Weekends');
});

test('lists other sets Sunday-first', () => {
  expect(describeDays([5, 3, 7])).toBe('Sun, Wed, Fri');
  expect(describeDays([1, 6])).toBe('Mon, Sat');
});

test('chips start on Sunday', () => {
  expect(DAY_CHIP_ORDER).toEqual([7, 1, 2, 3, 4, 5, 6]);
  expect(DAY_CHIP_ORDER.map(d => DAY_CHIP_LETTER[d]).join('')).toBe('SMTWTFS');
});
