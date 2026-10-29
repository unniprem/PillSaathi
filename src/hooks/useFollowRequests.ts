import { useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useI18n } from '../i18n';
import {
  answerRequest,
  pendingRequests,
  watchRequests,
} from '../native/family';
import type { Person } from '../native/family';

const POLL_MS = 2000;

// Screens that want requests, shared, so one screen's blur can't stop another's listener.
let watchers = 0;

function watch(on: boolean) {
  watchers += on ? 1 : -1;
  if ((on && watchers === 1) || (!on && watchers === 0)) {
    watchRequests(on).catch(e => console.warn('Could not watch requests', e));
  }
}

/**
 * While the screen is focused: listens for relatives asking to follow this phone, and asks
 * "Let Ravi see your pills?" for each, one at a time. [onAnswered] runs after an answer is saved.
 * A request already answered is never asked about again.
 */
export function useFollowRequests(
  onAnswered: (person: Person, allowed: boolean) => void,
) {
  const { t } = useI18n();
  const asking = useRef(false);
  const answered = useRef(new Set<string>());
  const latest = useRef(onAnswered);
  latest.current = onAnswered;

  const ask = useCallback(
    (person: Person) => {
      asking.current = true;
      const answer = async (allow: boolean) => {
        answered.current.add(person.uid);
        try {
          await answerRequest(person.uid, allow);
          latest.current(person, allow);
        } catch (e) {
          console.warn('Could not answer the request', e);
          answered.current.delete(person.uid);
          Alert.alert(t.family.offline);
        } finally {
          asking.current = false;
        }
      };
      Alert.alert(
        t.family.allowTitle(person.name),
        t.family.allowBody(person.email),
        [
          { text: t.family.no, style: 'cancel', onPress: () => answer(false) },
          { text: t.family.allow, onPress: () => answer(true) },
        ],
        { cancelable: false },
      );
    },
    [t],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      watch(true);
      const poll = async () => {
        try {
          const people = await pendingRequests();
          // Forget answers the phone has dropped, so a new request from them is asked again.
          const uids = new Set(people.map(p => p.uid));
          answered.current.forEach(uid => {
            if (!uids.has(uid)) {
              answered.current.delete(uid);
            }
          });
          const next = people.find(p => !answered.current.has(p.uid));
          if (active && next && !asking.current) {
            ask(next);
          }
        } catch (e) {
          console.warn('Could not read requests', e);
        }
      };
      const timer = setInterval(poll, POLL_MS);
      return () => {
        active = false;
        clearInterval(timer);
        watch(false);
      };
    }, [ask]),
  );
}
