import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import DoseCard from '../components/DoseCard';
import RefillBanner from '../components/RefillBanner';
import { useI18n } from '../i18n';
import { heardText } from '../lib/family';
import { problemText } from '../lib/remote';
import { is24HourFormat } from '../native/alarms';
import {
  getElderSetup,
  getElderToday,
  getFamily,
  refreshFamily,
} from '../native/family';
import type { ElderToday, FamilyCard } from '../native/family';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Elder'>;

/**
 * An elder's day on the relative's phone, read-only: her cards, her pills running low, when her
 * phone was last heard from, and her History and a Call button.
 */
export default function ElderScreen({ navigation, route }: Props) {
  const { elderId } = route.params;
  const { t } = useI18n();
  const [card, setCard] = useState<FamilyCard | null>(null);
  const [today, setToday] = useState<ElderToday | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const mounted = useRef(true);

  const show = useCallback(
    async (cards: FamilyCard[]) => {
      const mine = cards.find(c => c.elderId === elderId) ?? null;
      const day = mine ? await getElderToday(elderId) : null;
      const setup = mine ? await getElderSetup(elderId) : null;
      if (mounted.current) {
        setCard(mine);
        setToday(day);
        setProblem(setup?.problem ?? null);
      }
      return mine;
    },
    [elderId],
  );

  useFocusEffect(
    useCallback(() => {
      mounted.current = true;
      (async () => {
        try {
          await show(await getFamily());
          // Gone after a fresh read: she removed him, or her copy was deleted.
          if (!(await show(await refreshFamily())) && mounted.current) {
            navigation.goBack();
          }
        } catch (e) {
          console.warn("Could not load the elder's day", e);
        }
      })();
      return () => {
        mounted.current = false;
      };
    }, [show, navigation]),
  );

  const renderEdit = useCallback(
    () => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.family.edit}
        onPress={() => navigation.navigate('FollowEdit', { elderId })}
        hitSlop={spacing.sm}
      >
        <Text style={styles.gear}>⚙</Text>
      </Pressable>
    ),
    [navigation, elderId, t],
  );

  const name = card?.name ?? '';
  useLayoutEffect(() => {
    navigation.setOptions({ title: name, headerRight: renderEdit });
  }, [navigation, name, renderEdit]);

  const is24h = is24HourFormat();
  const phone = card?.phone;
  const warning = problemText(problem, t, name);

  return (
    <View style={styles.container}>
      <RefillBanner refills={today?.refills ?? []} />
      <ScrollView contentContainerStyle={styles.list}>
        {warning ? <Text style={styles.warning}>{warning}</Text> : null}
        {today?.heardAt != null ? (
          <Text style={styles.heard}>
            {t.family.lastHeard(heardText(today.heardAt, today.date, is24h, t))}
          </Text>
        ) : null}
        {today?.otherZone ? (
          <Text style={styles.zone}>{t.family.herTime(name)}</Text>
        ) : null}
        {today?.cards.map(item => (
          <DoseCard
            key={`${item.hour}:${item.minute}`}
            card={item}
            date={today.date}
            is24h={is24h}
            soundName={null}
            readOnly
          />
        ))}
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('ElderPills', { elderId })}
          style={[styles.button, styles.change]}
        >
          <Text style={styles.buttonText}>{t.remote.changePills}</Text>
        </Pressable>
        <View style={styles.buttons}>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('History', { elderId })}
            style={styles.button}
          >
            <Text style={styles.buttonText}>{t.history.title}</Text>
          </Pressable>
          {phone ? (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                Linking.openURL(`tel:${phone}`).catch(e =>
                  console.warn('Could not open the dialer', e),
                )
              }
              style={styles.button}
            >
              <Text style={styles.buttonText}>{t.family.call}</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { paddingBottom: spacing.lg * 2 },
  heard: {
    fontSize: 16,
    color: colors.textMuted,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  zone: {
    fontSize: 16,
    color: colors.textMuted,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.md,
    margin: spacing.md,
  },
  button: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  buttonText: { fontSize: 18, color: colors.primary, fontWeight: '600' },
  change: { flex: 0, marginHorizontal: spacing.md, marginTop: spacing.md },
  warning: {
    fontSize: 18,
    color: colors.text,
    backgroundColor: '#FEF3C7',
    padding: spacing.md,
    margin: spacing.md,
    marginBottom: 0,
    borderRadius: 8,
  },
  gear: { fontSize: 26, color: colors.text },
});
