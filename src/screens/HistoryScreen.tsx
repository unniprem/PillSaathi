import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import type { NavigationProp, RouteProp } from '@react-navigation/native';
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
import { getElderHistory, listElderPills, listFollows } from '../native/family';
import type { History } from '../native/alarms';
import type {
  RootStackParamList,
  TabParamList,
} from '../navigation/RootNavigator';
import { useI18n } from '../i18n';
import type { Strings } from '../i18n';
import { colors, font, radius, spacing } from '../theme';
import Card from '../ui/Card';
import Icon from '../ui/Icon';
import type { IconName } from '../ui/icons';
import SkyBand, { RoundButton } from '../ui/SkyBand';

/** This phone's History, as a tab; or hers, on a relative's phone, as a page of its own. */
type Props = {
  navigation: NavigationProp<RootStackParamList>;
  route:
    | RouteProp<TabParamList, 'History'>
    | RouteProp<RootStackParamList, 'ElderHistory'>;
};

/** A month on screen and its doses up to today. */
type Shown = { month: string; history: History };

/**
 * How a day is drawn: every dose taken green, none coral, both with white numbers; some missed
 * an orange ring on cream; nothing recorded plain grey.
 */
const LOOK: Record<DayState, { fill?: string; ink: string }> = {
  all: { fill: colors.green, ink: colors.onFill },
  some: { fill: colors.amberTint, ink: colors.navy },
  none: { fill: colors.coral, ink: colors.onFill },
  empty: { ink: colors.muted },
};

/** `2026-10-18` → "18 Oct" */
function dayAndMonth(iso: string, t: Strings): string {
  return `${Number(iso.slice(8))} ${t.months[Number(iso.slice(5, 7)) - 1]}`;
}

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

/** All of [month]'s doses up to [History.today]: this phone's, or with [elderId] hers. */
async function loadMonth(month: string, elderId?: string): Promise<History> {
  const from = `${month}-01`;
  const to = addDays(`${addMonths(month, 1)}-01`, -1);
  const history = elderId
    ? await getElderHistory(elderId, from, to)
    : await getHistory(from, to);
  return {
    ...history,
    doses: history.doses.filter(d => d.date <= history.today),
  };
}

/**
 * A month at a glance: its share taken, then a calendar coloured by how each day went. Tapping a
 * day opens its timeline. Share sends the month on screen as plain text.
 */
