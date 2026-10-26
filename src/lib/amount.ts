/** A pill's type, as the native module stores it. */
export type PillForm = 'tablet' | 'capsule' | 'syrup' | 'drops';

export const FORMS: PillForm[] = ['tablet', 'capsule', 'syrup', 'drops'];

export const FORM_LABELS: Record<PillForm, string> = {
  tablet: 'Tablet',
  capsule: 'Capsule',
  syrup: 'Syrup',
  drops: 'Drops',
};

/** How each type's amount steps on the − / + stepper, and where it starts. */
export const AMOUNT_RULES: Record<
  PillForm,
  { step: number; min: number; max: number; initial: number }
> = {
  tablet: { step: 0.5, min: 0.5, max: 10, initial: 1 },
  capsule: { step: 1, min: 1, max: 10, initial: 1 },
  syrup: { step: 2.5, min: 2.5, max: 50, initial: 5 },
  drops: { step: 1, min: 1, max: 30, initial: 2 },
};

const UNITS: Record<PillForm, [string, string]> = {
  tablet: ['tablet', 'tablets'],
  capsule: ['capsule', 'capsules'],
  syrup: ['ml', 'ml'],
  drops: ['drop', 'drops'],
};

/** "½ tablet", "1½ tablets", "7.5 ml", "2 drops": the same text the ringing screen shows. */
export function formatAmount(form: PillForm, amount: number): string {
  const whole = Math.floor(amount);
  const half = amount - whole >= 0.25;
  let number = String(whole);
  if (half) {
    number =
      form === 'tablet' ? `${whole === 0 ? '' : whole}½` : String(amount);
  }
  const [one, many] = UNITS[form];
  return `${number} ${amount > 1 ? many : one}`;
}

/** [amount] one step up (1) or down (−1), kept within the type's range. */
export function stepAmount(
  form: PillForm,
  amount: number,
  direction: 1 | -1,
): number {
  const { step, min, max } = AMOUNT_RULES[form];
  return Math.min(max, Math.max(min, amount + direction * step));
}
