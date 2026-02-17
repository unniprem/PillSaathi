/**
 * Retry Helper Utility
 *
 * Provides retry logic with exponential backoff for network and transient errors.
 * Helps improve reliability by automatically retrying failed operations.
 *
 * Requirements: 9.2 - Retry logic for network errors
 */

/**
 * Error codes that are retryable (network, timeout, unavailable)
 */
const RETRYABLE_ERROR_CODES = [
  'network-error',
  'timeout',
  'service-unavailable',
  'unavailable',
  'deadline-exceeded',
  'auth/network-request-failed',
  'firestore/unavailable',
];

/**
 * Check if an error is retryable
 * Determines if the error is a transient error that can be retried.
 *
 * @param {Error} error - Error object to check
 * @returns {boolean} True if error is retryable, false otherwise
 *
 * @example
 * if (isRetryableError(error)) {
 *   console.log('This error can be retried');
 * }
 */
export const isRetryableError = error => {
  if (!error) return false;

  const errorCode = error.code || '';
  return RETRYABLE_ERROR_CODES.includes(errorCode);
};

/**
 * Retry an operation with exponential backoff
 * Attempts to execute an operation multiple times with increasing delays between attempts.
 * Only retries if the error is retryable (network, timeout, unavailable).
 *
 * Requirements: 9.2 - Retry logic with exponential backoff
 *
 * @param {Function} operation - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} [options.maxRetries=3] - Maximum number of retry attempts
 * @param {number} [options.initialDelay=1000] - Initial delay in milliseconds (default: 1s)
 * @param {number} [options.maxDelay=10000] - Maximum delay in milliseconds (default: 10s)
 * @param {Function} [options.onRetry] - Callback called before each retry (receives attempt number and error)
 * @returns {Promise<any>} Result of the operation
 * @throws {Error} If all retry attempts fail or error is not retryable
 *
 * @example
 * try {
 *   const result = await retryOperation(
 *     async () => await fetchData(),
 *     {
 *       maxRetries: 3,
 *       onRetry: (attempt, error) => {
 *         console.log(`Retry attempt ${attempt} after error:`, error.message);
 *       }
 *     }
 *   );
 *   console.log('Success:', result);
 * } catch (error) {
 *   console.error('All retries failed:', error.message);
 * }
 */
export const retryOperation = async (operation, options = {}) => {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    onRetry = null,
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Attempt the operation
      return await operation();
    } catch (error) {
      lastError = error;

      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }

      // Check if error is retryable
      if (!isRetryableError(error)) {
        // Non-retryable error, throw immediately
        throw error;
      }

      // Calculate delay with exponential backoff: initialDelay * 2^attempt
      const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);

      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, error);
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but just in case
  throw lastError;
};

/**
 * Create a retryable version of a function
 * Wraps a function with retry logic, returning a new function that automatically retries on failure.
 *
 * @param {Function} fn - Function to wrap with retry logic
 * @param {Object} options - Retry options (same as retryOperation)
 * @returns {Function} Wrapped function with retry logic
 *
 * @example
 * const fetchDataWithRetry = withRetry(
 *   async (url) => await fetch(url),
 *   { maxRetries: 3 }
 * );
 *
 * try {
 *   const data = await fetchDataWithRetry('https://api.example.com/data');
 * } catch (error) {
 *   console.error('Failed after retries:', error.message);
 * }
 */
export const withRetry = (fn, options = {}) => {
  return async (...args) => {
    return retryOperation(() => fn(...args), options);
  };
};

export default {
  retryOperation,
  withRetry,
  isRetryableError,
  RETRYABLE_ERROR_CODES,
};
