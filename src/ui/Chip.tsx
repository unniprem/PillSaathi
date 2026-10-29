import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius } from '../theme';
import Icon from './Icon';
import type { IconName } from './icons';

type Props = {
  label: string;
  /** Chosen: navy, with white words. */
  on?: boolean;
  /** Without it the chip only shows something, such as how long a code works. */
  onPress?: () => void;
  icon?: IconName;
};

/** A rounded word on a soft fill, for one choice among a few such as "5 days". */
export default function Chip({ label, on = false, onPress, icon }: Props) {
  const ink = on ? colors.onFill : colors.navy;
  const inside = (
    <>
      {icon ? <Icon name={icon} size={18} color={ink} /> : null}
      <Text style={[styles.label, { color: ink }]}>{label}</Text>
    </>
  );
  if (!onPress) {
    return <View style={[styles.chip, on && styles.on]}>{inside}</View>;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        styles.tap,
        on && styles.on,
        pressed && styles.pressed,
      ]}
    >
      {inside}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.soft,
  },
  tap: { minHeight: 48 },
  on: { backgroundColor: colors.navy },
  pressed: { opacity: 0.8 },
  label: { ...font(800), fontSize: 15, flexShrink: 1 },
});
