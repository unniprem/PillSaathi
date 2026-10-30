import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../../i18n';
import type { Strings } from '../../i18n';
import { addDays, formatDay } from '../../lib/course';
import { formatTime } from '../../lib/time';
import { pillsDueOn, statusText, untilText } from '../../lib/today';
import type { Due } from '../../lib/today';
import { colors, font, radius, shadow } from '../../theme';
import Icon from '../../ui/Icon';
import type { IconName } from '../../ui/icons';
import { whenChip } from '../../ui/sky';
import PillRow from './PillRow';

/** The sun coming up, high, or the moon, for a dose's time of day. */
export const WHEN_ICONS: Record<ReturnType<typeof whenChip>, IconName> = {
  morning: 'wb_twilight',
  afternoon: 'light_mode',
  tonight: 'bedtime',
};

type Props = {
  /** The dose to take next, today's or tonight's after midnight; null when nothing is left. */
  next: Due | null;
  /** With nothing left, the first ring after today; null when nothing rings again. */
  after: Due | null;
  /** A dose missed today: then the day isn't "all done". */
  anyMissed: boolean;
  /** Today, as the native side sees it (`YYYY-MM-DD`). */
  date: string;
  now: number;
  is24h: boolean;
  onOpenPill: (pillId: string) => void;
};

/**
 * The big card under the sky: the next dose's time, how long until it, and its pills. A dose
 * ringing or snoozed only says so, with no button: the ringing screen comes forward whenever the
 * app opens during a ring. With nothing left today or tonight, when the next ring is: tomorrow's
 * first time, or the day it next rings.
 */
export default function NextDoseCard({
  next,
  after,
  anyMissed,
  date,
  now,
  is24h,
  onOpenPill,
}: Props) {
  const { t } = useI18n();
  if (!next) {
    return (
      <View style={styles.card}>
        <Text style={styles.label}>{t.today.nextDose}</Text>
        <View style={styles.doneRow}>
          {anyMissed ? null : (
            <View style={styles.tick}>
              <Icon name="check" size={22} color={colors.onFill} />
            </View>
          )}
          <Text style={styles.doneTitle}>
            {anyMissed ? t.today.noMore : t.today.allDone}
          </Text>
        </View>
        {after ? (
          <Text style={styles.line}>{ringText(after, date, is24h, t)}</Text>
        ) : null}
      </View>
    );
  }
  const { card, day } = next;
  // Tonight's dose, after midnight, rings for the pills taken tomorrow.
  const pills = day === date ? card.pills : pillsDueOn(card, day);
  // Ringing or snoozed, it only says so; otherwise, how long until it.
  const inRing = card.status === 'ringing' || card.status === 'snoozed';
  const when = whenChip(card.hour);
  const [digits, suffix] = formatTime(card.hour, card.minute, is24h).split(' ');
  return (
    <View style={styles.card}>
      {/* At a large text size the chip drops under the label rather than squeezing it. */}
      <View style={styles.head}>
        <Text style={styles.label}>{t.today.nextDose}</Text>
        <View style={styles.when}>
          <Icon name={WHEN_ICONS[when]} size={16} color={colors.blueText} />
          <Text style={styles.whenText}>{t.today.when[when]}</Text>
        </View>
      </View>
      <Text style={styles.time}>
        {digits}
        {suffix ? <Text style={styles.suffix}>{` ${suffix}`}</Text> : null}
      </Text>
      {inRing ? (
        <Text
          style={[
            styles.line,
            card.status === 'ringing' ? styles.ringing : styles.snoozed,
          ]}
        >
          {statusText(card, date, is24h, t)}
        </Text>
      ) : (
        <Text style={styles.line}>{untilText(now, next.at, t)}</Text>
      )}
      <View style={styles.pills}>
        {pills.map(pill => (
          <PillRow
            key={pill.pillId}
            pill={pill}
            date={day}
            onOpen={onOpenPill}
          />
        ))}
      </View>
    </View>
  );
}

/** "Tomorrow, 8:00 AM", or "Wed 28 Oct, 9:00 AM" when nothing rings tomorrow. */
function ringText(ring: Due, date: string, is24h: boolean, t: Strings) {
  const time = formatTime(ring.card.hour, ring.card.minute, is24h);
  return ring.day === addDays(date, 1)
    ? t.today.tomorrowAt(time)
    : t.today.onDayAt(formatDay(ring.day, t), time);
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.big,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
    boxShadow: shadow.float,
  },
  head: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  label: {
    ...font(900),
    fontSize: 12.5,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.blue,
  },
  when: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingLeft: 8,
    paddingRight: 11,
    borderRadius: radius.pill,
    backgroundColor: colors.blueTint,
  },
  whenText: { ...font(800), fontSize: 13, color: colors.blueText },
  time: {
    ...font(900),
    fontSize: 42,
    letterSpacing: -1,
    color: colors.navy,
    marginTop: 4,
  },
  suffix: { fontSize: 21, letterSpacing: 0 },
  line: { ...font(700), fontSize: 15, color: colors.muted, marginBottom: 8 },
  ringing: { ...font(800), color: colors.coralText },
  snoozed: { ...font(800), color: colors.amberText },
  pills: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  tick: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneTitle: { ...font(900), fontSize: 22, color: colors.navy, flexShrink: 1 },
});
