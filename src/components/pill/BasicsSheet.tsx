import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useI18n } from '../../i18n';
import { AMOUNT_RULES, FORMS } from '../../lib/amount';
import type { PillForm } from '../../lib/amount';
import { stepReady } from '../../lib/pillDraft';
import type { PillDraft } from '../../lib/pillDraft';
import { colors } from '../../theme';
import Button from '../../ui/Button';
import Chip from '../../ui/Chip';
import Sheet from '../../ui/Sheet';
import AmountStepper from '../AmountStepper';
import { sheetLook } from './sheetLook';

type Props = {
  visible: boolean;
  /** The pill as saved. */
  draft: PillDraft;
  saving: boolean;
  onClose: () => void;
  /** Saves the whole pill, with this sheet's change. */
  onSave: (d: PillDraft) => void;
};

/** The pill's name, type and amount, changed together and saved at once. */
export default function BasicsSheet({ visible, onClose, ...rest }: Props) {
  const { t } = useI18n();
  return (
    <Sheet visible={visible} onClose={onClose} title={t.pill.basics}>
      {/* Only while open, so each opening starts from the pill as saved. */}
      {visible ? <Basics {...rest} /> : null}
    </Sheet>
  );
}

function Basics({ draft, saving, onSave }: Omit<Props, 'visible' | 'onClose'>) {
  const { t } = useI18n();
  const [name, setName] = useState(draft.name);
  const [form, setForm] = useState(draft.form);
  const [amount, setAmount] = useState(draft.amount);
  const next: PillDraft = { ...draft, name, form, amount };

  // A new type starts at its own amount.
  const chooseForm = (f: PillForm) => {
    if (f !== form) {
      setForm(f);
      setAmount(AMOUNT_RULES[f].initial);
    }
  };

  return (
    <>
      <Text style={sheetLook.label}>{t.pill.name}</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        maxLength={60}
        placeholder={t.pill.namePlaceholder}
        placeholderTextColor={colors.muted}
        style={sheetLook.field}
      />
      <Text style={sheetLook.label}>{t.pill.type}</Text>
      <View style={sheetLook.chips}>
        {FORMS.map(f => (
          <Chip
            key={f}
            label={t.forms[f]}
            on={form === f}
            onPress={() => chooseForm(f)}
          />
        ))}
      </View>
      <Text style={sheetLook.label}>{t.pill.howMuch}</Text>
      <AmountStepper form={form} amount={amount} onChange={setAmount} />
      <Button
        label={t.common.save}
        icon="check"
        variant="green"
        disabled={!stepReady(next, 1) || saving}
        onPress={() => onSave(next)}
      />
    </>
  );
}
