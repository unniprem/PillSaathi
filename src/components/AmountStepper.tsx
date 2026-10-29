import React from 'react';
import { useI18n } from '../i18n';
import { AMOUNT_RULES, formatAmount, stepAmount } from '../lib/amount';
import type { PillForm } from '../lib/amount';
import Stepper from '../ui/Stepper';

type Props = {
  form: PillForm;
  amount: number;
  onChange: (amount: number) => void;
};

/** − amount + : steps by the type's step, within its range. */
export default function AmountStepper({ form, amount, onChange }: Props) {
  const { lang, t } = useI18n();
  const { min, max } = AMOUNT_RULES[form];
  return (
    <Stepper
      value={formatAmount(form, amount, lang)}
      onLess={() => onChange(stepAmount(form, amount, -1))}
      onMore={() => onChange(stepAmount(form, amount, 1))}
      lessLabel={t.pill.less}
      moreLabel={t.pill.more}
      lessDisabled={amount <= min}
      moreDisabled={amount >= max}
    />
  );
}
