/**
 * useOfflineQueue Hook
 *
 * React hook for accessing offline queue status in components.
 * Provides real-time updates on queue status and pending operations.
 *
 * Requirements: 16.4 - Show pending sync indicator in UI
 */

import { useState, useEffect } from 'react';
import offlineQueue from '../utils/offlineQueue';

/**
 * Hook to access offline queue status
 * Subscribes to queue status changes and provides current state
 *
 * @returns {Object} Queue status
 * @returns {boolean} return.isOnline - Network connectivity status
 * @returns {number} return.pendingCount - Number of pending operations
 * @returns {boolean} return.isProcessing - Whether queue is currently processing
 * @returns {boolean} return.hasPending - Whether there are pending operations
 *
 * @example
 * function MyComponent() {
 *   const { isOnline, pendingCount, hasPending } = useOfflineQueue();
 *
 *   return (
 *     <View>
 *       {!isOnline && <Text>Offline</Text>}
 *       {hasPending && <Text>{pendingCount} operations pending</Text>}
 *     </View>
 *   );
 * }
 */
export const useOfflineQueue = () => {
  const [status, setStatus] = useState({
    isOnline: true,
    pendingCount: 0,
    isProcessing: false,
    operations: [],
  });

  useEffect(() => {
    // Subscribe to queue status changes
    const unsubscribe = offlineQueue.addListener(newStatus => {
      setStatus(newStatus);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  return {
    isOnline: status.isOnline,
    pendingCount: status.pendingCount,
    isProcessing: status.isProcessing,
    hasPending: status.pendingCount > 0,
    operations: status.operations,
  };
};

export default useOfflineQueue;
