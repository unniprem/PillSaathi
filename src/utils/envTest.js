/**
 * Environment Variable Test Utility
 *
 * This utility tests that react-native-config is properly loading
 * environment variables from .env files.
 */

import Config from 'react-native-config';

/**
 * Test environment variable loading
 * @returns {Object} Test results with status and details
 */
export const testEnvLoading = () => {
  const results = {
    success: true,
    errors: [],
    warnings: [],
    variables: {},
  };

  // Critical variables that must be present
  const criticalVars = [
    'ENV',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_ANDROID_APP_ID',
    'FIREBASE_ANDROID_API_KEY',
    'APP_NAME',
  ];

  // Optional variables
  const optionalVars = [
    'FIREBASE_IOS_APP_ID',
    'FIREBASE_IOS_API_KEY',
    'API_BASE_URL',
    'ENABLE_DEBUG_LOGS',
  ];

  // Test critical variables
  criticalVars.forEach(varName => {
    const value = Config[varName];
    results.variables[varName] = value;

    if (!value || value === '' || value === 'undefined') {
      results.success = false;
      results.errors.push(`Critical variable ${varName} is missing or empty`);
    }
  });

  // Test optional variables (warnings only)
  optionalVars.forEach(varName => {
    const value = Config[varName];
    results.variables[varName] = value;

    if (!value || value === '' || value === 'undefined') {
      results.warnings.push(`Optional variable ${varName} is missing or empty`);
    }
  });

  // Validate environment value
  const env = Config.ENV;
  if (env !== 'development' && env !== 'production') {
    results.success = false;
    results.errors.push(
      `ENV must be 'development' or 'production', got: ${env}`,
    );
  }

  return results;
};

/**
 * Get formatted test results for display
 * @returns {string} Formatted test results
 */
export const getEnvTestReport = () => {
  const results = testEnvLoading();

  let report = '=== Environment Variable Test Report ===\n\n';

  report += `Status: ${results.success ? '✅ PASS' : '❌ FAIL'}\n\n`;

  if (results.errors.length > 0) {
    report += 'Errors:\n';
    results.errors.forEach(error => {
      report += `  ❌ ${error}\n`;
    });
    report += '\n';
  }

  if (results.warnings.length > 0) {
    report += 'Warnings:\n';
    results.warnings.forEach(warning => {
      report += `  ⚠️  ${warning}\n`;
    });
    report += '\n';
  }

  report += 'Loaded Variables:\n';
  Object.entries(results.variables).forEach(([key, value]) => {
    const displayValue = value || '(empty)';
    const maskedValue =
      key.includes('KEY') || key.includes('SECRET')
        ? `${displayValue.substring(0, 8)}...`
        : displayValue;
    report += `  ${key}: ${maskedValue}\n`;
  });

  return report;
};

/**
 * Log environment test results to console
 */
export const logEnvTest = () => {
  const report = getEnvTestReport();

  console.log(report);

  const results = testEnvLoading();
  return results.success;
};

/**
 * Get current environment name
 * @returns {string} Current environment (development/production)
 */
export const getCurrentEnvironment = () => {
  return Config.ENV || 'unknown';
};

/**
 * Check if running in development mode
 * @returns {boolean} True if in development
 */
export const isDevelopment = () => {
  return Config.ENV === 'development';
};

/**
 * Check if running in production mode
 * @returns {boolean} True if in production
 */
export const isProduction = () => {
  return Config.ENV === 'production';
};
