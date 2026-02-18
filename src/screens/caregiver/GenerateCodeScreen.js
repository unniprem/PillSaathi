/**
 * Generate Code Screen
 *
 * Allows caregivers to generate invite codes for parents to pair with them.
 * Also displays a list of all caregivers paired with a specific parent.
 *
 * @format
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Generate Code Screen Component
 *
 * Placeholder implementation - will be fully implemented in task 16
 *
 * @returns {React.ReactElement} Generate code screen
 */
function GenerateCodeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Generate Code</Text>
      <Text style={styles.subtitle}>
        Generate invite codes for parents to pair with you
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
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
  },
});

export default GenerateCodeScreen;
