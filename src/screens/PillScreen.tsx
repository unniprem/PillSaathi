import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
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
import BasicsSheet from '../components/pill/BasicsSheet';
import CountSheet from '../components/pill/CountSheet';
import DurationSheet from '../components/pill/DurationSheet';
import PhotoSheet from '../components/pill/PhotoSheet';
import SoundTimesSheet from '../components/pill/SoundTimesSheet';
import type { TimeSound } from '../components/pill/SoundTimesSheet';
import TimesSheet from '../components/pill/TimesSheet';
import { usePickPhoto } from '../hooks/usePickPhoto';
import { useSavePill } from '../hooks/useSavePill';
import { useI18n } from '../i18n';
import { formatAmount, kindAndAmount } from '../lib/amount';
import type { PillForm } from '../lib/amount';
import { courseLabel, toISODate } from '../lib/course';
import { errorCode, familyMessage } from '../lib/family';
import {
  byTime,
  draftFromPill,
  emptyDraft,
  isCountable,
  sameTime,
} from '../lib/pillDraft';
import type { PillDraft } from '../lib/pillDraft';
import { changeTitle, waitingByPill } from '../lib/remote';
import { formatTime } from '../lib/time';
import {
  deletePill,
  getToday,
  is24HourFormat,
  listPills,
} from '../native/alarms';
import type { Pill, Refill } from '../native/alarms';
import {
  cancelChange,
  FamilyErrors,
  getElderSetup,
  getFamily,
  listChanges,
  sendDeletePill,
} from '../native/family';
import type { ChangeView } from '../native/family';
import { listSounds } from '../native/sounds';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors, font, radius, shadow, spacing } from '../theme';
import Card from '../ui/Card';
import Icon from '../ui/Icon';
import type { IconName } from '../ui/icons';
import PillPicture from '../ui/PillPicture';
import SkyBand, { RoundButton } from '../ui/SkyBand';
import { skyFor, skyInk } from '../ui/sky';

type Props = NativeStackScreenProps<RootStackParamList, 'Pill'>;

type SheetName = 'basics' | 'times' | 'sounds' | 'duration' | 'count' | 'photo';

/** The pill as its phone has it, and what the summary says about it. */
type Loaded = {
  pill: Pill;
  /** Its times in order, each with its sound. */
  times: TimeSound[];
  refill: Refill | null;
  /** On a relative's phone: what he calls her. */
  name: string;
  /** On a relative's phone: a change to this pill still waiting for her phone. */
  waiting: ChangeView | null;
};

/** Her pill on her phone, with each time's card and sound, or null when it is gone. */
async function loadMine(pillId: string): Promise<Loaded | null> {
  const [pills, today, saved] = await Promise.all([
    listPills(),
    // Without these the pill still shows, with the default tone and no refill.
    getToday().catch(e => {
      console.warn("Could not load today's cards", e);
      return null;
    }),
    listSounds().catch(e => {
      console.warn('Could not load sounds', e);
      return [];
    }),
  ]);
  const pill = pills.find(p => p.id === pillId);
  if (!pill) {
    return null;
  }
  return {
    pill,
    times: [...pill.times].sort(byTime).map(time => {
      const card = today?.cards.find(c => sameTime(c, time));
      const soundId = card?.soundId ?? null;
      return {
        hour: time.hour,
        minute: time.minute,
        soundId,
        soundName: saved.find(s => s.id === soundId)?.name ?? null,
        alarmId: card?.alarmId ?? null,
        settable: card?.alarmId != null,
      };
    }),
    refill: today?.refills.find(r => r.pillId === pillId) ?? null,
    name: '',
    waiting: null,
  };
}

