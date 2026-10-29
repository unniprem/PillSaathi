import { useEffect, useState } from 'react';
import { getElderSetup, getFamily } from '../native/family';

/**
 * On a relative's phone, what her pill pages say about her: what he calls her, and whether she
 * lives in another time zone (her times are on her clock). Nothing without [elderId].
 */
export function useElder(elderId?: string): {
  name: string;
  otherZone: boolean;
} {
  const [name, setName] = useState('');
  const [otherZone, setOtherZone] = useState(false);

  useEffect(() => {
    if (!elderId) {
      return;
    }
    let active = true;
    Promise.all([getFamily(), getElderSetup(elderId)])
      .then(([cards, setup]) => {
        const called = cards.find(c => c.elderId === elderId)?.name;
        if (active) {
          setName(called ?? '');
          setOtherZone(setup.otherZone);
        }
      })
      .catch(e => console.warn('Could not read her name', e));
    return () => {
      active = false;
    };
  }, [elderId]);

  return { name, otherZone };
}
