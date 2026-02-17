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

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Animated,
} from 'react-native';

/**
 * Splash Screen Component
 *
 * Displays app branding and loading indicator with smooth fade-in animation.
 * No user interaction is required on this screen.
 *
 * Requirements: 7.4 - Display splash/loading screen during auth state initialization
 *
 * @component
 * @returns {React.ReactElement} Splash screen component
 *
 * @example
 * // Used by RootNavigator during initial loading
 * <Stack.Screen name="Splash" component={SplashScreen} />
 */
function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Text style={styles.title}>PillSathi</Text>
        <Text style={styles.subtitle}>Medication Management Made Easy</Text>
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
        <Text style={styles.loadingText}>Loading...</Text>
      </Animated.View>
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
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 40,
  },
  loader: {
    marginVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#999999',
    marginTop: 8,
  },
});

export default SplashScreen;
