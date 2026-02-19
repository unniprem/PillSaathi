/**
 * Alarm Infrastructure Tests
 * Tests for notification configuration, alarm storage, and initialization
 */

// Mock dependencies BEFORE imports
jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createChannel: jest.fn(),
    requestPermission: jest.fn(),
    getNotificationSettings: jest.fn(),
    displayNotification: jest.fn(),
    cancelNotification: jest.fn(),
    cancelAllNotifications: jest.fn(),
    openNotificationSettings: jest.fn(),
    isBatteryOptimizationEnabled: jest.fn(),
    openBatteryOptimizationSettings: jest.fn(),
  },
  AndroidImportance: {
    HIGH: 4,
  },
  AndroidCategory: {
    ALARM: 'alarm',
  },
  AuthorizationStatus: {
    AUTHORIZED: 1,
    DENIED: -1,
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
  },
  Alert: {
    alert: jest.fn(),
  },
  Linking: {
    openSettings: jest.fn(),
  },
}));

import notificationConfig from '../notificationConfig';
import alarmStorage from '../alarmStorage';
import alarmInitializer from '../alarmInitializer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee from '@notifee/react-native';

describe('Alarm Infrastructure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton states
    notificationConfig.initialized = false;
    alarmInitializer.isInitialized = false;
  });

  describe('NotificationConfigService', () => {
    describe('initialize', () => {
      it('should create Android channel and request permissions', async () => {
        notifee.createChannel.mockResolvedValue(undefined);
        notifee.requestPermission.mockResolvedValue({
          authorizationStatus: 1, // AUTHORIZED
        });

        const result = await notificationConfig.initialize();

        expect(result).toBe(true);
        expect(notifee.createChannel).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'medicine-alarms',
            name: 'Medicine Alarms',
          }),
        );
        expect(notifee.requestPermission).toHaveBeenCalled();
        expect(notificationConfig.initialized).toBe(true);
      });

      it('should return false when permissions are denied', async () => {
        notifee.createChannel.mockResolvedValue(undefined);
        notifee.requestPermission.mockResolvedValue({
          authorizationStatus: -1, // DENIED
        });

        const result = await notificationConfig.initialize();

        expect(result).toBe(false);
      });

      it('should not reinitialize if already initialized', async () => {
        notificationConfig.initialized = true;

        const result = await notificationConfig.initialize();

        expect(result).toBe(true);
        expect(notifee.createChannel).not.toHaveBeenCalled();
      });
    });

    describe('createAlarmChannel', () => {
      it('should create channel with correct configuration', async () => {
        notifee.createChannel.mockResolvedValue(undefined);

        const result = await notificationConfig.createAlarmChannel();

        expect(result).toBe(true);
        expect(notifee.createChannel).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'medicine-alarms',
            importance: 4, // HIGH
            sound: 'default',
            vibration: true,
            bypassDnd: true,
          }),
        );
      });

      it('should handle channel creation errors', async () => {
        notifee.createChannel.mockRejectedValue(new Error('Channel error'));

        const result = await notificationConfig.createAlarmChannel();

        expect(result).toBe(false);
      });
    });

    describe('checkPermissions', () => {
      it('should return true when permissions are granted', async () => {
        notifee.getNotificationSettings.mockResolvedValue({
          authorizationStatus: 1, // AUTHORIZED
        });

        const result = await notificationConfig.checkPermissions();

        expect(result).toBe(true);
      });

      it('should return false when permissions are denied', async () => {
        notifee.getNotificationSettings.mockResolvedValue({
          authorizationStatus: -1, // DENIED
        });

        const result = await notificationConfig.checkPermissions();

        expect(result).toBe(false);
      });
    });

    describe('displayFullScreenNotification', () => {
      it('should display notification with correct configuration', async () => {
        notifee.displayNotification.mockResolvedValue(undefined);

        const notificationData = {
          id: 'test-alarm-1',
          title: 'Take Medicine',
          body: 'Aspirin 100mg',
          data: { medicineId: 'med-1' },
        };

        const result = await notificationConfig.displayFullScreenNotification(
          notificationData,
        );

        expect(result).toBe(true);
        expect(notifee.displayNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'test-alarm-1',
            title: 'Take Medicine',
            body: 'Aspirin 100mg',
            android: expect.objectContaining({
              channelId: 'medicine-alarms',
              fullScreenAction: expect.any(Object),
              autoCancel: false,
              ongoing: true,
            }),
          }),
        );
      });
    });

    describe('cancelNotification', () => {
      it('should cancel notification by ID', async () => {
        notifee.cancelNotification.mockResolvedValue(undefined);

        const result = await notificationConfig.cancelNotification('alarm-1');

        expect(result).toBe(true);
        expect(notifee.cancelNotification).toHaveBeenCalledWith('alarm-1');
      });
    });
  });

  describe('AlarmStorageService', () => {
    describe('storeAlarmMetadata', () => {
      it('should store alarm metadata with correct structure', async () => {
        AsyncStorage.setItem.mockResolvedValue(undefined);
        AsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));

        const metadata = {
          alarmIds: [
            {
              alarmId: 'alarm-1',
              scheduledTime: new Date('2024-01-01T08:00:00Z'),
              doseId: 'dose-1',
            },
          ],
          lastScheduled: new Date('2024-01-01T00:00:00Z'),
          scheduleVersion: 1,
        };

        const result = await alarmStorage.storeAlarmMetadata('med-1', metadata);

        expect(result).toBe(true);
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          '@alarm_metadata:med-1',
          expect.stringContaining('alarm-1'),
        );
      });
    });

    describe('getAlarmMetadata', () => {
      it('should retrieve and parse alarm metadata', async () => {
        const storedData = {
          medicineId: 'med-1',
          alarmIds: [
            {
              alarmId: 'alarm-1',
              scheduledTime: '2024-01-01T08:00:00.000Z',
              doseId: 'dose-1',
            },
          ],
          lastScheduled: '2024-01-01T00:00:00.000Z',
          scheduleVersion: 1,
        };

        AsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedData));

        const result = await alarmStorage.getAlarmMetadata('med-1');

        expect(result).toBeTruthy();
        expect(result.medicineId).toBe('med-1');
        expect(result.alarmIds).toHaveLength(1);
        expect(result.alarmIds[0].alarmId).toBe('alarm-1');
        expect(result.lastScheduled).toBeInstanceOf(Date);
        expect(result.alarmIds[0].scheduledTime).toBeInstanceOf(Date);
      });

      it('should return null when metadata does not exist', async () => {
        AsyncStorage.getItem.mockResolvedValue(null);

        const result = await alarmStorage.getAlarmMetadata('med-1');

        expect(result).toBeNull();
      });
    });

    describe('deleteAlarmMetadata', () => {
      it('should delete alarm metadata and update list', async () => {
        AsyncStorage.removeItem.mockResolvedValue(undefined);
        AsyncStorage.getItem.mockResolvedValue(
          JSON.stringify(['med-1', 'med-2']),
        );
        AsyncStorage.setItem.mockResolvedValue(undefined);

        const result = await alarmStorage.deleteAlarmMetadata('med-1');

        expect(result).toBe(true);
        expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
          '@alarm_metadata:med-1',
        );
      });
    });

    describe('getAllMedicineIdsWithAlarms', () => {
      it('should return array of medicine IDs', async () => {
        AsyncStorage.getItem.mockResolvedValue(
          JSON.stringify(['med-1', 'med-2', 'med-3']),
        );

        const result = await alarmStorage.getAllMedicineIdsWithAlarms();

        expect(result).toEqual(['med-1', 'med-2', 'med-3']);
      });

      it('should return empty array when no data exists', async () => {
        AsyncStorage.getItem.mockResolvedValue(null);

        const result = await alarmStorage.getAllMedicineIdsWithAlarms();

        expect(result).toEqual([]);
      });
    });

    describe('addAlarmIds', () => {
      it('should add new alarm IDs to existing metadata', async () => {
        const existingMetadata = {
          medicineId: 'med-1',
          alarmIds: [
            {
              alarmId: 'alarm-1',
              scheduledTime: '2024-01-01T08:00:00.000Z',
            },
          ],
          lastScheduled: '2024-01-01T00:00:00.000Z',
          scheduleVersion: 1,
        };

        AsyncStorage.getItem.mockResolvedValue(
          JSON.stringify(existingMetadata),
        );
        AsyncStorage.setItem.mockResolvedValue(undefined);

        const newAlarmIds = [
          {
            alarmId: 'alarm-2',
            scheduledTime: new Date('2024-01-01T14:00:00Z'),
          },
        ];

        const result = await alarmStorage.addAlarmIds('med-1', newAlarmIds);

        expect(result).toBe(true);
        expect(AsyncStorage.setItem).toHaveBeenCalled();
      });
    });

    describe('clearAllAlarmMetadata', () => {
      it('should clear all alarm metadata', async () => {
        AsyncStorage.getItem.mockResolvedValue(
          JSON.stringify(['med-1', 'med-2']),
        );
        AsyncStorage.removeItem.mockResolvedValue(undefined);

        const result = await alarmStorage.clearAllAlarmMetadata();

        expect(result).toBe(true);
        expect(AsyncStorage.removeItem).toHaveBeenCalledTimes(3); // 2 medicines + all alarms list
      });
    });
  });

  describe('AlarmInitializerService', () => {
    describe('initialize', () => {
      it('should initialize notification config and request battery exemption', async () => {
        notifee.createChannel.mockResolvedValue(undefined);
        notifee.requestPermission.mockResolvedValue({
          authorizationStatus: 1,
        });
        notifee.isBatteryOptimizationEnabled.mockResolvedValue(false);

        const result = await alarmInitializer.initialize();

        expect(result).toBe(true);
        expect(alarmInitializer.isInitialized).toBe(true);
        expect(notifee.isBatteryOptimizationEnabled).toHaveBeenCalled();
      });

      it('should not reinitialize if already initialized', async () => {
        alarmInitializer.isInitialized = true;

        const result = await alarmInitializer.initialize();

        expect(result).toBe(true);
        expect(notifee.createChannel).not.toHaveBeenCalled();
      });

      it('should handle initialization errors gracefully', async () => {
        alarmInitializer.isInitialized = false;
        notificationConfig.initialized = false;
        notifee.createChannel.mockRejectedValue(new Error('Init error'));

        const result = await alarmInitializer.initialize();

        // The initializer still returns true even if permissions fail
        // because it's designed to be resilient
        expect(result).toBe(true);
        expect(alarmInitializer.isInitialized).toBe(true);
      });
    });

    describe('getInitializationStatus', () => {
      it('should return initialization status', () => {
        alarmInitializer.isInitialized = true;

        const status = alarmInitializer.getInitializationStatus();

        expect(status).toBe(true);
      });
    });

    describe('reset', () => {
      it('should reset initialization status', () => {
        alarmInitializer.isInitialized = true;

        alarmInitializer.reset();

        expect(alarmInitializer.isInitialized).toBe(false);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should complete full initialization flow', async () => {
      notifee.createChannel.mockResolvedValue(undefined);
      notifee.requestPermission.mockResolvedValue({
        authorizationStatus: 1,
      });
      notifee.isBatteryOptimizationEnabled.mockResolvedValue(false);

      const result = await alarmInitializer.initialize();

      expect(result).toBe(true);
      expect(notificationConfig.initialized).toBe(true);
      expect(alarmInitializer.isInitialized).toBe(true);
    });

    it('should store and retrieve alarm metadata correctly', async () => {
      AsyncStorage.setItem.mockResolvedValue(undefined);
      AsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify([])) // For updateAllAlarmsList
        .mockResolvedValueOnce(
          JSON.stringify({
            medicineId: 'med-1',
            alarmIds: [
              {
                alarmId: 'alarm-1',
                scheduledTime: '2024-01-01T08:00:00.000Z',
              },
            ],
            lastScheduled: '2024-01-01T00:00:00.000Z',
            scheduleVersion: 1,
          }),
        );

      const metadata = {
        alarmIds: [
          {
            alarmId: 'alarm-1',
            scheduledTime: new Date('2024-01-01T08:00:00Z'),
          },
        ],
        lastScheduled: new Date('2024-01-01T00:00:00Z'),
        scheduleVersion: 1,
      };

      await alarmStorage.storeAlarmMetadata('med-1', metadata);
      const retrieved = await alarmStorage.getAlarmMetadata('med-1');

      expect(retrieved).toBeTruthy();
      expect(retrieved.medicineId).toBe('med-1');
      expect(retrieved.alarmIds[0].alarmId).toBe('alarm-1');
    });
  });
});
