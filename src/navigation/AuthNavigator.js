/**
 * Auth Navigator
 *
 * Manages authentication flow navigation:
 * - Login screen (phone number entry)
 * - Phone verification screen (OTP entry)
 * - Role selection screen (parent/caregiver)
 *
 * This navigator is displayed when the user is not authenticated.
 * After successful authentication and role selection, the app navigates
 * to the appropriate main navigator (Parent or Caregiver).
 *
 * @format
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthScreens } from '../types/navigation';

// Import screens
import LoginScreen from '../screens/auth/LoginScreen';

// Temporary placeholder components for screens not yet created
const PhoneVerificationScreen = () => {
  const { View, Text } = require('react-native');
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>Phone Verification</Text>
      <Text style={styles.placeholderSubtext}>OTP entry will go here</Text>
    </View>
  );
};

const RoleSelectionScreen = () => {
  const { View, Text } = require('react-native');
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>Role Selection</Text>
      <Text style={styles.placeholderSubtext}>
        Parent/Caregiver selection will go here
      </Text>
    </View>
  );
};

const Stack = createNativeStackNavigator();

/**
 * Auth Navigator Component
 *
 * Stack navigator for authentication flow.
 * Screens are presented in order:
 * 1. Login - User enters phone number
 * 2. PhoneVerification - User enters OTP code
 * 3. RoleSelection - User selects role (parent/caregiver)
 *
 * @returns {React.ReactElement} Auth navigator component
 */
function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName={AuthScreens.LOGIN}
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
        name={AuthScreens.LOGIN}
        component={LoginScreen}
        options={{
          title: 'Login',
          headerShown: false, // Hide header on login screen for cleaner look
        }}
      />
      <Stack.Screen
        name={AuthScreens.PHONE_VERIFICATION}
        component={PhoneVerificationScreen}
        options={{
          title: 'Verify Phone',
          headerBackVisible: true,
        }}
      />
      <Stack.Screen
        name={AuthScreens.ROLE_SELECTION}
        component={RoleSelectionScreen}
        options={{
          title: 'Select Role',
          headerBackVisible: false, // Prevent going back after verification
          gestureEnabled: false, // Disable swipe back gesture
        }}
      />
    </Stack.Navigator>
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

export default AuthNavigator;
