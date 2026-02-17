/**
 * Tests for CloudFunctionsService
 *
 * These tests verify the client-side Cloud Functions integration service.
 * Requirements: 3.1, 3.5, 6.2, 9.1
 */

import { CloudFunctionsService } from './CloudFunctionsService';

// Mock Firebase functions module
const mockGetFunctions = jest.fn();
const mockHttpsCallable = jest.fn();

jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: mockGetFunctions,
  httpsCallable: mockHttpsCallable,
}));

jest.mock('@react-native-firebase/app', () => ({
  getApp: jest.fn(),
}));

describe('CloudFunctionsService', () => {
  let mockFunctions;
  let mockCallable;
  let service;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock functions
    mockCallable = jest.fn();
    mockFunctions = {};

    mockGetFunctions.mockReturnValue(mockFunctions);
    mockHttpsCallable.mockReturnValue(mockCallable);

    // Create service instance
    service = new CloudFunctionsService(mockFunctions);
  });

  describe('redeemInviteCode', () => {
    test('should call Cloud Function with correct parameters', async () => {
      // Requirements: 3.1 - Redeem invite code
      const mockResult = {
        data: {
          success: true,
          relationshipId: 'rel123',
          message: 'Relationship created successfully',
        },
      };

      mockCallable.mockResolvedValue(mockResult);

      const result = await service.redeemInviteCode('ABC12345', 'caregiver123');

      expect(result).toEqual(mockResult.data);
      expect(mockCallable).toHaveBeenCalledWith({
        code: 'ABC12345',
        caregiverUid: 'caregiver123',
      });
    });

    test('should handle successful redemption', async () => {
      // Requirements: 3.5 - Create relationship from valid code
      const mockResult = {
        data: {
          success: true,
          relationshipId: 'rel123',
          message: 'Relationship created successfully',
        },
      };

      mockCallable.mockResolvedValue(mockResult);

      const result = await service.redeemInviteCode('ABC12345', 'caregiver123');

      expect(result.success).toBe(true);
      expect(result.relationshipId).toBe('rel123');
      expect(result.message).toBe('Relationship created successfully');
    });

    test('should handle existing relationship (idempotence)', async () => {
      // Requirements: 3.7 - Idempotent behavior
      const mockResult = {
        data: {
          success: true,
          relationshipId: 'rel123',
          message: 'Relationship already exists',
        },
      };

      mockCallable.mockResolvedValue(mockResult);

      const result = await service.redeemInviteCode('ABC12345', 'caregiver123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Relationship already exists');
    });

    test('should map unauthenticated error', async () => {
      // Requirements: 9.1 - Error message mapping
      const mockError = {
        code: 'unauthenticated',
        message: 'User must be authenticated',
      };

      mockCallable.mockRejectedValue(mockError);

      await expect(
        service.redeemInviteCode('ABC12345', 'caregiver123'),
      ).rejects.toMatchObject({
        code: 'unauthenticated',
        message: 'Please log in to continue',
      });
    });

    test('should map invalid code format error', async () => {
      // Requirements: 9.1 - Error message mapping
      const mockError = {
        code: 'invalid-argument',
        message: 'Invalid code format',
      };

      mockCallable.mockRejectedValue(mockError);

      await expect(
        service.redeemInviteCode('ABC', 'caregiver123'),
      ).rejects.toMatchObject({
        code: 'invalid-code-format',
        message: 'Please enter a valid 8-character code',
      });
    });

    test('should map not found error', async () => {
      // Requirements: 9.1 - Error message mapping
      const mockError = {
        code: 'not-found',
        message: 'Invalid invite code',
      };

      mockCallable.mockRejectedValue(mockError);

      await expect(
        service.redeemInviteCode('ABC12345', 'caregiver123'),
      ).rejects.toMatchObject({
        code: 'code-not-found',
        message: 'This invite code is invalid. Please check and try again',
      });
    });

    test('should map expired code error', async () => {
      // Requirements: 9.1 - Error message mapping
      const mockError = {
        code: 'failed-precondition',
        message: 'Code has expired',
      };

      mockCallable.mockRejectedValue(mockError);

      await expect(
        service.redeemInviteCode('ABC12345', 'caregiver123'),
      ).rejects.toMatchObject({
        code: 'code-expired',
        message: 'This invite code has expired. Please ask for a new code',
      });
    });

    test('should map permission denied error', async () => {
      // Requirements: 9.1 - Error message mapping
      const mockError = {
        code: 'permission-denied',
        message: 'Not authorized',
      };

      mockCallable.mockRejectedValue(mockError);

      await expect(
        service.redeemInviteCode('ABC12345', 'caregiver123'),
      ).rejects.toMatchObject({
        code: 'permission-denied',
        message: 'You can only redeem invite codes for yourself',
      });
    });

    test('should map network errors', async () => {
      // Requirements: 9.1 - Error message mapping
      const mockError = {
        code: 'unavailable',
        message: 'Service unavailable',
      };

      mockCallable.mockRejectedValue(mockError);

      await expect(
        service.redeemInviteCode('ABC12345', 'caregiver123'),
      ).rejects.toMatchObject({
        code: 'network-error',
        message: 'Network error. Please check your connection and try again',
      });
    });

    test('should map unknown errors', async () => {
      // Requirements: 9.1 - Error message mapping
      const mockError = {
        code: 'internal',
        message: 'Internal server error',
      };

      mockCallable.mockRejectedValue(mockError);

      await expect(
        service.redeemInviteCode('ABC12345', 'caregiver123'),
      ).rejects.toMatchObject({
        code: 'unknown',
        message: 'Internal server error',
      });
    });

    test('should preserve original error for debugging', async () => {
      // Test that original error is attached to mapped error
      const mockError = {
        code: 'not-found',
        message: 'Invalid invite code',
      };

      mockCallable.mockRejectedValue(mockError);

      try {
        await service.redeemInviteCode('ABC12345', 'caregiver123');
      } catch (error) {
        expect(error.originalError).toEqual(mockError);
      }
    });
  });

  describe('removeRelationship', () => {
    test('should call Cloud Function with correct parameters', async () => {
      // Requirements: 6.2 - Remove relationship
      const mockResult = {
        data: {
          success: true,
        },
      };

      mockCallable.mockResolvedValue(mockResult);

      const result = await service.removeRelationship('rel123');

      expect(result).toEqual(mockResult.data);
      expect(mockCallable).toHaveBeenCalledWith({
        relationshipId: 'rel123',
      });
    });

    test('should handle successful removal', async () => {
      // Requirements: 6.2 - Remove relationship
      const mockResult = {
        data: {
          success: true,
        },
      };

      mockCallable.mockResolvedValue(mockResult);

      const result = await service.removeRelationship('rel123');

      expect(result.success).toBe(true);
    });

    test('should map permission denied error for removal', async () => {
      // Requirements: 9.1 - Error message mapping
      const mockError = {
        code: 'permission-denied',
        message: 'Not authorized',
      };

      mockCallable.mockRejectedValue(mockError);

      await expect(service.removeRelationship('rel123')).rejects.toMatchObject({
        code: 'permission-denied',
        message: 'You do not have permission to perform this action',
      });
    });

    test('should map not found error for removal', async () => {
      // Requirements: 9.1 - Error message mapping
      const mockError = {
        code: 'not-found',
        message: 'Relationship not found',
      };

      mockCallable.mockRejectedValue(mockError);

      await expect(service.removeRelationship('rel123')).rejects.toMatchObject({
        code: 'code-not-found',
        message: 'Relationship not found',
      });
    });
  });

  describe('Error mapping', () => {
    test('should handle errors without code property', async () => {
      // Test that errors without code property are mapped to unknown
      const mockError = new Error('Something went wrong');

      mockCallable.mockRejectedValue(mockError);

      await expect(
        service.redeemInviteCode('ABC12345', 'caregiver123'),
      ).rejects.toMatchObject({
        code: 'unknown',
        message: 'Something went wrong',
      });
    });

    test('should use default message for errors without message', async () => {
      // Test that errors without message get default message
      const mockError = {
        code: 'internal',
      };

      mockCallable.mockRejectedValue(mockError);

      await expect(
        service.redeemInviteCode('ABC12345', 'caregiver123'),
      ).rejects.toMatchObject({
        code: 'unknown',
        message: 'An error occurred. Please try again',
      });
    });
  });
});
