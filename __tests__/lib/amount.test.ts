import {
  AMOUNT_RULES,
  FORMS,
  FORM_LABELS,
  formatAmount,
  stepAmount,
  type PillForm,
} from '../../src/lib/amount';

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
  expect(FORMS.map(f => FORM_LABELS[f])).toEqual([
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
