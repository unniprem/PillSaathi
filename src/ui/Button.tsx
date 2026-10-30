import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, font, radius, shadow } from '../theme';
import Icon from './Icon';
import type { IconName } from './icons';

type Variant = 'primary' | 'secondary' | 'green' | 'coral';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  disabled?: boolean;
  testID?: string;
};

const LOOK: Record<Variant, { fill: string; ink: string; glow?: string }> = {
  primary: { fill: colors.blue, ink: colors.onFill, glow: shadow.blue },
  secondary: { fill: colors.card, ink: colors.navy },
  green: { fill: colors.green, ink: colors.onFill, glow: shadow.green },
  coral: { fill: colors.coral, ink: colors.onFill, glow: shadow.coral },
};

/**
 * A big rounded button in full words: blue, white with a border, green for "I took it" and
 * Save, or coral for "I took it" on a missed dose. Its words are 18 sp bold, the size white
 * needs to read on green and coral, and wrap rather than clip at large text.
 */
export default function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  testID,
}: Props) {
  const look = LOOK[variant];
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      // The words, without the icon's glyph.
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: look.fill },
        variant === 'secondary' && styles.secondary,
        !disabled && look.glow != null && { boxShadow: look.glow },
        disabled && styles.off,
        pressed && styles.pressed,
      ]}
    >
      {icon ? <Icon name={icon} size={22} color={look.ink} /> : null}
      <Text style={[styles.label, { color: look.ink }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.button,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondary: { borderWidth: 2, borderColor: colors.edge },
  off: { opacity: 0.45 },
  pressed: { opacity: 0.85 },
  label: { ...font(900), fontSize: 18, textAlign: 'center', flexShrink: 1 },
});
