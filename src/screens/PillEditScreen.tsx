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
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import AmountStepper from '../components/AmountStepper';
import { AMOUNT_RULES, FORMS, FORM_LABELS } from '../lib/amount';
import type { PillForm } from '../lib/amount';
import { addDays, courseSummary, toISODate } from '../lib/course';
import { formatTime } from '../lib/time';
import {
  deletePill,
  getHealth,
  getSetupState,
  is24HourFormat,
  listPills,
  markSetupSeen,
  openSetting,
  pickTime,
  savePill,
} from '../native/alarms';
import type { DoseTime } from '../native/alarms';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'PillEdit'>;

/** A preset number of days, "Other…" (typed), or "No end". Nothing is chosen for a new pill. */
type Duration = 5 | 7 | 10 | 20 | 'other' | 'none';

const PRESETS: (5 | 7 | 10 | 20)[] = [5, 7, 10, 20];
const MAX_TIMES = 6;
const MAX_DAYS = 365;
const FIRST_TIME: DoseTime = { hour: 8, minute: 0 };

const sameTime = (a: DoseTime, b: DoseTime) =>
  a.hour === b.hour && a.minute === b.minute;
const byTime = (a: DoseTime, b: DoseTime) =>
  a.hour - b.hour || a.minute - b.minute;