/** Her pill as the relative's phone last read it, with any change still waiting for her phone. */
async function loadHers(
  elderId: string,
  pillId: string,
): Promise<Loaded | null> {
  const [cards, setup, changes] = await Promise.all([
    getFamily(),
    getElderSetup(elderId),
    listChanges(elderId).catch(e => {
      console.warn("Could not load her pills' changes", e);
      return [];
    }),
  ]);
  const found = setup.pills.find(p => p.id === pillId);
  if (!found) {
    return null;
  }
  const pill: Pill = { ...found, form: found.form as PillForm };
  const card = cards.find(c => c.elderId === elderId);
  return {
    pill,
    times: [...pill.times].sort(byTime).map(time => {
      const at = setup.times.find(s => sameTime(s, time));
      return {
        hour: time.hour,
        minute: time.minute,
        soundId: at?.soundId ?? null,
        soundName: at?.soundName ?? null,
        alarmId: null,
        settable: true,
      };
    }),
    refill: card?.refills.find(r => r.pillId === pillId) ?? null,
    name: card?.name ?? '',
    waiting: waitingByPill(changes).get(pillId) ?? null,
  };
}

/**
 * A pill at a glance: its picture and name on the sky, then one line for each part of it (its
 * times, their sounds, how long, and tablets left). Each line opens a sheet that changes just
 * that part and saves the whole pill at once. On a relative's phone each Save is sent to her
 * phone, and a change still waiting there shows at the top, with Cancel.
 */
