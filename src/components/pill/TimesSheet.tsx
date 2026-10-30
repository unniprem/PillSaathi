import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../../i18n';
import {
  MAX_TIMES,
  QUICK_TIMES,
  byTime,
  sameTime,
  stepReady,
} from '../../lib/pillDraft';
import type { PillDraft } from '../../lib/pillDraft';
import { formatTime } from '../../lib/time';
import { pickTime } from '../../native/alarms';
import { colors, font } from '../../theme';
import Button from '../../ui/Button';
import Icon from '../../ui/Icon';
import Sheet from '../../ui/Sheet';
import { sheetLook } from './sheetLook';
import TimeTile from './TimeTile';

type Props = {
  visible: boolean;
  /** The pill as saved. */
  draft: PillDraft;
  is24h: boolean;
  /** On a relative's phone, what he calls her: the times are on her clock. */
  elderName?: string;
  saving: boolean;
  onClose: () => void;
  /** Saves the whole pill, with this sheet's change. */
  onSave: (d: PillDraft) => void;
};

/** The times the pill rings at: change one, remove one, or add another, then Save them all. */
export default function TimesSheet({ visible, onClose, ...rest }: Props) {
  const { t } = useI18n();
  return (
    <Sheet visible={visible} onClose={onClose} title={t.pill.ringsAt}>
      {/* Only while open, so each opening starts from the pill as saved. */}
      {visible ? <Times {...rest} /> : null}
    </Sheet>
  );
}

function Times({
  draft,
  is24h,
  elderName,
  saving,
  onSave,
}: Omit<Props, 'visible' | 'onClose'>) {
  const { t } = useI18n();
  const [times, setTimes] = useState(draft.times);
  const mounted = useRef(true);
  const next: PillDraft = { ...draft, times };

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** Picks a time for slot [index], or a new one; a time already on the pill is refused. */
  const chooseTime = async (index?: number) => {
    const current = index === undefined ? QUICK_TIMES[0] : times[index];
    const picked = await pickTime(current.hour, current.minute);
    if (!picked || !mounted.current) {
      return;
    }
    if (times.some((time, i) => i !== index && sameTime(time, picked))) {
      Alert.alert(t.pill.timeTaken);
      return;
    }
    const changed =
      index === undefined
        ? [...times, picked]
        : times.map((time, i) => (i === index ? picked : time));
    setTimes(changed.sort(byTime));
  };

  const removeTime = (index: number) =>
    setTimes(list => list.filter((_, i) => i !== index));

  return (
    <>
      {elderName ? (
        <Text style={sheetLook.note}>{t.family.herTime(elderName)}</Text>
      ) : null}
      {times.map((time, i) => {
        const label = formatTime(time.hour, time.minute, is24h);
        return (
          // Change sits beside the time, or under it once large text needs the room.
          <View key={`${time.hour}:${time.minute}`} style={styles.row}>
            <TimeTile hour={time.hour} />
            <Text style={styles.time}>{label}</Text>
            <View style={styles.buttons}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.addPill.changeTime(label)}
                onPress={() => chooseTime(i)}
                style={({ pressed }) => [
                  sheetLook.small,
                  pressed && sheetLook.pressed,
                ]}
              >
                <Text style={sheetLook.smallText}>{t.pill.change}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.pill.removeTime(label)}
                onPress={() => removeTime(i)}
                style={({ pressed }) => [
                  styles.remove,
                  pressed && sheetLook.pressed,
                ]}
              >
                <Icon name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>
          </View>
        );
      })}
      {times.length < MAX_TIMES ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => chooseTime()}
          style={({ pressed }) => [
            sheetLook.addRow,
            pressed && sheetLook.pressed,
          ]}
        >
          <Icon name="add" size={20} color={colors.blue} />
          <Text style={sheetLook.addRowText}>{t.addPill.anotherTime}</Text>
        </Pressable>
      ) : null}
      <Button
        label={t.common.save}
        icon="check"
        variant="green"
        disabled={!stepReady(next, 3) || saving}
        onPress={() => onSave(next)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  time: {
    ...font(900),
    fontSize: 19,
    color: colors.navy,
    flexGrow: 1,
    flexShrink: 1,
  },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  remove: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.soft,
  },
});
