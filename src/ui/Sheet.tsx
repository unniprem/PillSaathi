import React from 'react';
import type { ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../i18n';
import { colors, font, spacing } from '../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

/**
 * A pop-up that slides up from the bottom over the dimmed page. Tapping the dimmed part, or the
 * phone's back, closes it. Its inside scrolls, so large text never pushes a button off-screen.
 */
export default function Sheet({ visible, onClose, title, children }: Props) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <Pressable
          testID="sheet-backdrop"
          accessibilityRole="button"
          accessibilityLabel={t.common.close}
          onPress={onClose}
          style={styles.backdrop}
        />
        <View style={[styles.sheet, { paddingBottom: 22 + insets.bottom }]}>
          <View style={styles.grab} />
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.inside}
            keyboardShouldPersistTaps="handled"
          >
            {title ? (
              <Text accessibilityRole="header" style={styles.title}>
                {title}
              </Text>
            ) : null}
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.dim },
  sheet: {
    maxHeight: '92%', // some dimmed page always shows above it, to tap
    backgroundColor: colors.card,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 10,
    paddingHorizontal: 18,
  },
  grab: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.edge,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  scroll: { flexGrow: 0 },
  inside: { gap: 12 },
  title: {
    ...font(900),
    fontSize: 20,
    color: colors.navy,
    textAlign: 'center',
  },
});
