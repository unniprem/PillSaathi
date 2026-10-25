/** Day chips run Sunday first. Days are ISO: 1 = Mon … 7 = Sun. */
export const DAY_CHIP_ORDER: readonly number[] = [7, 1, 2, 3, 4, 5, 6];

export const DAY_CHIP_LETTER: Record<number, string> = {
  7: 'S',
  1: 'M',
  2: 'T',
  3: 'W',
  4: 'T',
  5: 'F',
  6: 'S',
};

const SHORT_NAME: Record<number, string> = {
  7: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
};

const sameSet = (days: number[], expected: number[]) =>
  days.length === expected.length && expected.every(d => days.includes(d));

export function describeDays(days: number[]): string {
  if (days.length === 0) {
    return 'Once';
  }
  if (sameSet(days, [1, 2, 3, 4, 5, 6, 7])) {
    return 'Every day';
  }
  if (sameSet(days, [1, 2, 3, 4, 5])) {
    return 'Mon–Fri';
  }
  if (sameSet(days, [6, 7])) {
    return 'Weekends';
  }
  return DAY_CHIP_ORDER.filter(d => days.includes(d))
    .map(d => SHORT_NAME[d])
    .join(', ');
}
