import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import PillPicture from '../components/PillPicture';
import { formatAmount } from '../lib/amount';
import { formatTime } from '../lib/time';
import { getHistory, is24HourFormat, markDoseTaken } from '../native/alarms';
import { getElderHistory } from '../native/family';
import type { HistoryDose } from '../native/alarms';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useI18n } from '../i18n';
import type { Strings } from '../i18n';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'HistoryDay'>;

/**
 * "✓ Taken 8:03 AM", "✓ Taken (marked 26 Oct, 10:15 AM)" for a dose marked taken later,
 * "Skipped", "Missed", or on an elder's day "Not reported yet".
 */
function statusOf(dose: HistoryDose, is24h: boolean, t: Strings): string {
  switch (dose.outcome) {
    case 'skipped':
      return t.status.skipped;
    case 'missed':
      return t.status.missed;
    case 'notReported':
      return t.status.notReported;
  }
  const at = new Date(dose.at);
  const time = formatTime(at.getHours(), at.getMinutes(), is24h);
  return dose.marked
    ? t.history.takenMarked(`${at.getDate()} ${t.months[at.getMonth()]}`, time)
    : t.status.takenAt(time);
}

/** One day's doses by time, each with its pills as they were then. */
export default function HistoryDayScreen({ route }: Props) {
  const { date, elderId } = route.params;
  const { lang, t } = useI18n();
  const [doses, setDoses] = useState<HistoryDose[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const mounted = useRef(true);
  const latest = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    const request = ++latest.current;
    try {
      const history = elderId
        ? await getElderHistory(elderId, date, date)
        : await getHistory(date, date);
      if (mounted.current && request === latest.current) {
        setDoses(history.doses);
        setLoadFailed(false);
      }
    } catch (e) {
      console.warn("Could not load the day's doses", e);
      if (mounted.current && request === latest.current) {
        setLoadFailed(true);
      }
    }
  }, [date, elderId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Doses may have rung, or been found missed, while the app was away.
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        load();
      }
    });
    return () => sub.remove();
  }, [load]);

  const is24h = is24HourFormat();

  // Someone took it but didn't tap Taken, as on Today.
  const confirmTaken = (dose: HistoryDose) => {
    const time = formatTime(dose.hour, dose.minute, is24h);
    const names = dose.pills.map(p => p.name).join(', ');
    Alert.alert(t.today.markTakenTitle, `${time} · ${names}`, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.today.markTaken,
        onPress: async () => {
          try {
            await markDoseTaken(date, dose.hour, dose.minute);
          } catch (e) {
            console.warn('Could not mark the dose taken', e);
            if (mounted.current) {
              Alert.alert(t.today.markFailed, t.common.tryAgain);
            }
          }
          await load();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.list}>
      {loadFailed ? (
        <Text style={styles.message}>{t.history.loadFailed}</Text>
      ) : null}
      {doses !== null && doses.length === 0 ? (
        <Text style={styles.message}>{t.history.dayEmpty}</Text>
      ) : null}
      {(doses ?? []).map(dose => {
        // An elder's dose is hers to mark, on her phone.
        const canMark = !elderId && dose.outcome !== 'taken';
        return (
          <View key={`${dose.hour}:${dose.minute}`} style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.time}>
                {formatTime(dose.hour, dose.minute, is24h)}
              </Text>
              <Text
                style={[
                  styles.status,
                  canMark ? styles.attention : styles.taken,
                ]}
              >
                {statusOf(dose, is24h, t)}
              </Text>
            </View>
            {dose.pills.map(pill => (
              <View key={pill.pillId} style={styles.pillRow}>
                <PillPicture key={pill.photoUri ?? ''} pill={pill} />
                <Text style={styles.pillName}>{pill.name}</Text>
                <Text style={styles.amount}>
                  {formatAmount(pill.form, pill.amount, lang)}
                </Text>
              </View>
            ))}
            {canMark ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => confirmTaken(dose)}
                style={styles.mark}
              >
                <Text style={styles.markText}>{t.today.markTaken}</Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { paddingBottom: spacing.md },
  message: {
    padding: 32,
    textAlign: 'center',
    fontSize: 18,
    color: colors.textMuted,
  },
  card: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  // At a large text size the status drops under the time rather than squeezing it.
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: { fontSize: 32, fontWeight: '300', color: colors.text },
  status: { fontSize: 18, paddingVertical: spacing.xs },
  taken: { color: colors.success },
  attention: { color: colors.danger },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
  },
  pillName: { flex: 1, fontSize: 20, color: colors.text },
  amount: { fontSize: 18, color: colors.textMuted, marginLeft: spacing.md },
  mark: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  markText: { fontSize: 18, fontWeight: '600', color: colors.primary },
});
