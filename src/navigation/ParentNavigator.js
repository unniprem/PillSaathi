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
// import ParentProfileScreen from '../screens/parent/ParentProfileScreen';
// import MedicineListScreen from '../screens/parent/MedicineListScreen';
// import AddMedicineScreen from '../screens/parent/AddMedicineScreen';
// import EditMedicineScreen from '../screens/parent/EditMedicineScreen';
// import CaregiverManagementScreen from '../screens/parent/CaregiverManagementScreen';
// import AddCaregiverScreen from '../screens/parent/AddCaregiverScreen';
// import NotificationsScreen from '../screens/parent/NotificationsScreen';
// import SettingsScreen from '../screens/parent/SettingsScreen';

// Temporary placeholder components for development

const ParentProfileScreen = () => {
  const { View, Text } = require('react-native');
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>Parent Profile</Text>
      <Text style={styles.placeholderSubtext}>Profile information</Text>
    </View>
  );
};

const MedicineListScreen = () => {
  const { View, Text } = require('react-native');
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>Medicine List</Text>
      <Text style={styles.placeholderSubtext}>List of all medicines</Text>
    </View>
  );
};

const AddMedicineScreen = () => {
  const { View, Text } = require('react-native');
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>Add Medicine</Text>
      <Text style={styles.placeholderSubtext}>Add new medicine form</Text>
    </View>
  );
};

const EditMedicineScreen = () => {
  const { View, Text } = require('react-native');
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>Edit Medicine</Text>
      <Text style={styles.placeholderSubtext}>Edit medicine details</Text>
    </View>
  );
};

const CaregiverManagementScreen = () => {
  const { View, Text } = require('react-native');
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>Caregiver Management</Text>
      <Text style={styles.placeholderSubtext}>Manage caregivers</Text>
    </View>
  );
};

const AddCaregiverScreen = () => {
  const { View, Text } = require('react-native');
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>Add Caregiver</Text>
      <Text style={styles.placeholderSubtext}>Add new caregiver</Text>
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
 * Includes home screen and medicine management screens.
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
        name={ParentScreens.MEDICINE_LIST}
        component={MedicineListScreen}
        options={{
          title: 'Medicines',
        }}
      />
      <Stack.Screen
        name={ParentScreens.ADD_MEDICINE}
        component={AddMedicineScreen}
        options={{
          title: 'Add Medicine',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name={ParentScreens.EDIT_MEDICINE}
        component={EditMedicineScreen}
        options={{
          title: 'Edit Medicine',
        }}
      />
      <Stack.Screen
        name={ParentScreens.CAREGIVER_MANAGEMENT}
        component={CaregiverManagementScreen}
        options={{
          title: 'Caregivers',
        }}
      />
      <Stack.Screen
        name={ParentScreens.ADD_CAREGIVER}
        component={AddCaregiverScreen}
        options={{
          title: 'Add Caregiver',
          presentation: 'modal',
        }}
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
        name={ParentScreens.NOTIFICATIONS}
        component={NotificationsScreen}
        options={{
          title: 'Notifications',
        }}
      />
      <Stack.Screen
        name={ParentScreens.SETTINGS}
        component={SettingsScreen}
        options={{
          title: 'Settings',
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
 * 1. Home - Dashboard, medicine list, caregiver management
 * 2. Profile - User profile, notifications, settings
 *
 * @returns {React.ReactElement} Parent navigator component
 */
function ParentNavigator() {
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

export default ParentNavigator;
