import NativeFamily from '../../specs/NativeFamily';
import type { LinkCode, Person, Spec } from '../../specs/NativeFamily';

export type { LinkCode, Person };

/** The codes the native family module rejects its promises with. */
export const FamilyErrors = {
  /** This build has no Firebase config. */
  NotSetUp: 'NOT_SET_UP',
  /** No internet, or Firestore can't be reached. */
  Offline: 'OFFLINE',
  /** The code is missing, expired or already used. */
  BadCode: 'BAD_CODE',
  NotSignedIn: 'NOT_SIGNED_IN',
  NoActivity: 'NO_ACTIVITY',
  /** An elder this phone doesn't follow. */
  NotFound: 'NOT_FOUND',
  /** The security rules refused. */
  Permission: 'PERMISSION',
} as const;

function native(): Spec {
  if (!NativeFamily) {
    throw new Error('PillSaathi family is Android-only for now');
  }
  return NativeFamily;
}

/** A new 6-digit code for a relative, live for 15 minutes. Rejects `NOT_SET_UP` or `OFFLINE`. */
export async function createLinkCode(): Promise<LinkCode> {
  return native().createLinkCode();
}

/** Listens for follow requests while a screen showing them is open. */
export async function watchRequests(on: boolean): Promise<void> {
  return native().watchRequests(on);
}

/** The requests waiting for Allow or No, as the listener last saw them. Costs no reads. */
export async function pendingRequests(): Promise<Person[]> {
  return native().pendingRequests();
}

/** Allow lets the relative see this phone's pills and starts uploading them; No refuses. */
export async function answerRequest(uid: string, allow: boolean): Promise<void> {
  return native().answerRequest(uid, allow);
}

/** The people who can see this phone's pills; none when it has never shared. */
export async function listFollowers(): Promise<Person[]> {
  return native().listFollowers();
}

/** Stops someone seeing this phone's pills. The last one gone deletes the online copy. */
export async function removeFollower(uid: string): Promise<void> {
  return native().removeFollower(uid);
}
