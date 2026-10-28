import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export type LinkCode = {
  code: string; // 6 digits
  expiresAt: number; // ms
  qrUri: string; // file:// PNG of the scan code
};

export type Person = { uid: string; name: string; email: string };

export type Relative = { name: string; email: string };

export type Follow = {
  elderId: string;
  name: string; // what the relative calls her
  phone: string | null; // for the Call button
  delayMinutes: number | null; // 15 | 30 | 60; null = Off
};

export interface Spec extends TurboModule {
  // The elder's side of linking.
  createLinkCode(): Promise<LinkCode>; // NOT_SET_UP, OFFLINE
  watchRequests(on: boolean): Promise<void>; // one listener on pending requests while on
  pendingRequests(): Promise<Person[]>; // from memory, no reads
  answerRequest(uid: string, allow: boolean): Promise<void>;
  listFollowers(): Promise<Person[]>; // [] when never shared
  removeFollower(uid: string): Promise<void>;

  // The relative's side.
  signedInRelative(): Promise<Relative | null>;
  signInWithGoogle(): Promise<Relative | null>; // null = cancelled; NO_ACTIVITY, NOT_SET_UP, OFFLINE
  scanCode(): Promise<string | null>; // the 6 digits; null = cancelled or not a code
  requestFollow(code: string): Promise<string>; // elderId; BAD_CODE, NOT_SIGNED_IN, OFFLINE
  followState(elderId: string): Promise<string>; // pending | allowed | denied | expired; NOT_FOUND
  saveFollow(follow: Follow): Promise<void>;
  listFollows(): Promise<Follow[]>;
  unfollow(elderId: string, deleteCopy: boolean): Promise<void>;
}

export default TurboModuleRegistry.get<Spec>('NativeFamily');
