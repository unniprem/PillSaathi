import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AlarmListScreen from '../screens/AlarmListScreen';
import AlarmEditScreen from '../screens/AlarmEditScreen';
import SoundPickerScreen from '../screens/SoundPickerScreen';
import RecordScreen from '../screens/RecordScreen';
import SetupScreen from '../screens/SetupScreen';

export type RootStackParamList = {
  AlarmList: undefined;
  // pickedSoundId: undefined = no pick yet; null = "Default alarm tone" picked
  AlarmEdit: { alarmId?: string; pickedSoundId?: string | null };
  SoundPicker: { selectedSoundId: string | null };
  Record: undefined;
  Setup: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator({
  initialRouteName = 'AlarmList',
  initialParams,
}: {
  initialRouteName?: keyof RootStackParamList;
  initialParams?: object;
}) {
  return (
    <Stack.Navigator initialRouteName={initialRouteName}>
      <Stack.Screen
        name="AlarmList"
        component={AlarmListScreen}
        options={{ title: 'Alarms' }}
      />
      <Stack.Screen
        name="AlarmEdit"
        component={AlarmEditScreen}
        initialParams={
          initialRouteName === 'AlarmEdit' ? initialParams : undefined
        }
      />
      <Stack.Screen
        name="SoundPicker"
        component={SoundPickerScreen}
        options={{ title: 'Alarm sound' }}
        initialParams={
          initialRouteName === 'SoundPicker'
            ? (initialParams as RootStackParamList['SoundPicker'])
            : undefined
        }
      />
      <Stack.Screen
        name="Record"
        component={RecordScreen}
        options={{ title: 'Record' }}
      />
      <Stack.Screen
        name="Setup"
        component={SetupScreen}
        options={{ title: 'Set up' }}
      />
    </Stack.Navigator>
  );
}
