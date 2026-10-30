import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useI18n } from '../i18n';
import { errorCode, familyMessage } from '../lib/family';
import { draftReady, toPillInput } from '../lib/pillDraft';
import type { PillDraft } from '../lib/pillDraft';
import {
  getHealth,
  getSetupState,
  markSetupSeen,
  openSetting,
  savePill,
} from '../native/alarms';
import { FamilyErrors, sendPill } from '../native/family';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Options = {
  /** What he calls her, for "Amma's phone hasn't allowed you…". */
  elderName?: string;
  /** Runs once the pill is saved, with the draft saved; leaves the page when left out. */
  onSaved?: (saved: PillDraft) => void;
};

/**
 * Saves a pill draft: on this phone (`savePill`), or, with [elderId], sends it to her phone
 * (`sendPill`). A failure says so, and the page stays. On this phone a save then asks for the
 * exact-alarm permission when it is missing, and after the first pill opens alarm setup in the
 * page's place; otherwise, and after any send, it calls [onSaved]. [save] resolves true once the
 * pill is saved or sent, false when it isn't (or the draft isn't ready, or a save is under way).
 */
export function useSavePill(
  elderId?: string,
  { elderName = '', onSaved }: Options = {},
): { save: (d: PillDraft) => Promise<boolean>; saving: boolean } {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  // The state is a render late, so a second tap on Save could start a second save.
  const busy = useRef(false);
  const mounted = useRef(true);
  const latest = useRef(onSaved);
  latest.current = onSaved;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const done = useCallback(
    (d: PillDraft) => {
      if (latest.current) {
        latest.current(d);
      } else if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.replace('Main');
      }
    },
    [navigation],
  );

  // Runs after a successful save; it never throws, so the user always moves on.
  const finish = useCallback(
    async (d: PillDraft) => {
      try {
        if (!(await getSetupState()).seen) {
          await markSetupSeen();
          navigation.replace('Setup');
          return;
        }
      } catch (e) {
        console.warn('Could not check the setup state', e);
      }
      done(d);
    },
    [navigation, done],
  );

  const stop = useCallback(() => {
    busy.current = false;
    if (mounted.current) {
      setSaving(false);
    }
  }, []);

  const save = useCallback(
    async (d: PillDraft): Promise<boolean> => {
      if (busy.current || !draftReady(d)) {
        return false;
      }
      busy.current = true;
      setSaving(true);
      const input = toPillInput(d);
      if (elderId) {
        // Her phone takes it from here; the setup and alarm prompts are about this phone. Her
        // pill's photo as her copy has it, even none, is "keep", so a new one still on its way
        // there stays.
        const photoChoice =
          d.id !== null && d.photo === d.savedPhoto
            ? 'keep'
            : d.photo === null
            ? 'none'
            : 'new';
        try {
          await sendPill(elderId, {
            ...input,
            photo: photoChoice === 'new' ? d.photo : null,
            photoChoice,
          });
        } catch (e) {
          console.warn('Could not send the pill', e);
          if (mounted.current) {
            Alert.alert(
              errorCode(e) === FamilyErrors.NotAllowed
                ? t.remote.notEditor(elderName)
                : familyMessage(e, t),
            );
          }
          stop();
          return false;
        }
        done(d);
        stop();
        return true;
      }
      try {
        await savePill(input);
      } catch (e) {
        console.warn('Could not save the pill', e);
        if (mounted.current) {
          Alert.alert(t.pill.saveFailed, t.common.tryAgain);
        }
        stop();
        return false;
      }
      // The pill is saved; whatever happens next, move on.
      let exactAlarmAllowed = true;
      try {
        exactAlarmAllowed = (await getHealth()).exactAlarmAllowed;
      } catch (e) {
        console.warn('Could not read health', e);
      }
      if (!exactAlarmAllowed) {
        Alert.alert(
          t.pill.exactAlarmTitle,
          t.pill.exactAlarmBody,
          [
            { text: t.pill.notNow, style: 'cancel', onPress: () => finish(d) },
            {
              text: t.pill.allow,
              onPress: () => {
                openSetting('exactAlarm').catch(e =>
                  console.warn('Could not open settings', e),
                );
                finish(d);
              },
            },
          ],
          { cancelable: false },
        );
      } else {
        await finish(d);
      }
      stop();
      return true;
    },
    [elderId, elderName, t, done, finish, stop],
  );

  return { save, saving };
}
