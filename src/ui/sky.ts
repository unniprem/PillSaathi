/** The sky by the hour. The native ringing screen (SkyTime.kt) uses the same hours. */
export type Sky = 'dawn' | 'day' | 'evening' | 'night';

export function skyFor(hour: number): Sky {
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 19) return 'evening';
  return 'night';
}

export function greetingFor(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'evening';
}

/** The chip on a dose: a dose after midnight is still "tonight". */
export function whenChip(hour: number): 'morning' | 'afternoon' | 'tonight' {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'tonight';
}

/** Top to bottom. */
export const SKY_GRADIENT: Record<Sky, [string, string, string]> = {
  dawn: ['#8DCAF0', '#C4E4F6', '#FFE1C2'],
  day: ['#6DBBEA', '#A9D9F2', '#FBE2C4'],
  evening: ['#F2A27A', '#F7C59F', '#FBE2C4'],
  night: ['#0E1A3C', '#1F3368', '#3B5797'],
};
