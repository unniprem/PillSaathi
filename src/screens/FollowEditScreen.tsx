import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import FollowForm from '../components/FollowForm';
import { useI18n } from '../i18n';
import { familyMessage } from '../lib/family';
import { getFamily, saveFollow, unfollow } from '../native/family';
import type { FamilyCard, Follow } from '../native/family';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors, font, radius, spacing } from '../theme';
import SkyBand from '../ui/SkyBand';

type Props = NativeStackScreenProps<RootStackParamList, 'FollowEdit'>;

/**
 * The gear on her page: what the relative calls an elder, her number and his ping delay, and
 * Stop following, which asks first and, for a copy silent for 30 days, whether to delete it too.
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
      Alert.alert(familyMessage(e, t));
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
    <View style={styles.page}>
      <SkyBand title={card?.name ?? ''} onBack={() => navigation.goBack()} />
      <ScrollView
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
              style={({ pressed }) => [styles.stop, pressed && styles.pressed]}
            >
              <Text style={styles.stopText}>{t.family.stopFollowing}</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
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
  // Coral words on white, set apart below the form and its Save.
  stop: {
    marginTop: spacing.md,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.button,
    borderWidth: 2,
    borderColor: colors.coralTint,
    backgroundColor: colors.card,
  },
  pressed: { opacity: 0.7 },
  stopText: {
    ...font(900),
    flexShrink: 1,
    fontSize: 17,
    color: colors.coralText,
    textAlign: 'center',
  },
});
