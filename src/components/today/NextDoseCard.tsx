import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../../i18n';
import { formatTime } from '../../lib/time';
import { statusText, untilText } from '../../lib/today';
import type { TodayCard } from '../../native/alarms';
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
  /** The dose to take next; null when nothing is left to ring today. */
  next: TodayCard | null;
  /** Today's first time, which is tomorrow's first too once nothing is left. */
  first: TodayCard;
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
 * app opens during a ring. With nothing left today, tomorrow's first time.
 */
export default function NextDoseCard({
  next,
  first,
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
        <Text style={styles.line}>
          {t.today.tomorrowAt(formatTime(first.hour, first.minute, is24h))}
        </Text>
      </View>
    );
  }
  const when = whenChip(next.hour);
  const [digits, suffix] = formatTime(next.hour, next.minute, is24h).split(' ');
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
      {next.status === 'upcoming' ? (
        <Text style={styles.line}>
          {untilText(now, next.hour, next.minute, t)}
        </Text>
      ) : (
        <Text
          style={[
            styles.line,
            next.status === 'ringing' ? styles.ringing : styles.snoozed,
          ]}
        >
          {statusText(next, date, is24h, t)}
        </Text>
      )}
      <View style={styles.pills}>
        {next.pills.map(pill => (
          <PillRow
            key={pill.pillId}
            pill={pill}
            date={date}
            onOpen={onOpenPill}
          />
        ))}
      </View>
    </View>
  );
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
