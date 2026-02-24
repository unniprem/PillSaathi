/**
 * ConnectivityIndicator - Network Connectivity Status Indicator
 *
 * Displays connectivity status and pending offline actions count.
 * Shows when device is offline and when sync is in progress.
 *
 * Requirements: 8.6 - Display connectivity indicator in UI
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import OfflineQueueService from '../services/OfflineQueueService';

const ConnectivityIndicator = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Initialize connectivity monitoring
    const initializeConnectivity = async () => {
      // Get initial state
      setIsOnline(OfflineQueueService.isOnline());

      // Get pending count
      const count = await OfflineQueueService.getPendingCount();
      setPendingCount(count);
    };

    initializeConnectivity();

    // Subscribe to connectivity changes
    const unsubscribe = OfflineQueueService.addConnectivityListener(
      async connected => {
        setIsOnline(connected);

        // Update pending count when connectivity changes
        const count = await OfflineQueueService.getPendingCount();
        setPendingCount(count);
      },
    );

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  // Don't show indicator if online and no pending actions
  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {!isOnline && (
        <View style={styles.offlineIndicator}>
          <Text style={styles.offlineText}>Offline</Text>
          {pendingCount > 0 && (
            <Text style={styles.pendingText}>
              {pendingCount} action{pendingCount !== 1 ? 's' : ''} pending
            </Text>
          )}
        </View>
      )}
      {isOnline && pendingCount > 0 && (
        <View style={styles.syncingIndicator}>
          <Text style={styles.syncingText}>Syncing...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  offlineIndicator: {
    backgroundColor: '#FF6B6B',
    padding: 8,
    alignItems: 'center',
  },
  offlineText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  pendingText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 2,
  },
  syncingIndicator: {
    backgroundColor: '#4ECDC4',
    padding: 8,
    alignItems: 'center',
  },
  syncingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default ConnectivityIndicator;
