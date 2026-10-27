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
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { addDays, formatDay, toISODate } from '../lib/course';
import {
  addMonths,
  byDate,
  dayState,
  monthGrid,
  monthOf,
  summarize,
  weekdays,
} from '../lib/history';
import type { DayState } from '../lib/history';
import { reportText } from '../lib/report';
import { getHistory, is24HourFormat, listPills } from '../native/alarms';
import type { History } from '../native/alarms';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useI18n } from '../i18n';
import type { Strings } from '../i18n';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'History'>;

/** A month on screen and its doses up to today. */
type Shown = { month: string; history: History };

const FILL: Record<DayState, string | undefined> = {
  all: colors.success,
  some: colors.warning,
  none: colors.danger,
  empty: undefined,
};

function stateWord(state: DayState, t: Strings): string | null {
  switch (state) {
    case 'all':
      return t.history.allTaken;
    case 'some':
      return t.history.someNotTaken;
    case 'none':
      return t.history.noneTaken;
    default:
      return null;
  }
}

/** All of [month]'s doses up to [History.today]. */
async function loadMonth(month: string): Promise<History> {
  const history = await getHistory(
    `${month}-01`,
    addDays(`${addMonths(month, 1)}-01`, -1),
  );
  return {
    ...history,
    doses: history.doses.filter(d => d.date <= history.today),
  };
}

/**
 * A month of doses as a calendar, coloured by how each day went, with the month's share taken.
 * Share sends the month on screen as plain text.
 */
