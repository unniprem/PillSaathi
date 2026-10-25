import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
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
import HealthBanner from '../components/HealthBanner';
import { healthIssues } from '../lib/health';
import type { Issue } from '../lib/health';
import { formatTime } from '../lib/time';
import { currentManufacturer } from '../setup/oemSteps';
import {
  getHealth,
  getSetupState,
  is24HourFormat,
  listAlarms,
  openSetting,
  reconcileOnAppOpen,
  setAlarmEnabled,
} from '../native/alarms';
import type { Alarm, MissedAlarm } from '../native/alarms';
import { listSounds } from '../native/sounds';
import type { Sound } from '../native/sounds';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AlarmList'>;

function alertMissed(missed: MissedAlarm[], onFix: () => void) {
  const is24h = is24HourFormat();
  const lines = missed.map(m => {
    const due = new Date(m.dueAt);
    return `${m.name} (${formatTime(due.getHours(), due.getMinutes(), is24h)})`;
  });
  Alert.alert(
    'Alarm missed',
    `PillSaathi was stopped by your phone and missed ${lines.join('\n')}.`,
    [
      { text: 'Later', style: 'cancel' },
      { text: 'Fix this', onPress: onFix },
    ],
  );
}

export default function AlarmListScreen({ navigation }: Props) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const mounted = useRef(true);
  const latest = useRef(0);
  const firstFocus = useRef(true);

  const refresh = useCallback(
    async (reconcile: boolean) => {
      const request = ++latest.current;
      if (reconcile) {
        try {
          // Each reconcile result is reported once, here; focus refreshes
          // skip reconcile so the alert can't repeat.
          const missed = await reconcileOnAppOpen();
          if (mounted.current && missed.length > 0) {
            alertMissed(missed, () => navigation.navigate('Setup'));
          }
        } catch (e) {
          console.warn('Could not reconcile alarms', e);
        }
      }
      // A health or setup failure must never hide the alarms, and shows no
      // banner rather than a wrong one.
      Promise.all([getHealth(), getSetupState()])
        .then(([health, setup]) => {
          if (mounted.current && request === latest.current) {
            setIssues(healthIssues(health, setup, currentManufacturer()));
          }
        })
        .catch(e => {
          console.warn('Could not read health', e);
          if (mounted.current && request === latest.current) {
            setIssues([]);
          }
        });
      const [alarmsResult, soundsResult] = await Promise.allSettled([
        listAlarms(),
        listSounds(),
      ]);
      if (!mounted.current || request !== latest.current) {
        return;
      }
      if (soundsResult.status === 'fulfilled') {
        setSounds(soundsResult.value);
      } else {
        console.warn('Could not load sounds', soundsResult.reason);
      }
      if (alarmsResult.status === 'fulfilled') {
        setAlarms(alarmsResult.value);
        setLoadFailed(false);
        setLoaded(true);
      } else {
        console.warn('Could not load alarms', alarmsResult.reason);
        setLoadFailed(true);
      }
    },
    [navigation],
  );

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

  const runAction = (issue: Issue) => {
    if (issue.action === 'setup') {
      navigation.navigate('Setup');
    } else {
      openSetting(issue.action).catch(e =>
        console.warn('Could not open settings', e),
      );
    }
  };

  const is24h = is24HourFormat();
  const soundName = (id: string | null) =>
    sounds.find(s => s.id === id)?.name ?? null;

  return (
    <View style={styles.container}>
      <HealthBanner issues={issues} onAction={runAction} />
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
          loadFailed ? (
            <Text style={styles.empty}>
              Couldn't load your alarms. Pull down or reopen the app to try
              again.
            </Text>
          ) : loaded ? (
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
