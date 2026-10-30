import React from 'react';
import { StyleSheet, View } from 'react-native';
import { timeTiles } from '../../theme';
import Icon from '../../ui/Icon';
import type { IconName } from '../../ui/icons';
import { greetingFor } from '../../ui/sky';

/** A part of the day's symbol: a low sun, the sun, the moon. */
const PART_ICON: Record<ReturnType<typeof greetingFor>, IconName> = {
  morning: 'wb_twilight',
  afternoon: 'light_mode',
  evening: 'bedtime',
};

/** A dose time's symbol, on its part of the day's colours. */
export default function TimeTile({ hour }: { hour: number }) {
  const part = greetingFor(hour);
  return (
    <View style={[styles.tile, { backgroundColor: timeTiles[part].fill }]}>
      <Icon name={PART_ICON[part]} size={22} color={timeTiles[part].ink} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
