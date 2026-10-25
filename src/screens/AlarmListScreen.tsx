import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  FlatList,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import AlarmRow from '../components/AlarmRow';
import {
  getHealth,
  getSetupState,
  is24HourFormat,
  listAlarms,
  reconcileOnAppOpen,
  setAlarmEnabled,
} from '../native/alarms';
import type { Alarm } from '../native/alarms';
import { listSounds } from '../native/sounds';
import type { Sound } from '../native/sounds';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AlarmList'>;

export default function AlarmListScreen({ navigation }: Props) {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [loaded, setLoaded] = useState(false);
  const mounted = useRef(true);
  const latest = useRef(0);
  const firstFocus = useRef(true);

  const refresh = useCallback(async (reconcile: boolean) => {
    const request = ++latest.current;
    try {
      if (reconcile) {
        await reconcileOnAppOpen();
      }
      // The health and setup state feed the Task 8 banner.
      const [nextAlarms, nextSounds] = await Promise.all([
        listAlarms(),
        listSounds(),
        getHealth(),
        getSetupState(),
      ]);
      if (mounted.current && request === latest.current) {
        setAlarms(nextAlarms);
        setSounds(nextSounds);
        setLoaded(true);
      }
    } catch (e) {
      console.warn('Could not refresh the alarm list', e);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    refresh(true);
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        refresh(true);
      }
    });
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: 'Allow notifications',
          message:
            'PillSaathi needs notifications to show your alarms when they ring.',
          buttonPositive: 'OK',
        },
      ).catch(e => console.warn('Notification permission request failed', e));
    }
    return () => {
      mounted.current = false;
      sub.remove();
    };
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      // The mount effect already refreshed for the first focus.
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      refresh(false);
    }, [refresh]),
  );

  const toggle = async (alarm: Alarm, enabled: boolean) => {
    try {
      const updated = await setAlarmEnabled(alarm.id, enabled);
      if (mounted.current) {
        setAlarms(list => list.map(a => (a.id === updated.id ? updated : a)));
      }
    } catch (e) {
      console.warn('Could not change the alarm', e);
      refresh(false);
    }
  };

  const is24h = is24HourFormat();
  const soundName = (id: string | null) =>
    sounds.find(s => s.id === id)?.name ?? null;

  return (
    <View style={styles.container}>
      {/* HealthBanner slot: Task 8 */}
      <FlatList
        data={alarms}
        keyExtractor={a => a.id}
        renderItem={({ item }) => (
          <AlarmRow
            alarm={item}
            soundName={soundName(item.soundId)}
            is24h={is24h}
            onPress={() =>
              navigation.navigate('AlarmEdit', { alarmId: item.id })
            }
            onToggle={enabled => toggle(item, enabled)}
          />
        )}
        ListEmptyComponent={
          loaded ? (
            <Text style={styles.empty}>No alarms yet. Tap + to add one.</Text>
          ) : undefined
        }
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add alarm"
        onPress={() => navigation.navigate('AlarmEdit', {})}
        style={styles.fab}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  empty: {
    padding: 32,
    textAlign: 'center',
    fontSize: 18,
    color: colors.textMuted,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabText: { color: colors.onPrimary, fontSize: 32, lineHeight: 36 },
});
