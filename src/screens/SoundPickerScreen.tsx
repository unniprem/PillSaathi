import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import SoundRow from '../components/SoundRow';
import { formatDuration } from '../lib/time';
import {
  deleteSound,
  importSound,
  listSounds,
  onPreviewEnded,
  previewSound,
  SoundErrors,
  stopPreview,
} from '../native/sounds';
import type { Sound } from '../native/sounds';
import { setCardSound } from '../native/alarms';
import { errorCode, familyMessage } from '../lib/family';
import {
  FamilyErrors,
  getElderSetup,
  getFamily,
  sendSound,
} from '../native/family';
import type { ElderSound, SoundKind } from '../native/family';
import { useI18n } from '../i18n';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors, spacing } from '../theme';
import SkyBand from '../ui/SkyBand';

type Props = NativeStackScreenProps<RootStackParamList, 'SoundPicker'>;

export default function SoundPickerScreen({ navigation, route }: Props) {
  const { alarmId, elderId, hour, minute } = route.params;
  // On a relative's phone: the sound of her dose at hour:minute, sent to her phone.
  const forHer =
    elderId !== undefined && hour !== undefined && minute !== undefined
      ? { elderId, hour, minute }
      : null;
  const [elderName, setElderName] = useState('');
  const [herSounds, setHerSounds] = useState<ElderSound[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(
    route.params.selectedSoundId ?? null,
  );
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const { t } = useI18n();
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const reload = useCallback(() => {
    listSounds()
      .then(list => mounted.current && setSounds(list))
      .catch(e => console.warn('Could not load sounds', e));
  }, []);

  useEffect(() => {
    if (!elderId) {
      return;
    }
    Promise.all([getFamily(), getElderSetup(elderId)])
      .then(([cards, setup]) => {
        if (mounted.current) {
          setElderName(cards.find(c => c.elderId === elderId)?.name ?? '');
          setHerSounds(setup.sounds);
        }
      })
      .catch(e => console.warn('Could not load her sounds', e));
  }, [elderId]);

  /** Sends the sound for her dose, then returns to her pills. */
  const send = async (kind: SoundKind, id: string | null) => {
    if (!forHer) {
      return;
    }
    try {
      await sendSound(forHer.elderId, forHer.hour, forHer.minute, kind, id);
    } catch (e) {
      console.warn('Could not send the sound', e);
      if (mounted.current) {
        const code = errorCode(e);
        Alert.alert(
          code === FamilyErrors.TooBig
            ? t.remote.tooBig
            : code === FamilyErrors.NotAllowed
            ? t.remote.notEditor(elderName)
            : familyMessage(e, t),
        );
      }
      return;
    }
    if (mounted.current) {
      navigation.popTo('ElderPills', { elderId: forHer.elderId });
    }
  };

  // Reload on focus (the list can change while Record is open) and stop any
  // preview on blur.
  useFocusEffect(
    useCallback(() => {
      reload();
      return () => {
        setPlayingId(null);
        stopPreview().catch(e => console.warn('Could not stop preview', e));
      };
    }, [reload]),
  );

  // onPreviewEnded does not fire for stopPreview or a switch, so the toggle
  // resets its own state in those cases.
  useEffect(() => {
    const sub = onPreviewEnded(id =>
      setPlayingId(current => (current === id ? null : current)),
    );
    return () => sub.remove();
  }, []);

  /** Sets the sound on the card this picker was opened for, then returns to Today. */
  const pick = async (id: string | null) => {
    if (forHer) {
      await send(id === null ? 'default' : 'mine', id);
      return;
    }
    try {
      if (alarmId) {
        await setCardSound(alarmId, id);
      }
    } catch (e) {
      console.warn('Could not change the sound', e);
      if (mounted.current) {
        Alert.alert(t.sound.changeFailed, t.common.tryAgain);
      }
      return;
    }
    if (mounted.current) {
      navigation.popTo('Main');
    }
  };

  const togglePreview = (id: string) => {
    if (playingId === id) {
      setPlayingId(null);
      stopPreview().catch(e => console.warn('Could not stop preview', e));
      return;
    }
    setPlayingId(id);
    previewSound(id).catch(e => {
      console.warn('Could not preview the sound', e);
      if (mounted.current) {
        setPlayingId(current => (current === id ? null : current));
        Alert.alert(t.sound.playFailed, t.common.tryAgain);
      }
    });
  };

  const doImport = async () => {
    if (importing) {
      return;
    }
    setImporting(true);
    try {
      const sound = await importSound();
      if (sound && mounted.current) {
        await pick(sound.id);
      }
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === SoundErrors.Busy || !mounted.current) {
        return;
      }
      if (code === SoundErrors.UnsupportedAudio) {
        Alert.alert(t.sound.unsupported);
      } else {
        console.warn('Could not import the sound', e);
        Alert.alert(t.sound.importFailed, t.common.tryAgain);
      }
    } finally {
      if (mounted.current) {
        setImporting(false);
      }
    }
  };

  const confirmDelete = (sound: Sound) => {
    const message = sound.usedBy.length
      ? t.sound.usedBy(sound.usedBy.join(', '))
      : undefined;
    Alert.alert(t.sound.deleteTitle(sound.name), message, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: async () => {
          if (playingId === sound.id) {
            setPlayingId(null);
            stopPreview().catch(e => console.warn('Could not stop preview', e));
          }
          try {
            await deleteSound(sound.id);
          } catch (e) {
            console.warn('Could not delete the sound', e);
            if (mounted.current) {
              Alert.alert(t.sound.deleteFailed, t.common.tryAgain);
              reload();
            }
            return;
          }
          if (mounted.current) {
            setSelectedId(current => (current === sound.id ? null : current));
            reload();
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <SkyBand title={t.sound.title} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.buttons}>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Record', forHer ?? { alarmId })}
            style={styles.bigButton}
          >
            <Text style={styles.bigButtonText}>{t.sound.record}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: importing }}
            disabled={importing}
            onPress={doImport}
            style={[styles.bigButton, importing && styles.busy]}
          >
            <Text style={styles.bigButtonText}>
              {importing ? t.sound.importing : t.sound.import}
            </Text>
          </Pressable>
        </View>

        {forHer ? null : (
          <Text style={styles.heading}>{t.sound.yourSounds}</Text>
        )}
        <SoundRow
          name={t.common.defaultTone}
          selected={selectedId === null}
          onPress={() => pick(null)}
        />
        {forHer && herSounds.length > 0 ? (
          <Text style={styles.heading}>{t.remote.herSounds(elderName)}</Text>
        ) : null}
        {forHer
          ? herSounds.map(sound => (
              <SoundRow
                key={`hers-${sound.id}`}
                name={sound.name}
                selected={selectedId === sound.id}
                onPress={() => send('hers', sound.id)}
              />
            ))
          : null}
        {forHer ? (
          <Text style={styles.heading}>{t.remote.mySounds}</Text>
        ) : null}
        {sounds.map(sound => (
          <SoundRow
            key={sound.id}
            name={sound.name}
            detail={`${
              sound.kind === 'recorded' ? t.sound.recorded : t.sound.imported
            } · ${formatDuration(sound.durationMs)}`}
            selected={selectedId === sound.id}
            playing={playingId === sound.id}
            previewId={sound.id}
            onPress={() => pick(sound.id)}
            onLongPress={() => confirmDelete(sound)}
            onTogglePreview={() => togglePreview(sound.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.lg },
  buttons: { flexDirection: 'row', padding: spacing.md, gap: spacing.md },
  bigButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  busy: { opacity: 0.6 },
  bigButtonText: { color: colors.onPrimary, fontSize: 18, fontWeight: '600' },
  heading: {
    fontSize: 14,
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
