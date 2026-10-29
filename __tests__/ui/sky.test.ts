import { greetingFor, skyFor, whenChip } from '../../src/ui/sky';

test('the sky follows the clock', () => {
  expect([4, 5, 7, 8, 16, 17, 18, 19, 0].map(skyFor)).toEqual([
    'night',
    'dawn',
    'dawn',
    'day',
    'day',
    'evening',
    'evening',
    'night',
    'night',
  ]);
});

test('greetings', () => {
  expect([5, 11, 12, 16, 17, 2].map(greetingFor)).toEqual([
    'morning',
    'morning',
    'afternoon',
    'afternoon',
    'evening',
    'evening',
  ]);
});

test('a dose after midnight is tonight', () => {
  expect([8, 13, 21, 0].map(whenChip)).toEqual(['morning', 'afternoon', 'tonight', 'tonight']);
});
