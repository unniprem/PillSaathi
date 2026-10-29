import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useI18n } from '../../i18n';
import { addToCount, stepReady } from '../../lib/pillDraft';
import type { PillDraft } from '../../lib/pillDraft';
import Button from '../../ui/Button';
import Chip from '../../ui/Chip';
import Sheet from '../../ui/Sheet';
import { sheetLook } from './sheetLook';

type Props = {
  visible: boolean;
  /** The pill as saved: a tablet or a capsule. */
  draft: PillDraft;
  /** Opened to type a count, from the running-low card: the keyboard comes up at once. */
  autoFocus: boolean;
  saving: boolean;
  onClose: () => void;
  /** Saves the whole pill, with this sheet's change. */
  onSave: (d: PillDraft) => void;
};

const QUICK_COUNTS = [10, 15, 30];

/** Tablets (or capsules) left: typed, or a strip added with + 10, + 15 or + 30. */
export default function CountSheet({ visible, onClose, ...rest }: Props) {
  const { t } = useI18n();
  const title =
    rest.draft.form === 'capsule' ? t.pill.capsulesLeft : t.pill.tabletsLeft;
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {/* Only while open, so each opening starts from the pill as saved. */}
      {visible ? <Count {...rest} label={title} /> : null}
    </Sheet>
  );
}

function Count({
  draft,
  autoFocus,
  saving,
  onSave,
  label,
}: Omit<Props, 'visible' | 'onClose'> & { label: string }) {
  const { t } = useI18n();
  const [count, setCount] = useState(draft.count);
  // Sent as changed only once touched, so a count a Taken lowered meanwhile isn't put back.
  const [touched, setTouched] = useState(false);
  const next: PillDraft = { ...draft, count, countChanged: touched };
  const valid = stepReady(next, 5);

  const change = (text: string) => {
    setCount(text);
    setTouched(true);
  };

  return (
    <>
      {/* At a large text size the + buttons wrap under the field. */}
      <View style={styles.row}>
        <TextInput
          value={count}
          onChangeText={change}
          accessibilityLabel={label}
          autoFocus={autoFocus}
          keyboardType="decimal-pad"
          maxLength={5}
          style={[sheetLook.field, styles.field, !valid && sheetLook.invalid]}
        />
        {QUICK_COUNTS.map(n => (
          <Chip
            key={n}
            label={`+${n}`}
            onPress={() => change(addToCount(count, n))}
          />
        ))}
      </View>
      <Text style={sheetLook.note}>{t.pill.countNote}</Text>
      <Button
        label={t.common.save}
        icon="check"
        variant="green"
        disabled={!valid || saving}
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
    gap: 8,
  },
  field: { minWidth: 100 },
});
