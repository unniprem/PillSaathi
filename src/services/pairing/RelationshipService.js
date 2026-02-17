/**
 * RelationshipService - Relationship Management Service
 *
 * Handles relationship viewing, querying, and management for parent-caregiver connections.
 * Provides methods to query relationships by user and role, subscribe to real-time updates,
 * and fetch user profile data for display.
 *
 * Requirements: 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 6.2
 */

import { getFirestore } from '@react-native-firebase/firestore';
import { getApp } from '@react-native-firebase/app';

/**
 * RelationshipService class
 * Provides methods for relationship querying and management
 */
class RelationshipService {
  constructor(firestoreInstance = null) {
    this.firestore = firestoreInstance || getFirestore(getApp());
    this.relationshipsCollection = 'relationships';
    this.usersCollection = 'users';
  }

  /**
   * Get user profile for relationship display
   * Queries users collection for profile data (name and phone)
   *
   * Requirements: 4.2 - Display user profile information
   * Requirements: 5.2 - Show name and profile information
   *
   * @param {string} uid - User's Firebase Auth UID
   * @returns {Promise<{name: string, phone: string}>}
   * @throws {Error} If profile fetch fails
   *
   * @example
   * try {
   *   const profile = await relationshipService.getUserProfile('user123');
   *   console.log('Name:', profile.name);
   *   console.log('Phone:', profile.phone);
   * } catch (error) {
   *   console.error('Failed to get user profile:', error.message);
   * }
   */
  async getUserProfile(uid) {
    try {
      const userDoc = await this.firestore
        .collection(this.usersCollection)
        .doc(uid)
        .get();

      if (!userDoc.exists) {
        const error = new Error('User profile not found');
        error.code = 'profile-not-found';
        throw error;
      }

      const data = userDoc.data();
      return {
        name: data.name || '',
        phone: data.phoneNumber || data.phone || '',
      };
    } catch (error) {
      if (error.code === 'profile-not-found') {
        throw error;
      }

      const mappedError = new Error('Failed to get user profile');
      mappedError.code = 'profile-fetch-failed';
      mappedError.originalError = error;
      throw mappedError;
    }
  }

  /**
   * Get all relationships for a user (parent or caregiver)
   * Queries Firestore for relationships where the user is a participant.
   * For parents, queries by parentUid. For caregivers, queries by caregiverUid.
   * Fetches and attaches user profile data for display.
   *
   * Requirements: 4.1 - Query relationships by user and role
   * Requirements: 5.1 - Return all relationships for user
   *
   * @param {string} uid - User's Firebase Auth UID
   * @param {string} role - User's role ('parent' | 'caregiver')
   * @returns {Promise<Array<Relationship>>} Array of relationship objects with profile data
   * @throws {Error} If query fails
   *
   * @example
   * try {
   *   const relationships = await relationshipService.getRelationships('user123', 'parent');
   *   relationships.forEach(rel => {
   *     console.log('Caregiver:', rel.caregiverName);
   *     console.log('Phone:', rel.caregiverPhone);
   *   });
   * } catch (error) {
   *   console.error('Failed to get relationships:', error.message);
   * }
   */
  async getRelationships(uid, role) {
    try {
      // Determine which field to query based on role
      const queryField = role === 'parent' ? 'parentUid' : 'caregiverUid';

      // Query relationships
      const querySnapshot = await this.firestore
        .collection(this.relationshipsCollection)
        .where(queryField, '==', uid)
        .get();

      // If no relationships, return empty array
      if (querySnapshot.empty) {
        return [];
      }

      // Fetch profile data for each relationship
      const relationships = await Promise.all(
        querySnapshot.docs.map(async doc => {
          const data = doc.data();
          const relationshipId = doc.id;

          // Determine which user's profile to fetch (the other party)
          const otherUserUid =
            role === 'parent' ? data.caregiverUid : data.parentUid;

          try {
            const profile = await this.getUserProfile(otherUserUid);

            return {
              id: relationshipId,
              parentUid: data.parentUid,
              caregiverUid: data.caregiverUid,
              createdAt: data.createdAt?.toDate() || null,
              createdBy: data.createdBy || null,
              // Attach profile data based on role
              ...(role === 'parent'
                ? {
                    caregiverName: profile.name,
                    caregiverPhone: profile.phone,
                  }
                : {
                    parentName: profile.name,
                    parentPhone: profile.phone,
                  }),
            };
          } catch (profileError) {
            // If profile fetch fails, include relationship with placeholder data
            console.warn(
              `Failed to fetch profile for ${otherUserUid}:`,
              profileError.message,
            );

            return {
              id: relationshipId,
              parentUid: data.parentUid,
              caregiverUid: data.caregiverUid,
              createdAt: data.createdAt?.toDate() || null,
              createdBy: data.createdBy || null,
              // Placeholder data if profile fetch fails
              ...(role === 'parent'
                ? {
                    caregiverName: 'Unknown',
                    caregiverPhone: '',
                  }
                : {
                    parentName: 'Unknown',
                    parentPhone: '',
                  }),
            };
          }
        }),
      );

      return relationships;
    } catch (error) {
      const mappedError = new Error('Failed to get relationships');
      mappedError.code = 'relationships-query-failed';
      mappedError.originalError = error;
      throw mappedError;
    }
  }

