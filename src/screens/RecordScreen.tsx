import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  PermissionsAndroid,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { formatDuration } from '../lib/time';
import { setCardSound } from '../native/alarms';
import { errorCode, familyMessage } from '../lib/family';
import { FamilyErrors, sendSound } from '../native/family';
import {
  discardRecording,
  onPreviewEnded,
  onRecordingAutoStopped,
  onRecordingLevel,
  previewRecording,
  saveRecording,
  SoundErrors,
  startRecording,
  stopPreview,
  stopRecording,
} from '../native/sounds';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useI18n } from '../i18n';
import { colors, spacing } from '../theme';
import SkyBand from '../ui/SkyBand';

type Props = NativeStackScreenProps<RootStackParamList, 'Record'>;
type Phase = 'idle' | 'recording' | 'recorded';

const BAR_COUNT = 24;
const MAX_BAR_HEIGHT = 60;

export default function RecordScreen({ navigation, route }: Props) {
  const { alarmId, elderId, hour, minute } = route.params;
  // On a relative's phone: the recording is sent for her dose at hour:minute.
  const forHer =
    elderId !== undefined && hour !== undefined && minute !== undefined
      ? { elderId, hour, minute }
      : null;
  const { t } = useI18n();
  // For the native event callbacks, which subscribe once.
  const words = useRef(t);
  words.current = t;
  const [phase, setPhaseState] = useState<Phase>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const [name, setName] = useState(() => t.record.defaultName);
  const [listening, setListening] = useState(false);
  const [saving, setSaving] = useState(false);
  const mounted = useRef(true);
  // Mirrors `phase` for the event callbacks and the unmount cleanup.
  const phaseRef = useRef<Phase>('idle');
  const busy = useRef(false);
  const saved = useRef(false);
  // True from the tap on "Use this sound" until the save settles.
  const savingRef = useRef(false);

  const discard = useCallback(() => {
    discardRecording().catch(e =>
      console.warn('Could not discard the recording', e),
    );
  }, []);

  const setPhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  const backToIdle = useCallback(() => {
    setPhase('idle');
    setElapsedMs(0);
    setLevels([]);
    setListening(false);
  }, [setPhase]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      // A save in flight owns the take: it discards itself if it fails.
      if (!saved.current && !savingRef.current && phaseRef.current !== 'idle') {
        discard();
      }
      stopPreview().catch(e => console.warn('Could not stop preview', e));
    };
  }, [discard]);

  useEffect(() => {
    const subs = [
      onRecordingLevel(level => {
        if (phaseRef.current === 'recording') {
          setLevels(l => [...l, level].slice(-BAR_COUNT));
        }
      }),
      onRecordingAutoStopped(durationMs => {
        if (phaseRef.current !== 'recording') {
          return;
        }
        if (durationMs <= 0) {
          // The take couldn't be finalised, so it is lost.
          Alert.alert(words.current.record.notSaved);
          backToIdle();
          return;
        }
        setElapsedMs(durationMs);
        setPhase('recorded');
      }),
      onPreviewEnded(() => setListening(false)),
    ];
    return () => subs.forEach(s => s.remove());
  }, [backToIdle, setPhase]);

  // The m:ss counter, running only while recording.
  useEffect(() => {
    if (phase !== 'recording') {
      return;
    }
    const startedAt = Date.now();
    const timer = setInterval(() => setElapsedMs(Date.now() - startedAt), 250);
    return () => clearInterval(timer);
  }, [phase]);

  const micOff = useCallback(() => {
    Alert.alert(t.record.micOffTitle, t.record.micMessage, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.openSettings,
        onPress: () =>
          Linking.openSettings().catch(e =>
            console.warn('Could not open settings', e),
          ),
      },
    ]);
  }, [t]);

  const start = async () => {
    if (busy.current) {
      return;
    }
    busy.current = true;
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: t.record.allowMic,
          message: t.record.micMessage,
          buttonPositive: t.common.ok,
        },
      );
      if (!mounted.current) {
        return;
      }
      if (result !== PermissionsAndroid.RESULTS.GRANTED) {
        micOff();
        return;
      }
      await startRecording();
      if (mounted.current) {
        setElapsedMs(0);
        setLevels([]);
        setPhase('recording');
      } else {
        // The user left while the start was pending; release the microphone.
        discard();
      }
    } catch (e) {
      if (!mounted.current) {
        return;
      }
      if ((e as { code?: string })?.code === SoundErrors.MicPermission) {
        micOff();
      } else {
        console.warn('Could not start recording', e);
        Alert.alert(t.record.startFailed, t.common.tryAgain);
      }
    } finally {
      busy.current = false;
    }
  };

  const stop = async () => {
    if (busy.current) {
      return;
    }
    busy.current = true;
    try {
      const durationMs = await stopRecording();
      if (mounted.current && phaseRef.current === 'recording') {
        setElapsedMs(durationMs);
        setPhase('recorded');
      }
    } catch (e) {
      // An auto-stop may already have moved on; then there is nothing to show.
      if (!mounted.current || phaseRef.current !== 'recording') {
        return;
      }
      if ((e as { code?: string })?.code === SoundErrors.TooShort) {
        Alert.alert(t.record.tooShort);
      } else {
        console.warn('Could not stop recording', e);
        Alert.alert(t.record.saveFailed, t.common.tryAgain);
      }
      // Whatever went wrong, make sure the microphone is released.
      discard();
      backToIdle();
    } finally {
      busy.current = false;
    }
  };

  const toggleListen = () => {
    if (listening) {
      setListening(false);
      stopPreview().catch(e => console.warn('Could not stop preview', e));
      return;
    }
    setListening(true);
    previewRecording().catch(e => {
      console.warn('Could not play the recording', e);
      if (mounted.current) {
        setListening(false);
        Alert.alert(t.record.playFailed, t.common.tryAgain);
      }
    });
  };

  const redo = () => {
    if (listening) {
      stopPreview().catch(e => console.warn('Could not stop preview', e));
    }
    backToIdle();
    discard();
  };

  const saveTake = async () => {
    if (savingRef.current) {
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      const sound = await saveRecording(name.trim() || t.record.defaultName);
      saved.current = true;
      try {
        if (forHer) {
          // Kept in this phone's sounds too, so it can go to her other times.
          await sendSound(
            forHer.elderId,
            forHer.hour,
            forHer.minute,
            'mine',
            sound.id,
          );
        } else if (alarmId) {
          await setCardSound(alarmId, sound.id);
        }
      } catch (e) {
        // The recording is kept and listed in the picker; only the card's sound didn't change.
        console.warn('Could not set the recording on the card', e);
        if (mounted.current) {
          const code = errorCode(e);
          Alert.alert(
            forHer
              ? code === FamilyErrors.TooBig
                ? t.remote.tooBig
                : familyMessage(e, t)
              : t.record.changeFailed,
            forHer ? undefined : t.common.tryAgain,
          );
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.replace('Main');
          }
        }
        return;
      }
      if (mounted.current) {
        if (forHer) {
          navigation.popTo('ElderPills', { elderId: forHer.elderId });
        } else {
          navigation.popTo('Main');
        }
      }
    } catch (e) {
      console.warn('Could not save the recording', e);
      savingRef.current = false;
      if (mounted.current) {
        Alert.alert(t.record.saveFailed, t.common.tryAgain);
        setSaving(false);
      } else {
        // The user left mid-save and it failed: the take is still unsaved.
        discard();
      }
    }
  };

  const bars = Array.from({ length: BAR_COUNT }, (_, i) => {
    const level = levels[i - (BAR_COUNT - levels.length)] ?? 0;
    return Math.max(4, level * MAX_BAR_HEIGHT);
  });

  return (
    <View style={styles.container}>
      <SkyBand title={t.record.title} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.timer}>{formatDuration(elapsedMs)}</Text>

        {phase === 'idle' ? (
          <>
            <Text style={styles.hint}>{t.record.upTo}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.record.start}
              onPress={() => {
                start();
              }}
              style={styles.recordButton}
            >
              <View style={styles.recordDot} />
            </Pressable>
          </>
        ) : null}

        {phase === 'recording' ? (
          <>
            <View style={styles.bars}>
              {bars.map((h, i) => (
                <View key={i} style={[styles.bar, { height: h }]} />
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.record.stop}
              onPress={() => {
                stop();
              }}
              style={styles.recordButton}
            >
              <View style={styles.stopSquare} />
            </Pressable>
            <Text style={styles.hint}>{t.record.tapToStop}</Text>
          </>
        ) : null}

        {phase === 'recorded' ? (
          <>
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={toggleListen}
                style={styles.secondary}
              >
                <Text style={styles.secondaryText}>
                  {listening ? t.record.stopListening : t.record.listen}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={redo}
                style={styles.secondary}
              >
                <Text style={styles.secondaryText}>{t.record.redo}</Text>
              </Pressable>
            </View>
            <Text style={styles.label}>{t.record.name}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t.record.defaultName}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={() => {
                saveTake();
              }}
              style={styles.primary}
            >
              <Text style={styles.primaryText}>{t.record.use}</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, alignItems: 'stretch' },
  timer: {
    fontSize: 64,
    fontWeight: '300',
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  hint: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: MAX_BAR_HEIGHT,
    gap: 3,
    marginVertical: spacing.lg,
  },
  bar: { width: 6, borderRadius: 3, backgroundColor: colors.primary },
  recordButton: {
    alignSelf: 'center',
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordDot: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.danger,
  },
  stopSquare: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: colors.danger,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  secondary: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
  },
  secondaryText: { fontSize: 18, color: colors.text },
  label: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 18,
    color: colors.text,
  },
  primary: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
  },
  primaryText: { color: colors.onPrimary, fontSize: 18, fontWeight: '600' },
});
