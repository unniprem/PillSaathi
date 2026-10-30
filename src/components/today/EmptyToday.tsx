import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../../i18n';
import type { PillForm } from '../../lib/amount';
import { colors, font, radius, shadow } from '../../theme';
import Button from '../../ui/Button';
import PillPicture from '../../ui/PillPicture';
import { PILL_PALETTE } from '../../ui/pillLook';

type Props = {
  onAdd: () => void;
  onShowCode: () => void;
};

// A cream tablet, an orange capsule and a blue tablet, as in the mockup.
const SHAPES: { form: PillForm; color: string }[] = [
  { form: 'tablet', color: PILL_PALETTE[6] },
  { form: 'capsule', color: PILL_PALETTE[1] },
  { form: 'tablet', color: PILL_PALETTE[2] },
];

/**
 * Today before any pill: two ways in, adding one here, or showing the code so family can set
 * them up from their own phone.
 */
export default function EmptyToday({ onAdd, onShowCode }: Props) {
  const { t } = useI18n();
  return (
    <View style={styles.card}>
      <View style={styles.pills}>
        {SHAPES.map(({ form, color }, i) => (
          <PillPicture
            key={i}
            pill={{ name: '', form, photoUri: null }}
            size={56}
            color={color}
          />
        ))}
      </View>
      <Text style={styles.title}>{t.today.empty}</Text>
      <Text style={styles.body}>{t.today.emptyBody}</Text>
      <Button label={t.today.addPill} icon="add" onPress={onAdd} />
      <Button
        label={t.today.showCode}
        icon="qr_code_2"
        variant="secondary"
        onPress={onShowCode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.big,
    paddingHorizontal: 18,
    paddingVertical: 20,
    gap: 12,
    boxShadow: shadow.float,
  },
  pills: { flexDirection: 'row', justifyContent: 'center', gap: 2 },
  title: {
    ...font(900),
    fontSize: 22,
    color: colors.navy,
    textAlign: 'center',
  },
  body: {
    ...font(600),
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 4,
  },
});
