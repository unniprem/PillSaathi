import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import AllowDialog from '../components/AllowDialog';
import { useFollowRequests } from '../hooks/useFollowRequests';
import { useI18n } from '../i18n';
import {
  errorCode,
  familyMessage,
  formatCode,
  shareMessage,
} from '../lib/family';
import { createLinkCode, FamilyErrors } from '../native/family';
import type { LinkCode } from '../native/family';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors, font, radius, spacing } from '../theme';
import Button from '../ui/Button';
import Card from '../ui/Card';
import SkyBand from '../ui/SkyBand';

type Props = NativeStackScreenProps<RootStackParamList, 'ShareCode'>;

type State =
  | { kind: 'loading' }
  | { kind: 'code'; code: LinkCode }
  | { kind: 'expired' }
  | { kind: 'failed'; error: unknown };

const MINUTE = 60_000;
/** How often the countdown is redrawn. */
const TICK_MS = 30_000;

/**
 * A new family code: the scan code, the 6 digits and Send the code, with how many of its 15
 * minutes are left. While it is open, a relative who uses the code is asked about here, and
 * Allow goes back to Family.
 */
export default function ShareCodeScreen({ navigation }: Props) {
  const { t } = useI18n();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [now, setNow] = useState(Date.now);
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
        setState({ kind: 'failed', error: e });
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
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), TICK_MS);
    const timer = setTimeout(
      () => setState({ kind: 'expired' }),
      Math.max(0, expiresAt - Date.now()),
    );
    return () => {
      clearInterval(tick);
      clearTimeout(timer);
    };
  }, [expiresAt]);

  const { asking, answer } = useFollowRequests((_, allowed) => {
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
    <View style={styles.page}>
      <SkyBand title={t.family.codeTitle} onClose={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        {state.kind === 'loading' ? (
          <ActivityIndicator
            size="large"
            color={colors.blue}
            style={styles.loading}
          />
        ) : null}
        {state.kind === 'code' ? (
          <>
            <Card style={styles.code}>
              <Text style={styles.forWhom}>{t.family.codeBody}</Text>
              <View style={styles.qrFrame}>
                <Image
                  accessibilityLabel={t.family.scanCode}
                  source={{ uri: state.code.qrUri }}
                  style={styles.qr}
                />
              </View>
              <Digits code={state.code.code} />
              <View style={styles.left}>
                <Text style={styles.leftText}>
                  {t.family.worksFor(
                    // Rounded up: it says 1 minute, never 0, until the code expires.
                    Math.max(
                      1,
                      Math.ceil((state.code.expiresAt - now) / MINUTE),
                    ),
                  )}
                </Text>
              </View>
            </Card>
            <Button
              label={t.family.sendCode}
              icon="share"
              variant="secondary"
              onPress={() => send(state.code.code)}
            />
          </>
        ) : null}
        {state.kind === 'expired' ? (
          <Card>
            <Text style={styles.message}>{t.family.expired}</Text>
          </Card>
        ) : null}
        {state.kind === 'failed' ? (
          <Card>
            <Text style={styles.message}>{familyMessage(state.error, t)}</Text>
          </Card>
        ) : null}
        {state.kind === 'expired' ||
        (state.kind === 'failed' &&
          errorCode(state.error) !== FamilyErrors.NotSetUp) ? (
          <Button label={t.family.newCode} onPress={makeCode} />
        ) : null}
      </ScrollView>
      <AllowDialog person={asking} onAnswer={answer} />
    </View>
  );
}

/**
 * The 6 digits in boxes, in the two groups of three `formatCode` makes, for reading out over the
 * phone. TalkBack reads them one by one.
 */
function Digits({ code }: { code: string }) {
  return (
    <View
      accessible
      accessibilityLabel={[...code].join(' ')}
      style={styles.digits}
    >
      {formatCode(code)
        .split(' ')
        .map((group, i) => (
          <View key={i} style={styles.group}>
            {[...group].map((digit, j) => (
              <View key={j} style={styles.box}>
                <Text style={styles.digit}>{digit}</Text>
              </View>
            ))}
          </View>
        ))}
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
  loading: { marginTop: spacing.lg * 2 },
  code: {
    borderRadius: radius.big,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 12,
  },
  forWhom: {
    ...font(800),
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
  },
  qrFrame: {
    padding: 10,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  qr: { width: 200, height: 200 },
  // At large text the second group wraps under the first, rather than off the card.
  digits: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: 14,
    rowGap: 6,
  },
  group: { flexDirection: 'row', gap: 5 },
  box: {
    minWidth: 38,
    minHeight: 50,
    paddingHorizontal: spacing.xs,
    borderRadius: 10,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: { ...font(900), fontSize: 28, color: colors.navy },
  left: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.amberTint,
  },
  leftText: {
    ...font(800),
    fontSize: 14,
    color: colors.amberText,
    textAlign: 'center',
  },
  message: {
    ...font(800),
    fontSize: 18,
    color: colors.navy,
    textAlign: 'center',
  },
});
