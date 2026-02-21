/**
 * PillSathi App
 * Main application entry point
 *
 * @format
 */

import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { logEnvTest } from './src/utils/envTest';
import { initializeFirebase } from './src/config/firebase';
import { testNavigationPersistence } from './src/utils/navigationPersistence';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { PairingProvider } from './src/contexts/PairingContext';
import { ParentPairingProvider } from './src/contexts/ParentPairingContext';
import { CaregiverPairingProvider } from './src/contexts/CaregiverPairingContext';
import RootNavigator from './src/navigation/RootNavigator';
import doseGenerationService from './src/services/doseGenerationService';
import alarmInitializer from './src/services/alarmInitializer';
import notificationHandler from './src/services/notificationHandler';
import AlarmSync from './src/components/AlarmSync';

/**
 * Auto Cleanup Component
 * Runs dose cleanup every 4 hours for authenticated parents
 */
function AutoCleanup() {
  const { user, profile } = useAuth();

  useEffect(() => {
    if (!user || profile?.role !== 'parent') {
      return;
    }

    // Run cleanup immediately on mount
    const runCleanup = async () => {
      try {
        console.log('Running automatic dose cleanup...');
        await doseGenerationService.cleanupOldDoses(user.uid);
        console.log('Automatic dose cleanup completed');
      } catch (error) {
        console.error('Auto cleanup error:', error);
      }
    };

    runCleanup();

    // Set up interval to run every 4 hours (4 * 60 * 60 * 1000 ms)
    const intervalId = setInterval(runCleanup, 4 * 60 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [user, profile]);

  return null;
}

/**
 * Main App Component
 *
 * Sets up the application with:
 * - AuthProvider for authentication state management
 * - PairingProvider for pairing and relationship state management
 * - SafeAreaProvider for safe area handling
 * - StatusBar configuration
 * - Firebase initialization
 * - Environment variable testing
 * - Root navigation structure
 *
 * Requirements: 4.6 - Provide auth state via context to all components
 * Requirements: 1.1, 4.1, 5.1 - Provide pairing state via context to all components
 *
 * @component
 * @returns {React.ReactElement} App component
 *
 * @example
 * // App is the root component, imported in index.js
 * import App from './App';
 * AppRegistry.registerComponent(appName, () => App);
 */
function App() {
  const isDarkMode = useColorScheme() === 'dark';

  // Initialize Firebase and test environment variable loading on app start
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // eslint-disable-next-line no-console
        console.log('\n🔧 Testing environment variable loading...\n');
        const success = logEnvTest();
        if (success) {
          // eslint-disable-next-line no-console
          console.log('\n✅ Environment variables loaded successfully!\n');
        } else {
          console.error('\n❌ Environment variable loading failed!\n');
        }

        // Initialize Firebase with environment variables
        // eslint-disable-next-line no-console
        console.log('\n🔥 Initializing Firebase...\n');
        const firebaseInitialized = initializeFirebase();
        if (firebaseInitialized) {
          // eslint-disable-next-line no-console
          console.log('\n✅ Firebase initialized successfully!\n');
        } else {
          console.error('\n❌ Firebase initialization failed!\n');
        }

        // Test navigation state persistence
        await testNavigationPersistence();

        // Initialize alarm system
        // eslint-disable-next-line no-console
        console.log('\n🔔 Initializing alarm system...\n');
        const alarmInitialized = await alarmInitializer.initialize();
        if (alarmInitialized) {
          // eslint-disable-next-line no-console
          console.log('\n✅ Alarm system initialized successfully!\n');
        } else {
          console.error('\n❌ Alarm system initialization failed!\n');
        }

        // Initialize notification handlers
        // eslint-disable-next-line no-console
        console.log('\n📬 Initializing notification handlers...\n');
        notificationHandler.initialize();
        // eslint-disable-next-line no-console
        console.log('\n✅ Notification handlers initialized successfully!\n');
      } catch (error) {
        console.error('\n❌ App initialization error:', error);
      }
    };

    initializeApp();
  }, []);

  return (
    <AuthProvider>
      <PairingProvider>
        <ParentPairingProvider>
          <CaregiverPairingProvider>
            <SafeAreaProvider>
              <StatusBar
                barStyle={isDarkMode ? 'light-content' : 'dark-content'}
              />
              <AlarmSync />
              <AutoCleanup />
              <RootNavigator />
            </SafeAreaProvider>
          </CaregiverPairingProvider>
        </ParentPairingProvider>
      </PairingProvider>
    </AuthProvider>
  );
}

export default App;
