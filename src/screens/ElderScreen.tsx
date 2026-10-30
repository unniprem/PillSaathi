import React, { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { daysText } from '../components/today/RefillCard';
import { useI18n } from '../i18n';
import type { Strings } from '../i18n';
import { formatAmount } from '../lib/amount';
import { heardText } from '../lib/family';
import { problemText } from '../lib/remote';
import { formatTime } from '../lib/time';
import { statusText } from '../lib/today';
import { is24HourFormat } from '../native/alarms';
import type { TodayCard } from '../native/alarms';
import {
  getElderSetup,
  getElderToday,
  getFamily,
  refreshFamily,
} from '../native/family';
import type { ElderToday, FamilyCard } from '../native/family';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors, font, radius, shadow, spacing } from '../theme';
import Avatar from '../ui/Avatar';
import CallButton from '../ui/CallButton';
import Card from '../ui/Card';
import Icon from '../ui/Icon';
import type { IconName } from '../ui/icons';
import SkyBand, { RoundButton } from '../ui/SkyBand';

type Props = NativeStackScreenProps<RootStackParamList, 'Elder'>;

/** A dose's chip on her page: what happened, in its colour. */
type Look = { text: string; fill: string; ink: string };

/** "✓ 8:04 AM", Missed, Later, Not reported yet…; null for a time with no ring left today. */
function chipFor(
  card: TodayCard,
  date: string,
  is24h: boolean,
  t: Strings,
): Look | null {
  const blue = { fill: colors.blueTint, ink: colors.blueText };
  switch (card.status) {
    case 'taken': {
      const at = card.statusAt === null ? null : new Date(card.statusAt);
      return {
        text: at
          ? t.family.tookAt(formatTime(at.getHours(), at.getMinutes(), is24h))
          : t.status.taken,
        fill: colors.greenTint,
        ink: colors.greenText,
      };
    }
    case 'missed':
      return {
        text: t.status.missed,
        fill: colors.coralTint,
        ink: colors.coralText,
      };
    case 'skipped':
      return { text: t.status.skipped, fill: colors.soft, ink: colors.muted };
    case 'notReported':
      return {
        text: t.status.notReported,
        fill: colors.amberTint,
        ink: colors.amberText,
      };
    case 'upcoming':
      return { text: t.family.dueLater, ...blue };
    default: {
      // Ringing, snoozed, or next due on another day.
      const text = statusText(card, date, is24h, t);
      return text ? { text, ...blue } : null;
    }
  }
}

/**
 * An elder's page on the relative's phone, read-only: her name and when her phone was last heard
 * from, with Call, then anything that needs a look (her phone's alarm problem, her pills running
 * low), her day one line per dose, and the ways into her pills and her History. The gear holds
 * his alert settings and Stop following.
 */
