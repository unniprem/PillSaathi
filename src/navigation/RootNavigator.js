/**
 * Root Navigator
 *
 * Top-level navigation structure for PillSathi app.
 * Manages navigation between:
 * - Splash screen (initial loading during auth state initialization)
 * - Auth flow (login, verification, role selection)
 * - Parent flow (parent-specific screens)
 * - Caregiver flow (caregiver-specific screens)
 *
 * Features:
 * - Navigation state persistence using AsyncStorage
 * - Automatic state restoration on app restart
 * - Auth state-based routing
 * - Role-based navigation access control
 *
 * Requirements:
 * - 2.3: Navigate based on existing role
 * - 2.5: Grant Parent users access to ParentNavigator
 * - 2.6: Grant Caregiver users access to CaregiverNavigator
 * - 4.2: Check for existing authentication state
 * - 4.3: Restore user session from valid state
 * - 5.1: Display only AuthNavigator for unauthenticated users
 * - 5.2: Display ParentNavigator for authenticated Parent users
 * - 5.3: Display CaregiverNavigator for authenticated Caregiver users
 * - 7.4: Display splash/loading screen during auth state initialization
 * - 19.1: Check if profile is complete after authentication
 * - 19.2: Redirect to ProfileSetupScreen if profile is incomplete
 * - 19.7: Allow direct navigation to dashboard if profile is complete
 *
 * @format
 */

import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootScreens } from '../types/navigation';
import { useAuth } from '../contexts/AuthContext';
import { requiresProfileSetup } from '../utils/profileUtils';

// Import navigators
import AuthNavigator from './AuthNavigator';
import ParentNavigator from './ParentNavigator';
import CaregiverNavigator from './CaregiverNavigator';

// Import screens
import SplashScreen from '../screens/SplashScreen';

const Stack = createNativeStackNavigator();

// AsyncStorage key for persisting navigation state
const NAVIGATION_STATE_KEY = '@navigation_state';

/**
 * Root Navigator Component
 *
 * Manages the top-level navigation flow based on authentication state:
 * 1. Shows splash screen while auth state is initializing
 * 2. Routes to Auth flow if not authenticated
 * 3. Routes to Parent or Caregiver flow based on user role
 *
 * Navigation State Persistence:
 * - Saves navigation state to AsyncStorage on state change
 * - Restores navigation state on app restart
 * - Handles state restoration gracefully with error handling
 *
 * Auth State Routing:
 * - Unauthenticated: Shows AuthNavigator (Requirement 5.1)
 * - Authenticated + No profile/role: Shows AuthNavigator for role selection
 * - Authenticated + Incomplete profile: Shows AuthNavigator for profile setup (Requirements 19.1, 19.2)
 * - Authenticated + Parent role + Complete profile: Shows ParentNavigator (Requirements 2.5, 5.2, 19.7)
 * - Authenticated + Caregiver role + Complete profile: Shows CaregiverNavigator (Requirements 2.6, 5.3, 19.7)
 *
 * @returns {React.ReactElement} Root navigator component
 */
function RootNavigator() {
  const { user, profile, initialized } = useAuth();
  const [initialState, setInitialState] = useState();
  const [isReady, setIsReady] = useState(false);
  const routeNameRef = useRef();
  const navigationRef = useRef();

  // Restore navigation state on mount
  useEffect(() => {
    const restoreState = async () => {
      try {
        // Restore navigation state from AsyncStorage
        const savedStateString = await AsyncStorage.getItem(
          NAVIGATION_STATE_KEY,
        );
        const state = savedStateString
          ? JSON.parse(savedStateString)
          : undefined;

        if (state !== undefined) {
          setInitialState(state);
        }
      } catch (e) {
        // Failed to restore state
        console.warn('Failed to restore navigation state:', e);
      } finally {
        setIsReady(true);
      }
    };

    if (!isReady) {
      restoreState();
    }
  }, [isReady]);

  // Don't render until we've restored navigation state
  if (!isReady) {
    return null;
  }

  // Determine which navigator to show based on auth state
  // Requirements: 5.1, 5.2, 5.3, 2.5, 2.6, 19.1, 19.2, 19.7
  // Note: Profile completion check logic is also available via useProfileCompletionCheck hook
  // for use in individual screens that need dynamic profile status checking
  const getNavigatorScreen = () => {
    // Show splash screen while auth state is initializing
    // Requirement 7.4: Display splash/loading screen during initialization
    if (!initialized) {
      return (
        <Stack.Screen name={RootScreens.SPLASH} component={SplashScreen} />
      );
    }

    // User is not authenticated - show auth flow
    // Requirement 5.1: Display only AuthNavigator for unauthenticated users
    if (!user) {
      return <Stack.Screen name={RootScreens.AUTH} component={AuthNavigator} />;
    }

    // User is authenticated but has no profile or role - show auth flow for role selection
    // Requirement 2.3: Navigate based on existing role
    if (!profile || !profile.role) {
      return <Stack.Screen name={RootScreens.AUTH} component={AuthNavigator} />;
    }

    // User is authenticated with role but profile is incomplete - show auth flow for profile setup
    // Requirements 19.1, 19.2, 19.7: Check profile completion and redirect if needed
    if (requiresProfileSetup(profile)) {
      return <Stack.Screen name={RootScreens.AUTH} component={AuthNavigator} />;
    }

    // User is authenticated with parent role - show parent navigator
    // Requirements 2.5, 5.2: Grant Parent users access to ParentNavigator
    if (profile.role === 'parent') {
      return (
        <Stack.Screen name={RootScreens.PARENT} component={ParentNavigator} />
      );
    }

    // User is authenticated with caregiver role - show caregiver navigator
    // Requirements 2.6, 5.3: Grant Caregiver users access to CaregiverNavigator
    if (profile.role === 'caregiver') {
      return (
        <Stack.Screen
          name={RootScreens.CAREGIVER}
          component={CaregiverNavigator}
        />
      );
    }

    // Fallback to auth flow if role is not recognized
    return <Stack.Screen name={RootScreens.AUTH} component={AuthNavigator} />;
  };

  return (
    <NavigationContainer
      ref={navigationRef}
      initialState={initialState}
      onReady={() => {
        // Save the initial route name
        routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name;
      }}
      onStateChange={async state => {
        // Get the current route name
        const previousRouteName = routeNameRef.current;
        const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;

        // Track screen changes (useful for analytics in the future)
        if (previousRouteName !== currentRouteName) {
          // eslint-disable-next-line no-console
          console.log('Navigation:', previousRouteName, '->', currentRouteName);
        }

        // Save the current route name for next comparison
        routeNameRef.current = currentRouteName;

        // Save navigation state to AsyncStorage
        try {
          await AsyncStorage.setItem(
            NAVIGATION_STATE_KEY,
            JSON.stringify(state),
          );
        } catch (e) {
          console.warn('Failed to save navigation state:', e);
        }
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        {getNavigatorScreen()}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default RootNavigator;
