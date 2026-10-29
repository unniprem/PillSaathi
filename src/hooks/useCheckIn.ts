import { useEffect } from 'react';
import { AppState } from 'react-native';
import { checkIn, watchChanges } from '../native/family';

function warn(what: string) {
  return (e: unknown) => console.warn(what, e);
}

/**
 * On a phone her family may change: applies the changes they sent when the app starts and each
 * time it comes back to the front, and live while it stays there. The native side does nothing
 * (and starts no Firebase) on a phone no one can change.
 */
export function useCheckIn() {
  useEffect(() => {
    const start = () => {
      checkIn().catch(warn('Could not check in for family changes'));
      watchChanges(true).catch(warn('Could not watch for family changes'));
    };
    start();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        start();
      } else {
        watchChanges(false).catch(warn('Could not stop watching'));
      }
    });
    return () => {
      sub.remove();
      watchChanges(false).catch(warn('Could not stop watching'));
    };
  }, []);
}
