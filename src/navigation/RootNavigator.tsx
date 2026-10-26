import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TodayScreen from '../screens/TodayScreen';
import PillEditScreen from '../screens/PillEditScreen';
import SoundPickerScreen from '../screens/SoundPickerScreen';
import RecordScreen from '../screens/RecordScreen';
import SetupScreen from '../screens/SetupScreen';

export type RootStackParamList = {
  Today: undefined;
  PillEdit: { pillId?: string };
  // The sound chosen here is set on card alarmId.
  SoundPicker: { alarmId: string; selectedSoundId: string | null };
  Record: { alarmId: string };
  Setup: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator({
  initialRouteName = 'Today',
  initialParams,
}: {
  initialRouteName?: keyof RootStackParamList;
  initialParams?: object;
}) {
  // Only the first screen takes params from outside (tests open any screen first).
  const paramsFor = (name: keyof RootStackParamList) =>
    name === initialRouteName ? (initialParams as never) : undefined;
  return (
    <Stack.Navigator initialRouteName={initialRouteName}>
      <Stack.Screen
        name="Today"
        component={TodayScreen}
        options={{ title: 'Today' }}
      />
      <Stack.Screen
        name="PillEdit"
        component={PillEditScreen}
        initialParams={paramsFor('PillEdit')}
      />
      <Stack.Screen
        name="SoundPicker"
        component={SoundPickerScreen}
        options={{ title: 'Sound' }}
        initialParams={paramsFor('SoundPicker')}
      />
      <Stack.Screen
        name="Record"
        component={RecordScreen}
        options={{ title: 'Record' }}
        initialParams={paramsFor('Record')}
      />
      <Stack.Screen
        name="Setup"
        component={SetupScreen}
        options={{ title: 'Make alarms reliable' }}
      />
    </Stack.Navigator>
  );
}
