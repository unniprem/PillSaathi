/**
 * Tests for useMissedDoses Hook
 *
 * Requirements: Phase 5 - Escalation (5.7.3)
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useMissedDoses } from '../useMissedDoses';
import firestore from '@react-native-firebase/firestore';

// Mock dependencies
jest.mock('@react-native-firebase/firestore');
jest.mock('@react-native-firebase/app');

describe('useMissedDoses', () => {
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
      limit: jest.fn().mockReturnThis(),
      startAfter: jest.fn().mockReturnThis(),
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

  describe('Fetching missed doses', () => {
    it('should fetch missed doses for a parent', async () => {
      // Arrange
      const filters = {
        parentId: 'parent123',
        pageSize: 20,
      };

      const mockDoses = [
        {
          id: 'dose1',
          parentId: 'parent123',
          medicineId: 'med1',
          medicineName: 'Medicine A',
          status: 'missed',
          scheduledTime: { toDate: () => new Date('2026-02-20T08:00:00') },
          missedAt: { toDate: () => new Date('2026-02-20T08:35:00') },
        },
        {
          id: 'dose2',
          parentId: 'parent123',
          medicineId: 'med2',
          medicineName: 'Medicine B',
          status: 'missed',
          scheduledTime: { toDate: () => new Date('2026-02-19T12:00:00') },
          missedAt: { toDate: () => new Date('2026-02-19T12:35:00') },
        },
      ];

      const mockDocs = mockDoses.map(dose => ({
        id: dose.id,
        data: () => dose,
      }));

      mockGet.mockResolvedValue({
        forEach: callback => mockDocs.forEach(callback),
        docs: mockDocs,
      });

      // Act
      const { result } = renderHook(() => useMissedDoses(filters));

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert
      expect(mockCollection).toHaveBeenCalledWith('doses');
      expect(mockQuery.where).toHaveBeenCalledWith(
        'parentId',
        '==',
        'parent123',
      );
      expect(mockQuery.where).toHaveBeenCalledWith('status', '==', 'missed');
      expect(mockQuery.orderBy).toHaveBeenCalledWith('scheduledTime', 'desc');
      expect(mockQuery.limit).toHaveBeenCalledWith(20);

      expect(result.current.doses).toHaveLength(2);
      expect(result.current.doses[0].id).toBe('dose1');
      expect(result.current.doses[1].id).toBe('dose2');
      expect(result.current.error).toBeNull();
      expect(result.current.hasMore).toBe(false); // Less than pageSize
    });

    it('should apply medicine filter when provided', async () => {
      // Arrange
      const filters = {
        parentId: 'parent123',
        medicineId: 'med1',
        pageSize: 20,
      };

      mockGet.mockResolvedValue({
        forEach: () => {},
        docs: [],
      });

      // Act
      const { result } = renderHook(() => useMissedDoses(filters));

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert
      expect(mockQuery.where).toHaveBeenCalledWith('medicineId', '==', 'med1');
    });

    it('should apply date range filters when provided', async () => {
      // Arrange
      const startDate = new Date('2026-02-14');
      const endDate = new Date('2026-02-21');

      const filters = {
        parentId: 'parent123',
        startDate,
        endDate,
        pageSize: 20,
      };

      mockGet.mockResolvedValue({
        forEach: () => {},
        docs: [],
      });

      // Act
      const { result } = renderHook(() => useMissedDoses(filters));

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert
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
    });

    it('should return empty array when no parentId is provided', async () => {
      // Arrange
      const filters = {
        parentId: null,
      };

      // Act
      const { result } = renderHook(() => useMissedDoses(filters));

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert
      expect(result.current.doses).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(result.current.hasMore).toBe(false);
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const filters = {
        parentId: 'parent123',
      };

      const mockError = new Error('Firestore error');
      mockGet.mockRejectedValue(mockError);

      // Act
      const { result } = renderHook(() => useMissedDoses(filters));

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert
      expect(result.current.error).toBe(mockError);
      expect(result.current.doses).toEqual([]);
    });

    it('should handle invalid date range', async () => {
      // Arrange
      const filters = {
        parentId: 'parent123',
        startDate: new Date('2026-02-21'),
        endDate: new Date('2026-02-14'), // End before start
      };

      // Act
      const { result } = renderHook(() => useMissedDoses(filters));

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

  describe('Pagination', () => {
    it('should set hasMore to true when full page is returned', async () => {
      // Arrange
      const filters = {
        parentId: 'parent123',
        pageSize: 2,
      };

      const mockDoses = [
        {
          id: 'dose1',
          parentId: 'parent123',
          medicineId: 'med1',
          status: 'missed',
          scheduledTime: { toDate: () => new Date('2026-02-20T08:00:00') },
        },
        {
          id: 'dose2',
          parentId: 'parent123',
          medicineId: 'med2',
          status: 'missed',
          scheduledTime: { toDate: () => new Date('2026-02-19T12:00:00') },
        },
      ];

      const mockDocs = mockDoses.map(dose => ({
        id: dose.id,
        data: () => dose,
      }));

      mockGet.mockResolvedValue({
        forEach: callback => mockDocs.forEach(callback),
        docs: mockDocs,
      });

      // Act
      const { result } = renderHook(() => useMissedDoses(filters));

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert
      expect(result.current.hasMore).toBe(true); // Full page returned
    });

    it('should load more doses when loadMore is called', async () => {
      // Arrange
      const filters = {
        parentId: 'parent123',
        pageSize: 2,
      };

      const firstPageDoses = [
        {
          id: 'dose1',
          parentId: 'parent123',
          medicineId: 'med1',
          status: 'missed',
          scheduledTime: { toDate: () => new Date('2026-02-20T08:00:00') },
        },
        {
          id: 'dose2',
          parentId: 'parent123',
          medicineId: 'med2',
          status: 'missed',
          scheduledTime: { toDate: () => new Date('2026-02-19T12:00:00') },
        },
      ];

      const secondPageDoses = [
        {
          id: 'dose3',
          parentId: 'parent123',
          medicineId: 'med3',
          status: 'missed',
          scheduledTime: { toDate: () => new Date('2026-02-18T08:00:00') },
        },
      ];

      const firstPageDocs = firstPageDoses.map(dose => ({
        id: dose.id,
        data: () => dose,
      }));

      const secondPageDocs = secondPageDoses.map(dose => ({
        id: dose.id,
        data: () => dose,
      }));

      // First call returns first page
      mockGet.mockResolvedValueOnce({
        forEach: callback => firstPageDocs.forEach(callback),
        docs: firstPageDocs,
      });

      // Second call returns second page
      mockGet.mockResolvedValueOnce({
        forEach: callback => secondPageDocs.forEach(callback),
        docs: secondPageDocs,
      });

      // Act
      const { result } = renderHook(() => useMissedDoses(filters));

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.doses).toHaveLength(2);
      expect(result.current.hasMore).toBe(true);

      // Load more
      await waitFor(() => {
        result.current.loadMore();
      });

      // Wait for loadMore to complete
      await waitFor(() => {
        expect(result.current.loadingMore).toBe(false);
      });

      // Assert
      expect(result.current.doses).toHaveLength(3);
      expect(result.current.doses[0].id).toBe('dose1');
      expect(result.current.doses[1].id).toBe('dose2');
      expect(result.current.doses[2].id).toBe('dose3');
      expect(result.current.hasMore).toBe(false); // Less than pageSize
      expect(mockQuery.startAfter).toHaveBeenCalled();
    });

    it('should not load more when already loading', async () => {
      // Arrange
      const filters = {
        parentId: 'parent123',
        pageSize: 2,
      };

      mockGet.mockResolvedValue({
        forEach: () => {},
        docs: [],
      });

      // Act
      const { result } = renderHook(() => useMissedDoses(filters));

      // Try to load more while still loading
      result.current.loadMore();

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert - should only have called get once
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('should not load more when hasMore is false', async () => {
      // Arrange
      const filters = {
        parentId: 'parent123',
        pageSize: 2,
      };

      const mockDoses = [
        {
          id: 'dose1',
          parentId: 'parent123',
          medicineId: 'med1',
          status: 'missed',
          scheduledTime: { toDate: () => new Date('2026-02-20T08:00:00') },
        },
      ];

      const mockDocs = mockDoses.map(dose => ({
        id: dose.id,
        data: () => dose,
      }));

      mockGet.mockResolvedValue({
        forEach: callback => mockDocs.forEach(callback),
        docs: mockDocs,
      });

      // Act
      const { result } = renderHook(() => useMissedDoses(filters));

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasMore).toBe(false);

      // Clear mock calls
      mockGet.mockClear();

      // Try to load more
      result.current.loadMore();

      // Wait a bit
      await waitFor(() => {
        expect(result.current.loadingMore).toBe(false);
      });

      // Assert - should not have called get again
      expect(mockGet).not.toHaveBeenCalled();
    });
  });

  describe('Refetch functionality', () => {
    it('should refetch doses from beginning when refetch is called', async () => {
      // Arrange
      const filters = {
        parentId: 'parent123',
        pageSize: 2,
      };

      mockGet.mockResolvedValue({
        forEach: () => {},
        docs: [],
      });

      // Act
      const { result } = renderHook(() => useMissedDoses(filters));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Clear previous calls
      mockGet.mockClear();
      mockQuery.startAfter.mockClear();

      // Call refetch
      result.current.refetch();

      // Wait for refetch to complete
      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledTimes(1);
      });

      // Assert - should not use startAfter (fetching from beginning)
      expect(mockQuery.startAfter).not.toHaveBeenCalled();
    });
  });

  describe('Filter changes', () => {
    it('should refetch when filters change', async () => {
      // Arrange
      const initialFilters = {
        parentId: 'parent123',
        medicineId: 'med1',
      };

      mockGet.mockResolvedValue({
        forEach: () => {},
        docs: [],
      });

      // Act
      const { result, rerender } = renderHook(
        ({ filters }) => useMissedDoses(filters),
        {
          initialProps: { filters: initialFilters },
        },
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Clear previous calls
      mockGet.mockClear();

      // Change filters
      const newFilters = {
        parentId: 'parent123',
        medicineId: 'med2',
      };

      rerender({ filters: newFilters });

      // Wait for refetch to complete
      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledTimes(1);
      });

      // Assert
      expect(mockQuery.where).toHaveBeenCalledWith('medicineId', '==', 'med2');
    });
  });
});
