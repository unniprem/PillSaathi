import type { HistoryDose } from '../native/alarms';
import { addDays, weekdayOf } from './course';

/**
 * How a day's doses went: every one taken, some, none, or nothing recorded. Skipped and missed
 * both count as not taken.
 */
export type DayState = 'all' | 'some' | 'none' | 'empty';

export function dayState(doses: Pick<HistoryDose, 'outcome'>[]): DayState {
  if (doses.length === 0) {
    return 'empty';
  }
  const taken = doses.filter(d => d.outcome === 'taken').length;
  if (taken === doses.length) {
    return 'all';
  }
  return taken === 0 ? 'none' : 'some';
}

/**
 * Taken out of every recorded dose. The percentage is rounded down, so a month with one dose not
 * taken never shows 100%; null with nothing recorded.
 */
export function summarize(doses: Pick<HistoryDose, 'outcome'>[]): {
  taken: number;
  total: number;
  percent: number | null;
} {
  const taken = doses.filter(d => d.outcome === 'taken').length;
  const total = doses.length;
  return {
    taken,
    total,
    percent: total === 0 ? null : Math.floor((taken * 100) / total),
  };
}

/** `2026-10-26` → `2026-10` */
export function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

/** The month [n] months after [month] (`YYYY-MM`); [n] may be negative. */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const index = y * 12 + (m - 1) + n;
  const year = Math.floor(index / 12);
  return `${year}-${String(index - year * 12 + 1).padStart(2, '0')}`;
}

/** The days of [month] that History counts: from the 1st to its last day, or to [today] if earlier. */
export function monthRange(
  month: string,
  today: string,
): { from: string; to: string } {
  const last = addDays(`${addMonths(month, 1)}-01`, -1);
  return { from: `${month}-01`, to: today < last ? today : last };
}

/**
 * [month] as rows of 7 days starting on [firstDayOfWeek] (0 = Sunday), with null before the 1st
 * and after the last day.
 */
export function monthGrid(
  month: string,
  firstDayOfWeek: number,
): (string | null)[][] {
  const first = `${month}-01`;
  const cells: (string | null)[] = Array(
    (weekdayOf(first) - firstDayOfWeek + 7) % 7,
  ).fill(null);
  for (let day = first; monthOf(day) === month; day = addDays(day, 1)) {
    cells.push(day);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  const rows: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

/** The weekdays in header order, from [firstDayOfWeek]: 1 → [1, 2, 3, 4, 5, 6, 0]. */
export function weekdays(firstDayOfWeek: number): number[] {
  return Array.from({ length: 7 }, (_, i) => (firstDayOfWeek + i) % 7);
}

/** [doses] grouped by date, each day's in the order given. */
export function byDate(doses: HistoryDose[]): Map<string, HistoryDose[]> {
  const days = new Map<string, HistoryDose[]>();
  doses.forEach(d => days.set(d.date, [...(days.get(d.date) ?? []), d]));
  return days;
}
