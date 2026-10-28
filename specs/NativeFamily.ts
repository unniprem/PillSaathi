import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export type LinkCode = {
  code: string; // 6 digits
  expiresAt: number; // ms
  qrUri: string; // file:// PNG of the scan code
};

export type Person = { uid: string; name: string; email: string };

export interface Spec extends TurboModule {
  // The elder's side of linking.
  createLinkCode(): Promise<LinkCode>; // NOT_SET_UP, OFFLINE
  watchRequests(on: boolean): Promise<void>; // one listener on pending requests while on
  pendingRequests(): Promise<Person[]>; // from memory, no reads
  answerRequest(uid: string, allow: boolean): Promise<void>;
  listFollowers(): Promise<Person[]>; // [] when never shared
  removeFollower(uid: string): Promise<void>;
}

export default TurboModuleRegistry.get<Spec>('NativeFamily');
