import {
  familyMessage,
  firstName,
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
    'Open PillSaathi, tap Family, then + Add family, and type 482 913. It works for 15 minutes.',
  );
});

test('familyMessage calls only OFFLINE no internet', () => {
  const failing = (code: string) => Object.assign(new Error(code), { code });
  expect(familyMessage(failing('OFFLINE'), en)).toBe(
    'No internet. Please try again.',
  );
  expect(familyMessage(failing('NOT_SET_UP'), en)).toBe(
    "Family isn't set up in this build.",
  );
  expect(familyMessage(failing('PERMISSION'), en)).toBe(
    'Something went wrong. Please try again later.',
  );
  // Google's own refusal (no account it can use, say) isn't the internet's fault.
  expect(familyMessage(failing('GOOGLE_FAILED'), en)).toBe(
    "Couldn't log in with Google on this phone.",
  );
  expect(familyMessage(new Error('boom'), en)).toBe(
    'Something went wrong. Please try again later.',
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

test('firstName is the first word of the Google name', () => {
  expect(firstName('Ravi Kumar')).toBe('Ravi');
  expect(firstName('  Ravi  ')).toBe('Ravi');
  expect(firstName('')).toBeNull();
  expect(firstName('   ')).toBeNull();
});
