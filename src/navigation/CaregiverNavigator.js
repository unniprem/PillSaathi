/**
 * Caregiver Navigator
 *
 * Manages caregiver-specific navigation flow:
 * - Home screen (dashboard with medicine schedule)
 * - Parent list (parents they care for)
 * - Medicine details (view medicine information)
 * - Alarm screen (medicine reminder)
 * - Profile and settings
 *
 * This navigator is displayed when a user with 'caregiver' role is authenticated.
 * Caregivers can view medicine schedules, manage alarms, and view parent information.
 *
 * @format
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { CaregiverScreens } from '../types/navigation';

// Placeholder screens (will be created in subsequent tasks)
import CaregiverHomeScreen from '../screens/caregiver/CaregiverHomeScreen';
import CaregiverPairingScreen from '../screens/caregiver/CaregiverPairingScreen';
import CaregiverDoseHistoryScreen from '../screens/caregiver/CaregiverDoseHistoryScreen';
import CaregiverMedicineList from '../screens/caregiver/CaregiverMedicineList';
import MedicineFormScreen from '../screens/caregiver/MedicineFormScreen';
import ParentDetailScreen from '../screens/caregiver/ParentDetailScreen';
import AdherenceDashboardScreen from '../screens/caregiver/AdherenceDashboardScreen';
import MissedDosesListScreen from '../screens/caregiver/MissedDosesListScreen';
import EditProfileScreen from '../screens/shared/EditProfileScreen';
import MedicineDetailsScreen from '../screens/shared/MedicineDetailsScreen';
import HeaderActions from '../components/HeaderActions';
import CaregiverProfileScreen from '../screens/caregiver/CaregiverProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

/**
 * Home Stack Navigator
 *
 * Stack navigator for home-related screens.
 * Includes home screen, parent list, medicine details, and alarm screens.
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
        name={CaregiverScreens.HOME}
        component={CaregiverHomeScreen}
        options={{
          title: 'Home',
        }}
      />
      <Stack.Screen
        name={CaregiverScreens.PARENT_DETAIL}
        component={ParentDetailScreen}
        options={{
          title: 'Parent Details',
        }}
      />
      <Stack.Screen
        name={CaregiverScreens.MEDICINE_DETAILS}
        component={MedicineDetailsScreen}
        options={{
          title: 'Medicine Details',
        }}
      />
      <Stack.Screen
        name={CaregiverScreens.MEDICINE_LIST}
        component={CaregiverMedicineList}
        options={{
          title: 'Medicines',
        }}
      />
      <Stack.Screen
        name={CaregiverScreens.MEDICINE_FORM}
        component={MedicineFormScreen}
        options={({ route }) => ({
          title: route.params?.medicineId ? 'Edit Medicine' : 'Add Medicine',
          presentation: 'modal',
        })}
      />
      <Stack.Screen
        name={CaregiverScreens.ADHERENCE_DASHBOARD}
        component={AdherenceDashboardScreen}
        options={{
          title: 'Adherence Dashboard',
        }}
      />
      <Stack.Screen
        name={CaregiverScreens.MISSED_DOSES}
        component={MissedDosesListScreen}
        options={{
          title: 'Missed Doses',
        }}
      />
      <Stack.Screen
        name={CaregiverScreens.UPCOMING}
        component={CaregiverDoseHistoryScreen}
        options={{
          title: 'Dose History',
        }}
      />
    </Stack.Navigator>
  );
}

/**
 * Upcoming Stack Navigator
 *
 * Stack navigator for dose history tab.
 * Shows all doses (taken and missed) across all paired parents.
 *
 * @returns {React.ReactElement} Dose history stack navigator
 */
function UpcomingStack() {
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
        name={CaregiverScreens.UPCOMING}
        component={CaregiverDoseHistoryScreen}
        options={{
          title: 'Dose History',
        }}
      />
    </Stack.Navigator>
  );
}

/**
 * Profile Stack Navigator
 *
 * Stack navigator for profile-related screens.
 * Includes profile, pairing, and edit profile.
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
        name={CaregiverScreens.PROFILE}
        component={CaregiverProfileScreen}
        options={{
          title: 'Profile',
        }}
      />
      <Stack.Screen
        name={CaregiverScreens.PAIRING}
        component={CaregiverPairingScreen}
        options={{
          title: 'Pairing & Relationships',
        }}
      />
      <Stack.Screen
        name={CaregiverScreens.EDIT_PROFILE}
        component={EditProfileScreen}
        options={{
          title: 'Edit Profile',
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
}

/**
 * Caregiver Tabs Component
 *
 * Bottom tab navigator for caregiver-specific main screens.
 * Tabs:
 * 1. Home - Dashboard, parent list, medicine details, alarms
 * 2. Upcoming - All upcoming medicines across all parents
 * 3. Pairing - Pairing and relationship management
 *
 * Profile is available as a separate route, opened via the header icon.
 *
 * @returns {React.ReactElement} Caregiver tabs component
 */
function CaregiverTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#FFFFFF',
        tabBarShowLabel: false,
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
          tabBarIcon: ({ color, size }) => {
            return <Ionicons name="medkit" size={size} color={color} />;
          },
        }}
      />
      <Tab.Screen
        name="UpcomingTab"
        component={UpcomingStack}
        options={{
          tabBarIcon: ({ color, size }) => {
            return <Ionicons name="document-text" size={size} color={color} />;
          },
        }}
      />
      {/* Pairing is accessible from the Profile view and not shown as a tab */}
    </Tab.Navigator>
  );
}

/**
 * Caregiver Navigator Component
 *
 * Wraps the caregiver tabs with additional routes like the profile stack.
 * Profile is not a tab; it is opened via the header Profile icon.
 *
 * @returns {React.ReactElement} Caregiver navigator component
 */
function CaregiverNavigator() {
  return (
    <RootStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <RootStack.Screen name="CaregiverTabs" component={CaregiverTabs} />
      <RootStack.Screen name="CaregiverProfile" component={ProfileStack} />
    </RootStack.Navigator>
  );
}

export default CaregiverNavigator;
