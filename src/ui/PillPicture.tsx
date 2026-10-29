import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { PillForm } from '../lib/amount';
import { colors, shadow } from '../theme';
import Icon from './Icon';
import { pillColor } from './pillLook';

type Props = {
  pill: { name: string; form: PillForm; photoUri: string | null };
  size?: 30 | 40 | 56;
};

/**
 * The pill's photo, or a shape by its type in its name's colour when it has none or the
 * photo can't be read. Callers key it by `photoUri`, so a new photo is tried afresh.
 */
export default function PillPicture({ pill, size = 40 }: Props) {
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size };
  if (pill.photoUri && !failed) {
    return (
      <Image
        testID="pill-photo"
        source={{ uri: pill.photoUri }}
        onError={() => setFailed(true)}
        style={[box, { borderRadius: size * 0.3 }]}
      />
    );
  }
  const color = pillColor(pill.name);
  return (
    <View style={[styles.box, box]}>
      {pill.form === 'tablet' ? (
        <View
          testID="pill-shape-tablet"
          style={[
            styles.tablet,
            {
              width: size * 0.82,
              height: size * 0.82,
              backgroundColor: color,
            },
          ]}
        >
          <View style={[styles.score, { width: size * 0.44 }]} />
        </View>
      ) : pill.form === 'capsule' ? (
        // Two-tone: the white half is drawn over the coloured body.
        <View
          testID="pill-shape-capsule"
          style={[
            styles.capsule,
            {
              width: size * 0.96,
              height: size * 0.34,
              borderRadius: size * 0.17,
              backgroundColor: color,
              transform: [{ rotate: '-45deg' }],
            },
          ]}
        >
          <View
            style={[
              styles.capsuleHalf,
              {
                borderTopLeftRadius: size * 0.17,
                borderBottomLeftRadius: size * 0.17,
              },
            ]}
          />
        </View>
      ) : (
        <View testID={`pill-shape-${pill.form}`}>
          <Icon
            name={pill.form === 'syrup' ? 'medication_liquid' : 'water_drop'}
            size={size * 0.85}
            color={color}
            style={styles.symbol}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  tablet: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: shadow.pill,
  },
  score: { height: 2, borderRadius: 1, backgroundColor: colors.shade },
  capsule: { boxShadow: shadow.pill },
  capsuleHalf: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '50%',
    backgroundColor: colors.card,
  },
  // A soft edge, so the palest colours still show on a white card.
  symbol: {
    textShadowColor: colors.shade,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
