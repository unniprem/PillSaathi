import { useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useI18n } from '../i18n';
import { pickPhoto } from '../native/alarms';

type Picked = { photo: string; photoUri: string };

/**
 * Takes a pill's photo with the camera or from the gallery, one at a time, and hands it to
 * [onPicked] as the draft's fields. A cancelled pick keeps the photo there is; a failed one says
 * so.
 */
export function usePickPhoto(
  onPicked: (picked: Picked) => void,
): (source: 'camera' | 'gallery') => Promise<void> {
  const { t } = useI18n();
  const picking = useRef(false);
  const mounted = useRef(true);
  const latest = useRef(onPicked);
  latest.current = onPicked;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  return useCallback(
    async (source: 'camera' | 'gallery') => {
      if (picking.current) {
        return;
      }
      picking.current = true;
      try {
        const picked = await pickPhoto(source);
        if (picked && mounted.current) {
          latest.current({ photo: picked.name, photoUri: picked.uri });
        }
      } catch (e) {
        console.warn('Could not add the photo', e);
        if (mounted.current) {
          Alert.alert(t.pill.photoFailed);
        }
      } finally {
        picking.current = false;
      }
    },
    [t],
  );
}