export default function HistoryScreen({ navigation }: Props) {
  const { t, lang } = useI18n();
  const [shown, setShown] = useState<Shown | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const month = useRef<string | null>(null);
  const latest = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** Loads [target], or with null the current month as the native side dates it. */
  const load = useCallback(async (target: string | null) => {
    const request = ++latest.current;
    try {
      let next = target ?? monthOf(toISODate(new Date()));
      let history = await loadMonth(next);
      if (target === null && monthOf(history.today) !== next) {
        next = monthOf(history.today);
        history = await loadMonth(next);
      }
      if (mounted.current && request === latest.current) {
        month.current = next;
        setShown({ month: next, history });
        setLoadFailed(false);
      }
    } catch (e) {
      console.warn('Could not load the history', e);
      if (mounted.current && request === latest.current) {
        setLoadFailed(true);
      }
    }
  }, []);

  // Coming back from a day's page reloads the month, so a dose marked taken there shows.
  useFocusEffect(
    useCallback(() => {
      load(month.current);
    }, [load]),
  );

  // So does coming back to the app: doses may have rung, or been found missed, meanwhile.
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        load(month.current);
      }
    });
    return () => sub.remove();
  }, [load]);

  // Reads the month again, so the report never leaves out a dose recorded since it was shown.
  const share = useCallback(async () => {
    if (!shown) {
      return;
    }
    const request = ++latest.current;
    try {
      const [history, pills] = await Promise.all([
        loadMonth(shown.month),
        listPills(),
      ]);
      if (mounted.current && request === latest.current) {
        setShown({ month: shown.month, history });
      }
      const message = reportText({
        month: shown.month,
        today: history.today,
        doses: history.doses,
        pills,
        is24h: is24HourFormat(),
        lang,
        t,
      });
      await Share.share({ message });
    } catch (e) {
      console.warn('Could not share the report', e);
      if (mounted.current) {
        Alert.alert(t.history.shareFailed, t.common.tryAgain);
      }
    }
  }, [shown, lang, t]);

  const renderShare = useCallback(
    () => (
      <Pressable
        accessibilityRole="button"
        disabled={!shown}
        onPress={share}
        hitSlop={spacing.sm}
      >
        <Text style={styles.share}>{t.history.share}</Text>
      </Pressable>
    ),
    [shown, share, t],
  );

  useLayoutEffect(() => {
    navigation.setOptions({ headerRight: renderShare });
  }, [navigation, renderShare]);

  if (!shown) {
    return (
      <View style={styles.container}>
        {loadFailed && (
          <Text style={styles.message}>{t.history.loadFailed}</Text>
        )}
      </View>
    );
  }

  const { history } = shown;
  const { today, oldest } = history;
  const canPrevious = oldest !== null && shown.month > monthOf(oldest);
  const canNext = shown.month < monthOf(today);
  const [year, monthNumber] = shown.month.split('-').map(Number);
  const { taken, total, percent } = summarize(history.doses);
  const days = byDate(history.doses);

  const renderDay = (date: string) => {
    const future = date > today;
    const word = future ? null : stateWord(dayState(days.get(date) ?? []), t);
    const fill = future ? undefined : FILL[dayState(days.get(date) ?? [])];
    return (
      <Pressable
        key={date}
        accessibilityRole="button"
        accessibilityLabel={
          word
            ? t.history.dayLabel(formatDay(date, t), word)
            : formatDay(date, t)
        }
        disabled={future}
        onPress={() => navigation.navigate('HistoryDay', { date })}
        style={[
          styles.cell,
          fill !== undefined && { backgroundColor: fill },
          date === today && styles.today,
        ]}
      >
        <Text
          style={[
            styles.dayNumber,
            fill !== undefined && styles.onFill,
            future && styles.future,
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {Number(date.slice(8))}
        </Text>
      </Pressable>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {loadFailed && <Text style={styles.message}>{t.history.loadFailed}</Text>}
      <View style={styles.monthRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.history.previousMonth}
          disabled={!canPrevious}
          onPress={() => load(addMonths(shown.month, -1))}
          hitSlop={spacing.sm}
          style={styles.arrow}
        >
          <Text style={[styles.arrowText, !canPrevious && styles.future]}>
            ‹
          </Text>
        </Pressable>
        <Text style={styles.monthLabel}>
          {t.history.month(t.months[monthNumber - 1], year)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.history.nextMonth}
          disabled={!canNext}
          onPress={() => load(addMonths(shown.month, 1))}
          hitSlop={spacing.sm}
          style={styles.arrow}
        >
          <Text style={[styles.arrowText, !canNext && styles.future]}>›</Text>
        </Pressable>
      </View>

      {percent === null ? (
        <Text style={styles.noDoses}>{t.history.noDoses}</Text>
      ) : (
        <View style={styles.summary}>
          <Text style={styles.percent}>{t.history.percentTaken(percent)}</Text>
          <Text style={styles.count}>{t.history.doseCount(taken, total)}</Text>
        </View>
      )}

      <View style={styles.row}>
        {weekdays(history.firstDayOfWeek).map(d => (
          <Text
            key={d}
            style={styles.weekday}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {t.days[d]}
          </Text>
        ))}
      </View>
      {monthGrid(shown.month, history.firstDayOfWeek).map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map((date, j) =>
            date === null ? (
              <View key={j} style={styles.cell} />
            ) : (
              renderDay(date)
            ),
          )}
        </View>
      ))}

      <View style={styles.legend}>
        {(['all', 'some', 'none'] as const).map(state => (
          <View key={state} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: FILL[state] }]} />
            <Text style={styles.legendText}>{stateWord(state, t)}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  message: {
    padding: 32,
    textAlign: 'center',
    fontSize: 18,
    color: colors.textMuted,
  },
  share: { fontSize: 18, fontWeight: '600', color: colors.primary },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrow: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  arrowText: { fontSize: 36, color: colors.text },
  monthLabel: { fontSize: 22, fontWeight: '600', color: colors.text },
  summary: { alignItems: 'center', marginVertical: spacing.md },
  percent: { fontSize: 32, fontWeight: '700', color: colors.text },
  count: { fontSize: 18, color: colors.textMuted },
  noDoses: {
    textAlign: 'center',
    fontSize: 18,
    color: colors.textMuted,
    marginVertical: spacing.md,
  },
  row: { flexDirection: 'row' },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    color: colors.textMuted,
    paddingVertical: spacing.xs,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    margin: 2,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  today: { borderWidth: 2, borderColor: colors.text },
  dayNumber: { fontSize: 18, color: colors.text },
  onFill: { color: colors.onPrimary, fontWeight: '600' },
  future: { color: colors.textMuted },
  legend: { marginTop: spacing.md, gap: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  swatch: { width: 20, height: 20, borderRadius: 4 },
  legendText: { fontSize: 16, color: colors.text },
});
