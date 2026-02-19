/**
 * DoseTrackerService Tests
 *
 * Tests for dose tracking functionality including marking doses as taken/skipped,
 * snoozing, and dose record creation.
 */

import DoseTrackerService from '../DoseTrackerService';
import AlarmSchedulerService from '../AlarmSchedulerService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('@react-native-firebase/firestore');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createTriggerNotification: jest.fn(),
    cancelNotification: jest.fn(),
  },
  TriggerType: {
    TIMESTAMP: 0,
  },
}));
jest.mock('../AlarmSchedulerService');
jest.mock('../../utils/retryHelper', () => ({
  retryOperation: jest.fn(fn => fn()),
}));

describe('DoseTrackerService', () => {
  let mockFirestore;
  let mockCollection;
  let mockDoc;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Firestore mocks
    mockDoc = {
      update: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          medicineName: 'Test Medicine',
          dosageAmount: 10,
          dosageUnit: 'mg',
          instructions: 'Take with food',
        }),
      }),
    };

    mockCollection = {
      doc: jest.fn().mockReturnValue(mockDoc),
      add: jest.fn().mockResolvedValue({ id: 'dose123' }),
    };

    mockFirestore = {
      collection: jest.fn().mockReturnValue(mockCollection),
    };

    // Replace the firestore instance in the singleton service
    DoseTrackerService.firestore = mockFirestore;
  });

  describe('validateDoseData', () => {
    it('should validate dose data with all required fields', () => {
      const validDose = {
        medicineId: 'med123',
        parentId: 'parent123',
        scheduledTime: new Date(),
        status: 'scheduled',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => DoseTrackerService.validateDoseData(validDose)).not.toThrow();
    });

    it('should throw error for missing required fields', () => {
      const invalidDose = {
        medicineId: 'med123',
        parentId: 'parent123',
        // Missing scheduledTime, status, createdAt, updatedAt
      };

      expect(() => DoseTrackerService.validateDoseData(invalidDose)).toThrow(
        'Missing required field',
      );
    });

    it('should throw error for invalid status', () => {
      const invalidDose = {
        medicineId: 'med123',
        parentId: 'parent123',
        scheduledTime: new Date(),
        status: 'invalid_status',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => DoseTrackerService.validateDoseData(invalidDose)).toThrow(
        'Invalid status',
      );
    });
  });

  describe('markDoseAsTaken', () => {
    it('should mark dose as taken with current timestamp', async () => {
      const doseId = 'dose123';
      const takenAt = new Date();

      await DoseTrackerService.markDoseAsTaken(doseId, takenAt);

      expect(mockFirestore.collection).toHaveBeenCalledWith('doses');
      expect(mockCollection.doc).toHaveBeenCalledWith(doseId);
      expect(mockDoc.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'taken',
          takenAt: takenAt,
          updatedAt: expect.any(Date),
        }),
      );
    });

    it('should use current time if takenAt not provided', async () => {
      const doseId = 'dose123';

      await DoseTrackerService.markDoseAsTaken(doseId);

      expect(mockDoc.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'taken',
          takenAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      );
    });

    it('should queue action for offline sync on network error', async () => {
      const doseId = 'dose123';
      const networkError = new Error('Network error');
      networkError.code = 'unavailable';

      mockDoc.update.mockRejectedValueOnce(networkError);
      AsyncStorage.getItem.mockResolvedValue(null);
      AsyncStorage.setItem.mockResolvedValue(undefined);

      await DoseTrackerService.markDoseAsTaken(doseId);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@pillsathi:offline_dose_actions',
        expect.stringContaining('mark_taken'),
      );
    });
  });

  describe('markDoseAsSkipped', () => {
    it('should mark dose as skipped without reason', async () => {
      const doseId = 'dose123';

      await DoseTrackerService.markDoseAsSkipped(doseId);

      expect(mockFirestore.collection).toHaveBeenCalledWith('doses');
      expect(mockCollection.doc).toHaveBeenCalledWith(doseId);
      expect(mockDoc.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'skipped',
          updatedAt: expect.any(Date),
        }),
      );
    });

    it('should mark dose as skipped with reason', async () => {
      const doseId = 'dose123';
      const reason = 'Feeling nauseous';

      await DoseTrackerService.markDoseAsSkipped(doseId, reason);

      expect(mockDoc.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'skipped',
          skippedReason: reason,
          updatedAt: expect.any(Date),
        }),
      );
    });

    it('should queue action for offline sync on network error', async () => {
      const doseId = 'dose123';
      const networkError = new Error('offline');

      mockDoc.update.mockRejectedValueOnce(networkError);
      AsyncStorage.getItem.mockResolvedValue(null);
      AsyncStorage.setItem.mockResolvedValue(undefined);

      await DoseTrackerService.markDoseAsSkipped(doseId);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@pillsathi:offline_dose_actions',
        expect.stringContaining('mark_skipped'),
      );
    });
  });

  describe('createDoseRecord', () => {
    it('should create dose record with all required fields', async () => {
      const doseData = {
        medicineId: 'med123',
        scheduleId: 'schedule123',
        parentId: 'parent123',
        medicineName: 'Test Medicine',
        dosageAmount: 10,
        dosageUnit: 'mg',
        scheduledTime: new Date(),
        alarmId: 'alarm123',
      };

      const doseId = await DoseTrackerService.createDoseRecord(doseData);

      expect(mockFirestore.collection).toHaveBeenCalledWith('doses');
      expect(mockCollection.add).toHaveBeenCalledWith(
        expect.objectContaining({
          medicineId: 'med123',
          scheduleId: 'schedule123',
          parentId: 'parent123',
          medicineName: 'Test Medicine',
          dosageAmount: 10,
          dosageUnit: 'mg',
          scheduledTime: expect.any(Date),
          status: 'scheduled',
          takenAt: null,
          skippedReason: null,
          alarmId: 'alarm123',
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      );
      expect(doseId).toBe('dose123');
    });

    it('should create dose record without alarmId', async () => {
      const doseData = {
        medicineId: 'med123',
        scheduleId: 'schedule123',
        parentId: 'parent123',
        medicineName: 'Test Medicine',
        dosageAmount: 10,
        dosageUnit: 'mg',
        scheduledTime: new Date(),
      };

      await DoseTrackerService.createDoseRecord(doseData);

      expect(mockCollection.add).toHaveBeenCalledWith(
        expect.objectContaining({
          alarmId: null,
        }),
      );
    });

    it('should throw error if validation fails', async () => {
      const invalidDoseData = {
        medicineId: 'med123',
        // Missing required fields
      };

      await expect(DoseTrackerService.createDoseRecord(invalidDoseData)).rejects.toThrow(
        'Failed to create dose record',
      );
    });
  });

  describe('snoozeDose', () => {
    beforeEach(() => {
      AlarmSchedulerService.createAlarm = jest
        .fn()
        .mockResolvedValue('alarm456');
    });

    it('should snooze dose for 10 minutes', async () => {
      const doseId = 'dose123';
      const medicineId = 'med123';
      const now = new Date();

      await DoseTrackerService.snoozeDose(doseId, medicineId);

      expect(mockFirestore.collection).toHaveBeenCalledWith('doses');
      expect(mockCollection.doc).toHaveBeenCalledWith(doseId);
      expect(mockDoc.get).toHaveBeenCalled();

      // Verify alarm was created with snooze time (10 minutes from now)
      expect(AlarmSchedulerService.createAlarm).toHaveBeenCalledWith(
        medicineId,
        expect.objectContaining({
          name: 'Test Medicine',
          dosageAmount: 10,
          dosageUnit: 'mg',
        }),
        expect.any(Date),
      );

      // Verify snooze time is approximately 10 minutes from now
      const snoozeTime = AlarmSchedulerService.createAlarm.mock.calls[0][2];
      const timeDiff = snoozeTime.getTime() - now.getTime();
      const tenMinutesInMs = 10 * 60 * 1000;
      expect(timeDiff).toBeGreaterThanOrEqual(tenMinutesInMs - 1000); // Allow 1 second tolerance
      expect(timeDiff).toBeLessThanOrEqual(tenMinutesInMs + 1000);
    });

    it('should throw error if dose not found', async () => {
      const doseId = 'nonexistent';
      const medicineId = 'med123';

      mockDoc.get.mockResolvedValueOnce({ exists: false });

      await expect(DoseTrackerService.snoozeDose(doseId, medicineId)).rejects.toThrow(
        'Failed to snooze dose',
      );
    });
  });

  describe('isNetworkError', () => {
    it('should identify network errors by code', () => {
      const error1 = new Error('Test');
      error1.code = 'unavailable';
      expect(DoseTrackerService.isNetworkError(error1)).toBe(true);

      const error2 = new Error('Test');
      error2.code = 'network-request-failed';
      expect(DoseTrackerService.isNetworkError(error2)).toBe(true);
    });

    it('should identify network errors by message', () => {
      const error1 = new Error('network error occurred');
      expect(DoseTrackerService.isNetworkError(error1)).toBe(true);

      const error2 = new Error('device is offline');
      expect(DoseTrackerService.isNetworkError(error2)).toBe(true);
    });

    it('should return false for non-network errors', () => {
      const error = new Error('permission denied');
      error.code = 'permission-denied';
      expect(DoseTrackerService.isNetworkError(error)).toBe(false);
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

      await DoseTrackerService.queueOfflineAction(action);

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

      await DoseTrackerService.queueOfflineAction(action);

      const savedQueue = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      expect(savedQueue.actions).toHaveLength(2);
      expect(savedQueue.actions[1].type).toBe('mark_skipped');
    });
  });
});
