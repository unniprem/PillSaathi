import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AllowDialog from '../components/AllowDialog';
import { useFollowRequests } from '../hooks/useFollowRequests';
import { useI18n } from '../i18n';
import { familyMessage } from '../lib/family';
import {
  listFollowers,
  listFollows,
  removeFollower,
  setCanChange,
} from '../native/family';
import type { Follow, Follower, Person } from '../native/family';
import type { TabProps } from '../navigation/RootNavigator';
import { colors, font, radius, shadow, spacing } from '../theme';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Icon from '../ui/Icon';
import SkyBand from '../ui/SkyBand';

type Props = TabProps<'Family'>;

/**
 * Both sides of Family on this phone: who can see its pills (each with Remove and Can change my
 * pills, and her code for someone new), then the people it looks after, if any, and Add family.
 */
export default function FamilyScreen({ navigation }: Props) {
  const { t } = useI18n();
  const [followers, setFollowers] = useState<Follower[] | null>(null);
  const [follows, setFollows] = useState<Follow[] | null>(null);
  const [failed, setFailed] = useState<unknown>(null);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    try {
      const people = await listFollowers();
      if (mounted.current) {
        setFollowers(people);
        setFailed(null);
      }
    } catch (e) {
      console.warn('Could not list who can see my pills', e);
      if (mounted.current) {
        setFailed(e ?? new Error('Could not list'));
      }
    }
  }, []);

  const loadFollows = useCallback(async () => {
    try {
      const list = await listFollows();
      if (mounted.current) {
        setFollows(list);
      }
    } catch (e) {
      console.warn('Could not list the people I look after', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      mounted.current = true;
      load();
      loadFollows();
      return () => {
        mounted.current = false;
      };
    }, [load, loadFollows]),
  );

  const { asking, answer } = useFollowRequests(() => load());

  const remove = (person: Person) => {
    Alert.alert(t.family.removeConfirm(person.name), undefined, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.family.remove,
        style: 'destructive',
        onPress: async () => {
          try {
            await removeFollower(person.uid);
          } catch (e) {
            console.warn('Could not remove a follower', e);
            Alert.alert(familyMessage(e, t));
          }
          await load();
        },
      },
    ]);
  };

  const allowChanges = async (person: Follower, on: boolean) => {
    try {
      await setCanChange(person.uid, on);
    } catch (e) {
      console.warn('Could not change who can change my pills', e);
      Alert.alert(familyMessage(e, t));
    }
    await load();
  };

  return (
    <View style={styles.page}>
      <SkyBand title={t.family.title} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>{t.family.canSee}</Text>
        {failed ? (
          <Text style={styles.note}>{familyMessage(failed, t)}</Text>
        ) : null}
        {followers?.length === 0 ? (
          <Text style={styles.note}>{t.family.noOne}</Text>
        ) : null}
        {followers?.map(person => (
          <Card key={person.uid} style={styles.person}>
            <View style={styles.top}>
              <Avatar name={person.name} />
              <View style={styles.who}>
                <Text style={styles.name}>{person.name}</Text>
                <Text style={styles.email}>{person.email}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.family.removeLabel(person.name)}
                onPress={() => remove(person)}
                style={({ pressed }) => [
                  styles.remove,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.removeText}>{t.family.remove}</Text>
              </Pressable>
            </View>
            <View style={styles.canChange}>
              <Text style={styles.canChangeText}>{t.family.canChange}</Text>
              <Switch
                accessibilityLabel={t.family.canChangeLabel(person.name)}
                value={person.canChange}
                onValueChange={on => allowChanges(person, on)}
                trackColor={{ false: colors.edge, true: colors.green }}
                thumbColor={colors.card}
              />
            </View>
          </Card>
        ))}
        <View style={styles.showCode}>
          <Button
            label={t.family.showCode}
            icon="qr_code_2"
            onPress={() => navigation.navigate('ShareCode')}
          />
        </View>
        <Text style={styles.hint}>{t.family.howToAdd}</Text>

        {follows?.length ? (
          <>
            <Text style={[styles.label, styles.second]}>
              {t.family.lookAfter}
            </Text>
            {follows.map(follow => (
              <Pressable
                key={follow.elderId}
                accessibilityRole="button"
                // Her name, without the avatar's letter or the arrow's glyph.
                accessibilityLabel={follow.name}
                onPress={() =>
                  navigation.navigate('Elder', { elderId: follow.elderId })
                }
                style={({ pressed }) => [
                  styles.elder,
                  pressed && styles.pressed,
                ]}
              >
                <Avatar name={follow.name} />
                <Text style={[styles.name, styles.who]}>{follow.name}</Text>
                <Icon name="chevron_right" color={colors.muted} />
              </Pressable>
            ))}
          </>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('AddFamily')}
          style={({ pressed }) => [styles.addRow, pressed && styles.pressed]}
        >
          <Text style={styles.addText}>{t.family.addFamily}</Text>
        </Pressable>
      </ScrollView>
      <AllowDialog person={asking} onAnswer={answer} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.page },
  content: { padding: spacing.md, paddingBottom: spacing.lg, gap: 12 },
  label: {
    ...font(900),
    fontSize: 13,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.blue,
    marginHorizontal: 2,
  },
  second: { marginTop: spacing.md },
  note: { ...font(700), fontSize: 17, color: colors.navy },
  person: { paddingVertical: 12, paddingHorizontal: 14 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  who: { flex: 1 },
  name: { ...font(900), fontSize: 18, lineHeight: 22, color: colors.navy },
  email: { ...font(700), fontSize: 14, color: colors.muted, marginTop: 2 },
  remove: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  removeText: { ...font(900), fontSize: 15, color: colors.coralText },
  canChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 10,
  },
  canChangeText: { ...font(800), flex: 1, fontSize: 16, color: colors.navy },
  showCode: { marginTop: spacing.xs },
  hint: {
    ...font(600),
    fontSize: 15,
    lineHeight: 21,
    color: colors.muted,
    textAlign: 'center',
  },
  elder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.card,
    backgroundColor: colors.card,
    boxShadow: shadow.card,
  },
  addRow: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.edge,
  },
  addText: {
    ...font(900),
    fontSize: 16,
    color: colors.blue,
    textAlign: 'center',
  },
  pressed: { opacity: 0.7 },
});
