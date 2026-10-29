import NativeFamily from '../../specs/NativeFamily';
import type {
  Follow,
  Follower,
  LinkCode,
  NativeFamilyCard,
  Person,
  Relative,
  Spec,
} from '../../specs/NativeFamily';
import type { History, Pill, Refill, Today } from './alarms';

export type { Follow, Follower, LinkCode, Person, Relative };

/** An elder's card in Today's Family section. */
export type FamilyCard = Omit<NativeFamilyCard, 'refills'> & {
  refills: Refill[];
};

/** Her today, read-only, with when her phone was last heard from. */
export type ElderToday = Today & { heardAt: number | null; otherZone: boolean };

/** Where a request to follow an elder stands. */
export type FollowState = 'pending' | 'allowed' | 'denied' | 'expired';

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
  /** Google's scanner module isn't on the phone yet and didn't download in time. */
  NoScanner: 'NO_SCANNER',
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
export async function answerRequest(
  uid: string,
  allow: boolean,
): Promise<void> {
  return native().answerRequest(uid, allow);
}

/** The people who can see this phone's pills; none when it has never shared. */
export async function listFollowers(): Promise<Follower[]> {
  return native().listFollowers();
}

/** Applies the changes this phone's family sent; how many were applied. */
export async function checkIn(): Promise<number> {
  return native().checkIn();
}

/** Applies family changes live while on (the app is in front). */
export async function watchChanges(on: boolean): Promise<void> {
  return native().watchChanges(on);
}

/** Lets a follower change this phone's pills and alarm sounds, or stops them. */
export async function setCanChange(uid: string, on: boolean): Promise<void> {
  return native().setCanChange(uid, on);
}

/** Stops someone seeing this phone's pills. The last one gone deletes the online copy. */
export async function removeFollower(uid: string): Promise<void> {
  return native().removeFollower(uid);
}

/** The Google account this phone looks after family with, or null when it hasn't signed in. */
export async function signedInRelative(): Promise<Relative | null> {
  return native().signedInRelative();
}

/**
 * Signs in with a Google account on the phone; null when cancelled. Rejects `NO_ACTIVITY`,
 * `NOT_SET_UP` or `OFFLINE`.
 */
export async function signInWithGoogle(): Promise<Relative | null> {
  return native().signInWithGoogle();
}

/**
 * Scans a family code with the camera, fetching Google's scanner first when the phone lacks it;
 * null when cancelled. Rejects `BAD_CODE` for a code that isn't PillSaathi's, or `NO_SCANNER`.
 */
export async function scanCode(): Promise<string | null> {
  return native().scanCode();
}

/** Asks to follow the elder whose code this is; gives her id. Rejects `BAD_CODE`, `NOT_SIGNED_IN` or `OFFLINE`. */
export async function requestFollow(code: string): Promise<string> {
  return native().requestFollow(code);
}

/** Whether she has tapped Allow or No yet, or the code ran out first. Costs no reads. */
export async function followState(elderId: string): Promise<FollowState> {
  return (await native().followState(elderId)) as FollowState;
}

/** Adds or edits a follow on this phone: what he calls her, her number and his ping delay. */
export async function saveFollow(follow: Follow): Promise<void> {
  return native().saveFollow(follow);
}

/** The elders this phone looks after, in the order they were added. */
export async function listFollows(): Promise<Follow[]> {
  return native().listFollows();
}

/** Stops following her; `deleteCopy` also deletes her online copy, when she has been silent 30 days. */
export async function unfollow(
  elderId: string,
  deleteCopy: boolean,
): Promise<void> {
  return native().unfollow(elderId, deleteCopy);
}

/** The Family section's cards, from what this phone last read. */
export async function getFamily(): Promise<FamilyCard[]> {
  return (await native().getFamily()) as FamilyCard[];
}

/** Reads each elder's latest copy, then gives the cards; offline, the cards from the last read. */
export async function refreshFamily(): Promise<FamilyCard[]> {
  return (await native().refreshFamily()) as FamilyCard[];
}

/** Her today, from the last read; times are hers. Rejects `NOT_FOUND`. */
export async function getElderToday(elderId: string): Promise<ElderToday> {
  return (await native().getElderToday(elderId)) as ElderToday;
}

/** Her doses from `from` through `to` (YYYY-MM-DD), as getHistory gives this phone's. */
export async function getElderHistory(
  elderId: string,
  from: string,
  to: string,
): Promise<History> {
  return (await native().getElderHistory(elderId, from, to)) as History;
}

/** Her pills, from the last read. Rejects `NOT_FOUND`. */
export async function listElderPills(elderId: string): Promise<Pill[]> {
  return (await native().listElderPills(elderId)) as Pill[];
}
