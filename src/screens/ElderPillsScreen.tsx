import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
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
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ElderPills'>;

const isWaiting = (c: ChangeView) =>
  c.status === 'pending' || c.status === 'applying';

/**
 * An elder's pills on the relative's phone, to change from afar: what he sent that still waits
 * for her phone (with Cancel), her pills and her alarm sounds, and what her phone did lately.
 */
export default function ElderPillsScreen({ navigation, route }: Props) {
  const { elderId } = route.params;
  const { t } = useI18n();
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

  useLayoutEffect(() => {
    navigation.setOptions({ title: t.remote.pillsTitle(name) });
  }, [navigation, name, t]);

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {problem ? <Text style={styles.warning}>{problem}</Text> : null}
      {failed ? (
        <Text style={styles.note}>{familyMessage(failed, t)}</Text>
      ) : null}
      {setup && !setup.editor ? (
        <Text style={styles.note}>{t.remote.notEditor(name)}</Text>
      ) : null}
      {setup?.editor ? (
        <>
          <Text style={styles.muted}>{t.remote.delayNote(name)}</Text>
          {setup.heardAt !== null ? (
            <Text style={styles.muted}>
              {t.family.lastHeard(
                heardText(setup.heardAt, toISODate(new Date()), is24h, t),
              )}
            </Text>
          ) : null}
          {setup.otherZone ? (
            <Text style={styles.muted}>{t.family.herTime(name)}</Text>
          ) : null}

          {waiting.length > 0 ? (
            <Text style={styles.heading}>{t.remote.waitingHeading}</Text>
          ) : null}
          {waiting.map(c => {
            const title = changeTitle(c, t, is24h);
            return (
              <View key={c.id} style={styles.row}>
                <View style={styles.grow}>
                  <Text style={styles.name}>{title}</Text>
                  <Text style={styles.muted}>
                    {changeState(c, t, is24h, name)}
                  </Text>
                </View>
                {c.mine && c.status === 'pending' ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t.remote.cancelLabel(title)}
                    onPress={() => cancel(c)}
                    style={styles.small}
                  >
                    <Text style={styles.smallText}>{t.remote.cancel}</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}

          <Text style={styles.heading}>{t.remote.pillsTitle(name)}</Text>
          {setup.pills.map(pill => {
            const pending = byPill.get(pill.id);
            return (
              <Pressable
                key={pill.id}
                accessibilityRole="button"
                onPress={() =>
                  navigation.navigate('PillEdit', { elderId, pillId: pill.id })
                }
                style={styles.row}
              >
                <View style={styles.grow}>
                  <Text
                    style={[
                      styles.name,
                      pending?.kind === 'deletePill' && styles.struck,
                    ]}
                  >
                    {pill.name}
                  </Text>
                  <Text style={styles.muted}>
                    {pending
                      ? t.remote.waiting(name)
                      : pill.times
                          .map(time =>
                            formatTime(time.hour, time.minute, is24h),
                          )
                          .join(', ')}
                  </Text>
                </View>
              </Pressable>
            );
          })}
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('PillEdit', { elderId })}
            style={styles.button}
          >
            <Text style={styles.buttonText}>{t.remote.addPill}</Text>
          </Pressable>

          {setup.times.length > 0 ? (
            <Text style={styles.heading}>{t.remote.soundsHeading}</Text>
          ) : null}
          {setup.times.map(time => (
            <Pressable
              key={`${time.hour}:${time.minute}`}
              accessibilityRole="button"
              onPress={() =>
                navigation.navigate('SoundPicker', {
                  elderId,
                  hour: time.hour,
                  minute: time.minute,
                  selectedSoundId: time.soundId,
                })
              }
              style={styles.row}
            >
              <Text style={styles.name}>
                {`${formatTime(time.hour, time.minute, is24h)} · ${
                  time.soundName ?? t.remote.defaultTone
                }`}
              </Text>
            </Pressable>
          ))}

          {recent.length > 0 ? (
            <Text style={styles.heading}>{t.remote.recentHeading}</Text>
          ) : null}
          {recent.map(c => (
            <View key={c.id} style={styles.row}>
              <View style={styles.grow}>
                <Text style={styles.name}>{changeTitle(c, t, is24h)}</Text>
                <Text
                  style={[
                    styles.muted,
                    c.status === 'rejected' && styles.rejected,
                  ]}
                >
                  {changeState(c, t, is24h, name)}
                </Text>
              </View>
            </View>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.lg * 2 },
  warning: {
    fontSize: 18,
    color: colors.text,
    backgroundColor: '#FEF3C7',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  heading: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  note: { fontSize: 18, color: colors.text, paddingVertical: spacing.sm },
  muted: { fontSize: 16, color: colors.textMuted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  grow: { flex: 1 },
  name: { fontSize: 20, color: colors.text },
  struck: { textDecorationLine: 'line-through' },
  rejected: { color: colors.danger },
  small: { padding: spacing.sm },
  smallText: { fontSize: 18, color: colors.primary },
  button: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  buttonText: { fontSize: 18, color: colors.primary, fontWeight: '600' },
});
