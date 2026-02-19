/**
 * Tests for PairingService
 *
 * These tests verify the pairing service that handles invite code redemption
 * and relationship management directly in Firestore.
 */

import { PairingService } from './PairingService';

// Mock Firestore
const mockFirestore = {
  collection: jest.fn(),
};

describe('PairingService', () => {
  let service;
  let mockCollection;
  let mockDoc;
  let mockQuery;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock chain
    mockDoc = {
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      ref: {
        delete: jest.fn(),
        update: jest.fn(),
      },
    };

    mockQuery = {
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn(),
    };

    mockCollection = {
      doc: jest.fn(() => mockDoc),
      where: jest.fn(() => mockQuery),
      add: jest.fn(),
    };

    mockFirestore.collection.mockReturnValue(mockCollection);

    service = new PairingService();
    service.db = mockFirestore;
  });

  describe('redeemInviteCode', () => {
    test('should successfully redeem a valid invite code', async () => {
      const code = 'ABC12345';
      const caregiverUid = 'caregiver123';
      const parentUid = 'parent456';

      // Mock invite code query
      const mockInviteCodeDoc = {
        id: 'code123',
        data: () => ({
          code: 'ABC12345',
          parentUid,
          expiresAt: { seconds: Date.now() / 1000 + 86400 }, // expires tomorrow
          used: false,
        }),
        ref: {
          update: jest.fn(),
        },
      };

      mockQuery.get.mockResolvedValueOnce({
        empty: false,
        docs: [mockInviteCodeDoc],
      });

      // Mock existing relationship check
      mockDoc.get.mockResolvedValueOnce({
        exists: false,
      });

      // Mock relationship creation
      mockDoc.set.mockResolvedValueOnce();

      const result = await service.redeemInviteCode(code, caregiverUid);

      expect(result.success).toBe(true);
      expect(result.relationshipId).toBe(`${parentUid}_${caregiverUid}`);
      expect(mockDoc.set).toHaveBeenCalledWith({
        parentUid,
        caregiverUid,
        createdAt: expect.any(Object),
        createdBy: caregiverUid,
      });
      expect(mockInviteCodeDoc.ref.update).toHaveBeenCalled();
    });

    test('should reject invalid code format', async () => {
      const code = 'ABC'; // too short
      const caregiverUid = 'caregiver123';

      await expect(
        service.redeemInviteCode(code, caregiverUid),
      ).rejects.toMatchObject({
        code: 'invalid-argument',
      });
    });

    test('should reject non-existent code', async () => {
      const code = 'ABC12345';
      const caregiverUid = 'caregiver123';

      mockQuery.get.mockResolvedValueOnce({
        empty: true,
        docs: [],
      });

      await expect(
        service.redeemInviteCode(code, caregiverUid),
      ).rejects.toMatchObject({
        code: 'not-found',
      });
    });

    test('should reject expired code', async () => {
      const code = 'ABC12345';
      const caregiverUid = 'caregiver123';

      const mockInviteCodeDoc = {
        data: () => ({
          code: 'ABC12345',
          parentUid: 'parent456',
          expiresAt: { seconds: Date.now() / 1000 - 86400 }, // expired yesterday
          used: false,
        }),
      };

      mockQuery.get.mockResolvedValueOnce({
        empty: false,
        docs: [mockInviteCodeDoc],
      });

      await expect(
        service.redeemInviteCode(code, caregiverUid),
      ).rejects.toMatchObject({
        code: 'failed-precondition',
      });
    });

    test('should reject already used code', async () => {
      const code = 'ABC12345';
      const caregiverUid = 'caregiver123';

      const mockInviteCodeDoc = {
        data: () => ({
          code: 'ABC12345',
          parentUid: 'parent456',
          expiresAt: { seconds: Date.now() / 1000 + 86400 },
          used: true,
        }),
      };

      mockQuery.get.mockResolvedValueOnce({
        empty: false,
        docs: [mockInviteCodeDoc],
      });

      await expect(
        service.redeemInviteCode(code, caregiverUid),
      ).rejects.toMatchObject({
        code: 'failed-precondition',
      });
    });

    test('should reject if relationship already exists', async () => {
      const code = 'ABC12345';
      const caregiverUid = 'caregiver123';
      const parentUid = 'parent456';

      const mockInviteCodeDoc = {
        data: () => ({
          code: 'ABC12345',
          parentUid,
          expiresAt: { seconds: Date.now() / 1000 + 86400 },
          used: false,
        }),
      };

      mockQuery.get.mockResolvedValueOnce({
        empty: false,
        docs: [mockInviteCodeDoc],
      });

      // Mock existing relationship
      mockDoc.get.mockResolvedValueOnce({
        exists: true,
      });

      await expect(
        service.redeemInviteCode(code, caregiverUid),
      ).rejects.toMatchObject({
        code: 'already-exists',
      });
    });
  });

  describe('removeRelationship', () => {
    test('should successfully remove an existing relationship', async () => {
      const relationshipId = 'parent456_caregiver123';

      mockDoc.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          parentUid: 'parent456',
          caregiverUid: 'caregiver123',
        }),
        ref: {
          delete: jest.fn(),
        },
      });

      const result = await service.removeRelationship(relationshipId);

      expect(result.success).toBe(true);
      expect(mockDoc.ref.delete).toHaveBeenCalled();
    });

    test('should reject if relationship does not exist', async () => {
      const relationshipId = 'nonexistent';

      mockDoc.get.mockResolvedValueOnce({
        exists: false,
      });

      await expect(
        service.removeRelationship(relationshipId),
      ).rejects.toMatchObject({
        code: 'not-found',
      });
    });
  });
});
