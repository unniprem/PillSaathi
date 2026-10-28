import type { Strings } from '../i18n';

/** "482 913": a link code in two groups of three, easier to read out over the phone. */
export function formatCode(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}

/** The message Send code shares, telling a relative what to do with the code. */
export function shareMessage(code: string, t: Strings): string {
  return t.family.shareMessage(formatCode(code));
}

/** The error code a native family call rejected with, if any. */
export function errorCode(e: unknown): string | undefined {
  return (e as { code?: string } | null)?.code;
}
