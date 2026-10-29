import React from 'react';
import type {
  CompositeScreenProps,
  NavigatorScreenParams,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type {
  BottomTabBarProps,
  BottomTabScreenProps,
} from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { I18nProvider } from '../i18n';
import LoginScreen from '../screens/LoginScreen';
import WhoScreen from '../screens/WhoScreen';
import TodayScreen from '../screens/TodayScreen';
import PillEditScreen from '../screens/PillEditScreen';
import SoundPickerScreen from '../screens/SoundPickerScreen';
import SetupScreen from '../screens/SetupScreen';
import SettingsScreen from '../screens/SettingsScreen';
import HistoryScreen from '../screens/HistoryScreen';
import HistoryDayScreen from '../screens/HistoryDayScreen';
import FamilyScreen from '../screens/FamilyScreen';
import ShareCodeScreen from '../screens/ShareCodeScreen';
import AddFamilyScreen from '../screens/AddFamilyScreen';
import ElderScreen from '../screens/ElderScreen';
import FollowEditScreen from '../screens/FollowEditScreen';
import ElderPillsScreen from '../screens/ElderPillsScreen';
import TabBar from '../ui/TabBar';

/** The main pages, one per bottom tab. History is this phone's own. */
export type TabParamList = {
  Today: undefined;
  History: undefined;
  Family: undefined;
  Settings: undefined;
};

export const TAB_ROUTES: (keyof TabParamList)[] = [
  'Today',
  'History',
  'Family',
  'Settings',
];

export type RootStackParamList = {
  // again: the phone was asked who it is for before, so the login goes straight to Today.
  Login: { again?: boolean } | undefined;
  // first: the Google first name to greet, or null without a login.
  Who: { first: string | null };
  Main: NavigatorScreenParams<TabParamList> | undefined;
  // focusCount opens at Tablets left, from the running-low banner. elderId edits her pill, on a
  // relative's phone: Save sends the change to her phone.
  PillEdit: { pillId?: string; focusCount?: boolean; elderId?: string };
  // The sound chosen here is set on card alarmId, or, with elderId, sent for her dose at
  // hour:minute.
  SoundPicker: {
    alarmId?: string;
    selectedSoundId: string | null;
    elderId?: string;
    hour?: number;
    minute?: number;
  };
  // firstRun: shown once after the login, with no page behind it.
  Setup: { firstRun?: boolean } | undefined;
  // An elder's History, read-only, on a relative's phone.
  ElderHistory: { elderId: string };
  HistoryDay: { date: string; elderId?: string }; // YYYY-MM-DD
  ShareCode: undefined;
  // fromLogin: straight after the login, with no page behind it.
  AddFamily: { fromLogin?: boolean } | undefined;
  Elder: { elderId: string };
  ElderPills: { elderId: string };
  FollowEdit: { elderId: string };
};

/** A tab's props: from a tab, every page of the stack around it can be opened too. */
export type TabProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

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

const renderTabBar = (props: BottomTabBarProps) => <TabBar {...props} />;

/** The four main pages under the tab bar. Each page draws its own sky, so none has a header. */
function Main() {
  return (
    <Tab.Navigator tabBar={renderTabBar} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Today" component={TodayScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Family" component={FamilyScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function RootStack({ initialRouteName = 'Main', initialParams }: Props) {
  // Only the first screen takes params from outside (tests open any screen first).
  const paramsFor = (name: keyof RootStackParamList) =>
    name === initialRouteName ? (initialParams as never) : undefined;
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        initialParams={paramsFor('Login')}
      />
      <Stack.Screen
        name="Who"
        component={WhoScreen}
        initialParams={paramsFor('Who')}
      />
      <Stack.Screen
        name="Main"
        component={Main}
        initialParams={paramsFor('Main')}
      />
      <Stack.Screen
        name="PillEdit"
        component={PillEditScreen}
        initialParams={paramsFor('PillEdit')}
      />
      <Stack.Screen
        name="SoundPicker"
        component={SoundPickerScreen}
        initialParams={paramsFor('SoundPicker')}
      />
      <Stack.Screen
        name="Setup"
        component={SetupScreen}
        initialParams={paramsFor('Setup')}
      />
      <Stack.Screen
        name="ElderHistory"
        component={HistoryScreen}
        initialParams={paramsFor('ElderHistory')}
      />
      <Stack.Screen
        name="HistoryDay"
        component={HistoryDayScreen}
        initialParams={paramsFor('HistoryDay')}
      />
      <Stack.Screen name="ShareCode" component={ShareCodeScreen} />
      <Stack.Screen
        name="AddFamily"
        component={AddFamilyScreen}
        initialParams={paramsFor('AddFamily')}
      />
      <Stack.Screen
        name="Elder"
        component={ElderScreen}
        initialParams={paramsFor('Elder')}
      />
      <Stack.Screen
        name="FollowEdit"
        component={FollowEditScreen}
        initialParams={paramsFor('FollowEdit')}
      />
      <Stack.Screen
        name="ElderPills"
        component={ElderPillsScreen}
        initialParams={paramsFor('ElderPills')}
      />
    </Stack.Navigator>
  );
}
