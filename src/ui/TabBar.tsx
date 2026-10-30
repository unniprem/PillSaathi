import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useI18n } from '../i18n';
import type { Strings } from '../i18n';
import { colors, font, shadow, spacing } from '../theme';
import Icon from './Icon';
import type { IconName } from './icons';

type Tab = keyof Strings['tabs'];

const TAB_ICONS: Record<Tab, IconName> = {
  Today: 'home',
  History: 'calendar_month',
  Family: 'group',
  Settings: 'settings',
};

/**
 * The main pages as a floating white bar, each an icon with its word under it. The open tab
 * sits on a blue-tint pill with a filled icon; the others are outlined. It takes its own place
 * under the page rather than floating over it, so nothing on the page hides behind it.
 */
export default function TabBar({
  state,
  navigation,
  insets,
}: BottomTabBarProps) {
  const { t } = useI18n();
  return (
    <View style={[styles.under, { paddingBottom: spacing.sm + insets.bottom }]}>
      <View accessibilityRole="tablist" style={styles.bar}>
        {state.routes.map((route, index) => {
          const tab = route.name as Tab;
          const open = index === state.index;
          const ink = open ? colors.blueText : colors.muted;
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!open && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={t.tabs[tab]}
              accessibilityState={{ selected: open }}
              onPress={onPress}
              style={[styles.tab, open && styles.open]}
            >
              <Icon name={TAB_ICONS[tab]} outlined={!open} color={ink} />
              {/* Four words must fit across, so a long one shrinks rather than wraps. */}
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                maxFontSizeMultiplier={1.5}
                style={[styles.label, { color: ink }]}
              >
                {t.tabs[tab]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  under: {
    backgroundColor: colors.page,
    paddingHorizontal: 10,
    paddingTop: spacing.xs,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 24,
    paddingVertical: 7,
    paddingHorizontal: 6,
    gap: 2,
    boxShadow: shadow.float,
  },
  tab: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderRadius: 18,
  },
  open: { backgroundColor: colors.blueTint },
  label: { ...font(800), fontSize: 13 },
});
