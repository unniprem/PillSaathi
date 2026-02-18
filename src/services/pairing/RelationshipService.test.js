/**
 * RelationshipService Unit Tests
 *
 * Tests for relationship querying and management
 * Requirements: 4.1, 4.2, 4.3, 5.1, 5.2, 5.3
 */

// RelationshipService is imported for testing
// eslint-disable-next-line no-unused-vars
import RelationshipService from './RelationshipService';

// Mock Firebase Firestore
jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn(),
  })),
}));

jest.mock('@react-native-firebase/app', () => ({
  getApp: jest.fn(() => ({})),
}));

describe('RelationshipService', () => {
  let mockFirestore;
  // eslint-disable-next-line no-unused-vars
  let mockRelationshipsCollection;
  let mockUsersCollection;
  let mockQuery;
  let relationshipService;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Create mock query chain
    mockQuery = {
      where: jest.fn().mockReturnThis(),
      get: jest.fn(),
      onSnapshot: jest.fn(),
    };

    // Create mock collections
    mockRelationshipsCollection = jest.fn().mockReturnValue(mockQuery);
    mockUsersCollection = {
      doc: jest.fn(),
    };

    // Create mock firestore instance
    mockFirestore = {
      collection: jest.fn(collectionName => {
        if (collectionName === 'relationships') {
          return mockQuery;
        }
        if (collectionName === 'users') {
          return mockUsersCollection;
        }
        return mockQuery;
      }),
    };

    // Create a new RelationshipService instance with the mock
    const RelationshipServiceClass = require('./RelationshipService').default
      .constructor;
    relationshipService = new RelationshipServiceClass(mockFirestore);
  });

  describe('getUserProfile', () => {
    it('should return user profile with name and phone', async () => {
      // Arrange
      const uid = 'test-user-uid';
      const mockUserDoc = {
        exists: true,
        data: () => ({
          name: 'John Doe',
          phoneNumber: '+1234567890',
        }),
      };

      mockUsersCollection.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue(mockUserDoc),
      });

      // Act
      const profile = await relationshipService.getUserProfile(uid);

      // Assert
      expect(profile).toEqual({
        name: 'John Doe',
        phone: '+1234567890',
      });
      expect(mockUsersCollection.doc).toHaveBeenCalledWith(uid);
    });

    it('should handle phone field as fallback', async () => {
      // Arrange
      const uid = 'test-user-uid';
      const mockUserDoc = {
        exists: true,
        data: () => ({
          name: 'Jane Doe',
          phone: '+9876543210',
        }),
      };

      mockUsersCollection.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue(mockUserDoc),
      });

      // Act
      const profile = await relationshipService.getUserProfile(uid);

      // Assert
      expect(profile).toEqual({
        name: 'Jane Doe',
        phone: '+9876543210',
      });
    });

    it('should return empty strings for missing fields', async () => {
      // Arrange
      const uid = 'test-user-uid';
      const mockUserDoc = {
        exists: true,
        data: () => ({}),
      };

      mockUsersCollection.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue(mockUserDoc),
      });

      // Act
      const profile = await relationshipService.getUserProfile(uid);

      // Assert
      expect(profile).toEqual({
        name: '',
        phone: '',
      });
    });

    it('should throw error if user profile not found', async () => {
      // Arrange
      const uid = 'non-existent-uid';
      const mockUserDoc = {
        exists: false,
      };

      mockUsersCollection.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue(mockUserDoc),
      });

      // Act & Assert
      await expect(relationshipService.getUserProfile(uid)).rejects.toThrow(
        'User profile not found',
      );
    });

    it('should throw error if Firestore operation fails', async () => {
      // Arrange
      const uid = 'test-user-uid';
      const firestoreError = new Error('Firestore error');

      mockUsersCollection.doc.mockReturnValue({
        get: jest.fn().mockRejectedValue(firestoreError),
      });

      // Act & Assert
      await expect(relationshipService.getUserProfile(uid)).rejects.toThrow(
        'Failed to get user profile',
      );
    });
  });

  describe('getRelationships', () => {
    it('should return relationships for parent with caregiver profile data', async () => {
      // Arrange
      const parentUid = 'parent-uid';
      const caregiverUid = 'caregiver-uid';

      const mockRelationshipDocs = [
        {
          id: 'rel-1',
          data: () => ({
            parentUid,
            caregiverUid,
            createdAt: { toDate: () => new Date('2024-01-01') },
            createdBy: caregiverUid,
          }),
        },
      ];

      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: mockRelationshipDocs,
      });

      // Mock getUserProfile
      mockUsersCollection.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            name: 'Caregiver Name',
            phoneNumber: '+1111111111',
          }),
        }),
      });

      // Act
      const relationships = await relationshipService.getRelationships(
        parentUid,
        'parent',
      );

      // Assert
      expect(relationships).toHaveLength(1);
      expect(relationships[0]).toEqual({
        id: 'rel-1',
        parentUid,
        caregiverUid,
        createdAt: expect.any(Date),
        createdBy: caregiverUid,
        caregiverName: 'Caregiver Name',
        caregiverPhone: '+1111111111',
      });
      expect(mockQuery.where).toHaveBeenCalledWith(
        'parentUid',
        '==',
        parentUid,
      );
    });

    it('should return relationships for caregiver with parent profile data', async () => {
      // Arrange
      const parentUid = 'parent-uid';
      const caregiverUid = 'caregiver-uid';

      const mockRelationshipDocs = [
        {
          id: 'rel-2',
          data: () => ({
            parentUid,
            caregiverUid,
            createdAt: { toDate: () => new Date('2024-01-02') },
            createdBy: caregiverUid,
          }),
        },
      ];

      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: mockRelationshipDocs,
      });

      // Mock getUserProfile
      mockUsersCollection.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            name: 'Parent Name',
            phoneNumber: '+2222222222',
          }),
        }),
      });

      // Act
      const relationships = await relationshipService.getRelationships(
        caregiverUid,
        'caregiver',
      );

      // Assert
      expect(relationships).toHaveLength(1);
      expect(relationships[0]).toEqual({
        id: 'rel-2',
        parentUid,
        caregiverUid,
        createdAt: expect.any(Date),
        createdBy: caregiverUid,
        parentAlias: null,
        parentName: 'Parent Name',
        parentPhone: '+2222222222',
      });
      expect(mockQuery.where).toHaveBeenCalledWith(
        'caregiverUid',
        '==',
        caregiverUid,
      );
    });

    it('should include parentAlias field for caregiver when alias is set', async () => {
      // Arrange
      const parentUid = 'parent-uid';
      const caregiverUid = 'caregiver-uid';

      const mockRelationshipDocs = [
        {
          id: 'rel-alias',
          data: () => ({
            parentUid,
            caregiverUid,
            parentAlias: 'Mom',
            createdAt: { toDate: () => new Date('2024-01-02') },
            createdBy: caregiverUid,
          }),
        },
      ];

      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: mockRelationshipDocs,
      });

      // Mock getUserProfile
      mockUsersCollection.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            name: 'Jane Doe',
            phoneNumber: '+2222222222',
          }),
        }),
      });

      // Act
      const relationships = await relationshipService.getRelationships(
        caregiverUid,
        'caregiver',
      );

      // Assert
      expect(relationships).toHaveLength(1);
      expect(relationships[0]).toEqual({
        id: 'rel-alias',
        parentUid,
        caregiverUid,
        createdAt: expect.any(Date),
        createdBy: caregiverUid,
        parentAlias: 'Mom',
        parentName: 'Jane Doe',
        parentPhone: '+2222222222',
      });
    });

    it('should not include parentAlias field for parent role', async () => {
      // Arrange
      const parentUid = 'parent-uid';
      const caregiverUid = 'caregiver-uid';

      const mockRelationshipDocs = [
        {
          id: 'rel-parent',
          data: () => ({
            parentUid,
            caregiverUid,
            parentAlias: 'Mom',
            createdAt: { toDate: () => new Date('2024-01-01') },
            createdBy: caregiverUid,
          }),
        },
      ];

      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: mockRelationshipDocs,
      });

      // Mock getUserProfile
      mockUsersCollection.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            name: 'Caregiver Name',
            phoneNumber: '+1111111111',
          }),
        }),
      });

      // Act
      const relationships = await relationshipService.getRelationships(
        parentUid,
        'parent',
      );

      // Assert
      expect(relationships).toHaveLength(1);
      expect(relationships[0]).toEqual({
        id: 'rel-parent',
        parentUid,
        caregiverUid,
        createdAt: expect.any(Date),
        createdBy: caregiverUid,
        caregiverName: 'Caregiver Name',
        caregiverPhone: '+1111111111',
      });
      // parentAlias should not be included for parent role
      expect(relationships[0]).not.toHaveProperty('parentAlias');
    });

    it('should return empty array when no relationships exist', async () => {
      // Arrange
      const uid = 'test-uid';

      mockQuery.get.mockResolvedValue({
        empty: true,
        docs: [],
      });

      // Act
      const relationships = await relationshipService.getRelationships(
        uid,
        'parent',
      );

      // Assert
      expect(relationships).toEqual([]);
    });

    it('should handle profile fetch failure with placeholder data', async () => {
      // Arrange
      const parentUid = 'parent-uid';
      const caregiverUid = 'caregiver-uid';

      const mockRelationshipDocs = [
        {
          id: 'rel-3',
          data: () => ({
            parentUid,
            caregiverUid,
            createdAt: { toDate: () => new Date('2024-01-03') },
            createdBy: caregiverUid,
          }),
        },
      ];

      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: mockRelationshipDocs,
      });

      // Mock getUserProfile to fail
      mockUsersCollection.doc.mockReturnValue({
        get: jest.fn().mockRejectedValue(new Error('Profile fetch failed')),
      });

      // Spy on console.warn
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});

      // Act
      const relationships = await relationshipService.getRelationships(
        parentUid,
        'parent',
      );

      // Assert
      expect(relationships).toHaveLength(1);
      expect(relationships[0]).toEqual({
        id: 'rel-3',
        parentUid,
        caregiverUid,
        createdAt: expect.any(Date),
        createdBy: caregiverUid,
        caregiverName: 'Unknown',
        caregiverPhone: '',
      });
      expect(consoleWarnSpy).toHaveBeenCalled();

      // Cleanup
      consoleWarnSpy.mockRestore();
    });

    it('should include parentAlias in placeholder data for caregiver on profile fetch failure', async () => {
      // Arrange
      const parentUid = 'parent-uid';
      const caregiverUid = 'caregiver-uid';

      const mockRelationshipDocs = [
        {
          id: 'rel-fail',
          data: () => ({
            parentUid,
            caregiverUid,
            parentAlias: 'Dad',
            createdAt: { toDate: () => new Date('2024-01-03') },
            createdBy: caregiverUid,
          }),
        },
      ];

      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: mockRelationshipDocs,
      });

      // Mock getUserProfile to fail
      mockUsersCollection.doc.mockReturnValue({
        get: jest.fn().mockRejectedValue(new Error('Profile fetch failed')),
      });

      // Spy on console.warn
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});

      // Act
      const relationships = await relationshipService.getRelationships(
        caregiverUid,
        'caregiver',
      );

      // Assert
      expect(relationships).toHaveLength(1);
      expect(relationships[0]).toEqual({
        id: 'rel-fail',
        parentUid,
        caregiverUid,
        createdAt: expect.any(Date),
        createdBy: caregiverUid,
        parentAlias: 'Dad',
        parentName: 'Unknown',
        parentPhone: '',
      });
      expect(consoleWarnSpy).toHaveBeenCalled();

      // Cleanup
      consoleWarnSpy.mockRestore();
    });

    it('should throw error if relationships query fails', async () => {
      // Arrange
      const uid = 'test-uid';
      const queryError = new Error('Query failed');

      mockQuery.get.mockRejectedValue(queryError);

      // Act & Assert
      await expect(
        relationshipService.getRelationships(uid, 'parent'),
      ).rejects.toThrow('Failed to get relationships');
    });
  });

  describe('subscribeToRelationships', () => {
    it('should set up real-time listener and call callback with relationships', async () => {
      // Arrange
      const parentUid = 'parent-uid';
      const caregiverUid = 'caregiver-uid';
      const callback = jest.fn();

      const mockRelationshipDocs = [
        {
          id: 'rel-4',
          data: () => ({
            parentUid,
            caregiverUid,
            createdAt: { toDate: () => new Date('2024-01-04') },
            createdBy: caregiverUid,
          }),
        },
      ];

      // Mock onSnapshot to immediately call the callback
      mockQuery.onSnapshot.mockImplementation(
        (successCallback, _errorCallback) => {
          // Simulate snapshot callback
          setTimeout(async () => {
            await successCallback({
              empty: false,
              docs: mockRelationshipDocs,
            });
          }, 0);

          // Return unsubscribe function
          return jest.fn();
        },
      );

      // Mock getUserProfile
      mockUsersCollection.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            name: 'Caregiver Name',
            phoneNumber: '+3333333333',
          }),
        }),
      });

      // Act
      const unsubscribe = relationshipService.subscribeToRelationships(
        parentUid,
        'parent',
        callback,
      );

      // Wait for async callback
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(mockQuery.onSnapshot).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith([
        {
          id: 'rel-4',
          parentUid,
          caregiverUid,
          createdAt: expect.any(Date),
          createdBy: caregiverUid,
          caregiverName: 'Caregiver Name',
          caregiverPhone: '+3333333333',
        },
      ]);
      expect(typeof unsubscribe).toBe('function');
    });

    it('should call callback with empty array when no relationships', async () => {
      // Arrange
      const uid = 'test-uid';
      const callback = jest.fn();

      mockQuery.onSnapshot.mockImplementation(
        (successCallback, _errorCallback) => {
          setTimeout(() => {
            successCallback({
              empty: true,
              docs: [],
            });
          }, 0);

          return jest.fn();
        },
      );

      // Act
      relationshipService.subscribeToRelationships(uid, 'parent', callback);

      // Wait for async callback
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(callback).toHaveBeenCalledWith([]);
    });

    it('should handle listener errors', async () => {
      // Arrange
      const uid = 'test-uid';
      const callback = jest.fn();
      const listenerError = new Error('Listener error');

      mockQuery.onSnapshot.mockImplementation(
        (successCallback, errorCallback) => {
          setTimeout(() => {
            errorCallback(listenerError);
          }, 0);

          return jest.fn();
        },
      );

      // Spy on console.error
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // Act
      relationshipService.subscribeToRelationships(uid, 'parent', callback);

      // Wait for async callback
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          message: 'Failed to listen to relationships',
        }),
      );

      // Cleanup
      consoleErrorSpy.mockRestore();
    });

    it('should return unsubscribe function', () => {
      // Arrange
      const uid = 'test-uid';
      const callback = jest.fn();
      const mockUnsubscribe = jest.fn();

      mockQuery.onSnapshot.mockReturnValue(mockUnsubscribe);

      // Act
      const unsubscribe = relationshipService.subscribeToRelationships(
        uid,
        'parent',
        callback,
      );

      // Assert
      expect(unsubscribe).toBe(mockUnsubscribe);
    });
  });
});
