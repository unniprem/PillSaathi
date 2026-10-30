import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, font, spacing } from '../theme';
import Icon from './Icon';

type Props = { label: string; onPress: () => void };

/** A dashed row at the end of a list that adds one more: a plus, then "Add a pill" in blue. */
export default function AddRow({ label, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      // The words, without the plus's glyph.
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Icon name="add" size={20} color={colors.blue} />
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.edge,
  },
  pressed: { opacity: 0.7 },
  text: {
    ...font(900),
    flexShrink: 1,
    fontSize: 16,
    color: colors.blue,
    textAlign: 'center',
  },
});
