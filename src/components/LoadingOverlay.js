/**
 * LoadingOverlay Component
 *
 * A reusable full-screen loading overlay that displays a loading indicator
 * with an optional message. Used to block user interaction during async operations.
 *
 * Requirements: 7.6 - Disable UI during loading states
 *
 * @format
 */

import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';

/**
 * LoadingOverlay Component
 *
 * Displays a semi-transparent overlay with a loading indicator and message.
 * Blocks all user interaction while visible.
 *
 * @param {Object} props
 * @param {boolean} props.visible - Whether the overlay is visible
 * @param {string} [props.message] - Optional loading message to display
 * @returns {JSX.Element}
 */
const LoadingOverlay = ({ visible, message = 'Loading...' }) => {
  if (!visible) {
    return null;
  }

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      statusBarTranslucent
      accessibilityViewIsModal
      accessibilityLabel="Loading"
      accessibilityRole="progressbar"
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#007AFF" />
          {message && <Text style={styles.message}>{message}</Text>}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    minWidth: 200,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    color: '#333333',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default LoadingOverlay;
