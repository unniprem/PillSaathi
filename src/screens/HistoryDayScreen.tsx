import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { formatAmount } from '../lib/amount';
import { formatDay } from '../lib/course';
import { formatTime } from '../lib/time';
import { getHistory, is24HourFormat, markDoseTaken } from '../native/alarms';
import { getElderHistory } from '../native/family';
import type { HistoryDose } from '../native/alarms';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useI18n } from '../i18n';
import type { Strings } from '../i18n';
import { colors, font, radius, shadow, spacing, timeTiles } from '../theme';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import type { IconName } from '../ui/icons';
import PillPicture from '../ui/PillPicture';
import { greetingFor } from '../ui/sky';
import SkyBand from '../ui/SkyBand';

type Props = NativeStackScreenProps<RootStackParamList, 'HistoryDay'>;

type Part = ReturnType<typeof greetingFor>;

/** A dose's part of the day: a low sun, the sun, the moon. */
const PART_ICON: Record<Part, IconName> = {
  morning: 'wb_twilight',
  afternoon: 'light_mode',
  evening: 'bedtime',
};

/** The status chip's colours. A missed dose's card is coral already, so its chip is white. */
const CHIP: Record<HistoryDose['outcome'], { fill: string; ink: string }> = {
  taken: { fill: colors.greenTint, ink: colors.greenText },
  missed: { fill: colors.card, ink: colors.coralText },
  skipped: { fill: colors.soft, ink: colors.muted },
  notReported: { fill: colors.amberTint, ink: colors.amberText },
};

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

/**
 * One day as a timeline: each dose by its time, with its part of the day, how it went, and its
 * pills as they were then. A missed dose stands out in soft coral.
 */
export default function HistoryDayScreen({ navigation, route }: Props) {
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

  // Someone took it but didn't tap I took it when it rang, as on Today.
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

  const shown = doses ?? [];
  const taken = shown.filter(d => d.outcome === 'taken').length;

  return (
    <View style={styles.page}>
      <SkyBand
        title={formatDay(date, t)}
        sub={shown.length ? t.history.dayTaken(taken, shown.length) : undefined}
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.list}>
        {loadFailed ? (
          <Text style={styles.message}>{t.history.loadFailed}</Text>
        ) : null}
        {doses !== null && doses.length === 0 ? (
          <Text style={styles.message}>{t.history.dayEmpty}</Text>
        ) : null}
        {shown.map((dose, i) => {
          // An elder's dose is hers to mark, on her phone.
          const canMark = !elderId && dose.outcome !== 'taken';
          const missed = dose.outcome === 'missed';
          const part = greetingFor(dose.hour);
          const chip = CHIP[dose.outcome];
          return (
            <View
              key={`${dose.date} ${dose.hour}:${dose.minute}`}
              style={styles.step}
            >
              <View style={styles.rail}>
                <View
                  testID="dose-time"
                  style={[
                    styles.tile,
                    { backgroundColor: timeTiles[part].fill },
                  ]}
                >
                  <Icon
                    name={PART_ICON[part]}
                    size={22}
                    color={timeTiles[part].ink}
                  />
                </View>
                {i < shown.length - 1 ? <View style={styles.line} /> : null}
              </View>
              <View
                testID="dose-card"
                style={[styles.card, missed && styles.missedCard]}
              >
                <View style={styles.header}>
                  <Text style={styles.time}>
                    {formatTime(dose.hour, dose.minute, is24h)}
                  </Text>
                  <Text
                    style={[
                      styles.chip,
                      { backgroundColor: chip.fill, color: chip.ink },
                    ]}
                  >
                    {statusOf(dose, is24h, t)}
                  </Text>
                </View>
                {dose.pills.map(pill => (
                  <View key={pill.pillId} style={styles.pillRow}>
                    <PillPicture
                      key={pill.photoUri ?? ''}
                      pill={pill}
                      size={30}
                    />
                    <Text style={styles.pillName}>{pill.name}</Text>
                    <Text style={styles.amount}>
                      {formatAmount(pill.form, pill.amount, lang)}
                    </Text>
                  </View>
                ))}
                {canMark ? (
                  <View style={styles.mark}>
                    <Button
                      label={t.history.tookIt}
                      variant={missed ? 'coral' : 'secondary'}
                      onPress={() => confirmTaken(dose)}
                    />
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.page },
  list: { padding: spacing.md },
  message: {
    ...font(700),
    padding: 32,
    textAlign: 'center',
    fontSize: 18,
    color: colors.muted,
  },
  // One dose: its symbol on the rail that joins the day's doses, then its card.
  step: { flexDirection: 'row', gap: 12 },
  rail: { alignItems: 'center' },
  tile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    flex: 1,
    width: 2,
    borderRadius: 1,
    backgroundColor: colors.line,
    marginVertical: spacing.xs,
  },
  card: {
    flex: 1,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: colors.card,
    boxShadow: shadow.card,
  },
  missedCard: { backgroundColor: colors.coralTint },
  // At a large text size the status drops under the time rather than squeezing it.
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  time: { ...font(900), fontSize: 20, color: colors.navy },
  chip: {
    ...font(800),
    fontSize: 15,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  pillName: { ...font(800), flex: 1, fontSize: 17, color: colors.navy },
  amount: { ...font(700), fontSize: 15, color: colors.muted },
  mark: { marginTop: 12 },
});
