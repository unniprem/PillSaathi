import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AMOUNT_RULES, formatAmount, stepAmount } from '../lib/amount';
import type { PillForm } from '../lib/amount';
import { colors, spacing } from '../theme';

type Props = {
  form: PillForm;
  amount: number;
  onChange: (amount: number) => void;
};

/** − amount + : steps by the type's step, within its range. */
export default function AmountStepper({ form, amount, onChange }: Props) {
  const { min, max } = AMOUNT_RULES[form];
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Less"
        accessibilityState={{ disabled: amount <= min }}
        disabled={amount <= min}
        onPress={() => onChange(stepAmount(form, amount, -1))}
        style={[styles.button, amount <= min && styles.off]}
      >
        <Text style={styles.sign}>−</Text>
      </Pressable>
      <Text style={styles.amount}>{formatAmount(form, amount)}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="More"
        accessibilityState={{ disabled: amount >= max }}
        disabled={amount >= max}
        onPress={() => onChange(stepAmount(form, amount, 1))}
        style={[styles.button, amount >= max && styles.off]}
      >
        <Text style={styles.sign}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  off: { opacity: 0.4 },
  sign: { fontSize: 28, color: colors.text },
  amount: {
    flex: 1,
    textAlign: 'center',
    fontSize: 22,
    color: colors.text,
    marginHorizontal: spacing.md,
  },
});
