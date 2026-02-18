/**
 * OfflineIndicator Component
 *
 * Displays network connectivity status and pending sync operations.
 * Shows a banner when offline or when there are pending operations.
 *
 * Requirements: 16.4 - Show pending sync indicator in UI
 *
 * @format
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useOfflineQueue } from '../hooks/useOfflineQueue';

/**
 * OfflineIndicator Component
 *
 * @param {Object} props
 * @param {string} [props.position='top'] - Position of indicator ('top' or 'bottom')
 * @returns {JSX.Element|null}
 */
const OfflineIndicator = ({ position = 'top' }) => {
  const { isOnline, pendingCount, isProcessing } = useOfflineQueue();

  // Don't show anything if online and no pending operations
  if (isOnline && pendingCount === 0) {
    return null;
  }

  // Determine message and style
  let message = '';
  let backgroundColor = '#FF9500'; // Orange for offline
  let icon = '⚠️';

  if (!isOnline) {
    message =
      'You are offline. Changes will be saved when connection is restored.';
    backgroundColor = '#FF3B30'; // Red for offline
    icon = '📡';
  } else if (isProcessing) {
    message = `Syncing ${pendingCount} ${
      pendingCount === 1 ? 'change' : 'changes'
    }...`;
    backgroundColor = '#007AFF'; // Blue for syncing
    icon = '🔄';
  } else if (pendingCount > 0) {
    message = `${pendingCount} ${
      pendingCount === 1 ? 'change' : 'changes'
    } pending sync`;
    backgroundColor = '#FF9500'; // Orange for pending
    icon = '⏳';
  }

  const positionStyle = position === 'bottom' ? styles.bottom : styles.top;

  return (
    <View style={[styles.container, positionStyle, { backgroundColor }]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.message}>{message}</Text>
      {isProcessing && (
        <ActivityIndicator
          size="small"
          color="#FFFFFF"
          style={styles.spinner}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    zIndex: 1000,
  },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  icon: {
    fontSize: 16,
    marginRight: 8,
  },
  message: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  spinner: {
    marginLeft: 8,
  },
});

export default OfflineIndicator;
