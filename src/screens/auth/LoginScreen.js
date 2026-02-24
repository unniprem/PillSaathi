/**
 * Login Screen
 *
 * Authentication entry point where users enter their phone number.
 * This is a placeholder screen that will be implemented in Phase 1.
 *
 * Future implementation will include:
 * - Phone number input field
 * - Country code selector
 * - Send OTP button
 * - Firebase phone authentication integration
 *
 * @format
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthScreens } from '../../types/navigation';

/**
 * Login Screen Component
 *
 * Placeholder for phone number authentication screen.
 * Will be fully implemented in Phase 1: Authentication & User Management.
 *
 * Includes test navigation buttons to verify back navigation functionality.
 *
 * @returns {React.ReactElement} Login screen component
 */
function LoginScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <Text style={styles.subtitle}>Phone number entry will go here</Text>

      {/* Test navigation buttons */}
      <View style={styles.testButtonsContainer}>
        <Text style={styles.testLabel}>Test Navigation:</Text>
        <TouchableOpacity
          style={styles.testButton}
          onPress={() => navigation.navigate(AuthScreens.PHONE_VERIFICATION)}
        >
          <Text style={styles.testButtonText}>
            Go to Phone Verification (Back Enabled)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.testButton}
          onPress={() => navigation.navigate(AuthScreens.ROLE_SELECTION)}
        >
          <Text style={styles.testButtonText}>
            Go to Role Selection (Back Disabled)
          </Text>
        </TouchableOpacity>
      </View>
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 40,
  },
  testButtonsContainer: {
    width: '100%',
    marginTop: 20,
    padding: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  testLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 12,
    textAlign: 'center',
  },
  testButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LoginScreen;
