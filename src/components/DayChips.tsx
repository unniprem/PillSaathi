import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DAY_CHIP_LETTER, DAY_CHIP_ORDER } from '../lib/days';
import { colors, spacing } from '../theme';

const DAY_NAME: Record<number, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
};

type Props = { days: number[]; onToggle: (day: number) => void };

/** Seven day chips, Sunday first. Days are ISO: 1 = Mon … 7 = Sun. */
export default function DayChips({ days, onToggle }: Props) {
  return (
    <View style={styles.row}>
      {DAY_CHIP_ORDER.map(day => {
        const selected = days.includes(day);
        return (
          <Pressable
            key={day}
            testID={`day-${day}`}
            accessibilityRole="checkbox"
            accessibilityLabel={DAY_NAME[day]}
            accessibilityState={{ checked: selected }}
            onPress={() => onToggle(day)}
            style={[styles.chip, selected && styles.chipOn]}
          >
            <Text style={[styles.letter, selected && styles.letterOn]}>
              {DAY_CHIP_LETTER[day]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  chip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.xs / 2,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  letter: { fontSize: 16, color: colors.text },
  letterOn: { color: colors.onPrimary, fontWeight: '600' },
});
