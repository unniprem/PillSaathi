import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Image,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { LayoutChangeEvent, ScrollViewInstance } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import AmountStepper from '../components/AmountStepper';
import { AMOUNT_RULES, FORMS } from '../lib/amount';
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
  pickPhoto,
  pickTime,
  savePill,
} from '../native/alarms';
import type { DoseTime } from '../native/alarms';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useI18n } from '../i18n';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'PillEdit'>;

/** A preset number of days, "Other…" (typed), or "No end". Nothing is chosen for a new pill. */
type Duration = 5 | 7 | 10 | 20 | 'other' | 'none';

const PRESETS: (5 | 7 | 10 | 20)[] = [5, 7, 10, 20];
const MAX_TIMES = 6;
const MAX_DAYS = 365;
const FIRST_TIME: DoseTime = { hour: 8, minute: 0 };
const QUICK_COUNTS = [10, 15, 30];
/** Tablets left: up to 999, in halves. Empty means not counted. */
const COUNT = /^\d{1,3}(\.[05])?$/;

const sameTime = (a: DoseTime, b: DoseTime) =>
  a.hour === b.hour && a.minute === b.minute;
const byTime = (a: DoseTime, b: DoseTime) =>
  a.hour - b.hour || a.minute - b.minute;

/** Only tablets and capsules are counted. */
const isCountable = (form: PillForm) => form === 'tablet' || form === 'capsule';

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
  const focusCount = route.params?.focusCount ?? false;
  const { t } = useI18n();
  // For the load, which must not run again (and undo edits) when the language changes.
  const words = useRef(t);
  words.current = t;
  const [name, setName] = useState('');
  const [form, setForm] = useState<PillForm>('tablet');
  const [amount, setAmount] = useState(AMOUNT_RULES.tablet.initial);
  const [times, setTimes] = useState<DoseTime[]>([]);
  const [duration, setDuration] = useState<Duration | null>(null);
  const [otherDays, setOtherDays] = useState('');
  const [startsTomorrow, setStartsTomorrow] = useState(false);
  // An edit keeps the pill's start date; it is known once the pill has loaded.
  const [startDate, setStartDate] = useState<string | null>(null);
  // The photo's file name; saving without it would delete the pill's photo.
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  // Tablets left as typed; empty means not counted. Sent as changed only once touched, so a count
  // a Taken lowered while the page was open isn't put back.
  const [count, setCount] = useState('');
  const [countChanged, setCountChanged] = useState(false);
  const picking = useRef(false);
  // Opened from the running-low banner: keep the count in view above the keyboard while the page
  // settles, until the page is scrolled by hand.
  const scroll = useRef<ScrollViewInstance>(null);
  const countY = useRef<number | null>(null);
  const followCount = useRef(focusCount);
  // The keyboard covers the page instead of shrinking it (edge to edge), so the page adds this
  // much room below itself while it is open, and its lower fields can scroll above it.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
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

  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', e =>
      setKeyboardHeight(e.endCoordinates.height),
    );
    const hidden = Keyboard.addListener('keyboardDidHide', () =>
      setKeyboardHeight(0),
    );
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  const renderCancel = useCallback(
    () => (
      <Pressable accessibilityRole="button" onPress={leave}>
        <Text style={styles.headerButton}>{t.common.cancel}</Text>
      </Pressable>
    ),
    [leave, t],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: pillId ? t.pill.editTitle : t.pill.addTitle,
      headerLeft: renderCancel,
    });
  }, [navigation, pillId, renderCancel, t]);

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
        setPhoto(pill.photo);
        setPhotoUri(pill.photoUri);
        setCount(pill.remaining === null ? '' : String(pill.remaining));
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
          Alert.alert(words.current.pill.loadFailed);
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
    if (times.some((time, i) => i !== index && sameTime(time, picked))) {
      Alert.alert(t.pill.timeTaken);
      return;
    }
    const next =
      index === undefined
        ? [...times, picked]
        : times.map((time, i) => (i === index ? picked : time));
    setTimes(next.sort(byTime));
  };

  const removeTime = (index: number) =>
    setTimes(list => list.filter((_, i) => i !== index));

  /** A new photo from the camera or gallery; a cancelled pick keeps the one there is. */
  const choosePhoto = async (source: 'camera' | 'gallery') => {
    if (picking.current) {
      return;
    }
    picking.current = true;
    try {
      const picked = await pickPhoto(source);
      if (picked && mounted.current) {
        setPhoto(picked.name);
        setPhotoUri(picked.uri);
      }
    } catch (e) {
      console.warn('Could not add the photo', e);
      if (mounted.current) {
        Alert.alert(t.pill.photoFailed);
      }
    } finally {
      picking.current = false;
    }
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoUri(null);
  };

  // A frame later: Android ignores a scroll made while the page is still taking its new size.
  const scrollToCount = useCallback(() => {
    requestAnimationFrame(() => {
      if (followCount.current && loaded && countY.current !== null) {
        scroll.current?.scrollTo({ y: countY.current, animated: false });
      }
    });
  }, [loaded]);

  useEffect(scrollToCount, [scrollToCount]);

  const onCountLayout = (e: LayoutChangeEvent) => {
    countY.current = e.nativeEvent.layout.y;
    scrollToCount();
  };

  const changeCount = (text: string) => {
    setCount(text);
    setCountChanged(true);
  };

  /** Adds [n] to the count; an empty field counts as 0. */
  const addToCount = (n: number) =>
    changeCount(String((COUNT.test(count) ? Number(count) : 0) + n));

  const counted = isCountable(form);
  const countValid = !counted || count === '' || COUNT.test(count);
  const remaining = counted && count !== '' ? Number(count) : null;

  const days = daysOf(duration, otherDays);
  const ready =
    loaded &&
    name.trim() !== '' &&
    times.length > 0 &&
    days !== undefined &&
    countValid;
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
        photo,
        remaining,
        remainingChanged: countChanged,
      });
    } catch (e) {
      console.warn('Could not save the pill', e);
      if (mounted.current) {
        Alert.alert(t.pill.saveFailed, t.common.tryAgain);
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
        t.pill.exactAlarmTitle,
        t.pill.exactAlarmBody,
        [
          { text: t.pill.notNow, style: 'cancel', onPress: () => finish() },
          {
            text: t.pill.allow,
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
    photo,
    remaining,
    countChanged,
    finish,
    t,
  ]);

  const confirmDelete = useCallback(() => {
    if (!pillId) {
      return;
    }
    Alert.alert(t.pill.deleteConfirm, undefined, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePill(pillId);
            leave();
          } catch (e) {
            console.warn('Could not delete the pill', e);
            if (mounted.current) {
              Alert.alert(t.pill.deleteFailed, t.common.tryAgain);
            }
          }
        },
      },
    ]);
  }, [pillId, leave, t]);

  const renderActions = useCallback(
    () => (
      <View style={styles.headerActions}>
        {pillId ? (
          <Pressable
            accessibilityRole="button"
            onPress={confirmDelete}
            hitSlop={spacing.sm}
          >
            <Text style={styles.headerDelete}>{t.common.delete}</Text>
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
            {t.common.save}
          </Text>
        </Pressable>
      </View>
    ),
    [pillId, confirmDelete, ready, saving, save, t],
  );

  useLayoutEffect(() => {
    navigation.setOptions({ headerRight: renderActions });
  }, [navigation, renderActions]);

  return (
    <ScrollView
      ref={scroll}
      testID="pill-page"
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: styles.content.paddingBottom + keyboardHeight },
      ]}
      keyboardShouldPersistTaps="handled"
      onContentSizeChange={scrollToCount}
      onScrollBeginDrag={() => {
        followCount.current = false;
      }}
    >
      <Text style={styles.label}>{t.pill.name}</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        maxLength={60}
        placeholder={t.pill.namePlaceholder}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />

      <Text style={styles.label}>{t.pill.photo}</Text>
      <View style={styles.photoRow}>
        {photoUri ? (
          <Image
            testID="pill-photo"
            source={{ uri: photoUri }}
            style={styles.photo}
          />
        ) : null}
        <View style={styles.photoButtons}>
          <Pressable
            accessibilityRole="button"
            onPress={() => choosePhoto('camera')}
            style={styles.photoButton}
          >
            <Text style={styles.link}>
              {photoUri ? t.pill.retake : t.pill.takePhoto}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => choosePhoto('gallery')}
            style={styles.photoButton}
          >
            <Text style={styles.link}>{t.pill.chooseGallery}</Text>
          </Pressable>
          {photoUri ? (
            <Pressable
              accessibilityRole="button"
              onPress={removePhoto}
              style={styles.photoButton}
            >
              <Text style={styles.link}>{t.pill.removePhoto}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <Text style={styles.label}>{t.pill.type}</Text>
      <View style={styles.chips}>
        {FORMS.map(f => (
          <Chip
            key={f}
            label={t.forms[f]}
            selected={form === f}
            onPress={() => chooseForm(f)}
          />
        ))}
      </View>

      <Text style={styles.label}>{t.pill.howMuch}</Text>
      <AmountStepper form={form} amount={amount} onChange={setAmount} />

      {counted ? (
        <View testID="count-section" onLayout={onCountLayout}>
          <Text style={styles.label}>
            {form === 'capsule' ? t.pill.capsulesLeft : t.pill.tabletsLeft}
          </Text>
          <View style={styles.countRow}>
            <TextInput
              value={count}
              onChangeText={changeCount}
              accessibilityLabel={
                form === 'capsule' ? t.pill.capsulesLeft : t.pill.tabletsLeft
              }
              autoFocus={focusCount}
              keyboardType="decimal-pad"
              maxLength={5}
              style={[
                styles.input,
                styles.countInput,
                !countValid && styles.invalid,
              ]}
            />
            {QUICK_COUNTS.map(n => (
              <Pressable
                key={n}
                accessibilityRole="button"
                onPress={() => addToCount(n)}
                style={styles.chip}
              >
                <Text style={styles.chipText}>{`+${n}`}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.note}>{t.pill.countNote}</Text>
        </View>
      ) : null}

      <Text style={styles.label}>{t.pill.when}</Text>
      {times.map((time, i) => {
        const label = formatTime(time.hour, time.minute, is24h);
        return (
          <View key={`${time.hour}:${time.minute}`} style={styles.timeRow}>
            <Text style={styles.time}>{label}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => chooseTime(i)}
              style={styles.timeButton}
            >
              <Text style={styles.link}>{t.pill.change}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.pill.removeTime(label)}
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
          <Text style={styles.link}>{t.pill.addTime}</Text>
        </Pressable>
      ) : null}

      <Text style={styles.label}>{t.pill.howLong}</Text>
      <View style={styles.chips}>
        {PRESETS.map(n => (
          <Chip
            key={n}
            label={t.pill.nDays(n)}
            selected={duration === n}
            onPress={() => setDuration(n)}
          />
        ))}
        <Chip
          label={t.pill.otherDays}
          selected={duration === 'other'}
          onPress={() => setDuration('other')}
        />
        <Chip
          label={t.pill.noEnd}
          selected={duration === 'none'}
          onPress={() => setDuration('none')}
        />
      </View>
      {duration === 'other' ? (
        <TextInput
          value={otherDays}
          onChangeText={setOtherDays}
          accessibilityLabel={t.pill.days}
          placeholder={t.pill.days}
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          maxLength={3}
          style={[styles.input, styles.daysInput]}
        />
      ) : null}

      {pillId ? null : (
        <>
          <Text style={styles.label}>{t.pill.starts}</Text>
          <View style={styles.chips}>
            <Chip
              label={t.pill.startsToday}
              selected={!startsTomorrow}
              onPress={() => setStartsTomorrow(false)}
            />
            <Chip
              label={t.pill.startsTomorrow}
              selected={startsTomorrow}
              onPress={() => setStartsTomorrow(true)}
            />
          </View>
        </>
      )}

      {times.length > 0 && days !== undefined ? (
        <Text style={styles.summary}>
          {courseSummary({
            startDate: courseStart,
            days,
            times,
            today,
            is24h,
            t,
          })}
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
  // At a large text size the + buttons wrap under the field rather than being cut off.
  countRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  countInput: { minWidth: 100 },
  invalid: { borderColor: colors.danger },
  note: { marginTop: spacing.sm, fontSize: 14, color: colors.textMuted },
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
  photoRow: { flexDirection: 'row', alignItems: 'center' },
  photo: { width: 72, height: 72, borderRadius: 12, marginRight: spacing.md },
  photoButtons: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' },
  photoButton: { paddingVertical: spacing.sm, paddingRight: spacing.md },
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
