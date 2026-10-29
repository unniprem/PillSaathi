import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LANGUAGE_LABELS, isLang, useI18n } from '../i18n';
import {
  getHealth,
  getSettings,
  getSetupState,
  openSetting,
  setReadAloud,
  tryReadAloud,
} from '../native/alarms';
import type { LanguageOption, SettingTarget } from '../native/alarms';
import type { TabProps } from '../navigation/RootNavigator';
import {
  autoChecked,
  currentManufacturer,
  setupProgress,
  stepsFor,
} from '../setup/oemSteps';
import { colors, font, radius, spacing } from '../theme';
import Card from '../ui/Card';
import Icon from '../ui/Icon';
import type { IconName } from '../ui/icons';
import SkyBand from '../ui/SkyBand';

type Props = TabProps<'Settings'>;

/**
 * The app's language as tiles, then reading pills aloud and the text size, then how many alarm
 * setup steps are left, with the way to Setup.
 */
export default function SettingsScreen({ navigation }: Props) {
  const { lang, t, setLanguage } = useI18n();
  const { fontScale } = useWindowDimensions();
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [readAloud, setReadAloudOn] = useState(true);
  const [trying, setTrying] = useState(false);
  // Alarm setup's steps not done yet; null until read.
  const [stepsLeft, setStepsLeft] = useState<number | null>(null);
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

  // Counted again each time the tab shows, so steps done in Setup come off on the way back.
  // A read that fails counts as nothing done, as Setup does.
  useFocusEffect(
    useCallback(() => {
      Promise.allSettled([getHealth(), getSetupState()]).then(([h, s]) => {
        if (!mounted.current) {
          return;
        }
        if (h.status === 'rejected') {
          console.warn('Could not read health', h.reason);
        }
        if (s.status === 'rejected') {
          console.warn('Could not read setup state', s.reason);
        }
        const progress = setupProgress(
          stepsFor(currentManufacturer()),
          s.status === 'fulfilled' ? s.value.doneSteps : [],
          autoChecked(h.status === 'fulfilled' ? h.value : null),
        );
        setStepsLeft(progress.total - progress.done);
      });
    }, []),
  );

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

  const openSettings = (target: SettingTarget) => {
    openSetting(target).catch(e => console.warn('Could not open settings', e));
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
        {
          text: t.settings.openVoiceSettings,
          onPress: () => openSettings('tts'),
        },
      ]);
    } catch (e) {
      console.warn('Could not try reading aloud', e);
    } finally {
      if (mounted.current) {
        setTrying(false);
      }
    }
  };

  // What alarm setup's row says, once its steps are counted.
  const setupNote =
    stepsLeft === null
      ? undefined
      : stepsLeft === 0
      ? { text: t.settings.allSet, tone: GREEN_TONE }
      : { text: t.settings.stepsLeft(stepsLeft), tone: AMBER_TONE };

  return (
    <View style={styles.page}>
      <SkyBand title={t.settings.title} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Text style={styles.label}>{t.settings.language}</Text>
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
                  accessibilityHint={
                    option.draft ? t.settings.draft : undefined
                  }
                  accessibilityState={{ checked: on }}
                  onPress={() => chooseLanguage(option.code)}
                  // Side by side, or one under another once large text no longer fits three.
                  style={({ pressed }) => [
                    styles.language,
                    { flexBasis: 90 * fontScale },
                    on && styles.languageOn,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[styles.languageText, on && styles.languageTextOn]}
                  >
                    {option.label}
                  </Text>
                  {option.draft ? (
                    <Text style={styles.draft}>{t.settings.draft}</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card style={styles.rows}>
          <Row
            icon="volume_up"
            title={t.settings.readAloud}
            note={t.settings.readAloudNote}
            end={
              <Switch
                accessibilityLabel={t.settings.readAloud}
                value={readAloud}
                onValueChange={changeReadAloud}
                trackColor={{ false: colors.edge, true: colors.green }}
                thumbColor={colors.card}
              />
            }
          />
          <View style={styles.line} />
          <Row
            icon="play_arrow"
            title={t.settings.hear}
            end={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.settings.tryIt}
                accessibilityState={{ busy: trying }}
                disabled={trying}
                onPress={tryIt}
                style={({ pressed }) => [
                  styles.tryIt,
                  (pressed || trying) && styles.pressed,
                ]}
              >
                <Icon name="play_arrow" size={18} color={colors.blueText} />
                <Text style={styles.tryItText}>{t.settings.tryIt}</Text>
              </Pressable>
            }
          />
          <View style={styles.line} />
          <Row
            icon="format_size"
            title={t.settings.textSize}
            note={t.settings.textSizeNote}
            onPress={() => openSettings('display')}
          />
        </Card>

        <Card style={styles.rows}>
          <Row
            icon="verified_user"
            title={t.settings.alarmSetup}
            note={setupNote?.text}
            tone={setupNote?.tone}
            onPress={() => navigation.navigate('Setup')}
          />
        </Card>
      </ScrollView>
    </View>
  );
}

type Tone = { tile: string; ink: string };

const AMBER_TONE: Tone = { tile: colors.amberTint, ink: colors.amberText };
const GREEN_TONE: Tone = { tile: colors.greenTint, ink: colors.greenText };

type RowProps = {
  icon: IconName;
  title: string;
  note?: string;
  /** The tile and the note in a colour that says how things stand. */
  tone?: Tone;
  /** A row that opens something, with an arrow at its end. */
  onPress?: () => void;
  /** What a row that doesn't open anything has after its words: a switch, or a button. */
  end?: ReactNode;
};

/** One line of a settings card: a symbol on a tile, the words, and a switch, button or arrow. */
function Row({ icon, title, note, tone, onPress, end }: RowProps) {
  const { fontScale } = useWindowDimensions();
  const body = (
    <>
      <View
        style={[styles.tile, tone != null && { backgroundColor: tone.tile }]}
      >
        <Icon name={icon} size={22} color={tone?.ink ?? colors.blue} />
      </View>
      {/* The switch or button sits beside the words, or under them once they need the room. */}
      <View style={styles.middle}>
        <View style={[styles.words, { flexBasis: 120 * fontScale }]}>
          <Text style={styles.title}>{title}</Text>
          {note ? (
            <Text
              style={[
                styles.note,
                tone != null && [styles.toned, { color: tone.ink }],
              ]}
            >
              {note}
            </Text>
          ) : null}
        </View>
        {end}
      </View>
      {onPress ? <Icon name="chevron_right" color={colors.muted} /> : null}
    </>
  );
  if (!onPress) {
    return <View style={styles.row}>{body}</View>;
  }
  return (
    <Pressable
      accessibilityRole="button"
      // The words, without the symbols' glyphs.
      accessibilityLabel={title}
      accessibilityHint={note}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.page },
  content: { padding: spacing.md, paddingBottom: spacing.lg, gap: 12 },
  label: {
    ...font(900),
    fontSize: 13,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.blue,
    marginBottom: 10,
  },
  languages: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  language: {
    flexGrow: 1,
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 4,
    paddingVertical: 10,
    gap: 4,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageOn: { backgroundColor: colors.navy },
  languageText: {
    ...font(800),
    fontSize: 17,
    color: colors.navy,
    textAlign: 'center',
  },
  languageTextOn: { color: colors.onFill },
  draft: {
    ...font(800),
    fontSize: 13,
    color: colors.amberText,
    backgroundColor: colors.amberTint,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  rows: { paddingVertical: 6, paddingHorizontal: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    paddingVertical: 10,
  },
  line: { height: 1, backgroundColor: colors.line },
  tile: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.soft,
  },
  middle: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    columnGap: 12,
    rowGap: spacing.sm,
  },
  words: { flexGrow: 1, flexShrink: 1 },
  title: { ...font(800), fontSize: 17, lineHeight: 22, color: colors.navy },
  note: { ...font(600), fontSize: 14, color: colors.muted, marginTop: 2 },
  toned: { ...font(800) },
  tryIt: {
    maxWidth: '100%',
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.blueTint,
  },
  tryItText: {
    ...font(900),
    flexShrink: 1,
    fontSize: 15,
    color: colors.blueText,
  },
  pressed: { opacity: 0.7 },
});
