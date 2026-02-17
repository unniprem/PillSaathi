/**
 * ProfileService - Firestore User Profile Service
 *
 * Handles all Firestore operations for user profile management including
 * creating, reading, updating, and validating user profiles.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 3.7
 */

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from '@react-native-firebase/firestore';
import { getApp } from '@react-native-firebase/app';

/**
 * Error message mapping for Firestore error codes
 * Maps technical error codes to user-friendly messages
 */
const ERROR_MESSAGES = {
  'firestore/permission-denied':
    'Permission denied. Please try logging in again',
  'firestore/unavailable': 'Service temporarily unavailable. Please try again',
  'firestore/not-found': 'Profile not found',
  'firestore/already-exists': 'Profile already exists',
  default: 'An error occurred. Please try again',
};

/**
 * ProfileService class
 * Provides methods for Firestore user profile operations
 */
class ProfileService {
  constructor(firestoreInstance = null) {
    this.firestore = firestoreInstance || getFirestore(getApp());
    this.usersCollection = 'users';
  }

  /**
   * Create new user profile
   * Creates a new user profile document in Firestore with the provided data
   *
   * Requirements: 3.1 - Create user profile after authentication
   * Requirements: 3.2 - Use Firebase Auth UID as document ID
   * Requirements: 3.3 - Include required fields in profile
   * Requirements: 3.7 - Validate required fields before saving
   *
   * @param {string} uid - Firebase Auth UID (used as document ID)
   * @param {Object} profileData - Profile data object
   * @param {string} profileData.name - User's display name
   * @param {string} profileData.role - User role ('parent' or 'caregiver')
   * @param {string} profileData.phone - Phone number in E.164 format
   * @returns {Promise<void>}
   * @throws {Error} If validation fails or Firestore operation fails
   *
   * @example
   * try {
   *   await profileService.createProfile('user123', {
   *     name: 'John Doe',
   *     role: 'parent',
   *     phone: '+1234567890'
   *   });
   * } catch (error) {
   *   console.error('Failed to create profile:', error.message);
   * }
   */
  async createProfile(uid, profileData) {
    try {
      // Validate profile data before creating
      this.validateProfileData(profileData);

      // Prepare complete profile document
      const profileDocument = {
        uid,
        phoneNumber: profileData.phone,
        role: profileData.role,
        name: profileData.name,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      };

      // Create profile document with UID as document ID
      const userDocRef = doc(this.firestore, this.usersCollection, uid);
      await setDoc(userDocRef, profileDocument);
    } catch (error) {
      // If it's a validation error, rethrow as-is
      if (
        error.message.includes('required') ||
        error.message.includes('must')
      ) {
        throw error;
      }

      // Map Firestore errors to user-friendly messages
      const mappedError = new Error(
        ERROR_MESSAGES[error.code] || ERROR_MESSAGES.default,
      );
      mappedError.code = error.code;
      mappedError.originalError = error;
      throw mappedError;
    }
  }

  /**
   * Get user profile by UID
   * Retrieves a user profile document from Firestore
   *
   * Requirements: 3.6 - Return complete profile data or null if not found
   *
   * @param {string} uid - Firebase Auth UID
   * @returns {Promise<Object | null>} Profile data object or null if not found
   *
   * @example
   * const profile = await profileService.getProfile('user123');
   * if (profile) {
   *   console.log('User name:', profile.name);
   *   console.log('User role:', profile.role);
   * } else {
   *   console.log('Profile not found');
   * }
   */
  async getProfile(uid) {
    try {
      const userDocRef = doc(this.firestore, this.usersCollection, uid);
      const docSnapshot = await getDoc(userDocRef);

      if (!docSnapshot.exists()) {
        return null;
      }

      const data = docSnapshot.data();

      // Convert Firestore timestamps to Date objects for easier handling
      return {
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        lastLoginAt: data.lastLoginAt?.toDate(),
      };
    } catch (error) {
      const mappedError = new Error(
        ERROR_MESSAGES[error.code] || ERROR_MESSAGES.default,
      );
      mappedError.code = error.code;
      mappedError.originalError = error;
      throw mappedError;
    }
  }

