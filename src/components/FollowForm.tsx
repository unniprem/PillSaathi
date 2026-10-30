import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useI18n } from '../i18n';
import type { Strings } from '../i18n';
import type { Follow } from '../native/family';
import { colors, font, spacing } from '../theme';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Chip from '../ui/Chip';
import SectionLabel from '../ui/SectionLabel';

const DELAYS: (number | null)[] = [15, 30, 60, null];

function delayLabel(minutes: number | null, t: Strings) {
  switch (minutes) {
    case 15:
      return t.family.after15;
    case 30:
      return t.family.after30;
    case 60:
      return t.family.after60;
    default:
      return t.family.off;
  }
}

type Props = {
  initial: Follow;
  onSubmit: (follow: Follow) => void;
  submitLabel: string;
};

/**
 * What the relative calls an elder, her number for Call, and how long after a dose to ping: a
 * card each, then the submit button, which waits for a name.
 */
export default function FollowForm({ initial, onSubmit, submitLabel }: Props) {
  const { t } = useI18n();
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone ?? '');
  const [delay, setDelay] = useState(initial.delayMinutes);
  const ready = name.trim().length > 0;

  const submit = () => {
    if (!ready) {
      return;
    }
    onSubmit({
      elderId: initial.elderId,
      name: name.trim(),
      phone: phone.trim() === '' ? null : phone.trim(),
      delayMinutes: delay,
    });
  };

  return (
    <View style={styles.form}>
      <Card style={styles.card}>
        <SectionLabel>{t.family.callThem}</SectionLabel>
        <TextInput
          accessibilityLabel={t.family.callThem}
          value={name}
          onChangeText={setName}
          maxLength={40}
          style={styles.field}
        />
      </Card>
      <Card style={styles.card}>
        <SectionLabel>
          {t.family.phone}
          <Text style={styles.why}>{`  ${t.family.forCall}`}</Text>
        </SectionLabel>
        <TextInput
          accessibilityLabel={t.family.phone}
          accessibilityHint={t.family.forCall}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          maxLength={20}
          style={[styles.field, styles.number]}
        />
      </Card>
      <Card style={styles.card}>
        <SectionLabel>{t.family.pingWhen}</SectionLabel>
        <View style={styles.chips}>
          {DELAYS.map(minutes => (
            <Chip
              key={String(minutes)}
              label={delayLabel(minutes, t)}
              on={minutes === delay}
              onPress={() => setDelay(minutes)}
            />
          ))}
        </View>
      </Card>
      <Button label={submitLabel} onPress={submit} disabled={!ready} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12 },
  card: { padding: 14, gap: 10 },
  why: {
    ...font(700),
    fontSize: 13,
    letterSpacing: 0,
    textTransform: 'none',
    color: colors.muted,
  },
  field: {
    ...font(800),
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: spacing.sm,
    borderRadius: 14,
    backgroundColor: colors.soft,
    fontSize: 19,
    color: colors.navy,
  },
  number: { fontSize: 17 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
