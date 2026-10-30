import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useI18n } from '../i18n';
import { familyMessage } from '../lib/family';
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
 * While the screen is focused: listens for relatives asking to follow this phone, and puts each
 * in [asking], one at a time, for the screen's `AllowDialog` to ask "Let Ravi see your pills?".
 * [answer] saves her answer, and [onAnswered] runs after it is saved. A request already answered
 * is never asked about again; one left unanswered when the screen loses focus is asked again
 * when it is back.
 */
export function useFollowRequests(
  onAnswered: (person: Person, allowed: boolean) => void,
): { asking: Person | null; answer: (allow: boolean) => void } {
  const { t } = useI18n();
  const [asking, setAsking] = useState<Person | null>(null);
  // The person on the dialog, read by [answer] so a second tap does nothing.
  const shown = useRef<Person | null>(null);
  // While someone is asked, or their answer is being saved, no one else is asked.
  const busy = useRef(false);
  const answered = useRef(new Set<string>());
  const latest = useRef(onAnswered);
  latest.current = onAnswered;

  const answer = useCallback(
    async (allow: boolean) => {
      const person = shown.current;
      if (!person) {
        return;
      }
      shown.current = null;
      setAsking(null);
      answered.current.add(person.uid);
      try {
        await answerRequest(person.uid, allow);
        latest.current(person, allow);
      } catch (e) {
        console.warn('Could not answer the request', e);
        answered.current.delete(person.uid);
        Alert.alert(familyMessage(e, t));
      } finally {
        busy.current = false;
      }
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
          if (active && next && !busy.current) {
            busy.current = true;
            shown.current = next;
            setAsking(next);
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
        if (shown.current) {
          shown.current = null;
          busy.current = false;
          setAsking(null);
        }
      };
    }, []),
  );

  return { asking, answer };
}
