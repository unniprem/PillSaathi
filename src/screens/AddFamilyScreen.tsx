import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import FollowForm from '../components/FollowForm';
import { useI18n } from '../i18n';
import type { Strings } from '../i18n';
import { errorCode, familyMessage } from '../lib/family';
import {
  FamilyErrors,
  followState,
  requestFollow,
  saveFollow,
  scanCode,
  signedInRelative,
  signInWithGoogle,
} from '../native/family';
import type { Follow } from '../native/family';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors, spacing } from '../theme';
import SkyBand from '../ui/SkyBand';

type Props = NativeStackScreenProps<RootStackParamList, 'AddFamily'>;

type Step =
  | { kind: 'loading' }
  | { kind: 'signIn'; message?: string }
  | { kind: 'code'; message?: string; scanning?: boolean }
  | { kind: 'waiting'; elderId: string }
  | { kind: 'form'; elderId: string };

const POLL_MS = 2000;

/** The 6 digits typed, spaces ignored, or null until there are exactly 6. */
function digitsOf(text: string): string | null {
  const digits = text.replace(/\s/g, '');
  return /^\d{6}$/.test(digits) ? digits : null;
}

function messageFor(e: unknown, t: Strings): string {
  switch (errorCode(e)) {
    case FamilyErrors.BadCode:
      return t.family.badCode;
    case FamilyErrors.NoScanner:
      return t.family.noScanner;
    default:
      return familyMessage(e, t);
  }
}

/**
 * Following an elder: sign in with Google, scan or type her code, wait for her Allow, then say
 * what to call her, her number and when to ping.
 */
export default function AddFamilyScreen({ navigation, route }: Props) {
  const { t } = useI18n();
  // Straight after the login there is no page behind this one: leaving goes on to Today.
  const fromLogin = route.params?.fromLogin ?? false;
  const [step, setStep] = useState<Step>({ kind: 'loading' });
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    signedInRelative()
      .then(r => mounted.current && setStep({ kind: r ? 'code' : 'signIn' }))
      .catch(e => {
        console.warn('Could not check the Google sign-in', e);
        if (mounted.current) {
          setStep({ kind: 'signIn', message: messageFor(e, t) });
        }
      });
    return () => {
      mounted.current = false;
    };
  }, [t]);

  const signIn = async () => {
    setBusy(true);
    try {
      const relative = await signInWithGoogle();
      if (mounted.current && relative) {
        setStep({ kind: 'code' });
      }
    } catch (e) {
      console.warn('Could not sign in with Google', e);
      if (mounted.current) {
        setStep({ kind: 'signIn', message: messageFor(e, t) });
      }
    } finally {
      if (mounted.current) {
        setBusy(false);
      }
    }
  };

  const ask = useCallback(
    async (code: string) => {
      setBusy(true);
      try {
        const elderId = await requestFollow(code);
        if (mounted.current) {
          setStep({ kind: 'waiting', elderId });
        }
      } catch (e) {
        console.warn('Could not ask to follow', e);
        if (mounted.current) {
          setStep(
            errorCode(e) === FamilyErrors.NotSignedIn
              ? { kind: 'signIn' }
              : { kind: 'code', message: messageFor(e, t) },
          );
        }
      } finally {
        if (mounted.current) {
          setBusy(false);
        }
      }
    },
    [t],
  );

  const next = () => {
    const code = digitsOf(typed);
    if (code && !busy) {
      ask(code);
    }
  };

  const scan = async () => {
    // The first scan can wait a while for Google's scanner to download.
    setStep({ kind: 'code', scanning: true });
    try {
      const code = await scanCode();
      if (!mounted.current) {
        return;
      }
      setStep({ kind: 'code' });
      if (code) {
        setTyped(code);
        await ask(code);
      }
    } catch (e) {
      console.warn('Could not scan a code', e);
      if (mounted.current) {
        setStep({ kind: 'code', message: messageFor(e, t) });
      }
    }
  };

  const waitingFor = step.kind === 'waiting' ? step.elderId : null;
  useEffect(() => {
    if (waitingFor === null) {
      return;
    }
    const timer = setInterval(async () => {
      try {
        const state = await followState(waitingFor);
        if (!mounted.current) {
          return;
        }
        if (state === 'allowed') {
          setStep({ kind: 'form', elderId: waitingFor });
        } else if (state === 'denied') {
          setStep({ kind: 'code', message: t.family.refused });
        } else if (state === 'expired') {
          setStep({ kind: 'code', message: t.family.expired });
        }
      } catch (e) {
        console.warn('Could not read the answer', e);
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [waitingFor, t]);

  const leave = () => {
    if (fromLogin) {
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } else {
      navigation.goBack();
    }
  };

  const done = async (follow: Follow) => {
    try {
      await saveFollow(follow);
      leave();
    } catch (e) {
      console.warn('Could not save the follow', e);
      Alert.alert(t.settings.saveFailed);
    }
  };

  return (
    <View style={styles.container}>
      <SkyBand title={t.family.addTitle} onBack={leave} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {step.kind === 'signIn' ? (
          <>
            {step.message ? (
              <Text style={styles.message}>{step.message}</Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={signIn}
              style={[styles.primary, busy && styles.busy]}
            >
              <Text style={styles.primaryText}>{t.family.signIn}</Text>
            </Pressable>
          </>
        ) : null}
        {step.kind === 'code' ? (
          <>
            {step.message || step.scanning ? (
              <Text style={styles.message}>
                {step.scanning ? t.family.opening : step.message}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              disabled={busy || step.scanning}
              onPress={scan}
              style={[styles.primary, (busy || step.scanning) && styles.busy]}
            >
              <Text style={styles.primaryText}>{t.family.scanCode}</Text>
            </Pressable>
            <Text style={styles.label}>{t.family.typeDigits}</Text>
            <TextInput
              accessibilityLabel={t.family.typeDigits}
              value={typed}
              onChangeText={setTyped}
              keyboardType="number-pad"
              maxLength={7}
              onSubmitEditing={next}
              style={styles.digits}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !digitsOf(typed) || busy }}
              onPress={next}
              style={[
                styles.secondary,
                (!digitsOf(typed) || busy) && styles.busy,
              ]}
            >
              <Text style={styles.secondaryText}>{t.family.next}</Text>
            </Pressable>
          </>
        ) : null}
        {step.kind === 'waiting' ? (
          <Text style={styles.message}>{t.family.waiting}</Text>
        ) : null}
        {step.kind === 'form' ? (
          <FollowForm
            initial={{
              elderId: step.elderId,
              name: '',
              phone: null,
              delayMinutes: 30,
            }}
            submitLabel={t.family.done}
            onSubmit={done}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.lg * 2 },
  message: {
    fontSize: 18,
    color: colors.text,
    marginVertical: spacing.md,
  },
  label: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  digits: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 28,
    letterSpacing: 4,
    color: colors.text,
  },
  primary: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  primaryText: { fontSize: 18, color: colors.onPrimary, fontWeight: '600' },
  secondary: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  secondaryText: { fontSize: 18, color: colors.primary, fontWeight: '600' },
  busy: { opacity: 0.5 },
});