  /**
   * Subscribe to real-time relationship updates
   * Sets up a Firestore real-time listener for relationships.
   * Calls callback with updated relationships array whenever data changes.
   * Returns an unsubscribe function to clean up the listener.
   *
   * Requirements: 4.3 - Update display in real-time
   * Requirements: 5.3 - Real-time listener for relationships
   *
   * @param {string} uid - User's Firebase Auth UID
   * @param {string} role - User's role ('parent' | 'caregiver')
   * @param {Function} callback - Called with updated relationships array
   * @returns {Function} Unsubscribe function to stop listening
   *
   * @example
   * const unsubscribe = relationshipService.subscribeToRelationships(
   *   'user123',
   *   'parent',
   *   (relationships) => {
   *     console.log('Relationships updated:', relationships);
   *     setRelationships(relationships);
   *   }
   * );
   *
   * // Later, clean up the listener
   * unsubscribe();
   */
  subscribeToRelationships(uid, role, callback) {
    try {
      // Determine which field to query based on role
      const queryField = role === 'parent' ? 'parentUid' : 'caregiverUid';

      // Set up real-time listener
      const unsubscribe = this.firestore
        .collection(this.relationshipsCollection)
        .where(queryField, '==', uid)
        .onSnapshot(
          async querySnapshot => {
            // If no relationships, call callback with empty array
            if (querySnapshot.empty) {
              callback([]);
              return;
            }

            // Fetch profile data for each relationship
            const relationships = await Promise.all(
              querySnapshot.docs.map(async doc => {
                const data = doc.data();
                const relationshipId = doc.id;

                // Determine which user's profile to fetch (the other party)
                const otherUserUid =
                  role === 'parent' ? data.caregiverUid : data.parentUid;

                try {
                  const profile = await this.getUserProfile(otherUserUid);

                  return {
                    id: relationshipId,
                    parentUid: data.parentUid,
                    caregiverUid: data.caregiverUid,
                    createdAt: data.createdAt?.toDate() || null,
                    createdBy: data.createdBy || null,
                    // Attach profile data based on role
                    ...(role === 'parent'
                      ? {
                          caregiverName: profile.name,
                          caregiverPhone: profile.phone,
                        }
                      : {
                          parentName: profile.name,
                          parentPhone: profile.phone,
                        }),
                  };
                } catch (profileError) {
                  // If profile fetch fails, include relationship with placeholder data
                  console.warn(
                    `Failed to fetch profile for ${otherUserUid}:`,
                    profileError.message,
                  );

                  return {
                    id: relationshipId,
                    parentUid: data.parentUid,
                    caregiverUid: data.caregiverUid,
                    createdAt: data.createdAt?.toDate() || null,
                    createdBy: data.createdBy || null,
                    // Placeholder data if profile fetch fails
                    ...(role === 'parent'
                      ? {
                          caregiverName: 'Unknown',
                          caregiverPhone: '',
                        }
                      : {
                          parentName: 'Unknown',
                          parentPhone: '',
                        }),
                  };
                }
              }),
            );

            // Call callback with updated relationships
            callback(relationships);
          },
          error => {
            // Handle listener errors
            console.error('Relationship listener error:', error);
            const mappedError = new Error('Failed to listen to relationships');
            mappedError.code = 'relationships-listener-failed';
            mappedError.originalError = error;
            callback([], mappedError);
          },
        );

      return unsubscribe;
    } catch (error) {
      const mappedError = new Error('Failed to set up relationship listener');
      mappedError.code = 'relationships-listener-setup-failed';
      mappedError.originalError = error;
      throw mappedError;
    }
  }
}

// Export singleton instance
export default new RelationshipService();
