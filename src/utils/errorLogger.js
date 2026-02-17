/**
 * Error Logger Utility
 *
 * Provides centralized error logging functionality for the authentication system.
 * Logs errors with context information including timestamp, user ID, operation, and error details.
 *
 * Requirements: 6.6 - Log all authentication errors for debugging
 */

/**
 * Log levels for categorizing errors
 */
export const LogLevel = {
  ERROR: 'ERROR',
  WARNING: 'WARNING',
  INFO: 'INFO',
};

/**
 * Error categories for organizing logs
 */
export const ErrorCategory = {
  AUTH: 'AUTH',
  PROFILE: 'PROFILE',
  PAIRING: 'PAIRING',
  NETWORK: 'NETWORK',
  VALIDATION: 'VALIDATION',
  STORAGE: 'STORAGE',
  UNKNOWN: 'UNKNOWN',
};

/**
 * Log an error with context information
 *
 * @param {Object} params - Logging parameters
 * @param {string} params.operation - The operation being performed (e.g., 'sendOTP', 'createProfile')
 * @param {Error} params.error - The error object
 * @param {string} [params.userId] - User ID if available
 * @param {string} [params.category] - Error category (from ErrorCategory enum)
 * @param {string} [params.level] - Log level (from LogLevel enum)
 * @param {Object} [params.additionalContext] - Any additional context information
 *
 * @example
 * logError({
 *   operation: 'sendOTP',
 *   error: new Error('Network error'),
 *   userId: 'user123',
 *   category: ErrorCategory.NETWORK,
 *   level: LogLevel.ERROR,
 *   additionalContext: { phoneNumber: '+1234567890' }
 * });
 */
export const logError = ({
  operation,
  error,
  userId = null,
  category = ErrorCategory.UNKNOWN,
  level = LogLevel.ERROR,
  additionalContext = {},
}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    category,
    operation,
    userId,
    error: {
      message: error.message,
      code: error.code || 'UNKNOWN',
      stack: error.stack,
      originalError: error.originalError
        ? {
            message: error.originalError.message,
            code: error.originalError.code,
          }
        : null,
    },
    additionalContext,
  };

  // Log to console with appropriate method based on level
  const logMethod =
    level === LogLevel.ERROR
      ? 'error'
      : level === LogLevel.WARNING
      ? 'warn'
      : 'info';

  console[logMethod]('[ErrorLogger]', JSON.stringify(logEntry, null, 2));

  // In production, this could be sent to a remote logging service
  // e.g., Firebase Crashlytics, Sentry, etc.
  // sendToRemoteLoggingService(logEntry);

  return logEntry;
};

/**
 * Log authentication-related errors
 *
 * @param {string} operation - The auth operation (e.g., 'sendOTP', 'verifyOTP')
 * @param {Error} error - The error object
 * @param {string} [userId] - User ID if available
 * @param {Object} [additionalContext] - Additional context
 *
 * @example
 * logAuthError('sendOTP', error, null, { phoneNumber: '+1234567890' });
 */
export const logAuthError = (
  operation,
  error,
  userId = null,
  additionalContext = {},
) => {
  return logError({
    operation,
    error,
    userId,
    category: ErrorCategory.AUTH,
    level: LogLevel.ERROR,
    additionalContext,
  });
};

/**
 * Log profile-related errors
 *
 * @param {string} operation - The profile operation (e.g., 'createProfile', 'updateProfile')
 * @param {Error} error - The error object
 * @param {string} [userId] - User ID if available
 * @param {Object} [additionalContext] - Additional context
 *
 * @example
 * logProfileError('createProfile', error, 'user123', { role: 'parent' });
 */
export const logProfileError = (
  operation,
  error,
  userId = null,
  additionalContext = {},
) => {
  return logError({
    operation,
    error,
    userId,
    category: ErrorCategory.PROFILE,
    level: LogLevel.ERROR,
    additionalContext,
  });
};

/**
 * Log pairing-related errors
 *
 * @param {string} operation - The pairing operation (e.g., 'generateInviteCode', 'redeemInviteCode', 'removeRelationship')
 * @param {Error} error - The error object
 * @param {string} [userId] - User ID if available
 * @param {Object} [additionalContext] - Additional context
 *
 * @example
 * logPairingError('redeemInviteCode', error, 'user123', { code: 'ABC12345' });
 */
export const logPairingError = (
  operation,
  error,
  userId = null,
  additionalContext = {},
) => {
  return logError({
    operation,
    error,
    userId,
    category: ErrorCategory.PAIRING,
    level: LogLevel.ERROR,
    additionalContext,
  });
};

/**
 * Log network-related errors
 *
 * @param {string} operation - The operation that failed
 * @param {Error} error - The error object
 * @param {string} [userId] - User ID if available
 * @param {Object} [additionalContext] - Additional context
 *
 * @example
 * logNetworkError('sendOTP', error, null, { endpoint: 'Firebase Auth' });
 */
export const logNetworkError = (
  operation,
  error,
  userId = null,
  additionalContext = {},
) => {
  return logError({
    operation,
    error,
    userId,
    category: ErrorCategory.NETWORK,
    level: LogLevel.ERROR,
    additionalContext,
  });
};

/**
 * Log validation errors
 *
 * @param {string} operation - The operation that failed validation
 * @param {Error} error - The error object
 * @param {string} [userId] - User ID if available
 * @param {Object} [additionalContext] - Additional context
 *
 * @example
 * logValidationError('validateProfileData', error, 'user123', { field: 'name' });
 */
export const logValidationError = (
  operation,
  error,
  userId = null,
  additionalContext = {},
) => {
  return logError({
    operation,
    error,
    userId,
    category: ErrorCategory.VALIDATION,
    level: LogLevel.WARNING,
    additionalContext,
  });
};

/**
 * Log storage-related errors (AsyncStorage, etc.)
 *
 * @param {string} operation - The storage operation (e.g., 'persistAuthState', 'restoreAuthState')
 * @param {Error} error - The error object
 * @param {string} [userId] - User ID if available
 * @param {Object} [additionalContext] - Additional context
 *
 * @example
 * logStorageError('persistAuthState', error, 'user123');
 */
export const logStorageError = (
  operation,
  error,
  userId = null,
  additionalContext = {},
) => {
  return logError({
    operation,
    error,
    userId,
    category: ErrorCategory.STORAGE,
    level: LogLevel.WARNING,
    additionalContext,
  });
};

export default {
  logError,
  logAuthError,
  logProfileError,
  logPairingError,
  logNetworkError,
  logValidationError,
  logStorageError,
  LogLevel,
  ErrorCategory,
};
