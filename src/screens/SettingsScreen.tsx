import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LANGUAGE_LABELS, isLang, useI18n } from '../i18n';
import {
  getSettings,
  openSetting,
  setReadAloud,
  tryReadAloud,
} from '../native/alarms';
import type { LanguageOption } from '../native/alarms';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

/** The app's language, reading pills aloud, a note on text size, and a way to Setup. */
export default function SettingsScreen({ navigation }: Props) {
  const { lang, t, setLanguage } = useI18n();
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [readAloud, setReadAloudOn] = useState(true);
  const [trying, setTrying] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    getSettings()
      .then(s => {
        if (mounted.current) {
          setLanguages(s.languages);
          setReadAloudOn(s.readAloud);
        }
      })
      .catch(e => console.warn('Could not read the settings', e));
    return () => {
      mounted.current = false;
    };
  }, []);

  // The whole app redraws in the new language once it is saved; a failed save keeps the old one.
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

  const changeReadAloud = async (on: boolean) => {
    setReadAloudOn(on);
    try {
      await setReadAloud(on);
    } catch (e) {
      console.warn('Could not save read aloud', e);
      if (mounted.current) {
        setReadAloudOn(!on);
        Alert.alert(t.settings.saveFailed);
      }
    }
  };

  const openVoiceSettings = () => {
    openSetting('tts').catch(e => console.warn('Could not open settings', e));
  };

  /** Speaks a sample; says so when the phone lacks the voice, and offers its voice settings. */
  const tryIt = async () => {
    if (trying) {
      return;
    }
    setTrying(true);
    try {
      const result = await tryReadAloud();
      if (!mounted.current || result === 'spoken') {
        return;
      }
      const message =
        result === 'english'
          ? t.settings.noVoice(LANGUAGE_LABELS[lang])
          : t.settings.noSpeech;
      Alert.alert(message, undefined, [
        { text: t.common.ok, style: 'cancel' },
        { text: t.settings.openVoiceSettings, onPress: openVoiceSettings },
      ]);
    } catch (e) {
      console.warn('Could not try reading aloud', e);
    } finally {
      if (mounted.current) {
        setTrying(false);
      }
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>{t.settings.language}</Text>
      {languages.map(option => {
        const selected = option.code === lang;
        return (
          <Pressable
            key={option.code}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => chooseLanguage(option.code)}
            style={styles.row}
          >
            <Text style={styles.rowText}>
              {`${option.label}${option.draft ? t.settings.draft : ''}`}
            </Text>
            <View style={[styles.radio, selected && styles.radioOn]}>
              {selected ? <View style={styles.dot} /> : null}
            </View>
          </Pressable>
        );
      })}

      <Text style={styles.heading}>{t.settings.whenItRings}</Text>
      <View style={styles.row}>
        <Text style={styles.rowText}>{t.settings.readAloud}</Text>
        <Switch
          accessibilityLabel={t.settings.readAloud}
          value={readAloud}
          onValueChange={changeReadAloud}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy: trying }}
        disabled={trying}
        onPress={tryIt}
        style={[styles.button, trying && styles.busy]}
      >
        <Text style={styles.buttonText}>{t.settings.tryIt}</Text>
      </Pressable>

      <Text style={styles.heading}>{t.settings.textSize}</Text>
      <Text style={styles.note}>{t.settings.textSizeNote}</Text>

      <Text style={styles.heading}>{t.settings.reliability}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate('Setup')}
        style={styles.row}
      >
        <Text style={styles.link}>{t.settings.makeReliable}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.lg * 2 },
  heading: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  rowText: { flex: 1, fontSize: 20, color: colors.text },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.primary },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  button: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  busy: { opacity: 0.5 },
  buttonText: { fontSize: 18, color: colors.primary, fontWeight: '600' },
  note: { fontSize: 18, color: colors.text },
  link: { flex: 1, fontSize: 20, color: colors.primary },
});
