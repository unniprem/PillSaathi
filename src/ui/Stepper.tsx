import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font } from '../theme';
import Icon from './Icon';
import type { IconName } from './icons';

type Props = {
  value: string;
  /** Under the value, such as "tablet". */
  sub?: string;
  onLess: () => void;
  onMore: () => void;
  lessLabel: string;
  moreLabel: string;
  /** At the end of the range, so the button does nothing. */
  lessDisabled?: boolean;
  moreDisabled?: boolean;
};

/** − value + , with big round buttons either side. */
export default function Stepper({
  value,
  sub,
  onLess,
  onMore,
  lessLabel,
  moreLabel,
  lessDisabled = false,
  moreDisabled = false,
}: Props) {
  return (
    <View style={styles.row}>
      <StepButton
        icon="remove"
        label={lessLabel}
        onPress={onLess}
        disabled={lessDisabled}
      />
      <View style={styles.middle}>
        <Text style={styles.value}>{value}</Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      </View>
      <StepButton
        icon="add"
        label={moreLabel}
        onPress={onMore}
        disabled={moreDisabled}
      />
    </View>
  );
}

type StepProps = {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled: boolean;
};

function StepButton({ icon, label, onPress, disabled }: StepProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.off,
        pressed && styles.pressed,
      ]}
    >
      <Icon name={icon} size={28} color={colors.blue} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.blueTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  off: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
  middle: { flex: 1, alignItems: 'center' },
  value: {
    ...font(900),
    fontSize: 26,
    color: colors.navy,
    textAlign: 'center',
  },
  sub: { ...font(700), fontSize: 14, color: colors.muted, textAlign: 'center' },
});
