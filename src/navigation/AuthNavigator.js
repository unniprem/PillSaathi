/**
 * Auth Navigator
 *
 * Manages authentication flow navigation:
 * - Login screen (phone number entry)
 * - Phone verification screen (OTP entry)
 * - Role selection screen (parent/caregiver)
 * - Profile setup screen (name, date of birth, email)
 *
 * This navigator is displayed when the user is not authenticated or
 * when the user needs to complete their profile.
 * After successful authentication, role selection, and profile completion,
 * the app navigates to the appropriate main navigator (Parent or Caregiver).
 *
 * @format
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthScreens } from '../types/navigation';
import { useAuth } from '../contexts/AuthContext';
import { requiresProfileSetup } from '../utils/profileUtils';

// Import screens
import PhoneAuthScreen from '../screens/auth/PhoneAuthScreen';
import OTPVerificationScreen from '../screens/auth/OTPVerificationScreen';
import RoleSelectionScreen from '../screens/auth/RoleSelectionScreen';
import ProfileSetupScreen from '../screens/auth/ProfileSetupScreen';

// Alias for consistency with navigation types
const PhoneVerificationScreen = OTPVerificationScreen;

const Stack = createNativeStackNavigator();

/**
 * Auth Navigator Component
 *
 * Stack navigator for authentication flow.
 * Screens are presented in order:
 * 1. Login - User enters phone number
 * 2. PhoneVerification - User enters OTP code
 * 3. RoleSelection - User selects role (parent/caregiver)
 * 4. ProfileSetup - User completes profile (name, DOB, email)
 *
 * The initial route is determined by the user's authentication and profile state:
 * - Not authenticated: Start at Login
 * - Authenticated with role but incomplete profile: Start at ProfileSetup
 *
 * @returns {React.ReactElement} Auth navigator component
 */
function AuthNavigator() {
  const { user, profile } = useAuth();

  // Determine initial route based on auth and profile state
  // Requirements 19.1, 19.2: Redirect to ProfileSetup if profile is incomplete
  const getInitialRouteName = () => {
    if (user && profile && profile.role && requiresProfileSetup(profile)) {
      return AuthScreens.PROFILE_SETUP;
    }
    return AuthScreens.LOGIN;
  };

  return (
    <Stack.Navigator
      initialRouteName={getInitialRouteName()}
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
        component={PhoneAuthScreen}
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
      <Stack.Screen
        name={AuthScreens.PROFILE_SETUP}
        component={ProfileSetupScreen}
        options={{
          title: 'Complete Profile',
          headerBackVisible: false, // Prevent going back after role selection
          gestureEnabled: false, // Disable swipe back gesture
        }}
      />
    </Stack.Navigator>
  );
}

export default AuthNavigator;
