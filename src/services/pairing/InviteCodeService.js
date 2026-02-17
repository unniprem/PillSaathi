/**
 * InviteCodeService - Invite Code Management Service
 *
 * Handles invite code generation, validation, and management for parent-caregiver pairing.
 * Parents generate time-limited invite codes that caregivers can redeem to establish relationships.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.5, 2.3, 8.1, 8.3, 9.2
 */

import { getFirestore } from '@react-native-firebase/firestore';
import { getApp } from '@react-native-firebase/app';
import { retryOperation } from '../../utils/retryHelper';

/**
 * InviteCodeService class
 * Provides methods for invite code generation and management
 */
class InviteCodeService {
  constructor(firestoreInstance = null) {
    this.firestore = firestoreInstance || getFirestore(getApp());
    this.inviteCodesCollection = 'inviteCodes';
  }

  /**
   * Generate random alphanumeric code
   * Creates a random uppercase alphanumeric string of specified length
   *
   * Requirements: 1.1 - Generate unique alphanumeric code
   *
   * @param {number} length - Code length (default: 8)
   * @returns {string} Uppercase alphanumeric code
   *
   * @example
   * const code = inviteCodeService.generateRandomCode(8);
   * // Returns: 'A3B7K9M2'
   */
  generateRandomCode(length = 8) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      code += characters[randomIndex];
    }

    return code;
  }

  /**
   * Calculate expiration timestamp
   * Computes the expiration date/time based on hours from now
   *
   * Requirements: 1.3 - Set TTL to 24 hours
   *
   * @param {number} hours - Hours until expiration (default: 24)
   * @returns {Date} Expiration timestamp
   *
   * @example
   * const expiresAt = inviteCodeService.calculateExpiration(24);
   * // Returns: Date object 24 hours from now
   */
  calculateExpiration(hours = 24) {
    const now = new Date();
    const expirationTime = now.getTime() + hours * 60 * 60 * 1000;
    return new Date(expirationTime);
  }

  /**
   * Check if invite code is expired
   * Compares expiration timestamp against current time
   *
   * Requirements: 8.3 - Check if code has expired
   *
   * @param {Date} expiresAt - Expiration timestamp
   * @returns {boolean} True if expired, false otherwise
   *
   * @example
   * const isExpired = inviteCodeService.isCodeExpired(expiresAt);
   * if (isExpired) {
   *   console.log('Code has expired');
   * }
   */
  isCodeExpired(expiresAt) {
    const now = new Date();
    return now > expiresAt;
  }

  /**
   * Generate or retrieve active invite code for a parent
   * Queries Firestore for active unexpired codes. If one exists, returns it (idempotence).
   * If no active code exists, generates a new code and stores it in Firestore.
   * Includes retry logic for network errors.
   *
   * Requirements: 1.1 - Generate invite code
   * Requirements: 1.2 - Store code with parent UID, timestamps
   * Requirements: 1.5 - Return existing code if active (idempotence)
   * Requirements: 9.2 - Retry logic for network errors
   *
   * @param {string} parentUid - Parent's Firebase Auth UID
   * @returns {Promise<{code: string, expiresAt: Date, createdAt: Date, parentUid: string}>}
   * @throws {Error} If generation or Firestore operation fails
   *
   * @example
   * try {
   *   const inviteCode = await inviteCodeService.generateInviteCode(parentUid);
   *   console.log('Invite code:', inviteCode.code);
   *   console.log('Expires at:', inviteCode.expiresAt);
   * } catch (error) {
   *   console.error('Failed to generate invite code:', error.message);
   * }
   */
  async generateInviteCode(parentUid) {
    try {
      return await retryOperation(async () => {
        // Query for active unexpired codes for this parent
        const now = new Date();
        const querySnapshot = await this.firestore
          .collection(this.inviteCodesCollection)
          .where('parentUid', '==', parentUid)
          .where('expiresAt', '>', now)
          .limit(1)
          .get();

        // If active code exists, return it (idempotence)
        if (!querySnapshot.empty) {
          const existingCodeDoc = querySnapshot.docs[0];
          const data = existingCodeDoc.data();
          return {
            code: data.code,
            expiresAt: data.expiresAt.toDate(),
            createdAt: data.createdAt.toDate(),
            parentUid: data.parentUid,
          };
        }

        // No active code exists, generate a new one
        const code = this.generateRandomCode(8);
        const createdAt = new Date();
        const expiresAt = this.calculateExpiration(24);

        // Store in Firestore
        const docData = {
          code,
          parentUid,
          createdAt,
          expiresAt,
          usedCount: 0,
        };

        await this.firestore
          .collection(this.inviteCodesCollection)
          .add(docData);

        return {
          code,
          expiresAt,
          createdAt,
          parentUid,
        };
      });
    } catch (error) {
      const mappedError = new Error('Failed to generate invite code');
      mappedError.code = 'invite-code-generation-failed';
      mappedError.originalError = error;
      throw mappedError;
    }
  }

  /**
   * Get active invite code for a parent
   * Queries Firestore for active unexpired codes for the specified parent.
   * Returns the code object if found, or null if no active code exists.
   * Includes retry logic for network errors.
   *
   * Requirements: 2.3 - Display active invite code
   * Requirements: 9.2 - Retry logic for network errors
   *
   * @param {string} parentUid - Parent's Firebase Auth UID
   * @returns {Promise<{code: string, expiresAt: Date, createdAt: Date, parentUid: string} | null>}
   * @throws {Error} If Firestore query fails
   *
   * @example
   * try {
   *   const activeCode = await inviteCodeService.getActiveInviteCode(parentUid);
   *   if (activeCode) {
   *     console.log('Active code:', activeCode.code);
   *   } else {
   *     console.log('No active code found');
   *   }
   * } catch (error) {
   *   console.error('Failed to get active code:', error.message);
   * }
   */
  async getActiveInviteCode(parentUid) {
    try {
      return await retryOperation(async () => {
        // Query for active unexpired codes for this parent
        const now = new Date();
        const querySnapshot = await this.firestore
          .collection(this.inviteCodesCollection)
          .where('parentUid', '==', parentUid)
          .where('expiresAt', '>', now)
          .limit(1)
          .get();

        // If no active code exists, return null
        if (querySnapshot.empty) {
          return null;
        }

        // Return the active code
        const codeDoc = querySnapshot.docs[0];
        const data = codeDoc.data();
        return {
          code: data.code,
          expiresAt: data.expiresAt.toDate(),
          createdAt: data.createdAt.toDate(),
          parentUid: data.parentUid,
        };
      });
    } catch (error) {
      const mappedError = new Error('Failed to get active invite code');
      mappedError.code = 'invite-code-query-failed';
      mappedError.originalError = error;
      throw mappedError;
    }
  }
}

// Export singleton instance
export default new InviteCodeService();
