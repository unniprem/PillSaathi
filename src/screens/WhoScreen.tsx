import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useI18n } from '../i18n';
import { setRole } from '../native/alarms';
import type { Role } from '../native/alarms';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors, font, shadow, spacing } from '../theme';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import type { IconName } from '../ui/icons';
import SkyTop from '../ui/SkyTop';

type Props = NativeStackScreenProps<RootStackParamList, 'Who'>;

/**
 * Asked once, after the login: is this her phone, or a relative's? The answer only picks the
 * next page, alarm setup or Add family, and is kept so the phone isn't asked again. Both kinds
 * of phone get the same app.
 */
export default function WhoScreen({ navigation, route }: Props) {
  const { t } = useI18n();
  const [role, setChosen] = useState<Role | null>(null);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const go = async () => {
    if (!role || busy) {
      return;
    }
    setBusy(true);
    try {
      await setRole(role);
    } catch (e) {
      // Moves on anyway: the phone only asks again at the next open.
      console.warn('Could not save who the phone is for', e);
    }
    if (!mounted.current) {
      return;
    }
    // Nothing to go back to: the login and this page are done.
    navigation.reset({
      index: 0,
      routes: [
        role === 'elder'
          ? { name: 'Setup', params: { firstRun: true } }
          : { name: 'AddFamily', params: { fromLogin: true } },
      ],
    });
  };

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <SkyTop
          hour={new Date().getHours()}
          title={t.who.hi(route.params.first)}
          sub={t.who.question}
        />
        <View style={styles.body}>
          <Choice
            icon="elderly_woman"
            tile={colors.coral}
            title={t.who.elder}
            sub={t.who.elderSub}
            on={role === 'elder'}
            onPress={() => setChosen('elder')}
          />
          <Choice
            icon="family_restroom"
            tile={colors.blue}
            title={t.who.carer}
            sub={t.who.carerSub}
            on={role === 'carer'}
            onPress={() => setChosen('carer')}
          />
          <Text style={styles.note}>{t.who.both}</Text>
          <View style={styles.spring} />
          <Button
            label={t.common.continue}
            onPress={go}
            disabled={!role || busy}
          />
        </View>
      </ScrollView>
    </View>
  );
}

type ChoiceProps = {
  icon: IconName;
  tile: string;
  title: string;
  sub: string;
  on: boolean;
  onPress: () => void;
};

/** One big answer: a coloured tile with its symbol, the words, and a tick once chosen. */
function Choice({ icon, tile, title, sub, on, onPress }: ChoiceProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={title}
      accessibilityHint={sub}
      accessibilityState={{ checked: on }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        on && styles.choiceOn,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.tile, { backgroundColor: tile }]}>
        <Icon name={icon} size={30} color={colors.onFill} />
      </View>
      <View style={styles.words}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>{sub}</Text>
      </View>
      {on ? <Icon name="check_circle" size={26} color={colors.blue} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.page },
  scroll: { flexGrow: 1 },
  // The first choice lifts into the foot of the sky.
  body: {
    flexGrow: 1,
    marginTop: -44,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    gap: 12,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: colors.line,
    backgroundColor: colors.card,
    boxShadow: shadow.card,
  },
  choiceOn: { borderColor: colors.blue },
  pressed: { opacity: 0.85 },
  tile: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  words: { flex: 1 },
  title: { ...font(900), fontSize: 18, color: colors.navy },
  sub: { ...font(700), fontSize: 14, color: colors.muted, marginTop: 2 },
  note: {
    ...font(600),
    fontSize: 15,
    lineHeight: 21,
    color: colors.muted,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  // Keeps Continue at the foot of a tall phone.
  spring: { flexGrow: 1, minHeight: spacing.sm },
});
