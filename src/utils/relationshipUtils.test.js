/**
 * Relationship Utilities Unit Tests
 *
 * Tests for relationship utility functions including parent alias management
 * Requirements: 16.1, 16.2, 16.3
 */

import {
  getParentAlias,
  setParentAlias,
  getParentDisplayName,
} from './relationshipUtils';

// Mock Firebase Firestore
jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore: jest.fn(),
}));

jest.mock('@react-native-firebase/app', () => ({
  getApp: jest.fn(),
}));

describe('relationshipUtils', () => {
  let mockFirestore;
  let mockRelationshipDoc;
  let mockRelationshipRef;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRelationshipDoc = {
      exists: true,
      data: jest.fn(),
    };

    mockRelationshipRef = {
      get: jest.fn().mockResolvedValue(mockRelationshipDoc),
      update: jest.fn().mockResolvedValue(undefined),
    };

    mockFirestore = {
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue(mockRelationshipRef),
      }),
    };
  });

  describe('getParentAlias', () => {
    it('should return alias when set', async () => {
      // Arrange
      mockRelationshipDoc.data.mockReturnValue({
        parentAlias: 'Mom',
        parentUid: 'parent123',
        caregiverUid: 'caregiver123',
      });

      // Act
      const alias = await getParentAlias('relationship123', mockFirestore);

      // Assert
      expect(alias).toBe('Mom');
      expect(mockFirestore.collection).toHaveBeenCalledWith('relationships');
    });

    it('should return null when alias is not set', async () => {
      // Arrange
      mockRelationshipDoc.data.mockReturnValue({
        parentUid: 'parent123',
        caregiverUid: 'caregiver123',
      });

      // Act
      const alias = await getParentAlias('relationship123', mockFirestore);

      // Assert
      expect(alias).toBeNull();
    });

    it('should throw error when relationship does not exist', async () => {
      // Arrange
      mockRelationshipDoc.exists = false;

      // Act & Assert
      await expect(
        getParentAlias('relationship123', mockFirestore),
      ).rejects.toThrow('Relationship not found');
    });

    it('should throw mapped error on Firestore failure', async () => {
      // Arrange
      mockRelationshipRef.get.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(
        getParentAlias('relationship123', mockFirestore),
      ).rejects.toThrow('Failed to get parent alias');
    });
  });

  describe('setParentAlias', () => {
    it('should set alias successfully', async () => {
      // Arrange
      const relationshipId = 'relationship123';
      const alias = 'Dad';

      // Act
      await setParentAlias(relationshipId, alias, mockFirestore);

      // Assert
      expect(mockRelationshipRef.update).toHaveBeenCalledWith({
        parentAlias: 'Dad',
        updatedAt: expect.any(Date),
      });
    });

    it('should set alias to null when empty string provided', async () => {
      // Arrange
      const relationshipId = 'relationship123';
      const alias = '';

      // Act
      await setParentAlias(relationshipId, alias, mockFirestore);

      // Assert
      expect(mockRelationshipRef.update).toHaveBeenCalledWith({
        parentAlias: null,
        updatedAt: expect.any(Date),
      });
    });

    it('should throw error when relationship does not exist', async () => {
      // Arrange
      mockRelationshipDoc.exists = false;

      // Act & Assert
      await expect(
        setParentAlias('relationship123', 'Mom', mockFirestore),
      ).rejects.toThrow('Relationship not found');
    });

    it('should throw mapped error on update failure', async () => {
      // Arrange
      mockRelationshipRef.update.mockRejectedValue(
        new Error('Permission denied'),
      );

      // Act & Assert
      await expect(
        setParentAlias('relationship123', 'Mom', mockFirestore),
      ).rejects.toThrow('Failed to set parent alias');
    });
  });

  describe('getParentDisplayName', () => {
    it('should return alias when set', () => {
      // Arrange
      const relationship = {
        parentName: 'John Doe',
        parentAlias: 'Dad',
      };

      // Act
      const displayName = getParentDisplayName(relationship);

      // Assert
      expect(displayName).toBe('Dad');
    });

    it('should return parent name when alias is not set', () => {
      // Arrange
      const relationship = {
        parentName: 'John Doe',
      };

      // Act
      const displayName = getParentDisplayName(relationship);

      // Assert
      expect(displayName).toBe('John Doe');
    });

    it('should return empty string when relationship is null', () => {
      // Act
      const displayName = getParentDisplayName(null);

      // Assert
      expect(displayName).toBe('');
    });

    it('should return empty string when relationship is undefined', () => {
      // Act
      const displayName = getParentDisplayName(undefined);

      // Assert
      expect(displayName).toBe('');
    });

    it('should return empty string when both name and alias are missing', () => {
      // Arrange
      const relationship = {
        parentUid: 'parent123',
      };

      // Act
      const displayName = getParentDisplayName(relationship);

      // Assert
      expect(displayName).toBe('');
    });
  });
});
