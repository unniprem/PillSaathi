import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { Issue } from '../lib/health';
import { colors, spacing } from '../theme';

type Props = {
  issues: Issue[];
  onAction: (issue: Issue) => void;
};

export default function HealthBanner({ issues, onAction }: Props) {
  if (issues.length === 0) {
    return null;
  }
  const first = issues[0];
  const more = issues.length > 1 ? ` (+${issues.length - 1} more)` : '';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onAction(first)}
      style={styles.banner}
    >
      <Text style={styles.text}>{`${first.message}${more}`}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#F59E0B',
    padding: spacing.md,
  },
  text: { color: colors.text, fontSize: 16, fontWeight: '600' },
});
