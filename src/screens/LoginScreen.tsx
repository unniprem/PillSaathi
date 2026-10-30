import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isLang, useI18n } from '../i18n';
import { familyMessage, firstName } from '../lib/family';
import { getSettings } from '../native/alarms';
import type { LanguageOption } from '../native/alarms';
import { signInWithGoogle } from '../native/family';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors, font, shadow, spacing } from '../theme';
import Button from '../ui/Button';
import { SKY_GRADIENT, skyImage } from '../ui/sky';
import { Sun } from '../ui/SkyTop';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const APP_NAME = 'PillSaathi';

/**
 * The first page on every phone: a sunrise sky with the app's name, then the languages and one
 * way in, Continue with Google. A login that doesn't go through (no internet, no Firebase in
 * this build, or no Google account to pick) offers Continue offline, because alarms never wait
 * for the login; so does the page shown again to a phone that continued offline before.
 */
export default function LoginScreen({ navigation, route }: Props) {
  const again = route.params?.again ?? false;
  const { lang, t, setLanguage } = useI18n();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [busy, setBusy] = useState(false);
  // Why the last login didn't go through: cancelled, or what it failed with.
  const [failure, setFailure] = useState<'cancelled' | { error: unknown }>();
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    getSettings()
      .then(s => mounted.current && setLanguages(s.languages))
      .catch(e => console.warn('Could not read the settings', e));
    return () => {
      mounted.current = false;
    };
  }, []);

  // The page redraws in the new language once it is saved; a failed save keeps the old one.
  const chooseLanguage = async (code: string) => {
    if (!isLang(code) || code === lang) {
      return;
    }
    try {
      await setLanguage(code);
    } catch (e) {
      console.warn('Could not save the language', e);
      if (mounted.current) {
        Alert.alert(t.settings.saveFailed);
      }
    }
  };

  // A phone asked who it is for before goes straight to Today.
  const moveOn = (first: string | null) => {
    if (again) {
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } else {
      navigation.navigate('Who', { first });
    }
  };

  const logIn = async () => {
    setBusy(true);
    try {
      const account = await signInWithGoogle();
      if (!mounted.current) {
        return;
      }
      if (account) {
        moveOn(firstName(account.name));
      } else {
        setFailure('cancelled');
      }
    } catch (e) {
      console.warn('Could not log in with Google', e);
      if (mounted.current) {
        setFailure({ error: e });
      }
    } finally {
      if (mounted.current) {
        setBusy(false);
      }
    }
  };

  return (
    <View style={styles.page}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.sky, { paddingTop: insets.top + spacing.lg }]}>
          <Sun top={insets.top} low={false} />
          <Image
            testID="app-logo"
            source={require('../assets/app-icon.png')}
            accessibilityIgnoresInvertColors
            style={styles.logo}
          />
          <Text
            testID="sky-title"
            accessibilityRole="header"
            style={styles.appName}
          >
            {APP_NAME}
          </Text>
          <Text style={styles.tagline}>{t.login.tagline}</Text>
        </View>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={t.settings.language}
            style={styles.languages}
          >
            {languages.map(option => {
              const on = option.code === lang;
              return (
                <Pressable
                  key={option.code}
                  accessibilityRole="radio"
                  accessibilityLabel={option.label}
                  accessibilityState={{ checked: on }}
                  onPress={() => chooseLanguage(option.code)}
                  // Side by side, or one under another once large text no longer fits three.
                  style={[
                    styles.language,
                    { flexBasis: 90 * fontScale },
                    on && styles.languageOn,
                  ]}
                >
                  <Text
                    style={[styles.languageText, on && styles.languageTextOn]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.welcome}>{t.login.welcome}</Text>
          <Text style={styles.intro}>{t.login.intro}</Text>
          {failure && failure !== 'cancelled' ? (
            <Text style={styles.message}>
              {familyMessage(failure.error, t)}
            </Text>
          ) : null}
          <Button label={t.login.google} onPress={logIn} disabled={busy} />
          {failure || again ? (
            <Button
              variant="secondary"
              label={t.login.offline}
              onPress={() => moveOn(null)}
              disabled={busy}
            />
          ) : null}
          <Text style={styles.note}>{t.login.oneTap}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.card },
  scroll: { flexGrow: 1 },
  // The sheet's round corners lift into the sky.
  sky: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingBottom: 30 + spacing.lg,
    backgroundColor: SKY_GRADIENT.dawn[1],
    backgroundImage: skyImage('dawn', 45),
    overflow: 'hidden',
  },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignSelf: 'center',
    marginTop: spacing.lg,
    marginBottom: 12,
    boxShadow: shadow.float,
  },
  appName: {
    ...font(900),
    fontSize: 29,
    letterSpacing: -0.5,
    color: colors.navy,
    textAlign: 'center',
  },
  tagline: {
    ...font(700),
    fontSize: 15,
    lineHeight: 21,
    color: colors.navy,
    opacity: 0.8,
    textAlign: 'center',
    marginTop: 2,
  },
  sheet: {
    marginTop: -30,
    backgroundColor: colors.card,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 18,
    paddingHorizontal: spacing.md,
    gap: 12,
  },
  languages: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  language: {
    flexGrow: 1,
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 4,
    paddingVertical: 8,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageOn: { backgroundColor: colors.navy },
  languageText: {
    ...font(800),
    fontSize: 16,
    color: colors.navy,
    textAlign: 'center',
  },
  languageTextOn: { color: colors.onFill },
  welcome: {
    ...font(900),
    fontSize: 22,
    color: colors.navy,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  intro: {
    ...font(600),
    fontSize: 16,
    lineHeight: 22,
    color: colors.muted,
    textAlign: 'center',
  },
  message: {
    ...font(800),
    fontSize: 16,
    color: colors.coralText,
    textAlign: 'center',
  },
  note: {
    ...font(600),
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
});
