/**
 * PairingService - Direct Firestore Pairing Operations
 *
 * Provides client-side methods for pairing operations directly with Firestore.
 * Handles invite code redemption and relationship management.
 *
 * Requirements: 3.1, 3.5, 6.2, 9.2
 */

import firestore from '@react-native-firebase/firestore';
import { retryOperation } from '../../utils/retryHelper';

/**
 * PairingService class
 * Provides methods for pairing operations
 */
class PairingService {
  constructor() {
    this.db = firestore();
  }

  /**
   * Redeem an invite code to create a relationship
   * Validates the code and creates a relationship directly in Firestore.
   * Includes retry logic for network errors.
   *
   * Requirements: 3.1 - Redeem invite code
   * Requirements: 3.5 - Create relationship from valid code
   * Requirements: 9.2 - Retry logic for network errors
   *
   * @param {string} code - Invite code to redeem (8-character alphanumeric)
   * @param {string} caregiverUid - Caregiver's Firebase Auth UID
   * @returns {Promise<{success: boolean, relationshipId: string, message: string}>}
   * @throws {Error} If redemption fails
   *
   * @example
   * try {
   *   const result = await pairingService.redeemInviteCode('ABC12345', currentUser.uid);
   *   console.log('Relationship created:', result.relationshipId);
   * } catch (error) {
   *   if (error.code === 'not-found') {
   *     console.error('Invalid invite code');
   *   } else if (error.code === 'failed-precondition') {
   *     console.error('Invite code has expired');
   *   } else {
   *     console.error('Error:', error.message);
   *   }
   * }
   */
  async redeemInviteCode(code, caregiverUid) {
    try {
      return await retryOperation(async () => {
        console.log('[PairingService] redeemInviteCode called', {
          code,
          caregiverUid,
        });

        // Validate code format
        const codeUppercase = code.toUpperCase();
        const codeFormatRegex = /^[A-Z0-9]{8}$/;

        if (!codeFormatRegex.test(codeUppercase)) {
          console.log('[PairingService] Invalid code format:', codeUppercase);
          const error = new Error(
            'Invalid code format. Code must be 8 alphanumeric characters',
          );
          error.code = 'invalid-argument';
          throw error;
        }

        console.log('[PairingService] Querying for code:', codeUppercase);

        // Query for the invite code
        const inviteCodesSnapshot = await this.db
          .collection('inviteCodes')
          .where('code', '==', codeUppercase)
          .limit(1)
          .get();

        console.log('[PairingService] Query result:', {
          empty: inviteCodesSnapshot.empty,
          size: inviteCodesSnapshot.size,
        });

        // Check if code exists
        if (inviteCodesSnapshot.empty) {
          console.log('[PairingService] Code not found in database');
          const error = new Error(
            'Invalid invite code. Please check the code and try again',
          );
          error.code = 'not-found';
          throw error;
        }

        const inviteCodeDoc = inviteCodesSnapshot.docs[0];
        const inviteCodeData = inviteCodeDoc.data();

        console.log('[PairingService] Found invite code:', {
          code: inviteCodeData.code,
          parentUid: inviteCodeData.parentUid,
          expiresAt: inviteCodeData.expiresAt,
          used: inviteCodeData.used,
        });

        // Check if code is expired
        const now = new Date();
        const expiresAt = inviteCodeData.expiresAt?.toDate
          ? inviteCodeData.expiresAt.toDate()
          : new Date(inviteCodeData.expiresAt);

        console.log('[PairingService] Expiration check:', {
          now: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
          isExpired: expiresAt <= now,
        });

        if (expiresAt <= now) {
          console.log('[PairingService] Code is expired');
          const error = new Error(
            'This invite code has expired. Please request a new code from the parent',
          );
          error.code = 'failed-precondition';
          throw error;
        }

        // Check if code has already been used
        if (inviteCodeData.used === true) {
          console.log('[PairingService] Code has already been used');
          const error = new Error(
            'This invite code has already been used. Please request a new code from the parent',
          );
          error.code = 'failed-precondition';
          throw error;
        }

        const { parentUid } = inviteCodeData;

        // Check for existing relationship
        const relationshipId = `${parentUid}_${caregiverUid}`;
        const existingRelationship = await this.db
          .collection('relationships')
          .doc(relationshipId)
          .get();

        // Handle both function and property for exists (different Firebase versions)
        const relationshipExists =
          typeof existingRelationship.exists === 'function'
            ? existingRelationship.exists()
            : existingRelationship.exists;

        if (relationshipExists) {
          const relationshipData = existingRelationship.data();
          const error = new Error(
            `You are already connected with this parent. Relationship created on ${
              relationshipData?.createdAt
                ? new Date(
                    relationshipData.createdAt.seconds * 1000,
                  ).toLocaleDateString()
                : 'unknown date'
            }`,
          );
          error.code = 'already-exists';
          error.relationshipData = relationshipData;
          throw error;
        }

        // Create new relationship
        await this.db.collection('relationships').doc(relationshipId).set({
          parentUid,
          caregiverUid,
          createdAt: firestore.FieldValue.serverTimestamp(),
          createdBy: caregiverUid,
        });

        // Mark the invite code as used
        await inviteCodeDoc.ref.update({
          used: true,
          usedCount: firestore.FieldValue.increment(1),
          usedAt: firestore.FieldValue.serverTimestamp(),
          usedBy: caregiverUid,
        });

        return {
          success: true,
          relationshipId,
          message: 'Relationship created successfully',
        };
      });
    } catch (error) {
      // Map errors to user-friendly messages
      const mappedError = this._mapError(error, 'redeem');
      throw mappedError;
    }
  }

