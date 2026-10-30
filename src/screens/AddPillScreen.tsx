import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  Image,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AmountStepper from '../components/AmountStepper';
import { useElder } from '../hooks/useElder';
import { usePickPhoto } from '../hooks/usePickPhoto';
import { useSavePill } from '../hooks/useSavePill';
import { useI18n } from '../i18n';
import { AMOUNT_RULES, FORMS, kindAndAmount } from '../lib/amount';
import type { PillForm } from '../lib/amount';
import { addDays, courseSummary, toISODate } from '../lib/course';
import {
  MAX_TIMES,
  PRESETS,
  QUICK_TIMES,
  addToCount,
  byTime,
  daysOf,
  emptyDraft,
  isCountable,
  sameTime,
  stepReady,
} from '../lib/pillDraft';
import type { PillDraft, Step } from '../lib/pillDraft';
import { formatTime } from '../lib/time';
import { is24HourFormat, pickTime } from '../native/alarms';
import type { DoseTime } from '../native/alarms';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors, font, radius, shadow, spacing, timeTiles } from '../theme';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Chip from '../ui/Chip';
import Icon from '../ui/Icon';
import type { IconName } from '../ui/icons';
import PillPicture from '../ui/PillPicture';
import SkyBand from '../ui/SkyBand';

type Props = NativeStackScreenProps<RootStackParamList, 'AddPill'>;

const TOTAL = 5;
const QUICK_COUNTS = [10, 15, 30];

/** A time on step 3: one of the three ready ones, or another she added (always ticked). */
type Slot = { time: DoseTime; on: boolean };

type Tile = { fill: string; ink: string };

/** The ready times' words, symbols and tiles, in `QUICK_TIMES`'s order. */
const QUICK_LOOK: {
  word: 'morning' | 'afternoon' | 'night';
  icon: IconName;
  tile: Tile;
}[] = [
  { word: 'morning', icon: 'wb_twilight', tile: timeTiles.morning },
  { word: 'afternoon', icon: 'light_mode', tile: timeTiles.afternoon },
  { word: 'night', icon: 'bedtime', tile: timeTiles.evening },
];

/**
 * Adding a pill, one question to a page: its name and photo, its kind and amount, its times,
 * how long, then a look at it all before Save. Back (the button or the phone's) keeps what was
 * entered; close (×), or the phone's Back on the first page, leaves without saving. On a
 * relative's phone the pill is sent to her phone.
 */
