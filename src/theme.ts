/**
 * The Sky look. Text on light backgrounds uses the 4.5:1 shades (muted, greenText,
 * coralText, amberText, blue); white text sits only on blue, or on green and coral
 * at 18 sp bold and up.
 */
const sky = {
  page: '#F5F8FB',
  card: '#FFFFFF',
  navy: '#15324A',
  muted: '#5B6E7E',
  line: '#E3EAF0',
  soft: '#F1F5F9',
  blue: '#2A7BB8',
  blueTint: '#E3F1FB',
  green: '#2E9E5B',
  greenTint: '#E5F5EC',
  greenText: '#1F7A43',
  coral: '#E0533D',
  coralTint: '#FFF0EC',
  coralText: '#C2412D',
  amberTint: '#FFF3D6',
  amberText: '#8A5A00',
  onFill: '#FFFFFF',
};

export const colors = {
  ...sky,
  // The old names, so screens not yet redrawn keep compiling.
  background: sky.page,
  surface: sky.soft,
  text: sky.navy,
  textMuted: sky.muted,
  primary: sky.blue,
  onPrimary: sky.onFill,
  border: sky.line,
  danger: sky.coralText,
  success: sky.greenText,
  warning: sky.amberText,
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24 };

export const radius = { card: 22, big: 26, button: 18, pill: 999 };

type Weight = 600 | 700 | 800 | 900;

/** Nunito at one of its four bundled weights. */
export function font(weight: Weight): {
  fontFamily: 'Nunito';
  fontWeight: '600' | '700' | '800' | '900';
} {
  return { fontFamily: 'Nunito', fontWeight: `${weight}` };
}

/** For the `boxShadow` style. */
export const shadow = {
  card: '0 4 14 0 rgba(21,50,74,0.06)',
  float: '0 14 34 0 rgba(21,50,74,0.16)',
};
