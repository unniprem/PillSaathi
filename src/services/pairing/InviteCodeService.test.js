/**
 * InviteCodeService Unit Tests
 *
 * Tests for invite code generation and management
 * Requirements: 1.1, 1.2, 1.3, 1.5, 2.3, 8.1, 8.3
 */

import InviteCodeService from './InviteCodeService';

// Mock Firebase Firestore
jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn(),
  })),
}));

jest.mock('@react-native-firebase/app', () => ({
  getApp: jest.fn(() => ({})),
}));

describe('InviteCodeService', () => {
  let mockFirestore;
  let mockCollection;
  let mockQuery;
  let inviteCodeService;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Create mock query chain
    mockQuery = {
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn(),
    };

    // Create mock collection
    mockCollection = jest.fn().mockReturnValue(mockQuery);

    // Create mock firestore instance
    mockFirestore = {
      collection: mockCollection,
    };

    // Create a new InviteCodeService instance with the mock
    const InviteCodeServiceClass = require('./InviteCodeService').default
      .constructor;
    inviteCodeService = new InviteCodeServiceClass(mockFirestore);
  });

  describe('generateRandomCode', () => {
    it('should generate 8-character code by default', () => {
      // Act
      const code = inviteCodeService.generateRandomCode();

      // Assert
      expect(code).toHaveLength(8);
    });

    it('should generate code with specified length', () => {
      // Act
      const code = inviteCodeService.generateRandomCode(12);

      // Assert
      expect(code).toHaveLength(12);
    });

    it('should generate uppercase alphanumeric code', () => {
      // Act
      const code = inviteCodeService.generateRandomCode(8);

      // Assert
      expect(code).toMatch(/^[A-Z0-9]{8}$/);
    });

    it('should generate different codes on multiple calls', () => {
      // Act
      const code1 = inviteCodeService.generateRandomCode(8);
      const code2 = inviteCodeService.generateRandomCode(8);
      const code3 = inviteCodeService.generateRandomCode(8);

      // Assert - at least one should be different (extremely high probability)
      const allSame = code1 === code2 && code2 === code3;
      expect(allSame).toBe(false);
    });
  });

  describe('calculateExpiration', () => {
    it('should calculate expiration 24 hours from now by default', () => {
      // Arrange
      const beforeCall = new Date();

      // Act
      const expiresAt = inviteCodeService.calculateExpiration();

      // Assert
      const afterCall = new Date();
      const expectedMin = new Date(beforeCall.getTime() + 24 * 60 * 60 * 1000);
      const expectedMax = new Date(afterCall.getTime() + 24 * 60 * 60 * 1000);

      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime());
      expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMax.getTime());
    });

    it('should calculate expiration with custom hours', () => {
      // Arrange
      const beforeCall = new Date();
      const hours = 48;

      // Act
      const expiresAt = inviteCodeService.calculateExpiration(hours);

      // Assert
      const afterCall = new Date();
      const expectedMin = new Date(
        beforeCall.getTime() + hours * 60 * 60 * 1000,
      );
      const expectedMax = new Date(
        afterCall.getTime() + hours * 60 * 60 * 1000,
      );

      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime());
      expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMax.getTime());
    });

    it('should return Date object', () => {
      // Act
      const expiresAt = inviteCodeService.calculateExpiration();

      // Assert
      expect(expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('isCodeExpired', () => {
    it('should return true for past date', () => {
      // Arrange
      const pastDate = new Date(Date.now() - 1000); // 1 second ago

      // Act
      const isExpired = inviteCodeService.isCodeExpired(pastDate);

      // Assert
      expect(isExpired).toBe(true);
    });

    it('should return false for future date', () => {
      // Arrange
      const futureDate = new Date(Date.now() + 1000); // 1 second from now

      // Act
      const isExpired = inviteCodeService.isCodeExpired(futureDate);

      // Assert
      expect(isExpired).toBe(false);
    });

    it('should return false for exact current time', () => {
      // Arrange - create a date slightly in the future to account for execution time
      const almostNow = new Date(Date.now() + 10);

      // Act
      const isExpired = inviteCodeService.isCodeExpired(almostNow);

      // Assert - should not be expired yet
      expect(isExpired).toBe(false);
    });
  });

  describe('generateInviteCode', () => {
    it('should return existing active code if one exists', async () => {
      // Arrange
      const parentUid = 'test-parent-uid';
      const existingCode = {
        code: 'ABC12345',
        parentUid,
        createdAt: { toDate: () => new Date('2024-01-01') },
        expiresAt: { toDate: () => new Date(Date.now() + 1000 * 60 * 60) },
      };

      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: [
          {
            data: () => existingCode,
          },
        ],
      });

      // Act
      const result = await inviteCodeService.generateInviteCode(parentUid);

      // Assert
      expect(result.code).toBe('ABC12345');
      expect(result.parentUid).toBe(parentUid);
      expect(mockCollection).toHaveBeenCalledWith('inviteCodes');
    });

    it('should generate new code if no active code exists', async () => {
      // Arrange
      const parentUid = 'test-parent-uid';

      mockQuery.get.mockResolvedValue({
        empty: true,
        docs: [],
      });

      mockQuery.add = jest.fn().mockResolvedValue({
        id: 'new-doc-id',
      });

      // Mock collection to return query with add method
      mockFirestore.collection = jest.fn().mockReturnValue({
        ...mockQuery,
        add: mockQuery.add,
      });

      // Act
      const result = await inviteCodeService.generateInviteCode(parentUid);

      // Assert
      expect(result.code).toMatch(/^[A-Z0-9]{8}$/);
      expect(result.parentUid).toBe(parentUid);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(mockQuery.add).toHaveBeenCalled();
    });

    it('should store code with all required fields', async () => {
      // Arrange
      const parentUid = 'test-parent-uid';

      mockQuery.get.mockResolvedValue({
        empty: true,
        docs: [],
      });

      mockQuery.add = jest.fn().mockResolvedValue({
        id: 'new-doc-id',
      });

      mockFirestore.collection = jest.fn().mockReturnValue({
        ...mockQuery,
        add: mockQuery.add,
      });

      // Act
      await inviteCodeService.generateInviteCode(parentUid);

      // Assert
      expect(mockQuery.add).toHaveBeenCalledWith(
        expect.objectContaining({
          code: expect.any(String),
          parentUid,
          createdAt: expect.any(Date),
          expiresAt: expect.any(Date),
          usedCount: 0,
        }),
      );
    });

    it('should throw error if Firestore operation fails', async () => {
      // Arrange
      const parentUid = 'test-parent-uid';
      const firestoreError = new Error('Firestore error');

      mockQuery.get.mockRejectedValue(firestoreError);

      // Act & Assert
      await expect(
        inviteCodeService.generateInviteCode(parentUid),
      ).rejects.toThrow('Failed to generate invite code');
    });
  });

  describe('getActiveInviteCode', () => {
    it('should return active code if one exists', async () => {
      // Arrange
      const parentUid = 'test-parent-uid';
      const activeCode = {
        code: 'XYZ98765',
        parentUid,
        createdAt: { toDate: () => new Date('2024-01-01') },
        expiresAt: { toDate: () => new Date(Date.now() + 1000 * 60 * 60) },
      };

      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: [
          {
            data: () => activeCode,
          },
        ],
      });

      // Act
      const result = await inviteCodeService.getActiveInviteCode(parentUid);

      // Assert
      expect(result).not.toBeNull();
      expect(result.code).toBe('XYZ98765');
      expect(result.parentUid).toBe(parentUid);
      expect(mockCollection).toHaveBeenCalledWith('inviteCodes');
    });

    it('should return null if no active code exists', async () => {
      // Arrange
      const parentUid = 'test-parent-uid';

      mockQuery.get.mockResolvedValue({
        empty: true,
        docs: [],
      });

      // Act
      const result = await inviteCodeService.getActiveInviteCode(parentUid);

      // Assert
      expect(result).toBeNull();
    });

    it('should throw error if Firestore query fails', async () => {
      // Arrange
      const parentUid = 'test-parent-uid';
      const queryError = new Error('Query failed');

      mockQuery.get.mockRejectedValue(queryError);

      // Act & Assert
      await expect(
        inviteCodeService.getActiveInviteCode(parentUid),
      ).rejects.toThrow('Failed to get active invite code');
    });
  });
});
