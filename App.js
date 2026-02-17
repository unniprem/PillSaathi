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
import RootNavigator from './src/navigation/RootNavigator';

/**
 * Main App Component
 *
 * Sets up the application with:
 * - SafeAreaProvider for safe area handling
 * - StatusBar configuration
 * - Firebase initialization
 * - Environment variable testing
 * - Root navigation structure
 *
 * @returns {React.ReactElement} App component
 */
function App() {
  const isDarkMode = useColorScheme() === 'dark';

  // Initialize Firebase and test environment variable loading on app start
  useEffect(() => {
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
    testNavigationPersistence();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <RootNavigator />
    </SafeAreaProvider>
  );
}

export default App;
