import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../i18n';
import { colors, spacing } from '../theme';

type Props = {
  name: string;
  detail?: string;
  selected: boolean;
  /** Omit for rows with nothing to preview (the default alarm tone). */
  playing?: boolean;
  previewId?: string;
  onPress: () => void;
  onLongPress?: () => void;
  onTogglePreview?: () => void;
};

export default function SoundRow({
  name,
  detail,
  selected,
  playing = false,
  previewId,
  onPress,
  onLongPress,
  onTogglePreview,
}: Props) {
  const { t } = useI18n();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.row}
    >
      <View style={styles.previewSlot}>
        {onTogglePreview ? (
          <Pressable
            testID={`preview-${previewId}`}
            accessibilityRole="button"
            accessibilityLabel={
              playing ? t.sound.stop(name) : t.sound.play(name)
            }
            hitSlop={8}
            onPress={onTogglePreview}
          >
            <Text style={styles.preview}>{playing ? '■' : '▶'}</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.text}>
        <Text testID="sound-name" style={styles.name}>
          {name}
        </Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
      <View style={[styles.radio, selected && styles.radioOn]}>
        {selected ? <View style={styles.dot} /> : null}
      </View>
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
  previewSlot: { width: 40, alignItems: 'center' },
  preview: { fontSize: 22, color: colors.primary },
  text: { flex: 1, marginHorizontal: spacing.sm },
  name: { fontSize: 18, color: colors.text },
  detail: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.primary },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
});
