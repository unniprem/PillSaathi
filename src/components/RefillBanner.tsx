import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../i18n';
import { formatAmount } from '../lib/amount';
import type { Refill } from '../native/alarms';
import { colors, spacing } from '../theme';
import { daysText } from './today/RefillCard';

type Props = {
  refills: Refill[];
  /** Opens the pill at its count; without it (an elder's pills) the rows don't open. */
  onOpen?: (pillId: string) => void;
};

/** One row per counted pill running low or out; tapping a row opens the pill at its count. */
export default function RefillBanner({ refills, onOpen }: Props) {
  const { lang, t } = useI18n();
  return (
    <>
      {refills.map(r => (
        <Pressable
          key={r.pillId}
          accessibilityRole={onOpen ? 'button' : 'text'}
          disabled={!onOpen}
          onPress={() => onOpen?.(r.pillId)}
          style={styles.banner}
        >
          <View style={styles.text}>
            <Text style={styles.title}>
              {r.level === 'out'
                ? t.refill.out(r.name)
                : t.refill.left(
                    r.name,
                    formatAmount(r.form, r.remaining, lang),
                  )}
            </Text>
            {r.level === 'low' ? (
              <Text style={styles.days}>{daysText(r.daysLeft, t)}</Text>
            ) : null}
          </View>
          {onOpen ? (
            <Text style={styles.action}>
              {r.form === 'capsule'
                ? t.refill.addCapsules
                : t.refill.addTablets}
            </Text>
          ) : null}
        </Pressable>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  // At a large text size the action drops under the text rather than squeezing it.
  banner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#F59E0B',
    padding: spacing.md,
  },
  text: { flexShrink: 1 },
  title: { color: colors.text, fontSize: 16, fontWeight: '600' },
  days: { color: colors.text, fontSize: 16 },
  action: { color: colors.primary, fontSize: 16, fontWeight: '600' },
});
