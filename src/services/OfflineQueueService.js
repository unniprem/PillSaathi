/**
 * OfflineQueueService - Offline Action Queue Management
 *
 * Manages offline action queue storage and network connectivity detection.
 * Stores actions when offline and syncs when connectivity is restored.
 *
 * Requirements: 8.2 - Queue offline actions for later sync
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const OFFLINE_QUEUE_KEY = '@pillsathi:offline_dose_actions';

class OfflineQueueService {
  constructor() {
    this.isConnected = true;
    this.connectivityListeners = [];
    this.unsubscribe = null;
    this.syncCallback = null;
  }

  /**
   * Initialize network connectivity monitoring
   * Sets up listener for network state changes
   *
   * Requirements: 8.6 - Listen for network state changes
   *
   * @param {Function} syncCallback - Optional callback to trigger sync when connectivity restored
   * @returns {Promise<void>}
   */
  async initialize(syncCallback = null) {
    try {
      this.syncCallback = syncCallback;

      // Get initial network state
      const netState = await NetInfo.fetch();
      this.isConnected =
        netState.isConnected && netState.isInternetReachable !== false;

      console.log(
        'Initial network state:',
        this.isConnected ? 'connected' : 'offline',
      );

      // Subscribe to network state changes
      this.unsubscribe = NetInfo.addEventListener(state => {
        const wasConnected = this.isConnected;
        this.isConnected =
          state.isConnected && state.isInternetReachable !== false;

        console.log(
          'Network state changed:',
          this.isConnected ? 'connected' : 'offline',
        );

        // Notify listeners of connectivity change
        if (wasConnected !== this.isConnected) {
          this.notifyConnectivityChange(this.isConnected);

          // Trigger sync when connectivity is restored (Requirement 8.6)
          if (this.isConnected && !wasConnected && this.syncCallback) {
            console.log('Connectivity restored, triggering sync...');
            this.syncCallback().catch(error => {
              console.error('Auto-sync failed:', error);
            });
          }
        }
      });
    } catch (error) {
      console.error('Failed to initialize network monitoring:', error);
      // Assume connected if we can't determine
      this.isConnected = true;
    }
  }

  /**
   * Clean up network monitoring
   *
   * @returns {void}
   */
  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  /**
   * Check if device is currently connected to network
   *
   * @returns {boolean} True if connected
   */
  isOnline() {
    return this.isConnected;
  }

  /**
   * Add listener for connectivity changes
   *
   * @param {Function} listener - Callback function (isConnected) => void
   * @returns {Function} Unsubscribe function
   */
  addConnectivityListener(listener) {
    this.connectivityListeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.connectivityListeners.indexOf(listener);
      if (index > -1) {
        this.connectivityListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of connectivity change
   *
   * @param {boolean} isConnected - Current connectivity state
   * @private
   */
  notifyConnectivityChange(isConnected) {
    console.log(
      `Notifying ${this.connectivityListeners.length} listeners of connectivity change`,
    );
    for (const listener of this.connectivityListeners) {
      try {
        listener(isConnected);
      } catch (error) {
        console.error('Error in connectivity listener:', error);
      }
    }
  }

  /**
   * Queue offline action for later sync
   * Stores action in AsyncStorage with original timestamp
   *
   * Requirements: 8.2 - Store offline actions locally
   *
   * @param {Object} action - Action to queue
   * @param {string} action.type - Action type (e.g., 'mark_taken', 'mark_skipped')
   * @param {string} action.doseId - Dose ID
   * @param {Date} action.timestamp - When action occurred
   * @param {Object} action.data - Action-specific data
   * @returns {Promise<string>} Action ID
   */
  async queueOfflineAction(action) {
    try {
      // Generate unique action ID
      const actionId = `${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 11)}`;

      // Get existing queue
      const queue = await this.getQueue();

      // Add action to queue
      const queuedAction = {
        id: actionId,
        type: action.type,
        doseId: action.doseId,
        timestamp: action.timestamp,
        data: action.data || {},
        retryCount: 0,
        queuedAt: new Date(),
      };

      queue.actions.push(queuedAction);

      // Save queue
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));

      console.log('Action queued for offline sync:', {
        id: actionId,
        type: action.type,
        doseId: action.doseId,
      });

      return actionId;
    } catch (error) {
      console.error('Failed to queue offline action:', error);
      throw new Error('Failed to queue offline action');
    }
  }

  /**
   * Get offline action queue
   *
   * @returns {Promise<Object>} Queue object with actions array
   */
  async getQueue() {
    try {
      const queueJson = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      if (!queueJson) {
        return { actions: [] };
      }

      const queue = JSON.parse(queueJson);

      // Ensure actions array exists
      if (!queue.actions || !Array.isArray(queue.actions)) {
        return { actions: [] };
      }

      return queue;
    } catch (error) {
      console.error('Failed to get offline queue:', error);
      return { actions: [] };
    }
  }

  /**
   * Get count of pending offline actions
   *
   * @returns {Promise<number>} Number of pending actions
   */
  async getPendingCount() {
    try {
      const queue = await this.getQueue();
      return queue.actions.length;
    } catch (error) {
      console.error('Failed to get pending count:', error);
      return 0;
    }
  }

  /**
   * Remove action from queue
   *
   * @param {string} actionId - Action ID to remove
   * @returns {Promise<void>}
   */
  async removeAction(actionId) {
    try {
      const queue = await this.getQueue();
      queue.actions = queue.actions.filter(action => action.id !== actionId);
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      console.log('Removed action from queue:', actionId);
    } catch (error) {
      console.error('Failed to remove action from queue:', error);
      throw new Error('Failed to remove action from queue');
    }
  }

  /**
   * Update action retry count
   *
   * @param {string} actionId - Action ID
   * @param {number} retryCount - New retry count
   * @returns {Promise<void>}
   */
  async updateRetryCount(actionId, retryCount) {
    try {
      const queue = await this.getQueue();
      const action = queue.actions.find(a => a.id === actionId);
      if (action) {
        action.retryCount = retryCount;
        await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      }
    } catch (error) {
      console.error('Failed to update retry count:', error);
    }
  }

  /**
   * Clear all actions from queue
   *
   * @returns {Promise<void>}
   */
  async clearQueue() {
    try {
      await AsyncStorage.setItem(
        OFFLINE_QUEUE_KEY,
        JSON.stringify({ actions: [] }),
      );
      console.log('Offline queue cleared');
    } catch (error) {
      console.error('Failed to clear queue:', error);
      throw new Error('Failed to clear queue');
    }
  }
}

// Export singleton instance
export default new OfflineQueueService();
