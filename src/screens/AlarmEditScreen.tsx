import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import DayChips from '../components/DayChips';
import { formatTime } from '../lib/time';
import {
  deleteAlarm,
  getHealth,
  getSetupState,
  is24HourFormat,
  listAlarms,
  markSetupSeen,
  openSetting,
  pickTime,
  saveAlarm,
} from '../native/alarms';
import { listSounds } from '../native/sounds';
import type { Sound } from '../native/sounds';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AlarmEdit'>;

type Draft = {
  hour: number;
  minute: number;
  days: number[];
  name: string;
  soundId: string | null;
};

const NEW_ALARM: Draft = {
  hour: 7,
  minute: 0,
  days: [],
  name: '',
  soundId: null,
};

export default function AlarmEditScreen({ navigation, route }: Props) {
  const { alarmId, pickedSoundId } = route.params ?? {};
  const [draft, setDraft] = useState<Draft>(NEW_ALARM);
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [saving, setSaving] = useState(false);
  const [is24h] = useState(() => is24HourFormat());
  const mounted = useRef(true);

  // Leaves the editor; the editor is never the only screen in the real app.
  const leave = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace('AlarmList');
    }
  }, [navigation]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const renderCancel = useCallback(
    () => (
      <Pressable accessibilityRole="button" onPress={leave}>
        <Text style={styles.headerButton}>Cancel</Text>
      </Pressable>
    ),
    [leave],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: alarmId ? 'Edit alarm' : 'New alarm',
      headerLeft: renderCancel,
    });
  }, [navigation, alarmId, renderCancel]);

  useEffect(() => {
    listSounds()
      .then(list => mounted.current && setSounds(list))
      .catch(e => console.warn('Could not load sounds', e));
  }, []);

  useEffect(() => {
    if (!alarmId) {
      return;
    }
    listAlarms()
      .then(list => {
        const alarm = list.find(a => a.id === alarmId);
        if (!mounted.current) {
          return;
        }
        if (!alarm) {
          leave();
          return;
        }
        setDraft(d => ({
          hour: alarm.hour,
          minute: alarm.minute,
          days: alarm.days,
          name: alarm.name,
          // A sound picked before the alarm loaded wins.
          soundId: d.soundId ?? alarm.soundId,
        }));
      })
      .catch(e => console.warn('Could not load the alarm', e));
  }, [alarmId, leave]);

  // A child screen returns its pick through the params; apply it, then clear it.
  useEffect(() => {
    if (pickedSoundId !== undefined) {
      setDraft(d => ({ ...d, soundId: pickedSoundId }));
      navigation.setParams({ pickedSoundId: undefined });
    }
  }, [pickedSoundId, navigation]);

  const choosingTime = async () => {
    const picked = await pickTime(draft.hour, draft.minute);
    if (picked && mounted.current) {
      setDraft(d => ({ ...d, hour: picked.hour, minute: picked.minute }));
    }
  };

  const toggleDay = (day: number) =>
    setDraft(d => ({
      ...d,
      days: (d.days.includes(day)
        ? d.days.filter(x => x !== day)
        : [...d.days, day]
      ).sort((a, b) => a - b),
    }));

  const finish = async () => {
    if (!(await getSetupState()).seen) {
      await markSetupSeen();
      navigation.replace('Setup');
    } else {
      leave();
    }
  };

  const save = async () => {
    if (saving) {
      return;
    }
    setSaving(true);
    try {
      await saveAlarm({
        id: alarmId ?? null,
        hour: draft.hour,
        minute: draft.minute,
        days: draft.days,
        name: draft.name.trim() || 'Alarm',
        soundId: draft.soundId,
      });
      if (!(await getHealth()).exactAlarmAllowed) {
        Alert.alert(
          'PillSaathi needs permission to set alarms',
          'Without it, Android may not ring your alarms on time.',
          [
            { text: 'Not now', style: 'cancel', onPress: () => finish() },
            {
              text: 'Allow',
              onPress: () => {
                openSetting('exactAlarm').catch(e =>
                  console.warn('Could not open settings', e),
                );
                finish();
              },
            },
          ],
          { cancelable: false },
        );
        return;
      }
      await finish();
    } catch (e) {
      console.warn('Could not save the alarm', e);
      if (mounted.current) {
        Alert.alert('Could not save the alarm', 'Please try again.');
      }
    } finally {
      if (mounted.current) {
        setSaving(false);
      }
    }
  };

  const confirmDelete = () => {
    if (!alarmId) {
      return;
    }
    Alert.alert('Delete this alarm?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAlarm(alarmId);
            leave();
          } catch (e) {
            console.warn('Could not delete the alarm', e);
          }
        },
      },
    ]);
  };

  const soundName =
    sounds.find(s => s.id === draft.soundId)?.name ?? 'Default alarm tone';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable
        accessibilityRole="button"
        onPress={choosingTime}
        style={styles.timeButton}
      >
        <Text style={styles.time}>
          {formatTime(draft.hour, draft.minute, is24h)}
        </Text>
      </Pressable>

      <Text style={styles.label}>Repeat</Text>
      <DayChips days={draft.days} onToggle={toggleDay} />

      <Text style={styles.label}>Name</Text>
      <TextInput
        value={draft.name}
        onChangeText={name => setDraft(d => ({ ...d, name }))}
        placeholder="Alarm"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />

      <Text style={styles.label}>Sound</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          navigation.navigate('SoundPicker', { selectedSoundId: draft.soundId })
        }
        style={styles.soundRow}
      >
        <Text style={styles.soundText}>{soundName}</Text>
        <Text style={styles.soundText}>›</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={save}
        disabled={saving}
        style={styles.save}
      >
        <Text style={styles.saveText}>Save</Text>
      </Pressable>

      {alarmId ? (
        <Pressable
          accessibilityRole="button"
          onPress={confirmDelete}
          style={styles.delete}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  headerButton: { fontSize: 16, color: colors.primary },
  timeButton: { alignItems: 'center', paddingVertical: spacing.lg },
  time: { fontSize: 64, fontWeight: '300', color: colors.text },
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
  soundRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
  },
  soundText: { fontSize: 18, color: colors.text },
  save: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
  },
  saveText: { color: colors.onPrimary, fontSize: 18, fontWeight: '600' },
  delete: { marginTop: spacing.md, padding: spacing.md, alignItems: 'center' },
  deleteText: { color: colors.danger, fontSize: 18 },
});
