import React from 'react';
import { Linking, Pressable, StyleSheet } from 'react-native';
import { useI18n } from '../i18n';
import { colors, shadow } from '../theme';
import Icon from './Icon';

type Props = { phone: string; size?: number };

/**
 * A round green Call button that opens the phone's dialer at [phone]. Its icon has no word
 * beside it, so it is labelled.
 */
export default function CallButton({ phone, size = 48 }: Props) {
  const { t } = useI18n();
  const call = () =>
    Linking.openURL(`tel:${phone}`).catch(e =>
      console.warn('Could not open the dialer', e),
    );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.family.call}
      onPress={call}
      style={({ pressed }) => [
        styles.call,
        { width: size, height: size, borderRadius: size / 2 },
        pressed && styles.pressed,
      ]}
    >
      <Icon name="call" size={Math.round(size / 2)} color={colors.onFill} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  call: {
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: shadow.green,
  },
  pressed: { opacity: 0.7 },
});