/** The days a duration stands for: a number, null for no end, or undefined when not valid yet. */
function daysOf(
  duration: Duration | null,
  other: string,
): number | null | undefined {
  if (duration === null) {
    return undefined;
  }
  if (duration === 'none') {
    return null;
  }
  if (duration === 'other') {
    const n = /^\d+$/.test(other) ? Number(other) : NaN;
    return n >= 1 && n <= MAX_DAYS ? n : undefined;
  }
  return duration;
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function PillEditScreen({ navigation, route }: Props) {
  const pillId = route.params?.pillId;
  const [name, setName] = useState('');
  const [form, setForm] = useState<PillForm>('tablet');
  const [amount, setAmount] = useState(AMOUNT_RULES.tablet.initial);
  const [times, setTimes] = useState<DoseTime[]>([]);
  const [duration, setDuration] = useState<Duration | null>(null);
  const [otherDays, setOtherDays] = useState('');
  const [startsTomorrow, setStartsTomorrow] = useState(false);
  // An edit keeps the pill's start date; it is known once the pill has loaded.
  const [startDate, setStartDate] = useState<string | null>(null);
  // Editing: Save waits for the pill, or it would overwrite it with the new-pill defaults.
  const [loaded, setLoaded] = useState(!pillId);
  const [saving, setSaving] = useState(false);
  const [is24h] = useState(() => is24HourFormat());
  const [today] = useState(() => toISODate(new Date()));
  const mounted = useRef(true);

  // Leaves the page; it is never the only screen in the real app.
  const leave = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace('Today');
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
      title: pillId ? 'Edit pill' : 'Add pill',
      headerLeft: renderCancel,
    });
  }, [navigation, pillId, renderCancel]);

  useEffect(() => {
    if (!pillId) {
      return;
    }
    listPills()
      .then(list => {
        const pill = list.find(p => p.id === pillId);
        if (!mounted.current) {
          return;
        }
        if (!pill) {
          leave();
          return;
        }
        setName(pill.name);
        setForm(pill.form);
        setAmount(pill.amount);
        setTimes([...pill.times].sort(byTime));
        setStartDate(pill.startDate);
        if (pill.days === null) {
          setDuration('none');
        } else if ((PRESETS as number[]).includes(pill.days)) {
          setDuration(pill.days as Duration);
        } else {
          setDuration('other');
          setOtherDays(String(pill.days));
        }
        setLoaded(true);
      })
      .catch(e => {
        console.warn('Could not load the pill', e);
        if (mounted.current) {
          Alert.alert("Couldn't load this pill.");
          leave();
        }
      });
  }, [pillId, leave]);

  const chooseForm = (next: PillForm) => {
    if (next !== form) {
      setForm(next);
      setAmount(AMOUNT_RULES[next].initial);
    }
  };

  /** Picks a time for slot [index], or a new one; a time already on the pill is refused. */
  const chooseTime = async (index?: number) => {
    const current = index === undefined ? FIRST_TIME : times[index];
    const picked = await pickTime(current.hour, current.minute);
    if (!picked || !mounted.current) {
      return;
    }
    if (times.some((t, i) => i !== index && sameTime(t, picked))) {
      Alert.alert('That time is already added.');
      return;
    }
    const next =
      index === undefined
        ? [...times, picked]
        : times.map((t, i) => (i === index ? picked : t));
    setTimes(next.sort(byTime));
  };

  const removeTime = (index: number) =>
    setTimes(list => list.filter((_, i) => i !== index));

  const days = daysOf(duration, otherDays);
  const ready =
    loaded && name.trim() !== '' && times.length > 0 && days !== undefined;
  const courseStart = startDate ?? (startsTomorrow ? addDays(today, 1) : today);

  // Runs after a successful save; it never throws, so the user always leaves.
  const finish = useCallback(async () => {
    try {
      if (!(await getSetupState()).seen) {
        await markSetupSeen();
        navigation.replace('Setup');
        return;
      }
    } catch (e) {
      console.warn('Could not check the setup state', e);
    }
    leave();
  }, [navigation, leave]);

  const save = useCallback(async () => {
    if (saving || !ready || days === undefined) {
      return;
    }
    setSaving(true);
    try {
      await savePill({
        id: pillId ?? null,
        name: name.trim(),
        form,
        amount,
        times,
        startsTomorrow: pillId ? false : startsTomorrow,
        days,
      });
    } catch (e) {
      console.warn('Could not save the pill', e);
      if (mounted.current) {
        Alert.alert('Could not save the pill', 'Please try again.');
        setSaving(false);
      }
      return;
    }
    // The pill is saved; whatever happens next, leave the page.
    let exactAlarmAllowed = true;
    try {
      exactAlarmAllowed = (await getHealth()).exactAlarmAllowed;
    } catch (e) {
      console.warn('Could not read health', e);
    }
    if (!exactAlarmAllowed) {
      Alert.alert(
        'PillSaathi needs permission to set alarms',
        'Without it, Android may not ring your medicines on time.',
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
    } else {
      await finish();
    }
    if (mounted.current) {
      setSaving(false);
    }
  }, [
    saving,
    ready,
    days,
    pillId,
    name,
    form,
    amount,
    times,
    startsTomorrow,
    finish,
  ]);

  const confirmDelete = useCallback(() => {
    if (!pillId) {
      return;
    }
    Alert.alert('Delete this pill?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePill(pillId);
            leave();
          } catch (e) {
            console.warn('Could not delete the pill', e);
            if (mounted.current) {
              Alert.alert('Could not delete the pill', 'Please try again.');
            }
          }
        },
      },
    ]);
  }, [pillId, leave]);

  const renderActions = useCallback(
    () => (
      <View style={styles.headerActions}>
        {pillId ? (
          <Pressable
            accessibilityRole="button"
            onPress={confirmDelete}
            hitSlop={spacing.sm}
          >
            <Text style={styles.headerDelete}>Delete</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready || saving }}
          onPress={save}
          disabled={!ready || saving}
          hitSlop={spacing.sm}
        >
          <Text style={[styles.headerSave, !ready && styles.disabled]}>
            Save
          </Text>
        </Pressable>
      </View>
    ),
    [pillId, confirmDelete, ready, saving, save],
  );

  useLayoutEffect(() => {
    navigation.setOptions({ headerRight: renderActions });
  }, [navigation, renderActions]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.label}>Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        maxLength={60}
        placeholder="Medicine name"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />

      <Text style={styles.label}>Type</Text>
      <View style={styles.chips}>
        {FORMS.map(f => (
          <Chip
            key={f}
            label={FORM_LABELS[f]}
            selected={form === f}
            onPress={() => chooseForm(f)}
          />
        ))}
      </View>

      <Text style={styles.label}>How much each time</Text>
      <AmountStepper form={form} amount={amount} onChange={setAmount} />

      <Text style={styles.label}>When to remind</Text>
      {times.map((t, i) => {
        const label = formatTime(t.hour, t.minute, is24h);
        return (
          <View key={`${t.hour}:${t.minute}`} style={styles.timeRow}>
            <Text style={styles.time}>{label}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => chooseTime(i)}
              style={styles.timeButton}
            >
              <Text style={styles.link}>Change</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${label}`}
              onPress={() => removeTime(i)}
              style={styles.timeButton}
            >
              <Text style={styles.remove}>✕</Text>
            </Pressable>
          </View>
        );
      })}
      {times.length < MAX_TIMES ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => chooseTime()}
          style={styles.addTime}
        >
          <Text style={styles.link}>+ Add a time</Text>
        </Pressable>
      ) : null}

      <Text style={styles.label}>For how long</Text>
      <View style={styles.chips}>
        {PRESETS.map(n => (
          <Chip
            key={n}
            label={`${n} days`}
            selected={duration === n}
            onPress={() => setDuration(n)}
          />
        ))}
        <Chip
          label="Other…"
          selected={duration === 'other'}
          onPress={() => setDuration('other')}
        />
        <Chip
          label="No end"
          selected={duration === 'none'}
          onPress={() => setDuration('none')}
        />
      </View>
      {duration === 'other' ? (
        <TextInput
          value={otherDays}
          onChangeText={setOtherDays}
          accessibilityLabel="Days"
          placeholder="Days"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          maxLength={3}
          style={[styles.input, styles.daysInput]}
        />
      ) : null}

      {pillId ? null : (
        <>
          <Text style={styles.label}>Starts</Text>
          <View style={styles.chips}>
            <Chip
              label="Today"
              selected={!startsTomorrow}
              onPress={() => setStartsTomorrow(false)}
            />
            <Chip
              label="Tomorrow"
              selected={startsTomorrow}
              onPress={() => setStartsTomorrow(true)}
            />
          </View>
        </>
      )}

      {times.length > 0 && days !== undefined ? (
        <Text style={styles.summary}>
          {courseSummary({ startDate: courseStart, days, times, today, is24h })}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.lg * 2 },
  headerButton: {
    fontSize: 16,
    color: colors.primary,
    marginRight: spacing.md,
  },
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
  daysInput: { marginTop: spacing.sm, width: 120 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: { fontSize: 16, color: colors.text },
  chipTextSelected: { color: colors.onPrimary },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  time: { flex: 1, fontSize: 22, color: colors.text },
  timeButton: { padding: spacing.sm },
  link: { fontSize: 16, color: colors.primary },
  remove: { fontSize: 18, color: colors.textMuted },
  addTime: { paddingVertical: spacing.sm },
  summary: { marginTop: spacing.md, fontSize: 15, color: colors.text },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  headerDelete: { fontSize: 16, color: colors.danger },
  headerSave: { fontSize: 17, fontWeight: '600', color: colors.primary },
  disabled: { opacity: 0.4 },
});
