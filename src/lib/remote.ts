import type { Strings } from '../i18n';
import type { ChangeView } from '../native/family';
import { formatTime } from './time';

const isWaiting = (c: ChangeView) =>
  c.status === 'pending' || c.status === 'applying';

/** "Add Telma 40", "Change Telma 40", "Delete Telma 40" or "8:00 AM sound: Ravi's sound". */
export function changeTitle(c: ChangeView, t: Strings, is24h: boolean): string {
  const pill = c.pillName ?? '';
  switch (c.kind) {
    case 'pill':
      return c.pillId ? t.remote.change(pill) : t.remote.add(pill);
    case 'deletePill':
      return t.remote.delete(pill);
    case 'sound':
      return t.remote.sound(
        formatTime(c.hour ?? 0, c.minute ?? 0, is24h),
        c.soundName ?? t.remote.defaultTone,
      );
    default:
      return t.remote.unreadable;
  }
}

/** "Waiting for Amma's phone", "Done at 3:05 PM" or "Not done: <why>". */
export function changeState(
  c: ChangeView,
  t: Strings,
  is24h: boolean,
  elderName: string,
): string {
  if (isWaiting(c)) {
    return t.remote.waiting(elderName);
  }
  if (c.status === 'applied') {
    const done = c.doneAt === null ? null : new Date(c.doneAt);
    return done
      ? t.remote.done(formatTime(done.getHours(), done.getMinutes(), is24h))
      : t.remote.doneNow;
  }
  const reasons = t.remote.reasons as Record<string, string>;
  return t.remote.notDone(reasons[c.reason ?? ''] ?? reasons.invalid);
}

/** The pill and delete changes still waiting, by the pill they change; a new pill has no id yet. */
export function waitingByPill(changes: ChangeView[]): Map<string, ChangeView> {
  const map = new Map<string, ChangeView>();
  for (const c of changes) {
    if (
      isWaiting(c) &&
      c.pillId &&
      (c.kind === 'pill' || c.kind === 'deletePill')
    ) {
      map.set(c.pillId, c);
    }
  }
  return map;
}

/** Why her phone may not ring alarms, as a warning, or null when nothing is wrong. */
export function problemText(
  problem: string | null,
  t: Strings,
  elderName: string,
): string | null {
  if (!problem) {
    return null;
  }
  const problems = t.remote.problems as Record<string, string>;
  return t.remote.problem(elderName, problems[problem] ?? problems.setup);
}
