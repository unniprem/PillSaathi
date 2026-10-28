import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../i18n';
import type { Strings } from '../i18n';
import { formatAmount } from '../lib/amount';
import { courseLabel, nextLabel } from '../lib/course';
import { formatTime } from '../lib/time';
import type { TodayCard, TodayPill } from '../native/alarms';
import { colors, spacing } from '../theme';
import PillPicture from './PillPicture';

type Props = {
  card: TodayCard;
  /** Today, as the native side sees it (`YYYY-MM-DD`). */
  date: string;
  is24h: boolean;
  soundName: string | null;
  onOpenPill: (pillId: string) => void;
  onOpenSound: () => void;
  /** Offered for a missed or skipped dose. */
  onMarkTaken: () => void;
};

function clock(millis: number, is24h: boolean) {
  const d = new Date(millis);
  return formatTime(d.getHours(), d.getMinutes(), is24h);
}

/** "✓ Taken 8:02 AM", "Snoozed until 8:10 AM", "Next: tomorrow"…; empty for a card that is done. */
export function statusText(
  card: TodayCard,
  date: string,
  is24h: boolean,
  t: Strings,
) {
  const at = card.statusAt;
  switch (card.status) {
    case 'taken':
      return at === null ? t.status.taken : t.status.takenAt(clock(at, is24h));
    case 'skipped':
      return t.status.skipped;
    case 'missed':
      return t.status.missed;
    case 'ringing':
      return t.status.ringing;
    case 'snoozed':
      return at === null
        ? t.status.snoozed
        : t.status.snoozedUntil(clock(at, is24h));
    case 'upcoming':
      return t.status.upcoming;
    case 'later':
      return at === null ? '' : nextLabel(at, date, t);
    case 'notReported':
      return t.status.notReported;
    default:
      return '';
  }
}

function pillDetail(pill: TodayPill, date: string, t: Strings) {
  if (pill.fromTomorrow) {
    return t.course.fromTomorrow;
  }
  return pill.startDate === null
    ? ''
    : courseLabel(pill.startDate, pill.days, date, t);
}

/** One time on the Today screen: its status, its pills and its sound. */
export default function DoseCard({
  card,
  date,
  is24h,
  soundName,
  onOpenPill,
  onOpenSound,
  onMarkTaken,
}: Props) {
  const { lang, t } = useI18n();
  const status = statusText(card, date, is24h, t);
  const canMark = card.status === 'missed' || card.status === 'skipped';
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.time}>
          {formatTime(card.hour, card.minute, is24h)}
        </Text>
        {status ? (
          <Pressable
            accessibilityRole={canMark ? 'button' : 'text'}
            disabled={!canMark}
            onPress={onMarkTaken}
            style={[styles.status, canMark && styles.statusAction]}
          >
            <Text
              style={[
                styles.statusText,
                card.status === 'taken' && styles.taken,
                canMark && styles.attention,
              ]}
            >
              {status}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {card.pills.map(pill => {
        const detail = pillDetail(pill, date, t);
        return (
          <Pressable
            key={pill.pillId}
            accessibilityRole={pill.exists ? 'button' : 'text'}
            disabled={!pill.exists}
            onPress={() => onOpenPill(pill.pillId)}
            style={styles.pillRow}
          >
            <PillPicture key={pill.photoUri ?? ''} pill={pill} />
            <View style={styles.pillText}>
              <Text style={styles.pillName}>{pill.name}</Text>
              {detail ? <Text style={styles.detail}>{detail}</Text> : null}
            </View>
            <Text style={styles.amount}>
              {formatAmount(pill.form, pill.amount, lang)}
            </Text>
          </Pressable>
        );
      })}
      {card.alarmId ? (
        <Pressable
          accessibilityRole="button"
          onPress={onOpenSound}
          style={styles.soundRow}
        >
          <Text style={styles.sound}>
            {`♪ ${soundName ?? t.common.defaultTone}`}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
  status: { paddingVertical: spacing.xs },
  statusAction: {
    paddingHorizontal: spacing.sm,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  statusText: { fontSize: 18, color: colors.textMuted },
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
  pillText: { flex: 1 },
  pillName: { fontSize: 20, color: colors.text },
  detail: { fontSize: 16, color: colors.textMuted },
  amount: { fontSize: 18, color: colors.textMuted, marginLeft: spacing.md },
  soundRow: { paddingTop: spacing.sm },
  sound: { fontSize: 16, color: colors.primary },
});