export default function HistoryScreen({ navigation, route }: Props) {
  const elderId = route.params?.elderId;
  const { t, lang } = useI18n();
  const [shown, setShown] = useState<Shown | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  // What the relative calls her, for the title.
  const [herName, setHerName] = useState<string | null>(null);
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
  const load = useCallback(
    async (target: string | null) => {
      const request = ++latest.current;
      try {
        let next = target ?? monthOf(toISODate(new Date()));
        let history = await loadMonth(next, elderId);
        if (target === null && monthOf(history.today) !== next) {
          next = monthOf(history.today);
          history = await loadMonth(next, elderId);
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
    },
    [elderId],
  );

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
        loadMonth(shown.month, elderId),
        elderId ? listElderPills(elderId) : listPills(),
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
  }, [shown, lang, t, elderId]);

  // An elder's History is titled with what he calls her.
  useEffect(() => {
    if (!elderId) {
      return;
    }
    listFollows()
      .then(follows => {
        const follow = follows.find(f => f.elderId === elderId);
        if (follow && mounted.current) {
          setHerName(follow.name);
        }
      })
      .catch(e => console.warn('Could not read the follow', e));
  }, [elderId]);

  const band = (
    <SkyBand
      title={herName ? t.family.historyOf(herName) : t.history.title}
      onBack={elderId ? () => navigation.goBack() : undefined}
      right={
        shown ? (
          <RoundButton icon="share" label={t.history.share} onPress={share} />
        ) : undefined
      }
    />
  );

  if (!shown) {
    return (
      <View style={styles.page}>
        {band}
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
  // The month's first day with a dose recorded, which the count runs from.
  const firstDay = history.doses.reduce<string | null>(
    (first, d) => (first === null || d.date < first ? d.date : first),
    null,
  );

  const renderDay = (date: string) => {
    const future = date > today;
    const state = future ? 'empty' : dayState(days.get(date) ?? []);
    const word = stateWord(state, t);
    const look = LOOK[state];
    return (
      <View key={date} style={styles.cell}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            word
              ? t.history.dayLabel(formatDay(date, t), word)
              : formatDay(date, t)
          }
          disabled={future}
          onPress={() => navigation.navigate('HistoryDay', { date, elderId })}
          style={({ pressed }) => [
            styles.day,
            look.fill !== undefined && { backgroundColor: look.fill },
            state === 'some' && styles.some,
            date === today && styles.today,
            pressed && styles.pressed,
          ]}
        >
          <Text
            style={[
              styles.dayNumber,
              { color: look.ink },
              future && styles.future,
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {Number(date.slice(8))}
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.page}>
      {band}
      <ScrollView contentContainerStyle={styles.content}>
        {loadFailed && (
          <Text style={styles.message}>{t.history.loadFailed}</Text>
        )}

        <Card>
          <Text style={styles.label}>
            {t.months[monthNumber - 1].toUpperCase()}
          </Text>
          {percent === null || firstDay === null ? (
            <Text style={styles.noDoses}>{t.history.noDoses}</Text>
          ) : (
            <>
              <Text style={styles.percent}>
                {`${percent}%`}
                <Text style={styles.percentWord}> {t.history.taken}</Text>
              </Text>
              <View style={styles.track}>
                <View
                  testID="month-bar"
                  style={[styles.bar, { width: `${percent}%` }]}
                />
              </View>
              <Text style={styles.since}>
                {t.history.since(taken, total, dayAndMonth(firstDay, t))}
              </Text>
            </>
          )}
        </Card>

        <Card style={styles.calendar}>
          <View style={styles.monthRow}>
            <MonthButton
              icon="chevron_left"
              label={t.history.previousMonth}
              disabled={!canPrevious}
              onPress={() => load(addMonths(shown.month, -1))}
            />
            <Text style={styles.monthLabel}>
              {t.history.month(t.months[monthNumber - 1], year)}
            </Text>
            <MonthButton
              icon="chevron_right"
              label={t.history.nextMonth}
              disabled={!canNext}
              onPress={() => load(addMonths(shown.month, 1))}
            />
          </View>

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
            {(
              [
                ['all', t.history.allTaken],
                ['some', t.history.someMissed],
                ['none', t.history.none],
              ] as const
            ).map(([state, word]) => (
              <View key={state} style={styles.legendItem}>
                <View
                  style={[
                    styles.swatch,
                    { backgroundColor: LOOK[state].fill },
                    state === 'some' && styles.some,
                  ]}
                />
                <Text style={styles.legendText}>{word}</Text>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

type MonthProps = {
  icon: IconName;
  label: string;
  disabled: boolean;
  onPress: () => void;
};

/** A round arrow to the month before or after, faded where the records end. */
function MonthButton({ icon, label, disabled, onPress }: MonthProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.arrow,
        disabled && styles.off,
        pressed && styles.pressed,
      ]}
    >
      <Icon name={icon} size={28} color={colors.navy} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.page },
  content: { padding: spacing.md, gap: 12 },
  message: {
    ...font(700),
    padding: 32,
    textAlign: 'center',
    fontSize: 18,
    color: colors.muted,
  },
  label: {
    ...font(900),
    fontSize: 13,
    letterSpacing: 1.2,
    color: colors.blue,
  },
  percent: {
    ...font(900),
    fontSize: 36,
    letterSpacing: -0.8,
    color: colors.navy,
    marginTop: 2,
  },
  percentWord: { ...font(800), fontSize: 16, letterSpacing: 0 },
  track: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.soft,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 8,
  },
  bar: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.green,
  },
  since: { ...font(700), fontSize: 15, color: colors.muted },
  noDoses: { ...font(700), fontSize: 18, color: colors.muted, marginTop: 6 },
  // Narrow sides, so seven days fit a 360 dp phone at nearly 48 dp each.
  calendar: { paddingHorizontal: 6, paddingVertical: 12 },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 6,
    marginBottom: spacing.sm,
  },
  arrow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  off: { opacity: 0.35 },
  pressed: { opacity: 0.7 },
  monthLabel: {
    ...font(900),
    flex: 1,
    textAlign: 'center',
    fontSize: 19,
    color: colors.navy,
  },
  row: { flexDirection: 'row' },
  weekday: {
    ...font(800),
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    color: colors.muted,
    paddingVertical: spacing.xs,
  },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  day: {
    width: '100%',
    maxWidth: 48,
    aspectRatio: 1,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  some: { borderWidth: 3, borderColor: colors.amber },
  today: { borderWidth: 2.5, borderColor: colors.navy },
  // 18 sp bold: the size white needs on green and coral.
  dayNumber: { ...font(800), fontSize: 18 },
  future: { opacity: 0.45 },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: spacing.md,
    rowGap: spacing.xs,
    marginTop: 10,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 14, height: 14, borderRadius: 7 },
  legendText: { ...font(700), fontSize: 14, color: colors.muted },
});
