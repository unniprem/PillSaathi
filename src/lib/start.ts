import { reconcileOnAppOpen } from '../native/alarms';
import type { MissedAlarm, Role } from '../native/alarms';
import type { Relative } from '../native/family';
import { firstName } from './family';

/** The page the app opens on. */
export type StartRoute =
  | { name: 'Login'; params: { again: boolean } }
  | { name: 'Who'; params: { first: string | null } }
  | { name: 'Main' };

/**
 * A phone never asked who it is for starts at the login page, then asks; one already logged in
 * goes straight to the asking, since Google again could pick another account and so change a
 * relative's id under the elders who follow it. One that was asked but isn't logged in (it
 * continued offline, or logged out) sees the login page again, then goes straight to Today. Any
 * other phone opens on Today.
 */
export function startRoute(o: {
  role: Role | null;
  account: Relative | null;
}): StartRoute {
  if (o.role === null) {
    return o.account === null
      ? { name: 'Login', params: { again: false } }
      : { name: 'Who', params: { first: firstName(o.account.name) } };
  }
  if (o.account === null) {
    return { name: 'Login', params: { again: true } };
  }
  return { name: 'Main' };
}

/** Doses the app-open reconciles found missed that Today hasn't shown yet, oldest first. */
let unshown: MissedAlarm[] = [];
/** The reconcile running now, which another call joins. */
let running: Promise<void> | null = null;
const listeners = new Set<() => void>();

/**
 * Mends the alarms each time the app opens or comes back to the front: after the phone
 * force-stops the app, this is the only thing that sets them again. The app runs it whatever page
 * it opens on, so a phone left at the login is mended too. The doses it finds missed wait for
 * Today to show them ([takeMissed]); a failure is only logged, and the promise never rejects.
 */
export function reconcileAppOpen(): Promise<void> {
  running ??= (async () => {
    try {
      unshown = [...unshown, ...(await reconcileOnAppOpen())];
    } catch (e) {
      console.warn('Could not reconcile alarms', e);
    }
  })().then(() => {
    // Always after `running` is set, even when the call failed at once.
    running = null;
    listeners.forEach(listener => listener());
  });
  return running;
}

/** Calls [listener] after each reconcile, done or failed; returns the call that stops it. */
export function afterReconcile(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The missed doses not yet shown, which are then forgotten, so each is shown once. */
export function takeMissed(): MissedAlarm[] {
  const missed = unshown;
  unshown = [];
  return missed;
}
