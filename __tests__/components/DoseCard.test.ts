import { statusText } from '../../src/components/DoseCard';
import { en } from '../../src/i18n/en';
import type { TodayCard } from '../../src/native/alarms';

const card: TodayCard = {
  alarmId: null,
  hour: 14,
  minute: 0,
  soundId: null,
  pills: [],
  status: 'notReported',
  statusAt: null,
};

test('a dose with nothing uploaded reads "Not reported yet"', () => {
  expect(statusText(card, '2026-10-28', false, en)).toBe('Not reported yet');
});
