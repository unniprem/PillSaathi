import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../../i18n';
import type { Strings } from '../../i18n';
import { formatAmount } from '../../lib/amount';
import type { Refill } from '../../native/alarms';
import { colors, font, radius, shadow } from '../../theme';
import Icon from '../../ui/Icon';

type Props = {
  refill: Refill;
  /** Opens the pill at its count. */
  onAdd: () => void;
};

/** "About 4 days.", "About 1 day." or "Less than a day." */
export function daysText(daysLeft: number, t: Strings): string {
  if (daysLeft === 0) {
    return t.refill.lessThanDay;
  }
  return daysLeft === 1 ? t.refill.aboutOneDay : t.refill.aboutDays(daysLeft);
}

/** A small card for a counted pill running low or out: how many are left, and + Add tablets. */
export default function RefillCard({ refill: r, onAdd }: Props) {
  const { lang, t } = useI18n();
  const add = r.form === 'capsule' ? t.refill.addCapsules : t.refill.addTablets;
  return (
    // At a large text size the button drops under the words rather than squeezing them.
    <View style={styles.card}>
      <View style={styles.icon}>
        <Icon name="inventory_2" size={22} color={colors.amberText} />
      </View>
      <View style={styles.words}>
        <Text style={styles.title}>
          {r.level === 'out'
            ? t.refill.out(r.name)
            : t.refill.left(r.name, formatAmount(r.form, r.remaining, lang))}
        </Text>
        {r.level === 'low' ? (
          <Text style={styles.days}>{daysText(r.daysLeft, t)}</Text>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={add}
        onPress={onAdd}
        style={({ pressed }) => [styles.add, pressed && styles.pressed]}
      >
        <Icon name="add" size={18} color={colors.blueText} />
        <Text style={styles.addText}>{add}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 12,
    boxShadow: shadow.card,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.amberTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  words: { flexGrow: 1, flexShrink: 1, flexBasis: 140 },
  title: { ...font(800), fontSize: 16, color: colors.navy },
  days: { ...font(700), fontSize: 14, color: colors.amberText, marginTop: 1 },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 48,
    paddingLeft: 10,
    paddingRight: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.blueTint,
  },
  pressed: { opacity: 0.8 },
  addText: { ...font(900), fontSize: 14, color: colors.blueText },
});
