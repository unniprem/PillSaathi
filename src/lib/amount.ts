import type { Lang } from '../i18n';

/** A pill's type, as the native module stores it. Its label is `t.forms[form]`. */
export type PillForm = 'tablet' | 'capsule' | 'syrup' | 'drops';

export const FORMS: PillForm[] = ['tablet', 'capsule', 'syrup', 'drops'];

/** Shown wherever a pill has no photo, the same icons as the ringing screen. */
export const FORM_ICONS: Record<PillForm, string> = {
  tablet: '⚪',
  capsule: '💊',
  syrup: '🧴',
  drops: '💧',
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

/** Each type's unit in each language, singular then plural. */
const UNITS: Record<Lang, Record<PillForm, [string, string]>> = {
  en: {
    tablet: ['tablet', 'tablets'],
    capsule: ['capsule', 'capsules'],
    syrup: ['ml', 'ml'],
    drops: ['drop', 'drops'],
  },
  ml: {
    tablet: ['ഗുളിക', 'ഗുളിക'],
    capsule: ['ക്യാപ്സ്യൂൾ', 'ക്യാപ്സ്യൂൾ'],
    syrup: ['ml', 'ml'],
    drops: ['തുള്ളി', 'തുള്ളി'],
  },
  hi: {
    tablet: ['गोली', 'गोलियाँ'],
    capsule: ['कैप्सूल', 'कैप्सूल'],
    syrup: ['ml', 'ml'],
    drops: ['बूंद', 'बूंदें'],
  },
};

/** When the unit is plural: English above 1, Hindi from 2, Malayalam never. */
const PLURAL: Record<Lang, (amount: number) => boolean> = {
  en: amount => amount > 1,
  ml: () => false,
  hi: amount => amount >= 2,
};

/**
 * "½ tablet", "1½ tablets", "7.5 ml", "2 drops" in [lang]: the same text the ringing screen
 * shows. Digits stay Western in every language.
 */
export function formatAmount(
  form: PillForm,
  amount: number,
  lang: Lang = 'en',
): string {
  const whole = Math.floor(amount);
  const half = amount - whole >= 0.25;
  let number = String(whole);
  if (half) {
    number =
      form === 'tablet' ? `${whole === 0 ? '' : whole}½` : String(amount);
  }
  const [one, many] = UNITS[lang][form];
  return `${number} ${PLURAL[lang](amount) ? many : one}`;
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
