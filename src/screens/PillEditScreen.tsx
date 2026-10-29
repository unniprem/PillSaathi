import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { useElder } from '../hooks/useElder';
import { usePickPhoto } from '../hooks/usePickPhoto';
import { useSavePill } from '../hooks/useSavePill';
import { AMOUNT_RULES, FORMS } from '../lib/amount';
import type { PillForm } from '../lib/amount';
import { courseSummary, toISODate } from '../lib/course';
import {
  MAX_TIMES,
  PRESETS,
  QUICK_TIMES,
  addToCount,
  byTime,
  daysOf,
  draftFromPill,
  draftReady,
  emptyDraft,
  isCountable,
  sameTime,
  stepReady,
} from '../lib/pillDraft';
import type { PillDraft } from '../lib/pillDraft';
import { formatTime } from '../lib/time';
import {
  deletePill,
  is24HourFormat,
  listPills,
  pickTime,
} from '../native/alarms';
import type { Pill } from '../native/alarms';
import { getElderSetup, sendDeletePill } from '../native/family';
import { familyMessage } from '../lib/family';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useI18n } from '../i18n';
import { colors, radius, spacing } from '../theme';
import SkyBand from '../ui/SkyBand';

type Props = NativeStackScreenProps<RootStackParamList, 'PillEdit'>;

const QUICK_COUNTS = [10, 15, 30];

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

/** Her pills, as this phone last read them, shaped like this phone's own. */
async function herPills(elderId: string): Promise<Pill[]> {
  const setup = await getElderSetup(elderId);
  return setup.pills.map(p => ({ ...p, form: p.form as PillForm }));
}

