/**
 * Error Handler Utility
 *
 * Provides centralized error handling and user-friendly error messages.
 * Maps technical error codes to human-readable messages.
 *
 * Requirements: 16.2 - Display user-friendly error messages
 */

/**
 * Error message mappings for common error codes
 */
const ERROR_MESSAGES = {
  // Network errors
  'network-error':
    'Network connection failed. Please check your internet connection and try again.',
  timeout: 'The request took too long. Please try again.',
  'service-unavailable':
    'The service is temporarily unavailable. Please try again later.',
  unavailable:
    'The service is temporarily unavailable. Please try again later.',
  'deadline-exceeded': 'The request took too long. Please try again.',
  'auth/network-request-failed':
    'Network connection failed. Please check your internet connection.',
  'firestore/unavailable':
    'Database is temporarily unavailable. Please try again later.',

  // Authorization errors
  unauthorized: 'You are not authorized to perform this action.',
  'permission-denied': 'You do not have permission to access this resource.',
  'auth/user-not-found': 'User not found. Please sign in again.',
  'auth/invalid-credential': 'Invalid credentials. Please sign in again.',

  // Validation errors
  'validation-failed': 'Please check your input and try again.',
  'invalid-argument': 'Invalid input provided. Please check your data.',

  // Resource errors
  'medicine-not-found': 'Medicine not found. It may have been deleted.',
  'schedule-not-found': 'Schedule not found. It may have been deleted.',
  'not-found': 'The requested resource was not found.',

  // Operation errors
  'medicine-create-failed': 'Failed to create medicine. Please try again.',
  'medicine-update-failed': 'Failed to update medicine. Please try again.',
  'medicine-delete-failed': 'Failed to delete medicine. Please try again.',
  'medicine-status-toggle-failed':
    'Failed to update medicine status. Please try again.',
  'schedule-create-failed': 'Failed to create schedule. Please try again.',
  'schedule-update-failed': 'Failed to update schedule. Please try again.',
  'schedule-delete-failed': 'Failed to delete schedule. Please try again.',
  'medicines-query-failed': 'Failed to load medicines. Please try again.',
  'active-medicines-query-failed':
    'Failed to load active medicines. Please try again.',
  'schedule-query-failed': 'Failed to load schedule. Please try again.',
  'doses-query-failed': 'Failed to load doses. Please try again.',
  'doses-date-query-failed':
    'Failed to load doses for the selected date. Please try again.',

  // Generic fallback
  unknown: 'An unexpected error occurred. Please try again.',
};

/**
 * Get user-friendly error message from error object
 * Extracts error code and maps to human-readable message.
 *
 * @param {Error} error - Error object
 * @param {string} [defaultMessage] - Default message if no mapping found
 * @returns {string} User-friendly error message
 *
 * @example
 * try {
 *   await someOperation();
 * } catch (error) {
 *   const message = getErrorMessage(error);
 *   Alert.alert('Error', message);
 * }
 */
export const getErrorMessage = (error, defaultMessage = null) => {
  if (!error) {
    return defaultMessage || ERROR_MESSAGES.unknown;
  }

  // If error has a custom message and it's user-friendly, use it
  if (
    error.message &&
    !error.message.includes('Error:') &&
    error.code === 'unauthorized'
  ) {
    return error.message;
  }

  // Check for error code mapping
  const errorCode = error.code || '';
  if (ERROR_MESSAGES[errorCode]) {
    return ERROR_MESSAGES[errorCode];
  }

  // Check for validation errors with details
  if (errorCode === 'validation-failed' && error.errors) {
    const errorFields = Object.keys(error.errors);
    if (errorFields.length > 0) {
      return `Validation failed: ${errorFields.join(
        ', ',
      )}. Please check your input.`;
    }
  }

  // Use default message or generic fallback
  return defaultMessage || ERROR_MESSAGES.unknown;
};

/**
 * Check if error is a network error
 * Determines if the error is related to network connectivity.
 *
 * @param {Error} error - Error object
 * @returns {boolean} True if network error, false otherwise
 *
 * @example
 * if (isNetworkError(error)) {
 *   console.log('Network issue detected');
 * }
 */
export const isNetworkError = error => {
  if (!error) return false;

  const errorCode = error.code || '';
  const networkErrorCodes = [
    'network-error',
    'timeout',
    'service-unavailable',
    'unavailable',
    'deadline-exceeded',
    'auth/network-request-failed',
    'firestore/unavailable',
  ];

  return networkErrorCodes.includes(errorCode);
};

/**
 * Check if error is an authorization error
 * Determines if the error is related to permissions or authentication.
 *
 * @param {Error} error - Error object
 * @returns {boolean} True if authorization error, false otherwise
 *
 * @example
 * if (isAuthorizationError(error)) {
 *   console.log('User lacks permission');
 * }
 */
export const isAuthorizationError = error => {
  if (!error) return false;

  const errorCode = error.code || '';
  const authErrorCodes = [
    'unauthorized',
    'permission-denied',
    'auth/user-not-found',
    'auth/invalid-credential',
  ];

  return authErrorCodes.includes(errorCode);
};

/**
 * Check if error is a validation error
 * Determines if the error is related to input validation.
 *
 * @param {Error} error - Error object
 * @returns {boolean} True if validation error, false otherwise
 *
 * @example
 * if (isValidationError(error)) {
 *   console.log('Input validation failed');
 * }
 */
export const isValidationError = error => {
  if (!error) return false;

  const errorCode = error.code || '';
  return errorCode === 'validation-failed' || errorCode === 'invalid-argument';
};

/**
 * Log error with context
 * Logs error details for debugging while keeping sensitive info secure.
 *
 * @param {Error} error - Error object
 * @param {string} context - Context where error occurred (e.g., 'MedicineService.createMedicine')
 * @param {Object} [metadata] - Additional metadata to log (non-sensitive)
 *
 * @example
 * try {
 *   await createMedicine(data);
 * } catch (error) {
 *   logError(error, 'MedicineService.createMedicine', { medicineId: 'med123' });
 *   throw error;
 * }
 */
export const logError = (error, context, metadata = {}) => {
  const errorInfo = {
    context,
    code: error?.code || 'unknown',
    message: error?.message || 'No message',
    timestamp: new Date().toISOString(),
    ...metadata,
  };

  // In production, this would send to error tracking service (e.g., Sentry)
  console.error('[ErrorHandler]', errorInfo);

  // Log stack trace in development
  if (__DEV__ && error?.stack) {
    console.error('[ErrorHandler] Stack:', error.stack);
  }
};

/**
 * Create a standardized error object
 * Creates an error with consistent structure for the application.
 *
 * @param {string} code - Error code
 * @param {string} message - Error message
 * @param {Error} [originalError] - Original error that caused this error
 * @param {Object} [metadata] - Additional error metadata
 * @returns {Error} Standardized error object
 *
 * @example
 * throw createError('medicine-not-found', 'Medicine not found', originalError);
 */
export const createError = (
  code,
  message,
  originalError = null,
  metadata = {},
) => {
  const error = new Error(message);
  error.code = code;
  error.originalError = originalError;
  error.metadata = metadata;
  error.timestamp = new Date().toISOString();
  return error;
};

export default {
  getErrorMessage,
  isNetworkError,
  isAuthorizationError,
  isValidationError,
  logError,
  createError,
  ERROR_MESSAGES,
};
