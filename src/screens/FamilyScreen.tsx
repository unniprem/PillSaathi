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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
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
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Family'>;

/**
 * Both sides of Family on this phone: who can see its pills (each with Remove, and a code for
 * someone new), and the people it looks after (with Add family).
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

  useFollowRequests(() => load());

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>{t.family.canSee}</Text>
      {failed ? (
        <Text style={styles.note}>{familyMessage(failed, t)}</Text>
      ) : null}
      {followers?.length === 0 ? (
        <Text style={styles.note}>{t.family.noOne}</Text>
      ) : null}
      {followers?.map(person => (
        <View key={person.uid} style={styles.row}>
          <View style={styles.who}>
            <Text style={styles.name}>{person.name}</Text>
            <Text style={styles.email}>{person.email}</Text>
            <View style={styles.canChange}>
              <Switch
                accessibilityLabel={t.family.canChangeLabel(person.name)}
                value={person.canChange}
                onValueChange={on => allowChanges(person, on)}
              />
              <Text style={styles.canChangeText}>{t.family.canChange}</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.family.removeLabel(person.name)}
            onPress={() => remove(person)}
            style={styles.remove}
          >
            <Text style={styles.removeText}>{t.family.remove}</Text>
          </Pressable>
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate('ShareCode')}
        style={styles.button}
      >
        <Text style={styles.buttonText}>{t.family.showCode}</Text>
      </Pressable>

      <Text style={styles.heading}>{t.family.lookAfter}</Text>
      {follows?.length === 0 ? (
        <Text style={styles.note}>{t.family.noOne}</Text>
      ) : null}
      {follows?.map(follow => (
        <View key={follow.elderId} style={styles.row}>
          <Text style={styles.name}>{follow.name}</Text>
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate('AddFamily')}
        style={styles.button}
      >
        <Text style={styles.buttonText}>{t.family.addFamily}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.lg * 2 },
  heading: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  note: { fontSize: 18, color: colors.text, paddingVertical: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  who: { flex: 1 },
  name: { fontSize: 20, color: colors.text },
  email: { fontSize: 16, color: colors.textMuted },
  canChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  canChangeText: { fontSize: 16, color: colors.text },
  remove: { padding: spacing.sm },
  removeText: { fontSize: 18, color: colors.danger },
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
