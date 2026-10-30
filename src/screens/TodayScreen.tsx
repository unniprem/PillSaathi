import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import DoseLine from '../components/today/DoseLine';
import EmptyToday from '../components/today/EmptyToday';
import MissedCard from '../components/today/MissedCard';
import NextDoseCard from '../components/today/NextDoseCard';
import PersonCard from '../components/today/PersonCard';
import RefillCard from '../components/today/RefillCard';
import WarningCard from '../components/today/WarningCard';
import { formatDay } from '../lib/course';
import { firstName } from '../lib/family';
import { healthIssues } from '../lib/health';
import type { Issue } from '../lib/health';
import { afterReconcile, takeMissed } from '../lib/start';
import { formatTime } from '../lib/time';
import { arrangeToday, doseCounts, refreshAt } from '../lib/today';
import { currentManufacturer } from '../setup/oemSteps';
import {
  getHealth,
  getSetupState,
  getToday,
  is24HourFormat,
  markDoseTaken,
  openSetting,
} from '../native/alarms';
import type { MissedAlarm, Today, TodayCard } from '../native/alarms';
import {
  getElderSetup,
  getFamily,
  refreshFamily,
  signedInRelative,
} from '../native/family';
import type { FamilyCard } from '../native/family';
import type { TabProps } from '../navigation/RootNavigator';
import { useI18n } from '../i18n';
import type { Strings } from '../i18n';
import { colors, font, spacing } from '../theme';
import Card from '../ui/Card';
import DoseBars from '../ui/DoseBars';
import Icon from '../ui/Icon';
import SkyTop from '../ui/SkyTop';
import { greetingFor, skyFor, skyInk } from '../ui/sky';

type Props = TabProps<'Today'>;

/** While Today is on screen, the family cards are read again this often. */
const FAMILY_REFRESH_MS = 120_000;
/** And the clock, for the greeting, the sky and the time left. */
const CLOCK_MS = 60_000;

/** Each elder's alarm problem, from her setup as last read; a failed read shows none. */
async function problemsOf(
  cards: FamilyCard[],
): Promise<Record<string, string | null>> {
  const problems = await Promise.all(
    cards.map(card =>
      getElderSetup(card.elderId).then(
        setup => setup.problem,
        e => {
          console.warn("Could not read her phone's setup", e);
          return null;
        },
      ),
    ),
  );
  return Object.fromEntries(cards.map((c, i) => [c.elderId, problems[i]]));
}

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

/**
 * Her day: the sky with how many doses are done, any warning, the next dose, anything missed,
 * then the rest of the day as short lines. It all scrolls, the sky too, so large text never
 * pushes a button out of reach. On a phone that looks after someone, their cards come first and
 * this phone's own day follows under My pills.
 */
