import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useI18n } from '../../i18n';
import { courseSummary, toISODate } from '../../lib/course';
import { PRESETS, daysOf } from '../../lib/pillDraft';
import type { PillDraft } from '../../lib/pillDraft';
import { colors, font } from '../../theme';
import Button from '../../ui/Button';
import Chip from '../../ui/Chip';
import Sheet from '../../ui/Sheet';
import { sheetLook } from './sheetLook';

type Props = {
  visible: boolean;
  /** The pill as saved. */
  draft: PillDraft;
  is24h: boolean;
  saving: boolean;
  onClose: () => void;
  /** Saves the whole pill, with this sheet's change. */
  onSave: (d: PillDraft) => void;
};

/**
 * How long the pill is taken: 5, 10 or 30 days, No end, or Other… days typed. A pill keeps the
 * day it started, so there is no Today or Tomorrow to choose.
 */
export default function DurationSheet({ visible, onClose, ...rest }: Props) {
  const { t } = useI18n();
  return (
    <Sheet visible={visible} onClose={onClose} title={t.pill.howLong}>
      {/* Only while open, so each opening starts from the pill as saved. */}
      {visible ? <Duration {...rest} /> : null}
    </Sheet>
  );
}

function Duration({
  draft,
  is24h,
  saving,
  onSave,
}: Omit<Props, 'visible' | 'onClose'>) {
  const { t } = useI18n();
  const [duration, setDuration] = useState(draft.duration);
  const [otherDays, setOtherDays] = useState(draft.otherDays);
  const [today] = useState(() => toISODate(new Date()));
  const next: PillDraft = { ...draft, duration, otherDays };
  const days = daysOf(duration, otherDays);

  return (
    <>
      <View style={sheetLook.chips}>
        {PRESETS.map(n => (
          <Chip
            key={n}
            label={t.pill.nDays(n)}
            on={duration === n}
            onPress={() => setDuration(n)}
          />
        ))}
        <Chip
          label={t.pill.noEnd}
          on={duration === 'none'}
          onPress={() => setDuration('none')}
        />
        <Chip
          label={t.pill.otherDays}
          on={duration === 'other'}
          onPress={() => setDuration('other')}
        />
      </View>
      {duration === 'other' ? (
        <TextInput
          value={otherDays}
          onChangeText={setOtherDays}
          accessibilityLabel={t.pill.days}
          placeholder={t.pill.days}
          placeholderTextColor={colors.muted}
          keyboardType="number-pad"
          maxLength={3}
          // Typing starts once Other… is chosen, not when the sheet opens on it.
          autoFocus={draft.duration !== 'other'}
          style={[
            sheetLook.field,
            styles.days,
            days === undefined && sheetLook.invalid,
          ]}
        />
      ) : null}
      {days !== undefined && draft.times.length > 0 ? (
        <Text style={styles.summary}>
          {courseSummary({
            startDate: draft.startDate ?? today,
            days,
            times: draft.times,
            today,
            is24h,
            t,
          })}
        </Text>
      ) : null}
      <Button
        label={t.common.save}
        icon="check"
        variant="green"
        disabled={days === undefined || saving}
        onPress={() => onSave(next)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  days: { width: 140 },
  summary: { ...font(700), fontSize: 15, lineHeight: 21, color: colors.navy },
});
