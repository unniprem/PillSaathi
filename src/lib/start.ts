import type { Role } from '../native/alarms';
import type { Relative } from '../native/family';

/** The page the app opens on. */
export type StartRoute =
  | { name: 'Login'; params: { again: boolean } }
  | { name: 'Main' };

/**
 * A phone never asked who it is for starts at the login page, then asks. One that was asked but
 * isn't logged in (it continued offline, or logged out) sees the login page again, then goes
 * straight to Today. Any other phone opens on Today.
 */
export function startRoute(o: {
  role: Role | null;
  account: Relative | null;
}): StartRoute {
  if (o.role === null) {
    return { name: 'Login', params: { again: false } };
  }
  if (o.account === null) {
    return { name: 'Login', params: { again: true } };
  }
  return { name: 'Main' };
}