export default function ElderScreen({ navigation, route }: Props) {
  const { elderId } = route.params;
  const { lang, t } = useI18n();
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

  const name = card?.name ?? '';
  const is24h = is24HourFormat();
  const phone = card?.phone;

  // In amber: her phone's alarm problem first, then her pills running low. Two pills can share
  // a name, so a line is known by its pill, not its words.
  const lines: {
    key: string;
    icon: IconName;
    text: string;
    detail?: string;
  }[] = [];
  const warning = problemText(problem, t, name);
  if (warning) {
    lines.push({ key: 'problem', icon: 'warning', text: warning });
  }
  for (const r of today?.refills ?? []) {
    lines.push({
      key: r.pillId,
      icon: 'inventory_2',
      text:
        r.level === 'out'
          ? t.refill.out(r.name)
          : t.refill.left(r.name, formatAmount(r.form, r.remaining, lang)),
      detail: r.level === 'low' ? daysText(r.daysLeft, t) : undefined,
    });
  }

  return (
    <View style={styles.page}>
      {/* The sky scrolls with the page: a long name at a large text size makes it tall, and her
          day under it must still have the room. */}
      <ScrollView testID="elder-page">
        <SkyBand
          title={name}
          sub={
            today?.heardAt != null
              ? t.family.lastHeard(
                  heardText(today.heardAt, today.date, is24h, t),
                )
              : undefined
          }
          onBack={() => navigation.goBack()}
          right={
            <RoundButton
              icon="settings"
              label={t.family.edit}
              onPress={() => navigation.navigate('FollowEdit', { elderId })}
            />
          }
          picture={card ? <Avatar name={name} size={60} /> : undefined}
          action={phone ? <CallButton phone={phone} size={52} /> : undefined}
        />
        <View style={styles.content}>
          {lines.length > 0 ? (
            <View style={styles.attention}>
              {lines.map(line => (
                <View key={line.key} style={styles.line}>
                  <Icon name={line.icon} size={20} color={colors.amberText} />
                  <View style={styles.lineWords}>
                    <Text style={styles.lineText}>{line.text}</Text>
                    {line.detail ? (
                      <Text style={styles.lineDetail}>{line.detail}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ) : null}
          {today && today.cards.length > 0 ? (
            <Card style={styles.day}>
              {today.cards.map((item, i) => {
                const chip = chipFor(item, today.date, is24h, t);
                const names = item.pills
                  .map(p =>
                    p.fromTomorrow
                      ? `${p.name} (${t.course.fromTomorrow})`
                      : p.name,
                  )
                  .join(', ');
                return (
                  <View
                    key={`${item.hour}:${item.minute}`}
                    style={[styles.dose, i > 0 && styles.doseAfter]}
                  >
                    <Text style={styles.time}>
                      {formatTime(item.hour, item.minute, is24h)}
                    </Text>
                    <Text style={styles.names}>{names}</Text>
                    {chip ? (
                      <View
                        style={[styles.chip, { backgroundColor: chip.fill }]}
                      >
                        <Text style={[styles.chipText, { color: chip.ink }]}>
                          {chip.text}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </Card>
          ) : null}
          <View style={styles.tiles}>
            <Tile
              icon="medication"
              label={t.remote.herPills}
              onPress={() => navigation.navigate('ElderPills', { elderId })}
            />
            <Tile
              icon="calendar_month"
              label={t.history.title}
              onPress={() => navigation.navigate('ElderHistory', { elderId })}
            />
          </View>
          {today?.otherZone ? (
            <Text style={styles.note}>{t.family.herTime(name)}</Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

type TileProps = { icon: IconName; label: string; onPress: () => void };

/** A way off her page, as an icon on a tint and its word. */
function Tile({ icon, label, onPress }: TileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <View style={styles.tileIcon}>
        <Icon name={icon} size={22} color={colors.blue} />
      </View>
      <Text style={styles.tileText}>{label}</Text>
    </Pressable>
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
  pressed: { opacity: 0.7 },
  attention: {
    gap: 10,
    padding: 14,
    borderRadius: radius.card,
    backgroundColor: colors.amberTint,
  },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  lineWords: { flex: 1 },
  lineText: {
    ...font(700),
    fontSize: 15.5,
    lineHeight: 22,
    color: colors.navy,
  },
  lineDetail: { ...font(700), fontSize: 14, color: colors.amberText },
  day: { paddingVertical: spacing.xs, paddingHorizontal: 14 },
  // At large text the chip drops under the time and names rather than squeezing them.
  dose: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 10,
    rowGap: spacing.xs,
    minHeight: 48,
    paddingVertical: 10,
  },
  doseAfter: { borderTopWidth: 1, borderTopColor: colors.line },
  time: { ...font(900), minWidth: 72, fontSize: 15.5, color: colors.navy },
  names: {
    ...font(700),
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 110,
    fontSize: 14.5,
    lineHeight: 20,
    color: colors.muted,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  chipText: { ...font(800), fontSize: 13.5 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    flexGrow: 1,
    flexBasis: 140,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 56,
    padding: 12,
    borderRadius: radius.button,
    backgroundColor: colors.card,
    boxShadow: shadow.card,
  },
  tileIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.blueTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: { ...font(900), flexShrink: 1, fontSize: 16, color: colors.navy },
  note: {
    ...font(600),
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
  },
});
