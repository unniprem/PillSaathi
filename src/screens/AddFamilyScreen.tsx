import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
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
import type { Follow, Relative } from '../native/family';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors, font, radius, shadow, spacing } from '../theme';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import Card from '../ui/Card';
import SkyBand from '../ui/SkyBand';

type Props = NativeStackScreenProps<RootStackParamList, 'AddFamily'>;

type Step =
  | { kind: 'loading' }
  | { kind: 'signIn'; message?: string }
  | { kind: 'code'; message?: string; scanning?: boolean }
  | { kind: 'waiting'; elderId: string }
  | { kind: 'form'; elderId: string };

const POLL_MS = 2000;
const CODE_LENGTH = 6;

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
 * Following an elder: log in with Google if the phone isn't yet, scan or type her code, wait for
 * her Allow, then say what to call her, her number and when to ping. Straight after the login it
 * can be skipped for now.
 */
export default function AddFamilyScreen({ navigation, route }: Props) {
  const { t } = useI18n();
  // Straight after the login there is no page behind this one: leaving goes on to Today.
  const fromLogin = route.params?.fromLogin ?? false;
  const [step, setStep] = useState<Step>({ kind: 'loading' });
  const [account, setAccount] = useState<Relative | null>(null);
  // Digits only, at most six.
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  // The keyboard covers the page instead of shrinking it (edge to edge), so the page ends above
  // it while it is open, and the code, the form and their buttons scroll into view.
  const keyboardHeight = useKeyboardHeight();
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    signedInRelative()
      .then(r => {
        if (mounted.current) {
          setAccount(r);
          setStep({ kind: r ? 'code' : 'signIn' });
        }
      })
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
        setAccount(relative);
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

  const ready = typed.length === CODE_LENGTH;
  const next = () => {
    if (ready && !busy) {
      ask(typed);
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

  // Straight after the login, Skip for now takes Back's place.
  const skip = fromLogin ? (
    <Pressable
      accessibilityRole="button"
      onPress={leave}
      style={({ pressed }) => [styles.skip, pressed && styles.pressed]}
    >
      <Text style={styles.skipText}>{t.family.skip}</Text>
    </Pressable>
  ) : null;

  return (
    <View
      testID="add-family-page"
      style={[styles.page, { paddingBottom: keyboardHeight }]}
    >
      {step.kind === 'form' ? (
        <SkyBand title={t.family.almostDone} />
      ) : step.kind === 'waiting' ? (
        <SkyBand title={t.family.addTitle} onClose={leave} />
      ) : (
        <SkyBand
          title={t.family.addTitle}
          onBack={fromLogin ? undefined : leave}
        />
      )}
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {step.kind === 'signIn' ? (
          <>
            <Card>
              <Text style={styles.intro}>{t.family.logInFirst}</Text>
            </Card>
            {step.message ? (
              <Text style={styles.message}>{step.message}</Text>
            ) : null}
            <Button label={t.login.google} onPress={signIn} disabled={busy} />
            {skip}
          </>
        ) : null}
        {step.kind === 'code' ? (
          <>
            {account ? (
              <View style={styles.account}>
                <Avatar name={account.name} size={28} />
                <Text style={styles.accountText}>
                  {t.family.loggedInAs(account.email)}
                </Text>
              </View>
            ) : null}
            <Card style={styles.hint}>
              <Text style={styles.hintText}>{t.family.whereCode}</Text>
            </Card>
            {step.message || step.scanning ? (
              <Text style={[styles.message, step.scanning && styles.opening]}>
                {step.scanning ? t.family.opening : step.message}
              </Text>
            ) : null}
            <Button
              label={t.family.scanTheirs}
              icon="qr_code_scanner"
              onPress={scan}
              disabled={busy || step.scanning}
            />
            <View style={styles.or}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>{t.family.typeDigits}</Text>
              <View style={styles.orLine} />
            </View>
            <CodeBoxes
              value={typed}
              onChange={setTyped}
              onSubmit={next}
              label={t.family.typeDigits}
            />
            <Button
              label={t.common.next}
              variant="secondary"
              onPress={next}
              disabled={!ready || busy}
            />
            {skip}
          </>
        ) : null}
        {step.kind === 'waiting' ? (
          <View style={styles.waiting}>
            {/* His letter and hers, still unknown, joined by dots. */}
            <View style={styles.link}>
              <View style={styles.ring}>
                <Avatar name={account?.name ?? ''} size={74} />
              </View>
              <View style={styles.dots}>
                {[0, 1, 2, 3, 4].map(i => (
                  <View key={i} style={styles.dot} />
                ))}
              </View>
              <View style={styles.ring}>
                <Avatar name="?" size={74} icon="question_mark" />
              </View>
            </View>
            <ActivityIndicator size="large" color={colors.blue} />
            <Text style={styles.waitingText}>{t.family.waiting}</Text>
            <Text style={styles.note}>{t.family.keepOpen}</Text>
          </View>
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

type BoxesProps = {
  value: string;
  onChange: (digits: string) => void;
  onSubmit: () => void;
  /** Read by TalkBack for the field, which reads the digits typed as its value. */
  label: string;
};

/**
 * The code typed as six large boxes, in two groups of three as her phone shows it. One hidden
 * field lies over the boxes, so a tap anywhere on them brings up the number pad. It has no
 * maxLength: Android would cut a pasted "482 913" to "482 91" before the space is dropped, so the
 * digits are kept and cut to six here instead.
 */
function CodeBoxes({ value, onChange, onSubmit, label }: BoxesProps) {
  const [focused, setFocused] = useState(false);
  const box = (i: number) => (
    <View
      key={i}
      testID="digit-box"
      style={[styles.box, focused && i === value.length && styles.boxNext]}
    >
      {value[i] ? (
        <Text importantForAccessibility="no" style={styles.digit}>
          {value[i]}
        </Text>
      ) : null}
    </View>
  );
  return (
    <View>
      <View style={styles.boxes}>
        <View style={styles.group}>{[0, 1, 2].map(box)}</View>
        <View style={styles.group}>{[3, 4, 5].map(box)}</View>
      </View>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={text =>
          onChange(text.replace(/\D/g, '').slice(0, CODE_LENGTH))
        }
        keyboardType="number-pad"
        onSubmitEditing={onSubmit}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        caretHidden
        style={styles.hidden}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.page },
  content: {
    padding: spacing.md,
    paddingTop: 14,
    paddingBottom: spacing.lg,
    gap: 12,
  },
  intro: { ...font(800), fontSize: 17, lineHeight: 23, color: colors.navy },
  message: {
    ...font(800),
    fontSize: 16,
    lineHeight: 22,
    color: colors.navy,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.amberTint,
  },
  opening: { color: colors.blueText, backgroundColor: colors.blueTint },
  account: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  accountText: {
    ...font(700),
    flexShrink: 1,
    fontSize: 14,
    color: colors.muted,
  },
  hint: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18 },
  hintText: { ...font(700), fontSize: 15, lineHeight: 22, color: colors.navy },
  or: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  orLine: { flex: 1, height: 1.5, backgroundColor: colors.edge },
  orText: { ...font(800), flexShrink: 1, fontSize: 14, color: colors.muted },
  // At large text the second group wraps under the first, rather than off the page.
  boxes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: 12,
    rowGap: 6,
  },
  group: { flexDirection: 'row', gap: 5 },
  box: {
    minWidth: 40,
    minHeight: 52,
    paddingHorizontal: spacing.xs,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.edge,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxNext: { borderColor: colors.blue },
  digit: { ...font(900), fontSize: 26, color: colors.navy },
  // Over the boxes and all but invisible (Android won't focus a field drawn at no opacity).
  hidden: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0.01,
    fontSize: 1,
  },
  skip: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  skipText: {
    ...font(900),
    fontSize: 16,
    color: colors.blue,
    textAlign: 'center',
  },
  pressed: { opacity: 0.7 },
  waiting: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.lg },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  // A white ring, lifting the avatar off the page.
  ring: {
    borderRadius: radius.pill,
    borderWidth: 4,
    borderColor: colors.card,
    boxShadow: shadow.float,
  },
  dots: { flexDirection: 'row', gap: 5, paddingHorizontal: 4 },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.muted,
    opacity: 0.5,
  },
  waitingText: {
    ...font(900),
    fontSize: 20,
    lineHeight: 26,
    color: colors.navy,
    textAlign: 'center',
  },
  note: {
    ...font(600),
    fontSize: 15,
    lineHeight: 21,
    color: colors.muted,
    textAlign: 'center',
  },
});
