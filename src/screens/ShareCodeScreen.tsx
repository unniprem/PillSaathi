import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFollowRequests } from '../hooks/useFollowRequests';
import { useI18n } from '../i18n';
import { errorCode, formatCode, shareMessage } from '../lib/family';
import { createLinkCode, FamilyErrors } from '../native/family';
import type { LinkCode } from '../native/family';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ShareCode'>;

type State =
  | { kind: 'loading' }
  | { kind: 'code'; code: LinkCode }
  | { kind: 'expired' }
  | { kind: 'failed'; notSetUp: boolean };

/**
 * A new family code: the 6 digits, the scan code and Send code, live for 15 minutes. While it is
 * open, a relative who uses the code is asked about here, and Allow goes back to Family.
 */
export default function ShareCodeScreen({ navigation }: Props) {
  const { t } = useI18n();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const mounted = useRef(true);

  const makeCode = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const code = await createLinkCode();
      if (mounted.current) {
        setState({ kind: 'code', code });
      }
    } catch (e) {
      console.warn('Could not make a family code', e);
      if (mounted.current) {
        setState({
          kind: 'failed',
          notSetUp: errorCode(e) === FamilyErrors.NotSetUp,
        });
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    makeCode();
    return () => {
      mounted.current = false;
    };
  }, [makeCode]);

  const expiresAt = state.kind === 'code' ? state.code.expiresAt : null;
  useEffect(() => {
    if (expiresAt === null) {
      return;
    }
    const timer = setTimeout(
      () => setState({ kind: 'expired' }),
      Math.max(0, expiresAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [expiresAt]);

  useFollowRequests((_, allowed) => {
    if (allowed && mounted.current) {
      navigation.goBack();
    }
  });

  const send = (code: string) => {
    Share.share({ message: shareMessage(code, t) }).catch(e =>
      console.warn('Could not share the code', e),
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {state.kind === 'code' ? (
        <>
          <Text style={styles.body}>{t.family.codeBody}</Text>
          <Image
            accessibilityLabel={t.family.scanCode}
            source={{ uri: state.code.qrUri }}
            style={styles.qr}
          />
          <Text style={styles.digits}>{formatCode(state.code.code)}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => send(state.code.code)}
            style={styles.primary}
          >
            <Text style={styles.primaryText}>{t.family.sendCode}</Text>
          </Pressable>
        </>
      ) : null}
      {state.kind === 'expired' ? (
        <Text style={styles.body}>{t.family.expired}</Text>
      ) : null}
      {state.kind === 'failed' ? (
        <Text style={styles.body}>
          {state.notSetUp ? t.family.notSetUp : t.family.offline}
        </Text>
      ) : null}
      {state.kind === 'expired' ||
      (state.kind === 'failed' && !state.notSetUp) ? (
        <Pressable
          accessibilityRole="button"
          onPress={makeCode}
          style={styles.primary}
        >
          <Text style={styles.primaryText}>{t.family.newCode}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.lg * 2,
    alignItems: 'center',
    gap: spacing.md,
  },
  body: { fontSize: 18, color: colors.text, textAlign: 'center' },
  qr: { width: 240, height: 240, marginTop: spacing.md },
  digits: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 2,
  },
  primary: {
    alignSelf: 'stretch',
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  primaryText: { fontSize: 18, color: colors.onPrimary, fontWeight: '600' },
});
