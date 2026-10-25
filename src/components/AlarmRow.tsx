import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { describeDays } from '../lib/days';
import { formatTime } from '../lib/time';
import type { Alarm } from '../native/alarms';
import { colors, spacing } from '../theme';

type Props = {
  alarm: Alarm;
  soundName: string | null;
  is24h: boolean;
  onPress: () => void;
  onToggle: (enabled: boolean) => void;
};

export default function AlarmRow({
  alarm,
  soundName,
  is24h,
  onPress,
  onToggle,
}: Props) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={styles.text}>
        <Text style={[styles.time, !alarm.enabled && styles.off]}>
          {formatTime(alarm.hour, alarm.minute, is24h)}
        </Text>
        <Text style={styles.name}>{alarm.name}</Text>
        <Text style={styles.detail}>
          {`🔊 ${soundName ?? 'Default alarm tone'} · ${describeDays(
            alarm.days,
          )}`}
        </Text>
      </View>
      <Switch value={alarm.enabled} onValueChange={onToggle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  text: { flex: 1 },
  time: { fontSize: 40, fontWeight: '300', color: colors.text },
  off: { color: colors.textMuted },
  name: { fontSize: 18, color: colors.text },
  detail: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
});
