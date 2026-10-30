import React from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';
import { colors, font } from '../theme';

type Props = { children: ReactNode; style?: StyleProp<TextStyle> };

/**
 * A section's name in small blue capitals, as every section label in the Sky look. TalkBack
 * reads it as a heading, so she can jump from section to section.
 */
export default function SectionLabel({ children, style }: Props) {
  return (
    <Text accessibilityRole="header" style={[styles.label, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    ...font(900),
    fontSize: 13,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.blue,
  },
});
