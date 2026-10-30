import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AVATAR_COLORS, colors, font } from '../theme';
import Icon from './Icon';
import type { IconName } from './icons';
import { nameIndex } from './pillLook';

type Props = { name: string; size?: number; icon?: IconName };

/**
 * A round letter avatar on a gradient picked from the name. It is only decoration:
 * the name always sits beside it, so TalkBack skips it.
 */
export default function Avatar({ name, size = 46, icon }: Props) {
  const [from, to] = AVATAR_COLORS[nameIndex(name, AVATAR_COLORS.length)];
  // By code point, so a letter outside the BMP isn't cut in half.
  const letter = ([...name.trim()][0] ?? '').toUpperCase();
  return (
    <View
      testID="avatar"
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: to,
          backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
        },
      ]}
    >
      {icon ? (
        <Icon name={icon} size={size * 0.55} color={colors.onFill} />
      ) : (
        <Text
          allowFontScaling={false}
          importantForAccessibility="no"
          style={[styles.letter, { fontSize: Math.round(size * 0.43) }]}
        >
          {letter}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  letter: { ...font(900), color: colors.onFill },
});
