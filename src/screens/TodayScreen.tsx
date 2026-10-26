import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import DoseCard from '../components/DoseCard';
import HealthBanner from '../components/HealthBanner';
import { formatDay } from '../lib/course';
import { healthIssues } from '../lib/health';
import type { Issue } from '../lib/health';
import { formatTime } from '../lib/time';
import { currentManufacturer } from '../setup/oemSteps';
import {
  getHealth,
  getSetupState,
  getToday,
  is24HourFormat,
  markDoseTaken,
  openSetting,
  reconcileOnAppOpen,
} from '../native/alarms';
import type { MissedAlarm, Today, TodayCard } from '../native/alarms';
import { listSounds } from '../native/sounds';
import type { Sound } from '../native/sounds';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useI18n } from '../i18n';
import type { Strings } from '../i18n';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Today'>;

/** One line per missed dose: "8:00 AM: Azithromycin 500, Telma 40". */
function alertMissed(missed: MissedAlarm[], onFix: () => void, t: Strings) {
  const is24h = is24HourFormat();
  const lines = missed.map(m => {
    const due = new Date(m.dueAt);
    return `${formatTime(due.getHours(), due.getMinutes(), is24h)}: ${m.name}`;
  });
  Alert.alert(t.today.missedTitle, t.today.missedBody(lines.join('\n')), [
    { text: t.today.later, style: 'cancel' },
    { text: t.today.fixThis, onPress: onFix },
  ]);
}

export default function TodayScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  // Read by the refresh and mount effects, which must not re-run when the language changes.
  const words = useRef(t);
  words.current = t;
  const [issues, setIssues] = useState<Issue[]>([]);
  const [today, setToday] = useState<Today | null>(null);
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
            alertMissed(
              missed,
              () => navigation.navigate('Setup'),
              words.current,
            );
          }
        } catch (e) {
          console.warn('Could not reconcile alarms', e);
        }
      }
      // A health or setup failure must never hide the doses, and shows no
      // banner rather than a wrong one.
      Promise.all([getHealth(), getSetupState()])
        .then(([health, setup]) => {
          if (mounted.current && request === latest.current) {
            setIssues(
              healthIssues(
                health,
                setup,
                currentManufacturer(),
                words.current,
              ),
            );
          }
        })
        .catch(e => {
          console.warn('Could not read health', e);
          if (mounted.current && request === latest.current) {
            setIssues([]);
          }
        });
      const [todayResult, soundsResult] = await Promise.allSettled([
        getToday(),
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
      if (todayResult.status === 'fulfilled') {
        setToday(todayResult.value);
        setLoadFailed(false);
        setLoaded(true);
      } else {
        console.warn("Could not load today's doses", todayResult.reason);
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
          title: words.current.today.notificationsTitle,
          message: words.current.today.notificationsMessage,
          buttonPositive: words.current.common.ok,
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

  const date = today?.date;
  useLayoutEffect(() => {
    navigation.setOptions({
      title: date ? t.today.titleOn(formatDay(date, t)) : t.today.title,
    });
  }, [navigation, date, t]);

  // Only a missed or skipped dose: someone took it but didn't tap Taken.
  const confirmTaken = (card: TodayCard) => {
    if (!date) {
      return;
    }
    const time = formatTime(card.hour, card.minute, is24HourFormat());
    const names = card.pills.map(p => p.name).join(', ');
    Alert.alert(t.today.markTakenTitle, `${time} · ${names}`, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.today.markTaken,
        onPress: async () => {
          try {
            await markDoseTaken(date, card.hour, card.minute);
          } catch (e) {
            console.warn('Could not mark the dose taken', e);
            if (mounted.current) {
              Alert.alert(t.today.markFailed, t.common.tryAgain);
            }
          }
          refresh(false);
        },
      },
    ]);
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
        data={today?.cards ?? []}
        keyExtractor={c => `${c.hour}:${c.minute}`}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <DoseCard
            card={item}
            date={today!.date}
            is24h={is24h}
            soundName={soundName(item.soundId)}
            onOpenPill={pillId => navigation.navigate('PillEdit', { pillId })}
            onOpenSound={() =>
              item.alarmId &&
              navigation.navigate('SoundPicker', {
                alarmId: item.alarmId,
                selectedSoundId: item.soundId,
              })
            }
            onMarkTaken={() => confirmTaken(item)}
          />
        )}
        ListEmptyComponent={
          loadFailed ? (
            <Text style={styles.empty}>{t.today.loadFailed}</Text>
          ) : loaded ? (
            <Text style={styles.empty}>{t.today.empty}</Text>
          ) : undefined
        }
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate('PillEdit', {})}
        // Clear of the gesture bar: the app draws edge to edge.
        style={[styles.add, { marginBottom: spacing.md + insets.bottom }]}
      >
        <Text style={styles.addText}>{t.today.addPill}</Text>
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
  list: { paddingBottom: spacing.md },
  add: {
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  addText: { color: colors.onPrimary, fontSize: 18, fontWeight: '600' },
});
