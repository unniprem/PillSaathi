import React from 'react';
import type { ReactNode } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font, skyColors, spacing } from '../theme';
import { SKY_GRADIENT, skyFor, skyImage, skyInk } from './sky';

type Props = {
  hour: number;
  title: string;
  /** Under the title, such as the date. */
  sub?: string;
  /** Under the sub, such as the dose bars. */
  children?: ReactNode;
};

/**
 * The tall sky at the top of Today: the sun and clouds by day, the sun low in the evening, and
 * the moon and stars at night, all drawn with rounded views. It grows with large text, and
 * leaves room at its foot for the card below to lift 44 dp into it.
 */
export default function SkyTop({ hour, title, sub, children }: Props) {
  const insets = useSafeAreaInsets();
  const sky = skyFor(hour);
  const ink = skyInk(sky);
  return (
    <View
      style={[
        styles.top,
        {
          paddingTop: insets.top + spacing.lg,
          backgroundColor: SKY_GRADIENT[sky][1],
          backgroundImage: skyImage(sky, 52),
        },
      ]}
    >
      <StatusBar
        barStyle={sky === 'night' ? 'light-content' : 'dark-content'}
      />
      {sky === 'night' ? (
        <Night top={insets.top} />
      ) : (
        <Sun top={insets.top} low={sky === 'evening'} />
      )}
      <Text
        testID="sky-title"
        accessibilityRole="header"
        style={[styles.title, { color: ink }]}
      >
        {title}
      </Text>
      {sub ? <Text style={[styles.sub, { color: ink }]}>{sub}</Text> : null}
      {children}
    </View>
  );
}

/** The sun in the top corner with two clouds, or low and setting behind the card below. */
function Sun({ top, low }: { top: number; low: boolean }) {
  return (
    <>
      <View
        testID="sky-sun"
        style={[styles.sun, low ? styles.sunLow : { top: top + 4 }]}
      />
      {low ? null : (
        <Cloud width={52} style={[styles.near, { top: top + 61 }]} />
      )}
      <Cloud width={40} style={[styles.far, { top: top + 6 }]} />
    </>
  );
}

/**
 * A long rounded cloud with one round bump on top. Both parts are solid, inside the cloud's
 * bounds, and faded as one, so the bump shows no seam where it overlaps.
 */
function Cloud({
  width,
  style,
}: {
  width: number;
  style: StyleProp<ViewStyle>;
}) {
  const height = Math.round(width * 0.3);
  const bump = width / 2;
  return (
    <View
      needsOffscreenAlphaCompositing
      style={[styles.cloud, { width, height: bump / 2 + height }, style]}
    >
      <View
        style={[
          styles.puff,
          { top: bump / 2, width, height, borderRadius: height / 2 },
        ]}
      />
      <View
        style={[
          styles.puff,
          {
            left: width * 0.23,
            width: bump,
            height: bump,
            borderRadius: bump / 2,
          },
        ]}
      />
    </View>
  );
}

// Right and top of each star, with how bright it is.
const STARS: [number, number, number][] = [
  [72, 14, 0.9],
  [122, 44, 0.5],
  [172, 8, 0.8],
  [40, 96, 0.6],
  [146, 104, 0.4],
];

/**
 * A few stars, and a crescent moon: a round one with a disc of night sky over it, which hides
 * its glow on that side too.
 */
function Night({ top }: { top: number }) {
  return (
    <>
      {STARS.map(([right, y, opacity]) => (
        <View
          key={`${right}-${y}`}
          style={[styles.star, { right, top: top + y, opacity }]}
        />
      ))}
      <View testID="sky-moon" style={[styles.moon, { top: top + 8 }]}>
        <View style={styles.moonCut} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  top: {
    minHeight: 196,
    paddingHorizontal: 18,
    paddingBottom: 60,
    overflow: 'hidden',
  },
  // Clear of the sun or moon in the corner.
  title: { ...font(900), fontSize: 25, letterSpacing: -0.3, marginRight: 56 },
  sub: { ...font(700), fontSize: 14, marginTop: 2, marginRight: 56 },
  sun: {
    position: 'absolute',
    right: -14,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: skyColors.sun,
    backgroundImage: `radial-gradient(circle at 40% 40%, ${skyColors.sunCore}, ${skyColors.sun} 70%)`,
    boxShadow: `0px 0px 0px 12px ${skyColors.sunGlow}, 0px 0px 0px 26px ${skyColors.sunHalo}`,
  },
  sunLow: { right: 40, bottom: 20 },
  cloud: { position: 'absolute' },
  puff: { position: 'absolute', backgroundColor: skyColors.cloud },
  near: { right: -8, opacity: 0.88 },
  far: { right: 84, opacity: 0.6 },
  star: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: skyColors.star,
  },
  moon: {
    position: 'absolute',
    right: 18,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: skyColors.moon,
    boxShadow: `0px 0px 18px 0px ${skyColors.moonGlow}`,
  },
  moonCut: {
    position: 'absolute',
    left: 12,
    top: -5,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: skyColors.moonShade,
  },
});
