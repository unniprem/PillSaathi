import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius, skyColors } from '../theme';

type Props = {
  taken: number;
  missed: number;
  /** Due, but her phone hasn't said what happened: not one still to come. */
  notReported?: number;
  rest: number;
  /** On a white card the bars fill the width, and the ones still to come are grey. */
  onCard?: boolean;
};

/**
 * One rounded bar per dose today: green for taken, then coral for missed, amber for not
 * reported, then the rest. It is only a picture: the words beside it say the same, so TalkBack
 * skips it.
 */
export default function DoseBars({
  taken,
  missed,
  notReported = 0,
  rest,
  onCard = false,
}: Props) {
  const fills = [
    ...Array<string>(taken).fill(colors.green),
    ...Array<string>(missed).fill(colors.coral),
    ...Array<string>(notReported).fill(colors.amber),
    ...Array<string>(rest).fill(onCard ? colors.line : skyColors.glass),
  ];
  return (
    <View style={[styles.row, onCard && styles.full]}>
      {fills.map((fill, i) => (
        <View
          key={i}
          testID="dose-bar"
          style={[
            styles.bar,
            onCard ? styles.long : styles.short,
            { backgroundColor: fill },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 5, flexShrink: 1 },
  full: { gap: 4 },
  bar: { height: 8, borderRadius: radius.pill },
  // Shrinks when a day has many doses.
  short: { width: 22, flexShrink: 1 },
  long: { flex: 1 },
});