export default function AddPillScreen({ navigation, route }: Props) {
  const elderId = route.params?.elderId;
  const { lang, t } = useI18n();
  const { fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const elder = useElder(elderId);
  const [step, setStep] = useState<Step>(1);
  const [draft, setDraft] = useState(emptyDraft);
  // The draft's times are the ticked ones; the ready ones stay here unticked, as changed.
  const [slots, setSlots] = useState<Slot[]>(() =>
    QUICK_TIMES.map(time => ({ time, on: false })),
  );
  const [countOpen, setCountOpen] = useState(false);
  // The keyboard covers the page instead of shrinking it (edge to edge), so Back and Next rise
  // above it while it is open.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
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

  const { save, saving } = useSavePill(elderId, {
    elderName: elder.name,
    onSaved: leave,
  });
  const update = (patch: Partial<PillDraft>) =>
    setDraft(d => ({ ...d, ...patch }));
  const choosePhoto = usePickPhoto(update);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // The phone's Back steps back a page, as Back does; on the first page it leaves.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (step === 1) {
          return false;
        }
        Keyboard.dismiss();
        setStep((step - 1) as Step);
        return true;
      });
      return () => sub.remove();
    }, [step]),
  );

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

  const times = slots
    .filter(s => s.on)
    .map(s => s.time)
    .sort(byTime);
  const pill: PillDraft = { ...draft, times };
  const ready = stepReady(pill, step);
  const timeText = (time: DoseTime) =>
    formatTime(time.hour, time.minute, is24h);

  const goNext = () => {
    if (ready && step < TOTAL) {
      Keyboard.dismiss();
      setStep((step + 1) as Step);
    }
  };

  const goBack = () => {
    Keyboard.dismiss();
    setStep((step - 1) as Step);
  };

  const chooseForm = (next: PillForm) => {
    if (next !== draft.form) {
      update({ form: next, amount: AMOUNT_RULES[next].initial });
    }
  };

  /** Whether [time] is ticked already, leaving slot [except] out. */
  const chosen = (time: DoseTime, except?: number) =>
    slots.some((s, i) => s.on && i !== except && sameTime(s.time, time));

  /** Ticks or unticks slot [i]; an added time goes once unticked. */
  const toggle = (i: number) => {
    const slot = slots[i];
    if (slot.on) {
      setSlots(list =>
        i < QUICK_TIMES.length
          ? list.map((s, j) => (j === i ? { ...s, on: false } : s))
          : list.filter((_, j) => j !== i),
      );
    } else if (chosen(slot.time)) {
      Alert.alert(t.pill.timeTaken);
    } else if (times.length < MAX_TIMES) {
      setSlots(list => list.map((s, j) => (j === i ? { ...s, on: true } : s)));
    } else {
      Alert.alert(t.addPill.maxTimes(MAX_TIMES));
    }
  };

  /** Picks a new time for slot [i]; a time already ticked is refused. */
  const changeTime = async (i: number) => {
    const current = slots[i].time;
    const picked = await pickTime(current.hour, current.minute);
    if (!picked || !mounted.current) {
      return;
    }
    if (chosen(picked, i)) {
      Alert.alert(t.pill.timeTaken);
      return;
    }
    setSlots(list =>
      list.map((s, j) => (j === i ? { ...s, time: picked } : s)),
    );
  };

  /** Adds a time of her own; at one of the ready times it ticks that one instead. */
  const anotherTime = async () => {
    const first = QUICK_TIMES[0];
    const picked = await pickTime(first.hour, first.minute);
    if (!picked || !mounted.current) {
      return;
    }
    if (chosen(picked)) {
      Alert.alert(t.pill.timeTaken);
      return;
    }
    setSlots(list => {
      const at = list.findIndex(s => sameTime(s.time, picked));
      return at >= 0
        ? list.map((s, j) => (j === at ? { ...s, on: true } : s))
        : [...list, { time: picked, on: true }];
    });
  };

  const changeCount = (count: string) => update({ count, countChanged: true });

  const counted = isCountable(draft.form);
  const countLabel =
    draft.form === 'capsule' ? t.pill.capsulesLeft : t.pill.tabletsLeft;
  const days = daysOf(draft.duration, draft.otherDays);
  // Her own times, after the ready three, in time order.
  const added = slots
    .map((slot, i) => ({ slot, i }))
    .slice(QUICK_TIMES.length)
    .sort((a, b) => byTime(a.slot.time, b.slot.time));

  let question = '';
  let body: React.ReactNode = null;
  switch (step) {
    case 1:
      question = t.addPill.nameQuestion;
      body = (
        <>
          <TextInput
            value={draft.name}
            onChangeText={name => update({ name })}
            maxLength={60}
            placeholder={t.pill.namePlaceholder}
            placeholderTextColor={colors.muted}
            autoFocus
            returnKeyType="next"
            onSubmitEditing={goNext}
            style={styles.field}
          />
          {draft.photoUri ? (
            <View style={styles.photoBox}>
              <Image
                testID="pill-photo"
                source={{ uri: draft.photoUri }}
                style={styles.photo}
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => update({ photo: null, photoUri: null })}
                style={({ pressed }) => [
                  styles.link,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.linkText}>{t.pill.removePhoto}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.addPill.addPhoto}
              accessibilityHint={t.addPill.photoNote}
              onPress={() => choosePhoto('camera')}
              style={({ pressed }) => [
                styles.photoBox,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.bubble}>
                <Icon name="photo_camera" size={30} color={colors.blue} />
              </View>
              <Text style={styles.photoTitle}>{t.addPill.addPhoto}</Text>
              <Text style={styles.photoNote}>{t.addPill.photoNote}</Text>
            </Pressable>
          )}
          {/* Side by side, or one under the other once large text needs the room. */}
          <View style={styles.pair}>
            <View style={[styles.half, { flexBasis: 140 * fontScale }]}>
              <Button
                label={t.addPill.camera}
                icon="photo_camera"
                variant="secondary"
                onPress={() => choosePhoto('camera')}
              />
            </View>
            <View style={[styles.half, { flexBasis: 140 * fontScale }]}>
              <Button
                label={t.addPill.gallery}
                icon="image"
                variant="secondary"
                onPress={() => choosePhoto('gallery')}
              />
            </View>
          </View>
        </>
      );
      break;
    case 2:
      question = t.addPill.kindQuestion;
      body = (
        <>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={t.pill.type}
            style={styles.kinds}
          >
            {FORMS.map(form => {
              const on = draft.form === form;
              return (
                <Pressable
                  key={form}
                  accessibilityRole="radio"
                  accessibilityLabel={t.forms[form]}
                  accessibilityState={{ checked: on }}
                  onPress={() => chooseForm(form)}
                  // Two to a row (three would fit 120 dp each on a wide phone, leaving Drops
                  // alone), or one once large text needs the room.
                  style={({ pressed }) => [
                    styles.kind,
                    { flexBasis: '40%', minWidth: 120 * fontScale },
                    on && styles.chosen,
                    pressed && styles.pressed,
                  ]}
                >
                  <PillPicture
                    pill={{ name: draft.name, form, photoUri: null }}
                  />
                  <Text style={styles.kindText}>{t.forms[form]}</Text>
                </Pressable>
              );
            })}
          </View>
          <Card>
            <Text style={styles.label}>{t.addPill.eachTimeLabel}</Text>
            <AmountStepper
              form={draft.form}
              amount={draft.amount}
              onChange={amount => update({ amount })}
            />
          </Card>
        </>
      );
      break;
    case 3:
      question = t.addPill.whenQuestion(draft.name.trim());
      body = (
        <>
          <Text style={styles.note}>
            {elderId && elder.name
              ? t.family.herTime(elder.name)
              : t.addPill.pickSome}
          </Text>
          {QUICK_LOOK.map((look, i) => (
            <TimeCard
              key={look.word}
              icon={look.icon}
              tile={look.tile}
              title={t.addPill[look.word]}
              time={timeText(slots[i].time)}
              on={slots[i].on}
              onToggle={() => toggle(i)}
              onChange={() => changeTime(i)}
            />
          ))}
          {added.map(({ slot, i }) => (
            <TimeCard
              key={`${slot.time.hour}:${slot.time.minute}`}
              icon="schedule"
              title={timeText(slot.time)}
              on={slot.on}
              onToggle={() => toggle(i)}
              onChange={() => changeTime(i)}
            />
          ))}
          {times.length < MAX_TIMES ? (
            <Pressable
              accessibilityRole="button"
              onPress={anotherTime}
              style={({ pressed }) => [
                styles.addRow,
                pressed && styles.pressed,
              ]}
            >
              <Icon name="add" size={20} color={colors.blue} />
              <Text style={styles.addRowText}>{t.addPill.anotherTime}</Text>
            </Pressable>
          ) : null}
        </>
      );
      break;
    case 4:
      question = t.addPill.howLongQuestion;
      body = (
        <>
          <Card style={styles.chips}>
            {PRESETS.map(n => (
              <Chip
                key={n}
                label={t.pill.nDays(n)}
                on={draft.duration === n}
                onPress={() => update({ duration: n })}
              />
            ))}
            <Chip
              label={t.pill.noEnd}
              on={draft.duration === 'none'}
              onPress={() => update({ duration: 'none' })}
            />
            <Chip
              label={t.pill.otherDays}
              on={draft.duration === 'other'}
              onPress={() => update({ duration: 'other' })}
            />
          </Card>
          {draft.duration === 'other' ? (
            <TextInput
              value={draft.otherDays}
              onChangeText={otherDays => update({ otherDays })}
              accessibilityLabel={t.pill.days}
              placeholder={t.pill.days}
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              maxLength={3}
              autoFocus
              style={[styles.field, styles.daysField]}
            />
          ) : null}
          <Text style={styles.label}>{t.pill.starts}</Text>
          <Card style={styles.chips}>
            <Chip
              label={t.pill.startsToday}
              on={!draft.startsTomorrow}
              onPress={() => update({ startsTomorrow: false })}
            />
            <Chip
              label={t.pill.startsTomorrow}
              on={draft.startsTomorrow}
              onPress={() => update({ startsTomorrow: true })}
            />
          </Card>
        </>
      );
      break;
    case 5:
      question = t.addPill.checkQuestion;
      body = (
        <Card style={styles.summary}>
          <View style={styles.head}>
            <View style={styles.pillTile}>
              <PillPicture key={draft.photoUri ?? ''} pill={pill} size={40} />
            </View>
            <View style={styles.grow}>
              <Text style={styles.name}>{draft.name.trim()}</Text>
              <Text style={styles.sub}>
                {kindAndAmount(draft.form, draft.amount, t, lang)}
              </Text>
            </View>
          </View>
          <SummaryRow
            icon="schedule"
            title={t.addPill.joinTimes(times.map(timeText))}
          />
          {days !== undefined ? (
            <SummaryRow
              icon="event"
              title={days === null ? t.pill.noEnd : t.pill.nDays(days)}
              note={courseSummary({
                startDate: draft.startsTomorrow ? addDays(today, 1) : today,
                days,
                times,
                today,
                is24h,
                t,
              })}
            />
          ) : null}
          {counted ? (
            <SummaryRow
              icon="inventory_2"
              title={countLabel}
              note={countOpen ? undefined : t.addPill.optional}
              end={
                countOpen ? null : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityHint={countLabel}
                    onPress={() => setCountOpen(true)}
                    style={({ pressed }) => [
                      styles.addCount,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.addCountText}>
                      {t.addPill.addCount}
                    </Text>
                  </Pressable>
                )
              }
            />
          ) : null}
          {counted && countOpen ? (
            <View style={styles.count}>
              {/* At a large text size the + buttons wrap under the field. */}
              <View style={styles.countRow}>
                <TextInput
                  value={draft.count}
                  onChangeText={changeCount}
                  accessibilityLabel={countLabel}
                  autoFocus
                  keyboardType="decimal-pad"
                  maxLength={5}
                  style={[
                    styles.field,
                    styles.countField,
                    !ready && styles.invalid,
                  ]}
                />
                {QUICK_COUNTS.map(n => (
                  <Chip
                    key={n}
                    label={`+${n}`}
                    onPress={() => changeCount(addToCount(draft.count, n))}
                  />
                ))}
              </View>
              <Text style={styles.note}>{t.pill.countNote}</Text>
            </View>
          ) : null}
        </Card>
      );
      break;
  }

  return (
    <View style={styles.page}>
      <SkyBand
        title={elderId && elder.name ? t.addPill.titleFor(elder.name) : ''}
        onClose={leave}
        progress={{ step, total: TOTAL }}
      />
      {/* A new step starts at its top. */}
      <ScrollView
        key={step}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text accessibilityRole="header" style={styles.question}>
          {question}
        </Text>
        {body}
      </ScrollView>
      <View
        testID="add-pill-foot"
        style={[
          styles.foot,
          { paddingBottom: spacing.md + insets.bottom + keyboardHeight },
        ]}
      >
        <View style={styles.footButton}>
          <Button
            label={t.common.back}
            variant="secondary"
            disabled={step === 1}
            onPress={goBack}
          />
        </View>
        <View style={styles.footButton}>
          {step < TOTAL ? (
            <Button label={t.common.next} disabled={!ready} onPress={goNext} />
          ) : (
            <Button
              label={t.common.save}
              icon="check"
              variant="green"
              disabled={!ready || saving}
              onPress={() => save(pill)}
            />
          )}
        </View>
      </View>
    </View>
  );
}

