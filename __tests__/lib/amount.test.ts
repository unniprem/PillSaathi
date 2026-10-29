import {
  AMOUNT_RULES,
  FORMS,
  amountParts,
  formatAmount,
  kindAndAmount,
  stepAmount,
  type PillForm,
} from '../../src/lib/amount';
import { en } from '../../src/i18n/en';
import { ml } from '../../src/i18n/ml';

test.each([
  ['tablet', 0.5, '½ tablet'],
  ['tablet', 1, '1 tablet'],
  ['tablet', 1.5, '1½ tablets'],
  ['tablet', 2, '2 tablets'],
  ['capsule', 1, '1 capsule'],
  ['capsule', 2, '2 capsules'],
  ['syrup', 2.5, '2.5 ml'],
  ['syrup', 5, '5 ml'],
  ['syrup', 7.5, '7.5 ml'],
  ['syrup', 10, '10 ml'],
  ['drops', 1, '1 drop'],
  ['drops', 2, '2 drops'],
])('formatAmount(%s, %s) is %s', (form, amount, text) =>
  expect(formatAmount(form as PillForm, amount as number)).toBe(text),
);

test('formats Malayalam and Hindi amounts', () => {
  const rows: [PillForm, number, string, string][] = [
    ['tablet', 0.5, '½ ഗുളിക', '½ गोली'],
    ['tablet', 1, '1 ഗുളിക', '1 गोली'],
    ['tablet', 1.5, '1½ ഗുളിക', '1½ गोली'],
    ['tablet', 2, '2 ഗുളിക', '2 गोलियाँ'],
    ['capsule', 1, '1 ക്യാപ്സ്യൂൾ', '1 कैप्सूल'],
    ['capsule', 2, '2 ക്യാപ്സ്യൂൾ', '2 कैप्सूल'],
    ['syrup', 7.5, '7.5 ml', '7.5 ml'],
    ['drops', 1, '1 തുള്ളി', '1 बूंद'],
    ['drops', 2, '2 തുള്ളി', '2 बूंदें'],
  ];
  for (const [form, amount, mlText, hiText] of rows) {
    expect(formatAmount(form, amount, 'ml')).toBe(mlText);
    expect(formatAmount(form, amount, 'hi')).toBe(hiText);
  }
});

test('splits an amount into its number and unit', () => {
  expect(amountParts('tablet', 0.5)).toEqual(['½', 'tablet']);
  expect(amountParts('tablet', 1.5)).toEqual(['1½', 'tablets']);
  expect(amountParts('syrup', 7.5)).toEqual(['7.5', 'ml']);
  expect(amountParts('drops', 2, 'ml')).toEqual(['2', 'തുള്ളി']);
});

test('names the kind and how much each time', () => {
  expect(kindAndAmount('tablet', 1, en)).toBe('Tablet · 1 each time');
  expect(kindAndAmount('capsule', 2, en)).toBe('Capsule · 2 each time');
  expect(kindAndAmount('drops', 3, en)).toBe('Drops · 3 each time');
  // A syrup's ml isn't the kind, so it says it.
  expect(kindAndAmount('syrup', 7.5, en)).toBe('Syrup · 7.5 ml each time');
  expect(kindAndAmount('tablet', 0.5, ml, 'ml')).toBe(
    `${ml.forms.tablet} · ഓരോ തവണയും ½`,
  );
});

test('stepAmount steps and clamps', () => {
  expect(stepAmount('tablet', 1, 1)).toBe(1.5);
  expect(stepAmount('tablet', 0.5, -1)).toBe(0.5);
  expect(stepAmount('tablet', 10, 1)).toBe(10);
  expect(stepAmount('syrup', 5, 1)).toBe(7.5);
  expect(stepAmount('syrup', 50, 1)).toBe(50);
  expect(stepAmount('capsule', 1, -1)).toBe(1);
  expect(stepAmount('drops', 2, 1)).toBe(3);
  expect(stepAmount('drops', 30, 1)).toBe(30);
});

test('lists the forms in table order with their labels and rules', () => {
  expect(FORMS).toEqual(['tablet', 'capsule', 'syrup', 'drops']);
  expect(FORMS.map(f => en.forms[f])).toEqual([
    'Tablet',
    'Capsule',
    'Syrup',
    'Drops',
  ]);
  expect(AMOUNT_RULES.tablet).toEqual({
    step: 0.5,
    min: 0.5,
    max: 10,
    initial: 1,
  });
  expect(AMOUNT_RULES.syrup).toEqual({
    step: 2.5,
    min: 2.5,
    max: 50,
    initial: 5,
  });
  expect(AMOUNT_RULES.drops.initial).toBe(2);
});
