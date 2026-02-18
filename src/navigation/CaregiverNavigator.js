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
import { CaregiverScreens } from '../types/navigation';

// Placeholder screens (will be created in subsequent tasks)
import CaregiverHomeScreen from '../screens/caregiver/CaregiverHomeScreen';
import CaregiverPairingScreen from '../screens/caregiver/CaregiverPairingScreen';
import CaregiverMedicineList from '../screens/caregiver/CaregiverMedicineList';
import MedicineFormScreen from '../screens/caregiver/MedicineFormScreen';
import ParentDetailScreen from '../screens/caregiver/ParentDetailScreen';
import EditProfileScreen from '../screens/shared/EditProfileScreen';
import LogoutHeader from '../components/LogoutHeader';
// import CaregiverProfileScreen from '../screens/caregiver/CaregiverProfileScreen';
// import ParentListScreen from '../screens/caregiver/ParentListScreen';
// import MedicineDetailsScreen from '../screens/caregiver/MedicineDetailsScreen';
// import AlarmScreen from '../screens/caregiver/AlarmScreen';
// import NotificationsScreen from '../screens/caregiver/NotificationsScreen';
// import SettingsScreen from '../screens/caregiver/SettingsScreen';

// Temporary placeholder components for development

const CaregiverProfileScreen = () => {
  const { View, Text } = require('react-native');
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>Caregiver Profile</Text>
      <Text style={styles.placeholderSubtext}>Profile information</Text>
    </View>
  );
};

const ParentListScreen = () => {
  const { View, Text } = require('react-native');
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>Parent List</Text>
      <Text style={styles.placeholderSubtext}>
        List of parents you care for
      </Text>
    </View>
  );
};

const MedicineDetailsScreen = () => {
  const { View, Text } = require('react-native');
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>Medicine Details</Text>
      <Text style={styles.placeholderSubtext}>View medicine information</Text>
    </View>
  );
};

const AlarmScreen = () => {
  const { View, Text } = require('react-native');
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>Alarm</Text>
      <Text style={styles.placeholderSubtext}>Medicine reminder</Text>
    </View>
  );
};

const NotificationsScreen = () => {
  const { View, Text } = require('react-native');
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>Notifications</Text>
      <Text style={styles.placeholderSubtext}>View notifications</Text>
    </View>
  );
};

const SettingsScreen = () => {
  const { View, Text } = require('react-native');
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>Settings</Text>
      <Text style={styles.placeholderSubtext}>App settings</Text>
    </View>
  );
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

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
        headerTintColor: '#007AFF',
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTitleStyle: {
          fontWeight: '600',
        },
        animation: 'slide_from_right',
        headerRight: () => <LogoutHeader />,
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
        name={CaregiverScreens.PARENT_LIST}
        component={ParentListScreen}
        options={{
          title: 'Parents',
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
        name={CaregiverScreens.ALARM}
        component={AlarmScreen}
        options={{
          title: 'Alarm',
          presentation: 'fullScreenModal',
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
    </Stack.Navigator>
  );
}

/**
 * Profile Stack Navigator
 *
 * Stack navigator for profile-related screens.
 * Includes profile, notifications, and settings.
 *
 * @returns {React.ReactElement} Profile stack navigator
 */
function ProfileStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerBackTitleVisible: false,
        headerTintColor: '#007AFF',
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTitleStyle: {
          fontWeight: '600',
        },
        animation: 'slide_from_right',
        headerRight: () => <LogoutHeader />,
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
        name={CaregiverScreens.EDIT_PROFILE}
        component={EditProfileScreen}
        options={{
          title: 'Edit Profile',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name={CaregiverScreens.NOTIFICATIONS}
        component={NotificationsScreen}
        options={{
          title: 'Notifications',
        }}
      />
      <Stack.Screen
        name={CaregiverScreens.SETTINGS}
        component={SettingsScreen}
        options={{
          title: 'Settings',
        }}
      />
    </Stack.Navigator>
  );
}

/**
 * Caregiver Navigator Component
 *
 * Bottom tab navigator for caregiver-specific screens.
 * Tabs:
 * 1. Home - Dashboard, parent list, medicine details, alarms
 * 2. Profile - User profile, notifications, settings
 *
 * @returns {React.ReactElement} Caregiver navigator component
 */
function CaregiverNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
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
        name="ProfileTab"
        component={ProfileStack}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => {
            const { Text } = require('react-native');
            return <Text style={{ fontSize: size, color }}>👤</Text>;
          },
        }}
      />
    </Tab.Navigator>
  );
}

// Placeholder styles
const { StyleSheet } = require('react-native');
const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
});

export default CaregiverNavigator;