export default function TodayScreen({ navigation }: Props) {
  const { t } = useI18n();
  // Read by the refresh and mount effects, which must not re-run when the language changes.
  const words = useRef(t);
  words.current = t;
  const [issues, setIssues] = useState<Issue[]>([]);
  const [today, setToday] = useState<Today | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [family, setFamily] = useState<FamilyCard[]>([]);
  // By elder id; read with her card.
  const [problems, setProblems] = useState<Record<string, string | null>>({});
  // The Google account's first name, for the greeting.
  const [me, setMe] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const mounted = useRef(true);
  const familyRequest = useRef(0);
  const latest = useRef(0);
  // When the cards on screen were asked for, so the clock knows when they go out of date.
  const readAt = useRef(0);
  const firstFocus = useRef(true);

  /**
   * The family cards and their alarm problems as last read, then as read again now; offline keeps
   * the last ones.
   */
  const loadFamily = useCallback(async () => {
    const request = ++familyRequest.current;
    const show = async (cards: FamilyCard[]) => {
      const found = await problemsOf(cards);
      if (mounted.current && request === familyRequest.current) {
        setFamily(cards);
        setProblems(found);
      }
    };
    try {
      await show(await getFamily());
      await show(await refreshFamily());
    } catch (e) {
      console.warn('Could not load family', e);
    }
  }, []);

  const refresh = useCallback(async () => {
    const request = ++latest.current;
    // The doses the app's reconcile found missed (App runs it as the app opens, whatever page
    // it opens on); each is taken here once, so the alert can't repeat.
    const missed = takeMissed();
    if (missed.length > 0) {
      alertMissed(missed, () => navigation.navigate('Setup'), words.current);
    }
    loadFamily();
    signedInRelative()
      .then(r => mounted.current && setMe(r ? firstName(r.name) : null))
      .catch(e => console.warn('Could not check the Google login', e));
    // A health or setup failure must never hide the doses, and shows no
    // warning rather than a wrong one.
    Promise.all([getHealth(), getSetupState()])
      .then(([health, setup]) => {
        if (mounted.current && request === latest.current) {
          setIssues(
            healthIssues(health, setup, currentManufacturer(), words.current),
          );
        }
      })
      .catch(e => {
        console.warn('Could not read health', e);
        if (mounted.current && request === latest.current) {
          setIssues([]);
        }
      });
    let day: Today;
    try {
      readAt.current = Date.now();
      day = await getToday();
    } catch (e) {
      if (mounted.current && request === latest.current) {
        console.warn("Could not load today's doses", e);
        setLoadFailed(true);
      }
      return;
    }
    if (mounted.current && request === latest.current) {
      setToday(day);
      setLoadFailed(false);
      setLoaded(true);
      setNow(Date.now());
    }
  }, [navigation, loadFamily]);

  useEffect(() => {
    mounted.current = true;
    refresh();
    // Each time the app opens or comes back, once its alarms are mended: the day as mended, and
    // anything found missed.
    const stop = afterReconcile(refresh);
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
      stop();
    };
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      const familyTimer = setInterval(loadFamily, FAMILY_REFRESH_MS);
      const clockTimer = setInterval(() => setNow(Date.now()), CLOCK_MS);
      // The mount effect already refreshed for the first focus.
      if (firstFocus.current) {
        firstFocus.current = false;
      } else {
        refresh();
      }
      return () => {
        clearInterval(familyTimer);
        clearInterval(clockTimer);
      };
    }, [refresh, loadFamily]),
  );

  const date = today?.date;
  const cards = today?.cards ?? [];
  // Before the first read there are no cards, and the date isn't looked at.
  const { next, after, missed, later, otherDays, done } = arrangeToday(
    cards,
    date ?? '',
    now,
  );
  const staleAt = date ? refreshAt(next, date) : null;

  // The clock passed the next dose's time, or midnight, since the cards were read: read them
  // again, once, so they never count down to the same time tomorrow or stay on yesterday.
  useEffect(() => {
    if (staleAt !== null && readAt.current < staleAt && staleAt <= now) {
      refresh();
    }
  }, [now, staleAt, refresh]);

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
          refresh();
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

  const openPill = (pillId: string) => navigation.navigate('Pill', { pillId });
  const addPill = () => navigation.navigate('AddPill');

  const is24h = is24HourFormat();
  const hour = new Date(now).getHours();
  const counts = doseCounts(cards);
  const total = counts.taken + counts.missed + counts.rest;
  const noPills = cards.length === 0 && loaded && !loadFailed;
  const looksAfter = family.length > 0;
  const greeting = t.today.greeting[greetingFor(hour)];
  const key = (card: TodayCard) => `${card.hour}:${card.minute}`;

  return (
    <View style={styles.page}>
      <ScrollView testID="today-scroll" contentContainerStyle={styles.scroll}>
        <SkyTop
          hour={hour}
          title={looksAfter && me ? t.today.greetingTo(greeting, me) : greeting}
          sub={date ? formatDay(date, t) : undefined}
        >
          {total > 0 ? (
            <View style={styles.progress}>
              <DoseBars {...counts} />
              <Text
                style={[styles.progressText, { color: skyInk(skyFor(hour)) }]}
              >
                {t.today.progress(counts.taken, total)}
              </Text>
            </View>
          ) : null}
        </SkyTop>
        {/* The first card lifts into the foot of the sky. */}
        <View style={styles.body}>
          {family.map(card => (
            <PersonCard
              key={card.elderId}
              card={card}
              problem={problems[card.elderId] ?? null}
              is24h={is24h}
              onOpen={() =>
                navigation.navigate('Elder', { elderId: card.elderId })
              }
            />
          ))}
          {looksAfter ? (
            <Text style={[styles.label, styles.mine]}>{t.today.myPills}</Text>
          ) : null}
          <WarningCard issues={issues} onFix={runAction} />
          {today?.refills.map(r => (
            <RefillCard
              key={r.pillId}
              refill={r}
              onAdd={() =>
                navigation.navigate('Pill', {
                  pillId: r.pillId,
                  focusCount: true,
                })
              }
            />
          ))}
          {date && cards.length > 0 ? (
            <>
              <NextDoseCard
                next={next}
                after={after}
                anyMissed={missed.length > 0}
                date={date}
                now={now}
                is24h={is24h}
                onOpenPill={openPill}
              />
              {missed.map(card => (
                <MissedCard
                  key={key(card)}
                  card={card}
                  date={date}
                  is24h={is24h}
                  onTookIt={() => confirmTaken(card)}
                  onOpenPill={openPill}
                />
              ))}
              {later.length > 0 ? (
                <View>
                  <Text style={styles.label}>{t.today.laterToday}</Text>
                  {later.map(card => (
                    <DoseLine
                      key={key(card)}
                      card={card}
                      date={date}
                      is24h={is24h}
                      onOpenPill={openPill}
                    />
                  ))}
                </View>
              ) : null}
              {done.length > 0 ? (
                <View>
                  {done.map(card => (
                    <DoseLine
                      key={key(card)}
                      card={card}
                      date={date}
                      is24h={is24h}
                      onOpenPill={openPill}
                      onTookIt={() => confirmTaken(card)}
                    />
                  ))}
                </View>
              ) : null}
              {otherDays.length > 0 ? (
                <View>
                  <Text style={styles.label}>{t.today.otherDays}</Text>
                  {otherDays.map(card => (
                    <DoseLine
                      key={key(card)}
                      card={card}
                      date={date}
                      is24h={is24h}
                      onOpenPill={openPill}
                    />
                  ))}
                </View>
              ) : null}
            </>
          ) : null}
          {cards.length === 0 && loadFailed ? (
            <Card>
              <Text style={styles.failed}>{t.today.loadFailed}</Text>
            </Card>
          ) : null}
          {noPills && looksAfter ? (
            <View style={styles.noPills}>
              <Text style={styles.noPillsText}>{t.today.noOwnPills}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.today.addPill}
                onPress={addPill}
                style={({ pressed }) => [
                  styles.link,
                  pressed && styles.pressed,
                ]}
              >
                <Icon name="add" size={20} color={colors.blue} />
                <Text style={styles.addText}>{t.today.addPill}</Text>
              </Pressable>
            </View>
          ) : noPills ? (
            <EmptyToday
              onAdd={addPill}
              onShowCode={() => navigation.navigate('ShareCode')}
            />
          ) : loaded || loadFailed ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.today.addPill}
              onPress={addPill}
              style={({ pressed }) => [styles.add, pressed && styles.pressed]}
            >
              <Icon name="add" size={20} color={colors.blue} />
              <Text style={styles.addText}>{t.today.addPill}</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.page },
  scroll: { flexGrow: 1 },
  // At a large text size the words drop under the bars rather than squeezing them.
  progress: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 10,
    rowGap: 6,
    marginTop: 12,
    marginRight: 56,
  },
  progressText: { ...font(800), fontSize: 14 },
  body: {
    flexGrow: 1,
    marginTop: -44,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    gap: 12,
  },
  label: {
    ...font(900),
    fontSize: 12.5,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.blue,
    marginLeft: 4,
    marginBottom: 2,
  },
  // A little apart from the cards of the people above.
  mine: { marginTop: 6 },
  failed: {
    ...font(700),
    fontSize: 17,
    color: colors.muted,
    textAlign: 'center',
  },
  add: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.edge,
  },
  noPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 6,
    marginLeft: 4,
  },
  noPillsText: {
    ...font(700),
    fontSize: 15,
    color: colors.muted,
    flexShrink: 1,
  },
  link: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  pressed: { opacity: 0.7 },
  addText: {
    ...font(900),
    fontSize: 16,
    color: colors.blue,
    textAlign: 'center',
    flexShrink: 1,
  },
});
