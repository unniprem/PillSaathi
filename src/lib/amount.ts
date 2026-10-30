import type { Lang, Strings } from '../i18n';

/** A pill's type, as the native module stores it. Its label is `t.forms[form]`. */
export type PillForm = 'tablet' | 'capsule' | 'syrup' | 'drops';

export const FORMS: PillForm[] = ['tablet', 'capsule', 'syrup', 'drops'];

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

/** An amount's number and unit in [lang], such as "½" and "tablet", for a stepper. */
export function amountParts(
  form: PillForm,
  amount: number,
  lang: Lang = 'en',
): [string, string] {
  const whole = Math.floor(amount);
  const half = amount - whole >= 0.25;
  let number = String(whole);
  if (half) {
    number =
      form === 'tablet' ? `${whole === 0 ? '' : whole}½` : String(amount);
  }
  const [one, many] = UNITS[lang][form];
  return [number, PLURAL[lang](amount) ? many : one];
}

/**
 * "½ tablet", "1½ tablets", "7.5 ml", "2 drops" in [lang]: the same text the ringing screen
 * shows. Digits stay Western in every language.
 */
export function formatAmount(
  form: PillForm,
  amount: number,
  lang: Lang = 'en',
): string {
  return amountParts(form, amount, lang).join(' ');
}

/**
 * "Tablet · 1 each time", or "Syrup · 7.5 ml each time": the kind names what a tablet, a capsule
 * or a drop is, but not ml.
 */
export function kindAndAmount(
  form: PillForm,
  amount: number,
  t: Strings,
  lang: Lang = 'en',
): string {
  const [number, unit] = amountParts(form, amount, lang);
  return t.addPill.eachTime(
    t.forms[form],
    form === 'syrup' ? `${number} ${unit}` : number,
  );
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
