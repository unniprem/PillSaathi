/**
 * Debugging utilities for PillSathi
 *
 * These utilities help with debugging during development.
 * All debug code is wrapped in __DEV__ checks to ensure
 * it doesn't run in production.
 */

 

/**
 * Enhanced console.log that only runs in development
 * @param {string} tag - Tag to identify the log source
 * @param {any} data - Data to log
 */
export const debugLog = (tag, data) => {
  if (__DEV__) {
    console.log(`[${tag}]`, data);
  }
};

/**
 * Log navigation events for debugging
 * @param {string} event - Navigation event name
 * @param {object} params - Event parameters
 */
export const debugNavigation = (event, params) => {
  if (__DEV__) {
    console.log(`[Navigation] ${event}`, params);
  }
};

/**
 * Log Firebase operations for debugging
 * @param {string} operation - Firebase operation name
 * @param {object} data - Operation data
 */
export const debugFirebase = (operation, data) => {
  if (__DEV__) {
    console.log(`[Firebase] ${operation}`, data);
  }
};

/**
 * Log API calls for debugging
 * @param {string} method - HTTP method
 * @param {string} url - API endpoint
 * @param {object} data - Request/response data
 */
export const debugAPI = (method, url, data) => {
  if (__DEV__) {
    console.log(`[API] ${method} ${url}`, data);
  }
};

/**
 * Log errors with stack trace
 * @param {string} context - Error context
 * @param {Error} error - Error object
 */
export const debugError = (context, error) => {
  if (__DEV__) {
    console.error(`[Error] ${context}`, {
      message: error.message,
      stack: error.stack,
      error,
    });
  }
};

/**
 * Performance timing utility
 * @param {string} label - Timer label
 * @returns {Function} End function to stop the timer
 */
export const debugTimer = label => {
  if (__DEV__) {
    const start = Date.now();
    console.log(`[Timer] ${label} - Start`);

    return () => {
      const duration = Date.now() - start;
      console.log(`[Timer] ${label} - End (${duration}ms)`);
    };
  }

  return () => {}; // No-op in production
};

/**
 * Log component lifecycle events
 * @param {string} componentName - Component name
 * @param {string} lifecycle - Lifecycle event (mount, update, unmount)
 * @param {object} props - Component props
 */
export const debugComponent = (componentName, lifecycle, props = {}) => {
  if (__DEV__) {
    console.log(`[Component] ${componentName} - ${lifecycle}`, props);
  }
};

/**
 * Pretty print objects for debugging
 * @param {string} label - Label for the output
 * @param {object} obj - Object to print
 */
export const debugPretty = (label, obj) => {
  if (__DEV__) {
    console.log(`[${label}]`, JSON.stringify(obj, null, 2));
  }
};

/**
 * Conditional debug logging
 * @param {boolean} condition - Condition to check
 * @param {string} tag - Tag to identify the log source
 * @param {any} data - Data to log
 */
export const debugIf = (condition, tag, data) => {
  if (__DEV__ && condition) {
    console.log(`[${tag}]`, data);
  }
};

/**
 * Debug table for array data
 * @param {string} label - Label for the table
 * @param {Array} data - Array data to display
 */
export const debugTable = (label, data) => {
  if (__DEV__) {
    console.log(`[${label}]`);
    console.table(data);
  }
};

/**
 * Enable Firebase debug logging
 */
export const enableFirebaseDebugLogging = () => {
  if (__DEV__) {
    // This would be called in firebase config
    debugLog('Debug', 'Firebase debug logging enabled');
  }
};

/**
 * Get current environment info
 * @returns {object} Environment information
 */
export const getDebugInfo = () => {
  if (__DEV__) {
    return {
      isDev: __DEV__,
      platform: require('react-native').Platform.OS,
      version: require('react-native').Platform.Version,
      environment: process.env.NODE_ENV,
    };
  }
  return {};
};

/**
 * Assert condition and log error if false
 * @param {boolean} condition - Condition to assert
 * @param {string} message - Error message if assertion fails
 */
export const debugAssert = (condition, message) => {
  if (__DEV__ && !condition) {
    console.error(`[Assert Failed] ${message}`);
  }
};
