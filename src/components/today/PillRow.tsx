import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../../i18n';
import type { Strings } from '../../i18n';
import { formatAmount } from '../../lib/amount';
import { courseLabel } from '../../lib/course';
import type { TodayPill } from '../../native/alarms';
import { colors, font } from '../../theme';
import PillPicture from '../../ui/PillPicture';

type Props = {
  pill: TodayPill;
  /** Today, as the native side sees it (`YYYY-MM-DD`). */
  date: string;
  onOpen: (pillId: string) => void;
  /** Behind the picture: soft grey on a white card, white on a tinted one. */
  tile?: string;
};

/** Where the pill is in its course: "day 2 of 5", "from tomorrow", or nothing. */
function courseText(pill: TodayPill, date: string, t: Strings) {
  if (pill.fromTomorrow) {
    return t.course.fromTomorrow;
  }
  return pill.startDate === null
    ? ''
    : courseLabel(pill.startDate, pill.days, date, t);
}

/**
 * One pill of a dose: its picture, its name, and how much with where it is in its course.
 * Tapping it opens the pill, unless it has been deleted since.
 */
export default function PillRow({ pill, date, onOpen, tile }: Props) {
  const { lang, t } = useI18n();
  const detail = [
    formatAmount(pill.form, pill.amount, lang),
    courseText(pill, date, t),
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      accessibilityRole={pill.exists ? 'button' : 'text'}
      disabled={!pill.exists}
      onPress={() => onOpen(pill.pillId)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.tile, tile != null && { backgroundColor: tile }]}>
        <PillPicture key={pill.photoUri ?? ''} pill={pill} />
      </View>
      <View style={styles.words}>
        <Text style={styles.name}>{pill.name}</Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    paddingVertical: 8,
  },
  pressed: { opacity: 0.7 },
  tile: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  words: { flex: 1 },
  name: { ...font(800), fontSize: 17, color: colors.navy },
  detail: { ...font(700), fontSize: 14, color: colors.muted, marginTop: 1 },
});
