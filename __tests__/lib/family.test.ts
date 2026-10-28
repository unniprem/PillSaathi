import {
  formatCode,
  heardText,
  shareMessage,
  tallyText,
} from '../../src/lib/family';
import { en } from '../../src/i18n/en';

test('formatCode and shareMessage', () => {
  expect(formatCode('482913')).toBe('482 913');
  expect(formatCode('000042')).toBe('000 042');
  expect(shareMessage('482913', en)).toBe(
    'Open PillSaathi, tap Add family, and type 482 913. It works for 15 minutes.',
  );
});

test('tallyText and heardText', () => {
  const tally = { taken: 2, skipped: 1, missed: 1, notReported: 1, later: 1 };
  expect(tallyText(tally, en)).toBe(
    '2 taken · 1 missed · 1 skipped · 1 not reported · 1 later',
  );
  expect(tallyText({ ...tally, skipped: 0, missed: 0 }, en)).toBe(
    '2 taken · 1 not reported · 1 later',
  );
  expect(
    tallyText(
      { taken: 0, skipped: 0, missed: 0, notReported: 0, later: 0 },
      en,
    ),
  ).toBe('Nothing due today');
  const at = new Date(2026, 9, 28, 13, 12).getTime();
  expect(heardText(at, '2026-10-28', false, en)).toBe('1:12 PM');
  expect(heardText(at, '2026-10-29', false, en)).toBe('Wed 28 Oct, 1:12 PM');
  expect(heardText(at, '2026-10-29', true, en)).toBe('Wed 28 Oct, 13:12');
});
