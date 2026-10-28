import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useI18n } from '../i18n';
import type { Strings } from '../i18n';
import type { Follow } from '../native/family';
import { colors, spacing } from '../theme';

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

/** What the relative calls an elder, her number for Call, and how long after a dose to ping. */
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
    <View>
      <Text style={styles.label}>{t.family.callThem}</Text>
      <TextInput
        accessibilityLabel={t.family.callThem}
        value={name}
        onChangeText={setName}
        maxLength={40}
        style={styles.input}
      />
      <Text style={styles.label}>{t.family.phone}</Text>
      <TextInput
        accessibilityLabel={t.family.phone}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        maxLength={20}
        style={styles.input}
      />
      <Text style={styles.hint}>{t.family.phoneHint}</Text>
      <Text style={styles.label}>{t.family.pingWhen}</Text>
      <View style={styles.chips}>
        {DELAYS.map(minutes => {
          const selected = minutes === delay;
          return (
            <Pressable
              key={String(minutes)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setDelay(minutes)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text
                style={[styles.chipText, selected && styles.chipTextSelected]}
              >
                {delayLabel(minutes, t)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !ready }}
        onPress={submit}
        style={[styles.primary, !ready && styles.disabled]}
      >
        <Text style={styles.primaryText}>{submitLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  hint: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 18,
    color: colors.text,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: { fontSize: 16, color: colors.text },
  chipTextSelected: { color: colors.onPrimary },
  primary: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  disabled: { opacity: 0.5 },
  primaryText: { fontSize: 18, color: colors.onPrimary, fontWeight: '600' },
});
