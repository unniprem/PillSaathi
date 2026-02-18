/**
 * LogoutHeader Component
 *
 * A reusable header component that displays a logout button consistently
 * positioned in the top-right corner. Shows a confirmation dialog before
 * signing out the user.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 12.1, 12.2, 12.3, 12.4
 *
 * @format
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

/**
 * LogoutHeader Component
 *
 * Displays a logout button in the header that triggers a confirmation dialog
 * before signing out the user. Positioned consistently in the top-right corner.
 *
 * Requirements:
 * - 2.1, 12.1: Display logout button in header on all screens
 * - 2.2, 12.2: Prompt for confirmation before logging out
 * - 2.3, 12.3: Call AuthContext.signOut() on confirmation
 * - 2.4, 12.4: Position logout button consistently (top-right)
 *
 * @returns {JSX.Element} Logout button component
 *
 * @example
 * // In navigator screen options:
 * options={{
 *   headerRight: () => <LogoutHeader />
 * }}
 */
const LogoutHeader = () => {
  const { signOut, loading } = useAuth();

  /**
   * Handle logout button press
   * Shows confirmation dialog before signing out
   *
   * Requirements: 2.2, 12.2 - Prompt for confirmation
   * Requirements: 2.3, 12.3 - Call signOut on confirmation
   */
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            // User cancelled, do nothing
          },
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              // Navigation to login screen is handled by RootNavigator
              // based on auth state change
            } catch (error) {
              // Show error alert if logout fails
              Alert.alert(
                'Logout Failed',
                error.message || 'Failed to logout. Please try again.',
                [{ text: 'OK' }],
              );
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handleLogout}
        disabled={loading}
        style={styles.button}
        accessibilityLabel="Logout"
        accessibilityRole="button"
        accessibilityHint="Double tap to logout from the app"
        accessibilityState={{ disabled: loading }}
      >
        <Text style={[styles.buttonText, loading && styles.buttonTextDisabled]}>
          Logout
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginRight: Platform.OS === 'ios' ? 16 : 12,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30', // iOS destructive red color
  },
  buttonTextDisabled: {
    opacity: 0.5,
  },
});

export default LogoutHeader;
