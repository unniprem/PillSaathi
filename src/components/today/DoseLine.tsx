import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../../i18n';
import type { Strings } from '../../i18n';
import { formatTime } from '../../lib/time';
import { statusText } from '../../lib/today';
import type { TodayCard } from '../../native/alarms';
import { colors, font, radius } from '../../theme';
import Icon from '../../ui/Icon';
import type { IconName } from '../../ui/icons';
import { whenChip } from '../../ui/sky';
import { WHEN_ICONS } from './NextDoseCard';

type Props = {
  card: TodayCard;
  /** Today, as the native side sees it (`YYYY-MM-DD`). */
  date: string;
  is24h: boolean;
  /** Each pill's name opens it, as on the cards above: her phone has no other list of her pills. */
  onOpenPill: (pillId: string) => void;
  /** Offered for a skipped dose, which she can still mark taken. */
  onTookIt?: () => void;
};

/** "8:00 AM · both taken", "8:00 AM · skipped", "9:00 PM", "9:00 AM · Next: tomorrow". */
function lineText(card: TodayCard, date: string, is24h: boolean, t: Strings) {
  const time = formatTime(card.hour, card.minute, is24h);
  switch (card.status) {
    case 'taken':
      // The pills its record covered; any added since are from tomorrow.
      return `${time} · ${t.today.allTaken(
        card.pills.filter(p => !p.fromTomorrow).length,
      )}`;
    case 'skipped':
      return `${time} · ${t.today.skipped}`;
    case 'upcoming':
    case 'done':
      return time;
    default: {
      const status = statusText(card, date, is24h, t);
      return status ? `${time} · ${status}` : time;
    }
  }
}

function badge(card: TodayCard): { icon: IconName; fill: string; ink: string } {
  switch (card.status) {
    case 'taken':
      return { icon: 'check', fill: colors.green, ink: colors.onFill };
    case 'skipped':
      return { icon: 'close', fill: colors.line, ink: colors.muted };
    case 'done':
      return { icon: 'check', fill: colors.line, ink: colors.muted };
    default:
      return {
        icon: WHEN_ICONS[whenChip(card.hour)],
        fill: colors.blueTint,
        ink: colors.blue,
      };
  }
}

/**
 * A dose as one short line: a tick, the time with what happened, and the pill names under it,
 * each a link to its pill (unless deleted since). Used for the doses later today, on other days,
 * and the ones done with. A skipped one is grey, with a small I took it.
 */
export default function DoseLine({
  card,
  date,
  is24h,
  onOpenPill,
  onTookIt,
}: Props) {
  const { t } = useI18n();
  const look = badge(card);
  const skipped = card.status === 'skipped';
  const last = card.pills.length - 1;
  return (
    <View style={styles.line}>
      <View style={[styles.badge, { backgroundColor: look.fill }]}>
        <Icon name={look.icon} size={19} color={look.ink} />
      </View>
      <View style={styles.words}>
        <Text style={[styles.title, skipped && styles.faded]}>
          {lineText(card, date, is24h, t)}
        </Text>
        {last >= 0 ? (
          <View style={styles.names}>
            {card.pills.map((pill, i) => {
              const name = pill.fromTomorrow
                ? `${pill.name} (${t.course.fromTomorrow})`
                : pill.name;
              const comma = i < last ? ',' : '';
              return pill.exists ? (
                <Pressable
                  key={pill.pillId}
                  accessibilityRole="link"
                  accessibilityLabel={name}
                  onPress={() => onOpenPill(pill.pillId)}
                  style={({ pressed }) => [
                    styles.nameLink,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.name, styles.link]}>
                    {name}
                    {comma}
                  </Text>
                </Pressable>
              ) : (
                <View key={pill.pillId} style={styles.nameLink}>
                  <Text style={styles.name}>
                    {name}
                    {comma}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}
      </View>
      {skipped && onTookIt ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.today.tookItAt(
            formatTime(card.hour, card.minute, is24h),
          )}
          onPress={onTookIt}
          style={({ pressed }) => [styles.took, pressed && styles.pressed]}
        >
          <Text style={styles.tookText}>{t.today.tookIt}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // At a large text size I took it drops under the words rather than squeezing them.
  line: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  badge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  words: { flexGrow: 1, flexShrink: 1, flexBasis: 150 },
  title: { ...font(800), fontSize: 15, color: colors.navy },
  faded: { color: colors.muted },
  // Each link is a full 48 dp to tap, tucked up over the time's line (in the same view, so the
  // tap still lands) to keep the names close under it.
  names: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 8,
    marginTop: -10,
  },
  // A deleted pill's name too, so the names sit alike.
  nameLink: { minHeight: 48, justifyContent: 'center' },
  name: { ...font(700), fontSize: 14, color: colors.muted },
  link: { ...font(800), color: colors.blue },
  took: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.edge,
    backgroundColor: colors.card,
  },
  pressed: { opacity: 0.8 },
  tookText: { ...font(900), fontSize: 14, color: colors.blue },
});
