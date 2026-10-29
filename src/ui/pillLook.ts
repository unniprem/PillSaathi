/**
 * A pill without a photo is drawn in a colour picked from its name, so it looks the
 * same every day and on every phone. The native ringing screen (PillLook.kt) uses the
 * same palette and the same sum.
 */
export const PILL_PALETTE = [
  '#9B3D2E',
  '#F0845F',
  '#5B8DEF',
  '#E9C46A',
  '#7FB685',
  '#B48CDB',
  '#F4F1EA',
  '#E07A9B',
];

/** The sum of the name's UTF-16 code units, ignoring case and outer spaces, mod n. */
export function nameIndex(name: string, n: number): number {
  const key = name.trim().toLowerCase();
  let sum = 0;
  for (let i = 0; i < key.length; i++) sum += key.charCodeAt(i);
  return sum % n;
}

export function pillColor(name: string): string {
  return PILL_PALETTE[nameIndex(name, PILL_PALETTE.length)];
}
