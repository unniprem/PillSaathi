/**
 * OfflineQueueService Tests
 *
 * Tests for offline action queue management and network connectivity detection.
 */

import OfflineQueueService from '../OfflineQueueService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/netinfo');

describe('OfflineQueueService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset service state
    OfflineQueueService.isConnected = true;
    OfflineQueueService.connectivityListeners = [];
    OfflineQueueService.syncCallback = null;
  });

  describe('initialize', () => {
    it('should initialize with online state', async () => {
      NetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      });

      NetInfo.addEventListener.mockReturnValue(jest.fn());

      await OfflineQueueService.initialize();

      expect(NetInfo.fetch).toHaveBeenCalled();
      expect(NetInfo.addEventListener).toHaveBeenCalled();
      expect(OfflineQueueService.isOnline()).toBe(true);
    });

    it('should initialize with offline state', async () => {
      NetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      });

      NetInfo.addEventListener.mockReturnValue(jest.fn());

      await OfflineQueueService.initialize();

      expect(OfflineQueueService.isOnline()).toBe(false);
    });

    it('should trigger sync callback when connectivity restored', async () => {
      const syncCallback = jest.fn().mockResolvedValue(undefined);
      let connectivityListener;

      NetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      });

      NetInfo.addEventListener.mockImplementation(listener => {
        connectivityListener = listener;
        return jest.fn();
      });

      await OfflineQueueService.initialize(syncCallback);

      // Simulate connectivity restored
      connectivityListener({
        isConnected: true,
        isInternetReachable: true,
      });

      // Wait for async callback
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(syncCallback).toHaveBeenCalled();
    });

    it('should not trigger sync callback when going offline', async () => {
      const syncCallback = jest.fn().mockResolvedValue(undefined);
      let connectivityListener;

      NetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      });

      NetInfo.addEventListener.mockImplementation(listener => {
        connectivityListener = listener;
        return jest.fn();
      });

      await OfflineQueueService.initialize(syncCallback);

      // Simulate going offline
      connectivityListener({
        isConnected: false,
        isInternetReachable: false,
      });

      expect(syncCallback).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should unsubscribe from network events', async () => {
      const unsubscribe = jest.fn();
      NetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      });
      NetInfo.addEventListener.mockReturnValue(unsubscribe);

      await OfflineQueueService.initialize();
      OfflineQueueService.cleanup();

      expect(unsubscribe).toHaveBeenCalled();
    });
  });

  describe('isOnline', () => {
    it('should return current connectivity state', () => {
      OfflineQueueService.isConnected = true;
      expect(OfflineQueueService.isOnline()).toBe(true);

      OfflineQueueService.isConnected = false;
      expect(OfflineQueueService.isOnline()).toBe(false);
    });
  });

  describe('addConnectivityListener', () => {
    it('should add listener and return unsubscribe function', () => {
      const listener = jest.fn();

      const unsubscribe = OfflineQueueService.addConnectivityListener(listener);

      expect(OfflineQueueService.connectivityListeners).toContain(listener);

      unsubscribe();

      expect(OfflineQueueService.connectivityListeners).not.toContain(listener);
    });

    it('should notify listeners on connectivity change', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      OfflineQueueService.addConnectivityListener(listener1);
      OfflineQueueService.addConnectivityListener(listener2);

      OfflineQueueService.notifyConnectivityChange(false);

      expect(listener1).toHaveBeenCalledWith(false);
      expect(listener2).toHaveBeenCalledWith(false);
    });
  });

  describe('queueOfflineAction', () => {
    it('should queue action when no existing queue', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      AsyncStorage.setItem.mockResolvedValue(undefined);

      const action = {
        type: 'mark_taken',
        doseId: 'dose123',
        timestamp: new Date(),
        data: {},
      };

      const actionId = await OfflineQueueService.queueOfflineAction(action);

      expect(actionId).toBeDefined();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@pillsathi:offline_dose_actions',
        expect.stringContaining('mark_taken'),
      );
    });

    it('should append to existing queue', async () => {
      const existingQueue = {
        actions: [
          {
            id: 'action1',
            type: 'mark_taken',
            doseId: 'dose1',
          },
        ],
      };

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingQueue));
      AsyncStorage.setItem.mockResolvedValue(undefined);

      const action = {
        type: 'mark_skipped',
        doseId: 'dose123',
        timestamp: new Date(),
        data: {},
      };

      await OfflineQueueService.queueOfflineAction(action);

      const savedQueue = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      expect(savedQueue.actions).toHaveLength(2);
      expect(savedQueue.actions[1].type).toBe('mark_skipped');
    });

    it('should include all required fields in queued action', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      AsyncStorage.setItem.mockResolvedValue(undefined);

      const timestamp = new Date();
      const action = {
        type: 'mark_taken',
        doseId: 'dose123',
        timestamp,
        data: { takenAt: timestamp },
      };

      await OfflineQueueService.queueOfflineAction(action);

      const savedQueue = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      const queuedAction = savedQueue.actions[0];

      expect(queuedAction).toMatchObject({
        id: expect.any(String),
        type: 'mark_taken',
        doseId: 'dose123',
        timestamp: timestamp.toISOString(),
        data: { takenAt: timestamp.toISOString() },
        retryCount: 0,
        queuedAt: expect.any(String),
      });
    });
  });

  describe('getQueue', () => {
    it('should return empty queue when no data exists', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);

      const queue = await OfflineQueueService.getQueue();

      expect(queue).toEqual({ actions: [] });
    });

    it('should return existing queue', async () => {
      const existingQueue = {
        actions: [
          {
            id: 'action1',
            type: 'mark_taken',
            doseId: 'dose1',
          },
        ],
      };

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingQueue));

      const queue = await OfflineQueueService.getQueue();

      expect(queue).toEqual(existingQueue);
    });

    it('should handle corrupted queue data', async () => {
      AsyncStorage.getItem.mockResolvedValue('invalid json');

      const queue = await OfflineQueueService.getQueue();

      expect(queue).toEqual({ actions: [] });
    });
  });

  describe('getPendingCount', () => {
    it('should return count of pending actions', async () => {
      const existingQueue = {
        actions: [{ id: 'action1' }, { id: 'action2' }, { id: 'action3' }],
      };

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingQueue));

      const count = await OfflineQueueService.getPendingCount();

      expect(count).toBe(3);
    });

    it('should return 0 when queue is empty', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);

      const count = await OfflineQueueService.getPendingCount();

      expect(count).toBe(0);
    });
  });

  describe('removeAction', () => {
    it('should remove action from queue', async () => {
      const existingQueue = {
        actions: [
          { id: 'action1', type: 'mark_taken' },
          { id: 'action2', type: 'mark_skipped' },
        ],
      };

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingQueue));
      AsyncStorage.setItem.mockResolvedValue(undefined);

      await OfflineQueueService.removeAction('action1');

      const savedQueue = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      expect(savedQueue.actions).toHaveLength(1);
      expect(savedQueue.actions[0].id).toBe('action2');
    });

    it('should handle removing non-existent action', async () => {
      const existingQueue = {
        actions: [{ id: 'action1' }],
      };

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingQueue));
      AsyncStorage.setItem.mockResolvedValue(undefined);

      await OfflineQueueService.removeAction('nonexistent');

      const savedQueue = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      expect(savedQueue.actions).toHaveLength(1);
    });
  });

  describe('updateRetryCount', () => {
    it('should update retry count for action', async () => {
      const existingQueue = {
        actions: [
          { id: 'action1', retryCount: 0 },
          { id: 'action2', retryCount: 1 },
        ],
      };

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingQueue));
      AsyncStorage.setItem.mockResolvedValue(undefined);

      await OfflineQueueService.updateRetryCount('action1', 3);

      const savedQueue = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      const action = savedQueue.actions.find(a => a.id === 'action1');
      expect(action.retryCount).toBe(3);
    });

    it('should handle updating non-existent action', async () => {
      const existingQueue = {
        actions: [{ id: 'action1', retryCount: 0 }],
      };

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingQueue));
      AsyncStorage.setItem.mockResolvedValue(undefined);

      await OfflineQueueService.updateRetryCount('nonexistent', 5);

      // Should not throw error
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('clearQueue', () => {
    it('should clear all actions from queue', async () => {
      AsyncStorage.setItem.mockResolvedValue(undefined);

      await OfflineQueueService.clearQueue();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@pillsathi:offline_dose_actions',
        JSON.stringify({ actions: [] }),
      );
    });
  });
});