export default function PillEditScreen({ navigation, route }: Props) {
  const pillId = route.params.pillId;
  // On a relative's phone: her pill, whose Save and Delete are sent to her phone.
  const elderId = route.params.elderId;
  // Her times are on her clock; said so when she lives in another zone.
  const { name: elderName, otherZone } = useElder(elderId);
  const focusCount = route.params.focusCount ?? false;
  const { t } = useI18n();
  // For the load, which must not run again (and undo edits) when the language changes.
  const words = useRef(t);
  words.current = t;
  // The pill as it is being changed; its start date and photo are known once it has loaded.
  const [draft, setDraft] = useState<PillDraft>(emptyDraft);
  const update = (patch: Partial<PillDraft>) =>
    setDraft(d => ({ ...d, ...patch }));
  const { name, form, amount, times, duration, otherDays, startDate } = draft;
  const { photoUri, count } = draft;
  // Opened from the running-low banner: keep the count in view above the keyboard while the page
  // settles, until the page is scrolled by hand.
  const scroll = useRef<ScrollViewInstance>(null);
  const countY = useRef<number | null>(null);
  const followCount = useRef(focusCount);
  // The keyboard covers the page instead of shrinking it (edge to edge), so the page adds this
  // much room below itself while it is open, and its lower fields can scroll above it.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  // Save waits for the pill, or it would overwrite it with an empty one.
  const [loaded, setLoaded] = useState(false);
  const [is24h] = useState(() => is24HourFormat());
  const [today] = useState(() => toISODate(new Date()));
  const mounted = useRef(true);

  // Leaves the page; it is never the only screen in the real app.
  const leave = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace('Main');
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

  const { save, saving } = useSavePill(elderId, {
    elderName,
    onSaved: leave,
  });
  const choosePhoto = usePickPhoto(update);

  useEffect(() => {
    (elderId ? herPills(elderId) : listPills())
      .then(list => {
        const pill = list.find(p => p.id === pillId);
        if (!mounted.current) {
          return;
        }
        if (!pill) {
          leave();
          return;
        }
        setDraft(draftFromPill(pill));
        setLoaded(true);
      })
      .catch(e => {
        console.warn('Could not load the pill', e);
        if (mounted.current) {
          Alert.alert(words.current.pill.loadFailed);
          leave();
        }
      });
  }, [pillId, elderId, leave]);

  const chooseForm = (next: PillForm) => {
    if (next !== form) {
      update({ form: next, amount: AMOUNT_RULES[next].initial });
    }
  };

  /** Picks a time for slot [index], or a new one; a time already on the pill is refused. */
  const chooseTime = async (index?: number) => {
    const current = index === undefined ? QUICK_TIMES[0] : times[index];
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
    update({ times: next.sort(byTime) });
  };

  const removeTime = (index: number) =>
    setDraft(d => ({ ...d, times: d.times.filter((_, i) => i !== index) }));

  const removePhoto = () => update({ photo: null, photoUri: null });

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

  const changeCount = (text: string) =>
    update({ count: text, countChanged: true });

  const counted = isCountable(form);
  const countValid = stepReady(draft, 5);

  const days = daysOf(duration, otherDays);
  const ready = loaded && draftReady(draft);
  const courseStart = startDate ?? today;

  const confirmDelete = useCallback(() => {
    Alert.alert(t.pill.deleteConfirm, undefined, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: async () => {
          try {
            if (elderId) {
              await sendDeletePill(elderId, pillId);
            } else {
              await deletePill(pillId);
            }
            leave();
          } catch (e) {
            console.warn('Could not delete the pill', e);
            if (mounted.current) {
              Alert.alert(
                elderId ? familyMessage(e, t) : t.pill.deleteFailed,
                elderId ? undefined : t.common.tryAgain,
              );
            }
          }
        },
      },
    ]);
  }, [pillId, elderId, leave, t]);

  const actions = (
    <View style={styles.headerActions}>
      <Pressable
        accessibilityRole="button"
        onPress={confirmDelete}
        hitSlop={spacing.sm}
      >
        <Text style={styles.headerDelete}>{t.common.delete}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !ready || saving }}
        onPress={() => save(draft)}
        disabled={!ready || saving}
        hitSlop={spacing.sm}
      >
        <Text style={[styles.headerSave, !ready && styles.disabled]}>
          {t.common.save}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <SkyBand
        title={elderId ? t.remote.pillTitle(elderName) : t.pill.editTitle}
        onClose={leave}
        right={actions}
      />
      <ScrollView
        ref={scroll}
        testID="pill-page"
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
          onChangeText={text => update({ name: text })}
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
        <AmountStepper
          form={form}
          amount={amount}
          onChange={next => update({ amount: next })}
        />

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
                  onPress={() => changeCount(addToCount(count, n))}
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
        {elderId && otherZone ? (
          <Text style={styles.hint}>{t.family.herTime(elderName)}</Text>
        ) : null}

        <Text style={styles.label}>{t.pill.howLong}</Text>
        <View style={styles.chips}>
          {PRESETS.map(n => (
            <Chip
              key={n}
              label={t.pill.nDays(n)}
              selected={duration === n}
              onPress={() => update({ duration: n })}
            />
          ))}
          <Chip
            label={t.pill.otherDays}
            selected={duration === 'other'}
            onPress={() => update({ duration: 'other' })}
          />
          <Chip
            label={t.pill.noEnd}
            selected={duration === 'none'}
            onPress={() => update({ duration: 'none' })}
          />
        </View>
        {duration === 'other' ? (
          <TextInput
            value={otherDays}
            onChangeText={text => update({ otherDays: text })}
            accessibilityLabel={t.pill.days}
            placeholder={t.pill.days}
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            maxLength={3}
            style={[styles.input, styles.daysInput]}
          />
        ) : null}

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.lg * 2 },
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
  hint: { fontSize: 16, color: colors.textMuted, marginTop: spacing.sm },
  remove: { fontSize: 18, color: colors.textMuted },
  addTime: { paddingVertical: spacing.sm },
  photoRow: { flexDirection: 'row', alignItems: 'center' },
  photo: { width: 72, height: 72, borderRadius: 12, marginRight: spacing.md },
  photoButtons: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' },
  photoButton: { paddingVertical: spacing.sm, paddingRight: spacing.md },
  summary: { marginTop: spacing.md, fontSize: 15, color: colors.text },
  // On a white pill, so the words read on every sky, the night's too.
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
  },
  headerDelete: { fontSize: 16, color: colors.danger },
  headerSave: { fontSize: 17, fontWeight: '600', color: colors.primary },
  disabled: { opacity: 0.4 },
});
