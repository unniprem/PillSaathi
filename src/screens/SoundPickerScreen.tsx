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
import RecordSheet from '../components/RecordSheet';
import SoundRow from '../components/SoundRow';
import { formatDuration, formatTime } from '../lib/time';
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
import { getToday, is24HourFormat, setCardSound } from '../native/alarms';
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
import { colors, font, radius, spacing } from '../theme';
import Card from '../ui/Card';
import Icon from '../ui/Icon';
import type { IconName } from '../ui/icons';
import SkyBand from '../ui/SkyBand';

type Props = NativeStackScreenProps<RootStackParamList, 'SoundPicker'>;
/** The dose the sound is for: its time, and the pills that ring then. */
type Dose = { hour: number; minute: number; names: string[] };

/**
 * The sound for one dose time, which every pill at that time rings with. Record a voice in a
 * pop-up, or pick a song or file; then tap a sound to use it, or hold one to delete it.
 */
export default function SoundPickerScreen({ navigation, route }: Props) {
  const { alarmId, elderId, hour, minute } = route.params;
  // On a relative's phone: the sound of her dose at hour:minute, sent to her phone.
  const forHer =
    elderId !== undefined && hour !== undefined && minute !== undefined
      ? { elderId, hour, minute }
      : null;
  const [elderName, setElderName] = useState('');
  const [herSounds, setHerSounds] = useState<ElderSound[]>([]);
  const [dose, setDose] = useState<Dose | null>(
    hour !== undefined && minute !== undefined
      ? { hour, minute, names: [] }
      : null,
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    route.params.selectedSoundId ?? null,
  );
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [recording, setRecording] = useState(false);
  const [is24h] = useState(() => is24HourFormat());
  const { t } = useI18n();
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Back to the page that opened the list; it is never the only screen in the real app.
  const leave = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace('Main');
    }
  }, [navigation]);

  const reload = useCallback(() => {
    listSounds()
      .then(list => mounted.current && setSounds(list))
      .catch(e => console.warn('Could not load sounds', e));
  }, []);

  // Her phone: the card's time and pills, for the title.
  useEffect(() => {
    if (elderId !== undefined || !alarmId) {
      return;
    }
    getToday()
      .then(today => {
        const card = today.cards.find(c => c.alarmId === alarmId);
        if (card && mounted.current) {
          setDose({
            hour: card.hour,
            minute: card.minute,
            names: card.pills.filter(p => p.exists).map(p => p.name),
          });
        }
      })
      .catch(e => console.warn('Could not load the dose', e));
  }, [alarmId, elderId]);

  useEffect(() => {
    if (!elderId) {
      return;
    }
    Promise.all([getFamily(), getElderSetup(elderId)])
      .then(([cards, setup]) => {
        if (mounted.current) {
          setElderName(cards.find(c => c.elderId === elderId)?.name ?? '');
          setHerSounds(setup.sounds);
          if (hour !== undefined && minute !== undefined) {
            setDose({
              hour,
              minute,
              names: setup.pills
                .filter(p =>
                  p.times.some(at => at.hour === hour && at.minute === minute),
                )
                .map(p => p.name),
            });
          }
        }
      })
      .catch(e => console.warn('Could not load her sounds', e));
  }, [elderId, hour, minute]);

  /** Sends the sound for her dose, then goes back. */
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
      leave();
    }
  };

  // Reload on focus, and stop any preview on blur.
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

  /** Sets the sound on the card this list was opened for, then goes back. */
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
      leave();
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

  const openRecorder = () => {
    // The sheet plays its own take, so nothing from the list may be playing.
    setPlayingId(null);
    stopPreview().catch(e => console.warn('Could not stop preview', e));
    setRecording(true);
  };

  /** A recording saved in the sheet: listed, and used for this time as if picked. */
  const recorded = (sound: Sound) => {
    setRecording(false);
    reload();
    pick(sound.id);
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

  const defaultTone = (
    <SoundRow
      first
      name={t.common.defaultTone}
      detail={t.sound.phoneAlarm}
      icon="notifications"
      selected={selectedId === null}
      onPress={() => pick(null)}
    />
  );
  // This phone's sounds: under the default tone, or in their own card on a relative's phone.
  const mine = sounds.map((sound, i) => (
    <SoundRow
      key={sound.id}
      first={forHer !== null && i === 0}
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
  ));

  return (
    <View style={styles.page}>
      <SkyBand
        title={
          dose
            ? t.sound.titleAt(formatTime(dose.hour, dose.minute, is24h))
            : t.sound.title
        }
        sub={
          dose && dose.names.length > 0
            ? t.sound.ringTogether(dose.names)
            : undefined
        }
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.tiles}>
          <Tile
            icon="mic"
            fill={colors.coral}
            tint={colors.coralTint}
            ink={colors.coralText}
            label={t.sound.record}
            onPress={openRecorder}
          />
          <Tile
            icon="upload"
            fill={colors.blue}
            tint={colors.blueTint}
            ink={colors.blueText}
            label={importing ? t.sound.importing : t.sound.import}
            busy={importing}
            onPress={doImport}
          />
        </View>

        {forHer ? (
          <>
            {elderName ? (
              <Text style={styles.heading}>
                {t.remote.herSounds(elderName)}
              </Text>
            ) : null}
            <Card style={styles.list}>
              {defaultTone}
              {herSounds.map(sound => (
                <SoundRow
                  key={`hers-${sound.id}`}
                  name={sound.name}
                  selected={selectedId === sound.id}
                  onPress={() => send('hers', sound.id)}
                />
              ))}
            </Card>
            {sounds.length > 0 ? (
              <>
                <Text style={styles.heading}>{t.remote.mySounds}</Text>
                <Card style={styles.list}>{mine}</Card>
              </>
            ) : null}
          </>
        ) : (
          <Card style={styles.list}>
            {defaultTone}
            {mine}
          </Card>
        )}

        <Text style={styles.note}>{t.sound.hint}</Text>
      </ScrollView>
      <RecordSheet
        visible={recording}
        onClose={() => setRecording(false)}
        onSaved={recorded}
      />
    </View>
  );
}

type TileProps = {
  icon: IconName;
  fill: string;
  tint: string;
  ink: string;
  label: string;
  busy?: boolean;
  onPress: () => void;
};

/** One of the two big ways to add a sound: a tinted tile with its symbol on a round fill. */
function Tile({
  icon,
  fill,
  tint,
  ink,
  label,
  busy = false,
  onPress,
}: TileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: tint },
        pressed && styles.pressed,
        busy && styles.busy,
      ]}
    >
      <View style={[styles.tileIcon, { backgroundColor: fill }]}>
        <Icon name={icon} color={colors.onFill} />
      </View>
      <Text style={[styles.tileWords, { color: ink }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.page },
  body: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: spacing.lg,
    gap: 12,
  },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: {
    flex: 1,
    minHeight: 112,
    borderRadius: radius.card,
    padding: 14,
    gap: 10,
  },
  pressed: { opacity: 0.85 },
  busy: { opacity: 0.6 },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileWords: { ...font(900), fontSize: 16, lineHeight: 21 },
  list: { paddingVertical: 2, paddingHorizontal: 14 },
  heading: {
    ...font(800),
    fontSize: 15,
    color: colors.muted,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  note: {
    ...font(600),
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
});
