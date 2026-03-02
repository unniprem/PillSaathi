/**
 * Parent Navigator
 *
 * Manages parent-specific navigation flow:
 * - Home screen (dashboard with medicine overview)
 * - Medicine management (list, add, edit)
 * - Caregiver management (list, add, remove)
 * - Profile and settings
 *
 * This navigator is displayed when a user with 'parent' role is authenticated.
 * Parents can manage medicines, caregivers, and view notifications.
 *
 * @format
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ParentScreens } from '../types/navigation';

// Placeholder screens (will be created in subsequent tasks)
import ParentHomeScreen from '../screens/parent/ParentHomeScreen';
import ParentPairingScreen from '../screens/parent/ParentPairingScreen';
import ParentMedicineView from '../screens/parent/ParentMedicineView';
import ParentMedicineDetailScreen from '../screens/parent/ParentMedicineDetailScreen';
import UpcomingDoses from '../screens/parent/UpcomingDoses';
import ParentUpcomingScreen from '../screens/parent/ParentUpcomingScreen';
import EditProfileScreen from '../screens/shared/EditProfileScreen';
import HeaderActions from '../components/HeaderActions';
import FullScreenAlarmScreen from '../screens/parent/FullScreenAlarmScreen';
import AlarmDiagnosticScreen from '../screens/parent/AlarmDiagnosticScreen';
import ParentProfileScreen from '../screens/parent/ParentProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

/**
 * Home Stack Navigator
 *
 * Stack navigator for home-related screens.
 * Includes home screen and related views.
 *
 * @returns {React.ReactElement} Home stack navigator
 */
function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerBackTitleVisible: false,
        headerTintColor: '#4e8ea2',
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTitleStyle: {
          fontWeight: '600',
        },
        animation: 'slide_from_right',
        headerRight: () => <HeaderActions />,
      }}
    >
      <Stack.Screen
        name={ParentScreens.HOME}
        component={ParentHomeScreen}
        options={{
          title: 'Home',
        }}
      />
      <Stack.Screen
        name="AlarmDiagnostic"
        component={AlarmDiagnosticScreen}
        options={{
          title: 'Alarm Diagnostics',
        }}
      />
      <Stack.Screen
        name={ParentScreens.PAIRING}
        component={ParentPairingScreen}
        options={{
          title: 'Pairing & Relationships',
        }}
      />
      <Stack.Screen
        name={ParentScreens.MEDICINE_VIEW}
        component={ParentMedicineView}
        options={{
          title: 'My Medicines',
        }}
      />
      <Stack.Screen
        name={ParentScreens.MEDICINE_DETAILS}
        component={ParentMedicineDetailScreen}
        options={{
          title: 'Medicine Details',
        }}
      />
      <Stack.Screen
        name={ParentScreens.UPCOMING_DOSES}
        component={UpcomingDoses}
        options={{
          title: 'Upcoming Doses',
        }}
      />
    </Stack.Navigator>
  );
}

/**
 * Profile Stack Navigator
 *
 * Stack navigator for profile-related screens.
 * Includes profile, caregiver management, and edit profile.
 *
 * This stack is not part of the bottom tabs; it is opened
 * via the Profile icon in the header as a separate route.
 *
 * @returns {React.ReactElement} Profile stack navigator
 */
function ProfileStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerBackTitleVisible: false,
        headerTintColor: '#4e8ea2',
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTitleStyle: {
          fontWeight: '600',
        },
        animation: 'slide_from_right',
        headerRight: () => <HeaderActions />,
      }}
    >
      <Stack.Screen
        name={ParentScreens.PROFILE}
        component={ParentProfileScreen}
        options={{
          title: 'Profile',
        }}
      />
      <Stack.Screen
        name={ParentScreens.EDIT_PROFILE}
        component={EditProfileScreen}
        options={{
          title: 'Edit Profile',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name={ParentScreens.PAIRING}
        component={ParentPairingScreen}
        options={{
          title: 'Manage Caregivers',
        }}
      />
    </Stack.Navigator>
  );
}

/**
 * Medicines Stack Navigator
 *
 * Stack navigator for medicines tab.
 * Shows all medicines with ability to view details.
 *
 * Requirements: 17.1
 *
 * @returns {React.ReactElement} Medicines stack navigator
 */
function MedicinesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerBackTitleVisible: false,
        headerTintColor: '#4e8ea2',
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTitleStyle: {
          fontWeight: '600',
        },
        animation: 'slide_from_right',
        headerRight: () => <HeaderActions />,
      }}
    >
      <Stack.Screen
        name={ParentScreens.MEDICINE_VIEW}
        component={ParentMedicineView}
        options={{
          title: 'My Medicines',
        }}
      />
      <Stack.Screen
        name={ParentScreens.MEDICINE_DETAILS}
        component={ParentMedicineDetailScreen}
        options={{
          title: 'Medicine Details',
        }}
      />
    </Stack.Navigator>
  );
}

/**
 * Parent Navigator Component
 *
 * Bottom tab navigator for parent-specific screens.
 * Tabs:
 * 1. Home - Dashboard with upcoming doses (4 hours)
 * 2. Medicines - All medicines with mark as taken
 * 3. Profile (opened via header, not tab) - User profile, medicine/caregiver management, notifications, settings
 *
 * Requirements: 17.1
 *
 * @returns {React.ReactElement} Parent navigator component
 */
function ParentTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#FFFFFF',
        tabBarStyle: {
          backgroundColor: '#4e8ea2',
          borderTopWidth: 0,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => {
            const { Text } = require('react-native');
            return <Text style={{ fontSize: size, color }}>🏠</Text>;
          },
        }}
      />
      <Tab.Screen
        name="MedicinesTab"
        component={MedicinesStack}
        options={{
          tabBarLabel: 'Medicines',
          tabBarIcon: ({ color, size }) => {
            const { Text } = require('react-native');
            return <Text style={{ fontSize: size, color }}>💊</Text>;
          },
        }}
      />
    </Tab.Navigator>
  );
}

/**
 * Parent Navigator with Modal Screens
 *
 * Wraps the tab navigator with modal screens like FullScreenAlarm.
 * This allows the alarm screen to appear over all other screens.
 *
 * Requirements: 2.1, 3.9
 *
 * @returns {React.ReactElement} Parent navigator with modals
 */
function ParentNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="ParentTabs" component={ParentTabNavigator} />
      <Stack.Screen name="ParentProfile" component={ProfileStack} />
      <Stack.Screen
        name={ParentScreens.FULL_SCREEN_ALARM}
        component={FullScreenAlarmScreen}
        options={{
          presentation: 'fullScreenModal',
          animation: 'fade',
          gestureEnabled: false,
        }}
      />
    </Stack.Navigator>
  );
}

export default ParentNavigator;
