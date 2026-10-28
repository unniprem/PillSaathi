import { formatCode, shareMessage } from '../../src/lib/family';
import { en } from '../../src/i18n/en';

test('formatCode and shareMessage', () => {
  expect(formatCode('482913')).toBe('482 913');
  expect(formatCode('000042')).toBe('000 042');
  expect(shareMessage('482913', en)).toBe(
    'Open PillSaathi, tap Add family, and type 482 913. It works for 15 minutes.',
  );
});