export default function PillScreen({ navigation, route }: Props) {
  const { pillId, elderId } = route.params;
  const { lang, t } = useI18n();
  // For the load, which must not run again when the language changes.
  const words = useRef(t);
  words.current = t;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [open, setOpen] = useState<SheetName | null>(null);
  // Opened from the running-low card: Tablets left opens, ready to type.
  const askCount = useRef(route.params.focusCount ?? false);
  const [countFocus, setCountFocus] = useState(false);
  const [is24h] = useState(() => is24HourFormat());
  const [today] = useState(() => toISODate(new Date()));
  const mounted = useRef(true);
  // Once the pill has shown, a later read that fails leaves it as it was.
  const shown = useRef(false);
  const draft = useMemo<PillDraft>(
    () => (loaded ? draftFromPill(loaded.pill) : emptyDraft()),
    [loaded],
  );
  const name = loaded?.name ?? '';

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Leaves the page; it is never the only screen in the real app.
  const leave = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace('Main');
    }
  }, [navigation]);

  const load = useCallback(async () => {
    try {
      const next = await (elderId
        ? loadHers(elderId, pillId)
        : loadMine(pillId));
      if (!mounted.current) {
        return;
      }
      if (!next) {
        leave();
        return;
      }
      shown.current = true;
      setLoaded(next);
      if (askCount.current) {
        askCount.current = false;
        if (isCountable(next.pill.form)) {
          setCountFocus(true);
          setOpen('count');
        }
      }
    } catch (e) {
      console.warn('Could not load the pill', e);
      if (mounted.current && !shown.current) {
        Alert.alert(words.current.pill.loadFailed);
        leave();
      }
    }
  }, [pillId, elderId, leave]);

  // Again on coming back, as from the sound list, which changes a time's sound.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const close = () => {
    setOpen(null);
    setCountFocus(false);
  };

  const { save, saving } = useSavePill(elderId, {
    elderName: name,
    onSaved: () => {
      close();
      load();
    },
  });
  const choosePhoto = usePickPhoto(picked => save({ ...draft, ...picked }));

  // The sheet closes first, so coming back from the camera shows the summary.
  const pickPhoto = (source: 'camera' | 'gallery') => {
    close();
    choosePhoto(source);
  };

  const removePhoto = () => {
    close();
    save({ ...draft, photo: null, photoUri: null });
  };

  const openSound = (time: TimeSound) => {
    // A sheet stays above a page pushed over it.
    close();
    navigation.navigate(
      'SoundPicker',
      elderId
        ? {
            elderId,
            hour: time.hour,
            minute: time.minute,
            selectedSoundId: time.soundId,
          }
        : { alarmId: time.alarmId ?? undefined, selectedSoundId: time.soundId },
    );
  };

  const confirmDelete = () => {
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
  };

  const cancel = async (c: ChangeView) => {
    if (!elderId) {
      return;
    }
    try {
      await cancelChange(elderId, c.id);
    } catch (e) {
      console.warn('Could not cancel the change', e);
      if (mounted.current) {
        Alert.alert(
          errorCode(e) === FamilyErrors.AlreadyTaken
            ? t.remote.alreadyTaken(name)
            : familyMessage(e, t),
        );
      }
    }
    await load();
  };

  const ink = skyInk(skyFor(new Date().getHours()));
  const camera = (
    <RoundButton
      icon="photo_camera"
      label={t.pill.changePhoto}
      onPress={() => setOpen('photo')}
    />
  );

  let hero: ReactNode = null;
  let body: ReactNode = null;
  if (loaded) {
    const { pill, refill, waiting } = loaded;
    const timeText = loaded.times.map(time =>
      formatTime(time.hour, time.minute, is24h),
    );
    const soundText = [
      ...new Set(loaded.times.map(s => s.soundName ?? t.common.defaultTone)),
    ].join(' · ');
    const howLong = [
      pill.days === null ? t.pill.noEnd : t.pill.nDays(pill.days),
      courseLabel(pill.startDate, pill.days, today, t),
    ]
      .filter(Boolean)
      .join(' · ');
    const counted = isCountable(pill.form);
    const countLabel =
      pill.form === 'capsule' ? t.pill.capsulesLeft : t.pill.tabletsLeft;
    let left = t.addPill.optional;
    if (pill.remaining !== null) {
      left =
        refill?.level === 'out'
          ? t.pill.noneLeft
          : formatAmount(pill.form, pill.remaining, lang);
      if (refill?.level === 'low') {
        left = `${left} · ${t.pill.daysLeft(refill.daysLeft)}`;
      }
    }
    const waitingTitle = waiting ? changeTitle(waiting, t, is24h) : '';

    hero = (
      <Pressable
        accessibilityRole="button"
        accessibilityHint={t.pill.basics}
        onPress={() => setOpen('basics')}
        style={({ pressed }) => [styles.hero, pressed && styles.pressed]}
      >
        <View style={styles.circle}>
          <PillPicture key={pill.photoUri ?? ''} pill={pill} size={56} />
        </View>
        <Text style={[styles.name, { color: ink }]}>{pill.name}</Text>
        <Text style={[styles.kind, { color: ink }]}>
          {kindAndAmount(pill.form, pill.amount, t, lang)}
        </Text>
      </Pressable>
    );
    body = (
      <>
        {waiting ? (
          <View style={styles.waiting}>
            <Icon name="hourglass_top" size={22} color={colors.amberText} />
            <Text style={styles.waitingText}>
              {t.pill.waitingChange(name, waitingTitle)}
            </Text>
            {waiting.mine && waiting.status === 'pending' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.remote.cancelLabel(waitingTitle)}
                onPress={() => cancel(waiting)}
                style={({ pressed }) => [
                  styles.cancel,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.cancelText}>{t.remote.cancel}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        <Card style={styles.rows}>
          <Row
            first
            icon="schedule"
            title={t.pill.ringsAt}
            value={t.addPill.joinTimes(timeText)}
            onPress={() => setOpen('times')}
          />
          <Row
            icon="music_note"
            title={t.sound.title}
            value={soundText}
            onPress={() => setOpen('sounds')}
          />
          <Row
            icon="event"
            title={t.pill.howLong}
            value={howLong}
            onPress={() => setOpen('duration')}
          />
          {counted ? (
            <Row
              icon="inventory_2"
              title={countLabel}
              value={left}
              amber={refill !== null && pill.remaining !== null}
              end={
                <View style={styles.add}>
                  <Text style={styles.addText}>{t.addPill.addCount}</Text>
                </View>
              }
              onPress={() => setOpen('count')}
            />
          ) : null}
        </Card>
        {elderId && name ? (
          <Text style={styles.note}>{t.family.herTime(name)}</Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={confirmDelete}
          style={({ pressed }) => [styles.delete, pressed && styles.pressed]}
        >
          <Text style={styles.deleteText}>{t.pill.deletePill}</Text>
        </Pressable>
      </>
    );
  }

  return (
    <View style={styles.page}>
      {/* The sky scrolls with the page, as on Today: a long name at a large text size makes it
          tall, and the lines under it must still have the room. */}
      <ScrollView testID="pill-page">
        <SkyBand
          title={elderId && name ? t.remote.pillTitle(name) : ''}
          onBack={leave}
          right={camera}
        >
          {hero}
        </SkyBand>
        <View style={styles.body}>{body}</View>
      </ScrollView>
      <BasicsSheet
        visible={open === 'basics'}
        draft={draft}
        saving={saving}
        onClose={close}
        onSave={save}
      />
      <TimesSheet
        visible={open === 'times'}
        draft={draft}
        is24h={is24h}
        elderName={elderId ? name : undefined}
        saving={saving}
        onClose={close}
        onSave={save}
      />
      <SoundTimesSheet
        visible={open === 'sounds'}
        times={loaded?.times ?? []}
        is24h={is24h}
        onClose={close}
        onPick={openSound}
      />
      <DurationSheet
        visible={open === 'duration'}
        draft={draft}
        is24h={is24h}
        saving={saving}
        onClose={close}
        onSave={save}
      />
      <CountSheet
        visible={open === 'count'}
        draft={draft}
        autoFocus={countFocus}
        saving={saving}
        onClose={close}
        onSave={save}
      />
      <PhotoSheet
        visible={open === 'photo'}
        hasPhoto={draft.photo !== null}
        onClose={close}
        onPick={pickPhoto}
        onRemove={removePhoto}
      />
    </View>
  );
}

type RowProps = {
  icon: IconName;
  title: string;
  value: string;
  /** Running low or out: the count is amber. */
  amber?: boolean;
  /** In place of the arrow, such as + Add. */
  end?: ReactNode;
  /** The first row of the card, with no line above it. */
  first?: boolean;
  onPress: () => void;
};

/** One part of the pill: its symbol, its name and what it is now. Tapping it opens its sheet. */
function Row({
  icon,
  title,
  value,
  amber = false,
  end,
  first = false,
  onPress,
}: RowProps) {
  return (
    // At a large text size what follows the words drops under them rather than squeezing them.
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !first && styles.line,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.tile, amber && styles.amberTile]}>
        <Icon
          name={icon}
          size={22}
          color={amber ? colors.amberText : colors.blue}
        />
      </View>
      <View style={styles.words}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={[styles.value, amber && styles.amberValue]}>{value}</Text>
      </View>
      {end ?? <Icon name="chevron_right" color={colors.muted} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.page },
  pressed: { opacity: 0.8 },
  // On the sky
  hero: { alignItems: 'center', paddingBottom: spacing.xs },
  circle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    boxShadow: shadow.float,
  },
  name: {
    ...font(900),
    fontSize: 28,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  kind: { ...font(700), fontSize: 15, textAlign: 'center', marginTop: 2 },
  // Under it
  body: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: spacing.lg,
    gap: 12,
  },
  waiting: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 20,
    backgroundColor: colors.amberTint,
  },
  waitingText: {
    ...font(800),
    fontSize: 15,
    lineHeight: 21,
    color: colors.amberText,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 160,
  },
  cancel: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
  },
  cancelText: { ...font(900), fontSize: 15, color: colors.navy },
  rows: { paddingVertical: 2, paddingHorizontal: 14 },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingVertical: 10,
  },
  line: { borderTopWidth: 1, borderTopColor: colors.line },
  tile: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blueTint,
  },
  amberTile: { backgroundColor: colors.amberTint },
  words: { flexGrow: 1, flexShrink: 1, flexBasis: 140 },
  rowTitle: { ...font(900), fontSize: 16, color: colors.navy },
  value: { ...font(700), fontSize: 14, color: colors.muted, marginTop: 1 },
  amberValue: { color: colors.amberText },
  add: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.blueTint,
  },
  addText: { ...font(900), fontSize: 14, color: colors.blueText },
  note: {
    ...font(600),
    fontSize: 15,
    color: colors.muted,
    paddingHorizontal: spacing.xs,
  },
  delete: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  deleteText: { ...font(900), fontSize: 16, color: colors.coralText },
});
