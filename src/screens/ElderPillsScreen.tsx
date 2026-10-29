import React, { useCallback, useRef, useState } from 'react';
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
import { useI18n } from '../i18n';
import { formatAmount } from '../lib/amount';
import type { PillForm } from '../lib/amount';
import { errorCode, familyMessage, heardText } from '../lib/family';
import { toISODate } from '../lib/course';
import {
  changeState,
  changeTitle,
  problemText,
  waitingByPill,
} from '../lib/remote';
import { formatTime } from '../lib/time';
import { is24HourFormat } from '../native/alarms';
import {
  cancelChange,
  FamilyErrors,
  getElderSetup,
  getFamily,
  listChanges,
} from '../native/family';
import type { ChangeView, ElderSetup } from '../native/family';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors, font, radius, spacing } from '../theme';
import Card from '../ui/Card';
import Icon from '../ui/Icon';
import type { IconName } from '../ui/icons';
import PillPicture from '../ui/PillPicture';
import SkyBand from '../ui/SkyBand';

type Props = NativeStackScreenProps<RootStackParamList, 'ElderPills'>;

const isWaiting = (c: ChangeView) =>
  c.status === 'pending' || c.status === 'applying';

/**
 * An elder's pills on the relative's phone, to change from afar: what he sent that still waits
 * for her phone (with Cancel), her pills and her alarm sounds, and what her phone did lately.
 * Without her Allow to change them, only how to get it.
 */
