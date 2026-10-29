import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import FollowForm from '../components/FollowForm';
import { useI18n } from '../i18n';
import { getFamily, saveFollow, unfollow } from '../native/family';
import type { FamilyCard, Follow } from '../native/family';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'FollowEdit'>;

/**
 * What the relative calls an elder, her number and his ping delay, and Stop following, which asks
 * first and, for a copy silent for 30 days, whether to delete it too.
 */
export default function FollowEditScreen({ navigation, route }: Props) {
  const { elderId } = route.params;
  const { t } = useI18n();
  const [card, setCard] = useState<FamilyCard | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    getFamily()
      .then(cards => {
        if (mounted.current) {
          setCard(cards.find(c => c.elderId === elderId) ?? null);
        }
      })
      .catch(e => console.warn('Could not read the follow', e));
    return () => {
      mounted.current = false;
    };
  }, [elderId]);

  const name = card?.name ?? '';
  useLayoutEffect(() => {
    navigation.setOptions({ title: name });
  }, [navigation, name]);

  const save = async (follow: Follow) => {
    try {
      await saveFollow(follow);
      navigation.goBack();
    } catch (e) {
      console.warn('Could not save the follow', e);
      Alert.alert(t.settings.saveFailed);
    }
  };

  const stop = async (deleteCopy: boolean) => {
    try {
      await unfollow(elderId, deleteCopy);
      navigation.popToTop();
    } catch (e) {
      console.warn('Could not stop following', e);
      Alert.alert(t.family.offline);
    }
  };

  const askStop = () => {
    if (!card) {
      return;
    }
    // Only her old phone could delete a copy gone quiet; the last follower is asked.
    const askDelete = () =>
      Alert.alert(t.family.deleteCopyConfirm(card.name), undefined, [
        { text: t.family.keep, onPress: () => stop(false) },
        {
          text: t.common.delete,
          style: 'destructive',
          onPress: () => stop(true),
        },
      ]);
    Alert.alert(t.family.stopConfirm(card.name), undefined, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.family.stopFollowing,
        style: 'destructive',
        onPress: () => (card.abandoned ? askDelete() : stop(false)),
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {card ? (
        <>
          <FollowForm
            initial={{
              elderId,
              name: card.name,
              phone: card.phone,
              delayMinutes: card.delayMinutes,
            }}
            submitLabel={t.common.save}
            onSubmit={save}
          />
          <Pressable
            accessibilityRole="button"
            onPress={askStop}
            style={styles.stop}
          >
            <Text style={styles.stopText}>{t.family.stopFollowing}</Text>
          </Pressable>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.lg * 2 },
  stop: { marginTop: spacing.lg, padding: spacing.md, alignItems: 'center' },
  stopText: { fontSize: 18, color: colors.danger, fontWeight: '600' },
});
