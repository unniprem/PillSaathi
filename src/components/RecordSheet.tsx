import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  Linking,
  PermissionsAndroid,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { formatDuration } from '../lib/time';
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
import type { Sound } from '../native/sounds';
import { useI18n } from '../i18n';
import { colors, font, radius, shadow } from '../theme';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import Sheet from '../ui/Sheet';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** The take, saved under its name: the sheet is done with it. */
  onSaved: (sound: Sound) => void;
};
type Phase = 'idle' | 'recording' | 'recorded';

const BAR_COUNT = 24;
const MAX_BAR_HEIGHT = 56;
const MIN_BAR_HEIGHT = 4;

/**
 * Records a voice for an alarm in a pop-up over the sound list. Ready: a big microphone button.
 * Recording: the timer, the voice drawn as bars, and a big stop button. Done: Listen, Record
 * again, a name, and "Use this sound". Closing it throws away a take that wasn't saved.
 */
export default function RecordSheet({ visible, onClose, onSaved }: Props) {
  return (
    <Sheet visible={visible} onClose={onClose}>
      {/* Only while open, so closing the sheet ends the recorder as leaving a page would. */}
      {visible ? <Recorder onSaved={onSaved} /> : null}
    </Sheet>
  );
}

function Recorder({ onSaved }: Pick<Props, 'onSaved'>) {
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
        // The sheet was closed while the start was pending; release the microphone.
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
    let sound: Sound;
    try {
      sound = await saveRecording(name.trim() || t.record.defaultName);
    } catch (e) {
      console.warn('Could not save the recording', e);
      savingRef.current = false;
      if (mounted.current) {
        Alert.alert(t.record.saveFailed, t.common.tryAgain);
        setSaving(false);
      } else {
        // The sheet was closed mid-save and it failed: the take is still unsaved.
        discard();
      }
      return;
    }
    saved.current = true;
    // Handed over even if the sheet was closed meanwhile: "Use this sound" was tapped.
    onSaved(sound);
  };

  // The newest level is on the right; bars with nothing heard yet stay low and faint.
  const bars = Array.from({ length: BAR_COUNT }, (_, i) => {
    const level = levels[i - (BAR_COUNT - levels.length)];
    return {
      height: Math.max(MIN_BAR_HEIGHT, (level ?? 0) * MAX_BAR_HEIGHT),
      heard: level !== undefined,
    };
  });

  return (
    <>
      <Text accessibilityRole="header" style={styles.title}>
        {phase === 'recording' ? t.record.recording : t.record.title}
      </Text>

      {phase === 'idle' ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.record.start}
            onPress={() => {
              start();
            }}
            style={({ pressed }) => [styles.big, pressed && styles.pressed]}
          >
            <CoralButton>
              <Icon name="mic" size={44} color={colors.onFill} />
            </CoralButton>
            <Text style={styles.bigWords}>{t.record.start}</Text>
          </Pressable>
          <Text style={styles.limit}>{t.record.upTo}</Text>
        </>
      ) : null}

      {phase === 'recording' ? (
        <>
          <View>
            <Text maxFontSizeMultiplier={1.5} style={styles.timer}>
              {formatDuration(elapsedMs)}
            </Text>
            <Text style={styles.limit}>{t.record.upTo}</Text>
          </View>
          <View style={styles.bars}>
            {bars.map((bar, i) => (
              <View
                key={i}
                style={[
                  styles.bar,
                  { height: bar.height },
                  !bar.heard && styles.quiet,
                ]}
              />
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.record.stop}
            onPress={() => {
              stop();
            }}
            style={({ pressed }) => [styles.big, pressed && styles.pressed]}
          >
            <CoralButton>
              <View style={styles.stopSquare} />
            </CoralButton>
            <Text style={styles.bigWords}>{t.record.tapToStop}</Text>
          </Pressable>
        </>
      ) : null}

      {phase === 'recorded' ? (
        <>
          <Text maxFontSizeMultiplier={1.5} style={styles.timer}>
            {formatDuration(elapsedMs)}
          </Text>
          <View style={styles.pair}>
            <View style={styles.half}>
              <Button
                label={listening ? t.record.stopListening : t.record.listen}
                icon={listening ? 'stop' : 'play_arrow'}
                variant="secondary"
                onPress={toggleListen}
              />
            </View>
            <View style={styles.half}>
              <Button
                label={t.record.redo}
                icon="mic"
                variant="secondary"
                onPress={redo}
              />
            </View>
          </View>
          <Text style={styles.label}>{t.record.name}</Text>
          <TextInput
            accessibilityLabel={t.record.name}
            value={name}
            onChangeText={setName}
            placeholder={t.record.defaultName}
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          <Button
            label={t.record.use}
            icon="check"
            variant="green"
            disabled={saving}
            onPress={() => {
              saveTake();
            }}
          />
        </>
      ) : null}
    </>
  );
}

/** The big round coral face of the start and stop buttons, in two soft coral rings. */
function CoralButton({ children }: { children: ReactNode }) {
  return (
    <View style={styles.rings}>
      <View style={[styles.ring, styles.outer]} />
      <View style={[styles.ring, styles.inner]} />
      <View style={styles.face}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    ...font(900),
    fontSize: 20,
    color: colors.navy,
    textAlign: 'center',
  },
  big: { alignItems: 'center', gap: 4 },
  pressed: { opacity: 0.85 },
  rings: {
    width: 136,
    height: 136,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderRadius: radius.pill,
    backgroundColor: colors.coral,
  },
  outer: { width: 136, height: 136, opacity: 0.08 },
  inner: { width: 112, height: 112, opacity: 0.16 },
  face: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.coral,
    boxShadow: shadow.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopSquare: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: colors.onFill,
  },
  bigWords: {
    ...font(900),
    fontSize: 16,
    color: colors.navy,
    textAlign: 'center',
  },
  limit: {
    ...font(700),
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
  },
  timer: {
    ...font(900),
    fontSize: 48,
    letterSpacing: -1,
    color: colors.navy,
    textAlign: 'center',
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: MAX_BAR_HEIGHT,
    gap: 3,
  },
  bar: { width: 5, borderRadius: 3, backgroundColor: colors.coral },
  quiet: { opacity: 0.35 },
  pair: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  label: { ...font(800), fontSize: 15, color: colors.muted, marginTop: 4 },
  input: {
    ...font(800),
    minHeight: 52,
    borderWidth: 2,
    borderColor: colors.edge,
    borderRadius: 16,
    paddingHorizontal: 14,
    fontSize: 18,
    color: colors.navy,
    backgroundColor: colors.card,
  },
});
