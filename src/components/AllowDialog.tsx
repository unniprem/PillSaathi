import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../i18n';
import type { Person } from '../native/family';
import { colors, font, shadow, spacing } from '../theme';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import type { IconName } from '../ui/icons';

type Props = {
  /** Who is asking to follow this phone; nothing shows while it is null. */
  person: Person | null;
  onAnswer: (allow: boolean) => void;
};

/**
 * "Let Ravi see and change your pills?", over the page when a relative uses her code: who it
 * is, what she agrees to in three short lines, and No or a green Allow. She answers it: the
 * phone's Back doesn't close it, as it didn't close the alert this replaces.
 */
export default function AllowDialog({ person, onAnswer }: Props) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  // Kept after the answer, so the dialog fades out with its words still on it.
  const [shown, setShown] = useState(person);
  if (person && person !== shown) {
    setShown(person);
  }
  const who = person ?? shown;
  return (
    <Modal
      visible={person !== null}
      transparent
      animationType="fade"
      onRequestClose={() => {}}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.dim}>
        <ScrollView
          contentContainerStyle={[
            styles.middle,
            {
              paddingTop: insets.top + spacing.md,
              paddingBottom: insets.bottom + spacing.md,
            },
          ]}
        >
          {who ? (
            <View style={styles.dialog}>
              <View style={styles.avatar}>
                <Avatar name={who.name} size={72} />
              </View>
              <Text accessibilityRole="header" style={styles.title}>
                {t.family.allowTitle(who.name)}
              </Text>
              <Text style={styles.email}>{who.email}</Text>
              <View style={styles.lines}>
                <Line
                  icon="visibility"
                  tint={colors.greenTint}
                  ink={colors.green}
                  text={t.family.allowSees(who.name)}
                />
                <Line
                  icon="edit"
                  tint={colors.blueTint}
                  ink={colors.blue}
                  text={t.family.allowEdits(who.name)}
                />
                <Line
                  icon="notifications"
                  tint={colors.amberTint}
                  ink={colors.amberText}
                  text={t.family.allowNotice(who.name)}
                />
              </View>
              <View style={styles.buttons}>
                <View style={styles.no}>
                  <Button
                    label={t.family.no}
                    variant="secondary"
                    onPress={() => onAnswer(false)}
                  />
                </View>
                <View style={styles.allow}>
                  <Button
                    label={t.family.allow}
                    variant="green"
                    onPress={() => onAnswer(true)}
                  />
                </View>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

type LineProps = { icon: IconName; tint: string; ink: string; text: string };

/** One thing she agrees to, after its symbol on a small tile. */
function Line({ icon, tint, ink, text }: LineProps) {
  return (
    <View style={styles.line}>
      <View style={[styles.tile, { backgroundColor: tint }]}>
        <Icon name={icon} size={18} color={ink} />
      </View>
      <Text style={styles.lineText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dim: { flex: 1, backgroundColor: colors.dim },
  middle: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  dialog: {
    backgroundColor: colors.card,
    borderRadius: 28,
    paddingTop: 22,
    paddingHorizontal: 18,
    paddingBottom: 18,
    gap: 12,
    boxShadow: shadow.float,
  },
  avatar: { alignSelf: 'center', borderRadius: 36, boxShadow: shadow.float },
  title: {
    ...font(900),
    fontSize: 21,
    lineHeight: 26,
    color: colors.navy,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  email: {
    ...font(600),
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
  },
  lines: { gap: 10, marginTop: spacing.xs },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  tile: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineText: {
    ...font(700),
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    color: colors.navy,
    paddingTop: 3,
  },
  buttons: { flexDirection: 'row', gap: 10, marginTop: spacing.xs },
  no: { flex: 1 },
  allow: { flex: 1.4 },
});
