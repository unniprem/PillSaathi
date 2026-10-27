import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { I18nProvider, useI18n } from '../i18n';
import TodayScreen from '../screens/TodayScreen';
import PillEditScreen from '../screens/PillEditScreen';
import SoundPickerScreen from '../screens/SoundPickerScreen';
import RecordScreen from '../screens/RecordScreen';
import SetupScreen from '../screens/SetupScreen';
import SettingsScreen from '../screens/SettingsScreen';
import HistoryScreen from '../screens/HistoryScreen';
import HistoryDayScreen from '../screens/HistoryDayScreen';
import { formatDay } from '../lib/course';

export type RootStackParamList = {
  Today: undefined;
  PillEdit: { pillId?: string };
  // The sound chosen here is set on card alarmId.
  SoundPicker: { alarmId: string; selectedSoundId: string | null };
  Record: { alarmId: string };
  Setup: undefined;
  Settings: undefined;
  History: undefined;
  HistoryDay: { date: string }; // YYYY-MM-DD
};

const Stack = createNativeStackNavigator<RootStackParamList>();

type Props = {
  initialRouteName?: keyof RootStackParamList;
  initialParams?: object;
};

/** Every screen, in the app's language. */
export function RootNavigator(props: Props) {
  return (
    <I18nProvider>
      <RootStack {...props} />
    </I18nProvider>
  );
}

function RootStack({ initialRouteName = 'Today', initialParams }: Props) {
  const { t } = useI18n();
  // Only the first screen takes params from outside (tests open any screen first).
  const paramsFor = (name: keyof RootStackParamList) =>
    name === initialRouteName ? (initialParams as never) : undefined;
  return (
    <Stack.Navigator initialRouteName={initialRouteName}>
      <Stack.Screen
        name="Today"
        component={TodayScreen}
        options={{ title: t.today.title }}
      />
      <Stack.Screen
        name="PillEdit"
        component={PillEditScreen}
        initialParams={paramsFor('PillEdit')}
      />
      <Stack.Screen
        name="SoundPicker"
        component={SoundPickerScreen}
        options={{ title: t.sound.title }}
        initialParams={paramsFor('SoundPicker')}
      />
      <Stack.Screen
        name="Record"
        component={RecordScreen}
        options={{ title: t.record.title }}
        initialParams={paramsFor('Record')}
      />
      <Stack.Screen
        name="Setup"
        component={SetupScreen}
        options={{ title: t.setup.title }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: t.settings.title }}
      />
      <Stack.Screen
        name="History"
        component={HistoryScreen}
        options={{ title: t.history.title }}
      />
      <Stack.Screen
        name="HistoryDay"
        component={HistoryDayScreen}
        options={({ route }) => ({ title: formatDay(route.params.date, t) })}
        initialParams={paramsFor('HistoryDay')}
      />
    </Stack.Navigator>
  );
}
