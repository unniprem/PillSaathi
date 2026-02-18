/**
 * CloudFunctionsService - Cloud Functions Integration Service
 *
 * Provides client-side methods to call Firebase Cloud Functions for pairing operations.
 * Handles function invocation, error mapping, and response processing.
 *
 * Requirements: 3.1, 3.5, 6.2, 9.2
 *
 * NOTE: This service requires @react-native-firebase/functions package.
 * Install it with: npm install @react-native-firebase/functions
 */

import { getApp } from '@react-native-firebase/app';
import { retryOperation } from '../../utils/retryHelper';

/**
 * CloudFunctionsService class
 * Provides methods for calling Cloud Functions
 */
class CloudFunctionsService {
  constructor(functionsInstance = null) {
    if (functionsInstance) {
      this.functions = functionsInstance;
      return;
    }

    // Try to load functions module
    try {
      const functionsModule = require('@react-native-firebase/functions');
      const getFunctions = functionsModule.getFunctions;
      this.functions = getFunctions(getApp());
    } catch (error) {
      throw new Error(
        'Firebase Functions package not installed. Install with: npm install @react-native-firebase/functions',
      );
    }
  }

  /**
   * Redeem an invite code to create a relationship
   * Calls the redeemInviteCode Cloud Function to validate the code and create a relationship.
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
   *   const result = await cloudFunctionsService.redeemInviteCode('ABC12345', currentUser.uid);
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
        const functionsModule = require('@react-native-firebase/functions');
        const httpsCallable = functionsModule.httpsCallable;
        const redeemFunction = httpsCallable(
          this.functions,
          'redeemInviteCode',
        );
        const result = await redeemFunction({ code, caregiverUid });

        return result.data;
      });
    } catch (error) {
      // Map Firebase function errors to user-friendly messages
      const mappedError = this._mapFunctionError(error, 'redeem');
      throw mappedError;
    }
  }

  /**
   * Remove a relationship between parent and caregiver
   * Calls the removeRelationship Cloud Function to delete a relationship.
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
   *   await cloudFunctionsService.removeRelationship(relationshipId);
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
        const functionsModule = require('@react-native-firebase/functions');
        const httpsCallable = functionsModule.httpsCallable;
        const removeFunction = httpsCallable(
          this.functions,
          'removeRelationship',
        );
        const result = await removeFunction({ relationshipId });

        return result.data;
      });
    } catch (error) {
      // Map Firebase function errors to user-friendly messages
      const mappedError = this._mapFunctionError(error, 'remove');
      throw mappedError;
    }
  }

  /**
   * Map Cloud Function errors to user-friendly error objects
   * Converts Firebase function error codes to application-specific error messages.
   *
   * @private
   * @param {Error} error - Original error from Cloud Function
   * @param {string} operation - Operation type ('redeem' or 'remove')
   * @returns {Error} Mapped error with code and user-friendly message
   */
  _mapFunctionError(error, operation) {
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
export { CloudFunctionsService };

// Export singleton instance (will throw if functions package not installed)
let defaultInstance;
try {
  defaultInstance = new CloudFunctionsService();
} catch (error) {
  console.warn('CloudFunctionsService: ', error.message);
  defaultInstance = null;
}

export default defaultInstance;
