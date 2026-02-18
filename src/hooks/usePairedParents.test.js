/**
 * Tests for usePairedParents Hook
 *
 * Requirements: 1.1
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { usePairedParents } from './usePairedParents';
import { useAuth } from '../contexts/AuthContext';
import RelationshipService from '../services/pairing/RelationshipService';
import { getFirestore } from '@react-native-firebase/firestore';

// Mock dependencies
jest.mock('../contexts/AuthContext');
jest.mock('../services/pairing/RelationshipService');
jest.mock('@react-native-firebase/firestore');
jest.mock('@react-native-firebase/app');

describe('usePairedParents', () => {
  let mockFirestore;

  beforeEach(() => {
    // Mock Firestore
    mockFirestore = {
      collection: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      get: jest.fn(),
    };
    getFirestore.mockReturnValue(mockFirestore);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Requirement 1.1: Fetch all paired parents', () => {
    it('should fetch paired parents for caregiver', async () => {
      // Arrange
      const mockUser = { uid: 'caregiver123' };
      useAuth.mockReturnValue({
        user: mockUser,
      });

      const mockRelationships = [
        {
          id: 'rel1',
          parentUid: 'parent1',
          parentName: 'John Doe',
          parentAlias: 'Dad',
          parentPhone: '1234567890',
        },
        {
          id: 'rel2',
          parentUid: 'parent2',
          parentName: 'Jane Smith',
          parentAlias: null,
          parentPhone: '0987654321',
        },
      ];

      RelationshipService.getRelationships.mockResolvedValue(mockRelationships);

      // Mock empty schedules for both parents
      mockFirestore.get.mockResolvedValue({
        empty: true,
        docs: [],
      });

      // Act
      const { result } = renderHook(() => usePairedParents());

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert
      expect(RelationshipService.getRelationships).toHaveBeenCalledWith(
        'caregiver123',
        'caregiver',
      );
      expect(result.current.parents).toHaveLength(2);
      expect(result.current.parents[0]).toMatchObject({
        id: 'parent1',
        name: 'Dad', // Uses alias
        actualName: 'John Doe',
        alias: 'Dad',
      });
      expect(result.current.parents[1]).toMatchObject({
        id: 'parent2',
        name: 'Jane Smith', // Uses actual name when no alias
        actualName: 'Jane Smith',
        alias: null,
      });
      expect(result.current.error).toBeNull();
    });

    it('should return empty array when no user is logged in', async () => {
      // Arrange
      useAuth.mockReturnValue({
        user: null,
      });

      // Act
      const { result } = renderHook(() => usePairedParents());

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert
      expect(result.current.parents).toEqual([]);
      expect(RelationshipService.getRelationships).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const mockUser = { uid: 'caregiver123' };
      useAuth.mockReturnValue({
        user: mockUser,
      });

      const mockError = new Error('Failed to fetch relationships');
      RelationshipService.getRelationships.mockRejectedValue(mockError);

      // Act
      const { result } = renderHook(() => usePairedParents());

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert
      expect(result.current.error).toBe(mockError);
      expect(result.current.parents).toEqual([]);
    });

    it('should calculate upcoming medicine count', async () => {
      // Arrange
      const mockUser = { uid: 'caregiver123' };
      useAuth.mockReturnValue({
        user: mockUser,
      });

      const mockRelationships = [
        {
          id: 'rel1',
          parentUid: 'parent1',
          parentName: 'John Doe',
          parentAlias: null,
          parentPhone: '1234567890',
        },
      ];

      RelationshipService.getRelationships.mockResolvedValue(mockRelationships);

      // Mock schedules with times
      mockFirestore.get.mockResolvedValue({
        empty: false,
        docs: [
          {
            data: () => ({
              times: ['08:00', '12:00', '20:00'],
              status: 'active',
            }),
          },
          {
            data: () => ({
              times: ['09:00'],
              status: 'active',
            }),
          },
        ],
      });

      // Act
      const { result } = renderHook(() => usePairedParents());

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert
      expect(result.current.parents[0].upcomingMedicineCount).toBe(4); // 3 + 1
    });
  });

  describe('Refetch functionality', () => {
    it('should refetch parents when refetch is called', async () => {
      // Arrange
      const mockUser = { uid: 'caregiver123' };
      useAuth.mockReturnValue({
        user: mockUser,
      });

      RelationshipService.getRelationships.mockResolvedValue([]);
      mockFirestore.get.mockResolvedValue({ empty: true, docs: [] });

      // Act
      const { result } = renderHook(() => usePairedParents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Clear previous calls
      RelationshipService.getRelationships.mockClear();

      // Call refetch
      result.current.refetch();

      // Wait for refetch to complete
      await waitFor(() => {
        expect(RelationshipService.getRelationships).toHaveBeenCalledTimes(1);
      });
    });
  });
});
