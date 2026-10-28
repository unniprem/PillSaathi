import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../i18n';
import { formatAmount } from '../lib/amount';
import { toISODate } from '../lib/course';
import { heardText, tallyText } from '../lib/family';
import type { FamilyCard } from '../native/family';
import { colors, spacing } from '../theme';

type Props = {
  cards: FamilyCard[];
  is24h: boolean;
  onOpen: (elderId: string) => void;
  onAdd: () => void;
};

/**
 * Today's Family section: one card per elder this phone looks after, with her day in numbers, a
 * warning when her phone has gone quiet, and her pills running low; then + Add family.
 */
export default function FamilySection({ cards, is24h, onOpen, onAdd }: Props) {
  const { lang, t } = useI18n();
  const today = toISODate(new Date());
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{t.family.title}</Text>
      {cards.map(card => (
        <Pressable
          key={card.elderId}
          accessibilityRole="button"
          onPress={() => onOpen(card.elderId)}
          style={styles.card}
        >
          <Text style={styles.name}>{card.name}</Text>
          {/* Before her first upload there is nothing to count: say so, not "Nothing due today". */}
          <Text style={styles.tally}>
            {card.heardAt === null
              ? t.family.notHeardYet(card.name)
              : tallyText(card.tally, t)}
          </Text>
          {card.silent && card.heardAt !== null ? (
            <Text style={styles.silent}>
              {t.family.silentSince(heardText(card.heardAt, today, is24h, t))}
            </Text>
          ) : null}
          {card.refills.map(r => (
            <Text key={r.pillId} style={styles.low}>
              {r.level === 'out'
                ? t.refill.out(r.name)
                : t.refill.left(
                    r.name,
                    formatAmount(r.form, r.remaining, lang),
                  )}
            </Text>
          ))}
        </Pressable>
      ))}
      <Pressable accessibilityRole="button" onPress={onAdd} style={styles.add}>
        <Text style={styles.addText}>{t.family.addFamily}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingTop: spacing.sm },
  heading: {
    fontSize: 16,
    color: colors.textMuted,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  card: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  name: { fontSize: 22, fontWeight: '600', color: colors.text },
  tally: { fontSize: 18, color: colors.text },
  silent: { fontSize: 16, color: colors.danger },
  low: { fontSize: 16, color: colors.warning },
  add: { marginHorizontal: spacing.md, paddingVertical: spacing.md },
  addText: { fontSize: 18, color: colors.primary, fontWeight: '600' },
});
