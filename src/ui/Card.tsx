import React from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { colors, radius, shadow, spacing } from '../theme';

type Props = { style?: StyleProp<ViewStyle>; children: ReactNode };

/** A white card with large round corners and a soft shadow. */
export default function Card({ style, children }: Props) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    boxShadow: shadow.card,
  },
});