type TimeCardProps = {
  icon: IconName;
  /** The part of the day's colours; soft grey for a time of her own. */
  tile?: Tile;
  title: string;
  /** Under the title; a time of her own is its own title. */
  time?: string;
  on: boolean;
  onToggle: () => void;
  onChange: () => void;
};

/**
 * A time to tick, and once ticked, to change. Tapping anywhere on it ticks it; for TalkBack the
 * tick and Change are two controls of their own, since a button inside a button can't be reached.
 */
function TimeCard({
  icon,
  tile,
  title,
  time,
  on,
  onToggle,
  onChange,
}: TimeCardProps) {
  const { t } = useI18n();
  const { fontScale } = useWindowDimensions();
  return (
    <Pressable
      accessible={false}
      focusable={false}
      importantForAccessibility="no"
      onPress={onToggle}
      style={({ pressed }) => [
        styles.pick,
        on && styles.chosen,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[styles.tile, tile != null && { backgroundColor: tile.fill }]}
      >
        <Icon name={icon} size={22} color={tile?.ink ?? colors.blue} />
      </View>
      {/* Change sits beside the words, or under them once they need the room. */}
      <View style={styles.middle}>
        <View style={[styles.words, { flexBasis: 110 * fontScale }]}>
          <Text style={styles.pickTitle}>{title}</Text>
          {time ? <Text style={styles.pickTime}>{time}</Text> : null}
        </View>
        {on ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.addPill.changeTime(time ?? title)}
            onPress={onChange}
            style={({ pressed }) => [styles.change, pressed && styles.pressed]}
          >
            <Text style={styles.changeText}>{t.pill.change}</Text>
          </Pressable>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={time ? `${title}, ${time}` : title}
        accessibilityState={{ checked: on }}
        hitSlop={10}
        onPress={onToggle}
        style={[styles.tick, on && styles.tickOn]}
      >
        {on ? <Icon name="check" size={18} color={colors.onFill} /> : null}
      </Pressable>
    </Pressable>
  );
}

type SummaryRowProps = {
  icon: IconName;
  title: string;
  note?: string;
  end?: React.ReactNode;
};

/** A line of the last step's card: a symbol, the words, and what may follow them. */
function SummaryRow({ icon, title, note, end }: SummaryRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.tile}>
        <Icon name={icon} size={22} color={colors.blue} />
      </View>
      <View style={styles.grow}>
        <Text style={styles.rowTitle}>{title}</Text>
        {note ? <Text style={styles.rowNote}>{note}</Text> : null}
      </View>
      {end}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.page },
  content: { padding: spacing.md, paddingBottom: spacing.lg, gap: 12 },
  question: {
    ...font(900),
    fontSize: 23,
    lineHeight: 28,
    letterSpacing: -0.3,
    color: colors.navy,
    marginTop: 4,
  },
  note: { ...font(600), fontSize: 15, lineHeight: 21, color: colors.muted },
  label: {
    ...font(900),
    fontSize: 13,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.blue,
    marginBottom: 10,
  },
  field: {
    ...font(800),
    minHeight: 56,
    borderWidth: 2.5,
    borderColor: colors.blue,
    borderRadius: 16,
    paddingHorizontal: 14,
    fontSize: 19,
    color: colors.navy,
    backgroundColor: colors.card,
  },
  invalid: { borderColor: colors.coralText },
  pressed: { opacity: 0.8 },
  // Step 1
  photoBox: {
    borderWidth: 2.5,
    borderStyle: 'dashed',
    borderColor: colors.edge,
    borderRadius: radius.card,
    padding: 18,
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
  },
  bubble: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.blueTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoTitle: {
    ...font(900),
    fontSize: 16,
    color: colors.blue,
    textAlign: 'center',
  },
  photoNote: {
    ...font(700),
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
  photo: { width: 160, height: 120, borderRadius: 16 },
  link: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 12 },
  linkText: { ...font(800), fontSize: 16, color: colors.blue },
  pair: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  half: { flexGrow: 1 },
  // Step 2
  kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  kind: {
    flexGrow: 1,
    minHeight: 48,
    borderRadius: radius.button,
    borderWidth: 2.5,
    borderColor: 'transparent',
    paddingHorizontal: 10,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    boxShadow: shadow.card,
  },
  chosen: { borderColor: colors.blue },
  kindText: {
    ...font(900),
    fontSize: 16,
    color: colors.navy,
    textAlign: 'center',
  },
  // Step 3
  pick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 11,
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: 'transparent',
    backgroundColor: colors.card,
    boxShadow: shadow.card,
  },
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
    columnGap: 10,
    rowGap: spacing.xs,
  },
  words: { flexGrow: 1, flexShrink: 1 },
  pickTitle: { ...font(900), fontSize: 17, color: colors.navy },
  pickTime: { ...font(700), fontSize: 15, color: colors.muted, marginTop: 1 },
  change: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.blueTint,
  },
  changeText: { ...font(900), fontSize: 15, color: colors.blueText },
  tick: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: colors.edge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  addRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 11,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.edge,
    borderRadius: 16,
  },
  addRowText: { ...font(900), fontSize: 16, color: colors.blue, flexShrink: 1 },
  // Step 4
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  daysField: { width: 140 },
  // Step 5
  summary: { paddingVertical: 12, paddingHorizontal: 14, gap: 2 },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: spacing.sm,
  },
  pillTile: {
    width: 56,
    height: 56,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.soft,
  },
  grow: { flex: 1 },
  name: { ...font(900), fontSize: 21, color: colors.navy },
  sub: { ...font(700), fontSize: 15, color: colors.muted, marginTop: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  rowTitle: { ...font(800), fontSize: 16, color: colors.navy },
  rowNote: { ...font(600), fontSize: 14, color: colors.muted, marginTop: 2 },
  addCount: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.blueTint,
  },
  addCountText: { ...font(900), fontSize: 15, color: colors.blueText },
  count: { gap: spacing.sm, paddingBottom: spacing.sm },
  countRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  countField: { minWidth: 100 },
  // Back and Next stay on screen below the page, whatever its length.
  foot: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    backgroundColor: colors.page,
  },
  footButton: { flex: 1 },
});