export default function ElderPillsScreen({ navigation, route }: Props) {
  const { elderId } = route.params;
  const { lang, t } = useI18n();
  const [name, setName] = useState('');
  const [setup, setSetup] = useState<ElderSetup | null>(null);
  const [changes, setChanges] = useState<ChangeView[]>([]);
  const [failed, setFailed] = useState<unknown>(null);
  const mounted = useRef(true);
  const is24h = is24HourFormat();

  const load = useCallback(async () => {
    try {
      const cards = await getFamily();
      const mine = await getElderSetup(elderId);
      if (!mounted.current) {
        return;
      }
      setName(cards.find(c => c.elderId === elderId)?.name ?? '');
      setSetup(mine);
      const list = await listChanges(elderId);
      if (mounted.current) {
        setChanges(list);
        setFailed(null);
      }
    } catch (e) {
      console.warn("Could not load her pills' changes", e);
      if (mounted.current) {
        setFailed(e);
      }
    }
  }, [elderId]);

  useFocusEffect(
    useCallback(() => {
      mounted.current = true;
      load();
      return () => {
        mounted.current = false;
      };
    }, [load]),
  );

  const cancel = async (c: ChangeView) => {
    try {
      await cancelChange(elderId, c.id);
    } catch (e) {
      console.warn('Could not cancel the change', e);
      Alert.alert(
        errorCode(e) === FamilyErrors.AlreadyTaken
          ? t.remote.alreadyTaken(name)
          : familyMessage(e, t),
      );
    }
    await load();
  };

  const problem = problemText(setup?.problem ?? null, t, name);
  const waiting = changes.filter(isWaiting);
  const recent = changes.filter(c => !isWaiting(c));
  const byPill = waitingByPill(changes);

  return (
    <View style={styles.page}>
      <SkyBand
        title={t.remote.pillsTitle(name)}
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {problem ? <Amber icon="warning" text={problem} /> : null}
        {failed ? (
          <Text style={styles.failed}>{familyMessage(failed, t)}</Text>
        ) : null}
        {setup && !setup.editor ? (
          <Amber icon="edit" text={t.remote.notEditor(name)} />
        ) : null}
        {setup?.editor ? (
          <>
            {waiting.length > 0 ? (
              <View testID="waiting-card" style={styles.waiting}>
                <View style={styles.waitingHead}>
                  <Icon
                    name="hourglass_top"
                    size={20}
                    color={colors.amberText}
                  />
                  <Text accessibilityRole="header" style={styles.waitingTitle}>
                    {t.remote.waiting(name)}
                  </Text>
                </View>
                {waiting.map(c => {
                  const title = changeTitle(c, t, is24h);
                  return (
                    <View key={c.id} style={styles.waitingRow}>
                      <Text style={styles.waitingName}>{title}</Text>
                      {c.mine && c.status === 'pending' ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={t.remote.cancelLabel(title)}
                          onPress={() => cancel(c)}
                          style={({ pressed }) => [
                            styles.cancel,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text style={styles.cancelText}>
                            {t.remote.cancel}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })}
                <Text style={styles.waitingNote}>
                  {t.remote.delayNote(name)}
                </Text>
              </View>
            ) : null}

            {setup.pills.length > 0 ? (
              <Card style={styles.list}>
                {setup.pills.map((pill, i) => {
                  const pending = byPill.get(pill.id);
                  const form = pill.form as PillForm;
                  return (
                    <Pressable
                      key={pill.id}
                      accessibilityRole="button"
                      onPress={() =>
                        navigation.navigate('Pill', {
                          elderId,
                          pillId: pill.id,
                        })
                      }
                      style={({ pressed }) => [
                        styles.row,
                        i > 0 && styles.rowAfter,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View style={styles.tile}>
                        <PillPicture
                          key={pill.photoUri ?? ''}
                          pill={{ ...pill, form }}
                          size={30}
                        />
                      </View>
                      <View style={styles.words}>
                        <Text
                          style={[
                            styles.name,
                            pending?.kind === 'deletePill' && styles.struck,
                          ]}
                        >
                          {pill.name}
                        </Text>
                        <Text style={[styles.detail, pending && styles.amber]}>
                          {pending
                            ? t.remote.waiting(name)
                            : [
                                formatAmount(form, pill.amount, lang),
                                pill.times
                                  .map(time =>
                                    formatTime(time.hour, time.minute, is24h),
                                  )
                                  .join(', '),
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                        </Text>
                      </View>
                      <Icon name="chevron_right" color={colors.muted} />
                    </Pressable>
                  );
                })}
              </Card>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('AddPill', { elderId })}
              style={({ pressed }) => [styles.add, pressed && styles.pressed]}
            >
              <Icon name="add" size={20} color={colors.blue} />
              <Text style={styles.addText}>{t.addPill.titleFor(name)}</Text>
            </Pressable>

            {recent.length > 0 ? (
              <>
                <Text style={styles.label}>{t.remote.recentHeading}</Text>
                <Card style={styles.list}>
                  {recent.map((c, i) => (
                    <View
                      key={c.id}
                      style={[styles.change, i > 0 && styles.rowAfter]}
                    >
                      <Text style={styles.changeTitle}>
                        {changeTitle(c, t, is24h)}
                      </Text>
                      <Text
                        style={[
                          styles.state,
                          c.status === 'applied' && styles.applied,
                          c.status === 'rejected' && styles.rejected,
                        ]}
                      >
                        {changeState(c, t, is24h, name)}
                      </Text>
                    </View>
                  ))}
                </Card>
              </>
            ) : null}

            {setup.heardAt !== null ? (
              <Text style={styles.note}>
                {t.family.lastHeard(
                  heardText(setup.heardAt, toISODate(new Date()), is24h, t),
                )}
              </Text>
            ) : null}
            {setup.otherZone ? (
              <Text style={styles.note}>{t.family.herTime(name)}</Text>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

/** Something to know before changing her pills, on amber. */
function Amber({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.amberCard}>
      <Icon name={icon} size={20} color={colors.amberText} />
      <Text style={styles.amberText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.page },
  content: {
    padding: spacing.md,
    paddingTop: 14,
    paddingBottom: spacing.lg,
    gap: 12,
  },
  failed: { ...font(700), fontSize: 17, color: colors.navy },
  amberCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: 14,
    borderRadius: radius.card,
    backgroundColor: colors.amberTint,
  },
  amberText: {
    ...font(700),
    flex: 1,
    fontSize: 15.5,
    lineHeight: 22,
    color: colors.navy,
  },
  waiting: {
    gap: 9,
    padding: 13,
    borderRadius: 20,
    backgroundColor: colors.amberTint,
  },
  waitingHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  waitingTitle: {
    ...font(900),
    flex: 1,
    fontSize: 16,
    color: colors.amberText,
  },
  // At large text Cancel drops under the change rather than squeezing it.
  waitingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: spacing.sm,
    minHeight: 48,
    paddingLeft: 12,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: 14,
    backgroundColor: colors.card,
  },
  waitingName: {
    ...font(800),
    flexShrink: 1,
    fontSize: 15.5,
    color: colors.navy,
  },
  cancel: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  cancelText: { ...font(900), fontSize: 15, color: colors.coralText },
  waitingNote: {
    ...font(600),
    fontSize: 14,
    lineHeight: 20,
    color: colors.amberText,
  },
  list: { paddingVertical: 2, paddingHorizontal: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingVertical: 10,
  },
  rowAfter: { borderTopWidth: 1, borderTopColor: colors.line },
  pressed: { opacity: 0.7 },
  tile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  words: { flex: 1 },
  name: { ...font(800), fontSize: 17, color: colors.navy },
  struck: { textDecorationLine: 'line-through' },
  detail: { ...font(700), fontSize: 14, color: colors.muted, marginTop: 1 },
  amber: { color: colors.amberText },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 52,
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.edge,
  },
  addText: {
    ...font(900),
    flexShrink: 1,
    fontSize: 16,
    color: colors.blue,
    textAlign: 'center',
  },
  // Small blue capitals, as every section label in the Sky look.
  label: {
    ...font(900),
    fontSize: 13,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.blue,
    marginTop: spacing.sm,
    marginHorizontal: 2,
  },
  change: { paddingVertical: 10 },
  changeTitle: { ...font(800), fontSize: 15.5, color: colors.navy },
  state: { ...font(800), fontSize: 14, color: colors.muted, marginTop: 1 },
  applied: { color: colors.greenText },
  rejected: { color: colors.coralText },
  note: {
    ...font(600),
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
    textAlign: 'center',
  },
});
