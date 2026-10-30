import React from 'react';
import type { ReactNode } from 'react';
import { Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../i18n';
import { colors, font, radius, skyColors, spacing } from '../theme';
import Icon from './Icon';
import type { IconName } from './icons';
import { SKY_GRADIENT, skyFor, skyImage, skyInk } from './sky';

type Props = {
  title: string;
  sub?: string;
  onBack?: () => void;
  onClose?: () => void;
  /** Round buttons on the right, such as Share. */
  right?: ReactNode;
  /** A step bar. Its [label] ("2 of 4 done") goes under it, in place of "2 of 4" beside it. */
  progress?: { step: number; total: number; label?: string };
  /** The hour whose sky to draw; now when left out. */
  hour?: number;
  /** What sits on the sky under the row, such as a pill's picture and name. */
  children?: ReactNode;
  /**
   * A person's page: her avatar, before the title, which then moves under the buttons, with
   * [action] (such as Call) after it.
   */
  picture?: ReactNode;
  action?: ReactNode;
};

/**
 * An inner page's header: a short band of the sky at this hour, with a round back or close
 * button, the title, and a step bar on a page that is one of several steps. With no title the
 * step bar takes the title's place, and with neither the buttons sit at the two ends. The app
 * draws edge to edge, so the band runs up under the status bar.
 */
export default function SkyBand({
  title,
  sub,
  onBack,
  onClose,
  right,
  progress,
  hour,
  children,
  picture,
  action,
}: Props) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const sky = skyFor(hour ?? new Date().getHours());
  const ink = skyInk(sky);
  const bar = progress ? (
    <View style={styles.steps}>
      <View
        style={[
          styles.track,
          {
            backgroundColor:
              sky === 'night' ? skyColors.nightTrack : skyColors.track,
          },
        ]}
      >
        <View
          style={[
            styles.done,
            {
              width: `${(100 * progress.step) / progress.total}%`,
              backgroundColor: ink,
            },
          ]}
        />
      </View>
      {progress.label == null ? (
        <Text style={[styles.stepText, { color: ink }]}>
          {t.steps.of(progress.step, progress.total)}
        </Text>
      ) : null}
    </View>
  ) : null;
  const heading = title ? (
    <View style={styles.titles}>
      {/* Grows less than the words under it: at twice the size a name such as "Ammoomma" beside
          her picture and Call broke inside the word, and it stays the biggest text even so. */}
      <Text
        testID="sky-title"
        accessibilityRole="header"
        maxFontSizeMultiplier={1.5}
        style={[styles.title, { color: ink }]}
      >
        {title}
      </Text>
      {sub ? <Text style={[styles.sub, { color: ink }]}>{sub}</Text> : null}
    </View>
  ) : null;
  return (
    <View
      testID="sky-band"
      style={[
        styles.band,
        {
          paddingTop: insets.top + spacing.sm,
          backgroundColor: SKY_GRADIENT[sky][1],
          backgroundImage: skyImage(sky, 70),
        },
      ]}
    >
      <StatusBar
        barStyle={sky === 'night' ? 'light-content' : 'dark-content'}
      />
      <View style={styles.row}>
        {onBack ? (
          <RoundButton
            icon="arrow_back"
            label={t.common.back}
            onPress={onBack}
          />
        ) : null}
        {onClose ? (
          <RoundButton icon="close" label={t.common.close} onPress={onClose} />
        ) : null}
        {/* With nothing here, the space keeps [right] on the right. */}
        {(picture ? null : heading ?? bar) ?? <View style={styles.titles} />}
        {right}
      </View>
      {picture ? (
        <View style={styles.row}>
          {picture}
          {heading}
          {action}
        </View>
      ) : null}
      {title && bar ? <View style={styles.row}>{bar}</View> : null}
      {progress?.label != null ? (
        <Text style={[styles.stepText, { color: ink }]}>{progress.label}</Text>
      ) : null}
      {children}
    </View>
  );
}

type RoundProps = { icon: IconName; label: string; onPress: () => void };

/** A 48 dp round button on the sky. Its icon has no word beside it, so it is labelled. */
export function RoundButton({ icon, label, onPress }: RoundProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.round, pressed && styles.pressed]}
    >
      <Icon name={icon} color={colors.navy} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  band: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  round: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: skyColors.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  titles: { flex: 1 },
  title: { ...font(900), fontSize: 23, letterSpacing: -0.3 },
  sub: { ...font(700), fontSize: 14, marginTop: 2 },
  steps: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  track: {
    flex: 1,
    height: 8,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  done: { height: '100%', borderRadius: radius.pill },
  stepText: { ...font(800), fontSize: 14 },
});
