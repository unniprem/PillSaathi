import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../../i18n';
import type { Issue } from '../../lib/health';
import { colors, font, shadow } from '../../theme';
import Button from '../../ui/Button';
import Icon from '../../ui/Icon';

type Props = {
  issues: Issue[];
  onFix: (issue: Issue) => void;
  /** About his missed-dose alerts, on a phone with no pills of its own, rather than its alarms. */
  alerts?: boolean;
};

/**
 * "Alarms may not ring", at the top of Today when something on the phone may stop them: the
 * first problem, how many more, and Fix now for that one. Nothing when all is well.
 */
export default function WarningCard({ issues, onFix, alerts = false }: Props) {
  const { t } = useI18n();
  if (issues.length === 0) {
    return null;
  }
  const first = issues[0];
  const more = issues.length > 1 ? t.health.more(issues.length - 1) : '';
  return (
    <View style={styles.card}>
      {/* The amber top edge. Android draws a top-only border on a rounded card as a flat bar
          inside the corners, so it's a strip the card clips to its rounded top instead. */}
      <View style={styles.edge} />
      <View style={styles.head}>
        <View style={styles.icon}>
          <Icon name="warning" size={22} color={colors.amberText} />
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          {alerts ? t.health.alertsTitle : t.health.title}
        </Text>
      </View>
      {/* The words say "Tap to fix", so tapping them does what Fix now does. */}
      <Text onPress={() => onFix(first)} style={styles.message}>
        {`${first.message}${more}`}
      </Text>
      <Button label={t.health.fix} onPress={() => onFix(first)} />
    </View>
  );
}

const EDGE = 5;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    overflow: 'hidden',
    padding: 16,
    paddingTop: 16 + EDGE,
    boxShadow: shadow.float,
  },
  edge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: EDGE,
    backgroundColor: colors.amber,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.amberTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...font(900), fontSize: 18, color: colors.navy, flexShrink: 1 },
  message: {
    ...font(600),
    fontSize: 15,
    lineHeight: 21,
    color: colors.muted,
    marginTop: 8,
    marginBottom: 12,
  },
});
