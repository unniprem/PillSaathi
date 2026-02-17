/**
 * Root Navigator
 *
 * Top-level navigation structure for PillSathi app.
 * Manages navigation between:
 * - Splash screen (initial loading)
 * - Auth flow (login, verification, role selection)
 * - Parent flow (parent-specific screens)
 * - Caregiver flow (caregiver-specific screens)
 *
 * Features:
 * - Navigation state persistence using AsyncStorage
 * - Automatic state restoration on app restart
 *
 * @format
 */

import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootScreens } from '../types/navigation';

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
 * Manages the top-level navigation flow:
 * 1. Shows splash screen while checking auth state
 * 2. Routes to Auth flow if not authenticated
 * 3. Routes to Parent or Caregiver flow based on user role
 *
 * Navigation State Persistence:
 * - Saves navigation state to AsyncStorage on state change
 * - Restores navigation state on app restart
 * - Handles state restoration gracefully with error handling
 *
 * @returns {React.ReactElement} Root navigator component
 */
function RootNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  // eslint-disable-next-line no-unused-vars
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [userRole, setUserRole] = useState(null); // 'parent' | 'caregiver' | null
  const [initialState, setInitialState] = useState();
  const [isReady, setIsReady] = useState(false);
  const routeNameRef = useRef();
  const navigationRef = useRef();

  useEffect(() => {
    // Restore navigation state and check auth
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

  useEffect(() => {
    // Simulate initial loading and auth check
    // In Phase 1, this will check Firebase auth state
    const checkAuthState = async () => {
      try {
        // TODO: Check Firebase auth state
        // const user = await auth().currentUser;
        // if (user) {
        //   const userDoc = await firestore().collection('users').doc(user.uid).get();
        //   setUserRole(userDoc.data()?.role);
        //   setIsAuthenticated(true);
        // }

        // For now, just simulate loading delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsLoading(false);
      } catch (error) {
        console.error('Error checking auth state:', error);
        setIsLoading(false);
      }
    };

    checkAuthState();
  }, []);

  // Don't render until we've restored state
  if (!isReady) {
    return null;
  }

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
        {isLoading ? (
          // Show splash screen while loading
          <Stack.Screen name={RootScreens.SPLASH} component={SplashScreen} />
        ) : !isAuthenticated ? (
          // Show auth flow if not authenticated
          <Stack.Screen name={RootScreens.AUTH} component={AuthNavigator} />
        ) : userRole === 'parent' ? (
          // Show parent flow if authenticated as parent
          <Stack.Screen name={RootScreens.PARENT} component={ParentNavigator} />
        ) : userRole === 'caregiver' ? (
          // Show caregiver flow if authenticated as caregiver
          <Stack.Screen
            name={RootScreens.CAREGIVER}
            component={CaregiverNavigator}
          />
        ) : (
          // Fallback to auth if role is not set
          <Stack.Screen name={RootScreens.AUTH} component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default RootNavigator;
