import React from 'react';
import { StyleSheet, Text } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';
import { colors } from '../theme';
import { ICONS } from './icons';
import type { IconName } from './icons';

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  /** For tabs that aren't selected. */
  outlined?: boolean;
  /** Only for an icon with no word beside it; otherwise TalkBack skips it. */
  accessibilityLabel?: string;
  style?: StyleProp<TextStyle>;
};

/**
 * A Material Symbols glyph. Its size stays fixed at any text size, as the words beside
 * it grow instead. No `fontWeight`: each font file is one weight.
 */
export default function Icon({
  name,
  size = 24,
  color = colors.navy,
  outlined = false,
  accessibilityLabel,
  style,
}: Props) {
  const labelled = accessibilityLabel != null;
  return (
    <Text
      allowFontScaling={false}
      accessible={labelled}
      accessibilityRole={labelled ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={labelled ? 'yes' : 'no'}
      style={[
        styles.icon,
        outlined ? styles.outlined : styles.filled,
        { fontSize: size, lineHeight: size, color },
        style,
      ]}
    >
      {ICONS[name]}
    </Text>
  );
}

const styles = StyleSheet.create({
  icon: { includeFontPadding: false, textAlign: 'center' },
  filled: { fontFamily: 'Symbols' },
  outlined: { fontFamily: 'SymbolsOutlined' },
});
