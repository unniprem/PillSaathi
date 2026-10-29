import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../i18n';
import { colors, font, shadow } from '../theme';
import Icon from '../ui/Icon';
import type { IconName } from '../ui/icons';

type Props = {
  name: string;
  detail?: string;
  selected: boolean;
  /** Omit for rows with nothing to preview (the default alarm tone, her sounds). */
  playing?: boolean;
  previewId?: string;
  /** Drawn in place of the play button on a row with nothing to preview. */
  icon?: IconName;
  /** The first row of its card, with no line above it. */
  first?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  onTogglePreview?: () => void;
};

/**
 * One sound in the list: a round play button, the name and what it is, and a round tick on the
 * one in use. The play button is its own control; the rest of the row uses the sound.
 */
export default function SoundRow({
  name,
  detail,
  selected,
  playing = false,
  previewId,
  icon = 'music_note',
  first = false,
  onPress,
  onLongPress,
  onTogglePreview,
}: Props) {
  const { t } = useI18n();
  return (
    <View style={[styles.row, !first && styles.line]}>
      {onTogglePreview ? (
        <Pressable
          testID={`preview-${previewId}`}
          accessibilityRole="button"
          accessibilityLabel={playing ? t.sound.stop(name) : t.sound.play(name)}
          onPress={onTogglePreview}
          style={({ pressed }) => [
            styles.round,
            playing ? styles.playing : styles.tinted,
            pressed && styles.pressed,
          ]}
        >
          <Icon
            name={playing ? 'pause' : 'play_arrow'}
            color={playing ? colors.onFill : colors.blue}
          />
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => [styles.pick, pressed && styles.pressed]}
      >
        {onTogglePreview ? null : (
          <View style={[styles.round, styles.tinted]}>
            <Icon name={icon} color={colors.blue} />
          </View>
        )}
        <View style={styles.words}>
          <Text testID="sound-name" style={styles.name}>
            {name}
          </Text>
          {detail ? <Text style={styles.detail}>{detail}</Text> : null}
        </View>
        <View style={[styles.tick, selected && styles.tickOn]}>
          {selected ? (
            <Icon name="check" size={18} color={colors.onFill} />
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  line: { borderTopWidth: 1, borderTopColor: colors.line },
  round: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tinted: { backgroundColor: colors.blueTint },
  playing: { backgroundColor: colors.blue, boxShadow: shadow.blue },
  pressed: { opacity: 0.7 },
  pick: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 68,
    paddingVertical: 10,
  },
  words: { flex: 1 },
  name: { ...font(800), fontSize: 17, color: colors.navy },
  detail: { ...font(600), fontSize: 14, color: colors.muted, marginTop: 2 },
  tick: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: colors.edge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickOn: { backgroundColor: colors.blue, borderColor: colors.blue },
});
