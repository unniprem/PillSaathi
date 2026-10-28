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
import { useFollowRequests } from '../hooks/useFollowRequests';
import { useI18n } from '../i18n';
import { listFollowers, removeFollower } from '../native/family';
import type { Person } from '../native/family';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Family'>;

/** Who can see this phone's pills, each with Remove, and a way to show a code to someone new. */
export default function FamilyScreen({ navigation }: Props) {
  const { t } = useI18n();
  const [followers, setFollowers] = useState<Person[] | null>(null);
  const [failed, setFailed] = useState(false);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    try {
      const people = await listFollowers();
      if (mounted.current) {
        setFollowers(people);
        setFailed(false);
      }
    } catch (e) {
      console.warn('Could not list who can see my pills', e);
      if (mounted.current) {
        setFailed(true);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      mounted.current = true;
      load();
      return () => {
        mounted.current = false;
      };
    }, [load]),
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
            Alert.alert(t.family.offline);
          }
          await load();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>{t.family.canSee}</Text>
      {failed ? <Text style={styles.note}>{t.family.offline}</Text> : null}
      {followers?.length === 0 ? (
        <Text style={styles.note}>{t.family.noOne}</Text>
      ) : null}
      {followers?.map(person => (
        <View key={person.uid} style={styles.row}>
          <View style={styles.who}>
            <Text style={styles.name}>{person.name}</Text>
            <Text style={styles.email}>{person.email}</Text>
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