  /**
   * Update user profile
   * Updates specific fields in an existing user profile document
   *
   * Requirements: 3.4 - Update user profile information
   *
   * @param {string} uid - Firebase Auth UID
   * @param {Object} updates - Partial profile data to update
   * @returns {Promise<void>}
   * @throws {Error} If update operation fails
   *
   * @example
   * try {
   *   await profileService.updateProfile('user123', {
   *     name: 'Jane Doe'
   *   });
   * } catch (error) {
   *   console.error('Failed to update profile:', error.message);
   * }
   */
  async updateProfile(uid, updates) {
    try {
      // Add updatedAt timestamp to all updates
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
      };

      const userDocRef = doc(this.firestore, this.usersCollection, uid);
      await updateDoc(userDocRef, updateData);
    } catch (error) {
      const mappedError = new Error(
        ERROR_MESSAGES[error.code] || ERROR_MESSAGES.default,
      );
      mappedError.code = error.code;
      mappedError.originalError = error;
      throw mappedError;
    }
  }

  /**
   * Validate profile data
   * Validates that profile data contains all required fields with valid values
   *
   * Requirements: 3.7 - Validate required fields before saving
   *
   * @param {Object} profileData - Profile data to validate
   * @param {string} profileData.name - User's display name
   * @param {string} profileData.role - User role ('parent' or 'caregiver')
   * @param {string} profileData.phone - Phone number
   * @returns {boolean} True if valid
   * @throws {Error} If validation fails with specific message
   *
   * @example
   * try {
   *   profileService.validateProfileData({
   *     name: 'John Doe',
   *     role: 'parent',
   *     phone: '+1234567890'
   *   });
   *   console.log('Profile data is valid');
   * } catch (error) {
   *   console.error('Validation error:', error.message);
   * }
   */
  validateProfileData(profileData) {
    if (!profileData) {
      throw new Error('Profile data is required');
    }

    // Validate name
    if (!profileData.name || typeof profileData.name !== 'string') {
      throw new Error('Name is required and must be a string');
    }

    if (profileData.name.trim().length === 0) {
      throw new Error('Name cannot be empty');
    }

    // Validate role
    if (!profileData.role || typeof profileData.role !== 'string') {
      throw new Error('Role is required and must be a string');
    }

    const validRoles = ['parent', 'caregiver'];
    if (!validRoles.includes(profileData.role.toLowerCase())) {
      throw new Error('Role must be either "parent" or "caregiver"');
    }

    // Validate phone
    if (!profileData.phone || typeof profileData.phone !== 'string') {
      throw new Error('Phone number is required and must be a string');
    }

    if (profileData.phone.trim().length === 0) {
      throw new Error('Phone number cannot be empty');
    }

    return true;
  }

  /**
   * Check if user profile exists
   * Checks whether a profile document exists for the given UID
   *
   * @param {string} uid - Firebase Auth UID
   * @returns {Promise<boolean>} True if profile exists, false otherwise
   *
   * @example
   * const exists = await profileService.profileExists('user123');
   * if (exists) {
   *   console.log('Profile exists');
   * } else {
   *   console.log('Profile does not exist');
   * }
   */
  async profileExists(uid) {
    try {
      const userDocRef = doc(this.firestore, this.usersCollection, uid);
      const docSnapshot = await getDoc(userDocRef);

      return docSnapshot.exists();
    } catch (error) {
      const mappedError = new Error(
        ERROR_MESSAGES[error.code] || ERROR_MESSAGES.default,
      );
      mappedError.code = error.code;
      mappedError.originalError = error;
      throw mappedError;
    }
  }
}

// Export singleton instance
export default new ProfileService();
