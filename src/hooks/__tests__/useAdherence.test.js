/**
 * Tests for useAdherence Hook
 *
 * Requirements: Phase 5 - Escalation (5.7.2)
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useAdherence } from '../useAdherence';
import firestore from '@react-native-firebase/firestore';

// Mock dependencies
jest.mock('@react-native-firebase/firestore');
jest.mock('@react-native-firebase/app');

describe('useAdherence', () => {
  let mockFirestore;
  let mockCollection;
  let mockQuery;
  let mockGet;

  beforeEach(() => {
    // Mock Firestore chain
    mockGet = jest.fn();

    // Create a chainable mock query object
    mockQuery = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      get: mockGet,
    };

    mockCollection = jest.fn().mockReturnValue(mockQuery);

    mockFirestore = {
      collection: mockCollection,
    };

    firestore.mockReturnValue(mockFirestore);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Fetching doses and calculating adherence', () => {
    it('should fetch doses and calculate adherence metrics', async () => {
      // Arrange
      const parentId = 'parent123';
      const startDate = new Date('2026-02-14');
      const endDate = new Date('2026-02-21');

      const mockDoses = [
        {
          id: 'dose1',
          parentId: 'parent123',
          medicineId: 'med1',
          medicineName: 'Medicine A',
          status: 'taken',
          scheduledTime: { toDate: () => new Date('2026-02-20T08:00:00') },
        },
        {
          id: 'dose2',
          parentId: 'parent123',
          medicineId: 'med1',
          medicineName: 'Medicine A',
          status: 'taken',
          scheduledTime: { toDate: () => new Date('2026-02-19T08:00:00') },
        },
        {
          id: 'dose3',
          parentId: 'parent123',
          medicineId: 'med2',
          medicineName: 'Medicine B',
          status: 'missed',
          scheduledTime: { toDate: () => new Date('2026-02-18T12:00:00') },
        },
      ];

      mockGet.mockResolvedValue({
        forEach: callback =>
          mockDoses.forEach(dose =>
            callback({ id: dose.id, data: () => dose }),
          ),
      });

      // Act
      const { result } = renderHook(() =>
        useAdherence(parentId, startDate, endDate),
      );

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert
      expect(mockCollection).toHaveBeenCalledWith('doses');
      expect(mockQuery.where).toHaveBeenCalledWith('parentId', '==', parentId);
      expect(mockQuery.where).toHaveBeenCalledWith(
        'scheduledTime',
        '>=',
        startDate,
      );
      expect(mockQuery.where).toHaveBeenCalledWith(
        'scheduledTime',
        '<=',
        endDate,
      );
      expect(mockQuery.orderBy).toHaveBeenCalledWith('scheduledTime', 'desc');

      expect(result.current.percentage).toBe(67); // 2 taken / 3 total = 67%
      expect(result.current.taken).toBe(2);
      expect(result.current.missed).toBe(1);
      expect(result.current.snoozed).toBe(0);
      expect(result.current.total).toBe(3);
      expect(result.current.doses).toHaveLength(3);
      expect(result.current.error).toBeNull();
    });

    it('should calculate per-medicine adherence', async () => {
      // Arrange
      const parentId = 'parent123';
      const startDate = new Date('2026-02-14');
      const endDate = new Date('2026-02-21');

      const mockDoses = [
        {
          id: 'dose1',
          parentId: 'parent123',
          medicineId: 'med1',
          status: 'taken',
          scheduledTime: { toDate: () => new Date('2026-02-20T08:00:00') },
        },
        {
          id: 'dose2',
          parentId: 'parent123',
          medicineId: 'med1',
          status: 'missed',
          scheduledTime: { toDate: () => new Date('2026-02-19T08:00:00') },
        },
        {
          id: 'dose3',
          parentId: 'parent123',
          medicineId: 'med2',
          status: 'taken',
          scheduledTime: { toDate: () => new Date('2026-02-18T12:00:00') },
        },
      ];

      mockGet.mockResolvedValue({
        forEach: callback =>
          mockDoses.forEach(dose =>
            callback({ id: dose.id, data: () => dose }),
          ),
      });

      // Act
      const { result } = renderHook(() =>
        useAdherence(parentId, startDate, endDate),
      );

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert
      expect(result.current.byMedicine).toHaveProperty('med1');
      expect(result.current.byMedicine).toHaveProperty('med2');
      expect(result.current.byMedicine.med1.percentage).toBe(50); // 1 taken / 2 total
      expect(result.current.byMedicine.med2.percentage).toBe(100); // 1 taken / 1 total
    });

    it('should return empty metrics when no parentId is provided', async () => {
      // Arrange
      const startDate = new Date('2026-02-14');
      const endDate = new Date('2026-02-21');

      // Act
      const { result } = renderHook(() =>
        useAdherence(null, startDate, endDate),
      );

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert
      expect(result.current.percentage).toBe(0);
      expect(result.current.taken).toBe(0);
      expect(result.current.missed).toBe(0);
      expect(result.current.total).toBe(0);
      expect(result.current.doses).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const parentId = 'parent123';
      const startDate = new Date('2026-02-14');
      const endDate = new Date('2026-02-21');

      const mockError = new Error('Firestore error');
      mockGet.mockRejectedValue(mockError);

      // Act
      const { result } = renderHook(() =>
        useAdherence(parentId, startDate, endDate),
      );

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert
      expect(result.current.error).toBe(mockError);
      expect(result.current.doses).toEqual([]);
      expect(result.current.percentage).toBe(0);
    });

    it('should handle invalid date range', async () => {
      // Arrange
      const parentId = 'parent123';
      const startDate = new Date('2026-02-21');
      const endDate = new Date('2026-02-14'); // End before start

      // Act
      const { result } = renderHook(() =>
        useAdherence(parentId, startDate, endDate),
      );

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert
      expect(result.current.error).toEqual(
        new Error('Start date must be before end date'),
      );
      expect(result.current.doses).toEqual([]);
      expect(mockGet).not.toHaveBeenCalled();
    });
  });

  describe('Refetch functionality', () => {
    it('should refetch doses when refetch is called', async () => {
      // Arrange
      const parentId = 'parent123';
      const startDate = new Date('2026-02-14');
      const endDate = new Date('2026-02-21');

      mockGet.mockResolvedValue({
        forEach: () => {},
      });

      // Act
      const { result } = renderHook(() =>
        useAdherence(parentId, startDate, endDate),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Clear previous calls
      mockGet.mockClear();

      // Call refetch
      result.current.refetch();

      // Wait for refetch to complete
      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Memoization', () => {
    it('should memoize calculations when doses do not change', async () => {
      // Arrange
      const parentId = 'parent123';
      const startDate = new Date('2026-02-14');
      const endDate = new Date('2026-02-21');

      const mockDoses = [
        {
          id: 'dose1',
          parentId: 'parent123',
          medicineId: 'med1',
          status: 'taken',
          scheduledTime: { toDate: () => new Date('2026-02-20T08:00:00') },
        },
      ];

      mockGet.mockResolvedValue({
        forEach: callback =>
          mockDoses.forEach(dose =>
            callback({ id: dose.id, data: () => dose }),
          ),
      });

      // Act
      const { result, rerender } = renderHook(() =>
        useAdherence(parentId, startDate, endDate),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const firstByMedicine = result.current.byMedicine;

      // Rerender without changing doses
      rerender();

      // Assert - byMedicine should be the same reference (memoized)
      expect(result.current.byMedicine).toBe(firstByMedicine);
    });
  });
});
