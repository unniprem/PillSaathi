/**
 * Caregiver Home Screen
 *
 * Main dashboard for caregiver users.
 * This is a placeholder screen that will be implemented in Phase 1.
 *
 * Future functionality will include:
 * - View assigned patients
 * - Manage medication schedules for patients
 * - View medication history
 * - Receive notifications
 * - Access settings
 *
 * @format
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CaregiverScreens } from '../../types/navigation';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Caregiver Home Screen Component
 *
 * Placeholder screen for caregiver dashboard.
 * Will be fully implemented in Phase 1.
 *
 * Includes test navigation buttons to verify back navigation functionality.
 *
 * @returns {React.ReactElement} Caregiver home screen component
 */
function CaregiverHomeScreen() {
  const navigation = useNavigation();
  const { signOut, loading } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  /**
   * Handle logout with confirmation dialog
   * Requirements: 4.4, 5.5 - Logout functionality with confirmation
   */
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoggingOut(true);
              await signOut();
              // Navigation to login screen is handled automatically by App.js
              // based on auth state change
            } catch (error) {
              setIsLoggingOut(false);
              Alert.alert('Error', 'Failed to logout. Please try again.');
              console.error('Logout error:', error);
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Caregiver Home</Text>
          <Text style={styles.subtitle}>Dashboard coming soon...</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.logoutButton,
            (loading || isLoggingOut) && styles.logoutButtonDisabled,
          ]}
          onPress={handleLogout}
          disabled={loading || isLoggingOut}
          accessibilityLabel="Logout button"
          accessibilityHint="Double tap to logout from your account"
          accessibilityRole="button"
        >
          <Text style={styles.logoutButtonText}>
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Test navigation buttons */}
      <View style={styles.testButtonsContainer}>
        <Text style={styles.testLabel}>Test Stack Navigation:</Text>
        <TouchableOpacity
          style={styles.testButton}
          onPress={() => navigation.navigate(CaregiverScreens.PARENT_LIST)}
        >
          <Text style={styles.testButtonText}>
            Go to Parent List (Back Enabled)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.testButton}
          onPress={() => navigation.navigate(CaregiverScreens.MEDICINE_DETAILS)}
        >
          <Text style={styles.testButtonText}>
            Go to Medicine Details (Back Enabled)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.testButton}
          onPress={() => navigation.navigate(CaregiverScreens.ALARM)}
        >
          <Text style={styles.testButtonText}>
            Go to Alarm (Full Screen Modal, Back Enabled)
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 40,
    marginTop: 20,
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
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButtonDisabled: {
    backgroundColor: '#CCCCCC',
    opacity: 0.6,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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

export default CaregiverHomeScreen;