  /**
   * Remove a relationship between parent and caregiver
   * Deletes the relationship directly from Firestore.
   * Includes retry logic for network errors.
   *
   * Requirements: 6.2 - Remove relationship
   * Requirements: 9.2 - Retry logic for network errors
   *
   * @param {string} relationshipId - Relationship document ID to remove
   * @returns {Promise<{success: boolean}>}
   * @throws {Error} If removal fails
   *
   * @example
   * try {
   *   await pairingService.removeRelationship(relationshipId);
   *   console.log('Relationship removed successfully');
   * } catch (error) {
   *   if (error.code === 'permission-denied') {
   *     console.error('Not authorized to remove this relationship');
   *   } else {
   *     console.error('Error:', error.message);
   *   }
   * }
   */
  async removeRelationship(relationshipId) {
    try {
      return await retryOperation(async () => {
        // Fetch relationship document
        const relationshipDoc = await this.db
          .collection('relationships')
          .doc(relationshipId)
          .get();

        // Handle both function and property for exists (different Firebase versions)
        const docExists =
          typeof relationshipDoc.exists === 'function'
            ? relationshipDoc.exists()
            : relationshipDoc.exists;

        // Check if relationship exists
        if (!docExists) {
          const error = new Error('Relationship not found');
          error.code = 'not-found';
          throw error;
        }

        // Delete relationship document
        await relationshipDoc.ref.delete();

        return {
          success: true,
          message: 'Relationship removed successfully',
        };
      });
    } catch (error) {
      // Map errors to user-friendly messages
      const mappedError = this._mapError(error, 'remove');
      throw mappedError;
    }
  }

  /**
   * Check if a relationship exists between parent and caregiver
   * Diagnostic method to help debug relationship issues.
   *
   * @param {string} parentUid - Parent's Firebase Auth UID
   * @param {string} caregiverUid - Caregiver's Firebase Auth UID
   * @returns {Promise<{exists: boolean, data: Object|null}>}
   *
   * @example
   * const check = await pairingService.checkRelationship(parentUid, caregiverUid);
   * console.log('Relationship exists:', check.exists);
   */
  async checkRelationship(parentUid, caregiverUid) {
    const relationshipId = `${parentUid}_${caregiverUid}`;
    const doc = await this.db
      .collection('relationships')
      .doc(relationshipId)
      .get();

    // Handle both function and property for exists (different Firebase versions)
    const docExists =
      typeof doc.exists === 'function' ? doc.exists() : doc.exists;

    return {
      exists: docExists,
      data: docExists ? doc.data() : null,
      relationshipId,
    };
  }

  /**
   * Map Firestore errors to user-friendly error objects
   * Converts Firebase error codes to application-specific error messages.
   *
   * @private
   * @param {Error} error - Original error from Firestore
   * @param {string} operation - Operation type ('redeem' or 'remove')
   * @returns {Error} Mapped error with code and user-friendly message
   */
  _mapError(error, operation) {
    const mappedError = new Error();

    // Extract error code from Firebase function error
    const errorCode = error.code || 'unknown';

    // Map error codes to user-friendly messages
    switch (errorCode) {
      case 'unauthenticated':
        mappedError.code = 'unauthenticated';
        mappedError.message = 'Please log in to continue';
        break;

      case 'invalid-argument':
        mappedError.code = 'invalid-code-format';
        if (operation === 'redeem') {
          mappedError.message = 'Please enter a valid 8-character code';
        } else {
          mappedError.message = 'Invalid request parameters';
        }
        break;

      case 'permission-denied':
        mappedError.code = 'permission-denied';
        if (operation === 'redeem') {
          mappedError.message = 'You can only redeem invite codes for yourself';
        } else {
          mappedError.message =
            'You do not have permission to perform this action';
        }
        break;

      case 'not-found':
        mappedError.code = 'code-not-found';
        if (operation === 'redeem') {
          mappedError.message =
            'This invite code is invalid. Please check and try again';
        } else {
          mappedError.message = 'Relationship not found';
        }
        break;

      case 'already-exists':
        mappedError.code = 'already-exists';
        mappedError.message =
          error.message || 'You are already connected with this parent';
        // Preserve relationship data if it exists
        if (error.relationshipData) {
          mappedError.relationshipData = error.relationshipData;
        }
        break;

      case 'failed-precondition':
        mappedError.code = 'code-expired';
        // Check if the error message mentions "already been used"
        if (error.message && error.message.includes('already been used')) {
          mappedError.code = 'code-already-used';
          mappedError.message =
            'This invite code has already been used. Please ask for a new code';
        } else {
          mappedError.message =
            'This invite code has expired. Please ask for a new code';
        }
        break;

      case 'unavailable':
      case 'deadline-exceeded':
        mappedError.code = 'network-error';
        mappedError.message =
          'Network error. Please check your connection and try again';
        break;

      case 'internal':
      default:
        mappedError.code = 'unknown';
        mappedError.message =
          error.message || 'An error occurred. Please try again';
        break;
    }

    // Preserve original error for debugging
    mappedError.originalError = error;

    return mappedError;
  }
}

// Export class for testing and custom instantiation
export { PairingService };

// Export singleton instance
const defaultInstance = new PairingService();

export default defaultInstance;
