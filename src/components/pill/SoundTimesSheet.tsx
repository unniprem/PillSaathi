import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../../i18n';
import { formatTime } from '../../lib/time';
import { colors, font } from '../../theme';
import Icon from '../../ui/Icon';
import Sheet from '../../ui/Sheet';
import { sheetLook } from './sheetLook';
import TimeTile from './TimeTile';

/** One of the pill's times, with the sound it rings with. */
export type TimeSound = {
  hour: number;
  minute: number;
  soundId: string | null;
  /** Null for the default alarm tone. */
  soundName: string | null;
  /** Her phone's card at this time, whose sound is set; null on a relative's phone. */
  alarmId: string | null;
  /** False on her phone when today has no card at the time (her course is over), so no sound to set. */
  settable: boolean;
};

type Props = {
  visible: boolean;
  times: TimeSound[];
  is24h: boolean;
  onClose: () => void;
  /** Opens the sound list for [time]. */
  onPick: (time: TimeSound) => void;
};

/**
 * The pill's times, each with its sound. A sound belongs to a time, so every pill at that time
 * rings with it; tapping a time opens the sound list for it.
 */
export default function SoundTimesSheet({
  visible,
  times,
  is24h,
  onClose,
  onPick,
}: Props) {
  const { t } = useI18n();
  return (
    <Sheet visible={visible} onClose={onClose} title={t.sound.title}>
      <Text style={sheetLook.note}>{t.pill.soundShared}</Text>
      {times.map(time => (
        <Pressable
          key={`${time.hour}:${time.minute}`}
          accessibilityRole="button"
          accessibilityState={{ disabled: !time.settable }}
          disabled={!time.settable}
          onPress={() => onPick(time)}
          style={({ pressed }) => [styles.row, pressed && sheetLook.pressed]}
        >
          <TimeTile hour={time.hour} />
          <View style={styles.words}>
            <Text style={styles.time}>
              {formatTime(time.hour, time.minute, is24h)}
            </Text>
            <Text style={styles.sound}>
              {time.soundName ?? t.common.defaultTone}
            </Text>
          </View>
          {time.settable ? (
            <Icon name="chevron_right" color={colors.muted} />
          ) : null}
        </Pressable>
      ))}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingVertical: 4,
  },
  words: { flex: 1 },
  time: { ...font(900), fontSize: 18, color: colors.navy },
  sound: { ...font(700), fontSize: 15, color: colors.muted, marginTop: 1 },
});
