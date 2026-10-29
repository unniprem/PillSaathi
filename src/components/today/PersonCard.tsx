import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../../i18n';
import { formatAmount } from '../../lib/amount';
import { toISODate } from '../../lib/course';
import { heardText, tallyText } from '../../lib/family';
import { problemText } from '../../lib/remote';
import type { FamilyCard } from '../../native/family';
import { colors, font, radius, shadow } from '../../theme';
import Avatar from '../../ui/Avatar';
import DoseBars from '../../ui/DoseBars';
import Icon from '../../ui/Icon';
import type { IconName } from '../../ui/icons';

type Props = {
  card: FamilyCard;
  /** Why her phone may not ring alarms, as her setup was last read; null when all is well. */
  problem: string | null;
  is24h: boolean;
  /** Opens her page. */
  onOpen: () => void;
};

/**
 * Someone this phone looks after, at the top of Today: her day in words and bars, Call when her
 * number is saved, a coral line for anything missed, then in amber anything that needs a look:
 * her phone's alarm problem, her pills running low, and her phone gone quiet.
 */
export default function PersonCard({ card, problem, is24h, onOpen }: Props) {
  const { lang, t } = useI18n();
  const { tally, phone } = card;
  // As on her phone: skipped is drawn with missed, and what is still to come is grey.
  const missed = tally.missed + tally.skipped;
  const rest = tally.notReported + tally.later;
  // Before her first upload there is nothing to count: say so below, not "Nothing due today".
  const day = card.heardAt === null ? null : tallyText(tally, t);
  const missedLine = t.family.missedToday(tally.missed);
  const lines: { icon: IconName; text: string }[] = [];
  const warning = problemText(problem, t, card.name);
  if (warning) {
    lines.push({ icon: 'warning', text: warning });
  }
  for (const r of card.refills) {
    lines.push({
      icon: 'inventory_2',
      text:
        r.level === 'out'
          ? t.refill.out(r.name)
          : t.refill.left(r.name, formatAmount(r.form, r.remaining, lang)),
    });
  }
  if (card.heardAt === null) {
    lines.push({ icon: 'schedule', text: t.family.notHeardYet(card.name) });
  } else if (card.silent) {
    const since = heardText(card.heardAt, toISODate(new Date()), is24h, t);
    lines.push({ icon: 'schedule', text: t.family.silentSince(since) });
  }

  const call = () =>
    Linking.openURL(`tel:${phone}`).catch(e =>
      console.warn('Could not open the dialer', e),
    );

  return (
    <View testID="person-card" style={styles.card}>
      {/* Call is beside what opens her page, not inside it, so TalkBack reaches both. */}
      <View style={styles.head}>
        <Pressable
          accessibilityRole="button"
          // Her name and day, without the avatar's letter.
          accessibilityLabel={day ? `${card.name}, ${day}` : card.name}
          onPress={onOpen}
          style={({ pressed }) => [styles.who, pressed && styles.pressed]}
        >
          <Avatar name={card.name} />
          <View style={styles.words}>
            <Text style={styles.name}>{card.name}</Text>
            {day ? <Text style={styles.tally}>{day}</Text> : null}
          </View>
        </Pressable>
        {phone ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.family.call}
            onPress={call}
            style={({ pressed }) => [styles.call, pressed && styles.pressed]}
          >
            <Icon name="call" size={24} color={colors.onFill} />
          </Pressable>
        ) : null}
      </View>
      {tally.taken + missed + rest > 0 ? (
        <DoseBars taken={tally.taken} missed={missed} rest={rest} onCard />
      ) : null}
      {tally.missed > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={missedLine}
          onPress={onOpen}
          style={({ pressed }) => [styles.missed, pressed && styles.pressed]}
        >
          <Text style={styles.missedText}>{missedLine}</Text>
          <Icon name="chevron_right" size={22} color={colors.coralText} />
        </Pressable>
      ) : null}
      {lines.map(line => (
        <View key={line.text} style={styles.line}>
          <Icon name={line.icon} size={18} color={colors.amberText} />
          <Text style={styles.lineText}>{line.text}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 14,
    gap: 10,
    boxShadow: shadow.float,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  who: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
  },
  words: { flex: 1 },
  name: { ...font(900), fontSize: 18, color: colors.navy },
  tally: { ...font(700), fontSize: 14.5, color: colors.muted, marginTop: 1 },
  call: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: shadow.green,
  },
  missed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    minHeight: 48,
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 14,
    backgroundColor: colors.coralTint,
  },
  missedText: {
    ...font(800),
    fontSize: 15,
    color: colors.coralText,
    flexShrink: 1,
  },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  lineText: {
    ...font(800),
    fontSize: 14.5,
    lineHeight: 20,
    color: colors.amberText,
    flexShrink: 1,
  },
  pressed: { opacity: 0.7 },
});
