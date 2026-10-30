import type { Strings } from '../i18n';
import type { Pill } from '../native/alarms';
import type { ChangeView } from '../native/family';
import type { PillForm } from './amount';
import type { PillDraft } from './pillDraft';
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

/**
 * The pill and delete changes still waiting, by the pill they change; a new pill has no id yet.
 * Of several for one pill, the newest ([changes] come newest first, as `listChanges` gives them).
 */
export function waitingByPill(changes: ChangeView[]): Map<string, ChangeView> {
  const map = new Map<string, ChangeView>();
  for (const c of changes) {
    if (
      isWaiting(c) &&
      c.pillId &&
      !map.has(c.pillId) &&
      (c.kind === 'pill' || c.kind === 'deletePill')
    ) {
      map.set(c.pillId, c);
    }
  }
  return map;
}

/**
 * Her [pill] as his next change to it must start from: as this phone last read it, with what the
 * newest change to it that the copy doesn't show yet sets ([changes] newest first). Each change
 * sends the whole pill and her phone applies them in order, so starting from the copy would undo
 * that change. Her photo and start date stay as read (the next change's photo is then "keep",
 * which keeps whatever photo her phone has by then), and her count unless that change set it.
 */
export function pillAhead(pill: Pill, changes: ChangeView[]): Pill {
  const sent = changes.find(
    c => c.ahead && c.kind === 'pill' && c.pillId === pill.id && c.pill,
  )?.pill;
  if (!sent) {
    return pill;
  }
  return {
    ...pill,
    name: sent.name,
    form: sent.form as PillForm,
    amount: sent.amount,
    times: sent.times,
    days: sent.days,
    remaining: sent.remainingChanged ? sent.remaining : pill.remaining,
  };
}

/**
 * Where the next change starts once [sent] has gone to her phone, before her changes are read
 * again: [sent], with [base]'s photo and count, as [pillAhead] would give it.
 */
export function afterSend(base: PillDraft, sent: PillDraft): PillDraft {
  return {
    ...sent,
    photo: base.photo,
    photoUri: base.photoUri,
    savedPhoto: base.savedPhoto,
    count: sent.countChanged ? sent.count : base.count,
    countChanged: false,
  };
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
