import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../../i18n';
import { formatTime } from '../../lib/time';
import type { TodayCard } from '../../native/alarms';
import { colors, font, radius } from '../../theme';
import Button from '../../ui/Button';
import PillRow from './PillRow';

type Props = {
  card: TodayCard;
  /** Today, as the native side sees it (`YYYY-MM-DD`). */
  date: string;
  is24h: boolean;
  /** She took it but the ring went unanswered: asks first, as there is no undo. */
  onTookIt: () => void;
  onOpenPill: (pillId: string) => void;
};

/** A dose missed today, on soft coral: its time, its pills, and a big I took it. */
export default function MissedCard({
  card,
  date,
  is24h,
  onTookIt,
  onOpenPill,
}: Props) {
  const { t } = useI18n();
  return (
    <View style={styles.card}>
      <Text style={styles.when}>
        {`${formatTime(card.hour, card.minute, is24h)} · ${t.today.missed}`}
      </Text>
      {card.pills.map(pill => (
        <PillRow
          key={pill.pillId}
          pill={pill}
          date={date}
          onOpen={onOpenPill}
          tile={colors.card}
        />
      ))}
      <View style={styles.action}>
        <Button
          label={t.today.tookIt}
          icon="check"
          variant="coral"
          onPress={onTookIt}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.coralTint,
    borderRadius: radius.card,
    padding: 14,
  },
  when: { ...font(800), fontSize: 15, color: colors.coralText },
  action: { marginTop: 6 },
});
