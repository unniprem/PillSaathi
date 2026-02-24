/**
 * Offline Queue Manager
 *
 * Manages queuing of write operations when offline and retrying when connection is restored.
 * Uses AsyncStorage to persist queued operations across app restarts.
 *
 * Requirements: 16.4, 16.5 - Offline support and sync
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { logError } from './errorHandler';

const QUEUE_STORAGE_KEY = '@pillsathi:offline_queue';
const MAX_QUEUE_SIZE = 100;
const RETRY_INTERVAL_MS = 5000; // 5 seconds

/**
 * OfflineQueue class
 * Manages offline write operations and syncs when connection is restored
 */
class OfflineQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.listeners = new Set();
    this.isOnline = true;
    this.retryTimer = null;

    // Initialize network listener
    this.initNetworkListener();
  }

  /**
   * Initialize network state listener
   * Monitors network connectivity and triggers sync when online
   */
  initNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected && state.isInternetReachable;

      // If we just came back online, process the queue
      if (wasOffline && this.isOnline) {
        console.log('[OfflineQueue] Connection restored, processing queue');
        this.processQueue();
      }

      // Notify listeners of connectivity change
      this.notifyListeners();
    });
  }

  /**
   * Load queue from persistent storage
   * Called on app startup to restore pending operations
   *
   * @returns {Promise<void>}
   */
  async loadQueue() {
    try {
      const queueJson = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (queueJson) {
        this.queue = JSON.parse(queueJson);
        console.log(
          `[OfflineQueue] Loaded ${this.queue.length} operations from storage`,
        );

        // Process queue if online
        if (this.isOnline && this.queue.length > 0) {
          this.processQueue();
        }
      }
    } catch (error) {
      logError(error, 'OfflineQueue.loadQueue');
      console.error('[OfflineQueue] Failed to load queue:', error);
    }
  }

  /**
   * Save queue to persistent storage
   *
   * @returns {Promise<void>}
   */
  async saveQueue() {
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      logError(error, 'OfflineQueue.saveQueue');
      console.error('[OfflineQueue] Failed to save queue:', error);
    }
  }

  /**
   * Add an operation to the queue
   * Operations are persisted and will be retried when connection is restored
   *
   * Requirements: 16.4 - Queue write operations when offline
   *
   * @param {string} type - Operation type (e.g., 'createMedicine', 'updateMedicine')
   * @param {Function} operation - Async function to execute
   * @param {Object} data - Operation data for display/logging
   * @returns {Promise<string>} - Operation ID
   *
   * @example
   * const opId = await offlineQueue.enqueue(
   *   'createMedicine',
   *   () => medicineService.createMedicine(data),
   *   { medicineName: data.name }
   * );
   */
  async enqueue(type, operation, data = {}) {
    // Check queue size limit
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      throw new Error('Offline queue is full. Please try again when online.');
    }

    const operationId = `${type}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const queueItem = {
      id: operationId,
      type,
      data,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      status: 'pending',
    };

    // Store operation function in memory (not persisted)
    queueItem.operation = operation;

    this.queue.push(queueItem);
    await this.saveQueue();

    console.log(`[OfflineQueue] Enqueued operation: ${type} (${operationId})`);
    this.notifyListeners();

    // Try to process immediately if online
    if (this.isOnline) {
      this.processQueue();
    } else {
      // Schedule retry
      this.scheduleRetry();
    }

    return operationId;
  }

  /**
   * Process all pending operations in the queue
   * Requirements: 16.5 - Retry queued operations when connection restored
   *
   * @returns {Promise<void>}
   */
  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`[OfflineQueue] Processing ${this.queue.length} operations`);

    const itemsToProcess = [...this.queue];

    for (const item of itemsToProcess) {
      if (!this.isOnline) {
        console.log(
          '[OfflineQueue] Lost connection, stopping queue processing',
        );
        break;
      }

      try {
        // Execute the operation
        if (item.operation) {
          await item.operation();

          // Remove from queue on success
          this.queue = this.queue.filter(q => q.id !== item.id);
          console.log(
            `[OfflineQueue] Successfully processed: ${item.type} (${item.id})`,
          );
        } else {
          // Operation function not available (after app restart)
          // Remove stale item
          this.queue = this.queue.filter(q => q.id !== item.id);
          console.log(
            `[OfflineQueue] Removed stale operation: ${item.type} (${item.id})`,
          );
        }
      } catch (error) {
        logError(error, 'OfflineQueue.processQueue', {
          operationType: item.type,
          operationId: item.id,
        });

        item.retryCount++;

        // Remove if max retries exceeded
        if (item.retryCount >= 3) {
          console.error(
            `[OfflineQueue] Max retries exceeded for ${item.type} (${item.id})`,
          );
          this.queue = this.queue.filter(q => q.id !== item.id);
        }
      }
    }

    await this.saveQueue();
    this.notifyListeners();
    this.isProcessing = false;

    // If there are still items and we're online, schedule another attempt
    if (this.queue.length > 0 && this.isOnline) {
      this.scheduleRetry();
    }
  }

  /**
   * Schedule a retry attempt
   */
  scheduleRetry() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }

    this.retryTimer = setTimeout(() => {
      if (this.isOnline && this.queue.length > 0) {
        this.processQueue();
      }
    }, RETRY_INTERVAL_MS);
  }

  /**
   * Get current queue status
   *
   * @returns {Object} Queue status
   */
  getStatus() {
    return {
      isOnline: this.isOnline,
      pendingCount: this.queue.length,
      isProcessing: this.isProcessing,
      operations: this.queue.map(item => ({
        id: item.id,
        type: item.type,
        timestamp: item.timestamp,
        retryCount: item.retryCount,
        status: item.status,
      })),
    };
  }

  /**
   * Check if there are pending operations
   *
   * @returns {boolean} True if queue has pending operations
   */
  hasPendingOperations() {
    return this.queue.length > 0;
  }

  /**
   * Add a listener for queue status changes
   * Requirements: 16.4 - Show pending sync indicator
   *
   * @param {Function} listener - Callback function
   * @returns {Function} Unsubscribe function
   *
   * @example
   * const unsubscribe = offlineQueue.addListener((status) => {
   *   console.log('Queue status:', status);
   * });
   * // Later: unsubscribe();
   */
  addListener(listener) {
    this.listeners.add(listener);

    // Immediately call with current status
    listener(this.getStatus());

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of status change
   */
  notifyListeners() {
    const status = this.getStatus();
    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('[OfflineQueue] Listener error:', error);
      }
    });
  }

  /**
   * Clear all pending operations
   * Use with caution - this will discard all queued operations
   *
   * @returns {Promise<void>}
   */
  async clearQueue() {
    this.queue = [];
    await this.saveQueue();
    this.notifyListeners();
    console.log('[OfflineQueue] Queue cleared');
  }
}

// Export singleton instance
const offlineQueue = new OfflineQueue();

// Load queue on module initialization
offlineQueue.loadQueue();

export default offlineQueue;
