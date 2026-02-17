/**
 * Parent Home Screen
 *
 * Main dashboard for parent users.
 * This is a placeholder screen that will be implemented in Phase 1.
 *
 * Future functionality will include:
 * - View list of dependents
 * - Manage medication schedules
 * - View medication history
 * - Receive notifications
 * - Access settings
 *
 * @format
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ParentScreens } from '../../types/navigation';

/**
 * Parent Home Screen Component
 *
 * Placeholder screen for parent dashboard.
 * Will be fully implemented in Phase 1.
 *
 * Includes test navigation buttons to verify back navigation functionality.
 *
 * @returns {React.ReactElement} Parent home screen component
 */
function ParentHomeScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Parent Home</Text>
      <Text style={styles.subtitle}>Dashboard coming soon...</Text>

      {/* Test navigation buttons */}
      <View style={styles.testButtonsContainer}>
        <Text style={styles.testLabel}>Test Stack Navigation:</Text>
        <TouchableOpacity
          style={styles.testButton}
          onPress={() => navigation.navigate(ParentScreens.MEDICINE_LIST)}
        >
          <Text style={styles.testButtonText}>
            Go to Medicine List (Back Enabled)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.testButton}
          onPress={() => navigation.navigate(ParentScreens.ADD_MEDICINE)}
        >
          <Text style={styles.testButtonText}>
            Go to Add Medicine (Modal, Back Enabled)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.testButton}
          onPress={() =>
            navigation.navigate(ParentScreens.CAREGIVER_MANAGEMENT)
          }
        >
          <Text style={styles.testButtonText}>
            Go to Caregiver Management (Back Enabled)
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

export default ParentHomeScreen;
