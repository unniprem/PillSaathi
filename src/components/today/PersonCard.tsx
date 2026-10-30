import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../../i18n';
import { formatAmount } from '../../lib/amount';
import { toISODate } from '../../lib/course';
import { heardText, tallyText } from '../../lib/family';
import { problemText } from '../../lib/remote';
import type { FamilyCard } from '../../native/family';
import { colors, font, radius, shadow } from '../../theme';
import Avatar from '../../ui/Avatar';
import CallButton from '../../ui/CallButton';
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
  // As on her phone, skipped is drawn with missed. A dose her phone hasn't reported is amber, and
  // only what is still to come is grey.
  const missed = tally.missed + tally.skipped;
  // Before her first upload there is nothing to count: say so below, not "Nothing due today".
  const day = card.heardAt === null ? null : tallyText(tally, t);
  const missedLine = t.family.missedToday(tally.missed);
  // Two pills can share a name, so a line is known by its pill, not its words.
  const lines: { key: string; icon: IconName; text: string }[] = [];
  const warning = problemText(problem, t, card.name);
  if (warning) {
    lines.push({ key: 'problem', icon: 'warning', text: warning });
  }
  for (const r of card.refills) {
    lines.push({
      key: r.pillId,
      icon: 'inventory_2',
      text:
        r.level === 'out'
          ? t.refill.out(r.name)
          : t.refill.left(r.name, formatAmount(r.form, r.remaining, lang)),
    });
  }
  if (card.heardAt === null) {
    lines.push({
      key: 'heard',
      icon: 'schedule',
      text: t.family.notHeardYet(card.name),
    });
  } else if (card.silent) {
    const since = heardText(card.heardAt, toISODate(new Date()), is24h, t);
    lines.push({
      key: 'heard',
      icon: 'schedule',
      text: t.family.silentSince(since),
    });
  }

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
        {phone ? <CallButton phone={phone} /> : null}
      </View>
      {tally.taken + missed + tally.notReported + tally.later > 0 ? (
        <DoseBars
          taken={tally.taken}
          missed={missed}
          notReported={tally.notReported}
          rest={tally.later}
          onCard
        />
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
        <View key={line.key} style={styles.line}>
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
