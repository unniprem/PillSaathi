/**
 * Error message mapping for Firebase Authentication, Firestore, and Pairing errors
 * Maps error codes to user-friendly messages
 *
 * Requirements: 1.4, 6.2, 9.1
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

  // Invite Code Errors
  'invalid-code-format': 'Please enter a valid 8-character code',
  'code-not-found': 'This invite code is invalid. Please check and try again',
  'code-expired': 'This invite code has expired. Please ask for a new code',
  'code-already-used':
    'This invite code has already been used. Please ask for a new code',
  'invite-code-generation-failed':
    'Failed to generate invite code. Please try again',
  'invite-code-query-failed':
    'Failed to retrieve invite code. Please try again',

  // Relationship Errors
  'relationship-not-found': 'Relationship not found',
  'relationship-exists': 'You are already connected with this user',
  'already-exists': 'You are already connected with this parent',
  'relationship-removal-failed':
    'Failed to remove relationship. Please try again',
  'relationship-query-failed': 'Failed to load relationships. Please try again',

  // Authentication Errors
  unauthenticated: 'Please log in to continue',
  'permission-denied': 'You do not have permission to perform this action',

  // Network and Service Errors
  'network-error': 'Network error. Please check your connection and try again',
  'service-unavailable':
    'Service temporarily unavailable. Please try again later',
  timeout: 'Request timed out. Please try again',
  unavailable: 'Service temporarily unavailable. Please try again later',
  'deadline-exceeded': 'Request timed out. Please try again',

  // Cloud Function Errors
  'invalid-argument': 'Invalid request parameters',
  internal: 'An internal error occurred. Please try again',

  // Default fallback
  default: 'An error occurred. Please try again',
};

/**
 * Get user-friendly error message for a given error code
 * @param {string} errorCode - Firebase error code
 * @param {string} fallbackMessage - Optional fallback message
 * @returns {string} User-friendly error message
 */
export const getErrorMessage = (errorCode, fallbackMessage) => {
  return ERROR_MESSAGES[errorCode] || fallbackMessage || ERROR_MESSAGES.default;
};
