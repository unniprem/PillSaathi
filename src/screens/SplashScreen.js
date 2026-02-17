/**
 * Splash Screen
 *
 * Initial loading screen displayed when the app starts.
 * Shows the PillSathi branding and a loading indicator while:
 * - Checking authentication state
 * - Loading user data
 * - Initializing app services
 *
 * This screen is automatically shown by RootNavigator during the
 * initial loading phase and transitions to the appropriate screen
 * based on authentication state.
 *
 * @format
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

/**
 * Splash Screen Component
 *
 * Displays app branding and loading indicator.
 * No user interaction is required on this screen.
 *
 * @returns {React.ReactElement} Splash screen component
 */
function SplashScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.title}>PillSathi</Text>
      <Text style={styles.subtitle}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 20,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
});

export default SplashScreen;
