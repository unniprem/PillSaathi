/**
 * Error message mapping for Firebase Authentication and Firestore errors
 * Maps error codes to user-friendly messages
 *
 * Requirements: 1.4, 6.2
 */

export const ERROR_MESSAGES = {
  // Firebase Authentication Errors
  'auth/invalid-phone-number': 'Please enter a valid phone number',
  'auth/missing-phone-number': 'Phone number is required',
  'auth/quota-exceeded': 'Too many requests. Please try again later',
  'auth/user-disabled': 'This account has been disabled',
  'auth/invalid-verification-code':
    'Invalid verification code. Please try again',
  'auth/invalid-verification-id':
    'Verification session expired. Please request a new code',
  'auth/code-expired':
    'Verification code has expired. Please request a new code',
  'auth/too-many-requests': 'Too many attempts. Please try again later',
  'auth/network-request-failed': 'Network error. Please check your connection',

  // Firestore Errors
  'firestore/permission-denied':
    'Permission denied. Please try logging in again',
  'firestore/unavailable': 'Service temporarily unavailable. Please try again',

  // Default fallback
  default: 'An error occurred. Please try again',
};

/**
 * Get user-friendly error message for a given error code
 * @param {string} errorCode - Firebase error code
 * @returns {string} User-friendly error message
 */
export const getErrorMessage = errorCode => {
  return ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.default;
};
